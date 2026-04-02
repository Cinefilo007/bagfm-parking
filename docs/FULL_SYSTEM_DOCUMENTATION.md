# 📚 DOCUMENTACIÓN COMPLETA DEL SISTEMA BAGFM
**Versión**: 0.5.0 (Gestión Operativa)  
**Fecha de unificación**: 2026-04-02 01:12

Este documento consolida todas las directivas del sistema. **Fuente Única de Verdad**.

---

## 1. DIRECTIVA MAESTRA
(Contenido de docs/DIRECTIVA_MAESTRA.md)

# DIRECTIVA MAESTRA — BAGFM
**Sistema de Control de Acceso Vehicular**  
Base Aérea Generalísimo Francisco de Miranda  

---

## 1. Identidad del Sistema

| Campo | Valor |
|-------|-------|
| **Nombre** | BAGFM — Control de Acceso Vehicular |
| **Versión** | 0.5.0 (Gestión Operativa) |
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

---

## 3. Stack Tecnológico

| Capa | Tecnología | Versión mínima |
|------|-----------|---------------|
| Frontend | React + Vite | React 18 / Vite 5 |
| Estilos | Tailwind CSS | 4.x (Aegis Tactical) |
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

## 2. SCHEMA BASE DE DATOS
(Contenido de docs/SCHEMA_BD.md)

# SCHEMA BASE DE DATOS — BAGFM

## Tablas Principales

### `usuarios`
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID | PK |
| `cedula` | VARCHAR | UNIQUE |
| `rol` | ENUM | COMANDANTE, ADMIN_BASE, SUPERVISOR, ALCABALA, ADMIN_ENTIDAD, PARQUERO, SOCIO |
| `expira_at` | TIMESTAMPTZ | Caducidad para guardias temporales |

### `puntos_acceso`
Puntos físicos de control (alcabalas).
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID | PK |
| `nombre` | VARCHAR | Ej: "Alcabala Principal" |

### `solicitudes_evento` (FL-08)
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID | PK |
| `cantidad_solicitada` | INT | — |
| `cantidad_aprobada` | INT | Por el mando |
| `estado` | ENUM | pendiente, aprobada, aprobada_parcial, denegada |

---

## 3. ROLES Y PERMISOS
(Contenido de docs/ROLES_Y_PERMISOS.md)

### `ALCABALA`
Guardia de turno. Personal con **cuenta temporal** (24h) creada por el Comandante.  
- Escanea QR para verificar autorización.
- Recibe alertas de infracciones en tiempo real.

### Matriz de Mando
| Acción | COMANDANTE |
|--------|:----------:|
| Aprobar/Denegar evento | ✅ |
| Crear guardia temporal | ✅ |
| Registrar punto acceso | ✅ |

---

## 4. FLUJOS DE NEGOCIO

### FL-08 — Solicitud de Acceso para Evento (Masivo)
1. Entidad solicita cantidad N.
2. Comandante aprueba parcial M.
3. Generación automática de M pases JWT `pase_evento`.

### FL-11 — Gestión de Guardias Temporales
1. Comandante crea cuenta con `expira_at = 08:30 AM`.
2. Guardia ingresa.
3. El sistema garantiza cierre atómico post-guardia.

### FL-12 — Notificación de Infracción en Red
1. Registro de infracción con bloqueo.
2. Alerta HUD a todas las alcabalas activas.

---

## 5. DIRECTIVA ALCABALAS
- **Turno táctico**: Ciclos de 24h finalizando a las 08:30 AM VET.
- **Validación Dual**: QR permanente (socios) vs QR temporal (eventos).

---

## 6. REGISTRO DE CAMBIOS

### [0.5.0] — 2026-04-02
- **Implementado**: Mando táctico, Alcabalas con guardias 24h, Eventos masivos (FL-08).
- **Estabilidad**: Solución final de errores 502 y CORS en Railway.

---

*(Fin del documento consolidado)*
