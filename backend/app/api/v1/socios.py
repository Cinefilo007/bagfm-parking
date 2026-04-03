from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from uuid import UUID

from app.core.database import obtener_db
from app.core.dependencias import obtener_usuario_actual, require_rol
from app.models.enums import RolTipo, MembresiaEstado
from app.models.usuario import Usuario
from app.schemas.socio import SocioCrear, SocioSalida, SocioPortal
from app.services.socio_service import socio_service
from app.services.membresia_service import membresia_service
from app.services.import_service import import_service
from app.services.template_service import template_service
from app.models.entidad_civil import EntidadCivil
from app.models.membresia import Membresia
from sqlalchemy import select

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
@router.get("/me/portal", response_model=SocioPortal)
async def obtener_portal_socio(
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(require_rol([RolTipo.SOCIO]))
):
    """
    Obtiene los datos para el portal del socio logueado.
    """
    # Buscar su membresía activa y QR
    query_mem = select(Membresia).where(Membresia.socio_id == usuario_actual.id).order_by(Membresia.created_at.desc())
    res_mem = await db.execute(query_mem)
    membresia = res_mem.scalars().first()
    
    if not membresia:
        raise HTTPException(status_code=404, detail="Membresía no encontrada")
        
    # Buscar su QR activo
    from app.models.codigo_qr import CodigoQR
    query_qr = select(CodigoQR).where(CodigoQR.usuario_id == usuario_actual.id, CodigoQR.activo == True)
    res_qr = await db.execute(query_qr)
    qr = res_qr.scalars().first()
    
    if not qr:
        # Generar uno al vuelo si no existe
        qr = await membresia_service.refrescar_qr_socio(db, usuario_actual.id, membresia.id, usuario_actual.id)
        await db.commit()

    # Obtener nombre de la entidad
    query_ent = select(EntidadCivil.nombre).where(EntidadCivil.id == usuario_actual.entidad_id)
    res_ent = await db.execute(query_ent)
    nombre_entidad = res_ent.scalar() or "BAGFM"

    # Construir perfil
    progreso = membresia_service.calcular_progreso(membresia)
    
    return {
        "perfil": {
            "id": usuario_actual.id,
            "cedula": usuario_actual.cedula,
            "nombre": usuario_actual.nombre,
            "apellido": usuario_actual.apellido,
            "nombre_completo": usuario_actual.nombre_completo,
            "email": usuario_actual.email,
            "telefono": usuario_actual.telefono,
            "activo": usuario_actual.activo,
            "rol": usuario_actual.rol,
            "entidad_id": usuario_actual.entidad_id,
            "debe_cambiar_password": usuario_actual.debe_cambiar_password,
            "created_at": usuario_actual.created_at,
            "membresia": {
                "id": membresia.id,
                "estado": membresia.estado,
                "fecha_inicio": membresia.fecha_inicio,
                "fecha_fin": membresia.fecha_fin,
                "progreso": progreso
            }
        },
        "qr_token": qr.token,
        "nombre_entidad": nombre_entidad
    }

@router.post("/{socio_id}/renovar", status_code=status.HTTP_200_OK)
async def renovar_membresia_socio(
    socio_id: UUID,
    meses: int = 1,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(require_rol(GESTORES_SOCIOS))
):
    """
    Renueva la membresía de un socio por N meses.
    """
    return await membresia_service.renovar_membresia(db, socio_id, meses, usuario_actual.id)

@router.post("/{socio_id}/estado", status_code=status.HTTP_200_OK)
async def cambiar_estado_socio(
    socio_id: UUID,
    estado: MembresiaEstado,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(require_rol(GESTORES_SOCIOS))
):
    """
    Cambia el estado de la membresía (suspender, exonerar, activar).
    """
    return await membresia_service.cambiar_estado(db, socio_id, estado)
