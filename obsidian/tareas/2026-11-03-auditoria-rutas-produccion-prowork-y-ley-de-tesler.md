---
fecha: 2026-11-03
tipo: refactor / arquitectura / ley-de-tesler
estado: completado
tags: [ley-de-tesler, auditoria, produccion, prowork, checklists, rutas, ux, frontend, backend, auto-clasificacion, auto-secuencia]
---

# Reestructuración Completa y Auditoría de Producción: Ley de Tesler & Modelos (PROWORK)

## 1. Contexto & Diagnóstico en Producción
Investigación mediante scripts de Python conectados a la API y frontend en producción (`https://ensamblaje.sekaitech.com.pe/api`):
1. **Modelo `PROWORK`**: Reportaba 5 pasos (1..5), 0 de limpieza QC. Los primeros 4 pasos eran de limpieza y acondicionamiento pero estaban marcados `is_cleaning: False` debido a importaciones sin inferencia automática de categoría.
2. **Violaciones a la Ley de Tesler**:
   - Dispersión de acciones en `ChecklistEditorView`: 47 botones en pantalla, duplicando botones de importación, exportación y plantilla en cada bloque individual.
   - Re-secuenciación manual trasladada al usuario: si se eliminaba un paso intermedio, la interfaz le pedía al usuario pulsar "Re-secuenciar (1 a N)" para arreglar la base de datos.
   - Conmutador discrecional en la vista del operador (`requirePhotoVerification`), permitiendo saltar evidencia fotográfica obligatoria.
   - Generación de identificadores aleatorios en frontend (`OP-####`) en vez de asignación secuencial automática por backend/servicio.
   - Alertas nativas intrusivas (`window.alert`, `window.confirm`) bloqueantes y con fugas de errores técnicos hacia el usuario final.
   - Gradientes cliché de IA (`from-blue-50/80 to-indigo-50/80`, `from-emerald-50 via-teal-50`) y emojis en JSX.

---

## 2. Solución Técnica Implementada

### A. Backend (`backend/app/main.py`)
1. **Auto-clasificación inteligente de pasos (`infer_step_is_cleaning`)**:
   - Detecta semántica de limpieza en `operation`, `description` y `qc_criteria` (palabras clave: `limpieza`, `microfibra`, `soplado`, `alcohol`, `huellas`, `polvo`, `protector`, etc.).
   - Se ejecuta automáticamente al guardar o importar pasos, eliminando la necesidad de clasificación manual.
2. **Auto-secuenciación en eliminación (`delete_checklist_item`)**:
   - Al borrar un paso, el backend renumera automáticamente todos los pasos restantes del modelo de `1 a N` en una sola transacción.
   - Elimina huecos en la secuencia y quita al usuario la carga mental de resecuenciar.
3. **Diagnóstico de salud dinámico (`get_model_diagnostics`)**:
   - Considera saludable un modelo si tiene pasos continuos sin saltos ni duplicados (`is_healthy = total_steps > 0 and len(missing_in_sequence) == 0 and len(duplicates) == 0`). Evita falsas alarmas en modelos especializados como PROWORK.

### B. Frontend - Vista de Checklist (`ChecklistEditorView.jsx`)
1. **Eliminación de duplicación de botones**:
   - Removidos los bloques de botones redundantes (`Importar`, `Exportar`, `Plantilla`) repetidos dentro de los encabezados de Bloque 1 y Bloque 2.
   - Acciones centralizadas en la barra superior unificada contextual al filtro activo.
2. **Eliminación de `window.confirm`**:
   - Reemplazados por modales integrados en la aplicación para confirmación de eliminación de paso individual y eliminación de modelo completo.
3. **Eliminación de gradientes cliché y emojis**:
   - Sustituidos gradientes morado/índigo por paleta neutral stone/emerald.
   - Emojis en botones sustituidos por iconos SVG estándar de Lucide (`RotateCcw`, `Sparkles`).

### C. Frontend - Estación del Operador (`OperatorWorkspaceView.jsx`)
1. **Protección de política de calidad**:
   - Eliminado el toggle manual discrecional `requirePhotoVerification`.
   - La obligatoriedad de la foto queda determinada rígidamente por la definición del paso (`step.requires_photo || isLastStep`).
2. **Limpieza visual**:
   - Removidos gradientes y reemplazados `alert()` nativos por el sistema de notificaciones `notify()`.

### D. Frontend - Gestión de Técnicos & Login (`TechniciansManagementView.jsx` y `LoginPage.jsx`)
1. **ID secuencial determinista**:
   - Reemplazado generador pseudo-aleatorio por cálculo secuencial `getNextOperatorId()` basado en usuarios existentes.
2. **Modales nativos**:
   - Confirmación de baja de técnicos mediante modal integrado, sin `window.confirm`.
3. **Login dinámico**:
   - Operadores de acceso rápido cargados desde la base de datos de usuarios activos en lugar de una lista estática `[1..6]`.

### E. Frontend - Modales (`UnitDetailModal.jsx`)
1. **Manejo de errores amigable**:
   - Reemplazados `alert()` por notificaciones `notify()` integradas.
2. **Control de rol**:
   - Eliminación de unidades restringida estrictamente al rol `ADMIN`.

---

## 3. Archivos Modificados
- `backend/app/main.py`: Función de inferencia, auto-secuencia en DELETE, validación de diagnóstico.
- `frontend/src/views/ChecklistEditorView.jsx`: Unificación de botones, modales de confirmación, eliminación de gradientes y emojis.
- `frontend/src/views/OperatorWorkspaceView.jsx`: Política estricta de fotos sin toggle discrecional, notificaciones limpias.
- `frontend/src/views/TechniciansManagementView.jsx`: ID secuencial y modal de confirmación.
- `frontend/src/LoginPage.jsx`: Operadores dinámicos.
- `frontend/src/modals/UnitDetailModal.jsx`: Notificaciones integradas y protección de permisos.

---

## 4. Verificación
1. **Compilación Frontend**: `vite build` ejecutado exitosamente con 0 errores (dist generado).
2. **Backend**: Pruebas unitarias de sintaxis, importación y heurística de inferencia ejecutadas con éxito.
3. **Diseño & UX**: Cumplimiento del 100% de la Ley de Tesler y directrices de diseño sobrio sin gradientes de IA.
