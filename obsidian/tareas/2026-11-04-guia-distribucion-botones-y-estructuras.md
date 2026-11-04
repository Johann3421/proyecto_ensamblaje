---
fecha: 2026-11-04
tipo: ux / arquitectura / diseno
estado: completado
tags: [distribucion-botones, jerarquia-visual, ley-de-fitts, bento-apple, ui-patterns]
---

# 📐 Guía y Parámetros Oficiales de Distribución y Jerarquía de Botones

## 1. Diagnóstico del Problema (Anti-Patrón de Dispersión)
En las interfaces previas existía acumulación de botones sin jerarquía:
- Filas con 6 a 8 botones yuxtapuestos con colores arbitrarios compitiendo por atención (azul, ámbar, rojo, gris, botones sin texto con iconos sueltos).
- Acciones destructivas o peligrosas (ej. *Reiniciar Lote*, *Eliminar Orden*) colocadas inmediatamente al lado de acciones cotidianas (ej. *+ PC*, *Editar*), aumentando el riesgo de error humano en planta.
- Acciones de utilidades secundarias (*Importar*, *Exportar*, *Plantilla*) ocupando demasiado espacio visual y fragmentando la barra de herramientas.

## 2. Los 4 Parámetros de Oro de Estructura

### Regla 1: Patrón 1-1-··· (1 Primario, 1 Secundario, 1 Menú Overflow)
- **1 Solo Botón Primario por Bloque:** El ojo humano solo debe ver una acción principal clara (ej. `+ Agregar PC` en la orden, o `+ Nuevo Paso` en el checklist).
- **1 Botón Secundario Frecuente:** Fondo blanco, borde neutro (`#D1D1D6`), para acciones habituales pero no creadoras (ej. `Editar`).
- **Menú de Desbordamiento (`···`):** Todas las acciones críticas, destructivas o infrecuentes (*Reiniciar Lote*, *Reasignar Técnico*, *Eliminar*, *Refrescar*) se agrupan dentro de un menú contextual desplegable con confirmación.

### Regla 2: Cápsulas de Utilidades Encapsuladas (Segmented Utility Group)
- En lugar de renderizar 3 botones separados para herramientas de datos (`Importar`, `Exportar`, `Plantilla`), se fusionan en un único contenedor Bento tipo cápsula con separadores sutiles.
- Reduce el ruido visual en un 66% y agrupa las funciones de la misma familia conceptual.

### Regla 3: Ergonomía de Paso / Operario (Ley de Fitts)
- **Aislamiento de Contingencias (Extremo Izquierdo):** El botón de `Reportar Falla` se coloca a la izquierda con estilo discreto para evitar pulsaciones accidentales mientras se ensambla.
- **Flujo Natural de Finalización (Extremo Derecho):**
  1. Selector de Técnico.
  2. Botón Secundario de Evidencia: `Subir Foto`.
  3. Botón Primario Destacado: `Completar Paso` (tamaño mayor, color Apple Blue `#0071E3`).

### Regla 4: Estandarización de Diálogos Modales
- Pie de modal estándar con lectura natural:
  - Botón neutro/cancelar a la izquierda (`Cancelar`).
  - Botón de acción definitiva a la derecha (`Confirmar`, `Guardar`, `Eliminar`).

## 3. Entregables
- Archivo interactivo local: `preview_distribucion_botones.html`.
- Captura de alta resolución comparativa: `brain/.../screenshots/distribucion_botones_showcase.png`.
