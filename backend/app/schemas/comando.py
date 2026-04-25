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

class PuestoDetallePase(BaseModel):
    id: str
    nombre_portador: str
    vehiculo_placa: str
    vehiculo_marca: str
    vehiculo_modelo: str
    serial_legible: str

class PuestoReservadoSalida(BaseModel):
    id: str
    numero_puesto: str
    zona_id: str
    zona_nombre: Optional[str] = ""
    estado: str
    virtual: Optional[bool] = False
    detalle_pase: Optional[PuestoDetallePase] = None
    model_config = ConfigDict(from_attributes=True)
