import os
import shutil
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from .database import engine, Base, get_db
from .models import QCUser, QCModel, QCChecklistItem, QCOrder, QCStationAssignment, QCPCUnit, QCStepLog, QCIssue
from .schemas import (
    QCUserSchema, ModelSchema, ChecklistItemSchema,
    OrderCreateRequest, OrderDetailSchema,
    StepLogCreate, StepLogSchema,
    IssueCreate, IssueSchema,
    ReassignEmergencyRequest
)
from .seed_data import seed_database
from .excel_handler import generate_checklist_excel, parse_checklist_excel

# Crear tablas e inicializar datos base
Base.metadata.create_all(bind=engine)
with next(get_db()) as db_session:
    seed_database(db_session)

app = FastAPI(
    title="QC KENYA - API de Control de Calidad Industrial",
    description="Sistema de Flujo en Cadena (Pipeline) para Control de Calidad de Computadoras KENYA",
    version="2.0.0"
)

# Habilitar CORS para conectar con React / Dokploy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir archivos subidos (GIFs, fotos)
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ==========================================
# RUTAS: USUARIOS Y AUTENTICACIÓN / ROLES
# ==========================================

@app.get("/api/users", response_model=List[QCUserSchema])
def get_users(db: Session = Depends(get_db)):
    return db.query(QCUser).filter(QCUser.is_active == True).all()

# ==========================================
# RUTAS: GESTIÓN DE MODELOS Y CHECKLISTS
# ==========================================

@app.get("/api/models")
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

@app.post("/api/models")
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

@app.get("/api/models/{model_name}/checklist", response_model=List[ChecklistItemSchema])
def get_model_checklist(model_name: str, db: Session = Depends(get_db)):
    items = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == model_name).order_by(QCChecklistItem.step_number).all()
    return items

@app.post("/api/models/{model_name}/checklist")
def save_checklist_item(model_name: str, item: ChecklistItemSchema, db: Session = Depends(get_db)):
    # Si viene con ID, actualizar
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
    
    # Si no tiene ID o no existe, crear nuevo
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

@app.delete("/api/models/{model_name}/checklist/{step_id}")
def delete_checklist_item(model_name: str, step_id: int, db: Session = Depends(get_db)):
    item = db.query(QCChecklistItem).filter(QCChecklistItem.id == step_id, QCChecklistItem.model_name == model_name).first()
    if not item:
        raise HTTPException(status_code=404, detail="Paso no encontrado")
    db.delete(item)
    db.commit()
    return {"message": "Paso eliminado correctamente"}

# ==========================================
# RUTAS: IMPORTACIÓN / EXPORTACIÓN EXCEL
# ==========================================

@app.get("/api/models/{model_name}/export-excel")
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

@app.post("/api/models/{model_name}/import-excel")
async def import_model_excel(model_name: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    parsed_items = parse_checklist_excel(content)
    
    if not parsed_items:
        raise HTTPException(status_code=400, detail="No se encontraron filas válidas en el archivo Excel")
    
    # Reemplazar pasos existentes del modelo
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

# ==========================================
# RUTAS: GESTIÓN DE ÓRDENES Y PIPELINE
# ==========================================

@app.get("/api/orders")
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

@app.post("/api/orders")
def create_order(req: OrderCreateRequest, db: Session = Depends(get_db)):
    existing = db.query(QCOrder).filter(QCOrder.order_id == req.order_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="El número de orden ya existe")

    # Obtener total de pasos del modelo
    steps = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == req.model_name).order_by(QCChecklistItem.step_number).all()
    total_steps = len(steps)
    if total_steps == 0:
        raise HTTPException(status_code=400, detail="El modelo seleccionado no tiene pasos configurados en su checklist")

    num_stations = len(req.stations)
    if num_stations == 0:
        raise HTTPException(status_code=400, detail="Debe asignar al menos 1 estación de trabajo")

    # Crear Orden
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

    # División inteligente y equitativa de pasos entre estaciones
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

    # Generar las unidades físicas de PC para el lote
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

@app.get("/api/orders/{order_id}")
def get_order_detail(order_id: str, db: Session = Depends(get_db)):
    order = db.query(QCOrder).filter(QCOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    
    stations = db.query(QCStationAssignment).filter(QCStationAssignment.order_id == order_id).order_by(QCStationAssignment.station_number).all()
    units = db.query(QCPCUnit).filter(QCPCUnit.order_id == order_id).order_by(QCPCUnit.unit_number).all()
    
    return {
        "order": order,
        "stations": stations,
        "units": units
    }

@app.get("/api/orders/{order_id}/matrix")
def get_order_matrix(order_id: str, db: Session = Depends(get_db)):
    order = db.query(QCOrder).filter(QCOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    
    stations = db.query(QCStationAssignment).filter(QCStationAssignment.order_id == order_id).order_by(QCStationAssignment.station_number).all()
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

# ==========================================
# RUTAS: EJECUCIÓN DE ESTACIÓN (OPERARIO)
# ==========================================

@app.get("/api/operator/{user_id}/station")
def get_operator_workspace(user_id: str, order_id: Optional[str] = None, db: Session = Depends(get_db)):
    # Buscar asignación activa del usuario
    query = db.query(QCStationAssignment).join(QCOrder).filter(
        QCStationAssignment.user_id == user_id,
        QCOrder.status == "IN_PROGRESS"
    )
    if order_id:
        query = query.filter(QCStationAssignment.order_id == order_id)
    
    assignment = query.first()
    if not assignment:
        # Si no tiene asignación directa con su ID, buscar cualquier orden activa para vista demo
        assignment = db.query(QCStationAssignment).first()
        if not assignment:
            return {"active": False, "message": "No hay asignaciones activas para este usuario"}

    order = db.query(QCOrder).filter(QCOrder.order_id == assignment.order_id).first()
    
    # Obtener pasos de checklist que le corresponden a esta estación
    all_steps = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == order.model_name).order_by(QCChecklistItem.step_number).all()
    station_steps = [s for s in all_steps if assignment.start_step <= s.step_number <= assignment.end_step]

    # Identificar unidades:
    # 1. Unidades en esta estación
    units_in_station = db.query(QCPCUnit).filter(
        QCPCUnit.order_id == order.order_id,
        QCPCUnit.current_station == assignment.station_number,
        QCPCUnit.overall_status.in_(["PENDING", "IN_PROGRESS"])
    ).order_by(QCPCUnit.unit_number).all()

    # Unidad activa actual (la primera en la cola de esta estación)
    active_unit = units_in_station[0] if units_in_station else None

    # Si hay unidad activa, obtener los logs de pasos que ya hizo para esa unidad
    completed_steps_ids = []
    if active_unit:
        logs = db.query(QCStepLog).filter(
            QCStepLog.order_id == order.order_id,
            QCStepLog.unit_number == active_unit.unit_number,
            QCStepLog.station_number == assignment.station_number,
            QCStepLog.status == "PASS"
        ).all()
        completed_steps_ids = [l.step_number for l in logs]

    # Cola de unidades siguientes
    queue_units = units_in_station[1:] if len(units_in_station) > 1 else []

    # Unidades ya completadas por esta estación
    completed_units = db.query(QCPCUnit).filter(
        QCPCUnit.order_id == order.order_id,
        QCPCUnit.current_station > assignment.station_number
    ).order_by(QCPCUnit.unit_number.desc()).limit(10).all()

    return {
        "active": True,
        "assignment": assignment,
        "order": order,
        "station_steps": station_steps,
        "active_unit": active_unit,
        "completed_step_numbers": completed_steps_ids,
        "queue_units": queue_units,
        "completed_units": completed_units
    }

@app.post("/api/operator/submit-step")
def submit_step_check(req: StepLogCreate, db: Session = Depends(get_db)):
    # Guardar en registro de auditoría inmutable
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

    # Actualizar estado de la unidad a IN_PROGRESS si estaba en PENDING
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

@app.post("/api/operator/finish-station")
def finish_station(data: dict, db: Session = Depends(get_db)):
    order_id = data.get("order_id")
    unit_number = data.get("unit_number")
    station_number = data.get("station_number")
    user_name = data.get("user_name", "Operario")

    unit = db.query(QCPCUnit).filter(
        QCPCUnit.order_id == order_id,
        QCPCUnit.unit_number == unit_number
    ).first()
    
    if not unit:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")

    order = db.query(QCOrder).filter(QCOrder.order_id == order_id).first()

    # Avanzar al siguiente paso del pipeline
    next_station = station_number + 1
    if next_station > order.total_stations:
        # Completó la última estación
        unit.current_station = next_station
        unit.overall_status = "PASSED"
        unit.completed_at = datetime.utcnow()
    else:
        unit.current_station = next_station
        unit.overall_status = "PENDING"

    db.commit()

    return {
        "message": f"PC #{unit_number} completada en Estación {station_number} y enviada a Estación {next_station if next_station <= order.total_stations else 'FINALIZADO'}",
        "next_station": next_station,
        "is_finished": next_station > order.total_stations
    }

@app.post("/api/operator/report-issue")
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
        status="OPEN"
    )
    db.add(issue)

    unit = db.query(QCPCUnit).filter(
        QCPCUnit.order_id == req.order_id,
        QCPCUnit.unit_number == req.unit_number
    ).first()
    if unit:
        unit.overall_status = "FAILED"

    db.commit()
    return {"message": "Incidencia registrada y PC bloqueada para revisión técnica", "issue_id": issue.id}

# ==========================================
# RUTAS: REASIGNACIÓN DE EMERGENCIA
# ==========================================

@app.post("/api/orders/reassign-emergency")
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

    # Registrar evento en logs
    log_reassign = QCStepLog(
        order_id=req.order_id,
        unit_number=0, # General de la estación
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

# ==========================================
# RUTAS: CARGA DE MULTIMEDIA (GIFs / IMÁGENES)
# ==========================================

@app.post("/api/upload-media")
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

# ==========================================
# RUTAS: AUDITORÍA Y TRAZABILIDAD
# ==========================================

@app.get("/api/orders/{order_id}/logs")
def get_order_audit_logs(order_id: str, db: Session = Depends(get_db)):
    logs = db.query(QCStepLog).filter(QCStepLog.order_id == order_id).order_by(QCStepLog.timestamp.desc()).all()
    return logs
