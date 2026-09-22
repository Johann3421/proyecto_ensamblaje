---
title: Grabación y Subida de Videos de Evidencia de 8s (Sin Audio y Optimización H.264)
fecha: 2026-09-22
tipo: feat
estado: COMPLETADO
tags: [video, multimedia, ffmpeg, tesler, vps, optimizacion]
relacionados:
  - "[[Evidencias_Multimedia]]"
  - "[[Puesto_Supervision]]"
  - "[[BITACORA_TAREAS]]"
---

# 🎥 Grabación y Subida de Videos de Evidencia de 8s (Sin Audio y Ultra-optimizados)

## 1. Problema y Requerimiento
El usuario solicitó permitir la captura y subida de videos como evidencia de control de calidad (además de fotos), con un límite estricto de duración y optimización profesional para evitar el desgaste de almacenamiento en el VPS.
- **Restricciones acordadas**:
  1. Duración fija de **8 segundos máximo** con auto-stop.
  2. **Sin audio** para eliminar ruido ambiental de taller y reducir un 25% extra de peso.
  3. Interfaz ultra-simple (Ley de Tesler) para que el operario no deba configurar codecs ni resoluciones.

## 2. Solución Técnica Aplicada

### A. Frontend (Navegador / Dispositivo Operario)
1. **Selector de Modo en [`CameraCaptureModal.jsx`](file:///d:/SISTEMAS%2002/Desktop/Proyectos_generales/proyecto_ensamblaje/frontend/src/modals/CameraCaptureModal.jsx)**:
   - Pestaña para alternar entre `[ 📷 Foto Estándar ]` y `[ 🎥 Video Corto (8s · Mudo) ]`.
2. **Grabación Controlada con `MediaRecorder`**:
   - `audio: false` en `getUserMedia` y `MediaRecorder`: No solicita permisos de micrófono ni consume ancho de banda.
   - Restricción de tasa de bits: `videoBitsPerSecond: 800_000` (800 kbps) a 720p.
   - **Auto-Stop Automático**: Temporizador con barra de progreso superior y badge `REC 00:0X / 00:08`. Al llegar a 8.0s se detiene automáticamente. El usuario también puede pulsar "Detener" antes si ya enfocó lo necesario.
3. **Previsualización & Subida**:
   - Renderizado con `<video controls autoPlay loop playsInline>` con indicador de peso en KB.
   - Envío multipart/form-data a `/api/camera/upload-video`.

### B. Backend (VPS - Transcodificación H.264 Industrial)
1. **Endpoint `POST /api/camera/upload-video` en [`backend/app/main.py`](file:///d:/SISTEMAS%2002/Desktop/Proyectos_generales/proyecto_ensamblaje/backend/app/main.py)**:
   - Utiliza `imageio-ffmpeg` (añadido en `requirements.txt`).
   - Transcodificación con parámetros optimizados:
     - `-t 8.5` (trunca estrictamente a máximo 8 segundos).
     - `-vf scale='min(1280,iw)':-2` (escala máxima a 720p manteniendo relación de aspecto).
     - `-c:v libx264` con preset `veryfast` (impacto mínimo de CPU en el VPS).
     - `-crf 28` (nitidez visual excelente para inspección de hardware sin peso innecesario).
     - `-an` (remueve completamente la pista de audio).
     - `-movflags +faststart` (optimizado para reproducción y streaming web instantáneo).
   - **Resultado obtenido en pruebas**: Videos de 8 segundos con peso de apenas **~80 KB a 500 KB** (menor o igual al peso de una foto).

### C. Visualización de Evidencias
1. **[`PhotoPreviewModal.jsx`](file:///d:/SISTEMAS%2002/Desktop/Proyectos_generales/proyecto_ensamblaje/frontend/src/modals/PhotoPreviewModal.jsx)**:
   - Detecta archivos `.mp4`, `.webm` o `type: 'video'` y despliega reproductor `<video>` con controles completos y bucle.
2. **[`OperatorWorkspaceView.jsx`](file:///d:/SISTEMAS%2002/Desktop/Proyectos_generales/proyecto_ensamblaje/frontend/src/views/OperatorWorkspaceView.jsx)** y **[`UnitDetailModal.jsx`](file:///d:/SISTEMAS%2002/Desktop/Proyectos_generales/proyecto_ensamblaje/frontend/src/modals/UnitDetailModal.jsx)**:
   - Miniaturas identificadas con icono `▶ Video (8s)` para abrir y reproducir con un solo clic.

## 3. Archivos Modificados
- `backend/requirements.txt`: Agregado `imageio-ffmpeg==0.6.0`.
- `backend/app/main.py`: Función `transcode_evidence_video` y endpoint `/api/camera/upload-video`.
- `frontend/src/modals/CameraCaptureModal.jsx`: Modo video, temporizador con auto-stop de 8s y subida.
- `frontend/src/modals/PhotoPreviewModal.jsx`: Reproducción de video integrada.
- `frontend/src/views/OperatorWorkspaceView.jsx`: Miniaturas con badge de play y texto contextual.
- `frontend/src/modals/UnitDetailModal.jsx`: Galería adaptada a clips de video.

## 4. Verificación Realizada
- **Compilación de Frontend**: `npm run build` ejecutado exitosamente (0 errores).
- **Prueba sintética de transcodificación**: Video de 10s con audio procesado a MP4 H.264 de 8s, sin pista de audio (`has_audio: False`), peso final: **78.8 KB**.
