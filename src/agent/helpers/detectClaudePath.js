const { execSync } = require("child_process");

/**
 * Detects the path to the Claude code executable.
 * Checks the SDD_CLAUDE_PATH environment variable first, then falls back to using 'which claude'.
 * @returns {string|undefined} The path to the Claude executable, or undefined if not found.
 */
module.exports = () => {
  if (process.env.SDD_CLAUDE_PATH) return process.env.SDD_CLAUDE_PATH;
  try {
    const found = execSync("which claude", {
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
    })
      .toString()
      .trim();
    return found || undefined;
  } catch {
    return undefined;
  }
};
