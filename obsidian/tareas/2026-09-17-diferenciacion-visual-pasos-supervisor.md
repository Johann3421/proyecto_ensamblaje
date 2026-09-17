---
title: Diferenciación Visual de Pasos para Supervisor (Color Neutro vs Verde)
fecha: 2026-09-17
tipo: feat
estado: COMPLETADO
tags: [supervisor, frontend, ui, ux, tesler]
relacionados:
  - "[[Puesto_Supervision]]"
  - "[[BITACORA_TAREAS]]"
---

# 🎨 Diferenciación Visual de Pasos para Supervisor (Color Neutro vs Verde)

## 1. Problema Reportado
Al ingresar al apartado de supervisión, los pasos completados por el técnico operario aparecían en color verde de "confirmado" para el supervisor. Esto generaba confusión en el supervisor, quien no distinguía si ese paso ya contaba con su propia certificación o si aún le faltaba verificarlo.

## 2. Causa Raíz
En `OperatorWorkspaceView.jsx`, la bandera `isDone` se calculaba de manera global:
`const isDone = completedSteps.includes(st.step_number);`
Dado que `completedSteps` contiene cualquier paso registrado en la PC (ya sea por operario o supervisor), la interfaz pintaba el contenedor con estilos de completado (`bg-emerald-50`, `border-emerald-300`, badges verdes) tanto para el operario como para el supervisor.

## 3. Solución Técnica (Tesler + UI sobria)
1. **Separación de Estados por Rol**:
   - Para operarios: el paso está completo cuando el técnico lo finalizó (`isTechnicianDone`).
   - Para supervisor (`isSupervisorMode`): el paso solo se considera completo cuando cuenta con certificación oficial del supervisor (`isSupervisorVerified = Boolean(stepLog?.is_supervisor_verified)`).
   - `isStepComplete = isSupervisorMode ? isSupervisorVerified : isTechnicianDone`.
2. **Paleta Neutra Sobria (Pendiente de V°B°)**:
   - Mientras el supervisor no certifique el paso, el contenedor permanece en tonos neutros (`bg-stone-50/90 border-stone-300`).
   - Icono de reloj `Clock` y badge explícito: `⏳ Realizado por Operario · Pendiente tu V°B°`.
   - Botón de acción resaltado: `📸 Verificar y Tomar Foto (Supervisor)` para invitar a la acción directa sin ambigüedades.
3. **Confirmación Verde Exclusiva al Certificar**:
   - Una vez el supervisor toma la foto oficial o certifica, la tarjeta pasa a verde esmeralda (`bg-emerald-50/70 border-emerald-400`), mostrando `🛡️ V°B° Supervisor Aprobado` y `Actualizar Foto Cumplimiento`.
4. **Métricas de Progreso Supervisor**:
   - El contador de progreso en modo supervisor calcula `supervisorVerifiedCount/totalStationSteps` en lugar del progreso del operario.

## 4. Archivos Modificados
- `frontend/src/views/OperatorWorkspaceView.jsx`

## 5. Verificación
- `npm run build` en `frontend/` ejecutado con éxito (0 errores).
- Pruebas de renderizado y lógica condicional validadas.
