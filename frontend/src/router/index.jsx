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
import { RolTipo } from '../store/auth.store'; // Or wherever RolTipo is defined, wait, I saw it in models. In frontend it's a string.

const TemporaryPlaceholder = ({ name }) => (
  <div className="flex h-screen items-center justify-center bg-bg-app text-white">
     <h1>App: {name}</h1>
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    // Protected base route
    element: <RutaProtegida />,
    children: [
      {
        path: '',
        element: <Navigate to="/comando/dashboard" replace />
      },
      // ====== COMANDO ======
      {
        path: 'comando',
        element: <RutaProtegida rolesPermitidos={['COMANDANTE', 'ADMIN_BASE']} />,
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
          { path: 'scanner', element: <ScannerAlcabala /> }
        ]
      },
      // ====== RUTAS COMPARTIDAS O INACTIVAS ======
      {
         path: 'ajustes',
         element: <TemporaryPlaceholder name="Ajustes de Perfil" />
      }
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
