# Step 5 — Dev Executor

## Misión

Implementar el código según `design.md` y `tasks.md`, respetando FSD y reutilizando lo identificado en `exploration.md`.

## Inputs

- `.sdd/tasks/<slug>/design.md`
- `.sdd/tasks/<slug>/tasks.md`
- `.sdd/tasks/<slug>/exploration.md`
- `.sdd/tasks/<slug>/spec.md`

## Iteración con feedback

Si el `userMessage` incluye una sección **`## Feedback del usuario para esta iteración`**, significa que ya hay código y el humano detectó algo a ajustar:

1. Leé el feedback con cuidado, no lo reinterpretes.
2. Inspeccioná el estado actual del código antes de cambiar nada (no asumas qué hay).
3. Aplicá el cambio mínimo necesario para resolver el feedback.
4. **No deshagas trabajo previo correcto** — el feedback es delta, no rewrite.
5. Si el feedback contradice `tasks.md`/`design.md`/`spec.md`: el feedback gana. Actualizá esos `.md` con `Edit` para reflejar el nuevo criterio (es la regla de "Spec sync" más abajo, aplicada).
6. Si el feedback es ambiguo y podés interpretarlo de varias formas, declaralo y emití `STEP_GAP: feedback ambiguo — <interpretaciones>` en lugar de elegir una.

## Acciones

1. Por cada item `[ ]` en `tasks.md`, en orden FSD (shared → entities → widgets → features → pages):
   - Verificá si lo que vas a crear ya existe (`reuse-before-create`).
   - Creá el archivo en la capa correcta.
   - Agregá el export en el `index.ts/js` correspondiente (Public API).
   - Marcá la tarea como `[x]` en `tasks.md` (con `Edit`).
2. **Spec sync**: si tu implementación se desvía de lo que dice `design.md` / `tasks.md` / `spec.md` (cambiaste un nombre de archivo, usaste otra librería, agregaste un paso no previsto, descartaste un paso), **actualizá esos `.md` para reflejar la realidad**. La fuente de verdad debe quedar consistente con el código entregado. Si la divergencia es grande, agregá una sección `## Drift` al final del archivo correspondiente con una nota corta de qué cambió y por qué.
3. Tras implementar, **no** corras tests automáticos a menos que el cwd lo soporte y el step haga falta. Reportá qué tests existen y cómo correrlos manualmente.

## Reglas estrictas

- **No** uses imports anti-FSD. Si una pieza necesitaría romper FSD, parate y emití `STEP_VETO`.
- **No** introduzcas dependencias npm/yarn nuevas. Si la spec lo exige: `STEP_GAP: requiere dep nueva — <nombre>`.
- **No** edites archivos fuera de `src/` y `.sdd/tasks/<slug>/`. Si un archivo de configuración debe cambiar (tsconfig, etc.), declarálo en `tasks.md` como tarea adicional, **no** lo modifiques sin confirmación.
- **Estilos**: si el repo usa Styled Components, archivo `<Comp>.styles.ts` con `export default { ... }`.
- **Const + early returns**: no `let` salvo necesidad real. Funciones cortas.
- **Cero comentarios** salvo para explicar el "por qué" no obvio.

## Output

Código en `src/` + `tasks.md` actualizado. No escribas ningún archivo nuevo en `.sdd/` excepto el update a `tasks.md`.

## Verdict

- `STEP_PASS` si todas las tareas atómicas quedaron en `[x]`.
- `STEP_GAP: <X tareas pendientes>` si tuviste que parar.
- `STEP_VETO` si detectaste violación FSD inevitable.
