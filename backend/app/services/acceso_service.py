from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError

from app.models.acceso import Acceso
from app.models.usuario import Usuario
from app.models.vehiculo import Vehiculo
from app.models.membresia import Membresia
from app.models.infraccion import Infraccion
from app.models.codigo_qr import CodigoQR
from app.models.entidad_civil import EntidadCivil
from app.models.enums import AccesoTipo, MembresiaEstado, InfraccionEstado, QRTipo
from app.schemas.acceso import AccesoValidar, AccesoRegistrar, ResultadoValidacion
from app.services.membresia_service import membresia_service
from app.core.security import decodificar_token

class AccesoService:
    """
    🧠 Lógica de Negocio (SOP) para el Control de Accesos.
    Encapsula la validación integral de seguridad y cumplimiento.
    """
    
    async def validar_qr(self, db: AsyncSession, datos: AccesoValidar) -> ResultadoValidacion:
        """
        Valida un token de QR y retorna la ficha del socio con su estado de cumplimiento.
        """
        try:
            # 1. Decodificar Token
            try:
                payload = decodificar_token(datos.qr_token)
            except JWTError:
                return ResultadoValidacion(permitido=False, mensaje="Token QR expirado o corrupto", tipo_alerta="error")
                
            usuario_id_str = payload.get("sub")
            vehiculo_id_str = payload.get("vehiculo_id")
            
            # 2. Buscar QR en BD
            query_qr = select(CodigoQR).where(CodigoQR.token == datos.qr_token)
            res_qr = await db.execute(query_qr)
            qr_db = res_qr.scalar_one_or_none()
            
            if not qr_db:
                return ResultadoValidacion(permitido=False, mensaje="QR no registrado en el sistema", tipo_alerta="error")
            
            if not qr_db.activo:
                return ResultadoValidacion(permitido=False, mensaje="El QR ha sido revocado o ya no es válido", tipo_alerta="error")

            # 3. Buscar Usuario (Socio) - Usa qr_db.usuario_id que siempre es seguro
            socio = None
            if qr_db.usuario_id:
                query_socio = select(Usuario).where(Usuario.id == qr_db.usuario_id, Usuario.activo == True)
                res_socio = await db.execute(query_socio)
                socio = res_socio.scalar_one_or_none()

            # 4. Lógica de Pases Masivos
            if qr_db.lote_id:
                # Validar Límites de Acceso
                if qr_db.max_accesos is not None and qr_db.accesos_usados >= qr_db.max_accesos:
                    return ResultadoValidacion(
                        permitido=False, 
                        mensaje=f"LÍMITE DE ACCESOS ALCANZADO ({qr_db.max_accesos}/{qr_db.max_accesos})", 
                        tipo_alerta="error"
                    )
                
                # Buscar nombre del evento
                from app.models.alcabala_evento import LotePaseMasivo
                query_lote = select(LotePaseMasivo).where(LotePaseMasivo.id == qr_db.lote_id)
                res_lote = await db.execute(query_lote)
                lote = res_lote.scalar_one_or_none()
                
                # Si es un pase identificado o portal, el socio debe existir
                if qr_db.tipo in [QRTipo.evento_identificado, QRTipo.evento_portal] and not socio:
                    return ResultadoValidacion(permitido=False, mensaje="Socio de evento no encontrado", tipo_alerta="error")

                return ResultadoValidacion(
                    permitido=True,
                    mensaje="Pase Masivo Válido",
                    tipo_alerta="warning" if qr_db.tipo == QRTipo.evento_simple else "info",
                    es_pase_masivo=True,
                    serial_legible=qr_db.serial_legible,
                    nombre_evento=lote.nombre_evento if lote else "Evento BAGFM",
                    accesos_restantes=qr_db.max_accesos - qr_db.accesos_usados if qr_db.max_accesos else None,
                    qr_id=qr_db.id,
                    usuario_id=socio.id if socio else None,
                    socio=socio
                )

            # 5. Validación Estándar para Socios Permanentes
            if not socio:
                return ResultadoValidacion(permitido=False, mensaje="Socio no encontrado o inactivo", tipo_alerta="error")

            # 5.a Verificar Membresía
            query_mem = select(Membresia).where(
                Membresia.socio_id == socio.id
            ).order_by(Membresia.updated_at.desc())
            res_mem = await db.execute(query_mem)
            membresia = res_mem.scalars().first()

            if not membresia or membresia.estado not in [MembresiaEstado.activa, MembresiaEstado.exonerada]:
                msg = "Socio sin registro de membresía vigente"
                if membresia:
                    if membresia.estado == MembresiaEstado.suspendida:
                        msg = "MEMBRESÍA SUSPENDIDA ADMIN."
                    elif membresia.estado == MembresiaEstado.vencida:
                        msg = "MEMBRESÍA VENCIDA (PAGO PENDIENTE)"
                return ResultadoValidacion(permitido=False, mensaje=msg, tipo_alerta="error")

            # 5.b Vehículo
            vehiculo = None
            if vehiculo_id_str:
                query_veh = select(Vehiculo).where(Vehiculo.id == UUID(vehiculo_id_str), Vehiculo.activo == True)
                res_veh = await db.execute(query_veh)
                vehiculo = res_veh.scalar_one_or_none()
            
            if not vehiculo:
                query_veh_socio = select(Vehiculo).where(Vehiculo.socio_id == socio.id, Vehiculo.activo == True).limit(1)
                res_veh_socio = await db.execute(query_veh_socio)
                vehiculo = res_veh_socio.scalar_one_or_none()

            # 5.c Infracciones
            query_inf = select(Infraccion).where(
                Infraccion.usuario_id == socio.id, 
                Infraccion.estado == InfraccionEstado.activa
            )
            res_inf = await db.execute(query_inf)
            infracciones = res_inf.scalars().all()
            
            bloqueado = False
            msg_bloqueo = ""
            if datos.tipo == AccesoTipo.salida:
                for inf in infracciones:
                    if inf.bloquea_salida:
                        bloqueado = True
                        msg_bloqueo = f"SALIDA BLOQUEADA: {inf.descripcion}"
                        break

            # 5.d Entidad
            query_ent = select(EntidadCivil).where(EntidadCivil.id == socio.entidad_id)
            res_ent = await db.execute(query_ent)
            entidad = res_ent.scalar_one_or_none()

            if entidad and not entidad.activo:
                return ResultadoValidacion(
                    permitido=False, 
                    mensaje=f"CESE DE SERVICIOS: CONCESIÓN {entidad.nombre} SUSPENDIDA", 
                    tipo_alerta="error"
                )

            # 5.e Última Entrada
            query_last = select(Acceso).where(
                Acceso.usuario_id == socio.id,
                Acceso.tipo == AccesoTipo.entrada
            ).order_by(Acceso.timestamp.desc()).limit(1)
            res_last = await db.execute(query_last)
            ultima_entrada = res_last.scalar_one_or_none()

            return ResultadoValidacion(
                permitido = not bloqueado,
                mensaje = msg_bloqueo if bloqueado else "Validación Exitosa",
                tipo_alerta = "error" if bloqueado else ("warning" if infracciones else "info"),
                socio = socio,
                vehiculo = vehiculo,
                entidad_nombre = entidad.nombre if entidad else "N/A",
                qr_id = qr_db.id,
                usuario_id = socio.id,
                vehiculo_id = vehiculo.id if vehiculo else None,
                infracciones_activas = [{"tipo": i.tipo, "descripcion": i.descripcion, "bloquea": i.bloquea_salida} for i in infracciones],
                membresia_info = {
                    "id": membresia.id,
                    "estado": membresia.estado,
                    "fecha_inicio": membresia.fecha_inicio,
                    "fecha_fin": membresia.fecha_fin,
                    "progreso": membresia_service.calcular_progreso(membresia)
                } if membresia else None,
                ultima_entrada = ultima_entrada.timestamp if ultima_entrada else None
            )

        except Exception as e:
            print(f"DEBUG: Error inesperado en validación: {str(e)}")
            return ResultadoValidacion(permitido=False, mensaje=f"Error en validación: {str(e)}", tipo_alerta="error")

    async def registrar_acceso(self, db: AsyncSession, datos: AccesoRegistrar, registrado_por_id: UUID) -> Acceso:
        """
        Persiste el registro de acceso y actualiza contadores de pases masivos si aplica.
        """
        nuevo_acceso = Acceso(
            qr_id = datos.qr_id,
            usuario_id = datos.usuario_id,
            vehiculo_id = datos.vehiculo_id,
            tipo = datos.tipo,
            punto_acceso = datos.punto_acceso,
            registrado_por = registrado_por_id,
            es_manual = datos.es_manual
        )
        db.add(nuevo_acceso)

        # Si es un QR vinculado a un lote, incrementar accesos_usados
        if datos.qr_id:
            qr_db = await db.get(CodigoQR, datos.qr_id)
            if qr_db and qr_db.lote_id:
                qr_db.accesos_usados += 1
        
        await db.commit()
        await db.refresh(nuevo_acceso)
        return nuevo_acceso

acceso_service = AccesoService()
