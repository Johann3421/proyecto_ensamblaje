---
fecha: 2026-11-03
tipo: bugfix / refactor / ux
estado: completado
tags: [produccion, tesler, limpieza, auto-healing, alertas, ordenes]
---

# Corrección Integral de Errores en Producción, Auto-Sanitización de Estaciones y Erradicación de Alertas Nativas

## Contexto y Objetivo
A partir de la auditoría exhaustiva en vivo sobre la API y base de datos de producción (`https://ensamblaje.sekaitech.com.pe`), se detectaron cuatro fallas críticas que violaban la **Ley de Tesler** y generaban inconsistencias en piso de planta:
1. **Órdenes de producción con estaciones vacías (pasos fantasma)**: Órdenes de PROWORK (5 pasos) quedaron configuradas con rangos de estaciones de 52 pasos (12..22, 23..33, etc.), dejando estaciones 2..5 con 0 pasos reales asignados.
2. **Desclasificación de pasos de limpieza en BD por migración destructiva**: Una consulta `UPDATE qc_checklist_items SET is_cleaning = FALSE WHERE step_number IN (12, 13, 14, 35, 39, 43)...` reseteaba erróneamente pasos legítimos de limpieza en `ALL IN ONE`, `ENSAMBLAJE`, `DATAONE`, `EZENT` y `PROWORK`.
3. **Mensaje erróneo en estación vacía de operador**: Al ingresar un técnico a una estación sin pasos configurados, la UI mostraba "No hay pasos asignados a tu supervisión en esta estación", desorientando al operario.
4. **Alertas y confirmaciones nativas intrusivas (`window.alert`, `window.confirm`)**: Bloqueaban el hilo del navegador e interrumpían el flujo de trabajo en tablets y móviles.

---

## Causa Raíz
1. `EditOrderModal` no validaba que los pasos numéricos heredados o cargados por rango existieran en el modelo actual (`modelSteps`), ni redistribuía automáticamente cuando una orden quedaba con 0 pasos válidos asignados.
2. `auto_migrate_schema` ejecutaba un hardcode de números de pasos `IN (12, 13, 14, 35, 39, 43)` sin filtrar por modelo, corrompiendo modelos donde esos números correspondían a periféricos, cables o empaque.
3. `OperatorWorkspaceView` no distinguía entre `totalStationSteps === 0` (estación sin pasos configurados en la orden) y `displayedStationSteps.length === 0` con filtro activo de supervisor.
4. Múltiples modales utilizaban `alert()` y `window.confirm()` en lugar de banners de validación reactivos y toasts contextuales.

---

## Solución Técnica

### 1. Backend (`backend/app/main.py`)
- **Heurística de Limpieza Robusta (`infer_step_is_cleaning`)**:
  - Excluye componentes hardware (`bomba`, `cooler`, `disipador`, `socket`, `cpu`, `procesador`, `ram`, `gpu`, `fuente`, `ventilación interna`, `ventiladores`) protegiendo revisiones de ensamble.
  - Detecta términos de taller peruanos (`placa e/s`, `bolsa hermética`, `quitar stiker`, `adeciv`, `manchas y huellas`, `carcasa`, `teclado y mouse`, `sellos qc`).
- **Remoción de SQL Destructivo**: Se eliminó la cláusula basada en números de paso fijos en `auto_migrate_schema()`.
- **Auto-Healing de Pasos en Startup (`auto_heal_cleaning_flags`)**: Corrige y sincroniza automáticamente los flags `is_cleaning` en base de datos al arrancar el servidor.
- **Sincronización `start_step` / `end_step` en `update_order`**: Almacena los límites reales calculados de `step_numbers`.

### 2. Frontend (`frontend/src/`)
- **`EditOrderModal.jsx`**:
  - Efecto reactivo que filtra pasos inexistentes contra `modelSteps`.
  - Si el total de pasos válidos asignados es 0, invoca `distributeStepsSeparatingCleaning` para auto-distribuir la orden (Ley de Tesler).
  - Eliminación del 100% de `alert()`.
- **`OperatorWorkspaceView.jsx`**:
  - Detección explícita de `totalStationSteps === 0` con alerta clara: *"Esta estación no tiene pasos asignados. Contacta al supervisor o administrador de línea"*.
  - Eliminación de fallbacks de `alert()`.
- **Erradicación de Popups Nativas**:
  - `UnitDetailModal.jsx`: Diálogo de confirmación in-modal para reinicio y eliminación de unidad.
  - `AdminPhotoCorrectionModal.jsx`, `IssueReportModal.jsx`, `CreateOrderView.jsx`, `CameraCaptureModal.jsx`: Banners y mensajes de error integrados sin bloquear el navegador.

---

## Archivos Modificados
- `backend/app/main.py`
- `frontend/src/modals/EditOrderModal.jsx`
- `frontend/src/modals/UnitDetailModal.jsx`
- `frontend/src/modals/AdminPhotoCorrectionModal.jsx`
- `frontend/src/modals/IssueReportModal.jsx`
- `frontend/src/modals/CameraCaptureModal.jsx`
- `frontend/src/modals/AddUnitsModal.jsx`
- `frontend/src/modals/ChecklistStepModal.jsx`
- `frontend/src/modals/DeleteOrderModal.jsx`
- `frontend/src/modals/EmergencyReassignModal.jsx`
- `frontend/src/modals/ReassignStepModal.jsx`
- `frontend/src/modals/ResetOrderModal.jsx`
- `frontend/src/modals/SupervisorAuditModal.jsx`
- `frontend/src/modals/TransferUnitModal.jsx`
- `frontend/src/views/CreateOrderView.jsx`
- `frontend/src/views/OperatorWorkspaceView.jsx`
- `frontend/src/views/TechniciansManagementView.jsx`

---

## Verificación
- `rtk npm --prefix frontend run build`: Exitoso en 4.06s con 0 errores de compilación.
- Verificación de sintaxis de Python backend: Exitosa.
- Escaneo integral de código en `frontend/src`: 0 llamadas a `alert()` y 0 a `confirm()`.

