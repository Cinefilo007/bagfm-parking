import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export const RutaProtegida = ({ rolesPermitidos = [] }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-app">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Si se pasaron roles, validar
  if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(user.rol)) {
    // Usuario no autorizado para esta ruta, mandarlo a su inicio natural
    if (user.rol === 'COMANDANTE' || user.rol === 'ADMIN_BASE') return <Navigate to="/comando/dashboard" replace />;
    if (user.rol === 'ADMIN_ENTIDAD') return <Navigate to="/entidad/dashboard" replace />;
    return <Navigate to="/inicio" replace />;
  }

  return <Outlet />;
};
