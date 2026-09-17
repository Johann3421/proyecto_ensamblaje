---
title: Flash (Linterna) y Zoom en Visor de Cámara
fecha: 2026-09-17
tipo: feat
estado: COMPLETADO
tags: [camara, webrtc, hardware, torch, zoom, frontend]
relacionados:
  - "[[Puesto_Supervision]]"
  - "[[BITACORA_TAREAS]]"
---

# 📸 Flash (Linterna) y Zoom en Visor de Cámara

## 1. Problema Reportado
1. Dificultad para iluminar zonas oscuras dentro del case al tomar fotografías de evidencia de placas, conectores y coolers.
2. Incompatibilidad de zoom en ciertos navegadores móviles y selección de la peor cámara trasera en celulares con múltiples lentes.

## 2. Solución Aplicada
1. **Control de Linterna por Hardware (`torch`)**:
   - Se implementó `track.applyConstraints({ advanced: [{ torch: nextState }] })` en `CameraCaptureModal.jsx`.
   - Botón `Flash ON / Flash` en la barra superior del visor.
2. **Zoom Digital & Óptico**:
   - Detección de capacidades del sensor con `track.getCapabilities().zoom`.
   - Slider de zoom suave (1x a 5x) e indicador interactivo de nivel de aumento.
   - Soporte para selector de lentes traseros y botón directo de fallback hacia la app de cámara nativa del celular (`input type="file" capture="environment"`).

## 3. Archivos Modificados
- `frontend/src/modals/CameraCaptureModal.jsx`
