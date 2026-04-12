import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Boton } from '../components/ui/Boton';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { 
  UserCircle, 
  Plus,
  ShieldCheck, 
  ShieldAlert, 
  UserCog, 
  Hash, 
  Mail, 
  Phone,
  Building2,
  ChevronRight,
  Power,
  RotateCcw,
  UserMinus
} from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/auth.store';

export default function Personal() {
  const { user: userActual } = useAuthStore();
  const [personal, setPersonal] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [nuevoMiembro, setNuevoMiembro] = useState({
    cedula: '',
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    rol: '',
    entidad_id: null,
    password: ''
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
          console.error("Error cargando lista de entidades:", entErr);
        }
      }
    } catch (err) {
      console.error("Error cargando personal operativo:", err);
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
        cedula: '', nombre: '', apellido: '', email: '', telefono: '', rol: '', entidad_id: null, password: ''
      });
      fetchData();
    } catch (err) {
      console.error("Error registrando personal", err);
      alert(err.response?.data?.detail || "Error al registrar personal");
    }
  };

  const handleToggleActivo = async (id) => {
    try {
      await api.post(`/personal/${id}/toggle`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Error al cambiar estado");
    }
  };

  const handleEliminar = async (id, nombre) => {
    if (!window.confirm(`¿Está seguro de dar de baja definitiva a ${nombre}? Esta acción es irreversible.`)) return;
    try {
      await api.delete(`/personal/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Error al eliminar");
    }
  };

  const getRolColor = (rol) => {
    switch (rol) {
      case 'ADMIN_BASE': return 'text-primary';
      case 'SUPERVISOR': return 'text-amber-500';
      case 'PARQUERO': return 'text-emerald-500';
      case 'ADMIN_ENTIDAD': return 'text-purple-500';
      default: return 'text-text-muted';
    }
  };

  const getRolBg = (rol) => {
    switch (rol) {
      case 'ADMIN_BASE': return 'bg-primary/20';
      case 'SUPERVISOR': return 'bg-amber-500/20';
      case 'PARQUERO': return 'bg-emerald-500/20';
      case 'ADMIN_ENTIDAD': return 'bg-purple-500/20';
      default: return 'bg-white/5';
    }
  };

  const renderRolesDisponibles = () => {
    if (userActual.rol === 'COMANDANTE' || userActual.rol === 'ADMIN_BASE') {
      return (
        <>
          <option value="ADMIN_BASE">ADMIN BASE</option>
          <option value="SUPERVISOR">SUPERVISOR</option>
          <option value="PARQUERO">PARQUERO</option>
          <option value="ADMIN_ENTIDAD">ADMIN ENTIDAD</option>
        </>
      );
    }
    return <option value="PARQUERO">PARQUERO</option>;
  };

  return (
    <div className="p-4 space-y-8 pb-24 max-w-[1400px] mx-auto">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-bg-card/30 p-4 rounded-3xl border border-white/5">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-text-main flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-primary/10 rounded-xl">
                <UserCog className="text-primary shrink-0" size={24} />
            </div>
            <span className="truncate">Gestión de Personal</span>
          </h1>
          <p className="text-text-muted text-sm mt-1 flex items-center gap-1.5 px-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Mando y Control de Operativos
          </p>
        </div>
        <Boton 
          size="lg" 
          onClick={() => setIsModalOpen(true)}
          className="gap-2 h-12 px-8 w-full sm:w-fit shrink-0 whitespace-nowrap shadow-tactica hover:scale-[1.02] transition-transform"
        >
          <Plus size={20} />
          <span>Añadir Personal</span>
        </Boton>
      </header>

      <main className="space-y-6">
        {/* Cabecera de Lista */}
        <div className="px-2">
            <h2 className="text-xs font-black text-text-muted uppercase tracking-[0.3em]">Fuerza de Tareas Activa</h2>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <span className="text-xs text-primary animate-pulse tracking-widest uppercase font-bold">Iniciando protocolo de identificación...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {personal.map(miembro => (
              <Card key={miembro.id} className="group relative overflow-hidden flex items-center justify-between p-4 border-white/5 hover:border-white/10 transition-all">
                <div className={`absolute left-0 top-0 h-full w-1 ${miembro.activo ? getRolColor(miembro.rol).replace('text-', 'bg-') : 'bg-red-500'}`} />
                
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border border-white/10 ${miembro.activo ? getRolColor(miembro.rol) : 'text-red-500'} ${miembro.activo ? getRolBg(miembro.rol) : 'bg-red-500/10'}`}>
                    <UserCircle size={28} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-main leading-none mb-1.5 flex items-center gap-2">
                      {miembro.nombre} {miembro.apellido}
                      <span className="text-white/10">•</span>
                      <span className={`text-[10px] font-black uppercase tracking-tighter ${getRolColor(miembro.rol)}`}>
                        {miembro.rol.replace('_', ' ')}
                      </span>
                    </h4>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <p className="text-[10px] text-text-muted font-mono uppercase tracking-widest">
                          ID: {miembro.cedula}
                        </p>
                        {miembro.entidad_nombre && (
                          <>
                            <span className="text-white/5">•</span>
                            <div className="flex items-center gap-1">
                              <Building2 size={10} className="text-primary/60" />
                              <span className="text-[10px] text-primary/80 font-bold uppercase">{miembro.entidad_nombre}</span>
                            </div>
                          </>
                        )}
                      </div>
                      <p className="text-[10px] text-text-muted/60 font-bold">
                        {miembro.telefono || 'SIN TELÉFONO'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex flex-col items-end mr-2">
                    <span className="text-[8px] uppercase font-bold text-text-muted tracking-widest mb-1">ACCESO</span>
                    <Badge variant={miembro.activo ? 'activa' : 'suspendida'}>
                      {miembro.activo ? 'VIGENTE' : 'RESTRINGIDO'}
                    </Badge>
                  </div>
                  
                  {/* Acciones para COMANDANTE / ADMIN_BASE */}
                  {(userActual.rol === 'COMANDANTE' || userActual.rol === 'ADMIN_BASE') && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleToggleActivo(miembro.id)}
                        className={`p-2 rounded-xl transition-all ${miembro.activo ? 'text-amber-500 hover:bg-amber-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}
                        title={miembro.activo ? "Pausar Acceso" : "Reactivar Acceso"}
                      >
                        {miembro.activo ? <Power size={18} /> : <RotateCcw size={18} />}
                      </button>
                      
                      {userActual.rol === 'COMANDANTE' && (
                        <button 
                          onClick={() => handleEliminar(miembro.id, miembro.nombre)}
                          className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-all"
                          title="Eliminar Permanente"
                        >
                          <UserMinus size={18} />
                        </button>
                      )}
                    </div>
                  )}
                  
                  {!['COMANDANTE', 'ADMIN_BASE'].includes(userActual.rol) && (
                    <ChevronRight size={18} className="text-text-muted group-hover:text-primary transition-colors" />
                  )}
                </div>
              </Card>
            ))}

            {personal.length === 0 && (
              <div className="text-center py-16 bg-white/5 rounded-3xl border border-dashed border-white/10">
                <UserPlus size={40} className="mx-auto text-text-muted/20 mb-4" />
                <p className="text-text-muted text-xs uppercase tracking-widest font-bold">No hay personal registrado bajo su mando</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal Añadir Personal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Registrar Personal Administrativo"
      >
        <form onSubmit={handleCrearPersonal} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <Input 
               label="Cédula"
               icon={<Hash size={16} />}
               required
               placeholder="V12345678"
               value={nuevoMiembro.cedula}
               onChange={(e) => setNuevoMiembro({...nuevoMiembro, cedula: e.target.value.toUpperCase()})}
             />
             <Input 
               label="Teléfono"
               icon={<Phone size={16} />}
               placeholder="0412..."
               value={nuevoMiembro.telefono}
               onChange={(e) => setNuevoMiembro({...nuevoMiembro, telefono: e.target.value})}
             />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Nombre"
              required
              placeholder="JUAN"
              value={nuevoMiembro.nombre}
              onChange={(e) => setNuevoMiembro({...nuevoMiembro, nombre: e.target.value.toUpperCase()})}
            />
            <Input 
              label="Apellido"
              required
              placeholder="PÉREZ"
              value={nuevoMiembro.apellido}
              onChange={(e) => setNuevoMiembro({...nuevoMiembro, apellido: e.target.value.toUpperCase()})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest px-1">Rol de Operaciones</label>
              <select 
                className="w-full h-11 bg-bg-high/40 border border-white/10 rounded-xl px-4 text-sm text-text-main focus:ring-1 focus:ring-primary/50 transition-all outline-none appearance-none"
                required
                value={nuevoMiembro.rol}
                onChange={(e) => setNuevoMiembro({...nuevoMiembro, rol: e.target.value})}
              >
                <option value="">Seleccione Rango...</option>
                {renderRolesDisponibles()}
              </select>
            </div>

            <Input 
              label="Correo"
              type="email"
              placeholder="juan@bagfm.com"
              value={nuevoMiembro.email}
              onChange={(e) => setNuevoMiembro({...nuevoMiembro, email: e.target.value})}
            />
          </div>

          {(nuevoMiembro.rol === 'PARQUERO' || nuevoMiembro.rol === 'ADMIN_ENTIDAD') && (userActual.rol === 'COMANDANTE' || userActual.rol === 'ADMIN_BASE') && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest px-1">Entidad Civil / Destino</label>
              <select 
                className="w-full h-11 bg-bg-high/40 border border-white/10 rounded-xl px-4 text-sm text-text-main focus:ring-1 focus:ring-primary/50 transition-all outline-none appearance-none"
                required
                value={nuevoMiembro.entidad_id || ''}
                onChange={(e) => setNuevoMiembro({...nuevoMiembro, entidad_id: e.target.value})}
              >
                <option value="">Seleccione Entidad...</option>
                {entidades.map(ent => (
                  <option key={ent.id} value={ent.id}>{ent.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-4">
            <Boton type="submit" className="w-full py-3 h-auto font-black italic tracking-tighter">
               CONFIRMAR ALTA DE PERSONAL
            </Boton>
            <p className="text-[9px] text-center text-text-muted mt-3 uppercase tracking-widest leading-relaxed">
              La contraseña por defecto será el número de cédula del usuario.
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
