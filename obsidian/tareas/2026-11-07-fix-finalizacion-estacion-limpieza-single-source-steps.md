---
fecha: 2026-11-07
tipo: fix / arquitectura / tesler
estado: completado
tags: [pipeline, limpieza, estaciones, despacho, single-source-of-truth, tesler]
---

# Fix: Desatasco de Finalización en Estación de Limpieza y Fuente Única de Verdad de Pasos

## 1. Descripción del Problema
En el último apartado del flujo (Estación de Limpieza / Fin de Línea, ej. Estación 5: "Stickers, Limpieza Final y Embalaje"), al completar todos los pasos visibles con sus fotografías de evidencia correspondientes y presionar el botón **"🎉 Finalizar y Aprobar PC #XX (Fin de Línea)"**, el sistema arrojaba un error HTTP 400 impidiendo despachar o finalizar la PC.

## 2. Causa Raíz
1. **Discrepancia entre la vista del operario y el endpoint de despacho (`finish_station`)**:
   - `get_operator_workspace` filtraba los pasos válidos del modelo y mostraba únicamente los pasos correspondientes (para el modelo PROWORK de 52 pasos, solo los pasos de limpieza 49..52).
   - En cambio, `finish_station` calculaba independientemente los pasos requeridos leyendo el rango crudo de la asignación (`start_step=43`, `end_step=52`), exigiendo los pasos `[43, 44, 45, 46, 47, 48, 49, 50, 51, 52]`. Al solo completar los pasos 49..52, el endpoint rechazaba con: *"El técnico debe completar 6 paso(s) en la Estación 5 (Pasos: 43, 44, 45, 46, 47)"*.
2. **Filtro estricto excluyente de supervisión**:
   - `finish_station` filtraba `QCStepLog.is_supervisor_verified == False`, provocando que si un paso fue certificado o verificado por un supervisor, el operario quedaba bloqueado.
3. **Validación de tipos de datos en parámetros**:
   - `unit_number` y `station_number` no estaban explícitamente casteados a `int`, arriesgando fallos de comparación de tipos (`5 != "5"`).
4. **Falso negativo en el frontend (`stepsMissingPhotos`)**:
   - `OperatorWorkspaceView.jsx` evaluaba únicamente `operatorStepLogsMap`, ignorando si la evidencia fotográfica ya residía en `supervisorStepLogsMap` o `stepLogsMap`.

## 3. Solución Técnica Implementada

### Backend (`backend/app/main.py`)
1. **Helper Canónico `get_station_effective_steps`**:
   - Se creó una función centralizada que calcula de forma idéntica e infalible los pasos asignados a cada estación, cruzándolos contra los pasos válidos en `QCChecklistItem` y aplicando las reglas de aislamiento para estaciones de limpieza (`is_cleaning == True`).
   - Tanto `get_operator_workspace` como `finish_station` ahora consumen esta misma función (Single Source of Truth).
2. **Refactorización de `finish_station`**:
   - Casteo seguro de `unit_number` y `station_number` a enteros.
   - Reemplazo de la lógica duplicada de rangos por `get_station_effective_steps`.
   - Consulta de completitud por `status == "PASS"` (sin exclusión punitiva de verificaciones de supervisor).
   - Determinación robusta de `total_stations` basada en `max(order.total_stations, max_assigned_station)` para asegurar que `is_finished` sea `True` y la unidad quede con `overall_status = "PASSED"` y `completed_at` registrado.
3. **Auto-healing de configuración de órdenes**:
   - `auto_heal_checklist_sequence` actualiza las estaciones de limpieza de órdenes activas para asegurar que su rango y lista de pasos concuerde con los pasos de limpieza del modelo.

### Frontend (`frontend/src/views/OperatorWorkspaceView.jsx`)
1. **Evaluación Unificada de Evidencias Fotográficas**:
   - `stepsMissingPhotos` y `allStepsDone` ahora consultan tanto `operatorStepLogsMap`, `supervisorStepLogsMap` y `stepLogsMap`.
2. **Feedback Ergonómico**:
   - Al finalizar y aprobar en Fin de Línea (`data.is_finished = true`), se despliega una celebración visual con confeti y mensaje contextual de éxito.

## 4. Archivos Modificados
- `backend/app/main.py`
- `frontend/src/views/OperatorWorkspaceView.jsx`

## 5. Verificación y Pruebas
1. Prueba de integración en backend con script automatizado (`test_cleaning_finish.py`):
   - Estación 5 con rango 43..52 identificó efectivamente solo los pasos `[49, 50, 51, 52]`.
   - Con fotos adjuntas en 49..52, `finish_station` devolvió HTTP 200 con `is_finished=True`, `next_station=6` y la unidad marcada como `PASSED`.
2. Compilación exitosa del frontend (`rtk npm --prefix frontend run build`) en 4.12s sin advertencias de sintaxis.

