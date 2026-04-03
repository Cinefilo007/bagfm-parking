import api from './api';

const socioService = {
  // Obtener socios por entidad (para el Admin)
  listarPorEntidad: async (entidadId) => {
    const response = await api.get(`/socios/entidad/${entidadId}`);
    return response.data;
  },

  // Obtener datos del portal (para el Socio)
  obtenerPortal: async () => {
    const response = await api.get('/socios/me/portal');
    return response.data;
  },

  // Renovar membresía (para el Admin)
  renovar: async (socioId, meses = 1) => {
    const response = await api.post(`/socios/${socioId}/renovar?meses=${meses}`);
    return response.data;
  },

  // Cambiar estado (para el Admin)
  cambiarEstado: async (socioId, estado) => {
    const response = await api.post(`/socios/${socioId}/estado?estado=${estado}`);
    return response.data;
  },

  // Crear socio (para el Admin)
  crear: async (datos) => {
    const response = await api.post('/socios/', datos);
    return response.data;
  },

  // Importar desde Excel
  importarExcel: async (entidadId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/socios/importar?entidad_id=${entidadId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Descargar plantilla
  descargarTemplate: async () => {
    const response = await api.get('/socios/template', { responseType: 'blob' });
    return response.data;
  }
};

export default socioService;
