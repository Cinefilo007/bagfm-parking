from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, update, or_
from typing import List

from app.models.codigo_qr import CodigoQR
from app.models.infraccion import Infraccion
from app.models.zona_estacionamiento import ZonaEstacionamiento
from app.models.puesto_estacionamiento import PuestoEstacionamiento
from app.models.enums import InfraccionTipo, InfraccionEstado, GravedadInfraccion, EstadoPuesto
from app.core.notify_manager import manager as notify_manager

class CronService:
    """
    Servicio Centralizado de Tareas de Fondo (Cronjobs).
    Encargado de la vigilancia automática de la base y seguridad.
    """

    async def ejecutar_ciclo_seguridad(self, db: AsyncSession):
        """Ejecuta todas las tareas de vigilancia."""
        ghosts = await self.procesar_vehiculos_fantasma(db)
        timeouts = await self.procesar_excesos_permanencia(db)
        return {
            "vehiculos_fantasma_detectados": ghosts,
            "excesos_tiempo_detectados": timeouts,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    async def procesar_vehiculos_fantasma(self, db: AsyncSession) -> int:
        """
        Detecta vehículos que entraron a la base pero no llegaron a su zona asignada.
        Usa las columnas v2.0: hora_entrada_base y hora_llegada_zona.
        """
        ahora = datetime.now(timezone.utc)
        contador = 0

        # Buscamos QRs activos que entraron pero no llegaron a zona
        stmt = select(CodigoQR).where(
            and_(
                CodigoQR.activo == True,
                CodigoQR.hora_entrada_base != None,
                CodigoQR.hora_llegada_zona == None
            )
        )
        result = await db.execute(stmt)
        qrs_pendientes = result.scalars().all()

        for qr in qrs_pendientes:
            # Tiempo transcurrido en minutos
            delta = (ahora - qr.hora_entrada_base).total_seconds() / 60
            
            # Tiempo límite (por defecto 15, o el de la zona si está asignada)
            tiempo_limite = 15
            if qr.zona_asignada_id:
                res_zona = await db.get(ZonaEstacionamiento, qr.zona_asignada_id)
                if res_zona:
                    tiempo_limite = res_zona.tiempo_limite_llegada_min

            if delta > tiempo_limite:
                # Verificar si ya tiene una infracción de este tipo abierta
                stmt_inf = select(Infraccion).where(
                    and_(
                        Infraccion.vehiculo_id == qr.vehiculo_id,
                        Infraccion.tipo == InfraccionTipo.vehiculo_fantasma,
                        Infraccion.estado == InfraccionEstado.activa
                    )
                )
                res_inf = await db.execute(stmt_inf)
                if not res_inf.scalars().first():
                    # Crear Infracción Automática
                    nueva_inf = Infraccion(
                        vehiculo_id=qr.vehiculo_id,
                        usuario_id=qr.usuario_id or qr.created_by, # Fallback al emisor si es pase temporal sin ID usuario
                        reportado_por=qr.created_by, # Sistema / Quien generó el QR
                        tipo=InfraccionTipo.vehiculo_fantasma,
                        gravedad=GravedadInfraccion.moderada,
                        descripcion=f"ALERTA FANTASMA: Se detectó un retraso de {int(delta)} min desde el ingreso a base sin reporte en zona asignada.",
                        bloquea_salida=True,
                        estado=InfraccionEstado.activa,
                        notas_internas=f"Detectado por CronService. Entrada: {qr.hora_entrada_base}"
                    )
                    db.add(nueva_inf)
                    contador += 1
                    
                    # Notificar vía WebSocket
                    await notify_manager.broadcast({
                        "evento": "ALERTA_SEGURIDAD",
                        "tipo": "VEHICULO_FANTASMA",
                        "mensaje": f"Vehículo placa {qr.vehiculo_placa} excedió tiempo de ruta.",
                        "gravedad": "ALTA"
                    }, roles=["COMANDANTE", "ADMIN_BASE", "SUPERVISOR"])

        if contador > 0:
            await db.commit()
        return contador

    async def procesar_excesos_permanencia(self, db: AsyncSession) -> int:
        """
        Detecta vehículos que han superado el tiempo razonable de permanencia 
        (ej. pases temporales vencidos o estadía excesiva en zona).
        """
        ahora = datetime.now(timezone.utc)
        contador = 0
        
        # Ejemplo: Puestos ocupados por más de 12 horas (umbral táctico para pases simples)
        umbral_alerta = ahora - timedelta(hours=12)
        
        stmt = select(PuestoEstacionamiento).where(
            and_(
                PuestoEstacionamiento.estado == EstadoPuesto.ocupado,
                PuestoEstacionamiento.ocupado_at < umbral_alerta
            )
        )
        result = await db.execute(stmt)
        puestos_viejos = result.scalars().all()
        
        for puesto in puestos_viejos:
            # Crear infracción de abandono si el tiempo es excesivo
            stmt_inf = select(Infraccion).where(
                and_(
                    Infraccion.puesto_id == puesto.id,
                    Infraccion.tipo == InfraccionTipo.abandono_vehiculo,
                    Infraccion.estado == InfraccionEstado.activa
                )
            )
            res_inf = await db.execute(stmt_inf)
            if not res_inf.scalars().first():
                nueva_inf = Infraccion(
                    vehiculo_id=puesto.vehiculo_actual_id,
                    usuario_id=puesto.usuario_actual_id,
                    reportado_por=puesto.registrado_por,
                    tipo=InfraccionTipo.abandono_vehiculo,
                    gravedad=GravedadInfraccion.leve,
                    descripcion=f"Ocupación prolongada del puesto {puesto.codigo}. Tiempo excedido.",
                    zona_id=puesto.zona_id,
                    puesto_id=puesto.id,
                    estado=InfraccionEstado.activa
                )
                db.add(nueva_inf)
                contador += 1
        
        if contador > 0:
            await db.commit()
        return contador

    async def obtener_historial_fantasmas(self, db: AsyncSession, skip: int = 0, limit: int = 100):
        """Retorna el historial de infracciones tipo fantasma."""
        stmt = select(Infraccion).where(
            Infraccion.tipo == InfraccionTipo.vehiculo_fantasma
        ).order_by(Infraccion.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()

cron_service = CronService()
