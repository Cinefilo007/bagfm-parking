from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import List, Optional

from app.models.usuario import Usuario
from app.models.entidad_civil import EntidadCivil
from app.models.membresia import Membresia
from app.models.vehiculo import Vehiculo
from app.models.enums import RolTipo, MembresiaEstado
from app.schemas.socio import SocioCrear, MembresiaBase
from app.core.security import hashear_password
from app.core.excepciones import EntidadNoEncontrada

class SocioService:
    async def crear_socio_con_membresia(self, db: AsyncSession, datos: SocioCrear, creador_id: UUID) -> Usuario:
        # 1. Verificar que la entidad existe
        query_entidad = select(EntidadCivil).where(EntidadCivil.id == datos.entidad_id)
        res_entidad = await db.execute(query_entidad)
        entidad = res_entidad.scalar_one_or_none()
        
        if not entidad:
            raise EntidadNoEncontrada(f"La entidad con ID {datos.entidad_id} no existe")

        # 2. Crear el Usuario (Socio)
        nuevo_socio = Usuario(
            cedula=datos.cedula,
            nombre=datos.nombre,
            apellido=datos.apellido,
            email=datos.email,
            telefono=datos.telefono,
            rol=RolTipo.SOCIO,
            entidad_id=datos.entidad_id,
            password_hash=hashear_password(datos.password)
        )
        db.add(nuevo_socio)
        await db.flush() # Para obtener el ID del nuevo_socio

        # 3. Crear la Membresia
        nueva_membresia = Membresia(
            socio_id=nuevo_socio.id,
            entidad_id=datos.entidad_id,
            estado=MembresiaEstado.activa,
            fecha_inicio=MembresiaBase.model_fields['fecha_inicio'].default,
            created_by=creador_id
        )
        db.add(nueva_membresia)

        # 4. Crear Vehículos (Opcional)
        if datos.vehiculos:
            for v_data in datos.vehiculos:
                nuevo_v = Vehiculo(
                    placa=v_data.placa.upper(),
                    marca=v_data.marca.upper(),
                    modelo=v_data.modelo.upper(),
                    color=v_data.color.upper(),
                    año=v_data.año,
                    tipo=v_data.tipo,
                    socio_id=nuevo_socio.id
                )
                db.add(nuevo_v)
        
        await db.commit()
        await db.refresh(nuevo_socio)
        return nuevo_socio

    async def obtener_socios_entidad(self, db: AsyncSession, entidad_id: UUID) -> List[Usuario]:
        query = select(Usuario).where(
            Usuario.entidad_id == entidad_id,
            Usuario.rol == RolTipo.SOCIO
        )
        resultado = await db.execute(query)
        return resultado.scalars().all()

socio_service = SocioService()
