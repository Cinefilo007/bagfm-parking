# FLUJOS DE NEGOCIO — BAGFM

> Consultar `DIRECTIVA_MAESTRA.md` antes de modificar este documento.

---

## FL-01 — Onboarding de Entidad Civil

**Actor principal**: Comandante  
**Resultado**: La entidad puede operar y gestionar sus socios.

```
1. Comandante crea Entidad Civil
   - Nombre, código, descripción
   - Zona de estacionamiento asignada
   - Capacidad máxima de vehículos

2. Sistema genera credenciales para Admin Entidad
   - El Comandante crea el usuario Admin Entidad
   - Email + contraseña temporal enviada

3. Admin Entidad ingresa al portal por primera vez
   - Cambia contraseña
   - Completa perfil de la entidad

4. Admin Entidad comienza a cargar socios
   - Manual (uno a uno) o
   - Importación masiva desde Excel (.xlsx)

5. Admin Entidad genera QR para cada socio
   - QR permanente por defecto

6. ✅ Entidad operativa
```

---

## FL-02 — Registro de Socio (Manual)

**Actor principal**: Admin Entidad  
**Resultado**: Socio con QR activo puede ingresar a la base.

```
1. Admin Entidad crea usuario Socio
   - Cédula, nombre, apellido, teléfono, email (opcional)

2. Admin Entidad crea membresía para el socio
   - Selecciona vehículo(s) del socio
   - Estado: activa
   - Fecha inicio
   - Cupo (OPCIONAL, puede dejarse vacío)

3. Admin Entidad genera QR
   - Sistema crea JWT firmado (tipo: permanente)
   - QR descargable para el socio

4. Socio recibe credenciales
   - Puede ingresar al portal con su cédula
   - Descarga su propio QR

5. ✅ Socio listo para acceder a la base
```

---

## FL-03 — Importación Masiva de Socios (Excel)

**Actor principal**: Admin Entidad  
**Resultado**: Múltiples socios cargados de una vez.

```
1. Admin Entidad descarga plantilla Excel (.xlsx)
   - Columnas: cedula | nombre | apellido | telefono | email | placa | marca | modelo | color | año

2. Admin Entidad llena la plantilla

3. Admin Entidad sube el archivo al sistema

4. Backend (excel_service.py) procesa el archivo:
   a. Valida formato y columnas
   b. Valida cédulas únicas
   c. Valida placas únicas
   d. Reporta errores por fila si los hay

5. Vista previa con filas OK y filas con error
   - El Admin puede descargar el reporte de errores

6. Admin confirma importación de filas válidas

7. Sistema crea usuarios, vehículos y membresías activas

8. ✅ Socios importados. QR pendiente de generación manual o en batch
```

**Plantilla Mínima Excel:**
```
cedula | nombre | apellido | telefono | placa | marca | modelo | color
```

---

## FL-04 — Acceso a la Base (Alcabala)

**Actor principal**: Guardia Alcabala  
**Resultado**: El vehículo entra o es rechazado.

```
1. Socio llega a la alcabala y presenta QR

2. Guardia escanea QR con su teléfono (PWA)

3. Sistema verifica:
   a. ¿El token es válido? (firma JWT)
   b. ¿El QR está activo? (activo = true)
   c. ¿No ha expirado? (fecha_expiracion)
   d. ¿El socio tiene membresía activa?
   e. ¿El vehículo tiene infracción activa con bloquea_salida?
      → Solo relevante para salida

4a. Si todo OK:
    - Pantalla verde ✅
    - Muestra: nombre, foto, entidad, vehículo
    - Sistema registra acceso tipo "entrada"
    - Guardia presiona "Confirmar entrada"

4b. Si hay problema:
    - Pantalla roja ❌
    - Muestra motivo (QR inválido, membresía suspendida, etc.)
    - Guardia puede confirmar acceso manual (si tiene permiso)
    - El acceso manual queda registrado con flag es_manual = true

5. ✅ Registro creado en tabla accesos

NOTA: El registro de salida sigue el mismo flujo pero con tipo "salida".
      Si bloquea_salida = true en infracción activa, se muestra alerta
      y el guardia NO puede confirmar salida.
```

---

## FL-05 — Verificación en Zona (Parquero)

**Actor principal**: Parquero de la entidad civil  
**Resultado**: El socio conoce su cupo (si aplica) y el parquero registra ocupación.

```
1. Socio llega a la zona y presenta QR al parquero

2. Parquero escanea QR

3. Sistema verifica (mismo que FL-04 pero solo para su zona)

4. Pantalla muestra:
   - Nombre del socio
   - Estado de membresía (activa/suspendida/vencida)
   - Cupo asignado: "Puesto 15" o "Sin cupo asignado"

5. Si tiene cupo:
   - Parquero ve botón "Marcar como ocupado"
   - Zona actualiza ocupación en tiempo real

6. Si no tiene cupo:
   - Parquero asigna cupo disponible manualmente (si aplica)
   - O simplemente confirma que es un socio válido

7. ✅ Socio ingresa a la zona
```

---

## FL-06 — Registro de Infracción

**Actor principal**: Supervisor  
**Resultado**: Vehículo marcado, socio notificado, salida bloqueada si aplica.

```
OPCIÓN A — Por placa (vehículo sin QR visible):
1. Supervisor abre Buscador Maestro
2. Escribe la placa del vehículo
3. Sistema muestra socio asociado, membresía, historial
4. Supervisor presiona "Registrar Infracción"
5. Formulario: tipo | descripción | foto (opcional) | bloquea_salida
6. Confirma → infracción creada

OPCIÓN B — Con QR (escanea el vehículo directamente):
1. Supervisor escanea QR
2. Sistema muestra ficha del socio
3. Supervisor presiona "Registrar Infracción"
4. Mismo formulario

Resultado:
- Infracción registrada con estado: activa
- Si bloquea_salida = true:
  → Al próximo escaneo en alcabala, pantalla muestra alerta
  → Guardia no puede confirmar salida
- El socio ve la infracción en su portal
- La entidad civil ve la infracción de su socio
```

---

## FL-07 — Resolución de Infracción

**Actor principal**: Comandante o Admin Base  
**Resultado**: Vehículo puede salir nuevamente.

```
1. Comandante abre lista de infracciones activas

2. Ve la infracción: descripción, foto, socio, vehículo, supervisor

3. Opciones:
   a. "Resolver" → infracción pasa a estado: resuelta
      - Se puede agregar observación de resolución
   b. "Perdonar" → infracción pasa a estado: perdonada
      - Requiere justificación

4. Si bloquea_salida era true:
   - Al resolver/perdonar, el bloqueo se levanta automáticamente

5. ✅ Vehículo puede salir en la próxima verificación de alcabala
```

---

## FL-08 — Solicitud de Acceso para Evento

**Actor principal**: Admin Entidad → Comandante  
**Resultado**: QR temporales generados para los visitantes del evento.

```
1. Admin Entidad abre formulario "Solicitar Acceso para Evento"
   - Nombre del evento
   - Fecha y hora del evento
   - Número de vehículos requeridos
   - Motivo/descripción
   - Lista de vehículos (opcional, puede agregarse después)

2. Sistema crea solicitud con estado: pendiente

3. Comandante recibe notificación push en su PWA

4. Comandante revisa la solicitud:
   - Ve todos los detalles
   - Tiene tres opciones:
     a. Aprobar todo → cantidad_aprobada = cantidad_solicitada
     b. Aprobar parcial → ingresa número menor
     c. Denegar → ingresa motivo_rechazo

5. Sistema notifica al Admin Entidad (push notification)

6. Si aprobada (total o parcial):
   - Sistema genera N QR temporales (N = cantidad_aprobada)
   - Tipo: temporal
   - Expiración: fecha del evento + qr_expiracion_temporal_horas (config)
   - Admin Entidad puede descargar QR como PDF o lista de links
   - Distribuye QR a los visitantes del evento

7. El día del evento:
   - Visitantes llegan con su QR temporal
   - Alcabala escanea → el sistema verifica que no haya expirado
   - Registra entrada como acceso_temporal = true
   - El QR puede marcarse como "usado" tras el primer escaneo (configurable)

8. Al vencer la fecha/hora:
   - QR expiran automáticamente
   - Si intentan usar QR vencido → pantalla roja ❌
```

---

## FL-09 — Buscador Maestro (Multi-Rol)

**Actores**: Comandante, Admin Base, Supervisor, Alcabala  
**Resultado**: Ficha completa del socio/vehículo.

```
1. Usuario ingresa al Buscador Maestro

2. Puede buscar por:
   - Placa del vehículo
   - Cédula del socio
   - Nombre / Apellido

3. Sistema retorna resultados paginados

4. Al seleccionar un resultado, se muestra ficha completa:
   - Datos del socio (nombre, cédula, foto, teléfono)
   - Vehículo(s) registrado(s)
   - Entidad civil a la que pertenece
   - Estado de membresía actual
   - Últimos 10 accesos
   - Infracciones activas (resaltadas en rojo)
   - Historial de infracciones

5. Acciones disponibles según rol:
   - SUPERVISOR: Botón "Registrar Infracción"
   - ALCABALA: Botón "Confirmar Acceso Manual"
   - COMANDANTE / ADMIN_BASE: Todo lo anterior + "Ver perfil completo"
```

---

## FL-10 — Membresía y Control de Cupos

**Actor principal**: Admin Entidad  
**Resultado**: Control de quién tiene cupo vigente y cuál.

```
Estado de membresía:
- activa: el socio puede acceder
- suspendida: el socio NO puede acceder (QR bloqueado)
- vencida: el socio NO puede acceder

Cupo de estacionamiento (OPCIONAL):
- La entidad puede operar sin asignar cupos
- Si decide usar cupos, asigna número de puesto a cada socio
- El parquero ve el cupo al escanear el QR
- La entidad ve un mapa de cupos en su dashboard

Flujo de suspensión:
1. Admin Entidad selecciona socio
2. Cambia estado de membresía a "suspendida"
3. Sistema marca membresía como suspendida
4. Al intentar escaner QR del socio → membresía suspendida ❌
5. Cuando se reactiva → membresía activa ✅
```

---

*Última actualización: 2026-03-30 | Ver: DIRECTIVA_MAESTRA.md para contexto*
