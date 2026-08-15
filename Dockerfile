# =======================================================
# STAGE 1: Compilar Frontend React con Vite y Tailwind
# =======================================================
FROM node:20-alpine AS frontend-build

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# =======================================================
# STAGE 2: Servidor de Producción FastAPI (Python 3.12)
# =======================================================
FROM python:3.12-slim

WORKDIR /app

# Dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Dependencias Python
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Código del Backend
COPY backend/ .

# Frontend compilado desde el Stage 1
COPY --from=frontend-build /frontend/dist /app/static

EXPOSE 80

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]
