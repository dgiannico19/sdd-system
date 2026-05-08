# Step Amend — Spec amendment

## Misión

El humano cambió de idea sobre la tarea. Aplicá el cambio mínimo necesario sobre `spec.md`, `design.md`, `tasks.md` y `testing.md` para que reflejen el nuevo criterio. **No reescribas todo** — solo lo que el feedback toca.

Este step se invoca con `sdd amend "<feedback>"` cuando el dev ya entregó código pero el humano lo quiere distinto. El propósito es **mantener las specs como contrato vivo y auditable**: cuando algo cambia, queda escrito acá antes de tocar código. Después `sdd dev` reimplementa según las nuevas specs.

## Input crítico

El `userMessage` contiene `## Feedback del usuario para esta iteración`. Esa es la fuente de verdad del cambio. **No la interpretes** — leéla literal y aplicá lo que dice.

## Inputs (estado actual)

- `.sdd/tasks/<slug>/spec.md` (contrato a actualizar)
- `.sdd/tasks/<slug>/design.md` (estrategia técnica a actualizar si aplica)
- `.sdd/tasks/<slug>/tasks.md` (checklist a refinar si aplica)
- `.sdd/tasks/<slug>/testing.md` (matriz de TC a actualizar si aplica)

## Acciones

1. Leé todos los `.md` actuales y el feedback.
2. Identificá qué secciones cambian. Si el feedback es ambiguo: `STEP_GAP: feedback ambiguo — <interpretaciones>`.
3. **Edits quirúrgicos** sobre los `.md` afectados (usá `Edit`, no `Write`):
   - **`spec.md`**: ajustá los GIVEN/WHEN/THEN tocados. Si la propuesta o intención general cambia, ajustá también la sección "Propuesta" / "Criterios". No reescribas la spec entera; solo lo que el feedback afecta.
   - **`design.md`**: ajustá la decisión técnica que cambia (ej: "color azul" → "color verde", "DB en SQLite" → "DB en Postgres"). Tocá solo lo afectado.
   - **`tasks.md`**:
     - Para tareas YA `[x]` cuyo resultado el feedback invalida: agregá una nueva `[ ] Tn. <ajuste necesario>`. **NO desmarques `[x]` previos** — el código ya existe; el dev tomará la nueva tarea para refinarlo.
     - Para tareas pendientes `[ ]` que ya no aplican: marcalas `[~]` con nota corta en la misma línea (ej: `- [~] T5. crear modal verde — descartado por amend: la modal ahora es inline`).
     - Si el feedback agrega trabajo nuevo: sumá tareas `[ ]` al final.
   - **`testing.md`**: ajustá los TC tocados. Si hay TC pasados que ya no aplican, marcalos `(obsoleto por amend: <razón>)`.
4. **No toques código en `src/`**. Eso lo hace `sdd dev` después.
5. **Amend log** al final de `spec.md`: si no existe la sección, creala con `Edit` agregándola al final del archivo:
   ```
   ## Amend log
   - <fecha ISO> — <feedback textual> — archivos: <lista>
   ```
   Si ya existe, agregá una nueva línea al final de la lista.

## Reglas

- **Cambios mínimos**: no reescribas secciones que el feedback no afecta. La auditoría depende de poder ver el delta del cambio.
- Si el feedback **no contradice** nada (solo agrega un detalle no contemplado), agregalo en la sección que corresponde sin modificar lo demás.
- Si el feedback **contradice algo más profundo** (ej: cambia el problema que se está resolviendo, no solo el cómo): `STEP_GAP: feedback excede amend — replantear desde proposal`. El humano debería volver a `sdd new` o re-correr `sdd run` desde el principio.
- Mantené **coherencia entre archivos**: si cambiás `spec.md`, revisá que `design.md`, `tasks.md` y `testing.md` queden alineados con el nuevo criterio.
- **NO escribas código** en `src/`. **NO** edites `state.json`.

## Verdict

- `STEP_PASS` si los `.md` quedaron coherentes con el feedback y entre ellos. El motor te va a posicionar automáticamente en `dev-executor` para la siguiente corrida.
- `STEP_GAP` si el feedback es ambiguo o excede amend.
- `STEP_VETO` no aplica acá (no hay violaciones FSD posibles, este step solo edita `.md`).
