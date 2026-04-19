from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.enums import EstadoPuesto

class PuestoEstacionamientoBase(BaseModel):
    numero_puesto: str
    estado: EstadoPuesto = EstadoPuesto.libre
    reservado_base: bool = False
    reservado_entidad_id: Optional[UUID] = None

class PuestoEstacionamientoCrear(PuestoEstacionamientoBase):
    pass

class PuestoEstacionamientoSalida(PuestoEstacionamientoBase):
    id: UUID
    zona_id: UUID
    vehiculo_actual_id: Optional[UUID] = None
    qr_actual_id: Optional[UUID] = None
    ocupado_desde: Optional[datetime] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
