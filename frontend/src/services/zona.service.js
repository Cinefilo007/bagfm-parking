import api from './api';

/**
 * Servicio de gestión de zonas de estacionamiento y puestos.
 */
export const zonaService = {

    // ──── Zonas ─────────────────────────────────────────────────────────────

    async listarZonas() {
        const { data } = await api.get('/zonas');
        return data;
    },

    async obtenerZona(zonaId) {
        const { data } = await api.get(`/zonas/${zonaId}`);
        return data;
    },

    // ──── Puestos de la entidad ──────────────────────────────────────────────

    /**
     * Trae todos los puestos de estacionamiento asignados a mi entidad.
     * El backend filtra por el entidad_id del usuario autenticado.
     */
    async getMisPuestos() {
        const { data } = await api.get('/zonas/mi-cuota');
        return data;
    },

    /**
     * Trae las asignaciones de zona (zonas a las que la entidad tiene acceso).
     */
    async getMisAsignaciones() {
        const { data } = await api.get('/zonas/entidad/mis-asignaciones');
        return data;
    },

    /**
     * Permite a la entidad configurar cómo subdivide su cupo lógico.
     */
    async configurarDistribucionCupos(asignacionId, distribucion) {
        const { data } = await api.patch(`/zonas/entidad/asignaciones/${asignacionId}/distribucion`, { distribucion_cupos: distribucion });
        return data;
    },

    /**
     * Permite a la entidad generar puestos físicos pre-reservados a su nombre limitados a su cupo.
     */
    async generarPuestosEntidad(zonaId, payload) {
        const { data } = await api.post(`/zonas/${zonaId}/puestos-entidad`, payload);
        return data;
    },

    async getPuestosZona(zonaId) {
        const { data } = await api.get(`/zonas/${zonaId}/puestos`);
        return data;
    },

    /**
     * Asigna un puesto de mi cupo a un socio/pase específico.
     */
    async asignarPuestoASocio(puestoId, asignacionData) {
        const { data } = await api.post(`/zonas/puestos/${puestoId}/asignar`, asignacionData);
        return data;
    },

    /**
     * Libera un puesto (desasigna al socio).
     */
    async liberarPuesto(puestoId) {
        const { data } = await api.post(`/zonas/puestos/${puestoId}/liberar`);
        return data;
    },

    /**
     * Reasigna el tipo de acceso lógico de un puesto físico.
     */
    async reasignarTipoPuesto(puestoId, tipoAccesoId) {
        const { data } = await api.patch(`/zonas/puestos/${puestoId}/tipo-acceso`, { tipo_acceso_id: tipoAccesoId });
        return data;
    },

    // ──── Tipos de Acceso Custom ─────────────────────────────────────────────

    /**
     * Lista los tipos de acceso custom de la entidad.
     */
    async listarTiposAcceso(entidadId) {
        const { data } = await api.get(`/tipos-acceso/entidad/${entidadId}`);
        return data;
    },

    /**
     * Crea un nuevo tipo de acceso custom.
     */
    async crearTipoAcceso(datos) {
        const { data } = await api.post('/tipos-acceso', datos);
        return data;
    },

    /**
     * Actualiza un tipo de acceso custom.
     */
    async actualizarTipoAcceso(tipoId, datos) {
        const { data } = await api.patch(`/tipos-acceso/${tipoId}`, datos);
        return data;
    },

    /**
     * Elimina un tipo de acceso custom.
     */
    async eliminarTipoAcceso(tipoId) {
        const { data } = await api.delete(`/tipos-acceso/${tipoId}`);
        return data;
    },

    // ──── Gestión de Zonas (Comandante / Admin Base) ─────────────────────────

    async crearZona(datos) {
        const { data } = await api.post('/zonas', datos);
        return data;
    },

    async actualizarZona(zonaId, datos) {
        const { data } = await api.patch(`/zonas/${zonaId}`, datos);
        return data;
    },

    async eliminarZona(zonaId) {
        const { data } = await api.delete(`/zonas/${zonaId}`);
        return data;
    },

    /**
     * Ajusta tiempo límite de llegada en una zona (temporal, reversible).
     */
    async ajustarTiempoLimite(zonaId, minutos) {
        const { data } = await api.put(`/zonas/${zonaId}/tiempo-llegada`, { minutos });
        return data;
    },

    // ──── Puestos (Comandante) ────────────────────────────────────────────────

    async crearPuesto(zonaId, datos) {
        const { data } = await api.post(`/zonas/${zonaId}/puestos`, datos);
        return data;
    },

    async actualizarPuesto(puestoId, datos) {
        const { data } = await api.patch(`/zonas/puestos/${puestoId}`, datos);
        return data;
    },

    async eliminarPuesto(puestoId) {
        const { data } = await api.delete(`/zonas/puestos/${puestoId}`);
        return data;
    },

    // ──── Asignaciones de Puestos (Comandante → Entidad) ──────────────────────

    async listarAsignaciones() {
        const { data } = await api.get('/zonas/asignaciones');
        return data;
    },

    async crearAsignacion(datos) {
        // datos: { zona_id, entidad_id, cupo_asignado, cupo_reservado_base, notas }
        const { data } = await api.post('/zonas/asignaciones', datos);
        return data;
    },

    async actualizarAsignacion(asignacionId, datos) {
        const { data } = await api.patch(`/zonas/asignaciones/${asignacionId}`, datos);
        return data;
    },

    async eliminarAsignacion(asignacionId) {
        const { data } = await api.delete(`/zonas/asignaciones/${asignacionId}`);
        return data;
    },

    /**
     * Apartar puestos de una zona para uso exclusivo del personal de la base.
     */
    async apartarParaBase(zonaId, cantidad, notas = '') {
        const { data } = await api.post(`/zonas/${zonaId}/apartar-base`, { cantidad, notas });
        return data;
    },
};

export default zonaService;
