from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import obtener_db
from app.core.excepciones import CredencialesInvalidas, UsuarioInactivo
from app.core.dependencias import obtener_usuario_actual
from app.models.usuario import Usuario
from app.schemas.auth import LoginEntrada, Token, CambioPasswordEntrada
from app.services.auth_service import auth_service

router = APIRouter()

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(obtener_db)
):
    """
    Endpoint de login con formulario standard OAuth2 (application/x-www-form-urlencoded).
    El frontend enviará 'username' (que mapearemos a cedula) y 'password'.
    """
    try:
        credenciales = LoginEntrada(cedula=form_data.username, password=form_data.password)
        token = await auth_service.autenticar_usuario(db, credenciales)
        return token
    except (CredencialesInvalidas, UsuarioInactivo) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.patch("/cambiar-password")
async def cambiar_password(
    datos: CambioPasswordEntrada,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    """
    Permite al usuario cambiar su contraseña. 
    Limpia el flag 'debe_cambiar_password'.
    """
    # Validación simple: que no sea igual a su cédula (password por defecto)
    if datos.nueva_password == usuario_actual.cedula:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe ser diferente a su número de cédula"
        )
    
    exito = await auth_service.actualizar_password(db, str(usuario_actual.id), datos.nueva_password)
    
    if not exito:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
        
    return {"mensaje": "Contraseña actualizada exitosamente"}
