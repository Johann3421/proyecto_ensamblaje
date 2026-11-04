---
fecha: 2026-11-04
tipo: fix / runtime
estado: completado
tags: [lucide-react, import-fix, checklist-modal, create-model-modal]
---

# 🐛 Corrección de ReferenceError: ShieldCheck is not defined en Modales

## 1. Causa Raíz
Al migrar los modales de creación y edición al sistema visual Bento Apple, se incorporó el icono `ShieldCheck` de `lucide-react` para distinguir las operaciones de limpieza QC o validación normativa. Sin embargo, en cuatro modales se omitió agregar `ShieldCheck` a la sentencia `import { ... } from 'lucide-react'`:
- `frontend/src/modals/CreateModelModal.jsx` (Línea 137: estrategia estándar con limpieza)
- `frontend/src/modals/ChecklistStepModal.jsx` (Línea 103: badge de paso de limpieza)
- `frontend/src/modals/ImportChecklistModal.jsx` (Badge de categoría)
- `frontend/src/modals/StepPickerModal.jsx` (Selector de pasos de estación)

Al presionar "+ Nuevo Modelo" o "+ Nuevo Paso", React intentaba renderizar `<ShieldCheck />` desencadenando:
`ReferenceError: ShieldCheck is not defined at rx (index-CGT48Mze.js:365:50674)`.

## 2. Solución Aplicada
- Se importó explícitamente `ShieldCheck` desde `lucide-react` en los 4 archivos afectados.
- Se ejecutó un script de verificación cruzada (`scratch/check_icons.py`) sobre todos los archivos `.jsx` del frontend para asegurar que no exista ninguna otra etiqueta JSX sin su respectiva importación.
- Build de producción generado exitosamente en 5.03s (`index-Cv4NyP0w.js`).

## 3. Archivos Modificados
- `frontend/src/modals/CreateModelModal.jsx`
- `frontend/src/modals/ChecklistStepModal.jsx`
- `frontend/src/modals/ImportChecklistModal.jsx`
- `frontend/src/modals/StepPickerModal.jsx`

