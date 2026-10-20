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
1. **Fallback Inteligente de Unidad Activa**:
   - Tanto en el workspace del supervisor (`is_supervisor_mode`) como en el del técnico, si `unit_number is None`, el backend busca y prioriza automáticamente la primera unidad con estado `IN_PROGRESS` o `current_step_progress > 0` antes de hacer fallback ciego a la primera unidad.
2. **Soporte para Técnico Secundario**:
   - Se añadió `(QCStationAssignment.user_id == user_id) | (QCStationAssignment.secondary_user_id == user_id)` en todas las consultas de resolución de asignación.

### Frontend (`frontend/src/App.jsx`)
1. **Persistencia de Unidad en `localStorage`**:
   - `loadOperatorWorkspace` consulta `localStorage.getItem('qc_active_unit')` como fallback seguro si no se especifica `unit_number`.
   - Al recibir la respuesta del backend, guarda `data.active_unit.unit_number` en `localStorage`.
2. **Limpieza en Logout & Login**:
   - `handleLogout` y `handleLogin` limpian `operatorStationFilter` y limpian `localStorage.removeItem('qc_active_unit')` en logout, evitando contaminación cruzada de puestos entre turnos.

### Frontend (`frontend/src/views/OperatorWorkspaceView.jsx`)
1. **Doble Métrica de Avance en Header**:
   - **Avance de Ensamblaje (Técnicos de Planta)**: Barra esmeralda que computa `technicianVerifiedCount` (pasos realizados por técnicos). Siempre visible tanto para operarios como para supervisores.
   - **Certificación Oficial (V°B° Supervisor)**: Barra ámbar que computa `supervisorVerifiedCount` (visados oficiales con foto del supervisor).
2. **Diferenciación Visual en Tarjetas de Pasos**:
   - Cuando el supervisor entra y un paso ya fue realizado por el técnico pero aún no tiene V°B° del supervisor:
     - Borde y fondo en tono esmeralda sutil (`border-emerald-300 bg-emerald-50/30`).
     - Botón izquierdo con check esmeralda: **Técnico OK (Falta V°B°)**.
     - Badge de título: `✓ Operario completó (Nombre Técnico) · Falta tu V°B°`.
     - Miniatura de la evidencia fotográfica/video del técnico visible de inmediato.

## 4. Archivos Modificados
- `backend/app/main.py`
- `frontend/src/App.jsx`
- `frontend/src/views/OperatorWorkspaceView.jsx`

## 5. Verificación
- Bundle compilado con `npm run build` sin errores de módulos ni variables no declaradas.
- Script de prueba `test_user_switch.py` ejecutado contra SQLite: verificado que PC #28 mantiene trazabilidad de pasos [1, 2, 3] del técnico Carlos Mendoza (`OP-101`) y el supervisor (`SUP-01`) los reconoce en `technician_step_numbers` con fallback automático.
