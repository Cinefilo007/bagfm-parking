
import asyncio
from app.core.database import SessionLocal
from app.models.zona_estacionamiento import ZonaEstacionamiento
from app.models.codigo_qr import VehiculoPase
from app.models.puesto_estacionamiento import PuestoEstacionamiento
from sqlalchemy import select, func

async def check():
    db = SessionLocal()
    try:
        # Zonas
        rs = await db.execute(select(ZonaEstacionamiento))
        zones = rs.scalars().all()
        print(f"Total Zonas: {len(zones)}")
        
        for z in zones:
            # Vehiculos ingresados
            rs_v = await db.execute(select(func.count(VehiculoPase.id)).where(VehiculoPase.zona_asignada_id == z.id, VehiculoPase.ingresado == True))
            v_count = rs_v.scalar() or 0
            
            # Puestos físicos
            rs_p = await db.execute(select(func.count(PuestoEstacionamiento.id)).where(PuestoEstacionamiento.zona_id == z.id))
            p_count = rs_p.scalar() or 0
            
            print(f"Zona: {z.nombre} (ID: {z.id})")
            print(f"  - Capacidad: {z.capacidad_total}")
            print(f"  - Ocupacion Actual (DB col): {z.ocupacion_actual}")
            print(f"  - Vehiculos Reales (VehiculoPase.ingresado=True): {v_count}")
            print(f"  - Puestos Físicos: {p_count}")
            
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(check())
