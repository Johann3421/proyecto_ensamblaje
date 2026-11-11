---
title: "Ergonomía Móvil Fase 1: Touch Targets Industriales (>=48px), Fusión de Acciones, Feedback Háptico y Arquitectura Fase 2/3"
fecha: 2026-11-11
tipo: ux / mobile / arquitectura / tesler
estado: completado
tags: [mobile, ergonomia, fitts, tesler, haptics, touch_targets, thumb_zone, bento_apple]
---

# 📱 Ergonomía Móvil Fase 1: Touch Targets Industriales, Fusión de Acciones y Feedback Háptico

## 1. Contexto & Diagnóstico
El sistema QC KENYA opera principalmente en dispositivos móviles (smartphones y tablets en línea de producción) utilizados por técnicos de ensamblaje con guantes antiestáticos y supervisores QC en recorrido de planta.

El diagnóstico ergonómico identificó violaciones clave:
1. **Touch Targets Subdimensionados (Ley de Fitts)**: Botones de cámara y checks de 32px (`w-8 h-8`, `p-1.5`), difíciles de acertar con guantes en pantalla táctil.
2. **Duplicidad de Acciones (Ley de Hick)**: Botón de check y botón de cámara separados competían en cada paso del checklist, generando fricción y dudas sobre cómo validar.
3. **Falta de Feedback Háptico**: Los técnicos no tenían confirmación táctil al capturar evidencias en un entorno industrial con ruido.
4. **Fatiga de Desplazamiento (Thumb Zone)**: En checklists de más de 30 pasos, el operario debía buscar continuamente el botón del paso en curso.
5. **Matriz de 10 Columnas Inmanejable en Móvil**: `PipelineMatrixView` obligaba a un scroll horizontal excesivo en pantallas angostas.

---

## 2. Solución Técnica Implementada (Fase 1 + Arquitectura Fase 2 & 3)

### A. Feedback Háptico Industrial (`frontend/src/utils/haptics.js`)
- Módulo nativo con soporte seguro de `navigator.vibrate`:
  - `hapticTap()` (20ms): pulsaciones de botones de interfaz.
  - `hapticSuccess()` ([40, 30, 50]ms): confirmación de toma de foto, verificación de paso, despacho de estación y subsanación de fallas.
  - `hapticWarning()` (65ms): desmarcado de paso, descarte o re-toma de foto.
  - `hapticError()` ([80, 50, 90]ms): errores de cámara, fallas o rechazos.
  - `hapticSelection()` (10ms): cambio de unidad o estación en selectores.
- Integrado en `CameraCaptureModal.jsx`, `OperatorWorkspaceView.jsx` y `PipelineMatrixView.jsx`.

### B. Resiliencia de Red en Planta (`frontend/src/utils/networkRetry.js`)
- Wrapper `fetchWithRetry` con reintentos exponenciales automáticos (hasta 3 intentos) ante micro-cortes de Wi-Fi industrial o zonas con baja cobertura durante la subida de evidencias fotográficas.

### C. Touch Targets Industriales $\ge 44-48\text{px}$ y Fusión de Botones (`OperatorWorkspaceView.jsx`)
- **Paso no completado (Operario)**:
  - Botón primario industrial de altura $\ge 48\text{px}$ (`min-h-[48px] px-4 py-2.5 rounded-xl font-bold bg-blue-600 active:scale-95 text-white flex items-center gap-2 shadow-sm touch-manipulation`): **📸 Tomar Evidencia**. Al tocarlo abre directamente la cámara con un solo toque.
- **Paso completado (Operario)**:
  - Botón táctil ergonómico de $\ge 48\text{px}$ (`min-h-[48px] px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold active:scale-95 touch-manipulation`): **✓ Evidencia OK**.
- **Modo Supervisor**:
  - Botón primario $\ge 48\text{px}$: **🛡️ Emitir V°B°** (o `✓ V°B° Aprobado`).
- **Acciones secundarias (Guía visual, derivar paso)**:
  - Rediseñadas a dimensiones mínimas de $44\text{px} \times 44\text{px}$ (`w-11 h-11 min-h-[44px] min-w-[44px] active:scale-95 touch-manipulation`).
- **Selectores de Unidad y Estación**:
  - Touch targets ampliados a `min-h-[44px]` con feedback háptico `hapticSelection()` al pulsar.

### D. Preparación Fase 2: Hero Mode & Sticky Bottom Action Bar (Thumb Zone)
- **Hero Step**: Identificación del paso pendiente en curso (`activePendingStep`) con resaltado Bento Apple (`ring-2 ring-blue-500/40 border-blue-500 bg-blue-50/20 shadow-md`) y anclaje por ID (`step-card-${st.step_number}`).
- **Auto-avance ergonómico**: Al guardar la foto con éxito, auto-scroll suave hacia el siguiente paso en la lista.
- **Barra Inferior Flotante en Thumb Zone (`lg:hidden fixed bottom-0`)**:
  - Cápsula táctil en el extremo inferior de la pantalla accesible directamente con el pulgar.
  - Si hay paso pendiente: botón directo `📸 Foto #{step}`.
  - Si todos los pasos están listos: botón verde gigante `✓ Despachar →`.
  - Si hay falla activa: botón `⚠️ Subsanar`.

### E. Preparación Fase 3: Matriz Adaptativa Móvil (`PipelineMatrixView.jsx`)
- Selector de modo: `[📱 Puestos Móvil | 📊 Matriz Tabla]`.
- En dispositivos móviles (`< 768px`), activa por defecto la vista de **Tarjetas Bento por Estación**, mostrando el técnico asignado, conteo de PCs activas y badges táctiles de acceso directo por unidad sin requerir scroll horizontal.

---

## 3. Archivos Modificados / Creados
- `frontend/src/utils/haptics.js` (Nuevo - Motor de vibración háptica).
- `frontend/src/utils/networkRetry.js` (Nuevo - Resiliencia de subidas en Wi-Fi de planta).
- `frontend/src/modals/CameraCaptureModal.jsx` (Touch targets $\ge 48\text{px}$, haptics en obturador/confirmación y reintentos automáticos).
- `frontend/src/views/OperatorWorkspaceView.jsx` (Touch targets $\ge 48\text{px}$, fusión de botones en pasos, Hero Mode, Sticky Bottom Bar en Thumb Zone, haptics en acciones).
- `frontend/src/views/PipelineMatrixView.jsx` (Toggle dual Tabla / Tarjetas Bento por Estación para mobile).

---

## 4. Verificación
1. **Compilación Vite**:
   - `rtk npm --prefix frontend run build` finalizado en 4.85s sin errores de bundle ni estilos.
2. **Ergonomía Táctil**:
   - Todos los botones interactivos principales superan los 48px de altura con clase `touch-manipulation` y `active:scale-95`.
