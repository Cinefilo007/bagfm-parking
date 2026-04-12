"""
Servicio de Gestión de Eventos y Pases Masivos (Asíncrono).
Implementa la directiva FL-08: Solicitud, Aprobación Parcial y Generación Masiva.
"""
from datetime import datetime, timedelta, timezone
from uuid import UUID
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.alcabala_evento import SolicitudEvento
from app.models.codigo_qr import CodigoQR
from app.models.enums import SolicitudEstado, QRTipo
from app.schemas.alcabala_evento import SolicitudEventoCrear, SolicitudEventoProcesar
from app.core.security import crear_token_evento
from app.core.config import obtener_config

config = obtener_config()

class EventoService:
    async def crear_solicitud(self, db: AsyncSession, datos: SolicitudEventoCrear, usuario_id: UUID) -> SolicitudEvento:
        """Crea una nueva solicitud de pases masivos para un evento."""
        nueva_solicitud = SolicitudEvento(
            entidad_id=datos.entidad_id,
            solicitado_por=usuario_id,
            nombre_evento=datos.nombre_evento,
            fecha_evento=datos.fecha_evento,
            cantidad_solicitada=datos.cantidad_solicitada,
            motivo=datos.motivo,
            estado=SolicitudEstado.pendiente
        )
        db.add(nueva_solicitud)
        await db.commit()
        await db.refresh(nueva_solicitud)
        return nueva_solicitud

    async def listar_solicitudes(self, db: AsyncSession, entidad_id: UUID = None):
        """Lista solicitudes, opcionalmente filtradas por entidad."""
        query = select(SolicitudEvento)
        if entidad_id:
            query = query.where(SolicitudEvento.entidad_id == entidad_id)
        
        query = query.order_by(SolicitudEvento.created_at.desc())
        result = await db.execute(query)
        return result.scalars().all()

    async def obtener_solicitud(self, db: AsyncSession, solicitud_id: UUID) -> SolicitudEvento:
        query = select(SolicitudEvento).where(SolicitudEvento.id == solicitud_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def procesar_solicitud(
        self, 
        db: AsyncSession, 
        solicitud_id: UUID, 
        datos: SolicitudEventoProcesar, 
        revisado_por_id: UUID
    ) -> SolicitudEvento:
        """
        El Comandante aprueba (total/parcial) o deniega la solicitud.
        Si es aprobada, genera automáticamente los QRs masivos.
        """
        solicitud = await self.obtener_solicitud(db, solicitud_id)
        if not solicitud:
            return None
            
        solicitud.estado = datos.estado
        solicitud.cantidad_aprobada = datos.cantidad_aprobada if datos.estado != SolicitudEstado.denegada else 0
        solicitud.motivo_rechazo = datos.motivo_rechazo
        solicitud.revisado_por = revisado_por_id
        solicitud.revisado_at = datetime.now(timezone.utc)
        
        # Si fue aprobada (total o parcial), generar QRs
        if datos.estado in [SolicitudEstado.aprobada, SolicitudEstado.aprobada_parcial]:
            await self._generar_qrs_masivos(db, solicitud, revisado_por_id)
            
        await db.commit()
        await db.refresh(solicitud)
        return solicitud

    async def _generar_qrs_masivos(self, db: AsyncSession, solicitud: SolicitudEvento, creado_by_id: UUID):
        """Genera N tokens QR genéricos para la solicitud."""
        # Expiración: fecha del evento + config de horas
        expiracion_horas = int(getattr(config, 'qr_expiracion_temporal_horas', 24))
        # Asumimos que expira al final del día del evento + margen
        expira_at = datetime.combine(solicitud.fecha_evento, datetime.max.time()) + timedelta(hours=expiracion_horas)
        
        qrs = []
        for _ in range(solicitud.cantidad_aprobada):
            token = crear_token_evento(str(solicitud.id), expira_at)
            nuevo_qr = CodigoQR(
                usuario_id=creado_by_id, # El QR pertenece al sistema/revisor en este caso genérico
                solicitud_id=solicitud.id,
                tipo=QRTipo.temporal,
                token=token,
                fecha_expiracion=expira_at,
                activo=True,
                created_by=creado_by_id
            )
            qrs.append(nuevo_qr)
        
        db.add_all(qrs)
        # El commit se hace en procesar_solicitud

    async def obtener_qrs_solicitud(self, db: AsyncSession, solicitud_id: UUID):
        """Retorna todos los QRs generados para una solicitud aprobada."""
        query = select(CodigoQR).where(CodigoQR.solicitud_id == solicitud_id, CodigoQR.activo == True)
        result = await db.execute(query)
        return result.scalars().all()

    async def get_stats(self, db: AsyncSession, entidad_id: UUID = None):
        """Calcula estadísticas generales de solicitudes de eventos."""
        from sqlalchemy import func
        
        # Filtro base
        filtros = []
        if entidad_id:
            filtros.append(SolicitudEvento.entidad_id == entidad_id)
            
        async def count_by_status(status_list: list = None):
            query = select(func.count(SolicitudEvento.id))
            if filtros:
                query = query.where(*filtros)
            if status_list:
                query = query.where(SolicitudEvento.estado.in_(status_list))
            result = await db.execute(query)
            return result.scalar() or 0

        total = await count_by_status()
        pendientes = await count_by_status([SolicitudEstado.pendiente])
        aprobadas = await count_by_status([SolicitudEstado.aprobada, SolicitudEstado.aprobada_parcial])
        denegadas = await count_by_status([SolicitudEstado.denegada])

        # Suma de pases otorgados
        query_pases = select(func.sum(SolicitudEvento.cantidad_aprobada))
        if filtros:
            query_pases = query_pases.where(*filtros)
        result_pases = await db.execute(query_pases)
        pases_otorgados = result_pases.scalar() or 0

        return {
            "total": total,
            "pendientes": pendientes,
            "aprobadas": aprobadas,
            "denegadas": denegadas,
            "pases_otorgados": pases_otorgados
        }

evento_service = EventoService()
