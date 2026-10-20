---
title: "Aislamiento Estricto de Órdenes por Usuario y Asignación de Tareas"
fecha: 2026-10-20
tipo: fix
estado: completado
tags: [seguridad, aislamiento, ordenes, roles, operator-workspace, api]
---

# 🛡️ Aislamiento Estricto de Órdenes por Usuario y Asignación de Tareas

## 1. Contexto & Problema
Los operarios podían visualizar y acceder a órdenes de trabajo en las que no tenían estaciones ni tareas asignadas. Al existir múltiples órdenes simultáneas en planta, los operarios veían órdenes ajenas en selectores y vistas, lo que generaba confusión en la línea de montaje e incluso forzaba asignaciones incorrectas.

## 2. Causa Raíz
1. **Endpoint `GET /api/orders` global**: No aplicaba filtrado por usuario; devolvía indiscriminadamente todas las órdenes registradas en la base de datos a cualquier rol.
2. **`available_orders` en Workspace**: En `/api/operator/{user_id}/station`, se iteraban todas las órdenes de la planta y se adjuntaban al selector `available_orders` de cualquier operario, asignando una estación ficticia (`assigned_station: 1`) si no pertenecían a la orden.
3. **Fallback permisivo**: Al enviar un `order_id` ajeno, el backend ejecutaba `db.query(QCStationAssignment).first()`, vinculando indebidamente al técnico a la Estación 1 de otro compañero.
4. **Persistencia de sesión en Frontend**: `selectedOrder` no se limpiaba al alternar usuarios (`handleLogin`/`handleLogout`) ni se recargaban las órdenes filtradas al cambiar de cuenta.

## 3. Solución Técnica Implementada (Ley de Tesler & Ponytail)
Toda la lógica de autorización y resolución de permisos se implementó en el backend:

### Backend (`backend/app/main.py`)
1. **Filtrado en `GET /api/orders`**:
   - Parámetro opcional `user_id`.
   - `ADMIN` y `SUPPORT` (`OP-106` / correo `apoyo`): Visibilidad global de todas las órdenes de planta.
   - `SUPERVISOR`: Órdenes donde figure como `supervisor_id`, órdenes sin supervisor específico asignado, o donde esté asignado a estaciones.
   - `OPERATOR`: Filtro estricto exclusivo a órdenes donde tiene estación asignada como técnico titular (`user_id`) o de relevo/secundario (`secondary_user_id`).
2. **Restricción en `get_operator_workspace` (`GET /api/operator/{user_id}/station`)**:
   - `available_orders`: Omite órdenes ajenas para operarios comunes.
   - `allowed_order_ids`: Si un operario envía manualmente un `order_id` ajeno, el backend rechaza el acceso cruzado y retorna su orden válida o `{ "active": False, "message": "Hola ..., no tienes órdenes de trabajo asignadas en este momento." }`.
   - Eliminación total del fallback `db.query(QCStationAssignment).first()`.

### Frontend (`frontend/src/App.jsx` y `OperatorWorkspaceView.jsx`)
1. **Llamada de órdenes parametrizada**: `${API_BASE}/orders?user_id=${currentUser.id}`.
2. **Limpieza de estado al cambiar sesión**: `setSelectedOrder('')` en `handleLogin` y `handleLogout`.
3. **Efecto reactivo**: `useEffect` con `[isAuthenticated, currentUser?.id]`.
4. **Selector de estaciones seguro**: Al cambiar de orden en el workspace, se resetea `operatorStationFilter(null)` para cargar automáticamente la estación asignada en la nueva orden.
5. **Mensajería clara**: `OperatorWorkspaceView` muestra el mensaje explícito del backend cuando el usuario no tiene órdenes asignadas.

## 4. Archivos Modificados
- `backend/app/main.py`
- `frontend/src/App.jsx`
- `frontend/src/views/OperatorWorkspaceView.jsx`

## 5. Verificación
- Prueba automatizada de seguridad `test_order_isolation.py` ejecutada con éxito:
  - Operarios solo ven órdenes con estaciones asignadas a su ID.
  - Al crear una orden exclusiva para `OP-101`, `OP-102` no la visualiza en `/api/orders` ni en el selector del workspace, y cualquier intento de forzar `order_id` es neutralizado.
  - `ADMIN`, `SUPERVISOR` y `OP-106 (Apoyo)` conservan acceso operacional correspondiente.
- Compilación de producción con `vite build` ejecutada exitosamente sin errores.
