from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class QCUserSchema(BaseModel):
    id: str
    name: str
    role: str
    avatar: Optional[str] = None
    is_active: bool = True

    class Config:
        from_attributes = True

class QCUserCreate(BaseModel):
    id: Optional[str] = None
    name: str
    role: str = "OPERATOR"
    avatar: Optional[str] = None

class QCUserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    avatar: Optional[str] = None
    is_active: Optional[bool] = None

class AddUnitsRequest(BaseModel):
    count: int = 1
    custom_prefix: Optional[str] = None

class ChecklistItemSchema(BaseModel):
    id: Optional[int] = None
    model_name: str
    step_number: int
    operation: str
    description: Optional[str] = ""
    qc_criteria: str
    media_url: Optional[str] = ""
    media_type: Optional[str] = "gif"

    class Config:
        from_attributes = True

class ModelSchema(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = ""
    created_at: Optional[datetime] = None
    checklists: List[ChecklistItemSchema] = []

    class Config:
        from_attributes = True

class StationAssignmentCreate(BaseModel):
    station_number: int
    user_id: str
    user_name: str
    station_name: Optional[str] = ""

class StationAssignmentSchema(BaseModel):
    id: Optional[int] = None
    order_id: str
    station_number: int
    station_name: Optional[str] = ""
    user_id: str
    user_name: str
    start_step: int
    end_step: int

    class Config:
        from_attributes = True

class OrderCreateRequest(BaseModel):
    order_id: str
    model_name: str
    part_number: str
    total_units: int
    stations: List[StationAssignmentCreate]
    created_by: Optional[str] = "Administrador"

class StepLogCreate(BaseModel):
    order_id: str
    unit_number: int
    step_number: int
    station_number: int
    user_id: str
    user_name: str
    status: str # PASS, FAIL
    notes: Optional[str] = ""

class StepLogSchema(BaseModel):
    id: int
    order_id: str
    unit_number: int
    step_number: int
    station_number: int
    user_id: str
    user_name: str
    status: str
    notes: Optional[str] = ""
    timestamp: datetime

    class Config:
        from_attributes = True

class PCUnitSchema(BaseModel):
    id: int
    order_id: str
    unit_number: int
    serial_number: Optional[str] = ""
    current_station: int
    overall_status: str
    current_step_progress: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class IssueCreate(BaseModel):
    order_id: str
    unit_number: int
    step_number: int
    station_number: int
    reported_by: str
    issue_title: str
    description: Optional[str] = ""
    severity: Optional[str] = "CRITICAL"

class IssueSchema(BaseModel):
    id: int
    order_id: str
    unit_number: int
    step_number: int
    station_number: int
    reported_by: str
    issue_title: str
    description: Optional[str] = ""
    severity: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class ReassignEmergencyRequest(BaseModel):
    order_id: str
    station_number: int
    new_user_id: str
    new_user_name: str
    reason: Optional[str] = "Reasignación de emergencia"

class OrderDetailSchema(BaseModel):
    order_id: str
    model_name: str
    part_number: str
    total_units: int
    total_stations: int
    status: str
    created_at: datetime
    created_by: str
    stations: List[StationAssignmentSchema] = []
    units: List[PCUnitSchema] = []

    class Config:
        from_attributes = True
