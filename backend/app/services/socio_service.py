from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from uuid import UUID
from typing import List, Optional
from datetime import date

from app.models.usuario import Usuario
from app.models.entidad_civil import EntidadCivil
from app.models.membresia import Membresia
from app.models.vehiculo import Vehiculo
from app.models.codigo_qr import CodigoQR
from app.models.enums import RolTipo, MembresiaEstado
from app.schemas.socio import SocioCrear, SocioUpdate, MembresiaBase
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

        # 4. Crear la Membresia con fecha_expiracion si se proporcionó
        nueva_membresia = await membresia_service.crear_membresia_inicial(
            db, nuevo_socio.id, datos.entidad_id, 
            meses=1, creador_id=creador_id,
            fecha_fin_override=datos.fecha_expiracion,
            puestos_asignados=getattr(datos, 'puestos_asignados', 1)
        )

        # 5. Crear Vehículos (Opcional)
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

    async def eliminar_socio_cascada(self, db: AsyncSession, socio_id: UUID) -> dict:
        """Elimina un socio y todos sus registros asociados en cascada."""
        # Verificar que el socio existe
        query = select(Usuario).where(Usuario.id == socio_id, Usuario.rol == RolTipo.SOCIO)
        res = await db.execute(query)
        socio = res.scalar_one_or_none()
        if not socio:
            raise EntidadNoEncontrada("Socio no encontrado")

        nombre = socio.nombre_completo

        # Eliminar en orden: QRs -> Membresías -> Vehículos -> Usuario
        await db.execute(delete(CodigoQR).where(CodigoQR.usuario_id == socio_id))
        await db.execute(delete(Membresia).where(Membresia.socio_id == socio_id))
        await db.execute(delete(Vehiculo).where(Vehiculo.socio_id == socio_id))
        await db.delete(socio)
        await db.commit()

        return {"eliminado": True, "nombre": nombre}

    async def obtener_socios_entidad(self, db: AsyncSession, entidad_id: UUID) -> List[dict]:
        # 1. Traer socios y su membresía activa
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
        
        # 2. Traer todos los vehículos de los socios de esta entidad para mapear
        query_v = (
            select(Vehiculo)
            .join(Usuario, Vehiculo.socio_id == Usuario.id)
            .where(Usuario.entidad_id == entidad_id)
        )
        res_v = await db.execute(query_v)
        todos_los_vehiculos = res_v.scalars().all()
        
        lista_final = []
        for usuario, membresia in socios_con_membresia:
            # Filtrar vehículos para este usuario
            vehiculos_socio = [v for v in todos_los_vehiculos if v.socio_id == usuario.id]
            
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
                "membresia": None,
                "vehiculos": vehiculos_socio
            }
            
            if membresia:
                progreso = membresia_service.calcular_progreso(membresia)
                socio_dict["membresia"] = {
                    "id": membresia.id,
                    "estado": membresia.estado,
                    "fecha_inicio": membresia.fecha_inicio,
                    "fecha_fin": membresia.fecha_fin,
                    "progreso": progreso,
                    "puestos_asignados": membresia.puestos_asignados
                }
            
            lista_final.append(socio_dict)
            
        return lista_final

    async def vincular_vehiculo(self, db: AsyncSession, socio_id: UUID, datos: dict) -> Vehiculo:
        # 1. Obtener al solicitante para verificar su rol
        query_user = select(Usuario).where(Usuario.id == socio_id)
        res_user = await db.execute(query_user)
        solicitante = res_user.scalar_one_or_none()

        # 2. Verificar si la placa ya existe
        placa = datos.get("placa", "").upper()
        query_v = select(Vehiculo).where(Vehiculo.placa == placa)
        res_v = await db.execute(query_v)
        vehiculo_existente = res_v.scalars().first()

        if vehiculo_existente:
            # Si el vehículo ya es del solicitante, no hacemos nada o lanzamos error específico
            if vehiculo_existente.socio_id == socio_id:
                raise EntidadDuplicada(f"Ya tienes la placa {placa} registrada en tu flota")
            
            # LÓGICA TÁCTICA: Si el dueño actual es un socio TEMPORAL y el nuevo es un SOCIO permanente,
            # permitimos la transferencia automática del vehículo.
            query_owner = select(Usuario).where(Usuario.id == vehiculo_existente.socio_id)
            res_owner = await db.execute(query_owner)
            dueno_actual = res_owner.scalar_one_or_none()

            if dueno_actual and dueno_actual.cedula.startswith("BAGFM-") and solicitante.rol == RolTipo.SOCIO:
                # Transferir vehículo al socio permanente
                vehiculo_existente.socio_id = socio_id
                vehiculo_existente.marca = datos.get("marca", "").upper()
                vehiculo_existente.modelo = datos.get("modelo", "").upper()
                vehiculo_existente.color = datos.get("color", "").upper()
                vehiculo_existente.año = datos.get("año")
                vehiculo_existente.tipo = datos.get("tipo")
                vehiculo_existente.activo = True
                await db.commit()
                await db.refresh(vehiculo_existente)
                return vehiculo_existente
            else:
                raise EntidadDuplicada(f"La placa {placa} ya está vinculada a otro miembro activo")

        # 3. Crear nuevo vehículo si no existía
        nuevo_v = Vehiculo(
            placa=placa,
            marca=datos.get("marca", "").upper(),
            modelo=datos.get("modelo", "").upper(),
            color=datos.get("color", "").upper(),
            año=datos.get("año"),
            tipo=datos.get("tipo"),
            socio_id=socio_id
        )
        db.add(nuevo_v)
        await db.commit()
        await db.refresh(nuevo_v)
        return nuevo_v

    async def actualizar_puestos_asignados(self, db: AsyncSession, socio_id: UUID, puestos: int) -> Membresia:
        """Actualiza la cantidad de puestos de estacionamiento asignados al socio."""
        from app.core.excepciones import EntidadNoEncontrada
        q = select(Membresia).where(Membresia.socio_id == socio_id).order_by(Membresia.created_at.desc())
        res = await db.execute(q)
        membresia = res.scalars().first()
        if not membresia:
            raise EntidadNoEncontrada("Membresía no encontrada para este socio")
        membresia.puestos_asignados = max(1, puestos)
        await db.commit()
        await db.refresh(membresia)
        return membresia

    async def actualizar_socio(self, db: AsyncSession, socio_id: UUID, datos: SocioUpdate) -> Usuario:
        """Actualiza los datos básicos y de membresía de un socio."""
        # 1. Buscar el socio
        query = select(Usuario).where(Usuario.id == socio_id, Usuario.rol == RolTipo.SOCIO)
        res = await db.execute(query)
        socio = res.scalar_one_or_none()
        
        if not socio:
            raise EntidadNoEncontrada("Socio no encontrado")
            
        # 2. Actualizar datos de Usuario
        if datos.nombre: socio.nombre = datos.nombre
        if datos.apellido: socio.apellido = datos.apellido
        if datos.email: socio.email = datos.email
        if datos.telefono: socio.telefono = datos.telefono
        if datos.cedula: socio.cedula = datos.cedula
        
        # 3. Actualizar datos de Membresía (si aplica)
        if datos.puestos_asignados is not None or datos.fecha_expiracion is not None:
            q_mem = select(Membresia).where(Membresia.socio_id == socio_id).order_by(Membresia.created_at.desc())
            res_mem = await db.execute(q_mem)
            membresia = res_mem.scalars().first()
            if membresia:
                if datos.puestos_asignados is not None:
                    membresia.puestos_asignados = max(1, datos.puestos_asignados)
                if datos.fecha_expiracion:
                    membresia.fecha_fin = datos.fecha_expiracion
                    
        await db.commit()
        await db.refresh(socio)
        return socio

socio_service = SocioService()
