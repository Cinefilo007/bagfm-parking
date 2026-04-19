from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import List

from app.core.database import obtener_db
from app.core.dependencias import obtener_usuario_actual, require_rol
from app.models.usuario import Usuario
from app.services.parquero_service import parquero_service
from app.schemas.pases import VehiculoPaseSalida
from app.schemas.vehiculo import VehiculoBase

router = APIRouter(prefix="/parqueros", tags=["Parqueros Operaciones"])

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
