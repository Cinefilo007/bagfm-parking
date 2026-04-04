import api from './api';

export const mapaService = {
  getSituacion: async () => {
    const response = await api.get('/mapa/situacion');
    return response.data;
  }
};
