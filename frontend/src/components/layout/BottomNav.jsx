import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShieldCheck, Users, Menu, ClipboardList, Camera, UserCog, LogOut, ParkingSquare, Radio } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/auth.store';

export const BottomNav = () => {
  const { user, logout } = useAuthStore();
  
  // Dependiendo del rol, las rutas
  const navItems = [];
  
  if (user?.rol === 'COMANDANTE' || user?.rol === 'ADMIN_BASE') {
    navItems.push(
      { to: '/comando/dashboard', label: 'Centro', icon: ShieldCheck },
      { to: '/comando/entidades', label: 'Entidades', icon: Users },
      { to: '/comando/zonas', label: 'Zonas', icon: ParkingSquare },
      { to: '/comando/alcabalas', label: 'Alcabalas', icon: ClipboardList },
      { to: '/ajustes', label: 'Más', icon: Menu }
    );
  } else if (user?.rol === 'ADMIN_ENTIDAD') {
    navItems.push(
       { to: '/entidad/dashboard', label: 'Panel', icon: ShieldCheck },
       { to: '/entidad/estacionamientos', label: 'Parking', icon: ParkingSquare },
       { to: '/entidad/pases-masivos', label: 'Pases', icon: ClipboardList },
       { to: '/entidad/socios', label: 'Socios', icon: Users },
       { to: '/ajustes', label: 'Más', icon: Menu }
    );
  } else if (user?.rol === 'ALCABALA') {
    navItems.push(
      { to: '/alcabala/dashboard', label: 'Panel', icon: ShieldCheck },
      { to: '/alcabala/scanner', label: 'Scanner', icon: Camera },
      { label: 'Cerrar', icon: LogOut, action: 'logout' }
    );
  } else if (user?.rol === 'PARQUERO') {
    navItems.push(
      { to: '/parquero/dashboard', label: 'Mi Zona', icon: ParkingSquare },
      { to: '/ajustes', label: 'Más', icon: Menu }
    );
  } else if (user?.rol === 'SUPERVISOR_PARQUEROS') {
    navItems.push(
      { to: '/supervisor/dashboard', label: 'Superv.', icon: Radio },
      { to: '/parquero/dashboard', label: 'Parqueo', icon: ParkingSquare },
      { to: '/ajustes', label: 'Más', icon: Menu }
    );
  } else {
    navItems.push(
      { to: '/ajustes', label: 'Perfil', icon: Menu }
    );
  }

  const handleAction = (item) => {
    if (item.action === 'logout') {
      logout();
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg-low h-16 flex items-center justify-around px-2 z-[100] pb-env-safe border-t border-white/5 lg:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.4)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const commonClass = "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-colors min-w-[64px]";
        
        if (item.action) {
           return (
             <button
               key={item.label}
               onClick={() => handleAction(item)}
               className={cn(commonClass, "text-text-muted hover:text-danger active:scale-95")}
             >
               <Icon size={22} strokeWidth={2.5} />
               <span className="text-[10px] font-medium tracking-wide uppercase">
                 {item.label}
               </span>
             </button>
           );
        }

        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                commonClass,
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-text-muted hover:text-text-sec"
              )
            }
          >
            <Icon size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-medium tracking-wide uppercase">
              {item.label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
};
