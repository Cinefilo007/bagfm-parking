import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from app.models.usuario import Usuario
from app.models.codigo_qr import CodigoQR
from app.models.puesto_estacionamiento import PuestoEstacionamiento
from app.models.zona_estacionamiento import ZonaEstacionamiento
from app.models.asignacion_zona import AsignacionZona
from app.models.enums import RolTipo, TipoAccesoPase, QRTipo, EstadoPuesto
from app.core.security import crear_token_evento

class ComandoService:
    async def generar_pase_base(
        self,
        db: AsyncSession,
        zona_id: uuid.UUID,
        datos: dict,
        creado_por_id: uuid.UUID
    ) -> CodigoQR:
        """
        SOP: Genera un pase 'base' consumiendo un cupo reservado de la zona.
        Si la zona tiene puestos físicos, asigna uno con estado 'reservado_base'.
        """
        # 1. Verificar disponibilidad de cupo base en la zona
        query_asig = select(AsignacionZona).where(
            and_(
                AsignacionZona.zona_id == zona_id,
                AsignacionZona.cupo_reservado_base > 0,
                AsignacionZona.activa == True
            )
        )
        res_asig = await db.execute(query_asig)
        asig = res_asig.scalar_one_or_none()
        
        # Buscar puesto físico si aplica
        query_puesto = select(PuestoEstacionamiento).where(
            and_(
                PuestoEstacionamiento.zona_id == zona_id,
                PuestoEstacionamiento.estado == EstadoPuesto.reservado_base
            )
        ).limit(1)
        puesto_libre = (await db.execute(query_puesto)).scalar_one_or_none()

        if not asig and not puesto_libre:
            raise ValueError("No hay puestos reservados para la Base disponibles en esta zona.")

        # 2. Preparar expiración y tipo
        es_permanente = datos.get('es_permanente', False)
        tipo_qr = QRTipo.permanente if es_permanente else QRTipo.temporal
        
        dias = datos.get('dias_vigencia', 1)
        if es_permanente:
            expira_at = datetime.now(timezone.utc) + timedelta(days=365 * 5) # 5 años
        else:
            expira_at = datetime.now(timezone.utc) + timedelta(days=dias)

        # 3. Generar Serial (BASE-XXXX)
        serial = f"BASE-{str(uuid.uuid4())[:8].upper()}"

        # 4. Crear el QR
        token = crear_token_evento(serial, expira_at)
        
        nuevo_qr = CodigoQR(
            token=token,
            tipo=tipo_qr,
            serial_legible=serial,
            nombre_portador=datos.get('nombre_portador', '').upper(),
            cedula_portador=datos.get('cedula_portador'),
            telefono_portador=datos.get('telefono_portador'),
            email_portador=datos.get('email_portador'),
            vehiculo_placa=datos.get('vehiculo_placa', '').upper(),
            vehiculo_marca=datos.get('vehiculo_marca', '').upper(),
            vehiculo_modelo=datos.get('vehiculo_modelo', '').upper(),
            vehiculo_color=datos.get('vehiculo_color', '').upper(),
            tipo_acceso=TipoAccesoPase.base,
            zona_asignada_id=zona_id,
            puesto_asignado_id=puesto_libre.id if puesto_libre else None,
            fecha_expiracion=expira_at,
            created_by=creado_por_id,
            activo=True,
            datos_completos=True
        )
        
        db.add(nuevo_qr)
        await db.commit()
        await db.refresh(nuevo_qr)
        return nuevo_qr

    async def obtener_puestos_reservados_base(self, db: AsyncSession, zona_id: Optional[uuid.UUID] = None) -> List[Dict[str, Any]]:
        """SOP: Lista el estado de los puestos reservados para la base con detalles de ocupación."""
        from sqlalchemy.orm import selectinload
        # 1. Obtener puestos físicos marcados como reservado_base
        query_puestos = select(PuestoEstacionamiento).options(selectinload(PuestoEstacionamiento.zona)).where(
            PuestoEstacionamiento.estado == EstadoPuesto.reservado_base
        )
        if zona_id:
            query_puestos = query_puestos.where(PuestoEstacionamiento.zona_id == zona_id)
            
        res_p = await db.execute(query_puestos)
        puestos_fisicos = res_p.scalars().all()
        
        # 2. Obtener pases activos de tipo BASE para esta zona
        query_pases = select(CodigoQR).options(selectinload(CodigoQR.zona_asignada)).where(
            and_(
                CodigoQR.tipo_acceso == TipoAccesoPase.base,
                CodigoQR.activo == True,
                CodigoQR.fecha_expiracion > datetime.now(timezone.utc)
            )
        )
        if zona_id:
            query_pases = query_pases.where(CodigoQR.zona_asignada_id == zona_id)
            
        res_q = await db.execute(query_pases)
        pases_activos = res_q.scalars().all()
        
        resultado = []
        
        for p in puestos_fisicos:
            # Buscar si este puesto físico tiene un pase activo
            pase = next((q for q in pases_activos if q.puesto_asignado_id == p.id), None)
            resultado.append({
                "id": str(p.id),
                "numero_puesto": p.numero_puesto,
                "zona_id": str(p.zona_id),
                "zona_nombre": p.zona.nombre if p.zona else "N/A",
                "estado": "ocupado" if pase else "libre",
                "virtual": False,
                "detalle_pase": {
                    "id": str(pase.id),
                    "nombre_portador": pase.nombre_portador,
                    "vehiculo_placa": pase.vehiculo_placa,
                    "vehiculo_marca": pase.vehiculo_marca or "",
                    "vehiculo_modelo": pase.vehiculo_modelo or "",
                    "serial_legible": pase.serial_legible,
                    "token": pase.token
                } if pase else None
            })

        # Luego procesamos pases "virtuales" (sin puesto físico asignado)
        pases_virtuales = [q for q in pases_activos if not q.puesto_asignado_id]
        for q in pases_virtuales:
            resultado.append({
                "id": f"v-{q.id}",
                "numero_puesto": q.serial_legible,
                "zona_id": str(q.zona_asignada_id),
                "zona_nombre": q.zona_asignada.nombre if q.zona_asignada else "N/A",
                "estado": "ocupado",
                "virtual": True,
                "detalle_pase": {
                    "id": str(q.id),
                    "nombre_portador": q.nombre_portador,
                    "vehiculo_placa": q.vehiculo_placa,
                    "vehiculo_marca": q.vehiculo_marca or "",
                    "vehiculo_modelo": q.vehiculo_modelo or "",
                    "serial_legible": q.serial_legible,
                    "token": q.token
                }
            })
            
        return resultado

    async def liberar_pase_base(self, db: AsyncSession, pase_id: uuid.UUID, comandante_id: uuid.UUID) -> bool:
        """SOP: Anula un pase de base activo."""
        query = select(CodigoQR).where(
            and_(
                CodigoQR.id == pase_id,
                CodigoQR.tipo_acceso == TipoAccesoPase.base
            )
        )
        res = await db.execute(query)
        pase = res.scalar_one_or_none()
        
        if not pase:
            return False
            
        pase.activo = False
        # Si tenía puesto físico, lo dejamos en reservado_base pero libre (ya lo está por lógica de negocio)
        
        await db.commit()
        return True

comando_service = ComandoService()
