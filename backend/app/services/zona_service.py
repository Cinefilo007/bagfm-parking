from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from app.models.zona_estacionamiento import ZonaEstacionamiento
from app.models.puesto_estacionamiento import PuestoEstacionamiento
from app.models.asignacion_zona import AsignacionZona
from app.models.enums import EstadoPuesto

from app.schemas.zona_estacionamiento import ZonaEstacionamientoCrear
from app.schemas.puesto_estacionamiento import PuestoEstacionamientoCrear
from app.schemas.asignacion_zona import AsignacionZonaCrear

class ZonaEstacionamientoService:
    
    async def crear_zona_estacionamiento(
        self, db: AsyncSession, zona_in: dict, user_id: UUID
    ) -> ZonaEstacionamiento:
        # Aquí zona_in es un dict porque lo pasamos desde el endpoint API
        db_zona = ZonaEstacionamiento(
            **zona_in,
            created_by=user_id
        )
        db.add(db_zona)
        await db.commit()
        await db.refresh(db_zona)
        return db_zona

    async def get_zona(self, db: AsyncSession, zona_id: UUID) -> Optional[ZonaEstacionamiento]:
        resultado = await db.execute(select(ZonaEstacionamiento).filter(ZonaEstacionamiento.id == zona_id))
        return resultado.scalars().first()

    async def obtener_zonas(
        self, db: AsyncSession, skip: int = 0, limit: int = 100, activa: Optional[bool] = None
    ) -> List[ZonaEstacionamiento]:
        query = select(ZonaEstacionamiento)
        if activa is not None:
            query = query.filter(ZonaEstacionamiento.activo == activa)
        query = query.offset(skip).limit(limit)
        resultado = await db.execute(query)
        return resultado.scalars().all()

    async def obtener_puestos_zona(self, db: AsyncSession, zona_id: UUID) -> List[PuestoEstacionamiento]:
        resultado = await db.execute(select(PuestoEstacionamiento).filter(PuestoEstacionamiento.zona_id == zona_id))
        return resultado.scalars().all()

    async def generar_puestos_fisicos(
        self, db: AsyncSession, zona_id: UUID, prefijo: str, cantidad: int, user_id: UUID
    ) -> List[PuestoEstacionamiento]:
        """
        Crea puestos identificados en lote para una zona.
        """
        puestos = []
        for i in range(1, cantidad + 1):
            puesto = PuestoEstacionamiento(
                zona_id=zona_id,
                numero_puesto=f"{prefijo}-{i:03d}",
                estado=EstadoPuesto.libre,
                registrado_por=user_id
            )
            puestos.append(puesto)
        db.add_all(puestos)
        await db.commit()
        for p in puestos:
            await db.refresh(p)
        return puestos

    async def reservar_puestos_base(
        self, db: AsyncSession, zona_id: UUID, cantidad: int, entidad_id: Optional[UUID] = None
    ) -> List[PuestoEstacionamiento]:
        """
        Reserva puestos aleatorios libres en una zona para la base o para una entidad en específico.
        """
        query = select(PuestoEstacionamiento).filter(
            and_(
                PuestoEstacionamiento.zona_id == zona_id,
                PuestoEstacionamiento.estado == EstadoPuesto.libre
            )
        ).limit(cantidad)
        
        resultado = await db.execute(query)
        puestos_libres = resultado.scalars().all()

        if len(puestos_libres) < cantidad:
            raise ValueError(f"No hay suficientes puestos libres (faltan {cantidad - len(puestos_libres)})")

        for puesto in puestos_libres:
            puesto.estado = EstadoPuesto.reservado if entidad_id else EstadoPuesto.reservado_base
            puesto.reservado_por = None # TODO: O quien llama
            puesto.reservado_para_entidad_id = entidad_id

        await db.commit()
        for p in puestos_libres:
            await db.refresh(p)
        return puestos_libres

    async def asignar_zona_a_entidad(
        self, db: AsyncSession, asignacion_in: dict, user_id: UUID
    ) -> AsignacionZona:
        """
        Asigna a una entidad civil una porción de la capacidad de la zona.
        """
        db_asignacion = AsignacionZona(**asignacion_in, asignado_por=user_id)
        db.add(db_asignacion)
        await db.commit()
        await db.refresh(db_asignacion)
        return db_asignacion

    async def verificar_capacidad_disponible(self, db: AsyncSession, zona_id: UUID) -> bool:
        """
        Verifica si hay capacidad total disponible o puestos libres en la zona.
        """
        zona = await self.get_zona(db, zona_id)
        if not zona:
            return False
            
        if zona.usa_puestos_identificados:
            query = select(func.count(PuestoEstacionamiento.id)).filter(
                and_(
                    PuestoEstacionamiento.zona_id == zona_id,
                    PuestoEstacionamiento.estado == EstadoPuesto.libre
                )
            )
            resultado = await db.execute(query)
            puestos_libres = resultado.scalar()
            return puestos_libres > 0
        else:
            return zona.ocupacion_actual < zona.capacidad_total

    async def obtener_asignaciones_globales(self, db: AsyncSession) -> List[AsignacionZona]:
        """
        Retorna todas las asignaciones de cupos vigentes en el sistema.
        """
        resultado = await db.execute(select(AsignacionZona))
        return resultado.scalars().all()

zona_service = ZonaEstacionamientoService()
