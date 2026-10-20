---
fecha: 2026-10-20
tipo: fix / refactor
estado: completado
tags: [estacion, ley-de-tesler, multiestacion, url-encoding, workspace-operario]
---

# Reestructuración de Vista de Estación, Resolución de Orden URL y Soporte Multiestación (Ley de Tesler)

## 1. Descripción
Investigación y corrección de obstrucciones operativas en la vista de trabajo del operario (`https://ensamblaje.sekaitech.com.pe/estacion?order=...`), particularmente en órdenes con formatos irregulares de espacios o signos `+` (ej: `OCAM-2026-1443-13-0     ---2`) y técnicos asignados a múltiples estaciones físicas (ej: Jhoan A / OP-106 asignado simultáneamente a Estación 1 y Estación 2).

## 2. Causa Raíz
1. **Discrepancia de Formato de Orden en URLs**:
   - El router frontend y los parámetros de query string decodificaban `+` de URLs sin reemplazarlo por espacios reales o no normalizaban espacios colapsados (`resolve_order`), causando respuestas 404 o pérdida de contexto en llamadas directas.
2. **Bloqueo Monopuesto en Backend (`get_operator_workspace`)**:
   - Para operarios con múltiples puestos en una orden, el backend seleccionaba rígidamente la primera estación (`next((a for a in all_stations if a.user_id == user_id), None)` -> Estación 1).
   - Cuando una PC (PC #1) completaba la Estación 1 y avanzaba a Estación 2, al ser seleccionada por el operario el backend seguía sirviendo la Estación 1. Al evaluar `active_unit.current_station > assignment.station_number` (2 > 1), bloqueaba la PC en modo histórico de solo lectura e impedía ejecutar el Paso 17.
3. **Obstrucción de UI en Frontend (`OperatorWorkspaceView.jsx`)**:
   - El selector rápido de PCs estaba condicionado a `{units_in_station.length > 1 && ...}`. Cuando en una estación solo quedaba 1 PC pendiente (o 0), la tarjeta completa desaparecía, ocultando la fila de acceso a PCs despachadas (`completed_units`) y dejando al usuario sin saber qué PC tenía activa ni cómo consultar las anteriores.
   - No existía control de cambio de puesto (pills/tabs) para técnicos asignados a 2 o más estaciones en la misma orden, ya que el selector estaba restringido únicamente a supervisores o usuarios con rol de apoyo genérico.

## 3. Solución Técnica (Cumplimiento de la Ley de Tesler)
1. **Resolución Inteligente de Orden en Backend (`resolve_order`)**:
   - Función canónica que prueba coincidencia exacta, decodificación de `+` por espacios y colapso de secuencias de espacios múltiples contra la base de datos SQLite.
   - Integrada en todos los endpoints: `orders/{id}`, `orders/{id}/matrix`, `operator/submit-step`, `operator/uncheck-step`, `operator/finish-station`, `orders/{id}/reset`, `orders/{id}/delete`, `orders/{id}/units`.
2. **Auto-enrutamiento de Estación por Unidad Activa**:
   - Al seleccionar una PC (`unit_number`), si el operario está asignado al puesto donde se encuentra esa PC en ese momento, el backend activa automáticamente esa estación.
   - Si no se especifica PC ni estación, el backend prioriza automáticamente la estación del operario que tiene unidades pendientes de trabajo (`IN_PROGRESS` o `PENDING`).
3. **Pills de Navegación Multiestación en Frontend**:
   - Si un operario tiene múltiples estaciones asignadas en la orden (`user_assigned_stations.length > 1`), se renderiza una botonera limpia y ergonómica para alternar entre sus estaciones asignadas (E1, E2, etc.).
4. **Rescate del Selector de PCs**:
   - Condición actualizada a: `((units_in_station && units_in_station.length > 0) || (completed_units && completed_units.length > 0) || isSupervisorMode)`.
   - Mensaje de estado informativo si una estación no tiene PCs pendientes (`No hay PCs pendientes en esta estación`) sin ocultar la lista de PCs despachadas a la siguiente estación.
   - `onSelectUnit` sincroniza dinámicamente la estación activa sin forzar bloqueos anteriores.

## 4. Archivos Modificados
- `backend/app/main.py`: `resolve_order`, lógica auto-estación por unidad, endpoints con orden normalizada, retorno de `user_assigned_stations`.
- `frontend/src/utils/router.js`: Decodificación y sustitución de `+` por espacios en `getRouteParams()`.
- `frontend/src/App.jsx`: `encodeURIComponent` en matriz, `loadOperatorWorkspace` sincroniza `operatorStationFilter`, `onSelectUnit` con auto-resolución.
- `frontend/src/views/OperatorWorkspaceView.jsx`: Destructuración de `user_assigned_stations`, banner multiestación para operarios asignados, corrección de visibilidad del selector de PCs.

## 5. Verificación
- Simulación en Python de operario multiestación:
  - Solicitud de PC en E1 -> activa E1 (pasos 1-16).
  - Solicitud de PC en E2 -> auto-activa E2 (paso 17 editable, no histórico).
  - Consulta con `+` y espacios múltiples -> resolución canónica inmediata.
- Compilación de frontend Vite `rtk npm run build` exitosa (0 errores).
