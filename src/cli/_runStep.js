const c = require("../render/colors");
const { isInitialized, loadConfig } = require("../core/config");
const { resolveTask, save } = require("../core/task");
const { acquire, release } = require("../core/lock");
const { applyVerdict, isGateAfter, pickNext } = require("../core/pipeline");
const { pipelineFor } = require("../core/steps");
const { resolveVerifyCommands, runVerify } = require("../core/verify");
const { writeTranscript } = require("../core/transcript");
const { buildSystemPrompt } = require("../agent/systemPrompt");
const { runAgent } = require("../agent/runAgent");
const { parse: parseVerdict } = require("../agent/verdict");

const STEPS_THAT_VERIFY = new Set(["dev-executor", "strict-reviewer"]);

const buildUserMessage = (state, step, userFeedback, verifyCommands, feedbackPolicy) => {
  const lines = [];
  lines.push(`Tarea: ${state.title}`);
  lines.push(`Slug: ${state.slug}`);
  lines.push(`Step a ejecutar: ${step.index} — ${step.title} (${step.id})`);
  lines.push("");
  lines.push(`Tu carpeta de trabajo de la tarea: .sdd/tasks/${state.slug}/`);
  lines.push(
    `Artefactos esperados como output del step: ${(step.expectedArtifacts || []).join(", ") || "(ninguno explícito)"}`,
  );

  if (STEPS_THAT_VERIFY.has(step.id)) {
    lines.push("");
    lines.push("## Verify commands");
    if (Array.isArray(verifyCommands) && verifyCommands.length) {
      lines.push("Antes de emitir STEP_PASS, todos estos deben pasar (exit 0). El motor los re-ejecuta como gate independiente, no podés saltearlos:");
      for (const cmd of verifyCommands) lines.push(`- ${cmd}`);
    } else {
      lines.push("(no hay comandos configurados; autodetectá de package.json: typecheck, lint, build, test).");
    }
  }

  if (userFeedback && userFeedback.trim()) {
    lines.push("");
    lines.push("## Feedback del usuario para esta iteración");
    lines.push(userFeedback.trim());
    lines.push("");
    if (feedbackPolicy === "amend") {
      lines.push("**Este feedback viene de `sdd amend`**: tu trabajo es actualizar `spec.md` / `design.md` / `tasks.md` / `testing.md` para reflejarlo, con cambios mínimos. Seguí las instrucciones del system prompt.");
    } else {
      lines.push("**Aplicá el feedback como prioridad**, preservando lo correcto. Si el feedback contradice `spec.md` o `design.md`, NO los modifiques: emití `STEP_GAP` indicando correr `sdd amend \"<feedback>\"` primero.");
    }
  }

  lines.push("");
  lines.push("Procedé según las instrucciones del system prompt y terminá con el token de verdict.");
  return lines.join("\n");
};

const pickModel = (config, step) => {
  const map = config.modelByStep || {};
  return map[step.id] || map[step.index] || config.defaultModel;
};

const stepLabel = (step) => {
  if (!step) return "(?)";
  const arts = (step.expectedArtifacts || []).join(", ");
  if (arts) return arts;
  if (step.phase === "build") return "código en src/";
  if (step.id === "amend") return "amend de specs";
  return step.title.toLowerCase();
};

const stepPosition = (state, step) => {
  if (step.id === "amend") return "amend";
  const pipeline = pipelineFor(state && state.kind);
  const phaseSteps = pipeline.filter((s) => s.phase === step.phase);
  const idx = phaseSteps.findIndex((s) => s.id === step.id);
  const total = phaseSteps.length;
  const phaseLabel = step.phase === "spec" ? "specs" : "build";
  if (idx === -1 || total === 0) return phaseLabel;
  return `${idx + 1}/${total} ${phaseLabel}`;
};

const stepHeader = (state, step) => {
  const arts = stepLabel(step);
  const position = stepPosition(state, step);
  return `${c.bold("▶")} ${c.cyan(arts)}  ${c.dim(`· ${position} · ${step.id}`)}`;
};

const printPassMessage = (state, step) => {
  if (step.id === "amend") {
    process.stdout.write(`${c.green("✓ amend ok")} specs actualizadas. Próximo: ${c.cyan("sdd dev")} para implementar el cambio.\n`);
    return;
  }
  if (state.status === "gate") {
    process.stdout.write(`${c.yellow("⏸ gate")} después de ${stepLabel(step)}. Revisá los artefactos y corré ${c.cyan("sdd next")} para seguir.\n`);
    return;
  }
  if (state.status === "done") {
    process.stdout.write(`${c.green("🏁 fin")} pipeline completo. Cuando hayas deployado, ${c.cyan("sdd archive " + state.slug)}.\n`);
    return;
  }
  const upcoming = pickNext(state);
  if (!upcoming) {
    process.stdout.write(`${c.green("✓ pass")} pipeline completo. ${c.cyan("sdd archive " + state.slug)} cuando deployees.\n`);
    return;
  }
  if (step.phase === "spec" && upcoming.phase === "build") {
    process.stdout.write(`${c.green("✓ pass")} ${c.bold("fase de specs completa")}.\n\n`);
    process.stdout.write(`Tenés tres caminos:\n`);
    process.stdout.write(`  ${c.cyan("sdd dev")}      desarrollar el código según tasks.md\n`);
    process.stdout.write(`  ${c.cyan("sdd review")}   revisión estricta del código existente\n`);
    process.stdout.write(`  ${c.cyan("sdd commit")}   plan de commits (no ejecuta git)\n`);
    process.stdout.write(`o cortar acá y trabajar las specs en otro agente.\n`);
    return;
  }
  process.stdout.write(`${c.green("✓ pass")} próximo: ${c.cyan(stepLabel(upcoming))}\n`);
};

const runVerifyGate = (cwd, verifyCommands) => {
  process.stdout.write(`\n${c.bold("◇ verify gate")} ${c.dim(`(${verifyCommands.length} comando${verifyCommands.length === 1 ? "" : "s"})`)}\n`);
  const result = runVerify(cwd, verifyCommands);
  for (const r of result.results) {
    const mark = r.ok ? c.green("✓") : c.red("✗");
    const code = r.ok ? "" : ` ${c.dim(`(exit ${r.exitCode ?? "?"}${r.timedOut ? ", timeout" : ""})`)}`;
    process.stdout.write(`  ${mark} ${r.command}${code}\n`);
  }
  if (!result.ok) {
    process.stdout.write(`\n${c.red("✗ verify falló")} — el agente declaró PASS pero los comandos están rojos:\n`);
    for (const r of result.failed) {
      const tail = (r.stderr || r.stdout || r.error || "")
        .split("\n")
        .slice(-15)
        .join("\n");
      if (tail) process.stdout.write(`${c.dim(`--- ${r.command} ---`)}\n${tail}\n`);
    }
  }
  return result;
};

const recordVirtualHistory = (state, step, verdict, extra) => {
  state.history = state.history || [];
  state.history.push({
    stepId: step.id,
    stepIndex: step.index,
    ranAt: new Date().toISOString(),
    verdict,
    ...extra,
  });
  if (verdict === "pass" && step.id === "amend") {
    state.currentStepId = "dev-executor";
  }
  state.status = "idle";
  return state;
};

const isPipelineStep = (state, step) =>
  pipelineFor(state && state.kind).some((s) => s.id === step.id);

const executeStep = async ({ cwd, slug, step, allowedToolsOverride, userFeedback, feedbackPolicy } = {}) => {
  if (!isInitialized(cwd)) {
    throw new Error("No hay .sdd/ inicializado. Corré 'sdd init' primero.");
  }
  if (!step) throw new Error("executeStep requiere un step.");
  const config = loadConfig(cwd);
  let state = resolveTask(cwd, slug);

  acquire(cwd, state.slug);
  const onSig = () => {
    state.status = "interrupted";
    save(cwd, state);
    release(cwd, state.slug);
    process.exit(130);
  };
  process.once("SIGINT", onSig);

  state.status = "running";
  state.currentStepId = step.id;
  save(cwd, state);

  process.stdout.write(`\n${stepHeader(state, step)}\n`);

  const verifyCommands = resolveVerifyCommands(cwd, config);
  const willVerify = STEPS_THAT_VERIFY.has(step.id) && verifyCommands.length > 0;

  const model = pickModel(config, step);
  const {
    system,
    staticPrefix,
    dynamicSuffix,
    staticTokensEstimate,
    promptHash,
    promptSource,
    ruleSources,
  } = buildSystemPrompt({
    cwd,
    step,
    taskState: state,
    projectContext: config.context,
  });
  if (ruleSources && ruleSources.length) {
    process.stdout.write(`${c.dim(`  reglas: ${ruleSources.join(", ")}`)}\n`);
  }
  process.stdout.write(`${c.dim(`  prefijo cacheable: ~${staticTokensEstimate.toLocaleString()} tokens`)}\n`);
  if (willVerify) {
    process.stdout.write(`${c.dim(`  verify: ${verifyCommands.join(" • ")}`)}\n`);
  } else if (STEPS_THAT_VERIFY.has(step.id)) {
    process.stdout.write(`${c.yellow("  verify: sin comandos resueltos — gate del motor desactivado para este step")}\n`);
  }
  if (userFeedback && userFeedback.trim()) {
    const fb = userFeedback.trim();
    const oneLine = fb.length > 120 ? `${fb.slice(0, 120)}…` : fb;
    process.stdout.write(`${c.yellow("  feedback:")} ${c.dim(oneLine)}\n`);
  }
  if (process.env.SDD_DEBUG === "1") {
    process.stdout.write(`${c.dim(`  modelo=${model} prompt=${promptSource} hash=${promptHash}`)}\n`);
  }
  process.stdout.write("\n");

  const userMessage = buildUserMessage(state, step, userFeedback, verifyCommands, feedbackPolicy);

  let result;
  try {
    result = await runAgent({
      cwd,
      system,
      staticPrefix,
      dynamicSuffix,
      userMessage,
      model,
      maxTurns: config.maxTurnsPerStep || 32,
      allowedTools: allowedToolsOverride,
    });
  } catch (err) {
    if (isPipelineStep(state, step)) {
      state = applyVerdict(state, step, "error", { error: err.message, promptHash });
    } else {
      state = recordVirtualHistory(state, step, "error", { error: err.message, promptHash });
    }
    save(cwd, state);
    release(cwd, state.slug);
    process.removeListener("SIGINT", onSig);
    throw err;
  }

  let verdict = parseVerdict(result.lastText);

  if (result.truncated && verdict.verdict !== "veto") {
    verdict = {
      verdict: "gap",
      reason: `truncated: maxTurns=${config.maxTurnsPerStep || 32} alcanzado, el agente no terminó`,
    };
  }

  let verifyResult = null;
  if (verdict.verdict === "pass" && willVerify) {
    verifyResult = runVerifyGate(cwd, verifyCommands);
    if (!verifyResult.ok) {
      const failed = verifyResult.failed.map((r) => r.command).join(", ");
      verdict = {
        verdict: "gap",
        reason: `verify gate falló: ${failed}`,
      };
    }
  }

  const cacheRead = result.usage.cache_read_input_tokens || 0;
  const cacheCreation = result.usage.cache_creation_input_tokens || 0;
  const extra = {
    reason: verdict.reason || "",
    tokensIn: result.usage.input_tokens,
    tokensOut: result.usage.output_tokens,
    cacheReadTokens: cacheRead,
    cacheCreationTokens: cacheCreation,
    turns: result.turns,
    truncated: result.truncated,
    promptHash,
  };
  if (userFeedback && userFeedback.trim()) extra.feedback = userFeedback.trim();
  if (verifyResult) {
    extra.verify = {
      ok: verifyResult.ok,
      results: verifyResult.results.map((r) => ({
        command: r.command,
        ok: r.ok,
        exitCode: r.exitCode,
        timedOut: r.timedOut,
        durationMs: r.durationMs,
      })),
    };
  }

  if (isPipelineStep(state, step)) {
    state = applyVerdict(state, step, verdict.verdict, extra);
    if (verdict.verdict === "pass" && isGateAfter(config, state, step) && state.status !== "done") {
      state.status = "gate";
    }
  } else {
    state = recordVirtualHistory(state, step, verdict.verdict, extra);
  }

  save(cwd, state);
  release(cwd, state.slug);
  process.removeListener("SIGINT", onSig);

  let transcriptPath = null;
  try {
    transcriptPath = writeTranscript(cwd, state.slug, {
      stepId: step.id,
      stepIndex: step.index,
      stepTitle: step.title,
      taskTitle: state.title,
      slug: state.slug,
      ranAt: new Date().toISOString(),
      verdict: verdict.verdict,
      reason: verdict.reason || "",
      feedback: userFeedback && userFeedback.trim() ? userFeedback.trim() : null,
      model,
      usage: result.usage,
      turns: result.turns,
      tools: result.tools,
      truncated: result.truncated,
      promptHash,
      verify: extra.verify || null,
      toolCalls: result.toolCalls || [],
      lastText: result.lastText || "",
    });
  } catch (e) {
    if (process.env.SDD_DEBUG === "1") {
      process.stderr.write(`transcript write failed: ${e.message}\n`);
    }
  }

  const fmt = (n) => `${(n / 1000).toFixed(1)}k`;
  const totalIn = (result.usage.input_tokens || 0) + cacheRead + cacheCreation;
  const totalOut = result.usage.output_tokens || 0;
  const cacheParts = [];
  if (cacheRead) cacheParts.push(`${c.green("cache " + fmt(cacheRead))}`);
  if (cacheCreation) cacheParts.push(`creación ${fmt(cacheCreation)}`);
  if (result.usage.input_tokens) cacheParts.push(`fresh ${fmt(result.usage.input_tokens)}`);
  const inBreakdown = cacheParts.length ? ` (${cacheParts.join(" + ")})` : "";
  const savedPct = totalIn > 0 ? Math.round((cacheRead / totalIn) * 100) : 0;
  const savedHint = cacheRead > 0 ? c.green(` · ahorro ${savedPct}%`) : "";
  process.stdout.write(
    `\n${c.dim(`${result.turns} turnos · ${result.tools || 0} tools · in ${fmt(totalIn)}${inBreakdown} · out ${fmt(totalOut)}`)}${savedHint}\n`,
  );
  if (transcriptPath) {
    const rel = transcriptPath.startsWith(cwd) ? transcriptPath.slice(cwd.length + 1) : transcriptPath;
    process.stdout.write(`${c.dim(`  transcript: ${rel}`)}\n`);
  }

  if (verdict.verdict === "pass") {
    printPassMessage(state, step);
  } else if (verdict.verdict === "gap") {
    process.stdout.write(`${c.yellow("⚠ gap")} ${verdict.reason}\n`);
  } else if (verdict.verdict === "veto") {
    process.stdout.write(`${c.red("✗ veto")} ${verdict.reason}\n`);
  } else {
    process.stdout.write(`${c.red("✗ error")} ${verdict.reason}\n`);
    process.exitCode = 2;
  }

  return verdict;
};

module.exports = { executeStep };
