import io
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

def generate_checklist_template(model_name: str = "PROWORK") -> bytes:
    """Genera la plantilla oficial en Excel (.xlsx) para importar pasos en QC KENYA"""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Plantilla_Pasos_QC"

    # Fila 1: Título estilizado
    ws.merge_cells("A1:E1")
    title_cell = ws["A1"]
    title_cell.value = f"PLANTILLA OFICIAL DE IMPORTACIÓN DE PASOS – QC KENYA ({model_name.upper()})"
    title_cell.font = Font(name="Segoe UI", size=13, bold=True, color="FFFFFF")
    title_cell.fill = PatternFill(start_color="0078D4", end_color="0078D4", fill_type="solid")
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 32

    # Fila 2: Instrucción guía
    ws.merge_cells("A2:E2")
    info_cell = ws["A2"]
    info_cell.value = "Guía: Ingrese 1 paso por fila. Puede editar o reemplazar los ejemplos de las filas 4 a 6. Guarde y suba este archivo al sistema."
    info_cell.font = Font(name="Segoe UI", size=9, italic=True, color="404040")
    info_cell.fill = PatternFill(start_color="FFF4CE", end_color="FFF4CE", fill_type="solid")
    info_cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[2].height = 22

    # Fila 3: Encabezados oficiales
    headers = [
        ("A3", "Paso_Nro", 12),
        ("B3", "Operacion", 35),
        ("C3", "Descripcion_Detallada", 45),
        ("D3", "Criterio_Control_Calidad", 45),
        ("E3", "Multimedia_URL_O_Nombre", 30),
    ]

    header_fill = PatternFill(start_color="EDEBE9", end_color="EDEBE9", fill_type="solid")
    header_font = Font(name="Segoe UI", size=10, bold=True, color="201F1E")
    thin_border = Border(
        left=Side(style="thin", color="D2D0CE"),
        right=Side(style="thin", color="D2D0CE"),
        top=Side(style="thin", color="D2D0CE"),
        bottom=Side(style="thin", color="D2D0CE")
    )

    for cell_ref, text, col_width in headers:
        cell = ws[cell_ref]
        cell.value = text
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center" if "Nro" in text else "left", vertical="center")
        cell.border = thin_border
        ws.column_dimensions[cell_ref[0]].width = col_width

    ws.row_dimensions[3].height = 26

    # Filas de ejemplo ilustrativas
    sample_rows = [
        (1, "Instalación de Procesador CPU", "Abrir el socket de la placa madre y colocar el procesador alineando la guía triangular sin forzar.", "Socket bloqueado con palanca sin juego, pines intactos y alineación perfecta.", ""),
        (2, "Aplicación de Pasta Térmica y Cooler", "Aplicar pasta térmica en el centro del CPU y asegurar el cooler con apriete cruzado uniforme.", "Disipador firme y conector CPU_FAN conectado a la placa.", ""),
        (3, "Montaje de Memoria RAM", "Insertar los módulos de memoria RAM en slots principales (A2/B2) hasta escuchar el click.", "Ambos seguros laterales trabados con sonido click característico.", "")
    ]

    example_fill = PatternFill(start_color="FBFBFB", end_color="FBFBFB", fill_type="solid")
    curr_row = 4
    for r_data in sample_rows:
        ws[f"A{curr_row}"] = r_data[0]
        ws[f"B{curr_row}"] = r_data[1]
        ws[f"C{curr_row}"] = r_data[2]
        ws[f"D{curr_row}"] = r_data[3]
        ws[f"E{curr_row}"] = r_data[4]

        for col in ["A", "B", "C", "D", "E"]:
            c = ws[f"{col}{curr_row}"]
            c.font = Font(name="Segoe UI", size=9)
            c.fill = example_fill
            c.border = thin_border
            c.alignment = Alignment(horizontal="center" if col == "A" else "left", vertical="center", wrap_text=True)
        ws.row_dimensions[curr_row].height = 28
        curr_row += 1

    # Filas vacías adicionales pre-estilizadas
    for empty_idx in range(curr_row, curr_row + 12):
        ws[f"A{empty_idx}"] = empty_idx - 3
        for col in ["A", "B", "C", "D", "E"]:
            c = ws[f"{col}{empty_idx}"]
            c.font = Font(name="Segoe UI", size=9)
            c.border = thin_border
            c.alignment = Alignment(horizontal="center" if col == "A" else "left", vertical="center", wrap_text=True)
        ws.row_dimensions[empty_idx].height = 24

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output.getvalue()

def generate_checklist_csv_template() -> str:
    """Genera plantilla en formato CSV con ejemplos"""
    import csv
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Paso_Nro", "Operacion", "Descripcion_Detallada", "Criterio_Control_Calidad", "Multimedia_URL_O_Nombre"])
    writer.writerow([1, "Instalación de Procesador CPU", "Abrir el socket de la placa madre y colocar el procesador alineando la guía triangular.", "Socket bloqueado con palanca sin pines doblados", ""])
    writer.writerow([2, "Aplicación de Pasta Térmica y Cooler", "Aplicar pasta térmica en el centro y montar disipador con presión cruzada.", "Disipador firmemente anclado, cable CPU_FAN conectado a placa", ""])
    writer.writerow([3, "Montaje de Memoria RAM", "Insertar módulos de RAM en slots recomendados (A2/B2) hasta escuchar click.", "Ambos seguros laterales trabados con click", ""])
    return output.getvalue()

def parse_checklist_file(file_bytes: bytes, filename: str = "") -> List[Dict]:
    """Parsea un archivo subido (Excel .xlsx o CSV) y extrae la lista normalizada de pasos"""
    import csv
    filename_lower = filename.lower()
    is_csv = filename_lower.endswith(".csv") or not (filename_lower.endswith(".xlsx") or filename_lower.endswith(".xls"))

    # Intento de lectura como CSV si aplica
    if is_csv:
        try:
            for enc in ["utf-8-sig", "utf-8", "latin-1"]:
                try:
                    text = file_bytes.decode(enc)
                    break
                except UnicodeDecodeError:
                    continue
            else:
                text = file_bytes.decode("utf-8", errors="ignore")

            first_line = text.split("\n")[0] if text else ""
            delim = ";" if ";" in first_line and first_line.count(";") >= first_line.count(",") else ","
            if "\t" in first_line and first_line.count("\t") > first_line.count(delim):
                delim = "\t"

            reader = csv.reader(io.StringIO(text), delimiter=delim)
            rows = [r for r in reader if any(field.strip() for field in r)]
            if rows:
                header_idx = -1
                for idx, r in enumerate(rows[:5]):
                    row_str = " ".join(r).lower()
                    if "operacion" in row_str or "criterio" in row_str or "paso" in row_str:
                        header_idx = idx
                        break

                data_rows = rows[header_idx + 1:] if header_idx != -1 else rows
                items = []
                for r in data_rows:
                    if not r:
                        continue
                    col_p = r[0].strip() if len(r) > 0 else ""
                    col_op = r[1].strip() if len(r) > 1 else ""
                    col_desc = r[2].strip() if len(r) > 2 else ""
                    col_crit = r[3].strip() if len(r) > 3 else ""
                    col_media = r[4].strip() if len(r) > 4 else ""

                    if not col_op and not col_crit:
                        continue
                    if "operacion" in col_op.lower() and "criterio" in col_crit.lower():
                        continue

                    try:
                        step_num = int(col_p) if col_p.isdigit() else len(items) + 1
                    except Exception:
                        step_num = len(items) + 1

                    items.append({
                        "step_number": step_num,
                        "operation": col_op,
                        "description": col_desc,
                        "qc_criteria": col_crit,
                        "media_url": col_media,
                        "media_type": "gif" if "gif" in col_media.lower() else "image"
                    })
                if items:
                    return items
        except Exception:
            pass

    # Intento como Excel (.xlsx) con openpyxl
    try:
        wb = openpyxl.load_workbook(filename=io.BytesIO(file_bytes), data_only=True)
        ws = wb.active

        items = []
        header_row = -1
        col_map = {"step": 1, "op": 2, "desc": 3, "crit": 4, "media": 5}

        for r in range(1, min(ws.max_row + 1, 8)):
            row_vals = [str(ws.cell(row=r, column=c).value or "").lower().strip() for c in range(1, 10)]
            row_str = " ".join(row_vals)
            if "operacion" in row_str or "criterio" in row_str:
                header_row = r
                for c in range(1, 10):
                    val = str(ws.cell(row=r, column=c).value or "").lower()
                    if "media" in val or "imagen" in val or "foto" in val or "url" in val or "gif" in val:
                        col_map["media"] = c
                    elif "operacion" in val or "tarea" in val or "proceso" in val or "accion" in val:
                        col_map["op"] = c
                    elif "paso" in val or "nro" in val or "num" in val:
                        col_map["step"] = c
                    elif "descrip" in val or "detalle" in val:
                        col_map["desc"] = c
                    elif "criterio" in val or "control" in val or "calidad" in val:
                        col_map["crit"] = c
                    elif "nombre" in val and "media" not in val:
                        col_map["op"] = c
                break

        start_row = (header_row + 1) if header_row != -1 else 3
        for r in range(start_row, ws.max_row + 1):
            step_val = ws.cell(row=r, column=col_map["step"]).value
            op_val = ws.cell(row=r, column=col_map["op"]).value
            desc_val = ws.cell(row=r, column=col_map["desc"]).value
            crit_val = ws.cell(row=r, column=col_map["crit"]).value
            media_val = ws.cell(row=r, column=col_map["media"]).value

            if not op_val and not step_val and not crit_val:
                continue
            op_str = str(op_val or "").strip()
            crit_str = str(crit_val or "").strip()
            if not op_str and not crit_str:
                continue

            try:
                step_num = int(step_val) if step_val is not None and str(step_val).isdigit() else len(items) + 1
            except Exception:
                step_num = len(items) + 1

            items.append({
                "step_number": step_num,
                "operation": op_str,
                "description": str(desc_val or "").strip(),
                "qc_criteria": crit_str,
                "media_url": str(media_val or "").strip(),
                "media_type": "gif" if "gif" in str(media_val or "").lower() else "image"
            })

        return items
    except Exception as exc:
        raise ValueError(f"Error procesando archivo Excel o CSV: {str(exc)}")

def parse_checklist_excel(file_bytes: bytes) -> List[Dict]:
    """Alias compatible con versiones previas"""
    return parse_checklist_file(file_bytes)

