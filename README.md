# sdd — Spec-Driven Development CLI

CLI de terminal para conducir tareas de software en dos fases: una **fase de specs** (proposal → exploration → design → behavior) que corre con `sdd run` y termina con todos los `.md` del task listos para revisión, y una **fase de build** opcional (`sdd dev` → `sdd review` → `sdd commit` → `sdd archive`) que implementa, audita, planifica commits y archiva. Cada step lo ejecuta un agente de Claude que reporta un verdict (`STEP_PASS` / `STEP_GAP` / `STEP_VETO`).

Soporta dos tipos de tarea (`--kind`): **feature** (default, pipeline completo) y **bug** (pipeline reducido que va directo a exploration → behavior → build, sin proposal/design).

Requiere [Claude Code](https://docs.claude.com/en/docs/claude-code) instalado y autenticado en la máquina local. El uso se factura contra la suscripción Pro/Max del propio dev — no necesita API key.

---

## Requisitos

- **Node.js 20+**
- **Claude Code CLI** instalado y logueado:
  ```bash
  claude login
  ```
  Cada miembro del equipo se autentica con su cuenta. La librería `@anthropic-ai/claude-agent-sdk` reutiliza esa sesión.

## Instalación

```bash
npm install -g sdd
```

O desde el repo, en modo desarrollo:

```bash
git clone <repo>
cd sdd
npm install
npm link
```

Verificá el entorno:

```bash
sdd doctor
```

Debe reportar Node ≥20, `@anthropic-ai/claude-agent-sdk` resuelto y `claude CLI` detectado.

---

## Quick start

```bash
cd /ruta/a/tu/proyecto

sdd init                              # crea .sdd/ con config y carpetas (detecta stack)
# (opcional) sumás reglas en .sdd/rules/*.md o usás CLAUDE.md ya existente
sdd new "exportar usuarios a CSV"                  # feature (default) — pipeline completo
sdd new "login falla con 500 al expirar token" --kind=bug   # bug — pipeline reducido
# editás .sdd/tasks/<slug>/task.md con descripción/contexto/DoH (o repro/logs si es bug)

sdd run                               # corre fase de specs (steps 1→4) hasta el boundary
                                      # → revisás los .md generados, decidís si seguís

sdd dev                               # implementa código
sdd dev -m "el LoadingSpinner debe reusar <Loader/> existente"   # itera con feedback

sdd review                            # auditoría estricta del código
sdd commit                            # plan de commits (devuelve add/commit, NO ejecuta)
# corrés los git add/commit a mano, deployás

sdd archive                           # mueve la tarea a .sdd/archive/ y borra .sdd/tasks/<slug>/
```

`sdd run` ejecuta los steps de la **fase de specs** (1-4) sin pausas (default `gates: []`). Cuando termina, queda en el boundary spec/build esperando que invoques explícitamente la fase de build.

Podés cortar después de `sdd run` y trabajar las specs en otro agente — la fase build es 100% opcional.

---

## Comandos

### Setup
| Comando                                          | Qué hace                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| `sdd init [--eject-prompts] [--refresh-context]` | Crea `.sdd/` y detecta el stack. `--eject-prompts` para editar prompts. `--refresh-context` re-detecta. |
| `sdd new "<título>" [--kind=feature\|bug]`       | Crea slug `YYYY-MM-DD-<kebab>` y un template `task.md` editable. Default `feature`. |
| `sdd doctor`                                     | Diagnóstico del entorno                                             |

**Cómo describir la tarea**: `sdd new "título"` genera `.sdd/tasks/<slug>/task.md` con un template editable. Para una **feature** las secciones son descripción / contexto / DoH / notas. Para un **bug** (`--kind=bug`) son síntoma / pasos de repro / esperado vs actual / logs / alcance / notas — pegale toda la info que tengas (logs, stack, link al ticket) antes de `sdd run`. Si lo dejás con placeholders y el título no alcanza, el agente devuelve `STEP_GAP` pidiéndote completarlo. `sdd archive` se lo lleva a `.sdd/archive/<slug>/` junto con el resto de los artefactos.

### Fase de specs (auto)
| Comando             | Qué hace                                                            |
| ------------------- | ------------------------------------------------------------------- |
| `sdd run [slug]`    | Loop de specs hasta gate o cruce a build                            |
| `sdd next [slug]`   | Ejecuta el siguiente step pendiente (1 a la vez)                    |

### Fase de build (manual, opcional)
| Comando                          | Qué hace                                                            |
| -------------------------------- | ------------------------------------------------------------------- |
| `sdd dev [slug] [-m "..."]`      | Step 5: implementa código y mantiene specs en sync                  |
| `sdd review [slug] [-m "..."]`   | Step 6: review estricto FSD/calidad/spec-alignment                  |
| `sdd commit [slug] [-m "..."]`   | Step 7: plan de commits (devuelve `git add` + `git commit` separados, NO ejecuta) |
| `sdd archive [slug]`             | Cierra la tarea: copia `.md` a `.sdd/archive/<slug>/` y borra `.sdd/tasks/<slug>/` |

> Las tres comandos de la fase de build aceptan **feedback inline con `-m "..."`** para iterar sin tocar código a mano. Ver sección [Iterar con feedback](#iterar-con-feedback--m-) más abajo.

### Inspección
| Comando                       | Qué hace                                                            |
| ----------------------------- | ------------------------------------------------------------------- |
| `sdd status [slug] [--watch]` | Muestra el avance del pipeline                                      |
| `sdd list`                    | Lista tareas activas y archivadas                                   |

---

## El pipeline

7 steps en dos fases. Los artefactos viven en `.sdd/tasks/<slug>/` hasta `sdd archive`. El conjunto de steps que se ejecutan depende del `--kind` del task.

### Fase de specs (`sdd run`)
| #   | Step                         | Artefactos esperados        | feature | bug |
| --- | ---------------------------- | --------------------------- | :-----: | :-: |
| 1   | `proposal-initiator`         | `proposal.md`, `spec.md`    | ✅      | —   |
| 2   | `exploration-analyzer`       | `exploration.md`            | ✅      | ✅  |
| 3   | `design-builder` 🚪          | `design.md`, `tasks.md`     | ✅      | —   |
| 4   | `spec-behavior-generator`    | `testing.md` (refina spec)  | ✅      | ✅  |

### Fase de build (manual)
| #   | Step                         | Comando         | feature | bug | Notas                          |
| --- | ---------------------------- | --------------- | :-----: | :-: | ------------------------------ |
| 5   | `dev-executor`               | `sdd dev`       | ✅      | ✅  | Mantiene specs sincronizadas con el código real |
| 6   | `strict-reviewer`            | `sdd review`    | ✅      | ✅  | Veto absoluto ante violaciones FSD; sync de specs si quedaron atrasadas |
| 7   | `commit-splitter`            | `sdd commit`    | ✅      | ✅  | Devuelve `git add` y `git commit` como **comandos separados**, no ejecuta nada |
| —   | (cierre)                     | `sdd archive`   | ✅      | ✅  | JS puro, sin agente. Mueve a `.sdd/archive/` y borra `.sdd/tasks/<slug>/` |

🚪 = gate por default. Configurable en `.sdd/config.yaml`.

Para un **bug**, `task.md` reemplaza al combo proposal/spec — el agente lo lee como reporte del bug (síntoma + repro + logs) y arranca por `exploration-analyzer` buscando root cause. Después `spec-behavior-generator` deja el test de regresión, y la fase de build aplica el fix. Te ahorrás `proposal-initiator` y `design-builder`, que son overkill para un fix puntual.

Cada step termina su última línea de texto con uno de estos tokens:

- `STEP_PASS` — completó. El motor avanza.
- `STEP_GAP: <razón>` — falta input humano. El motor frena, deja el step en `idle`.
- `STEP_VETO: <razón>` — violación crítica (típicamente FSD). Aborta el pipeline.

Sin token, el motor lo cuenta como `error`.

---

## Configuración

`.sdd/config.yaml` (creado por `sdd init`):

```yaml
schema: sdd/v1
language: es
defaultModel: claude-sonnet-4-5-20250929
modelByStep: {}            # opcional: { "design-builder": "claude-opus-4-7" }
maxTurnsPerStep: 32
maxTokensPerStep: 60000

# vacío por default: sdd run completa toda la fase de specs (1→4) sin pausas.
# Agregá índices [1..4] para forzar revisión humana entre steps.
# Ejemplo: gates: [3] pausa después de design-builder.
gates: []

# Stack y reglas que el agente inyecta como "Project context".
# sdd init lo llena automáticamente leyendo package.json/tsconfig/go.mod/etc.
context: ""
```

`sdd init` **detecta automáticamente** el stack del proyecto (lee `package.json`, `tsconfig.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, etc. y la estructura `src/` incluyendo capas FSD) y escribe el resultado en `context`. Lo ves y editás en el yaml.

Para re-detectar después de cambios de stack:

```bash
sdd init --refresh-context
```

Si querés agregar reglas extra (p.ej. "todos los handlers pasan por middleware X"), simplemente editá el campo `context` — lo que pongas reemplaza la detección automática. Si lo dejás vacío, el detector vuelve a actuar al runtime.

---

## Iterar con feedback (`-m`)

Cuando `sdd dev`, `sdd review` o `sdd commit` no te devuelven exactamente lo que querés, **no edites el código a mano** — pasale feedback al agente con `-m "..."` y dejá que itere. El feedback se inyecta en el `userMessage` del agente como sección prioritaria, sobre cualquier otra instrucción de los `.md` previos.

```bash
sdd dev                                                            # primera pasada
sdd dev -m "reusá <Loader/> de shared/, no crees uno nuevo"        # ajusta
sdd dev -m "memoizá callbacks con useCallback, envolvé el componente con React.memo"

sdd review -m "fijate especialmente en los useEffect del PaymentForm"
sdd commit -m "agrupá shared y entities en un solo commit, separá features"
```

### Cómo se comporta

- **Prioridad:** si el feedback contradice `tasks.md` / `design.md` / `spec.md`, **gana el feedback**. El agente actualiza esos `.md` para que queden en sync con el cambio (sino la próxima iteración volvería al estado anterior).
- **Delta, no rewrite:** el prompt instruye explícitamente a aplicar el cambio mínimo y preservar todo lo correcto. No tira el trabajo previo.
- **Ambigüedad:** si el feedback puede interpretarse de varias formas, el agente devuelve `STEP_GAP: feedback ambiguo — <interpretaciones>` en lugar de adivinar. Refinás y volvés a correr:
  ```bash
  sdd dev -m "usá memoización"
  # → STEP_GAP: feedback ambiguo — ¿useMemo, useCallback, React.memo?
  sdd dev -m "envolvé el componente con React.memo y memoizá los callbacks con useCallback"
  ```
- **Visibilidad:** el header del step te muestra qué feedback se cargó:
  ```
  ▶ código en src/  · 1/3 build · dev-executor
     reglas: CLAUDE.md, .sdd/rules/coding-style.md
     feedback: reusá <Loader/> de shared/, no crees uno nuevo
  ```
- **Auditoría:** el feedback queda guardado en `state.history[].feedback` de `state.json`, así podés ver después qué iteración disparó qué cambio.

### Iteración natural recomendada

```bash
sdd dev                                # arranca
# revisás el código y el diff
sdd dev -m "feedback 1"                # ajusta
# revisás de nuevo
sdd dev -m "feedback 2"                # otra
# OK
sdd review                             # review estricto sobre lo que quedó
# si encuentra problemas, sdd dev -m "..." de vuelta
sdd commit                             # plan de commits
# corrés git a mano, deployás
sdd archive
```

### Alias y formas largas

`-m`, `--feedback` y `--message` son equivalentes. Para feedback multi-línea o muy largo, usá heredoc o `cat`:

```bash
sdd dev -m "$(cat <<'EOF'
Cambios:
1. Reusar <Loader/> de shared/
2. Memoizar handlers
3. Sumar test que cubra el escenario X
EOF
)"
```

---

## Reglas del proyecto (skills/conventions)

El agente carga **reglas custom** en cada step y las inyecta en el system prompt bajo la sección `# User rules`. Vienen de dos lugares:

1. **`CLAUDE.md`** en la raíz del repo (si existe) — se reusa la convención de Claude Code, no hay que duplicar nada.
2. **`.sdd/rules/*.md`** — todos los `.md` de esa carpeta, en orden alfabético. `README.md` se ignora.

`sdd init` crea `.sdd/rules/` con un `README.md` que explica el formato. Archivos típicos:

| Archivo                | Para qué                                                       |
| ---------------------- | -------------------------------------------------------------- |
| `coding-style.md`      | naming, formato, librerías preferidas/prohibidas               |
| `fsd.md`               | reglas FSD propias (capas custom, restricciones de imports)    |
| `testing.md`           | framework, fixtures, qué cosas mockear                         |
| `review-checklist.md`  | qué chequear en `sdd review`                                   |
| `commit-style.md`      | convenciones de commits (Conventional Commits, scope, idioma)  |

Las reglas tienen **prioridad sobre los defaults del agente**. En el header de cada step vas a ver qué archivos se cargaron:

```
▶ proposal.md, spec.md  · 1/4 specs · proposal-initiator
   reglas: CLAUDE.md, .sdd/rules/fsd.md, .sdd/rules/coding-style.md
```

Si una regla no se está respetando, lo más probable es que el archivo no esté siendo cargado — verificá que termine en `.md` y no se llame `README.md`.

---

## Tools que usa el agente

El agente corre con permisos `bypassPermissions` (no pide confirmación) y tiene acceso a las built-in del Claude Agent SDK:

- `Read`, `Edit`, `Write`
- `Glob`, `Grep`
- `Bash`

`sdd commit` restringe el set: solo `Read`, `Glob`, `Grep`, `Bash` (sin `Write`/`Edit`), y el prompt prohíbe explícitamente correr cualquier `git` que mute estado (`add`, `commit`, `push`, `reset`, etc). Solo lee el diff y devuelve el plan.

Operan sobre el cwd desde el que corras `sdd`. **No corras `sdd` desde tu home o `/`** — usalo siempre desde la raíz del proyecto.

---

## Editar prompts

Los prompts viven en `src/prompts/` del paquete. Para editarlos por proyecto:

```bash
sdd init --eject-prompts
```

Esto copia los prompts a `.sdd/prompts/` y `sdd` los prefiere ante los del paquete. El shared baseline (`zero-guesswork.md`) define las reglas comunes a todos los steps.

---

## Troubleshooting

**`claude CLI` falla en `sdd doctor`**
Instalá Claude Code y corré `claude login`. Verificá con `claude --version`.

**El agente se queja de no poder leer un archivo**
Estás corriendo `sdd` desde un cwd equivocado. El agente solo ve archivos bajo el cwd actual.

**`STEP_GAP` recurrente**
Faltan inputs (artefactos previos, contexto del proyecto). Revisá `.sdd/config.yaml#context` y los artefactos del task. Si es `STEP_GAP: descripción insuficiente`, completá `.sdd/tasks/<slug>/task.md`.

**Una regla de `.sdd/rules/` no se está aplicando**
Mirá el header del step: si el archivo no aparece en la línea `reglas: ...`, no se cargó. Causas típicas: no termina en `.md`, se llama `README.md` (se ignora), está vacío, o está fuera de `.sdd/rules/`. `CLAUDE.md` solo se carga si está en la raíz del repo (no en subcarpetas).

**El feedback con `-m` no parece haberse aplicado**
1. Verificá que el header del step muestre la línea `feedback: ...` con tu texto. Si no aparece, el flag no se parseó (revisá comillas).
2. El agente puede haber considerado que el feedback ya estaba aplicado. Mirá el output — si dice `STEP_PASS` sin tocar nada, es eso.
3. Si el feedback era ambiguo, el agente devuelve `STEP_GAP: feedback ambiguo — ...`. Refinalo y volvé a correr.

**Stack traces**
```bash
SDD_DEBUG=1 sdd next
```

**`Claude Code native binary not found...`**
El SDK trae binarios nativos por plataforma como `optionalDependencies` y a veces npm elige el incorrecto (musl vs glibc). `sdd` resuelve `which claude` automáticamente y se lo pasa al SDK, así que asegurate de tener el `claude` global en el PATH. Si está en otro lado, override con:
```bash
SDD_CLAUDE_PATH=/ruta/al/claude sdd next
```

---

## Nota sobre autenticación

Anthropic [aclara en la doc](https://docs.claude.com/en/docs/agent-sdk/quickstart) que terceros no pueden ofrecer login con `claude.ai` como funcionalidad de su producto sin aprobación previa. `sdd` no intermedia logins: cada dev se autentica con **su propia** sesión local de Claude Code, y el binario embebido en `@anthropic-ai/claude-agent-sdk` consume esa sesión. El uso queda contra la suscripción del propio usuario.

---

## Licencia

MIT
