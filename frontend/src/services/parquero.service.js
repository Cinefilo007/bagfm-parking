import api from './api';

/**
 * Servicio para operaciones del Parquero.
 */
export const parqueroService = {

    /**
     * Obtiene la zona asignada al parquero con KPIs reales.
     * @returns {{ id, nombre, capacidad_total, usa_puestos_identificados, kpis: { libres, ocupados, reservados, total } }}
     */
    async getMiZona() {
        const { data } = await api.get('/parqueros/mi-zona');
        return data;
    },

    /**
     * Obtiene los puestos físicos de una zona.
     * @param {string} zonaId UUID de la zona.
     */
    async getPuestosZona(zonaId) {
        const { data } = await api.get(`/zonas/${zonaId}/puestos`);
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
     * Registra la llegada de un vehículo a la zona mediante QR.
     * @param {string} qrId UUID del QR escaneado.
     * @param {string} zonaId UUID de la zona del parquero.
     */
    async registrarLlegadaQR(qrId, zonaId) {
        const { data } = await api.post(`/parqueros/llegada-qr/${qrId}/zona/${zonaId}`);
        return data;
    },

    /**
     * Registra la llegada de un vehículo ingresando la placa manualmente.
     * @param {string} placa Placa del vehículo.
     * @param {string} zonaId UUID de la zona del parquero.
     * @returns {{ sin_datos: boolean, placa, vehiculo_pase_id?, marca?, modelo?, color? }}
     */
    async registrarLlegadaPlaca(placa, zonaId) {
        const { data } = await api.post('/parqueros/llegada-placa', { placa, zona_id: zonaId });
        return data;
    },

    /**
     * Registra la salida de un vehículo mediante escaneo de QR.
     * @param {string} qrId UUID del QR del vehículo.
     */
    async registrarSalidaQR(qrId) {
        const { data } = await api.post(`/parqueros/salida-qr/${qrId}`);
        return data;
    },

    /**
     * Registra la salida de un vehículo ingresando la placa manualmente.
     * @param {string} placa Placa del vehículo.
     * @param {string} zonaId UUID de la zona del parquero.
     */
    async registrarSalidaPlaca(placa, zonaId) {
        const { data } = await api.post('/parqueros/salida-placa', { placa, zona_id: zonaId });
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
     * Obtiene el historial temporal de vehículos de la zona (trazabilidad).
     * @param {string} zonaId UUID de la zona.
     */
    async getTrazabilidadZona(zonaId) {
        const { data } = await api.get(`/parqueros/zona/${zonaId}/trazabilidad`);
        return data;
    },

    /**
     * Guarda los datos del portador en el CodigoQR (NO en la tabla usuarios).
     * Se llama cuando el vehículo tiene QR pero le faltan datos de la persona.
     * @param {string} qrId UUID del CodigoQR a actualizar.
     * @param {string} vehiculoPaseId UUID del VehiculoPase ya creado.
     * @param {{ nombre?, cedula?, telefono? }} datos Datos del portador.
     */
    async completarDatosPortador(qrId, vehiculoPaseId, datos) {
        const { data } = await api.post('/parqueros/completar-datos-portador', {
            qr_id: qrId,
            vehiculo_pase_id: vehiculoPaseId,
            nombre: datos.nombre || null,
            cedula: datos.cedula || null,
            telefono: datos.telefono || null,
        });
        return data;
    },


    /**
     * Actualiza el estado de un puesto físico.
     * @param {string} puestoId UUID del puesto.
     * @param {object} datos { estado, reservado_base, etc. }
     */
    async actualizarPuesto(puestoId, datos) {
        const { data } = await api.patch(`/zonas/puestos/${puestoId}`, datos);
        return data;
    },
};

