const c = require("../render/colors");

const printHelp = () => {
  process.stdout.write(`${c.bold("sdd")} — Spec-Driven Development CLI

${c.bold("Setup")}
  ${c.cyan("init")}     [--eject-prompts] [--refresh-context]   Bootstrap .sdd/ con config y carpetas
  ${c.cyan("new")}      "<título>" [--kind=feature|bug]         Crea una tarea nueva (default: feature)
  ${c.cyan("doctor")}                                            Diagnóstico del entorno

${c.bold("Fase de specs")}  (steps 1-4: proposal, exploration, design, behavior)
  ${c.cyan("run")}      [slug]            Ejecuta steps de specs hasta gate o fin de fase
  ${c.cyan("next")}     [slug]            Ejecuta el siguiente step pendiente

${c.bold("Fase de build")}  (cada uno opcional, podés frenar después de specs)
  ${c.cyan("dev")}      [slug] [-m "..."] Implementa código según tasks.md (mantiene specs en sync)
  ${c.cyan("review")}   [slug] [-m "..."] Review estricto del código + actualiza spec si diverge
  ${c.cyan("commit")}   [slug] [-m "..."] Plan de commits (devuelve git add/commit, no ejecuta)
  ${c.cyan("archive")}  [slug]            Mueve la tarea a .sdd/archive/ y borra .sdd/tasks/<slug>/

  ${c.dim("-m / --feedback : feedback inline para iterar (gana sobre tasks.md/spec.md)")}

${c.bold("Inspección")}
  ${c.cyan("status")}   [slug] [--watch]  Muestra el avance del pipeline
  ${c.cyan("list")}                       Lista tareas activas y archivadas

${c.bold("Autenticación")}
  Requiere Claude Code instalado y logueado: ${c.cyan("claude login")}

${c.bold("Variables de entorno")}
  SDD_DEBUG=1          imprime stack traces
  SDD_CLAUDE_PATH      ruta al binario de claude (default: 'which claude')
`);
};

const handlers = {
  init: () => require("./init"),
  new: () => require("./new"),
  next: () => require("./next"),
  run: () => require("./run"),
  dev: () => require("./dev"),
  review: () => require("./review"),
  commit: () => require("./commit"),
  archive: () => require("./archive"),
  status: () => require("./status"),
  list: () => require("./list"),
  doctor: () => require("./doctor"),
};

const run = async (argv) => {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h" || command === "help") {
    printHelp();
    return;
  }
  const loader = handlers[command];
  if (!loader) {
    process.stderr.write(`Comando desconocido: '${command}'.\n`);
    printHelp();
    process.exitCode = 1;
    return;
  }
  const handler = loader();
  await handler(rest, { cwd: process.cwd() });
};

module.exports = { run };
