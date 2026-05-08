const { isInitialized } = require("../core/config");
const { resolveTask } = require("../core/task");
const { executeStep } = require("./_runStep");
const { parseFeedback } = require("./_args");

const AMEND_STEP = {
  index: 0,
  id: "amend",
  title: "Amend specs",
  promptFile: "step-amend.md",
  expectedArtifacts: [],
  phase: "spec",
};

const collectInline = (rest) => {
  if (!rest.length) return { slug: null, inline: null };
  const looksLikeSlug = /^[a-z0-9][a-z0-9-]*$/i.test(rest[0]) && rest.length > 1;
  if (looksLikeSlug) {
    return { slug: rest[0], inline: rest.slice(1).join(" ") };
  }
  return { slug: null, inline: rest.join(" ") };
};

const amend = async (args, { cwd }) => {
  if (!isInitialized(cwd)) {
    throw new Error("No hay .sdd/ inicializado. Corré 'sdd init' primero.");
  }
  const { rest, feedback } = parseFeedback(args);
  const { slug, inline } = collectInline(rest);
  const text = (feedback && feedback.trim()) || (inline && inline.trim());
  if (!text) {
    throw new Error('sdd amend requiere feedback. Ej: sdd amend -m "el botón ahora es verde"');
  }
  const state = resolveTask(cwd, slug);
  return executeStep({
    cwd,
    slug: state.slug,
    step: AMEND_STEP,
    userFeedback: text,
    feedbackPolicy: "amend",
  });
};

module.exports = amend;
