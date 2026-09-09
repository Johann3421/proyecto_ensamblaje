import io
import csv
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from typing import List, Dict

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

def _is_header_or_instruction_row(op_val: str, step_val: str, crit_val: str) -> bool:
    """Detecta si una fila corresponde a un título, banner de instrucciones o encabezado de columna"""
    combined = f"{str(op_val or '')} {str(step_val or '')} {str(crit_val or '')}".lower().strip()
    if not combined:
        return True
    
    keywords = [
        "plantilla", "checklist", "instruccion", "instrucción",
        "paso_nro", "operacion", "operación", "descripcion_detallada",
        "criterio_control", "criterio_calidad", "multimedia_url", "tipo_paso"
    ]
    return any(k in combined for k in keywords)

def parse_checklist_excel(file_bytes: bytes, target_category: str = "ALL") -> List[Dict]:
    """Parsea un archivo Excel (.xlsx, .xls) o CSV subido y extrae la lista de pasos limpiando títulos y cabeceras"""
    items = []
    target_category_upper = (target_category or "ALL").upper()
    
    # 1. Intentar cargar como archivo Excel
    try:
        wb = openpyxl.load_workbook(filename=io.BytesIO(file_bytes), data_only=True)
        ws = wb.active
        
        for r in range(1, ws.max_row + 1):
            step_num_val = ws.cell(row=r, column=1).value
            operation_val = ws.cell(row=r, column=2).value
            desc_val = ws.cell(row=r, column=3).value
            criteria_val = ws.cell(row=r, column=4).value
            media_val = ws.cell(row=r, column=5).value
            type_val = ws.cell(row=r, column=6).value

            # Si es fila de encabezados, instrucciones o está vacía, omitir
            if _is_header_or_instruction_row(operation_val, step_num_val, criteria_val):
                continue

            op_str = str(operation_val or "").strip()
            crit_str = str(criteria_val or "").strip()
            desc_str = str(desc_val or "").strip()
            type_str = str(type_val or "").strip().upper()

            if not op_str and not desc_str:
                continue

            # Extraer número de paso
            try:
                step_num = int(step_num_val) if step_num_val is not None else len(items) + 1
            except (ValueError, TypeError):
                step_num = len(items) + 1

            # Determinar si es limpieza
            if target_category_upper == "CLEANING":
                is_clean = True
            elif target_category_upper == "ASSEMBLY":
                is_clean = False
            else:
                if "LIMP" in type_str:
                    is_clean = True
                elif "ENSAM" in type_str or "ARMAD" in type_str:
                    is_clean = False
                else:
                    op_text = (op_str + " " + desc_str).lower()
                    is_clean = any(k in op_text for k in ["limpieza", "limpiar", "película", "pelicula", "microfibra", "huellas", "desprotección", "desproteccion"])

            items.append({
                "step_number": step_num,
                "operation": op_str or desc_str[:50],
                "description": desc_str,
                "qc_criteria": crit_str or "Verificación correcta según especificación técnica",
                "media_url": str(media_val or "").strip(),
                "media_type": "gif" if "gif" in str(media_val or "").lower() else "image",
                "is_cleaning": is_clean
            })
            
    except Exception:
        # 2. Fallback: Intentar como CSV (con delimitador coma o punto y coma)
        try:
            text_content = file_bytes.decode("utf-8-sig", errors="replace")
            delimiter = ";" if text_content.count(";") > text_content.count(",") else ","
            reader = csv.reader(io.StringIO(text_content), delimiter=delimiter)
            
            for row in reader:
                if not row or len(row) < 2:
                    continue
                step_num_val = row[0] if len(row) > 0 else ""
                operation_val = row[1] if len(row) > 1 else ""
                desc_val = row[2] if len(row) > 2 else ""
                criteria_val = row[3] if len(row) > 3 else ""
                media_val = row[4] if len(row) > 4 else ""
                type_val = row[5] if len(row) > 5 else ""

                if _is_header_or_instruction_row(operation_val, step_num_val, criteria_val):
                    continue

                op_str = str(operation_val or "").strip()
                desc_str = str(desc_val or "").strip()
                crit_str = str(criteria_val or "").strip()
                type_str = str(type_val or "").strip().upper()

                if not op_str and not desc_str:
                    continue

                try:
                    step_num = int(step_num_val) if step_num_val and step_num_val.strip().isdigit() else len(items) + 1
                except (ValueError, TypeError):
                    step_num = len(items) + 1

                if target_category_upper == "CLEANING":
                    is_clean = True
                elif target_category_upper == "ASSEMBLY":
                    is_clean = False
                else:
                    if "LIMP" in type_str:
                        is_clean = True
                    elif "ENSAM" in type_str:
                        is_clean = False
                    else:
                        op_text = (op_str + " " + desc_str).lower()
                        is_clean = any(k in op_text for k in ["limpieza", "limpiar", "película", "pelicula", "microfibra", "huellas", "desprotección", "desproteccion"])

                items.append({
                    "step_number": step_num,
                    "operation": op_str or desc_str[:50],
                    "description": desc_str,
                    "qc_criteria": crit_str or "Verificación correcta según especificación técnica",
                    "media_url": str(media_val or "").strip(),
                    "media_type": "gif" if "gif" in str(media_val or "").lower() else "image",
                    "is_cleaning": is_clean
                })
        except Exception as csv_err:
            print(f"Error parseando archivo checklist: {csv_err}")

    # Re-secuenciar pasos si no hay categoría específica y se parte de 1
    if target_category_upper != "CLEANING" and target_category_upper != "ASSEMBLY":
        for idx, item in enumerate(items, start=1):
            item["step_number"] = idx

    return items
