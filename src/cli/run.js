const c = require("../render/colors");
const next = require("./next");
const { isInitialized } = require("../core/config");
const { load, resolveTask } = require("../core/task");
const { pickNext } = require("../core/pipeline");

const runCmd = async (args, { cwd }) => {
  if (!isInitialized(cwd)) {
    throw new Error("No hay .sdd/ inicializado. Corré 'sdd init' primero.");
  }
  const slugArg = args[0];
  const initial = resolveTask(cwd, slugArg);
  const slug = initial.slug;

  while (true) {
    const fresh = load(cwd, slug);
    if (fresh.status === "done") {
      process.stdout.write(`${c.green("🏁 done")} ${slug}\n`);
      return;
    }
    if (fresh.status === "gate") {
      process.stdout.write(`${c.yellow("⏸ gate alcanzado")} — ejecutá ${c.cyan("sdd next " + slug)} para continuar tras revisar.\n`);
      return;
    }

    const upcoming = pickNext(fresh);
    if (!upcoming) {
      process.stdout.write(`${c.green("✓")} pipeline completo. ${c.cyan("sdd archive " + slug)} cuando deployees.\n`);
      return;
    }
    if (upcoming.phase === "build") {
      process.stdout.write(`${c.yellow("⏹ specs listas")} — ${c.cyan("sdd dev")} | ${c.cyan("sdd review")} | ${c.cyan("sdd commit")} | ${c.cyan("sdd archive")}\n`);
      return;
    }

    const verdict = await next([slug], { cwd });
    if (!verdict || verdict.verdict !== "pass") {
      return;
    }

    const after = load(cwd, slug);
    if (after.status === "gate" || after.status === "done") {
      return;
    }
  }
};

module.exports = runCmd;
