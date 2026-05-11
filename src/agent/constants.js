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
const EMPH = "[*_`]{0,2}";
const PASS_RE = new RegExp(`^\\s*${EMPH}\\s*STEP_PASS\\s*${EMPH}\\s*$`, "m");
const GAP_RE = new RegExp(`^\\s*${EMPH}\\s*STEP_GAP\\s*${EMPH}\\s*:?\\s*(.*?)\\s*${EMPH}\\s*$`, "m");
const VETO_RE = new RegExp(`^\\s*${EMPH}\\s*STEP_VETO\\s*${EMPH}\\s*:?\\s*(.*?)\\s*${EMPH}\\s*$`, "m");

module.exports = {
  DEFAULT_ALLOWED_TOOLS,
  DEFAULT_USAGES,
  VERDICTS,
  PASS_RE,
  GAP_RE,
  VETO_RE,
};
