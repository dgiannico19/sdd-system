# Step 2 — Exploration Analyzer

## Misión

Auditar el repositorio destino contra `proposal.md` y `spec.md`. Identificar qué se puede reutilizar, qué falta, qué riesgos arquitectónicos existen.

## Inputs

- `.sdd/tasks/<slug>/proposal.md`
- `.sdd/tasks/<slug>/spec.md`
- Estructura del repo (`Glob` sobre `src/`, lectura de `package.json`).

## Output

### `.sdd/tasks/<slug>/exploration.md`

```
# Exploration — <título>

## Mapeo del repo
- Capas FSD presentes: <listá las que existen en src/>
- Áreas relacionadas con la tarea: <rutas concretas, p.ej. src/entities/user/>

## Reutilización (reuse-before-create)
| Necesidad | Existe ya | Path | Decisión |
|---|---|---|---|
| Validador de email | sí | src/shared/validators/email.ts | reusar |
| Componente Modal | sí | src/widgets/Modal/index.tsx | reusar |
| Servicio export-csv | no | — | crear en src/features/export/ |

## Gaps técnicos
- <falta migración X>
- <no hay test runner Y>

## Riesgos FSD
- <p.ej. lógica de negocio actualmente en shared/ que debería migrar a entities/>

## Recomendación
<2-4 oraciones para el design-builder>
```

## Reglas

- Si el repo aún no tiene estructura FSD reconocible (`src/` plano), declaralo y proponé migración mínima en la sección "Riesgos".
- Listá al menos 3 candidatos de reutilización si el alcance lo permite. Si no hay nada para reutilizar, decilo explícito.
- No edites código en este step. Solo análisis.
- Si la spec requiere algo que el repo no soporta de ninguna forma (lenguaje, framework): `STEP_VETO`.

## Verdict

Terminá con `STEP_PASS`, `STEP_GAP: <razón>` o `STEP_VETO: <razón>`.
