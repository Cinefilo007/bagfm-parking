from fontTools.ttLib.tables.O_S_2f_2 import table_O_S_2f_2
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import obtener_db
from app.core.dependencias import obtener_usuario_actual
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioSalida, UsuarioCrear
from app.services.personal_service import personal_service

router = APIRouter()

@router.get("/lista", response_model=List[UsuarioSalida])
async def listar_personal(
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    """
    Retorna la lista de personal administrativo y operativo según permisos.
    """
    return await personal_service.listar_personal(db, usuario_actual)

@router.post("/", response_model=UsuarioSalida)
async def crear_personal(
    datos: UsuarioCrear,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    """
    Registra un nuevo miembro del personal (Admin, Supervisor, Parquero).
    """
    return await personal_service.crear_personal(db, datos, usuario_actual)
