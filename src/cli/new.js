const fs = require("fs");
const path = require("path");
const c = require("../render/colors");
const { isInitialized, loadConfig } = require("../core/config");
const { create, taskDir } = require("../core/task");
const { KINDS, DEFAULT_KIND } = require("../core/steps");
const { parseKind } = require("./_args");

const FEATURE_TEMPLATE = (title) => `# ${title}

> Editá este archivo con la descripción de la tarea antes de correr \`sdd run\`.
> Si lo dejás vacío o con los placeholders, el agente trabajará solo con el título.

## Descripción
<qué hay que hacer y por qué importa>

## Contexto / restricciones
<opcional: deps que no tocar, deadlines, sistemas relacionados, decisiones previas>

## Definición de hecho
<opcional: criterios concretos para considerar la tarea terminada>

## Notas
<opcional: links a tickets, conversaciones, antecedentes>
`;

const BUG_TEMPLATE = (title) => `# ${title}

> Editá este archivo con todo el contexto del bug antes de correr \`sdd run\`.
> Cuanto más detalle (logs, repro, alcance) le des, mejor el agente encuentra la causa raíz.

## Síntoma
<qué se ve roto: error, comportamiento incorrecto, UI rota, dato corrupto>

## Pasos de reproducción
<lista numerada y mínima para reproducir el bug>

## Comportamiento esperado vs actual
<qué debería pasar / qué pasa hoy>

## Logs / stack trace
<pegá logs, errores, capturas — o link al monitoring>

## Alcance sospechado
<opcional: archivos, módulos o features donde creés que está el problema>

## Notas
<opcional: link al ticket, hilos, mensajes de usuarios afectados>
`;

const TEMPLATES = {
  feature: FEATURE_TEMPLATE,
  bug: BUG_TEMPLATE,
};

const newCmd = async (args, { cwd }) => {
  if (!isInitialized(cwd)) {
    throw new Error("No hay .sdd/ inicializado. Corré 'sdd init' primero.");
  }
  const { rest, kind: kindArg } = parseKind(args, KINDS);
  const kind = kindArg || DEFAULT_KIND;
  const title = rest.join(" ").trim();
  if (!title) {
    throw new Error('Uso: sdd new "<título de la tarea>" [--kind=feature|bug]');
  }
  const config = loadConfig(cwd);
  const state = create(cwd, { title, gates: config.gates || [], kind });
  const dir = taskDir(cwd, state.slug);

  const template = TEMPLATES[state.kind] || TEMPLATES[DEFAULT_KIND];
  const taskMdPath = path.join(dir, "task.md");
  fs.writeFileSync(taskMdPath, template(title), "utf8");

  process.stdout.write(`${c.green("✓")} Tarea creada\n`);
  process.stdout.write(`  ${c.bold("slug")}     ${state.slug}\n`);
  process.stdout.write(`  ${c.bold("id")}       ${state.id}\n`);
  process.stdout.write(`  ${c.bold("kind")}     ${state.kind}\n`);
  process.stdout.write(`  ${c.bold("título")}   ${state.title}\n`);
  process.stdout.write(`  ${c.bold("ruta")}     ${path.relative(cwd, dir)}\n`);
  process.stdout.write(`  ${c.bold("gates")}    [${(state.gates || []).join(", ")}]\n\n`);
  process.stdout.write(`Próximos pasos:\n`);
  process.stdout.write(`  1. Editá ${c.cyan(path.relative(cwd, taskMdPath))} con la descripción.\n`);
  process.stdout.write(`  2. Corré ${c.cyan("sdd run")} para generar las specs.\n`);
};

module.exports = newCmd;
