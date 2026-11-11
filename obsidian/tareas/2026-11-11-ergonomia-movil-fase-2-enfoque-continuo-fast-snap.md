---
title: "Ergonomía Móvil Fase 2: Ensamble Continuo, Modo Enfoque 1 a 1, Disparo Rápido (Fast Snap) y Auto-Avance"
fecha: 2026-11-11
tipo: ux / mobile / arquitectura / tesler
estado: completado
tags: [mobile, fitts, tesler, fast_snap, hero_mode, auto_advance, thumb_zone, bento_apple]
---

# ⚡ Ergonomía Móvil Fase 2: Ensamble Continuo, Modo Enfoque y Disparo Rápido

## 1. Contexto & Objetivos
En la línea de producción, la visualización de 40 a 52 pasos en lista vertical obligaba a los técnicos de ensamblaje a hacer scroll continuo, buscar el paso que les tocaba y pulsar múltiples botones en pantalla para cada evidencia fotográfica (Capturar -> Previsualizar -> Confirmar -> Scroll -> Siguiente).

La Fase 2 resuelve esta sobrecarga aplicando la **Ley de Tesler** (el sistema automatiza la secuencia) y la **Ley de Fitts** (acciones primarias maximizadas al alcance del pulgar):
1. **Modo Enfoque 1 a 1 (Hero Step Continuo)**: Presenta únicamente la operación activa con su criterio QC, guía multimedia y botón gigante de captura.
2. **Disparo Rápido de 1-Toque (`Fast Snap`)**: Captura, comprime a WebP/JPEG optimizado y sube la foto directamente sin pasos intermedios superfluos.
3. **Auto-Avance Instantáneo**: Al validar la evidencia fotográfica, el sistema avanza automáticamente al siguiente paso pendiente de la estación.
4. **Sincronización con Thumb Zone**: La barra flotante inferior móvil (`lg:hidden fixed bottom-0`) y la tarjeta Hero permanecen enlazadas en tiempo real.

---

## 2. Solución Técnica Implementada

### A. Disparo Rápido en 1-Toque (`CameraCaptureModal.jsx`)
- Se implementó `handleInstantCaptureAndUpload()`:
  - Extrae el frame actual del stream de video por canvas.
  - Aplica recorte por zoom si está activo.
  - Comprime a WebP/JPEG optimizado en el navegador.
  - Sube con reintentos automáticos vía `fetchWithRetry`.
  - Dispara feedback háptico triunfal `hapticSuccess()` y cierra el modal en un solo flujo continuo.
- Nuevo botón primario industrial: `⚡ Capturar y Guardar (1-Toque)` de `min-h-[48px]`, manteniendo un botón secundario compacto `Revisar` para cuando el operario requiera verificar el encuadre.

### B. Modo Enfoque 1 a 1 vs Lista Completa (`OperatorWorkspaceView.jsx`)
- Selector de modo Bento Apple en la cabecera del checklist:
  - `[⚡ Paso a Paso | 📋 Lista (N)]`.
  - En móviles (`< 768px`) se activa por defecto en `Paso a Paso`.
- **Tarjeta Bento Hero (Modo Paso a Paso)**:
  - Badge numérico prominente con indicador `Paso X de Y`.
  - Título de operación en tipografía grande y clara.
  - Caja de **Criterio de Calidad QC** de alto contraste visual.
  - Botón de acceso directo a video/guía visual si existe `media_url`.
  - Miniaturas de evidencias previas registradas (técnico y supervisor) con hora Perú y duración.
  - **Botón Primario Gigante ($\ge 54-56\text{px}$)**:
    - Pendiente: `📸 Tomar Evidencia Paso #X` con animación sutil `pulse-glow`.
    - Cumplido: `✓ Evidencia Registrada (Toca para cambiar foto)`.
  - Barra de navegación inferior: `← Anterior`, `Derivar Paso`, `Siguiente →`.
- **Pantalla de Finalización Inmediata**:
  - Al completar el último paso de la estación, la vista Hero se transforma automáticamente en la pantalla de éxito con el botón primario de despacho: `Despachar PC #XX a Estación N+1 →`.

### C. Auto-Avance al Completar Evidencia
- En `handleVerifyStepWithPhoto` y `handleSupervisorVerifyStepPhoto`:
  - Se busca automáticamente el siguiente paso pendiente de la estación (`nextPending`).
  - Se actualiza `setFocusedStepNumber(nextPending.step_number)` sin requerir intervención manual del técnico.
  - En modo Lista Completa, ejecuta scroll suave (`scrollIntoView`) hacia la tarjeta del siguiente paso.

---

## 3. Archivos Modificados
- `frontend/src/modals/CameraCaptureModal.jsx` (Fast Snap de 1-toque `handleInstantCaptureAndUpload`).
- `frontend/src/views/OperatorWorkspaceView.jsx` (Modo Enfoque 1 a 1, Hero Step, auto-avance, cabecera de checklist con selector de vista, sincronización con Thumb Zone).

---

## 4. Verificación
1. **Compilación Vite**:
   - `rtk npm --prefix frontend run build` finalizado en 4.34s sin errores ni warnings críticos.
2. **Pruebas de Flujo**:
   - Selector `checklistMode` conmuta instantáneamente entre `Paso a Paso` y `Lista`.
   - Navegación `← Anterior` y `Siguiente →` respeta límites de la lista.
   - Disparo rápido guarda y avanza al siguiente paso sin recargas ni saltos bruscos.
