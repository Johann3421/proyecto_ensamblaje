---
title: Puesto de Supervisión & Calidad (Estación 0)
aliases: [Puesto_Supervision, Estacion_0, SupervisorQC]
tags: [arquitectura, supervisor, calidad, estacion0]
---

# 🛡️ Puesto de Supervisión & Calidad (Estación 0)

## 1. Concepto y Rol
El **Puesto de Supervisión** está identificado formalmente como la **Estación 0**.
A diferencia de los puestos de operario (Estaciones 1 a 5), la Estación 0:
1. **Es un puesto independiente**: No depende de qué estación física de la línea ocupa cada PC.
2. **Acceso Global a Unidades**: El supervisor puede auditar cualquier PC (`PC #01` a `PC #N`) de la orden en cualquier momento.
3. **Pasos Asignados Unificados**:
   - Si la orden define `order.supervisor_steps`, el puesto muestra exactamente esos números de paso.
   - Si no hay definición manual, el puesto muestra **todos los pasos del modelo** disponibles para auditoría.

## 2. Flujo de Certificación Normativa
1. **Auditoría de Pasos con Foto**:
   - El supervisor puede tomar una foto oficial de cumplimiento para cualquier paso (`/supervisor/verify-step-photo`).
   - El log se marca con `is_supervisor_verified: True` y el nombre del supervisor.
2. **Emisión de Visto Bueno Final**:
   - Modal de certificación que audita:
     1. Fotos de evidencia en estaciones.
     2. Doble limpieza obligatoria (sin huellas ni polvo).
     3. Hardware, BIOS y POST a la primera.
     4. Trazabilidad de número de serie y marca KENYA.
   - Genera registro en `QCSupervisorAudit` (`APPROVED` / `REJECTED`).
