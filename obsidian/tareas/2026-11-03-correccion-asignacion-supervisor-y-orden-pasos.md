---
fecha: 2026-11-03
tipo: bugfix / arquitectura / ley-de-tesler
estado: completado
tags: [supervisor, asignacion, roles, auto-healing, checklist, orden-pasos, steps, tesler]
---

# Corrección de Asignación de Supervisores y Orden Correlativo de Pasos QC

## 1. Causa Raíz

### A. Fallo de Asignación de Supervisor (Gianfranco vs Jhoan Supervisor)
1. **Auto-healing Forzado de Roles en Backend**:
   - En `backend/app/main.py` (`/api/auth/token` y `/api/auth/me`), existía una lógica rígida que forzaba a `OP-101..OP-106` al rol `OPERATOR` en cada inicio de sesión o petición `/auth/me`.
   - Aunque un administrador promoviera a Gianfranco (`OP-105`) al rol `SUPERVISOR`, el backend lo degradaba inmediatamente a `OPERATOR`.
2. **Aislamiento en `list_orders` (`GET /api/orders`)**:
   - Cuando un operario consultaba sus órdenes, el backend únicamente verificaba `QCStationAssignment`. Si el operario estaba asignado como supervisor en la orden pero no a una estación física de ensamblaje, la orden no se le entregaba ("no se le asigna nada").
   - Las órdenes sin supervisor específico (`supervisor_id: None` o `""`) quedaban visibles solo para `SUP-01` (`Jhoan Supervisor`).
3. **Hardcodeo en `LoginPage.jsx`**:
   - El acceso directo para Supervisores usaba `availableUsers.find(x => x.role === 'SUPERVISOR')`, mostrando siempre únicamente a Jhoan Supervisor.
4. **Restricción de Pestañas en Frontend (`App.jsx`)**:
   - Si un usuario no tenía rol global `SUPERVISOR`, quedaba bloqueado en `OPERATOR_TABS` (`Mi Estación`) sin poder acceder al Pipeline ni a la estación 0 (`Supervisión & V°B°`).

### B. Desorden en Pasos del Supervisor al Seleccionar
1. **Error en Regex de Rangos (`parseStepNumbersInput`)**:
   - La expresión regular `trimmed.match(/^(\d+)(?:-|\.\.(\d+))$/)` capturaba el límite superior solo con `..`, dejando `undefined` para rangos con guion como `1-10` o `44-54`, provocando que fallara la selección por rango.
2. **Falta de Ordenamiento Numérico Estricto**:
   - `modelSteps` no se ordenaba numéricamente por `step_number` antes de filtrarse en `SupervisorStepPickerModal`.
   - `supervisor_steps` no se normalizaba de forma estricta (1 a N) en backend al guardarse como string desde los formularios de creación o edición.
3. **Falta de Clasificación en Modelos en Producción**:
   - En modelos como `DATAONE - ARMADO` y `EZENT`, algunos pasos de limpieza final y embalaje estaban marcados como ensamble (`is_cleaning=False`), intercalándose con los pasos de armado.

---

## 2. Solución Técnica Implementada

### A. Backend (`backend/app/main.py`)
1. **Eliminación del Auto-Healing Forzado de Roles**:
   - Se removió la sobreescritura automática para `OP-101..OP-106`. Se respeta permanentemente el rol asignado al usuario en base de datos.
2. **Soporte Universal de Supervisión en `list_orders`**:
   - Se modificó el filtro de órdenes para que cualquier usuario asignado en `supervisor_id` (individual o lista separada por comas) tenga acceso pleno a la orden, independientemente de su rol base.
3. **Acceso a Estación 0 de Supervisión**:
   - En `get_operator_workspace`, se verifica si el usuario autenticado está en `order_sup_ids`. De ser así, se habilita `is_order_sup` e `is_supervisor_role`, otorgándole acceso a la Estación de Supervisión y Calidad.
4. **Normalización Numérica (`normalize_supervisor_steps`)**:
   - Función helper que limpia, desduplica y ordena correlativamente los pasos de supervisión (`"1,2,3,..."`) al crear o actualizar órdenes.
5. **Heurística Refinada de Limpieza y Empaque (`infer_step_is_cleaning`)**:
   - Se ampliaron palabras clave de empaque ("placa e/s", "bolsa", "tecnopor", "caja principal", "embalaje", "armar caja") y se corrigió `classify_cleaning_steps` para usar la inferencia centralizada.

### B. Frontend
1. **Login Dinámico de Supervisores (`LoginPage.jsx`)**:
   - Se renderizan dinámicamente todos los usuarios con rol `SUPERVISOR` registrados en base de datos.
2. **Reconocimiento Dinámico de Rol en Navegación (`App.jsx`)**:
   - Si un usuario tiene rol `SUPERVISOR` o está asignado como supervisor en alguna de las órdenes, se le habilitan automáticamente las pestañas de supervisión (`SUPERVISOR_TABS`).
3. **Corrección de Entrada por Rangos (`steps.js`)**:
   - Se corrigió el regex a `/^(\d+)(?:-|\.\.)(\d+)$/`, permitiendo rangos fluidos (`1-10`, `44-54`).
4. **Selector Visual de Pasos Ordenado (`SupervisorStepPickerModal.jsx`)**:
   - Pasos estrictamente ordenados de 1 a N.
   - Pestañas de filtrado: "Todos", "Ensamblaje" y "Limpieza QC".
   - Asignación por rango con `Math.min` y `Math.max` infalible.
5. **Guardado Numérico Ordenado (`CreateOrderView.jsx`, `EditOrderModal.jsx`)**:
   - Antes de enviar el payload, los pasos de supervisión se ordenan numéricamente (`.sort((a,b) => a - b)`).

---

## 3. Archivos Modificados
- `backend/app/main.py`
- `frontend/src/utils/steps.js`
- `frontend/src/modals/SupervisorStepPickerModal.jsx`
- `frontend/src/LoginPage.jsx`
- `frontend/src/App.jsx`
- `frontend/src/views/CreateOrderView.jsx`
- `frontend/src/modals/EditOrderModal.jsx`
- `frontend/src/modals/SupervisorAuditModal.jsx`

---

## 4. Verificación
1. `normalize_supervisor_steps` verificado con asserts en Python.
2. `parseStepNumbersInput` y `formatStepNumbersRange` verificados en Node.js para rangos con guion y dos puntos.
3. Compilación de producción con `rtk npm run build` exitosa (0 errores).
