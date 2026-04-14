from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from app.api.deps import obtener_usuario_actual
from app.models.usuario import Usuario
from app.services.ia_service import ia_service

router = APIRouter()

class IARequest(BaseModel):
    image_base64: str
    tipo: str # 'cedula' o 'vehiculo'

@router.post("/extraer-datos")
async def extraer_datos(
    request: IARequest,
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """
    Endpoint táctico para extraer datos de documentos usando Gemini IA.
    Requiere autenticación de guardia o administrador.
    """
    if request.tipo not in ['cedula', 'vehiculo']:
        raise HTTPException(status_code=400, detail="Tipo de documento inválido")
    
    try:
        datos = await ia_service.extraer_datos_documento(request.image_base64, request.tipo)
        return {"status": "success", "data": datos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en el motor de IA: {str(e)}")
