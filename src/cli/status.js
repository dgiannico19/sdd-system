const c = require("../render/colors");
const { isInitialized } = require("../core/config");
const { resolveTask, load } = require("../core/task");
const { renderBar } = require("../render/pipelineBar");

const parseArgs = (args) => {
  let slug = null;
  let watch = false;
  let intervalMs = 2000;
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === "--watch" || a === "-w") {
      watch = true;
    } else if (a === "--interval") {
      intervalMs = Number(args[++i]) * 1000;
    } else if (!slug) {
      slug = a;
    }
  }
  return { slug, watch, intervalMs };
};

const status = async (args, { cwd }) => {
  if (!isInitialized(cwd)) {
    throw new Error("No hay .sdd/ inicializado. Corré 'sdd init' primero.");
  }
  const { slug, watch, intervalMs } = parseArgs(args);
  const initialState = resolveTask(cwd, slug);

  const printOnce = (state) => {
    process.stdout.write(`${renderBar(state, { cwd })}\n`);
  };

  if (!watch) {
    printOnce(initialState);
    return;
  }

  const targetSlug = initialState.slug;
  const clear = () => process.stdout.write("\x1b[2J\x1b[H");
  const loop = () => {
    try {
      const fresh = load(cwd, targetSlug);
      clear();
      printOnce(fresh);
      process.stdout.write(`${c.dim(`(watch cada ${intervalMs / 1000}s — Ctrl+C para salir)`)}\n`);
    } catch (err) {
      process.stderr.write(`${c.red("error")} ${err.message}\n`);
    }
  };
  loop();
  const handle = setInterval(loop, intervalMs);
  process.on("SIGINT", () => {
    clearInterval(handle);
    process.stdout.write("\n");
    process.exit(0);
  });
};

module.exports = status;
