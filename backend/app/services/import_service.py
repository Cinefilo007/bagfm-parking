import openpyxl
from io import BytesIO
from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.socio import SocioCrear
from app.schemas.vehiculo import VehiculoCrear
from app.services.socio_service import socio_service
from app.core.security import hashear_password
from app.core.excepciones import EntidadNoEncontrada
import logging

logger = logging.getLogger(__name__)

class ImportService:
    async def procesar_excel_socios(
        self, 
        db: AsyncSession, 
        file_content: bytes, 
        entidad_id: UUID, 
        creador_id: UUID
    ) -> Dict[str, Any]:
        """
        Procesa un archivo Excel para importar socios masivamente.
        Columnas esperadas: cedula, nombre, apellido, email, telefono
        """
        try:
            wb = openpyxl.load_workbook(BytesIO(file_content), data_only=True)
            sheet = wb.active
            
            resumen = {
                "total": 0,
                "exitosos": 0,
                "errores": []
            }
            
            # Mapeo de columnas (asumiendo orden fijo o buscando encabezados)
            # Por simplicidad ahora: A=cedula, B=nombre, C=apellido, D=email, E=telefono
            
            rows = list(sheet.iter_rows(min_row=2, values_only=True))
            resumen["total"] = len(rows)
            
            for index, row in enumerate(rows, start=2):
                if not any(row): # Fila vacía
                    continue
                
                try:
                    # Columnas: A=cedula, B=nombre, C=apellido, D=email, E=telefono, F=placa, G=marca, H=modelo, I=color
                    cedula, nombre, apellido, email, telefono = row[:5]
                    
                    # Datos de vehículo (opcionales)
                    placa = row[5] if len(row) > 5 else None
                    marca = row[6] if len(row) > 6 else None
                    modelo = row[7] if len(row) > 7 else None
                    color = row[8] if len(row) > 8 else None
                    
                    if not cedula or not nombre or not apellido:
                        resumen["errores"].append({
                            "fila": index,
                            "error": "Cédula, nombre y apellido son obligatorios"
                        })
                        continue
                    
                    # Limpieza básica
                    cedula = str(cedula).strip()
                    nombre = str(nombre).strip()
                    apellido = str(apellido).strip()
                    email = str(email).strip() if email else None
                    telefono = str(telefono).strip() if telefono else None
                    
                    # La contraseña por defecto será la cédula
                    datos_socio = SocioCrear(
                        cedula=cedula,
                        nombre=nombre,
                        apellido=apellido,
                        email=email,
                        telefono=telefono,
                        entidad_id=entidad_id,
                        password=cedula,
                        vehiculos=[]
                    )
                    
                    # Si hay datos de vehículo, añadirlo
                    if placa and marca:
                        datos_socio.vehiculos.append(VehiculoCrear(
                            placa=str(placa).strip().upper(),
                            marca=str(marca).strip().upper(),
                            modelo=str(modelo).strip().upper() if modelo else "S/M",
                            color=str(color).strip().upper() if color else "S/C"
                        ))
                    
                    await socio_service.crear_socio_con_membresia(db, datos_socio, creador_id)
                    resumen["exitosos"] += 1
                    
                except Exception as e:
                    logger.error(f"Error procesando fila {index}: {str(e)}")
                    resumen["errores"].append({
                        "fila": index,
                        "error": str(e)
                    })
            
            return resumen
            
        except Exception as e:
            logger.error(f"Error fatal en importación: {str(e)}")
            raise ValueError(f"No se pudo procesar el archivo Excel: {str(e)}")

import_service = ImportService()
