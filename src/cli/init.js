const fs = require("fs");
const path = require("path");
const c = require("../render/colors");
const {
  ensureLayout,
  isInitialized,
  writeDefaultConfig,
  updateConfig,
  configPath,
  rulesRoot,
  ejectedPromptsRoot,
} = require("../core/config");
const { detectStack } = require("../core/stack");

const promptsPackageRoot = path.join(__dirname, "..", "prompts");

const RULES_README = `# .sdd/rules/

Acá podés poner archivos \`.md\` con reglas o convenciones que el agente debe respetar
en cada step (specs, dev, review, commit). Todos los \`.md\` de esta carpeta se inyectan
en el system prompt bajo la sección \`# User rules\`. Este \`README.md\` se ignora.

## Archivos típicos

- \`coding-style.md\` — convenciones de naming, formato, librerías preferidas/prohibidas.
- \`fsd.md\` — reglas FSD propias del repo (capas custom, restricciones de imports).
- \`testing.md\` — qué framework usar, patrones de fixtures, qué cosas mockear.
- \`review-checklist.md\` — qué chequear en \`sdd review\`.
- \`commit-style.md\` — convenciones de commits (Conventional Commits, scope, idioma).

## Tips

- Sé específico. "Usá const, no let" es accionable. "Escribí buen código" no.
- Si una regla aplica a un solo step, mencionalo: "Para sdd review: bloquear X si...".
- Las reglas tienen prioridad sobre los defaults del agente, así que pueden contradecir
  las pautas internas si tu repo lo requiere.

## CLAUDE.md

Si tu repo ya tiene \`CLAUDE.md\` en la raíz, también se carga automáticamente. No hace
falta duplicar su contenido acá.
`;

const copyTree = (src, dest) => {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyTree(s, d);
    else fs.copyFileSync(s, d);
  }
};

const ejectPrompts = (cwd) => {
  const dest = ejectedPromptsRoot(cwd);
  if (fs.existsSync(dest)) {
    return { dest, copied: false };
  }
  copyTree(promptsPackageRoot, dest);
  return { dest, copied: true };
};

const ensureRulesReadme = (cwd) => {
  const readme = path.join(rulesRoot(cwd), "README.md");
  if (fs.existsSync(readme)) return null;
  fs.writeFileSync(readme, RULES_README, "utf8");
  return readme;
};

const init = async (args, { cwd }) => {
  const wantsEject = args.includes("--eject-prompts");
  const wantsRefresh = args.includes("--refresh-context");

  if (wantsRefresh) {
    if (!isInitialized(cwd)) {
      throw new Error("No hay .sdd/ inicializado. Corré 'sdd init' primero.");
    }
    const detected = detectStack(cwd);
    updateConfig(cwd, { context: detected });
    process.stdout.write(`${c.green("✓")} context refrescado en ${path.relative(cwd, configPath(cwd))}\n`);
    if (detected) {
      process.stdout.write(`${c.dim(detected.split("\n").map((l) => `    ${l}`).join("\n"))}\n`);
    }
    return;
  }

  const wasInitialized = isInitialized(cwd);

  // Ensure layout (idempotent — crea dirs faltantes incluso si ya estaba inicializado).
  const created = ensureLayout(cwd);
  for (const dir of created) {
    process.stdout.write(`  ${c.green("+")} ${path.relative(cwd, dir)}/\n`);
  }

  // Asegurar README.md de rules (también idempotente).
  const newReadme = ensureRulesReadme(cwd);
  if (newReadme) {
    process.stdout.write(`  ${c.green("+")} ${path.relative(cwd, newReadme)}\n`);
  }

  if (!wasInitialized) {
    const detected = detectStack(cwd);
    writeDefaultConfig(cwd, { context: detected });
    process.stdout.write(`  ${c.green("+")} ${path.relative(cwd, configPath(cwd))}\n`);
    if (detected) {
      process.stdout.write(`\n${c.dim("Stack detectado e inyectado en config.context:")}\n`);
      process.stdout.write(`${c.dim(detected.split("\n").map((l) => `    ${l}`).join("\n"))}\n`);
    }
  } else if (!wantsEject && created.length === 0 && !newReadme) {
    process.stdout.write(`${c.yellow("Ya inicializado")}: ${path.relative(cwd, configPath(cwd))}\n`);
    process.stdout.write(`${c.dim("--eject-prompts para editar prompts; --refresh-context para re-detectar stack.")}\n`);
    return;
  }

  if (wantsEject) {
    const { dest, copied } = ejectPrompts(cwd);
    if (copied) {
      process.stdout.write(`  ${c.green("+")} ${path.relative(cwd, dest)}/  ${c.dim("(prompts editables)")}\n`);
    } else {
      process.stdout.write(`  ${c.yellow("=")} ${path.relative(cwd, dest)}/  ${c.dim("(ya existía, no se sobrescribe)")}\n`);
    }
  }

  process.stdout.write(`\n${c.bold("Listo.")} Próximos pasos:\n`);
  process.stdout.write(`  1. Revisá ${c.cyan(".sdd/config.yaml")} (gates y context).\n`);
  process.stdout.write(`  2. Sumá reglas en ${c.cyan(".sdd/rules/*.md")} (opcional, leé el README ahí).\n`);
  process.stdout.write(`  3. Asegurate de tener Claude Code logueado: ${c.cyan("claude login")}.\n`);
  process.stdout.write(`  4. Creá una tarea: ${c.cyan('sdd new "tu idea"')}.\n`);
};

module.exports = init;
