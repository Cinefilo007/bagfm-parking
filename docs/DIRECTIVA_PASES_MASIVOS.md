# DIRECTIVA — PASES MASIVOS Y CARNETS (BAGFM v2.0)

Este documento define el estándar para la generación autónoma de pases masivos, la clasificación por tipo de acceso, la gestión individual de pases, y el sistema de carnets de acceso. **Consultar obligatoriamente ante cualquier cambio.**

---

## 1. Visión General

En v2.0, el admin de cada entidad obtiene **autonomía para generar pases masivos** dentro de su cuota de estacionamiento asignada por el comandante. Solo al exceder esta cuota se requiere aprobación superior.

Adicionalmente, se introduce un sistema de **carnets de acceso personalizables** como feature PLUS, permitiendo generar credenciales visuales profesionales.

---

## 2. Autonomía de Pases

### Cuota de la Entidad
- `cuota_pases_autonoma` en `entidades_civiles` = total de puestos asignados vía `asignaciones_zona`
- El admin puede generar pases libremente DENTRO de esta cuota
- **Sin necesidad de aprobación del comandante**

### Flujo de Generación
```
1. Admin accede a "Generar Pases"
2. Ve indicador: "Cuota disponible: 55/100 puestos"
3. Configura el lote:
   - Tipo de acceso (logística, prensa, VIP, general, staff, artista)
   - Tipo de pase (simple, identificado, portal)
   - Cantidad, fechas, evento, max accesos
   - **v2.0 — Asignación de estacionamiento** (para VIP, logística, productores):
     a. Seleccionar zona destino (opcional)
     b. Si la zona tiene puestos identificados:
        → Admin puede seleccionar puestos específicos (ej: "A-01", "A-02")
        → Puestos quedan en estado "reservado" → vinculados a los pases
     c. Si la zona NO tiene puestos identificados:
        → Solo se registra la zona como destino
     d. Pases generales: sin asignación previa (se asigna al llegar)

4a. cantidad ≤ cuota disponible:
    → Genera lote DIRECTO (requiere_aprobacion = false)
    → Descuenta de cuota

4b. cantidad > cuota:
    → Crea solicitud automática al comandante
    → requiere_aprobacion = true
    → Admin notificado cuando se apruebe
```

### Cálculo de Cuota Disponible
```python
cuota_total = sum(a.cupo_asignado for a in entidad.asignaciones_zona if a.activo)
cuota_usada = count(codigos_qr where lote.entidad_id == entidad.id and activo and no expirados)
cuota_disponible = cuota_total - cuota_usada
```

---

## 3. Clasificación por Tipo de Acceso

### Enum `TipoAccesoPase`

| Tipo | Descripción | Uso principal |
|------|-------------|---------------|
| `logistica` | Personal de montaje, producción | Antes del evento (preparativos) |
| `prensa` | Medios de comunicación | Cobertura del evento |
| `vip` | Invitados especiales | Acceso preferencial |
| `general` | Público del evento | Acceso estándar |
| `staff` | Personal de apoyo | Operaciones del evento |
| `artista` | Performers / Artistas | Acceso backstage si aplica |

### Uso en el Flujo
- Se asigna al **lote** (`lotes_pase_masivo.tipo_acceso`)
- Se hereda a cada **QR** del lote (`codigos_qr.tipo_acceso`)
- Visible para el guardia de alcabala y el parquero al escanear
- Permite al admin ver estadísticas por tipo de acceso

### Tipos Personalizados (v2.0)
El admin de cada entidad puede **crear tipos de acceso adicionales** a los 6 base:

```
1. Admin → "Configuración" → "Tipos de Acceso"
2. Ve los 6 tipos base (no puede eliminarlos)
3. [+ Crear tipo personalizado]
   - Nombre: "proveedor" (slug)
   - Etiqueta: "Proveedor Externo"
   - Color: #FF6B35
   - Icono: opcional
4. Guardar → disponible al crear pases

Sistema híbrido:
→ Si tipo_acceso = 'custom' → consultar tipo_acceso_custom_id
→ Tabla: tipos_acceso_custom (por entidad)
```

### Múltiples Vehículos por Pase (v2.0)
Un productor/staff/logístico puede necesitar acceso para varios vehículos:

```
CREACIÓN:
1. Admin crea pase tipo identificado
2. Registra vehículo principal (obligatorio)
3. [+ Agregar vehículo] → adicionales
4. Tabla: vehiculos_pase (junction 1:N)
5. codigos_qr.multi_vehiculo = true

PORTAL (auto-registro):
→ El portador registra vehículos desde su portal

VALIDACIÓN:
→ Al escanear QR: muestra TODOS los vehículos
→ Cada ingreso cuenta como 1 acceso
```

---

## 4. Gestión Individual de Pases

### Vista de Lote → Drill-down a Pases
```
Admin ve lista de lotes:
├── BAGFM-26ABR-001 | "Concierto XYZ" | 50 pases | Activo
│   └── Click → Lista de 50 pases individuales
│       ├── BAGFM-26ABR-001-0001 | VIP | Juan Pérez | ✅ Activo
│       ├── BAGFM-26ABR-001-0002 | VIP | María López | ❌ Usado
│       └── ... cada pase con acciones
```

### Acciones por Pase Individual
| Acción | Descripción |
|--------|-------------|
| **Ver** | Datos completos del pase y su portador |
| **Editar** | Modificar nombre, cédula, vehículo, zona/puesto asignado |
| **Descargar QR** | Descarga imagen PNG del QR (acción principal) |
| **Generar Carnet** | PLUS: Genera carnet con plantilla seleccionada |
| **Compartir** | Genera link para WhatsApp/email/copiar |
| **Enviar Email** | Envía pase por email con QR adjunto (si tiene email) |
| **Revocar** | Desactiva el pase (activo=false) |

### Compartir Pase
```
1. Admin presiona "Compartir" en un pase
2. Sistema genera URL con el QR embebido
3. Opciones:
   - WhatsApp: Abre WhatsApp con mensaje pre-formateado + imagen QR
   - Email: Envía email con QR adjunto (fastapi-mail + SMTP)
   - Copiar Link: Copia URL al clipboard
4. En móvil: usa navigator.share() nativo
```

### Envío Masivo de Email
```
1. Admin va al lote → "Enviar por Email"
2. Sistema filtra pases que tienen email registrado
3. Muestra: "35 de 50 pases tienen email"
4. Admin confirma
5. Sistema envía via Resend/AWS SES (para volúmenes altos)
6. Cada email incluye:
   - Template HTML con branding de la entidad
   - QR del pase embebido
   - Datos: nombre del evento, fechas, zona asignada
   - Link con instrucciones de acceso
7. Admin ve progreso: "Enviados: 35/35 ✅"
```

---

## 5. Tipos de Pases Existentes

### Tipo A — Simple (`simple`)
- QR genérico sin datos pre-cargados
- El guardia/parquero registra datos al momento del acceso (OPCIONAL)
- Ideal para: público general, eventos masivos rápidos

### Tipo B — Identificado (`identificado`)
- Cargado desde Excel con datos completos
- Crea usuario + vehículo en el sistema
- El QR ya tiene datos pre-vinculados
- Ideal para: invitados pre-registrados, VIP

### Tipo C — Portal (`portal`)
- Genera un pre-usuario con login temporal
- El portador accede al portal del socio y completa sus datos
- Ideal para: eventos donde el invitado debe auto-registrarse

---

## 6. Sistema de Carnets (PLUS)

### Prioridades
1. **Siempre disponible**: Descarga del QR simple (imagen PNG)
2. **Opcional PLUS**: Generar carnet con plantilla personalizada

### Tipos de Carnet

| Tipo | Formato | Dimensiones | Uso |
|------|---------|-------------|-----|
| `colgante` | Vertical grande | ~3.5" x 5.5" | Para colgar del cuello con lanyard |
| `cartera` | Horizontal pequeño | ~3.4" x 2.1" (tarjeta) | Para billetera |
| `ticket` | Horizontal alargado | ~8" x 3" | Tipo entrada de concierto |
| `credencial` | Horizontal estándar | ~5.5" x 3.5" | Badge de evento |

### Plantillas

Cada plantilla personalizable incluye:
- **Nombre**: Identificador de la plantilla
- **Tipo de carnet**: colgante/cartera/ticket/credencial
- **Paleta de colores**: primario, secundario, texto (hex)
- **Imagen de fondo**: URL opcional
- **Logo**: Logo de la entidad
- **Datos visibles**: nombre, cédula, tipo de acceso, vehículo (placa), QR

### Editor Visual (Frontend) — ✅ IMPLEMENTADO

Ubicación: `pages/entidad/EditorCarnets.jsx` + `components/carnets/PlantillaPreview.jsx`

**Plantillas implementadas:**
| Plantilla | Orientación | Descripción |
|-----------|-------------|-------------|
| `colgante` | Vertical | Banner de color, foto circular, badge tipo, info grid, QR |
| `cartera` | Horizontal | Panel izquierdo color + panel derecho data/QR |
| `ticket` | Compacto horizontal | Muescas laterales, QR a la izquierda, datos directo |
| `credencial` | Vertical formal | Foto grande, datos tabulados, franjas superior/inferior |

**7 Presets de color:**
| Preset | Color Primario | Ideal para |
|--------|---------------|------------|
| Aegis Tactical | `#4EDEA3` | Default del sistema |
| Militar | `#6B8F4A` | Eventos militares |
| Navy | `#3B82F6` | Oficial marino |
| Obsidian | `#a855f7` | Eventos nocturnos |
| VIP Dorado | `#d4a843` | Pases VIP premium |
| Clásico Blanco | `#1a1a1a` sobre blanco | Impresión económica |
| Crimson | `#ef4444` | Alertas/seguridad |

**Funcionalidades del editor:**
```
1. Panel izquierdo (configuración):
   - Selector de plantilla (4 tipos con description)
   - Presets de color (7 swatches + click para aplicar)
   - Color pickers individuales (primario, fondo, texto header, texto nombre)
   - Textos personalizables (título, subtítulo del carnet)
   - Datos de prueba editables (nombre, cédula, tipo acceso, entidad, vehículo, zona, fechas)
   - Botón "Restaurar datos demo"

2. Panel derecho (preview en vivo):
   - Canvas con patrón cuadriculado para visualización limpia
   - Vista previa que se actualiza instantáneamente al cambiar cualquier parámetro
   - Toggle rápido de plantilla bajo el preview
   - Info contextual sobre impresión

3. Acciones globales:
   - [Guardar] → localStorage para persistir plantilla
   - [Restaurar] → Recupera plantilla guardada
   - [Imprimir] → Abre ventana emergente optimizada CSS @media print
```

### Generación de Carnets
```
Individual:
1. Admin va al pase → "Generar Carnet"
2. Selecciona plantilla
3. Sistema genera imagen del carnet (Pillow/PIL en backend)
4. Descarga imagen

Masivo:
1. Admin va al lote → "Generar Carnets"
2. Selecciona plantilla
3. Sistema genera carnet para cada pase del lote
4. Descarga ZIP con todos los carnets
```

---

## 7. Arquitectura Técnica

### Backend
- **Service**: `pase_service.py` — Evolución para autonomía y gestión individual
- **Service**: `carnet_service.py` — Generación de imágenes con Pillow/PIL
- **Models**: `PlantillaCarnet` — Configuración de plantillas
- **Endpoints**:
  - `/api/v1/pases/autonomo` — Generación autónoma
  - `/api/v1/pases/lotes/{id}/pases` — Lista/gestión individual
  - `/api/v1/carnets/` — CRUD plantillas + generación

### Frontend
- **PasesAutonomos.jsx**: Generación y gestión de lotes
- **DetalleLote.jsx**: Vista drill-down de pases individuales
- **Carnets.jsx**: Galería de plantillas + editor visual
- **Store**: `pases.store.js` para estado de lotes y cuota

### Generación de Carnets (Backend)
```python
# carnet_service.py genera imagen usando Pillow
from PIL import Image, ImageDraw, ImageFont
import qrcode

def generar_carnet(plantilla, datos_pase, qr_data):
    # 1. Crear canvas según tipo_carnet (dimensiones)
    # 2. Aplicar imagen de fondo o color sólido
    # 3. Dibujar datos: nombre, cédula, tipo_acceso
    # 4. Generar y pegar QR
    # 5. Aplicar logo de la entidad
    # 6. Retornar BytesIO con PNG
```

---

## 8. Email Service para Pases

### Arquitectura
| Tipo | Librería | Uso |
|------|----------|-----|
| Individual (1-50) | `fastapi-mail` + SMTP dominio propio | Compartir pase, bienvenida |
| Masivo (50+) | Resend SDK ó AWS SES | Envío de lote completo |
| Templates | Jinja2 | HTML con branding de la entidad |

### Requisitos DNS (cuando se adquiera dominio)
- **SPF**: Autorizar servidores de envío
- **DKIM**: Firma criptográfica
- **DMARC**: Política de autenticación

### Variables de Entorno
```env
# SMTP para transaccionales
MAIL_USERNAME=noreply@bagfm.com
MAIL_PASSWORD=****
MAIL_FROM=BAGFM <noreply@bagfm.com>
MAIL_SERVER=smtp.dominio.com
MAIL_PORT=587

# Para masivos
RESEND_API_KEY=re_****
```

### Backend Service
- **`email_service.py`**: Abstracción que decide SMTP vs API según volumen
- Templates Jinja2 en `backend/app/templates/email/`
- Background Tasks para no bloquear la API

---

## 8. Convenciones

- Los lotes SIEMPRE tienen `codigo_serial` único (BAGFM-[AÑO+MES]-[SECUENCIAL])
- Los pases individuales heredan el serial: `[SERIAL_LOTE]-[SECUENCIAL]`
- La cuota se recalcula en tiempo real al crear lotes
- Los pases revocados no liberan cuota automáticamente (decisión del admin)
- Los carnets no se almacenan en BD, se generan al vuelo y se cachean en Storage

---

*Última actualización: 2026-04-18 | v2.0 — Pases Masivos con Autonomía*
*Docs Relacionados: SCHEMA_BD.md, ROLES_Y_PERMISOS.md, FLUJOS_DE_NEGOCIO.md FL-08 v2*
