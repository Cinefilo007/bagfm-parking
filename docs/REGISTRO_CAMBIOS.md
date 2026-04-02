# REGISTRO DE CAMBIOS — BAGFM

> Este documento registra todos los cambios significativos al sistema.  
> Sigue el formato [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

---

## [0.5.1] — 2026-04-02

### Corregido
- **Backend (Despliegue)**: Reparación de `ImportError` crítico que impedía el inicio del servidor en producción.
- **Backend (Arquitectura)**: Consolidación de módulos `comando` y `eventos` en la raíz de `api/v1/`, eliminando subdirectorios inconsistentes.
- **Backend (Core)**: Normalización de dependencias de núcleo (`obtener_db`, `obtener_usuario_actual`) en módulos operativos.
- **Backend (Schemas)**: Restauración del esquema `CodigoQR` faltante requerido para el flujo de eventos masivos.

## [0.5.0] — 2026-04-02

### Añadido
- **Gestión Operativa de Mando**: Implementación del Dashboard del Comandante para supervisión de accesos.
- **Módulo de Alcabalas**: Registro de puntos físicos y creación de guardias temporales de 24h.
- **Control de Expiración**: Lógica de caducidad automática de cuentas a las 08:30 AM (VET).
- **Pases Masivos (FL-08)**: Flujo completo de solicitud, aprobación parcial y generación masiva de QRs genéricos.
- **Seguridad**: Validación de tokens `pase_evento` y alertas en tiempo real de infracciones.

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

## [0.4.0] — 2026-04-02

### Añadido
- **Producción**: Milestone de estabilidad alcanzado. El sistema es totalmente funcional en Railway.

### Corregido
- **Infraestructura**: Resolución final del error 502 mediante el mapeo correcto del puerto dinámico de Railway (`8080`).
- **Limpieza**: Eliminación de todos los logs de diagnóstico y middlewares de depuración v0.3.x.
- **Seguridad**: Restauración de la configuración CORS restrictiva basada en variables de entorno.

## [0.3.0] — 2026-04-02

### Corregido (Parche de Estabilidad Railway)

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
