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
    GuardiaTurnoCrear, GuardiaTurnoSalida,
    PersonalActivoSalida
)
from app.services.alcabala_mgmt_service import alcabala_service

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
    """Registra una nueva alcabala física y crea su usuario fijo."""
    return await alcabala_service.crear_punto_acceso(db, datos.nombre, datos.ubicacion)

@router.get("/puntos-acceso", response_model=List[PuntoAccesoSalida])
@router.get("/alcabalas", response_model=List[PuntoAccesoSalida])
async def listar_puntos(
    db: AsyncSession = Depends(obtener_db),
    _ = Depends(obtener_usuario_actual)
):
    """Lista todos los puntos de acceso operativos con sus claves."""
    return await alcabala_service.listar_puntos(db)

@router.patch("/puntos-acceso/{id}", response_model=PuntoAccesoSalida)
async def actualizar_punto(
    id: UUID,
    datos: PuntoAccesoCrear,
    db: AsyncSession = Depends(obtener_db),
    _ = Depends(verificar_comandante)
):
    """Actualiza datos básicos de la alcabala."""
    punto = await alcabala_service.actualizar_punto_acceso(db, id, datos.nombre, datos.ubicacion)
    if not punto:
        raise HTTPException(status_code=404, detail="Punto no encontrado")
    return punto

@router.delete("/puntos-acceso/{id}")
async def eliminar_punto(
    id: UUID,
    db: AsyncSession = Depends(obtener_db),
    _ = Depends(verificar_comandante)
):
    """Elimina definitivamente una alcabala y su usuario asociado."""
    exito = await alcabala_service.eliminar_punto_acceso(db, id)
    if not exito:
        raise HTTPException(status_code=404, detail="Punto no encontrado")
    return {"mensaje": "Alcabala desarticulada del sistema con éxito"}

@router.post("/puntos-acceso/{id}/regenerar-clave")
async def regenerar_clave(
    id: UUID,
    db: AsyncSession = Depends(obtener_db),
    _ = Depends(verificar_comandante)
):
    """Fuerza un cambio de clave táctica por regeneración de salt."""
    clave = await alcabala_service.regenerar_clave_emergencia(db, id)
    if not clave:
        raise HTTPException(status_code=404, detail="Punto no encontrado")
    return {"nueva_clave": clave}

@router.get("/personal-activo", response_model=List[PersonalActivoSalida])
async def listar_personal_activo(
    db: AsyncSession = Depends(obtener_db),
    _ = Depends(verificar_comandante)
):
    """Panel del Comandante: Quién está operando cada punto ahora mismo."""
    return await alcabala_service.listar_personal_activo_mando(db)

@router.get("/mi-situacion")
async def obtener_situacion_actual(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """
    Retorna el estado del guardia: Punto asignado y si ya se identificó.
    """
    punto = await alcabala_service.obtener_punto_de_usuario(db, usuario.id)
    if not punto:
        raise HTTPException(status_code=404, detail="Usuario no vinculado a una alcabala fija")
    
    identificacion = await alcabala_service.obtener_mi_identificacion_actual(db, usuario.id)

    # Estadísticas para el dashboard del guardia
    from datetime import date
    from sqlalchemy import func, Date
    from app.models.acceso import Acceso
    
    hoy = date.today()
    q_ent = select(func.count(Acceso.id)).filter(
        Acceso.punto_acceso == punto.nombre,
        Acceso.tipo == "entrada",
        func.cast(Acceso.timestamp, Date) == hoy
    )
    q_sal = select(func.count(Acceso.id)).filter(
        Acceso.punto_acceso == punto.nombre,
        Acceso.tipo == "salida",
        func.cast(Acceso.timestamp, Date) == hoy
    )
    entradas = (await db.execute(q_ent)).scalar() or 0
    salidas = (await db.execute(q_sal)).scalar() or 0
    
    return {
        "punto": {
            "id": punto.id,
            "nombre": punto.nombre,
            "ubicacion": punto.ubicacion
        },
        "identificado": identificacion is not None,
        "datos_guardia": identificacion,
        "stats": {
            "entradas": entradas,
            "salidas": salidas,
            "infracciones": 0
        }
    }

@router.post("/identificar-guardia", response_model=GuardiaTurnoSalida)
async def identificar_guardia(
    datos: GuardiaTurnoCrear,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """
    Protocolo mandatorio de identificación: 
    El guardia registra su ingreso físico a la alcabala.
    """
    if usuario.rol != RolTipo.ALCABALA:
        raise HTTPException(status_code=403, detail="Esta acción es solo para el personal en alcabala")
        
    return await alcabala_service.identificar_guardia_entrante(db, datos.punto_id, usuario.id, datos.model_dump())
