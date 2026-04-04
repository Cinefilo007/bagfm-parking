from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import obtener_db, obtener_usuario_actual
from app.services import mapa_service
from pydantic import BaseModel
from typing import Literal

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

@router.put("/georreferenciar")
async def actualizar_ubicacion(
    request: GeorreferenciaRequest,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual = Depends(obtener_usuario_actual)
):
    """Actualiza la posición geográfica de una entidad en el mapa."""
    # Solo roles de alto mando pueden georreferenciar
    if usuario_actual.rol not in ['COMANDANTE', 'ADMIN_BASE', 'SUPERVISOR']:
        raise HTTPException(status_code=403, detail="No tienes permisos para georreferenciar.")
    
    exito = await mapa_service.actualizar_georreferencia(
        db, request.tipo, request.id, request.lat, request.lng
    )
    
    if not exito:
        raise HTTPException(status_code=404, detail="Entidad no encontrada.")
        
    return {"message": "Ubicación actualizada correctamente."}
