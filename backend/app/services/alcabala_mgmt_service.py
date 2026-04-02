"""
Servicio de Gestión de Alcabalas y Guardias Temporales (Asíncrono).
Maneja la creación de puntos de control y usuarios con expiración automática.
"""
from datetime import datetime, timedelta, time
from uuid import UUID
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.alcabala_evento import PuntoAcceso
from app.models.usuario import Usuario
from app.models.enums import RolTipo
from app.core.security import hashear_password

class AlcabalaMgmtService:
    @staticmethod
    async def crear_punto_acceso(db: AsyncSession, nombre: str, ubicacion: str = None):
        punto = PuntoAcceso(nombre=nombre, ubicacion=ubicacion)
        db.add(punto)
        await db.commit()
        await db.refresh(punto)
        return punto

    @staticmethod
    async def listar_puntos(db: AsyncSession):
        query = select(PuntoAcceso).where(PuntoAcceso.activo == True)
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def crear_guardia_temporal(db: AsyncSession, cedula: str, nombre: str, apellido: str):
        """
        Crea un usuario temporal para una guardia de alcabala.
        La guardia dura 24h y termina a las 08:30 AM (VET).
        """
        # Calcular expiración: Siguiente 08:30 AM
        now = datetime.now()
        
        limite_hora = time(8, 30)
        expira = datetime.combine(now.date(), limite_hora)
        
        if now.time() >= limite_hora:
            expira += timedelta(days=1)
            
        # Password temporal por defecto
        password_temp = f"Alcabala.{cedula[-4:]}"
        
        nuevo_usuario = Usuario(
            cedula=cedula,
            nombre=nombre,
            apellido=apellido,
            rol=RolTipo.ALCABALA,
            password_hash=hashear_password(password_temp),
            expira_at=expira,
            activo=True
        )
        
        db.add(nuevo_usuario)
        await db.commit()
        await db.refresh(nuevo_usuario)
        
        return {
            "usuario": nuevo_usuario,
            "password_temporal": password_temp,
            "expira_at": expira
        }

    @staticmethod
    async def limpiar_guardias_expirados(db: AsyncSession):
        """Desactiva usuarios cuya guardia ha terminado."""
        now = datetime.now()
        query = select(Usuario).where(
            Usuario.rol == RolTipo.ALCABALA,
            Usuario.expira_at <= now,
            Usuario.activo == True
        )
        result = await db.execute(query)
        expirados = result.scalars().all()
        
        for u in expirados:
            u.activo = False
            
        await db.commit()
        return len(expirados)

alcabala_mgmt_service = AlcabalaMgmtService()
