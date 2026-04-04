from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import obtener_db
from app.core.dependencias import obtener_usuario_actual
from app.schemas.mapa import SituacionBaseSalida
from app.services import mapa_service
from app.models.usuario import Usuario

router = APIRouter()

@router.get("/situacion", response_model=SituacionBaseSalida)
async def leer_situacion_tactica(
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(obtener_usuario_actual)
):
    """
    Obtiene la situación táctica completa de la base para el Mapa.
    """
    return await mapa_service.get_situacion_actual(db)
