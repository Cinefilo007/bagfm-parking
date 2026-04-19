# DIRECTIVA — MÓDULO PARQUERO Y SUPERVISOR (BAGFM v2.0)

> **Filosofía**: "PREPARARNOS PARA EL CAOS"  
> Los eventos masivos en vías de una sola dirección son el principal reto. Este módulo debe garantizar la entrada y salida ordenada de vehículos.

---

## 1. Visión General

El módulo de parquero gestiona dos roles complementarios:

- **PARQUERO**: Operador de campo en zona de estacionamiento
- **SUPERVISOR_PARQUEROS**: "Director de orquesta" — coordina parqueros, zonas y flujo vehicular

El parquero asume responsabilidades delegadas de la alcabala:
- Verificación de identidad con **escaneo de documentos vía IA** (mismo sistema que la alcabala)
- Registro de datos completos cuando el socio no los tiene
- Asignación de puestos (pre-asignados, automáticos o manuales)
- Control de entrada/salida de la zona

---

## 2. Autenticación

### Login Personalizado (ambos roles)
- Cada parquero/supervisor tiene cuenta propia: **cédula + contraseña**
- Creado por el Admin de la Entidad
- Credenciales persistentes (a diferencia de la alcabala)
- Admin puede revocar acceso inmediatamente

---

## 3. Dashboard del Parquero

### Información visible:
- **Estado zona**: puestos ocupados/libres/reservados (barra de progreso)
- **Vehículos en camino**:
  - Lista de vehículos que pasaron la alcabala
  - **SI tiene datos**: muestra marca, modelo, color, placa, nombre del socio
  - **SI NO tiene datos**: indicador "⚠️ DATOS PENDIENTES — preparar registro"
- **Lista vehículos en zona**: todos los estacionados con datos de contacto
- **Mensajes del supervisor**: bandeja de instrucciones broadcast
- **Métricas personales**: vehículos atendidos, tiempo promedio

### Actualizaciones (WebSocket):
- Nueva entrada alcabala → aparece en "vehículos en camino" CON DETALLES
- Cambio de estado puesto → actualiza mapa/lista
- Broadcast del supervisor → notificación inmediata
- Reasignación de zona → redirige dashboard
- Sanción/relevo → cierre de sesión si aplica

---

## 4. Recepción de Vehículos

### Método A — Escáner QR (flujo completo)
```
1. Escanea QR
2. Sistema muestra ficha:
   SI tiene datos:
   → Nombre, foto, cédula, vehículo, membresía
   → SI tiene puesto pre-asignado (VIP/logística): lo indica
   → SI no: sugiere puesto disponible automáticamente
   → Parquero confirma

   SI NO tiene datos:
   → Formulario de registro CON ESCÁNER IA DE DOCUMENTOS:
     - Botón "Escanear Cédula" → IA extrae datos automáticamente
     - Campos: cédula, nombre, apellido, teléfono
     - Datos vehículo: placa, marca, modelo, color
     - Mismo sistema de IA que utiliza la alcabala
   → Parquero completa → sistema crea registros
   → Asigna puesto

3. Confirma → puesto "ocupado" → WS al dashboard
```

### Método B — Registro por Placa (agilización masiva)
```
1. Ingresa placa manualmente
2. SI existe en BD: muestra datos → asigna puesto
3. SI NO existe: Formulario de registro CON IA
   → Misma interfaz de escaneo de documentos
   → Registra datos completos del socio y vehículo
4. Confirma → puesto ocupado → WS
```

### Método C — Asignación Rápida (máxima velocidad)
```
1. Selecciona puesto en dashboard
2. Ingresa solo placa
3. Confirma → puesto ocupado → WS
```

---

## 5. Registro de Salida

### Método A — Por Placa (recomendado para agilizar)
```
Ingresa placa → busca en zona → marca libre → WS
→ No necesita detener al cliente
```

### Método B — Por QR (opcional)
```
Escanea QR → identifica puesto → marca libre → WS
```

### Método C — Por Puesto (desde dashboard)
```
Toca puesto → confirma salida → libre → WS
```

---

## 6. Supervisor de Parqueros — "Director de Orquesta"

### Dashboard Central
El supervisor tiene visión global de TODA la operación de estacionamiento de su entidad:

- **Mapa de zonas**: Todas las zonas de la entidad con ocupación en tiempo real
- **Panel de parqueros**: Lista con semáforo de estado:
  - 🟢 Normal: eficiencia > 80%
  - 🟡 Atención: eficiencia 60-80% o zona > 80% ocupación
  - 🔴 Crítico: eficiencia < 60% o zona > 95%
- **Feed de actividad**: Entradas/salidas en tiempo real (alcabala + zonas)
- **Métricas globales**:
  - Flujo vehicular total (vehículos/hora)
  - Puestos libres totales vs ocupados
  - Tiempo promedio de atención
  - Parquero más eficiente vs menos eficiente

### Comunicación — Broadcast
```
El supervisor es complementario a las radios:
1. Presiona "Enviar Instrucción"
2. Selecciona destinatarios:
   a. "Todos los parqueros"
   b. "Zona específica"
   c. "Parquero individual"
3. Escribe mensaje
4. Sistema envía vía:
   - Push Notification inmediata
   - Evento WebSocket (aparece en bandeja del parquero)
5. Se registra en tabla mensajes_broadcast
6. El supervisor puede ver quiénes han leído (leido_por)
```

### Gestión Operativa
```
- REASIGNAR PARQUERO:
  → En eventos masivos, el supervisor detecta que una zona necesita refuerzo
  → Click en parquero → "Reasignar a Zona [X]"
  → El parquero recibe Push + WS y su dashboard cambia de zona automáticamente

- RELEVAR PARQUERO:
  → Click en parquero → "Relevar Inmediatamente"
  → Desactiva cuenta + cierre forzoso vía WS
  → Registra sanción tipo relevo_inmediato

- INCENTIVOS/SANCIONES:
  → Desde el perfil del parquero en el dashboard
  → Historial visible y auditable
```

### Log de Operaciones
```
- ALCABALAS: Todas las entradas/salidas por alcabala con destino a zonas de la entidad
- ZONAS: Entradas/salidas por zona (parquero que registró, método usado)
- BÚSQUEDA: Por placa, nombre, puesto
- FILTROS: Por zona, parquero, fecha, hora, método de registro
```

---

## 7. Puestos Pre-asignados

Cuando el admin de la entidad crea pases VIP, logística o productores:

```
1. Admin selecciona tipo_acceso: VIP, logística, artista, etc.
2. SI la zona tiene puestos identificados:
   → Admin puede seleccionar puesto específico (ej: "A-01 VIP")
   → Puesto cambia a estado "reservado" → reservado_para_usuario_id = socio
3. SI la zona NO tiene puestos identificados:
   → Admin solo selecciona la zona

4. Cuando el socio llega:
   → Parquero escanea QR → sistema indica "PUESTO PRE-ASIGNADO: A-01"
   → Parquero dirige al socio directamente al puesto correcto

5. Pases generales (sin pre-asignación):
   → Sistema sugiere puesto libre automáticamente
   → Si el parquero reasigna manualmente → queda registrado
```

---

## 8. Reserva de Puestos

### Admin de Entidad
```
1. Admin accede a gestión de puestos de su zona
2. Selecciona puestos individuales o cantidad
3. Marca como "reservado" → reservado_para_entidad_id = su entidad
4. Los puestos reservados NO se asignan automáticamente por el sistema
5. Admin luego puede asignar cada puesto reservado a un socio/cliente
6. Útil para: VIPs, productores, invitados especiales antes de crear el pase
```

### Comandante (Personal de Base)
```
1. Comandante accede a gestión de zona
2. Aparta X puestos para "personal de la base"
3. Puestos → estado "reservado_base" → no disponibles para la entidad
4. asignaciones_zona.cupo_reservado_base = X
5. Estos puestos NO cuentan en la cuota de la entidad
6. Útil para: oficiales, personal militar, vehículos institucionales
```

---

## 9. IA para Escaneo de Documentos

El parquero tiene acceso al **mismo sistema de IA** que utiliza la alcabala:

```
1. Parquero detecta que el socio no tiene datos registrados
2. Abre "Registrar Datos" → Botón "Escanear Documento"
3. La cámara del teléfono captura la cédula o documento
4. IA extrae automáticamente:
   - Cédula, nombre, apellido
   - (Si aplica) otros datos del documento
5. Parquero verifica y corrige si es necesario
6. Completa datos del vehículo (placa, marca, modelo, color)
7. Confirma → datos registrados en el sistema
```

---

## 10. Arquitectura Técnica

### Backend Services
| Service | Responsabilidad |
|---------|----------------|
| `parquero_service.py` | Recepción, salida, métricas, registro datos |
| `supervisor_parqueros_service.py` | Dashboard, broadcast, reasignación, logs |
| `incentivo_service.py` | CRUD incentivos/sanciones, relevo |

### Frontend Pages
| Ruta | Componente | Rol |
|------|-----------|-----|
| `/parquero/` | Dashboard.jsx | PARQUERO |
| `/parquero/scanner` | Scanner.jsx | PARQUERO |
| `/parquero/salida` | Salida.jsx | PARQUERO |
| `/parquero/metricas` | MisMetricas.jsx | PARQUERO |
| `/parquero/mensajes` | Mensajes.jsx | PARQUERO |
| `/supervisor/` | Dashboard.jsx | SUPERVISOR_PARQUEROS |
| `/supervisor/parqueros` | Parqueros.jsx | SUPERVISOR_PARQUEROS |
| `/supervisor/log` | LogOperaciones.jsx | SUPERVISOR_PARQUEROS |
| `/supervisor/broadcast` | Broadcast.jsx | SUPERVISOR_PARQUEROS |

### WebSocket
| Canal | Descripción |
|-------|-------------|
| `zona:{id}` | Estado zona para parquero |
| `parquero:{id}` | Alertas directas, reasignación, relevo |
| `supervisor:{id}` | Métricas, alertas, eventos de zona |

### Push Notifications
- Parquero: "🚗 ABC-123 (Toyota Corolla Blanco) en camino" ó "🚗 Vehículo datos pendientes"
- Parquero: "📢 Instrucción: [mensaje del supervisor]"
- Parquero: "🔄 Reasignado a Zona [X]"
- Supervisor: "⚠️ Zona B al 90%, parquero X inactivo"

---

*Última actualización: 2026-04-18 | v2.0*
*Docs: SCHEMA_BD.md, ROLES_Y_PERMISOS.md, FLUJOS_DE_NEGOCIO.md*
