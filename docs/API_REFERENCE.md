# API REFERENCE — BAGFM

Esta referencia documenta los endpoints disponibles en la API del sistema BAGFM (v1).

---

## 🔐 Autenticación
`Base URL: /api/v1/auth`

### `POST /login`
Inicia sesión en el sistema y retorna un token JWT.
- **Body (OAuth2 Form)**: `username` (Cédula), `password`.
- **Respuesta**: Token JWT e información básica del usuario.

---

## 🏛️ Entidades Civiles
`Base URL: /api/v1/entidades`

### `GET /`
Lista todas las entidades civiles registradas.
- **Permisos**: Cualquier usuario autenticado.
- **Parámetros**: `activas_solo` (boolean, opcional).

### `POST /`
Crea una nueva entidad civil.
- **Permisos**: `COMANDANTE`, `ADMIN_BASE`.
- **Body**: `EntidadCivilCrear` (nombre, codigo_slug, zona_id, etc).

### `GET /{id}`
Obtiene detalles de una entidad específica.

### `PUT /{id}`
Actualiza una entidad.
- **Permisos**: `COMANDANTE`, `ADMIN_BASE`.

### `DELETE /{id}`
Desactivación lógica de una entidad (soft delete).
- **Permisos**: `COMANDANTE`, `ADMIN_BASE`.

---

## 👥 Socios y Membresías
`Base URL: /api/v1/socios`

### `POST /`
Registra un nuevo socio y su membresía inicial.
- **Permisos**: `COMANDANTE`, `ADMIN_BASE`, `ADMIN_ENTIDAD`.
- **Restricción**: `ADMIN_ENTIDAD` solo puede registrar para su propia entidad.

### `GET /entidad/{entidad_id}`
Lista todos los socios de una entidad.
- **Permisos**: `COMANDANTE`, `ADMIN_BASE`, `ADMIN_ENTIDAD`.
- **Restricción**: `ADMIN_ENTIDAD` solo puede ver su propia entidad.

### `POST /importar`
Carga masiva de socios desde un archivo Excel (.xlsx).
- **Permisos**: `COMANDANTE`, `ADMIN_BASE`, `ADMIN_ENTIDAD`.
- **Parámetros**: `entidad_id` (UUID).
- **Archivo**: Multi-part form data.

---

*Última actualización: 2026-04-02 | Ver: DIRECTIVA_MAESTRA.md para contexto*
