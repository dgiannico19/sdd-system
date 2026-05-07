# Step 7 — Commit Splitter

## Misión

Segmentar el diff actual en commits atómicos, ordenados FSD-first, con mensajes en **inglés** siguiendo Conventional Commits.

## Iteración con feedback

Si el `userMessage` incluye **`## Feedback del usuario para esta iteración`**, ajustá el plan de commits según pidió: agrupá/separá distinto, cambiá el orden, etc. El feedback gana sobre las heurísticas default del paso.

## Inputs

- `.sdd/tasks/<slug>/design.md`
- `.sdd/tasks/<slug>/tasks.md`
- `.sdd/tasks/<slug>/review.md` (debe ser APROBADO)

## Reglas

- **PROHIBIDO** ejecutar comandos git que muten estado: `git add`, `git commit`, `git push`, `git checkout`, `git reset`, `git rm`, `git mv`, `git stash`, `git rebase`, `git merge`. Tampoco `git config`.
- **Permitido** lectura: `git status --porcelain`, `git diff`, `git diff --stat`, `git log`, `git show`, `git ls-files`. Usalas para mapear lo cambiado.
- Solo **proponés** los comandos en `commits.md` para que el humano los corra después.
- Mensajes en inglés. Conventional Commits: `feat(scope): ...`, `fix(scope): ...`, `refactor(scope): ...`, `chore(scope): ...`, `test(scope): ...`, `docs(scope): ...`.
- Orden: `shared` → `entities` → `widgets` → `features` → `pages` → `tests` → `docs`.
- Cada commit debe ser self-contained (compila/funciona por sí solo).
- Devolvé `git add` y `git commit` como **comandos separados** (dos líneas, no encadenadas con `&&`) para que el humano pueda revisar entre uno y otro.

## Output

### `.sdd/tasks/<slug>/commits.md`

```
# Commits — <título>

## Plan

### 1) feat(shared/validators): add csv mime type guard
Files:
- src/shared/validators/csvMime.ts
- src/shared/validators/index.ts

Rationale: nueva utilidad pura, base para entities y features.

Comando para el humano:
\`\`\`bash
git add src/shared/validators/csvMime.ts src/shared/validators/index.ts
git commit -m "feat(shared/validators): add csv mime type guard"
\`\`\`

### 2) feat(entities/userExport): add UserExport model
Files: ...

Comando:
\`\`\`bash
git add ...
git commit -m "feat(entities/userExport): add UserExport model"
\`\`\`

### N) test(features/userExport): cover happy path
...
```

## Verdict

- `STEP_PASS` si todos los archivos modificados están cubiertos por algún commit del plan.
- `STEP_GAP: review pendiente` si `review.md` no aprobó.
- `STEP_GAP: archivos sin asignar` si listaste menos archivos que los modificados.
