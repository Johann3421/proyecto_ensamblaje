---
fecha: 2026-11-03
tipo: auditoria / ux / tesler
estado: completado
tags: [frontend, ui, ux, ley-de-tesler, dom, screenshots, playwright, ergonomia]
---

# 🎨 Auditoría Integral del Frontend: DOM, Capturas y Mala Distribución de UI

## 1. Contexto & Metodología
Se ejecutó un análisis automatizado integral con Playwright y headless Chromium inspeccionando:
- Resoluciones: Desktop (1440x900) y Móvil/Tablet de Planta (390x844).
- 11 Capturas de pantalla completas en `brain/b76bba21-1bda-4167-b607-168b0320ec02/screenshots/`.
- Métricas DOM: desbordamiento horizontal (`scrollWidth > clientWidth`), controles táctiles reducidos (<34px) y tipografías microscópicas (<10.5px).
- Evaluación estricta de **Ley de Tesler**, patrones anti-IA y ergonomía industrial de planta.

## 2. Diagnóstico por Módulo
1. **LoginPage (`01_login_desktop.png`)**:
   - Tarjeta saturada con 13 botones y panel de "Acceso Rápido" con hasta 10+ cuentas en `grid-cols-2`.
   - Textos en `text-[9px]` (8.5px computado), ilegibles a distancia. Botones de 24-32px.
   - Ícono `Sparkles` cliché de IA en tab de registro.
2. **PipelineMatrixView (`02_pipeline_matrix.png`, `09_mobile_pipeline.png`)**:
   - Desbordamiento horizontal en móvil (tabla de 480px dentro de 390px, sin sombra de scroll en columna fija).
   - Sobrecarga de KPIs y botones en cabecera (6 botones compitiendo en espacio).
3. **CreateOrderView (`03_nueva_orden.png`)**:
   - Máxima violación a Ley de Tesler: 1299 líneas de código en frontend calculando arrays y rangos de pasos (`1-15, 16-30`).
   - 38 botones y 45 textos < 10.5px. El botón de enviar queda a más de 2000px de scroll vertical.
4. **ChecklistEditorView (`04_checklist_prowork.png`, `05_checklist_ezent.png`)**:
   - 77 botones y 118 textos < 10.5px en EZENT (55 pasos).
   - Ausencia de navegación rápida o índice sticky por secciones (Ensamble vs Limpieza).
5. **OperatorWorkspaceView (`10_operator_workspace_desktop.png`, `11_operator_workspace_mobile.png`)**:
   - Operario debe scrollear 6 bloques previos (cambio estación, supervisor, carrusel PCs, header con 2 barras de progreso, banner V°B°, 4 tarjetas de auditoría) antes de ver el primer checkbox.
   - Desbordamiento horizontal en tablas móviles.
6. **TechniciansManagementView & AuditLogsView (`06_tecnicos.png`, `07_auditoria.png`)**:
   - Filtros ocupan más del 35% del viewport vertical; falta de compactación.

## 3. Próximos Pasos & Reestructuración
- Centralizar presets de orden en backend (1 solo selector: "3 Ensamble + 2 Limpieza" auto-configurado).
- Reducir encabezados del workspace a una barra compacta (modo "Línea Limpia").
- Eliminar tipografías <11px y elevar touch targets a mínimo 44px.

