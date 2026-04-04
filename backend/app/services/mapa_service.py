"""
Service para el Mapa Táctico (Async).
Agrega información de múltiples entidades para proporcionar una visión situacional completa.
"""
from datetime import date
from typing import Literal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from app.models.entidad_civil import EntidadCivil
from app.models.alcabala_evento import PuntoAcceso
from app.models.zona_estacionamiento import ZonaEstacionamiento
from app.models.acceso import Acceso
from app.models.infraccion import Infraccion
from app.models.enums import InfraccionEstado

async def get_situacion_actual(db: AsyncSession):
    hoy = date.today()
    
    # 1. Entidades Civiles + Ocupación Dinámica (Aproximada por accesos hoy)
    # Contamos vehículos que entraron hoy y no tienen salida posterior hoy (para usuarios de esa entidad)
    query_entidades = select(EntidadCivil).filter(EntidadCivil.activo == True)
    result_entidades = await db.execute(query_entidades)
    entidades = result_entidades.scalars().all()
    
    entidades_data = []
    for ent in entidades:
        # Simplificación: Contar cuántos miembros de esta entidad han entrado hoy
        from app.models.usuario import Usuario
        query_ocupacion = select(func.count(Acceso.id)).join(
            Usuario, Acceso.usuario_id == Usuario.id
        ).filter(
            Usuario.entidad_id == ent.id,
            Acceso.tipo == "entrada",
            func.date(Acceso.timestamp) == hoy
        )
        ocupacion = (await db.execute(query_ocupacion)).scalar() or 0
        
        ent_dict = {
            "id": ent.id,
            "nombre": ent.nombre,
            "latitud": ent.latitud,
            "longitud": ent.longitud,
            "capacidad_total": ent.capacidad_vehiculos,
            "ocupacion_actual": ocupacion
        }
        entidades_data.append(ent_dict)

    # 2. Alcabalas (Puntos de Acceso) + Estadísticas de Flujo
    query_alcabalas = select(PuntoAcceso).filter(PuntoAcceso.activo == True)
    result_alcabalas = await db.execute(query_alcabalas)
    alcabalas_objs = result_alcabalas.scalars().all()
    
    alcabalas_data = []
    for a in alcabalas_objs:
        # Flujo por nombre de punto de acceso
        q_ent = select(func.count(Acceso.id)).filter(
            Acceso.punto_acceso == a.nombre,
            Acceso.tipo == "entrada",
            func.date(Acceso.timestamp) == hoy
        )
        q_sal = select(func.count(Acceso.id)).filter(
            Acceso.punto_acceso == a.nombre,
            Acceso.tipo == "salida",
            func.date(Acceso.timestamp) == hoy
        )
        entradas = (await db.execute(q_ent)).scalar() or 0
        salidas = (await db.execute(q_sal)).scalar() or 0
        
        alcabalas_data.append({
            "id": a.id,
            "nombre": a.nombre,
            "latitud": a.latitud,
            "longitud": a.longitud,
            "entradas_hoy": entradas,
            "salidas_hoy": salidas
        })

    # 3. Zonas de Estacionamiento (Ya traen ocupacion_actual en el modelo)
    query_zonas = select(ZonaEstacionamiento).filter(ZonaEstacionamiento.activo == True)
    result_zonas = await db.execute(query_zonas)
    zonas = result_zonas.scalars().all()

    # 4. Globales
    query_vehiculos = select(func.count(Acceso.id)).filter(
        func.date(Acceso.timestamp) == hoy,
        Acceso.tipo == "entrada"
    )
    vehiculos_hoy = (await db.execute(query_vehiculos)).scalar() or 0

    query_alertas = select(func.count(Infraccion.id)).filter(
        Infraccion.estado == InfraccionEstado.activa
    )
    alertas_activas = (await db.execute(query_alertas)).scalar() or 0

    return {
        "entidades": entidades_data,
        "alcabalas": alcabalas_data,
        "zonas_estacionamiento": zonas,
        "vehiculos_hoy": vehiculos_hoy,
        "alertas_activas": alertas_activas
    }

async def actualizar_georreferencia(
    db: AsyncSession, 
    tipo: Literal['entidad', 'alcabala', 'zona'], 
    res_id: str, 
    lat: float, 
    lng: float
):
    """Actualiza la ubicación física de una entidad táctica en el mapa."""
    if tipo == 'entidad':
        obj = await db.get(EntidadCivil, res_id)
    elif tipo == 'alcabala':
        obj = await db.get(PuntoAcceso, res_id)
    elif tipo == 'zona':
        obj = await db.get(ZonaEstacionamiento, res_id)
    else:
        return False
    
    if obj:
        obj.latitud = lat
        obj.longitud = lng
        await db.commit()
        return True
    return False
