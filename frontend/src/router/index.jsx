import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RutaProtegida } from './RutaProtegida';
import Login from '../pages/Login';
import DashboardComando from '../pages/comandante/Dashboard';
import Entidades from '../pages/comandante/Entidades';
import EntidadDetalle from '../pages/comandante/EntidadDetalle';
import DashboardEntidad from '../pages/entidad/Dashboard';
import SociosEntidad from '../pages/entidad/Socios';
import DashboardAlcabala from '../pages/alcabala/Dashboard';
import ScannerAlcabala from '../pages/alcabala/Scanner';
import Alcabalas from '../pages/comandante/Alcabalas';
import EventosMando from '../pages/comandante/EventosMando';
import EventosEntidad from '../pages/entidad/Eventos';
import Ajustes from '../pages/Ajustes';
import PortalSocio from '../pages/socio/Portal';
import { useAuthStore } from '../store/auth.store';

const TemporaryPlaceholder = ({ name }) => (
  <div className="flex h-screen items-center justify-center bg-bg-app text-white">
     <h1>App: {name}</h1>
  </div>
);

const HomeRedirect = () => {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.rol === 'COMANDANTE' || user.rol === 'ADMIN_BASE' || user.rol === 'SUPERVISOR') return <Navigate to="/comando/dashboard" replace />;
  if (user.rol === 'ADMIN_ENTIDAD') return <Navigate to="/entidad/dashboard" replace />;
  if (user.rol === 'ALCABALA') return <Navigate to="/alcabala/dashboard" replace />;
  if (user.rol === 'SOCIO') return <Navigate to="/socio/portal" replace />;
  return <Navigate to="/ajustes" replace />;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <RutaProtegida />,
    children: [
      {
        path: '',
        element: <HomeRedirect />
      },
      // ====== COMANDO ======
      {
        path: 'comando',
        element: <RutaProtegida rolesPermitidos={['COMANDANTE', 'ADMIN_BASE', 'SUPERVISOR']} />,
        children: [
          { path: 'dashboard', element: <DashboardComando /> },
          { path: 'entidades', element: <Entidades /> },
          { path: 'entidades/:id', element: <EntidadDetalle /> },
          { path: 'alcabalas', element: <Alcabalas /> },
          { path: 'eventos', element: <EventosMando /> },
          { path: 'infracciones', element: <TemporaryPlaceholder name="Infracciones" /> }
        ],
      },
      {
        path: 'entidad',
        element: <RutaProtegida rolesPermitidos={['ADMIN_ENTIDAD']} />,
        children: [
          { path: 'dashboard', element: <DashboardEntidad /> },
          { path: 'socios', element: <SociosEntidad /> },
          { path: 'eventos', element: <EventosEntidad /> }
        ]
      },
      // ====== ALCABALA ======
      {
        path: 'alcabala',
        element: <RutaProtegida rolesPermitidos={['ALCABALA', 'ADMIN_BASE', 'COMANDANTE']} />,
        children: [
          { path: 'dashboard', element: <DashboardAlcabala /> },
          { 
            path: 'scanner', 
            element: <RutaProtegida hideNav={true} rolesPermitidos={['ALCABALA']} />,
            children: [
               { path: '', element: <ScannerAlcabala /> }
            ]
          }
        ]
      },
      // ====== SOCIO ======
      {
        path: 'socio',
        element: <RutaProtegida rolesPermitidos={['SOCIO']} />,
        children: [
          { path: 'portal', element: <PortalSocio /> }
        ]
      },
      // ====== RUTAS COMPARTIDAS ======
      {
         path: 'ajustes',
         element: <Ajustes />
      }
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
