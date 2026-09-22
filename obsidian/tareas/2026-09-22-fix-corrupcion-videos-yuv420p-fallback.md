---
title: Fix de Corrupción de Videos en Carga y Reproducción (YUV420p, Dimensiones Pares y Fallback Seguro)
fecha: 2026-09-22
tipo: fix
estado: COMPLETADO
tags: [video, bugfix, ffmpeg, h264, yuv420p, docker, vps]
relacionados:
  - "[[2026-09-22-subida-videos-optimizados-8s]]"
  - "[[BITACORA_TAREAS]]"
---

# 🛠️ Fix: Corrupción de Videos Subidos y Error de Visualización

## 1. Causa Raíz Identificada

El usuario reportó: *"Los videos se suben de forma corrupta y no se pueden visualizar una ves subida"*.

Se identificaron tres factores críticos concatenados que causaban el fallo:
1. **Falta de FFmpeg en la imagen Docker del VPS**:
   - `backend/Dockerfile` utilizaba `python:3.12-slim` sin el paquete `ffmpeg`. En Linux, el módulo Python `imageio-ffmpeg` no contiene binario precompilado y requiere `ffmpeg` del sistema. Por tanto, `transcode_evidence_video` fallaba al no hallar el ejecutable en el contenedor.
2. **Fallback erróneo con renombramiento de extensión (`backend/app/main.py`)**:
   - Al fallar `ffmpeg`, el backend ejecutaba `shutil.copyfile(in_temp, out_filepath)` donde `out_filepath` terminaba rígidamente en `.mp4`, pero `in_temp` era un contenedor `.webm` crudo proveniente de `MediaRecorder`.
   - FastAPI servía el archivo con `Content-Type: video/mp4`. El demuxer MP4 de los navegadores (Chrome, Safari, Firefox) rechazaba el archivo como corrupto (`MEDIA_ERR_SRC_NOT_SUPPORTED`).
3. **Filtro de escalado inválido para dimensiones impares en móviles**:
   - Cámaras de teléfonos capturan resoluciones verticales o recortes con dimensiones impares (ej. `719x1279`).
   - El filtro previo `scale='min(1280,iw)':-2` provocaba que FFmpeg retornara error fatal `-22 (Invalid argument)` (`libx264: width not divisible by 2`), abortando la transcodificación.
4. **Falta de `-pix_fmt yuv420p` y `-profile:v main`**:
   - FFmpeg heredaba perfiles no compatibles con reproductores móviles (ej. YUV444p).
5. **Autoplay bloqueado en frontend**:
   - `<video autoPlay>` sin atributo `muted` era bloqueado por las políticas de autoplay de navegadores móviles y desktop.

---

## 2. Solución Quirúrgica Aplicada

### A. Backend (`backend/Dockerfile` y `backend/app/main.py`)
- **Docker**: Se añadió `ffmpeg` en `apt-get install -y --no-install-recommends` dentro de `backend/Dockerfile`.
- **FFmpeg Filter Robusto**:
  - Filtro: `scale=w=1280:h=1280:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p`.
  - Fuerza dimensiones pares en ancho y alto (múltiplos de 2).
  - Parámetros H.264 universales: `-profile:v main -pix_fmt yuv420p -an -movflags +faststart`.
  - Flags de timestamps para WebM: `-fflags +genpts -avoid_negative_ts make_zero`.
- **Fallback Seguro**:
  - Si FFmpeg no logra transcodificar, se mantiene la extensión real original (`.webm` o `.mp4`) en lugar de renombrarla fraudulentamente a `.mp4`. Esto permite al navegador reproducirlo nativamente según su MIME type real.

### B. Frontend (`CameraCaptureModal.jsx`, `PhotoPreviewModal.jsx`, `OperatorWorkspaceView.jsx`, `UnitDetailModal.jsx`)
- Agregado atributo `muted` en todas las instancias de `<video autoPlay ... />` para permitir reproducción inmediata sin bloqueo del navegador.
- En miniaturas de evidencia se configuró `preload="metadata"` y `src={`${url}#t=0.001`}` para forzar la pintura del primer fotograma y evitar cuadros negros en iOS y Android.

---

## 3. Archivos Modificados
- `backend/Dockerfile`
- `backend/app/main.py`
- `frontend/src/modals/CameraCaptureModal.jsx`
- `frontend/src/modals/PhotoPreviewModal.jsx`
- `frontend/src/modals/UnitDetailModal.jsx`
- `frontend/src/views/OperatorWorkspaceView.jsx`

---

## 4. Verificación
1. **Prueba FFmpeg**: Dimensiones impares (`719x1279`) y videos verticales (`1080x1920`) transcodifican exitosamente a H.264 Main YUV420p con código de retorno `0`.
2. **Compilación Frontend**: `npm run build` completado sin advertencias en 5.86s.
3. **Compilación Backend**: `py_compile backend/app/main.py` exitosa.
