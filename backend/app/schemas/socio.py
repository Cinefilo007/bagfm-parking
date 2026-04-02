from typing import Optional, List
from uuid import UUID
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr
from app.models.enums import RolTipo, MembresiaEstado
from app.schemas.vehiculo import VehiculoCrear, VehiculoSalida

class SocioBase(BaseModel):
    cedula: str
    nombre: str
    apellido: str
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    activo: bool = True
    foto_url: Optional[str] = None

class SocioCrear(SocioBase):
    password: Optional[str] = "123456" # Default para socios autogenerados
    entidad_id: UUID
    vehiculos: Optional[List[VehiculoCrear]] = []

class SocioSalida(SocioBase):
    id: UUID
    entidad_id: Optional[UUID] = None
    rol: RolTipo
    created_at: datetime
    vehiculos: List[VehiculoSalida] = []
    
    model_config = ConfigDict(from_attributes=True)

# --- Esquemas de Membresía ---

class MembresiaBase(BaseModel):
    entidad_id: UUID
    socio_id: UUID
    vehiculo_id: Optional[UUID] = None
    cupo_numero: Optional[int] = None
    estado: MembresiaEstado = MembresiaEstado.activa
    fecha_inicio: date = date.today()
    fecha_fin: Optional[date] = None
    observaciones: Optional[str] = None

class MembresiaCrear(MembresiaBase):
    pass

class MembresiaSalida(MembresiaBase):
    id: UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# --- Esquema Compuesto (Socio con su Membresía activa) ---

class SocioDetalle(SocioSalida):
    membresia_activa: Optional[MembresiaSalida] = None
