import React, { useState, useEffect } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, CardContent } from '../../components/ui/Card';
import { useAuthStore } from '../../store/auth.store';
import { 
  Users, CarFront, AlertCircle, ShieldCheck, 
  ChevronRight, CalendarRange, UserCog, 
  TrendingUp, Activity, Bell, ParkingSquare
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import api from '../../services/api';

export default function DashboardEntidad() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalSocios: 0,
    vehiculosActivos: 0,
    solicitudesPendientes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.entidad_id) return;
      try {
        const [resSocios, resEventos] = await Promise.all([
          api.get(`/socios/entidad/${user.entidad_id}`),
          api.get(`/eventos/solicitudes?entidad_id=${user.entidad_id}`)
        ]);
        
        const socios = resSocios.data;
        const eventos = resEventos.data;

        setStats({
          totalSocios: socios.length,
          vehiculosActivos: socios.filter(s => s.vehiculos?.length > 0).length,
          solicitudesPendientes: eventos.filter(e => e.estado === 'PENDIENTE').length
        });
      } catch (err) {
        console.error("Error cargando dashboard de entidad", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

  // Título dinámico con el nombre de la entidad
  const entidadNombre = user?.entidad_nombre || 'PANEL DE ENTIDAD';

  return (
    <div className="min-h-screen bg-bg-app animate-in fade-in duration-500">
      <Header 
        titulo={entidadNombre} 
        subtitle="TERMINAL DE GESTIÓN ADMINISTRATIVA" 
      />
      
      <main className="max-w-[1400px] mx-auto px-6 py-8 pb-32 space-y-8">
        
        {/* Métricas Principales (Grid Aegis v2) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card className="bg-primary/5 border-primary/20 shadow-xl shadow-primary/5 hover:bg-primary/10 transition-all group overflow-hidden relative">
              <div className="absolute -right-4 -top-4 text-primary/10 group-hover:scale-110 transition-transform">
                 <Users size={120} />
              </div>
              <CardContent className="p-6">
                 <Users className="text-primary mb-4" size={24} />
                 <div className="text-4xl font-black text-text-main italic font-display">{stats.totalSocios}</div>
                 <div className="text-[10px] uppercase font-black tracking-[0.2em] text-text-muted mt-1 opacity-60">Socios Registrados</div>
              </CardContent>
           </Card>

           <Card className="bg-secondary/5 border-secondary/20 hover:bg-secondary/10 transition-all group overflow-hidden relative">
              <div className="absolute -right-4 -top-4 text-secondary/10 group-hover:scale-110 transition-transform">
                 <CarFront size={120} />
              </div>
              <CardContent className="p-6">
                 <CarFront className="text-secondary mb-4" size={24} />
                 <div className="text-4xl font-black text-text-main italic font-display">{stats.vehiculosActivos}</div>
                 <div className="text-[10px] uppercase font-black tracking-[0.2em] text-text-muted mt-1 opacity-60">Flota con Acceso</div>
              </CardContent>
           </Card>

           <Card className="bg-bg-low/40 border-white/5 hover:border-warning/40 transition-all group overflow-hidden relative">
              <div className="absolute -right-4 -top-4 text-warning/10 group-hover:scale-110 transition-transform">
                 <CalendarRange size={120} />
              </div>
              <CardContent className="p-6">
                 <CalendarRange className="text-warning mb-4" size={24} />
                 <div className="text-4xl font-black text-text-main italic font-display">{stats.solicitudesPendientes}</div>
                 <div className="text-[10px] uppercase font-black tracking-[0.2em] text-text-muted mt-1 opacity-60">Eventos en Espera</div>
              </CardContent>
           </Card>
        </section>

        {/* Notificaciones y Acciones Rápidas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           
           {/* Notificaciones Tácticas */}
           <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2 px-2">
                 <Bell size={16} className="text-primary" />
                 <h3 className="text-xs font-black text-text-main uppercase tracking-[0.2em] opacity-60">Estado de la Concesión</h3>
              </div>
              
              <Card className="bg-bg-low/60 border-white/5 backdrop-blur-md">
                 <CardContent className="p-6 space-y-6">
                    <div className="flex items-center gap-4">
                       <div className="h-12 w-12 rounded-2xl bg-warning/10 flex items-center justify-center text-warning shadow-lg shadow-warning/5">
                          <Activity size={24} />
                       </div>
                       <div>
                          <h4 className="text-sm font-black text-white uppercase tracking-tight italic">Monitoreo de Membresías</h4>
                          <p className="text-[10px] text-text-muted font-bold tracking-widest uppercase mt-1">Sin alertas Críticas en las próximas 48h</p>
                       </div>
                    </div>
                 </CardContent>
              </Card>
           </section>

           {/* Menú de Operaciones */}
           <section className="space-y-3">
              <div className="flex items-center gap-2 mb-2 px-2">
                 <TrendingUp size={16} className="text-primary" />
                 <h3 className="text-xs font-black text-text-main uppercase tracking-[0.2em] opacity-60">Protocolos Operativos</h3>
              </div>

              <div className="grid grid-cols-1 gap-3">
                 <NavLink to="/entidad/socios" className="block group">
                    <Card className="bg-white/[0.02] border-white/5 group-hover:bg-primary/5 group-hover:border-primary/20 transition-all active:scale-[0.98]">
                       <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:rotate-6 transition-transform">
                                <Users size={24} />
                             </div>
                             <div>
                                <h5 className="text-sm font-black text-white uppercase tracking-tight italic">Gestión de Socios</h5>
                                <p className="text-[10px] text-text-muted font-bold tracking-widest uppercase opacity-60">Afiliación y Miembros</p>
                             </div>
                          </div>
                          <ChevronRight size={20} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                       </CardContent>
                    </Card>
                 </NavLink>

                 <NavLink to="/entidad/eventos" className="block group">
                    <Card className="bg-white/[0.02] border-white/5 group-hover:bg-warning/5 group-hover:border-warning/20 transition-all active:scale-[0.98]">
                       <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center text-warning group-hover:rotate-6 transition-transform">
                                <CalendarRange size={24} />
                             </div>
                             <div>
                                <h5 className="text-sm font-black text-white uppercase tracking-tight italic">Eventos Masivos</h5>
                                <p className="text-[10px] text-text-muted font-bold tracking-widest uppercase opacity-60">Autorizaciones FL-08</p>
                             </div>
                          </div>
                          <ChevronRight size={20} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                       </CardContent>
                    </Card>
                 </NavLink>

                 <NavLink to="/entidad/personal" className="block group">
                    <Card className="bg-white/[0.02] border-white/5 group-hover:bg-secondary/5 group-hover:border-secondary/20 transition-all active:scale-[0.98]">
                       <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary group-hover:rotate-6 transition-transform">
                                <UserCog size={24} />
                             </div>
                             <div>
                                <h5 className="text-sm font-black text-white uppercase tracking-tight italic">Personal Administrativo</h5>
                                <p className="text-[10px] text-text-muted font-bold tracking-widest uppercase opacity-60">Gestión de Operadores</p>
                             </div>
                          </div>
                          <ChevronRight size={20} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                       </CardContent>
                    </Card>
                 </NavLink>

                 <NavLink to="/entidad/estacionamientos" className="block group">
                    <Card className="bg-white/[0.02] border-white/5 group-hover:bg-primary/5 group-hover:border-primary/20 transition-all active:scale-[0.98]">
                       <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:rotate-6 transition-transform">
                                <ParkingSquare size={24} />
                             </div>
                             <div>
                                <h5 className="text-sm font-black text-white uppercase tracking-tight italic">Estacionamientos</h5>
                                <p className="text-[10px] text-text-muted font-bold tracking-widest uppercase opacity-60">Puestos Asignados y Tipos de Acceso</p>
                             </div>
                          </div>
                          <ChevronRight size={20} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                       </CardContent>
                    </Card>
                 </NavLink>
              </div>
           </section>
        </div>

      </main>
    </div>
  );
}
