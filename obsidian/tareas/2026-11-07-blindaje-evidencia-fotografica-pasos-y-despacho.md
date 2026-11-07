---
fecha: 2026-11-07
tipo: fix / seguridad / tesler
estado: completado
tags: [fotos, evidencia, control-calidad, backend, frontend, tesler]
---

# 📸 Blindaje de Evidencias Fotográficas Obligatorias en Pasos y Despacho de Estación

## 📋 Contexto y Reporte
El usuario reportó: *"se puede avanzar sin adjuntar las imagenes como evidencia, investiga si eso sucede y corrigelo"*.

## 🔍 Causa Raíz Identificada
1. **Frontend (`OperatorWorkspaceView.jsx`)**:
   - En el commit `64beba56`, la condición para exigir la captura de foto en cada paso:
     `if (requirePhotoVerification || isLastStep)`
     fue reemplazada erróneamente por:
     `const requiresPhotoForStep = Boolean(step.requires_photo || isLastStep);`
   - Dado que `step.requires_photo` no existía en el esquema del backend ni en la base de datos (siempre `undefined`), la variable evaluaba a `false` para todos los pasos intermedios (1..N-1).
   - Como resultado, cualquier operario que tocaba un paso ejecutaba la rama `else`, marcando el paso como `PASS` directamente sin abrir la cámara ni adjuntar ninguna fotografía de evidencia.
   - Además, la condición de despacho de estación (`isStationComplete`) solo comprobaba `hasLastStepPhoto` (la foto del último paso), permitiendo despachar unidades que tenían pasos intermedios sin ninguna foto.

2. **Backend (`backend/app/main.py`)**:
   - En el endpoint `POST /operator/submit-step`, no se validaba la presencia de `photo_url` al recibir `status == "PASS"`.
   - En el endpoint `POST /operator/finish-station`, la validación de fotos únicamente inspeccionaba el último paso (`last_step = effective_steps[-1]`), ignorando si los pasos precedentes contaban con fotos de evidencia.

## 💡 Solución Implementada

### 1. Blindaje en Backend (`backend/app/main.py`)
- **Validación en `submit_step_check` (`POST /operator/submit-step`)**:
  - Al aprobar un paso (`req.status == "PASS"`), se valida estrictamente que `req.photo_url` esté presente y no vacío. En caso contrario, se rechaza la petición con código HTTP 400: *"No se puede aprobar el paso #{step_number} sin adjuntar la fotografía de evidencia obligatoria"*.
- **Validación en `finish_station` (`POST /operator/finish-station`)**:
  - Se verifica que **todos** los pasos asignados y efectivos de la estación (`effective_steps`) cuenten con al menos un registro `PASS` con `photo_url` válido tomado por el técnico.
  - Si falta evidencia en uno o más pasos, se bloquea el despacho con HTTP 400 informando los números exactos de pasos pendientes.

### 2. Blindaje en Frontend (`frontend/src/views/OperatorWorkspaceView.jsx`)
- **Apertura Obligatoria de Cámara en Cada Paso**:
  - Se actualizó `requiresPhotoForStep`:
    `const requiresPhotoForStep = requirePhotoVerification || isLastStep || step.requires_photo !== false;`
  - Al tocar cualquier paso no completado, se abre directamente el modal `CameraCaptureModal` (`setPhotoStepModal(step)`). El paso no puede marcarse conforme sin capturar o subir la evidencia correspondiente.
- **Bloqueo Visual y Asistido de Despacho de Estación**:
  - Se calculó `stepsMissingPhotos = uniqueStationSteps.filter(s => !operatorStepLogsMap[s.step_number]?.photo_url)`.
  - Se condicionó `isStationComplete = allStepsDone && allStepsHavePhoto` (donde `allStepsHavePhoto` exige que `stepsMissingPhotos.length === 0`).
  - Tanto en el panel sticky (`<aside>`) como en la confirmación inferior del checklist, si todos los pasos están marcados pero faltan fotos, se despliega una tarjeta de alerta indicando las fotos pendientes y un botón directo para capturar la evidencia del primer paso pendiente.

## 🧪 Verificación y Pruebas
1. **Tests Automatizados (`scratch/test_photo_enforcement.py`)**:
   - `submit-step` sin foto rechazado con HTTP 400 (`detail: No se puede aprobar el paso #1 sin adjuntar la fotografía de evidencia obligatoria.`).
   - `submit-step` con foto aprobado con HTTP 200.
   - `finish-station` con pasos sin foto rechazado con HTTP 400 (`detail: No se puede avanzar de estación: Faltan fotografías de evidencia obligatoria en 1 paso(s)...`).
2. **Compilación Vite de Producción**:
   - `rtk npm --prefix frontend run build`: compilación exitosa en 4.02s (`dist/assets/index-PMvrEz89.js`, `dist/assets/index-dUofOctB.css`).
3. **Tests de Regresión de Estaciones (`scratch/test_fixes.py`)**:
   - 100% aprobados.

## 📁 Archivos Modificados
- `backend/app/main.py`: Validación obligatoria de fotos en `submit_step_check` y `finish_station`.
- `frontend/src/views/OperatorWorkspaceView.jsx`: Activación obligatoria de cámara para todos los pasos y comprobación completa de fotos en `isStationComplete`.

