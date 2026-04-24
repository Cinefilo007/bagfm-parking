from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import joinedload

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
        db_zona = ZonaEstacionamiento(
            **zona_in,
            created_by=user_id
        )
        db.add(db_zona)
        await db.commit()
        await db.refresh(db_zona)
        return db_zona

    async def actualizar_zona(
        self, db: AsyncSession, zona_id: UUID, zona_in: dict
    ) -> Optional[ZonaEstacionamiento]:
        db_zona = await self.get_zona(db, zona_id)
        if not db_zona:
            return None
        
        update_data = {k: v for k, v in zona_in.items() if v is not None}
        
        for key, value in update_data.items():
            setattr(db_zona, key, value)
            
        await db.commit()
        await db.refresh(db_zona)
        return db_zona

    async def get_zona(self, db: AsyncSession, zona_id: UUID) -> Optional[ZonaEstacionamiento]:
        resultado = await db.execute(select(ZonaEstacionamiento).filter(ZonaEstacionamiento.id == zona_id))
        return resultado.scalars().first()

    async def obtener_zonas(
        self, db: AsyncSession, skip: int = 0, limit: int = 100, activa: Optional[bool] = None
    ) -> List[dict]:
        from app.models.vehiculo_pase import VehiculoPase
        
        query = select(ZonaEstacionamiento)
        if activa is not None:
            query = query.filter(ZonaEstacionamiento.activo == activa)
        query = query.offset(skip).limit(limit)
        
        resultado = await db.execute(query)
        zonas = resultado.scalars().all()
        
        resultado_final = []
        for zona in zonas:
            # Contar ocupación por categoría
            res_base = await db.execute(
                select(func.count(VehiculoPase.id))
                .where(VehiculoPase.zona_asignada_id == zona.id, VehiculoPase.ingresado == True, VehiculoPase.tipo_acceso == 'base')
            )
            ocu_base = res_base.scalar() or 0
            
            res_total = await db.execute(
                select(func.count(VehiculoPase.id))
                .where(VehiculoPase.zona_asignada_id == zona.id, VehiculoPase.ingresado == True)
            )
            ocu_total = res_total.scalar() or 0
            
            # Sincronizar ocupacion_actual por si acaso
            if zona.ocupacion_actual != ocu_total:
                zona.ocupacion_actual = ocu_total
                await db.commit()

            z_dict = {
                "id": str(zona.id),
                "nombre": zona.nombre,
                "capacidad_total": zona.capacidad_total,
                "ocupacion_actual": ocu_total,
                "ocupacion_base": ocu_base,
                "usa_puestos_identificados": zona.usa_puestos_identificados,
                "tipo": zona.tipo,
                "descripcion_ubicacion": zona.descripcion_ubicacion,
                "latitud": float(zona.latitud) if zona.latitud else None,
                "longitud": float(zona.longitud) if zona.longitud else None,
                "tiempo_limite_llegada_min": zona.tiempo_limite_llegada_min,
                "activo": zona.activo,
                "created_at": zona.created_at
            }
            resultado_final.append(z_dict)
            
        return resultado_final

    async def obtener_puestos_zona(self, db: AsyncSession, zona_id: UUID) -> List[PuestoEstacionamiento]:
        resultado = await db.execute(
            select(PuestoEstacionamiento)
            .options(joinedload(PuestoEstacionamiento.zona), joinedload(PuestoEstacionamiento.tipo_acceso))
            .filter(PuestoEstacionamiento.zona_id == zona_id)
            .order_by(PuestoEstacionamiento.numero_puesto)
        )
        return resultado.scalars().all()

    async def generar_puestos_fisicos(
        self, db: AsyncSession, zona_id: UUID, prefijo: str, cantidad: int, user_id: UUID
    ) -> List[PuestoEstacionamiento]:
        """Crea puestos identificados en lote para una zona con validación de capacidad."""
        zona = await self.get_zona(db, zona_id)
        if not zona:
            raise ValueError("Zona no encontrada")
        
        # Contar puestos actuales
        query_count = select(func.count(PuestoEstacionamiento.id)).filter(PuestoEstacionamiento.zona_id == zona_id)
        resultado_count = await db.execute(query_count)
        puestos_actuales = resultado_count.scalar() or 0
        
        if (puestos_actuales + cantidad) > zona.capacidad_total:
            raise ValueError(f"Capacidad excedida. Capacidad total: {zona.capacidad_total}, Puestos actuales: {puestos_actuales}, Solicitado: {cantidad}")

        puestos = []
        for i in range(1, cantidad + 1):
            # El número de puesto será correlativo al total
            num_secuencial = puestos_actuales + i
            puesto = PuestoEstacionamiento(
                zona_id=zona_id,
                numero_puesto=f"{prefijo}-{num_secuencial:03d}",
                estado=EstadoPuesto.libre,
                registrado_por=user_id
            )
            puestos.append(puesto)
        
        db.add_all(puestos)
        await db.commit()
        for p in puestos:
            await db.refresh(p)
        return puestos

    async def generar_puestos_entidad(
        self, db: AsyncSession, zona_id: UUID, entidad_id: UUID, prefijo: str, cantidad: int, user_id: UUID
    ) -> List[PuestoEstacionamiento]:
        """Crea puestos identificados para una entidad o reclama puestos libres de la zona."""
        zona = await self.get_zona(db, zona_id)
        if not zona:
            raise ValueError("Zona no encontrada")

        # 1. Verificar asignacion
        query_asig = select(AsignacionZona).filter(
            and_(AsignacionZona.zona_id == zona_id, AsignacionZona.entidad_id == entidad_id, AsignacionZona.activa == True)
        )
        asig = (await db.execute(query_asig)).scalars().first()
        if not asig:
            raise ValueError("No tienes asignación activa en esta zona")

        # 2. Contar puestos actuales de esta entidad en esta zona
        query_count = select(func.count(PuestoEstacionamiento.id)).filter(
            and_(PuestoEstacionamiento.zona_id == zona_id, PuestoEstacionamiento.reservado_entidad_id == entidad_id)
        )
        puestos_propios = (await db.execute(query_count)).scalar() or 0

        if (puestos_propios + cantidad) > asig.cupo_asignado:
            raise ValueError(f"Capacidad excedida. Tienes un cupo de {asig.cupo_asignado}. Puestos actuales: {puestos_propios}. Intentas generar: {cantidad}")

        # 3. Buscar puestos libres en la zona que la entidad pueda reclamar
        query_libres = select(PuestoEstacionamiento).filter(
            and_(PuestoEstacionamiento.zona_id == zona_id, PuestoEstacionamiento.estado == EstadoPuesto.libre)
        ).limit(cantidad)
        puestos_libres = (await db.execute(query_libres)).scalars().all()
        
        puestos_a_devolver = []
        cantidad_restante = cantidad
        
        # Primero adjudicar los que están libres generados por el comandante
        for p in puestos_libres:
            p.estado = EstadoPuesto.reservado
            p.reservado_entidad_id = entidad_id
            p.numero_puesto = f"{prefijo}-{(puestos_propios + len(puestos_a_devolver) + 1):03d}"
            puestos_a_devolver.append(p)
            cantidad_restante -= 1

        # Si aún faltan, crear los nuevos
        if cantidad_restante > 0:
            query_totales = select(func.count(PuestoEstacionamiento.id)).filter(PuestoEstacionamiento.zona_id == zona_id)
            puestos_totales = (await db.execute(query_totales)).scalar() or 0
            
            if (puestos_totales + cantidad_restante) > zona.capacidad_total:
                raise ValueError(f"Discordancia física: Tienes cupo, pero la base excedió la capacidad máxima ({zona.capacidad_total}).")

            for _ in range(cantidad_restante):
                num_secuencial = puestos_propios + len(puestos_a_devolver) + 1
                puesto = PuestoEstacionamiento(
                    zona_id=zona_id,
                    numero_puesto=f"{prefijo}-{num_secuencial:03d}",
                    estado=EstadoPuesto.reservado,
                    reservado_entidad_id=entidad_id,
                    registrado_por=user_id
                )
                db.add(puesto)
                puestos_a_devolver.append(puesto)
        
        await db.commit()
        for p in puestos_a_devolver:
            await db.refresh(p)
        return puestos_a_devolver

    async def get_puesto(self, db: AsyncSession, puesto_id: UUID) -> Optional[PuestoEstacionamiento]:
        resultado = await db.execute(select(PuestoEstacionamiento).filter(PuestoEstacionamiento.id == puesto_id))
        return resultado.scalars().first()

    async def actualizar_puesto_fisico(
        self, db: AsyncSession, puesto_id: UUID, datos_in: dict
    ) -> Optional[PuestoEstacionamiento]:
        """Actualiza datos de un puesto (como coordenadas GPS)."""
        puesto = await self.get_puesto(db, puesto_id)
        if not puesto:
            return None
        
        for key, value in datos_in.items():
            setattr(puesto, key, value)
            
        await db.commit()
        await db.refresh(puesto)
        return puesto

    async def reservar_puestos_base(
        self, db: AsyncSession, zona_id: UUID, cantidad: int, entidad_id: Optional[UUID] = None, user_id: Optional[UUID] = None
    ) -> List[PuestoEstacionamiento]:
        """Reserva puestos aleatorios libres en una zona."""
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
            puesto.reservado_por = user_id
            puesto.reservado_entidad_id = entidad_id

        await db.commit()
        for p in puestos_libres:
            await db.refresh(p)
        return puestos_libres

    async def asignar_zona_a_entidad(
        self, db: AsyncSession, asignacion_in: dict, user_id: UUID
    ) -> AsignacionZona:
        """Asigna a una entidad civil una porción de la capacidad de la zona."""
        db_asignacion = AsignacionZona(**asignacion_in, asignado_por=user_id)
        db.add(db_asignacion)
        await db.commit()
        await db.refresh(db_asignacion)
        return db_asignacion

    async def verificar_capacidad_disponible(self, db: AsyncSession, zona_id: UUID) -> bool:
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
        resultado = await db.execute(select(AsignacionZona))
        return resultado.scalars().all()

    async def get_asignacion(self, db: AsyncSession, asignacion_id: UUID) -> Optional[AsignacionZona]:
        from sqlalchemy.orm import joinedload
        resultado = await db.execute(
            select(AsignacionZona)
            .options(joinedload(AsignacionZona.zona))
            .filter(AsignacionZona.id == asignacion_id)
        )
        return resultado.scalars().first()

    async def actualizar_asignacion_zona(
        self, db: AsyncSession, asignacion_id: UUID, datos_in: dict
    ) -> Optional[AsignacionZona]:
        db_asig = await self.get_asignacion(db, asignacion_id)
        if not db_asig:
            return None
        
        for key, value in datos_in.items():
            setattr(db_asig, key, value)
            
        await db.commit()
        await db.refresh(db_asig)
        return db_asig

    async def eliminar_asignacion_zona(self, db: AsyncSession, asignacion_id: UUID) -> bool:
        db_asig = await self.get_asignacion(db, asignacion_id)
        if not db_asig:
            return False
        
        await db.delete(db_asig)
        await db.commit()
        return True

zona_service = ZonaEstacionamientoService()
