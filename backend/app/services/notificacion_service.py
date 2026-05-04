import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import List

from app.models.usuario import Usuario
from app.models.push_subscription import PushSubscription
from app.models.enums import RolTipo
from app.services.webpush_service import webpush_service

class NotificacionService:
    async def notificar_entrada_vehiculo(
        self, 
        db: AsyncSession, 
        zona_id: UUID, 
        placa: str, 
        detalles_vehiculo: str,
        nombre_socio: str
    ):
        """
        Notifica al Supervisor de Parqueros y a los Parqueros asignados a la zona.
        """
        # 1. Buscar a los destinatarios
        # Parqueros de la zona + Supervisores de Parqueros de la misma entidad
        
        # Primero obtenemos la zona para saber de qué entidad es (asumiendo que los parqueros están filtrados por entidad)
        # En este sistema, los parqueros tienen entidad_id y zona_asignada_id.
        
        query_destinatarios = select(Usuario).where(
            Usuario.activo == True,
            (
                # Parqueros asignados a la zona
                (Usuario.rol == RolTipo.PARQUERO) & (Usuario.zona_asignada_id == zona_id)
            ) | (
                # Supervisores de Parqueros (ellos ven global, pero aquí filtramos por los de la entidad si aplica)
                # NOTA: Si el supervisor es global de la entidad, debería recibirlo.
                (Usuario.rol == RolTipo.SUPERVISOR_PARQUEROS)
            )
        )
        
        result = await db.execute(query_destinatarios)
        usuarios = result.scalars().all()
        ids_usuarios = [u.id for u in usuarios]
        
        if not ids_usuarios:
            logging.info(f"No hay parqueros o supervisores activos para notificar en zona {zona_id}")
            return

        # 2. Buscar sus suscripciones push
        query_subs = select(PushSubscription).where(
            PushSubscription.usuario_id.in_(ids_usuarios),
            PushSubscription.activo == True
        )
        result_subs = await db.execute(query_subs)
        suscripciones = result_subs.scalars().all()

        # 3. Enviar notificaciones
        payload = {
            "title": "🚗 Vehículo en camino",
            "body": f"{placa} ({detalles_vehiculo}) - Socio: {nombre_socio}",
            "data": {
                "url": "/parquero/dashboard",
                "zona_id": str(zona_id),
                "tipo": "entrada_vehiculo"
            },
            "icon": "/icons/icon-192x192.png",
            "badge": "/icons/badge-96x96.png"
        }

        for sub in suscripciones:
            sub_info = {
                "endpoint": sub.endpoint,
                "keys": {
                    "p256dh": sub.p256dh,
                    "auth": sub.auth
                }
            }
            # Esto es síncrono en el service base, pero aquí lo llamamos
            webpush_service.send_notification(sub_info, payload)

    async def notificar_excepcion_alcabala(self, db: AsyncSession, acceso):
        """
        Alerta Táctica: Vehículo no identificado o ingreso bajo excepción/intimidación.
        SOP: Aegis Tactical v2.2 - Seguridad Integral.
        """
        query_destinatarios = select(Usuario).where(
            Usuario.activo == True,
            Usuario.rol.in_([
                RolTipo.COMANDANTE, 
                RolTipo.ADMIN_BASE, 
                RolTipo.SUPERVISOR_PARQUEROS
            ])
        )
        
        result = await db.execute(query_destinatarios)
        usuarios = result.scalars().all()
        ids_usuarios = [u.id for u in usuarios]
        
        if not ids_usuarios: return

        query_subs = select(PushSubscription).where(
            PushSubscription.usuario_id.in_(ids_usuarios),
            PushSubscription.activo == True
        )
        result_subs = await db.execute(query_subs)
        suscripciones = result_subs.scalars().all()

        payload = {
            "title": "⚠️ ALERTA TÁCTICA: Acceso Excepcional",
            "body": f"Placa: {acceso.vehiculo_placa or 'SIN PLACA'} - Destino: {acceso.observaciones or 'NO DECLARADO'}",
            "data": {
                "url": "/admin/bitacora",
                "acceso_id": str(acceso.id),
                "tipo": "alerta_excepcion"
            },
            "icon": "/icons/ghost-vehiculo.png"
        }

        for sub in suscripciones:
            try:
                sub_info = {"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}}
                webpush_service.send_notification(sub_info, payload)
            except Exception as e:
                logging.error(f"Error enviando push de excepción a {sub.usuario_id}: {e}")

    async def notificar_infraccion_socio(self, db: AsyncSession, socio_id: UUID, vehiculo_placa: str, infraccion_tipo: str, infraccion_gravedad: str):
        """
        Alerta Táctica: Notificar a un socio cuando su vehículo ha cometido una infracción.
        """
        query_subs = select(PushSubscription).where(
            PushSubscription.usuario_id == socio_id,
            PushSubscription.activo == True
        )
        result_subs = await db.execute(query_subs)
        suscripciones = result_subs.scalars().all()

        if not suscripciones:
            return

        payload = {
            "title": f"🚨 Infracción Registrada ({infraccion_gravedad.upper()})",
            "body": f"El vehículo {vehiculo_placa or 'N/A'} ha sido reportado por: {infraccion_tipo.replace('_', ' ').capitalize()}.",
            "data": {
                "url": "/socio/infracciones",
                "tipo": "alerta_infraccion"
            },
            "icon": "/icons/ghost-vehiculo.png"
        }

        for sub in suscripciones:
            try:
                sub_info = {"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}}
                webpush_service.send_notification(sub_info, payload)
            except Exception as e:
                logging.error(f"Error enviando push de infraccion al socio {socio_id}: {e}")

notificacion_service = NotificacionService()
