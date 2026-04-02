/**
 * Servicio de Comando y Alcabalas.
 * Maneja la gestión de puntos de acceso y guardias temporales.
 */
import api from './api';

export const comandoService = {
  // Puntos de Acceso (Alcabalas)
  async getPuntosAcceso() {
    const res = await api.get('/comando/puntos-acceso');
    return res.data;
  },

  async crearPuntoAcceso(datos) {
    const res = await api.post('/comando/puntos-acceso', datos);
    return res.data;
  },

  // Guardias Temporales
  async crearGuardiaTemporal(datos) {
    /**
     * @param {Object} datos - { cedula, nombre, apellido }
     */
    const res = await api.post('/comando/guardias-temporales', datos);
    return res.data;
  },

  async limpiarGuardias() {
    const res = await api.post('/comando/limpiar-guardias');
    return res.data;
  },

  async getGuardiasActivos() {
    const res = await api.get('/comando/guardias-activos');
    return res.data;
  }
};

export default comandoService;
