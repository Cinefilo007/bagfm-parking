/**
 * Utilidades de geometría táctica para BAGFM
 */

/**
 * Calcula el área de un polígono en metros cuadrados.
 * Implementa la fórmula Shoelace proyectada para pequeñas distancias.
 * @param {Array} coordinates - Array de pares [lat, lng]
 * @returns {number} Área en m²
 */
export const calculatePolygonArea = (coordinates) => {
    if (!coordinates || coordinates.length < 3) return 0;

    const radius = 6378137; // Radio de la Tierra en metros
    let area = 0;

    for (let i = 0; i < coordinates.length; i++) {
        const p1 = coordinates[i];
        const p2 = coordinates[(i + 1) % coordinates.length];

        // Convertir grados a radianes
        const lat1 = p1[0] * Math.PI / 180;
        const lon1 = p1[1] * Math.PI / 180;
        const lat2 = p2[0] * Math.PI / 180;
        const lon2 = p2[1] * Math.PI / 180;

        // Proyección simple para áreas pequeñas
        area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }

    area = Math.abs(area * radius * radius / 2.0);
    return area;
};

/**
 * Estima la capacidad de vehículos considerando áreas de circulación.
 * @param {number} areaM2 - Área total en m²
 * @param {number} efficiencyFactor - Factor de eficiencia (0.6 - 0.7 sugerido)
 * @param {number} spacePerVehicle - Espacio por vehículo en m² (estándar 12.5)
 * @returns {number} Capacidad estimada
 */
export const estimateCapacity = (areaM2, efficiencyFactor = 0.65, spacePerVehicle = 12.5) => {
    if (!areaM2 || areaM2 <= 0) return 0;
    const usableArea = areaM2 * efficiencyFactor;
    return Math.floor(usableArea / spacePerVehicle);
};
