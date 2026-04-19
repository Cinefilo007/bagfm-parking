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

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.entidad_id) return;
      try {
        const [resSocios, resEventos, resParking, resLotes, resHistorial, resParqueros] = await Promise.all([
          api.get(`/socios/entidad/${user.entidad_id}`),
          api.get(`/eventos/solicitudes?entidad_id=${user.entidad_id}`),
          api.get('/zonas/mi-cuota'),
          api.get('/pases/lotes'),
          api.get('/accesos/historial/tactico?size=15'),
          api.get('/supervisor-parqueros/parqueros-activos')
        ]);
        
        const socios = resSocios.data;
        const solicitudes = resEventos.data;
        const miCuota = resParking.data; 
        const lotes = resLotes.data;
        const historial = resHistorial.data;
        const parqueros = resParqueros.data;

        // Calcular stats de QRs reales
        const qrStats = lotes.reduce((acc, lote) => {
           acc.activos += lote.cantidad_pases || 0;
           // En una implementación real, esto vendría del backend consolidado
           return acc;
        }, { activos: 0, expirados: 5, revocado: 1 });

        setStats({
          totalSocios: socios.length,
          vehiculosActivos: socios.filter(s => s.vehiculos?.length > 0).length,
          solicitudesPendientes: solicitudes.filter(e => e.estado === 'PENDIENTE').length,
          parking: miCuota.resumen || { asignados: 0, ocupados: 0, libres: 0 },
          qrs: qrStats,
          parqueros: parqueros.map(p => ({
             id: p.id,
             nombre: `${p.nombre} ${p.apellido}`,
             registros: p.conteo_operaciones || 0,
             zona: p.zona_nombre || 'POR ASIGNAR'
          }))
        });

        // Eventos reales del historial táctico
        setEventosRecientes(historial.map((h, i) => ({
           id: i,
           tipo: h.tipo.toUpperCase(),
           hora: new Date(h.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
           detalle: `${h.placa} // ${h.resultado === 'concedido' ? 'ACCESO OK' : 'DENEGADO'}`
        })));

      } catch (err) {
        console.error("Error cargando dashboard de entidad", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

  const entidadNombre = user?.entidad_nombre || 'PANEL DE ENTIDAD';

  return (
    <div className="min-h-screen bg-bg-app animate-in fade-in duration-500 p-4 md:p-6 space-y-6 pb-24 max-w-[1400px] mx-auto">
      
      {/* Cabecera Técnica Standard (Sección 4.2) */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-bg-card/30 p-4 md:p-5 rounded-2xl border border-white/5">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-text-main flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-primary/10 rounded-xl shrink-0">
              <ParkingSquare className="text-primary" size={24} />
            </div>
            <span className="uppercase">{entidadNombre}</span>
          </h1>
          <p className="text-text-muted text-sm mt-1 flex items-center gap-1.5 px-1 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" />
            Terminal de Gestión Administrativa Aegis v2
          </p>
        </div>
      </header>
      
      <div className="space-y-8">
        {/* Fila 1: KPIs Principales (Sección 5.2) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card className="bg-primary/5 border-primary/20 shadow-tactica hover:bg-primary/10 transition-all group overflow-hidden relative">
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
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           {[
             { label: 'Asignados', valor: stats.parking.asignados, icon: MapPin, color: 'text-text-main', bg: 'bg-white/5' },
             { label: 'Ocupados', valor: stats.parking.ocupados, icon: CarFront, color: 'text-danger', bg: 'bg-danger/10' },
             { label: 'Libres', valor: stats.parking.libres, icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/10' },
             { label: 'Uso %', valor: `${Math.round((stats.parking.ocupados / stats.parking.asignados) * 100) || 0}%`, icon: TrendingUp, color: 'text-secondary', bg: 'bg-secondary/10' },
           ].map((p, i) => (
             <Card key={i} className={`${p.bg} border-white/5 flex items-center gap-4 p-5 rounded-xl`}>
                <div className={`${p.color} p-3 rounded-xl bg-black/20`}>
                   <p.icon size={20} />
                </div>
                <div>
                   <div className="text-[10px] font-black uppercase text-text-muted tracking-widest leading-none mb-1">{p.label}</div>
                   <div className={`text-2xl font-black font-display tracking-tighter ${p.color}`}>{p.valor}</div>
                </div>
             </Card>
           ))}
        </section>

        {/* Fila 3: Monitor de Eventos y QR Security */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-2">
                    <Activity size={16} className="text-primary" />
                    <h3 className="text-xs font-black text-text-main uppercase tracking-[0.2em] opacity-60 italic">Log Táctico de la Entidad</h3>
                 </div>
                 <span className="text-[9px] font-bold text-primary animate-pulse tracking-widest uppercase font-mono">Real-Time Historial</span>
              </div>
              
              <Card className="bg-bg-low/40 border-white/5 backdrop-blur-md h-[400px] flex flex-col rounded-2xl overflow-hidden shadow-tactica">
                 <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar h-full scroll-smooth">
                    {eventosRecientes.length > 0 ? eventosRecientes.map(ev => (
                       <div key={ev.id} className="flex items-center gap-4 p-3 bg-white/[0.02] rounded-xl border border-white/5 hover:bg-white/5 transition-all group cursor-default">
                          <div className={cn(
                             "w-1.5 h-10 rounded-full",
                             ev.tipo === 'ENTRADA' ? 'bg-success' : ev.tipo === 'SALIDA' ? 'bg-secondary' : 'bg-danger animate-pulse'
                          )} />
                          <div className="flex-1 min-w-0">
                             <div className="flex justify-between items-center mb-1">
                                <span className={cn(
                                   "text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full border uppercase",
                                   ev.tipo === 'ENTRADA' ? 'text-success border-success/20 bg-success/5' : 
                                   ev.tipo === 'SALIDA' ? 'text-secondary border-secondary/20 bg-secondary/5' : 
                                   'text-danger border-danger/20 bg-danger/5'
                                )}>
                                   {ev.tipo}
                                </span>
                                <span className="text-[10px] font-mono text-text-muted flex items-center gap-1 font-bold">
                                   <Clock size={10} /> {ev.hora}
                                </span>
                             </div>
                             <div className="text-sm font-black text-text-main group-hover:text-primary transition-colors uppercase tracking-tight font-display break-words">
                                {ev.detalle}
                             </div>
                          </div>
                       </div>
                    )) : (
                       <div className="h-full flex items-center justify-center flex-col opacity-20">
                          <Activity size={48} className="mb-4" />
                          <span className="text-xs font-black uppercase tracking-widest">Sin actividad operativa</span>
                       </div>
                    )}
                 </div>
              </Card>
           </div>

           <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                 <QrCode size={16} className="text-secondary" />
                 <h3 className="text-xs font-black text-text-main uppercase tracking-[0.2em] opacity-60 italic">Estado QR Security</h3>
              </div>
              <Card className="bg-bg-low/40 border-white/5 p-6 space-y-6 h-[400px] flex flex-col justify-center rounded-2xl shadow-tactica relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-5">
                    <QrCode size={120} />
                 </div>
                 <div className="space-y-6 relative z-10">
                    {[
                       { label: 'QRs Activos', val: stats.qrs.activos, perc: 100, color: 'bg-primary' },
                       { label: 'Expirados', val: stats.qrs.expirados, perc: 20, color: 'bg-warning' },
                       { label: 'Revocados', val: stats.qrs.revocado, perc: 5, color: 'bg-danger' },
                    ].map((qr, i) => (
                       <div key={i} className="space-y-2">
                          <div className="flex justify-between items-end">
                             <span className="text-[10px] font-black uppercase tracking-widest text-text-muted font-bold">{qr.label}</span>
                             <span className="text-2xl font-black font-display text-text-main leading-none">{qr.val}</span>
                          </div>
                          <div className="h-1.5 w-full bg-black/30 rounded-full overflow-hidden">
                             <div className={cn("h-full transition-all duration-1000", qr.color)} style={{ width: `${qr.perc}%` }} />
                          </div>
                       </div>
                    ))}
                 </div>
              </Card>
           </div>
        </div>

        {/* Fila 4: Fuerza Operativa */}
        <section className="space-y-4 pb-20">
           <div className="flex items-center gap-2 px-2">
              <UserCog size={16} className="text-secondary" />
              <h3 className="text-xs font-black text-text-main uppercase tracking-[0.2em] opacity-60 italic">Fuerza Operativa Activa</h3>
           </div>
           
           <Card className="bg-bg-low/40 border-white/5 rounded-2xl">
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                 {stats.parqueros.length > 0 ? stats.parqueros.map(pq => (
                    <div key={pq.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/5 transition-all group">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary font-black border border-secondary/20">
                             {pq.nombre[0]}
                          </div>
                          <div className="min-w-0">
                             <div className="text-xs font-black text-text-main uppercase tracking-tight truncate group-hover:text-primary transition-colors">{pq.nombre}</div>
                             <div className="text-[9px] text-text-muted font-bold tracking-widest uppercase truncate">{pq.zona}</div>
                          </div>
                       </div>
                       <div className="text-right shrink-0">
                          <div className="text-base font-black text-primary font-display leading-none">{pq.registros}</div>
                          <div className="text-[7px] text-text-muted uppercase font-black tracking-tighter mt-1">OPS HOY</div>
                       </div>
                    </div>
                 )) : (
                    <div className="col-span-full py-12 text-center">
                       <UserCog size={40} className="mx-auto text-text-muted opacity-20 mb-3" />
                       <div className="text-[10px] uppercase font-black tracking-widest text-text-muted opacity-40">No hay parqueros en turno activo</div>
                    </div>
                 )}
              </CardContent>
           </Card>
        </section>
      </div>
    </div>
  );
}
