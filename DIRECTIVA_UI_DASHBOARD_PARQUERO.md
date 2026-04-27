# DIRECTIVA-014: ESTÁNDARES VISUALES DEL DASHBOARD PARQUERO

## 1. PROPÓSITO
Establecer las reglas de visualización táctica para el mapa de puestos de estacionamiento, permitiendo una identificación inmediata del estado de ocupación y el tipo de reserva.

## 2. CODIFICACIÓN DE COLORES (MAPA DE PUESTOS)
### 2.1 Por Tipo de Reserva
- **BASE (Comando)**: Color **Azul** (`indigo-400`). Indica puestos reservados para personal militar o de la base.
- **ENTIDAD / VIP**: Color **Amarillo** (`warning/orange`). Indica puestos asignados a entidades civiles, socios o eventos específicos.
- **GENERAL / LIBRE**: Color **Verde** (`success`). Indica puestos de uso general disponibles.

### 2.2 Por Estado de Ocupación
- **LIBRE**: El icono de estacionamiento (P) mantiene el color del tipo de reserva.
- **OCUPADO**: 
    - El icono de estacionamiento (**P**) debe cambiar obligatoriamente a **ROJO** (`danger`), independientemente del tipo de reserva.
    - El indicador de punto (dot) superior también debe ser **ROJO**.
- **MANTENIMIENTO**: Color **Gris** (`text-muted`).

## 3. IDENTIFICACIÓN DE VEHÍCULOS
- Todo puesto en estado **OCUPADO** debe mostrar la **PLACA** del vehículo vinculado como identificador principal.
- El código del puesto se relega a un segundo plano (texto pequeño debajo de la placa).
- **Estilo de Placa**: Fuente condensada, color rojo (`danger`), con una micro-animación de pulsación sutil.

## 4. OPERACIONES RÁPIDAS (ACCESIBILIDAD)
- **Salida desde Lista**: Se implementa un acceso directo de "Salida Rápida" en la lista de vehículos en zona.
- **Entrada desde Notificaciones**: Los eventos de "Alcabala" permiten registrar el ingreso directo a zona mediante un botón de "Recibir".

## 5. VEHÍCULOS PERDIDOS (ALERTAS CRÍTICAS)
- **Definición**: Un vehículo se marca como perdido si excede el `tiempo_limite_llegada_min` configurado en la zona tras su paso por la alcabala.
- **Visualización**: Se utiliza el color **ROJO CRÍTICO** (`danger`) y el icono `ShieldAlert`.
- **Procedimiento**: El parquero debe ver la lista de perdidos y decidir si notifica al centro de mando o inicia un rastreo manual.
- **Frecuencia de Actualización**: La trazabilidad debe refrescarse cada 20 segundos automáticamente.

## 6. RELACIÓN DE DATOS (FRONTEND)
- La información del vehículo debe obtenerse cruzando el `id` del puesto o su `numero_puesto` con la lista de `vehiculosEnZona` enviada por el backend.
- En caso de no existir datos del vehículo para un puesto marcado como ocupado, se mostrará el texto "S/D" (Sin Datos) o se mantendrá la etiqueta de estado por defecto "Ocup.".

---
*Ultima actualización: 2026-04-27 (Implementación Vehículos Perdidos)*
