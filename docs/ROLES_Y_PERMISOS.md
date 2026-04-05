# ROLES Y PERMISOS — BAGFM

> Consultar `DIRECTIVA_MAESTRA.md` antes de modificar este documento.

---

## Definición de Roles

### `COMANDANTE`
Superadministrador de la base. Acceso total al sistema.  
- Crea y administra entidades civiles.
- Crea usuarios de la base (Admin Base, Supervisores, Alcabalas).
- Aprueba, rechaza o modifica solicitudes de acceso para eventos.
- Tiene visibilidad total de todos los socios de todas las entidades.
- Puede buscar por placa, cédula o nombre.
- Puede crear y gestionar infracciones.

### `ADMIN_BASE`
Personal administrativo que apoya al Comandante.  
- Mismos permisos de visualización que el Comandante.
- Puede gestionar entidades civiles y usuarios de la base.
- Acceso al buscador maestro.
- Puede crear infracciones.
- **No puede** aprobar/rechazar solicitudes de eventos (solo el Comandante).

### `SUPERVISOR`
Personal de ronda que recorre la base.  
- Acceso al **buscador maestro** (busca por placa, cédula, nombre).
- Puede ver el estado del vehículo/socio encontrado.
- **Puede crear infracciones** desde el buscador o al escanear QR.
- No tiene acceso al panel de administración.
- No gestiona socios ni entidades.

### `ALCABALA`
Personal operacional en los puntos de entrada de la base.  
- **Cuenta Fija**: Tiene un usuario permanente vinculado al punto físico.
- **Autenticación Táctica**: Accede mediante una **clave rotativa de 6 dígitos** (cambia cada 24h).
- **Identificación Mandatoria**: Debe registrar su identidad física (Grado, Nombre, Unidad) para habilitar el escáner.
- Escanea QR para verificar autorización de entrada.
- Registra entradas (obligatorio) y salidas (según configuración).
- Recibe alertas en tiempo real de infracciones activas.
- Acceso al **buscador maestro** para confirmación manual.
- **No puede** crear infracciones ni gestionar socios.

### `ADMIN_ENTIDAD`
Administrador de una entidad civil (Parque Miranda, Club Fútbol, etc.).  
- Su acceso está limitado a su propia entidad.
- CRUD de socios de su entidad.
- Importación masiva de socios desde Excel.
- Gestión de membresías (activa, suspendida, vencida).
- Asignación de cupos de estacionamiento (**opcional**, no requerido).
- CRUD de usuarios Parquero para su entidad.
- Puede generar y revocar QR de sus socios.
- Puede solicitar acceso temporal para eventos.
- **No puede** ver datos de otras entidades.

### `PARQUERO`
Empleado de una entidad civil que gestiona la zona de estacionamiento.  
- Escanea QR del socio al llegar a la zona.
- Ve: nombre del socio, estado de membresía, cupo asignado (si tiene).
- Marca cupo como ocupado/libre (**si la entidad usa cupos**).
- Ve el estado de la zona (cuántos cupos libres/ocupados).
- **Solo puede** operar dentro de la zona de su entidad.

### `SOCIO`
Miembro de una entidad civil.  
- Registra y actualiza sus datos personales.
- Registra sus vehículos (puede tener más de uno).
- Accede a su QR de identificación.
- Ve el estado de su membresía.
- Ve su historial de entradas/salidas.
- Ve sus infracciones (activas y pasadas).
- **No puede** ver datos de otros socios.

### `VISITANTE_TEMP`
Acceso temporal aprobado para un evento.  
- No tiene cuenta en el sistema.
- Solo existe como un QR temporal generado al aprobar una solicitud de evento.
- El QR tiene fecha de expiración exacta.
- Al expirar, el QR es rechazado automáticamente.

---

## Matriz Completa de Permisos

| Acción | COMANDANTE | ADMIN_BASE | SUPERVISOR | ALCABALA | ADMIN_ENTIDAD | PARQUERO | SOCIO |
|--------|:----------:|:----------:|:----------:|:--------:|:-------------:|:--------:|:-----:|
| **PANEL GENERAL** |
| Ver dashboard base (tiempo real) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver estadísticas globales | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **ENTIDADES CIVILES** |
| Crear entidad civil | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Editar entidad civil | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver todas las entidades | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **USUARIOS DE LA BASE** |
| Crear Admin Base | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Crear Supervisor | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Crear Alcabala | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **BUSCADOR MAESTRO** |
| Buscar por placa | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Buscar por cédula | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Buscar por nombre | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **SOCIOS** |
| Ver todos los socios de todas las entidades | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Crear socio en entidad propia | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Importar socios desde Excel | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Editar socio propio | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Ver perfil propio | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Editar perfil propio | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **VEHÍCULOS** |
| Registrar vehículo (propio) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Ver vehículos de cualquier socio | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **MEMBRESÍAS** |
| Crear/editar membresía | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Ver estado de propia membresía | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **CUPOS (OPCIONAL)** |
| Asignar cupo a socio | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Ver cupo asignado propio | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **PARQUEROS** |
| Crear Parquero en entidad propia | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **QR** |
| Generar QR para socio | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Ver propio QR | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Revocar QR de socio | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **ACCESOS (ENTRADA/SALIDA)** |
| Registrar entrada (escanear QR) | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Registrar salida (escanear QR) | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Verificar QR en zona | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Confirmar acceso manual | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Ver historial propio | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Ver historial de todos | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **INFRACCIONES** |
| Crear infracción | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver infracciones propias | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Ver todas las infracciones | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver infracciones de su entidad | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Resolver/perdonar infracción | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **SOLICITUDES DE EVENTO** |
| Solicitar evento | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Aprobar/Denegar evento | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver solicitudes | ✅ | ✅ | ❌ | ❌ | ✅ (propias) | ❌ | ❌ |
| **ALCABALAS Y GUARDIAS** |
| Configurar punto de acceso (Alcabala) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver alcabalas y claves del día | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Regenerar clave de emergencia | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Registrar identificación de guardia | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Monitorear personal activo | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Implementación en Backend (FastAPI)

```python
# Ejemplo de uso en endpoints
from app.api.deps import require_role
from app.core.enums import Rol

@router.get("/buscador")
async def buscador(
    q: str,
    current_user = Depends(require_role([
        Rol.COMANDANTE,
        Rol.ADMIN_BASE,
        Rol.SUPERVISOR,
        Rol.ALCABALA
    ]))
):
    ...
```

### Enum de Roles
```python
class Rol(str, Enum):
    COMANDANTE = "COMANDANTE"
    ADMIN_BASE = "ADMIN_BASE"
    SUPERVISOR = "SUPERVISOR"
    ALCABALA = "ALCABALA"
    ADMIN_ENTIDAD = "ADMIN_ENTIDAD"
    PARQUERO = "PARQUERO"
    SOCIO = "SOCIO"
```

---

*Última actualización: 2026-04-05 | Ver: DIRECTIVA_MAESTRA.md para contexto*
