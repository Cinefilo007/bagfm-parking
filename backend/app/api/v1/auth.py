from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import obtener_db
from app.core.excepciones import CredencialesInvalidas, UsuarioInactivo
from app.schemas.auth import LoginEntrada, Token
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
