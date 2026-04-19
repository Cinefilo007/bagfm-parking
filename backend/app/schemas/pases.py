from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime, date
from typing import Optional, List
from app.models.enums import PasseTipo

class LotePaseMasivoBase(BaseModel):
    nombre_evento: str
    tipo_pase: PasseTipo
    fecha_inicio: date
    fecha_fin: date
    cantidad_pases: int
    max_accesos_por_pase: Optional[int] = None

class LotePaseMasivoCrear(LotePaseMasivoBase):
    tipo_acceso: Optional[str] = "general"
    tipo_acceso_custom_id: Optional[UUID] = None
    zona_id: Optional[UUID] = None
    puesto_id: Optional[UUID] = None
    multi_vehiculo: bool = False

class LotePaseMasivoSalida(LotePaseMasivoBase):
    id: UUID
    codigo_serial: str
    creado_por: UUID
    created_at: datetime
    zip_generado: bool
    zip_url: Optional[str] = None
    zip_listo_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

class VehiculoPaseBase(BaseModel):
    qr_id: UUID
    placa: str
    marca: Optional[str] = None
    modelo: Optional[str] = None
    zona_asignada_id: Optional[UUID] = None
    puesto_asignado_id: Optional[UUID] = None
    ingresado: bool = False
    hora_ingreso: Optional[datetime] = None

class VehiculoPaseSalida(VehiculoPaseBase):
    id: UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
