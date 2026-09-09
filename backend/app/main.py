import os
import shutil
import time
import re
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Response, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text, func
from sqlalchemy.orm import Session

from .database import engine, Base, SessionLocal, get_db
from .models import QCUser, QCModel, QCChecklistItem, QCOrder, QCStationAssignment, QCPCUnit, QCStepLog, QCIssue, QCStepStationOverride, QCSupervisorAudit
from .schemas import (
    QCUserSchema, QCUserCreate, QCUserUpdate, AddUnitsRequest, ModelSchema, ChecklistItemSchema,
    OrderCreateRequest, OrderUpdateRequest, OrderDetailSchema, StationAssignmentCreate, StationAssignmentSchema,
    StepLogCreate, StepLogSchema, StepUncheckRequest,
    IssueCreate, IssueSchema,
    ReassignEmergencyRequest, TransferUnitRequest, StepReassignRequest,
    SupervisorAuditCreate, SupervisorAuditSchema, SupervisorStepPhotoVerify,
    AuthRegister, AuthLogin, TokenResponse
)
from .seed_data import seed_database, DEFAULT_USERS, PROWORK_52_STEPS
from .excel_handler import generate_checklist_excel, parse_checklist_excel, generate_checklist_template
from .auth import hash_password, verify_password, create_access_token, require_auth

app = FastAPI(
    title="QC KENYA - API de Control de Calidad Industrial",
    description="Sistema de Flujo en Cadena (Pipeline) para Control de Calidad de Computadoras KENYA",
    version="2.0.0"
)

# Logger HTTP para Dokploy
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    print(f"[HTTP] {request.method} {request.url.path} -> {response.status_code} ({process_time:.1f}ms)")
    return response

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar carpeta de uploads para fotos
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Migraciones automáticas seguras
@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    migrations = [
        "ALTER TABLE qc_users ADD COLUMN IF NOT EXISTS email VARCHAR(150);",
        "ALTER TABLE qc_users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);",
        "ALTER TABLE qc_users ADD COLUMN IF NOT EXISTS avatar VARCHAR(255);",
        "ALTER TABLE qc_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE qc_issues ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);",
        "ALTER TABLE qc_step_logs ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);",
        "ALTER TABLE qc_step_logs ADD COLUMN IF NOT EXISTS is_supervisor_verified BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE qc_station_assignments ADD COLUMN IF NOT EXISTS is_cleaning_station BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE qc_station_assignments ADD COLUMN IF NOT EXISTS station_type VARCHAR(50) DEFAULT 'ASSEMBLY';",
        "ALTER TABLE qc_station_assignments ADD COLUMN IF NOT EXISTS step_numbers TEXT;",
        "ALTER TABLE qc_station_assignments ADD COLUMN IF NOT EXISTS secondary_user_id VARCHAR(50);",
        "ALTER TABLE qc_station_assignments ADD COLUMN IF NOT EXISTS secondary_user_name VARCHAR(100);",
        "ALTER TABLE qc_orders ADD COLUMN IF NOT EXISTS supervisor_id VARCHAR(50);",
        "ALTER TABLE qc_orders ADD COLUMN IF NOT EXISTS supervisor_name VARCHAR(100);",
        "ALTER TABLE qc_supervisor_audits ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);",
        "ALTER TABLE qc_checklist_items ADD COLUMN IF NOT EXISTS is_cleaning BOOLEAN DEFAULT FALSE;",
        """UPDATE qc_checklist_items
           SET is_cleaning = TRUE
           WHERE LOWER(operation) LIKE '%limpieza%'
              OR LOWER(operation) LIKE '%limpiar%'
              OR LOWER(operation) LIKE '%película%'
              OR LOWER(operation) LIKE '%pelicula%'
              OR LOWER(description) LIKE '%limpieza%'
              OR LOWER(description) LIKE '%microfibra%'
              OR step_number IN (12, 13, 14, 43, 52);""",
        """CREATE TABLE IF NOT EXISTS qc_step_station_overrides (
            id SERIAL PRIMARY KEY,
            order_id VARCHAR(50) NOT NULL,
            unit_number INTEGER,
            step_number INTEGER NOT NULL,
            from_station INTEGER NOT NULL,
            target_station INTEGER NOT NULL,
            transferred_by VARCHAR(100) NOT NULL,
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );""",
    ]
    for sql in migrations:
        try:
            with engine.connect() as conn:
                conn.execute(text(sql))
                conn.commit()
        except Exception:
            try:
                # Fallback sintaxis sin IF NOT EXISTS (ej. SQLite)
                with engine.connect() as conn:
                    conn.execute(text(sql.replace(" IF NOT EXISTS", "")))
                    conn.commit()
            except Exception:
                pass

    # Limpiar sufijos estáticos '(Estación X)' o '(Admin QC)' de la BD para que las estaciones sean 100% dinámicas
    try:
        with SessionLocal() as db:
            users = db.query(QCUser).all()
            for u in users:
                clean = re.sub(r'\s*\([Ee]staci[oó]n\s*\d+\)', '', u.name)
                clean = re.sub(r'\s*\([Aa]dmin\s*QC\)', '', clean)
                clean = re.sub(r'\s*\([Ss]uplente[^)]*\)', '', clean).strip()
                if clean and clean != u.name:
                    u.name = clean

            assignments = db.query(QCStationAssignment).all()
            for a in assignments:
                clean = re.sub(r'\s*\([Ee]staci[oó]n\s*\d+\)', '', a.user_name)
                clean = re.sub(r'\s*\([Aa]dmin\s*QC\)', '', clean)
                clean = re.sub(r'\s*\([Ss]uplente[^)]*\)', '', clean).strip()
                if clean and clean != a.user_name:
                    a.user_name = clean

            db.commit()
    except Exception as e:
        print(f"[Migration] Nota al limpiar nombres de usuarios: {e}")

    print("[DB Migration] Esquema de base de datos verificado y actualizado.")

# Inicialización de base de datos en startup
@app.on_event("startup")
def startup_db_init():
    print("[DB] Verificando tablas y sembrando datos iniciales...")
    for attempt in range(1, 11):
        db_session = None
        try:
            Base.metadata.create_all(bind=engine)
            auto_migrate_schema()
            db_session = SessionLocal()
            seed_database(db_session)
            print(f"[DB] Base de datos y orden inicial sembrada correctamente.")
            break
        except Exception as e:
            print(f"[DB Warning] Intento {attempt}/10 falló: {e}")
            time.sleep(1)
        finally:
            if db_session:
                db_session.close()

# Router de API
api_router = APIRouter()

@api_router.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat(), "service": "QC-KENYA-API"}

# =============================================
# AUTH ENDPOINTS
# =============================================
@api_router.post("/auth/register", response_model=TokenResponse)
def register_user(req: AuthRegister, db: Session = Depends(get_db)):
    """Vincular email y contraseña a un usuario EXISTENTE."""
    # Verificar que el usuario existe
    user = db.query(QCUser).filter(QCUser.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="No se encontró un técnico con ese ID. El administrador debe crear el usuario primero.")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Este usuario está desactivado.")
    
    # Verificar que el email no esté ya en uso
    existing_email = db.query(QCUser).filter(QCUser.email == req.email).first()
    if existing_email and existing_email.id != req.user_id:
        raise HTTPException(status_code=400, detail="Este email ya está registrado por otro usuario.")
    
    # Verificar que el usuario no tenga ya credenciales
    if user.password_hash:
        raise HTTPException(status_code=400, detail="Este usuario ya tiene credenciales registradas. Use login.")
    
    # Registrar credenciales
    user.email = req.email.strip().lower()
    user.password_hash = hash_password(req.password)
    db.commit()
    db.refresh(user)
    
    # Generar token
    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(
        access_token=token,
        user=QCUserSchema.model_validate(user)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
def login_user(req: AuthLogin, db: Session = Depends(get_db)):
    """Autenticar usuario con email o ID y contraseña."""
    identifier = req.email.strip().lower()
    
    # 1. Buscar por email o por ID
    user = db.query(QCUser).filter(
        (func.lower(QCUser.email) == identifier) | 
        (func.lower(QCUser.id) == identifier)
    ).first()
    
    # 2. Si no se encuentra, buscar por coincidencia en nombre
    if not user:
        user = db.query(QCUser).filter(func.lower(QCUser.name).like(f"%{identifier}%")).first()
        
    if not user:
        print(f"[Auth Error] Usuario no encontrado para: '{identifier}'")
        raise HTTPException(status_code=401, detail="Usuario o correo electrónico no encontrado.")
    
    # 3. Auto-healing si no tiene contraseña en base de datos
    if not user.password_hash:
        print(f"[Auth Info] Auto-asignando credenciales para {user.id}")
        default_u = next((u for u in DEFAULT_USERS if u["id"] == user.id), None)
        if default_u and default_u.get("password"):
            user.password_hash = hash_password(default_u["password"])
            if not user.email and default_u.get("email"):
                user.email = default_u["email"].strip().lower()
            db.commit()
            db.refresh(user)
        else:
            raise HTTPException(status_code=401, detail="Este usuario aún no tiene contraseña configurada.")
    
    # 4. Verificar contraseña
    is_valid = verify_password(req.password, user.password_hash)
    if not is_valid:
        # Check fallback con password por defecto
        default_u = next((u for u in DEFAULT_USERS if u["id"] == user.id), None)
        if default_u and req.password == default_u.get("password"):
            # Sincronizar hash
            user.password_hash = hash_password(default_u["password"])
            db.commit()
            db.refresh(user)
            is_valid = True
            
    if not is_valid:
        print(f"[Auth Error] Contraseña incorrecta para usuario {user.id}")
        raise HTTPException(status_code=401, detail="Contraseña incorrecta.")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Usuario desactivado. Contacte al administrador.")
    
    # Auto-healing de roles estándar por seguridad de la línea de producción
    if user.id in ["OP-101", "OP-102", "OP-103", "OP-104", "OP-105", "OP-106"] and user.role != "OPERATOR":
        user.role = "OPERATOR"
        db.commit()
        db.refresh(user)
    elif user.id == "SUP-01" and user.role != "SUPERVISOR":
        user.role = "SUPERVISOR"
        db.commit()
        db.refresh(user)
    elif user.id == "ADM-01" and user.role != "ADMIN":
        user.role = "ADMIN"
        db.commit()
        db.refresh(user)
    
    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(
        access_token=token,
        user=QCUserSchema.model_validate(user)
    )

@api_router.get("/auth/me", response_model=QCUserSchema)
def get_current_user_info(current_user: QCUser = Depends(require_auth), db: Session = Depends(get_db)):
    """Obtener información del usuario autenticado con auto-healing de roles."""
    if current_user.id in ["OP-101", "OP-102", "OP-103", "OP-104", "OP-105", "OP-106"] and current_user.role != "OPERATOR":
        current_user.role = "OPERATOR"
        db.commit()
        db.refresh(current_user)
    elif current_user.id == "SUP-01" and current_user.role != "SUPERVISOR":
        current_user.role = "SUPERVISOR"
        db.commit()
        db.refresh(current_user)
    elif current_user.id == "ADM-01" and current_user.role != "ADMIN":
        current_user.role = "ADMIN"
        db.commit()
        db.refresh(current_user)
    return current_user

@api_router.get("/users", response_model=List[QCUserSchema])
def get_users(include_inactive: bool = False, db: Session = Depends(get_db)):
    query = db.query(QCUser)
    if not include_inactive:
        query = query.filter(QCUser.is_active == True)
    return query.order_by(QCUser.role, QCUser.name).all()

@api_router.post("/users", response_model=QCUserSchema)
def create_user(req: QCUserCreate, db: Session = Depends(get_db)):
    user_id = req.id.strip() if req.id else f"OP-{int(time.time()) % 10000:04d}"
    existing = db.query(QCUser).filter(QCUser.id == user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="El ID del usuario ya existe")
    
    avatar = req.avatar
    if not avatar:
        parts = req.name.strip().split()
        avatar = "".join([p[0].upper() for p in parts[:2]]) if parts else "OP"
        
    new_user = QCUser(
        id=user_id,
        name=req.name.strip(),
        role=req.role,
        avatar=avatar,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@api_router.put("/users/{user_id}", response_model=QCUserSchema)
def update_user(user_id: str, req: QCUserUpdate, db: Session = Depends(get_db)):
    user = db.query(QCUser).filter(QCUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if req.name is not None:
        user.name = req.name.strip()
        # Actualizar en cascada en las asignaciones de estación activas
        db.query(QCStationAssignment).filter(QCStationAssignment.user_id == user_id).update({
            "user_name": user.name
        })
    if req.role is not None:
        user.role = req.role
    if req.avatar is not None:
        user.avatar = req.avatar
    elif req.name is not None:
        parts = req.name.strip().split()
        user.avatar = "".join([p[0].upper() for p in parts[:2]]) if parts else user.avatar
    if req.is_active is not None:
        user.is_active = req.is_active

    db.commit()
    db.refresh(user)
    return user

@api_router.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(QCUser).filter(QCUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Si tiene asignaciones activas, se desactiva en vez de borrar físicamente
    active_assignments = db.query(QCStationAssignment).filter(QCStationAssignment.user_id == user_id).count()
    if active_assignments > 0:
        user.is_active = False
        db.commit()
        return {"message": f"Técnico {user.name} desactivado (conserva histórico)"}
    
    db.delete(user)
    db.commit()
    return {"message": f"Técnico {user.name} eliminado exitosamente"}

@api_router.get("/models")
def get_models(db: Session = Depends(get_db)):
    models = db.query(QCModel).all()
    results = []
    for m in models:
        step_count = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == m.name).count()
        results.append({
            "id": m.id,
            "name": m.name,
            "description": m.description,
            "step_count": step_count,
            "created_at": m.created_at
        })
    return results

@api_router.post("/models")
def create_model(data: dict, db: Session = Depends(get_db)):
    name = data.get("name", "").strip().upper()
    if not name:
        raise HTTPException(status_code=400, detail="El nombre del modelo es requerido")
    existing = db.query(QCModel).filter(QCModel.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"El modelo '{name}' ya existe")
    
    new_model = QCModel(name=name, description=data.get("description", ""))
    db.add(new_model)
    db.commit()
    db.refresh(new_model)

    # Opciones de plantilla inicial de pasos
    init_template = data.get("template", "STANDARD")  # "STANDARD", "CLONE", "EMPTY"
    clone_from = data.get("clone_from")

    if init_template == "CLONE" and clone_from:
        source_items = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == clone_from).order_by(QCChecklistItem.step_number).all()
        for it in source_items:
            db.add(QCChecklistItem(
                model_name=name,
                step_number=it.step_number,
                operation=it.operation,
                description=it.description,
                qc_criteria=it.qc_criteria,
                media_url=it.media_url,
                media_type=it.media_type
            ))
        db.commit()
    elif init_template == "STANDARD":
        for num, op, desc, crit, media, mtype in PROWORK_52_STEPS:
            db.add(QCChecklistItem(
                model_name=name,
                step_number=num,
                operation=op,
                description=desc,
                qc_criteria=crit,
                media_url=media,
                media_type=mtype
            ))
        db.commit()

    step_count = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == name).count()
    return {
        "id": new_model.id,
        "name": new_model.name,
        "description": new_model.description,
        "step_count": step_count,
        "created_at": new_model.created_at
    }

@api_router.delete("/models/{model_name}")
def delete_model(model_name: str, db: Session = Depends(get_db)):
    model_name = model_name.strip().upper()
    existing = db.query(QCModel).filter(QCModel.name == model_name).first()
    if not existing:
        raise HTTPException(status_code=404, detail=f"Modelo '{model_name}' no encontrado")
    
    # Verificar si está asociado a órdenes de producción
    orders_count = db.query(QCOrder).filter(QCOrder.model_name == model_name).count()
    if orders_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede eliminar el modelo '{model_name}' porque está vinculado a {orders_count} orden(es) de producción"
        )
    
    # Eliminar pasos del checklist asociados y el modelo
    deleted_steps = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == model_name).delete()
    db.delete(existing)
    db.commit()
    return {
        "message": f"Modelo '{model_name}' eliminado exitosamente ({deleted_steps} pasos removidos)",
        "model_name": model_name
    }

@api_router.post("/models/{model_name}/populate-template")
def populate_model_template(model_name: str, data: dict = {}, db: Session = Depends(get_db)):
    """Rellena o complementa el checklist de un modelo con la plantilla estándar de 52 pasos o desde otro modelo"""
    model_name = model_name.strip().upper()
    model = db.query(QCModel).filter(QCModel.name == model_name).first()
    if not model:
        raise HTTPException(status_code=404, detail=f"Modelo '{model_name}' no encontrado")
    
    template_type = data.get("template", "STANDARD")  # "STANDARD" or "CLONE"
    clone_from = data.get("clone_from")
    mode = data.get("mode", "APPEND_MISSING")  # "REPLACE" or "APPEND_MISSING"

    if mode == "REPLACE":
        db.query(QCChecklistItem).filter(QCChecklistItem.model_name == model_name).delete()
        db.commit()

    existing_steps = {it.step_number for it in db.query(QCChecklistItem).filter(QCChecklistItem.model_name == model_name).all()}
    added_count = 0

    if template_type == "CLONE" and clone_from:
        source_items = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == clone_from).order_by(QCChecklistItem.step_number).all()
        for it in source_items:
            if mode == "APPEND_MISSING" and it.step_number in existing_steps:
                continue
            db.add(QCChecklistItem(
                model_name=model_name,
                step_number=it.step_number,
                operation=it.operation,
                description=it.description,
                qc_criteria=it.qc_criteria,
                media_url=it.media_url,
                media_type=it.media_type,
                is_cleaning=bool(it.is_cleaning)
            ))
            existing_steps.add(it.step_number)
            added_count += 1
    else:
        for num, op, desc, crit, media, mtype in PROWORK_52_STEPS:
            if mode == "APPEND_MISSING" and num in existing_steps:
                continue
            is_clean = num in (12, 13, 14, 43, 52) or any(k in (op + " " + desc).lower() for k in ["limpieza", "película", "pelicula", "microfibra"])
            db.add(QCChecklistItem(
                model_name=model_name,
                step_number=num,
                operation=op,
                description=desc,
                qc_criteria=crit,
                media_url=media,
                media_type=mtype,
                is_cleaning=is_clean
            ))
            existing_steps.add(num)
            added_count += 1

    db.commit()
    total_steps = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == model_name).count()
    return {
        "message": f"Se agregaron {added_count} pasos al modelo '{model_name}' (Total: {total_steps} pasos)",
        "added_count": added_count,
        "total_steps": total_steps
    }

@api_router.post("/models/{model_name}/resequence")
def resequence_model_steps(model_name: str, db: Session = Depends(get_db)):
    """Renumbra todos los pasos del checklist de 1 a N de forma consecutiva sin huecos"""
    model_name = model_name.strip().upper()
    items = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == model_name).order_by(QCChecklistItem.step_number, QCChecklistItem.id).all()
    if not items:
        return {"message": f"El modelo '{model_name}' no tiene pasos registrados", "updated_count": 0, "total_steps": 0}

    updated_count = 0
    for idx, it in enumerate(items, start=1):
        if it.step_number != idx:
            it.step_number = idx
            updated_count += 1
    
    db.commit()
    return {
        "message": f"Secuencia reordenada consecutivamente (1 a {len(items)}). {updated_count} pasos renumerados.",
        "updated_count": updated_count,
        "total_steps": len(items)
    }

@api_router.get("/models/{model_name}/diagnostics")
def get_model_diagnostics(model_name: str, db: Session = Depends(get_db)):
    """Diagnóstico de integridad del checklist: pasos faltantes en la secuencia y cobertura de fases críticas de calidad"""
    model_name = model_name.strip().upper()
    items = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == model_name).order_by(QCChecklistItem.step_number).all()
    
    step_numbers = [it.step_number for it in items]
    step_set = set(step_numbers)
    max_step = max(step_numbers) if step_numbers else 0
    total_steps = len(items)

    missing_in_sequence = []
    if max_step > 0:
        for i in range(1, max_step + 1):
            if i not in step_set:
                missing_in_sequence.append(i)

    duplicates = []
    seen = set()
    for s in step_numbers:
        if s in seen and s not in duplicates:
            duplicates.append(s)
        seen.add(s)

    all_text = " ".join([f"{it.operation} {it.description or ''} {it.qc_criteria}" for it in items]).lower()
    
    has_cleaning = any(k in all_text for k in ["limpieza", "limpiar", "microfibra", "polvo", "aspirar"])
    has_intermediate_cleaning = any(k in all_text for k in ["limpieza intermedia", "limpieza de componentes", "limpieza y bios"])
    has_final_cleaning = any(k in all_text for k in ["limpieza final", "limpieza y embalaje", "embalaje final"])
    has_bios = any(k in all_text for k in ["bios", "uefi", "boot", "arranque"])
    has_os = any(k in all_text for k in ["sistema operativo", "windows", "so ", "drivers"])
    has_stress_tests = any(k in all_text for k in ["test", "temperatura", "prueba de", "bench", "estrés"])
    has_packaging = any(k in all_text for k in ["embalaje", "empaque", "caja", "sellado", "rotulado"])

    recommendations = []
    if total_steps == 0:
        recommendations.append("El modelo no tiene pasos registrados. Puedes autocompletarlo con la plantilla estándar de 52 pasos.")
    else:
        if missing_in_sequence:
            rec_seq = ', '.join(map(str, missing_in_sequence[:8])) + ('...' if len(missing_in_sequence) > 8 else '')
            recommendations.append(f"Hay {len(missing_in_sequence)} hueco(s) en la numeración (Faltan: {rec_seq}). Usa 'Re-secuenciar' o 'Rellenar Faltantes'.")
        if duplicates:
            recommendations.append(f"Hay números de paso duplicados ({', '.join(map(str, duplicates))}).")
        if not has_cleaning:
            recommendations.append("Atención de Calidad: No se encontraron pasos de limpieza (la línea exige 2 estaciones de limpieza obligatorias).")
        if not has_bios:
            recommendations.append("Sugerencia: Falta paso de configuración y actualización de BIOS.")
        if not has_os:
            recommendations.append("Sugerencia: Falta paso de instalación de Sistema Operativo y drivers.")
        if total_steps < 52:
            recommendations.append(f"El catálogo maestro SekaiTech tiene 52 pasos ({52 - total_steps} pasos disponibles para incorporar).")

    return {
        "model_name": model_name,
        "total_steps": total_steps,
        "max_step": max_step,
        "missing_in_sequence": missing_in_sequence,
        "duplicates": duplicates,
        "has_cleaning": has_cleaning,
        "has_intermediate_cleaning": has_intermediate_cleaning,
        "has_final_cleaning": has_final_cleaning,
        "has_bios": has_bios,
        "has_os": has_os,
        "has_stress_tests": has_stress_tests,
        "has_packaging": has_packaging,
        "recommendations": recommendations,
        "is_healthy": len(missing_in_sequence) == 0 and len(duplicates) == 0 and total_steps >= 20 and has_cleaning
    }

@api_router.get("/models/{model_name}/checklist", response_model=List[ChecklistItemSchema])
def get_model_checklist(model_name: str, db: Session = Depends(get_db)):
    items = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == model_name).order_by(QCChecklistItem.step_number).all()
    return items

@api_router.post("/models/{model_name}/checklist")
def save_checklist_item(model_name: str, item: ChecklistItemSchema, db: Session = Depends(get_db)):
    if item.id:
        existing = db.query(QCChecklistItem).filter(QCChecklistItem.id == item.id).first()
        if existing:
            existing.step_number = item.step_number
            existing.operation = item.operation
            existing.description = item.description
            existing.qc_criteria = item.qc_criteria
            existing.media_url = item.media_url
            existing.media_type = item.media_type
            existing.is_cleaning = bool(item.is_cleaning)
            db.commit()
            db.refresh(existing)
            return existing
    
    new_item = QCChecklistItem(
        model_name=model_name,
        step_number=item.step_number,
        operation=item.operation,
        description=item.description,
        qc_criteria=item.qc_criteria,
        media_url=item.media_url,
        media_type=item.media_type,
        is_cleaning=bool(item.is_cleaning)
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@api_router.delete("/models/{model_name}/checklist/{step_id}")
def delete_checklist_item(model_name: str, step_id: int, db: Session = Depends(get_db)):
    item = db.query(QCChecklistItem).filter(QCChecklistItem.id == step_id, QCChecklistItem.model_name == model_name).first()
    if not item:
        raise HTTPException(status_code=404, detail="Paso no encontrado")
    db.delete(item)
    db.commit()
    return {"message": "Paso eliminado correctamente"}

@api_router.post("/models/{model_name}/checklist/{step_id}/toggle-cleaning")
def toggle_step_cleaning(model_name: str, step_id: int, db: Session = Depends(get_db)):
    """Cambia directamente el estado is_cleaning (Limpieza vs Ensamblaje) de un paso"""
    item = db.query(QCChecklistItem).filter(QCChecklistItem.id == step_id, QCChecklistItem.model_name == model_name).first()
    if not item:
        raise HTTPException(status_code=404, detail="Paso no encontrado")
    item.is_cleaning = not bool(item.is_cleaning)
    db.commit()
    db.refresh(item)
    return {
        "message": f"Paso #{item.step_number} marcado como {'LIMPIEZA' if item.is_cleaning else 'ENSAMBLAJE'}",
        "is_cleaning": item.is_cleaning,
        "step_number": item.step_number
    }

@api_router.post("/models/{model_name}/classify-cleaning")
def classify_cleaning_steps(model_name: str, db: Session = Depends(get_db)):
    """Auto-clasifica los pasos de limpieza del modelo basándose en palabras clave y números estándar"""
    model_name = model_name.strip().upper()
    items = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == model_name).all()
    if not items:
        raise HTTPException(status_code=404, detail=f"No hay pasos para el modelo '{model_name}'")
    
    updated_count = 0
    for it in items:
        text = (it.operation or "") + " " + (it.description or "")
        should_clean = (
            any(k in text.lower() for k in ["limpieza", "limpiar", "película", "pelicula", "microfibra", "huellas", "desprotección", "desproteccion"])
            or it.step_number in (12, 13, 14, 43, 52)
        )
        if bool(it.is_cleaning) != should_clean:
            it.is_cleaning = should_clean
            updated_count += 1
    db.commit()
    return {
        "message": f"Se clasificaron los pasos de limpieza del modelo {model_name} ({updated_count} actualizados)",
        "updated": updated_count
    }

@api_router.delete("/models/{model_name}/checklist")
def delete_all_model_checklist(model_name: str, db: Session = Depends(get_db)):
    """Elimina todos los pasos configurados en el checklist de un modelo"""
    count = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == model_name).count()
    if count == 0:
        return {"message": f"El modelo {model_name} no tenía pasos registrados", "deleted_count": 0}
    
    db.query(QCChecklistItem).filter(QCChecklistItem.model_name == model_name).delete()
    db.commit()
    return {
        "message": f"Se eliminaron los {count} pasos del checklist para el modelo {model_name}",
        "deleted_count": count
    }

@api_router.get("/checklist/template")
def download_checklist_template(model_name: Optional[str] = None):
    """Descarga la plantilla Excel oficial (.xlsx) para importar pasos de checklist"""
    template_bytes = generate_checklist_template(model_name or "")
    filename = f"Plantilla_Importacion_Checklist_{model_name.upper() if model_name else 'QC_KENYA'}.xlsx"
    return Response(
        content=template_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/models/{model_name}/template")
def download_model_checklist_template(model_name: str):
    """Alias para descargar la plantilla con el nombre del modelo preconfigurado"""
    return download_checklist_template(model_name=model_name)

@api_router.get("/models/{model_name}/export-excel")
def export_model_excel(model_name: str, db: Session = Depends(get_db)):
    items = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == model_name).order_by(QCChecklistItem.step_number).all()
    items_data = [
        {
            "step_number": it.step_number,
            "operation": it.operation,
            "description": it.description,
            "qc_criteria": it.qc_criteria,
            "media_url": it.media_url,
            "is_cleaning": bool(it.is_cleaning)
        }
        for it in items
    ]
    excel_bytes = generate_checklist_excel(model_name, items_data)
    filename = f"Checklist_QC_KENYA_{model_name}.xlsx"
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.post("/models/{model_name}/import-excel")
async def import_model_excel(model_name: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    parsed_items = parse_checklist_excel(content)
    
    if not parsed_items:
        raise HTTPException(
            status_code=400,
            detail="No se encontraron filas de pasos válidas en el archivo. Verifique que contenga columnas 'Operacion' y 'Criterio_Control_Calidad', o utilice la Plantilla Oficial descargable."
        )
    
    # Reemplazar pasos del modelo existente
    db.query(QCChecklistItem).filter(QCChecklistItem.model_name == model_name).delete()
    for it in parsed_items:
        op_text = (it.get("operation") or "") + " " + (it.get("description") or "")
        is_clean = it.get("is_cleaning")
        if is_clean is None:
            is_clean = any(k in op_text.lower() for k in ["limpieza", "limpiar", "película", "pelicula", "microfibra", "huellas", "desprotección", "desproteccion"]) or it["step_number"] in (12, 13, 14, 43, 52)
        db.add(QCChecklistItem(
            model_name=model_name,
            step_number=it["step_number"],
            operation=it["operation"],
            description=it.get("description", ""),
            qc_criteria=it["qc_criteria"],
            media_url=it.get("media_url", ""),
            media_type=it.get("media_type", "image"),
            is_cleaning=bool(is_clean)
        ))
    db.commit()
    return {
        "message": f"Se importaron {len(parsed_items)} pasos correctamente para el modelo {model_name}",
        "count": len(parsed_items)
    }

@api_router.get("/orders")
def list_orders(db: Session = Depends(get_db)):
    orders = db.query(QCOrder).order_by(QCOrder.created_at.desc()).all()
    results = []
    for o in orders:
        total = o.total_units
        passed = db.query(QCPCUnit).filter(QCPCUnit.order_id == o.order_id, QCPCUnit.overall_status == "PASSED").count()
        in_progress = db.query(QCPCUnit).filter(QCPCUnit.order_id == o.order_id, QCPCUnit.overall_status == "IN_PROGRESS").count()
        failed = db.query(QCPCUnit).filter(QCPCUnit.order_id == o.order_id, QCPCUnit.overall_status == "FAILED").count()
        pending = total - passed - in_progress - failed
        
        results.append({
            "order_id": o.order_id,
            "model_name": o.model_name,
            "part_number": o.part_number,
            "total_units": total,
            "total_stations": o.total_stations,
            "status": o.status,
            "supervisor_id": o.supervisor_id,
            "supervisor_name": o.supervisor_name,
            "created_at": o.created_at,
            "created_by": o.created_by,
            "stats": {
                "passed": passed,
                "in_progress": in_progress,
                "failed": failed,
                "pending": max(0, pending)
            }
        })
    return results

@api_router.post("/orders")
def create_order(req: OrderCreateRequest, db: Session = Depends(get_db)):
    existing = db.query(QCOrder).filter(QCOrder.order_id == req.order_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="El número de orden ya existe")

    steps = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == req.model_name).order_by(QCChecklistItem.step_number).all()
    total_steps = len(steps)
    if total_steps == 0:
        raise HTTPException(status_code=400, detail="El modelo seleccionado no tiene pasos configurados en su checklist")

    num_stations = len(req.stations)
    if num_stations < 2:
        raise HTTPException(status_code=400, detail="Debe asignar al menos 2 estaciones de trabajo para cumplir con las estaciones de limpieza obligatorias")

    # Regla estricta: Mínimo 2 estaciones obligatorias de limpieza
    cleaning_stations = [
        st for st in req.stations
        if st.is_cleaning_station or st.station_type == "CLEANING" or "limpieza" in (st.station_name or "").lower()
    ]
    if len(cleaning_stations) < 2:
        raise HTTPException(
            status_code=400,
            detail=f"Regla de Calidad Obligatoria: La línea de producción debe incluir al menos 2 estaciones designadas para Limpieza (Intermedia y Final). Se detectaron {len(cleaning_stations)} de 2 requeridas."
        )

    # Obtener nombre del supervisor si no fue enviado explícitamente
    sup_name = req.supervisor_name
    if req.supervisor_id and not sup_name:
        sup_user = db.query(QCUser).filter(QCUser.id == req.supervisor_id).first()
        if sup_user:
            sup_name = sup_user.name

    order = QCOrder(
        order_id=req.order_id,
        model_name=req.model_name,
        part_number=req.part_number,
        total_units=req.total_units,
        total_stations=num_stations,
        status="IN_PROGRESS",
        supervisor_id=req.supervisor_id,
        supervisor_name=sup_name,
        created_by=req.created_by
    )
    db.add(order)
    db.commit()

    is_manual = req.assignment_mode == "MANUAL" or any(st.step_numbers or (st.start_step and st.end_step) for st in req.stations)
    if is_manual:
        # Asignación manual personalizada de pasos por estación
        for s_idx, st in enumerate(req.stations, start=1):
            step_nums_str = None
            s_start = st.start_step or 1
            s_end = st.end_step or 1

            if st.step_numbers:
                if isinstance(st.step_numbers, list):
                    clean_nums = sorted(list(set(int(x) for x in st.step_numbers if str(x).isdigit())))
                    step_nums_str = ",".join(str(x) for x in clean_nums)
                    if clean_nums:
                        s_start = min(clean_nums)
                        s_end = max(clean_nums)
                else:
                    step_nums_str = str(st.step_numbers).strip()
                    nums = [int(x.strip()) for x in step_nums_str.split(",") if x.strip().isdigit()]
                    if nums:
                        s_start = min(nums)
                        s_end = max(nums)
            elif st.start_step and st.end_step:
                step_nums_str = ",".join(str(n) for n in range(st.start_step, st.end_step + 1))

            is_clean = bool(st.is_cleaning_station or st.station_type == "CLEANING" or "limpieza" in (st.station_name or "").lower())
            s_type = st.station_type or ("CLEANING" if is_clean else "ASSEMBLY")

            db.add(QCStationAssignment(
                order_id=req.order_id,
                station_number=s_idx,
                station_name=st.station_name or f"Estación {s_idx}",
                user_id=st.user_id,
                user_name=st.user_name,
                secondary_user_id=st.secondary_user_id,
                secondary_user_name=st.secondary_user_name,
                start_step=s_start,
                end_step=s_end,
                step_numbers=step_nums_str,
                is_cleaning_station=is_clean,
                station_type=s_type
            ))
    else:
        # Asignación automática inteligente:
        # Separa los pasos de limpieza de los pasos de ensamblaje
        cleaning_steps = [
            s.step_number for s in steps
            if getattr(s, 'is_cleaning', False)
               or "limpieza" in (s.operation + " " + (s.description or "")).lower()
               or "limpiar" in (s.operation or "").lower()
               or "película" in (s.operation or "").lower()
               or "pelicula" in (s.operation or "").lower()
               or "microfibra" in (s.operation or "").lower()
               or s.step_number in (12, 13, 14, 43, 52)
        ]
        cleaning_steps = sorted(list(set(cleaning_steps)))
        assembly_steps = [s.step_number for s in steps if s.step_number not in cleaning_steps]
        assembly_steps = sorted(list(set(assembly_steps)))

        # Clasificar estaciones recibidas
        clean_sts = [st for st in req.stations if st.is_cleaning_station or st.station_type == "CLEANING" or "limpieza" in (st.station_name or "").lower()]
        asmb_sts = [st for st in req.stations if st not in clean_sts]

        # Si no quedaron estaciones de ensamblaje (caso extremo), usar las no-limpieza
        if not asmb_sts:
            asmb_sts = req.stations[:-2] if len(req.stations) > 2 else req.stations

        # Repartir assembly_steps ÚNICAMENTE entre asmb_sts (CERO pasos de limpieza a ensamble)
        station_step_map = {}
        if asmb_sts:
            base_count = len(assembly_steps) // len(asmb_sts)
            remainder = len(assembly_steps) % len(asmb_sts)
            cur = 0
            for i, st in enumerate(asmb_sts):
                cnt = base_count + (1 if i < remainder else 0)
                station_step_map[st.station_number] = assembly_steps[cur:cur + cnt]
                cur += cnt

        # Repartir cleaning_steps ÚNICAMENTE entre clean_sts
        if clean_sts:
            if len(clean_sts) == 2:
                mid_cutoff = len(cleaning_steps) // 2 or 1
                station_step_map[clean_sts[0].station_number] = cleaning_steps[:mid_cutoff]
                station_step_map[clean_sts[1].station_number] = cleaning_steps[mid_cutoff:]
            else:
                c_base = len(cleaning_steps) // len(clean_sts)
                c_rem = len(cleaning_steps) % len(clean_sts)
                c_cur = 0
                for i, st in enumerate(clean_sts):
                    cnt = c_base + (1 if i < c_rem else 0)
                    station_step_map[st.station_number] = cleaning_steps[c_cur:c_cur + cnt]
                    c_cur += cnt

        for s_idx, st in enumerate(req.stations, start=1):
            st_steps = station_step_map.get(st.station_number, [])
            step_nums_str = ",".join(str(n) for n in st_steps) if st_steps else None
            s_start = min(st_steps) if st_steps else 1
            s_end = max(st_steps) if st_steps else 1
            is_clean = bool(st.is_cleaning_station or st.station_type == "CLEANING" or "limpieza" in (st.station_name or "").lower())
            s_type = st.station_type or ("CLEANING" if is_clean else "ASSEMBLY")

            db.add(QCStationAssignment(
                order_id=req.order_id,
                station_number=s_idx,
                station_name=st.station_name or f"Estación {s_idx}",
                user_id=st.user_id,
                user_name=st.user_name,
                secondary_user_id=st.secondary_user_id,
                secondary_user_name=st.secondary_user_name,
                start_step=s_start,
                end_step=s_end,
                step_numbers=step_nums_str,
                is_cleaning_station=is_clean,
                station_type=s_type
            ))
    db.commit()

    for u_num in range(1, req.total_units + 1):
        db.add(QCPCUnit(
            order_id=req.order_id,
            unit_number=u_num,
            serial_number=f"KEN-{req.model_name[:3]}-{req.order_id[-4:]}-{u_num:03d}",
            current_station=1,
            overall_status="PENDING",
            current_step_progress=0
        ))
    db.commit()

    return {"message": "Orden y pipeline creados exitosamente", "order_id": req.order_id}

@api_router.put("/orders/{order_id}")
def update_order(order_id: str, req: OrderUpdateRequest, db: Session = Depends(get_db)):
    """Actualiza una orden existente (modelo, part_number, estado, total_units, supervisor asignado y estaciones)."""
    order = db.query(QCOrder).filter(QCOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    if req.model_name and req.model_name != order.model_name:
        mod = db.query(QCModel).filter(QCModel.name == req.model_name).first()
        if not mod:
            raise HTTPException(status_code=400, detail=f"El modelo '{req.model_name}' no existe")
        order.model_name = req.model_name

    if req.part_number is not None:
        order.part_number = req.part_number

    if req.status is not None:
        order.status = req.status

    if req.supervisor_id is not None:
        order.supervisor_id = req.supervisor_id
        if req.supervisor_name:
            order.supervisor_name = req.supervisor_name
        else:
            sup_u = db.query(QCUser).filter(QCUser.id == req.supervisor_id).first()
            if sup_u:
                order.supervisor_name = sup_u.name

    # Ajuste de unidades si se modificó total_units
    if req.total_units is not None and req.total_units > 0 and req.total_units != order.total_units:
        current_count = db.query(QCPCUnit).filter(QCPCUnit.order_id == order_id).count()
        if req.total_units > current_count:
            # Agregar nuevas PCs correlativas
            for u_num in range(current_count + 1, req.total_units + 1):
                db.add(QCPCUnit(
                    order_id=order_id,
                    unit_number=u_num,
                    serial_number=f"KEN-{order.model_name[:3]}-{order.order_id[-4:]}-{u_num:03d}",
                    current_station=1,
                    overall_status="PENDING",
                    current_step_progress=0
                ))
        elif req.total_units < current_count:
            # Eliminar unidades sobrantes sólo si están en PENDING y progreso 0
            excess_units = db.query(QCPCUnit).filter(
                QCPCUnit.order_id == order_id,
                QCPCUnit.unit_number > req.total_units,
                QCPCUnit.overall_status == "PENDING",
                QCPCUnit.current_step_progress == 0
            ).all()
            for eu in excess_units:
                db.delete(eu)
        order.total_units = req.total_units

    # Actualizar estaciones si se enviaron
    if req.stations:
        cleaning_count = sum(1 for st in req.stations if st.is_cleaning_station or st.station_type == "CLEANING" or "limpieza" in (st.station_name or "").lower())
        if cleaning_count < 2:
            raise HTTPException(
                status_code=400,
                detail=f"Regla de Calidad Obligatoria: La línea debe incluir al menos 2 estaciones designadas para Limpieza. Actualmente: {cleaning_count}."
            )

        for st_in in req.stations:
            asgn = db.query(QCStationAssignment).filter(
                QCStationAssignment.order_id == order_id,
                QCStationAssignment.station_number == st_in.station_number
            ).first()
            if asgn:
                asgn.user_id = st_in.user_id
                asgn.user_name = st_in.user_name
                asgn.secondary_user_id = st_in.secondary_user_id
                asgn.secondary_user_name = st_in.secondary_user_name
                if st_in.station_name:
                    asgn.station_name = st_in.station_name
                if st_in.start_step is not None:
                    asgn.start_step = st_in.start_step
                if st_in.end_step is not None:
                    asgn.end_step = st_in.end_step
                if st_in.step_numbers is not None:
                    if isinstance(st_in.step_numbers, list):
                        asgn.step_numbers = ",".join(str(x) for x in sorted(st_in.step_numbers))
                    else:
                        asgn.step_numbers = str(st_in.step_numbers)
                asgn.is_cleaning_station = bool(st_in.is_cleaning_station or st_in.station_type == "CLEANING" or "limpieza" in (st_in.station_name or "").lower())
                asgn.station_type = st_in.station_type or ("CLEANING" if asgn.is_cleaning_station else "ASSEMBLY")
            else:
                step_nums_str = None
                if st_in.step_numbers:
                    if isinstance(st_in.step_numbers, list):
                        step_nums_str = ",".join(str(x) for x in sorted(st_in.step_numbers))
                    else:
                        step_nums_str = str(st_in.step_numbers)
                is_clean = bool(st_in.is_cleaning_station or st_in.station_type == "CLEANING" or "limpieza" in (st_in.station_name or "").lower())
                db.add(QCStationAssignment(
                    order_id=order_id,
                    station_number=st_in.station_number,
                    station_name=st_in.station_name or f"Estación {st_in.station_number}",
                    user_id=st_in.user_id,
                    user_name=st_in.user_name,
                    secondary_user_id=st_in.secondary_user_id,
                    secondary_user_name=st_in.secondary_user_name,
                    start_step=st_in.start_step or 1,
                    end_step=st_in.end_step or 1,
                    step_numbers=step_nums_str,
                    is_cleaning_station=is_clean,
                    station_type=st_in.station_type or ("CLEANING" if is_clean else "ASSEMBLY")
                ))

    db.commit()
    db.refresh(order)
    return {"message": "Orden actualizada exitosamente", "order_id": order.order_id}

@api_router.put("/orders/{order_id}/stations")
def update_order_stations(order_id: str, stations_data: List[StationAssignmentCreate], db: Session = Depends(get_db)):
    """Actualiza la configuración de estaciones, técnicos y asignación manual de pasos para una orden existente"""
    order = db.query(QCOrder).filter(QCOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    
    # Validar mínimo 2 estaciones de limpieza
    cleaning_count = sum(1 for st in stations_data if st.is_cleaning_station or st.station_type == "CLEANING" or "limpieza" in (st.station_name or "").lower())
    if cleaning_count < 2:
        raise HTTPException(
            status_code=400,
            detail=f"Regla de Calidad Obligatoria: La línea debe incluir al menos 2 estaciones designadas para Limpieza. Actualmente: {cleaning_count}."
        )

    for st_in in stations_data:
        asgn = db.query(QCStationAssignment).filter(
            QCStationAssignment.order_id == order_id,
            QCStationAssignment.station_number == st_in.station_number
        ).first()
        if asgn:
            asgn.user_id = st_in.user_id
            asgn.user_name = st_in.user_name
            asgn.secondary_user_id = st_in.secondary_user_id
            asgn.secondary_user_name = st_in.secondary_user_name
            if st_in.station_name:
                asgn.station_name = st_in.station_name
            if st_in.start_step is not None:
                asgn.start_step = st_in.start_step
            if st_in.end_step is not None:
                asgn.end_step = st_in.end_step
            if st_in.step_numbers is not None:
                if isinstance(st_in.step_numbers, list):
                    asgn.step_numbers = ",".join(str(x) for x in sorted(st_in.step_numbers))
                else:
                    asgn.step_numbers = str(st_in.step_numbers)
            asgn.is_cleaning_station = bool(st_in.is_cleaning_station or st_in.station_type == "CLEANING" or "limpieza" in (st_in.station_name or "").lower())
            asgn.station_type = st_in.station_type or ("CLEANING" if asgn.is_cleaning_station else "ASSEMBLY")
    
    db.commit()
    return {"message": "Configuración de estaciones actualizada correctamente"}

@api_router.get("/orders/{order_id}")
def get_order_detail(order_id: str, db: Session = Depends(get_db)):
    order = db.query(QCOrder).filter(QCOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    stations = db.query(QCStationAssignment).filter(QCStationAssignment.order_id == order_id).order_by(QCStationAssignment.station_number).all()
    for st in stations:
        u = db.query(QCUser).filter(QCUser.id == st.user_id).first()
        if u and u.name != st.user_name:
            st.user_name = u.name
            db.commit()
    units = db.query(QCPCUnit).filter(QCPCUnit.order_id == order_id).order_by(QCPCUnit.unit_number).all()
    return {"order": order, "stations": stations, "units": units}

@api_router.get("/orders/{order_id}/matrix")
def get_order_matrix(order_id: str, db: Session = Depends(get_db)):
    order = db.query(QCOrder).filter(QCOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    
    stations = db.query(QCStationAssignment).filter(QCStationAssignment.order_id == order_id).order_by(QCStationAssignment.station_number).all()
    for st in stations:
        u = db.query(QCUser).filter(QCUser.id == st.user_id).first()
        if u and u.name != st.user_name:
            st.user_name = u.name
            db.commit()

    units = db.query(QCPCUnit).filter(QCPCUnit.order_id == order_id).order_by(QCPCUnit.unit_number).all()
    logs = db.query(QCStepLog).filter(QCStepLog.order_id == order_id).all()
    issues = db.query(QCIssue).filter(QCIssue.order_id == order_id).all()

    return {
        "order": {
            "order_id": order.order_id,
            "model_name": order.model_name,
            "part_number": order.part_number,
            "total_units": order.total_units,
            "total_stations": order.total_stations,
            "status": order.status,
            "supervisor_id": order.supervisor_id,
            "supervisor_name": order.supervisor_name,
        },
        "stations": stations,
        "units": units,
        "logs_count": len(logs),
        "issues": issues
    }

@api_router.post("/orders/{order_id}/reset")
def reset_order(order_id: str, db: Session = Depends(get_db)):
    order = db.query(QCOrder).filter(QCOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    
    # Limpiar logs e incidencias de esta orden
    db.query(QCStepLog).filter(QCStepLog.order_id == order_id).delete()
    db.query(QCIssue).filter(QCIssue.order_id == order_id).delete()
    
    # Reiniciar todas las unidades al estado inicial
    units = db.query(QCPCUnit).filter(QCPCUnit.order_id == order_id).all()
    for u in units:
        u.current_station = 1
        u.overall_status = "PENDING"
        u.current_step_progress = 0
        u.started_at = None
        u.completed_at = None
    
    order.status = "IN_PROGRESS"
    db.commit()
    return {"message": f"Orden {order_id} reiniciada por completo. {len(units)} PCs listas en Estación 1."}

@api_router.delete("/orders/{order_id}")
def delete_order(order_id: str, db: Session = Depends(get_db)):
    order = db.query(QCOrder).filter(QCOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    
    db.query(QCStepLog).filter(QCStepLog.order_id == order_id).delete()
    db.query(QCIssue).filter(QCIssue.order_id == order_id).delete()
    db.query(QCStationAssignment).filter(QCStationAssignment.order_id == order_id).delete()
    db.query(QCPCUnit).filter(QCPCUnit.order_id == order_id).delete()
    db.delete(order)
    db.commit()
    return {"message": f"Orden {order_id} y todos sus registros han sido eliminados"}

@api_router.post("/orders/{order_id}/units")
def add_units_to_order(order_id: str, req: AddUnitsRequest, db: Session = Depends(get_db)):
    order = db.query(QCOrder).filter(QCOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    
    existing_units = db.query(QCPCUnit).filter(QCPCUnit.order_id == order_id).all()
    max_unit_num = max([u.unit_number for u in existing_units]) if existing_units else 0
    
    count = max(1, req.count)
    added_unit_numbers = []
    prefix = req.custom_prefix or f"KEN-{order.model_name[:3]}-{order.order_id[-4:]}"

    for i in range(1, count + 1):
        u_num = max_unit_num + i
        new_unit = QCPCUnit(
            order_id=order_id,
            unit_number=u_num,
            serial_number=f"{prefix}-{u_num:03d}",
            current_station=1,
            overall_status="PENDING",
            current_step_progress=0
        )
        db.add(new_unit)
        added_unit_numbers.append(u_num)
    
    db.commit()
    order.total_units = db.query(QCPCUnit).filter(QCPCUnit.order_id == order_id).count()
    db.commit()
    
    return {
        "message": f"Se agregaron {count} PC(s) a la orden {order_id} (PCs #{added_unit_numbers[0]} a #{added_unit_numbers[-1]})",
        "total_units": order.total_units
    }

@api_router.delete("/orders/{order_id}/units/{unit_number}")
def delete_unit_from_order(order_id: str, unit_number: int, db: Session = Depends(get_db)):
    order = db.query(QCOrder).filter(QCOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    
    unit = db.query(QCPCUnit).filter(QCPCUnit.order_id == order_id, QCPCUnit.unit_number == unit_number).first()
    if not unit:
        raise HTTPException(status_code=404, detail=f"PC #{unit_number} no encontrada en esta orden")
    
    db.query(QCStepLog).filter(QCStepLog.order_id == order_id, QCStepLog.unit_number == unit_number).delete()
    db.query(QCIssue).filter(QCIssue.order_id == order_id, QCIssue.unit_number == unit_number).delete()
    db.delete(unit)
    db.commit()
    
    order.total_units = db.query(QCPCUnit).filter(QCPCUnit.order_id == order_id).count()
    db.commit()
    return {"message": f"PC #{unit_number} eliminada de la orden {order_id}", "total_units": order.total_units}

@api_router.post("/orders/{order_id}/units/{unit_number}/reset")
def reset_single_unit(order_id: str, unit_number: int, db: Session = Depends(get_db)):
    unit = db.query(QCPCUnit).filter(QCPCUnit.order_id == order_id, QCPCUnit.unit_number == unit_number).first()
    if not unit:
        raise HTTPException(status_code=404, detail=f"PC #{unit_number} no encontrada")
    
    db.query(QCStepLog).filter(QCStepLog.order_id == order_id, QCStepLog.unit_number == unit_number).delete()
    db.query(QCIssue).filter(QCIssue.order_id == order_id, QCIssue.unit_number == unit_number).delete()
    
    unit.current_station = 1
    unit.overall_status = "PENDING"
    unit.current_step_progress = 0
    unit.started_at = None
    unit.completed_at = None
    
    db.commit()
    return {"message": f"PC #{unit_number} reiniciada a Estación 1 con progreso en 0"}

@api_router.get("/operator/{user_id}/station")
def get_operator_workspace(
    user_id: str,
    order_id: Optional[str] = None,
    unit_number: Optional[int] = None,
    station_number: Optional[int] = None,
    db: Session = Depends(get_db)
):
    # Identificar al usuario que realiza la consulta
    requesting_user = db.query(QCUser).filter(QCUser.id == user_id).first()
    is_supervisor = requesting_user and requesting_user.role in ["SUPERVISOR", "ADMIN"]
    is_support = (user_id == "OP-106") or (requesting_user and requesting_user.role == "OPERATOR" and "apoyo" in (requesting_user.email or "").lower())

    all_orders = db.query(QCOrder).order_by(QCOrder.created_at.desc()).all()
    available_orders_info = []
    for ord_item in all_orders:
        user_asgn = next((a for a in ord_item.stations if a.user_id == user_id), None)
        available_orders_info.append({
            "order_id": ord_item.order_id,
            "model_name": ord_item.model_name,
            "total_units": ord_item.total_units,
            "status": ord_item.status,
            "is_assigned": user_asgn is not None,
            "assigned_station": user_asgn.station_number if user_asgn else (station_number or 1),
            "assigned_station_name": user_asgn.station_name if user_asgn else f"Estación {station_number or 1}",
            "is_support": is_support
        })

    # Si se especificó station_number explícitamente (ej: por Supervisor, Apoyo o Admin para seleccionar puesto de trabajo)
    assignment = None
    if order_id and station_number:
        assignment = db.query(QCStationAssignment).filter(
            QCStationAssignment.order_id == order_id,
            QCStationAssignment.station_number == station_number
        ).first()

    # Si se especificó un order_id, buscar la asignación directa del usuario en esa orden específica
    if not assignment and order_id:
        assignment = db.query(QCStationAssignment).filter(
            QCStationAssignment.order_id == order_id,
            QCStationAssignment.user_id == user_id
        ).first()
        if not assignment:
            # Si el usuario es de apoyo o supervisor o no tiene estación fija en esta orden
            target_st = station_number or 1
            assignment = db.query(QCStationAssignment).filter(
                QCStationAssignment.order_id == order_id,
                QCStationAssignment.station_number == target_st
            ).first()
            if not assignment:
                assignment = db.query(QCStationAssignment).filter(
                    QCStationAssignment.order_id == order_id
                ).first()

    if not assignment and station_number:
        assignment = db.query(QCStationAssignment).filter(
            QCStationAssignment.station_number == station_number
        ).first()

    if not assignment:
        # Buscar la primera orden en progreso donde el usuario tenga asignación
        assignment = db.query(QCStationAssignment).join(QCOrder).filter(
            QCStationAssignment.user_id == user_id,
            QCOrder.status == "IN_PROGRESS"
        ).first()

    if not assignment:
        # Fallback a cualquier asignación del usuario
        assignment = db.query(QCStationAssignment).filter(QCStationAssignment.user_id == user_id).first()

    if not assignment:
        # Fallback general
        assignment = db.query(QCStationAssignment).first()
        if not assignment:
            return {"active": False, "message": "No hay órdenes ni asignaciones registradas"}

    # Sincronizar nombre únicamente con el titular asignado a la estación (NUNCA pisar con el nombre de apoyo o supervisor)
    u_latest = db.query(QCUser).filter(QCUser.id == assignment.user_id).first()
    if u_latest and u_latest.id == assignment.user_id and u_latest.name != assignment.user_name:
        assignment.user_name = u_latest.name
        db.commit()

    order = db.query(QCOrder).filter(QCOrder.order_id == assignment.order_id).first()
    
    # DEDUPLICAR all_steps por step_number para evitar duplicados en checklists importados o modificados
    all_steps_raw = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == order.model_name).order_by(QCChecklistItem.step_number, QCChecklistItem.id).all()
    unique_steps_map = {}
    for it in all_steps_raw:
        if it.step_number not in unique_steps_map:
            unique_steps_map[it.step_number] = it
    all_steps = [unique_steps_map[k] for k in sorted(unique_steps_map.keys())]

    units_in_station = db.query(QCPCUnit).filter(
        QCPCUnit.order_id == order.order_id,
        QCPCUnit.current_station == assignment.station_number,
        QCPCUnit.overall_status.in_(["PENDING", "IN_PROGRESS"])
    ).order_by(QCPCUnit.unit_number).all()

    # Selección libre de PC: si el técnico especificó una PC concreta disponible en su estación, usarla
    active_unit = None
    if unit_number is not None:
        active_unit = next((u for u in units_in_station if u.unit_number == unit_number), None)
    if not active_unit:
        active_unit = units_in_station[0] if units_in_station else None

    # Consultar reasignaciones / derivaciones de pasos para esta orden
    overrides = db.query(QCStepStationOverride).filter(QCStepStationOverride.order_id == order.order_id).all()
    active_overrides = [
        o for o in overrides 
        if o.unit_number is None or (active_unit and o.unit_number == active_unit.unit_number)
    ]
    out_step_map = {o.step_number: o for o in active_overrides if o.from_station == assignment.station_number}
    in_step_map = {o.step_number: o for o in active_overrides if o.target_station == assignment.station_number}

    # Determinar qué pasos pertenecen originalmente a esta estación (manual o por rango)
    assigned_step_numbers = set()
    if assignment.step_numbers:
        try:
            assigned_step_numbers = {
                int(x.strip()) for x in assignment.step_numbers.split(",") if x.strip().isdigit()
            }
        except Exception:
            assigned_step_numbers = set()

    is_station_own_step = lambda num: (
        num in assigned_step_numbers if assigned_step_numbers
        else (assignment.start_step <= num <= assignment.end_step)
    )

    all_stations = db.query(QCStationAssignment).filter(
        QCStationAssignment.order_id == order.order_id
    ).order_by(QCStationAssignment.station_number).all()

    # Mapeo de técnicos asignados a cada paso (soporte para 2 o más técnicos por estación o pasos compartidos)
    step_techs_map = {}
    for st in all_stations:
        st_steps = []
        if st.step_numbers:
            try:
                st_steps = [int(x.strip()) for x in st.step_numbers.split(",") if x.strip().isdigit()]
            except Exception:
                st_steps = []
        if not st_steps and st.start_step and st.end_step:
            st_steps = list(range(st.start_step, st.end_step + 1))
        
        for sn in st_steps:
            if sn not in step_techs_map:
                step_techs_map[sn] = []
            if st.user_id and st.user_name:
                if not any(t["id"] == st.user_id for t in step_techs_map[sn]):
                    step_techs_map[sn].append({
                        "id": st.user_id,
                        "name": st.user_name,
                        "station_number": st.station_number,
                        "station_name": st.station_name,
                        "is_secondary": False
                    })
            if st.secondary_user_id and st.secondary_user_name:
                if not any(t["id"] == st.secondary_user_id for t in step_techs_map[sn]):
                    step_techs_map[sn].append({
                        "id": st.secondary_user_id,
                        "name": st.secondary_user_name,
                        "station_number": st.station_number,
                        "station_name": st.station_name,
                        "is_secondary": True
                    })

    # Calcular la lista de pasos que esta estación debe ejecutar con DEDUPLICACIÓN ESTRICTA
    station_steps = []
    seen_station_step_nums = set()
    for s in all_steps:
        if s.step_number in seen_station_step_nums:
            continue

        assigned_techs = step_techs_map.get(s.step_number, [])
        if not assigned_techs:
            assigned_techs = []
            if assignment.user_name:
                assigned_techs.append({"id": assignment.user_id, "name": assignment.user_name, "station_number": assignment.station_number, "is_secondary": False})
            if assignment.secondary_user_name:
                assigned_techs.append({"id": assignment.secondary_user_id, "name": assignment.secondary_user_name, "station_number": assignment.station_number, "is_secondary": True})

        if s.step_number in in_step_map:
            # Paso recibido de otra estación
            o = in_step_map[s.step_number]
            station_steps.append({
                "id": s.id,
                "model_name": s.model_name,
                "step_number": s.step_number,
                "operation": s.operation,
                "description": s.description,
                "qc_criteria": s.qc_criteria,
                "media_url": s.media_url,
                "media_type": s.media_type,
                "is_delegated_in": True,
                "delegated_from_station": o.from_station,
                "delegated_reason": o.reason,
                "assigned_technicians": assigned_techs,
                "has_two_technicians": len(assigned_techs) >= 2,
                "primary_technician": assignment.user_name,
                "secondary_technician": assignment.secondary_user_name
            })
            seen_station_step_nums.add(s.step_number)
        elif is_station_own_step(s.step_number) and s.step_number not in out_step_map:
            # Paso original propio de la estación
            station_steps.append({
                "id": s.id,
                "model_name": s.model_name,
                "step_number": s.step_number,
                "operation": s.operation,
                "description": s.description,
                "qc_criteria": s.qc_criteria,
                "media_url": s.media_url,
                "media_type": s.media_type,
                "is_delegated_in": False,
                "assigned_technicians": assigned_techs,
                "has_two_technicians": len(assigned_techs) >= 2,
                "primary_technician": assignment.user_name,
                "secondary_technician": assignment.secondary_user_name
            })
            seen_station_step_nums.add(s.step_number)

    # Pasos transferidos fuera de esta estación
    transferred_out_steps = []
    for s in all_steps:
        if s.step_number in out_step_map:
            o = out_step_map[s.step_number]
            transferred_out_steps.append({
                "step_number": s.step_number,
                "operation": s.operation,
                "target_station": o.target_station,
                "reason": o.reason,
                "transferred_by": o.transferred_by
            })

    completed_steps_ids = []
    completed_step_logs = []
    pending_prior_steps = []
    if active_unit:
        logs = db.query(QCStepLog).filter(
            QCStepLog.order_id == order.order_id,
            QCStepLog.unit_number == active_unit.unit_number,
            QCStepLog.status == "PASS"
        ).all()
        completed_steps_ids = [l.step_number for l in logs]
        completed_step_logs = [
            {
                "step_number": l.step_number,
                "photo_url": l.photo_url,
                "user_name": l.user_name,
                "is_supervisor_verified": bool(l.is_supervisor_verified),
                "timestamp": l.timestamp.isoformat() if l.timestamp else None
            }
            for l in logs
        ]
        # Identificar si hay pasos de estaciones previas que aún falten completar (Deduplicados)
        current_station_step_nums = {s["step_number"] for s in station_steps}
        min_own_step = min(assigned_step_numbers) if assigned_step_numbers else assignment.start_step
        seen_prior_step_nums = set()
        for s in all_steps:
            if (s.step_number < min_own_step 
                and s.step_number not in completed_steps_ids 
                and s.step_number not in current_station_step_nums
                and s.step_number not in seen_prior_step_nums):
                pending_prior_steps.append(s)
                seen_prior_step_nums.add(s.step_number)

    queue_units = [u for u in units_in_station if active_unit and u.unit_number != active_unit.unit_number]
    completed_units = db.query(QCPCUnit).filter(
        QCPCUnit.order_id == order.order_id,
        QCPCUnit.current_station > assignment.station_number
    ).order_by(QCPCUnit.unit_number.desc()).limit(15).all()

    # Consultar último visto bueno de auditoría de supervisión para la unidad activa
    supervisor_audit = None
    if active_unit:
        import json
        aud = db.query(QCSupervisorAudit).filter(
            QCSupervisorAudit.order_id == order.order_id,
            QCSupervisorAudit.unit_number == active_unit.unit_number
        ).order_by(QCSupervisorAudit.created_at.desc()).first()
        if aud:
            checks = []
            if aud.checks_json:
                try:
                    checks = json.loads(aud.checks_json)
                except Exception:
                    checks = []
            supervisor_audit = {
                "id": aud.id,
                "order_id": aud.order_id,
                "unit_number": aud.unit_number,
                "supervisor_id": aud.supervisor_id,
                "supervisor_name": aud.supervisor_name,
                "status": aud.status,
                "checks": checks,
                "photo_url": aud.photo_url,
                "notes": aud.notes or "",
                "created_at": aud.created_at.isoformat() if aud.created_at else None
            }

    return {
        "active": True,
        "assignment": assignment,
        "order": order,
        "supervisor_id": order.supervisor_id,
        "supervisor_name": order.supervisor_name,
        "available_orders": available_orders_info,
        "station_steps": station_steps,
        "transferred_out_steps": transferred_out_steps,
        "pending_prior_steps": pending_prior_steps,
        "all_stations": all_stations,
        "active_unit": active_unit,
        "units_in_station": units_in_station,
        "completed_step_numbers": completed_steps_ids,
        "completed_step_logs": completed_step_logs,
        "queue_units": queue_units,
        "completed_units": completed_units,
        "is_support_operator": is_support,
        "requesting_user": {
            "id": requesting_user.id if requesting_user else user_id,
            "name": requesting_user.name if requesting_user else user_id,
            "role": requesting_user.role if requesting_user else "OPERATOR"
        },
        "supervisor_audit": supervisor_audit
    }

@api_router.post("/supervisor/verify-step-photo")
def supervisor_verify_step_photo(req: SupervisorStepPhotoVerify, db: Session = Depends(get_db)):
    """El supervisor valida que un paso ya se cumplió tomando la foto de evidencia."""
    unit = db.query(QCPCUnit).filter(
        QCPCUnit.order_id == req.order_id,
        QCPCUnit.unit_number == req.unit_number
    ).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unidad de PC no encontrada")

    # Eliminar log de PASS previo para este paso si existiese, para sustituirlo por la validación oficial del supervisor
    db.query(QCStepLog).filter(
        QCStepLog.order_id == req.order_id,
        QCStepLog.unit_number == req.unit_number,
        QCStepLog.step_number == req.step_number,
        QCStepLog.status == "PASS"
    ).delete()

    supervisor_log = QCStepLog(
        order_id=req.order_id,
        unit_number=req.unit_number,
        step_number=req.step_number,
        station_number=req.station_number or unit.current_station,
        user_id=req.supervisor_id,
        user_name=f"{req.supervisor_name} (Supervisor)",
        status="PASS",
        photo_url=req.photo_url,
        is_supervisor_verified=True,
        notes=req.notes or "Cumplimiento verificado con foto por Supervisor de Calidad",
        timestamp=datetime.utcnow()
    )
    db.add(supervisor_log)

    if unit.overall_status == "PENDING":
        unit.overall_status = "IN_PROGRESS"
        unit.started_at = datetime.utcnow()
    unit.current_step_progress = max(unit.current_step_progress, req.step_number)

    db.commit()
    db.refresh(supervisor_log)

    return {
        "message": f"Paso {req.step_number} verificado con foto por el supervisor {req.supervisor_name}",
        "log": {
            "id": supervisor_log.id,
            "step_number": supervisor_log.step_number,
            "photo_url": supervisor_log.photo_url,
            "user_name": supervisor_log.user_name,
            "is_supervisor_verified": True,
            "timestamp": supervisor_log.timestamp.isoformat()
        }
    }

@api_router.post("/supervisor/approve-unit")
def approve_unit_supervisor(req: SupervisorAuditCreate, db: Session = Depends(get_db)):
    """Registrar Visto Bueno o Dictamen de Auditoría de Calidad por el Supervisor para una PC"""
    unit = db.query(QCPCUnit).filter(
        QCPCUnit.order_id == req.order_id,
        QCPCUnit.unit_number == req.unit_number
    ).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unidad de PC no encontrada")

    import json
    checks_str = json.dumps(req.checks or [])
    
    audit_record = QCSupervisorAudit(
        order_id=req.order_id,
        unit_number=req.unit_number,
        supervisor_id=req.supervisor_id,
        supervisor_name=req.supervisor_name,
        status=req.status or "APPROVED",
        checks_json=checks_str,
        photo_url=req.photo_url,
        notes=req.notes or ""
    )
    db.add(audit_record)

    # Registrar en logs de calidad oficiales
    audit_log = QCStepLog(
        order_id=req.order_id,
        unit_number=req.unit_number,
        step_number=999, # Código de Auditoría Oficial de Supervisión
        station_number=unit.current_station,
        user_id=req.supervisor_id,
        user_name=f"{req.supervisor_name} (Supervisor)",
        status="PASS" if req.status == "APPROVED" else "FAIL",
        photo_url=req.photo_url,
        is_supervisor_verified=True,
        notes=f"Auditoría Supervisor: {req.notes or 'Visto Bueno Conforme'}. Verificaciones: {', '.join(req.checks or [])}"
    )
    db.add(audit_log)

    if req.status == "REJECTED":
        unit.overall_status = "FAILED"
    elif req.status == "APPROVED" and unit.overall_status == "FAILED":
        unit.overall_status = "IN_PROGRESS"

    db.commit()
    db.refresh(audit_record)

    return {
        "message": f"✓ Visto Bueno registrado exitosamente para la PC #{req.unit_number} por {req.supervisor_name}",
        "audit": {
            "id": audit_record.id,
            "order_id": audit_record.order_id,
            "unit_number": audit_record.unit_number,
            "supervisor_id": audit_record.supervisor_id,
            "supervisor_name": audit_record.supervisor_name,
            "status": audit_record.status,
            "checks": req.checks or [],
            "photo_url": audit_record.photo_url,
            "notes": audit_record.notes,
            "created_at": audit_record.created_at.isoformat() if audit_record.created_at else None
        }
    }

@api_router.get("/supervisor/unit/{order_id}/{unit_number}/audit")
def get_unit_supervisor_audit(order_id: str, unit_number: int, db: Session = Depends(get_db)):
    """Consultar auditorías y visto bueno de supervisión para una PC específica"""
    audits = db.query(QCSupervisorAudit).filter(
        QCSupervisorAudit.order_id == order_id,
        QCSupervisorAudit.unit_number == unit_number
    ).order_by(QCSupervisorAudit.created_at.desc()).all()
    
    import json
    result = []
    for a in audits:
        checks = []
        if a.checks_json:
            try:
                checks = json.loads(a.checks_json)
            except Exception:
                checks = []
        result.append({
            "id": a.id,
            "order_id": a.order_id,
            "unit_number": a.unit_number,
            "supervisor_id": a.supervisor_id,
            "supervisor_name": a.supervisor_name,
            "status": a.status,
            "checks": checks,
            "photo_url": a.photo_url,
            "notes": a.notes,
            "created_at": a.created_at.isoformat() if a.created_at else None
        })
    return {"order_id": order_id, "unit_number": unit_number, "audits": result, "latest": result[0] if result else None}


@api_router.post("/operator/submit-step")
def submit_step_check(req: StepLogCreate, db: Session = Depends(get_db)):
    new_log = QCStepLog(
        order_id=req.order_id,
        unit_number=req.unit_number,
        step_number=req.step_number,
        station_number=req.station_number,
        user_id=req.user_id,
        user_name=req.user_name,
        status=req.status,
        photo_url=req.photo_url,
        notes=req.notes,
        timestamp=datetime.utcnow()
    )
    db.add(new_log)

    unit = db.query(QCPCUnit).filter(
        QCPCUnit.order_id == req.order_id,
        QCPCUnit.unit_number == req.unit_number
    ).first()
    
    if unit:
        if unit.overall_status == "PENDING":
            unit.overall_status = "IN_PROGRESS"
            unit.started_at = datetime.utcnow()
        if req.status == "PASS":
            unit.current_step_progress = max(unit.current_step_progress, req.step_number)
        elif req.status == "FAIL":
            unit.overall_status = "FAILED"

    db.commit()
    return {"message": "Paso registrado con trazabilidad completa", "log_id": new_log.id, "timestamp": new_log.timestamp}

@api_router.post("/operator/uncheck-step")
def uncheck_step(req: StepUncheckRequest, db: Session = Depends(get_db)):
    """Desmarcar un proceso previamente aprobado para permitir correcciones inmediatas"""
    # 1. Eliminar o invalidar el registro de PASS de este paso para esta PC
    db.query(QCStepLog).filter(
        QCStepLog.order_id == req.order_id,
        QCStepLog.unit_number == req.unit_number,
        QCStepLog.step_number == req.step_number,
        QCStepLog.status == "PASS"
    ).delete()

    # 2. Registrar log de desmarcado en la auditoría
    uncheck_log = QCStepLog(
        order_id=req.order_id,
        unit_number=req.unit_number,
        step_number=req.step_number,
        station_number=req.station_number,
        user_id=req.user_id,
        user_name=req.user_name,
        status="UNCHECK",
        notes=req.reason or "Paso desmarcado para corrección por el técnico",
        timestamp=datetime.utcnow()
    )
    db.add(uncheck_log)

    # 3. Recalcular el progreso acumulado de la PC
    unit = db.query(QCPCUnit).filter(
        QCPCUnit.order_id == req.order_id,
        QCPCUnit.unit_number == req.unit_number
    ).first()
    
    if unit:
        remaining_logs = db.query(QCStepLog).filter(
            QCStepLog.order_id == req.order_id,
            QCStepLog.unit_number == req.unit_number,
            QCStepLog.status == "PASS"
        ).all()
        unit.current_step_progress = max([l.step_number for l in remaining_logs], default=0)
        
    db.commit()
    return {"message": f"Paso #{req.step_number} desmarcado", "step_number": req.step_number}

@api_router.post("/operator/finish-station")
def finish_station(data: dict, db: Session = Depends(get_db)):
    order_id = data.get("order_id")
    unit_number = data.get("unit_number")
    station_number = data.get("station_number")

    unit = db.query(QCPCUnit).filter(
        QCPCUnit.order_id == order_id,
        QCPCUnit.unit_number == unit_number
    ).first()
    
    if not unit:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")

    order = db.query(QCOrder).filter(QCOrder.order_id == order_id).first()
    next_station = station_number + 1
    if next_station > order.total_stations:
        unit.current_station = next_station
        unit.overall_status = "PASSED"
        unit.completed_at = datetime.utcnow()
    else:
        unit.current_station = next_station
        unit.overall_status = "PENDING"

    db.commit()
    return {
        "message": f"PC #{unit_number} enviada a Estación {next_station if next_station <= order.total_stations else 'FINALIZADO'}",
        "next_station": next_station,
        "is_finished": next_station > order.total_stations
    }

@api_router.post("/operator/report-issue")
def report_issue(req: IssueCreate, db: Session = Depends(get_db)):
    issue = QCIssue(
        order_id=req.order_id,
        unit_number=req.unit_number,
        step_number=req.step_number,
        station_number=req.station_number,
        reported_by=req.reported_by,
        issue_title=req.issue_title,
        description=req.description,
        severity=req.severity,
        photo_url=req.photo_url,
        status="OPEN"
    )
    db.add(issue)

    # Registrar el evento FAIL en QCStepLog para auditoría forense
    fail_log = QCStepLog(
        order_id=req.order_id,
        unit_number=req.unit_number,
        step_number=req.step_number,
        station_number=req.station_number,
        user_id=req.reported_by,
        user_name=req.reported_by,
        status="FAIL",
        notes=f"[{req.severity}] {req.issue_title}: {req.description}",
        timestamp=datetime.utcnow()
    )
    db.add(fail_log)

    unit = db.query(QCPCUnit).filter(
        QCPCUnit.order_id == req.order_id,
        QCPCUnit.unit_number == req.unit_number
    ).first()
    if unit:
        unit.overall_status = "FAILED"

    db.commit()
    return {
        "message": f"Falla registrada con evidencia fotográfica en PC #{req.unit_number}. Unidad aislada del pipeline.",
        "issue_id": issue.id,
        "photo_url": req.photo_url,
        "unit_number": req.unit_number
    }

@api_router.post("/operator/transfer-station")
def transfer_unit_station(req: TransferUnitRequest, db: Session = Depends(get_db)):
    """Derivar o transferir una PC de una estación a otra para balanceo de carga o terminación de tareas"""
    unit = db.query(QCPCUnit).filter(
        QCPCUnit.order_id == req.order_id,
        QCPCUnit.unit_number == req.unit_number
    ).first()
    if not unit:
        raise HTTPException(status_code=404, detail=f"PC #{req.unit_number} no encontrada")

    order = db.query(QCOrder).filter(QCOrder.order_id == req.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    # Registrar en la auditoría forense la derivación de estación
    transfer_log = QCStepLog(
        order_id=req.order_id,
        unit_number=req.unit_number,
        step_number=0,
        station_number=req.from_station,
        user_id=req.transferred_by,
        user_name=req.transferred_by,
        status="TRANSFER",
        notes=f"Derivada a Estación {req.target_station}. Motivo: {req.reason or 'Reasignación de flujo'}",
        timestamp=datetime.utcnow()
    )
    db.add(transfer_log)

    unit.current_station = req.target_station
    if req.target_station > order.total_stations:
        unit.overall_status = "PASSED"
        unit.completed_at = datetime.utcnow()
    else:
        if unit.overall_status == "PENDING":
            unit.overall_status = "IN_PROGRESS"

    db.commit()
    return {
        "message": f"PC #{req.unit_number} derivada exitosamente a Estación {req.target_station}",
        "target_station": req.target_station
    }

@api_router.post("/operator/reassign-step")
def reassign_step_to_station(req: StepReassignRequest, db: Session = Depends(get_db)):
    """Reasignar un paso individual de checklist a otra estación (para la PC actual o para todo el lote)"""
    existing = db.query(QCStepStationOverride).filter(
        QCStepStationOverride.order_id == req.order_id,
        QCStepStationOverride.unit_number == req.unit_number,
        QCStepStationOverride.step_number == req.step_number
    ).first()

    if existing:
        existing.from_station = req.from_station
        existing.target_station = req.target_station
        existing.transferred_by = req.transferred_by
        existing.reason = req.reason
    else:
        override = QCStepStationOverride(
            order_id=req.order_id,
            unit_number=req.unit_number,
            step_number=req.step_number,
            from_station=req.from_station,
            target_station=req.target_station,
            transferred_by=req.transferred_by,
            reason=req.reason
        )
        db.add(override)

    # Registrar en auditoría forense
    scope_text = f"PC #{req.unit_number}" if req.unit_number else "Todo el lote"
    step_item = db.query(QCChecklistItem).filter(QCChecklistItem.step_number == req.step_number).first()
    op_name = step_item.operation if step_item else f"Paso #{req.step_number}"
    
    log = QCStepLog(
        order_id=req.order_id,
        unit_number=req.unit_number or 0,
        step_number=req.step_number,
        station_number=req.from_station,
        user_id=req.transferred_by,
        user_name=req.transferred_by,
        status="REASSIGN_STEP",
        notes=f"Paso #{req.step_number} ({op_name}) derivado: E{req.from_station} ➔ E{req.target_station} [{scope_text}]. Motivo: {req.reason}",
        timestamp=datetime.utcnow()
    )
    db.add(log)
    db.commit()

    return {
        "message": f"Paso #{req.step_number} reasignado exitosamente a Estación {req.target_station}",
        "step_number": req.step_number,
        "target_station": req.target_station
    }

@api_router.post("/orders/reassign-emergency")
def reassign_station_emergency(req: ReassignEmergencyRequest, db: Session = Depends(get_db)):
    assignment = db.query(QCStationAssignment).filter(
        QCStationAssignment.order_id == req.order_id,
        QCStationAssignment.station_number == req.station_number
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Estación no encontrada en esta orden")

    old_user = f"{assignment.user_name} ({assignment.user_id})"
    assignment.user_id = req.new_user_id
    assignment.user_name = req.new_user_name

    log_reassign = QCStepLog(
        order_id=req.order_id,
        unit_number=0,
        step_number=assignment.start_step,
        station_number=req.station_number,
        user_id=req.new_user_id,
        user_name=req.new_user_name,
        status="REASSIGNED",
        notes=f"Reasignación de emergencia de {old_user} a {req.new_user_name}. Motivo: {req.reason}",
        timestamp=datetime.utcnow()
    )
    db.add(log_reassign)
    db.commit()

    return {"message": f"Estación {req.station_number} reasignada con éxito a {req.new_user_name}"}

@api_router.post("/upload-media")
async def upload_media(file: UploadFile = File(...)):
    filename = f"{int(datetime.utcnow().timestamp())}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {
        "url": f"/uploads/{filename}",
        "filename": filename,
        "type": "gif" if filename.lower().endswith(".gif") else "image"
    }

@api_router.post("/camera/capture-base64")
async def capture_camera_photo(data: dict):
    """Guarda una fotografía capturada en tiempo real comprimida en WebP/JPEG"""
    import base64
    image_data = data.get("image")
    if not image_data:
        raise HTTPException(status_code=400, detail="No se recibió imagen de la cámara")
    
    ext = "webp" if "image/webp" in image_data else "jpg"
    if "," in image_data:
        image_data = image_data.split(",")[1]
        
    try:
        img_bytes = base64.b64decode(image_data)
        prefix = data.get("prefix", "step")
        filename = f"{prefix}_{int(datetime.utcnow().timestamp())}_{int(time.time() * 1000) % 1000}.{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(img_bytes)
            
        return {
            "url": f"/uploads/{filename}",
            "filename": filename,
            "type": "image"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando captura de cámara: {str(e)}")

@api_router.get("/orders/{order_id}/logs")
def get_order_audit_logs(order_id: str, db: Session = Depends(get_db)):
    return db.query(QCStepLog).filter(QCStepLog.order_id == order_id).order_by(QCStepLog.timestamp.desc()).all()

# Registrar todas las rutas de API
app.include_router(api_router, prefix="/api")

# Servir Frontend Compilado (Vite React) de forma integrada
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static")
if os.path.exists(STATIC_DIR):
    assets_dir = os.path.join(STATIC_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        file_path = os.path.join(STATIC_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(STATIC_DIR, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "QC KENYA API activa", "status": "ok"}
