from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AsignacionZonaBase(BaseModel):
    entidad_id: UUID
    capacidad_asignada: int
    activa: bool = True
    fecha_fin: Optional[datetime] = None

class AsignacionZonaCrear(AsignacionZonaBase):
    zona_id: UUID

class AsignacionZonaSalida(AsignacionZonaBase):
    id: UUID
    zona_id: UUID
    fecha_inicio: datetime
    
    model_config = ConfigDict(from_attributes=True)
