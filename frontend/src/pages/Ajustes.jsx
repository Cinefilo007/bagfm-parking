import React from 'react';
import { useAuthStore } from '../store/auth.store';
import { User, LogOut, Shield, Mail, BadgeCheck, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Boton } from '../components/ui/Boton';

export default function Ajustes() {
  const { user, logout } = useAuthStore();

  if (!user) return null;

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="text-primary" />
          Ajustes de Cuenta
        </h1>
        <p className="text-text-muted text-sm">Gestiona tu perfil y sesión</p>
      </header>

      <Card className="bg-bg-low border-white/5 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/20 to-primary/5" />
        <CardContent className="relative pt-0 pb-6 px-6">
          <div className="flex flex-col items-center -mt-10">
            <div className="w-20 h-20 rounded-full bg-bg-app border-4 border-bg-low flex items-center justify-center text-primary shadow-xl">
              <User size={40} />
            </div>
            <div className="mt-3 text-center">
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">{user.nombre} {user.apellido}</h2>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest border border-primary/20">
                  {user.rol}
                </span>
                {user.activo && (
                  <span className="flex items-center gap-1 text-[10px] text-success font-medium">
                    <BadgeCheck size={12} />
                    Verificado
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-text-muted">
                <Shield size={20} />
              </div>
              <div>
                <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Identificación</p>
                <p className="text-sm text-white font-mono">{user.cedula}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-text-muted">
                <Mail size={20} />
              </div>
              <div>
                <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Correo Electrónico</p>
                <p className="text-sm text-white">{user.email || 'No registrado'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
         <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest px-1">Seguridad y Sesión</p>
         <Boton 
            variant="outline" 
            className="w-full justify-between border-error/20 text-error hover:bg-error/5 group"
            onClick={logout}
         >
            <span className="flex items-center gap-2">
              <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
              Cerrar Sesión
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
