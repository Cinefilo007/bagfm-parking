from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.excepciones import BagfmError, EntidadNoEncontrada, EntidadDuplicada, AccesoDenegado
from app.core.config import obtener_config

# 1. Asegurar registro de modelos ANTES de cualquier otra cosa de la API
from app.models import base

config = obtener_config()

# Crear instancia principal de FastAPI
app = FastAPI(
    title=config.app_nombre,
    version="0.4.0",
    description="API para el Sistema de Control de Acceso Vehicular - BAGFM",
    docs_url="/api/docs" if not config.en_produccion else None,
    redoc_url="/api/redoc" if not config.en_produccion else None,
)

# Configuración de CORS basada en variables de entorno
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_lista,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Capturador de Errores de Negocio (BagfmError -> 400/404/403)
@app.exception_handler(BagfmError)
async def bagfm_exception_handler(request: Request, exc: BagfmError):
    # Loguear el error para depuración
    print(f">> [NEGOCIO] {type(exc).__name__}: {str(exc)}")
    
    # Determinar el status code
    status_code = status.HTTP_400_BAD_REQUEST
    if isinstance(exc, EntidadNoEncontrada):
        status_code = status.HTTP_404_NOT_FOUND
    elif isinstance(exc, AccesoDenegado):
        status_code = status.HTTP_403_FORBIDDEN
    elif isinstance(exc, EntidadDuplicada):
        status_code = status.HTTP_400_BAD_REQUEST
        
    return JSONResponse(
        status_code=status_code,
        content={"detail": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"}
    )

# Capturador de Errores Globales (Anti-500/CORS)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Loguear el error exacto para verlo en Railway
    print(f">>> [ERROR] {type(exc).__name__}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Error interno: {type(exc).__name__}"},
        headers={
            "Access-Control-Allow-Origin": "*", # Forzar CORS en error
        }
    )

# Endpoint de salud / status
@app.get("/api/health", tags=["Sistema"])
async def health_check():
    return {
        "estado": "operativo",
        "version": config.app_version,
        "entorno": config.app_env
    }

# 2. Importar routers DESPUÉS de registrar modelos
from app.api.v1 import (
    auth, entidades, socios, accesos, 
    infracciones, websocket, comando, eventos, mapa,
    personal, pases, ia, zonas, parqueros, fantasmas
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Autenticación"])
app.include_router(entidades.router, prefix="/api/v1/entidades", tags=["Entidades Civiles"])
app.include_router(socios.router, prefix="/api/v1/socios", tags=["Gestión de Socios"])
app.include_router(comando.router, prefix="/api/v1/comando", tags=["Comando y Alcabalas"])
app.include_router(personal.router, prefix="/api/v1/personal", tags=["Gestión de Personal"])
app.include_router(eventos.router, prefix="/api/v1/eventos", tags=["Eventos y Pases Masivos"])
app.include_router(pases.router, prefix="/api/v1/pases", tags=["Lotes de Pases Masivos"])
app.include_router(accesos.router, prefix="/api/v1/accesos", tags=["Control de Accesos"])
app.include_router(infracciones.router, prefix="/api/v1/infracciones", tags=["Gestión de Infracciones"])
app.include_router(mapa.router, prefix="/api/v1/mapa", tags=["Mapa Táctico"])
app.include_router(websocket.router, prefix="/api/v1", tags=["Tiempo Real"])
app.include_router(ia.router, prefix="/api/v1/ia", tags=["Inteligencia Artificial"])
app.include_router(zonas.router, prefix="/api/v1", tags=["Zonas de Estacionamiento"])
app.include_router(parqueros.router, prefix="/api/v1", tags=["Parqueros Operaciones"])
app.include_router(fantasmas.router, prefix="/api/v1", tags=["Control de Vehículos Fantasma"])
