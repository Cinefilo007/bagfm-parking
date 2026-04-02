from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import obtener_config

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

# Importar modelos para asegurar que se registren en el metadata de Base
from app.models import base

from app.api.v1 import auth, entidades, socios

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Autenticación"])
app.include_router(entidades.router, prefix="/api/v1/entidades", tags=["Entidades Civiles"])
app.include_router(socios.router, prefix="/api/v1/socios", tags=["Gestión de Socios"])
