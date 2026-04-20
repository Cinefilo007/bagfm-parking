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
# Importación diferida para evitar ciclos

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
        Crea un lote de pases masivos con verificación de cuota y capacidad de estacionamiento.
        Sigue la Lógica Táctica v2.2: 
        - General: usa puestos no reservados.
        - Staff/VIP/etc: usa puestos reservados para su categoría.
        """
        # 1. Verificar Cuota y Entidad
        usuario = await db.get(Usuario, creado_por_id)
        if not usuario or not usuario.entidad_id:
             # Si no tiene entidad, solo permitimos si es ADMIN_BASE o COMANDANTE (sin cuota por ahora)
             if usuario and usuario.rol not in [RolTipo.COMANDANTE, RolTipo.ADMIN_BASE]:
                raise ValueError("El usuario no tiene una entidad vinculada.")
        
        entidad = None
        if usuario.entidad_id:
            from app.models.entidad_civil import EntidadCivil
            entidad = await db.get(EntidadCivil, usuario.entidad_id)
            if not entidad:
                raise ValueError("Entidad no encontrada.")
            
            # La capacidad se valida en el paso 2 (VALIDACIÓN TÁCTICA DE ESTACIONAMIENTO)
            # a través de las AsignacionZona. La cuota autónoma legacy ya no se aplica.

        # 2. VALIDACIÓN TÁCTICA DE ESTACIONAMIENTO (Requerimiento #8)
        zona_id = datos.get('zona_asignada_id') or datos.get('zona_id')
        tipo_acc = datos.get('tipo_acceso', 'general')
        
        # Salvaguarda: si tipo_acceso='custom' pero sin ID, tratar como 'general'
        custom_id = datos.get('tipo_acceso_custom_id')
        if tipo_acc == 'custom' and not custom_id:
            tipo_acc = 'general'

        if entidad:
            from app.models.asignacion_zona import AsignacionZona
            from sqlalchemy import and_
            
            # Obtener todas las asignaciones de la entidad para calcular capacidad total
            query_asigs = select(AsignacionZona).where(
                and_(AsignacionZona.entidad_id == entidad.id, AsignacionZona.activa == True)
            )
            res_asigs = await db.execute(query_asigs)
            asignaciones = res_asigs.scalars().all()
            
            capacidad_total_entidad = sum(asig.cupo_asignado for asig in asignaciones)
            
            # 2a. Bloqueo si supera la capacidad TOTAL de la entidad en todas sus zonas
            if datos['cantidad_pases'] > capacidad_total_entidad:
                raise ValueError(f"CAPACIDAD AGOTADA: La entidad solo tiene {capacidad_total_entidad} puestos totales asignados.")

            # 2b. Validación por Zona Específica (si se seleccionó una)
            if zona_id:
                asig_especifica = next((a for a in asignaciones if str(a.zona_id) == str(zona_id)), None)
                if asig_especifica:
                    distribucion = asig_especifica.distribucion_cupos or {}
                    cupo_total = asig_especifica.cupo_asignado
                    cupo_base  = asig_especifica.cupo_reservado_base or 0
                    cupos_cat  = sum(int(v) for v in distribucion.values() if v)
                    # Todos los tipos custom usan el remanente libre de la zona
                    cupo_disponible = max(0, cupo_total - cupo_base - cupos_cat)
                    
                    # Si no es distribución libre (ignorar warning en frontend), somos estrictos
                    dist_auto = datos.get('distribucion_automatica') or datos.get('distribucion_automatic', False)
                    if not dist_auto and datos['cantidad_pases'] > cupo_disponible:
                         raise ValueError(f"CUPO INSUFICIENTE en esta zona: Disponible {cupo_disponible}, Requerido {datos['cantidad_pases']}.")

        # 3. Generar serial y persistir lote
        serial_lote = await self._generar_serial_lote(db)
        
        nuevo_lote = LotePaseMasivo(
            codigo_serial=serial_lote,
            nombre_evento=datos['nombre_evento'],
            tipo_pase=datos['tipo_pase'],
            fecha_inicio=datos['fecha_inicio'],
            fecha_fin=datos['fecha_fin'],
            cantidad_pases=datos['cantidad_pases'],
            max_accesos_por_pase=datos.get('max_accesos_por_pase'),
            entidad_id=entidad.id if entidad else None,
            tipo_acceso=tipo_acc,
            zona_estacionamiento_id=zona_id,
            creado_por=creado_por_id
        )
        db.add(nuevo_lote)
        await db.flush()

        # Si viene de una solicitud, vincular
        if solicitud_id:
            solicitud = await db.get(SolicitudEvento, solicitud_id)
            if solicitud:
                solicitud.lote_id = nuevo_lote.id

        # 4. Generar QRs según el tipo
        if nuevo_lote.tipo_pase == PasseTipo.simple:
            await self._generar_pases_simples(db, nuevo_lote, creado_por_id, datos)
        elif nuevo_lote.tipo_pase == PasseTipo.portal:
            await self._generar_pases_portal(db, nuevo_lote, creado_por_id, datos)
        elif nuevo_lote.tipo_pase == PasseTipo.identificado:
            if datos.get('excel_data'):
                await self.procesar_json_identificado(db, nuevo_lote, datos['excel_data'], creado_por_id)
        
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

    async def _generar_pases_simples(self, db: AsyncSession, lote: LotePaseMasivo, creado_por_id: uuid.UUID, extras: dict):
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
                activo=True,
                # v2.0 campos
                tipo_acceso=extras.get('tipo_acceso', 'general'),
                tipo_acceso_custom_id=extras.get('tipo_acceso_custom_id'),
                zona_asignada_id=extras.get('zona_id'),
                puesto_asignado_id=extras.get('puesto_id'),
                multi_vehiculo=extras.get('multi_vehiculo', False)
            )
            db.add(nuevo_qr)

    async def _generar_pases_portal(self, db: AsyncSession, lote: LotePaseMasivo, creado_por_id: uuid.UUID, extras: dict):
        """Genera pre-usuarios para que se registren en el portal."""
        from app.core.security import hashear_password
        expira_at = datetime.combine(lote.fecha_fin, datetime.max.time()).replace(tzinfo=timezone.utc) + timedelta(hours=24)
        
        for i in range(1, lote.cantidad_pases + 1):
            serial_qr = f"{lote.codigo_serial}-{str(i).zfill(4)}"
            
            # Crear usuario temporal (SOCIO con contraseña = serial)
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
                activo=True,
                # v2.0 campos
                tipo_acceso=extras.get('tipo_acceso', 'general'),
                tipo_acceso_custom_id=extras.get('tipo_acceso_custom_id'),
                zona_asignada_id=extras.get('zona_id'),
                puesto_asignado_id=extras.get('puesto_id'),
                multi_vehiculo=extras.get('multi_vehiculo', False)
            )
            db.add(nuevo_qr)

    async def procesar_excel_identificado(self, db: AsyncSession, lote: LotePaseMasivo, contenido_excel: bytes, creado_por_id: uuid.UUID):
        """Parsea Excel y crea pases identificados (Versión Backend Directa)."""
        import pandas as pd
        import io
        
        df = pd.read_excel(io.BytesIO(contenido_excel))
        filas = df.values.tolist()
        await self.procesar_json_identificado(db, lote, filas, creado_por_id)

    async def procesar_json_identificado(self, db: AsyncSession, lote: LotePaseMasivo, filas: List[list], creado_por_id: uuid.UUID):
        """Parsea arreglo JSON (proveniente de Excel prevalidado) y crea pases identificados."""
        from app.core.security import hashear_password
        from app.models.vehiculo_pase import VehiculoPase
        
        # Límite de expiración
        expira_at = datetime.combine(lote.fecha_fin, datetime.max.time()).replace(tzinfo=timezone.utc) + timedelta(hours=24)
        count = 0
        
        for row in filas:
            if not len(row) > 0 or not row[0]: continue # Nombre mandatorio
            
            # Nuevo Formato Excel (20 Col): [NOMBRE, CEDULA, EMAIL, TELEFONO, 
            # V1_PLACA, V1_MARCA, V1_MODELO, V1_COLOR, 
            # V2_PLACA, V2_MARCA, V2_MODELO, V2_COLOR,
            # V3_PLACA, V3_MARCA, V3_MODELO, V3_COLOR,
            # V4_PLACA, V4_MARCA, V4_MODELO, V4_COLOR]
            
            row_data = (list(row) + [None]*20)[:20]
            nombre, cedula, email, telefono = row_data[0:4]
            v1_data = row_data[4:8]
            v2_data = row_data[8:12]
            v3_data = row_data[12:16]
            v4_data = row_data[16:20]
            
            serial_qr = f"{lote.codigo_serial}-{str(count + 1).zfill(4)}"
            token = crear_token_evento(serial_qr, expira_at)
            
            nuevo_qr = CodigoQR(
                token=token,
                tipo=QRTipo.evento_identificado,
                lote_id=lote.id,
                serial_legible=serial_qr,
                max_accesos=lote.max_accesos_por_pase,
                fecha_expiracion=expira_at,
                created_by=creado_por_id,
                activo=True,
                nombre_portador=str(nombre).upper(),
                cedula_portador=str(cedula) if cedula else None,
                email_portador=str(email).lower() if email else None,
                telefono_portador=str(telefono) if telefono else None,
                # Vehículo 1
                vehiculo_placa=str(v1_data[0]).upper() if v1_data[0] else None,
                vehiculo_marca=str(v1_data[1]).upper() if v1_data[1] else None,
                vehiculo_modelo=str(v1_data[2]).upper() if v1_data[2] else None,
                vehiculo_color=str(v1_data[3]).upper() if v1_data[3] else None,
                tipo_acceso=lote.tipo_acceso,
                tipo_acceso_custom_id=lote.tipo_acceso_custom_id,
                zona_asignada_id=lote.zona_estacionamiento_id,
                multi_vehiculo=bool(v2_data[0] or v3_data[0] or v4_data[0])
            )
            db.add(nuevo_qr)
            await db.flush()
            
            # Vehículos adicionales (V2, V3, V4)
            for v_data in [v2_data, v3_data, v4_data]:
                if v_data[0]: # Si hay placa
                    v_extra = VehiculoPase(
                        qr_id=nuevo_qr.id,
                        placa=str(v_data[0]).upper(),
                        marca=str(v_data[1]).upper() if v_data[1] else None,
                        modelo=str(v_data[2]).upper() if v_data[2] else None,
                        color=str(v_data[3]).upper() if v_data[3] else None,
                        zona_asignada_id=lote.zona_estacionamiento_id
                    )
                    db.add(v_extra)
            
            count += 1
            
        lote.cantidad_pases = count
        # Nota: el commit se hace en crear_lote o en el endpoint

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
            
            text_area_height = 80
            new_width = qr_width
            new_height = qr_height + text_area_height
            
            new_img = Image.new('RGB', (new_width, new_height), 'white')
            new_img.paste(img, (0, 0))
            
            draw = ImageDraw.Draw(new_img)
            
            import os
            font_path = os.path.join(os.path.dirname(__file__), "Roboto-Bold.ttf")
            font = None
            try:
                font = ImageFont.truetype(font_path, 36)
            except IOError:
                font = ImageFont.load_default()
                
            titulo_cortado = f"{titulo[:30]}..." if len(titulo) > 30 else titulo
            text = f"{titulo_cortado}  |  SERIAL: {serial}"
            
            if hasattr(font, 'getbbox'):
                bbox = draw.textbbox((0,0), text, font=font)
                text_width = bbox[2] - bbox[0]
                text_height = bbox[3] - bbox[1]
            else:
                try:
                    text_width, text_height = font.getsize(text)
                except Exception:
                    text_width, text_height = (len(text)*20, 30)
                
            text_x = max((new_width - text_width) // 2, 10)
            text_y = qr_height + (text_area_height - text_height) // 2 - 10
            
            draw.text((text_x, text_y), text, fill="black", font=font)
            
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
            import re
            nombre_limpio = re.sub(r'[^a-zA-Z0-9_\-]', '_', lote.nombre_evento).strip('_')
            file_path = f"pases/{nombre_limpio}_{lote.codigo_serial}.zip"
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

    async def generar_pdf_masivo(self, db: AsyncSession, lote_id: uuid.UUID) -> str:
        """
        Genera el PDF masivo del lote y lo sube a Supabase.
        Retorna la URL.
        """
        from app.services.pdf_service import pdf_service
        lote = await db.get(LotePaseMasivo, lote_id)
        if not lote: return None
        
        pdf_buffer = await pdf_service.generar_pdf_lote(db, lote_id)
        
        # Subir a Supabase
        if self.supabase:
            import re
            nombre_limpio = re.sub(r'[^a-zA-Z0-9_\-]', '_', lote.nombre_evento).strip('_')
            file_path = f"pases_pdf/{nombre_limpio}_{lote.codigo_serial}.pdf"
            
            try:
                self.supabase.storage.from_("bagfm-pases").remove([file_path])
            except: pass
            
            self.supabase.storage.from_("bagfm-pases").upload(
                file_path, 
                pdf_buffer.getvalue(),
                {"content-type": "application/pdf"}
            )
            
            public_url = self.supabase.storage.from_("bagfm-pases").get_public_url(file_path)
            lote.pdf_url = public_url # Asegurarse de que el modelo tiene este campo
            await db.commit()
            return public_url
            
        return "storage_not_configured"

pase_service = PaseService()
