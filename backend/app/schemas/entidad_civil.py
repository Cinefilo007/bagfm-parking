from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class EntidadCivilBase(BaseModel):
    nombre: str
    codigo_slug: Optional[str] = Field(default=None)
    zona_id: Optional[UUID] = None
    capacidad_vehiculos: int = 1
    descripcion: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    activo: bool = True

class EntidadCivilCrear(EntidadCivilBase):
    # Datos del Administrador de la Entidad
    admin_cedula: str
    admin_nombre: str
    admin_apellido: str
    admin_email: str
    admin_password: str

class EntidadCivilSalida(EntidadCivilBase):
    id: UUID
    codigo_slug: str # En la salida siempre vendrá el slug
    created_at: datetime
    created_by: Optional[UUID] = None
    
    # Métricas Operativas (Opcionales dependiendo del endpoint)
    total_usuarios: Optional[int] = 0
    total_vehiculos: Optional[int] = 0
    
    model_config = ConfigDict(from_attributes=True)
