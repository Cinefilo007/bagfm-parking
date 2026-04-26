from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from app.core.database import obtener_db
from app.core.dependencias import obtener_usuario_actual
from app.models.usuario import Usuario
from app.services.ia_service import ia_service

router = APIRouter()

class IARequest(BaseModel):
    image_base64: Optional[str] = None
    tipo: Optional[str] = None # 'cedula' o 'vehiculo'
    texto: Optional[str] = None
    contexto: Optional[str] = None

@router.post("/extraer-datos")
async def extraer_datos(
    request: IARequest,
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """
    Endpoint táctico para extraer datos de documentos usando Gemini IA.
    """
    if not request.image_base64 or request.tipo not in ['cedula', 'vehiculo']:
        raise HTTPException(status_code=400, detail="Faltan datos de imagen o tipo inválido")
    
    try:
        datos = await ia_service.extraer_datos_documento(request.image_base64, request.tipo)
        return {"status": "success", "data": datos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en el motor de IA: {str(e)}")

@router.post("/refinar-correo")
async def refinar_correo(
    request: IARequest,
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """
    Endpoint para profesionalizar el cuerpo de un correo usando IA.
    """
    if not request.texto:
        raise HTTPException(status_code=400, detail="No se proporcionó texto para refinar")
    
    try:
        refinado = await ia_service.refinar_mensaje_correo(request.contexto or "", request.texto)
        return {"status": "success", "data": refinado}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en el motor de IA: {str(e)}")
