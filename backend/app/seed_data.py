import os
import re
from sqlalchemy.orm import Session
from .models import QCUser, QCModel, QCChecklistItem, QCOrder, QCStationAssignment, QCPCUnit, QCStepLog

DEFAULT_USERS = [
    {"id": "ADM-01", "name": "Ing. Carlos Mendoza (Admin QC)", "role": "ADMIN", "avatar": "CM"},
    {"id": "OP-101", "name": "Carlos Mendoza (Estación 1)", "role": "OPERATOR", "avatar": "CM"},
    {"id": "OP-102", "name": "Ana Quispe (Estación 2)", "role": "OPERATOR", "avatar": "AQ"},
    {"id": "OP-103", "name": "Roberto Diaz (Estación 3)", "role": "OPERATOR", "avatar": "RD"},
    {"id": "OP-104", "name": "Elena Ramos (Estación 4)", "role": "OPERATOR", "avatar": "ER"},
    {"id": "OP-105", "name": "Marco Solis (Estación 5)", "role": "OPERATOR", "avatar": "MS"},
    {"id": "OP-106", "name": "Jorge Valdivia (Suplente/Apoyo)", "role": "OPERATOR", "avatar": "JV"},
]

DEFAULT_MODELS = [
    {"name": "PROWORK", "description": "Línea de Alto Rendimiento Profesional y Estaciones de Trabajo"},
    {"name": "GENWORK", "description": "Línea Corporativa y Productividad Empresarial"},
    {"name": "OFISZU", "description": "Línea Ofimática y Educación Compacta"},
    {"name": "RAITO", "description": "Línea Gamer y Rendimiento Gráfico Extremo"},
]

def parse_txt_checklist():
    """Lee y parsea el archivo control_de_calidad.txt existente en el directorio raíz"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    txt_path = os.path.join(current_dir, "..", "..", "control_de_calidad.txt")
    
    steps = []
    if os.path.exists(txt_path):
        with open(txt_path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("CHECKLIST") or line.startswith("N° |"):
                    continue
                parts = [p.strip() for p in line.split("|")]
                if len(parts) >= 4 and parts[0].isdigit():
                    step_num = int(parts[0])
                    op = parts[1]
                    desc = parts[2]
                    criteria = parts[3]
                    
                    # Asignar un GIF o imagen de ejemplo representativa según tipo de paso
                    media_url = ""
                    if any(w in op.lower() for w in ["agitar", "cooler", "sticker", "película", "refrigeración"]):
                        media_url = f"https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&auto=format&fit=crop&q=80"
                    elif any(w in op.lower() for w in ["bios", "windows", "driver", "temperatura"]):
                        media_url = f"https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80"
                    else:
                        media_url = f"https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600&auto=format&fit=crop&q=80"

                    steps.append({
                        "step_number": step_num,
                        "operation": op,
                        "description": desc,
                        "qc_criteria": criteria,
                        "media_url": media_url,
                        "media_type": "gif" if "sticker" in op.lower() or "agitar" in op.lower() else "image"
                    })
    return steps

def seed_database(db: Session):
    # 1. Crear usuarios por defecto si no existen
    for u in DEFAULT_USERS:
        existing = db.query(QCUser).filter(QCUser.id == u["id"]).first()
        if not existing:
            db.add(QCUser(**u))
    db.commit()

    # 2. Crear modelos base
    for m in DEFAULT_MODELS:
        existing = db.query(QCModel).filter(QCModel.name == m["name"]).first()
        if not existing:
            db.add(QCModel(**m))
    db.commit()

    # 3. Cargar checklist de 52 pasos para PROWORK
    prowork_items = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == "PROWORK").all()
    if not prowork_items:
        parsed_steps = parse_txt_checklist()
        for step in parsed_steps:
            db.add(QCChecklistItem(
                model_name="PROWORK",
                step_number=step["step_number"],
                operation=step["operation"],
                description=step["description"],
                qc_criteria=step["qc_criteria"],
                media_url=step["media_url"],
                media_type=step["media_type"]
            ))
        db.commit()

        # También crear checklists iniciales para GENWORK, OFISZU y RAITO copiando una base adaptable
        for other_model in ["GENWORK", "OFISZU", "RAITO"]:
            other_existing = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == other_model).first()
            if not other_existing:
                for step in parsed_steps[:25]: # 25 pasos base
                    db.add(QCChecklistItem(
                        model_name=other_model,
                        step_number=step["step_number"],
                        operation=step["operation"],
                        description=step["description"],
                        qc_criteria=step["qc_criteria"],
                        media_url=step["media_url"],
                        media_type=step["media_type"]
                    ))
        db.commit()

    # 4. Crear orden de demostración si no hay órdenes
    order_count = db.query(QCOrder).count()
    if order_count == 0:
        demo_order_id = "ORD-2026-0892"
        total_units = 50
        num_stations = 5
        
        # Pasos de PROWORK
        prowork_steps = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == "PROWORK").order_by(QCChecklistItem.step_number).all()
        total_steps = len(prowork_steps) if prowork_steps else 52
        
        # Calcular rangos por estación
        base_step_count = total_steps // num_stations
        remainder = total_steps % num_stations

        demo_order = QCOrder(
            order_id=demo_order_id,
            model_name="PROWORK",
            part_number="90MB0YZ0-M0EAY0",
            total_units=total_units,
            total_stations=num_stations,
            status="IN_PROGRESS",
            created_by="Ing. Carlos Mendoza (Admin QC)"
        )
        db.add(demo_order)
        db.commit()

        # Crear asignaciones de estaciones
        station_operators = [
            ("OP-101", "Carlos Mendoza", "Chasis, Montaje y Placas"),
            ("OP-102", "Ana Quispe", "Protecciones, Discos y GPU"),
            ("OP-103", "Roberto Diaz", "BIOS, SO Windows y Pruebas"),
            ("OP-104", "Elena Ramos", "Personalización, Software y Serie"),
            ("OP-105", "Marco Solis", "Stickers, Limpieza y Embalaje"),
        ]

        current_start = 1
        for s_idx, (op_id, op_name, s_name) in enumerate(station_operators, start=1):
            extra = 1 if s_idx <= remainder else 0
            steps_for_station = base_step_count + extra
            current_end = current_start + steps_for_station - 1
            
            db.add(QCStationAssignment(
                order_id=demo_order_id,
                station_number=s_idx,
                station_name=s_name,
                user_id=op_id,
                user_name=op_name,
                start_step=current_start,
                end_step=current_end
            ))
            current_start = current_end + 1
        db.commit()

        # Crear las 50 PC Units simuladas en pipeline
        for u in range(1, total_units + 1):
            # Simular estado realista en cadena:
            # PCs 1-12 ya terminadas (Estación 6 = completadas)
            # PC 13-14 en Estación 5
            # PC 15-18 en Estación 4
            # PC 19-22 en Estación 3
            # PC 23-27 en Estación 2
            # PC 28-32 en Estación 1
            # PCs 33-50 pendientes en cola
            if u <= 12:
                c_station = 6 # Passed all 5 stations
                status = "PASSED"
                progress = total_steps
            elif u <= 14:
                c_station = 5
                status = "IN_PROGRESS"
                progress = 45
            elif u <= 18:
                c_station = 4
                status = "IN_PROGRESS"
                progress = 35
            elif u <= 22:
                c_station = 3
                status = "IN_PROGRESS"
                progress = 25
            elif u <= 27:
                c_station = 2
                status = "IN_PROGRESS"
                progress = 14
            elif u <= 32:
                c_station = 1
                status = "IN_PROGRESS"
                progress = 4
            else:
                c_station = 1
                status = "PENDING"
                progress = 0

            db.add(QCPCUnit(
                order_id=demo_order_id,
                unit_number=u,
                serial_number=f"KEN-2026-{u:04d}",
                current_station=c_station,
                overall_status=status,
                current_step_progress=progress
            ))
        db.commit()
