from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.enums import InfraccionTipo, InfraccionEstado

class InfraccionBase(BaseModel):
    vehiculo_id: UUID
    usuario_id: UUID
    tipo: InfraccionTipo
    descripcion: str
    foto_url: Optional[str] = None
    bloquea_salida: bool = True

class InfraccionCrear(InfraccionBase):
    pass

class InfraccionResolver(BaseModel):
    estado: InfraccionEstado
    observaciones_resolucion: str

class InfraccionSalida(InfraccionBase):
    id: UUID
    reportado_por: UUID
    estado: InfraccionEstado
    resuelta_por: Optional[UUID] = None
    resuelta_at: Optional[datetime] = None
    observaciones_resolucion: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
