import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Boton } from '../components/ui/Boton';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Header } from '../components/layout/Header';
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
    <div className="min-h-screen bg-bg-app animate-in fade-in duration-500">
      <Header 
        titulo="Fuerza de Tareas" 
        subtitle="GESTIÓN DE PERSONAL OPERATIVO" 
      />

      <main className="max-w-[1400px] mx-auto px-6 py-8 pb-32">
        
        {/* Cabecera de Comando */}
        <section className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10 bg-bg-low/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
           <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-xl shadow-primary/5">
                 <UserCog size={28} />
              </div>
              <div>
                 <h2 className="text-lg font-black text-white uppercase tracking-tight italic leading-tight">Mando y Control de Personal</h2>
                 <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em] mt-1 opacity-60">Operativos y Administradores Activos</p>
              </div>
           </div>

           <Boton 
             onClick={() => setIsModalOpen(true)}
             className="w-full md:w-auto h-14 px-8 bg-primary text-bg-app font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/10 hover:scale-105 active:scale-95 transition-all text-center"
           >
              <Plus size={20} className="mr-2" />
              Añadir Nuevo Operativo
           </Boton>
        </section>

        {/* Status Bar */}
        <div className="flex items-center justify-between mb-8 px-4">
           <div className="flex items-center gap-3">
              <Zap size={18} className="text-primary animate-pulse" />
              <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] italic">
                 Lista de Operadores ({personal.length})
              </h3>
           </div>
           <div className="flex items-center gap-2">
              <Activity size={14} className="text-emerald-500" />
              <span className="text-[10px] text-text-muted font-black uppercase tracking-widest opacity-60">Sincronización en Tiempo Real</span>
           </div>
        </div>

        {/* Grid de Personal Aegis v2 */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {loading ? (
             Array(4).fill(0).map((_, i) => (
               <div key={i} className="h-40 rounded-3xl bg-white/5 animate-pulse border border-white/5" />
             ))
          ) : (
            <>
              {personal.map(miembro => (
                <Card key={miembro.id} className="bg-bg-low/60 border-white/5 hover:border-white/10 transition-all group overflow-hidden relative">
                  <div className={cn("absolute left-0 top-0 h-full w-1.5 transition-all", miembro.activo ? getRolStyles(miembro.rol).split(' ')[0].replace('text-', 'bg-') : 'bg-danger')} />
                  
                  <CardContent className="p-6 flex items-center justify-between">
                     <div className="flex items-center gap-5">
                        <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110", miembro.activo ? getRolStyles(miembro.rol) : 'bg-danger/10 border-danger/20 text-danger')}>
                           <UserCircle size={32} />
                        </div>
                        <div>
                           <div className={cn("inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest mb-2", miembro.activo ? getRolStyles(miembro.rol) : 'text-danger bg-danger/10 border-danger/20')}>
                              {miembro.rol.replace('_', ' ')}
                           </div>
                           <h4 className="text-xl font-black text-white uppercase tracking-tight italic leading-none">{miembro.nombre} {miembro.apellido}</h4>
                           <div className="flex flex-wrap items-center gap-4 mt-3">
                              <p className="text-[10px] text-text-muted font-black uppercase tracking-widest opacity-60 flex items-center gap-1.5">
                                 <Hash size={12} className="text-primary" /> {miembro.cedula}
                              </p>
                              {miembro.entidad_nombre && (
                                <p className="text-[10px] text-primary font-black uppercase tracking-widest flex items-center gap-1.5">
                                   <Building2 size={12} /> {miembro.entidad_nombre}
                                </p>
                              )}
                              <p className="text-[10px] text-text-muted font-bold opacity-60 flex items-center gap-1.5 italic">
                                 <Phone size={12} /> {miembro.telefono || 'ACCESO TEL REG.'}
                              </p>
                           </div>
                        </div>
                     </div>

                     <div className="flex items-center gap-3">
                        {/* Acciones de Mando */}
                        {(userActual.rol === 'COMANDANTE' || userActual.rol === 'ADMIN_BASE') && (
                          <div className="flex items-center gap-2 bg-black/10 p-1.5 rounded-2xl border border-white/5">
                            <button 
                              onClick={() => handleToggleActivo(miembro.id)}
                              className={cn("p-3 rounded-xl transition-all shadow-lg", miembro.activo ? 'bg-warning/10 text-warning hover:bg-warning hover:text-bg-app' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-bg-app')}
                              title={miembro.activo ? "Pausar Acceso" : "Reactivar Acceso"}
                            >
                              {miembro.activo ? <Power size={20} /> : <RotateCcw size={20} />}
                            </button>
                            
                            {userActual.rol === 'COMANDANTE' && (
                              <button 
                                onClick={() => handleEliminar(miembro.id, miembro.nombre)}
                                className="p-3 rounded-xl bg-danger/10 text-danger hover:bg-danger hover:text-white transition-all shadow-lg"
                                title="Eliminar Permanente"
                              >
                                <UserMinus size={20} />
                              </button>
                            )}
                          </div>
                        )}
                        
                        {!['COMANDANTE', 'ADMIN_BASE'].includes(userActual.rol) && (
                           <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-text-muted group-hover:text-primary transition-all">
                              <ChevronRight size={20} />
                           </div>
                        )}
                     </div>
                  </CardContent>
                </Card>
              ))}

              {personal.length === 0 && (
                <div className="col-span-full py-32 text-center border border-dashed border-white/10 rounded-3xl bg-bg-low/20">
                   <UserCog size={64} className="mx-auto text-white/5 mb-6" />
                   <p className="text-text-muted text-[11px] font-black uppercase tracking-[0.3em]">No se registran operativos vinculados a esta terminal</p>
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
        title="Protocolo de Alta - Fuerza de Tareas"
      >
        <form onSubmit={handleCrearPersonal} className="space-y-6">
          <div className="space-y-4">
             <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <BadgeCheck size={14} className="text-primary" />
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Identificación y Rango</span>
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
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1 opacity-60">Rango / Rol Asignado</label>
                  <select 
                    className="w-full h-14 bg-bg-app border border-white/10 rounded-2xl px-4 text-sm font-bold text-white focus:ring-1 focus:ring-primary transition-all outline-none appearance-none"
                    required
                    value={nuevoMiembro.rol}
                    onChange={(e) => setNuevoMiembro({...nuevoMiembro, rol: e.target.value})}
                  >
                    <option value="">SELECCIONE RANGO...</option>
                    {renderRolesDisponibles()}
                  </select>
                </div>

                <Input 
                  label="Canal de Comunicaciones (Email)" type="email" placeholder="operador@bagfm.com"
                  value={nuevoMiembro.email}
                  onChange={(e) => setNuevoMiembro({...nuevoMiembro, email: e.target.value})}
                />
             </div>

             {(nuevoMiembro.rol === 'PARQUERO' || nuevoMiembro.rol === 'ADMIN_ENTIDAD' || nuevoMiembro.rol === 'ALCABALA') && (userActual.rol === 'COMANDANTE' || userActual.rol === 'ADMIN_BASE') && (
               <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                 <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1 opacity-60">Destino / Entidad Civil</label>
                 <select 
                    className="w-full h-14 bg-bg-app border border-white/10 rounded-2xl px-4 text-sm font-bold text-white focus:ring-1 focus:ring-primary transition-all outline-none appearance-none"
                    required
                    value={nuevoMiembro.entidad_id || ''}
                    onChange={(e) => setNuevoMiembro({...nuevoMiembro, entidad_id: e.target.value})}
                 >
                    <option value="">ASIGNAR DESTINO CIVIL...</option>
                    {entidades.map(ent => (
                      <option key={ent.id} value={ent.id}>{ent.nombre}</option>
                    ))}
                 </select>
               </div>
             )}
          </div>

          <div className="pt-6 border-t border-white/5 space-y-4">
             <Boton type="submit" className="w-full h-16 bg-primary text-bg-app font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/10">
                Finalizar Alta de Personal
             </Boton>
             <p className="text-[9px] text-center text-text-muted uppercase font-bold tracking-widest opacity-60 leading-relaxed">
               ACCESO INICIAL GARANTIZADO MEDIANTE CÉDULA DE IDENTIDAD COMO CONTRASEÑA MAESTRA.
             </p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
