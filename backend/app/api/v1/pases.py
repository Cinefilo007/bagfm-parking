from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from uuid import UUID

from app.core.database import obtener_db
from app.core.dependencias import obtener_usuario_actual, require_rol
from app.models.enums import RolTipo
from app.models.usuario import Usuario
from app.schemas.pases import LotePaseMasivoCrear, LotePaseMasivoSalida
from app.services.pase_service import pase_service
from app.services.template_service import template_service
from app.models.alcabala_evento import LotePaseMasivo, SolicitudEvento
from sqlalchemy import select

router = APIRouter()

# Roles autorizados para gestionar lotes masivos
ADMIN_ROLES = [RolTipo.COMANDANTE, RolTipo.ADMIN_BASE]

@router.post("/lotes", response_model=LotePaseMasivoSalida, status_code=status.HTTP_201_CREATED)
async def crear_lote(
    datos: LotePaseMasivoCrear,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(require_rol(ADMIN_ROLES))
):
    """Crea un lote masivo de pases simples o con portal."""
    return await pase_service.crear_lote(db, datos.model_dump(), usuario_actual.id)

@router.get("/lotes", response_model=List[LotePaseMasivoSalida])
async def listar_lotes(
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(require_rol(ADMIN_ROLES + [RolTipo.ALCABALA]))
):
    """Lista todos los lotes de pases masivos."""
    query = select(LotePaseMasivo).order_by(LotePaseMasivo.created_at.desc())
    res = await db.execute(query)
    return res.scalars().all()

@router.get("/lotes/{lote_id}", response_model=LotePaseMasivoSalida)
async def obtener_lote(
    lote_id: UUID,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(require_rol(ADMIN_ROLES + [RolTipo.ALCABALA]))
):
    """Obtiene detalle de un lote específico."""
    lote = await db.get(LotePaseMasivo, lote_id)
    if not lote:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    return lote

@router.post("/lotes/{lote_id}/generar-zip")
async def generar_zip_endpoint(
    lote_id: UUID,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(require_rol(ADMIN_ROLES))
):
    """Dispara la generación del ZIP y subida a Supabase."""
    # Esto puede ser asíncrono en background si el lote es muy grande
    # Por ahora se procesa directo para feedback inmediato
    url = await pase_service.generar_zip_lote(db, lote_id)
    if not url:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    return {"url": url}

@router.post("/lotes/{lote_id}/importar-excel")
async def importar_excel_lote(
    lote_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(require_rol(ADMIN_ROLES))
):
    """Importa identificaciones para un lote Tipo B."""
    lote = await db.get(LotePaseMasivo, lote_id)
    if not lote:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
        
    contenido = await file.read()
    await pase_service.procesar_excel_identificado(db, lote, contenido, usuario_actual.id)
    return {"status": "ok", "pases_generados": lote.cantidad_pases}

@router.get("/template", status_code=status.HTTP_200_OK)
async def descargar_plantilla_pases(
    usuario_actual: Usuario = Depends(require_rol(ADMIN_ROLES))
):
    """Descarga la plantilla Excel para pases identificados."""
    excel_data = template_service.generar_excel_pases_template()
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=TEMPLATE_PASES_IDENTIFICADOS.xlsx"
        }
    )
