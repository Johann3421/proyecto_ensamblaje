---
title: "Fix: Mapeo de Fotos de Evidencia a sus Pasos Exactos y Fecha + Hora Perú (Leyes de Interacción)"
fecha: 2026-11-13
tipo: fix / ux / tesler / arquitectura
estado: completado
tags: [fix, fotos, evidencias, trazabilidad, fecha-hora, hora-peru, tesler, fitts, hick, jakob, miller, bento-apple]
---

# 📸 Fix: Mapeo de Fotos de Evidencia a sus Pasos Exactos y Fecha + Hora Perú

## 1. Contexto & Objetivo
El usuario reportó dos deficiencias críticas en la visualización de evidencias fotográficas:
1. **Fotos desordenadas o cruzadas:** Al visualizar las fotos de evidencias, aparecían imágenes correspondientes a pasos distintos de los mostrados o en orden invertido.
2. **Fecha faltante:** Se mostraba la hora correctamente, pero no la fecha en la que fue subida la evidencia fotográfica.
3. **Requisito estricto de cumplimiento de leyes de diseño y ergonomía:**
   - **Ley de Tesler:** Toda la complejidad de cálculo, ordenamiento y zona horaria (UTC-5 Lima) recae en el backend y utilidades automatizadas; cero esfuerzo mental para el usuario.
   - **Ley de Fitts & Thumb Zone:** Touch targets $\ge 48\text{px}$ en modales y barras de acción rápida, en ubicaciones de fácil alcance táctil.
   - **Ley de Hick:** Mínima carga de decisión: jerarquía estricta 1-1-··· con un botón primario destacado (`Cerrar` o `Capturar`) y acciones secundarias limpias.
   - **Ley de Jakob:** Notación familiar estándar para fechas y horas (`DD/MM/YYYY`, `hh:mm:ss a. m./p. m.`) habitual en sistemas operativos móviles.
   - **Ley de Miller:** Chunking de metadatos en bloques digeribles ($7 \pm 2$ chunks) organizados en badges Bento independientes (Paso/Operación, Autor, Fecha, Hora, Duración).

---

## 2. Causas Raíz Identificadas
1. **Orden cronológico inverso en listados de fotos:**
   - En `backend/app/main.py`, `/orders/{order_id}/logs` devuelve registros ordenados por `timestamp.desc()`.
   - En `UnitDetailModal.jsx` y `AuditLogsView.jsx`, `unitPhotos` filtraba directamente estos logs sin deduplicar ni ordenar por número de paso. Como consecuencia, las fotos aparecían en orden inverso (ej. Paso 52 en el primer casillero y Paso 1 al final), provocando confusión visual en el usuario.
2. **Desvío de targetStep en Modo Enfoque (Focus Mode):**
   - En la barra de acción rápida inferior para móviles de `OperatorWorkspaceView.jsx`, cuando el usuario estaba en un paso ya marcado y pulsaba "Subir Foto", el componente recurría a `stepsMissingPhotos[0]` (ej. Paso 11 o Paso 50) en lugar de mantener el paso enfocado actual (`focusedStep`). El usuario tomaba la foto creyendo que correspondía al paso que estaba viendo, pero se guardaba en otro paso.
3. **Persistencia de estado de PC previa al alternar unidades:**
   - Al seleccionar otra unidad en el selector rápido o la cola de estación, los estados `operatorStepLogsMap` y `supervisorStepLogsMap` conservaban las fotos de la PC previa mientras cargaba la respuesta de red.
4. **Falta de fecha en backend y frontend:**
   - `format_peru_time()` en backend solo formateaba horas (`%I:%M:%S a. m.`), y `timeFormat.js` en frontend carecía de exportación para fecha o fecha+hora.
5. **Cadena falsa `'Sin foto'`:**
   - Ciertos registros antiguos en base de datos almacenaban `'Sin foto'` como texto literal, lo cual era evaluado como verdad (`truthy`) en JavaScript y renderizaba un recuadro de imagen inválido.

---

## 3. Solución Técnica Implementada

### A. Backend (`backend/app/main.py`)
1. **Funciones de Fecha y Hora Perú (America/Lima UTC-5):**
   - `format_peru_date(dt)`: Convierte a formato `DD/MM/YYYY`.
   - `format_peru_datetime(dt)`: Convierte a formato `DD/MM/YYYY, hh:mm:ss a. m./p. m.`.
   - `sanitize_photo_url(url)`: Sanea cadenas falsas (`'Sin foto'`, `'null'`, `'none'`, `''`) a `None`.
2. **Auto-healing de base de datos:**
   - Inclusión de query correctiva para sanear campos `photo_url = NULL` donde contenían falsos placeholders.
3. **Propagación completa de metadatos:**
   - En `compute_log_dict()`, `/orders/{order_id}/logs`, `/operator/submit-step` y `/supervisor/verify-step-photo`: se añaden `"peru_date"` y `"peru_datetime"`, junto a URLs saneadas.
   - Búsqueda canónica de operaciones en checklist: `func.upper(func.trim(QCChecklistItem.model_name)) == clean_model`.
   - Protección en deduplicación: si un paso ya tiene foto registrada, un log posterior sin foto no borra la miniatura fotográfica existente.

### B. Frontend Utilidades (`frontend/src/utils/timeFormat.js`)
- Exportación de `formatPeruDate(isoString)` y `formatPeruDateTime(isoString, includeSeconds)`.
- Cumplimiento de la Ley de Jakob utilizando `Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima' })`.

### C. Visor de Evidencia (`frontend/src/modals/PhotoPreviewModal.jsx`)
- **Ley de Miller (Chunking visual):**
  - Segmentación en 4 badges Bento: **Por:** (técnico/supervisor), **Fecha:** (`Calendar`), **Hora PE:** (`Clock`), y **Tomó:** (`Timer`).
- **Ley de Fitts:** Touch targets táctiles de $\ge 48\text{px}$ (`min-h-[48px]`, `px-5 py-2.5`) para `Cerrar`, `Descargar` y `Corregir / Devolver PC`.
- **Ley de Hick:** Jerarquía limpia 1-1-··· con botón `Cerrar` azul primario destacado.

### D. Detalle de PC (`frontend/src/modals/UnitDetailModal.jsx`)
- `useMemo` para deduplicación canónica por `(step_number, is_supervisor_verified)` manteniendo la versión más reciente.
- Ordenamiento correlativo ascendente: Paso 1, Paso 2, Paso 3...
- Visualización de fecha y hora (`peru_date` + `peru_time`) en el pie de cada miniatura.

### E. Auditoría y Registro Forense (`frontend/src/views/AuditLogsView.jsx`)
- Deduplicación y ordenamiento ascendente por paso en `photosByUnit`.
- Inclusión de fecha y hora en miniaturas y visor.

### F. Puesto de Operario (`frontend/src/views/OperatorWorkspaceView.jsx`)
- Fijación de `targetStep = focusedStep` en Modo Enfoque para que la captura rápida pertenezca invariablemente al paso que el operario está viendo en pantalla.
- Limpieza de mapas de logs al alternar unidades (`handleSwitchUnit`).
- Paso de metadatos completos (`operation`, `step_number`, `unit_number`, `order_id`, `peru_date`, `peru_datetime`) al invocar `onPreviewPhoto`.

---

## 4. Archivos Modificados
- `backend/app/main.py`
- `frontend/src/utils/timeFormat.js`
- `frontend/src/modals/PhotoPreviewModal.jsx`
- `frontend/src/modals/UnitDetailModal.jsx`
- `frontend/src/views/AuditLogsView.jsx`
- `frontend/src/views/OperatorWorkspaceView.jsx`
- `frontend/src/views/PipelineMatrixView.jsx`

---

## 5. Verificación
1. **Compilación Vite:** `rtk npm --prefix frontend run build` exitoso en 5.11s con 0 errores.
2. **Backend Python Test:** `/orders/ORD-2026-0892/logs` devuelve `peru_date`, `peru_time` y `peru_datetime` perfectamente formateados en UTC-5 Lima, con saneamiento de `'Sin foto'`.
3. **Verificación de Leyes:**
   - Tesler: Backend provee fecha y hora listas para render.
   - Fitts: Botones táctiles $\ge 48\text{px}$.
   - Hick: Jerarquía de botón primario y secundario.
   - Jakob: Formatos de fecha y hora estándar peruanos.
   - Miller: Chunks independientes de información en badges modulares.
