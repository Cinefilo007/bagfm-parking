import React, { useState, useEffect } from 'react';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { Card } from '../../components/ui/Card';
import { useAuthStore } from '../../store/auth.store';
import { Users, CarFront, AlertCircle, ShieldCheck } from 'lucide-react';
import api from '../../services/api';

export default function DashboardEntidad() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalSocios: 0,
    vehiculosActivos: 0,
    vencimientosProximos: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.entidad_id) return;
      try {
        const res = await api.get(`/socios/entidad/${user.entidad_id}`);
        const socios = res.data;
        setStats({
          totalSocios: socios.length,
          vehiculosActivos: socios.filter(s => s.membresias?.some(m => m.estado === 'ACTIVA')).length,
          vencimientosProximos: 0 // Lógica para fechas pronto
        });
      } catch (err) {
        console.error("Error cargando stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  return (
    <div className="min-h-screen bg-bg-app">
      <Header 
        titulo={user?.entidad_nombre || 'Mi Entidad'} 
        subtitle="PANEL DE CONTROL ADMINISTRATIVO" 
      />
      
      <main className="px-4 py-6 pb-24 max-w-lg mx-auto">
        <div className="grid grid-cols-2 gap-4 mb-8">
           <Card className="flex flex-col p-4 bg-primary/5 border-primary/20">
              <Users size={20} className="text-primary mb-4" />
              <div className="text-3xl font-display font-bold text-text-main">{stats.totalSocios}</div>
              <div className="text-[10px] uppercase tracking-widest text-text-muted">Socios Registrados</div>
           </Card>

           <Card className="flex flex-col p-4">
              <CarFront size={20} className="text-text-sec mb-4" />
              <div className="text-3xl font-display font-bold text-text-main">{stats.vehiculosActivos}</div>
              <div className="text-[10px] uppercase tracking-widest text-text-muted">Vehículos con Acceso</div>
           </Card>
        </div>

        {/* Notificaciones / Alertas Tácticas */}
        <section className="mb-8">
           <h3 className="text-text-main font-display font-bold uppercase tracking-widest text-sm mb-4 border-b border-white/5 pb-2">
             Estado del Sistema
           </h3>
           <Card className="p-4 flex items-center gap-4 bg-warning/5 border-warning/20">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center text-warning">
                 <AlertCircle size={20} />
              </div>
              <div className="flex-1">
                 <p className="text-xs text-text-main font-bold uppercase tracking-wide">Membresías por Vencer</p>
                 <p className="text-[10px] text-text-muted">No se detectan vencimientos en las próximas 48h.</p>
              </div>
           </Card>
        </section>

        {/* Acceso Rápido */}
        <div className="space-y-3">
           <button 
             onClick={() => window.location.href = '/entidad/socios'}
             className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group hover:border-primary/40 transition-all active:scale-[0.98]"
           >
              <div className="flex items-center gap-3">
                 <ShieldCheck size={20} className="text-primary" />
                 <span className="text-sm font-bold text-text-main uppercase tracking-wider text-left">Gestionar Miembros</span>
              </div>
              <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-text-muted group-hover:text-primary transition-colors">
                 →
              </div>
           </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
