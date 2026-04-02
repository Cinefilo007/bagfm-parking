# DIRECTIVA — MÓDULO ALCABALAS (BAGFM)

Este documento define el estándar de implementación para el módulo de control de acceso en puntos de control (alcabalas). Consultar antes de realizar cambios en este componente.

---

## 1. Visión General
El módulo de Alcabala es la interfaz principal del Guardia Alcabala. Su función es validar el ingreso de socios y vehículos mediante el escaneo de códigos QR, verificando en tiempo real la vigencia de la membresía y la ausencia de sanciones bloqueantes.

## 2. Lógica de Negocio (SOP)

### FL-04 — Flujo de Validación
1. **Escaneo**: Captura del token JWT desde el código QR (Permanente o Pase de Evento).
2. **Validación de Identidad**: Verificación de la firma del JWT y vigencia del token.
3. **Pases de Evento (FL-08)**: 
   - El sistema reconoce el tipo `pase_evento`.
   - Verifica que el evento sea hoy y en horario permitido.
4. **Validación de Estado (Membresía)**:
   - Debe estar en estado `activa`.
   - Fecha de fin (si existe) debe ser >= hoy.
5. **Validación de Sanciones**:
   - Si es **entrada**: Solo informativo.
   - Si es **salida**: Si existe infracción con `bloquea_salida = true`, el sistema impide la confirmación del egreso.
6. **Registro**: Creación de registro en la tabla `accesos`.

### FL-11 — Normativa de Guardias Temporales
- **Duración**: Ciclos de 24 horas.
- **Horario**: Inicio/Fin a las **08:30 AM (VET)**.
- **Dispositivos**: Uso de teléfonos personales mediante PWA segura.
- **Expiración**: Las cuentas se bloquean automáticamente al finalizar el turno para evitar accesos residuales al sistema.

## 3. Arquitectura Técnica

### Backend
- **Service**: `acceso_service.py` manejará la orquestación (validar QR -> check membresía -> check infracciones -> registrar).
- **Endpoint**: `POST /api/v1/accesos/validar` y `POST /api/v1/accesos/registrar`.
- **Model**: `Acceso` (ORM SQLAlchemy).

### Frontend
- **Página**: `Alcabala.jsx` con diseño premium (Dark Mode, transiciones suaves).
- **Componente**: `QRScanner` integrado (usando `html5-qrcode` o similar).
- **Feedback Visual**: 
  - ✅ **Verde**: Acceso permitido.
  - ❌ **Rojo**: Acceso denegado (con motivo).
  - ⚠️ **Naranja**: Alerta (ej: infracción no bloqueante).

---

## 4. Convenciones de Código
- Los mensajes de error deben ser amigables y en español.
- El registro de acceso debe ser atómico.
- Los logs deben incluir el ID del guardia que registra el acceso (`registrado_por`).

---
*Última actualización: 2026-04-02 | Ver: DIRECTIVA_MAESTRA.md para contexto*
