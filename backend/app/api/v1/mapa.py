from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.dependencies import get_current_user
from app.schemas.mapa import SituacionBaseSalida
from app.services import mapa_service
from app.models.usuario import Usuario

router = APIRouter()

@router.get("/situacion", response_model=SituacionBaseSalida)
def leer_situacion_tactica(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtiene la situación táctica completa de la base para el Mapa.
    """
    return mapa_service.get_situacion_actual(db)
