---
fecha: 2026-11-03
tipo: investigacion / auditoria / arquitectura
estado: completado
tags: [ley-de-tesler, auditoria, produccion, prowork, checklists, rutas, ux, frontend, backend]
---

# Auditoría de Producción: Rutas, Estado de Modelos y Violaciones a la Ley de Tesler

## 1. Contexto & Diagnóstico en Producción
Investigación mediante scripts de Python (`scratch/audit_production_api.py`, `scratch/inspect_all_models.py`, `scratch/deep_tesler_audit.py`) conectados a la API y frontend en producción (`https://ensamblaje.sekaitech.com.pe`).

### Estado de Modelos en Producción:
- **PROWORK** (`/checklists?model=PROWORK`): **Solo 5 pasos registrados**.
  - Pasos 1 a 4: Tareas cosméticas/limpieza ("Retiro de películas", "Soplado de polvo", "Limpieza con microfibra", "Sellos QC") mal clasificados como `is_cleaning: False` (Ensamblaje).
  - Paso 5: "Retirar película de tapa frontal" clasificado como `is_cleaning: True`.
  - El sistema muestra advertencias agresivas ("Falta BIOS", "Falta SO", "Faltan 47 pasos") cuando el modelo puede requerir únicamente control cosmético y de empaque.
- **GENWORK, OFISZU, RAITO**: 25 pasos cada uno, pero **0 pasos de limpieza** (`Clean: 0`).
- **EZENT**: 55 pasos (11 de limpieza, 0 recomendaciones pendientes).
- **DATAONE - ARMADO**: 45 pasos (8 de limpieza).
- **ENSAMBLAJE**: 15 pasos (1 de limpieza).
- **ALL IN ONE**: 14 pasos (0 de limpieza).

---

## 2. Radiografía de Rutas y Violaciones a la Ley de Tesler

### Ruta 1: `/checklists?model=PROWORK` ([ChecklistEditorView.jsx](file:///d:/SISTEMAS%2002/Desktop/Proyectos_generales/proyecto_ensamblaje/frontend/src/views/ChecklistEditorView.jsx))
- **Densidad Extrema**: 47 botones interactivos en una sola pantalla.
- **Botones Duplicados (Fatiga de Decisión)**:
  - 5 botones de "Importar": barra superior, bloque ensamble, bloque limpieza, estado vacío y menú kebab.
  - 4 botones de "Exportar": barra superior, bloque ensamble, bloque limpieza y menú kebab.
  - 4 botones de "Plantilla Excel": barra superior, bloque ensamble, bloque limpieza y estado vacío.
  - 4 botones de "Nuevo Paso": barra superior, bloque ensamble, bloque limpieza y estado vacío.
- **Violaciones a la Ley de Tesler**:
  1. **Reparación Manual de Secuencia ("Re-secuenciar 1 a N")**: Si se elimina o importa un paso con huecos (ej. 1, 2, 4), el usuario debe notar la alerta y pulsar un botón. *El backend debe garantizar secuencia 1..N continua automáticamente en cada alta/baja*.
  2. **Clasificación Manual de Limpieza ("Auto-detectar / Clasificar")**: El usuario debe ejecutar un script/botón manual para que el sistema reconozca palabras como "limpieza", "microfibra" o "polvo". *El clasificador debe ser automático e invisible en el backend al guardar/importar*.
  3. **Presunción Forzada de 52 Pasos**: El sistema asume que todo modelo debe tener exactamente los 52 pasos de la plantilla maestra, emitiendo recomendaciones y botones invasivos para "Añadir 47 pasos estándar" aunque el cliente solo requiera 5 pasos.
  4. **Peligro Operativo**: "Borrar todos los pasos" y "Eliminar modelo" conviven en el mismo menú que herramientas cotidianas como "Re-secuenciar".

### Ruta 2: `/nueva-orden` ([CreateOrderView.jsx](file:///d:/SISTEMAS%2002/Desktop/Proyectos_generales/proyecto_ensamblaje/frontend/src/views/CreateOrderView.jsx))
- **Violación Crítica de Tesler**: El usuario es obligado a realizar partición matemática de pasos en el cliente.
- **Carga Cognitiva Forzada**:
  - Inputs de texto plano para números separados por comas (`asmb_0`, `clean_0`).
  - Inputs de rangos numéricos ("desde paso X hasta paso Y").
  - Botones "Reclamar Pasos Libres", "Limpiar Pasos", "Distribuir Ambos Bloques".
  - Bloqueo por alertas si falta un paso por asignar (`alert("Faltan X pasos...")`).
- *Solución Tesler*: El usuario solo ingresa Modelo, Total PCs, Cantidad de Estaciones y Técnicos. El backend auto-balancea y garantiza 100% de cobertura sin intervención humana.

### Ruta 3: `/pipeline` ([PipelineMatrixView.jsx](file:///d:/SISTEMAS%2002/Desktop/Proyectos_generales/proyecto_ensamblaje/frontend/src/views/PipelineMatrixView.jsx) & [EditOrderModal.jsx](file:///d:/SISTEMAS%2002/Desktop/Proyectos_generales/proyecto_ensamblaje/frontend/src/modals/EditOrderModal.jsx))
- **Hipertrofia en Edición**: `EditOrderModal.jsx` (1,026 líneas) clona la complejidad de partición de `/nueva-orden`.
- **Falta de Feedback Adaptativo**: En `UnitDetailModal.jsx`, botones como "Eliminar PC" se muestran a todos los usuarios, pero al hacer clic un operario o supervisor recibe `alert("Exclusivo para Administrador")`. *El frontend no debe mostrar acciones no autorizadas*.
- **Popups Bloqueantes**: 4 `alert()` y 2 `window.confirm()` que congelan el hilo de ejecución.

### Ruta 4: `/estacion` ([OperatorWorkspaceView.jsx](file:///d:/SISTEMAS%2002/Desktop/Proyectos_generales/proyecto_ensamblaje/frontend/src/views/OperatorWorkspaceView.jsx))
- **Monolito de 1,638 Líneas**.
- **Switch Discrecional de Calidad**: Switch "OBLIGATORIA (Activa)" vs "LIBRE / OPCIONAL" en foto de evidencia. Permite al operario apagar la regla de calidad que el modelo técnico exige.
- **Selección Manual de PC**: Grilla horizontal de 50 botones de PCs. El operario debe adivinar qué PC trabajar en vez de que el backend despache la siguiente unidad en cola FIFO.
- **Cámara Sobrediseñada**: `CameraCaptureModal.jsx` (750 líneas) con 6 `alert()` nativos.

### Ruta 5: `/tecnicos` ([TechniciansManagementView.jsx](file:///d:/SISTEMAS%2002/Desktop/Proyectos_generales/proyecto_ensamblaje/frontend/src/views/TechniciansManagementView.jsx))
- **Generación de ID en Frontend**: `id: 'OP-' + Math.floor(100 + Math.random() * 900)`. Riesgo de colisión y violación de Tesler (el backend debe asignar el ID correlativo autoincremental).
- Uso de `window.confirm()` y `alert("Error: " + err.message)`.

### Ruta 6: `/auditoria` ([AuditLogsView.jsx](file:///d:/SISTEMAS%2002/Desktop/Proyectos_generales/proyecto_ensamblaje/frontend/src/views/AuditLogsView.jsx))
- **Carga Masiva No Paginada**: `GET /orders/{order_id}/logs` descarga el 100% de registros y fotos de una sola vez, provocando colapso de memoria y lentitud en dispositivos móviles de planta.

### Ruta 7: `/login` ([LoginPage.jsx](file:///d:/SISTEMAS%2002/Desktop/Proyectos_generales/proyecto_ensamblaje/frontend/src/LoginPage.jsx))
- **Hardcodeo de Operarios**: Botones rápidos limitados estrictamente a `OP-101` .. `OP-106`. Técnicos registrados dinámicamente no aparecen en el acceso rápido.

---

## 3. Plan de Reestructuración Arquitectónica

1. **Checklists Inteligente (`ChecklistEditorView`)**:
   - Reducir los 47 botones a un menú de acciones unificado (3 acciones clave: Importar, Exportar, Nuevo Paso).
   - Eliminar "Re-secuenciar": la base de datos renumera automáticamente en cada inserción o borrado.
   - Eliminar "Auto-detectar Limpieza": el backend clasifica automáticamente las palabras clave al crear o importar pasos.
   - Ajustar el asistente de diagnóstico para que distinga entre modelos de ensamble completo (52 pasos) y modelos compactos/barebone.
2. **Creación y Edición de Órdenes Sin Partición Manual**:
   - Reemplazar inputs de texto plano (`asmb_0`, rangos) por auto-distribución automática en backend.
3. **Puesto de Trabajo Directo (`OperatorWorkspaceView`)**:
   - Eliminar switch de fotos discrecional (la ficha técnica manda).
   - Botón único de "Siguiente PC en Cola" respetando orden FIFO.
