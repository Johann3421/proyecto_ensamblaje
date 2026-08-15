# 🖥️ QC KENYA - Sistema de Control de Calidad en Cadena (Pipeline Industrial)

Sistema web de Control de Calidad (QC) en línea de ensamble continua para computadoras **KENYA** (Modelos *PROWORK, GENWORK, OFISZU, RAITO*), desarrollado con **React**, **Tailwind CSS**, **Python FastAPI**, **PostgreSQL** y listo para despliegue en **Dokploy**.

---

## 🚀 Características Principales

1. **Flujo en Cadena (Pipeline Continuo)**:
   - Cada PC viaja de estación en estación sin cuellos de botella.
   - El Operario 1 audita la PC #1 (ej. pasos 1 al 11). Al enviar a la Estación 2, el Operario 1 comienza de inmediato la PC #2 mientras el Operario 2 continúa la PC #1.
2. **División Inteligente de Checklists**:
   - El sistema toma el checklist total del modelo (ej. 52 pasos) y lo distribuye equitativamente entre los $N$ operarios/estaciones asignadas.
3. **Auditoría Forense Inmutable**:
   - Cada check guarda en la base de datos: `ID_Usuario`, `Nombre`, `Fecha`, `Hora exacta`, `Paso`, `Estación` y `Estado`.
4. **Editor de Modelos con Importador/Exportador Excel (.xlsx)**:
   - Descarga y sube plantillas oficiales en Excel con un solo clic.
   - Gestor multimedia para adjuntar GIFs animados y fotos instructivas por paso.
5. **Panel de Monitoreo en Vivo (Pipeline Live Matrix)**:
   - Visualización matricial de las 50 PCs en tiempo real por colores:
     - 🟢 **Verde**: Estación completada / Aprobado.
     - 🟠 **Naranja**: En revisión activa en la estación.
     - 🔴 **Rojo**: Incidencia / Falla reportada (bloqueada).
     - ⚪ **Gris**: En cola de espera.
6. **Reasignación de Emergencia**:
   - Permite transferir la carga de un operario que se ausente a otro técnico conservando el histórico inmutable anterior.
7. **Modo Operario Táctil (Tablet / Móvil)**:
   - Botones táctiles grandes (touch targets $\ge 48\text{px}$).
   - Visor de GIFs instructivos a pantalla completa.
   - Botón de despacho rápido "Finalizar mi parte y Enviar a Siguiente Estación".

---

## 🚢 Despliegue en Dokploy (Paso a Paso)

Este repositorio contiene la configuración nativa de `docker-compose.yml` para desplegar en Dokploy:

1. **En tu panel de Dokploy**:
   - Ve a **Projects** > **Create Project** (ej. `QC-KENYA`).
   - Crea un nuevo servicio seleccionando **Compose** o **Application**.
2. **Conectar Repositorio**:
   - Conecta tu repositorio de GitHub / Git donde se encuentra este proyecto.
   - Rama: `main` (o `master`).
3. **Variables de Entorno**:
   - Copia las variables de `.env.example` en la pestaña de **Environment** en Dokploy:
     ```env
     POSTGRES_USER=qc_admin
     POSTGRES_PASSWORD=TuPasswordSeguroAqui!
     POSTGRES_DB=qc_kenya_db
     PORT=80
     ```
4. **Desplegar**:
   - Haz clic en **Deploy**. Dokploy levantará automáticamente los contenedores de PostgreSQL, Backend FastAPI y Frontend Nginx.

---

## 💻 Ejecución Local Rápida (Desarrollo)

### 1. Iniciar Backend FastAPI:
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
* Documentación interactiva de la API: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Iniciar Frontend:
Abre directamente `frontend/index.html` en tu navegador o levanta un servidor estático:
```bash
cd frontend
python -m http.server 3000
```
* Accede a la aplicación en: [http://127.0.0.1:3000](http://127.0.0.1:3000)

---

## 📊 Estructura del Proyecto
```
QC/
├── backend/
│   ├── app/
│   │   ├── database.py         # Conexión SQLAlchemy (PostgreSQL / SQLite fallback)
│   │   ├── models.py           # Modelos de Base de Datos
│   │   ├── schemas.py          # Esquemas Pydantic
│   │   ├── seed_data.py        # Carga inicial de los 52 pasos de control_de_calidad.txt
│   │   ├── excel_handler.py    # Importación y exportación de Excel (.xlsx)
│   │   └── main.py             # API REST FastAPI
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── index.html              # Shell HTML con Tailwind y fuentes Fluent
│   ├── app.jsx                 # Aplicación React completa (Admin & Operario)
│   ├── nginx.conf              # Reverse proxy de producción
│   └── Dockerfile
├── docker-compose.yml          # Orquestación para Dokploy (Postgres + Backend + Frontend)
├── control_de_calidad.txt      # Checklist maestro oficial de 52 pasos
├── .env.example
└── README.md
```
