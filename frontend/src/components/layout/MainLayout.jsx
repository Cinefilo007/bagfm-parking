import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { ThemeToggle } from '../ui/ThemeToggle';

export const MainLayout = ({ hideNav = false }) => {
  return (
    <div className="min-h-screen bg-bg-app flex">
       <ThemeToggle />
       {/* Sidebar para Escritorio (Desktop) */}
       {!hideNav && <Sidebar />}

       {/* Contenedor Principal Adaptativo */}
       <main className={`flex-1 flex flex-col ${!hideNav ? 'pb-20 lg:pb-0' : ''} h-screen overflow-hidden`}>
          <div className="flex-1 overflow-y-auto w-full no-scrollbar bg-bg-app relative z-0">
             {/* Renderizado de la Página */}
             <Outlet />
          </div>

          {/* Menú de Navegación Inferior (Móvil) */}
          {!hideNav && <BottomNav />}
       </main>
    </div>
  );
};
