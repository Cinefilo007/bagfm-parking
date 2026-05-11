import asyncio
from datetime import datetime, timezone
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import FabricaSesion
from app.models.codigo_qr import CodigoQR
from app.models.acceso import Acceso
from app.models.vehiculo_pase import VehiculoPase
from app.models.usuario import Usuario
from app.models.vehiculo import Vehiculo

async def main():
    async with FabricaSesion() as db:
        res = await db.execute(
            select(Acceso).order_by(Acceso.timestamp.desc()).limit(50)
        )
        accesos = res.scalars().all()
        fixed = 0
        for a in accesos:
            if not a.qr_id: continue
            
            res_qr = await db.execute(select(CodigoQR).where(CodigoQR.id == a.qr_id))
            qr = res_qr.scalars().first()
            if not qr: continue
            
            # Check if this QR is considered "perdido" but has data completed
            if qr.datos_completos:
                res_vp = await db.execute(select(VehiculoPase).where(VehiculoPase.qr_id == qr.id))
                vp = res_vp.scalars().first()
                
                # If VP is missing, create it
                if not vp:
                    vp = VehiculoPase(
                        qr_id=qr.id,
                        placa=qr.vehiculo_placa or "DESCONOCIDO",
                        marca=qr.vehiculo_marca,
                        modelo=qr.vehiculo_modelo,
                        color=qr.vehiculo_color,
                        zona_asignada_id=qr.zona_asignada_id,
                        ingresado=True,
                        hora_ingreso=datetime.now(timezone.utc),
                        nombre_portador=qr.nombre_portador,
                        cedula_portador=qr.cedula_portador,
                        telefono_portador=qr.telefono_portador
                    )
                    db.add(vp)
                    print(f"Created missing VP for QR {qr.vehiculo_placa}")
                    fixed += 1
                elif not vp.ingresado:
                    vp.ingresado = True
                    vp.hora_ingreso = datetime.now(timezone.utc)
                    print(f"Fixed existing VP for QR {qr.vehiculo_placa}")
                    fixed += 1
        
        if fixed > 0:
            await db.commit()
            print(f"Fixed {fixed} records!")
        else:
            print("No records needed fixing.")
                
if __name__ == "__main__":
    asyncio.run(main())
