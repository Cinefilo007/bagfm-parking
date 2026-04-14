import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Boton } from '../components/ui/Boton';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { 
  UserCircle, Plus, ShieldCheck, 
  ShieldAlert, UserCog, Hash, Mail, 
  Phone, Building2, ChevronRight,
  Power, RotateCcw, UserMinus,
  Activity, BadgeCheck, Zap
} from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';

export default function Personal() {
  const { user: userActual } = useAuthStore();
  const [personal, setPersonal] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [nuevoMiembro, setNuevoMiembro] = useState({
    cedula: '', nombre: '', apellido: '', email: '', 
    telefono: '', rol: '', entidad_id: null, password: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const resPersonal = await api.get('/personal/lista');
      setPersonal(resPersonal.data);

      if (userActual.rol === 'COMANDANTE' || userActual.rol === 'ADMIN_BASE') {
        try {
          const resEntidades = await api.get('/entidades');
          setEntidades(resEntidades.data);
        } catch (entErr) {
          console.error("Error cargando entidades:", entErr);
        }
      }
    } catch (err) {
      toast.error('Error sincronizando fuerza de tareas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCrearPersonal = async (e) => {
    e.preventDefault();
    try {
      await api.post('/personal/', {
        ...nuevoMiembro,
        password: nuevoMiembro.cedula
      });
      setIsModalOpen(false);
      setNuevoMiembro({
        cedula: '', nombre: '', apellido: '', email: '', 
        telefono: '', rol: '', entidad_id: null, password: ''
      });
      fetchData();
      toast.success('Alta de personal completada');
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error en protocolo de alta");
    }
  };

  const handleToggleActivo = async (id) => {
    try {
      await api.post(`/personal/${id}/toggle`);
      fetchData();
      toast.success('Estado actualizado');
    } catch (err) {
      toast.error("Error al cambiar privilegios");
    }
  };

  const handleEliminar = async (id, nombre) => {
    if (!window.confirm(`¿Confirma la baja definitiva de ${nombre}?`)) return;
    try {
      await api.delete(`/personal/${id}`);
      fetchData();
      toast.success('Baja procesada');
    } catch (err) {
      toast.error("Error en proceso de baja");
    }
  };

  const getRolStyles = (rol) => {
    switch (rol) {
      case 'ADMIN_BASE': return 'text-primary bg-primary/10 border-primary/20';
      case 'SUPERVISOR': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'PARQUERO': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'ALCABALA': return 'text-sky-400 bg-sky-400/10 border-sky-400/20';
      case 'ADMIN_ENTIDAD': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      default: return 'text-text-muted bg-white/5 border-white/5';
    }
  };

  const renderRolesDisponibles = () => {
    if (userActual.rol === 'COMANDANTE' || userActual.rol === 'ADMIN_BASE') {
      return (
        <>
          <option value="ADMIN_BASE">ADMINISTRADOR DE BASE</option>
          <option value="SUPERVISOR">SUPERVISOR DE GUARDIA</option>
          <option value="PARQUERO">PERSONA DE ACCESO (PARQUERO)</option>
          <option value="ALCABALA">OPERADOR DE ALCABALA</option>
          <option value="ADMIN_ENTIDAD">ADMINISTRADOR DE ENTIDAD</option>
        </>
      );
    }
    return <option value="PARQUERO">OPERADOR AUXILIAR (PARQUERO)</option>;
  };

  return (
    <div className="p-4 space-y-8 pb-24 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* Cabecera Táctica v2: Mando de Personal */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-bg-card/30 p-4 rounded-3xl border border-white/5">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-text-main flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-primary/10 rounded-xl">
                <UserCog className="text-primary shrink-0" size={24} />
            </div>
            <span className="truncate uppercase">Fuerza de Tareas</span>
          </h1>
          <p className="text-text-muted text-sm mt-1 flex items-center gap-1.5 px-1 font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Control de Personal Operativo ({personal.length} Activos)
          </p>
        </div>
        <Boton 
          size="lg" 
          onClick={() => setIsModalOpen(true)}
          className="gap-2 h-12 px-8 w-full sm:w-fit shrink-0 whitespace-nowrap shadow-tactica hover:scale-[1.02] transition-transform font-black uppercase tracking-widest text-[11px]"
        >
          <Plus size={20} />
          <span>Añadir Operativo</span>
        </Boton>
      </header>

      <main className="space-y-6">
        {/* Grid de Personal Aegis v2 */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {loading ? (
             Array(4).fill(0).map((_, i) => (
               <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
             ))
          ) : (
            <>
              {personal.map(miembro => (
                <Card key={miembro.id} className="bg-bg-card border-white/5 hover:border-white/10 transition-all group overflow-hidden relative">
                  <div className={cn("absolute left-0 top-0 h-full w-1 transition-all", miembro.activo ? getRolStyles(miembro.rol).split(' ')[0].replace('text-', 'bg-') : 'bg-danger')} />
                  
                  <CardContent className="p-5 flex items-center justify-between">
                     <div className="flex items-center gap-5 min-w-0">
                        <div className={cn("h-14 w-14 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-105 shrink-0", miembro.activo ? getRolStyles(miembro.rol) : 'bg-danger/10 border-danger/20 text-danger')}>
                           <UserCircle size={28} />
                        </div>
                        <div className="min-w-0">
                           <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest mb-1.5", miembro.activo ? getRolStyles(miembro.rol) : 'text-danger bg-danger/10 border-danger/20')}>
                              {miembro.rol.replace('_', ' ')}
                           </div>
                           <h4 className="text-lg font-black text-text-main uppercase tracking-tight italic leading-tight truncate">
                             {miembro.nombre} {miembro.apellido}
                           </h4>
                           <div className="flex flex-wrap items-center gap-3 mt-2">
                              <p className="text-[9px] text-text-muted font-black uppercase tracking-widest opacity-70 flex items-center gap-1.5">
                                 <Hash size={10} className="text-primary" /> {miembro.cedula}
                              </p>
                              {miembro.entidad_nombre && (
                                <p className="text-[9px] text-primary font-black uppercase tracking-widest flex items-center gap-1.5">
                                   <Building2 size={10} /> {miembro.entidad_nombre}
                                </p>
                              )}
                              <p className="text-[9px] text-text-muted font-bold opacity-70 flex items-center gap-1.5 uppercase tracking-wide">
                                 <Phone size={10} /> {miembro.telefono || 'SIN TEL REG.'}
                              </p>
                           </div>
                        </div>
                     </div>

                     <div className="flex items-center gap-2 shrink-0 ml-4">
                        {/* Acciones de Mando */}
                        {(userActual.rol === 'COMANDANTE' || userActual.rol === 'ADMIN_BASE') && (
                          <div className="flex items-center gap-1.5 bg-black/20 p-1 rounded-xl border border-white/5">
                            <button 
                              onClick={() => handleToggleActivo(miembro.id)}
                              className={cn("p-2.5 rounded-lg transition-all", miembro.activo ? 'text-amber-500 hover:bg-amber-500/10' : 'text-emerald-500 hover:bg-emerald-500/10')}
                              title={miembro.activo ? "Pausar Acceso" : "Reactivar Acceso"}
                            >
                              {miembro.activo ? <Power size={18} /> : <RotateCcw size={18} />}
                            </button>
                            
                            {userActual.rol === 'COMANDANTE' && (
                              <button 
                                onClick={() => handleEliminar(miembro.id, miembro.nombre)}
                                className="p-2.5 rounded-lg text-danger hover:bg-danger/10 transition-all"
                                title="Eliminar Permanente"
                              >
                                <UserMinus size={18} />
                              </button>
                            )}
                          </div>
                        )}
                        
                        {!['COMANDANTE', 'ADMIN_BASE'].includes(userActual.rol) && (
                           <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-text-muted group-hover:text-primary transition-all">
                              <ChevronRight size={18} />
                           </div>
                        )}
                     </div>
                  </CardContent>
                </Card>
              ))}

              {personal.length === 0 && (
                <div className="col-span-full py-24 text-center border border-dashed border-white/10 rounded-[32px] bg-bg-card/20">
                   <UserCog size={56} className="mx-auto text-white/5 mb-6" />
                   <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Sin operativos vinculados a esta terminal</p>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* Modal Alta de Personal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="PROTOCOLO DE ALTA — PERSONAL"
      >
        <form onSubmit={handleCrearPersonal} className="space-y-6">
          <div className="space-y-4">
             <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <BadgeCheck size={14} className="text-primary" />
                <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Identificación y Rango</span>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <Input 
                   label="Documento de Identidad" required placeholder="V-0000000"
                   value={nuevoMiembro.cedula}
                   onChange={(e) => setNuevoMiembro({...nuevoMiembro, cedula: e.target.value.toUpperCase()})}
                />
                <Input 
                   label="Terminal Telefónico" placeholder="0412-0000000"
                   value={nuevoMiembro.telefono}
                   onChange={(e) => setNuevoMiembro({...nuevoMiembro, telefono: e.target.value})}
                />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <Input 
                   label="Nombres Completos" required placeholder="EJ: PEDRO JAVIER"
                   value={nuevoMiembro.nombre}
                   onChange={(e) => setNuevoMiembro({...nuevoMiembro, nombre: e.target.value.toUpperCase()})}
                />
                <Input 
                   label="Apellidos" required placeholder="EJ: RODRIGUEZ"
                   value={nuevoMiembro.apellido}
                   onChange={(e) => setNuevoMiembro({...nuevoMiembro, apellido: e.target.value.toUpperCase()})}
                />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1 opacity-60 italic">Rango Operativo</label>
                  <select 
                    className="w-full h-12 bg-bg-card border border-white/10 rounded-xl px-4 text-sm font-bold text-text-main focus:ring-1 focus:ring-primary transition-all outline-none appearance-none"
                    required
                    value={nuevoMiembro.rol}
                    onChange={(e) => setNuevoMiembro({...nuevoMiembro, rol: e.target.value})}
                  >
                    <option value="">SELECCIONE...</option>
                    {renderRolesDisponibles()}
                  </select>
                </div>

                <Input 
                  label="Email del Operador" type="email" placeholder="operador@bagfm.com"
                  value={nuevoMiembro.email}
                  onChange={(e) => setNuevoMiembro({...nuevoMiembro, email: e.target.value})}
                />
             </div>

             {(nuevoMiembro.rol === 'PARQUERO' || nuevoMiembro.rol === 'ADMIN_ENTIDAD' || nuevoMiembro.rol === 'ALCABALA') && (userActual.rol === 'COMANDANTE' || userActual.rol === 'ADMIN_BASE') && (
               <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                 <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1 opacity-60 italic">Asignación de Destino</label>
                 <select 
                    className="w-full h-12 bg-bg-card border border-white/10 rounded-xl px-4 text-sm font-bold text-text-main focus:ring-1 focus:ring-primary transition-all outline-none appearance-none"
                    required
                    value={nuevoMiembro.entidad_id || ''}
                    onChange={(e) => setNuevoMiembro({...nuevoMiembro, entidad_id: e.target.value})}
                 >
                    <option value="">ASIGNAR ENTIDAD...</option>
                    {entidades.map(ent => (
                      <option key={ent.id} value={ent.id}>{ent.nombre}</option>
                    ))}
                 </select>
               </div>
             )}
          </div>

          <div className="pt-6 border-t border-white/5 space-y-4">
             <Boton type="submit" className="w-full h-14 bg-primary text-bg-app font-black uppercase tracking-[0.2em] shadow-tactica">
                Finalizar Alta de Personal
             </Boton>
             <p className="text-[9px] text-center text-text-muted uppercase font-black tracking-widest opacity-60 italic">
               LA CÉDULA SERÁ LA CLAVE DE ACCESO INICIAL POR DEFECTO.
             </p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
