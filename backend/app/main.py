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
from .models import QCUser, QCModel, QCChecklistItem, QCOrder, QCStationAssignment, QCPCUnit, QCStepLog, QCIssue, QCStepStationOverride
from .schemas import (
    QCUserSchema, QCUserCreate, QCUserUpdate, AddUnitsRequest, ModelSchema, ChecklistItemSchema,
    OrderCreateRequest, OrderDetailSchema,
    StepLogCreate, StepLogSchema, StepUncheckRequest,
    IssueCreate, IssueSchema,
    ReassignEmergencyRequest, TransferUnitRequest, StepReassignRequest,
    AuthRegister, AuthLogin, TokenResponse
)
from .seed_data import seed_database, DEFAULT_USERS
from .excel_handler import generate_checklist_excel, parse_checklist_excel
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

# Directorio de subidas
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

def auto_migrate_schema():
    """Migración automática de columnas para PostgreSQL / SQLite sin romper datos existentes"""
    migrations = [
        "ALTER TABLE qc_users ADD COLUMN IF NOT EXISTS email VARCHAR(150);",
        "ALTER TABLE qc_users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);",
        "ALTER TABLE qc_users ADD COLUMN IF NOT EXISTS avatar VARCHAR(255);",
        "ALTER TABLE qc_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE qc_issues ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);",
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
    
    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(
        access_token=token,
        user=QCUserSchema.model_validate(user)
    )

@api_router.get("/auth/me", response_model=QCUserSchema)
def get_current_user_info(current_user: QCUser = Depends(require_auth)):
    """Obtener información del usuario autenticado."""
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
        raise HTTPException(status_code=400, detail="El modelo ya existe")
    
    new_model = QCModel(name=name, description=data.get("description", ""))
    db.add(new_model)
    db.commit()
    db.refresh(new_model)
    return new_model

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
        media_type=item.media_type
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

@api_router.get("/models/{model_name}/export-excel")
def export_model_excel(model_name: str, db: Session = Depends(get_db)):
    items = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == model_name).order_by(QCChecklistItem.step_number).all()
    items_data = [
        {
            "step_number": it.step_number,
            "operation": it.operation,
            "description": it.description,
            "qc_criteria": it.qc_criteria,
            "media_url": it.media_url
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
        raise HTTPException(status_code=400, detail="No se encontraron filas válidas en el archivo Excel")
    
    db.query(QCChecklistItem).filter(QCChecklistItem.model_name == model_name).delete()
    for it in parsed_items:
        db.add(QCChecklistItem(
            model_name=model_name,
            step_number=it["step_number"],
            operation=it["operation"],
            description=it["description"],
            qc_criteria=it["qc_criteria"],
            media_url=it.get("media_url", ""),
            media_type=it.get("media_type", "image")
        ))
    db.commit()
    return {"message": f"Se importaron {len(parsed_items)} pasos correctamente para el modelo {model_name}"}

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
    if num_stations == 0:
        raise HTTPException(status_code=400, detail="Debe asignar al menos 1 estación de trabajo")

    order = QCOrder(
        order_id=req.order_id,
        model_name=req.model_name,
        part_number=req.part_number,
        total_units=req.total_units,
        total_stations=num_stations,
        status="IN_PROGRESS",
        created_by=req.created_by
    )
    db.add(order)
    db.commit()

    base_step_count = total_steps // num_stations
    remainder = total_steps % num_stations

    current_start = 1
    for s_idx, st in enumerate(req.stations, start=1):
        extra = 1 if s_idx <= remainder else 0
        steps_for_station = base_step_count + extra
        current_end = current_start + steps_for_station - 1

        db.add(QCStationAssignment(
            order_id=req.order_id,
            station_number=s_idx,
            station_name=st.station_name or f"Estación {s_idx}",
            user_id=st.user_id,
            user_name=st.user_name,
            start_step=current_start,
            end_step=current_end
        ))
        current_start = current_end + 1
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
    db: Session = Depends(get_db)
):
    query = db.query(QCStationAssignment).join(QCOrder).filter(
        QCStationAssignment.user_id == user_id,
        QCOrder.status == "IN_PROGRESS"
    )
    if order_id:
        query = query.filter(QCStationAssignment.order_id == order_id)
    
    assignment = query.first()
    if not assignment:
        assignment = db.query(QCStationAssignment).first()
        if not assignment:
            return {"active": False, "message": "No hay asignaciones activas para este usuario"}

    # Sincronizar con el nombre más reciente del técnico
    u_latest = db.query(QCUser).filter(QCUser.id == assignment.user_id).first()
    if u_latest and u_latest.name != assignment.user_name:
        assignment.user_name = u_latest.name
        db.commit()

    order = db.query(QCOrder).filter(QCOrder.order_id == assignment.order_id).first()
    all_steps = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == order.model_name).order_by(QCChecklistItem.step_number).all()

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

    # Calcular la lista de pasos que esta estación debe ejecutar
    station_steps = []
    for s in all_steps:
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
                "delegated_reason": o.reason
            })
        elif assignment.start_step <= s.step_number <= assignment.end_step and s.step_number not in out_step_map:
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
                "is_delegated_in": False
            })

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
    pending_prior_steps = []
    if active_unit:
        logs = db.query(QCStepLog).filter(
            QCStepLog.order_id == order.order_id,
            QCStepLog.unit_number == active_unit.unit_number,
            QCStepLog.status == "PASS"
        ).all()
        completed_steps_ids = [l.step_number for l in logs]
        # Identificar si hay pasos de estaciones previas que aún falten completar
        current_station_step_nums = {s["step_number"] for s in station_steps}
        pending_prior_steps = [
            s for s in all_steps
            if s.step_number < assignment.start_step 
            and s.step_number not in completed_steps_ids 
            and s.step_number not in current_station_step_nums
        ]

    queue_units = [u for u in units_in_station if active_unit and u.unit_number != active_unit.unit_number]
    completed_units = db.query(QCPCUnit).filter(
        QCPCUnit.order_id == order.order_id,
        QCPCUnit.current_station > assignment.station_number
    ).order_by(QCPCUnit.unit_number.desc()).limit(15).all()

    all_stations = db.query(QCStationAssignment).filter(
        QCStationAssignment.order_id == order.order_id
    ).order_by(QCStationAssignment.station_number).all()

    return {
        "active": True,
        "assignment": assignment,
        "order": order,
        "station_steps": station_steps,
        "transferred_out_steps": transferred_out_steps,
        "pending_prior_steps": pending_prior_steps,
        "all_stations": all_stations,
        "active_unit": active_unit,
        "units_in_station": units_in_station,
        "completed_step_numbers": completed_steps_ids,
        "queue_units": queue_units,
        "completed_units": completed_units
    }

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
    """Guarda una fotografía capturada en tiempo real por la cámara mediante Python backend"""
    import base64
    image_data = data.get("image")
    if not image_data:
        raise HTTPException(status_code=400, detail="No se recibió imagen de la cámara")
    
    if "," in image_data:
        image_data = image_data.split(",")[1]
        
    try:
        img_bytes = base64.b64decode(image_data)
        filename = f"cam_{int(datetime.utcnow().timestamp())}.jpg"
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
