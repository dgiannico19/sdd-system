const fs = require("fs");
const path = require("path");
const os = require("os");
const { tasksRoot, archiveRoot } = require("./config");
const { firstStep, resolveKind, DEFAULT_KIND } = require("./steps");
const { buildSlug, ensureUnique, shortId } = require("./slug");

const STATE_FILE = "state.json";

const taskDir = (cwd, slug) => path.join(tasksRoot(cwd), slug);
const stateFile = (cwd, slug) => path.join(taskDir(cwd, slug), STATE_FILE);

const writeAtomic = (filePath, content) => {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, filePath);
};

const listSlugs = (cwd) => {
  const root = tasksRoot(cwd);
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
};

const listArchivedSlugs = (cwd) => {
  const root = archiveRoot(cwd);
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
};

const create = (cwd, { title, gates, kind }) => {
  const baseSlug = buildSlug(title);
  const slug = ensureUnique(baseSlug, listSlugs(cwd));
  const resolvedKind = resolveKind(kind) || DEFAULT_KIND;
  const state = {
    id: shortId(),
    slug,
    title,
    kind: resolvedKind,
    createdAt: new Date().toISOString(),
    currentStepId: firstStep(resolvedKind).id,
    status: "idle",
    gates: Array.isArray(gates) ? gates : [],
    history: [],
  };
  fs.mkdirSync(taskDir(cwd, slug), { recursive: true });
  writeAtomic(stateFile(cwd, slug), JSON.stringify(state, null, 2));
  return state;
};

const load = (cwd, slug) => {
  const f = stateFile(cwd, slug);
  if (!fs.existsSync(f)) {
    throw new Error(`No se encontró tarea '${slug}' en ${tasksRoot(cwd)}.`);
  }
  return JSON.parse(fs.readFileSync(f, "utf8"));
};

const save = (cwd, state) => {
  writeAtomic(stateFile(cwd, state.slug), JSON.stringify(state, null, 2));
  return state;
};

const findActive = (cwd) => {
  const slugs = listSlugs(cwd);
  if (slugs.length === 0) return null;
  const states = slugs
    .map((s) => {
      try {
        return load(cwd, s);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const running = states.find((s) => s.status === "running");
  if (running) return running;
  const interrupted = states.find((s) => s.status === "interrupted");
  if (interrupted) return interrupted;
  const idle = states
    .filter((s) => s.status === "idle" || s.status === "gate")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (idle.length > 0) return idle[0];
  return null;
};

const resolveTask = (cwd, taskRef) => {
  if (taskRef) return load(cwd, taskRef);
  const active = findActive(cwd);
  if (!active) {
    throw new Error(
      "No hay tarea activa. Pasá un slug explícito o creá una con 'sdd new'.",
    );
  }
  return active;
};

const completedStepIds = (state) =>
  (state.history || [])
    .filter((h) => h.verdict === "pass")
    .map((h) => h.stepId);

const recordHistory = (state, entry) => {
  state.history = state.history || [];
  state.history.push({ ranAt: new Date().toISOString(), ...entry });
  return state;
};

module.exports = {
  taskDir,
  stateFile,
  writeAtomic,
  create,
  load,
  save,
  listSlugs,
  listArchivedSlugs,
  findActive,
  resolveTask,
  completedStepIds,
  recordHistory,
};
