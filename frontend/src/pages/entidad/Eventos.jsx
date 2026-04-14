import React, { useState, useEffect } from 'react';
import { 
  Calendar, Plus, Download, Clock, 
  CheckCircle2, XCircle, AlertCircle, 
  FileText, ShieldAlert, BadgeCheck,
  ChevronRight, Share2, Printer,
  Ticket, UserCheck, ExternalLink,
  Layers, PackageOpen, LayoutGrid
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Boton } from '../../components/ui/Boton';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { eventosService } from '../../services/eventos.service';
import { pasesService } from '../../services/pasesService';
import { useAuthStore } from '../../store/auth.store';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import LoteCard from '../../components/eventos/LoteCard';

export default function Eventos() {
  const { user } = useAuthStore();
  const [solicitudes, setSolicitudes] = useState([]);
  const [lotes, setLotes] = useState([]); // Lotes vinculados a las solicitudes aprovadas
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSol, setSelectedSol] = useState(null);

  const [form, setForm] = useState({
    nombre_evento: '',
    fecha_evento: '',
    cantidad_solicitada: 10,
    motivo: '',
    tipo_pase: 'simple',
    entidad_id: user?.entidad_id
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sData, lData] = await Promise.all([
        eventosService.getSolicitudes(),
        pasesService.listarLotes() // Obtener lotes para el contexto (filtrado en frontend o backend)
      ]);
      setSolicitudes(sData);
      setLotes(lData);
    } catch (error) {
      toast.error('Fallo de sincronización táctica');
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
         cantidad_solicitada: 10, motivo: '',
         tipo_pase: 'simple',
         entidad_id: user?.entidad_id
      });
      fetchData();
    } catch (error) {
      toast.error('No se pudo procesar la solicitud');
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

  const tipoOpciones = [
    { id: 'simple', label: 'Pase Simple', icon: Ticket, color: 'text-primary' },
    { id: 'identificado', label: 'Identificado', icon: UserCheck, color: 'text-success' },
    { id: 'portal', label: 'Auto-Registro', icon: ExternalLink, color: 'text-warning' }
  ];

  return (
    <div className="p-4 space-y-8 pb-32 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* Cabecera Táctica v2 */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-bg-card/30 p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
        
        <div className="min-w-0 relative z-10">
          <h1 className="text-3xl font-black text-text-main flex items-center gap-4 tracking-tighter">
            <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                <Calendar className="text-primary shrink-0" size={28} />
            </div>
            <span className="uppercase italic">Eventos Institucionales</span>
          </h1>
          <p className="text-text-muted text-sm mt-2 flex items-center gap-2 px-1 font-bold">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            {user?.entidad_nombre || 'ADMINISTRACIÓN'} // GESTIÓN FL-08
          </p>
        </div>
        
        <Boton 
          size="lg" 
          onClick={() => setShowModal(true)}
          className="gap-3 h-14 px-10 w-full sm:w-fit shrink-0 bg-primary text-bg-app font-black uppercase tracking-widest text-xs shadow-tactica hover:scale-[1.02] transition-transform relative z-10"
        >
          <Plus size={22} />
          <span>Nueva Solicitud</span>
        </Boton>
      </header>

      <main className="space-y-12">
        {/* Sección 1: Solicitudes en Tránsito */}
        <section className="space-y-6">
           <div className="flex items-center justify-between px-2">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted flex items-center gap-2">
                 <Clock size={14} className="text-warning" />
                 Estado de Protocolos
              </h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {solicitudes.filter(s => s.estado === 'pendiente').map(s => (
                 <Card key={s.id} className="bg-bg-card/40 border-white/5 border-l-4 border-l-warning overflow-hidden">
                    <CardContent className="p-5 flex items-center justify-between gap-4">
                       <div className="space-y-1 min-w-0 flex-1">
                          <p className="text-lg font-black text-text-main truncate">{s.nombre_evento}</p>
                          <div className="flex items-center gap-3 text-[10px] text-text-muted uppercase font-bold">
                             <span className="flex items-center gap-1"><Calendar size={12} /> {s.fecha_evento}</span>
                             <span className="flex items-center gap-1"><Users size={12} /> {s.cantidad_solicitada} PAX</span>
                          </div>
                       </div>
                       <div className="px-3 py-1.5 bg-warning/10 rounded-lg border border-warning/20">
                          <p className="text-[10px] font-black text-warning uppercase">Pendiente</p>
                       </div>
                    </CardContent>
                 </Card>
              ))}

              {solicitudes.filter(s => s.estado === 'pendiente').length === 0 && (
                 <div className="col-span-full py-12 text-center border border-dashed border-white/5 rounded-3xl opacity-30">
                    <p className="text-[10px] font-black uppercase tracking-widest">Sin solicitudes pendientes</p>
                 </div>
              )}
           </div>
        </section>

        {/* Sección 2: Lotes y Pases Generados */}
        <section className="space-y-6">
           <div className="flex items-center justify-between px-2">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted flex items-center gap-2">
                 <LayoutGrid size={14} className="text-primary" />
                 Credenciales Autorizadas
              </h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lotes.map(lote => (
                 <LoteCard key={lote.id} lote={lote} onRefresh={fetchData} />
              ))}

              {lotes.length === 0 && !loading && (
                 <div className="col-span-full py-24 flex flex-col items-center gap-6 bg-bg-card/20 rounded-[3rem] border border-dashed border-white/10">
                    <PackageOpen className="text-text-muted opacity-20" size={64} />
                    <div className="text-center space-y-2">
                       <p className="text-text-main font-black uppercase tracking-widest text-lg">Historial de Pases Vacío</p>
                       <p className="text-text-muted text-sm max-w-xs mx-auto">Una vez que sus solicitudes sean aprobadas, podrá gestionar los pases y descargar los QRs aquí.</p>
                    </div>
                 </div>
              )}
           </div>
        </section>
      </main>

      {/* Modal Nueva Solicitud */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="NUEVO PROTOCOLO FL-08">
        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          
          <div className="grid grid-cols-1 gap-3">
             <label className="text-[10px] uppercase font-black text-text-muted tracking-widest px-1 opacity-60">Modalidad de Pases</label>
             <div className="grid grid-cols-3 gap-2">
                {tipoOpciones.map(opt => {
                   const Icon = opt.icon;
                   const selected = form.tipo_pase === opt.id;
                   return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setForm({...form, tipo_pase: opt.id})}
                        className={cn(
                           "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all text-center",
                           selected ? `bg-primary/5 border-primary ${opt.color}` : "bg-black/20 border-white/5 text-text-muted hover:border-white/10"
                        )}
                      >
                         <Icon size={20} />
                         <span className="text-[8px] font-black uppercase tracking-tighter leading-none">{opt.label}</span>
                      </button>
                   );
                })}
             </div>
          </div>

          <div className="space-y-4 bg-bg-app/30 p-4 rounded-[2rem] border border-white/5">
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
                label="Cantidad de Pases" type="number" required placeholder="0"
                value={form.cantidad_solicitada}
                onChange={e => setForm({...form, cantidad_solicitada: parseInt(e.target.value)})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-text-muted tracking-widest px-1 opacity-60">Justificación</label>
              <textarea 
                 className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-text-main text-sm font-bold focus:ring-1 focus:ring-primary outline-none min-h-[100px] transition-all"
                 placeholder="DESCRIBA LA FINALIDAD DE LA SOLICITUD..."
                 value={form.motivo}
                 onChange={e => setForm({...form, motivo: e.target.value.toUpperCase()})}
                 required
              />
            </div>
          </div>

          <Boton type="submit" className="w-full bg-primary text-bg-app font-black uppercase tracking-[0.2em] h-16 shadow-tactica text-xs rounded-2xl">
              ENVIAR SOLICITUD A MANDO
          </Boton>
        </form>
      </Modal>
    </div>
  );
}

const Users = ({ size, className }) => (
   <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M23 7a4 4 0 0 0-3-3.87"/></svg>
);
