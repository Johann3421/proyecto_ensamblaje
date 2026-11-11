---
fecha: 2026-11-11
tipo: fix / mobile / ux / backend
estado: completado
tags: [mobile, popstate, back_button, navegacion, completed_units, workspace, tesler]
---

# Fix: Soporte al Botón Atrás en Móvil (Prevención de Salida Abrupta) y Desbloqueo del Total de PCs Resueltas

## 1. Descripción de los Problemas
1. **Salida Abrupta en Dispositivos Móviles**: En la vista móvil (smartphone / tablet / PWA), al presionar el botón de retroceso nativo de Android (físico, barra de navegación o gesto de deslizamiento lateral), el navegador interpretaba la acción como una salida del sitio web, cerrando la sesión y expulsando al operario del sistema en lugar de cerrar el modal abierto, la cámara o la vista previa.
2. **Límite Artificial de 15 PCs Resueltas**: En el espacio de trabajo del operario y en los selectores de unidades despachadas/resueltas, el sistema únicamente mostraba un máximo de 15 computadoras, recortando el resto del lote cuando la orden contenía más de 15 unidades completadas.

---

## 2. Causa Raíz
1. **Navegación Móvil y SPA History Stack**:
   - La aplicación SPA no gestionaba una pila de estados en el `History API` para los modales, la cámara (`CameraCaptureModal`), los visores fotográficos (`PhotoPreviewModal`), las fichas de unidad (`UnitDetailModal`) ni los sub-estados.
   - Al pulsar "Atrás", el navegador ejecutaba `popstate` directamente hacia la entrada previa del navegador (fuera del dominio), provocando la salida total del sistema.
2. **Truncamiento Fijo en Backend (`[:15]`)**:
   - En `backend/app/main.py` (función `get_operator_workspace`), la lista de unidades despachadas (`completed_units`) tenía aplicada una limitación estática en el código: `[:15]`.
   - Adicionalmente, en `OperatorWorkspaceView.jsx` se aplicaba un `slice(0, 8)` en el mensaje de pantalla vacía.

---

## 3. Solución Técnica Implementada

### A. Interceptor Global de Retroceso Móvil (`frontend/src/utils/backHandler.js` y `App.jsx`)
1. **Pila LIFO de Handlers (`backHandler.js`)**:
   - Se diseñó un registro centralizado de controladores de retroceso donde cada modal activo o sub-vista se registra al montarse y se desregistra al desmontarse.
2. **Centinela en Historial (`App.jsx`)**:
   - Al autenticarse, se inserta un estado centinela (`window.history.pushState({ app: 'qc_kenya' }, '')`) que atrapa cualquier evento `popstate`.
   - Si hay modales o vistas secundarias abiertas (`CameraCaptureModal`, `PhotoPreviewModal`, `UnitDetailModal`, `TransferUnitModal`, etc.), el evento "Atrás" **cierra el modal en primer plano**, restaura el estado centinela y mantiene al usuario dentro de su pantalla.
   - Si no hay modales y el usuario está en una pestaña secundaria, lo devuelve a su pantalla principal (`/pipeline` o `/estacion`).
   - Si está en la pantalla principal sin modales, se activa la protección estándar de doble toque: notifica *"Presiona atrás de nuevo para salir del sistema"* y solo permite salir si se vuelve a pulsar dentro de 2.5 segundos.
3. **Registro en Componentes**:
   - `CameraCaptureModal`: Si hay foto capturada en preview, vuelve a la cámara; si está en cámara en vivo, cierra el modal.
   - `PhotoPreviewModal`: Si está abierto el modal de corrección administrativa, lo cierra; si no, cierra la vista previa.
   - `UnitDetailModal`: Si hay diálogos de confirmación o transferencias abiertas, los cierra antes de salir de la ficha.
   - `OperatorWorkspaceView`: Si el operario estaba consultando una PC histórica despachada, el botón Atrás lo regresa a la PC activa en curso de su puesto.

### B. Eliminación del Límite de 15 PCs Resueltas (`backend/app/main.py` y `OperatorWorkspaceView.jsx`)
1. **Backend**:
   - Se eliminó el recorte `[:15]` en `backend/app/main.py`. `completed_units` ahora retorna la totalidad de unidades despachadas de la orden en orden correlativo (`unit_number.asc()`).
2. **Frontend (`OperatorWorkspaceView.jsx`)**:
   - Se actualizó el selector `<optgroup label="PCs ya despachadas (X)">` para reflejar la totalidad real.
   - Se ajustó la fila de acceso rápido con `max-h-32 overflow-y-auto` y el estado vacío sin PCs con `max-h-48 overflow-y-auto`, permitiendo navegar y seleccionar cualquier unidad del lote sin restricciones de cantidad.

---

## 4. Archivos Modificados
- `frontend/src/utils/backHandler.js` *(nuevo)*
- `frontend/src/App.jsx`
- `frontend/src/modals/CameraCaptureModal.jsx`
- `frontend/src/modals/PhotoPreviewModal.jsx`
- `frontend/src/modals/UnitDetailModal.jsx`
- `frontend/src/views/OperatorWorkspaceView.jsx`
- `backend/app/main.py`

---

## 5. Verificación
1. **Prueba Automatizada Backend (`test_completed_units.py`)**:
   - Orden simulada con 30 unidades (25 completadas en estación 1). `get_operator_workspace` devolvió las 25 unidades completas sin límite de 15.
2. **Build de Frontend**:
   - `rtk npm --prefix frontend run build` finalizado en 4.07s sin errores.

