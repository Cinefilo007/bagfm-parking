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

export const STANDARDS = {
    SPOT_WIDTH: 2.5,   // metros
    SPOT_DEPTH: 5.0,   // metros
    AISLE_WIDTH: 6.0,  // metros (circulación doble sentido)
    MIN_EFFICIENCY: 0.65
};

/**
 * Calcula la distancia entre dos puntos en metros (Haversine).
 */
export const getDistanceMeters = (p1, p2) => {
    const R = 6371e3; // Radio de la Tierra
    const phi1 = p1[0] * Math.PI / 180;
    const phi2 = p2[0] * Math.PI / 180;
    const deltaPhi = (p2[0] - p1[0]) * Math.PI / 180;
    const deltaLambda = (p2[1] - p1[1]) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

/**
 * Estima la capacidad de vehículos considerando áreas de circulación.
 */
export const estimateCapacity = (areaM2, efficiencyFactor = STANDARDS.MIN_EFFICIENCY, spacePerVehicle = 12.5) => {
    if (!areaM2 || areaM2 <= 0) return 0;
    const usableArea = areaM2 * efficiencyFactor;
    return Math.floor(usableArea / spacePerVehicle);
};
