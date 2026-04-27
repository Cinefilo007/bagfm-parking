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


@router.get("/stats")
async def obtener_stats_entidades(
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    """Retorna estadísticas globales para el Comandante."""
    return await entidad_service.obtener_stats_globales(db)


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


@router.post("/{id}/toggle", response_model=EntidadCivilSalida)
async def toggle_estado_entidad(
    id: UUID,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = DEPENDENCY_ADMIN_BASE,
):
    """Alterna el estado ACTIVO/INACTIVO de la entidad."""
    try:
        return await entidad_service.toggle_estado(db, id)
    except EntidadNoEncontrada as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.patch("/{id}/branding", response_model=EntidadCivilSalida)
async def actualizar_branding_entidad(
    id: UUID,
    datos: dict,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    """Actualiza la configuración de marca (JSON) de la entidad."""
    # Validación de permisos: Admin Base puede todo, Admin Entidad solo su propia entidad
    es_admin_base = usuario_actual.rol in [RolTipo.COMANDANTE, RolTipo.ADMIN_BASE]
    es_su_entidad = usuario_actual.rol == RolTipo.ADMIN_ENTIDAD and usuario_actual.entidad_id == id
    
    if not (es_admin_base or es_su_entidad):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tiene permisos para modificar la marca de esta entidad"
        )

    try:
        return await entidad_service.actualizar_branding(db, id, datos)
    except EntidadNoEncontrada as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{id}")
async def eliminar_entidad(
    id: UUID,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = DEPENDENCY_ADMIN_BASE,
):
    """
    BAJA DEFINITIVA: Elimina la entidad y todos sus datos relacionados (socios, vehículos, QRs) en cascada técnica.
    Esta acción es irreversible.
    """
    try:
        exito = await entidad_service.eliminar(db, id)
        return {"status": "success", "message": "Entidad eliminada permanentemente", "deleted": exito}
    except EntidadNoEncontrada as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al eliminar entidad: {str(e)}")
