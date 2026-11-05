---
fecha: 2026-11-05
tipo: refactor_seguridad_ux
estado: completado
tags:
  - bento_apple
  - aside_layout
  - ley_de_tesler
  - seguridad
  - fastapi
  - postgresql
---

# Tarea: Layout Aside en Puesto de Trabajo & Blindaje de Seguridad en Logs

## Contexto y Objetivo
1. **Auditoría de Logs**:
   - Detección de escaneo automatizado web (fuzzing de archivos `.env`, `.git`, `.php`, Spring Actuator) con respuestas `200 OK` debidas al *catch-all* de la SPA de React en FastAPI.
   - Detección de escaneo directo al puerto 5432 de PostgreSQL (`invalid length of startup packet`, `unsupported frontend protocol`) causado por mapeo a `0.0.0.0` en `docker-compose.yml`.
2. **Reestructuración de Layout con `<aside>`**:
   - Implementación de la **Opción 2**: Split layout ergonómico Bento Apple con `<aside>` lateral fijo a la izquierda en `OperatorWorkspaceView.jsx`.
   - Ubicación del botón de despacho y resumen de la PC activa en el panel lateral siempre visible (Ley de Fitts y Ley de Tesler), evitando el scroll vertical continuo a través de los pasos del checklist.

## Causa Raíz
1. **Rutas 200 en escaneos**: FastAPI servía `index.html` con status 200 para cualquier ruta inexistente (`@app.get("/{full_path:path}")`), confirmando falsos positivos a bots de reconocimiento.
2. **Postgres expuesto**: El puerto de la base de datos estaba expuesto a todas las interfaces (`- "${POSTGRES_PORT:-5415}:5432"`), permitiendo que escáneres de internet sondearan el puerto de la base de datos.
3. **Ergonomía en puestos de ensamblaje**: La vista de operario utilizaba una sola columna estrecha (`max-w-xl`), forzando al técnico a realizar scroll arriba y abajo entre el checklist de 20+ pasos y el botón de despacho.

## Solución Técnica

### 1. Blindaje de Seguridad (Backend & Docker)
- **Restricción de Postgres**: En `docker-compose.yml`, se vinculó el puerto estrictamente a localhost:
  ```yaml
  ports:
    - "127.0.0.1:${POSTGRES_PORT:-5415}:5432"
  ```
- **Filtro de Escaneos y Path Traversal**: En `backend/app/main.py`, se implementó interceptor previo a `serve_react_app`:
  - Bloqueo con `HTTP 404` para archivos ocultos (`.env*`, `.git*`, `.*`), prefijos sospechosos (`actuator`, `php`, `wp-`, `bin/`) y extensiones comunes de sondeo (`.php`, `.bak`, `.old`, `~`, `.ini`, `.conf`, `.sql`, `.sh`, `.yml`).
  - Bloqueo con `HTTP 403` para intentos de path traversal fuera de `STATIC_DIR`.

### 2. Layout Ergonómico con `<aside>` en Puesto de Trabajo
- En `frontend/src/views/OperatorWorkspaceView.jsx`:
  - Contenedor ampliado a `max-w-7xl` con distribución modular (`grid grid-cols-1 lg:grid-cols-12 gap-5`).
  - **Panel Izquierdo (`<aside className="lg:col-span-4 xl:col-span-4 lg:sticky lg:top-18 space-y-4">`)**:
    - Ficha de la PC activa (número grande, número de serie, botones de acción rápida *Derivar* y *Falla*).
    - Barra de progreso Bento Apple grande con porcentaje.
    - **Botón Primario de Despacho** siempre visible en pantalla fija sin scroll (Ley de Fitts).
    - Protocolo y certificación del supervisor (si aplica).
    - Selector rápido de PCs en estación y cola de siguientes PCs.
  - **Área Principal (`<main className="lg:col-span-8 xl:col-span-8 space-y-4">`)**:
    - Cabecera del checklist de la estación con cantidad de pasos.
    - Pasos heredados de estaciones previas.
    - Lista de pasos interactivos con checkbox táctil, evidencia fotográfica y registro de técnicos.
    - Tarjeta de confirmación y cierre al final del checklist.

## Archivos Modificados
- `backend/app/main.py`
- `docker-compose.yml`
- `frontend/src/views/OperatorWorkspaceView.jsx`

## Verificación
- Compilación del frontend Vite: exitosa en 4.93s (`dist/index.html`, `dist/assets/index-D2IQf2M6.js`, `dist/assets/index-dUofOctB.css`).
- Verificación visual con Playwright: captura de pantalla completa almacenada en `screenshots/bento_apple_operator_aside_view.png`.
