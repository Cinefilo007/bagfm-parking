import re
import unicodedata
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.entidad_civil import EntidadCivil
from app.models.usuario import Usuario
from app.models.enums import RolTipo
from app.schemas.entidad_civil import EntidadCivilCrear
from app.core.excepciones import EntidadDuplicada, EntidadNoEncontrada
from app.core.security import hashear_password

class EntidadCivilService:
    def _generar_slug(self, texto: str) -> str:
        """SOP: Genera un slug simple (ej. 'Mi Entidad' -> 'MI_ENTIDAD')."""
        texto = unicodedata.normalize('NFKD', texto).encode('ascii', 'ignore').decode('ascii')
        texto = re.sub(r'[^\w\s-]', '', texto).strip().upper()
        return re.sub(r'[-\s]+', '_', texto)

    async def crear(
        self, db: AsyncSession, datos: EntidadCivilCrear, usuario_actual: Usuario
    ) -> EntidadCivil:
        """
        SOP: Crea una nueva entidad civil y su administrador inicial.
        Operación transaccional completa.
        """
        # 1. Generar slug si no viene
        slug = datos.codigo_slug or self._generar_slug(datos.nombre)
        
        # 2. Extraer datos de la entidad (excluyendo los del administrador)
        entidad_dict = datos.model_dump(exclude={
            "admin_cedula", "admin_nombre", "admin_apellido", 
            "admin_email", "admin_password"
        })
        entidad_dict["codigo_slug"] = slug
        
        entidad = EntidadCivil(
            **entidad_dict,
            created_by=usuario_actual.id
        )
        
        db.add(entidad)
        try:
            await db.flush() # Para obtener el ID de la entidad
            
            # 3. Crear el Usuario Administrador de la Entidad
            admin_usuario = Usuario(
                cedula=datos.admin_cedula,
                nombre=datos.admin_nombre,
                apellido=datos.admin_apellido,
                email=datos.admin_email,
                rol=RolTipo.ADMIN_ENTIDAD,
                entidad_id=entidad.id,
                password_hash=hashear_password(datos.admin_password)
            )
            db.add(admin_usuario)
            
            await db.commit()
            await db.refresh(entidad)
            return entidad
            
        except IntegrityError as e:
            await db.rollback()
            msg = str(e.orig)
            if "entidades_civiles_codigo_slug_key" in msg or "codigo_slug" in msg:
                raise EntidadDuplicada(f"El código generado '{slug}' ya está en uso.")
            if "usuarios_email_key" in msg:
                raise EntidadDuplicada(f"El email '{datos.admin_email}' ya está registrado.")
            if "usuarios_cedula_key" in msg:
                raise EntidadDuplicada(f"La cédula '{datos.admin_cedula}' ya está registrada.")
            raise EntidadDuplicada("Error de integridad al crear la entidad o el administrador.")

    async def obtener_todas(self, db: AsyncSession, activas_solo: bool = False) -> list[EntidadCivil]:
        """SOP: Obtiene lista de entidades civiles."""
        query = select(EntidadCivil)
        if activas_solo:
            query = query.where(EntidadCivil.activo == True)
            
        # Ordenadas por nombre
        query = query.order_by(EntidadCivil.nombre)
        
        resultado = await db.execute(query)
        return list(resultado.scalars().all())

    async def obtener_por_id(self, db: AsyncSession, entidad_id: UUID) -> EntidadCivil:
        """SOP: Obtiene entidad específica."""
        entidad = await db.get(EntidadCivil, entidad_id)
        if not entidad:
            raise EntidadNoEncontrada("La entidad solicitada no existe.")
        return entidad

    async def actualizar(
        self, db: AsyncSession, entidad_id: UUID, datos: EntidadCivilCrear
    ) -> EntidadCivil:
        """SOP: Actualiza entidad."""
        entidad = await self.obtener_por_id(db, entidad_id)
        
        for key, value in datos.model_dump(exclude_unset=True).items():
            setattr(entidad, key, value)
            
        try:
            await db.commit()
            await db.refresh(entidad)
            return entidad
        except IntegrityError:
            await db.rollback()
            raise EntidadDuplicada("Los datos generan conflicto con otra entidad.")

    async def eliminar_logico(self, db: AsyncSession, entidad_id: UUID) -> EntidadCivil:
        """SOP: Desactiva entidad, no la borra (soft delete)."""
        entidad = await self.obtener_por_id(db, entidad_id)
        entidad.activo = False
        await db.commit()
        await db.refresh(entidad)
        return entidad

entidad_service = EntidadCivilService()
