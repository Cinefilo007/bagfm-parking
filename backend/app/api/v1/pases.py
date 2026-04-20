from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from uuid import UUID

from app.core.database import obtener_db
from app.core.dependencias import obtener_usuario_actual, require_rol
from app.models.enums import RolTipo
from app.models.usuario import Usuario
from app.schemas.pases import LotePaseMasivoCrear, LotePaseMasivoSalida
from app.schemas.codigo_qr import CodigoQRSalida, CodigoQRUpdate
from app.services.pase_service import pase_service
from app.services.template_service import template_service
from app.models.alcabala_evento import LotePaseMasivo, SolicitudEvento
from app.models.codigo_qr import CodigoQR
from sqlalchemy import select

router = APIRouter()

# Roles autorizados para gestionar lotes masivos
ADMIN_ROLES = [RolTipo.COMANDANTE, RolTipo.ADMIN_BASE, RolTipo.ADMIN_ENTIDAD]

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
    from sqlalchemy.orm import selectinload
    query = select(LotePaseMasivo).options(
        selectinload(LotePaseMasivo.zona_asignada),
        selectinload(LotePaseMasivo.tipo_acceso_custom)
    ).order_by(LotePaseMasivo.created_at.desc())
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

@router.get("/lotes/{lote_id}/pases", response_model=List[CodigoQRSalida])
async def listar_pases_lote(
    lote_id: UUID,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(require_rol(ADMIN_ROLES + [RolTipo.ALCABALA]))
):
    """Lista los pases individuales de un lote (Drill-down)."""
    query = select(CodigoQR).where(CodigoQR.lote_id == lote_id).order_by(CodigoQR.serial_legible.asc())
    res = await db.execute(query)
    return res.scalars().all()

@router.post("/lotes/{lote_id}/generar-zip")
async def generar_zip_endpoint(
    lote_id: UUID,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(require_rol(ADMIN_ROLES))
):
    """Dispara la generación del ZIP y subida a Supabase."""
    url = await pase_service.generar_zip_lote(db, lote_id)
    if not url:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    return {"url": url}

@router.get("/lotes/{lote_id}/pdf")
async def generar_pdf_lote(
    lote_id: UUID,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(require_rol(ADMIN_ROLES + [RolTipo.ALCABALA]))
):
    """Genera (o recupera) el PDF masivo del lote para descarga inmediata."""
    lote = await db.get(LotePaseMasivo, lote_id)
    if not lote:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    
    from fastapi.responses import StreamingResponse
    from app.services.pdf_service import pdf_service
    
    # Generamos el buffer en memoria
    pdf_buffer = await pdf_service.generar_pdf_lote(db, lote_id)
    
    # Intentamos subirlo en segundo plano (opcional) para persistencia
    import asyncio
    asyncio.create_task(pase_service.generar_pdf_masivo(db, lote_id))
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=PASES_{lote.codigo_serial}.pdf"
        }
    )

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

@router.post("/lotes/{lote_id}/importar-json")
async def importar_json_lote(
    lote_id: UUID,
    payload: dict,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(require_rol(ADMIN_ROLES))
):
    """Importa identificaciones para un lote Tipo B desde JSON prevalidado en el Frontend."""
    lote = await db.get(LotePaseMasivo, lote_id)
    if not lote:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
        
    filas = payload.get("pases", [])
    await pase_service.procesar_json_identificado(db, lote, filas, usuario_actual.id)
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
@router.patch("/{pase_id}", response_model=CodigoQRSalida)
async def actualizar_pase(
    pase_id: UUID,
    datos: CodigoQRUpdate,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(require_rol(ADMIN_ROLES))
):
    """Actualiza datos de un pase individual."""
    pase = await pase_service.actualizar_pase(db, pase_id, datos.model_dump(exclude_unset=True))
    if not pase:
        raise HTTPException(status_code=404, detail="Pase no encontrado")
    return pase

@router.delete("/lotes/{lote_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_lote(
    lote_id: UUID,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(require_rol(ADMIN_ROLES))
):
    """Elimina un lote y todos sus recursos asociados."""
    exito = await pase_service.eliminar_lote(db, lote_id)
    if not exito:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
