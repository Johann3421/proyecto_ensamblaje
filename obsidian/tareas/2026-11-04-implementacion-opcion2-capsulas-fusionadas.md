---
fecha: 2026-11-04
tipo: ux / arquitectura / refactor
estado: completado
tags: [bento-apple, distribucion-botones, capsulas-fusionadas, overflow-menu, fitts]
---

# 📦 Implementación de Distribución Opción 2: Cápsulas Fusionadas & Menú de Desbordamiento

## 1. Contexto & Requerimiento
Aprobada la **Opción 2** por el usuario para eliminar el desorden y dispersión de botones en toda la interfaz, se procedió con la implementación directa en los componentes de producción:
1. `ChecklistEditorView.jsx`: Toolbar de Checklists con Cápsulas Fusionadas de Utilidades.
2. `PipelineMatrixView.jsx`: Header de Orden con Jerarquía 1-1-··· (1 primario, 1 secundario, 1 menú overflow).

## 2. Cambios Técnicos Realizados

### En `ChecklistEditorView.jsx`:
- **Barra de Gestión de Modelo**:
  - Lado izquierdo: Selector de modelo y resumen estadístico de pasos (`X pasos · Y ensamblaje · Z limpieza QC`).
  - Lado derecho: Botón primario `Nuevo Modelo` en azul Apple (`#0071E3`) + Menú secundario `Mantenimiento` (antiguo *Opciones del Modelo*) en fondo blanco con borde neutro.
- **Barra de Control Operativo (Toolbar Principal)**:
  - Lado izquierdo: Selector segmentado de secciones (`Secciones | Todos | Ensamblaje | Limpieza QC`) encapsulado en `bg-stone-100` con microbordes.
  - Centro: Buscador de pasos integrado y centrado.
  - Lado derecho: **Cápsula de Utilidades Fusionadas** (`Importar | Exportar | Plantilla`) en un único contenedor con divisores verticales tenues, reduciendo 60% de espacio horizontal, junto al ÚNICO botón primario destacado (`Nuevo Paso` en `#0071E3`).

### En `PipelineMatrixView.jsx`:
- Reemplazo de los 7 botones desordenados por la **Regla 1-1-···**:
  - Selector de Orden en `bg-stone-50` con borde sutil.
  - 1 Botón Secundario Frecuente: `Editar Orden`.
  - 1 Botón Primario Destacado: `Agregar PC` (Apple Blue `#0071E3`).
  - 1 Menú de Desbordamiento (`···` / `MoreHorizontal`): Agrupa con click-outside listener las acciones `Actualizar Datos`, `Reasignar Técnico`, separador visual, `Reiniciar Todo el Lote` (ámbar) y `Eliminar Orden` (rojo).

## 3. Archivos Modificados
- `frontend/src/views/ChecklistEditorView.jsx`: Barra de modelo y toolbar unificados en cápsulas Bento.
- `frontend/src/views/PipelineMatrixView.jsx`: Header y overflow dropdown interactivo.
- `resultado_final_distribuciones.html`: Prototipo interactivo de validación.

## 4. Verificación
- Compilación de Vite: `npm --prefix frontend run build` exitoso en 4.32s sin advertencias de sintaxis.
- Cero botones redundantes o compitiendo por atención visual.

