---
title: Flujo de Estaciones y Línea de Ensamblaje
aliases: [Flujo_Estaciones, Linea_Ensamblaje, Estaciones]
tags: [arquitectura, estaciones, pipeline, ensamble]
---

# ⚙️ Flujo de Estaciones y Línea de Ensamblaje

## 1. Estaciones Físicas de la Línea
El modelo típico de ensamblaje (ej. `PROWORK` de 52 pasos) se divide en 5 estaciones:
- **Estación 1**: Chasis, Montaje y Placas (Pasos 1 a 11).
- **Estación 2**: Protecciones, Discos y GPU (Pasos 12 a 22).
- **Estación 3**: Limpieza Intermedia, Chasis y Pruebas (Pasos 23 a 32).
- **Estación 4**: Personalización, Software y Serie (Pasos 33 a 42).
- **Estación 5**: Stickers, Limpieza Final y Embalaje (Pasos 43 a 52).

## 2. Reglas de Transición
1. **Foto Obligatoria en Último Paso**:
   - Para que una PC avance a la siguiente estación, el técnico titular o de apoyo debe subir obligatoriamente la foto del último paso de su estación.
   - El backend bloquea `/operator/advance-station` si no existe un log `PASS` con `photo_url` en dicho paso.
2. **Derivación de Procesos (Traspasos)**:
   - Si una PC no puede completar un paso intermedio por falta de componentes, el técnico puede derivar la PC o el paso a otra estación con trazabilidad completa.
