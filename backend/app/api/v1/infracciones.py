from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.core.database import obtener_db
from app.core.dependencias import obtener_usuario_actual, require_rol
from app.models.enums import RolTipo
from app.models.usuario import Usuario
from app.schemas.infraccion import InfraccionCrear, InfraccionSalida, InfraccionResolver
from app.services.infraccion_service import infraccion_service

router = APIRouter()

# Solo SUPERVISOR, ADMIN_BASE o COMANDANTE pueden registrar infracciones
DEPENDENCY_SUPERVISOR = Depends(require_rol([RolTipo.SUPERVISOR, RolTipo.ADMIN_BASE, RolTipo.COMANDANTE]))

@router.post("", response_model=InfraccionSalida, status_code=status.HTTP_201_CREATED)
async def registrar_infraccion(
    datos: InfraccionCrear,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = DEPENDENCY_SUPERVISOR
):
    """
    Registra una nueva infracción a un vehículo/socio.
    Dispara una notificación en tiempo real a las alcabalas y comandante.
    """
    return await infraccion_service.registrar(db, datos, usuario_actual.id)

@router.get("/activas", response_model=List[InfraccionSalida])
async def listar_infracciones_activas(
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    """
    Lista las infracciones que aún no han sido resueltas.
    """
    return await infraccion_service.obtener_activas(db)

@router.post("/{id}/resolver", response_model=InfraccionSalida)
async def resolver_infraccion(
    id: UUID,
    datos: InfraccionResolver,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(require_rol([RolTipo.ADMIN_BASE, RolTipo.COMANDANTE]))
):
    """
    Resuelve o perdona una infracción.
    Requiere rol de administrador (Base o Comandante).
    """
    try:
        return await infraccion_service.resolver(db, id, datos, usuario_actual.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
