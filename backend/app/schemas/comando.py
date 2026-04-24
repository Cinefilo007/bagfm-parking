from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class PaseBaseCrear(BaseModel):
    zona_id: UUID
    nombre_portador: str
    cedula_portador: Optional[str] = None
    telefono_portador: Optional[str] = None
    email_portador: Optional[str] = None
    vehiculo_placa: str
    vehiculo_marca: Optional[str] = None
    vehiculo_modelo: Optional[str] = None
    vehiculo_color: Optional[str] = None
    es_permanente: bool = False
    dias_vigencia: int = 1

class PuestoReservadoSalida(BaseModel):
    id: UUID
    codigo: str
    zona_id: UUID
    zona_nombre: str
    estado: str
    model_config = ConfigDict(from_attributes=True)
