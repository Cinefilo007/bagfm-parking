import React, { useState, useEffect } from 'react';
import { CalendarRange, CheckCircle2, XCircle, Clock, Users, ArrowUpRight, FileText, Check, ShieldAlert, Activity, Ticket } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Boton } from '../../components/ui/Boton';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { eventosService } from '../../services/eventos.service';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';

export default function EventosMando() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSol, setSelectedSol] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const [formProc, setFormProc] = useState({
    cantidad_aprobada: 0,
    estado: 'aprobada',
    motivo_rechazo: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [data, sData] = await Promise.all([
        eventosService.getSolicitudes(),
        eventosService.getStats()
      ]);
      setSolicitudes(data);
      setStats(sData);
    } catch (error) {
      toast.error('Error al sincronizar datos tácticos');
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirProcesar = (sol) => {
    setSelectedSol(sol);
    setFormProc({
      cantidad_aprobada: sol.cantidad_solicitada,
      estado: 'aprobada',
      motivo_rechazo: ''
    });
    setShowModal(true);
  };

  const handleProcesar = async (e) => {
    e.preventDefault();
    setProcesando(true);
    try {
      let finalEstado = formProc.estado;
      if (formProc.estado === 'aprobada' && formProc.cantidad_aprobada < selectedSol.cantidad_solicitada) {
         finalEstado = 'aprobada_parcial';
      }

      await eventosService.procesarSolicitud(selectedSol.id, {
        ...formProc,
        estado: finalEstado
      });

      toast.success('Protocolo de evento actualizado');
      setShowModal(false);
      fetchData();
    } catch (error) {
       toast.error('Error en el despliegue del protocolo');
    } finally {
       setProcesando(false);
    }
  };

  const getStatusInfo = (status) => {
    switch(status) {
       case 'pendiente': return { color: 'text-warning', icon: Clock, label: 'Pendiente' };
       case 'aprobada': return { color: 'text-success', icon: CheckCircle2, label: 'Aprobada' };
       case 'aprobada_parcial': return { color: 'text-primary', icon: ArrowUpRight, label: 'Parcial' };
       case 'denegada': return { color: 'text-danger', icon: XCircle, label: 'Denegada' };
       default: return { color: 'text-muted', icon: ShieldAlert, label: 'Desconocido' };
    }
  };

  const statItems = stats ? [
    { label: 'Total Solicitudes', valor: stats.total, icon: Activity },
    { label: 'Pendientes', valor: stats.pendientes, icon: Clock, highlight: stats.pendientes > 0 ? 'alerta' : null },
    { label: 'Aprobaciones', valor: stats.aprobadas, icon: CheckCircle2 },
    { label: 'Pases Emitidos', valor: stats.pases_otorgados, icon: Ticket, primary: true },
  ] : [];

  return (
    <div className="max-w-[1400px] mx-auto p-4 lg:p-8 space-y-8 pb-32">
      {/* Cabecera Táctica v2 */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-bg-card/30 p-4 rounded-3xl border border-white/5">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-text-main flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-primary/10 rounded-xl">
                <CalendarRange className="text-primary shrink-0" size={24} />
            </div>
            <span className="truncate uppercase">Mando de Eventos</span>
          </h1>
          <p className="text-text-muted text-sm mt-1 flex items-center gap-1.5 px-1">
            <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", loading ? "bg-warning" : "bg-success")} />
            Protocolo de Aprobación de Pases Masivos (FL-08)
          </p>
        </div>
      </header>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((stat, i) => {
          const Icono = stat.icon;
          return (
            <Card key={i} className="flex flex-col relative overflow-hidden group hover:bg-bg-high transition-all border-bg-high/10 bg-bg-card/40 p-5">
              <div className="flex justify-between items-start mb-4">
                <Icono 
                  size={20} 
                  className={cn(
                    stat.highlight === 'alerta' ? 'text-warning' : 
                    stat.primary ? 'text-primary' : 'text-text-muted/70'
                  )} 
                />
                <div className="w-1 h-1 rounded-full bg-primary/20 group-hover:bg-primary/50 transition-colors"></div>
              </div>
              
              <div className={cn(
                "font-display font-black text-4xl tracking-tighter leading-none mb-1",
                stat.highlight === 'alerta' ? 'text-warning' : 
                stat.primary ? 'text-primary' : 'text-text-main'
              )}>
                {stat.valor}
              </div>
              
              <div className="text-[10px] uppercase font-black tracking-widest text-text-muted">
                {stat.label}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Listado de Solicitudes */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted flex items-center gap-2">
            <Activity size={14} className="text-primary" />
            Solicitudes en Tránsito
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {solicitudes.map(s => {
            const Status = getStatusInfo(s.estado);
            return (
              <Card 
                key={s.id} 
                className="bg-bg-card/50 border-white/5 border-l-4 group hover:bg-bg-high transition-all" 
                style={{ borderLeftColor: Status.color === 'text-primary' ? 'var(--primary)' : `var(--color-${Status.color.split('-')[1]})` }}
              >
                <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                       <p className="font-black text-text-main text-lg tracking-tight group-hover:text-primary transition-colors">{s.nombre_evento}</p>
                       <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-md border border-white/10", Status.color, "bg-black/20")}>
                          {Status.label}
                       </span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-text-muted">
                       <div className="flex items-center gap-1.5">
                          <Users size={14} className="opacity-50" />
                          <span className="font-bold uppercase tracking-tight">Entidad ID: {s.entidad_id.slice(0, 8)}</span>
                       </div>
                       <div className="flex items-center gap-1.5">
                          <Clock size={14} className="opacity-50" />
                          <span className="font-mono">{new Date(s.fecha_evento).toLocaleDateString()}</span>
                       </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <p className="text-[9px] text-text-muted uppercase font-black tracking-tighter">Solicitado</p>
                      <p className="text-2xl font-display font-black text-text-main tracking-tighter">{s.cantidad_solicitada}</p>
                    </div>

                    <div className="h-8 w-px bg-white/5 hidden sm:block"></div>

                    {s.estado === 'pendiente' ? (
                      <Boton 
                        size="sm" 
                        onClick={() => handleAbrirProcesar(s)} 
                        className="bg-primary/5 text-primary border-primary/20 hover:bg-primary text-on-primary font-bold shadow-tactica"
                      >
                        PROCESAR
                      </Boton>
                    ) : (
                      <div className="text-right">
                         <p className={cn("text-[9px] uppercase font-black tracking-tighter", s.estado === 'denegada' ? "text-danger" : "text-primary")}>
                            {s.estado === 'denegada' ? "Denegado" : "Aprobado"}
                         </p>
                         <p className={cn("text-2xl font-display font-black tracking-tighter", s.estado === 'denegada' ? "text-danger" : "text-primary")}>
                            {s.cantidad_aprobada}
                         </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {solicitudes.length === 0 && !loading && (
            <div className="col-span-full py-24 flex flex-col items-center gap-4 bg-bg-card/20 rounded-3xl border border-dashed border-white/10">
              <ShieldAlert className="text-text-muted opacity-20" size={48} />
              <p className="text-text-muted text-sm font-bold uppercase tracking-widest opacity-40">Sin solicitudes tácticas pendientes</p>
            </div>
          )}
        </div>
      </section>

      {/* MODAL PROCESAR */}
      <Modal 
         isOpen={showModal} 
         onClose={() => !procesando && setShowModal(false)} 
         title="REVISIÓN DE DESPLIEGUE MASIVO"
      >
        <form onSubmit={handleProcesar} className="space-y-6">
           {selectedSol && (
             <div className="bg-bg-app/50 p-4 rounded-2xl border border-white/5 space-y-4">
                <div className="flex items-start gap-4">
                   <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mt-1 shrink-0">
                      <FileText size={20} />
                   </div>
                   <div>
                      <p className="text-[10px] text-text-muted uppercase tracking-[0.15em] font-black mb-1">Motivo del Solicitante</p>
                      <p className="text-sm text-text-sec italic leading-relaxed">"{selectedSol.motivo}"</p>
                   </div>
                </div>
                <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                   <span className="text-[10px] text-text-muted uppercase font-black">Cuota Solicitada</span>
                   <span className="text-lg font-display font-black text-text-main">{selectedSol.cantidad_solicitada} PASES</span>
                </div>
             </div>
           )}

           <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                 <button 
                  type="button"
                  onClick={() => setFormProc({...formProc, estado: 'aprobada'})}
                  className={cn("flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all", formProc.estado === 'aprobada' ? 'bg-primary/10 border-primary text-primary' : 'bg-black/20 border-white/5 text-text-muted hover:border-white/10')}
                 >
                    <Check size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest">APROBAR</span>
                 </button>
                 <button 
                  type="button"
                  onClick={() => setFormProc({...formProc, estado: 'denegada'})}
                  className={cn("flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all", formProc.estado === 'denegada' ? 'bg-danger/10 border-danger text-danger' : 'bg-black/20 border-white/5 text-text-muted hover:border-white/10')}
                 >
                    <XCircle size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest">DENEGAR</span>
                 </button>
              </div>

              {formProc.estado === 'aprobada' ? (
                <div className="space-y-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 animate-in fade-in slide-in-from-top-2">
                   <Input 
                      label="CUOTA AUTORIZADA" 
                      type="number"
                      max={selectedSol?.cantidad_solicitada}
                      min={1}
                      value={formProc.cantidad_aprobada}
                      onChange={e => setFormProc({...formProc, cantidad_aprobada: parseInt(e.target.value)})}
                      className="text-2xl font-display font-black"
                   />
                   <p className="text-[10px] text-text-muted uppercase font-bold text-center italic">
                      {formProc.cantidad_aprobada < selectedSol?.cantidad_solicitada ? "Status: Aprobación Parcial Detectada" : "Status: Aprobación de Cuota Total"}
                   </p>
                </div>
              ) : (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                   <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest pl-1">CAUSA DEL RECHAZO</label>
                   <textarea 
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-text-main text-sm focus:ring-1 focus:ring-danger outline-none min-h-[100px] transition-all"
                      placeholder="Especifique los fundamentos de seguridad o protocolos incumplidos..."
                      value={formProc.motivo_rechazo}
                      onChange={e => setFormProc({...formProc, motivo_rechazo: e.target.value})}
                      required={formProc.estado === 'denegada'}
                   />
                </div>
              )}
           </div>

           <Boton 
             type="submit" 
             className={cn("w-full h-14 text-sm font-black tracking-widest shadow-tactica", formProc.estado === 'denegada' ? 'bg-danger hover:bg-danger/90' : 'bg-primary hover:bg-primary/90 text-on-primary')}
             loading={procesando}
           >
              EJECUTAR PROTOCOLO
           </Boton>
        </form>
      </Modal>
    </div>
  );
}
