# SCHEMA BASE DE DATOS — BAGFM

> Consultar `DIRECTIVA_MAESTRA.md` antes de modificar este documento.  
> Todo cambio al schema debe reflejarse aquí con su fecha y versión.

---

## Convenciones

- Todos los IDs: `UUID` generado por PostgreSQL (`gen_random_uuid()`)
- Todos los timestamps: `TIMESTAMPTZ` en **UTC**
- Campos eliminados: **nunca se eliminan**, se marcan `deprecated`
- FK siempre con `ON DELETE RESTRICT` salvo excepción documentada

---

## Tablas

---

### `usuarios`
Todos los usuarios del sistema (todos los roles).

| Campo | Tipo | Restricción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | PK, default gen | — |
| `cedula` | VARCHAR(20) | UNIQUE, NOT NULL | Identificador principal |
| `nombre` | VARCHAR(100) | NOT NULL | — |
| `apellido` | VARCHAR(100) | NOT NULL | — |
| `email` | VARCHAR(255) | UNIQUE, NULL | Opcional en algunos roles |
| `telefono` | VARCHAR(20) | NULL | — |
| `rol` | ENUM | NOT NULL | Ver enum `rol_tipo` |
| `entidad_id` | UUID | FK → entidades_civiles, NULL | Solo para ADMIN_ENTIDAD, PARQUERO, SOCIO |
| `activo` | BOOLEAN | DEFAULT true | Soft delete |
| `foto_url` | TEXT | NULL | URL de foto de perfil |
| `password_hash` | TEXT | NOT NULL | bcrypt |
| `expira_at` | TIMESTAMPTZ | NULL | Caducidad para guardias temporales |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | — |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | — |

**Enum `rol_tipo`**: `COMANDANTE`, `ADMIN_BASE`, `SUPERVISOR`, `ALCABALA`, `ADMIN_ENTIDAD`, `PARQUERO`, `SOCIO`

---

### `entidades_civiles`
Organizaciones civiles con acceso a la base.

| Campo | Tipo | Restricción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | PK | — |
| `nombre` | VARCHAR(200) | NOT NULL | Ej: "Parque Miranda" |
| `codigo_slug` | VARCHAR(50) | UNIQUE, NOT NULL | Ej: "parque-miranda" |
| `zona_id` | UUID | FK → zonas_estacionamiento, NULL | Zona asignada |
| `capacidad_vehiculos` | INTEGER | NOT NULL, > 0 | Cupos máximos |
| `descripcion` | TEXT | NULL | — |
| `activo` | BOOLEAN | DEFAULT true | — |
| `latitud` | NUMERIC | NULL | — |
| `longitud` | NUMERIC | NULL | — |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | — |
| `created_by` | UUID | FK → usuarios | Comandante que creó |

---

### `zonas_estacionamiento`
Áreas físicas de estacionamiento dentro de la base.

| Campo | Tipo | Restricción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | PK | — |
| `nombre` | VARCHAR(200) | NOT NULL | Ej: "Zona A - Norte" |
| `capacidad_total` | INTEGER | NOT NULL | Cupos físicos totales |
| `ocupacion_actual` | INTEGER | DEFAULT 0 | Calculado por accesos |
| `descripcion_ubicacion` | TEXT | NULL | — |
| `latitud` | NUMERIC | NULL | — |
| `longitud` | NUMERIC | NULL | — |
| `radio_cobertura` | INTEGER | DEFAULT 50 | Radio en metros |
| `activo` | BOOLEAN | DEFAULT true | — |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | — |

---

### `vehiculos`
Vehículos registrados por socios.

| Campo | Tipo | Restricción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | PK | — |
| `placa` | VARCHAR(20) | UNIQUE, NOT NULL | Identificador del vehículo |
| `marca` | VARCHAR(100) | NOT NULL | — |
| `modelo` | VARCHAR(100) | NOT NULL | — |
| `color` | VARCHAR(50) | NOT NULL | — |
| `año` | INTEGER | NULL | — |
| `tipo` | VARCHAR(50) | NULL | Ej: "sedan", "SUV", "moto" |
| `socio_id` | UUID | FK → usuarios, NOT NULL | Propietario |
| `activo` | BOOLEAN | DEFAULT true | — |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | — |

---

### `membresias`
Concesión de cupo / membresía de un socio con su entidad.  
> Terminología discreta: "membresía activa" = socio con acceso vigente.

| Campo | Tipo | Restricción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | PK | — |
| `socio_id` | UUID | FK → usuarios, NOT NULL | — |
| `entidad_id` | UUID | FK → entidades_civiles, NOT NULL | — |
| `vehiculo_id` | UUID | FK → vehiculos, NULL | Vehículo asociado a esta membresía |
| `cupo_numero` | INTEGER | NULL | **OPCIONAL**: número de puesto |
| `estado` | ENUM | NOT NULL | Ver enum `membresia_estado` |
| `fecha_inicio` | DATE | NOT NULL | — |
| `fecha_fin` | DATE | NULL | NULL = indefinido |
| `observaciones` | TEXT | NULL | — |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | — |
| `created_by` | UUID | FK → usuarios | Admin Entidad que creó |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | — |

**Enum `membresia_estado`**: `activa`, `suspendida`, `vencida`

---

### `codigos_qr`
QR de identificación por socio/vehículo.

| Campo | Tipo | Restricción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | PK | — |
| `usuario_id` | UUID | FK → usuarios, NOT NULL | A quién pertenece |
| `vehiculo_id` | UUID | FK → vehiculos, NULL | Si el QR es por vehículo |
| `membresia_id` | UUID | FK → membresias, NULL | Membresía asociada |
| `tipo` | ENUM | NOT NULL | Ver enum `qr_tipo` |
| `token` | TEXT | UNIQUE, NOT NULL | JWT firmado |
| `solicitud_id` | UUID | FK → solicitudes_evento, NULL | Asocia pases masivos a evento |
| `fecha_expiracion` | TIMESTAMPTZ | NULL | NULL = permanente |
| `activo` | BOOLEAN | DEFAULT true | Revocable |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | — |
| `created_by` | UUID | FK → usuarios | Quién lo generó |

**Enum `qr_tipo`**: `permanente`, `temporal`

---

### `accesos`
Log de entradas y salidas de la base.

| Campo | Tipo | Restricción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | PK | — |
| `qr_id` | UUID | FK → codigos_qr, NULL | NULL si acceso manual |
| `usuario_id` | UUID | FK → usuarios, NOT NULL | Quien entra/sale |
| `vehiculo_id` | UUID | FK → vehiculos, NULL | Vehículo si aplica |
| `tipo` | ENUM | NOT NULL | Ver enum `acceso_tipo` |
| `punto_acceso` | VARCHAR(100) | NOT NULL | Ej: "Alcabala Principal" |
| `registrado_por` | UUID | FK → usuarios, NOT NULL | El guardia/parquero |
| `es_manual` | BOOLEAN | DEFAULT false | Acceso confirmado manualmente |
| `timestamp` | TIMESTAMPTZ | DEFAULT now() | — |

**Enum `acceso_tipo`**: `entrada`, `salida`

---

### `accesos_zona`
Log de entrada/salida en zona de estacionamiento (parquero).

| Campo | Tipo | Restricción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | PK | — |
| `qr_id` | UUID | FK → codigos_qr, NULL | — |
| `usuario_id` | UUID | FK → usuarios | Socio |
| `vehiculo_id` | UUID | FK → vehiculos, NULL | — |
| `zona_id` | UUID | FK → zonas_estacionamiento | — |
| `cupo_numero` | INTEGER | NULL | Si usa sistema de cupos |
| `tipo` | ENUM | NOT NULL | `entrada` o `salida` |
| `registrado_por` | UUID | FK → usuarios | Parquero |
| `timestamp` | TIMESTAMPTZ | DEFAULT now() | — |

---

### `infracciones`
Sanciones registradas por supervisores o el Comandante.

| Campo | Tipo | Restricción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | PK | — |
| `vehiculo_id` | UUID | FK → vehiculos, NOT NULL | — |
| `usuario_id` | UUID | FK → usuarios, NOT NULL | Propietario del vehículo |
| `reportado_por` | UUID | FK → usuarios, NOT NULL | Supervisor o Comandante |
| `tipo` | ENUM | NOT NULL | Ver enum `infraccion_tipo` |
| `descripcion` | TEXT | NOT NULL | — |
| `foto_url` | TEXT | NULL | — |
| `bloquea_salida` | BOOLEAN | DEFAULT true | Si bloquea en alcabala |
| `estado` | ENUM | NOT NULL | Ver enum `infraccion_estado` |
| `resuelta_por` | UUID | FK → usuarios, NULL | — |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | — |
| `resuelta_at` | TIMESTAMPTZ | NULL | — |
| `observaciones_resolucion` | TEXT | NULL | — |

**Enum `infraccion_tipo`**: `mal_estacionado`, `exceso_velocidad`, `conducta_indebida`, `documentos_vencidos`, `otro`  
**Enum `infraccion_estado`**: `activa`, `resuelta`, `perdonada`

---

### `solicitudes_evento`
Solicitudes de acceso temporal masivo para eventos.

| Campo | Tipo | Restricción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | PK | — |
| `entidad_id` | UUID | FK → entidades_civiles | — |
| `solicitado_por` | UUID | FK → usuarios | Admin Entidad |
| `fecha_evento` | DATE | NOT NULL | — |
| `hora_inicio` | TIME | NULL | — |
| `hora_fin` | TIME | NULL | — |
| `cantidad_solicitada` | INTEGER | NOT NULL | Vehículos pedidos |
| `cantidad_aprobada` | INTEGER | NULL | Aprobados por Comandante |
| `motivo` | TEXT | NOT NULL | — |
| `estado` | ENUM | NOT NULL | Ver enum `solicitud_estado` |
| `revisado_por` | UUID | FK → usuarios, NULL | Comandante/Admin Base |
| `motivo_rechazo` | TEXT | NULL | — |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | — |
| `revisado_at` | TIMESTAMPTZ | NULL | — |

**Enum `solicitud_estado`**: `pendiente`, `aprobada`, `aprobada_parcial`, `denegada`

---

### `puntos_acceso`
Puntos físicos de control (alcabalas).

| Campo | Tipo | Restricción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | PK | — |
| `nombre` | VARCHAR(100) | NOT NULL | Ej: "Alcabala Norte" |
| `latitud` | NUMERIC | NULL | — |
| `longitud` | NUMERIC | NULL | — |
| `activo` | BOOLEAN | DEFAULT true | — |

---

### `accesos_temporales`
QR temporales generados al aprobar una solicitud de evento.

| Campo | Tipo | Restricción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | PK | — |
| `solicitud_id` | UUID | FK → solicitudes_evento | — |
| `qr_id` | UUID | FK → codigos_qr | QR generado |
| `nombre_visitante` | VARCHAR(200) | NULL | Opcional |
| `placa_visitante` | VARCHAR(20) | NULL | Opcional |
| `usado` | BOOLEAN | DEFAULT false | Ya fue escaneado |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | — |

---

### `push_subscriptions`
Suscripciones Push Notifications (Web Push API).

| Campo | Tipo | Restricción | Notas |
|-------|------|-------------|-------|
| `id` | UUID | PK | — |
| `usuario_id` | UUID | FK → usuarios | — |
| `endpoint` | TEXT | NOT NULL | — |
| `p256dh` | TEXT | NOT NULL | Clave pública del cliente |
| `auth` | TEXT | NOT NULL | — |
| `dispositivo` | VARCHAR(100) | NULL | User agent info |
| `activo` | BOOLEAN | DEFAULT true | — |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | — |

---

### `configuracion`
Parámetros globales del sistema. Modificables sin deploy.

| Campo | Tipo | Restricción | Notas |
|-------|------|-------------|-------|
| `clave` | VARCHAR(100) | PK | — |
| `valor` | TEXT | NOT NULL | — |
| `descripcion` | TEXT | NULL | — |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | — |

**Claves predefinidas:**

| Clave | Valor default | Descripción |
|-------|--------------|-------------|
| `salida_requerida` | `false` | Si la alcabala debe registrar salida |
| `max_vehiculos_por_evento` | `50` | Límite de vehículos por solicitud |
| `qr_expiracion_temporal_horas` | `24` | Vigencia de QR temporales |
| `bloquear_salida_por_infraccion` | `true` | Bloqueo automático |

---

## Índices Recomendados

```sql
-- Búsqueda frecuente en alcabalas y supervisores
CREATE INDEX idx_vehiculos_placa ON vehiculos(placa);
CREATE INDEX idx_usuarios_cedula ON usuarios(cedula);
CREATE INDEX idx_accesos_timestamp ON accesos(timestamp DESC);
CREATE INDEX idx_infracciones_vehiculo ON infracciones(vehiculo_id) WHERE estado = 'activa';
CREATE INDEX idx_membresias_socio ON membresias(socio_id) WHERE estado = 'activa';
CREATE INDEX idx_codigos_qr_token ON codigos_qr(token) WHERE activo = true;
```

---

## Historial de Cambios del Schema

| Versión | Fecha | Cambio |
|---------|-------|--------|
| 0.1.0 | 2026-03-30 | Schema inicial definido |
| 0.6.1 | 2026-04-04 | Agregados campos de geoposicionamiento para Mapa Táctico |

---

*Última actualización: 2026-03-30 | Ver: DIRECTIVA_MAESTRA.md para contexto*
