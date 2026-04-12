import React from 'react';
import { useAuthStore } from '../store/auth.store';
import { User, LogOut, Shield, Mail, BadgeCheck, Settings, CalendarRange, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Boton } from '../components/ui/Boton';
import { NavLink } from 'react-router-dom';

export default function Ajustes() {
  const { user, logout } = useAuthStore();

  if (!user) return null;

  const showEventos = user.rol === 'COMANDANTE' || user.rol === 'ADMIN_BASE' || user.rol === 'ADMIN_ENTIDAD';
  const eventosLink = user.rol === 'ADMIN_ENTIDAD' ? '/entidad/eventos' : '/comando/eventos';

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="text-primary" />
          Configuración Personal
        </h1>
        <p className="text-text-muted text-sm uppercase tracking-widest font-bold text-[10px]">Perfiles y Accesos Tácticos</p>
      </header>

      {/* Card de Perfil */}
      <Card className="bg-bg-low border-white/5 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/20 to-primary/5" />
        <CardContent className="relative pt-0 pb-6 px-6">
          <div className="flex flex-col items-center -mt-10">
            <div className="w-20 h-20 rounded-2xl bg-bg-app border-4 border-bg-low flex items-center justify-center text-primary shadow-xl rotate-3">
              <User size={40} className="-rotate-3" />
            </div>
            <div className="mt-3 text-center">
              <h2 className="text-xl font-bold text-white uppercase tracking-tight italic">{user.nombre} {user.apellido}</h2>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                  {user.rol.replace('_', ' ')}
                </span>
                {user.activo && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase tracking-tighter">
                    <BadgeCheck size={12} />
                    ACTIVO
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
              <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-text-muted">
                <Shield size={18} />
              </div>
              <div>
                <p className="text-[8px] text-text-muted uppercase font-black tracking-widest">Identificación</p>
                <p className="text-sm text-white font-mono">{user.cedula}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
              <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-text-muted">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-[8px] text-text-muted uppercase font-black tracking-widest">Correo Electrónico</p>
                <p className="text-sm text-white">{user.email || 'NO REGISTRADO'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Módulos de Operaciones (Opcional) */}
      {showEventos && (
        <section className="space-y-3">
          <p className="text-[10px] text-text-muted uppercase font-black tracking-[0.2em] px-1 opacity-50">Operaciones Tácticas</p>
          <NavLink to={eventosLink}>
            <Card className="hover:bg-primary/5 border-white/5 transition-all group active:scale-[0.98]">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <CalendarRange size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-main uppercase tracking-tight">Pases y Eventos Masivos</h4>
                    <p className="text-[10px] text-text-muted">Gestión de autorizaciones grupales</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-text-muted group-hover:translate-x-1 transition-transform" />
              </CardContent>
            </Card>
          </NavLink>
        </section>
      )}

      {/* Seguridad */}
      <section className="space-y-3">
         <p className="text-[10px] text-text-muted uppercase font-black tracking-[0.2em] px-1 opacity-50">Seguridad y Sesión</p>
         <Boton 
            variant="ghost" 
            className="w-full justify-between border-danger/10 text-danger hover:bg-danger/5 hover:text-danger group h-14 rounded-2xl"
            onClick={logout}
         >
            <span className="flex items-center gap-2 font-bold uppercase text-xs tracking-widest">
              <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
              Finalizar Sesión Activa
            </span>
         </Boton>
      </section>

      <footer className="text-center pt-8">
        <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-medium opacity-50">
          BAGFM Terminal v0.8.0
        </p>
        <p className="text-[8px] text-text-muted mt-1 italic">
          Desarrollado bajo estándar táctico AEGIS
        </p>
      </footer>
    </div>
  );
}
