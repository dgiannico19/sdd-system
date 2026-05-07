const fs = require("fs");
const path = require("path");
const c = require("./colors");
const { summarize } = require("../core/pipeline");
const { taskDir } = require("../core/task");
const { pipelineFor } = require("../core/steps");

const colorMark = (mark, verdict) => {
  if (mark === "●") return c.green(mark);
  if (mark === "◐") return c.cyan(mark);
  if (mark === "⏸") return c.yellow(mark);
  if (mark === "✗") return c.red(mark);
  return c.gray(mark);
};

const detectDrift = (cwd, state) => {
  const dir = taskDir(cwd, state.slug);
  const completedIds = new Set(
    (state.history || []).filter((h) => h.verdict === "pass").map((h) => h.stepId),
  );
  const drift = [];
  for (const step of pipelineFor(state.kind)) {
    if (!completedIds.has(step.id)) continue;
    for (const artifact of step.expectedArtifacts || []) {
      const f = path.join(dir, artifact);
      if (!fs.existsSync(f)) drift.push({ stepId: step.id, artifact });
    }
  }
  return drift;
};

const renderBar = (state, { cwd } = {}) => {
  const cells = summarize(state);
  const dots = cells
    .map((cell) => `${c.gray("[" + cell.step.index + "]")}${colorMark(cell.mark, cell.verdict)}`)
    .join(c.gray("━"));

  const lines = [];
  lines.push(c.bold(`Tarea: ${state.slug}`));
  lines.push(c.dim(`id=${state.id}  kind=${state.kind || "feature"}  status=${state.status}  current=${state.currentStepId}`));
  lines.push("");
  lines.push(dots);
  lines.push("");

  for (const cell of cells) {
    const verdict = cell.verdict ? ` (${cell.verdict})` : "";
    const ranAt = cell.ranAt ? c.dim(`  ${cell.ranAt}`) : "";
    lines.push(
      `  ${colorMark(cell.mark, cell.verdict)} ${c.dim(String(cell.step.index).padStart(2))}  ${cell.step.title}${verdict}${ranAt}`,
    );
  }

  if (cwd) {
    const drift = detectDrift(cwd, state);
    if (drift.length > 0) {
      lines.push("");
      lines.push(c.yellow("⚠ drift detectado:"));
      for (const d of drift) {
        lines.push(c.yellow(`  step '${d.stepId}' marcó pass pero falta artefacto ${d.artifact}`));
      }
    }
  }

  return lines.join("\n");
};

module.exports = { renderBar, detectDrift };
