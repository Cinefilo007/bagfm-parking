from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import List

from app.core.database import obtener_db
from app.core.dependencias import obtener_usuario_actual, require_rol
from app.models.usuario import Usuario
from app.services.zona_service import zona_service
from app.schemas.zona_estacionamiento import (
    ZonaEstacionamientoSalida, ZonaEstacionamientoCrear, ZonaEstacionamientoActualizar
)
from app.schemas.asignacion_zona import (
    AsignacionZonaCrear, AsignacionZonaSalida
)
from app.schemas.puesto_estacionamiento import PuestoEstacionamientoSalida, PuestoEstacionamientoActualizar

router = APIRouter()

@router.post("", response_model=ZonaEstacionamientoSalida)
async def crear_zona(
    datos: ZonaEstacionamientoCrear,
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["COMANDANTE", "ADMIN_BASE"]))
):
    try:
        return await zona_service.crear_zona_estacionamiento(db, datos.model_dump(), current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{zona_id}", response_model=ZonaEstacionamientoSalida)
async def actualizar_zona(
    zona_id: UUID,
    datos: ZonaEstacionamientoActualizar,
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["COMANDANTE", "ADMIN_BASE"]))
):
    zona = await zona_service.actualizar_zona(db, zona_id, datos.model_dump(exclude_unset=True))
    if not zona:
        raise HTTPException(status_code=404, detail="Zona no encontrada")
    return zona

@router.get("", response_model=List[ZonaEstacionamientoSalida])
async def listar_zonas(
    skip: int = 0, limit: int = 100, activa: bool = None,
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["COMANDANTE", "ADMIN_BASE", "SUPERVISOR", "PARQUERO"]))
):
    return await zona_service.obtener_zonas(db, skip, limit, activa)

@router.put("/{zona_id}/tiempo-llegada")
async def modificar_tiempo_limite(
    zona_id: UUID, 
    minutos: int = Body(..., embed=True),
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["COMANDANTE", "ADMIN_BASE", "SUPERVISOR", "SUPERVISOR_PARQUEROS", "ADMIN_ENTIDAD"]))
):
    try:
        zona = await zona_service.get_zona(db, zona_id)
        if not zona:
            raise HTTPException(status_code=404, detail="Zona no encontrada")
        zona.tiempo_limite_llegada_min = minutos
        await db.commit()
        return {"mensaje": f"Tiempo límite actualizado a {minutos} minutos"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{zona_id}/puestos", response_model=List[PuestoEstacionamientoSalida])
async def obtener_puestos(
    zona_id: UUID,
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["COMANDANTE", "ADMIN_BASE", "SUPERVISOR", "PARQUERO", "SUPERVISOR_PARQUEROS", "ADMIN_ENTIDAD"]))
):
    """Retorna los puestos físicos de una zona."""
    return await zona_service.obtener_puestos_zona(db, zona_id)

@router.post("/{zona_id}/puestos", response_model=List[PuestoEstacionamientoSalida])
async def generar_puestos(
    zona_id: UUID,
    prefijo: str = Body(...),
    cantidad: int = Body(...),
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["COMANDANTE", "ADMIN_BASE"]))
):
    try:
        return await zona_service.generar_puestos_fisicos(db, zona_id, prefijo, cantidad, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/puestos/{puesto_id}", response_model=PuestoEstacionamientoSalida)
async def actualizar_puesto(
    puesto_id: UUID,
    datos: PuestoEstacionamientoActualizar,
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["COMANDANTE", "ADMIN_BASE", "PARQUERO"]))
):
    try:
        return await zona_service.actualizar_puesto_fisico(db, puesto_id, datos.model_dump(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/asignaciones", response_model=AsignacionZonaSalida)
async def asignar_zona_entidad(
    datos: AsignacionZonaCrear,
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["COMANDANTE", "ADMIN_BASE"]))
):
    try:
        return await zona_service.asignar_zona_a_entidad(db, dict(datos), current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/asignaciones", response_model=List[AsignacionZonaSalida])
async def obtener_todas_las_asignaciones(
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["COMANDANTE", "ADMIN_BASE"]))
):
    """Retorna todas las asignaciones de cupos en el sistema."""
    return await zona_service.obtener_asignaciones_globales(db)
