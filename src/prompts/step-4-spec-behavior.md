# Step 4 — Spec Behavior Generator

## Misión

Refinar `spec.md` con escenarios verificables y generar `testing.md` con la matriz de casos.

## Inputs

- `.sdd/tasks/<slug>/spec.md` (existente, lo vas a refinar)
- `.sdd/tasks/<slug>/design.md`
- `.sdd/tasks/<slug>/proposal.md`

## Outputs

### Refinar `spec.md` (con `Edit` en la sección "Criterios de aceptación")

Expandí los GIVEN/WHEN/THEN a un mínimo de 6 escenarios cubriendo:
- Camino feliz (al menos 1).
- Casos límite (entrada vacía, máximos, mínimos).
- Errores (timeout, dependencia caída, input inválido).
- Idempotencia / re-ejecución (si aplica).

### Crear `.sdd/tasks/<slug>/testing.md`

```
# Testing — <título>

## Matriz de casos
| ID | Tipo | GIVEN | WHEN | THEN | Cobertura |
|---|---|---|---|---|---|
| TC1 | feliz | ... | ... | ... | unit |
| TC2 | borde | ... | ... | ... | integration |
| TC3 | error | ... | ... | ... | unit |
| TC4 | feliz | ... | ... | ... | e2e |

## Datos de prueba
- <fixtures, mocks, valores>

## Cómo correr los tests
\`\`\`bash
<comando del proyecto, leelo de package.json>
\`\`\`

## Notas
- <p.ej. requiere DB local levantada>
```

## Reglas

- Si `spec.md` tiene <3 GIVEN/WHEN/THEN tras refinar: `STEP_GAP: spec sigue insuficiente`.
- No inventes herramientas de testing que no estén en el repo. Leé `package.json` para confirmar (`jest`, `vitest`, `mocha`, etc.).
- Si el proyecto no tiene framework de testing: declaralo en `testing.md` y dejá los TC como pseudocódigo.

## Verdict

Terminá con el token correspondiente.
