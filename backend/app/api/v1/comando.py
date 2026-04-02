"""
API Endpoints para el Comandante de la Unidad.
Gestión de Alcabalas y Usuarios Temporales.
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import obtener_db
from app.core.dependencias import obtener_usuario_actual
from app.models.usuario import Usuario
from app.models.enums import RolTipo
# Importar esquemas locales para evitar circulares
from app.schemas.alcabala_evento import (
    PuntoAccesoCrear, PuntoAccesoSalida, 
    GuardiaTemporalCrear, GuardiaTemporalSalida
)
from app.services.alcabala_mgmt_service import alcabala_mgmt_service

router = APIRouter()

def verificar_comandante(usuario: Usuario = Depends(obtener_usuario_actual)):
    if usuario.rol not in [RolTipo.COMANDANTE, RolTipo.ADMIN_BASE]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el Comandante o Administrador de Base pueden realizar esta acción"
        )
    return usuario

@router.post("/puntos-acceso", response_model=PuntoAccesoSalida)
async def crear_punto(
    datos: PuntoAccesoCrear,
    db: AsyncSession = Depends(obtener_db),
    _ = Depends(verificar_comandante)
):
    """Registra una nueva alcabala física en el sistema."""
    return await alcabala_mgmt_service.crear_punto_acceso(db, datos.nombre, datos.ubicacion)

@router.get("/puntos-acceso", response_model=List[PuntoAccesoSalida])
async def listar_puntos(
    db: AsyncSession = Depends(obtener_db),
    _ = Depends(obtener_usuario_actual)
):
    """Lista todos los puntos de acceso activos."""
    return await alcabala_mgmt_service.listar_puntos(db)

@router.post("/guardias-temporales", response_model=GuardiaTemporalSalida)
async def crear_guardia(
    datos: GuardiaTemporalCrear,
    db: AsyncSession = Depends(obtener_db),
    _ = Depends(verificar_comandante)
):
    """
    Crea un usuario temporal para una guardia de 24h.
    Retorna la credencial temporal.
    """
    res = await alcabala_mgmt_service.crear_guardia_temporal(
        db, datos.cedula, datos.nombre, datos.apellido
    )
    usuario = res["usuario"]
    return GuardiaTemporalSalida(
        usuario_id=usuario.id,
        cedula=usuario.cedula,
        nombre_completo=f"{usuario.nombre} {usuario.apellido}",
        password_temporal=res["password_temporal"],
        expira_at=res["expira_at"]
    )

@router.post("/limpiar-guardias")
async def limpiar_guardias(
    db: AsyncSession = Depends(obtener_db),
    _ = Depends(verificar_comandante)
):
    """Endpoint manual para forzar la desactivación de guardias pasados."""
    total = await alcabala_mgmt_service.limpiar_guardias_expirados(db)
    return {"mensaje": f"Se han desactivado {total} guardias expirados"}
