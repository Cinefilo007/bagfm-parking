"""
Service para el Mapa Táctico (Async).
Agrega información de múltiples entidades para proporcionar una visión situacional completa.
"""
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from app.models.entidad_civil import EntidadCivil
from app.models.alcabala_evento import PuntoAcceso
from app.models.zona_estacionamiento import ZonaEstacionamiento
from app.models.acceso import Acceso
from app.models.infraccion import Infraccion
from app.models.enums import InfraccionEstado

async def get_situacion_actual(db: AsyncSession):
    # 1. Entidades Civiles (Donde lat/long no sea null)
    query_entidades = select(EntidadCivil).filter(EntidadCivil.activo == True)
    result_entidades = await db.execute(query_entidades)
    entidades = result_entidades.scalars().all()

    # 2. Alcabalas (Puntos de Acceso)
    query_alcabalas = select(PuntoAcceso).filter(PuntoAcceso.activo == True)
    result_alcabalas = await db.execute(query_alcabalas)
    alcabalas = result_alcabalas.scalars().all()

    # 3. Zonas de Estacionamiento
    query_zonas = select(ZonaEstacionamiento).filter(ZonaEstacionamiento.activo == True)
    result_zonas = await db.execute(query_zonas)
    zonas = result_zonas.scalars().all()

    # 4. Vehículos registrados hoy (Entradas)
    hoy = date.today()
    query_vehiculos = select(func.count(Acceso.id)).filter(
        func.date(Acceso.timestamp) == hoy,
        Acceso.tipo == "entrada"
    )
    vehiculos_hoy = (await db.execute(query_vehiculos)).scalar() or 0

    # 5. Alertas Activas (Infracciones sin resolver)
    query_alertas = select(func.count(Infraccion.id)).filter(
        Infraccion.estado == InfraccionEstado.activa
    )
    alertas_activas = (await db.execute(query_alertas)).scalar() or 0

    return {
        "entidades": entidades,
        "alcabalas": alcabalas,
        "zonas_estacionamiento": zonas,
        "vehiculos_hoy": vehiculos_hoy,
        "alertas_activas": alertas_activas
    }
