from pywebpush import webpush, WebPushException
import json
import os
import logging

class WebPushService:
    def __init__(self):
        # En producción estos deberían provenir de variables de entorno o config segura
        self.VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
        self.VAPID_CLAIMS = {
            "sub": "mailto:admin@bagfm.mil.ve"
        }

    def send_notification(self, subscription_info: dict, payload: dict):
        """
        Envía una notificación push a una suscripción específica.
        subscription_info debe contener 'endpoint', 'keys' con 'p256dh' y 'auth'.
        """
        if not self.VAPID_PRIVATE_KEY:
            logging.warning("VAPID_PRIVATE_KEY no configurado, notificación push ignorada.")
            return

        try:
            webpush(
                subscription_info=subscription_info,
                data=json.dumps(payload),
                vapid_private_key=self.VAPID_PRIVATE_KEY,
                vapid_claims=self.VAPID_CLAIMS
            )
            logging.info(f"Notificación Push enviada a {subscription_info.get('endpoint')}")
        except WebPushException as ex:
            logging.error(f"Error enviando notificación push: {repr(ex)}")
            if ex.response and ex.response.json():
                logging.error(f"Response: {ex.response.json()}")

webpush_service = WebPushService()
