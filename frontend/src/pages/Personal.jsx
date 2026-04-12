import React, { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Boton } from '../components/ui/Boton';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { 
  UserCircle, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  UserCog, 
  Hash, 
  Mail, 
  Phone,
  Building2,
  ChevronRight
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
      // 1. Cargar Personal
      const resPersonal = await api.get('/personal/lista');
      setPersonal(resPersonal.data);

      // 2. Cargar Entidades (Si el rol lo permite)
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
        password: nuevoMiembro.cedula // Password por defecto = cédula
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
        </>
      );
    }
    return <option value="PARQUERO">PARQUERO</option>;
  };

  return (
    <div className="min-h-screen bg-bg-app">
      <Header 
        titulo="Gestión de Personal" 
        subtitle="Mando y Control de Operativos"
      />

      <main className="px-4 py-6 max-w-4xl mx-auto pb-24">
        {/* Cabecera de Lista */}
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-sm font-bold text-text-main uppercase tracking-widest flex items-center gap-2">
             <UserCog size={18} className="text-primary" />
             Personal Activo
           </h2>
           <Boton 
             variant="ghost" 
             className="h-9 px-4 text-[10px] gap-2 border-primary/20 text-primary bg-primary/5"
             onClick={() => setIsModalOpen(true)}
           >
             <UserPlus size={16} />
             AÑADIR PERSONAL
           </Boton>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <span className="text-xs text-primary animate-pulse tracking-widest uppercase font-bold">Iniciando protocolo de identificación...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {personal.map(miembro => (
              <Card key={miembro.id} className="group relative overflow-hidden flex items-center justify-between p-4 border-white/5 hover:border-white/10 transition-all">
                <div className={`absolute left-0 top-0 h-full w-1 ${getRolColor(miembro.rol).replace('text-', 'bg-')}`} />
                
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border border-white/10 ${getRolColor(miembro.rol)} ${getRolBg(miembro.rol)}`}>
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
                    <div className="flex items-center gap-3">
                      <p className="text-[10px] text-text-muted font-mono uppercase tracking-widest">
                        ID: {miembro.cedula}
                      </p>
                      <span className="text-white/5">•</span>
                      <p className="text-[10px] text-text-muted/60 font-bold">
                        {miembro.telefono || 'SIN TELÉFONO'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[8px] uppercase font-bold text-text-muted tracking-widest mb-1">ACCESO</span>
                    <Badge variant={miembro.activo ? 'activa' : 'suspendida'}>
                      {miembro.activo ? 'VIGENTE' : 'RESTRINGIDO'}
                    </Badge>
                  </div>
                  <ChevronRight size={18} className="text-text-muted group-hover:text-primary transition-colors" />
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

      <BottomNav />

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
