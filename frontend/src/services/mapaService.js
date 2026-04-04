import api from './api';

export const mapaService = {
  getSituacion: async () => {
    const response = await api.get('/v1/mapa/situacion');
    return response.data;
  },

  actualizarUbicacion: async (tipo, id, lat, lng) => {
    const response = await api.put('/v1/mapa/georreferenciar', {
       tipo,
       id: id.toString(), // Asegurar que sea string
       lat,
       lng
    });
    return response.data;
  }
};
