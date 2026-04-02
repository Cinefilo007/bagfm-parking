from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from uuid import UUID

from app.core.database import obtener_db
from app.core.dependencias import obtener_usuario_actual, require_rol
from app.models.enums import RolTipo
from app.models.usuario import Usuario
from app.schemas.socio import SocioCrear, SocioSalida
from app.services.socio_service import socio_service
from app.services.import_service import import_service
from app.services.template_service import template_service

router = APIRouter()

# Roles que pueden gestionar socios
GESTORES_SOCIOS = [RolTipo.COMANDANTE, RolTipo.ADMIN_BASE, RolTipo.ADMIN_ENTIDAD]

@router.post("/", response_model=SocioSalida, status_code=status.HTTP_201_CREATED)
async def crear_socio(
    datos: SocioCrear,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(require_rol(GESTORES_SOCIOS))
):
    """
    Registra un nuevo socio y su membresía inicial.
    Si el usuario es ADMIN_ENTIDAD, solo puede registrar socios para su propia entidad.
    """
    if usuario_actual.rol == RolTipo.ADMIN_ENTIDAD:
        if usuario_actual.entidad_id != datos.entidad_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes registrar socios para una entidad ajena"
            )
    
    return await socio_service.crear_socio_con_membresia(db, datos, usuario_actual.id)

@router.get("/entidad/{entidad_id}", response_model=List[SocioSalida])
async def listar_socios_por_entidad(
    entidad_id: UUID,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(require_rol(GESTORES_SOCIOS))
):
    """
    Lista todos los socios vinculados a una entidad específica.
    Si el usuario es ADMIN_ENTIDAD, solo puede ver los socios de su propia entidad.
    """
    if usuario_actual.rol == RolTipo.ADMIN_ENTIDAD:
        if usuario_actual.entidad_id != entidad_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para ver los socios de esta entidad"
            )
            
    return await socio_service.obtener_socios_entidad(db, entidad_id)

@router.post("/importar", status_code=status.HTTP_200_OK)
async def importar_socios_excel(
    entidad_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(require_rol(GESTORES_SOCIOS))
):
    """
    Importa socios masivamente desde un archivo Excel (.xlsx).
    """
    if usuario_actual.rol == RolTipo.ADMIN_ENTIDAD:
        if usuario_actual.entidad_id != entidad_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes importar socios para una entidad ajena"
            )
            
    try:
        contenido = await file.read()
        resultado = await import_service.procesar_excel_socios(
            db, contenido, entidad_id, usuario_actual.id
        )
        return resultado
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/template", status_code=status.HTTP_200_OK)
async def descargar_plantilla_socios(
    usuario_actual: Usuario = Depends(require_rol(GESTORES_SOCIOS))
):
    """
    Descarga la plantilla Excel (.xlsx) con los encabezados para importar socios.
    """
    excel_data = template_service.generar_excel_socios_template()
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=TEMPLATE_SOCIOS_BAGFM.xlsx"
        }
    )
