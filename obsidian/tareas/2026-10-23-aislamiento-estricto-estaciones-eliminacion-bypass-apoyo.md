---
fecha: 2026-10-23
tipo: fix / refactor
estado: completado
tags: [aislamiento, estaciones, ordenes, operario, ley-de-tesler, seguridad]
---

# Aislamiento Estricto de Estaciones y Órdenes: Eliminación del Bypass de Apoyo

## 1. Descripción
Investigación y solución integral ante el problema donde cuentas de operario con rol de apoyo (`OP-106` / correo `apoyo@...`) podían acceder a todas las órdenes de la planta y entrar a los puestos de trabajo asignados a otros operarios mediante selectores libres ("Puesto a Reforzar"), provocando confusión operativa, desorden en la línea de ensamble y desalineación con las asignaciones oficiales de producción.

## 2. Causa Raíz
1. **Bypass hardcodeado de `is_support`**:
   - En `backend/app/main.py`: los endpoints `GET /orders` y `GET /operator/{user_id}/station` evaluaban `is_support = (user_id == "OP-106") or ("apoyo" in req_u.email)`.
   - Cuando era verdadero, el operario recibía visibilidad de todas las órdenes de planta y podía ingresar a cualquier orden, incluso aquellas sin ninguna estación asignada.
2. **Asignación forzada de estaciones ajenas**:
   - Al solicitar una orden no asignada, el backend ejecutaba un fallback asignándole forzosamente la Estación 1 (titularidad de otro técnico).
   - En órdenes donde el operario solo tenía 1 puesto (ej. Limpieza E3 en orden `0001148`), el selector "Puesto a Reforzar" en `OperatorWorkspaceView.jsx` exponía un `<select>` con todas las estaciones (E1, E2, E3), permitiendo saltar a las estaciones de Jhordan o Fernando y marcar pasos indebidamente.
3. **Falta de validación en ejecución de pasos**:
   - `submit_step_check` y `uncheck_step` no verificaban si el `user_id` del operario estaba asignado a la estación correspondiente en esa orden.

## 3. Solución Técnica (Reestructuración & Ley de Tesler)
1. **Eliminación Total del Bypass `is_support` en Backend**:
   - Todos los operarios (incluido `OP-106`) se rigen estrictamente por asignación oficial (`QCStationAssignment.user_id` o `QCStationAssignment.secondary_user_id`).
   - `GET /orders`: Los operarios solo ven las órdenes donde tienen estación asignada (titular o co-operario/apoyo oficial).
   - `GET /operator/{user_id}/station`:
     - Si se solicita una orden no asignada, devuelve `active: False` con mensaje explícito (sin redirecciones silenciosas ni caída en estaciones ajenas).
     - La estación asignada devuelta es estrictamente una de sus estaciones asignadas (`user_st_numbers`).
2. **Validación en Endpoints de Marcado**:
   - En `submit_step_check` y `uncheck_step`: si el usuario es `OPERATOR`, se valida en base de datos que pertenezca a la estación (`req.station_number`) o cuente con transferencia delegada (`QCStepStationOverride`). Si no pertenece, responde `403 Forbidden`.
3. **Reestructuración de la Vista del Operario (`OperatorWorkspaceView.jsx`)**:
   - Se eliminó el banner "Modo Técnico de Apoyo / Refuerzo" y su dropdown "Puesto a Reforzar".
   - Si el operario tiene 1 estación asignada: visualiza únicamente su puesto.
   - Si el operario tiene múltiples estaciones en esa orden (`user_assigned_stations.length > 1`): dispone de pills ergonómicas para alternar exclusivamente entre sus estaciones asignadas.
4. **Unificación en Login y App**:
   - En `LoginPage.jsx`, `OP-106` se integró como el 6to operario estándar en el grid sin etiquetas confusas.
   - En `App.jsx`, la pestaña se estandarizó como "Mi Estación".

## 4. Archivos Modificados
- [backend/app/main.py](file:///d:/SISTEMAS%2002/Desktop/Proyectos_generales/proyecto_ensamblaje/backend/app/main.py): Eliminación de `is_support` en `list_orders` y `get_operator_workspace`; validación 403 en `submit_step_check` y `uncheck_step`.
- [frontend/src/views/OperatorWorkspaceView.jsx](file:///d:/SISTEMAS%2002/Desktop/Proyectos_generales/proyecto_ensamblaje/frontend/src/views/OperatorWorkspaceView.jsx): Eliminación del banner de apoyo libre y restricción a `user_assigned_stations`.
- [frontend/src/App.jsx](file:///d:/SISTEMAS%2002/Desktop/Proyectos_generales/proyecto_ensamblaje/frontend/src/App.jsx): Eliminación de `isSupportUser` y estandarización de tabs.
- [frontend/src/LoginPage.jsx](file:///d:/SISTEMAS%2002/Desktop/Proyectos_generales/proyecto_ensamblaje/frontend/src/LoginPage.jsx): Integración estándar de `OP-106` en grid de operarios.

## 5. Verificación
- Suite de pruebas de aislamiento (`scratch/verify_isolation_rules.py`):
  1. Operario no asignado no ve la orden en `list_orders`.
  2. Operario no asignado recibe `active=False` con mensaje claro al consultar el workspace.
  3. Operario asignado solo ve sus órdenes asignadas.
  4. Workspace de operario asignado devuelve exactamente su estación.
  5. Petición de estación ajena es rechazada y redirigida a su propia estación.
  6. Intento de marcar paso en estación ajena bloqueado con `403 Forbidden`.
  7. Marcado de paso en estación asignada exitoso.
- Compilación de frontend Vite `rtk npm run build` exitosa (0 errores).
