const c = require("../render/colors");
const { isInitialized } = require("../core/config");
const { resolveTask } = require("../core/task");
const { pickNext } = require("../core/pipeline");
const { executeStep } = require("./_runStep");

const next = async (args, { cwd }) => {
  if (!isInitialized(cwd)) {
    throw new Error("No hay .sdd/ inicializado. Corré 'sdd init' primero.");
  }
  const slug = args[0];
  const state = resolveTask(cwd, slug);

  const step = pickNext(state);
  if (!step) {
    process.stdout.write(`${c.green("✓")} La tarea ${state.slug} ya está en estado ${state.status}. Nada por hacer.\n`);
    return;
  }

  return executeStep({ cwd, slug: state.slug, step });
};

module.exports = next;
