---
fecha: 2026-11-04
tipo: ux / arquitectura / tesler
estado: completado
tags: [tesler, despacho, estaciones, fitts, bento-apple, ponytail]
---

# Flujo Continuo de Ensamblaje y Corrección de Violaciones a la Ley de Tesler al Despachar PCs

## Contexto y Problema
Al completar todos los pasos de una PC en una estación de trabajo, el flujo de ensamblaje presentaba fricciones críticas que violaban la Ley de Tesler y la Regla 1-1-··· de ergonomía de planta:
1. **Atrapamiento en Modo Histórico tras Despachar**:
   - Al presionar *"Enviar PC #X a siguiente estación"*, el backend avanzaba la unidad con éxito, pero la llamada de refresco conservaba la unidad previa en `localStorage.getItem('qc_active_unit')`.
   - Como resultado, el operario quedaba inmediatamente bloqueado viendo el registro histórico en solo lectura de la PC que acababa de despachar, forzándolo a buscar y seleccionar manualmente la siguiente PC en cola.
2. **Doble Botón de Despacho en Conflicto (Violación Regla 1-1-···)**:
   - Se renderizaban simultáneamente dos botones primarios idénticos de despacho: uno dentro de la tarjeta principal y otro flotante fijo en `bottom-4`, superponiéndose en pantallas táctiles y colisionando áreas de toque.
3. **Texto Blanco sobre Fondo Blanco en Progreso**:
   - La barra de avance de ensamblaje y etiquetas de control fotográfico conservaban clases oscuras heredadas (`text-white`, `text-blue-100`, `bg-white/20`) sobre la tarjeta Bento Apple blanca (`bg-white`), volviendo invisibles los contadores y porcentajes.
4. **Falta de Adaptación en la Última Estación**:
   - En la estación final de la línea (Limpieza Final / Embalaje), el botón indicaba incorrectamente *"Enviar a siguiente estación"* en lugar de *"Finalizar y Aprobar PC (Fin de Línea)"*.
5. **Vulnerabilidad de Desmarque Accidental en Histórico**:
   - Si el operario tocaba los pasos de una PC ya despachada en consulta histórica, el sistema intentaba enviar peticiones de desmarque (`/operator/uncheck-step`).

---

## Causa Raíz
1. `finish_station` en el backend no devolvía la siguiente unidad disponible en la estación, dejando al frontend adivinar o depender de estados residuales.
2. `loadOperatorWorkspace` en `App.jsx` guardaba en `localStorage` unidades con `current_station > assignment.station_number` (históricas), provocando que toda recarga resucitase la PC despachada.
3. `OperatorWorkspaceView.jsx` duplicaba el botón de acción principal y carecía de protección de solo lectura estricta en modo `isHistorical`.

---

## Solución Técnica Implementada

### 1. Auto-Avance Inmediato a la Siguiente PC (`backend/app/main.py`)
- En el endpoint `/operator/finish-station`:
  ```python
  # Ley de Tesler: Buscar la siguiente unidad en cola para esta estación
  next_unit = db.query(QCPCUnit).filter(
      QCPCUnit.order_id == order_id,
      QCPCUnit.current_station == station_number,
      QCPCUnit.overall_status.in_(["PENDING", "IN_PROGRESS"]),
      QCPCUnit.unit_number != unit_number
  ).order_by(QCPCUnit.unit_number.asc()).first()

  return {
      "message": f"PC #{unit_number} completada y enviada...",
      "next_station": next_station,
      "is_finished": next_station > order.total_stations,
      "next_unit_number": next_unit.unit_number if next_unit else None
  }
  ```

### 2. Orquestación Frontend de Flujo Continuo (`frontend/src/views/OperatorWorkspaceView.jsx`)
- **Auto-Carga sin Clics**:
  - Al recibir `next_unit_number`, el workspace limpia el formulario anterior, notifica *"✓ PC #X enviada a siguiente estación. Iniciando PC #Y..."* y ejecuta automáticamente `onSelectUnit(nextUnitNum)`. El operario pasa de PC 1 a PC 2 de forma 100% lineal.
  - Si ya no hay más PCs en la estación, limpia `localStorage` y muestra el estado vacío informativo.
- **Jerarquía 1-1-··· Estricta**:
  - Eliminada la barra flotante duplicada en `bottom-4`.
  - Tarjeta de despacho unificada Bento Apple con 1 solo botón primario:
    - Estaciones intermedias: `Despachar PC #01 a Estación 2 →`
    - Estación final: `🎉 Finalizar y Aprobar PC #01 (Fin de Línea)`
- **Modo Histórico Seguro (`isHistorical`)**:
  - Bloqueo de clics en checkboxes si la PC ya pasó la estación (`isHistorical = true`).
  - Sustitución del botón de despacho por un banner informativo y botón de retorno rápido: `[ ← Volver a PC #X en Curso ]`.
- **Contraste Bento Apple**:
  - Reemplazadas clases oscuras por paleta platino/carbón legible (`text-stone-700`, `text-stone-900`, `bg-stone-100 border border-stone-200/60`).

### 3. Persistencia Segura (`frontend/src/App.jsx`)
- En `loadOperatorWorkspace`:
  - `localStorage.setItem('qc_active_unit')` SOLO se ejecuta si la PC pertenece físicamente a la estación activa (`data.active_unit.current_station === data.assignment?.station_number`).
  - `targetStation` preserva siempre `operatorStationFilter` cuando se selecciona una unidad.

---

## Archivos Modificados
- `backend/app/main.py`
- `frontend/src/App.jsx`
- `frontend/src/views/OperatorWorkspaceView.jsx`

---

## Verificación
- Backend test suite ejecutado exitosamente con TestClient:
  - Guardias de despacho y verificación de estación aprobados.
- Compilación de producción con Vite: `rtk npm --prefix frontend run build` (0 errores, 4.12s).
