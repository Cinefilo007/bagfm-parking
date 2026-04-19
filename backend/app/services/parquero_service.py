from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select

from app.models.acceso import Acceso
from app.models.codigo_qr import CodigoQR
from app.models.vehiculo_pase import VehiculoPase
from app.models.puesto_estacionamiento import PuestoEstacionamiento
from app.models.enums import EstadoPuesto

class ParqueroService:
    async def registrar_llegada_qr(
        self, db: AsyncSession, qr_id: UUID, zona_id: UUID, parquero_id: UUID
    ) -> VehiculoPase:
        """
        El parquero escanea un QR para recibir un vehículo en su zona.
        """
        resultado = await db.execute(select(CodigoQR).filter(CodigoQR.id == qr_id))
        qr = resultado.scalars().first()
        if not qr:
            raise ValueError("QR no válido")
            
        # Verificar si estaba preasignado a esta zona o es asignación dinámica
        resultado_vp = await db.execute(select(VehiculoPase).filter(VehiculoPase.qr_id == qr_id))
        vehiculo_pase = resultado_vp.scalars().first()
        
        if not vehiculo_pase:
            # Si el pase no tenía vehículo asignado (por ej. pase masivo impreso)
            vehiculo_pase = VehiculoPase(
                qr_id=qr_id,
                placa=qr.vehiculo_placa or "DESCONOCIDO",
                zona_asignada_id=zona_id,
                ingresado=True,
                hora_ingreso=datetime.now(timezone.utc)
            )
            db.add(vehiculo_pase)
        else:
            vehiculo_pase.ingresado = True
            vehiculo_pase.hora_ingreso = datetime.now(timezone.utc)
            vehiculo_pase.zona_asignada_id = zona_id
            
        qr.verificado_por_parquero = True
        qr.hora_llegada_zona = datetime.now(timezone.utc)
        
        await db.commit()
        await db.refresh(vehiculo_pase)
        return vehiculo_pase

    async def asignar_puesto(
        self, db: AsyncSession, vehiculo_pase_id: UUID, puesto_id: UUID
    ) -> VehiculoPase:
        """
        Asignar un puesto físico específico a un vehículo ingresado.
        """
        resultado_vp = await db.execute(select(VehiculoPase).filter(VehiculoPase.id == vehiculo_pase_id))
        vehiculo_pase = resultado_vp.scalars().first()
        if not vehiculo_pase:
            raise ValueError("Vehículo no encontrado")
            
        resultado_p = await db.execute(select(PuestoEstacionamiento).filter(PuestoEstacionamiento.id == puesto_id))
        puesto = resultado_p.scalars().first()
        if not puesto:
            raise ValueError("Puesto no encontrado")
            
        if puesto.estado in [EstadoPuesto.ocupado, EstadoPuesto.mantenimiento]:
            raise ValueError("Puesto no disponible")
            
        # Liberar puesto anterior si tenía uno
        if vehiculo_pase.puesto_asignado_id:
            res_panterior = await db.execute(select(PuestoEstacionamiento).filter(
                PuestoEstacionamiento.id == vehiculo_pase.puesto_asignado_id
            ))
            puesto_anterior = res_panterior.scalars().first()
            if puesto_anterior:
                puesto_anterior.estado = EstadoPuesto.libre
                puesto_anterior.vehiculo_actual_id = None
                puesto_anterior.qr_actual_id = None
                
        puesto.estado = EstadoPuesto.ocupado
        puesto.qr_actual_id = vehiculo_pase.qr_id
        puesto.ocupado_desde = datetime.now(timezone.utc)
        
        vehiculo_pase.puesto_asignado_id = puesto_id
        
        await db.commit()
        await db.refresh(vehiculo_pase)
        return vehiculo_pase

    async def registrar_salida(
        self, db: AsyncSession, qr_id: UUID
    ) -> VehiculoPase:
        """
        Registrar la salida de la zona de estacionamiento.
        """
        resultado_vp = await db.execute(select(VehiculoPase).filter(VehiculoPase.qr_id == qr_id))
        vehiculo_pase = resultado_vp.scalars().first()
        if not vehiculo_pase:
            raise ValueError("Vehículo no encontrado en zona")
            
        vehiculo_pase.ingresado = False
        
        if vehiculo_pase.puesto_asignado_id:
            resultado_p = await db.execute(select(PuestoEstacionamiento).filter(
                PuestoEstacionamiento.id == vehiculo_pase.puesto_asignado_id
            ))
            puesto = resultado_p.scalars().first()
            if puesto:
                puesto.estado = EstadoPuesto.libre
                puesto.qr_actual_id = None
                puesto.vehiculo_actual_id = None
                puesto.ocupado_desde = None
                
        await db.commit()
        await db.refresh(vehiculo_pase)
        return vehiculo_pase

parquero_service = ParqueroService()
