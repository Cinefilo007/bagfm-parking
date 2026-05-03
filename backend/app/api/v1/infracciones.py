from fastapi import APIRouter, Depends, HTTPException, status, Form, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from uuid import UUID
from app.models.usuario import Usuario
from app.models.infraccion import Infraccion
from app.models.enums import RolTipo, InfraccionTipo, GravedadInfraccion

from app.core.database import obtener_db
from app.core.dependencias import obtener_usuario_actual, require_rol
from app.schemas.infraccion import InfraccionCrear, InfraccionSalida, InfraccionResolver
from app.services.infraccion_service import infraccion_service

router = APIRouter()

# Solo SUPERVISOR, ADMIN_BASE o COMANDANTE pueden registrar infracciones
DEPENDENCY_SUPERVISOR = Depends(require_rol([RolTipo.SUPERVISOR, RolTipo.ADMIN_BASE, RolTipo.COMANDANTE]))

@router.get("/me", response_model=List[InfraccionSalida])
async def mis_infracciones(
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(require_rol([RolTipo.SOCIO]))
):
    """
    Retorna las infracciones del socio autenticado.
    """
    from app.models.vehiculo import Vehiculo
    # Obtener IDs de vehículos del socio
    res_vehs = await db.execute(select(Vehiculo.id).where(Vehiculo.socio_id == usuario_actual.id))
    vehiculo_ids = [r[0] for r in res_vehs.all()]

    if not vehiculo_ids:
        return []

    query = select(Infraccion).where(Infraccion.vehiculo_id.in_(vehiculo_ids)).order_by(Infraccion.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("", response_model=List[InfraccionSalida])
async def listar_infracciones(
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    """
    Lista todas las infracciones (historial completo).
    """
    query = select(Infraccion)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/activas", response_model=List[InfraccionSalida])
async def listar_infracciones_activas(
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    """
    Lista las infracciones que aún no han sido resueltas.
    """
    return await infraccion_service.obtener_activas(db)

@router.post("", response_model=InfraccionSalida, status_code=status.HTTP_201_CREATED)
async def registrar_infraccion(
    tipo: InfraccionTipo = Form(...),
    gravedad: GravedadInfraccion = Form(GravedadInfraccion.leve),
    descripcion: str = Form(...),
    vehiculo_placa: Optional[str] = Form(None),
    zona_id: Optional[UUID] = Form(None),
    bloquea_salida: bool = Form(True),
    bloquea_acceso_futuro: bool = Form(False),
    archivos: List[UploadFile] = File(None),
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = DEPENDENCY_SUPERVISOR
):
    """
    Registra una nueva infracción con soporte para evidencias fotográficas.
    """
    # 1. Subir archivos si existen
    urls_evidencia = []
    if archivos:
        # Filtrar solo archivos con contenido
        files_to_upload = [f for f in archivos if f.size > 0]
        if files_to_upload:
            from app.services.storage_service import storage_service
            urls_evidencia = await storage_service.subir_multiples_evidencias(files_to_upload[:3]) # Max 3

    # 2. Buscar vehiculo por placa si se proporcionó
    vehiculo_id = None
    if vehiculo_placa:
        from app.models.vehiculo import Vehiculo
        stmt = select(Vehiculo).where(Vehiculo.placa == vehiculo_placa.upper())
        res = await db.execute(stmt)
        vehiculo = res.scalar_one_or_none()
        if vehiculo:
            vehiculo_id = vehiculo.id

    # 3. Mapear a objeto Crear (o pasar directamente al service)
    datos_dict = {
        "tipo": tipo,
        "gravedad": gravedad,
        "descripcion": descripcion,
        "vehiculo_id": vehiculo_id,
        "zona_id": zona_id,
        "bloquea_salida": bloquea_salida,
        "bloquea_acceso_futuro": bloquea_acceso_futuro,
        "fotos_evidencia": urls_evidencia
    }
    
    # Adaptación rápida para no cambiar la firma del service drásticamente si no es necesario
    from app.schemas.infraccion import InfraccionCrear
    datos = InfraccionCrear(**datos_dict)
    
    return await infraccion_service.registrar(db, datos, usuario_actual.id)

@router.post("/{id}/resolver", response_model=InfraccionSalida)
async def resolver_infraccion(
    id: UUID,
    datos: InfraccionResolver,
    db: AsyncSession = Depends(obtener_db),
    usuario_actual: Usuario = Depends(require_rol([RolTipo.ADMIN_BASE, RolTipo.COMANDANTE, RolTipo.SUPERVISOR_PARQUEROS, RolTipo.ADMIN_ENTIDAD, RolTipo.SUPERVISOR]))
):
    """
    Resuelve o perdona una infracción.
    Supervisores de parqueros y Admin de Entidad solo pueden resolver faltas leves.
    """
    try:
        return await infraccion_service.resolver(db, id, datos, usuario_actual)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN if "permisos" in str(e).lower() else status.HTTP_404_NOT_FOUND, detail=str(e))
