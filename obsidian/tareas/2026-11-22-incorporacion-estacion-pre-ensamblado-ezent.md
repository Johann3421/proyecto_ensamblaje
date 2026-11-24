---
title: Módulo Dedicado de Pre-ensamblado (Banco de Pruebas) con Asignación Técnica Independiente
fecha: 2026-11-23
tipo: feat
estado: completado
tags: [checklist, pre-ensamblado, ezent, memtest, occt, drivers, tesler, estaciones, bento-apple]
---

# 🛠️ Módulo Dedicado de Pre-ensamblado (Banco de Pruebas)

## 1. Contexto y Requerimiento
El usuario solicitó que los 5 pasos técnicos previos (**MemTest**, **Instalar SO**, **OCCT**, **Drivers**, **Verificación de Temperatura**) no se mezclaran genéricamente dentro de los bloques de armado físico de los técnicos de ensamble, sino que constituyeran un **Módulo Extra Independiente** (denominado **Pre-ensamblaje**, con la misma jerarquía y aislamiento que el módulo de **Supervisor** o **Limpieza QC**).

De esta manera, en la creación de órdenes de trabajo se puede asignar a un técnico especializado para el puesto de pruebas preliminares, asegurando que todos estos pasos se cumplan y auditen antes de despachar al ensamblaje general.

---

## 2. Solución de Arquitectura & Cambios Técnicos

### A. Base de Datos & Modelos Backend (`models.py`, `schemas.py`, `main.py`)
1. **Columna `is_pre_assembly`:** Añadida a `QCChecklistItem` con valor booleano (`default=False`), sincronizada en esquemas Pydantic y migrada automáticamente en `auto_migrate_schema()`.
2. **Ordenamiento Canónico Tricategórico (Ley de Tesler):**
   `canonical_resequence_model()` ordena estrictamente:
   - **Módulo 1 (Pre-ensamblaje):** `is_cleaning=False`, `is_pre_assembly=True` $\rightarrow$ Pasos $1$ a $P$.
   - **Módulo 2 (Ensamblaje Físico):** `is_cleaning=False`, `is_pre_assembly=False` $\rightarrow$ Pasos $P+1$ a $K$.
   - **Módulo 3 (Limpieza QC & Empaque):** `is_cleaning=True` $\rightarrow$ Pasos $K+1$ a $Total$.
3. **Endpoint de Clasificación Rápida:**
   `POST /api/models/{model_name}/checklist/{step_id}/set-category?category={PRE_ASSEMBLY|ASSEMBLY|CLEANING}` para mover pasos con un solo clic y resecuenciar canónicamente.
4. **Idempotencia en Inicialización:**
   `add_pre_assembly_steps_to_ezent()` asegura que los 5 pasos técnicos de banco queden creados e identificados como pre-ensamble canónico en `EZENT (CYBERTEL)` y `EZENT`.

### B. Gestor de Checklist (`ChecklistEditorView.jsx`, `ChecklistStepModal.jsx`)
1. **Selector Tricategórico en Modal de Paso:** Opciones explícitas:
   - 🔬 **Pre-ensamblaje (Banco de Pruebas)**
   - ⚙️ **Ensamblaje General**
   - 🧼 **Limpieza QC & Empaque**
2. **Pestañas y Filtros Segmentados:** Incorporación de filtro dedicado `Pre-ensamblaje (P)` con insignia morada Bento Apple.
3. **Bloque Visual Dedicado en Vista 'Secciones':**
   - **Bloque Pre-ensamblaje:** Insignia morada, icono CPU, botón `+ Nuevo Paso de Pre-ensamblaje` y resumen de pruebas.
   - **Bloque Ensamblaje Físico:** Aislado de los 5 pasos preliminares.
   - **Bloque Limpieza QC:** Preservado al final de la línea.
4. **Resumen de Métricas:** Contador superior discriminado: Total pasos · $P$ pre-ensamblaje · $A$ ensamblaje · $L$ limpieza QC.

### C. Asignación de Estaciones en Creación de Orden (`CreateOrderView.jsx`)
1. **Módulo de Pre-ensamblaje Dedicado:**
   - Switch activable: "Incluir Estación de Pre-ensamblaje (Banco de Pruebas)".
   - Selector independiente de técnico responsable (titular y secundario opcional).
   - Aislamiento automático: los pasos de pre-ensamble (1..5) se asignan íntegramente a la Estación 1 (`station_type: "PRE_ASSEMBLY"`), impidiendo que la distribución automática de puestos de ensamble los divida o mezcle.
2. **Distribución Automática de Ensamblaje:** Los técnicos de ensamble solo reciben y dividen equitativamente los pasos de armado físico (6..47).

### D. Trazabilidad en Puesto y Pipeline (`OperatorWorkspaceView.jsx`, `PipelineMatrixView.jsx`)
1. **Puesto de Operario:**
   - Píldora de puesto con distintivo morado: `E1 PRE-ENSAMBLE (🔬 Banco de Pruebas & Pre-ensamblaje)`.
   - Selector de auditoría para supervisor identifica explícitamente `[Pre-ensamblaje]`.
2. **Matriz de Trazabilidad (Pipeline):**
   - Tarjetas Bento y encabezados de tabla muestran etiqueta morada `Pre-ensamblaje` para puestos tipo `PRE_ASSEMBLY`.

---

## 3. Archivos Modificados
- `backend/app/models.py`
- `backend/app/schemas.py`
- `backend/app/main.py`
- `frontend/src/utils/steps.js`
- `frontend/src/modals/ChecklistStepModal.jsx`
- `frontend/src/views/CreateOrderView.jsx`
- `frontend/src/views/ChecklistEditorView.jsx`
- `frontend/src/views/OperatorWorkspaceView.jsx`
- `frontend/src/views/PipelineMatrixView.jsx`

---

## 4. Verificación y Resultados
- **Backend:** Compilación exitosa `python -m py_compile backend/app/main.py` con 0 errores.
- **Frontend:** Build de producción exitoso con `vite build` en 4.2s con 0 errores de sintaxis ni empaquetado.
- **Secuencia:** `EZENT (CYBERTEL)` verificado: 5 pasos de Pre-ensamblaje (#1-#5), 42 de Ensamblaje (#6-#47), 13 de Limpieza QC (#48-#60). Total = 60 pasos continuos y sin huecos.
