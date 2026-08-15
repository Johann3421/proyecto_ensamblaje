from sqlalchemy.orm import Session
from .models import QCUser, QCModel, QCChecklistItem, QCOrder, QCStationAssignment, QCPCUnit, QCStepLog
from .auth import hash_password

DEFAULT_USERS = [
    {
        "id": "ADM-01",
        "name": "Ing. Carlos Mendoza (Admin QC)",
        "role": "ADMIN",
        "avatar": "CM",
        "email": "admin@sekaitech.com.pe",
        "password": "admin123"
    },
    {
        "id": "OP-101",
        "name": "Carlos Mendoza (Estación 1)",
        "role": "OPERATOR",
        "avatar": "CM",
        "email": "estacion1@sekaitech.com.pe",
        "password": "kenya123"
    },
    {
        "id": "OP-102",
        "name": "Ana Quispe (Estación 2)",
        "role": "OPERATOR",
        "avatar": "AQ",
        "email": "estacion2@sekaitech.com.pe",
        "password": "kenya123"
    },
    {
        "id": "OP-103",
        "name": "Roberto Diaz (Estación 3)",
        "role": "OPERATOR",
        "avatar": "RD",
        "email": "estacion3@sekaitech.com.pe",
        "password": "kenya123"
    },
    {
        "id": "OP-104",
        "name": "Elena Ramos (Estación 4)",
        "role": "OPERATOR",
        "avatar": "ER",
        "email": "estacion4@sekaitech.com.pe",
        "password": "kenya123"
    },
    {
        "id": "OP-105",
        "name": "Marco Solis (Estación 5)",
        "role": "OPERATOR",
        "avatar": "MS",
        "email": "estacion5@sekaitech.com.pe",
        "password": "kenya123"
    },
    {
        "id": "OP-106",
        "name": "Jorge Valdivia (Suplente/Apoyo)",
        "role": "OPERATOR",
        "avatar": "JV",
        "email": "apoyo@sekaitech.com.pe",
        "password": "kenya123"
    },
]

DEFAULT_MODELS = [
    {"name": "PROWORK", "description": "Línea de Alto Rendimiento Profesional y Estaciones de Trabajo"},
    {"name": "GENWORK", "description": "Línea Corporativa y Productividad Empresarial"},
    {"name": "OFISZU", "description": "Línea Ofimática y Educación Compacta"},
    {"name": "RAITO", "description": "Línea Gamer y Rendimiento Gráfico Extremo"},
]

# 52 Pasos Maestros oficiales extraídos de control_de_calidad.txt
PROWORK_52_STEPS = [
    (1, "Agitar vertical y horizontalmente el case", "Agitar cuidadosamente el case en sentido vertical y horizontal para comprobar que no existan elementos sueltos en el interior.", "Confirmar que no se escuchen sonidos internos por pernos sueltos, restos de cintillos u otros elementos.", "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&auto=format&fit=crop&q=80", "gif"),
    (2, "Revisar estado físico de componentes", "Revisar el estado físico de RAM, disco, tarjeta gráfica, placa base, case, tapas y demás componentes.", "Confirmar la integridad visual de todos los componentes sin daños, rayones ni deformaciones.", "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600&auto=format&fit=crop&q=80", "image"),
    (3, "Verificar cambio de fuente de poder", "Verificar que la fuente de poder corresponda a una unidad de 750 W con certificación 80 Plus.", "Realizar verificación visual de modelo, potencia y certificación.", "", "image"),
    (4, "Verificar cables antes del encendido", "Verificar que todos los cables estén firmes y correctamente conectados.", "Confirmar conexiones correctas y firmes.", "", "image"),
    (5, "Revisar montaje de refrigeración líquida", "Verificar instalación de 4 tornillos de la bomba y conexión al CPU_FAN.", "Confirmar correcta instalación y conexión al CPU_FAN.", "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&auto=format&fit=crop&q=80", "image"),
    (6, "Revisar montaje de memoria RAM", "Insertar módulos de memoria RAM respetando orientación y ranuras.", "Confirmar que los módulos estén firmes y pestañas cerradas.", "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80", "image"),
    (7, "Revisar instalación de la placa base", "Verificar fijación de la placa al chasis del case mediante todos los tornillos.", "Confirmar tornillos y conectores de puertos frontales instalados.", "", "image"),
    (8, "Revisar organización de cables", "Organizar el cableado evitando tensión u obstrucciones.", "Inspección visual del enrutamiento de cables.", "", "image"),
    (9, "Verificar ventilación interna", "Confirmar que no existan obstrucciones con los ventiladores.", "Validar flujo de aire óptimo dentro del chasis.", "", "image"),
    (10, "Sticker KENYA en Cooler / Refrigeración", "Colocar sticker KENYA en el cooler según el patrón establecido.", "Verificar visibilidad, alineación y adherencia.", "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&auto=format&fit=crop&q=80", "gif"),
    (11, "Colocar sticker de serie interno", "Colocar sticker de número de serie en la parte interior del case.", "Confirmar ubicación y adherencia correcta.", "", "image"),
    (12, "Retirar película protectora de bomba y cooler", "Retirar película protectora del disipador/bomba y ventiladores.", "Confirmar retiro total de plásticos protectores.", "", "gif"),
    (13, "Retirar película de tarjeta de video", "Retirar película protectora de ambos lados de la tarjeta gráfica.", "Ambas caras libres de película protectora.", "", "image"),
    (14, "Retirar película de tapa frontal", "Retirar película protectora en la parte interior de tapa frontal.", "Retiro completo verificado.", "", "image"),
    (15, "Verificar instalación de fuente de poder", "Verificar montaje firme y cables sin exceso de tensión.", "Conexiones firmes y seguras.", "", "image"),
    (16, "Revisar montaje de almacenamiento", "Instalar HDD, SSD o M.2 según ficha técnica.", "Fijación correcta y detección en BIOS.", "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600&auto=format&fit=crop&q=80", "image"),
    (17, "Verificar tarjeta gráfica (si aplica)", "Confirmar GPU firmemente en ranura PCIe con alimentación.", "Reconocimiento de GPU en SO.", "", "image"),
    (18, "Verificar tarjeta Wi-Fi y Bluetooth", "Instalar tarjeta en ranura correspondiente con tornillos.", "Detección y funcionamiento validado.", "", "image"),
    (19, "Actualizar BIOS", "Actualizar BIOS a la última versión aprobada.", "Confirmar versión instalada (ej. F15/F16A).", "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80", "image"),
    (20, "Configurar BIOS", "Desactivar Boot Logo y configurar RGB como Disabled.", "Ajustes guardados y verificados.", "", "image"),
    (21, "Revisar encendido y puertos básicos", "Prueba de encendido y funcionamiento de puertos USB, HDMI, Jack audio.", "POST correcto y puertos operativos.", "", "image"),
    (22, "Verificar desactivación de RGB", "Desconectar o deshabilitar RGB de ventiladores.", "Confirmar que no permanezca encendido el RGB.", "", "image"),
    (23, "Instalar sistema operativo", "Instalación limpia de Windows 11 Pro.", "Instalación correcta sin errores.", "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80", "image"),
    (24, "Instalar drivers y actualizaciones", "Instalar drivers oficiales y Windows Update completo.", "Sin alertas en Administrador de Dispositivos.", "", "image"),
    (25, "Test de temperatura", "Prueba térmica del equipo en reposo y carga.", "Temperatura estable < 45°C en BIOS.", "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&auto=format&fit=crop&q=80", "gif"),
    (26, "Test de memoria RAM", "Verificar capacidad y frecuencia (MHz) según ficha.", "Capacidad total reconocida.", "", "image"),
    (27, "Test de GPU", "Comprobar drivers mediante panel NVIDIA/AMD.", "Reconocimiento correcto en Administrador de Tareas.", "", "image"),
    (28, "Test de discos", "Verificar capacidades según orden de trabajo.", "Detección correcta de cada unidad.", "", "image"),
    (29, "Eliminar software de pruebas", "Eliminar programas y herramientas de benchmarking temporales.", "Sin software no autorizado en el sistema.", "", "image"),
    (30, "Personalización – Logo KENYA", "Configurar el logo de la marca KENYA al inicio.", "Logo visible al arranque del sistema.", "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&auto=format&fit=crop&q=80", "image"),
    (31, "Personalización – Software KENYA", "Instalar acceso directo del software KENYA en escritorio.", "Acceso directo visible y funcional.", "", "image"),
    (32, "Personalización – OEM", "Configurar información OEM (Manufacturer=KENYA, Soporte).", "Datos OEM visibles en Configuración de Windows.", "", "image"),
    (33, "Personalización – Nombre del PC", "Configurar nombre del equipo según número de parte.", "Nombre de host correcto.", "", "image"),
    (34, "Verificar Office Home & Business 2024", "Confirmar instalación y acceso directo en escritorio.", "Office instalado y operativo.", "", "image"),
    (35, "Eliminar accesos y temporales", "Eliminar carpetas temporales y descargas de instalación.", "Sistema completamente limpio.", "", "image"),
    (36, "Verificar etiquetas internas de garantía", "Colocar sticker de garantía en RAM, SSD, placa y fuente.", "Todos los componentes con sticker adherido.", "", "image"),
    (37, "Verificar etiquetas externas", "Case con logo KENYA, etiqueta de garantía y sticker procesador.", "Alineación y adherencia perfecta.", "", "image"),
    (38, "Verificar número de serie", "Número de serie coincide con ficha técnica y base de datos.", "Coincidencia exacta validada.", "", "image"),
    (39, "Registro fotográfico", "Tomar fotos de PC armada, serie y etiquetas para trazabilidad.", "Fotografías claras almacenadas en el sistema.", "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&auto=format&fit=crop&q=80", "image"),
    (40, "Configuración de energía", "Plan de alto rendimiento sin suspensión automática.", "Parámetros aplicados.", "", "image"),
    (41, "Verificar idioma y región", "Configurar español (Perú), teclado y zona horaria UTC-5.", "Configuración regional validada.", "", "image"),
    (42, "Crear punto de restauración", "Crear punto de restauración en Windows.", "Punto de restauración registrado.", "", "image"),
    (43, "Limpieza de temporales del sistema", "Eliminar temporales, caché y cookies.", "Espacio en disco óptimo.", "", "image"),
    (44, "Verificar activación de Windows", "Windows activado con licencia válida.", "Estado de activación verificado.", "", "image"),
    (45, "Test de teclado y mouse", "Comprobar todas las teclas y clics.", "Periféricos 100% operativos.", "", "image"),
    (46, "Prueba de apagado y reinicio", "Comprobar reinicio y apagado limpio sin errores.", "Ciclo de energía verificado.", "", "image"),
    (47, "Colocar sticker de serie externo", "Pegar sticker de serie en parte superior del case.", "Ubicación y alineación correcta.", "", "image"),
    (48, "Colocar sticker de INTEL / AMD", "Colocar sticker en máscara del case sobre logo KENYA.", "Alineación y adherencia correcta.", "", "image"),
    (49, "Confirmar empaquetado correcto", "Uso de espuma, protecciones, guía rápida y precinto.", "Embalaje seguro y presentable.", "", "image"),
    (50, "Armar caja del case", "Preparar y sellar caja del chasis.", "Armado y etiquetado externo OK.", "", "image"),
    (51, "Armar caja del teclado", "Empaquetar teclado con sus protecciones.", "Teclado embalado nuevo.", "", "image"),
    (52, "Limpieza y embalaje final", "Limpieza final con microfibra de todo el equipo.", "Equipo sin polvo ni huellas, listo para entrega.", "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&auto=format&fit=crop&q=80", "gif")
]

def seed_database(db: Session):
    # 1. Crear o actualizar usuarios por defecto con sus credenciales
    for u in DEFAULT_USERS:
        raw_password = u.get("password")
        pwd_hash = hash_password(raw_password) if raw_password else None
        
        existing = db.query(QCUser).filter(QCUser.id == u["id"]).first()
        if not existing:
            db.add(QCUser(
                id=u["id"],
                name=u["name"],
                role=u["role"],
                avatar=u.get("avatar"),
                email=u.get("email"),
                password_hash=pwd_hash,
                is_active=True
            ))
        else:
            # Sincronizar email y contraseña si faltan o se actualizaron
            existing.email = u.get("email")
            existing.password_hash = pwd_hash
            existing.role = u["role"]
            existing.name = u["name"]
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
        for num, op, desc, crit, media, mtype in PROWORK_52_STEPS:
            db.add(QCChecklistItem(
                model_name="PROWORK",
                step_number=num,
                operation=op,
                description=desc,
                qc_criteria=crit,
                media_url=media,
                media_type=mtype
            ))
        db.commit()

        # Checklists para otros modelos
        for other_model in ["GENWORK", "OFISZU", "RAITO"]:
            other_existing = db.query(QCChecklistItem).filter(QCChecklistItem.model_name == other_model).first()
            if not other_existing:
                for num, op, desc, crit, media, mtype in PROWORK_52_STEPS[:25]:
                    db.add(QCChecklistItem(
                        model_name=other_model,
                        step_number=num,
                        operation=op,
                        description=desc,
                        qc_criteria=crit,
                        media_url=media,
                        media_type=mtype
                    ))
        db.commit()

    # 4. Crear orden de demostración si no hay órdenes
    order_count = db.query(QCOrder).count()
    if order_count == 0:
        demo_order_id = "ORD-2026-0892"
        total_units = 50
        num_stations = 5
        total_steps = 52
        
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
            if u <= 12:
                c_station = 6
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
