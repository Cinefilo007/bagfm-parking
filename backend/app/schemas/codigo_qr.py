from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.enums import QRTipo

class CodigoQRBase(BaseModel):
    tipo: QRTipo
    activo: bool = True

class CodigoQRCrear(CodigoQRBase):
    usuario_id: UUID
    vehiculo_id: Optional[UUID] = None
    membresia_id: Optional[UUID] = None
    solicitud_id: Optional[UUID] = None
    fecha_expiracion: Optional[datetime] = None

class CodigoQRSalida(CodigoQRBase):
    id: UUID
    usuario_id: UUID
    vehiculo_id: Optional[UUID] = None
    token: str
    fecha_expiracion: Optional[datetime] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
