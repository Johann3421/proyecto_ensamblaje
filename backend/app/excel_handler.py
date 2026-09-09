import io
import csv
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from typing import List, Dict

def generate_checklist_excel(model_name: str, items: List[Dict]) -> bytes:
    """Genera un archivo Excel (.xlsx) estilizado con el formato oficial de QC KENYA"""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = f"QC_{model_name[:20]}"
    
    # Encabezado principal
    ws.merge_cells("A1:E1")
    title_cell = ws["A1"]
    title_cell.value = f"CHECKLIST DE CONTROL DE CALIDAD – PC KENYA {model_name.upper()}"
    title_cell.font = Font(name="Segoe UI", size=14, bold=True, color="FFFFFF")
    title_cell.fill = PatternFill(start_color="0078D4", end_color="0078D4", fill_type="solid") # Microsoft Blue
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 35

    # Headers de columnas
    headers = [
        ("A2", "Paso_Nro", 10),
        ("B2", "Operacion", 35),
        ("C2", "Descripcion_Detallada", 45),
        ("D2", "Criterio_Control_Calidad", 45),
        ("E2", "Multimedia_URL_O_Nombre", 30),
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
        cell.alignment = Alignment(horizontal="center" if "Nro" in text else "left", vertical="center")
        cell.border = thin_border
        col_letter = cell_ref[0]
        ws.column_dimensions[col_letter].width = col_width

    ws.row_dimensions[2].height = 25

    # Llenar datos
    row_num = 3
    for it in items:
        ws[f"A{row_num}"] = it.get("step_number", row_num - 2)
        ws[f"B{row_num}"] = it.get("operation", "")
        ws[f"C{row_num}"] = it.get("description", "")
        ws[f"D{row_num}"] = it.get("qc_criteria", "")
        ws[f"E{row_num}"] = it.get("media_url", "")

        for col in ["A", "B", "C", "D", "E"]:
            c = ws[f"{col}{row_num}"]
            c.font = Font(name="Segoe UI", size=10)
            c.border = thin_border
            c.alignment = Alignment(
                horizontal="center" if col == "A" else "left",
                vertical="center",
                wrap_text=True
            )
        ws.row_dimensions[row_num].height = 30
        row_num += 1

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output.getvalue()

def generate_checklist_template(model_name: str = "") -> bytes:
    """Genera la plantilla oficial Excel (.xlsx) para importar pasos con ejemplos claros e instrucciones"""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Plantilla_Checklist"
    
    # 1. Título principal
    ws.merge_cells("A1:E1")
    title_cell = ws["A1"]
    suffix = f" – MODELO {model_name.upper()}" if model_name else ""
    title_cell.value = f"PLANTILLA OFICIAL DE IMPORTACIÓN – CHECKLIST QC KENYA{suffix}"
    title_cell.font = Font(name="Segoe UI", size=13, bold=True, color="FFFFFF")
    title_cell.fill = PatternFill(start_color="0078D4", end_color="0078D4", fill_type="solid")
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 36

    # 2. Fila de instrucciones
    ws.merge_cells("A2:E2")
    inst_cell = ws["A2"]
    inst_cell.value = (
        "💡 INSTRUCCIONES: 1. Complete una fila por cada paso. Las columnas 'Operacion' y 'Criterio_Control_Calidad' son obligatorias. "
        "2. 'Paso_Nro' es correlativo (1, 2, 3...). 3. 'Multimedia_URL_O_Nombre' es opcional. "
        "4. Al terminar, guarde el archivo y súbalo en 'Checklists' -> 'Importar'."
    )
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
        ("E3", "Multimedia_URL_O_Nombre", 35),
    ]

    header_fill = PatternFill(start_color="102A43", end_color="102A43", fill_type="solid") # Navy dark
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
        cell.alignment = Alignment(horizontal="center" if "Nro" in text else "left", vertical="center")
        cell.border = thin_border
        col_letter = cell_ref[0]
        ws.column_dimensions[col_letter].width = col_width

    ws.row_dimensions[3].height = 28

    # 4. Filas de ejemplo instructivas
    sample_rows = [
        (
            1,
            "Inspección física inicial de chasis y puertos",
            "Verificar integridad del gabinete, frontis, tornillería y conectores USB/Audio frontales.",
            "Sin rayaduras, abolladuras ni partes sueltas. Conectores frontales firmes y alineados.",
            ""
        ),
        (
            2,
            "Instalación de Placa Madre, CPU y Pasta Térmica",
            "Montar procesador en socket verificando la muesca de orientación. Aplicar pasta térmica y anclar disipador.",
            "Socket trabado correctamente, pasta distribuida uniformemente, disipador asegurado firmemente.",
            ""
        ),
        (
            3,
            "Montaje de Memoria RAM y Unidad M.2 NVMe",
            "Insertar módulos en bancos principales (Dual Channel si aplica) y fijar disco M.2 con disipador térmico.",
            "Módulos RAM asegurados con clic en ambos lados. M.2 atornillado con perno espaciador.",
            ""
        ),
        (
            4,
            "Fijación de Fuente de Poder y Gestión de Cableado",
            "Asegurar fuente de poder. Conectar ATX 24 pines, CPU 8 pines y ordenar cableado con precintos.",
            "Conectores encajados al 100% con seguro trabado. Cables peinados sin interferir ventiladores.",
            ""
        ),
        (
            5,
            "Encendido de Prueba, Verificación de BIOS y Parámetros",
            "Conectar a monitor y teclado de prueba. Entrar a BIOS y validar detección de CPU, RAM y SSD.",
            "Arranque exitoso al primer intento. BIOS reconoce total de componentes con voltajes y temperaturas normales.",
            ""
        )
    ]

    row_num = 4
    for item in sample_rows:
        ws[f"A{row_num}"] = item[0]
        ws[f"B{row_num}"] = item[1]
        ws[f"C{row_num}"] = item[2]
        ws[f"D{row_num}"] = item[3]
        ws[f"E{row_num}"] = item[4]

        for col in ["A", "B", "C", "D", "E"]:
            c = ws[f"{col}{row_num}"]
            c.font = Font(name="Segoe UI", size=9)
            c.border = thin_border
            c.alignment = Alignment(
                horizontal="center" if col == "A" else "left",
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
        "criterio_control", "criterio_calidad", "multimedia_url"
    ]
    return any(k in combined for k in keywords)

def parse_checklist_excel(file_bytes: bytes) -> List[Dict]:
    """Parsea un archivo Excel (.xlsx, .xls) o CSV subido y extrae la lista de pasos limpiando títulos y cabeceras"""
    items = []
    
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

            # Si es fila de encabezados, instrucciones o está vacía, omitir
            if _is_header_or_instruction_row(operation_val, step_num_val, criteria_val):
                continue

            op_str = str(operation_val or "").strip()
            crit_str = str(criteria_val or "").strip()
            desc_str = str(desc_val or "").strip()

            if not op_str and not desc_str:
                continue

            # Extraer número de paso
            try:
                step_num = int(step_num_val) if step_num_val is not None else len(items) + 1
            except (ValueError, TypeError):
                step_num = len(items) + 1

            items.append({
                "step_number": step_num,
                "operation": op_str or desc_str[:50],
                "description": desc_str,
                "qc_criteria": crit_str or "Verificación correcta según especificación técnica",
                "media_url": str(media_val or "").strip(),
                "media_type": "gif" if "gif" in str(media_val or "").lower() else "image"
            })
            
    except Exception:
        # 2. Fallback: Intentar como CSV (con delimitador coma o punto y coma)
        try:
            text_content = file_bytes.decode("utf-8-sig", errors="replace")
            # Detectar delimitador
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

                if _is_header_or_instruction_row(operation_val, step_num_val, criteria_val):
                    continue

                op_str = str(operation_val or "").strip()
                desc_str = str(desc_val or "").strip()
                crit_str = str(criteria_val or "").strip()

                if not op_str and not desc_str:
                    continue

                try:
                    step_num = int(step_num_val) if step_num_val and step_num_val.strip().isdigit() else len(items) + 1
                except (ValueError, TypeError):
                    step_num = len(items) + 1

                items.append({
                    "step_number": step_num,
                    "operation": op_str or desc_str[:50],
                    "description": desc_str,
                    "qc_criteria": crit_str or "Verificación correcta según especificación técnica",
                    "media_url": str(media_val or "").strip(),
                    "media_type": "gif" if "gif" in str(media_val or "").lower() else "image"
                })
        except Exception as csv_err:
            print(f"Error parseando archivo checklist: {csv_err}")

    # Re-secuenciar pasos correlativamente para garantizar orden perfecto (1, 2, 3...)
    for idx, item in enumerate(items, start=1):
        item["step_number"] = idx

    return items
