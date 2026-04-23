from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import List, Dict, Any, Optional

from app.core.database import obtener_db
from app.core.dependencias import obtener_usuario_actual, require_rol
from app.models.usuario import Usuario
from app.services.parquero_service import parquero_service
from app.schemas.pases import VehiculoPaseSalida
from app.schemas.vehiculo import VehiculoBase

router = APIRouter(prefix="/parqueros", tags=["Parqueros Operaciones"])


# ──────────────────────────────────────────────────────────────────────────────
# DATOS DE ZONA DEL PARQUERO
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/mi-zona")
async def obtener_mi_zona(
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["SUPERVISOR_PARQUEROS", "PARQUERO", "ADMIN_BASE", "COMANDANTE"]))
):
    """
    Retorna la zona asignada al parquero autenticado con KPIs reales de puestos
    (libres, ocupados, reservados, total).
    """
    zona_data = await parquero_service.get_mi_zona(db, current_user.id)
    if not zona_data:
        raise HTTPException(status_code=404, detail="No tienes una zona asignada.")
    return zona_data


@router.get("/zona/{zona_id}/activos")
async def obtener_vehiculos_activos_zona(
    zona_id: UUID,
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["SUPERVISOR_PARQUEROS", "PARQUERO", "ADMIN_BASE", "COMANDANTE"]))
):
    """
    Retorna los vehículos actualmente estacionados en la zona.
    """
    return await parquero_service.get_vehiculos_en_zona(db, zona_id)


# ──────────────────────────────────────────────────────────────────────────────
# LLEGADA / SALIDA POR QR
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/llegada-qr/{qr_id}/zona/{zona_id}", response_model=VehiculoPaseSalida)
async def registrar_llegada_qr(
    qr_id: UUID,
    zona_id: UUID,
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["SUPERVISOR_PARQUEROS", "PARQUERO", "ADMIN_BASE", "COMANDANTE"]))
):
    """
    El parquero registra la llegada de un vehículo a su zona leyendo un QR de pase.
    """
    try:
        vp = await parquero_service.registrar_llegada_qr(db, qr_id, zona_id, current_user.id)
        return vp
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/salida-qr/{qr_id}", response_model=VehiculoPaseSalida)
async def registrar_salida_zona(
    qr_id: UUID,
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["SUPERVISOR_PARQUEROS", "PARQUERO", "ADMIN_BASE", "COMANDANTE"]))
):
    """
    Registra la salida física del vehículo de la zona de estacionamiento y su liberación de puesto.
    """
    try:
        vp = await parquero_service.registrar_salida(db, qr_id)
        return vp
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ──────────────────────────────────────────────────────────────────────────────
# LLEGADA / SALIDA POR PLACA (MANUAL)
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/llegada-placa")
async def registrar_llegada_por_placa(
    placa: str = Body(..., embed=True),
    zona_id: UUID = Body(..., embed=True),
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["SUPERVISOR_PARQUEROS", "PARQUERO", "ADMIN_BASE", "COMANDANTE"]))
):
    """
    Registra la llegada de un vehículo ingresando la placa manualmente.
    Retorna:
      - sin_datos=False + datos del vehículo si existe en BD
      - sin_datos=True si no existe (el frontend debe mostrar formulario de registro)
    """
    try:
        return await parquero_service.registrar_llegada_placa(db, placa, zona_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/salida-placa")
async def registrar_salida_por_placa(
    placa: str = Body(..., embed=True),
    zona_id: UUID = Body(..., embed=True),
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["SUPERVISOR_PARQUEROS", "PARQUERO", "ADMIN_BASE", "COMANDANTE"]))
):
    """
    Registra la salida de un vehículo buscándolo por placa en la zona activa.
    """
    try:
        return await parquero_service.registrar_salida_placa(db, placa, zona_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ──────────────────────────────────────────────────────────────────────────────
# ASIGNACIÓN DE PUESTO
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/vehiculo-pase/{vehiculo_pase_id}/puesto/{puesto_id}", response_model=VehiculoPaseSalida)
async def asignar_puesto_vehiculo(
    vehiculo_pase_id: UUID,
    puesto_id: UUID,
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["SUPERVISOR_PARQUEROS", "PARQUERO", "ADMIN_BASE", "COMANDANTE"]))
):
    """
    El parquero u operario asigna o re-asigna un puesto físico al vehículo que ya se encuentra en la zona.
    """
    try:
        vp = await parquero_service.asignar_puesto(db, vehiculo_pase_id, puesto_id)
        return vp
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/completar-datos-portador")
async def completar_datos_portador(
    qr_id: UUID = Body(..., embed=True),
    vehiculo_pase_id: UUID = Body(..., embed=True),
    nombre: Optional[str] = Body(None, embed=True),
    cedula: Optional[str] = Body(None, embed=True),
    telefono: Optional[str] = Body(None, embed=True),
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["SUPERVISOR_PARQUEROS", "PARQUERO", "ADMIN_BASE", "COMANDANTE"]))
):
    """
    Guarda los datos del portador (nombre, cédula, teléfono) directamente en el
    CodigoQR correspondiente. NO toca la tabla de usuarios.
    Se usa cuando el vehículo tiene un pase activo pero sin datos de la persona.
    """
    try:
        return await parquero_service.completar_datos_portador(
            db, qr_id, vehiculo_pase_id, nombre, cedula, telefono
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))



@router.get("/zona/{zona_id}/trazabilidad")
async def obtener_trazabilidad_zona(
    zona_id: UUID,
    limite: int = 100,
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(require_rol(["SUPERVISOR_PARQUEROS", "PARQUERO", "ADMIN_BASE", "COMANDANTE"]))
):
    """
    Retorna el historial temporal de vehículos de la zona.
    Combina accesos de alcabala + ingresos/salidas de zona, ordenados por timestamp.
    """
    return await parquero_service.get_trazabilidad_zona(db, zona_id, limite)
