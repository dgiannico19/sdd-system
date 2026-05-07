const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { detectStack } = require("../core/stack");
const { loadRules } = require("../core/rules");

const promptsRoot = path.join(__dirname, "..", "prompts");

const sharedPath = () => path.join(promptsRoot, "_shared", "zero-guesswork.md");
const stepPath = (promptFile) => path.join(promptsRoot, promptFile);

const loadStepPrompt = (cwd, step) => {
  const ejected = path.join(cwd, ".sdd", "prompts", step.promptFile);
  if (fs.existsSync(ejected)) return { source: "ejected", body: fs.readFileSync(ejected, "utf8") };
  return { source: "package", body: fs.readFileSync(stepPath(step.promptFile), "utf8") };
};

const loadSharedPrompt = (cwd) => {
  const ejected = path.join(cwd, ".sdd", "prompts", "_shared", "zero-guesswork.md");
  if (fs.existsSync(ejected)) return fs.readFileSync(ejected, "utf8");
  return fs.readFileSync(sharedPath(), "utf8");
};

const hash = (text) => crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);

const estimateTokens = (text) => Math.round((text || "").length / 4);

const buildSystemPrompt = ({ cwd, step, taskState, projectContext }) => {
  const shared = loadSharedPrompt(cwd);
  const { body: stepBody, source } = loadStepPrompt(cwd, step);
  const ctxBody = (projectContext && projectContext.trim()) || detectStack(cwd);
  const ctxSection = ctxBody ? `\n---\n# Project context\n${ctxBody}\n` : "";

  const { text: rulesText, sources: ruleSources } = loadRules(cwd);
  const rulesSection = rulesText
    ? `\n---\n# User rules\nReglas y convenciones del proyecto. Tienen prioridad sobre defaults genéricos del agente. Respetalas en todos los pasos.\n\n${rulesText}\n`
    : "";

  // Static prefix: identical across turns of the same step AND across re-runs
  // of the same step within the cache TTL. Cacheable.
  const staticPrefix = `# sdd — Step ${step.index}: ${step.title}\n${shared}\n\n---\n\n${stepBody}${rulesSection}${ctxSection}`;

  // Dynamic suffix: per-task context that varies (slug, id, kind). Not cached.
  const kind = taskState.kind || "feature";
  const kindNote =
    kind === "bug"
      ? `Task kind: bug — pipeline reducido (sin proposal/design). El input principal es \`.sdd/tasks/${taskState.slug}/task.md\` (reporte del bug: síntoma, repro, logs). Si este step pide \`proposal.md\` o \`spec.md\` como input, adaptá: tratá \`task.md\` como la spec del bug y enfocá tu análisis en root-cause y el cambio mínimo para arreglarlo.`
      : `Task kind: feature`;
  const dynamicSuffix = [
    `Task slug: ${taskState.slug}`,
    `Task id: ${taskState.id}`,
    kindNote,
    `Working directory: ${cwd}`,
    `Task folder: .sdd/tasks/${taskState.slug}/`,
    `Expected artifacts: ${(step.expectedArtifacts || []).join(", ") || "(ninguno explícito)"}`,
  ].join("\n");

  // Combined view used for hashing/debug + as a fallback if the SDK doesn't
  // honor array form (the array path is the actual one used at runtime).
  const combined = `${staticPrefix}\n\n${dynamicSuffix}`;

  return {
    system: combined,
    staticPrefix,
    dynamicSuffix,
    staticTokensEstimate: estimateTokens(staticPrefix),
    dynamicTokensEstimate: estimateTokens(dynamicSuffix),
    promptHash: hash(combined),
    promptSource: source,
    ruleSources,
  };
};

module.exports = { buildSystemPrompt };
