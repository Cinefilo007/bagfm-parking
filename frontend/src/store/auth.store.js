import { create } from 'zustand';
import api from '../services/api';

export const RolTipo = {
  COMANDANTE: "COMANDANTE",
  ADMIN_BASE: "ADMIN_BASE",
  SUPERVISOR: "SUPERVISOR",
  ALCABALA: "ALCABALA",
  ADMIN_ENTIDAD: "ADMIN_ENTIDAD",
  PARQUERO: "PARQUERO",
  SOCIO: "SOCIO"
};

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true, // Para el loader inicial
  
  // Acciones
  login: async (cedula, password) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', cedula);
      formData.append('password', password);

      const response = await api.post('auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token } = response.data;
      
      localStorage.setItem('token', access_token);
      
      // Decodificar token manual o hacer request a /me
      // Por brevedad, el backend asume JWT, aqui lo desencriptamos (base64url)
      const base64Url = access_token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const sessionUser = JSON.parse(jsonPayload);
      
      localStorage.setItem('user', JSON.stringify(sessionUser));

      set({ 
        token: access_token, 
        user: sessionUser, 
        isAuthenticated: true 
      });
      return true;
    } catch (error) {
      console.error("Error en login", error);
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
    window.location.href = '/login';
  },

  checkSession: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      set({ token, user: JSON.parse(user), isAuthenticated: true, isLoading: false });
    } else {
      set({ isAuthenticated: false, isLoading: false });
    }
  }
}));
