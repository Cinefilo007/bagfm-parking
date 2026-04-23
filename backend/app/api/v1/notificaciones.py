from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.core.database import obtener_db
from app.api.v1.auth import get_current_user
from app.models.usuario import Usuario
from app.models.push_subscription import PushSubscription
from app.schemas.push import PushSubscriptionCreate, PushSubscriptionSchema

router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])

@router.post("/suscribir", response_model=PushSubscriptionSchema)
async def suscribir_push(
    datos: PushSubscriptionCreate,
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Registra una suscripción push para el usuario actual"""
    # Verificar si ya existe para este dispositivo/endpoint
    query = select(PushSubscription).where(
        PushSubscription.usuario_id == current_user.id,
        PushSubscription.endpoint == datos.endpoint
    )
    result = await db.execute(query)
    existente = result.scalar_one_or_none()
    
    if existente:
        existente.p256dh = datos.p256dh
        existente.auth = datos.auth
        existente.dispositivo = datos.dispositivo
        existente.activo = True
        await db.commit()
        await db.refresh(existente)
        return existente
    
    nueva_sub = PushSubscription(
        usuario_id=current_user.id,
        endpoint=datos.endpoint,
        p256dh=datos.p256dh,
        auth=datos.auth,
        dispositivo=datos.dispositivo
    )
    db.add(nueva_sub)
    await db.commit()
    await db.refresh(nueva_sub)
    return nueva_sub

@router.delete("/desuscribir")
async def desuscribir_push(
    endpoint: str,
    db: AsyncSession = Depends(obtener_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Desactiva una suscripción push"""
    query = select(PushSubscription).where(
        PushSubscription.usuario_id == current_user.id,
        PushSubscription.endpoint == endpoint
    )
    result = await db.execute(query)
    sub = result.scalar_one_or_none()
    
    if sub:
        sub.activo = False
        await db.commit()
    
    return {"status": "ok"}
