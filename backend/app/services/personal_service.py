from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from uuid import UUID
from typing import List, Optional

from app.models.usuario import Usuario
from app.models.enums import RolTipo
from app.schemas.usuario import UsuarioCrear
from app.core.security import hashear_password
from app.core.excepciones import EntidadNoEncontrada, EntidadDuplicada, AccesoDenegado

class PersonalService:
    async def listar_personal(
        self, 
        db: AsyncSession, 
        usuario_actual: Usuario
    ) -> List[Usuario]:
        """
        Lista el personal según el rol del usuario que consulta.
        """
        query = select(Usuario).order_by(Usuario.nombre.asc())
        
        if usuario_actual.rol in [RolTipo.COMANDANTE, RolTipo.ADMIN_BASE]:
            # Comandante/AdminBase ven a todos los operativos y admins
            # Excluimos SOCIO porque tienen su propia vista
            query = query.where(Usuario.rol.in_([
                RolTipo.ADMIN_BASE, 
                RolTipo.SUPERVISOR, 
                RolTipo.ALCABALA, 
                RolTipo.ADMIN_ENTIDAD, 
                RolTipo.PARQUERO
            ]))
        elif usuario_actual.rol == RolTipo.ADMIN_ENTIDAD:
            # Administrador de Entidad solo ve a sus PARQUEROS
            query = query.where(
                Usuario.entidad_id == usuario_actual.entidad_id,
                Usuario.rol == RolTipo.PARQUERO
            )
        else:
            raise AccesoDenegado("No tiene permisos para ver la lista de personal")
            
        res = await db.execute(query)
        return res.scalars().all()

    async def crear_personal(
        self, 
        db: AsyncSession, 
        datos: UsuarioCrear, 
        usuario_actual: Usuario
    ) -> Usuario:
        """
        Crea un nuevo miembro del personal con validaciones de jerarquía.
        """
        # 1. Validaciones de Rol (Quién puede crear a quién)
        if usuario_actual.rol == RolTipo.ADMIN_ENTIDAD:
            if datos.rol != RolTipo.PARQUERO:
                raise AccesoDenegado("Como Administrador de Entidad, solo puede registrar Parqueros")
            datos.entidad_id = usuario_actual.entidad_id
            
        elif usuario_actual.rol in [RolTipo.COMANDANTE, RolTipo.ADMIN_BASE]:
            if datos.rol == RolTipo.COMANDANTE:
                raise AccesoDenegado("No se pueden crear más Comandantes por esta vía")
            
            if datos.rol == RolTipo.PARQUERO and not datos.entidad_id:
                raise AccesoDenegado("Debe especificar una entidad para el Parquero")
        else:
            raise AccesoDenegado("No tiene permisos para registrar personal")

        # 2. Verificar duplicados
        query_existente = select(Usuario).where(Usuario.cedula == datos.cedula)
        res_existente = await db.execute(query_existente)
        if res_existente.scalar_one_or_none():
            raise EntidadDuplicada(f"Ya existe un usuario con la cédula {datos.cedula}")

        # 3. Crear Usuario
        nuevo_usuario = Usuario(
            cedula=datos.cedula,
            nombre=datos.nombre.upper(),
            apellido=datos.apellido.upper(),
            email=datos.email.lower() if datos.email else None,
            telefono=datos.telefono,
            rol=datos.rol,
            entidad_id=datos.entidad_id,
            password_hash=hashear_password(datos.password if datos.password else datos.cedula),
            debe_cambiar_password=True,
            activo=True
        )
        
        db.add(nuevo_usuario)
        await db.commit()
        await db.refresh(nuevo_usuario)
        return nuevo_usuario

personal_service = PersonalService()
