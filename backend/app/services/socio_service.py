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
from app.core.excepciones import EntidadNoEncontrada, EntidadDuplicada
from app.services.membresia_service import membresia_service

class SocioService:
    async def crear_socio_con_membresia(self, db: AsyncSession, datos: SocioCrear, creador_id: UUID) -> Usuario:
        # 1. Verificar que la entidad existe
        query_entidad = select(EntidadCivil).where(EntidadCivil.id == datos.entidad_id)
        res_entidad = await db.execute(query_entidad)
        entidad = res_entidad.scalar_one_or_none()
        
        if not entidad:
            raise EntidadNoEncontrada(f"La entidad con ID {datos.entidad_id} no existe")

        # 2. Verificar si el usuario ya existe por cédula
        query_usuario = select(Usuario).where(Usuario.cedula == datos.cedula)
        res_usuario = await db.execute(query_usuario)
        if res_usuario.scalar_one_or_none():
            raise EntidadDuplicada(f"Ya existe un usuario registrado con la cédula {datos.cedula}")

        # 3. Crear el Usuario (Socio)
        nuevo_socio = Usuario(
            cedula=datos.cedula,
            nombre=datos.nombre,
            apellido=datos.apellido,
            email=datos.email,
            telefono=datos.telefono,
            rol=RolTipo.SOCIO,
            entidad_id=datos.entidad_id,
            password_hash=hashear_password(datos.password if datos.password else datos.cedula),
            debe_cambiar_password=True
        )
        db.add(nuevo_socio)
        await db.flush() # Para obtener el ID del nuevo_socio

        # 4. Crear la Membresia Inicial (1 mes por defecto)
        nueva_membresia = await membresia_service.crear_membresia_inicial(
            db, nuevo_socio.id, datos.entidad_id, meses=1, creador_id=creador_id
        )

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

    async def obtener_socios_entidad(self, db: AsyncSession, entidad_id: UUID) -> List[dict]:
        # Usamos join para traer la membresía activa
        query = (
            select(Usuario, Membresia)
            .outerjoin(Membresia, Usuario.id == Membresia.socio_id)
            .where(
                Usuario.entidad_id == entidad_id,
                Usuario.rol == RolTipo.SOCIO
            )
            .order_by(Usuario.nombre.asc())
        )
        resultado = await db.execute(query)
        socios_con_membresia = resultado.all()
        
        lista_final = []
        for usuario, membresia in socios_con_membresia:
            socio_dict = {
                "id": usuario.id,
                "cedula": usuario.cedula,
                "nombre": usuario.nombre,
                "apellido": usuario.apellido,
                "nombre_completo": usuario.nombre_completo,
                "email": usuario.email,
                "telefono": usuario.telefono,
                "activo": usuario.activo,
                "rol": usuario.rol,
                "entidad_id": usuario.entidad_id,
                "debe_cambiar_password": usuario.debe_cambiar_password,
                "created_at": usuario.created_at,
                "membresia": None
            }
            
            if membresia:
                progreso = membresia_service.calcular_progreso(membresia)
                socio_dict["membresia"] = {
                    "id": membresia.id,
                    "estado": membresia.estado,
                    "fecha_inicio": membresia.fecha_inicio,
                    "fecha_fin": membresia.fecha_fin,
                    "progreso": progreso
                }
            
            lista_final.append(socio_dict)
            
        return lista_final

socio_service = SocioService()
