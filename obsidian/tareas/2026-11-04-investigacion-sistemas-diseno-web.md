---
fecha: 2026-11-04
tipo: ux / arquitectura
estado: completado
tags: [diseno-web, ui, ux, ergonomia, sistemas-visuales]
---

# 🎨 Investigación y Propuestas de Sistemas de Diseño Web

## 1. Contexto y Cuestionamiento del Enfoque Previo
El usuario cuestionó acertadamente los parámetros previos denominados "Sistema Visual Industrial (Anti-IA, Sobrio y de Alto Contraste)".
- **¿Por qué sombrío?**: Se produjo una interpretación errónea de la palabra "sobrio" (austero/moderado) tratándola como "sombrío" (fondos negros opresivos, tonos apagados y aspecto de monitor industrial antiguo de los 90). En aplicaciones web de operaciones, los fondos oscuros densos generan pesadez visual y rechazo del usuario.
- **¿Por qué alto contraste?**: El alto contraste rígido (blanco puro contra negro puro o bordes agresivos) causa fatiga ocular severa tras más de 30 minutos continuos de uso. Los sistemas modernos aplican **contraste armónico** (jerarquía tipográfica, micro-sombras multicapa y fondos luminosos relajados).

## 2. Investigación de Sistemas de Diseño Modernos para Web Apps
Se investigaron y maquetaron 4 paradigmas contemporáneos del desarrollo web:

1. **Linear Modern Clean (SaaS Moderno de Alta Precisión)**:
   - *Referencia*: Linear.app, Vercel, Raycast.
   - *Características*: Fondos ultra limpios (`#FFFFFF` / `#F8FAFC`), bordes de 1px muy finos (`#E2E8F0`), tipografía nítida (Geist / Inter), acentos azul eléctrico (`#2563EB`) o violeta índigo, badges con fondos tenues. Alta densidad sin abarrotar.
   - *Sensación*: Ágil, quirúrgico, moderno, ligero.

2. **Stripe / Tailwind Enterprise (Corporativo Moderno y Confiable)**:
   - *Referencia*: Stripe Dashboard, Shopify Polaris, GitHub.
   - *Características*: Fondos perla suave (`#F8FAFC`), tarjetas blancas con sombras suaves multicapa (`box-shadow: 0 1px 3px rgba(0,0,0,0.05)`), bordes sutiles redondeados (10px).
   - *Sensación*: Confiabilidad máxima, diseñado ergonómicamente para jornadas de 8+ horas continuas.

3. **Bento Grid / Apple Modular (Modular, Limpio y Espacioso)**:
   - *Referencia*: Apple macOS/iOS, Figma, Linear Insights.
   - *Características*: Tarjetas modulares con esquinas generosas (`rounded-2xl` ~ 16-24px), métricas destacadas con tipografía de alto impacto, separación por bloques visuales.
   - *Sensación*: Intuitivo, premium, espacioso, reduce al mínimo la curva de aprendizaje.

4. **Nordic Warm / Notion Minimal (Cálido y Humano)**:
   - *Referencia*: Notion, Craft, Basecamp.
   - *Características*: Fondos cálidos marfil (`#FAFAF8`), bordes piedra suave (`#EBE9E5`), acentos verde salvia y terracota.
   - *Sensación*: Cero intimidante, acogedor, calmado.

## 3. Entregables Interactivos
- Archivo interactivo local: `preview_disenos.html` con pestañas interactivas y código HTML/CSS real de cada estilo aplicado al flujo de checklist, orden y estaciones del sistema.
- Capturas de pantalla de alta fidelidad generadas con Playwright en `brain/.../screenshots/`:
  - `diseno_01_linear.png`
  - `diseno_02_stripe.png`
  - `diseno_03_bento.png`
  - `diseno_04_nordic.png`
  - `diseno_comparativa_full.png`

