---
fecha: 2026-10-23
tipo: auditoria / arquitectura
estado: completado
tags: [frontend, ley-de-tesler, auditoria, arquitectura, ux, refactor]
---

# Auditoría Integral del Frontend: Ley de Tesler, Estructura y Ergonomía

## 1. Descripción
Investigación profunda de todos los apartados, vistas y modales del frontend (`frontend/src/`) de QC KENYA (`proyecto_ensamblaje`). Evaluación de la adherencia a la **Ley de Tesler** (complejidad absorbida por el backend vs sobrecarga cognitiva trasladada al usuario), análisis de la arquitectura de componentes, detección de patrones visuales artificiales (IA-cliché) y auditoría de los flujos de interacción para operarios, supervisores y administradores.

---

## 2. Inventario y Complejidad por Módulo

| Módulo / Vista | Líneas | Estados | Efectos / Memos | Alerts / Confirms | Error Leaks | Diagnóstico Estructural |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **OperatorWorkspaceView.jsx** | 1,638 | 16 | 2 eff / 6 mem | 5 alerts / 0 conf | 5 | Monolito de 16 estados. Mezcla lógica de cámara, auditoría supervisor y despacho. Viola Tesler con switch de fotos discrecional. |
| **CreateOrderView.jsx** | 1,297 | 19 | 3 eff / 4 mem | 5 alerts / 0 conf | 2 | **Violación Crítica de Tesler**: El usuario calcula aritmética de particiones, rangos y cobertura de pasos en vez del backend. |
| **ChecklistEditorView.jsx** | 1,198 | 14 | 5 eff / 0 mem | 0 alerts / 2 conf | 7 | Monolito denso. Asistente de pasos faltantes calcula advertencias en cliente cuando backend tiene endpoint de diagnóstico. |
| **EditOrderModal.jsx** | 1,019 | 13 | 2 eff / 3 mem | 4 alerts / 0 conf | 1 | Duplicación masiva (>80%) del código de `CreateOrderView.jsx`. Idéntica aritmética de partición manual de pasos. |
| **CameraCaptureModal.jsx** | 751 | 19 | 5 eff / 0 mem | 6 alerts / 0 conf | 5 | 750 líneas en un modal. Excelente soporte de hardware pero 6 `alert()` nativos bloquean la pantalla completa. |
| **UnitDetailModal.jsx** | 363 | 5 | 1 eff / 0 mem | 4 alerts / 2 conf | 3 | Mezcla visualización de PC con acciones de borrado/reinicio usando `window.confirm` y `alert` intrusivos. |
| **LoginPage.jsx** | 357 | 10 | 1 eff / 0 mem | 0 alerts / 0 conf | 1 | Estructura correcta. Formularios claros, feedback inline, sin bloqueos del hilo. |
| **PipelineMatrixView.jsx** | 310 | 0 | 0 eff / 0 mem | 0 alerts / 0 conf | 0 | **Estructura Modelo**: Componente presentacional puro, delega acciones a modales y callbacks limpios. |
| **AuditLogsView.jsx** | 311 | 5 | 2 eff / 3 mem | 0 alerts / 0 conf | 0 | Muy bien estructurado. Filtros ergonómicos, organización de fotos por PC y técnico, 0 alerts. |
| **SupervisorAuditModal.jsx** | 285 | 6 | 1 eff / 0 mem | 1 alert / 0 conf | 1 | Modal oficial de V°B° de supervisión. Flujo de 5 pasos adecuado. |
| **ImportChecklistModal.jsx** | 279 | 5 | 0 eff / 0 mem | 0 alerts / 0 conf | 1 | Carga de Excel / JSON. Feedback inline limpio. |
| **StepPickerModal.jsx** | 257 | 3 | 0 eff / 0 mem | 0 alerts / 0 conf | 0 | Selector de pasos para estaciones. Duplica estructura de `SupervisorStepPickerModal`. |
| **SupervisorStepPickerModal.jsx** | 246 | 3 | 0 eff / 0 mem | 0 alerts / 0 conf | 0 | Redundancia casi idéntica con `StepPickerModal`. |
| **CreateModelModal.jsx** | 242 | 6 | 0 eff / 0 mem | 0 alerts / 0 conf | 1 | Formulario de nuevo modelo con plantillas base. |
| **IssueReportModal.jsx** | 242 | 7 | 0 eff / 0 mem | 3 alerts / 0 conf | 2 | Registro de incidencias. Usa `alert` para foto obligatoria y fallos de subida. |
| **AdminPhotoCorrectionModal.jsx**| 225 | 6 | 0 eff / 0 mem | 4 alerts / 0 conf | 2 | Usa `alert` para validación de texto requerido y foto en lugar de validación HTML/UI. |
| **TechniciansManagementView.jsx**| 202 | 4 | 0 eff / 1 mem | 2 alerts / 1 conf | 2 | Recibe prop `notify`, pero en catch blocks recurre a `alert("Error: " + err.message)`. |
| **ReassignStepModal.jsx** | 152 | 4 | 0 eff / 0 mem | 1 alert / 0 conf | 1 | Modal simple de derivación de paso. |
| **PhotoPreviewModal.jsx** | 123 | 1 | 0 eff / 0 mem | 0 alerts / 0 conf | 0 | Visor de foto/video de paso con llamada a corrección administrativa. |
| **TransferUnitModal.jsx** | 114 | 3 | 0 eff / 0 mem | 1 alert / 0 conf | 1 | Derivación de estación completa. |
| **EmergencyReassignModal.jsx** | 104 | 4 | 0 eff / 0 mem | 1 alert / 0 conf | 1 | Reasignación de emergencia en vivo. |
| **TechnicianFormModal.jsx** | 99 | 1 | 0 eff / 0 mem | 0 alerts / 0 conf | 0 | Formulario simple de técnico. |
| **AddUnitsModal.jsx** | 99 | 2 | 0 eff / 0 mem | 1 alert / 0 conf | 1 | Incremento de unidades de orden. |
| **DeleteOrderModal.jsx** | 71 | 1 | 0 eff / 0 mem | 1 alert / 0 conf | 1 | Confirmación de borrado con alerta de error. |
| **ResetOrderModal.jsx** | 70 | 1 | 0 eff / 0 mem | 1 alert / 0 conf | 1 | Reinicio de lote a Estación 1. |
| **MediaViewerModal.jsx** | 52 | 0 | 0 eff / 0 mem | 0 alerts / 0 conf | 0 | Visor estático de diagramas y PDFs de ingeniería. |

---

## 3. Anomalías y Violaciones Críticas de la Ley de Tesler

### A. Sobrecarga Aritmética en Creación y Edición de Órdenes (`CreateOrderView` & `EditOrderModal`)
- **Problema**: El administrador no debería ser una calculadora humana de conjuntos. En `CreateOrderView.jsx`, el usuario debe lidiar con 24 handlers de manipulación de arrays: inputs de texto con números separados por comas (`asmb_0`, `clean_0`), selectores de rangos manuales ("1 al 12"), botones de "Reclamar Pasos Libres", "Limpiar Pasos", y resolución de warnings modales de cobertura:
  - `alert("⚠️ Faltan X pasos de ensamblaje por asignar")`
  - `alert("⚠️ Regla de Calidad Obligatoria: El modelo contiene pasos de limpieza...")`
- **Violación de Tesler**: La asignación y balanceo de estaciones es una regla matemática de negocio pura. Pertenece 100% al backend (`distributeStepsSeparatingCleaning`).
- **Solución Tesler**: El usuario solo debe ingresar:
  1. Modelo de PC (ej. Core i5 Advance)
  2. Cantidad de PCs a ensamblar (ej. 50)
  3. Cantidad de estaciones deseadas (ej. 4 de ensamble + 1 de limpieza)
  4. Técnicos asignados
  El backend autocalcula el balanceo de pasos, garantiza 100% de cobertura y separa ensamblaje de limpieza sin fricción manual.

### B. "Switch de Foto Obligatoria vs Libre/Opcional" en el Puesto de Trabajo (`OperatorWorkspaceView.jsx:753-770`)
- **Problema**: El componente le entrega al operario un switch interactivo: `requirePhotoVerification` ("OBLIGATORIA (Activa)" vs "LIBRE / OPCIONAL"). Al pulsar "LIBRE / OPCIONAL", el operario puede desmarcar la exigencia de foto en pasos intermedios.
- **Violación de Tesler y Calidad**: La exigencia de evidencia fotográfica es una política de ingeniería y aseguramiento de calidad definida en la ficha técnica del modelo (`step.requires_photo`). Jamás debe trasladarse al operario de planta la decisión de si una foto de calidad es opcional o no.

### C. Proliferación de Diálogos Nativos del Navegador (`alert()` y `confirm()`)
- **Problema**: Se detectaron **46 llamadas a `alert()`** y **5 llamadas a `confirm()`** repartidas en 12 archivos.
- **Impacto UX**:
  1. En tablets y smartphones industriales congelan el renderizado del DOM y bloquean el hilo principal de JavaScript.
  2. Si ocurre un fallo de red o validación mientras el técnico usa guantes, el popup nativo del navegador es diminuto e incómodo de cerrar.
  3. Desalineación con el sistema de toasts (`notify`) ya existente en `App.jsx`.

### D. Fugas de Errores Técnicos al Usuario Final (25 ocurrencias)
- **Problema**: Múltiples bloques `catch (err)` muestran: `alert("Error: " + err.message)` o `notify("Error: " + err.message)`.
- **Violación**: Los mensajes exponen nombres de columnas de base de datos, excepciones de Python o sintaxis de red ("Failed to fetch", "500 Internal Server Error").
- **Solución**: Traducir a mensajes de acción humana ("No se pudo conectar con la cámara", "El servidor no respondió, reintenta en unos segundos").

---

## 4. Auditoría de Arquitectura y Estructura de Componentes

1. **Hipertrofia de Componentes Monolíticos**:
   - 5 archivos superan las 1,000 líneas (`OperatorWorkspaceView` con 1,638 líneas; `CreateOrderView` con 1,297; `ChecklistEditorView` con 1,198; `EditOrderModal` con 1,019; `CameraCaptureModal` con 751).
   - Acoplan lógica de red, validaciones de hardware, efectos de audio/confetti y maquetado denso.
2. **Duplicación de Código (DRY Violations)**:
   - `CreateOrderView.jsx` y `EditOrderModal.jsx`: Comparten más del 80% de componentes idénticos (lista de estaciones, selectores de técnico titular/secundario, renderizado de badges de pasos).
   - `StepPickerModal.jsx` y `SupervisorStepPickerModal.jsx`: Son componentes clonados que solo varían en el título y en un par de botones de acción rápida.
3. **Plomería Incompleta del Sistema de Notificaciones**:
   - `App.jsx` implementa `notify(message, type)` con toasts flotantes estilizados con Tailwind, pero modales como `EmergencyReassignModal`, `AddUnitsModal`, `DeleteOrderModal`, `ResetOrderModal` y `IssueReportModal` no reciben `notify` como prop, forzándolos a usar `alert()`.

---

## 5. Auditoría Estética y Visual (Anti-Cliché de IA)

1. **Gradientes Fuera de Lugar**:
   - En `OperatorWorkspaceView.jsx:541`: `bg-gradient-to-r from-blue-50/90 to-indigo-50/90` (gradiente índigo típico de plantillas de IA).
   - En `OperatorWorkspaceView.jsx:775`: `bg-gradient-to-r from-emerald-50 to-teal-50`.
   - **Corrección**: Reemplazar por paletas planas sobrias de alta legibilidad (`bg-stone-50`, `bg-emerald-50/80`, `border-stone-200`).
2. **Uso Excesivo de Emojis como Iconos Principales**:
   - Se contabilizaron más de 80 emojis en el JSX (`⚠️`, `📸`, `✓`, `🛡️`, `↩`, `🎉`, `⚡`).
   - Rompen la coherencia tipográfica de una planta de ensamble profesional. Deben ser reemplazados consistentemente por iconos vectoriales de `lucide-react` (`Camera`, `CheckCircle`, `AlertTriangle`, `RotateCcw`, `ShieldCheck`).

---

## 6. Plan de Acción y Próximos Pasos Priorizados

1. **Fase 1 (Surgical Bugfix & Quick Wins)**:
   - Conectar la prop `notify` a todos los modales de `App.jsx`.
   - Reemplazar los 46 `alert()` y `confirm()` por toasts y estados de confirmación inline.
   - Eliminar el switch manual de fotos en `OperatorWorkspaceView.jsx` respetando la política estricta de calidad.
   - Limpiar los gradientes índigo/azul y emojis residuales en favor de iconos Lucide.
2. **Fase 2 (Refactor Estructural de Órdenes)**:
   - Extraer el componente de configuración de estaciones compartido entre `CreateOrderView` y `EditOrderModal`.
   - Delegar la matemática de balanceo de estaciones al backend (`/orders/auto-balance-preview`).
3. **Fase 3 (Unificación de Modales de Pasos)**:
   - Unificar `StepPickerModal` y `SupervisorStepPickerModal` en un único componente polimórfico reutilizable.
