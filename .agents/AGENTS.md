# Reglas Primordiales del Proyecto (Diseño, UX & Arquitectura)

> **REGLA ABSOLUTA:** Antes de diseñar o programar cualquier parte de este sistema, sigue siempre estas reglas base, sin excepción, junto con las instrucciones específicas de cada tarea.

## Sistema de Diseño Oficial: Bento Grid / Apple Modular
El proyecto utiliza de forma oficial y obligatoria el sistema visual **Bento Apple**:
1. **Paleta Luminosa y Ergonomía Visual**:
   - **Fondo de aplicación**: Platino ultra suave (`#F5F5F7`), nunca negro, gris plomo ni colores sombríos que provoquen depresión o fatiga visual.
   - **Tarjetas y Módulos**: Blanco puro (`#FFFFFF`) con bordes sutiles ultra limpios (`#E5E5EA` o `#F0F0F2`) y sombras tenues (`box-shadow: 0 4px 20px rgba(0,0,0,0.02)`).
   - **Acentos Funcionales**: Azul Apple (`#0071E3`), verde menta para aprobaciones/éxito (`#34C759`), naranja cítrico para alertas o fotos pendientes (`#FF9500`), texto primario gris carbón nítido (`#1D1D1F`) y secundario (`#86868B`).
2. **Geometría y Bordes Redondeados (Bento Apple)**:
   - Tarjetas y contenedores modulares: `rounded-2xl` a `rounded-3xl` (16px a 24px).
   - Botones, selectores e inputs: `rounded-xl` (10px a 12px) o cápsula completa (`rounded-full` / 9999px para píldoras y badges).
   - Distribución en bloques modulares que agrupen la información de forma intuitiva, con espaciado generoso (`gap-4` a `gap-6`).
3. **Ley de Tesler**: Toda la complejidad va en el backend (validaciones, cálculos, reglas de negocio, orquestación de datos). El frontend debe ser lo más simple posible, con pocos pasos y decisiones visibles, de modo que hasta un niño o una persona sin conocimientos técnicos pueda usarlo sin explicación previa. Nunca traslades al usuario una decisión que el sistema puede resolver solo.
4. **Evita que el diseño "huela" a IA**: No uses gradientes genéricos morado-azul, glassmorphism excesivo, sombras neón ni emojis como iconografía principal. Usa iconografía sobria (Lucide React) y una arquitectura limpia y profesional.
5. **Patrones reales vs patrones automáticos**: Inspirarse en el diseño ergonómico de Apple Settings/macOS, Linear Insights y tableros modernos de operaciones, optimizados tanto para pantallas táctiles en línea de producción como para escritorios de supervisión.
6. **Prioriza simplicidad funcional**: Menos pantallas, menos clics, menos campos. Si algo se puede inferir o automatizar, no se le pregunta al usuario. Usa mensajes de error y ayuda en lenguaje humano, no técnico. Los flujos deben ser lineales y predecibles.
7. **Mantén el backend limpio y mantenible**: Separa lógica de negocio, acceso a datos y presentación; usa nomenclatura clara y consistente en todo el proyecto; nunca pongas lógica de negocio en el frontend.
8. **Distribución y Jerarquía Estricta de Botones (Regla 1-1-··· y Fitts)**:
   - **Nunca acumular más de 1 botón primario por barra o bloque**: El ojo del usuario solo debe percibir una acción principal destacada a la vez.
   - **Regla 1-1-···**: 1 botón primario (Azul Apple), 1 secundario frecuente (blanco con borde neutro), y menú de desbordamiento (`···`) para acciones destructivas (*Eliminar*, *Reiniciar Lote*) o infrecuentes (*Reasignar*, *Refrescar*).
   - **Cápsulas de utilidades fusionadas**: Herramientas complementarias (*Importar*, *Exportar*, *Plantilla*) deben agruparse en una sola cápsula segmentada (`btn-group`), eliminando el desorden de botones sueltos.
   - **Ley de Fitts en tarjetas de paso y operario**: Acción principal al extremo derecho (área táctil amplia), paso previo de evidencia (*Subir Foto*) en el medio, y acciones de riesgo o incidencia (*Reportar Falla*) aisladas al extremo izquierdo para evitar clics accidentales.

---

# Reglas de Estilo de Desarrollo (Ponytail & Caveman)

## Ponytail (Lazy Senior Developer)
- YAGNI: ¿Hace falta? Si no, omite.
- Reutiliza código existente, stdlib o funciones nativas antes de escribir nuevo código.
- Dif mínimo y más simple que funcione.
- Sin abstracciones ni boilerplate innecesario.
- Bug fix en causa raíz, no en síntoma.
- **Comandos de activación por prompt:**
  - `auditar` / `audit` / `ponytail audit`: Ejecuta análisis completo de sobre-ingeniería y código muerto.
  - `deuda` / `debt` / `ponytail debt`: Extrae comentarios `ponytail:` del código.
  - `ponytail lite` | `full` | `ultra`: Cambia la intensidad de simplificación.

## Caveman (Compresión de respuestas)
- Responder directo, preciso y sin relleno ni cortesías innecesarias.
- Mantener máxima exactitud técnica.
- Preservar nombres de código, comandos, errores y lenguaje del usuario (Español).
- **Comandos de activación por prompt:**
  - `caveman review`: Revisa código con compresión máxima.
  - `caveman lite` | `full` | `ultra`: Cambia nivel de brevedad.

---

# Protocolo Obligatorio de Memoria & Bitácora en Obsidian

> **Bóveda del Proyecto:** Carpeta `obsidian/` en la raíz del repositorio. Compatible 100% con Obsidian (Markdown estándar, enlaces `[[...]]`, tags `#...` y frontmatter YAML).

1. **Registro Automático al Finalizar Cada Tarea**:
   - Al terminar cualquier requerimiento, bugfix o función nueva, el agente DEBE crear inmediatamente la nota técnica en `obsidian/tareas/YYYY-MM-DD-nombre-tarea.md`.
   - Registrar la entrada cronológica con enlace wiki en `obsidian/BITACORA_TAREAS.md`.
   - Estructura de la nota: YAML frontmatter (`fecha`, `tipo`, `estado`, `tags`), Descripción, Causa Raíz, Solución Técnica, Archivos Modificados y Verificación.
2. **Resiliencia ante Compactación de Contexto**:
   - Tras cualquier compactación o reanudación de sesión, consultar primero `obsidian/BITACORA_TAREAS.md` y `obsidian/00_INDICE.md` para recuperar el estado exacto sin pérdida de contexto ni re-preguntas.
3. **Mantenimiento de Arquitectura Viva**:
   - Si una tarea modifica flujos o reglas de negocio clave (estaciones, supervisión, fotos, hardware), actualizar su nota en `obsidian/arquitectura/`.
