import io
import csv
import openpyxl
import unicodedata
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from typing import List, Dict, Tuple, Optional, Any

def generate_checklist_excel(model_name: str, items: List[Dict], category: str = "ALL") -> bytes:
    """Genera un archivo Excel (.xlsx) estilizado con el formato oficial de QC KENYA por sección o completo"""
    category_upper = (category or "ALL").upper()
    if category_upper == "CLEANING":
        filtered_items = [it for it in items if it.get("is_cleaning")]
        section_title = f"CHECKLIST DE CONTROL DE CALIDAD – PASOS DE LIMPIEZA QC – PC KENYA {model_name.upper()}"
        header_color = "1B4332"  # Industrial Green
        sheet_title = f"QC_Limpieza_{model_name[:12]}"
    elif category_upper == "ASSEMBLY":
        filtered_items = [it for it in items if not it.get("is_cleaning")]
        section_title = f"CHECKLIST DE CONTROL DE CALIDAD – PASOS DE ENSAMBLAJE – PC KENYA {model_name.upper()}"
        header_color = "1F2937"  # Slate Gray
        sheet_title = f"QC_Ensamble_{model_name[:12]}"
    else:
        filtered_items = list(items)
        section_title = f"CHECKLIST DE CONTROL DE CALIDAD – PC KENYA {model_name.upper()}"
        header_color = "102A43"  # Deep Navy
        sheet_title = f"QC_{model_name[:20]}"

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = sheet_title
    
    # Encabezado principal
    ws.merge_cells("A1:F1")
    title_cell = ws["A1"]
    title_cell.value = section_title
    title_cell.font = Font(name="Segoe UI", size=13, bold=True, color="FFFFFF")
    title_cell.fill = PatternFill(start_color=header_color, end_color=header_color, fill_type="solid")
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 35

    # Headers de columnas
    headers = [
        ("A2", "Paso_Nro", 10),
        ("B2", "Operacion", 35),
        ("C2", "Descripcion_Detallada", 45),
        ("D2", "Criterio_Control_Calidad", 45),
        ("E2", "Multimedia_URL_O_Nombre", 30),
        ("F2", "Tipo_Paso", 18),
    ]

    header_fill = PatternFill(start_color="F3F2F1", end_color="F3F2F1", fill_type="solid")
    header_font = Font(name="Segoe UI", size=11, bold=True, color="323130")
    thin_border = Border(
        left=Side(style="thin", color="E1DFDD"),
        right=Side(style="thin", color="E1DFDD"),
        top=Side(style="thin", color="E1DFDD"),
        bottom=Side(style="thin", color="E1DFDD")
    )

    for cell_ref, text, col_width in headers:
        cell = ws[cell_ref]
        cell.value = text
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center" if "Nro" in text or "Tipo" in text else "left", vertical="center")
        cell.border = thin_border
        col_letter = cell_ref[0]
        ws.column_dimensions[col_letter].width = col_width

    ws.row_dimensions[2].height = 25

    # Llenar datos
    row_num = 3
    for it in filtered_items:
        is_clean = bool(it.get("is_cleaning"))
        ws[f"A{row_num}"] = it.get("step_number", row_num - 2)
        ws[f"B{row_num}"] = it.get("operation", "")
        ws[f"C{row_num}"] = it.get("description", "")
        ws[f"D{row_num}"] = it.get("qc_criteria", "")
        ws[f"E{row_num}"] = it.get("media_url", "")
        ws[f"F{row_num}"] = "LIMPIEZA" if is_clean else "ENSAMBLAJE"

        for col in ["A", "B", "C", "D", "E", "F"]:
            c = ws[f"{col}{row_num}"]
            c.font = Font(name="Segoe UI", size=10)
            c.border = thin_border
            c.alignment = Alignment(
                horizontal="center" if col in ("A", "F") else "left",
                vertical="center",
                wrap_text=True
            )
        ws.row_dimensions[row_num].height = 30
        row_num += 1

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output.getvalue()

def generate_checklist_template(model_name: str = "", category: str = "ALL") -> bytes:
    """Genera la plantilla oficial Excel (.xlsx) para importar pasos por sección (LIMPIEZA, ENSAMBLAJE o COMPLETO)"""
    category_upper = (category or "ALL").upper()
    wb = openpyxl.Workbook()
    ws = wb.active
    
    suffix = f" – MODELO {model_name.upper()}" if model_name else ""
    if category_upper == "CLEANING":
        ws.title = "Plantilla_Limpieza"
        title_text = f"PLANTILLA OFICIAL DE IMPORTACIÓN – PASOS DE LIMPIEZA QC{suffix}"
        header_color = "1B4332"  # Industrial Green
        inst_text = (
            "💡 INSTRUCCIONES: 1. Esta plantilla es EXCLUSIVA para el APARTADO DE LIMPIEZA. Todos los pasos cargados aquí se asignarán "
            "al bloque de limpieza sin eliminar los pasos de ensamblaje del modelo. "
            "2. 'Paso_Nro' puede ser correlativo (1, 2, 3...). Las columnas 'Operacion' y 'Criterio_Control_Calidad' son obligatorias."
        )
        sample_rows = [
            (
                1,
                "Retiro de películas protectoras y adhesivos de transporte",
                "Retirar plásticos protectores del vidrio templado, frontis, chasis y accesorios con cuidado sin rayar las superficies.",
                "Superficies 100% despejadas sin residuos de pegamento, cintas ni plásticos atascados en bisagras o esquinas.",
                "",
                "LIMPIEZA"
            ),
            (
                2,
                "Soplado y remoción de polvo interno y virutas",
                "Aplicar aire comprimido seco en el interior del gabinete, ventiladores, placa madre, ranuras PCIe y fuente.",
                "Cero restos de viruta metálica, polvo de embalaje o partículas sueltas dentro del equipo.",
                "",
                "LIMPIEZA"
            ),
            (
                3,
                "Limpieza exterior con paño de microfibra y alcohol isopropílico",
                "Limpiar paneles laterales, frontales y superior con paño de microfibra suave humedecido con alcohol isopropílico al 99%.",
                "Chasis libre de huellas dactilares, manchas de grasa, polvo o suciedad. Acabado uniforme.",
                "",
                "LIMPIEZA"
            ),
            (
                4,
                "Inspección de estética general y colocación de sellos QC",
                "Revisar equipo bajo iluminación adecuada en 360 grados y colocar sello de seguridad de control de calidad numerado.",
                "Estética aprobada sin micro-rayas. Sello de garantía adherido firmemente en la unión del panel.",
                "",
                "LIMPIEZA"
            )
        ]
    elif category_upper == "ASSEMBLY":
        ws.title = "Plantilla_Ensamblaje"
        title_text = f"PLANTILLA OFICIAL DE IMPORTACIÓN – PASOS DE ENSAMBLAJE{suffix}"
        header_color = "1F2937"  # Slate
        inst_text = (
            "💡 INSTRUCCIONES: 1. Esta plantilla es EXCLUSIVA para el APARTADO DE ENSAMBLAJE. Actualiza los pasos de armado sin afectar "
            "los pasos de limpieza configurados. "
            "2. 'Paso_Nro' es correlativo (1, 2, 3...). Las columnas 'Operacion' y 'Criterio_Control_Calidad' son obligatorias."
        )
        sample_rows = [
            (
                1,
                "Inspección física inicial de chasis y puertos",
                "Verificar integridad del gabinete, frontis, tornillería y conectores USB/Audio frontales.",
                "Sin rayaduras, abolladuras ni partes sueltas. Conectores frontales firmes y alineados.",
                "",
                "ENSAMBLAJE"
            ),
            (
                2,
                "Instalación de Placa Madre, CPU y Pasta Térmica",
                "Montar procesador en socket verificando la muesca de orientación. Aplicar pasta térmica y anclar disipador.",
                "Socket trabado correctamente, pasta distribuida uniformemente, disipador asegurado firmemente.",
                "",
                "ENSAMBLAJE"
            ),
            (
                3,
                "Montaje de Memoria RAM y Unidad M.2 NVMe",
                "Insertar módulos en bancos principales (Dual Channel si aplica) y fijar disco M.2 con disipador térmico.",
                "Módulos RAM asegurados con clic en ambos lados. M.2 atornillado con perno espaciador.",
                "",
                "ENSAMBLAJE"
            ),
            (
                4,
                "Fijación de Fuente de Poder y Gestión de Cableado",
                "Asegurar fuente de poder. Conectar ATX 24 pines, CPU 8 pines y ordenar cableado con precintos.",
                "Conectores encajados al 100% con seguro trabado. Cables peinados sin interferir ventiladores.",
                "",
                "ENSAMBLAJE"
            ),
            (
                5,
                "Encendido de Prueba, Verificación de BIOS y Parámetros",
                "Conectar a monitor y teclado de prueba. Entrar a BIOS y validar detección de CPU, RAM y SSD.",
                "Arranque exitoso al primer intento. BIOS reconoce total de componentes con voltajes y temperaturas normales.",
                "",
                "ENSAMBLAJE"
            )
        ]
    else:
        ws.title = "Plantilla_Checklist"
        title_text = f"PLANTILLA OFICIAL DE IMPORTACIÓN – CHECKLIST QC KENYA{suffix}"
        header_color = "102A43"  # Deep Navy
        inst_text = (
            "💡 INSTRUCCIONES: 1. Complete una fila por cada paso. Las columnas 'Operacion' y 'Criterio_Control_Calidad' son obligatorias. "
            "2. En la columna 'Tipo_Paso' indique 'ENSAMBLAJE' o 'LIMPIEZA'. "
            "3. Al terminar, guarde el archivo y súbalo en 'Checklists' -> 'Importar Pasos'."
        )
        sample_rows = [
            (
                1,
                "Inspección física inicial de chasis y puertos",
                "Verificar integridad del gabinete, frontis, tornillería y conectores USB/Audio frontales.",
                "Sin rayaduras, abolladuras ni partes sueltas. Conectores frontales firmes y alineados.",
                "",
                "ENSAMBLAJE"
            ),
            (
                2,
                "Instalación de Placa Madre, CPU y Pasta Térmica",
                "Montar procesador en socket verificando la muesca de orientación. Aplicar pasta térmica y anclar disipador.",
                "Socket trabado correctamente, pasta distribuida uniformemente, disipador asegurado firmemente.",
                "",
                "ENSAMBLAJE"
            ),
            (
                3,
                "Retiro de películas protectoras de chasis y acrílicos",
                "Retirar plásticos protectores del chasis, vidrio templado y componentes internos con cuidado.",
                "Superficies 100% libres de adhesivos y plásticos protectores sin rayar acabados.",
                "",
                "LIMPIEZA"
            ),
            (
                4,
                "Limpieza exterior con paño de microfibra",
                "Limpiar paneles exteriores con alcohol isopropílico y paño de microfibra antiestático.",
                "Gabinete impecable, sin huellas dactilares ni suciedad visible.",
                "",
                "LIMPIEZA"
            )
        ]

    # 1. Título principal
    ws.merge_cells("A1:F1")
    title_cell = ws["A1"]
    title_cell.value = title_text
    title_cell.font = Font(name="Segoe UI", size=13, bold=True, color="FFFFFF")
    title_cell.fill = PatternFill(start_color=header_color, end_color=header_color, fill_type="solid")
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 36

    # 2. Fila de instrucciones
    ws.merge_cells("A2:F2")
    inst_cell = ws["A2"]
    inst_cell.value = inst_text
    inst_cell.font = Font(name="Segoe UI", size=9, italic=True, color="004E8C")
    inst_cell.fill = PatternFill(start_color="EBF3FC", end_color="EBF3FC", fill_type="solid")
    inst_cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    ws.row_dimensions[2].height = 38

    # 3. Encabezados de columna
    headers = [
        ("A3", "Paso_Nro", 12),
        ("B3", "Operacion", 35),
        ("C3", "Descripcion_Detallada", 50),
        ("D3", "Criterio_Control_Calidad", 50),
        ("E3", "Multimedia_URL_O_Nombre", 30),
        ("F3", "Tipo_Paso", 18),
    ]

    header_fill = PatternFill(start_color=header_color, end_color=header_color, fill_type="solid")
    header_font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    thin_border = Border(
        left=Side(style="thin", color="D1D5DB"),
        right=Side(style="thin", color="D1D5DB"),
        top=Side(style="thin", color="D1D5DB"),
        bottom=Side(style="thin", color="D1D5DB")
    )

    for cell_ref, text, col_width in headers:
        cell = ws[cell_ref]
        cell.value = text
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center" if "Nro" in text or "Tipo" in text else "left", vertical="center")
        cell.border = thin_border
        col_letter = cell_ref[0]
        ws.column_dimensions[col_letter].width = col_width

    ws.row_dimensions[3].height = 28

    # 4. Filas de ejemplo instructivas
    row_num = 4
    for item in sample_rows:
        ws[f"A{row_num}"] = item[0]
        ws[f"B{row_num}"] = item[1]
        ws[f"C{row_num}"] = item[2]
        ws[f"D{row_num}"] = item[3]
        ws[f"E{row_num}"] = item[4]
        ws[f"F{row_num}"] = item[5]

        for col in ["A", "B", "C", "D", "E", "F"]:
            c = ws[f"{col}{row_num}"]
            c.font = Font(name="Segoe UI", size=9)
            c.border = thin_border
            c.alignment = Alignment(
                horizontal="center" if col in ("A", "F") else "left",
                vertical="center",
                wrap_text=True
            )
        ws.row_dimensions[row_num].height = 36
        row_num += 1

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output.getvalue()

def _normalize_text(val: Any) -> str:
    """Normaliza texto removiendo tildes, signos y convirtiendo a minúsculas"""
    if val is None:
        return ""
    s = str(val).strip()
    n = unicodedata.normalize('NFKD', s).encode('ASCII', 'ignore').decode('utf-8')
    return n.lower()

COLUMN_SYNONYMS = {
    "step_number": [
        "paso", "paso_nro", "paso nro", "paso num", "nro", "num", "no", "n", "item", "orden", 
        "pos", "posicion", "id", "#", "step", "step_number"
    ],
    "operation": [
        "operacion", "operacion_tarea", "operacion / tarea", "tarea", "actividad", 
        "accion", "nombre", "titulo", "paso_nombre", "item_nombre", "trabajo", "nombre_paso",
        "operation", "task", "activity"
    ],
    "description": [
        "descripcion", "descripcion_detallada", "detalle", "procedimiento", "instruccion", 
        "instrucciones", "especificacion", "especificaciones", "explicacion", "contenido",
        "description", "details", "procedure"
    ],
    "qc_criteria": [
        "criterio", "criterio_control_calidad", "criterio_control", "criterio_calidad", 
        "revision", "revision_control_calidad", "revision de control de calidad",
        "control", "control_calidad", "calidad", "qc", "qc_criteria", "validacion", 
        "inspeccion", "esperado", "conformidad", "resultado", "check"
    ],
    "media_url": [
        "multimedia", "multimedia_url", "multimedia_url_o_nombre", "url", "media", 
        "foto", "imagen", "video", "recurso", "adjunto", "link", "image"
    ],
    "is_cleaning": [
        "tipo", "tipo_paso", "categoria", "apartado", "seccion", "area", "fase", 
        "etapa", "bloque", "modulo", "limpieza", "type", "category"
    ]
}

def _match_column_header(header_cell_str: str) -> Optional[str]:
    """Determina si el encabezado de celda corresponde a alguna columna conocida"""
    norm = _normalize_text(header_cell_str)
    if not norm or len(norm) > 40:
        return None
    
    for col_key, synonyms in COLUMN_SYNONYMS.items():
        for syn in synonyms:
            if norm == syn or norm.startswith(syn + " ") or norm.endswith(" " + syn) or f"_{syn}" in norm:
                return col_key
            
    if "criterio" in norm or "calidad" in norm or "qc" in norm or "revision" in norm:
        return "qc_criteria"
    if "operac" in norm or "tarea" in norm or "activid" in norm:
        return "operation"
    if "descrip" in norm or "detall" in norm or "procedim" in norm:
        return "description"
    if "paso" in norm or "item" in norm or norm in ("n", "no", "#"):
        return "step_number"
    if "tipo" in norm or "seccion" in norm or "apartad" in norm or "categ" in norm:
        return "is_cleaning"
    if "foto" in norm or "imagen" in norm or "multimed" in norm:
        return "media_url"
        
    return None

# Términos que identifican inequívocamente hardware, montaje, componentes o configuración de software
ASSEMBLY_HARDWARE_TERMS = [
    "bomba", "cooler", "disipador", "socket", "procesador", "cpu", "ram", "memoria",
    "placa base", "placa madre", "motherboard", "fuente de", "fuente alimentacion", "fuente poder",
    "psu", "tarjeta grafica", "tarjeta de video", "gpu", "tarjeta wi-fi", "tarjeta wifi", "bluetooth",
    "disco", "almacenamiento", "ssd", "m.2", "nvme", "hdd",
    "gabinete", "frontis", "puertos frontales", "puerto usb", "puerto hdmi", "puerto jack",
    "ventilacion interna", "cooler de chasis", "refrigeracion liquida", "ventilador",
    "cable", "cableado", "conector", "atx", "pcie", "tornillo", "perno", "agitar",
    "bios", "uefi", "boot logo", "rgb", "windows", "sistema operativo", "driver", "controlador",
    "windows update", "administrador de dispositivos", "temperatura", "bench", "post correcto",
    "office", "oem", "nombre del pc", "archivos temporales", "cookies", "cache",
    "punto de restauracion", "activacion", "teclado y mouse", "apagado", "reinicio", "suspension",
    "software kenya", "registro fotografico", "fotografias de la pc", "etiquetas internas", "sticker de intel",
    "sticker kenya en cooler", "sticker de serie interno", "sticker de serie externo", "numero de serie",
    "cambio de fuente", "estado fisico de componentes"
]

# Términos que identifican genuinamente la estación de limpieza estética y empaque/despacho
CLEANING_TERMS = [
    "limpieza exterior", "limpieza final", "limpieza del equipo", "limpieza de chasis",
    "limpieza y embalaje", "microfibra y alcohol", "pano de microfibra", "alcohol isopropilico",
    "huellas dactilares", "manchas de grasa", "sin huellas", "sin manchas", "suciedad antes del embalaje",
    "soplado y remocion de polvo", "soplado final", "virutas metalicas", "polvo de embalaje",
    "inspeccion de estetica", "estetica general", "sello de seguridad de control de calidad",
    "sellos qc", "sello de garantia adherido firmemente en la union", "empaquetado correcto",
    "embalaje utilizando espuma", "embalaje final", "armar caja del case", "armar caja del teclado",
    "embalar la caja", "caja del teclado", "caja del case", "preparar y embalar"
]

def is_step_cleaning(op: str, desc: str = "", crit: str = "", explicit_type: str = "") -> bool:
    """Clasifica de manera precisa si un paso es de LIMPIEZA / EMBALAJE o de ENSAMBLAJE"""
    t_type = _normalize_text(explicit_type)
    if "ensam" in t_type or "armad" in t_type or "assem" in t_type or "hardw" in t_type:
        return False
    if "limp" in t_type or "clean" in t_type or "embal" in t_type or "empaq" in t_type:
        return True

    combined = f"{_normalize_text(op)} {_normalize_text(desc)} {_normalize_text(crit)}"
    op_norm = _normalize_text(op)

    # 1. Si el paso describe hardware, montaje o configuración de Windows/software, es ENSAMBLAJE
    has_assembly = any(term in combined for term in ASSEMBLY_HARDWARE_TERMS)
    has_cleaning = any(term in combined for term in CLEANING_TERMS)

    # Solo es limpieza si es un paso final de limpieza externa o embalaje
    if has_assembly and not ("limpieza final" in op_norm or "limpieza exterior" in op_norm or "embalaje" in op_norm or "armar caja" in op_norm):
        return False

    # 2. Si contiene términos inequívocos de limpieza estética o empaque/caja
    if has_cleaning:
        return True

    return False

def _find_header_and_colmap(rows_data: List[List[Any]]) -> Tuple[Optional[int], Dict[str, int]]:
    """
    Analiza las primeras 15 filas para identificar la fila de encabezados y mapear columnas.
    Retorna (header_row_index, col_map) donde col_map es ej: {'operation': 1, 'qc_criteria': 3, ...}
    """
    best_row_idx = None
    best_score = 0
    best_colmap = {}

    max_check = min(15, len(rows_data))
    for r_idx in range(max_check):
        row = rows_data[r_idx]
        colmap = {}
        score = 0
        for c_idx, cell in enumerate(row):
            val_str = str(cell or "").strip()
            if not val_str:
                continue
            matched_key = _match_column_header(val_str)
            if matched_key and matched_key not in colmap:
                colmap[matched_key] = c_idx
                if matched_key in ("operation", "qc_criteria"):
                    score += 3
                elif matched_key in ("step_number", "description"):
                    score += 2
                else:
                    score += 1
        
        if score > best_score and ("operation" in colmap or "qc_criteria" in colmap or "description" in colmap):
            best_score = score
            best_row_idx = r_idx
            best_colmap = colmap

    if best_score >= 3:
        return best_row_idx, best_colmap

    return None, {}

def _build_fallback_colmap(first_data_row: List[Any], total_cols: int) -> Dict[str, int]:
    """Crea un mapa de columnas por posición e inferencia cuando no hay cabecera explícita"""
    colmap = {}
    if not first_data_row or total_cols <= 0:
        return {"operation": 0, "qc_criteria": 1}
    
    first_cell = str(first_data_row[0] or "").strip()
    is_first_num = False
    try:
        int(float(first_cell))
        is_first_num = True
    except (ValueError, TypeError):
        pass

    if is_first_num:
        colmap["step_number"] = 0
        if total_cols == 2:
            colmap["operation"] = 1
        elif total_cols == 3:
            colmap["operation"] = 1
            colmap["qc_criteria"] = 2
        elif total_cols == 4:
            colmap["operation"] = 1
            colmap["description"] = 2
            colmap["qc_criteria"] = 3
        elif total_cols == 5:
            colmap["operation"] = 1
            colmap["description"] = 2
            colmap["qc_criteria"] = 3
            colmap["media_url"] = 4
        else:
            colmap["operation"] = 1
            colmap["description"] = 2
            colmap["qc_criteria"] = 3
            colmap["media_url"] = 4
            colmap["is_cleaning"] = 5
    else:
        if total_cols == 1:
            colmap["operation"] = 0
        elif total_cols == 2:
            colmap["operation"] = 0
            colmap["qc_criteria"] = 1
        elif total_cols == 3:
            colmap["operation"] = 0
            colmap["description"] = 1
            colmap["qc_criteria"] = 2
        elif total_cols == 4:
            colmap["operation"] = 0
            colmap["description"] = 1
            colmap["qc_criteria"] = 2
            colmap["media_url"] = 3
        else:
            colmap["operation"] = 0
            colmap["description"] = 1
            colmap["qc_criteria"] = 2
            colmap["media_url"] = 3
            colmap["is_cleaning"] = 4

    return colmap

def _extract_items_from_table(
    rows_data: List[List[Any]], 
    header_idx: Optional[int], 
    colmap: Dict[str, int], 
    target_category: str = "ALL"
) -> List[Dict]:
    """Extrae la lista de pasos a partir de la matriz de filas y el mapa de columnas resuelto"""
    items = []
    target_category_upper = (target_category or "ALL").upper()
    start_row = (header_idx + 1) if header_idx is not None else 0

    for r_idx in range(start_row, len(rows_data)):
        row = rows_data[r_idx]
        if not row:
            continue

        # Verificar si la fila completa está vacía
        row_str = " ".join(str(c or "").strip() for c in row).strip()
        if not row_str:
            continue

        # Si por casualidad se repite la fila de encabezados exactamente (salto de página o tabla repetida)
        if header_idx is not None and r_idx != header_idx:
            cell_vals = [str(c or "").strip() for c in row if str(c or "").strip()]
            matched_keys = set()
            for c in cell_vals:
                if len(c) <= 35:
                    m = _match_column_header(c)
                    if m:
                        matched_keys.add(m)
            if len(matched_keys) >= 3 and ("operation" in matched_keys or "qc_criteria" in matched_keys):
                continue

        # Extraer campos según mapa
        def get_col(key: str) -> str:
            idx = colmap.get(key)
            if idx is not None and idx < len(row):
                v = row[idx]
                return str(v or "").strip() if v is not None else ""
            return ""

        step_val = get_col("step_number")
        op_val = get_col("operation")
        desc_val = get_col("description")
        crit_val = get_col("qc_criteria")
        media_val = get_col("media_url")
        type_val = get_col("is_cleaning")

        # Si no hay ni operación ni descripción ni criterio, omitir fila
        if not op_val and not desc_val and not crit_val:
            continue

        # Si no hay operación pero hay descripción, usar descripción como operación
        if not op_val:
            op_val = desc_val[:60]
            desc_val = desc_val[60:].strip() if len(desc_val) > 60 else ""

        # Número de paso
        try:
            step_num = int(float(step_val)) if step_val else len(items) + 1
        except (ValueError, TypeError):
            step_num = len(items) + 1

        # Criterio de calidad por defecto si está vacío
        if not crit_val:
            crit_val = desc_val if (desc_val and "qc_criteria" not in colmap) else "Verificación correcta según especificación técnica"

        # Categoría Limpieza vs Ensamblaje
        if target_category_upper == "CLEANING":
            is_clean = True
        elif target_category_upper == "ASSEMBLY":
            is_clean = False
        else:
            is_clean = is_step_cleaning(op_val, desc_val, crit_val, explicit_type=type_val)

        items.append({
            "step_number": step_num,
            "operation": op_val,
            "description": desc_val,
            "qc_criteria": crit_val,
            "media_url": media_val,
            "media_type": "gif" if "gif" in media_val.lower() else "image",
            "is_cleaning": is_clean
        })

    # Resecuenciar pasos correlativamente
    for idx, item in enumerate(items, start=1):
        item["step_number"] = idx

    return items

def _detect_delimiter(text: str) -> str:
    """Detecta inteligentemente si el texto está separado por pipe, punto y coma, tab o coma"""
    sample_lines = [l for l in text.splitlines() if l.strip()][:15]
    if not sample_lines:
        return ","

    candidates = ["|", ";", "\t", ","]
    counts = {c: [] for c in candidates}

    for line in sample_lines:
        for c in candidates:
            counts[c].append(line.count(c))

    best_candidate = ","
    max_consistent_count = 0

    for c in candidates:
        valid_lines = [cnt for cnt in counts[c] if cnt > 0]
        if len(valid_lines) >= len(sample_lines) * 0.6:
            min_c = min(valid_lines)
            if min_c > max_consistent_count:
                max_consistent_count = min_c
                best_candidate = c

    first_line = sample_lines[0] if sample_lines else ""
    if "|" in first_line and counts["|"] and sum(counts["|"]) > 3:
        return "|"
    if "\t" in first_line and counts["\t"] and sum(counts["\t"]) > 3:
        return "\t"
    if ";" in first_line and counts[";"] and sum(counts[";"]) > 3:
        return ";"

    return best_candidate

def parse_checklist_excel(file_bytes: bytes, target_category: str = "ALL") -> List[Dict]:
    """
    Parsea de forma inteligente y ultra-robusta cualquier archivo Excel (.xlsx, .xls) o texto (.csv, .txt, .tsv).
    Detecta automáticamente encabezados, orden de columnas, delimitadores y codificaciones de caracteres.
    """
    target_category_upper = (target_category or "ALL").upper()

    # 1. Intentar cargar como Excel openpyxl
    try:
        wb = openpyxl.load_workbook(filename=io.BytesIO(file_bytes), data_only=True)
        
        # Encontrar la mejor hoja si hay múltiples hojas en el archivo
        candidate_sheets = []
        for sheet in wb.worksheets:
            sheet_rows = []
            for r in range(1, min(sheet.max_row + 1, 30)):
                row_vals = [sheet.cell(row=r, column=c).value for c in range(1, min(sheet.max_column + 1, 15))]
                sheet_rows.append(row_vals)
            h_idx, cmap = _find_header_and_colmap(sheet_rows)
            score = len(cmap)
            if any(k in sheet.title.lower() for k in ["qc", "checklist", "paso", "control", "limp", "ensam"]):
                score += 2
            candidate_sheets.append((score, sheet))

        candidate_sheets.sort(key=lambda x: x[0], reverse=True)
        chosen_sheet = candidate_sheets[0][1] if candidate_sheets else wb.active

        # Extraer todas las filas de la hoja seleccionada
        all_rows = []
        for r in range(1, chosen_sheet.max_row + 1):
            row_vals = [chosen_sheet.cell(row=r, column=c).value for c in range(1, min(chosen_sheet.max_column + 1, 20))]
            all_rows.append(row_vals)

        h_idx, colmap = _find_header_and_colmap(all_rows)
        if not colmap:
            non_empty_row = next((r for r in all_rows if any(r)), [])
            colmap = _build_fallback_colmap(non_empty_row, len(non_empty_row))

        items = _extract_items_from_table(all_rows, h_idx, colmap, target_category=target_category_upper)
        if items:
            return items
    except Exception:
        pass

    # 2. Fallback: Formatos de texto / CSV / TSV / Pipe delimitado
    encodings_to_try = ["utf-8-sig", "utf-8", "cp1252", "latin-1", "iso-8859-1"]
    decoded_text = ""
    for enc in encodings_to_try:
        try:
            decoded_text = file_bytes.decode(enc)
            if "\ufffd" not in decoded_text:
                break
        except Exception:
            continue

    if not decoded_text:
        try:
            decoded_text = file_bytes.decode("utf-8-sig", errors="replace")
        except Exception:
            return []

    delimiter = _detect_delimiter(decoded_text)
    
    rows_data = []
    try:
        reader = csv.reader(io.StringIO(decoded_text), delimiter=delimiter)
        for row in reader:
            rows_data.append([c.strip() for c in row])
    except Exception:
        for line in decoded_text.splitlines():
            if line.strip():
                rows_data.append([c.strip() for c in line.split(delimiter)])

    if not rows_data:
        return []

    h_idx, colmap = _find_header_and_colmap(rows_data)
    if not colmap:
        non_empty_row = next((r for r in rows_data if any(r)), [])
        colmap = _build_fallback_colmap(non_empty_row, len(non_empty_row))

    return _extract_items_from_table(rows_data, h_idx, colmap, target_category=target_category_upper)

