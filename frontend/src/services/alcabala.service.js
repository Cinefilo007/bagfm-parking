import api from './api';

/**
 * Servicio para gestión de accesos y alcabalas.
 */
export const alcabalaService = {
  /**
   * Envía el token del QR al backend para su validación.
   * @param {string} qrToken Token JWT del código QR.
   * @param {string} tipo 'entrada' o 'salida'.
   */
  async validarQR(qrToken, tipo) {
    const { data } = await api.post('/accesos/validar', {
      qr_token: qrToken,
      tipo: tipo
    });
    return data;
  },

  /**
   * Confirma el registro del acceso tras la validación manual del guardia.
   * @param {object} datos Datos para el registro (usuario_id, vehiculo_id, tipo, etc).
   */
  async registrarAcceso(datos) {
    const { data } = await api.post('/accesos/registrar', datos);
    return data;
  }
};

export const infraccionService = {
    /**
     * Obtiene infracciones activas.
     */
    async obtenerActivas() {
        const { data } = await api.get('/infracciones/activas');
        return data;
    },

    /**
     * Registra una nueva infracción (Supervisor/Comando).
     */
    async crear(datos) {
        const { data } = await api.post('/infracciones', datos);
        return data;
    }
}
