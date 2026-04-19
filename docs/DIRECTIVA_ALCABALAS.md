# DIRECTIVA — MÓDULO ALCABALAS (BAGFM v2.0)

Este documento define el estándar de implementación para el módulo de control de acceso y el protocolo de relevo táctico en puntos de control (alcabalas). **Consultar obligatoriamente ante cualquier cambio estructural.**

---

## 1. Visión General
El módulo de Alcabala es la interfaz operativa del personal de guardia. Su función es validar el ingreso de socios y vehículos mediante el escaneo de códigos QR, verificando en tiempo real la vigencia de credenciales y la ausencia de infracciones bloqueantes.

**v2.0 — Cambio de paradigma**: El flujo del guardia de alcabala se **simplifica**. La verificación de identidad y el registro de datos del socio se delegan al **parquero** (ver DIRECTIVA_PARQUERO.md). El guardia:
- Escanea QR → recibe respuesta inmediata
- Si es válido: registra entrada + opcionalmente registra datos
- Notifica automáticamente al parquero vía WebSocket + Push

---

## 2. Gestión de Seguridad y Relevo (Protocolo Táctico)

### RT-01 — Cuentas Fijas y Claves Rotativas
- **Identidad Fija**: Cada alcabala física tiene una cuenta de usuario persistente.
- **Rotación Máxima**: La contraseña cambia automáticamente cada **24 horas**.
- **Sincronización**: A las **08:30 AM Caracas (VET)**.
- **Código de 6 dígitos**: Generado algorítmicamente basado en `secret_key` + fecha táctica.
- **Regeneración de Emergencia**: El Comandante puede invalidar la clave actual refrescando `key_salt`.

### RT-02 — Protocolo de Identificación Mandatorio
1. **Acceso Inicial**: Al loguearse, el sistema bloquea funciones de escaneo.
2. **Registro de Relevo**: El guardia debe suministrar:
   - Grado Militar
   - Nombres y Apellidos
   - Unidad de Adscripción
   - Teléfono de Contacto
3. **Validación de Turno**: Una vez registrado, se habilita el Dashboard Operativo.

---

## 3. Lógica de Validación (SOP) — v2.0

### FL-04 v2 — Flujo de Validación de Acceso (Simplificado)

```
1. ESCANEO: Captura del token JWT desde el QR

2. VALIDACIÓN del sistema:
   a. Firma JWT válida
   b. QR activo y no expirado
   c. Membresía activa (si aplica)
   d. Infracciones bloqueantes (solo para salida)

3. RESPUESTA al guardia:

   ✅ VÁLIDO CON DATOS:
   → Pantalla verde
   → Muestra: nombre, foto, entidad, vehículo, ZONA ASIGNADA
   → Botones:
     - "REGISTRAR ENTRADA" (acción principal)
     - "SEGUIR ESCANEANDO" (volver al escáner)

   ✅ VÁLIDO SIN DATOS (pase sin datos completos):
   → Pantalla verde con indicador "DATOS PENDIENTES"
   → Botones:
     - "REGISTRAR ENTRADA" (confirma sin datos — válido)
     - "REGISTRAR DATOS" (OPCIONAL — abre formulario de datos)
     - "SEGUIR ESCANEANDO"

   ❌ INVÁLIDO:
   → Pantalla roja
   → Motivo de rechazo
   → Opción de acceso manual (si tiene permiso)

4. Al confirmar ENTRADA:
   - Se registra acceso tipo "entrada" en tabla accesos
   - Se guarda hora_entrada_base en codigos_qr
   - Se emite WS: vehiculo_ingreso_base al parquero de la zona
   - Se envía Push Notification al parquero
   - Si socio solicita: botón "COMPARTIR UBICACIÓN"
     → Deep link a Google Maps/Waze con coords de la zona

5. IMPORTANTE:
   - El registro de datos es OPCIONAL en la alcabala
   - La verificación completa se delega al PARQUERO
   - El formulario de "REGISTRAR DATOS" es el mismo que existía antes
     pero ahora es un botón opcional, no obligatorio
```

---

## 4. Arquitectura Técnica

### Backend
- **Service**: `alcabala_service.py` — CRUD de alcabalas, regeneración de claves, registro de relevos
- **Service**: `acceso_service.py` — Validación de QR (evolución v2.0: incluye zona_asignada)
- **Security**: `password_rotativo.py` — Lógica criptográfica de claves de 6 dígitos
- **Models**: 
  - `PuntoAcceso`: Semillas de clave y usuario vinculado
  - `GuardiaTurno`: Historial de personal físico en el punto

### Frontend
- **Dashboard**: `Dashboard.jsx` (Alcabala) con bloqueo de identificación mandatoria
- **Scanner**: `Scanner.jsx` (Alcabala) — Simplificado v2.0:
  - Escaneo → respuesta inmediata
  - Botones: Registrar Entrada / Registrar Datos (opcional) / Seguir Escaneando
  - Botón compartir ubicación de estacionamiento
- **Mando**: `Alcabalas.jsx` (Comandante) con monitor de personal y gestión de claves

### WebSocket / Push
- Al confirmar entrada: emite `vehiculo_ingreso_base` al canal `zona:{zona_id}`
- Push Notification al parquero: "🚗 [PLACA] en camino a tu zona"

---

## 5. Convenciones de Seguridad
- Nunca almacenar el código de 6 dígitos en texto plano
- Toda acción de escaneo debe estar vinculada a un registro activo de `GuardiaTurno`
- El botón de contacto (Llamada/Copia) en el panel de mando es prioridad
- El formulario de datos (REGISTRAR DATOS) es OPCIONAL — no bloquea el acceso

---

*Última actualización: 2026-04-18 | v2.0 — Alcabala Simplificada*
*Docs Relacionados: SCHEMA_BD.md, ROLES_Y_PERMISOS.md, DIRECTIVA_PARQUERO.md*
