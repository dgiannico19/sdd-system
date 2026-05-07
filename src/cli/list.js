const c = require("../render/colors");
const { listSlugs, listArchivedSlugs, load } = require("../core/task");
const { isInitialized } = require("../core/config");

const list = async (_args, { cwd }) => {
  if (!isInitialized(cwd)) {
    throw new Error("No hay .sdd/ inicializado. Corré 'sdd init' primero.");
  }
  const active = listSlugs(cwd);
  const archived = listArchivedSlugs(cwd);

  process.stdout.write(`${c.bold("Activas")} (${active.length})\n`);
  if (active.length === 0) {
    process.stdout.write(`  ${c.dim("(ninguna)")}\n`);
  } else {
    for (const slug of active) {
      try {
        const s = load(cwd, slug);
        const verdict = (s.history || []).slice(-1)[0];
        const last = verdict ? `${verdict.stepId}=${verdict.verdict}` : "—";
        process.stdout.write(`  ${c.cyan(slug)}  ${c.dim(s.status)}  current=${s.currentStepId}  last=${last}\n`);
      } catch (err) {
        process.stdout.write(`  ${c.red(slug)}  ${c.dim("(state.json inválido)")}\n`);
      }
    }
  }

  process.stdout.write(`\n${c.bold("Archivadas")} (${archived.length})\n`);
  if (archived.length === 0) {
    process.stdout.write(`  ${c.dim("(ninguna)")}\n`);
  } else {
    for (const slug of archived) {
      process.stdout.write(`  ${c.gray(slug)}\n`);
    }
  }
};

module.exports = list;
