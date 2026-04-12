import React, { useState, useEffect } from 'react';
import { 
  Calendar, Plus, Download, Clock, 
  CheckCircle2, XCircle, AlertCircle, 
  FileText, ShieldAlert, BadgeCheck,
  ChevronRight, Share2, Printer
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
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
      toast.success('Protocolo FL-08 enviado a Comandancia');
      setShowModal(false);
      setForm({
         nombre_evento: '', fecha_evento: '',
         cantidad_solicitada: 0, motivo: '',
         entidad_id: user?.entidad_id
      });
      fetchSolicitudes();
    } catch (error) {
      toast.error('No se pudo procesar la solicitud táctica');
    }
  };

  const handleVerQrs = async (solicitud) => {
    try {
      const qrs = await eventosService.getQrsEvento(solicitud.id);
      setQrsEvento(qrs);
      setSelectedEvento(solicitud);
      setShowModalQrs(true);
    } catch (error) {
      toast.error('Fallo en la recuperación de tokens de acceso');
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
       case 'pendiente': return 'En Revisión (Mando)';
       case 'aprobada': return 'Autorización Total';
       case 'aprobada_parcial': return 'Autorización Parcial';
       case 'denegada': return 'Acceso Denegado';
       default: return 'Desconocido';
    }
  };

  return (
    <div className="min-h-screen bg-bg-app animate-in fade-in duration-500">
      <Header 
        titulo="Eventos y Protocolos" 
        subtitle={user?.entidad_nombre || 'AUTORIZACIONES MASIVAS'} 
      />

      <main className="max-w-[1400px] mx-auto px-6 py-8 pb-32">
        
        {/* Cabecera de Acciones Tácticas */}
        <section className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10 bg-bg-low/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
           <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-xl shadow-primary/5">
                 <Calendar size={28} />
              </div>
              <div>
                 <h2 className="text-lg font-black text-white uppercase tracking-tight italic leading-tight">Gestión de Solicitudes FL-08</h2>
                 <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em] mt-1 opacity-60">Control Masivo de Accesos Civiles</p>
              </div>
           </div>

           <Boton 
             onClick={() => setShowModal(true)}
             className="w-full md:w-auto h-14 px-8 bg-primary text-bg-app font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/10 hover:scale-105 active:scale-95 transition-all"
           >
              <Plus size={20} className="mr-2" />
              Nueva Solicitud masiva
           </Boton>
        </section>

        {/* Grid de Solicitudes Aegis v2 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {loading ? (
             Array(4).fill(0).map((_, i) => (
               <div key={i} className="h-64 rounded-3xl bg-white/5 animate-pulse border border-white/5" />
             ))
          ) : (
            <>
              {solicitudes.map(s => (
                <Card key={s.id} className="bg-bg-low/60 border-white/5 hover:border-white/10 transition-all group overflow-hidden">
                  <CardContent className="p-0">
                     {/* Header Card Táctico */}
                     <div className="p-6 flex items-start justify-between border-b border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-5">
                           <div className="h-16 w-16 rounded-2xl bg-bg-app border border-white/5 flex items-center justify-center text-text-muted group-hover:text-primary transition-colors">
                              <FileText size={32} />
                           </div>
                           <div>
                              <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest mb-2", getStatusStyles(s.estado))}>
                                 <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", s.estado === 'pendiente' ? 'bg-warning' : s.estado.includes('aprobada') ? 'bg-emerald-400' : 'bg-danger')} />
                                 {getStatusLabel(s.estado)}
                              </div>
                              <h3 className="text-xl font-black text-white uppercase tracking-tight italic leading-none">{s.nombre_evento}</h3>
                              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-2 flex items-center gap-1.5">
                                 <Calendar size={12} className="text-primary" /> {s.fecha_evento}
                              </p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] text-text-muted font-black uppercase tracking-widest opacity-40">Folio Aut.</p>
                           <p className="text-xs font-mono text-white opacity-60">#{s.id.slice(0, 8)}</p>
                        </div>
                     </div>
                     
                     {/* Body Card - Métricas de Pases */}
                     <div className="p-6 grid grid-cols-2 gap-6 bg-black/10">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                           <p className="text-[9px] text-text-muted uppercase font-black tracking-[0.2em] mb-1">Capacidad Solicitada</p>
                           <p className="text-2xl font-black italic font-display text-white leading-tight">{s.cantidad_solicitada} <span className="text-[10px] not-italic text-text-muted">PAX</span></p>
                        </div>
                        <div className={cn("p-4 rounded-2xl border transition-all", s.estado.includes('aprobada') ? 'bg-emerald-400/5 border-emerald-400/20' : 'bg-white/5 border-white/5')}>
                           <p className="text-[9px] text-text-muted uppercase font-black tracking-[0.2em] mb-1">Autorización Otorgada</p>
                           <p className={cn("text-2xl font-black italic font-display leading-tight", s.estado.includes('aprobada') ? 'text-emerald-400' : 'text-white opacity-40')}>
                             {s.cantidad_aprobada || 0} <span className="text-[10px] not-italic">PAX</span>
                           </p>
                        </div>
                     </div>

                     {/* Footer Card - Acciones Dinámicas */}
                     <div className="px-6 py-4 bg-bg-low/80 flex items-center justify-between border-t border-white/5">
                        <div className="flex items-center gap-3">
                           {s.estado === 'denegada' ? (
                              <div className="flex items-center gap-2 text-danger/60">
                                 <ShieldAlert size={14} />
                                 <span className="text-[10px] font-bold uppercase tracking-widest truncate max-w-[200px]">{s.motivo_rechazo || 'Solicitud Reincorporada'}</span>
                              </div>
                           ) : (
                              <div className="flex items-center gap-2 text-text-muted">
                                 <BadgeCheck size={14} className={s.estado.includes('aprobada') ? 'text-emerald-400' : 'text-white/20'} />
                                 <span className="text-[10px] font-bold uppercase tracking-widest">Protocolo de seguridad activo</span>
                              </div>
                           )}
                        </div>
                        
                        {s.estado.includes('aprobada') && (
                           <Boton 
                             onClick={() => handleVerQrs(s)}
                             className="h-10 px-6 bg-primary text-bg-app font-black uppercase tracking-widest text-[9px] shadow-lg shadow-primary/10"
                           >
                              Generar Terminal de Pases
                              <ChevronRight size={14} className="ml-1" />
                           </Boton>
                        )}
                     </div>
                  </CardContent>
                </Card>
              ))}

              {solicitudes.length === 0 && (
                <div className="col-span-full py-32 text-center border border-dashed border-white/10 rounded-3xl bg-bg-low/20 backdrop-blur-sm">
                  <Calendar size={64} className="mx-auto text-white/5 mb-6" />
                  <p className="text-text-muted text-[11px] font-black uppercase tracking-[0.3em]">No se registran solicitudes de eventos para esta concesión</p>
                  <Boton variant="ghost" className="mt-6 text-primary tracking-widest text-[10px]" onClick={() => setShowModal(true)}>INICIAR PRIMER REGISTRO FL-08</Boton>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* --- MODALES --- */}

      {/* Modal Solicitud */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nueva Solicitud FL-08">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Input 
              label="Denominación del Evento" 
              placeholder="Ej: ACTIVIDAD CORPORATIVA NIVEL 1"
              value={form.nombre_evento}
              onChange={e => setForm({...form, nombre_evento: e.target.value.toUpperCase()})}
              required
              className="h-14 bg-bg-app border-white/10"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Fecha Programada" type="date"
                value={form.fecha_evento}
                onChange={e => setForm({...form, fecha_evento: e.target.value})}
                required
                className="h-14 bg-bg-app border-white/10"
              />
              <Input 
                label="Pases Solicitados" type="number"
                placeholder="0"
                value={form.cantidad_solicitada}
                onChange={e => setForm({...form, cantidad_solicitada: parseInt(e.target.value)})}
                required
                className="h-14 bg-bg-app border-white/10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-text-muted tracking-[0.2em] pl-1 opacity-60">Justificación Operacional</label>
              <textarea 
                 className="w-full bg-bg-app border border-white/10 rounded-2xl p-4 text-white text-sm focus:ring-1 focus:ring-primary outline-none min-h-[120px] transition-all"
                 placeholder="Describa el propósito de la entrada masiva..."
                 value={form.motivo}
                 onChange={e => setForm({...form, motivo: e.target.value.toUpperCase()})}
                 required
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
             <Boton type="button" variant="ghost" className="flex-1 h-14" onClick={() => setShowModal(false)}>Abortar</Boton>
             <Boton type="submit" className="flex-[2] bg-primary text-bg-app font-black uppercase tracking-widest h-14 shadow-2xl shadow-primary/10">
                Enviar Protocolo a Revisión
             </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal Ver Qrs */}
      <Modal isOpen={showModalQrs} onClose={() => setShowModalQrs(false)} title="Recubrimiento de Pases de Acceso" size="lg">
        <div className="space-y-8">
           <div className="flex items-center justify-between bg-bg-app p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <ShieldAlert size={120} />
              </div>
              <div className="relative z-10">
                 <h4 className="text-xl font-black text-white italic uppercase tracking-tight leading-none mb-2">{selectedEvento?.nombre_evento}</h4>
                 <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest border border-primary/20 px-2 py-0.5 rounded-md">AUTORIZADO</span>
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{qrsEvento.length} TOKENS GENERADOS</span>
                 </div>
              </div>
              <div className="flex gap-2 relative z-10">
                 <Boton onClick={() => window.print()} variant="ghost" className="h-12 w-12 p-0 border-white/10 hover:text-primary">
                    <Printer size={20} />
                 </Boton>
                 <Boton variant="ghost" className="h-12 w-12 p-0 border-white/10 hover:text-primary">
                    <Share2 size={20} />
                 </Boton>
              </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[50vh] overflow-y-auto pr-3 custom-scrollbar">
              {qrsEvento.map((qr, idx) => (
                 <div key={qr.id} className="bg-white p-6 rounded-[2rem] flex flex-col items-center gap-4 border-2 border-primary/20 shadow-xl shadow-primary/5 hover:scale-105 transition-transform">
                    <div className="p-2 border border-black/5 rounded-2xl bg-white shadow-inner">
                       <QRCode value={qr.token} size={160} fgColor="#000000" bgColor="#FFFFFF" />
                    </div>
                    <div className="text-center w-full">
                       <p className="text-[8px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-1">PROTOCOLO FL-08 // PASE #{idx+1}</p>
                       <p className="text-[11px] text-black font-black leading-tight uppercase truncate">
                          {selectedEvento?.nombre_evento}
                       </p>
                    </div>
                 </div>
              ))}
           </div>

           <div className="p-5 bg-primary/5 rounded-2xl border border-primary/20 flex gap-4">
              <div className="h-10 w-10 min-w-[40px] rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                 <AlertCircle size={20} />
              </div>
              <p className="text-[10px] text-primary/80 font-bold uppercase leading-relaxed tracking-wide">
                 ADVERTENCIA: Estos tokens son de un solo uso y caducan automáticamente al finalizar el evento programado. La distribución de estos pases es responsabilidad exclusiva de la entidad civil.
              </p>
           </div>
        </div>
      </Modal>
    </div>
  );
}
