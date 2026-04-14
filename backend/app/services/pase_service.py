import uuid
import io
import zipfile
import qrcode
from datetime import datetime, date, timedelta, timezone
from typing import List, Optional, Tuple
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from supabase import create_client, Client

from app.core.config import obtener_config
from app.models.alcabala_evento import LotePaseMasivo, SolicitudEvento
from app.models.codigo_qr import CodigoQR
from app.models.enums import PasseTipo, QRTipo, RolTipo
from app.models.usuario import Usuario
from app.models.vehiculo import Vehiculo
from app.core.security import crear_token_evento

config = obtener_config()

class PaseService:
    def __init__(self):
        try:
            if config.supabase_url and config.supabase_service_key and config.supabase_url.startswith("http"):
                self.supabase: Client = create_client(config.supabase_url, config.supabase_service_key)
            else:
                self.supabase = None
        except Exception as e:
            print(f"ALERTA TÁCTICA: Fallo al inicializar Supabase Storage: {e}")
            self.supabase = None

    async def crear_lote(
        self, 
        db: AsyncSession, 
        datos: dict, 
        creado_por_id: uuid.UUID,
        solicitud_id: Optional[uuid.UUID] = None
    ) -> LotePaseMasivo:
        """
        Crea un lote de pases masivos.
        datos: {nombre_evento, tipo_pase, fecha_inicio, fecha_fin, cantidad_pases, max_accesos_por_pase}
        """
        # Generar serial legible
        serial_lote = await self._generar_serial_lote(db)
        
        nuevo_lote = LotePaseMasivo(
            codigo_serial=serial_lote,
            nombre_evento=datos['nombre_evento'],
            tipo_pase=datos['tipo_pase'],
            fecha_inicio=datos['fecha_inicio'],
            fecha_fin=datos['fecha_fin'],
            cantidad_pases=datos['cantidad_pases'],
            max_accesos_por_pase=datos.get('max_accesos_por_pase'),
            creado_por=creado_por_id
        )
        db.add(nuevo_lote)
        await db.flush()

        # Si viene de una solicitud, vincular
        if solicitud_id:
            solicitud = await db.get(SolicitudEvento, solicitud_id)
            if solicitud:
                solicitud.lote_id = nuevo_lote.id

        # Generar QRs según el tipo
        if nuevo_lote.tipo_pase == PasseTipo.simple:
            await self._generar_pases_simples(db, nuevo_lote, creado_por_id)
        elif nuevo_lote.tipo_pase == PasseTipo.portal:
            await self._generar_pases_portal(db, nuevo_lote, creado_por_id)
        # El tipo 'identificado' se procesa aparte via Excel
        
        await db.commit()
        return nuevo_lote

    async def _generar_serial_lote(self, db: AsyncSession) -> str:
        """Genera serial tipo BAGFM-26ABR-003"""
        ahora = datetime.now()
        meses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"]
        prefijo = f"BAGFM-{str(ahora.year)[2:]}{meses[ahora.month-1]}"
        
        # Contar lotes del mes
        inicio_mes = ahora.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        query = select(func.count(LotePaseMasivo.id)).where(LotePaseMasivo.created_at >= inicio_mes)
        res = await db.execute(query)
        count = res.scalar() or 0
        
        return f"{prefijo}-{str(count + 1).zfill(3)}"

    async def _generar_pases_simples(self, db: AsyncSession, lote: LotePaseMasivo, creado_por_id: uuid.UUID):
        """Genera N pases simples para el lote."""
        expira_at = datetime.combine(lote.fecha_fin, datetime.max.time()).replace(tzinfo=timezone.utc) + timedelta(hours=24)
        
        for i in range(1, lote.cantidad_pases + 1):
            serial_qr = f"{lote.codigo_serial}-{str(i).zfill(4)}"
            token = crear_token_evento(serial_qr, expira_at)
            
            nuevo_qr = CodigoQR(
                token=token,
                tipo=QRTipo.evento_simple,
                lote_id=lote.id,
                serial_legible=serial_qr,
                max_accesos=lote.max_accesos_por_pase,
                fecha_expiracion=expira_at,
                created_by=creado_por_id,
                activo=True
            )
            db.add(nuevo_qr)

    async def _generar_pases_portal(self, db: AsyncSession, lote: LotePaseMasivo, creado_por_id: uuid.UUID):
        """Genera pre-usuarios para que se registren en el portal."""
        from app.core.security import hashear_password
        expira_at = datetime.combine(lote.fecha_fin, datetime.max.time()).replace(tzinfo=timezone.utc) + timedelta(hours=24)
        
        for i in range(1, lote.cantidad_pases + 1):
            serial_qr = f"{lote.codigo_serial}-{str(i).zfill(4)}"
            
            # Crear usuario temporal (SOCIO con contraseña = serial)
            # Usamos el serial como cedula temporalmente
            nuevo_usuario = Usuario(
                cedula=serial_qr,
                nombre=f"INVITADO {i}",
                apellido=lote.nombre_evento,
                rol=RolTipo.SOCIO,
                password_hash=hashear_password(serial_qr),
                debe_cambiar_password=False,
                activo=True
            )
            db.add(nuevo_usuario)
            await db.flush()
            
            token = crear_token_evento(serial_qr, expira_at)
            nuevo_qr = CodigoQR(
                usuario_id=nuevo_usuario.id,
                token=token,
                tipo=QRTipo.evento_portal,
                lote_id=lote.id,
                serial_legible=serial_qr,
                max_accesos=lote.max_accesos_por_pase,
                fecha_expiracion=expira_at,
                created_by=creado_por_id,
                activo=True
            )
            db.add(nuevo_qr)

    async def procesar_excel_identificado(self, db: AsyncSession, lote: LotePaseMasivo, contenido_excel: bytes, creado_por_id: uuid.UUID):
        """Parsea Excel y crea pases identificados."""
        import openpyxl
        from app.core.security import hashear_password
        
        f = io.BytesIO(contenido_excel)
        wb = openpyxl.load_workbook(f)
        ws = wb.active
        
        expira_at = datetime.combine(lote.fecha_fin, datetime.max.time()).replace(tzinfo=timezone.utc) + timedelta(hours=24)
        count = 0
        
        # Saltamos encabezado
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row[0]: continue # Nombre mandatorio
            
            nombre, apellido, cedula, telefono, marca, modelo, placa, color, año = row[:9]
            serial_qr = f"{lote.codigo_serial}-{str(count + 1).zfill(4)}"
            
            # 1. Crear Usuario
            nuevo_u = Usuario(
                cedula=str(cedula) if cedula else serial_qr,
                nombre=str(nombre).upper(),
                apellido=str(apellido).upper(),
                telefono=str(telefono) if telefono else None,
                rol=RolTipo.SOCIO,
                password_hash=hashear_password(str(cedula) if cedula else serial_qr),
                debe_cambiar_password=False
            )
            db.add(nuevo_u)
            await db.flush()
            
            # 2. Crear Vehículo
            if placa:
                nuevo_v = Vehiculo(
                    socio_id=nuevo_u.id,
                    placa=str(placa).upper(),
                    marca=str(marca).upper() if marca else "GENERICO",
                    modelo=str(modelo).upper() if modelo else "GENERICO",
                    color=str(color).upper() if color else "DESCONOCIDO",
                    año=int(año) if año else None
                )
                db.add(nuevo_v)
            
            # 3. Crear QR
            token = crear_token_evento(serial_qr, expira_at)
            nuevo_qr = CodigoQR(
                usuario_id=nuevo_u.id,
                token=token,
                tipo=QRTipo.evento_identificado,
                lote_id=lote.id,
                serial_legible=serial_qr,
                max_accesos=lote.max_accesos_por_pase,
                fecha_expiracion=expira_at,
                created_by=creado_por_id,
                activo=True
            )
            db.add(nuevo_qr)
            count += 1
            
        lote.cantidad_pases = count
        await db.commit()

    def generar_qr_image(self, data: str, titulo: str = "", subtitulo: str = "", serial: str = "") -> io.BytesIO:
        """Genera una imagen QR de resolución balanceada (aprox 800x800) con texto descriptivo."""
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=20, 
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white").convert('RGB')
        
        if titulo or subtitulo or serial:
            from PIL import Image, ImageDraw, ImageFont
            qr_width, qr_height = img.size
            new_width = qr_width + 600
            
            new_img = Image.new('RGB', (new_width, qr_height), 'white')
            new_img.paste(img, (0, 0))
            
            draw = ImageDraw.Draw(new_img)
            try:
                font_title = ImageFont.truetype("arialbd.ttf", 36)
                font_body = ImageFont.truetype("arial.ttf", 28)
            except IOError:
                font_title = ImageFont.load_default()
                font_body = ImageFont.load_default()
                
            text_x = qr_width + 20
            text_y = qr_height // 2 - 80
            
            titulo_cortado = f"{titulo[:25]}..." if len(titulo) > 25 else titulo
            
            draw.text((text_x, text_y), f"EVENTO: {titulo_cortado}", fill="black", font=font_title)
            draw.text((text_x, text_y + 50), f"TIPO: {subtitulo}", fill="black", font=font_body)
            draw.text((text_x, text_y + 90), f"SERIAL: {serial}", fill="black", font=font_body)
            draw.text((text_x, text_y + 140), "SISTEMA BAGFM TÁCTICO", fill=(100, 100, 100), font=font_body)
            
            img_byte_arr = io.BytesIO()
            new_img.save(img_byte_arr, format='PNG')
        else:
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='PNG')
            
        img_byte_arr.seek(0)
        return img_byte_arr

    async def generar_zip_lote(self, db: AsyncSession, lote_id: uuid.UUID) -> str:
        """
        Genera un ZIP con todos los QRs del lote y lo sube a Supabase.
        Retorna la URL del archivo.
        """
        lote = await db.get(LotePaseMasivo, lote_id)
        if not lote: return None
        
        query = select(CodigoQR).where(CodigoQR.lote_id == lote.id)
        res = await db.execute(query)
        qrs = res.scalars().all()
        
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'a', zipfile.ZIP_DEFLATED, False) as zip_file:
            from app.models.enums import QRTipo
            for qr in qrs:
                filename = f"{qr.serial_legible}.png"
                
                tipo_str = "QR GENÉRICO"
                if qr.tipo == QRTipo.evento_identificado:
                    tipo_str = "IDENTIFICADO"
                elif qr.tipo == QRTipo.evento_portal:
                    tipo_str = "AUTO-REGISTRO"
                    
                img_data = self.generar_qr_image(qr.token, lote.nombre_evento, tipo_str, qr.serial_legible)
                zip_file.writestr(filename, img_data.getvalue())
        
        zip_buffer.seek(0)
        
        # Subir a Supabase Storage
        if self.supabase:
            file_path = f"pases/{lote.codigo_serial}.zip"
            # Limpiar si ya existe
            try:
                self.supabase.storage.from_("bagfm-pases").remove([file_path])
            except: pass
            
            res_storage = self.supabase.storage.from_("bagfm-pases").upload(
                file_path, 
                zip_buffer.getvalue(),
                {"content-type": "application/zip"}
            )
            
            public_url = self.supabase.storage.from_("bagfm-pases").get_public_url(file_path)
            lote.zip_url = public_url
            lote.zip_generado = True
            lote.zip_listo_at = datetime.now(timezone.utc)
            await db.commit()
            return public_url
            
        return "storage_not_configured"

pase_service = PaseService()
