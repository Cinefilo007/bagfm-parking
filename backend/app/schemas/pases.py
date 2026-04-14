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
    pass

class LotePaseMasivoSalida(LotePaseMasivoBase):
    id: UUID
    codigo_serial: str
    creado_por: UUID
    created_at: datetime
    zip_generado: bool
    zip_url: Optional[str] = None
    zip_listo_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)
