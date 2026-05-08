# sdd — Spec-Driven Development CLI

CLI de terminal para conducir tareas de software en dos fases: una **fase de specs** (proposal → exploration → design → behavior) que corre con `sdd run` y termina con todos los `.md` del task listos para revisión, y una **fase de build** opcional (`sdd dev` → `sdd review` → `sdd commit` → `sdd archive`) que implementa, audita, planifica commits y archiva. Cada step lo ejecuta un agente de Claude que reporta un verdict (`STEP_PASS` / `STEP_GAP` / `STEP_VETO`).

Las specs son **contrato vivo**: el dev y el reviewer las leen pero **no las modifican**. Si cambiás de idea durante el build, lo decís con `sdd amend "<feedback>"` y el sistema actualiza spec/design/tasks de forma auditable antes de tocar código.

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

sdd dev                               # implementa código + corre verify (typecheck/lint/build/test)
sdd dev -m "reusá <Loader/> existente"   # ajuste de implementación (no contradice spec)

sdd amend -m "el botón ahora es verde"   # cambiaste de idea: actualiza specs primero
sdd dev                               # reimplementa según las nuevas specs

sdd review                            # auditoría estricta del código + verify gate
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
| `sdd dev [slug] [-m "..."]`      | Step 5: implementa código según spec/design/tasks. Corre el [verify gate](#verify-gate). **No toca specs.** |
| `sdd review [slug] [-m "..."]`   | Step 6: review estricto FSD/calidad/drift + verify gate. **No toca specs.** |
| `sdd amend [slug] -m "..."`      | Actualiza `spec.md` / `design.md` / `tasks.md` / `testing.md` ante un cambio de criterio. Ver [Cuando cambiás de idea](#cuando-cambiás-de-idea-sdd-amend). |
| `sdd commit [slug] [-m "..."]`   | Step 7: plan de commits (devuelve `git add` + `git commit` separados, NO ejecuta) |
| `sdd archive [slug]`             | Cierra la tarea: copia `.md` a `.sdd/archive/<slug>/` y borra `.sdd/tasks/<slug>/` |

> `dev`, `review` y `commit` aceptan **feedback inline con `-m "..."`** para iterar (ver [Iterar con feedback](#iterar-con-feedback--m-)). Si el feedback **contradice la spec**, el dev devuelve `STEP_GAP` pidiéndote que corras `sdd amend` primero — la spec sigue siendo contrato.

### Inspección
| Comando                       | Qué hace                                                            |
| ----------------------------- | ------------------------------------------------------------------- |
| `sdd status [slug] [--watch]` | Muestra el avance del pipeline                                      |
| `sdd explain [slug] [--all]`  | Resume qué hizo el último step: verdict, feedback, verify, tool calls, diff de `src/`. Ver [Retrospectiva](#retrospectiva-sdd-explain). |
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
| 5   | `dev-executor`               | `sdd dev`       | ✅      | ✅  | Implementa lo que ya está en specs. **No** modifica `spec.md`/`design.md`. Corre [verify gate](#verify-gate) antes de PASS |
| 6   | `strict-reviewer`            | `sdd review`    | ✅      | ✅  | Veto absoluto ante violaciones FSD, verify roja o drift entre código y spec. **No** modifica specs |
| —   | `amend` (no-pipeline)        | `sdd amend`     | ✅      | ✅  | Re-edita specs ante cambios de criterio. No avanza el pipeline; te deja posicionado en `dev-executor` para reimplementar |
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

# Verify gate: comandos que corren `sdd dev` y `sdd review` antes de aprobar.
# null  = autodetect de package.json (typecheck, lint, build, test si existen).
# []    = skip explícito (no recomendado salvo proyectos sin verify).
# [...] = lista explícita; podés mezclar pnpm/yarn/make/etc.
verifyCommands: null
```

`sdd init` **detecta automáticamente** el stack del proyecto (lee `package.json`, `tsconfig.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, etc. y la estructura `src/` incluyendo capas FSD) y escribe el resultado en `context`. Lo ves y editás en el yaml.

Para re-detectar después de cambios de stack:

```bash
sdd init --refresh-context
```

Si querés agregar reglas extra (p.ej. "todos los handlers pasan por middleware X"), simplemente editá el campo `context` — lo que pongas reemplaza la detección automática. Si lo dejás vacío, el detector vuelve a actuar al runtime.

---

## Verify gate

`sdd dev` y `sdd review` corren un **gate ejecutivo** antes de aprobar un step. El gate ejecuta los `verifyCommands` configurados (o autodetectados) y degrada `STEP_PASS → STEP_GAP` automáticamente si alguno falla. El verdict deja de depender únicamente de la palabra del agente.

### Cómo se resuelven los comandos

1. Si `verifyCommands` es una lista en `.sdd/config.yaml`, se usa esa.
2. Si es `null` (default), el motor lee `package.json` y arma la lista con los scripts estándar que existan: `typecheck`, `lint`, `build`, `test`. Cada uno como `npm run <script>`.
3. Si es `[]`, el gate queda desactivado para ese repo.

### Cómo se ve

```
▶ código en src/  · 1/2 build · dev-executor
   reglas: CLAUDE.md, .sdd/rules/coding-style.md
   verify: npm run typecheck • npm run lint • npm run build • npm test

[…trabajo del agente…]

◇ verify gate (4 comandos)
  ✓ npm run typecheck
  ✓ npm run lint
  ✗ npm run build (exit 2)
  ✗ npm test (exit 1)

✗ verify falló — el agente declaró PASS pero los comandos están rojos:
--- npm run build ---
src/features/login/ui.tsx(40,5): error TS2322: Type '"green"' is not assignable to type '"blue"'.

⚠ gap verify gate falló: npm run build
```

El step queda en `idle` con verdict `gap`. El historial guarda los exit codes y la duración de cada comando en `state.history[].verify`.

### Doble red de seguridad

- **El agente** corre los comandos durante el dev y los deja verdes (puede leer el output y fixear sobre la marcha).
- **El motor** los re-ejecuta como gate independiente después de que el agente declare PASS. Si están rojos, el verdict se degrada sin importar lo que diga el agente.

Esto saca al LLM del juicio final. Lo único que el agente puede hacer es entregar verde de verdad.

### Override por proyecto

```yaml
# .sdd/config.yaml — Next.js + Vitest sin lint
verifyCommands:
  - npm run typecheck
  - npm run build
  - npm run test:unit -- --run
```

```yaml
# Repo Go
verifyCommands:
  - go vet ./...
  - go build ./...
  - go test ./...
```

### Truncación

Si el agente alcanza `maxTurnsPerStep` sin emitir verdict, el motor fuerza `STEP_GAP: truncated …` ignorando cualquier `STEP_PASS` heurístico. Antes era posible que `error_max_turns` saliera con un PASS al toque.

---

## Retrospectiva (`sdd explain`)

Después de cada corrida (`run`, `next`, `dev`, `review`, `commit`, `amend`), el motor escribe un **transcript resumido** en `.sdd/tasks/<slug>/transcripts/<timestamp>-<stepId>.md`. Es un `.md` legible por humanos con todo lo necesario para entender qué hizo el agente sin volver a invocarlo.

### Qué contiene el transcript

```md
# Transcript — dev-executor (pass)

- **task**: exportar usuarios a CSV (`2026-05-08-exportar-csv`)
- **step**: 5. Dev executor
- **ranAt**: 2026-05-08T14:22:01.123Z
- **model**: claude-sonnet-4-5-20250929
- **usage**: 6 turnos · 8 tools · in 18.4k · cache 13.1k · out 2.7k
- **promptHash**: `f2a1c0d…`

## Feedback
reusá <Loader/> de shared/, no crees uno nuevo

## Verify
| Comando | Resultado |
|---|---|
| `npm run typecheck` | ✓ |
| `npm run lint` | ✓ |
| `npm run build` | ✓ |

## Tool calls
- `Read` src/shared/Loader/index.ts
- `Edit` src/features/login/ui.tsx (return <div>...</div>)
- `Edit` src/features/login/index.ts
- `Bash` npm run build

## Resumen del agente
[último bloque de texto del agente antes del verdict — explica qué hizo y por qué]
```

Pesa típicamente 1-3 KB por step. Se mueve junto con el resto de los artefactos cuando hacés `sdd archive`.

### `sdd explain`

Para revisar sin abrir archivos:

```bash
sdd explain                # último step de la tarea activa
sdd explain <slug>         # último step de un slug específico
sdd explain --all          # historial completo (resumido por step)
sdd explain <slug> --all   # combinado
```

Ejemplo de salida:

```
Tarea: exportar usuarios a CSV (2026-05-08-exportar-csv)
status: idle · current step: strict-reviewer

▶ Dev executor · dev-executor  ✓ pass
  ranAt: 2026-05-08 14:22
  feedback: reusá <Loader/> de shared/, no crees uno nuevo
  6 turnos · in 18.4k · cache 13.1k · out 2.7k
  verify:
    ✓ npm run typecheck
    ✓ npm run lint
    ✓ npm run build
  transcript: .sdd/tasks/2026-05-08-exportar-csv/transcripts/2026-05-08T14-22-01-123Z-dev-executor.md

Tool calls
  Read src/shared/Loader/index.ts
  Edit src/features/login/ui.tsx
  Edit src/features/login/index.ts
  Bash npm run build

Resumen del agente
  [primeras 30 líneas del último bloque de texto del agente]

Cambios en src/ (respecto a HEAD)
   M src/features/login/ui.tsx
   A src/features/login/ui.styles.ts
  ---
   src/features/login/ui.tsx       | 12 +++++--
   src/features/login/ui.styles.ts | 18 ++++++++
```

`--all` muestra cada entrada del `state.history` con su transcript asociado, sin el resumen del agente ni el git diff (para que sea legible).

### Para qué sirve

- **Después de un `pass` raro**: ver qué tools llamó el agente y leer su explicación final.
- **Después de un `gap` o `veto`**: confirmar qué razón dio y qué tocó antes de pararse.
- **Antes de `sdd commit`**: revisar el diff y el transcript del dev para preparar el commit.
- **Auditoría posterior**: los transcripts archivados quedan en `.sdd/archive/<slug>/transcripts/` con todos los pasos de la tarea.

Si no necesitás los transcripts, podés `.gitignore`-ar `.sdd/tasks/*/transcripts/` y `.sdd/archive/*/transcripts/`. El sistema funciona igual sin ellos (sólo `sdd explain` muestra menos detalle).

---

## Cuando cambiás de idea: `sdd amend`

Las specs (`spec.md`, `design.md`, `tasks.md`, `testing.md`) son **contrato**. Ni `sdd dev` ni `sdd review` las modifican — si lo intentan, el step termina en `STEP_VETO`.

Eso te protege del **drift silencioso**: el agente implementa algo distinto a lo que dice la spec, reescribe la spec para que coincida, y nadie ve el cambio. Con la nueva regla, las specs se sincronizan **solo a pedido humano explícito**.

El comando para eso es `sdd amend`:

```bash
sdd dev                                    # implementó botón azul
# revisás y querés que sea verde

sdd amend -m "el botón ahora es verde"
# → actualiza spec.md, design.md, tasks.md, testing.md con cambios mínimos
# → agrega entrada en `## Amend log` al final de spec.md
# → te deja posicionado en `dev-executor`

sdd dev                                    # reimplementa según las nuevas specs
sdd review
```

### Qué hace exactamente

El step `amend` lee los `.md` actuales y aplica el cambio mínimo:

- **`spec.md`**: ajusta los GIVEN/WHEN/THEN tocados por el feedback. Agrega `## Amend log` con fecha + feedback textual + archivos tocados.
- **`design.md`**: ajusta la decisión técnica que cambia (color, librería, flujo).
- **`tasks.md`**: NO desmarca los `[x]` previos (el código ya existe). Suma `[ ]` nuevas para los ajustes que el dev tiene que hacer. Marca `[~]` las pendientes que ya no aplican.
- **`testing.md`**: ajusta los TC tocados.

No toca `src/`. Después corrés `sdd dev` y se reimplementa contra las nuevas specs.

### `sdd amend` vs `sdd dev -m`

| Caso                                         | Comando                                         |
| -------------------------------------------- | ----------------------------------------------- |
| "El botón debe ser verde, no azul"           | `sdd amend -m "..."` (cambia el contrato)       |
| "Reusá el `<Loader/>` de shared en lugar de crear uno" | `sdd dev -m "..."` (ajuste de implementación) |
| "Agregá un caso de error timeout"            | `sdd amend -m "..."` (cambia el contrato)       |
| "Memoizá los handlers con useCallback"       | `sdd dev -m "..."` (no toca lo que la spec promete) |
| "Cambiá la DB de SQLite a Postgres"          | `sdd amend -m "..."` (cambio de design)         |

Regla simple: **si el feedback tiene que aparecer en `spec.md` o `design.md` para que tenga sentido, es amend**. Si solo cambia cómo se implementó algo que la spec no especifica, es `dev -m`.

Si te equivocás y mandás un cambio de spec por `sdd dev -m`, el dev devuelve:
```
⚠ gap feedback contradice spec — corré 'sdd amend "..."' primero
```

### Cuando `amend` no alcanza

Si el feedback cambia tanto que no es un ajuste sino otro problema (ej: "en realidad no quiero exportar a CSV, quiero un dashboard interactivo"), `amend` devuelve:
```
⚠ gap feedback excede amend — replantear desde proposal
```

Ahí lo correcto es `sdd new "<nuevo título>"` y arrancar otra tarea, o re-correr `sdd run` desde el principio sobre la actual.

### Auditoría

`state.history` registra el amend con verdict, feedback textual, tokens y timestamp. Y la sección `## Amend log` de `spec.md` te da una traza humano-legible:

```
## Amend log
- 2026-05-08T14:22:01Z — el botón ahora es verde — archivos: spec.md, design.md, tasks.md, testing.md
- 2026-05-08T15:10:44Z — agregar caso de timeout en login — archivos: spec.md, testing.md
```

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

- **Scope:** `-m` es para **ajustes de implementación** que no contradicen la spec (reutilizar componente X, memoizar handlers, cambiar nombre de variable, mejorar mensaje de error). Para cambios que tocan el contrato (color, flujo, alcance), usá [`sdd amend`](#cuando-cambiás-de-idea-sdd-amend).
- **Si el feedback contradice spec/design:** el dev devuelve `STEP_GAP: feedback contradice spec — corré 'sdd amend "..."' primero`. Las specs son contrato y solo se editan vía `amend`.
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
