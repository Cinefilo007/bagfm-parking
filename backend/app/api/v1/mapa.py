from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import obtener_db
from app.core.dependencias import obtener_usuario_actual
from app.services import mapa_service
from pydantic import BaseModel
from typing import Literal
from app.models.enums import RolTipo

router = APIRouter()

class GeorreferenciaRequest(BaseModel):
    tipo: Literal['entidad', 'alcabala', 'zona']
    id: str
    lat: float
    lng: float

@router.get("/situacion")
async def get_situacion(
    db: AsyncSession = Depends(obtener_db),
    usuario_actual = Depends(obtener_usuario_actual)
):
    """Retorna la situación táctica consolidada de la Base."""
    return await mapa_service.get_situacion_actual(db)

@router.get("/trafico")
async def get_trafico(
    weeks_ago: int = 0,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual = Depends(obtener_usuario_actual)
):
    """Retorna estadísticas de tráfico histórico por días."""
    return await mapa_service.get_trafico_historico(db, weeks_ago)

@router.put("/georreferenciar")
async def actualizar_ubicacion(
    request: GeorreferenciaRequest,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual = Depends(obtener_usuario_actual)
):
    """Actualiza la posición geográfica de una entidad en el mapa."""
    # Solo roles de alto mando pueden georreferenciar
    ALTO_MANDO = [RolTipo.COMANDANTE, RolTipo.ADMIN_BASE, RolTipo.SUPERVISOR]
    if usuario_actual.rol not in ALTO_MANDO:
        raise HTTPException(status_code=403, detail="No tienes permisos para georreferenciar.")
    
    exito = await mapa_service.actualizar_georreferencia(
        db, request.tipo, request.id, request.lat, request.lng
    )
    
    if not exito:
        raise HTTPException(status_code=404, detail="Entidad no encontrada.")
        
    return {"message": "Ubicación actualizada correctamente."}
