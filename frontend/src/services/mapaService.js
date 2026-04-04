import api from './api';

export const mapaService = {
  getSituacion: async () => {
    // baseURL ya incluye /api/v1, no duplicar
    const response = await api.get('/mapa/situacion');
    return response.data;
  },

  actualizarUbicacion: async (tipo, id, lat, lng) => {
    const response = await api.put('/mapa/georreferenciar', {
       tipo,
       id: id.toString(),
       lat,
       lng
    });
    return response.data;
  }
};
