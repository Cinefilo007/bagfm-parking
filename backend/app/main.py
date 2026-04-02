import logging
from fastapi import FastAPI
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

# Endpoint de salud / status
@app.get("/api/health", tags=["Sistema"])
async def health_check():
    return {
        "estado": "operativo",
        "version": config.app_version,
        "entorno": config.app_env
    }

from app.api.v1 import auth, entidades, socios

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Autenticación"])
app.include_router(entidades.router, prefix="/api/v1/entidades", tags=["Entidades Civiles"])
app.include_router(socios.router, prefix="/api/v1/socios", tags=["Gestión de Socios"])
