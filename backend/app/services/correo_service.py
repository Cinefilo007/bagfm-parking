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
        adjuntar_pdf: bool
    ):
        """
        Método asíncrono que debe ser ejecutado por BackgroundTasks.
        Extrae la configuración, compila variables y envía los correos a Resend.
        """
        # Obtenemos Lote y pases
        lote = await db.get(LotePaseMasivo, lote_id)
        if not lote:
            return

        result_pases = await db.execute(select(CodigoQR).where(CodigoQR.lote_id == lote_id))
        pases = result_pases.scalars().all()

        # Obtener Configuración (de entidad, o general si no tiene o el rol es superior)
        config = None
        if lote.entidad_id:
            config = await configuracion_correo_service.obtener_por_entidad(db, lote.entidad_id)
            
        if not config:
           config = await configuracion_correo_service.obtener_general(db)
           
        api_key_to_use = config.api_key_resend if (config and config.api_key_resend) else config_env.resend_api_key

        if not api_key_to_use:
            print(f"Error: No hay Token de Resend global ni configurado para la entidad en el lote {lote_id}")
            return

        remitente = f"{config.nombre_remitente} <{config.email_remitente}>" if (config and config.nombre_remitente) else "BAGFM Access <accesos@bagfm.mil.ve>"
        if config and config.email_remitente and not config.nombre_remitente:
            remitente = config.email_remitente

        # PDF Lote opcional
        pdf_base64 = None
        if adjuntar_pdf:
            pdf_buffer = await pdf_service.generar_pdf_lote(db, lote_id)
            pdf_base64 = base64.b64encode(pdf_buffer.getvalue()).decode('utf-8')

        # Procesar lote. Enviamos 1 a 1 mediante httpx asíncrono
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {config.api_key_resend}",
                "Content-Type": "application/json"
            }
            
            for pase in pases:
                # Solo enviar a los que tengan correo (si es pase tipo B y cargaron excel con email)
                destinatario = None
                nombre_dest = "Usuario Invitado"
                
                # Intentamos extraer email y nombre del JSON extra_datos
                if pase.extra_datos:
                    destinatario = pase.extra_datos.get("email") or pase.extra_datos.get("correo")
                    nombre_dest = pase.extra_datos.get("nombre", nombre_dest)

                # Si es pase genérico (Tipo A), tal vez no hay correo. Saltamos.
                if not destinatario:
                    continue

                # Compilar plantilla
                # Variables: {{nombre}}, {{qr_url}}, {{lote}}
                qr_link = f"{config_env.frontend_url}/pase/{pase.token}"
                cuerpo_html = cuerpo_plantilla.replace("\n", "<br>")
                cuerpo_html = cuerpo_html.replace("{{nombre}}", nombre_dest)
                cuerpo_html = cuerpo_html.replace("{{qr_url}}", f"<a href='{qr_link}'>{qr_link}</a>")
                cuerpo_html = cuerpo_html.replace("{{lote}}", lote.nombre)

                payload = {
                    "from": remitente,
                    "to": [destinatario],
                    "subject": asunto,
                    "html": cuerpo_html
                }

                if adjuntar_pdf:
                    payload["attachments"] = [
                        {
                            "filename": f"PASE_{pase.serial_legible}.pdf",
                            "content": pdf_base64
                        }
                    ]

                try:
                    response = await client.post("https://api.resend.com/emails", json=payload, headers=headers)
                    if response.status_code >= 400:
                        print(f"Error Resend ({response.status_code}): {response.text}")
                    else:
                        print(f"Correo enviado a {destinatario} via Resend. status={response.status_code}")
                except Exception as e:
                    print(f"Exception al enviar correo a {destinatario}: {str(e)}")

correo_masivo_service = CorreoMasivoService()
