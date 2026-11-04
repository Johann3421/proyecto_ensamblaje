---
fecha: 2026-11-04
tipo: fix / arquitectura
estado: completado
tags: [estaciones, supervisor, aislamiento, pipeline, tesler, ponytail]
---

# Fix: Aislamiento Estricto de PCs por Estación Física y Desacople de Pasos de Supervisión

## Contexto y Problema
1. **Falso avance de estaciones que debían esperar unidades**:
   - Al ingresar a una estación posterior (ej. Estación 2, 3 o 4) sin unidades físicas arribadas, la pantalla mostraba la **PC #01** activa, un bloque masivo de **"Pasos Pendientes Heredados"** y los pasos de la estación listos para marcar y despachar, aun cuando la PC se encontraba físicamente en la Estación 1.
   - En `/operator/submit-step` y `/operator/finish-station`, no existía una validación que comprobase si la unidad se encontraba en la estación remitente, permitiendo que un operario de Estación 2 o 3 complete pasos o despache una PC que aún estaba en Estación 1.
   - En el frontend, `localStorage.getItem('qc_active_unit')` persistía indefinidamente entre cambios de estación y cierres de sesión, inyectando `?unit_number=1` en toda llamada de carga.

2. **Fuga y solapamiento de pasos y modo de supervisión**:
   - En `OperatorWorkspaceView.jsx`, la condición `isSupervisorMode` forzaba `true` si el usuario tenía rol supervisor y no era el titular de la estación (`(isSupervisorUser && !isAssignedTechToCurrentStation)`). Al auditar una estación física (ej. Estación 2), el espacio se transformaba erróneamente en la estación virtual del supervisor, ocultando el botón para regresar a Estación 0 y desvirtuando el estado de los pasos.
   - En el backend, operarios que habían sido asignados como inspectores en alguna orden (`user_id in target_sup_ids`) eran derivados por defecto a la Estación 0 en lugar de su estación asignada de planta.
   - Los pasos pendientes heredados (`pending_prior_steps`) calculaban cualquier paso numéricamente menor en el modelo sin validar si pertenecía a una estación previa legítima del pipeline.

---

## Causa Raíz
1. **Selección ciega de `active_unit`**:
   - En `backend/app/main.py` (`get_operator_workspace`), si se enviaba `unit_number`, el backend asignaba `active_unit` directamente sin validar `cand_unit.current_station >= assignment.station_number`. Una PC en Estación 1 era asignada a Estación 2.
2. **Ausencia de guardias de estación en endpoints mutadores**:
   - `/operator/submit-step` y `/operator/finish-station` no validaban `unit.current_station == req.station_number`.
3. **Persistencia descontrolada en localStorage**:
   - `qc_active_unit` no se eliminaba al cerrar sesión, al cambiar de estación o cuando la estación no tenía unidades activas (`active_unit == null`).
4. **Condición espuria en `isSupervisorMode`**:
   - Se evaluaba el rol del usuario en lugar de la estación física activa (`assignment.station_number === 0`).

---

## Solución Técnica Implementada

### 1. Backend (`backend/app/main.py`)
- **Restricción de `active_unit` en estaciones físicas**:
  - Si se solicita una unidad con `unit_number`: solo se acepta si `cand_unit.current_station == assignment.station_number` (trabajo activo) o `cand_unit.current_station > assignment.station_number` (consulta histórica de solo lectura). Si `cand_unit.current_station < assignment.station_number`, se ignora categóricamente.
  - Si `units_in_station` está vacía y no hay unidad histórica válida, `active_unit` se establece en `None`. La pantalla muestra el estado vacío nativo: *"Sin PCs en tu estación. Esperando que la estación anterior despache unidades..."*.
- **Cálculo estricto de `pending_prior_steps`**:
  - Solo se calcula si `active_unit` está físicamente en la estación (`active_unit.current_station == assignment.station_number`).
  - Solo considera números de paso asignados explícitamente a estaciones anteriores (`st.station_number < assignment.station_number`).
- **Enrutamiento inteligente de supervisores y operarios**:
  - `wants_supervisor_station` se activa únicamente si `station_number == 0`, o si el usuario con rol supervisor/admin no especificó estación, o si un operario sin estaciones asignadas es inspector. Los operarios con estación física van siempre a su puesto de trabajo.
- **Guardias de estación obligatorios**:
  - `/operator/submit-step`: Rechaza con HTTP 400 si `unit.current_station != req.station_number`.
  - `/operator/finish-station`: Rechaza con HTTP 400 si `unit.current_station != station_number`.

### 2. Frontend (`frontend/src/views/OperatorWorkspaceView.jsx`)
- Desacople estricto de `isSupervisorMode`:
  ```javascript
  const isSupervisorMode = Boolean(
    workspace.is_supervisor_mode || 
    assignment.is_supervisor_station || 
    assignment.station_number === 0
  );
  ```
- Al auditar estaciones físicas (E1..EN), el supervisor ve la estación real con sus pasos de operario, y el botón *"⭐ Ir a Mi Estación"* permanece visible en todo momento para retornar a la Estación 0.

### 3. Frontend (`frontend/src/App.jsx`)
- Limpieza obligatoria de `localStorage.removeItem('qc_active_unit')` en:
  - Cierre de sesión (`handleLogout`).
  - Cambio explícito de estación (`onSelectStation`).
  - Respuesta del backend donde `active_unit` es `null`.
- En `loadOperatorWorkspace`, si `stationNumber` difiere del actual, no se arrastra el `qc_active_unit` residual.

---

## Archivos Modificados
- `backend/app/main.py`
- `frontend/src/App.jsx`
- `frontend/src/views/OperatorWorkspaceView.jsx`

---

## Verificación
- Test suite ejecutado en `scratch/test_fixes.py`:
  - `GET /api/operator/OP-102/station?unit_number=1`: Rechazó vincular PC #01 a Estación 2 mientras estaba en Estación 1.
  - `POST /api/operator/submit-step`: Devolvió HTTP 400 (*"La PC #28 se encuentra en la Estación 1, no en la Estación 2"*).
  - `POST /api/operator/finish-station`: Devolvió HTTP 400 (*"No se puede despachar: La PC #28 se encuentra en la Estación 1, no en la Estación 2"*).
- Compilación de producción con Vite: `rtk npm --prefix frontend run build` exitoso (0 errores, 4.10s).
