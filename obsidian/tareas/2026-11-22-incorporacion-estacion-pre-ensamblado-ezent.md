---
title: Incorporación de Estación de Pre-ensamblado (5 Pasos Técnicos) en Checklist EZENT (CYBERTEL)
fecha: 2026-11-22
tipo: feat
estado: completado
tags: [checklist, pre-ensamblado, ezent, memtest, occt, drivers, tesler, estaciones]
---

# 🛠️ Incorporación de Estación de Pre-ensamblado en EZENT (CYBERTEL)

## 1. Contexto y Requerimiento
El usuario solicitó añadir una estación técnica previa de **Pre-ensamblado** con 5 puntos de verificación obligatorios y captura de evidencia fotográfica al modelo `EZENT (CYBERTEL)` (y sincronizado en `EZENT`):
1. **MemTest:** Diagnóstico y estrés de memoria RAM.
2. **Instalar SO:** Instalación limpia de Windows 11 Pro.
3. **OCCT:** Prueba de estrés y estabilidad de CPU, memoria y fuente.
4. **DRIVERS:** Instalación y comprobación de controladores sin advertencias en Administrador de Dispositivos.
5. **VERIFICACIÓN DE TEMPERATURA:** Monitoreo térmico bajo carga (< 75°C - 80°C).

Se acordó implementar la **Opción A (Pre-ensamble de Banco)**, ubicando estos 5 puntos como los **Pasos 1 al 5** de la secuencia técnica, desplazando los pasos posteriores de armado físico y preservando intactos los pasos de limpieza y empaque final.

---

## 2. Cambios Técnicos Realizados

### A. Checklist de Producción (`EZENT (CYBERTEL)` y `EZENT`)
* Se insertaron los 5 nuevos pasos canónicos al inicio de la secuencia:
  * **Paso 1:** `Prueba de Memoria RAM (MemTest)` (Foto de pantalla con 0 errores).
  * **Paso 2:** `Instalación de Sistema Operativo` (Foto de pantalla de primer inicio / escritorio Windows 11 Pro).
  * **Paso 3:** `Prueba de Estrés y Rendimiento (OCCT)` (Foto de prueba de estabilidad finalizada sin caídas).
  * **Paso 4:** `Instalación y Verificación de Drivers` (Foto de Administrador de Dispositivos sin advertencias).
  * **Paso 5:** `Verificación de Temperatura bajo Carga` (Foto de telemetría térmica HWMonitor/OCCT dentro de tolerancia).
* **Desplazamiento canónico:**
  * Los pasos previos de ensamble (antiguos 1..42) pasaron a ser **6..47**.
  * Los pasos de limpieza y empaque final (antiguos 43..55) pasaron a ser **48..60**.
  * Total de pasos: **60 pasos**.

### B. Backend (`backend/app/main.py`)
* Se implementó la función de migración `add_pre_assembly_steps_to_ezent(db)` e integró en el ciclo de inicio `startup_db_init()`, garantizando idempotencia ante cualquier reinicio o redeploy en Dokploy.

### C. Frontend (`frontend/src/views/CreateOrderView.jsx`)
* Se actualizó `DEFAULT_ASSEMBLY_NAMES` para incluir `"Pre-ensamblado y Banco de Pruebas"` como la primera estación por defecto en la creación de órdenes de ensamble.

---

## 3. Verificación
* Verificación en vivo en la API de producción (`https://ensamblaje.sekaitech.com.pe/api/models/EZENT%20(CYBERTEL)/checklist`):
  * Total: **60 pasos** exactos, 47 de Ensamblaje/Pruebas y 13 de Limpieza/Empaque.
  * Secuencia canónica 1..60 sin saltos ni duplicados.
