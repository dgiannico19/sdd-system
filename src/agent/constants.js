const DEFAULT_ALLOWED_TOOLS = [
  "Read",
  "Edit",
  "Write",
  "Glob",
  "Grep",
  "Bash",
];

const DEFAULT_USAGES = {
  input_tokens: 0,
  output_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
};

const VERDICTS = ["pass", "gap", "veto"];
const PASS_RE = /^\s*STEP_PASS\s*$/m;
const GAP_RE = /^\s*STEP_GAP\s*:?\s*(.*)$/m;
const VETO_RE = /^\s*STEP_VETO\s*:?\s*(.*)$/m;

module.exports = {
  DEFAULT_ALLOWED_TOOLS,
  DEFAULT_USAGES,
  VERDICTS,
  PASS_RE,
  GAP_RE,
  VETO_RE,
};
