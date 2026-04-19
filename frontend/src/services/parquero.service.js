import api from './api';

/**
 * Servicio para operaciones del Parquero.
 */
export const parqueroService = {

    /**
     * Obtiene las zonas y puestos asignados al parquero activo.
     */
    async getMiZona() {
        const { data } = await api.get('/parqueros/mi-zona');
        return data;
    },

    /**
     * Registra la llegada de un vehículo a la zona mediante QR.
     * @param {string} qrId UUID del QR escaneado.
     * @param {string} zonaId UUID de la zona del parquero.
     */
    async registrarLlegada(qrId, zonaId) {
        const { data } = await api.post(`/parqueros/llegada-qr/${qrId}/zona/${zonaId}`);
        return data;
    },

    /**
     * Asigna un puesto físico específico al vehículo ya ingresado en la zona.
     * @param {string} vehiculoPaseId UUID del registro de VehiculoPase.
     * @param {string} puestoId UUID del puesto destino.
     */
    async asignarPuesto(vehiculoPaseId, puestoId) {
        const { data } = await api.post(`/parqueros/vehiculo-pase/${vehiculoPaseId}/puesto/${puestoId}`);
        return data;
    },

    /**
     * Registra la salida del vehículo de la zona y libera el puesto.
     * @param {string} qrId UUID del QR del vehículo.
     */
    async registrarSalida(qrId) {
        const { data } = await api.post(`/parqueros/salida-qr/${qrId}`);
        return data;
    },

    /**
     * Obtiene los vehículos que se esperan llegar a la zona (pases activos preasignados).
     * @param {string} zonaId UUID de la zona.
     */
    async getVehiculosEnEspera(zonaId) {
        const { data } = await api.get(`/parqueros/zona/${zonaId}/en-espera`);
        return data;
    },

    /**
     * Obtiene los vehículos actualmente dentro de la zona.
     * @param {string} zonaId UUID de la zona.
     */
    async getVehiculosEnZona(zonaId) {
        const { data } = await api.get(`/parqueros/zona/${zonaId}/activos`);
        return data;
    },

    /**
     * Obtiene el listado de puestos con su estado actual.
     * @param {string} zonaId UUID de la zona.
     */
    async getPuestosZona(zonaId) {
        const { data } = await api.get(`/zonas/${zonaId}/puestos`);
        return data;
    }
};
