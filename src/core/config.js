const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const DEFAULT_CONFIG = {
  schema: "sdd/v1",
  language: "es",
  defaultModel: "claude-sonnet-4-5-20250929",
  modelByStep: {},
  maxTurnsPerStep: 32,
  maxTokensPerStep: 60000,
  gates: [],
  context: "",
};

const SDD_DIR = ".sdd";

const sddRoot = (cwd) => path.join(cwd, SDD_DIR);
const configPath = (cwd) => path.join(sddRoot(cwd), "config.yaml");
const tasksRoot = (cwd) => path.join(sddRoot(cwd), "tasks");
const archiveRoot = (cwd) => path.join(sddRoot(cwd), "archive");
const libraryRoot = (cwd) => path.join(sddRoot(cwd), "library");
const rulesRoot = (cwd) => path.join(sddRoot(cwd), "rules");
const ejectedPromptsRoot = (cwd) => path.join(sddRoot(cwd), "prompts");

const isInitialized = (cwd) => fs.existsSync(configPath(cwd));

const loadConfig = (cwd) => {
  if (!isInitialized(cwd)) {
    throw new Error(
      `No se encontró .sdd/ en ${cwd}. Ejecutá 'sdd init' primero.`,
    );
  }
  const raw = fs.readFileSync(configPath(cwd), "utf8");
  const parsed = yaml.load(raw) || {};
  return { ...DEFAULT_CONFIG, ...parsed };
};

const writeDefaultConfig = (cwd, overrides = {}) => {
  const cfg = { ...DEFAULT_CONFIG, ...overrides };
  fs.writeFileSync(configPath(cwd), yaml.dump(cfg), "utf8");
  return configPath(cwd);
};

const updateConfig = (cwd, partial) => {
  const current = loadConfig(cwd);
  const merged = { ...current, ...partial };
  fs.writeFileSync(configPath(cwd), yaml.dump(merged), "utf8");
  return merged;
};

const ensureLayout = (cwd) => {
  const dirs = [
    sddRoot(cwd),
    tasksRoot(cwd),
    archiveRoot(cwd),
    libraryRoot(cwd),
    rulesRoot(cwd),
  ];
  const created = [];
  for (const d of dirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
      created.push(d);
    }
  }
  return created;
};

module.exports = {
  DEFAULT_CONFIG,
  SDD_DIR,
  sddRoot,
  configPath,
  tasksRoot,
  archiveRoot,
  libraryRoot,
  rulesRoot,
  ejectedPromptsRoot,
  isInitialized,
  loadConfig,
  writeDefaultConfig,
  updateConfig,
  ensureLayout,
};
