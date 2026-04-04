from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ZonaEstacionamientoBase(BaseModel):
    nombre: str
    capacidad_total: int
    descripcion_ubicacion: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    radio_cobertura: int = 50
    activo: bool = True

class ZonaEstacionamientoCrear(ZonaEstacionamientoBase):
    pass

class ZonaEstacionamientoSalida(ZonaEstacionamientoBase):
    id: UUID
    ocupacion_actual: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
