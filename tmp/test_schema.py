
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime, date
from typing import Optional, List, Any
import json

class LotePaseMasivoBase(BaseModel):
    nombre_evento: str
    tipo_pase: str # Simplificado para el test
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
    excel_data: Optional[List[List[Any]]] = None
    distribucion_automatic: Optional[bool] = False
    distribucion_automatica: Optional[bool] = False

# Simular payload del frontend según el código analizado
payload = {
    "nombre_evento": "TEST",
    "fecha_inicio": "2026-04-20",
    "fecha_fin": "2026-04-21",
    "cantidad_pases": 10,
    "tipo_pase": "identificado",
    "tipo_acceso": "general",
    "tipo_acceso_custom_id": "", # ESTO PROBABLEMENTE FALLA
    "multi_vehiculo": False,
    "max_vehiculos": 1,
    "zona_asignada_id": "40446806-0107-6201-9311-000000000001",
    "puesto_asignado_id": "",
    "max_accesos_por_pase": 1,
    "entidad_id": "40446806-0107-6201-9311-000000000009",
    "excel_data": [["JUAN", "123", "a@b.com", "123", "PLACA", "MARCA", "MOD", "COL"]],
    "distribucion_automatica": False
}

try:
    LotePaseMasivoCrear(**payload)
    print("Validación exitosa")
except Exception as e:
    print("Error de validación:")
    print(e)
