import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Download, Clock, CheckCircle2, XCircle, AlertCircle, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
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
      toast.error('Error al cargar eventos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await eventosService.crearSolicitud(form);
      toast.success('Solicitud enviada al mando');
      setShowModal(false);
      setForm({
         nombre_evento: '',
         fecha_evento: '',
         cantidad_solicitada: 0,
         motivo: '',
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
      toast.error('No se pudieron obtener los pases');
    }
  };

  const getStatusColor = (status) => {
     switch(status) {
        case 'pendiente': return 'text-warning bg-warning/5 border-warning/20';
        case 'aprobada': 
        case 'aprobada_parcial': return 'text-success bg-success/5 border-success/20';
        case 'denegada': return 'text-error bg-error/5 border-error/20';
        default: return 'text-text-muted';
     }
  };

  const getStatusIcon = (status) => {
    switch(status) {
       case 'pendiente': return <Clock size={14} />;
       case 'aprobada': 
       case 'aprobada_parcial': return <CheckCircle2 size={14} />;
       case 'denegada': return <XCircle size={14} />;
       default: return <AlertCircle size={14} />;
    }
 };

  return (
    <div className="p-4 space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="text-primary" />
            Mis Eventos
          </h1>
          <p className="text-text-muted text-sm">Pases Masivos y Actividades</p>
        </div>
        <Boton variant="primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
        </Boton>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {solicitudes.map(s => (
          <Card key={s.id} className="bg-bg-low border-white/5 overflow-hidden">
            <CardContent className="p-0">
               <div className="p-4 flex items-center justify-between border-b border-white/5 bg-white/5">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Calendar size={20} />
                     </div>
                     <div>
                        <p className="font-bold text-white">{s.nombre_evento}</p>
                        <p className="text-[10px] text-text-muted uppercase tracking-wider">{s.fecha_evento}</p>
                     </div>
                  </div>
                  <div className={cn("px-2 py-1 rounded-full border text-[10px] font-bold uppercase flex items-center gap-1.5", getStatusColor(s.estado))}>
                     {getStatusIcon(s.estado)}
                     {s.estado.replace('_', ' ')}
                  </div>
               </div>
               
               <div className="p-4 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Solicitados</p>
                     <p className="text-lg font-mono text-white">{s.cantidad_solicitada}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Aprobados</p>
                     <p className="text-lg font-mono text-primary">{s.cantidad_aprobada || 0}</p>
                  </div>
               </div>

               {s.estado !== 'pendiente' && (
                  <div className="px-4 py-3 bg-black/20 flex items-center justify-between">
                     <p className="text-xs text-text-muted flex items-center gap-1.5">
                        <FileText size={14} />
                        {s.estado === 'denegada' ? (s.motivo_rechazo || 'Sin motivo especificado') : 'Pases generados'}
                     </p>
                     {s.estado.includes('aprobada') && (
                        <Boton size="sm" variant="ghost" className="text-primary hover:bg-primary/10" onClick={() => handleVerQrs(s)}>
                           Ver Pases
                        </Boton>
                     )}
                  </div>
               )}
            </CardContent>
          </Card>
        ))}

        {solicitudes.length === 0 && !loading && (
          <div className="text-center py-20 bg-bg-low rounded-3xl border border-white/5 border-dashed">
            <Clock size={48} className="mx-auto text-text-muted mb-4 opacity-20" />
            <p className="text-white font-medium">No hay solicitudes registradas</p>
            <p className="text-sm text-text-muted">Inicia una nueva solicitud para eventos masivos.</p>
          </div>
        )}
      </div>

      {/* MODAL SOLICITUD */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Solicitar Pases Masivos">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Nombre del Evento" 
            placeholder="Ej: Convivencia Civil-Militar X"
            value={form.nombre_evento}
            onChange={e => setForm({...form, nombre_evento: e.target.value})}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <Input 
              label="Fecha del Evento" 
              type="date"
              value={form.fecha_evento}
              onChange={e => setForm({...form, fecha_evento: e.target.value})}
              required
            />
            <Input 
              label="Cantidad de Pases" 
              type="number"
              placeholder="0"
              value={form.cantidad_solicitada}
              onChange={e => setForm({...form, cantidad_solicitada: parseInt(e.target.value)})}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest pl-1">Motivo / Justificación</label>
            <textarea 
               className="w-full bg-bg-low border border-white/10 rounded-xl p-3 text-white text-sm focus:ring-1 focus:ring-primary outline-none min-h-[100px]"
               placeholder="Describa brevemente la actividad..."
               value={form.motivo}
               onChange={e => setForm({...form, motivo: e.target.value})}
               required
            />
          </div>
          <Boton type="submit" className="w-full">Enviar Solicitud</Boton>
        </form>
      </Modal>

      {/* MODAL VER QRS */}
      <Modal isOpen={showModalQrs} onClose={() => setShowModalQrs(false)} title="Pases de Evento Generados" size="lg">
        <div className="space-y-6">
           <div className="flex items-center justify-between bg-primary/5 p-4 rounded-xl border border-primary/10">
              <div>
                 <p className="text-white font-bold">{selectedEvento?.nombre_evento}</p>
                 <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Aprobados: {qrsEvento.length}</p>
              </div>
              <Boton size="sm" onClick={() => window.print()} variant="ghost" className="text-text-muted">
                 <Download size={16} />
              </Boton>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {qrsEvento.map((qr, idx) => (
                 <div key={qr.id} className="bg-white p-4 rounded-3xl flex flex-col items-center gap-2 border border-white/10">
                    <QRCode value={qr.token} size={140} fgColor="#000000" bgColor="#FFFFFF" />
                    <div className="text-center">
                       <p className="text-[8px] text-gray-400 font-bold uppercase">Token Permanente - Pase #{idx+1}</p>
                       <p className="text-[10px] text-black font-black leading-tight truncate w-[140px]">
                          {selectedEvento?.nombre_evento}
                       </p>
                    </div>
                 </div>
              ))}
           </div>

           <div className="p-4 bg-bg-app rounded-xl border border-white/5 space-y-2">
              <p className="text-[10px] text-text-muted uppercase font-bold">Instrucciones</p>
              <p className="text-xs text-text-sec">
                 Estos pases son genéricos y solo válidos para la fecha del evento. Puede descargarlos o imprimirlos para distribuirlos entre los invitados.
              </p>
           </div>
        </div>
      </Modal>
    </div>
  );
}
