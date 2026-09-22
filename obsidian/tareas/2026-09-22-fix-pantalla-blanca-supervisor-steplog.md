---
title: Fix Pantalla Blanca en Cuenta de Supervisor por ReferenceError stepLog
fecha: 2026-09-22
tipo: fix
estado: COMPLETADO
tags: [supervisor, bugfix, white-screen, react, ast, operador]
relacionados:
  - "[[2026-09-22-separacion-estricta-verificacion-tecnico-supervisor]]"
  - "[[BITACORA_TAREAS]]"
---

# 🛠️ Fix Pantalla Blanca en Vista de Supervisor (`ReferenceError: stepLog is not defined`)

## 1. Problema y Causa Raíz
Al iniciar sesión con una cuenta de supervisor (`role: 'SUPERVISOR'`) o abrir la pestaña de "Supervisión & V°B°", la pantalla quedaba totalmente en blanco (React unmount / crash).

### Causa Raíz:
Durante la separación estricta de logs entre técnico y supervisor realizada en el commit `5291792`, la variable `stepLog` fue reemplazada por `opLog` (log del técnico) y `supLog` (log del supervisor) en el scope de `displayedStationSteps.map`.

En la línea 1253 de `OperatorWorkspaceView.jsx`:
```jsx
{isSupervisorVerified ? `V°B° emitido por ${stepLog?.user_name || 'Supervisor'}` : "Valida con foto para aprobar este paso"}
```
Dado que `stepLog` no existía en el scope léxico, el motor JavaScript arrojaba un `ReferenceError: stepLog is not defined` al renderizar la sección condicional del supervisor `(isSupervisedByRole || isSupervisorMode)`, provocando el colapso inmediato del árbol de componentes de React.

---

## 2. Solución Aplicada
1. **Reemplazo de identificador**:
   - `stepLog?.user_name` corregido por `supLog?.user_name || 'Supervisor'`.
2. **Defensas contra `null` / `undefined`**:
   - Acceso seguro a `active_unit?.unit_number` con fallback a `'??'` en `title` y `subtitle` del visor de fotos.
   - Acceso seguro a `opLog?.user_name || 'Operario'` y `supLog?.user_name || 'Supervisor'`.
   - `assignment?.station_number ?? 0`.

---

## 3. Archivos Modificados
- `frontend/src/views/OperatorWorkspaceView.jsx`
- `obsidian/BITACORA_TAREAS.md`

---

## 4. Verificación
- **AST Checker**: `node check_undeclared.mjs` -> 0 identificadores no resueltos en `OperatorWorkspaceView.jsx`.
- **Bundle Production**: `npm run build` -> Compilación exitosa en 4.10s (dist limpio).
