---
title: Puesto Independiente de Supervisión (Estación 0)
fecha: 2026-09-17
tipo: fix
estado: COMPLETADO
tags: [supervisor, backend, frontend, estacion0, tesler]
relacionados:
  - "[[Puesto_Supervision]]"
  - "[[Flujo_Estaciones]]"
  - "[[BITACORA_TAREAS]]"
---

# 🛡️ Puesto Independiente de Supervisión (Estación 0)

## 1. Problema Reportado
Al hacer clic en *"Mis Pasos de Supervisión"*, la pantalla saltaba a la **Estación 1** en lugar de mostrar los pasos de supervisión, y continuaba dependiendo de si los pasos pertenecían a la Estación 3 o 4 física.

## 2. Causa Raíz
1. **JavaScript Falsy Bug (`App.jsx`)**:
   `if (targetStation) params.append('station_number', targetStation)` evaluaba `0` como `false`. Al seleccionar la estación de supervisión (`value={0}`), el backend nunca recibía `station_number=0` y recurría al fallback de Estación 1.
2. **Filtrado Restrictivo en Backend (`main.py`)**:
   Cuando `order.supervisor_steps` era `None`, el backend solo devolvía los 5 últimos pasos de cierre de las estaciones físicas, omitiendo todos los demás pasos. Además, los pasos conservaban el número de estación física en lugar de pertenecer a la Estación 0 del supervisor.

## 3. Solución Aplicada
1. **Frontend ([`App.jsx`](file:///d:/SISTEMAS%2002/Desktop/Proyectos_generales/proyecto_ensamblaje/frontend/src/App.jsx))**:
   - Corrección a `if (targetStation !== null && targetStation !== undefined) params.append('station_number', targetStation)`.
   - Carga inicial en Estación `0` para usuarios con rol `SUPERVISOR`.
2. **Backend ([`backend/app/main.py`](file:///d:/SISTEMAS%2002/Desktop/Proyectos_generales/proyecto_ensamblaje/backend/app/main.py))**:
   - Peticiones con `station_number=0` entran directamente al modo supervisión independiente.
   - Si no hay filtro manual en `order.supervisor_steps`, se cargan **todos los pasos del modelo** en el puesto de supervisión.
   - Cada paso se asigna a `station_number: 0` con `origin_station_number` solo como referencia visual.
3. **UI ([`OperatorWorkspaceView.jsx`](file:///d:/SISTEMAS%2002/Desktop/Proyectos_generales/proyecto_ensamblaje/frontend/src/views/OperatorWorkspaceView.jsx))**:
   - Botón directo `⭐ Ir a Mi Estación`.
   - Ocultados botones de derivación física y pasos pendientes heredados en modo supervisión.
   - Acceso libre a cualquier PC de la orden para registrar fotos de cumplimiento normativo.

## 4. Archivos Modificados
- `backend/app/main.py`
- `frontend/src/App.jsx`
- `frontend/src/views/OperatorWorkspaceView.jsx`
