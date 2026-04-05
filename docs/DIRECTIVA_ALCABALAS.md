# DIRECTIVA — MÓDULO ALCABALAS (BAGFM)

Este documento define el estándar de implementación para el módulo de control de acceso y el protocolo de relevo táctico en puntos de control (alcabalas). **Consultar obligatoriamente ante cualquier cambio estructural.**

---

## 1. Visión General
El módulo de Alcabala es la interfaz operativa del personal de guardia. Su función es validar el ingreso de socios y vehículos mediante el escaneo de códigos QR, verificando en tiempo real la vigencia de credenciales y la ausencia de infracciones bloqueantes.

## 2. Gestión de Seguridad y Relevo (Protocolo Táctico)

### RT-01 — Cuentas Fijas y Claves Rotativas
- **Identidad Fija**: Cada alcabala física tiene una cuenta de usuario persistente (ej: `guardia.principal`).
- **Rotación Máxima**: La contraseña de acceso cambia automáticamente cada **24 horas**.
- **Sincronización**: El cambio ocurre a las **08:30 AM Caracas (VET)**.
- **Generación Táctica**: La clave es un código de 6 dígitos generado algorítmicamente basado en una semilla secreta única por punto (`secret_key`) y la fecha táctica.
- **Regeneración de Emergencia**: El Comandante puede invalidar la clave actual refrescando la sal (`key_salt`) del punto, forzando un cambio inmediato ante fugas de información.

### RT-02 — Protocolo Mandibular de Identificación
1. **Acceso Inicial**: Al loguearse por primera vez en el turno, el sistema bloquea las funciones de escaneo.
2. **Registro de Relevo**: El guardia debe suministrar:
   - Grado Militar
   - Nombres y Apellidos
   - Unidad de Adscripción
   - Teléfono de Contacto
3. **Validación de Turno**: Una vez registrado, se habilita el Dashboard Operativo. Este registro es mandatorio para la trazabilidad histórica de quién operó físicamente el punto.

## 3. Lógica de Validación (SOP)

### FL-04 — Flujo de Validación de Acceso
1. **Escaneo**: Captura del token JWT desde el QR.
2. **Validación de Identidad**: Verificación de firma y vigencia.
3. **Validación de Sanciones**:
   - **Entrada**: Informativo (Alerta naranja).
   - **Salida**: Si existe infracción con `bloquea_salida = true`, el sistema **impide** la confirmación del egreso.
4. **Registro de Acceso**: Creación de registro atómico en la tabla `accesos`, vinculando el `usuario_id` del punto y el registro activo de `GuardiaTurno`.

## 4. Arquitectura Técnica

### Backend
- **Service**: `alcabala_service.py` maneja CRUD de alcabalas, regeneración de claves y registro de relevos.
- **Security**: `password_rotativo.py` contiene la lógica criptográfica de las claves de 6 dígitos.
- **Models**: 
  - `PuntoAcceso`: Semillas de clave y usuario vinculado.
  - `GuardiaTurno`: Historial de personal físico en el punto.

### Frontend
- **Dashboard**: `Dashboard.jsx` (Alcabala) con bloqueo de identificación mandibular.
- **Mando**: `Alcabalas.jsx` (Comandante) con monitor de personal en vivo y gestión de claves.

---

## 5. Convenciones de Seguridad
- Nunca almacenar el código de 6 dígitos en texto plano; se genera al vuelo o se valida contra la semilla.
- Toda acción de escaneo debe estar vinculada a un registro activo de `GuardiaTurno`.
- El botón de contacto (Llamada/Copia) en el panel de mando es prioridad para la operatividad.

---
*Última actualización: 2026-04-05 | Relevo Táctico v2.0*
*Docs Relacionados: SCHEMA_BD.md, ROLES_Y_PERMISOS.md*
