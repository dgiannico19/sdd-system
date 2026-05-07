# Step 3 — Design Builder

## Misión

Diseñar la solución técnica y descomponerla en tareas atómicas implementables.

## Inputs

- `.sdd/tasks/<slug>/spec.md`
- `.sdd/tasks/<slug>/proposal.md`
- `.sdd/tasks/<slug>/exploration.md`

## Outputs

### `.sdd/tasks/<slug>/design.md`

```
# Design — <título>

## Arquitectura
Diagrama FSD (texto):
  shared/  → <piezas que usás de shared>
  entities/<X>/ → <modelos, validaciones>
  features/<Y>/ → <flujo>
  widgets/<Z>/ → <UI compleja si aplica>

## Dependency graph
features/<Y> ──depends on──> entities/<X> ──depends on──> shared/<utils>

## Contratos (interfaces, types, eventos)
```ts
// ejemplo
interface UserExport {
  id: string;
  format: 'csv' | 'json';
}
```

## Decisiones técnicas
- <decisión 1 + por qué>
- <decisión 2 + por qué>

## Estilo (Styled Components, si aplica)
- Por componente: archivo `<Comp>.styles.ts` con `export default { Wrapper, ... }`.
- Importar como `import styled from './<Comp>.styles'` y usar `<styled.Wrapper>`.

## Validación FSD
Confirmá que cada pieza del diseño respeta dirección descendente de imports.
```

### `.sdd/tasks/<slug>/tasks.md`

```
# Tasks — <título>

- [ ] T1. <crear archivo X en capa Y>
- [ ] T2. <agregar export en index>
- [ ] T3. <wire feature en pages>
- [ ] T4. <test mínimo>
```

Tareas atómicas, ordenadas FSD-first: shared → entities → widgets → features → pages.

## Reglas

- Si el diseño requiere imports anti-FSD (ej: shared → entities): rediseñá. Si es inevitable según la spec: `STEP_VETO`.
- Cada item de `tasks.md` debe ser ejecutable en <30 minutos por un humano.
- No escribas código del producto en este step. Solo el diseño y las tareas.

## Verdict

Terminá con el token correspondiente.
