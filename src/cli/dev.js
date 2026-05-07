const { isInitialized } = require("../core/config");
const { resolveTask } = require("../core/task");
const { getById } = require("../core/steps");
const { executeStep } = require("./_runStep");
const { parseFeedback } = require("./_args");

const dev = async (args, { cwd }) => {
  if (!isInitialized(cwd)) {
    throw new Error("No hay .sdd/ inicializado. Corré 'sdd init' primero.");
  }
  const { rest, feedback } = parseFeedback(args);
  const slug = rest[0];
  const state = resolveTask(cwd, slug);
  const step = getById("dev-executor");
  return executeStep({ cwd, slug: state.slug, step, userFeedback: feedback });
};

module.exports = dev;
