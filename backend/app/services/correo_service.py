import httpx
import base64
from typing import List, Optional
from uuid import UUID
from fastapi import BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.alcabala_evento import LotePaseMasivo
from app.models.codigo_qr import CodigoQR
from app.services.configuracion_correo_service import configuracion_correo_service
from app.services.pdf_service import pdf_service
from app.core.config import obtener_config

config_env = obtener_config()

class CorreoMasivoService:
    async def despachar_correos_lote(
        self, 
        db: AsyncSession, 
        lote_id: UUID, 
        asunto: str, 
        cuerpo_plantilla: str, 
        adjuntar_pdf: bool,
        tipo_envio: str = "solo_qr",
        estilo_carnet: Optional[dict] = None
    ):
        """
        Método asíncrono que debe ser ejecutado por BackgroundTasks.
        Extrae la configuración, compila variables y envía los correos a Resend.
        """
        # Obtenemos Lote y pases
        lote = await db.get(LotePaseMasivo, lote_id)
        if not lote:
            print(f"Error: Lote {lote_id} no encontrado para despacho.")
            return

        result_pases = await db.execute(select(CodigoQR).where(CodigoQR.lote_id == lote_id))
        pases = result_pases.scalars().all()

        # Obtener Configuración
        config = None
        if lote.entidad_id:
            config = await configuracion_correo_service.obtener_por_entidad(db, lote.entidad_id)
            
        if not config:
           config = await configuracion_correo_service.obtener_general(db)
           
        api_key_to_use = config.api_key_resend if (config and config.api_key_resend) else config_env.resend_api_key

        if not api_key_to_use:
            print(f"Error: No hay Token de Resend configurado.")
            return

        remitente = f"{config.nombre_remitente} <{config.email_remitente}>" if (config and config.nombre_remitente) else "BAGFM Access <accesos@bagfm.mil.ve>"
        if config and config.email_remitente and not config.nombre_remitente:
            remitente = config.email_remitente

        # Procesar lote. Enviamos 1 a 1 mediante httpx asíncrono
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {api_key_to_use}",
                "Content-Type": "application/json"
            }
            
            for pase in pases:
                destinatario = None
                nombre_dest = "Usuario Invitado"
                
                if pase.extra_datos:
                    destinatario = pase.extra_datos.get("email") or pase.extra_datos.get("correo")
                    nombre_dest = pase.extra_datos.get("nombre", nombre_dest)

                if not destinatario:
                    continue

                # Compilar plantilla
                # La URL de QR es para ver/descargar el pase en el navegador
                qr_link = f"{config_env.frontend_url}/pase/{pase.token}"
                
                # Formateo automático de saltos de línea (nl2br)
                cuerpo_html = cuerpo_plantilla.replace("\n", "<br>")
                cuerpo_html = cuerpo_html.replace("{{nombre}}", f"<strong>{nombre_dest}</strong>")
                cuerpo_html = cuerpo_html.replace("{{qr_url}}", f"<a href='{qr_link}' style='color: #4ade80; font-weight: bold;'>VER MI PASE AQUÍ</a>")

                payload = {
                    "from": remitente,
                    "to": [destinatario],
                    "subject": asunto,
                    "html": f"<div style='font-family: sans-serif; color: #f8fafc; background-color: #0c0f17; padding: 40px; border-radius: 16px;'>{cuerpo_html}</div>"
                }

                # Si es tipo carnet_pdf, generamos el PDF INDIVIDUAL centrado en tamaño CARTA
                if tipo_envio == "carnet_pdf" and estilo_carnet:
                    try:
                        pdf_buf = await pdf_service.generar_pdf_individual(pase, lote, estilo_carnet)
                        pdf_b64 = base64.b64encode(pdf_buf.getvalue()).decode('utf-8')
                        payload["attachments"] = [
                            {
                                "filename": f"CARNET_ACCESO_{pase.serial_legible}.pdf",
                                "content": pdf_b64
                            }
                        ]
                    except Exception as pdf_err:
                        print(f"Error generando PDF para {destinatario}: {str(pdf_err)}")

                try:
                    response = await client.post("https://api.resend.com/emails", json=payload, headers=headers)
                    if response.status_code >= 400:
                        print(f"Error Resend ({response.status_code}): {response.text}")
                except Exception as e:
                    print(f"Exception al enviar correo a {destinatario}: {str(e)}")

correo_masivo_service = CorreoMasivoService()
