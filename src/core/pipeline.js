const { getById, firstStep, nextAfter, pipelineFor } = require("./steps");
const { completedStepIds } = require("./task");

const kindOf = (state) => (state && state.kind) || "feature";

const pickNext = (state) => {
  if (!state) return firstStep();
  if (state.status === "done") return null;
  const done = new Set(completedStepIds(state));
  for (const step of pipelineFor(kindOf(state))) {
    if (!done.has(step.id)) return step;
  }
  return null;
};

const isGateAfter = (config, state, step) => {
  const gates = state.gates && state.gates.length ? state.gates : config.gates || [];
  return gates.includes(step.index);
};

const applyVerdict = (state, step, verdict, extra = {}) => {
  state.history = state.history || [];
  state.history.push({
    stepId: step.id,
    stepIndex: step.index,
    ranAt: new Date().toISOString(),
    verdict,
    ...extra,
  });

  if (verdict === "pass") {
    const next = nextAfter(step.id, kindOf(state));
    if (next) {
      state.currentStepId = next.id;
      state.status = "idle";
    } else {
      state.currentStepId = step.id;
      state.status = "done";
    }
  } else if (verdict === "veto") {
    state.status = "idle";
    state.currentStepId = step.id;
  } else if (verdict === "gap") {
    state.status = "idle";
    state.currentStepId = step.id;
  } else if (verdict === "error" || verdict === "timeout") {
    state.status = "interrupted";
    state.currentStepId = step.id;
  }
  return state;
};

const summarize = (state) => {
  const done = new Set(completedStepIds(state));
  const pipeline = pipelineFor(kindOf(state));
  return pipeline.map((s) => {
    const lastEntry = (state.history || [])
      .filter((h) => h.stepId === s.id)
      .pop();
    let mark = "○";
    if (done.has(s.id)) mark = "●";
    else if (state.currentStepId === s.id && state.status === "running") mark = "◐";
    else if (state.currentStepId === s.id && state.status === "gate") mark = "⏸";
    else if (lastEntry && lastEntry.verdict !== "pass") mark = "✗";
    return {
      step: s,
      mark,
      verdict: lastEntry ? lastEntry.verdict : null,
      ranAt: lastEntry ? lastEntry.ranAt : null,
    };
  });
};

module.exports = { pickNext, isGateAfter, applyVerdict, summarize, getById };
