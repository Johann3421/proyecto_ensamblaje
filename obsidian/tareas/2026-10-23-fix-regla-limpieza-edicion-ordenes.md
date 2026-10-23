---
fecha: 2026-10-23
tipo: fix / ux
estado: completado
tags: [ordenes, edicion, limpieza, estaciones, ley-de-tesler, backend, frontend]
---

# Corrección de Regla de Estaciones de Limpieza en Edición de Órdenes

## 1. Descripción
Al editar una orden de producción existente mediante `EditOrderModal`, el sistema impedía guardar cambios y emitía un bloqueo indicando que debían existir al menos 2 estaciones/personal de limpieza (`"Regla de Calidad Obligatoria: La línea debe incluir al menos 2 estaciones designadas para Limpieza. Actualmente: 1"`), a pesar de que la creación de la orden (`CreateOrderView`) permite y valida correctamente la línea con solo 1 estación de limpieza.

## 2. Causa Raíz
1. **Discrepancia en Endpoints de Backend (`backend/app/main.py`)**:
   - `create_order` (`POST /orders`): Validaba `len(cleaning_stations) < 1` únicamente si el modelo contenía pasos marcados como limpieza (`model_clean_steps > 0`).
   - `update_order` (`PUT /orders/{order_id}`) y `update_order_stations` (`PUT /orders/{order_id}/stations`): Tenían hardcodeado `if cleaning_count < 2: raise HTTPException(status_code=400, ...)` sin verificar la paridad con la creación ni si el modelo requería una sola estación.
2. **Hardcoded UI en `EditOrderModal.jsx`**:
   - Badge de estado: Evaluaba `cleaningCount >= 2` para considerar la configuración válida y mostraba `{cleaningCount}/2 Estaciones Limpieza (Faltan {2 - cleaningCount})`.
   - Footer del modal: Mostraba en rojo `"Requiere mínimo 2 estaciones de limpieza para poder guardar."` cuando `cleaningCount < 2`.
   - Manejo de excepciones: Bloqueaba el hilo con `alert("Error: " + err.message)` en vez de utilizar el sistema de notificaciones ergonómico (`notify`).

## 3. Solución Técnica
1. **Unificación de Regla en Backend (`backend/app/main.py`)**:
   - En `update_order` y `update_order_stations`, se alineó la regla con `create_order`:
     - Se verifica si el modelo tiene pasos de limpieza (`model_clean_steps > 0`).
     - Si tiene pasos de limpieza, exige al menos 1 estación designada (`cleaning_count < 1`).
     - Si el modelo no tiene pasos de limpieza, no impone restricción innecesaria.
   - En `get_model_diagnostics`: Se actualizó la recomendación técnica para reflejar que la línea exige al menos 1 estación de limpieza para el lote.
2. **Ajuste de Validaciones e Interfaz en `EditOrderModal.jsx`**:
   - Badge superior: Muestra estado válido (`CheckCircle`) cuando `!hasCleaningSteps || cleaningCount >= 1` con formato singular/plural dinámico (`1 Estación Limpieza (Válido)`).
   - Detección de alcance en modal: Se declaró `hasCleaningSteps` como hook `useMemo` en el scope raíz del componente para evitar `ReferenceError: hasCleaningSteps is not defined` durante el renderizado del JSX.
   - Mensaje de validación inferior: Muestra estado exitoso en verde cuando se cumple con al menos 1 estación de limpieza requerida.
   - Manejo no intrusivo: Se integró `notify(..., "warning" | "danger")` para evitar `alert()` nativos del navegador.

## 4. Archivos Modificados
- [backend/app/main.py](file:///d:/SISTEMAS%2002/Desktop/Proyectos_generales/proyecto_ensamblaje/backend/app/main.py): Corrección de `cleaning_count < 2` a `model_clean_steps > 0 and cleaning_count < 1` en `update_order` y `update_order_stations`.
- [frontend/src/modals/EditOrderModal.jsx](file:///d:/SISTEMAS%2002/Desktop/Proyectos_generales/proyecto_ensamblaje/frontend/src/modals/EditOrderModal.jsx): Declaración de `hasCleaningSteps` en scope del componente, ajuste del badge y mensaje de validación a mínimo 1 estación de limpieza y reemplazo de alerts por toasts.

## 5. Verificación
1. **Prueba Unitaria de Actualización Backend**:
   - Ejecución de `update_order` con 1 estación de limpieza: Resultado `SUCCESS: 200 OK`.
   - Ejecución de `update_order` con 0 estaciones de limpieza en modelo con pasos de limpieza: Resultado `400 Bad Request` esperado con mensaje claro.
2. **Build de Producción Frontend**:
   - `rtk npm run build` compiló sin errores en 4.42s (`dist/assets/index-e_18C9Zd.js`).
   - Verificado que `hasCleaningSteps` se encuentra en scope del componente sin generar `ReferenceError`.
