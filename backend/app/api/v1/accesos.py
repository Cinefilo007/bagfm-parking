from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import obtener_db
from app.core.dependencias import obtener_usuario_actual, require_rol
from app.models.enums import RolTipo
from app.models.usuario import Usuario
from app.schemas.acceso import AccesoValidar, AccesoRegistrar, ResultadoValidacion, AccesoSalida
from app.services.acceso_service import acceso_service

router = APIRouter()

# La mayoría de estos endpoints son para personal de ALCABALA o superior
DEPENDENCY_ALCABALA = Depends(require_rol([RolTipo.ALCABALA, RolTipo.ADMIN_BASE, RolTipo.COMANDANTE]))

@router.post("/validar", response_model=ResultadoValidacion)
async def validar_acceso(
    datos: AccesoValidar,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = DEPENDENCY_ALCABALA
):
    """
    Valida un QR escaneado. 
    Retorna la ficha del socio y si el acceso está permitido o bloqueado por infracciones.
    """
    return await acceso_service.validar_qr(db, datos)

@router.post("/registrar", response_model=AccesoSalida, status_code=status.HTTP_201_CREATED)
async def registrar_acceso(
    datos: AccesoRegistrar,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = DEPENDENCY_ALCABALA
):
    """
    Confirma y persiste un registro de acceso (entrada o salida).
    """
    return await acceso_service.registrar_acceso(db, datos, usuario_actual.id)

from app.schemas.acceso import PaginatedEventos
from typing import Optional

@router.get("/historial/tactico", response_model=PaginatedEventos)
async def historial_tactico(
    page: int = 1,
    size: int = 20,
    punto_nombre: Optional[str] = None,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = DEPENDENCY_ALCABALA
):
    """Obtiene el historial de eventos paginado para monitores tácticos."""
    return await acceso_service.obtener_historial_tactico(db, page, size, punto_nombre)
