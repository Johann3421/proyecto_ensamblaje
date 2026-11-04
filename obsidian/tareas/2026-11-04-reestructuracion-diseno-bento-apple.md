---
fecha: 2026-11-04
tipo: ux / arquitectura / refactor
estado: completado
tags: [bento-apple, diseno-global, ui, ergonomia, tailwind]
---

# 🍏 Reestructuración Integral a Sistema de Diseño Bento Apple

## 1. Contexto y Objetivos
Por instrucción del usuario, se abandonó definitivamente el enfoque rígido "sombrío y de alto contraste" y se adoptó formalmente el **Estilo 3: Bento Grid / Apple Modular** como la base de diseño visual del proyecto.

## 2. Bases de Diseño Global Establecidas
1. **Paleta Luminosa y Ergonómica**:
   - Fondo general: Platino Apple suave (`#F5F5F7`), eliminando el fondo negro o gris carbón deprimente.
   - Tarjetas y módulos: Blanco puro (`#FFFFFF`) con bordes sutiles ultra limpios (`#E5E5EA` o `#F0F0F2`) y sombras suaves (`box-shadow: 0 4px 20px rgba(0,0,0,0.03)`).
   - Acentos funcionales: Azul Apple (`#0071E3`), verde menta (`#34C759`), naranja cítrico (`#FF9500`), texto primario carbón nítido (`#1D1D1F`) y secundario (`#86868B`).
2. **Geometría y Curvaturas**:
   - Contenedores principales y tarjetas Bento: `rounded-2xl` a `rounded-3xl` (16px a 24px).
   - Botones, selectores e inputs: `rounded-xl` (12px).
   - Píldoras, badges e indicadores: `rounded-full` (9999px).
3. **Ergonomía de Operaciones**:
   - Sin fatiga visual en turnos continuos de 8 horas.
   - Distribución modular en bloques que agrupan la información con claridad intuitiva sin sobrecarga de líneas divisorias duras.

## 3. Archivos Modificados
- `.agents/AGENTS.md`: Formalización del sistema de diseño Bento Apple en las reglas primordiales del proyecto.
- `frontend/tailwind.config.js`: Definición de la paleta Apple (primary `#0071E3`, surface `#F5F5F7`, radios `2xl`, `3xl`, `4xl`, y sombras `bento`).
- `frontend/src/index.css`: Fondo general platino, scrollbars estilo macOS/iOS y rediseño completo de la página de Login a tarjeta Bento flotante.
- `frontend/src/App.jsx`: Header Bento Apple con efecto glassmorphism (`bg-white/85 backdrop-blur-md`), píldoras de navegación y barra inferior móvil limpia.
- `frontend/src/views/PipelineMatrixView.jsx`: Reestructuración a tarjetas Bento modulares, tabla de matriz estilo Apple y métricas en gran formato.
- `frontend/src/views/ChecklistEditorView.jsx`: Pasos en tarjetas limpias con números circulares azul/verde, selector modular de modelos y pestañas redondeadas.
- `frontend/src/views/CreateOrderView.jsx`: Formulario dividido en bloques Bento modulares con presets 1-clic y botones de acción Apple Blue.
- `frontend/src/views/OperatorWorkspaceView.jsx`: Puesto de trabajo luminoso, selector de PCs disponible y eliminación de gradientes oscuros.
- `frontend/src/modals/*`: 15 modales actualizados con bordes redondeados y botones en azul Apple.
- `frontend/src/components/Card.jsx` y `Badge.jsx`: Actualizados a tarjetas Bento y píldoras ergonómicas.

## 4. Verificación Visual
- Compilación `vite build` ejecutada con éxito (cero errores de bundle).
- Capturas de alta resolución Playwright guardadas y verificadas:
  - `bento_apple_login_preview.png`
  - `bento_apple_pipeline.png`
  - `bento_apple_checklists.png`
  - `bento_apple_create_order.png`
  - `bento_apple_tecnicos.png`

