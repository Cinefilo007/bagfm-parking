import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { BottomNav } from '../components/layout/BottomNav';
import { Sidebar } from '../components/layout/Sidebar';
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

  if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(user.rol)) {
    if (user.rol === 'COMANDANTE' || user.rol === 'ADMIN_BASE' || user.rol === 'SUPERVISOR') return <Navigate to="/comando/dashboard" replace />;
    if (user.rol === 'ADMIN_ENTIDAD') return <Navigate to="/entidad/dashboard" replace />;
    if (user.rol === 'ALCABALA') return <Navigate to="/alcabala/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  // Cambio de Contraseña Obligatorio
  if (user?.debe_cambiar_password) {
    return (
      <div className="min-h-screen bg-bg-app flex flex-col">
        <CambiarPasswordModal />
        <div className="flex-1 filter blur-sm pointer-events-none select-none">
          {/* Layout dummy para el blur */}
          <div className="flex h-screen overflow-hidden">
             {!hideNav && <Sidebar />}
             <main className="flex-1 overflow-auto p-4 md:p-8">
                <Outlet />
             </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-app flex">
       {/* Sidebar para Escritorio (Desktop) */}
       {!hideNav && <Sidebar />}

       {/* Contenedor Principal Adaptativo */}
       <main className={`flex-1 flex flex-col ${!hideNav ? 'pb-20 lg:pb-0' : ''} h-screen overflow-hidden`}>
          <div className="flex-1 overflow-y-auto w-full p-4 md:p-8 no-scrollbar bg-bg-app relative z-0">
             {/* Renderizado de la Página */}
             <Outlet />
          </div>

          {/* Menú de Navegación Inferior (Móvil) */}
          {!hideNav && <BottomNav />}
       </main>
    </div>
  );
};
