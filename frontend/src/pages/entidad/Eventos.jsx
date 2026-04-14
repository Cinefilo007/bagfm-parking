import React, { useState, useEffect } from 'react';
import { 
  Calendar, Plus, Download, Clock, 
  CheckCircle2, XCircle, AlertCircle, 
  FileText, ShieldAlert, BadgeCheck,
  ChevronRight, Share2, Printer
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Boton } from '../../components/ui/Boton';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { eventosService } from '../../services/eventos.service';
import { useAuthStore } from '../../store/auth.store';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import QRCode from 'react-qr-code';

export default function Eventos() {
  const { user } = useAuthStore();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showModalQrs, setShowModalQrs] = useState(false);
  const [qrsEvento, setQrsEvento] = useState([]);
  const [selectedEvento, setSelectedEvento] = useState(null);

  const [form, setForm] = useState({
    nombre_evento: '',
    fecha_evento: '',
    cantidad_solicitada: 0,
    motivo: '',
    entidad_id: user?.entidad_id
  });

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const fetchSolicitudes = async () => {
    try {
      const data = await eventosService.getSolicitudes();
      setSolicitudes(data);
    } catch (error) {
      toast.error('Fallo de sincronización con el servidor de eventos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await eventosService.crearSolicitud(form);
      toast.success('Protocolo enviado a Mando');
      setShowModal(false);
      setForm({
         nombre_evento: '', fecha_evento: '',
         cantidad_solicitada: 0, motivo: '',
         entidad_id: user?.entidad_id
      });
      fetchSolicitudes();
    } catch (error) {
      toast.error('No se pudo procesar la solicitud');
    }
  };

  const handleVerQrs = async (solicitud) => {
    try {
      const qrs = await eventosService.getQrsEvento(solicitud.id);
      setQrsEvento(qrs);
      setSelectedEvento(solicitud);
      setShowModalQrs(true);
    } catch (error) {
      toast.error('Fallo en la recuperación de tokens');
    }
  };

  const getStatusStyles = (status) => {
     switch(status) {
        case 'pendiente': return 'text-warning bg-warning/10 border-warning/20';
        case 'aprobada': 
        case 'aprobada_parcial': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
        case 'denegada': return 'text-danger bg-danger/10 border-danger/20';
        default: return 'text-text-muted bg-white/5 border-white/5';
     }
  };

  const getStatusLabel = (status) => {
    switch(status) {
       case 'pendiente': return 'En Revisión';
       case 'aprobada': return 'Autorización Total';
       case 'aprobada_parcial': return 'Autorización Parcial';
       case 'denegada': return 'Denegada';
       default: return 'Desconocido';
    }
  };

  return (
    <div className="p-4 space-y-8 pb-24 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* Cabecera Táctica v2: Eventos y Protocolos */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-bg-card/30 p-4 rounded-3xl border border-white/5">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-text-main flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-primary/10 rounded-xl">
                <Calendar className="text-primary shrink-0" size={24} />
            </div>
            <span className="truncate uppercase">Protocolos de Acceso</span>
          </h1>
          <p className="text-text-muted text-sm mt-1 flex items-center gap-1.5 px-1 font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            {user?.entidad_nombre || 'ADMINISTRACIÓN'} // {solicitudes.length} SOLICITUDES
          </p>
        </div>
        <Boton 
          size="lg" 
          onClick={() => setShowModal(true)}
          className="gap-2 h-12 px-8 w-full sm:w-fit shrink-0 bg-primary text-bg-app font-black uppercase tracking-widest text-[11px] shadow-tactica hover:scale-[1.02] transition-transform"
        >
          <Plus size={20} />
          <span>Nueva Solicitud FL-08</span>
        </Boton>
      </header>

      <main className="space-y-6">
        {/* Grid de Solicitudes Aegis v2 */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {loading ? (
             Array(4).fill(0).map((_, i) => (
               <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
             ))
          ) : (
            <>
              {solicitudes.map(s => (
                <Card key={s.id} className="bg-bg-card border-white/5 hover:border-white/10 transition-all group overflow-hidden relative">
                  <CardContent className="p-0">
                     <div className="p-5 flex items-start justify-between border-b border-white/5 bg-white/[0.01]">
                        <div className="flex items-center gap-4">
                           <div className="h-14 w-14 rounded-xl bg-bg-app border border-white/5 flex items-center justify-center text-text-muted transition-colors group-hover:text-primary shrink-0">
                              <FileText size={28} />
                           </div>
                           <div className="min-w-0">
                              <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest mb-1.5", getStatusStyles(s.estado))}>
                                 <div className={cn("w-1 h-1 rounded-full animate-pulse", s.estado === 'pendiente' ? 'bg-warning' : s.estado.includes('aprobada') ? 'bg-emerald-400' : 'bg-danger')} />
                                 {getStatusLabel(s.estado)}
                              </div>
                              <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic leading-tight truncate">{s.nombre_evento}</h3>
                              <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5 opacity-70">
                                 <Calendar size={10} className="text-primary" /> {s.fecha_evento}
                              </p>
                           </div>
                        </div>
                        <div className="text-right shrink-0">
                           <p className="text-[9px] text-text-muted font-black uppercase tracking-widest opacity-40">Folio</p>
                           <p className="text-[10px] font-mono text-text-main opacity-60">#{s.id.slice(0, 8)}</p>
                        </div>
                     </div>
                     
                     <div className="p-5 grid grid-cols-2 gap-4 bg-black/10">
                        <div className="bg-bg-app/40 p-3 rounded-xl border border-white/5">
                           <p className="text-[8px] text-text-muted uppercase font-black tracking-widest mb-1 opacity-60">Cupos Solicitados</p>
                           <p className="text-xl font-black italic text-text-main leading-tight">{s.cantidad_solicitada} <span className="text-[9px] not-italic text-text-muted">PAX</span></p>
                        </div>
                        <div className={cn("p-3 rounded-xl border transition-all", s.estado.includes('aprobada') ? 'bg-emerald-400/5 border-emerald-400/20' : 'bg-bg-app/20 border-white/5')}>
                           <p className="text-[8px] text-text-muted uppercase font-black tracking-widest mb-1 opacity-60">Cupos Autorizados</p>
                           <p className={cn("text-xl font-black italic leading-tight", s.estado.includes('aprobada') ? 'text-emerald-400' : 'text-text-main opacity-20')}>
                             {s.cantidad_aprobada || 0} <span className="text-[9px] not-italic">PAX</span>
                           </p>
                        </div>
                     </div>

                     <div className="px-5 py-3 bg-bg-card/40 flex items-center justify-between border-t border-white/5">
                        <div className="flex items-center gap-3">
                           {s.estado === 'denegada' ? (
                              <div className="flex items-center gap-1.5 text-danger/60">
                                 <ShieldAlert size={14} />
                                 <span className="text-[9px] font-black uppercase tracking-widest truncate max-w-[150px]">{s.motivo_rechazo || 'RECHAZADO'}</span>
                              </div>
                           ) : (
                              <div className="flex items-center gap-1.5 text-text-muted font-black">
                                 <BadgeCheck size={14} className={s.estado.includes('aprobada') ? 'text-emerald-400' : 'text-white/20'} />
                                 <span className="text-[9px] uppercase tracking-widest opacity-60">PROTOCOL-SYS-08</span>
                              </div>
                           )}
                        </div>
                        
                        {s.estado.includes('aprobada') && (
                           <button 
                             onClick={() => handleVerQrs(s)}
                             className="h-8 px-4 bg-primary text-bg-app font-black uppercase tracking-widest text-[9px] rounded-lg shadow-tactica hover:scale-[1.05] transition-all flex items-center gap-1"
                           >
                              <span>Generar Pases</span>
                              <ChevronRight size={12} />
                           </button>
                        )}
                     </div>
                  </CardContent>
                </Card>
              ))}

              {solicitudes.length === 0 && (
                <div className="col-span-full py-24 text-center border border-dashed border-white/10 rounded-[32px] bg-bg-card/20 backdrop-blur-sm">
                   <Calendar size={56} className="mx-auto text-white/5 mb-6 opacity-20" />
                   <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Sin bitácora de eventos registrados</p>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* MODALES ESTANDARIZADOS */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="NUEVO PROTOCOLO FL-08">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Input 
              label="Denominación del Evento" required placeholder="EJ: CUMPLEAÑOS / REUNIÓN"
              value={form.nombre_evento}
              onChange={e => setForm({...form, nombre_evento: e.target.value.toUpperCase()})}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Fecha Programada" type="date" required
                value={form.fecha_evento}
                onChange={e => setForm({...form, fecha_evento: e.target.value})}
              />
              <Input 
                label="Pases de Acceso" type="number" required placeholder="0"
                value={form.cantidad_solicitada}
                onChange={e => setForm({...form, cantidad_solicitada: parseInt(e.target.value)})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-text-muted tracking-[0.2em] px-1 opacity-60 italic">Motivación del Protocolo</label>
              <textarea 
                 className="w-full bg-bg-card border border-white/10 rounded-xl p-4 text-text-main text-sm font-bold focus:ring-1 focus:ring-primary outline-none min-h-[120px] transition-all"
                 placeholder="DESCRIBA LA FINALIDAD DE LA SOLICITUD..."
                 value={form.motivo}
                 onChange={e => setForm({...form, motivo: e.target.value.toUpperCase()})}
                 required
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-white/5">
             <Boton type="button" variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Boton>
             <Boton type="submit" className="flex-[2] bg-primary text-bg-app font-black uppercase tracking-widest h-14 shadow-tactica">
                Enviar a Mando
             </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal Ver Qrs */}
      <Modal isOpen={showModalQrs} onClose={() => setShowModalQrs(false)} title="Pases de Acceso Autorizados" size="lg">
        <div className="space-y-6">
           <div className="p-5 bg-bg-app border border-white/5 rounded-2xl flex items-center justify-between">
              <div className="min-w-0">
                 <h4 className="text-lg font-black text-text-main italic uppercase truncate leading-tight mb-1">{selectedEvento?.nombre_evento}</h4>
                 <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest border border-primary/20 px-2 py-0.5 rounded-md">STATUS: EMITIDO</span>
                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">{qrsEvento.length} TOKENS VÁLIDOS</span>
                 </div>
              </div>
              <div className="flex gap-2 shrink-0">
                 <button onClick={() => window.print()} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-text-muted hover:text-primary transition-all">
                    <Printer size={18} />
                 </button>
              </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {qrsEvento.map((qr, idx) => (
                 <div key={qr.id} className="bg-white p-5 rounded-[2rem] flex flex-col items-center gap-3 border-2 border-primary/10 shadow-lg hover:scale-[1.02] transition-transform">
                    <div className="p-1.5 border border-black/5 rounded-2xl bg-white">
                       <QRCode value={qr.token} size={140} />
                    </div>
                    <div className="text-center w-full min-w-0">
                       <p className="text-[7px] text-gray-400 font-black uppercase tracking-widest mb-1 truncate">PASE #{idx+1} // FL-08</p>
                       <p className="text-[12px] text-black font-black leading-tight uppercase truncate">{selectedEvento?.nombre_evento}</p>
                    </div>
                 </div>
              ))}
           </div>

           <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 flex gap-3">
              <AlertCircle size={18} className="text-primary shrink-0" />
              <p className="text-[9px] text-primary/80 font-black uppercase leading-relaxed tracking-wider">
                 CADUCIDAD AUTOMÁTICA AL FINALIZAR EL EVENTO. TOKENS DE UN SOLO USO.
              </p>
           </div>
        </div>
      </Modal>
    </div>
  );
}
