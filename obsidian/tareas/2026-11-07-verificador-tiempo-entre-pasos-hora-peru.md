---
fecha: 2026-11-07
tipo: feat / auditoria / backend / frontend
estado: completado
tags: [tiempo, hora-peru, duracion, evidencia, auditoria, trazabilidad, bento-apple]
---

# ⏱️ Verificador de Tiempo entre Pasos y Registro de Hora Perú (UTC-5)

## 📋 Contexto y Requerimiento
El usuario solicitó:
> *"agrega un verificador de tiempo entre cada paso, por ejemplo a que hora peru empezo el paso 1 y cuanto tiempo le tomo para tomar la evidencia del paso 2, todo eso que se muestre en su registro tanto del que hace como en las evidencias internas"*

## 🔍 Objetivos Técnicos
1. **Registro Exacto de Hora Perú (UTC-5)**:
   - Formato local de 12 horas con indicación am/pm (ej. `10:34:12 a. m.`), inmune a la zona horaria del servidor o del navegador cliente.
2. **Cálculo de Duración entre Pasos Consecutivos**:
   - Para el Paso #1: Delta transcurrido desde el inicio de la unidad (`unit.started_at` o inicio de sesión en puesto) hasta la captura de evidencia del paso.
   - Para los Pasos #2 en adelante: Delta transcurrido desde la captura del paso inmediatamente anterior hasta la captura del paso actual (`timestamp_actual - timestamp_anterior`).
   - Formateo legible y ergonómico (ej. `45s`, `2m 15s`, `1h 05m`).
3. **Persistencia en Base de Datos**:
   - Añadir la columna `duration_seconds` en `QCStepLog` para auditoría y reportería histórica sin recalculación costosa.
   - Migración automática sin downtime ni pérdida de datos previos.
4. **Visualización en Puesto del Operario ("del que hace")**:
   - Badges Bento Apple en cada tarjeta de paso completado (operario técnico y supervisor).
   - Datos integrados al minivisor de evidencia y en el visor de fotos maximizadas (`PhotoPreviewModal`).
5. **Visualización en Evidencias Internas y Auditoría**:
   - `UnitDetailModal`: Vista de unidades por orden, tarjetas de evidencias de cada paso con hora Perú y duración.
   - `PhotoPreviewModal`: Barra forense inferior con insignias de reloj y cronómetro.
   - `AuditLogsView`: Galería forense de fotos y tabla de logs de auditoría general.

---

## 💡 Solución Implementada

### 1. Base de Datos y Modelo (`backend/app/models.py` & `backend/app/main.py`)
- Se agregó `duration_seconds = Column(Integer, nullable=True)` a la tabla `qc_step_logs`.
- Se incorporó en `auto_migrate_schema()`:
  ```sql
  ALTER TABLE qc_step_logs ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
  ```
- La migración corre automáticamente al arranque del servidor.

### 2. Lógica Backend de Tiempo y Cálculo Forense (`backend/app/main.py`)
- Se definió `PERU_TZ = timezone(timedelta(hours=-5))` para garantizar UTC-5 exacto.
- Se crearon las funciones utilitarias:
  - `format_peru_time(dt)`: Convierte datetimes UTC a hora de Lima (12 horas, ej. `01:01:55 p. m.`).
  - `format_duration(seconds)`: Formatea segundos a cadenas concisas (`45s`, `2m 15s`, `1h 05m`).
  - `compute_log_dict(l, prev_log, unit_start)`: Calcula de forma determinista la duración contra el paso anterior del mismo unit_id o el inicio de la unidad.
- **Endpoint `POST /operator/submit-step`**:
  - Al recibir una evidencia, busca el paso anterior completado (`prev_log`) de la misma PC.
  - Calcula `duration_seconds` y lo almacena directamente en la base de datos.
  - Devuelve en el JSON de respuesta: `peru_time`, `duration_seconds` y `duration_formatted`.
- **Endpoint `GET /operator/{user_id}/station`**:
  - Retorna en `completed_step_logs` y `supervisor_step_logs` los metadatos `peru_time`, `duration_seconds` y `duration_formatted` calculados correlativamente.
- **Endpoint `GET /orders/{order_id}/logs`**:
  - Agrupa los logs por unidad, los ordena cronológicamente y enriquece cada registro con `peru_time`, `duration_seconds` y `duration_formatted`.

### 3. Utilidades y Vistas Frontend (`frontend/src/`)
- **`frontend/src/utils/timeFormat.js`**:
  - Función `formatPeruTime(isoString)` utilizando `Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour12: true, ... })`.
  - Función `formatDuration(seconds)`.
- **`frontend/src/views/OperatorWorkspaceView.jsx`**:
  - Integra badges Bento Apple debajo de las miniaturas de evidencia:
    - `Hora PE: HH:MM:SS` (con icono `Clock`).
    - `Tomó: Xm Ys` (con icono `Timer` y estilo verde esmeralda `bg-emerald-50 text-emerald-800 border-emerald-200`).
  - Aplica tanto a pasos del técnico como a pasos de supervisión e histórico de estaciones anteriores.
- **`frontend/src/modals/PhotoPreviewModal.jsx`**:
  - Muestra en la barra forense inferior la hora local de Lima y la duración del paso junto al técnico y número de paso.
- **`frontend/src/modals/UnitDetailModal.jsx`**:
  - Añade insignias de tiempo a cada foto de inspección interna.
- **`frontend/src/views/AuditLogsView.jsx`**:
  - Presenta badges de hora Perú y tiempo transcurrido en la cuadrícula de fotos y columnas de la tabla de auditoría.

---

## 🧪 Verificación y Pruebas
1. **Script de Verificación Automatizada (`scratch/test_step_timing.py`)**:
   - Registro de Paso #1: Evaluado con Hora Perú (`01:01:53 p. m.`).
   - Espera deliberada de 2 segundos.
   - Registro de Paso #2: Calculado con duración de `2s` (`01:01:55 p. m.`, `Tomó: 2s`).
   - Verificación de `/api/operator/OP-101/station`: Devuelve correlativamente Paso 1 (`0s`) y Paso 2 (`2s`).
   - Verificación de `/api/orders/{order_id}/logs`: Devuelve logs históricos con tiempos calculados.
   - Resultado: **100% de tests aprobados**.
2. **Compilación Vite Frontend**:
   - `rtk npm --prefix frontend run build`: **0 errores**, compilación en 4.44s.

---

## 📁 Archivos Modificados
- `backend/app/models.py`: Columna `duration_seconds` en `QCStepLog`.
- `backend/app/main.py`: Helpers de tiempo, migración, cálculo de deltas y enriquecimiento de endpoints.
- `frontend/src/utils/timeFormat.js`: Utilidades cliente de formateo de Hora Perú y duraciones.
- `frontend/src/views/OperatorWorkspaceView.jsx`: Badges en puesto del operario y supervisor.
- `frontend/src/modals/PhotoPreviewModal.jsx`: Metadatos forenses de tiempo en visor maximizado.
- `frontend/src/modals/UnitDetailModal.jsx`: Trazabilidad de tiempos en detalle de unidad.
- `frontend/src/views/AuditLogsView.jsx`: Trazabilidad de tiempos en galería y tabla de auditoría.
