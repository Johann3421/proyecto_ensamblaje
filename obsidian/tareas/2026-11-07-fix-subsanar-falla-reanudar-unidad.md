---
fecha: 2026-11-07
tipo: fix / arquitectura / tesler
estado: completado
tags: [fallas, subsanar, pipeline, tesler, unit_detail, operador]
---

# Fix: Implementación de Endpoints y Flujo Completo para Subsanar Fallas y Reanudar PCs

## 1. Descripción del Problema
Al reportarse una falla en una unidad (`overall_status = "FAILED"`), el usuario ingresaba a la ficha de la PC (`UnitDetailModal`) y hacía clic en el botón **"✓ Subsanar Falla y Reanudar PC en Línea"**, pero la acción fallaba sistemáticamente mostrando un mensaje de error y dejando a la computadora permanentemente bloqueada.

## 2. Causa Raíz
1. **Endpoint Inexistente en Backend**:
   - `UnitDetailModal.jsx` ejecutaba una llamada HTTP: `POST ${API_BASE}/orders/${order.order_id}/units/${unit.unit_number}/resume`.
   - Sin embargo, dicha ruta **nunca había sido implementada** en `backend/app/main.py`, por lo que FastAPI devolvía un error HTTP 404 (Not Found).
2. **Ausencia de Resolución Individual de Fallas**:
   - No existía endpoint ni mecanismo para marcar registros de `QCIssue` de estado `"OPEN"` a `"RESOLVED"`.
3. **Falta de Trazabilidad y Seguridad en Despacho**:
   - `finish_station` no validaba explícitamente si una PC tenía `overall_status == "FAILED"`, arriesgando el despacho prematuro de unidades defectuosas si un usuario forzaba el envío.
4. **Fricción Operativa (Violación a la Ley de Tesler)**:
   - Si un técnico u operario tenía la PC fallada en su puesto (`OperatorWorkspaceView`), la interfaz no le ofrecía una vía clara ni directa para subsanar la incidencia sin tener que navegar hacia la matriz general.

## 3. Solución Técnica Implementada

### Backend (`backend/app/main.py`)
1. **Endpoint Principal `POST /orders/{order_id}/units/{unit_number}/resume`**:
   - Resuelve el `order_id` canónico con `resolve_order()`.
   - Localiza la unidad y marca todas sus incidencias abiertas (`QCIssue.status == "OPEN"`) como `"RESOLVED"`.
   - Restablece el estado de la unidad: si ya culminó todas las estaciones se coloca en `"PASSED"`; de lo contrario, se reincorpora como `"IN_PROGRESS"`.
   - Inserta una entrada forense en `QCStepLog` con estado `"RESUME"`, registrando quién subsanó la falla y la nota correspondiente.
2. **Endpoint Granular `POST /issues/{issue_id}/resolve`**:
   - Permite subsanar un reporte de falla individual y desbloquear la unidad automáticamente cuando ya no le resten fallas abiertas.
3. **Blindaje en `finish_station`**:
   - Verifica `unit.overall_status != "FAILED"`, bloqueando con HTTP 400 cualquier intento de despacho mientras exista una falla pendiente.

### Frontend
1. **`UnitDetailModal.jsx`**:
   - Actualizado `handleResumeUnit` enviando el usuario actual (`user_id`, `user_name`) y notas de auditoría.
   - Condición de visualización expandida: el botón de subsanar se habilita tanto si `overall_status === "FAILED"` como si hay fallas con `status === "OPEN"`.
   - Badge visual en el listado de fallas: verde `SUBSANADA` para `"RESOLVED"` y rojo `ABIERTA` para `"OPEN"`.
2. **`PipelineMatrixView.jsx`**:
   - Añadido botón contextual de acción rápida *"Subsanar Falla en PC #XX"* directamente en las tarjetas de fallas abiertas, abriendo la ficha para resolverla de inmediato.
3. **`OperatorWorkspaceView.jsx`**:
   - Banner de alerta visual en el aside y sustitución del botón de despacho cuando `active_unit.overall_status === "FAILED"`.
   - Implementado `handleResumeUnitFromWorkspace` para permitir subsanar la falla directamente desde el puesto de trabajo.

## 4. Archivos Modificados
- `backend/app/main.py`
- `frontend/src/modals/UnitDetailModal.jsx`
- `frontend/src/views/PipelineMatrixView.jsx`
- `frontend/src/views/OperatorWorkspaceView.jsx`

## 5. Verificación
1. **Test Automatizado (`scratch/test_resume_issue.py`)**:
   - Reporte de falla bloqueó la unidad en `"FAILED"` y `finish_station` arrojó HTTP 400.
   - Llamada a `resume_unit` subsanó la falla a `"RESOLVED"`, restauró la unidad a `"IN_PROGRESS"` y registró log forense `"RESUME"`.
   - Subsanación individual mediante `resolve_issue` probada y validada.
2. **Build de Producción**:
   - `rtk npm --prefix frontend run build` finalizado en 4.17s sin errores.
