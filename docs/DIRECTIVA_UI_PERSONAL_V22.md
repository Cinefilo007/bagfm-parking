# DIRECTIVA UI — GESTIÓN TÁCTICA DE PERSONAL (v2.2)

## 1. Visión
Evolucionar la interfaz de **Fuerza de Tareas** para alinearla con el estándar táctico de **Pases Masivos**. Se busca una gestión de alta densidad, eliminando modales intrusivos y utilizando componentes expandibles que mantengan el contexto operativo.

## 2. Componentes de la Interfaz

### 2.1 KPIs Tácticos Globales
Ubicados en la cabecera, proporcionan una visión inmediata del estado de la fuerza de tareas:
- **Operativos Totales**: Cantidad de personal registrado.
- **En Terminal**: Personal activo en el sistema.
- **Zonas Cubiertas**: Cantidad de zonas con personal asignado.
- **Sanciones Activas**: Alerta temprana sobre personal sancionado.

### 2.2 Tarjeta de Operativo (MiembroCard)
Estructura horizontal delgada con dos estados: **Contraída** y **Expandida**.

#### Estado Contraído (Vista de Lista)
- **Barra de Estado Lateral**: Color del rol (Verde: Parquero, Ámbar: Supervisor, Púrpura: Admin, Rojo: Inactivo).
- **Identidad**: Avatar, Nombre completo y Rol (Badge).
- **KPIs Individuales Rápidos**:
  - Días Activo.
  - Incentivos Totales.
  - Sanciones Activas (con indicador rojo si > 0).
- **Ubicación**: Zona asignada (Badge con icono).
- **Acciones Rápidas**: Expandir/Contraer, Toggle Activo/Pausa, Baja Definitiva.

#### Estado Expandido (Gestión Detallada)
Se expande verticalmente dentro de la misma tarjeta del operativo:
- **Dashboard Interno**: Pestañas integradas (no modales).
  - **KPIs**: Estadísticas detalladas de rendimiento.
  - **Zona**: Selector de asignación de zona.
  - **Incentivos**: Registro y listado de reconocimientos.
  - **Sanciones**: Aplicación de medidas disciplinarias y relevo inmediato.
  - **Editar**: Formulario de actualización de datos personales.

## 3. Comportamiento y UX
- **Contexto**: Al expandir una tarjeta, las demás pueden permanecer contraídas para facilitar la comparación o gestión múltiple.
- **Animaciones**: Transiciones suaves de altura (mínimo 300ms) para la expansión de la tarjeta.
- **Acceso Rápido**: El toggle de estado (Pausar/Reactivar) es accesible sin expandir la tarjeta.
- **Eliminación de Modales**: Se elimina el `PanelDetalle` flotante en favor de la expansión *in-place*.

## 4. Referencia Visual
Se toma como referencia `PasesMasivos.jsx` en su versión v2.0 (LoteCardV2), utilizando el layout `flex-col xl:flex-row` para adaptabilidad multidispositivo.

---
*Fecha: 2026-04-23 | Versión 2.2*  
*Basado en Aegis Tactical v3*
