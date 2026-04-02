from typing import Optional, List
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict
from app.models.enums import SolicitudEstado

# --- Punto de Acceso (Alcabala) ---
class PuntoAccesoBase(BaseModel):
    nombre: str
    ubicacion: Optional[str] = None

class PuntoAccesoCrear(PuntoAccesoBase):
    pass

class PuntoAccesoSalida(PuntoAccesoBase):
    id: UUID
    activo: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Guardia Temporal ---
class GuardiaTemporalCrear(BaseModel):
    cedula: str
    nombre: str
    apellido: str

class GuardiaTemporalSalida(BaseModel):
    usuario_id: UUID
    cedula: str
    nombre_completo: str
    password_temporal: str
    expira_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Solicitud de Evento (Pases Masivos) ---
class SolicitudEventoBase(BaseModel):
    nombre_evento: str
    fecha_evento: date
    cantidad_solicitada: int
    motivo: str

class SolicitudEventoCrear(SolicitudEventoBase):
    entidad_id: UUID

class SolicitudEventoProcesar(BaseModel):
    cantidad_aprobada: int
    estado: SolicitudEstado # aprobada, aprobada_parcial, denegada
    motivo_rechazo: Optional[str] = None

class SolicitudEventoSalida(SolicitudEventoBase):
    id: UUID
    entidad_id: UUID
    solicitado_por: UUID
    cantidad_aprobada: Optional[int] = None
    estado: SolicitudEstado
    revisado_por: Optional[UUID] = None
    motivo_rechazo: Optional[str] = None
    created_at: datetime
    revisado_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)
