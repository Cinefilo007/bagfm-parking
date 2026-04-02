# DIRECTIVA MAESTRA — BAGFM
**Sistema de Control de Acceso Vehicular**  
Base Aérea Generalísimo Francisco de Miranda  

---

> **LEER ANTES DE ESCRIBIR CUALQUIER LÍNEA DE CÓDIGO**  
> Este documento es la fuente de verdad del proyecto. Todo agente, desarrollador o IA que trabaje en este sistema debe consultarlo primero y mantenerlo actualizado.

---

## 1. Identidad del Sistema

| Campo | Valor |
|-------|-------|
| **Nombre** | BAGFM — Control de Acceso Vehicular |
| **Versión** | 0.6.0 (PWA & Navigation Stability) |
| **Dominio** | Configurable via `APP_DOMAIN` (`.env`) |
| **Idioma** | Español (código, comentarios, variables, UI) |
| **Metodología** | Mejora Infinita — SOPs vs Ejecución |

---

## 2. Metodología: Mejora Infinita

El sistema está diseñado para **evolucionar continuamente** sin romper lo existente.

### Principios

**1. SOPs vs Ejecución**  
- La lógica de negocio vive en `backend/app/services/` (SOPs).
- Las rutas API en `backend/app/api/` solo orquestan y delegan.
- El frontend consume APIs. **Nunca** escribe lógica de negocio en componentes.

**2. Todo cambio tiene documentación**  
- Cada nueva funcionalidad o modificación mayor debe reflejarse en las directivas correspondientes.
- Las directivas se actualizan **antes** de hacer merge al branch principal.

**3. Ningún campo se elimina, se depreca**  
- Si un campo ya no se usa, se marca `deprecated: true` en el schema y se documenta aquí.
- Esto protege la integridad histórica de los datos.

**4. Configuración > Hardcoding**  
- Cualquier comportamiento que pueda cambiar en el futuro va en `.env` o en la tabla `configuracion` de la BD.
- Ejemplos: `salida_requerida`, `max_vehiculos_evento`, `APP_DOMAIN`.

**5. Ciclo de mejora**  
```
Identificar necesidad
    → Documentar en directiva correspondiente
    → Planificar cambio (sin romper lo existente)
    → Implementar
    → Verificar
    → Actualizar directivas
    → Repetir
```

---

## 3. Stack Tecnológico

| Capa | Tecnología | Versión mínima |
|------|-----------|---------------|
| Frontend | React + Vite | React 18 / Vite 5 |
| Estilos | Tailwind CSS | 3.x |
| Estado | Zustand | 4.x |
| Backend | Python — FastAPI | Python 3.11 / FastAPI 0.110 |
| ORM | SQLAlchemy + Alembic | 2.x |
| Base de datos | Supabase (PostgreSQL) | PostgreSQL 15+ |
| Auth | JWT (HS256) | — |
| Tiempo real | Supabase Realtime | — |
| QR (generación) | `qrcode` (Python) | 7.x |
| QR (escaneo) | `jsQR` (JS) | 1.x |
| Excel import | `openpyxl` (Python) | 3.x |
| Push | Web Push API (VAPID) | — |
| Deploy | Railway | — |
| PWA | Vite PWA Plugin | 0.19.x |

---

## 4. Estructura de Carpetas

```
bagfm/
├── backend/               # API Python FastAPI
│   ├── app/
│   │   ├── api/v1/        # Rutas (solo orquestación)
│   │   ├── core/          # Config, seguridad, DB
│   │   ├── models/        # SQLAlchemy ORM
│   │   ├── schemas/       # Pydantic (entrada/salida)
│   │   └── services/      # 🧠 Lógica de negocio (SOPs)
│   ├── migrations/        # Alembic
│   ├── .env.example
│   ├── requirements.txt
│   └── Procfile
│
├── frontend/              # React + Vite PWA
│   ├── public/
│   │   ├── manifest.json
│   │   └── sw.js
│   ├── src/
│   │   ├── components/    # UI reutilizable
│   │   ├── pages/         # Vistas por rol
│   │   ├── services/      # Llamadas a la API
│   │   ├── store/         # Zustand stores
│   │   └── utils/         # Helpers
│   ├── vite.config.js
│   └── package.json
│
└── docs/                  # 📚 Directivas del sistema
    ├── DIRECTIVA_MAESTRA.md    ← este archivo
    ├── GUIA_VISUAL.md          ← 🎨 Design system Aegis Tactical (LEER antes de CSS)
    ├── ROLES_Y_PERMISOS.md
    ├── SCHEMA_BD.md
    ├── FLUJOS_DE_NEGOCIO.md
    ├── CONVENCIONES_CODIGO.md
    ├── API_REFERENCE.md
    └── REGISTRO_CAMBIOS.md
```

---

## 5. Variables de Entorno Críticas

Definidas en `backend/.env` y `frontend/.env`. Ver `.env.example` en cada carpeta.

| Variable | Dónde | Descripción |
|----------|-------|-------------|
| `APP_DOMAIN` | frontend | URL base del sistema |
| `API_URL` | frontend | URL del backend FastAPI |
| `SUPABASE_URL` | backend | URL del proyecto Supabase |
| `SUPABASE_SERVICE_KEY` | backend | Clave de servicio (privada) |
| `DATABASE_URL` | backend | URL directa PostgreSQL |
| `JWT_SECRET` | backend | Clave para firmar tokens |
| `VAPID_PUBLIC_KEY` | ambos | Clave pública Push |
| `VAPID_PRIVATE_KEY` | backend | Clave privada Push |
| `TELEGRAM_BOT_TOKEN` | backend | (futuro) |

---

## 6. Reglas de Desarrollo

### Backend (FastAPI)
- Todas las funciones de negocio van en `services/`. **Nunca** en los endpoints.
- Los endpoints solo: validan permisos → llaman el service → retornan respuesta.
- Usar `Depends(get_current_user)` en todos los endpoints protegidos.
- Usar `Depends(require_role([...]))` para control de acceso por rol.
- Todos los IDs son `UUID4`.
- Todos los timestamps en `UTC`.

### Frontend (React)
- Las llamadas a la API van en `services/`. **Nunca** directamente en componentes.
- El estado global (usuario, sesión, notificaciones) va en `store/`.
- Las páginas son tontas: solo muestran, llaman services, manejan estados locales simples.
- Navigation Layout: El menú inferior (BottomNav) se inyecta globalmente vía RutaProtegida.
- Mobile-first siempre. Probar en 375px de ancho como base.
- El sistema es PWA: Instalable en iOS/Android con Service Worker y Manifiesto.

### Base de Datos
- Ninguna migración elimina columnas sin deprecación previa.
- Toda tabla tiene `created_at TIMESTAMPTZ DEFAULT now()`.
- Toda tabla tiene `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`.
- Las relaciones FK siempre tienen `ON DELETE RESTRICT` salvo excepción documentada.

---

## 7. Directivas Relacionadas

| Documento | Propósito |
|-----------|-----------|
| [GUIA_VISUAL.md](./GUIA_VISUAL.md) | 🎨 Design system completo — colores, fuentes, componentes |
| [ROLES_Y_PERMISOS.md](./ROLES_Y_PERMISOS.md) | Matriz completa de accesos por rol |
| [SCHEMA_BD.md](./SCHEMA_BD.md) | Schema de base de datos detallado |
| [FLUJOS_DE_NEGOCIO.md](./FLUJOS_DE_NEGOCIO.md) | Flujos paso a paso de cada proceso |
| [CONVENCIONES_CODIGO.md](./CONVENCIONES_CODIGO.md) | Nombres, estructura, estilo de código |
| [API_REFERENCE.md](./API_REFERENCE.md) | Endpoints disponibles y contratos |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 🚀 Guía de despliegue para GitHub y Railway |
| [REGISTRO_CAMBIOS.md](./REGISTRO_CAMBIOS.md) | Log de cambios mayor por versión |

---

## 8. Estado Actual del Sistema

| Módulo | Estado |
|--------|--------|
| Planificación | ✅ Completa |
| Directivas | ✅ Completas |
| Setup proyecto | ✅ Completo |
| Schema BD | ✅ Completo |
| Autenticación | ✅ Completa |
| Panel Comandante | 🏗️ En progreso |
| Portal Entidad | 🏗️ En progreso |
| Portal Alcabala | ⏳ Pendiente |
| Portal Parquero | ⏳ Pendiente |
| Portal Socio | ⏳ Pendiente |
| Portal Supervisor | ⏳ Pendiente |
| QR engine | ⏳ Pendiente |
| Importación Excel | ⏳ Pendiente |
| Push Notifications | ⏳ Pendiente |
| PWA completa | ✅ Completo |
| Deploy Railway | ✅ Completo |

---

*Última actualización: 2026-04-02 | Autor: Antigravity*  
*Guía Visual: Design System Aegis Tactical generado y validado en Google Stitch · Proyecto `4512440937494164528`*
