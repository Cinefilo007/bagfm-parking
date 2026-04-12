import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShieldCheck, Users, Menu, ClipboardList, CalendarRange, Camera, UserCog } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/auth.store';

export const BottomNav = () => {
  const { user } = useAuthStore();
  
  // Dependiendo del rol, las rutas
  const navItems = [];
  
  if (user?.rol === 'COMANDANTE' || user?.rol === 'ADMIN_BASE') {
    navItems.push(
      { to: '/comando/dashboard', label: 'Centro', icon: ShieldCheck },
      { to: '/comando/entidades', label: 'Entidades', icon: Users },
      { to: '/comando/alcabalas', label: 'Alcabalas', icon: ClipboardList },
      { to: '/comando/personal', label: 'Personal', icon: UserCog },
      { to: '/ajustes', label: 'Más', icon: Menu }
    );
  } else if (user?.rol === 'ADMIN_ENTIDAD') {
    navItems.push(
       { to: '/entidad/dashboard', label: 'Panel', icon: ShieldCheck },
       { to: '/entidad/socios', label: 'Socios', icon: Users },
       { to: '/entidad/personal', label: 'Personal', icon: UserCog },
       { to: '/entidad/eventos', label: 'Eventos', icon: CalendarRange },
       { to: '/ajustes', label: 'Más', icon: Menu }
    );
  } else if (user?.rol === 'ALCABALA') {
    navItems.push(
      { to: '/alcabala/dashboard', label: 'Panel', icon: ShieldCheck },
      { to: '/alcabala/scanner', label: 'Scanner', icon: Camera },
      { to: '/ajustes', label: 'Ajustes', icon: Menu }
    );
  } else {
    // Parquero o socio (se ajustará mas adelante)
    navItems.push(
      { to: '/ajustes', label: 'Perfil', icon: Menu }
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg-low h-16 flex items-center justify-around px-2 z-[100] pb-env-safe border-t border-white/5 lg:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.4)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-colors min-w-[64px]",
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
