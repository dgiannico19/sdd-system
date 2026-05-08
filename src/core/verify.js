const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const STANDARD_SCRIPTS = ["typecheck", "lint", "build", "test"];

const detectVerifyCommands = (cwd) => {
  const pkgPath = path.join(cwd, "package.json");
  if (!fs.existsSync(pkgPath)) return [];
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const scripts = pkg.scripts || {};
    return STANDARD_SCRIPTS.filter((name) => scripts[name]).map(
      (name) => `npm run ${name}`,
    );
  } catch {
    return [];
  }
};

const resolveVerifyCommands = (cwd, config) => {
  const explicit = config && config.verifyCommands;
  if (Array.isArray(explicit)) return explicit;
  return detectVerifyCommands(cwd);
};

const truncate = (str, max = 4000) => {
  if (!str) return "";
  if (str.length <= max) return str;
  return `${str.slice(0, max)}\n…[truncado: ${str.length - max} chars]`;
};

const runOne = (cwd, command, timeoutMs) => {
  const started = Date.now();
  const r = spawnSync(command, {
    cwd,
    shell: true,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 16 * 1024 * 1024,
  });
  const durationMs = Date.now() - started;
  const timedOut = Boolean(r.error && r.error.code === "ETIMEDOUT");
  const ok = !timedOut && !r.error && r.status === 0;
  return {
    command,
    exitCode: typeof r.status === "number" ? r.status : null,
    ok,
    timedOut,
    stdout: truncate(r.stdout || ""),
    stderr: truncate(r.stderr || ""),
    error: r.error ? r.error.message : null,
    durationMs,
  };
};

const runVerify = (cwd, commands, { timeoutMs = 10 * 60 * 1000 } = {}) => {
  const results = [];
  for (const c of commands) {
    results.push(runOne(cwd, c, timeoutMs));
  }
  const failed = results.filter((r) => !r.ok);
  return { ok: failed.length === 0, results, failed };
};

module.exports = {
  STANDARD_SCRIPTS,
  detectVerifyCommands,
  resolveVerifyCommands,
  runVerify,
};
