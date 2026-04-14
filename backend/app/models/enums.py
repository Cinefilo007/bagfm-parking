"""
Definición de Enums comunes para la aplicación.
Mapean directamente a los ENUM de PostgreSQL.
"""
import enum

class RolTipo(str, enum.Enum):
    COMANDANTE = "COMANDANTE"
    ADMIN_BASE = "ADMIN_BASE"
    SUPERVISOR = "SUPERVISOR"
    ALCABALA = "ALCABALA"
    ADMIN_ENTIDAD = "ADMIN_ENTIDAD"
    PARQUERO = "PARQUERO"
    SOCIO = "SOCIO"

class MembresiaEstado(str, enum.Enum):
    activa = "activa"
    suspendida = "suspendida"
    vencida = "vencida"
    exonerada = "exonerada"

class PasseTipo(str, enum.Enum):
    simple = "simple"           # Tipo A
    identificado = "identificado" # Tipo B
    portal = "portal"           # Tipo C

class QRTipo(str, enum.Enum):
    permanente = "permanente"
    temporal = "temporal"
    evento_simple = "evento_simple"
    evento_identificado = "evento_identificado"
    evento_portal = "evento_portal"

class AccesoTipo(str, enum.Enum):
    entrada = "entrada"
    salida = "salida"

class InfraccionTipo(str, enum.Enum):
    mal_estacionado = "mal_estacionado"
    exceso_velocidad = "exceso_velocidad"
    conducta_indebida = "conducta_indebida"
    documentos_vencidos = "documentos_vencidos"
    otro = "otro"

class InfraccionEstado(str, enum.Enum):
    activa = "activa"
    resuelta = "resuelta"
    perdonada = "perdonada"

class SolicitudEstado(str, enum.Enum):
    pendiente = "pendiente"
    aprobada = "aprobada"
    aprobada_parcial = "aprobada_parcial"
    denegada = "denegada"
