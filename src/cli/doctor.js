const path = require("path");
const { execSync } = require("child_process");
const c = require("../render/colors");
const { isInitialized, configPath, loadConfig } = require("../core/config");

const check = (label, ok, detail) => {
  const mark = ok ? c.green("✓") : c.red("✗");
  process.stdout.write(`  ${mark} ${label}${detail ? c.dim(`  — ${detail}`) : ""}\n`);
  return ok;
};

const checkAgentSdk = () => {
  try {
    require.resolve("@anthropic-ai/claude-agent-sdk");
    return { ok: true, detail: "" };
  } catch {
    return { ok: false, detail: "corré 'npm install'" };
  }
};

const checkClaudeBinary = () => {
  try {
    const which = execSync("which claude", { stdio: ["ignore", "pipe", "ignore"], timeout: 3000 })
      .toString()
      .trim();
    const ver = execSync("claude --version", { stdio: ["ignore", "pipe", "ignore"], timeout: 5000 })
      .toString()
      .trim();
    return { ok: true, detail: `${ver} @ ${which}` };
  } catch {
    return { ok: false, detail: "instalá Claude Code y corré 'claude login'" };
  }
};

const doctor = async (_args, { cwd }) => {
  process.stdout.write(`${c.bold("sdd doctor")}\n\n`);

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  let allOk = true;

  allOk = check(`Node ${process.versions.node}`, nodeMajor >= 20, nodeMajor < 20 ? "se requiere node >= 20" : "") && allOk;

  const sdk = checkAgentSdk();
  allOk = check(`@anthropic-ai/claude-agent-sdk`, sdk.ok, sdk.detail) && allOk;

  const claude = checkClaudeBinary();
  allOk = check(`claude CLI`, claude.ok, claude.detail) && allOk;

  const initialized = isInitialized(cwd);
  allOk = check(`.sdd/ inicializado`, initialized, initialized ? path.relative(cwd, configPath(cwd)) : "corré 'sdd init'") && allOk;

  if (initialized) {
    try {
      const cfg = loadConfig(cwd);
      check(`config válido`, true, `model=${cfg.defaultModel} gates=[${(cfg.gates || []).join(",")}]`);
    } catch (err) {
      allOk = check(`config válido`, false, err.message) && allOk;
    }
  }

  process.stdout.write(`\n${allOk ? c.green("Todo OK.") : c.yellow("Hay observaciones.")}\n`);
  if (!allOk) process.exitCode = 1;
};

module.exports = doctor;
