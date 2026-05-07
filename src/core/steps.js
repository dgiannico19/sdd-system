const STEPS = [
  {
    index: 1,
    id: "proposal-initiator",
    title: "Proposal initiator",
    promptFile: "step-1-proposal.md",
    expectedArtifacts: ["proposal.md", "spec.md"],
    phase: "spec",
  },
  {
    index: 2,
    id: "exploration-analyzer",
    title: "Exploration analyzer",
    promptFile: "step-2-exploration.md",
    expectedArtifacts: ["exploration.md"],
    phase: "spec",
  },
  {
    index: 3,
    id: "design-builder",
    title: "Design builder",
    promptFile: "step-3-design.md",
    expectedArtifacts: ["design.md", "tasks.md"],
    phase: "spec",
  },
  {
    index: 4,
    id: "spec-behavior-generator",
    title: "Spec behavior generator",
    promptFile: "step-4-spec-behavior.md",
    expectedArtifacts: ["testing.md"],
    phase: "spec",
  },
  {
    index: 5,
    id: "dev-executor",
    title: "Dev executor",
    promptFile: "step-5-dev-executor.md",
    expectedArtifacts: [],
    phase: "build",
  },
  {
    index: 6,
    id: "strict-reviewer",
    title: "Strict reviewer",
    promptFile: "step-6-strict-review.md",
    expectedArtifacts: [],
    phase: "build",
  },
  {
    index: 7,
    id: "commit-splitter",
    title: "Commit splitter",
    promptFile: "step-7-commit-splitter.md",
    expectedArtifacts: [],
    phase: "build",
  },
];

const PIPELINES = {
  feature: [
    "proposal-initiator",
    "exploration-analyzer",
    "design-builder",
    "spec-behavior-generator",
    "dev-executor",
    "strict-reviewer",
    "commit-splitter",
  ],
  bug: [
    "exploration-analyzer",
    "spec-behavior-generator",
    "dev-executor",
    "strict-reviewer",
    "commit-splitter",
  ],
};

const KINDS = Object.keys(PIPELINES);
const DEFAULT_KIND = "feature";

const getById = (id) => STEPS.find((s) => s.id === id) || null;
const getByIndex = (i) => STEPS.find((s) => s.index === i) || null;

const resolveKind = (kind) => (kind && PIPELINES[kind] ? kind : DEFAULT_KIND);

const pipelineFor = (kind) =>
  PIPELINES[resolveKind(kind)].map((id) => getById(id)).filter(Boolean);

const firstStep = (kind = DEFAULT_KIND) => pipelineFor(kind)[0] || null;

const lastSpecStep = (kind = DEFAULT_KIND) => {
  const specs = pipelineFor(kind).filter((s) => s.phase === "spec");
  return specs.length ? specs[specs.length - 1] : null;
};

const nextAfter = (id, kind = DEFAULT_KIND) => {
  const pipe = pipelineFor(kind);
  if (!pipe.length) return null;
  const idx = pipe.findIndex((s) => s.id === id);
  if (idx === -1) return pipe[0];
  return pipe[idx + 1] || null;
};

module.exports = {
  STEPS,
  PIPELINES,
  KINDS,
  DEFAULT_KIND,
  getById,
  getByIndex,
  firstStep,
  lastSpecStep,
  nextAfter,
  pipelineFor,
  resolveKind,
};
