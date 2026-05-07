const fs = require("fs");
const path = require("path");

const readFileSafe = (p) => {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
};

const SDD_DIR = ".sdd";

const rulesRoot = (cwd) => path.join(cwd, SDD_DIR, "rules");

const collectFromRulesDir = (cwd) => {
  const dir = rulesRoot(cwd);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md")
    .sort()
    .map((f) => ({ rel: `.sdd/rules/${f}`, abs: path.join(dir, f), label: f }))
    .filter((entry) => {
      const body = readFileSafe(entry.abs);
      return Boolean(body && body.trim());
    });
};

const collectClaudeMd = (cwd) => {
  const abs = path.join(cwd, "CLAUDE.md");
  const body = readFileSafe(abs);
  if (!body || !body.trim()) return null;
  return { rel: "CLAUDE.md", abs, label: "CLAUDE.md" };
};

const loadRules = (cwd) => {
  const sources = [];
  const blocks = [];

  const claude = collectClaudeMd(cwd);
  if (claude) {
    sources.push(claude.rel);
    blocks.push(`## ${claude.label}\n${readFileSafe(claude.abs).trim()}`);
  }

  for (const entry of collectFromRulesDir(cwd)) {
    sources.push(entry.rel);
    blocks.push(`## ${entry.label}\n${readFileSafe(entry.abs).trim()}`);
  }

  return {
    text: blocks.join("\n\n"),
    sources,
  };
};

module.exports = { loadRules, rulesRoot };
