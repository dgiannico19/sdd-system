const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const c = require("../render/colors");
const { isInitialized } = require("../core/config");
const { resolveTask } = require("../core/task");
const { getById } = require("../core/steps");
const { listTranscripts } = require("../core/transcript");

const parseArgs = (args) => {
  const out = { all: false, slug: null };
  for (const a of args) {
    if (a === "--all" || a === "-a") out.all = true;
    else if (!a.startsWith("-")) out.slug = a;
  }
  return out;
};

const fmtTime = (iso) => {
  if (!iso) return "?";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const verdictMark = (v) => {
  if (v === "pass") return c.green("✓ pass");
  if (v === "gap") return c.yellow("⚠ gap");
  if (v === "veto") return c.red("✗ veto");
  if (v === "error") return c.red("✗ error");
  return c.dim(`· ${v}`);
};

const fmtTokens = (n) => `${((n || 0) / 1000).toFixed(1)}k`;

const findTranscriptForEntry = (transcripts, entry) => {
  const same = transcripts.filter((p) => p.endsWith(`-${entry.stepId}.md`));
  if (same.length === 0) return null;
  if (!entry.ranAt) return same[same.length - 1];
  const target = new Date(entry.ranAt).getTime();
  let best = same[same.length - 1];
  let bestDelta = Infinity;
  for (const p of same) {
    const stamp = path.basename(p).slice(0, 24).replace(/-/g, ":").replace(/^(.{4}):(.{2}):(.{2}):/, "$1-$2-$3T").replace(/T(\d{2}):(\d{2}):(\d{2}):(\d{3})Z/, "T$1:$2:$3.$4Z");
    const t = new Date(stamp).getTime();
    if (Number.isNaN(t)) continue;
    const delta = Math.abs(t - target);
    if (delta < bestDelta) { best = p; bestDelta = delta; }
  }
  return best;
};

const gitDiffStat = (cwd) => {
  const r = spawnSync("git", ["diff", "--stat", "HEAD", "--", "src/"], {
    cwd,
    encoding: "utf8",
    timeout: 5000,
  });
  if (r.error || r.status !== 0) return null;
  return (r.stdout || "").trim();
};

const gitStatusPorcelain = (cwd) => {
  const r = spawnSync("git", ["status", "--porcelain", "src/"], {
    cwd,
    encoding: "utf8",
    timeout: 5000,
  });
  if (r.error || r.status !== 0) return null;
  return (r.stdout || "").trim();
};

const printEntry = (entry, step, transcriptPath) => {
  process.stdout.write(`\n${c.bold("▶")} ${c.cyan(step ? step.title : entry.stepId)} ${c.dim(`· ${entry.stepId}`)}  ${verdictMark(entry.verdict)}\n`);
  process.stdout.write(`${c.dim(`  ranAt: ${fmtTime(entry.ranAt)}`)}\n`);
  if (entry.feedback) {
    const fb = entry.feedback.length > 200 ? `${entry.feedback.slice(0, 200)}…` : entry.feedback;
    process.stdout.write(`${c.yellow("  feedback:")} ${c.dim(fb)}\n`);
  }
  if (entry.reason) {
    process.stdout.write(`  ${c.dim(`razón: ${entry.reason}`)}\n`);
  }
  const cacheRead = entry.cacheReadTokens || 0;
  const cacheCreation = entry.cacheCreationTokens || 0;
  const totalIn = (entry.tokensIn || 0) + cacheRead + cacheCreation;
  const cacheHint = cacheRead ? c.green(` · cache ${fmtTokens(cacheRead)}`) : "";
  process.stdout.write(`${c.dim(`  ${entry.turns ?? "?"} turnos · in ${fmtTokens(totalIn)}${cacheHint} · out ${fmtTokens(entry.tokensOut)}`)}\n`);
  if (entry.truncated) {
    process.stdout.write(`  ${c.red("truncated: maxTurns alcanzado")}\n`);
  }
  if (entry.verify && Array.isArray(entry.verify.results)) {
    process.stdout.write(`  ${c.dim("verify:")}\n`);
    for (const r of entry.verify.results) {
      const mark = r.ok ? c.green("✓") : c.red("✗");
      const code = r.ok ? "" : ` ${c.dim(`(exit ${r.exitCode ?? "?"}${r.timedOut ? ", timeout" : ""})`)}`;
      process.stdout.write(`    ${mark} ${r.command}${code}\n`);
    }
  }
  if (transcriptPath) {
    process.stdout.write(`${c.dim(`  transcript: ${transcriptPath}`)}\n`);
  }
};

const printAgentSummary = (transcriptAbsPath) => {
  if (!transcriptAbsPath || !fs.existsSync(transcriptAbsPath)) return;
  const content = fs.readFileSync(transcriptAbsPath, "utf8");
  const idx = content.indexOf("## Resumen del agente");
  if (idx === -1) return;
  const tail = content.slice(idx + "## Resumen del agente".length).trim();
  const stop = tail.indexOf("\n## ");
  const body = (stop === -1 ? tail : tail.slice(0, stop)).trim();
  if (!body) return;
  process.stdout.write(`\n${c.bold("Resumen del agente")}\n`);
  const lines = body.split("\n");
  const trimmed = lines.length > 30 ? lines.slice(0, 30).concat([c.dim(`… (${lines.length - 30} líneas más en el transcript)`)]) : lines;
  for (const line of trimmed) process.stdout.write(`  ${line}\n`);
};

const printToolCalls = (transcriptAbsPath) => {
  if (!transcriptAbsPath || !fs.existsSync(transcriptAbsPath)) return;
  const content = fs.readFileSync(transcriptAbsPath, "utf8");
  const idx = content.indexOf("## Tool calls");
  if (idx === -1) return;
  const tail = content.slice(idx + "## Tool calls".length).trim();
  const stop = tail.indexOf("\n## ");
  const body = (stop === -1 ? tail : tail.slice(0, stop)).trim();
  if (!body || body === "_(ninguno)_") return;
  process.stdout.write(`\n${c.bold("Tool calls")}\n`);
  for (const line of body.split("\n")) {
    const clean = line.replace(/^- /, "").replace(/`/g, "");
    process.stdout.write(`  ${clean}\n`);
  }
};

const printGitChanges = (cwd) => {
  const stat = gitDiffStat(cwd);
  const status = gitStatusPorcelain(cwd);
  if (stat || status) {
    process.stdout.write(`\n${c.bold("Cambios en src/")} ${c.dim("(respecto a HEAD)")}\n`);
    if (status) {
      for (const line of status.split("\n")) {
        if (!line.trim()) continue;
        process.stdout.write(`  ${line}\n`);
      }
    } else {
      process.stdout.write(`  ${c.dim("(sin cambios sin commitear)")}\n`);
    }
    if (stat) {
      process.stdout.write(`${c.dim("  ---")}\n`);
      for (const line of stat.split("\n")) process.stdout.write(`  ${line}\n`);
    }
  }
};

const explain = async (args, { cwd }) => {
  if (!isInitialized(cwd)) {
    throw new Error("No hay .sdd/ inicializado. Corré 'sdd init' primero.");
  }
  const { all, slug } = parseArgs(args);
  const state = resolveTask(cwd, slug);

  process.stdout.write(`${c.bold("Tarea")}: ${state.title} ${c.dim(`(${state.slug})`)}\n`);
  const currentStep = state.currentStepId ? getById(state.currentStepId) : null;
  const stepLabel = currentStep ? currentStep.title : state.currentStepId;
  process.stdout.write(`${c.dim(`status: ${state.status} · current step: ${stepLabel || "—"}`)}\n`);

  const history = Array.isArray(state.history) ? state.history : [];
  if (history.length === 0) {
    process.stdout.write(`\n${c.dim("(sin historia todavía — corré 'sdd run' o 'sdd dev')")}\n`);
    return;
  }

  const transcripts = listTranscripts(cwd, state.slug);
  const entries = all ? history : history.slice(-1);

  for (const entry of entries) {
    const step = getById(entry.stepId) || { title: entry.stepId };
    const tPath = findTranscriptForEntry(transcripts, entry);
    const rel = tPath ? path.relative(cwd, tPath) : null;
    printEntry(entry, step, rel);
    if (!all) {
      printToolCalls(tPath);
      printAgentSummary(tPath);
    }
  }

  if (!all) {
    printGitChanges(cwd);
    process.stdout.write(`\n${c.dim(`Tip: 'sdd explain --all' para todo el historial. Los transcripts viven en .sdd/tasks/${state.slug}/transcripts/.`)}\n`);
  }
};

module.exports = explain;
