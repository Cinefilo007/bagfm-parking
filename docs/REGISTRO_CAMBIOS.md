# REGISTRO DE CAMBIOS — BAGFM

> Este documento registra todos los cambios significativos al sistema.  
> Sigue el formato [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

---

## [Sin lanzar] — En desarrollo

### Planificado
- Setup inicial del proyecto (FastAPI + React/Vite + Supabase)
- Integración global de Supabase MCP y `supabase/agent-skills`
- Schema completo de base de datos
- Sistema de autenticación con roles JWT
- Panel del Comandante (CRUD Entidades Civiles)
- Portal Admin Entidad (CRUD Socios + Importación Excel)
- Generación y escaneo de QR
- Portal Alcabala (registro de entradas)
- Buscador Maestro (Comandante, Admin Base, Supervisor, Alcabala)
- Portal Parquero (verificación en zona)
- Portal Socio (perfil, QR, historial)
- Portal Supervisor (infracciones)
- Flujo Solicitudes de Evento
- Push Notifications (VAPID)
- PWA completa (manifest + Service Worker)
- Deploy en Railway

## [0.3.0] — 2026-04-02

### Corregido (Parche de Estabilidad Railway v2)
- **Infraestructura**: Se eliminó `entrypoint.sh` y se movió el comando de inicio a `Dockerfile` (CMD) para evitar errores de ejecución por finales de línea CRLF en Linux/Railway.
- **Conectividad (CORS)**: 
  - Se eliminó el hardcoding de `localhost:8000` en el frontend, sustituyéndolo por la URL de producción de Railway como fallback seguro.
  - Se actualizó el valor por defecto de `cors_origins` en el backend para permitir el dominio de producción del frontend.
- **Frontend**: Se eliminó el slash inicial en la ruta `/auth/login` para asegurar compatibilidad absoluta con el `baseURL` de la API en producción.

## [0.2.0] — 2026-03-31

### Agregado
- **Backend (Módulo Socios)**:
  - Definición de esquemas Pydantic (`Socio`, `Membresia`).
  - Servicio de negocio `socio_service` para registro de miembros y vinculación a entidades.
  - Endpoints de API `/api/v1/socios` con validación de autonomía para `ADMIN_ENTIDAD`.
- **Base de Datos**: Confirmación de modelos `Membresia` e `Infraccion`.

### Corregido
- **Frontend (Estética)**: Migración completa a **Tailwind CSS v4** y corrección de variables de diseño **Aegis Tactical**.
- **Backend (Seguridad)**: Normalización de CORS para admitir todos los orígenes en desarrollo (`APP_ENV=development`).

---

## [0.1.0] — 2026-03-30

### Agregado
- Directiva Maestra del sistema
- Directiva de Roles y Permisos
- Schema de Base de Datos
- Flujos de Negocio (FL-01 a FL-10)
- Convenciones de Código
- Plan de implementación aprobado

### Decisiones de arquitectura
- Stack: FastAPI (Python) + React/Vite + Supabase + Railway
- PWA mobile-first para funcionamiento en teléfonos personales
- Cupos de estacionamiento: opcionales, no requeridos
- Registro de salida: opcional, configurable via `configuracion.salida_requerida`
- Buscador Maestro accesible a: COMANDANTE, ADMIN_BASE, SUPERVISOR, ALCABALA
- Terminología discreta: "membresía" en lugar de referencias financieras

---

*Formato: `## [versión] — fecha`*
*Categorías: Agregado | Modificado | Deprecado | Eliminado | Corregido | Seguridad*
