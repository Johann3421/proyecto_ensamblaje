---
title: Separación Estricta de Verificación entre Técnico y Supervisor
fecha: 2026-09-22
tipo: fix
estado: COMPLETADO
tags: [supervisor, tecnico, qc, tesler, estaciones, trazabilidad]
relacionados:
  - "[[Puesto_Supervision]]"
  - "[[BITACORA_TAREAS]]"
---

# 🛡️ Separación Estricta de Verificación entre Técnico y Supervisor

## 1. Problema y Causa Raíz
El usuario reportó un error crucial en el flujo de control de calidad:
> *"cuando un supervisor revisa antes que el tecnico, al tecnico le aparece verificado, cuando el debe verificar tambien, osea el trabajo del supervisor debe estar separado del resto por que eso puede generar confusion"*

### Causa Raíz Técnica:
1. **Sobreescritura destructiva de logs**:
   - En `/supervisor/verify-step-photo`, el backend borraba cualquier log previo en `QCStepLog` para ese paso con `status == "PASS"`, borrando la trazabilidad del técnico si existía.
   - En `/operator/submit-step`, el backend hacía lo mismo, eliminando la validación del supervisor.
2. **Mezcla de completitud en `get_operator_workstation`**:
   - `completed_step_numbers` agrupaba indistintamente registros de operario y de supervisor.
   - Si un supervisor auditaba un paso con anticipación, el paso se marcaba en verde ("Hecho" / Checked) en la pantalla del técnico de la estación correspondiente.
3. **Omisión de validación de despacho en `/operator/finish-station`**:
   - Al despachar una estación, se verificaba si había algún log `PASS` sin filtrar por rol, permitiendo que la verificación del supervisor convalidara falsamente la ausencia de trabajo del técnico.

---

## 2. Solución Aplicada

### A. Backend (`backend/app/main.py`)
1. **Desacoplamiento en `get_operator_workstation`**:
   - Se dividieron los logs en `operator_logs` (`is_supervisor_verified == False`) y `supervisor_logs` (`is_supervisor_verified == True`).
   - Para el operario, `completed_step_numbers` contiene **únicamente** los pasos realizados por el técnico.
   - Se exponen `technician_step_numbers`, `supervisor_step_numbers`, `completed_step_logs` y `supervisor_step_logs`.
2. **Endpoints de verificación no destructivos**:
   - `/supervisor/verify-step-photo` solo borra logs previos de supervisión (`is_supervisor_verified == True`), preservando intacto el registro del técnico. No altera `unit.current_step_progress` de ensamblaje.
   - `/operator/submit-step` solo borra logs previos del técnico (`is_supervisor_verified == False`), preservando la certificación del supervisor.
   - `/operator/uncheck-step` evalúa el rol de quien desmarca para eliminar solo el log correspondiente a su rol.
3. **Despacho estricto de estación (`/operator/finish-station`)**:
   - Exige que todos los pasos de la estación y la foto del último paso hayan sido completados **por el técnico** (`is_supervisor_verified == False`).

### B. Frontend (`OperatorWorkspaceView.jsx`)
1. **Estados independientes**:
   - `technicianDoneSteps` (pasos completados por el técnico).
   - `supervisorDoneSteps` (pasos certificados por el supervisor).
   - `operatorStepLogsMap` y `supervisorStepLogsMap`.
2. **Visualización para el técnico cuando el supervisor revisó antes**:
   - El paso permanece **incompleto (sin marcar, fondo neutro, botón activo)**.
   - Se muestra un aviso contextual:
     `🛡️ Supervisión Registrada Previamente (Supervisor) — ⚠️ El técnico de la estación debe ejecutar y verificar su propio paso de forma obligatoria`.
3. **Galería dual de evidencias**:
   - Si existen ambas evidencias (técnico y supervisor), se renderizan las dos miniaturas con badges descriptivos diferenciados (`📸 Foto del técnico` en verde esmeralda y `🛡️ V°B° Supervisor` en índigo).

---

## 3. Archivos Modificados
- `backend/app/main.py`
- `frontend/src/views/OperatorWorkspaceView.jsx`
- `obsidian/arquitectura/Puesto_Supervision.md`
- `obsidian/BITACORA_TAREAS.md`

---

## 4. Verificación
- **Backend**: `python -m py_compile backend/app/main.py` -> exitoso (0 errores).
- **Frontend**: `npm run build` -> exitoso en 4.03s (0 errores).
