import openpyxl
from io import BytesIO
from openpyxl.styles import Font, PatternFill, Alignment

class TemplateService:
    def generar_excel_socios_template(self) -> bytes:
        """
        Genera un archivo Excel con los encabezados necesarios para importar socios.
        """
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "IMPORTAR_SOCIOS"

        # Encabezados
        headers = [
            "CEDULA", "NOMBRE", "APELLIDO", "EMAIL", "TELEFONO", 
            "PLACA", "MARCA", "MODELO", "COLOR"
        ]
        
        # Estilos para el encabezado
        header_fill = PatternFill(start_color="4EDEA3", end_color="4EDEA3", fill_type="solid")
        header_font = Font(bold=True, color="003824")
        center_align = Alignment(horizontal="center")

        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num, value=header)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = center_align
            # Ajustar ancho de columna
            ws.column_dimensions[openpyxl.utils.get_column_letter(col_num)].width = 15

        # Instrucciones de ejemplo en la fila 2 (opcional, pero ayuda)
        ejemplo = [
            "V12345678", "JUAN", "PEREZ", "juan@ejemplo.com", "04121234567",
            "ABC12D", "TOYOTA", "COROLLA", "BLANCO"
        ]
        for col_num, value in enumerate(ejemplo, 1):
            ws.cell(row=2, column=col_num, value=value)

        # Guardar en memoria
        output = BytesIO()
        wb.save(output)
        return output.getvalue()

    def generar_excel_pases_template(self) -> bytes:
        """
        Genera un archivo Excel con los encabezados necesarios para pases con identificación (Tipo B).
        Estructura v2.1: Nombre, Cédula, Email, Teléfono, Placa 1, Placa 2, Placa 3.
        """
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "DATOS_IDENTIFICACION"

        # Encabezados tácticos v2.1
        headers = [
            "NOMBRE COMPLETO", "CEDULA", "EMAIL", "TELEFONO", 
            "PLACA VEHICULO 1", "PLACA VEHICULO 2", "PLACA VEHICULO 3"
        ]
        
        # Estilos
        header_fill = PatternFill(start_color="3B82F6", end_color="3B82F6", fill_type="solid") # Azul táctico
        header_font = Font(bold=True, color="FFFFFF")
        center_align = Alignment(horizontal="center")

        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num, value=header)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = center_align
            ws.column_dimensions[openpyxl.utils.get_column_letter(col_num)].width = 22

        # Ejemplo táctico
        ejemplo = [
            "JUAN PEREZ", "V10987654", "juan@correo.com", "04245558899",
            "AC123LL", "XDE990", ""
        ]
        for col_num, value in enumerate(ejemplo, 1):
            ws.cell(row=2, column=col_num, value=value)

        output = BytesIO()
        wb.save(output)
        return output.getvalue()

template_service = TemplateService()
