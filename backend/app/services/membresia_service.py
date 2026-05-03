from datetime import date, datetime
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from uuid import UUID
from dateutil.relativedelta import relativedelta

from app.models.membresia import Membresia
from app.models.enums import MembresiaEstado, QRTipo
from app.models.codigo_qr import CodigoQR
from app.core.security import crear_token_qr
from app.core.excepciones import EntidadNoEncontrada

class MembresiaService:
    async def crear_membresia_inicial(
        self, db: AsyncSession, socio_id: UUID, entidad_id: UUID, 
        meses: int = 1, creador_id: Optional[UUID] = None,
        fecha_fin_override: Optional[date] = None
    ) -> Membresia:
        """Crea la membresía inicial de un socio. Si fecha_fin_override se provee, se usa directamente."""
        fecha_inicio = date.today()
        fecha_fin = fecha_fin_override if fecha_fin_override else fecha_inicio + relativedelta(months=meses)
        
        nueva = Membresia(
            socio_id=socio_id,
            entidad_id=entidad_id,
            estado=MembresiaEstado.activa,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            created_by=creador_id
        )
        db.add(nueva)
        await db.flush()
        
        # Generar QR inicial
        await self.refrescar_qr_socio(db, socio_id, nueva.id, creador_id)
        
        return nueva

    async def renovar_membresia(
        self, db: AsyncSession, socio_id: UUID, meses: int = 1, creador_id: Optional[UUID] = None
    ) -> Membresia:
        """Renueva la membresía sumando N meses exactos (mismo día del mes)."""
        query = select(Membresia).where(Membresia.socio_id == socio_id).order_by(Membresia.created_at.desc())
        res = await db.execute(query)
        membresia = res.scalars().first()
        
        if not membresia:
            raise EntidadNoEncontrada("Membresía no encontrada")

        # Si ya venció, empezamos desde hoy. Si no, sumamos al vencimiento actual.
        base_date = max(membresia.fecha_fin or date.today(), date.today())
        membresia.fecha_fin = base_date + relativedelta(months=meses)
        membresia.estado = MembresiaEstado.activa
        
        # Refrescar QR por seguridad al renovar
        await self.refrescar_qr_socio(db, socio_id, membresia.id, creador_id)
        
        await db.commit()
        return membresia

    async def cambiar_estado(self, db: AsyncSession, socio_id: UUID, nuevo_estado: MembresiaEstado) -> Membresia:
        """Cambia el estado de la membresía (suspender, exonerar, activar)."""
        query = select(Membresia).where(Membresia.socio_id == socio_id).order_by(Membresia.created_at.desc())
        res = await db.execute(query)
        membresia = res.scalars().first()
        
        if not membresia:
            raise EntidadNoEncontrada("Membresía no encontrada")
            
        membresia.estado = nuevo_estado
        await db.commit()
        return membresia

    async def refrescar_qr_socio(
        self, db: AsyncSession, socio_id: UUID, membresia_id: UUID, creador_id: Optional[UUID] = None
    ) -> CodigoQR:
        """Invalida QRs anteriores y crea uno nuevo con token refrescado."""
        # Inactivar QRs anteriores
        await db.execute(
            update(CodigoQR)
            .where(CodigoQR.usuario_id == socio_id, CodigoQR.activo == True)
            .values(activo=False)
        )
        
        # Crear nuevo token
        token = crear_token_qr(str(socio_id))
        
        nuevo_qr = CodigoQR(
            usuario_id=socio_id,
            membresia_id=membresia_id,
            tipo=QRTipo.permanente,
            token=token,
            activo=True,
            created_by=creador_id
        )
        db.add(nuevo_qr)
        await db.flush()
        return nuevo_qr

    def calcular_progreso(self, membresia: Membresia) -> dict:
        """Calcula días restantes y porcentaje de tiempo transcurrido."""
        if membresia.estado == MembresiaEstado.exonerada:
            return {"dias_restantes": 999, "porcentaje": 0, "label": "Exonerado"}
            
        if not membresia.fecha_fin:
            return {"dias_restantes": 999, "porcentaje": 0, "label": "Indefinida"}
            
        hoy = date.today()
        total_days = (membresia.fecha_fin - membresia.fecha_inicio).days
        remaining_days = (membresia.fecha_fin - hoy).days
        
        if total_days <= 0:
            porcentaje = 100
        else:
            transcurrido = total_days - remaining_days
            porcentaje = min(100, max(0, int((transcurrido / total_days) * 100)))
            
        return {
            "dias_restantes": max(0, remaining_days),
            "porcentaje": porcentaje,
            "vencida": remaining_days < 0
        }

membresia_service = MembresiaService()
