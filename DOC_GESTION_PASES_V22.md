# 🛡️ Aegis Tactical: Directiva de Gestión de Pases Masivos (v2.3)

Esta directiva establece los estándares técnicos y operativos para la generación, importación y validación de pases masivos en el sistema BAGFM.

## 1. Estructura de Datos (Multi-Vehículo)
El sistema soporta hasta **4 vehículos** por pase masivo. La plantilla Excel (`TEMPLATE_PASES_IDENTIFICADOS.xlsx`) consta de **20 columnas**:

| Columna | Campo | Descripción |
| :--- | :--- | :--- |
| A-D | Datos Personales | Nombre, Cédula, Email, Teléfono |
| E-H | Vehículo 1 | Marca, Modelo, Color, Placa (Obligatorio) |
| I-L | Vehículo 2 | Marca, Modelo, Color, Placa (Opcional) |
| M-P | Vehículo 3 | Marca, Modelo, Color, Placa (Opcional) |
| Q-T | Vehículo 4 | Marca, Modelo, Color, Placa (Opcional) |

### ⚠️ Reglas de Importación:
- La **Placa** es el identificador único del vehículo.
- Si se ingresan datos adicionales (marca/modelo) sin placa, el registro del vehículo se omitirá.
- El sistema procesa lotes de hasta 5,000 registros mediante `PaseService.procesar_json_identificado`.

## 2. Lógica Táctica de Estacionamiento
El sistema implementa una validación diferenciada según el `TipoAccesoPase`:

### Validaciones:
1. **Capacidad Total**: La sumatoria de pases en un lote NO puede superar la capacidad total de todas las zonas asignadas a la entidad civil.
2. **Acceso General**: Utiliza los puestos "libres", calculados como:
   `CupoAsignado - CupoBase - Sum(CuposReservadosCategorías)`
3. **Acceso Categorizado (Staff, VIP, Producción, etc.)**: Utiliza estrictamente el cupo definido en la `distribucion_cupos` de la `AsignacionZona`.

> [!IMPORTANT]
> Si el flag `distribucion_automatica` está activo (bypass de advertencia), el sistema permitirá superar el cupo de la categoría pero NUNCA el cupo total de la entidad.

## 3. Robustez de Interfaz y API (v2.3)
Para prevenir errores `422 Unprocessable Entity` y fallos de renderizado en React (#31):

- **Sanitización de UUIDs**: Los identificadores opcionales (zona, puesto, categorías custom) deben enviarse como `null` si están vacíos, nunca como string vacío `""`.
- **Mapeo de Campos**: El backend soporta alias para los campos de relación:
  - `zona_id` / `zona_asignada_id`
  - `puesto_id` / `puesto_asignado_id`
- **Manejo de Errores**: El frontend procesa las listas de errores de validación de Pydantic para mostrar mensajes específicos en lugar de objetos, evitando el desplome de la UI.

## 4. Notas de Implementación (Backend)
- Se utiliza `lazy="selectin"` en todos los modelos de estacionamiento y pases para evitar errores de `MissingGreenlet`.
- La serialización de esquemas incluye `zona_nombre` precargado mediante relaciones eager loading.

---
*BAGFM v2.3 - Estabilización de Operaciones Masivas.*
