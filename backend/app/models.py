from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class QCUser(Base):
    __tablename__ = "qc_users"

    id = Column(String(50), primary_key=True) # ej: "USR-01", "ADM-01"
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=True)
    role = Column(String(20), default="OPERATOR") # "ADMIN" o "OPERATOR"
    avatar = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)


class QCModel(Base):
    __tablename__ = "qc_models"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False) # GENWORK, PROWORK, OFISZU, RAITO
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    checklists = relationship("QCChecklistItem", back_populates="model", cascade="all, delete-orphan")

class QCChecklistItem(Base):
    __tablename__ = "qc_checklist_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String(50), ForeignKey("qc_models.name"), nullable=False)
    step_number = Column(Integer, nullable=False)
    operation = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    qc_criteria = Column(Text, nullable=False)
    media_url = Column(String(500), nullable=True) # URL de imagen o GIF instructivo
    media_type = Column(String(20), default="gif") # gif, image, video

    model = relationship("QCModel", back_populates="checklists")

class QCOrder(Base):
    __tablename__ = "qc_orders"

    order_id = Column(String(50), primary_key=True) # ej: "ORD-2026-0892"
    model_name = Column(String(50), nullable=False)
    part_number = Column(String(100), nullable=False)
    total_units = Column(Integer, nullable=False) # ej: 50
    total_stations = Column(Integer, nullable=False) # ej: 5
    status = Column(String(20), default="IN_PROGRESS") # IN_PROGRESS, COMPLETED, PAUSED
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String(100), default="Administrador")

    stations = relationship("QCStationAssignment", back_populates="order", cascade="all, delete-orphan")
    units = relationship("QCPCUnit", back_populates="order", cascade="all, delete-orphan")

class QCStationAssignment(Base):
    __tablename__ = "qc_station_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String(50), ForeignKey("qc_orders.order_id"), nullable=False)
    station_number = Column(Integer, nullable=False) # 1, 2, 3, 4, 5
    station_name = Column(String(100), nullable=True)
    user_id = Column(String(50), nullable=False)
    user_name = Column(String(100), nullable=False)
    start_step = Column(Integer, nullable=False) # ej: 1
    end_step = Column(Integer, nullable=False)   # ej: 11

    order = relationship("QCOrder", back_populates="stations")

class QCPCUnit(Base):
    __tablename__ = "qc_pc_units"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String(50), ForeignKey("qc_orders.order_id"), nullable=False)
    unit_number = Column(Integer, nullable=False) # 1 a 50
    serial_number = Column(String(100), nullable=True) # ej: KEN-2026-001
    current_station = Column(Integer, default=1) # 1 a N, o N+1 cuando está terminada
    overall_status = Column(String(20), default="PENDING") # PENDING, IN_PROGRESS, PASSED, FAILED, PAUSED
    current_step_progress = Column(Integer, default=0) # Total de pasos aprobados acumulados
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    order = relationship("QCOrder", back_populates="units")

class QCStepLog(Base):
    __tablename__ = "qc_step_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String(50), nullable=False)
    unit_number = Column(Integer, nullable=False)
    step_number = Column(Integer, nullable=False)
    station_number = Column(Integer, nullable=False)
    user_id = Column(String(50), nullable=False)
    user_name = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False) # PASS, FAIL, REASSIGNED
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class QCIssue(Base):
    __tablename__ = "qc_issues"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String(50), nullable=False)
    unit_number = Column(Integer, nullable=False)
    step_number = Column(Integer, nullable=False)
    station_number = Column(Integer, nullable=False)
    reported_by = Column(String(100), nullable=False)
    issue_title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), default="CRITICAL") # LOW, MEDIUM, HIGH, CRITICAL
    photo_url = Column(String(500), nullable=True)
    status = Column(String(20), default="OPEN") # OPEN, RESOLVED, DISMISSED
    created_at = Column(DateTime, default=datetime.utcnow)
