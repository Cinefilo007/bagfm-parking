"""
Service para el Mapa Táctico.
Agrega información de múltiples entidades para proporcionar una visión situacional completa.
"""
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.entidad_civil import EntidadCivil
from app.models.alcabala_evento import PuntoAcceso
from app.models.zona_estacionamiento import ZonaEstacionamiento
from app.models.acceso import Acceso
from app.models.infraccion import Infraccion
from app.models.enums import InfraccionEstado

def get_situacion_actual(db: Session):
    # 1. Entidades Civiles (Donde lat/long no sea null)
    entidades = db.query(EntidadCivil).filter(EntidadCivil.activo == True).all()

    # 2. Alcabalas (Puntos de Acceso)
    alcabalas = db.query(PuntoAcceso).filter(PuntoAcceso.activo == True).all()

    # 3. Zonas de Almacenamiento/Estacionamiento
    zonas = db.query(ZonaEstacionamiento).filter(ZonaEstacionamiento.activo == True).all()

    # 4. Vehículos registrados hoy (Entradas)
    # Suponiendo que la tabla Acceso tiene un timestamp
    hoy = date.today()
    vehiculos_hoy = db.query(func.count(Acceso.id)).filter(
        func.date(Acceso.timestamp) == hoy,
        Acceso.tipo == "entrada"
    ).scalar() or 0

    # 5. Alertas Activas (Infracciones sin resolver)
    alertas_activas = db.query(func.count(Infraccion.id)).filter(
        Infraccion.estado == InfraccionEstado.activa
    ).scalar() or 0

    return {
        "entidades": entidades,
        "alcabalas": alcabalas,
        "zonas_estacionamiento": zonas,
        "vehiculos_hoy": vehiculos_hoy,
        "alertas_activas": alertas_activas
    }
