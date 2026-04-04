from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.core.database import obtener_db
from app.core.dependencias import obtener_usuario_actual, require_rol
from app.core.excepciones import EntidadDuplicada, EntidadNoEncontrada
from app.models.enums import RolTipo
from app.models.usuario import Usuario
from app.schemas.entidad_civil import EntidadCivilCrear, EntidadCivilSalida
from app.services.entidad_service import entidad_service

router = APIRouter()

# Solo COMANDANTE y ADMIN_BASE pueden administrar entidades
DEPENDENCY_ADMIN_BASE = Depends(require_rol([RolTipo.COMANDANTE, RolTipo.ADMIN_BASE]))


@router.get("", response_model=List[EntidadCivilSalida])
async def listar_entidades(
    activas_solo: bool = False,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    """
    Lista todas las entidades civiles con soporte para paginación. 
    Cualquier usuario autenticado puede verlas.
    """
    return await entidad_service.obtener_todas(db, activas_solo, skip=skip, limit=limit)


@router.post("", response_model=EntidadCivilSalida, status_code=status.HTTP_201_CREATED)
async def crear_entidad(
    datos: EntidadCivilCrear,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = DEPENDENCY_ADMIN_BASE,
):
    """
    Crea una nueva entidad civil.
    Requiere rol COMANDANTE o ADMIN_BASE.
    """
    try:
        return await entidad_service.crear(db, datos, usuario_actual)
    except EntidadDuplicada as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get("/{id}", response_model=EntidadCivilSalida)
async def obtener_entidad(
    id: UUID, 
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    """
    Obtiene una entidad civil por su ID.
    Lanza 404 si no existe.
    """
    try:
        return await entidad_service.obtener_por_id(db, id)
    except EntidadNoEncontrada as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/{id}", response_model=EntidadCivilSalida)
async def actualizar_entidad(
    id: UUID,
    datos: EntidadCivilCrear,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = DEPENDENCY_ADMIN_BASE,
):
    """
    Actualiza datos de la entidad especificada.
    Requiere rol COMANDANTE o ADMIN_BASE.
    """
    try:
        return await entidad_service.actualizar(db, id, datos)
    except EntidadNoEncontrada as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except EntidadDuplicada as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.delete("/{id}", response_model=EntidadCivilSalida)
async def desactivar_entidad(
    id: UUID,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = DEPENDENCY_ADMIN_BASE,
):
    """
    Desactiva a la entidad (soft delete) y evita acceso a sus administradores/socios.
    Requiere rol COMANDANTE o ADMIN_BASE.
    """
    try:
        return await entidad_service.eliminar_logico(db, id)
    except EntidadNoEncontrada as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
