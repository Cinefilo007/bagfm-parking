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
    AsignacionZonaCrear, AsignacionZonaSalida, AsignacionZonaActualizar
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

@router.patch("/asignaciones/{asignacion_id}", response_model=AsignacionZonaSalida)
async def actualizar_asignacion(
    asignacion_id: UUID,
    datos: AsignacionZonaActualizar,
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["COMANDANTE", "ADMIN_BASE"]))
):
    asig = await zona_service.actualizar_asignacion_zona(db, asignacion_id, datos.model_dump(exclude_unset=True))
    if not asig:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    return asig

@router.delete("/asignaciones/{asignacion_id}")
async def eliminar_asignacion(
    asignacion_id: UUID,
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["COMANDANTE", "ADMIN_BASE"]))
):
    if not await zona_service.eliminar_asignacion_zona(db, asignacion_id):
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    return {"mensaje": "Asignación eliminada correctamente"}

@router.get("/entidad/mis-asignaciones", response_model=List[AsignacionZonaSalida])
async def obtener_mis_asignaciones(
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["ADMIN_ENTIDAD"]))
):
    """Obtiene las asignaciones de zona vinculadas a la entidad del usuario."""
    if not current_user.entidad_id:
        return []
    from sqlalchemy import select
    from app.models.asignacion_zona import AsignacionZona
    rs = await db.execute(select(AsignacionZona).where(
        AsignacionZona.entidad_id == current_user.entidad_id,
        AsignacionZona.activa == True
    ))
    return rs.scalars().all()

@router.patch("/entidad/asignaciones/{asignacion_id}/distribucion", response_model=AsignacionZonaSalida)
async def configurar_distribucion_cupos(
    asignacion_id: UUID,
    distribucion_cupos: dict = Body(..., embed=True),
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["ADMIN_ENTIDAD"]))
):
    """Permite al admin de entidad configurar cómo se subdivide su cupo lógico (ej. VIP: 20, Staff: 15)."""
    if not current_user.entidad_id:
        raise HTTPException(status_code=403, detail="No perteneces a una entidad civil activa.")
    asig = await zona_service.get_asignacion(db, asignacion_id)
    if not asig or asig.entidad_id != current_user.entidad_id:
        raise HTTPException(status_code=404, detail="Asignación no encontrada o no pertenece a tu entidad.")
    
    # Validar que los montos propuestos no excedan el cupo total utilizable
    total_reservado = sum(int(v) for v in distribucion_cupos.values() if isinstance(v, (int, float)) or (isinstance(v, str) and v.isdigit()))
    cupo_utilizable = asig.cupo_asignado - asig.cupo_reservado_base
    if total_reservado > cupo_utilizable:
        raise HTTPException(status_code=400, detail=f"Distribuición excedida. Tienes {cupo_utilizable} cupos utilizables y tratas de reservar {total_reservado}.")

    asig.distribucion_cupos = distribucion_cupos
    await db.commit()
    await db.refresh(asig)
    return asig

@router.post("/{zona_id}/puestos-entidad", response_model=List[PuestoEstacionamientoSalida])
async def generar_puestos_entidad(
    zona_id: UUID,
    prefijo: str = Body(...),
    cantidad: int = Body(...),
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["ADMIN_ENTIDAD"]))
):
    """Permite a la Entidad generar puestos físicos individuales limitados a su cupo."""
    if not current_user.entidad_id:
        raise HTTPException(status_code=403, detail="No perteneces a una entidad civil activa.")
    try:
        return await zona_service.generar_puestos_entidad(db, zona_id, current_user.entidad_id, prefijo, cantidad, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
