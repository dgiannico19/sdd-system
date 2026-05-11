const fs = require("fs");
const path = require("path");
const c = require("../render/colors");
const { isInitialized } = require("../core/config");
const { resolveTask, taskDir } = require("../core/task");
const { getById, pipelineFor } = require("../core/steps");
const { executeStep } = require("./_runStep");
const { parseFeedback } = require("./_args");

const findMissingArtifacts = (cwd, state, targetStepId) => {
  const dir = taskDir(cwd, state.slug);
  const missing = [];
  for (const step of pipelineFor(state.kind)) {
    if (step.id === targetStepId) break;
    for (const artifact of step.expectedArtifacts || []) {
      if (!fs.existsSync(path.join(dir, artifact))) {
        missing.push({ stepId: step.id, artifact });
      }
    }
  }
  return missing;
};

const dev = async (args, { cwd }) => {
  if (!isInitialized(cwd)) {
    throw new Error("No hay .sdd/ inicializado. Corré 'sdd init' primero.");
  }
  const { rest, feedback } = parseFeedback(args);
  const slug = rest[0];
  const state = resolveTask(cwd, slug);
  const step = getById("dev-executor");

  const missing = findMissingArtifacts(cwd, state, step.id);
  if (missing.length) {
    process.stdout.write(
      `${c.red("✗")} Faltan artefactos previos para ejecutar ${c.cyan("dev-executor")}:\n`,
    );
    for (const m of missing) {
      process.stdout.write(`  · ${m.artifact} ${c.dim(`(step: ${m.stepId})`)}\n`);
    }
    process.stdout.write(
      `\nCompletá la fase de specs con ${c.cyan("sdd next")} (avanza step por step) o ${c.cyan("sdd run")} (corre todo el pipeline).\n`,
    );
    process.exitCode = 2;
    return;
  }

  return executeStep({ cwd, slug: state.slug, step, userFeedback: feedback });
};

module.exports = dev;
