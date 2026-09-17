---
title: Arquitectura General del Sistema
aliases: [Arquitectura, Stack, Backend, Frontend]
tags: [arquitectura, stack, fastap, react, vite]
---

# 🏛️ Arquitectura General del Sistema

## 1. Principio Rector: Ley de Tesler
> Toda la complejidad operativa, validaciones y reglas de negocio residen en el **Backend**. El frontend permanece limpio, intuitivo y lineal, facilitando el trabajo a los operarios en planta sin requerir capacitación técnica previa.

## 2. Stack Tecnológico
- **Backend**: Python 3.13 con **FastAPI** + **SQLAlchemy**.
  - Servidor ASGI: Uvicorn.
  - Base de datos: PostgreSQL en producción / SQLite local para desarrollo inmediato (`backend/app/qc_kenya.db`).
  - Auth: JWT con roles `ADMIN`, `SUPERVISOR`, `OPERATOR`.
- **Frontend**: **React** + **Vite** + **TailwindCSS** + **Lucide Icons**.
  - PWA / Mobile-first optimizado para pantallas táctiles industriales y smartphones.
- **Memoria & Documentación**: **Obsidian Vault** (`obsidian/`).

## 3. Módulos Clave
- `backend/app/main.py`: Endpoints REST para estaciones, matriz de pipeline, auditoría y supervisión.
- `frontend/src/views/PipelineMatrixView.jsx`: Matriz de avance en tiempo real PC x Estación.
- `frontend/src/views/OperatorWorkspaceView.jsx`: Puesto de trabajo dinámico para técnicos y supervisores.
- `frontend/src/modals/CameraCaptureModal.jsx`: Visor WebRTC para captura fotográfica con torch y zoom.
