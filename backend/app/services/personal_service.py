from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import joinedload
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
        usuario_actual: Usuario,
        skip: int = 0,
        limit: int = 10,
        search: Optional[str] = None
    ) -> List[Usuario]:
        """
        Lista el personal según el rol del usuario que consulta, con búsqueda y paginación.
        """
        # Incluimos la relación con la entidad para ver el nombre de forma eficiente
        query = select(Usuario).options(joinedload(Usuario.entidad_pertenece)).order_by(Usuario.nombre.asc())
        
        # Filtro de búsqueda (Nombre, Apellido o Cédula)
        if search:
            search_pattern = f"%{search}%"
            query = query.where(or_(
                Usuario.nombre.ilike(search_pattern),
                Usuario.apellido.ilike(search_pattern),
                Usuario.cedula.ilike(search_pattern)
            ))

        if usuario_actual.rol in [RolTipo.COMANDANTE, RolTipo.ADMIN_BASE]:
            # Comandante/AdminBase ven a todos los operativos y admins
            # EXCLUIMOS ALCABALA (según solicitud) y SOCIO (tienen su propia vista)
            query = query.where(Usuario.rol.in_([
                RolTipo.ADMIN_BASE, 
                RolTipo.SUPERVISOR, 
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
            
        # Paginación
        query = query.offset(skip).limit(limit)
            
        res = await db.execute(query)
        usuarios = res.scalars().all()
        
        # Mapear el nombre de la entidad para el esquema de salida
        for u in usuarios:
            if u.entidad_pertenece:
                u.entidad_nombre = u.entidad_pertenece.nombre
                
        return usuarios

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

    async def toggle_activo(self, db: AsyncSession, usuario_id: UUID, usuario_actual: Usuario) -> Usuario:
        """Cambia el estado activo/suspendido de un miembro del personal."""
        if usuario_actual.rol not in [RolTipo.COMANDANTE, RolTipo.ADMIN_BASE]:
            raise AccesoDenegado("Solo el Mando Superior puede suspender personal")
            
        query = select(Usuario).where(Usuario.id == usuario_id)
        res = await db.execute(query)
        usuario = res.scalar_one_or_none()
        
        if not usuario:
            raise EntidadNoEncontrada("Usuario no encontrado")
            
        if usuario.rol == RolTipo.COMANDANTE:
            raise AccesoDenegado("No se puede suspender al Comandante")

        usuario.activo = not usuario.activo
        await db.commit()
        await db.refresh(usuario)
        return usuario

    async def eliminar(self, db: AsyncSession, usuario_id: UUID, usuario_actual: Usuario) -> bool:
        """Elimina permanentemente a un miembro del personal."""
        if usuario_actual.rol != RolTipo.COMANDANTE:
            raise AccesoDenegado("Solo el Comandante puede dar de baja definitiva al personal")
            
        query = select(Usuario).where(Usuario.id == usuario_id)
        res = await db.execute(query)
        usuario = res.scalar_one_or_none()
        
        if not usuario:
            raise EntidadNoEncontrada("Usuario no encontrado")
            
        if usuario.rol == RolTipo.COMANDANTE:
            raise AccesoDenegado("No se puede eliminar al Comandante")

        await db.delete(usuario)
        await db.commit()
        return True

personal_service = PersonalService()
