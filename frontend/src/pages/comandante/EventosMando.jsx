import React, { useState, useEffect } from 'react';
import { CalendarRange, CheckCircle2, XCircle, Clock, Users, ArrowUpRight, FileText, Check, ShieldAlert } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Boton } from '../../components/ui/Boton';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { eventosService } from '../../services/eventos.service';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';

export default function EventosMando() {
  const [solicitudes, setSolicitudes] = useState([]);
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
    fetchSolicitudes();
  }, []);

  const fetchSolicitudes = async () => {
    try {
      const data = await eventosService.getSolicitudes();
      setSolicitudes(data);
    } catch (error) {
      toast.error('Error al cargar solicitudes');
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
      // Ajustar estado si la cantidad es menor a la solicitada
      let finalEstado = formProc.estado;
      if (formProc.estado === 'aprobada' && formProc.cantidad_aprobada < selectedSol.cantidad_solicitada) {
         finalEstado = 'aprobada_parcial';
      }

      await eventosService.procesarSolicitud(selectedSol.id, {
        ...formProc,
        estado: finalEstado
      });

      toast.success('Solicitud procesada correctamente');
      setShowModal(false);
      fetchSolicitudes();
    } catch (error) {
       toast.error('No se pudo procesar la solicitud');
    } finally {
       setProcesando(false);
    }
  };

  const getStatusInfo = (status) => {
    switch(status) {
       case 'pendiente': return { color: 'text-warning', icon: Clock, label: 'Pendiente' };
       case 'aprobada': return { color: 'text-success', icon: CheckCircle2, label: 'Aprobada' };
       case 'aprobada_parcial': return { color: 'text-primary', icon: ArrowUpRight, label: 'Parcial' };
       case 'denegada': return { color: 'text-error', icon: XCircle, label: 'Denegada' };
       default: return { color: 'text-muted', icon: ShieldAlert, label: 'Desconocido' };
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <header>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CalendarRange className="text-primary" />
          Mando de Eventos
        </h1>
        <p className="text-text-muted text-sm fill-secondary font-bold">Aprobación de Pases Masivos (Directiva FL-08)</p>
      </header>

      <div className="space-y-4">
        {solicitudes.map(s => {
          const Status = getStatusInfo(s.estado);
          return (
            <Card key={s.id} className="bg-bg-low border-white/5 border-l-2" style={{ borderLeftColor: `var(--${Status.color === 'text-primary' ? 'primary' : Status.color.split('-')[1]})` }}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                     <p className="font-bold text-white text-lg">{s.nombre_evento}</p>
                     <p className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-white/10", Status.color)}>
                        {Status.label}
                     </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                     <div className="flex items-center gap-1">
                        <Users size={12} />
                        <span>Entidad #{s.entidad_id.slice(0, 4)}</span>
                     </div>
                     <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{new Date(s.fecha_evento).toLocaleDateString()}</span>
                     </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <p className="text-[10px] text-text-muted uppercase font-bold">Solicitud</p>
                    <p className="text-xl font-mono text-white font-black">{s.cantidad_solicitada}</p>
                  </div>
                  {s.estado === 'pendiente' && (
                    <Boton size="sm" onClick={() => handleAbrirProcesar(s)} className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                      Procesar
                    </Boton>
                  )}
                  {s.estado.includes('aprobada') && (
                    <div className="text-right">
                       <p className="text-[10px] text-primary uppercase font-bold">Aprobada</p>
                       <p className="text-lg font-mono text-primary font-black">{s.cantidad_aprobada}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {solicitudes.length === 0 && !loading && (
          <div className="text-center py-20 opacity-30 italic">
            No hay solicitudes por procesar
          </div>
        )}
      </div>

      {/* MODAL PROCESAR */}
      <Modal 
         isOpen={showModal} 
         onClose={() => !procesando && setShowModal(false)} 
         title="Revisar Solicitud de Evento"
      >
        <form onSubmit={handleProcesar} className="space-y-6">
           {selectedSol && (
             <div className="bg-bg-app p-4 rounded-xl border border-white/5 space-y-3">
                <div className="flex items-start gap-3">
                   <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mt-1">
                      <FileText size={16} />
                   </div>
                   <div>
                      <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Motivo del Solicitante</p>
                      <p className="text-sm text-text-sec italic">"{selectedSol.motivo}"</p>
                   </div>
                </div>
                <div className="pt-3 border-t border-white/5 flex justify-between">
                   <span className="text-xs text-text-muted">Total Solicitado</span>
                   <span className="text-sm font-mono text-white font-bold">{selectedSol.cantidad_solicitada} pases</span>
                </div>
             </div>
           )}

           <div className="space-y-4">
              {/* ACCIÓN */}
              <div className="grid grid-cols-2 gap-2">
                 <button 
                  type="button"
                  onClick={() => setFormProc({...formProc, estado: 'aprobada'})}
                  className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all", formProc.estado === 'aprobada' ? 'bg-primary/10 border-primary text-primary' : 'bg-black/20 border-white/5 text-text-muted')}
                 >
                    <Check size={20} />
                    <span className="text-xs font-bold uppercase">Aprobar</span>
                 </button>
                 <button 
                  type="button"
                  onClick={() => setFormProc({...formProc, estado: 'denegada'})}
                  className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all", formProc.estado === 'denegada' ? 'bg-error/10 border-error text-error' : 'bg-black/20 border-white/5 text-text-muted')}
                 >
                    <XCircle size={20} />
                    <span className="text-xs font-bold uppercase">Denegar</span>
                 </button>
              </div>

              {formProc.estado === 'aprobada' ? (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                   <Input 
                      label="Cantidad Aprobada (Aprobación Parcial)" 
                      type="number"
                      max={selectedSol?.cantidad_solicitada}
                      min={1}
                      value={formProc.cantidad_aprobada}
                      onChange={e => setFormProc({...formProc, cantidad_aprobada: parseInt(e.target.value)})}
                      helperText={formProc.cantidad_aprobada < selectedSol?.cantidad_solicitada ? "Se registrará como 'Aprobada Parcial'" : "Se otorgará el total solicitado"}
                   />
                </div>
              ) : (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                   <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest pl-1">Motivo de Rechazo</label>
                   <textarea 
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm focus:ring-1 focus:ring-error outline-none min-h-[80px]"
                      placeholder="Indique la causa legal o de seguridad..."
                      value={formProc.motivo_rechazo}
                      onChange={e => setFormProc({...formProc, motivo_rechazo: e.target.value})}
                      required={formProc.estado === 'denegada'}
                   />
                </div>
              )}
           </div>

           <Boton 
             type="submit" 
             className={cn("w-full h-12 text-sm", formProc.estado === 'denegada' ? 'bg-error hover:bg-error-dark' : 'bg-primary hover:bg-primary-dark')}
             loading={procesando}
           >
              Finalizar Revisión
           </Boton>
        </form>
      </Modal>
    </div>
  );
}
