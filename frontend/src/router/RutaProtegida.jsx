import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { BottomNav } from '../components/layout/BottomNav';
import { CambiarPasswordModal } from '../components/auth/CambiarPasswordModal';

export const RutaProtegida = ({ rolesPermitidos = [], hideNav = false }) => {
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
    // Redirección inteligente fundamentada en el rol
    if (user.rol === 'COMANDANTE' || user.rol === 'ADMIN_BASE' || user.rol === 'SUPERVISOR') return <Navigate to="/comando/dashboard" replace />;
    if (user.rol === 'ADMIN_ENTIDAD') return <Navigate to="/entidad/dashboard" replace />;
    if (user.rol === 'ALCABALA') return <Navigate to="/alcabala/dashboard" replace />;
    
    // Fallback seguro
    return <Navigate to="/login" replace />;
  }

  // Intercepción de Seguridad: Cambio de Contraseña Obligatorio
  if (user?.debe_cambiar_password) {
    return (
      <div className="min-h-screen bg-bg-app flex flex-col">
        <CambiarPasswordModal />
        <div className="flex-1 filter blur-sm pointer-events-none select-none">
          <Outlet />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-app flex flex-col">
       <div className="flex-1">
          <Outlet />
       </div>
       {!hideNav && <BottomNav />}
    </div>
  );
};
