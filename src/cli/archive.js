const fs = require("fs");
const path = require("path");
const c = require("../render/colors");
const { isInitialized, archiveRoot } = require("../core/config");
const { resolveTask, taskDir } = require("../core/task");

const copyTree = (src, dest) => {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name.endsWith(".tmp") || entry.name.endsWith(".lock")) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyTree(s, d);
    else fs.copyFileSync(s, d);
  }
};

const writeArchivedState = (dest, state) => {
  const archived = {
    ...state,
    status: "archived",
    archivedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(dest, "state.json"), JSON.stringify(archived, null, 2), "utf8");
};

const archive = async (args, { cwd }) => {
  if (!isInitialized(cwd)) {
    throw new Error("No hay .sdd/ inicializado. Corré 'sdd init' primero.");
  }
  const slug = args[0];
  const state = resolveTask(cwd, slug);
  const src = taskDir(cwd, state.slug);
  const dest = path.join(archiveRoot(cwd), state.slug);

  if (!fs.existsSync(src)) {
    throw new Error(`No existe la tarea: ${state.slug}`);
  }
  if (fs.existsSync(dest)) {
    throw new Error(`Ya existe ${path.relative(cwd, dest)}/. Borralo o renombralo manualmente antes de archivar.`);
  }

  process.stdout.write(`${c.bold("sdd archive")} ${state.slug}\n\n`);

  copyTree(src, dest);
  writeArchivedState(dest, state);
  process.stdout.write(`  ${c.green("+")} ${path.relative(cwd, dest)}/\n`);

  fs.rmSync(src, { recursive: true, force: true });
  process.stdout.write(`  ${c.red("-")} ${path.relative(cwd, src)}/\n`);

  process.stdout.write(`\n${c.green("✓ archivada")} ${state.slug}\n`);
};

module.exports = archive;
