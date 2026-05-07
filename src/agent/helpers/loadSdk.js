
let sdkPromise;

/**
 * Loads the Claude Agent SDK dynamically. Caches the promise to avoid multiple imports.
 * @returns {Promise<{query: Function, SYSTEM_PROMPT_DYNAMIC_BOUNDARY: string}>} The loaded SDK functions and constants.
 */
module.exports = () => {
  if (!sdkPromise) {
    sdkPromise = import("@anthropic-ai/claude-agent-sdk").then((m) => ({
      query: m.query,
      SYSTEM_PROMPT_DYNAMIC_BOUNDARY: m.SYSTEM_PROMPT_DYNAMIC_BOUNDARY,
    }));
  }
  return sdkPromise;
};