from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import List

from app.core.database import obtener_db
from app.core.dependencias import obtener_usuario_actual, require_rol
from app.models.usuario import Usuario
from app.services.vehiculo_fantasma_service import vehiculo_fantasma_service
from app.schemas.infraccion import InfraccionSalida

router = APIRouter(prefix="/fantasmas", tags=["Control de Vehículos Fantasma"])

@router.get("/", response_model=List[InfraccionSalida])
async def obtener_historial_fantasmas(
    skip: int = 0, limit: int = 100,
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["COMANDANTE"]))
):
    """
    Obtiene el historial de vehículos fantasma detectados.
    """
    return await vehiculo_fantasma_service.obtener_historial(db, skip=skip, limit=limit)

@router.post("/scan-manual")
async def trigger_scan_manual(
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["COMANDANTE"]))
):
    """
    Desencadena un scan manual de vehículos fantasmas.
    """
    await vehiculo_fantasma_service.detectar_fantasmas(db)
    return {"mensaje": "Scan de vehículos fantasma ejecutado con éxito"}
