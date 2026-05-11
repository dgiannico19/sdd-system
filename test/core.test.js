const test = require("node:test");
const assert = require("node:assert/strict");

const { slugify, buildSlug, ensureUnique } = require("../src/core/slug");
const { parse: parseVerdict } = require("../src/agent/verdict");
const { pickNext, applyVerdict, isGateAfter } = require("../src/core/pipeline");
const { firstStep, getById, STEPS } = require("../src/core/steps");

test("slugify produces kebab-case ASCII", () => {
  assert.equal(slugify("Exportar Usuarios á CSV!"), "exportar-usuarios-a-csv");
  assert.equal(slugify(""), "task");
  assert.equal(slugify("___"), "task");
});

test("buildSlug prefixes with date", () => {
  const fixed = new Date("2026-05-05T12:00:00Z");
  assert.equal(buildSlug("My feature", fixed), "2026-05-05-my-feature");
});

test("ensureUnique appends suffix on collision", () => {
  assert.equal(ensureUnique("foo", []), "foo");
  assert.equal(ensureUnique("foo", ["foo"]), "foo-2");
  assert.equal(ensureUnique("foo", ["foo", "foo-2"]), "foo-3");
});

test("verdict parser recognizes pass/gap/veto", () => {
  assert.equal(parseVerdict("blah\nSTEP_PASS").verdict, "pass");
  const gap = parseVerdict("blah\nSTEP_GAP: faltan inputs");
  assert.equal(gap.verdict, "gap");
  assert.equal(gap.reason, "faltan inputs");
  const veto = parseVerdict("STEP_VETO: viola FSD");
  assert.equal(veto.verdict, "veto");
  assert.equal(veto.reason, "viola FSD");
  assert.equal(parseVerdict("blah").verdict, "error");
});

test("verdict parser tolerates markdown emphasis around the token", () => {
  assert.equal(parseVerdict("ok\n**STEP_PASS**").verdict, "pass");
  assert.equal(parseVerdict("ok\n__STEP_PASS__").verdict, "pass");
  assert.equal(parseVerdict("ok\n`STEP_PASS`").verdict, "pass");
  const boldGap = parseVerdict("texto\n**STEP_GAP**: falta design.md");
  assert.equal(boldGap.verdict, "gap");
  assert.equal(boldGap.reason, "falta design.md");
  const boldVeto = parseVerdict("texto\n**STEP_VETO: viola FSD**");
  assert.equal(boldVeto.verdict, "veto");
  assert.equal(boldVeto.reason, "viola FSD");
});

test("pickNext returns first uncompleted step", () => {
  const fresh = { history: [], status: "idle", currentStepId: firstStep().id };
  assert.equal(pickNext(fresh).id, "proposal-initiator");

  const after1 = {
    history: [{ stepId: "proposal-initiator", verdict: "pass" }],
    status: "idle",
  };
  assert.equal(pickNext(after1).id, "exploration-analyzer");

  const allDone = {
    history: STEPS.map((s) => ({ stepId: s.id, verdict: "pass" })),
    status: "done",
  };
  assert.equal(pickNext(allDone), null);
});

test("applyVerdict pass advances to next step", () => {
  const state = { history: [], status: "running", currentStepId: "proposal-initiator" };
  applyVerdict(state, getById("proposal-initiator"), "pass");
  assert.equal(state.currentStepId, "exploration-analyzer");
  assert.equal(state.status, "idle");
  assert.equal(state.history.length, 1);
  assert.equal(state.history[0].verdict, "pass");
});

test("applyVerdict on last step marks done", () => {
  const state = { history: [], status: "running", currentStepId: "commit-splitter" };
  applyVerdict(state, getById("commit-splitter"), "pass");
  assert.equal(state.status, "done");
});

test("applyVerdict veto keeps current step idle", () => {
  const state = { history: [], status: "running", currentStepId: "design-builder" };
  applyVerdict(state, getById("design-builder"), "veto", { reason: "FSD" });
  assert.equal(state.status, "idle");
  assert.equal(state.currentStepId, "design-builder");
});

test("isGateAfter respects task gates over config", () => {
  const config = { gates: [3] };
  const taskWithGate = { gates: [2] };
  assert.equal(isGateAfter(config, taskWithGate, getById("exploration-analyzer")), true);
  assert.equal(isGateAfter(config, taskWithGate, getById("design-builder")), false);

  const taskNoOverride = { gates: [] };
  assert.equal(isGateAfter(config, taskNoOverride, getById("design-builder")), true);
});

test("STEPS pipeline excludes archiver and exposes phase boundaries", () => {
  const { STEPS, lastSpecStep } = require("../src/core/steps");
  assert.equal(STEPS.length, 7);
  assert.equal(STEPS.find((s) => s.id === "archiver"), undefined);
  assert.equal(lastSpecStep().id, "spec-behavior-generator");
  assert.deepEqual(
    STEPS.filter((s) => s.phase === "build").map((s) => s.id),
    ["dev-executor", "strict-reviewer", "commit-splitter"]
  );
});
