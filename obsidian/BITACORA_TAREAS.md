---
title: Bitácora de Tareas y Cambios Técnicos
aliases: [Bitacora, Changelog, LogTareas]
tags: [bitacora, tareas, changelog]
ultima_actualizacion: 2026-09-17
---

# 📜 Bitácora de Tareas & Memoria del Proyecto

Este documento es la **fuente de verdad permanente** del proyecto. Cada tarea completada se añade aquí para resistir compactaciones de historial del agente de IA y permitir auditoría rápida.

---

## 📅 Registro Histórico de Tareas

| Fecha | Tarea / Requerimiento | Tipo | Estado | Nota Técnica |
| :--- | :--- | :---: | :---: | :--- |
| **2026-09-17** | Color neutro para pasos pendientes de supervisor y verde solo al validar | `feat` | ✅ Completado | [[2026-09-17-diferenciacion-visual-pasos-supervisor]] |
| **2026-09-17** | Integración de Bóveda Obsidian para memoria automática ante compactación | `feat` | ✅ Completado | [[2026-09-17-integracion-obsidian-memoria]] |
| **2026-09-17** | Puesto independiente de Supervisión (Estación 0) sin saltos a E1 ni filtros por estación física | `fix` | ✅ Completado | [[2026-09-17-estacion-supervision-independiente]] |
| **2026-09-17** | Flash / Linterna (`torch`) y Zoom digital/óptico en visor de cámara | `feat` | ✅ Completado | [[2026-09-17-flash-y-zoom-camara]] |
| **2026-09-16** | Bloqueo estricto de cambio de estación sin foto obligatoria y edición administrativa con histórico | `fix` | ✅ Completado | [[2026-09-16-bloqueo-estacion-sin-foto]] |
| **2026-09-10** | Visor forense de fotos por PC con etiqueta de paso y corrección de z-index | `fix` | ✅ Completado | [[2026-09-10-visor-fotos-por-pc]] |

---

## 🔍 Resumen Rápido para el Agente (Contexto tras Compactación)

- **Estación 0**: Puesto virtual exclusivo del supervisor. Desacoplado de las estaciones 1 a 5 de la línea física. Contiene todos los pasos del modelo (o los asignados en `order.supervisor_steps`) y acceso a todas las PCs.
- **Cámara & Evidencias**: Visor WebRTC con linterna (`torch`), zoom slider y botón de fallback a cámara nativa (`capture="environment"`).
- **Control de Avance**: Ninguna PC puede pasar de estación sin foto de verificación en el último paso obligatorio de la estación.
- **Auditoría Administrativa**: El Admin puede habilitar o reiniciar estaciones y desmarcar pasos dejando rastro en logs de auditoría.
