---
fecha: 2026-11-03
tipo: bugfix / refactor / ux
estado: completado
tags: [ezent, checklist, supervisores, estaciones, tesler]
---

# Reordenamiento de Secuencia EZENT (Paso 55 a #47) y Desacople de Roles de Supervisión

## Contexto y Objetivo
1. **Inconsistencia de Secuencia en EZENT**: El paso de "Limpieza De la Tapa de la parte Interna" estaba asignado al final del checklist (paso 55), después de las operaciones de cerrado, rotulado y embalaje final en caja (pasos 52 a 54).
2. **Cruce de Roles y Estaciones del Supervisor**: Cuando un supervisor salía de la Estación 0 y consultaba Estación 1 o 2, el frontend lo degradaba a operario técnico ensamblador, provocando que sus clics sobre los pasos sobrescribieran el trabajo de los técnicos con logs de operario (`is_supervisor_verified: false`) en vez de registrar visto bueno oficial con foto. Además, si se asignaban múltiples supervisores separados por comas, el backend bloqueaba el acceso a estaciones de línea.

---

## Solución Técnica

### 1. Backend (`backend/app/main.py`)
- **Migración Automática de EZENT (`reorder_ezent_checklist`)**:
  - Reubica el paso "Limpieza De la Tapa de la parte Interna" a la posición correlativa **#47** (bloque estético previo al cierre de chasis y embolsado).
  - Desplaza correlativamente los pasos 47..54 hacia las posiciones 48..55.
  - El checklist de `EZENT` conserva exactamente 55 pasos, sin añadir ni eliminar ítems.
- **Soporte Multi-Supervisor en Endpoints**:
  - `get_operator_workspace`: Soporta listas de supervisores delimitadas por coma en `order.supervisor_id`, permitiendo a cualquier supervisor asignado acceder y auditar cualquier estación de la orden.
  - `uncheck_step`: Valida supervisores asignados por lista en la orden para permitir desmarcar o corregir vistos buenos.

### 2. Frontend (`frontend/src/views/OperatorWorkspaceView.jsx`)
- **Persistencia del Rol de Supervisor**:
  - `isSupervisorMode` permanece activo si el usuario logueado es supervisor de la orden y no es el ensamblador asignado a esa estación física.
  - Al interactuar con pasos en Estaciones 1..N, el supervisor siempre actúa como auditor/certificador (apertura de modal con foto o retiro de V°B°), sin pisar nunca los registros del ensamblador.
- **Desmarcado de V°B° por Supervisor**:
  - Si el supervisor pulsa sobre un paso que ya cuenta con su visto bueno, invoca `/operator/uncheck-step` (`is_sup: true`) para retirar la certificación previa.
- **Prevención de Cruces y Desincronización**:
  - En la lista de pasos, si la unidad aún no ha llegado físicamente a la estación del paso auditado (`st.origin_station_number > active_unit.current_station`), se muestra la etiqueta informativa `PC aún en Estación X`, evitando auditorías anticipadas por error.

---

## Verificación
- `rtk npm --prefix frontend run build`: 0 errores, compilación exitosa en 4.15s.
- Verificación sintaxis backend Python: OK.
