import React, { useState, useEffect } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, CardContent } from '../../components/ui/Card';
import { useAuthStore } from '../../store/auth.store';
import { 
  Users as UsersIcon, CarFront, AlertCircle, ShieldCheck, 
  ChevronRight, CalendarRange, UserCog, 
  TrendingUp, Activity, Bell, ParkingSquare,
  QrCode, Clock, MapPin, Search, CheckCircle2, XCircle
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import api from '../../services/api';

export default function DashboardEntidad() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalSocios: 0,
    vehiculosActivos: 0,
    solicitudesPendientes: 0,
    parking: { asignados: 0, ocupados: 0, libres: 0 },
    qrs: { activos: 0, expirados: 0, revocado: 0 },
    parqueros: []
  });
  const [eventosRecientes, setEventosRecientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.entidad_id) return;
      try {
        const [resSocios, resEventos, resParking, resLotes] = await Promise.all([
          api.get(`/socios/entidad/${user.entidad_id}`),
          api.get(`/eventos/solicitudes?entidad_id=${user.entidad_id}`),
          api.get('/zonas/mi-cuota'),
          api.get('/pases/lotes')
        ]);
        
        const socios = resSocios.data;
        const solicitudes = resEventos.data;
        const miCuota = resParking.data; // { asignaciones: [...], resumen: { asignados, ocupados, libres } }
        const lotes = resLotes.data;

        // Calcular stats de QRs desde los lotes (simplificado para el dashboard)
        const qrStats = lotes.reduce((acc, lote) => {
           acc.activos += lote.cantidad_pases || 0;
           return acc;
        }, { activos: 0, expirados: 12, revocado: 2 }); // Simulando algunos para la demo visual

        setStats({
          totalSocios: socios.length,
          vehiculosActivos: socios.filter(s => s.vehiculos?.length > 0).length,
          solicitudesPendientes: solicitudes.filter(e => e.estado === 'PENDIENTE').length,
          parking: miCuota.resumen || { asignados: 0, ocupados: 0, libres: 0 },
          qrs: qrStats,
          parqueros: [
             { id: 1, nombre: 'JUAN PEREZ', registros: 45, zona: 'EST. COMANDO' },
             { id: 2, nombre: 'MARIA LOPEZ', registros: 38, zona: 'DORMITORIOS' },
             { id: 3, nombre: 'CARLOS RUIZ', registros: 12, zona: 'COMEDOR' }
          ]
        });

        // Simular eventos recientes para el monitor táctico
        setEventosRecientes([
           { id: 1, tipo: 'INGRESO', hora: '08:45', detalle: 'V-123456 // ACCESO CONCEDIDO' },
           { id: 2, tipo: 'SALIDA', hora: '08:50', detalle: 'V-987654 // SALIDA PROCESADA' },
           { id: 3, tipo: 'ALERTA', hora: '09:00', detalle: 'V-443322 // PUESTO NO ASIGNADO' },
           { id: 4, tipo: 'ALERTA', hora: '09:12', detalle: 'V-110022 // TIEMPO LÍMITE EXCEDIDO' }
        ]);

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
        
        {/* Fila 1: Métricas Legales y Sociales */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card className="bg-primary/5 border-primary/20 shadow-xl shadow-primary/5 hover:bg-primary/10 transition-all group overflow-hidden relative">
              <div className="absolute -right-4 -top-4 text-primary/10 group-hover:scale-110 transition-transform">
                 <UsersIcon size={120} />
              </div>
              <CardContent className="p-6">
                 <UsersIcon className="text-primary mb-4" size={24} />
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
                 <div className="text-[10px] uppercase font-black tracking-[0.2em] text-text-muted mt-1 opacity-60">Flota Autorizada</div>
              </CardContent>
           </Card>

           <Card className="bg-warning/5 border-warning/20 hover:bg-warning/10 transition-all group overflow-hidden relative">
              <div className="absolute -right-4 -top-4 text-warning/10 group-hover:scale-110 transition-transform">
                 <CalendarRange size={120} />
              </div>
              <CardContent className="p-6">
                 <CalendarRange className="text-warning mb-4" size={24} />
                 <div className="text-4xl font-black text-text-main italic font-display">{stats.solicitudesPendientes}</div>
                 <div className="text-[10px] uppercase font-black tracking-[0.2em] text-text-muted mt-1 opacity-60">Pases en Espera</div>
              </CardContent>
           </Card>
        </section>

        {/* Fila 2: Monitor de Estacionamiento Táctico */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
           {[
             { label: 'Asignados', valor: stats.parking.asignados, icon: MapPin, color: 'text-text-main', bg: 'bg-white/5' },
             { label: 'Ocupados', valor: stats.parking.ocupados, icon: CarFront, color: 'text-danger', bg: 'bg-danger/10' },
             { label: 'Libres', valor: stats.parking.libres, icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/10' },
             { label: 'Uso %', valor: `${Math.round((stats.parking.ocupados / stats.parking.asignados) * 100) || 0}%`, icon: TrendingUp, color: 'text-secondary', bg: 'bg-secondary/10' },
           ].map((p, i) => (
             <Card key={i} className={`${p.bg} border-white/5 flex items-center gap-4 p-5`}>
                <div className={`${p.color} p-3 rounded-xl bg-black/20`}>
                   <p.icon size={20} />
                </div>
                <div>
                   <div className="text-[11px] font-black uppercase text-text-muted tracking-widest leading-none mb-1">{p.label}</div>
                   <div className={`text-2xl font-black font-display tracking-tighter ${p.color}`}>{p.valor}</div>
                </div>
             </Card>
           ))}
        </section>

        {/* Fila 3: Monitor de Eventos y QR Security */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* Monitor Táctico de Eventos (2 columnas) */}
           <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-2">
                    <Activity size={16} className="text-primary" />
                    <h3 className="text-xs font-black text-text-main uppercase tracking-[0.2em] opacity-60">Log Táctico de la Entidad</h3>
                 </div>
                 <span className="text-[9px] font-bold text-primary animate-pulse tracking-widest uppercase">Live Stream // Satelital</span>
              </div>
              
              <Card className="bg-bg-low/40 border-white/5 backdrop-blur-md h-[400px] flex flex-col">
                 <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {eventosRecientes.map(ev => (
                       <div key={ev.id} className="flex items-center gap-4 p-3 bg-white/[0.02] rounded-xl border border-white/5 hover:bg-white/5 transition-colors group">
                          <div className={cn(
                             "w-1.5 h-10 rounded-full",
                             ev.tipo === 'INGRESO' ? 'bg-primary' : ev.tipo === 'SALIDA' ? 'bg-secondary' : 'bg-danger animate-pulse'
                          )} />
                          <div className="flex-1">
                             <div className="flex justify-between items-center mb-1">
                                <span className={cn(
                                   "text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full border",
                                   ev.tipo === 'INGRESO' ? 'text-primary border-primary/20 bg-primary/5' : 
                                   ev.tipo === 'SALIDA' ? 'text-secondary border-secondary/20 bg-secondary/5' : 
                                   'text-danger border-danger/20 bg-danger/5'
                                )}>
                                   {ev.tipo}
                                </span>
                                <span className="text-[10px] font-mono text-text-muted flex items-center gap-1">
                                   <Clock size={10} /> {ev.hora}
                                </span>
                             </div>
                             <div className="text-xs font-bold text-text-main group-hover:text-primary transition-colors uppercase tracking-tight">
                                {ev.detalle}
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              </Card>
           </div>

           {/* QR Security Panel */}
           <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                 <QrCode size={16} className="text-secondary" />
                 <h3 className="text-xs font-black text-text-main uppercase tracking-[0.2em] opacity-60">Estado de Códigos QR</h3>
              </div>
              <Card className="bg-bg-low/40 border-white/5 p-6 space-y-6 flex flex-col justify-center h-[400px]">
                 <div className="space-y-4">
                    {[
                       { label: 'QRs Activos', val: stats.qrs.activos, perc: 85, color: 'bg-primary' },
                       { label: 'Expirados', val: stats.qrs.expirados, perc: 10, color: 'bg-warning' },
                       { label: 'Revocados', val: stats.qrs.revocado, perc: 5, color: 'bg-danger' },
                    ].map((qr, i) => (
                       <div key={i} className="space-y-2">
                          <div className="flex justify-between items-end">
                             <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">{qr.label}</span>
                             <span className="text-xl font-black font-display text-text-main">{qr.val}</span>
                          </div>
                          <div className="h-2 w-full bg-black/30 rounded-full overflow-hidden">
                             <div className={cn("h-full transition-all duration-1000", qr.color)} style={{ width: `${qr.perc}%` }} />
                          </div>
                       </div>
                    ))}
                 </div>
                 <button className="w-full py-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-text-muted hover:bg-white/10 hover:text-text-main transition-all mt-4">
                    Auditar Lotes Completos
                 </button>
              </Card>
           </div>
        </div>

        {/* Fila 4: Protocolos y Fuerza Operativa */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
           
           {/* Fuerza Operativa (Parqueros) */}
           <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2 px-2">
                 <UserCog size={16} className="text-secondary" />
                 <h3 className="text-xs font-black text-text-main uppercase tracking-[0.2em] opacity-60">Fuerza Operativa (Parqueros)</h3>
              </div>
              
              <Card className="bg-bg-low/40 border-white/5">
                 <CardContent className="p-4 space-y-3">
                    {stats.parqueros.length > 0 ? stats.parqueros.map(pq => (
                       <div key={pq.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/5 transition-all">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary font-black">
                                {pq.nombre[0]}
                             </div>
                             <div>
                                <div className="text-xs font-black text-white uppercase tracking-tight">{pq.nombre}</div>
                                <div className="text-[9px] text-text-muted font-bold tracking-widest uppercase">{pq.zona}</div>
                             </div>
                          </div>
                          <div className="text-right">
                             <div className="text-sm font-black text-primary">{pq.registros}</div>
                             <div className="text-[7px] text-text-muted uppercase font-black tracking-tighter">REGISTROS HOY</div>
                          </div>
                       </div>
                    )) : (
                       <div className="py-10 text-center text-text-muted text-[10px] uppercase font-black tracking-widest opacity-40">Sin parqueros activos en este sector</div>
                    )}
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
                                <UsersIcon size={24} />
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
