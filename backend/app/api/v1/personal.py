from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import obtener_db
from app.core.dependencias import obtener_usuario_actual
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioSalida, UsuarioCrear
from app.services.personal_service import personal_service
from app.core.excepciones import AccesoDenegado, EntidadNoEncontrada

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

@router.post("/{id}/toggle", response_model=UsuarioSalida)
async def toggle_estado_personal(
    id: UUID,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    """Activa o suspende el acceso de un miembro del personal."""
    try:
        return await personal_service.toggle_activo(db, id, usuario_actual)
    except AccesoDenegado as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except EntidadNoEncontrada as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.delete("/{id}")
async def eliminar_personal(
    id: UUID,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    """Elimina permanentemente a un miembro del personal. Solo Comandante."""
    try:
        await personal_service.eliminar(db, id, usuario_actual)
        return {"status": "success", "message": "Personal eliminado correctamente"}
    except AccesoDenegado as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except EntidadNoEncontrada as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
