"""
Punto de entrada principal — BAGFM Backend
Configuración de FastAPI, CORS, y registro de routers.
"""
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import obtener_config

config = obtener_config()

print("\n" + "="*50)
print(">>> [SISTEMA] BAGFM BACKEND v0.3.2")
print(f">>> [SISTEMA] PUERTO DETECTADO: {os.getenv('PORT', '8000')}")
print(">>> [SISTEMA] CORS: MODO DIAGNÓSTICO ABIERTO (*)")
print("="*50 + "\n")

# Crear instancia principal de FastAPI
app = FastAPI(
    title=config.app_nombre,
    version="0.3.1",
    description="API para el Sistema de Control de Acceso Vehicular - BAGFM",
    docs_url="/api/docs" if not config.en_produccion else None,  # Ocultar docs en produccion
    redoc_url="/api/redoc" if not config.en_produccion else None,
)

# Middleware de registro de peticiones (DIAGNÓSTICO)
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f">>> [PETICIÓN] {request.method} {request.url.path}")
    response = await call_next(request)
    print(f">>> [RESPUESTA] Status: {response.status_code}")
    return response

# Configuración de CORS - ABIERTO PARA DIAGNÓSTICO
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
