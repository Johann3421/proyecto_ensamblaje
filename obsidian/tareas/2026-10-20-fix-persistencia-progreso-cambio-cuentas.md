---
title: Fix Persistencia y Visualización de Progreso al Cambiar de Cuenta
fecha: 2026-10-20
tipo: fix
estado: completado
tags: [persistencia, roles, supervisor, operario, ley-de-tesler, frontend, backend]
---

# 🛠️ Fix: Persistencia y Visualización de Progreso al Cambiar de Cuenta

## 1. Descripción del Problema
Al estar ensamblando una PC, si el operario cerraba sesión o entraba con otra cuenta (p. ej. Supervisor, Administrador o Técnico secundario), parecía que el progreso de la PC desaparecía por completo (barra de progreso en 0% o paso a otra PC distinta).

## 2. Causa Raíz Detectada (Investigación Forense)
La investigación en base de datos (`QCStepLog`, `QCPCUnit`) demostró que los registros **NUNCA se borraron ni se perdieron**. El progreso siempre estuvo almacenado en SQLite. El problema era una combinación de 4 factores de presentación y resolución de sesión:

1. **Falso Cero en Modo Supervisor / Admin**:
   - Con la separación estricta entre técnicos y supervisores, `completed_step_numbers` en el workspace del supervisor devolvía únicamente `supervisor_step_numbers`. Si el supervisor no había firmado los pasos aún, la lista estaba vacía `[]`.
   - En el frontend, la barra de progreso calculaba `completed_step_numbers.length / totalStationSteps`, arrojando **0/52 (0%)** y los pasos aparecían con reloj ámbar de "Pendiente" y fondo neutro. Esto daba la falsa ilusión de que el técnico no había hecho nada.
2. **Pérdida de la Unidad Activa (`unit_number`) al Cambiar de Cuenta**:
   - En `App.jsx`, al recargar o iniciar sesión, `loadOperatorWorkspace(null, ...)` no enviaba `unit_number`.
   - El backend hacía fallback a `units_in_station[0]` (habitualmente la PC #1), perdiendo la PC que estaba siendo trabajada activamente (ej. PC #28).
3. **Filtro de Estación Pegajoso (`operatorStationFilter`)**:
   - Al cerrar sesión (`handleLogout`), `operatorStationFilter` no se limpiaba en React state, forzando al siguiente usuario a consultar una estación que no le correspondía.
4. **Omisión de Técnicos Secundarios (`secondary_user_id`)**:
   - Las consultas de asignación de estación en el backend solo verificaban `QCStationAssignment.user_id == user_id`, ignorando si el usuario era el `secondary_user_id` de la estación.

## 3. Solución Técnica Implementada

### Backend (`backend/app/main.py`)
1. **Fallback Basado en Actividad Real (`QCStepLog`)**:
   - En lugar de basarse ciegamente en datos mockeados del seed (`current_step_progress`), el backend consulta la actividad real más reciente en `QCStepLog` para seleccionar automáticamente la PC exacta en la que se estaba trabajando (p. ej. PC #28 o PC #1).
2. **Acceso a Unidades Despachadas**:
   - Se permite consultar PCs que ya avanzaron de estación (`active_unit` busca en toda la orden si se especifica `unit_number`).
   - `completed_units` prioriza en los primeros lugares las unidades que tienen registros reales en `QCStepLog`.

### Frontend (`frontend/src/App.jsx`)
1. **Persistencia de PC Activa sin Pérdida al Salir**:
   - Se conserva `qc_active_unit` en `localStorage` al hacer logout para que al alternar cuentas (ej: llamar al supervisor en la misma máquina física) el sistema mantenga seleccionada la misma PC.

### Frontend (`frontend/src/views/OperatorWorkspaceView.jsx`)
1. **Visibilidad de PCs Despachadas en Estación**:
   - Se añadió un carrusel interactivo de "PCs despachadas a siguiente estación" (`completed_units`) que permite al operario volver a ver cualquier PC que ya terminó (ej. PC #1) y confirmar sus 11 pasos y fotos en modo histórico.
2. **Doble Métrica de Avance en Header**:
   - Barra esmeralda de avance de ensamblaje (operarios) y barra ámbar de certificación (supervisor).
3. **Diferenciación Visual en Tarjetas**:
   - Pasos realizados por el técnico se destacan en verde suave con badge explicativo para el supervisor.

## 4. Archivos Modificados
- `backend/app/main.py`
- `frontend/src/App.jsx`
- `frontend/src/views/OperatorWorkspaceView.jsx`

## 5. Verificación
- Bundle compilado con `npm run build` sin errores.
- Pruebas automatizadas de 4 escenarios:
  1. `SUP-01` login sin parámetro `unit_number`: selecciona PC #28 con pasos `[1, 2, 3]` del técnico.
  2. `OP-101` login sin parámetro: selecciona PC #28 con pasos `[1, 2, 3]`.
  3. `OP-101` seleccionando PC #1: abre PC #1 en modo histórico con sus 11 pasos y foto de serie intactos.
  4. `OP-102` en PC #1: reconoce los 11 pasos previos aprobados en Estación 1.
