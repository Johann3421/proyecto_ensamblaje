---
fecha: 2026-11-05
tipo: fix / arquitectura / tesler
estado: completado
tags: [checklist, resecuenciacion, tesler, bento-apple, backend, frontend]
---

# 🛠️ Fix: Resecuenciación Canónica de Pasos de Checklist y Protección contra Desorden

## 📋 Contexto y Descripción
El usuario reportó que al crear o editar pasos en el editor de checklists, los pasos existentes se desordenaban y saltaban correlativos en varios modelos.

## 🔍 Causa Raíz
1. **Sobrescritura heurística en backend (`save_checklist_item`)**:
   - `infer_step_is_cleaning()` contenía palabras clave generales como `"limpieza"` o `"película"`.
   - Si un paso de ensamblaje intermedio mencionaba *"Limpieza interna de la tapa (Ensamblaje)"* o *"Retirar película de tapa frontal"*, el backend forzaba `clean_val = True` incluso si el usuario lo creaba explícitamente en Ensamblaje.
2. **Auto-healing cíclico corruptor**:
   - `auto_heal_cleaning_flags()` en el ciclo de inicio del servidor (`startup_db_init`) volvía a aplicar la heurística sobre toda la base de datos en cada reinicio, re-clasificando pasos de ensamblaje físico (ej. paso 17 en EZENT 2.0 y paso 14 en GENWORK/OFISZU/RAITO) como pasos de limpieza final.
3. **Incompatibilidad con la vista agrupada del frontend**:
   - En `ChecklistEditorView.jsx`, la vista por defecto es agrupada: Ensamblaje arriba y Limpieza abajo. Al marcarse erróneamente un paso intermedio como limpieza, este era arrojado a la sección de Limpieza y todos los pasos posteriores de armado (BIOS, OS, etc.) quedaban desordenados.
4. **Cálculo de `step_number` al crear nuevo paso**:
   - El botón general asignaba `step_number: steps.length + 1` sin importar si el usuario estaba trabajando en Ensamblaje o Limpieza.

## 💡 Solución Técnica Implementada

### 1. Resecuenciación Canónica Garantizada en Backend (`backend/app/main.py`)
- Se implementó la función canónica `canonical_resequence_model(db, model_name)`:
  - Partición estricta: Pasos de Ensamblaje (`is_cleaning=False`) primero, numerados correlativamente de `1` a `K`.
  - Pasos de Limpieza (`is_cleaning=True`) al final, numerados de `K+1` a `Total`.
  - Ordenación interna determinista por `(is_cleaning.asc(), step_number.asc(), id.asc())`.
  - Cero huecos, cero duplicados y cero saltos correlativos.
- Se reemplazó el auto-healing heurístico por `auto_heal_checklist_sequence(db)`:
  - Sanea flags erróneos donde la operación incluye `(ensamblaje)` o `"retirar película de tapa frontal"`, así como modelos con flujo lineal completo (`ALL IN ONE`, `ENSAMBLAJE`).
  - Resecuencia canónicamente todos los modelos registrados en el startup.
- Se blindaron los endpoints:
  - `POST /api/models/{model_name}/checklist`: Respeta la elección explícita del usuario (`is_cleaning`) y ejecuta inmediatamente `canonical_resequence_model`.
  - `DELETE /api/models/{model_name}/checklist/{step_id}`: Ejecuta `canonical_resequence_model` para renumerar de 1 a N.
  - `POST /api/models/{model_name}/checklist/{step_id}/toggle-cleaning`: Invierte flag y reubica el paso canónicamente dentro de su sección sin romper la numeración.
  - `POST /api/models/{model_name}/resequence`: Aplica la regla canónica a demanda.

### 2. Frontend de Checklist (`frontend/src/views/ChecklistEditorView.jsx`)
- En el modal de creación rápida de paso:
  - Si el usuario crea un paso en Ensamblaje, se asigna `step_number: assemblySteps.length + 1` e `is_cleaning: false`.
  - Si se crea en Limpieza, se asigna `step_number: steps.length + 1` e `is_cleaning: true`.
- Se agregó botón contextual específico `+ Nuevo Paso de Ensamblaje` en el encabezado de la sección de Ensamblaje.

## 🧪 Verificación y Resultados
- Compilación Vite de frontend exitosa: `dist/assets/index-QmbRRq6l.js` (4.43s).
- Simulación canónica sobre los 9 modelos productivos (`test_canonical_resequence.py`):
  - **PROWORK**: 2 Ensamblaje (1..2), 3 Limpieza (3..5) -> Partición perfecta.
  - **GENWORK**: 25 Ensamblaje (1..25), 0 Limpieza -> Partición perfecta.
  - **OFISZU**: 25 Ensamblaje (1..25), 0 Limpieza -> Partición perfecta.
  - **RAITO**: 25 Ensamblaje (1..25), 0 Limpieza -> Partición perfecta.
  - **EZENT**: 45 Ensamblaje (1..45), 10 Limpieza (46..55) -> Partición perfecta.
  - **DATAONE - ARMADO**: 37 Ensamblaje (1..37), 8 Limpieza (38..45) -> Partición perfecta.
  - **ENSAMBLAJE**: 15 Ensamblaje (1..15), 0 Limpieza -> Partición perfecta.
  - **ALL IN ONE**: 14 Ensamblaje (1..14), 0 Limpieza -> Partición perfecta.
  - **EZENT 2.0**: 46 Ensamblaje (1..46), 9 Limpieza (47..55) -> Partición perfecta. Paso 17 preservado en su posición natural de ensamble.

## 📁 Archivos Modificados
- `backend/app/main.py`: `canonical_resequence_model`, `auto_heal_checklist_sequence`, blindaje de `save_checklist_item`, `delete_checklist_item`, `toggle_step_cleaning`.
- `frontend/src/views/ChecklistEditorView.jsx`: Asignación inteligente de correlativo inicial y flag de limpieza según sección activa.
