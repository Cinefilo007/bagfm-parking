import axios from 'axios';

// Axios Instance Configuration
const getBaseURL = () => {
  const url = import.meta.env.VITE_API_URL || 'https://bagfm-backend-production.up.railway.app/api/v1';
  // Si estamos en HTTPS (producción/railway), asegurar que la API use HTTPS
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http:')) {
    return url.replace('http:', 'https:');
  }
  return url;
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Inyectar token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Manejo global de expiración de sesión u otros errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si el error es 401 Unauthorized y no estamos en la página de login
    if (error.response && error.response.status === 401) {
      // Intentar detectar si es la petición de login para NO refrescar
      const url = error.config.url || '';
      const isLoginRequest = url.includes('auth/login');
      
      console.log(">> Interceptor 401:", { url, isLoginRequest });

      if (!isLoginRequest) {
        console.warn(">> 401 en ruta protegida, cerrando sesión...");
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
