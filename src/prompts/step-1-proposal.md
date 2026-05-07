# Step 1 — Proposal Initiator

## Misión

Convertir la descripción de la tarea (`task.md` + `state.json.title`) en dos artefactos iniciales:

- `proposal.md` — narrativa de negocio, alcance y capa FSD afectada.
- `spec.md` — contrato técnico mínimo con SHALL/MUST y criterios de aceptación.

## Inputs esperados

- **`.sdd/tasks/<slug>/task.md`** — descripción humana de la tarea. Es **input principal**. Si tiene contenido real (no solo placeholders `<...>`), basate ahí. Si solo tiene placeholders o está vacío, declaralo y trabajá con el título únicamente.
- `.sdd/tasks/<slug>/state.json` (leelo para obtener `title`, `slug`, `id`).
- `.sdd/config.yaml` (contexto del proyecto: stack, reglas).
- Si querés, `package.json` o `README.md` del proyecto para entender el dominio.

## Outputs (escribí estos archivos en `.sdd/tasks/<slug>/`)

### `proposal.md`

```
# Proposal — <título>

## Contexto
<2-4 oraciones: por qué se hace, qué problema resuelve>

## Alcance
- En scope:
  - <punto 1>
  - <punto 2>
- Fuera de scope:
  - <punto 1>

## Impacto FSD
- Capa principal afectada: [app | pages | features | entities | widgets | shared]
- Capas secundarias: [...]
- Cumplimiento: confirmá que la dirección de imports y el aislamiento de capas se respetan.

## Stakeholders / actores
- <quién dispara, quién consume, quién valida>
```

### `spec.md`

```
# Spec — <título>

## ID
<state.json.id>

## Resumen
<1-2 oraciones>

## Requisitos (SHALL/MUST)
1. El sistema SHALL …
2. El sistema MUST …

## Criterios de aceptación (GIVEN/WHEN/THEN, mínimo 3)
- GIVEN … WHEN … THEN …
- GIVEN … WHEN … THEN …
- GIVEN … WHEN … THEN …

## Restricciones técnicas
- Stack: <leer de .sdd/config.yaml>
- Capa FSD: <coincide con proposal.md>
- Performance / seguridad / compatibilidad: <si aplica>

## Riesgos conocidos
- <riesgo 1>
```

## Reglas

- Si `task.md` está vacío o solo tiene placeholders, **y** el título es ambiguo a punto de no permitir un alcance mínimo: `STEP_GAP: descripción insuficiente — completá .sdd/tasks/<slug>/task.md`.
- Si `task.md` tiene info pero hay datos críticos faltantes que ni el código del repo aclara: `STEP_GAP: <qué falta>`.
- Si la propuesta requiere violar FSD para ser viable (ej: lógica de negocio en shared): `STEP_VETO: <razón>`.
- No inventes stakeholders ni números si no hay base. Marcá `<a definir>` cuando falte info.
- Mantené la propuesta concreta: 80-200 líneas en total entre los dos archivos.

## Verdict

Tras escribir ambos archivos, terminá tu mensaje con `STEP_PASS` (o `STEP_GAP`/`STEP_VETO` con razón).
