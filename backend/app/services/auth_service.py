from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.usuario import Usuario
from app.schemas.auth import LoginEntrada, Token
from app.core.security import verificar_password, crear_token_acceso
from app.core.excepciones import CredencialesInvalidas, UsuarioInactivo
from app.core.password_rotativo import generar_password_diario
from app.models.alcabala_evento import PuntoAcceso
from app.models.enums import RolTipo

class AuthService:
    async def autenticar_usuario(self, db: AsyncSession, credenciales: LoginEntrada) -> Token:
        query = select(Usuario).where(Usuario.cedula == credenciales.cedula)
        resultado = await db.execute(query)
        usuario = resultado.scalar_one_or_none()

        if not usuario:
            raise CredencialesInvalidas("Credenciales incorrectas")

        # Lógica especial para ALCABALAS (Contraseña Rotativa)
        if usuario.rol == RolTipo.ALCABALA:
            # 1. Obtener el punto de acceso asociado
            q_punto = select(PuntoAcceso).where(PuntoAcceso.usuario_id == usuario.id)
            res_punto = await db.execute(q_punto)
            punto = res_punto.scalar_one_or_none()
            
            if punto:
                clave_diaria = generar_password_diario(punto.secret_key, punto.key_salt)
                # Validar si coincide con la clave diaria
                if credenciales.password != clave_diaria:
                    # Si no coincide con la diaria, probamos con la del hash (admin backend access)
                    if not verificar_password(credenciales.password, usuario.password_hash):
                        raise CredencialesInvalidas("Credenciales de alcabala inválidas para este turno")
            else:
                # Si no hay punto asociado, fallamos
                if not verificar_password(credenciales.password, usuario.password_hash):
                    raise CredencialesInvalidas("Credenciales incorrectas")
        else:
            # Autenticación estándar para otros roles
            if not verificar_password(credenciales.password, usuario.password_hash):
                raise CredencialesInvalidas("Credenciales incorrectas")

        if getattr(usuario, "activo", True) == False:
            raise UsuarioInactivo("El usuario está inactivo")

        # Generar token
        token_data = {
            "sub": str(usuario.id),
            "rol": usuario.rol.value,
            "entidad_id": str(usuario.entidad_id) if usuario.entidad_id else None,
            "debe_cambiar_password": usuario.debe_cambiar_password
        }
        
        token = crear_token_acceso(token_data)
        
        return Token(access_token=token)

    async def obtener_usuario_por_id(self, db: AsyncSession, usuario_id: str) -> Usuario | None:
        query = select(Usuario).where(Usuario.id == usuario_id)
        resultado = await db.execute(query)
        return resultado.scalar_one_or_none()

    async def actualizar_password(self, db: AsyncSession, usuario_id: str, nueva_password: str) -> bool:
        usuario = await self.obtener_usuario_por_id(db, usuario_id)
        if not usuario:
            return False
        
        from app.core.security import hashear_password
        usuario.password_hash = hashear_password(nueva_password)
        usuario.debe_cambiar_password = False
        
        await db.commit()
        return True

auth_service = AuthService()
