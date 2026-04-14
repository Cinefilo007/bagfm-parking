from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.enums import AccesoTipo
from app.schemas.usuario import UsuarioSalida
from app.schemas.vehiculo import VehiculoSalida
from app.schemas.socio import MembresiaInfo

class AccesoBase(BaseModel):
    tipo: AccesoTipo
    punto_acceso: str = "Alcabala Principal"

class AccesoValidar(BaseModel):
    """Esquema para cuando el guardia escanea el QR"""
    qr_token: str
    tipo: AccesoTipo

class AccesoRegistrar(BaseModel):
    """Confirmación final del acceso"""
    qr_id: Optional[UUID] = None
    usuario_id: Optional[UUID] = None # Puede ser nulo si es 100% manual inicial
    vehiculo_id: Optional[UUID] = None
    tipo: AccesoTipo
    punto_acceso: str = "Alcabala Principal"
    es_manual: bool = False

    # Datos manuales de contingencia
    nombre_manual: Optional[str] = None
    cedula_manual: Optional[str] = None
    vehiculo_manual: Optional[str] = None

class AccesoSalida(AccesoBase):
    id: UUID
    usuario_id: UUID
    vehiculo_id: Optional[UUID] = None
    registrado_por: UUID
    es_manual: bool
    timestamp: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ResultadoValidacion(BaseModel):
    """Datos que se muestran al guardia tras escanear un QR"""
    permitido: bool
    mensaje: str
    tipo_alerta: Optional[str] = "info" # info, warning, error
    
    # Datos para la ficha
    socio: Optional[UsuarioSalida] = None
    vehiculo: Optional[VehiculoSalida] = None
    entidad_nombre: Optional[str] = None
    
    # IDs para el registro posterior
    qr_id: Optional[UUID] = None
    usuario_id: Optional[UUID] = None
    vehiculo_id: Optional[UUID] = None
    
    # Si hay infracciones relevantes
    infracciones_activas: List[dict] = []
    membresia_info: Optional[MembresiaInfo] = None
    ultima_entrada: Optional[datetime] = None
    ultima_entrada_punto: Optional[str] = None
    mensaje_adicional: Optional[str] = None
    
    # Flags de contingencia
    requiere_datos_manuales: bool = False
    es_pase_adelantado: bool = False


class EventoTactico(BaseModel):
    id: UUID
    tipo: str
    timestamp: datetime
    usuario: str
    vehiculo: str
    punto: str
    es_manual: bool

class PaginatedEventos(BaseModel):
    items: List[EventoTactico]
    total: int
    page: int
    size: int
