# DIRECTIVA TÁCTICA: SENTINEL INTERFACE (SUPERVISOR DE BASE)

## 1. PROPÓSITO Y ALCANCE
El **Supervisor de Base** actúa como el "Escudo de Seguridad" de la BAGFM. Esta directiva define las herramientas, protocolos y lógica de datos que rigen la **Sentinel Interface**, permitiendo un monitoreo total, trazabilidad de patrones y control excepcional.

## 2. ARQUITECTURA DE DATOS: CENSO DE PERSONAS (SENTINEL FUSION)
A diferencia de otros roles, el Supervisor no ve "usuarios" aislados, sino "Identidades Consolidadas".

### 2.1 Lógica de Fusión de Identidad
El sistema realiza un cruce dinámico entre:
- **Usuarios Fijos:** Personal militar, civil y socios permanentes.
- **Pases Temporales:** Visitantes que ingresan mediante códigos QR únicos.

El nexo de unión es el **Número de Cédula**. El sistema agrupa todos los pases y vehículos históricos vinculados a un mismo documento para detectar patrones de "Visitante Frecuente" o comportamientos anómalos.

### 2.2 Graduación de Alertas (Motor IA Sentinel)
Cada perfil consolidado recibe una puntuación de riesgo basada en:
- **Volumen de Pases:** >3 pases temporales en 30 días (+2 pts).
- **Multi-Vehículo:** >2 placas distintas vinculadas (+3 pts).
- **Frecuencia Táctica:** >5 accesos semanales (+2 pts).
- **Horario Nocturno:** Accesos entre 22:00 y 05:00 (+3 pts).
- **Infracciones Críticas:** Mantener infracciones sin resolver (+5 pts).

**Niveles de Alerta:**
- **CRÍTICA (8+ pts):** Requiere intervención inmediata o bloqueo de acceso.
- **ALTA (5-7 pts):** Sujeto a interrogación en campo.
- **MEDIA (3-4 pts):** Vigilancia discreta.
- **BAJA (1-2 pts):** Patrón normal con desviaciones leves.

## 3. MONITOREO GEOGRÁFICO: MAPA DE INCIDENTES
La Sentinel Interface integra el **Mapa Base Real** con una capa dinámica de incidentes.
- **Iconografía:** Se utilizan pines rojos pulsantes (`AlertTriangle`) para infracciones activas.
- **Contexto:** Cada incidente muestra placa, descripción y reportero al ser seleccionado.
- **Filtros:** El Supervisor puede filtrar por gravedad (Leve, Moderada, Grave, Crítica).

## 4. CONTROL EXCEPCIONAL: PASES TEMPORALES DE SEGURIDAD
El Supervisor tiene la autoridad para emitir pases que eluden la validación administrativa estándar de las entidades.
- **Uso:** Exclusivo para emergencias médicas, interrogación en campo o visitas de alto mando.
- **Trazabilidad:** Estos pases se marcan como `EXCEPCIONALES` en la base de datos para auditoría posterior por el Comandante.

## 5. REVISIÓN DE ALCABALAS (BITÁCORA TÁCTICA)
El Supervisor monitorea el estado de todas las alcabalas activas:
- **Personal al Mando:** Identificación del sargento/oficial de guardia.
- **Volumen de Flujo:** Conteo total de entradas/salidas hoy.
- **Última Actividad:** Tiempo transcurrido desde el último escaneo para detectar inactividad en puestos de guardia.

## 6. ESTÁNDAR VISUAL (AEGIS TACTICAL V3)
- **Modo:** Dark Mode obligatorio (High Contrast).
- **Tipografía:** Inter/Roboto para legibilidad; JetBrains Mono para datos técnicos.
- **Componentes:** Card-based layout con micro-animaciones de pulso para alertas activas.
- **Responsividad:** 100% Mobile First (Uso en tabletas de patrulla).

---
**ESTADO DE DOCUMENTO:** OPERATIVO
**ÚLTIMA ACTUALIZACIÓN:** 2026-05-12
**APROBADO POR:** ANTIGRAVITY AEGIS COMMAND
