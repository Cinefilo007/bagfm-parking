from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.acceso import Acceso
from app.models.vehiculo_pase import VehiculoPase
from app.models.infraccion import Infraccion
from app.models.enums import AccesoTipo, InfraccionTipo, GravedadInfraccion, InfraccionEstado
from app.core.notify_manager import manager as notify_manager

class VehiculoFantasmaService:
    """
    Servicio para detectar vehículos que ingresaron a la base pero no llegaron 
    a su zona o puesto de estacionamiento asignado en el tiempo estipulado.
    """

    async def detectar_fantasmas(self, db: AsyncSession):
        """
        Busca accesos de entrada recientes que no tienen un registro de VehiculoPase
        confirmado por un parquero.
        Se ejecuta idealmente como un cronjob o tarea de fondo.
        """
        # Obtenemos accesos de tipo ENTRADA de las últimas 2 horas (para evitar procesar históricos viejos)
        limite_superior = datetime.now(timezone.utc)
        limite_inferior = limite_superior - timedelta(hours=2)

        query = select(Acceso).where(
            and_(
                Acceso.tipo == AccesoTipo.entrada,
                Acceso.timestamp >= limite_inferior,
                Acceso.timestamp <= limite_superior
            )
        )
        resultado = await db.execute(query)
        accesos_recientes = resultado.scalars().all()

        for acceso in accesos_recientes:
            vp = None
            # Buscar si el parquero ya lo registró
            if acceso.qr_id:
                res = await db.execute(select(VehiculoPase).filter(VehiculoPase.qr_id == acceso.qr_id))
                vp = res.scalars().first()
            elif acceso.vehiculo_id:
                res = await db.execute(select(VehiculoPase).filter(VehiculoPase.vehiculo_id == acceso.vehiculo_id))
                vp = res.scalars().first()

            # Si VP no existe o (no ha sido ingresado por parquero):
            if not vp or not vp.ingresado:
                # Calcular el tiempo transcurrido
                tiempo_transcurrido = (limite_superior - acceso.timestamp.replace(tzinfo=timezone.utc)).total_seconds() / 60.0
                
                # Por defecto 15 mins, pero podría venir de la zona
                tiempo_limite = 15

                if tiempo_transcurrido > tiempo_limite:
                    # Es un vehículo fantasma!
                    await self._escalar_vehiculo_fantasma(db, acceso, tiempo_transcurrido)

    async def _escalar_vehiculo_fantasma(self, db: AsyncSession, acceso: Acceso, tiempo_transcurrido: float):
        """
        Escala la alerta dependiendo del tiempo transcurrido.
        Genera infracciones automáticas o notifica al comandante.
        """
        # Evitar crear múltiples infracciones para el mismo acceso
        res = await db.execute(select(Infraccion).filter(
            and_(
                Infraccion.vehiculo_id == acceso.vehiculo_id,
                Infraccion.descripcion.like(f"%Fantasma (Acceso: {acceso.id})%")
            )
        ))
        inf_existente = res.scalars().first()

        if inf_existente:
            # Ya se reportó, podríamos escalar la gravedad si pasa más tiempo
            if tiempo_transcurrido > 45 and inf_existente.gravedad in [GravedadInfraccion.leve, GravedadInfraccion.moderada]:
                inf_existente.gravedad = GravedadInfraccion.grave
                await db.commit()
                # TODO: Notificar escalamiento
            return

        nueva_infraccion = Infraccion(
            vehiculo_id=acceso.vehiculo_id,
            usuario_id=acceso.usuario_id,
            reportado_por=acceso.registrado_por,  # Usamos al guardia que lo dejó entrar como referencia inicial
            tipo=InfraccionTipo.vehiculo_fantasma,
            gravedad=GravedadInfraccion.moderada,
            descripcion=f"Vehículo Fantasma (Acceso: {acceso.id}): No se presentó en zona de estacionamiento tras {int(tiempo_transcurrido)} mins de su ingreso.",
            bloquea_salida=True,
            estado=InfraccionEstado.activa,
            notas_internas="Generada automáticamente por VehiculoFantasmaService."
        )
        db.add(nueva_infraccion)
        await db.commit()
        await db.refresh(nueva_infraccion)

        # Disparar alerta WebSocket al Comandante y Supervisores
        mensaje = {
            "evento": "VEHICULO_FANTASMA_DETECTADO",
            "datos": {
                "infraccion_id": str(nueva_infraccion.id),
                "vehiculo_id": str(acceso.vehiculo_id) if acceso.vehiculo_id else None,
                "punto_acceso": acceso.punto_acceso,
                "tiempo_perdido": int(tiempo_transcurrido)
            }
        }
        
        await notify_manager.broadcast(mensaje, roles=["COMANDANTE", "ADMIN_BASE", "SUPERVISOR"])

    async def obtener_historial(self, db: AsyncSession, skip: int = 0, limit: int = 100):
        # Vehículos fantasma son infracciones generadas automáticamente de tipo 'vehiculo_fantasma'
        query = select(Infraccion).where(Infraccion.tipo == InfraccionTipo.vehiculo_fantasma).order_by(Infraccion.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

vehiculo_fantasma_service = VehiculoFantasmaService()
