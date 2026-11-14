---
fecha: 2026-11-13
tipo: fix / backend / frontend / tesler
estado: completado
tags: [timezone, hora-peru, utc, iso8601, tesler, jakob, logs, auditoria]
---

# 🕒 Fix: Corrección de Desfase Horario UTC a Hora Perú (America/Lima) en Evidencias y Registros

## 📋 Contexto y Reporte del Usuario
El usuario reportó:
> *"fijate en la hora, esta correcta tambien? por que algunos pasos se hicieron en la mañana pero se muestran horas de la noche, investiga y solucionalo"*

## 🔍 Causa Raíz Identificada
1. **Serialización sin 'Z' en Backend (`backend/app/main.py`)**:
   - SQLite almacena timestamps con `datetime.utcnow()` como datetimes ingenuos (`tzinfo=None`).
   - Al serializar los timestamps a JSON (`l.timestamp.isoformat()`), el backend producía strings como `"2026-11-11T17:20:21.864181"`, carentes del indicador `'Z'` o desfase UTC.
2. **Interpretación Naive en JavaScript (`frontend/src/utils/timeFormat.js`)**:
   - Por estándar ECMAScript, al ejecutar `new Date("YYYY-MM-DDTHH:MM:SS")` sin `'Z'`, el navegador lo parsea como **HORA LOCAL** del cliente en vez de UTC.
   - En consecuencia, una acción registrada a las 17:20 UTC (12:20 PM en Perú) se parseaba como las 17:20 (05:20 PM).
   - Acciones registradas a las 21:38 UTC (16:38 en Perú) se interpretaban como 21:38 hora local (**09:38 p. m. - noche**).
   - Pasos realizados en la mañana (ej. 14:12 UTC = 09:12 AM en Perú) se mostraban erróneamente en la tarde (02:12 PM), y pasos de la tarde/noche sufrían un desfase de 5 horas.
3. **Estado Incompleto en Frontend (`OperatorWorkspaceView.jsx`)**:
   - En `handleToggleStep`, al aprobar un paso sin foto, no se capturaba la respuesta `res.json()`, dejando `peru_time`, `peru_date` y `peru_datetime` indefinidos en el mapa local de logs del operario.
   - En la tarjeta de auditoría de supervisión (Línea 1091), se utilizaba `toLocaleDateString()` y `toLocaleTimeString()` sin pasar por el convertidor canónico de zona horaria de Perú.

## 💡 Solución Implementada

### 1. Backend (`backend/app/main.py`)
- **Función de serialización UTC canónica `to_utc_iso(dt)`**:
  - Asegura que cualquier datetime exportado a JSON lleve explícitamente la terminación `'Z'`:
    ```python
    def to_utc_iso(dt: Optional[datetime]) -> Optional[str]:
        if not dt: return None
        dt_utc = dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)
        return dt_utc.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
    ```
- **Normalización en todos los endpoints**:
  - `compute_log_dict`: `"timestamp": to_utc_iso(l.timestamp)`.
  - `/orders/{order_id}/logs`: `"timestamp": to_utc_iso(l.timestamp)`.
  - `/operator/submit-step`: `"timestamp": to_utc_iso(new_log.timestamp)`.
  - `/supervisor/verify-step-photo`: `"timestamp": to_utc_iso(supervisor_log.timestamp)`.
  - Auditorías de supervisión en `get_operator_workspace` y `/supervisor/unit/...`: serialización canónica con `to_utc_iso` e inclusión de `peru_time`, `peru_date`, `peru_datetime`.

### 2. Frontend (`frontend/src/utils/timeFormat.js`)
- **Parser Defensivo `parseAsUtcDate(input)`**:
  - Normaliza cualquier cadena de fecha o timestamp de SQLite (`replace(' ', 'T')`).
  - Si no termina en `'Z'` ni contiene offset (`[+-]\d{2}(:\d{2})?$`), le anexa `'Z'`, forzando a que JavaScript siempre lo interprete como UTC.
  - Al alimentar a `Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima' })`, garantiza la conversión exacta e inequívoca a UTC-5.

### 3. Frontend (`frontend/src/views/OperatorWorkspaceView.jsx`)
- En `handleToggleStep`: se parsea la respuesta del API (`const data = await res.json().catch(() => ({}))`) asignando `peru_time`, `peru_date`, `peru_datetime` y duraciones devueltas por el servidor.
- En la tarjeta de auditoría de supervisión (Línea 1091): se reemplazó `new Date().toLocaleTimeString()` por `formatPeruDate(activeSupervisorAudit.created_at)` y `formatPeruTime(activeSupervisorAudit.created_at, false)`.

## 🧪 Verificación y Pruebas
1. **Tests Automatizados de Timestamps (`scratch/test_step_timing.py`)**:
   - `submit-step` Paso 1 y Paso 2: serialización correcta con `'Z'`, `peru_time` coherente en formato 12h (`a. m.` / `p. m.`) y medición de duración precisa. 100% aprobado.
2. **Simulación en Node.js de parsing de fechas históricas**:
   - `2026-10-23 14:12:25` (Paso 2) -> `23/10/2026, 09:12:25 a. m.` (Mañana).
   - `2026-11-07 21:38:33` -> `07/11/2026, 04:38:33 p. m.` (Tarde).
   - `2026-11-13T23:56:37` -> `13/11/2026, 06:56:37 p. m.` (Hora exacta Perú).
3. **Compilación Vite de Producción**:
   - `rtk npm --prefix frontend run build` compiló sin errores en 4.66s.

## 📁 Archivos Modificados
- `backend/app/main.py`: Función `to_utc_iso` y normalización de ISO timestamps y auditorías.
- `frontend/src/utils/timeFormat.js`: Implementación de `parseAsUtcDate` y defensa contra desfases UTC.
- `frontend/src/views/OperatorWorkspaceView.jsx`: Captura de `peru_time` en `handleToggleStep` y formateo de auditoría.
- `obsidian/BITACORA_TAREAS.md`: Registro de bitácora y persistencia técnica.
