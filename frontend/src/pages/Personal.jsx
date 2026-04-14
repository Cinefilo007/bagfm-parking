import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Boton } from '../components/ui/Boton';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { 
  UserCircle, Plus, UserCog, Hash,
  Phone, Building2, Power, RotateCcw, UserMinus, BadgeCheck,
  Search, ChevronLeft, ChevronRight
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

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 10;

  const fetchData = async () => {
    setLoading(true);
    try {
      const skip = page * limit;
      const resPersonal = await api.get(`/personal/lista?skip=${skip}&limit=${limit}&search=${search}`);
      setPersonal(resPersonal.data);
      setHasMore(resPersonal.data.length === limit);
      
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
    const delayDebounce = setTimeout(() => {
      fetchData();
    }, search ? 500 : 0);
    return () => clearTimeout(delayDebounce);
  }, [page, search]);

  const handleCrearPersonal = async (e) => {
    e.preventDefault();
    try {
      await api.post('/personal/', { ...nuevoMiembro, password: nuevoMiembro.cedula });
      setIsModalOpen(false);
      setNuevoMiembro({ cedula: '', nombre: '', apellido: '', email: '', telefono: '', rol: '', entidad_id: null, password: '' });
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

  // Estilos por rol — texto + fondo + borde
  const getRolStyles = (rol) => {
    switch (rol) {
      case 'ADMIN_BASE':    return { badge: 'text-primary bg-primary/10 border-primary/20',     avatar: 'text-primary bg-primary/10 border-primary/20',     bar: 'bg-primary' };
      case 'SUPERVISOR':    return { badge: 'text-amber-400 bg-amber-400/10 border-amber-400/20', avatar: 'text-amber-400 bg-amber-400/10 border-amber-400/20', bar: 'bg-amber-400' };
      case 'PARQUERO':      return { badge: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', avatar: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', bar: 'bg-emerald-400' };
      case 'ALCABALA':      return { badge: 'text-sky-400 bg-sky-400/10 border-sky-400/20',     avatar: 'text-sky-400 bg-sky-400/10 border-sky-400/20',     bar: 'bg-sky-400' };
      case 'ADMIN_ENTIDAD': return { badge: 'text-purple-400 bg-purple-400/10 border-purple-400/20', avatar: 'text-purple-400 bg-purple-400/10 border-purple-400/20', bar: 'bg-purple-400' };
      default:              return { badge: 'text-text-muted bg-white/5 border-white/5',        avatar: 'text-text-muted bg-white/5 border-white/5',        bar: 'bg-text-muted' };
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
    <div className="p-4 md:p-6 space-y-6 pb-24 max-w-[1400px] mx-auto animate-in fade-in duration-500">

      {/* ─── Cabecera Táctica v2 ─── */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-bg-card/30 p-4 md:p-5 rounded-2xl border border-white/5">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-text-main flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-primary/10 rounded-xl shrink-0">
              <UserCog className="text-primary" size={24} />
            </div>
            <span className="uppercase">Fuerza de Tareas</span>
          </h1>
          <p className="text-text-muted text-sm mt-1 flex items-center gap-1.5 px-1 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" />
            Control de personal operativo ({personal.length} en terminal)
          </p>
        </div>
        <Boton
          onClick={() => setIsModalOpen(true)}
          className="gap-2 h-11 px-6 w-full sm:w-auto shrink-0 bg-primary text-bg-app font-black uppercase tracking-widest text-[11px] rounded-xl shadow-tactica hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={18} />
          <span>Añadir Operativo</span>
        </Boton>
      </header>

      {/* ─── Barra de Búsqueda y Filtros ─── */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-bg-card/20 p-2 rounded-2xl border border-white/5">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input 
            type="text"
            placeholder="Buscar por nombre, apellido o cédula..."
            className="w-full h-12 bg-bg-card border border-bg-high/10 rounded-xl pl-12 pr-4 text-sm font-bold text-text-main focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-text-muted/40"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
      </div>

      {/* ─── Listado de Tarjetas Alargadas ─── */}
      <section className="space-y-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse border border-white/5" />
          ))
        ) : (
          <>
            {personal.map(miembro => {
              const estilos = getRolStyles(miembro.activo ? miembro.rol : '__inactivo__');
              const estilosActivos = getRolStyles(miembro.rol);
              return (
                <Card key={miembro.id} className="bg-bg-card border border-white/5 hover:border-primary/20 transition-all group overflow-hidden relative rounded-xl">
                  {/* Barra lateral de color de rol */}
                  <div className={cn("absolute left-0 top-0 h-full w-1 rounded-l-xl transition-all", miembro.activo ? estilosActivos.bar : 'bg-danger')} />
                  
                  <CardContent className="p-4 pl-5 flex items-center gap-4">
                    {/* Avatar de Rol */}
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105",
                      miembro.activo ? estilosActivos.avatar : 'bg-danger/10 border-danger/20 text-danger'
                    )}>
                      <UserCircle size={26} />
                    </div>

                    {/* Datos del Operativo — sin truncado en datos críticos */}
                    <div className="flex-1 min-w-0">
                      {/* Badge de Rol */}
                      <div className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest mb-1",
                        miembro.activo ? estilosActivos.badge : 'text-danger bg-danger/10 border-danger/20'
                      )}>
                        {miembro.activo ? miembro.rol.replace(/_/g, ' ') : 'INACTIVO'}
                      </div>

                      {/* Nombre — wrapping natural, sin truncado */}
                      <h4 className="text-base font-black text-text-main uppercase tracking-tight leading-tight">
                        {miembro.nombre} {miembro.apellido}
                      </h4>

                      {/* Metadatos en fila */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                        <span className="text-[9px] text-text-muted font-black uppercase tracking-widest flex items-center gap-1">
                          <Hash size={9} className="text-primary shrink-0" />
                          {miembro.cedula}
                        </span>
                        {miembro.entidad_nombre && (
                          <span className="text-[9px] text-primary font-black uppercase tracking-widest flex items-center gap-1">
                            <Building2 size={9} className="shrink-0" />
                            {miembro.entidad_nombre}
                          </span>
                        )}
                        <span className="text-[9px] text-text-muted font-bold uppercase flex items-center gap-1">
                          <Phone size={9} className="shrink-0" />
                          {miembro.telefono || 'SIN TEL.'}
                        </span>
                      </div>
                    </div>

                    {/* Controles de Mando */}
                    {(userActual.rol === 'COMANDANTE' || userActual.rol === 'ADMIN_BASE') && (
                      <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/5 shrink-0">
                        <button
                          onClick={() => handleToggleActivo(miembro.id)}
                          className={cn("p-2 rounded-md transition-all", miembro.activo ? 'text-warning hover:bg-warning/10' : 'text-success hover:bg-success/10')}
                          title={miembro.activo ? "Pausar Acceso" : "Reactivar Acceso"}
                        >
                          {miembro.activo ? <Power size={16} /> : <RotateCcw size={16} />}
                        </button>
                        {userActual.rol === 'COMANDANTE' && (
                          <button
                            onClick={() => handleEliminar(miembro.id, miembro.nombre)}
                            className="p-2 rounded-md text-danger hover:bg-danger/10 transition-all"
                            title="Dar de Baja Permanente"
                          >
                            <UserMinus size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {personal.length === 0 && (
              <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-xl bg-bg-card/20">
                <UserCog size={48} className="mx-auto text-text-muted mb-4 opacity-15" />
                <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                  Sin operativos vinculados a esta terminal
                </p>
              </div>
            )}
          </>
        )}
      </section>

      {/* ─── Controles de Paginación Táctica ─── */}
      {!loading && (personal.length > 0 || page > 0) && (
        <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-4">
          <Boton
            variant="ghost"
            disabled={page === 0}
            onClick={() => setPage(p => Math.max(0, p - 1))}
            className="gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-30"
          >
            <ChevronLeft size={16} />
            Anterior
          </Boton>
          
          <div className="flex flex-col items-center">
             <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Sector Acceso</span>
             <span className="text-sm font-display font-black text-primary">PÁGINA {page + 1}</span>
          </div>

          <Boton
            variant="ghost"
            disabled={!hasMore}
            onClick={() => setPage(p => p + 1)}
            className="gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-30"
          >
            Siguiente
            <ChevronRight size={16} />
          </Boton>
        </div>
      )}

      {/* ─── Modal Alta de Personal ─── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="PROTOCOLO DE ALTA — PERSONAL">
        <form onSubmit={handleCrearPersonal} className="space-y-5">
          {/* Sección: Identificación */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <BadgeCheck size={13} className="text-primary" />
              <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Identificación y Rango</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Documento de Identidad" required placeholder="V-0000000"
                value={nuevoMiembro.cedula}
                onChange={(e) => setNuevoMiembro({...nuevoMiembro, cedula: e.target.value.toUpperCase()})}
              />
              <Input label="Teléfono" placeholder="0412-0000000"
                value={nuevoMiembro.telefono}
                onChange={(e) => setNuevoMiembro({...nuevoMiembro, telefono: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Nombres" required placeholder="EJ: PEDRO JAVIER"
                value={nuevoMiembro.nombre}
                onChange={(e) => setNuevoMiembro({...nuevoMiembro, nombre: e.target.value.toUpperCase()})}
              />
              <Input label="Apellidos" required placeholder="EJ: RODRIGUEZ"
                value={nuevoMiembro.apellido}
                onChange={(e) => setNuevoMiembro({...nuevoMiembro, apellido: e.target.value.toUpperCase()})}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1 opacity-60">Rango Operativo</label>
                <select
                  className="w-full h-11 bg-bg-card border border-white/10 rounded-xl px-3 text-sm font-bold text-text-main focus:ring-1 focus:ring-primary outline-none appearance-none transition-all"
                  required value={nuevoMiembro.rol}
                  onChange={(e) => setNuevoMiembro({...nuevoMiembro, rol: e.target.value})}
                >
                  <option value="">SELECCIONE...</option>
                  {renderRolesDisponibles()}
                </select>
              </div>
              <Input label="Email del Operador" type="email" placeholder="operador@bagfm.com"
                value={nuevoMiembro.email}
                onChange={(e) => setNuevoMiembro({...nuevoMiembro, email: e.target.value})}
              />
            </div>

            {(nuevoMiembro.rol === 'PARQUERO' || nuevoMiembro.rol === 'ADMIN_ENTIDAD' || nuevoMiembro.rol === 'ALCABALA') &&
             (userActual.rol === 'COMANDANTE' || userActual.rol === 'ADMIN_BASE') && (
              <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1 opacity-60">Asignación de Destino</label>
                <select
                  className="w-full h-11 bg-bg-card border border-white/10 rounded-xl px-3 text-sm font-bold text-text-main focus:ring-1 focus:ring-primary outline-none appearance-none transition-all"
                  required value={nuevoMiembro.entidad_id || ''}
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

          <div className="pt-4 border-t border-white/5 space-y-3">
            <Boton type="submit" className="w-full h-14 bg-primary text-bg-app font-black uppercase tracking-[0.2em] rounded-xl shadow-tactica">
              Finalizar Alta de Personal
            </Boton>
            <p className="text-[9px] text-center text-text-muted uppercase font-bold tracking-widest opacity-50 italic">
              La cédula se usará como clave de acceso inicial.
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
