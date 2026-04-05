import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { Boton } from '../../components/ui/Boton';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Network, Plus, ShieldCheck, Database, Power, Activity, Users, Car, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

export default function Entidades() {
  const navigate = useNavigate();
  const [entidades, setEntidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total_entidades: 0, total_vehiculos: 0, total_usuarios: 0, total_inactivas: 0 });
  const [page, setPage] = useState(0);
  const limit = 5;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creando, setCreando] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nuevaEntidad, setNuevaEntidad] = useState({
    nombre: '',
    capacidad_vehiculos: 20,
    codigo_slug: null,
    admin_cedula: '',
    admin_nombre: '',
    admin_apellido: '',
    admin_email: '',
    admin_password: ''
  });

  const fetchStats = async () => {
    try {
      const res = await api.get('/entidades/stats');
      setStats(res.data);
    } catch (err) {
      console.error("Error cargando stats", err);
    }
  };

  const fetchEntidades = async (p = page) => {
    setLoading(true);
    try {
      const skip = p * limit;
      const res = await api.get(`/entidades?skip=${skip}&limit=${limit}`);
      setEntidades(res.data);
      setHasMore(res.data.length === limit);
      fetchStats();
    } catch (err) {
      console.error("Error cargando entidades", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntidades();
  }, [page]);

  const handleToggleEstado = async (id) => {
    try {
      await api.post(`/entidades/${id}/toggle`);
      fetchEntidades();
    } catch (err) {
      console.error("Error al cambiar estado", err);
    }
  };

  const handleCrearEntidad = async (e) => {
    e.preventDefault();
    setCreando(true);
    try {
      // Limpiar datos antes de enviar
      const payload = {
        ...nuevaEntidad,
        capacidad_vehiculos: parseInt(nuevaEntidad.capacidad_vehiculos) || 0
      };
      
      // Si codigo_slug es nulo o vacío, lo eliminamos para que el backend lo genere
      if (!payload.codigo_slug) {
        delete payload.codigo_slug;
      }
      
      await api.post('/entidades', payload);
      setIsModalOpen(false);
      setNuevaEntidad({ 
        nombre: '', 
        capacidad_vehiculos: 20,
        codigo_slug: null,
        admin_cedula: '',
        admin_nombre: '',
        admin_apellido: '',
        admin_email: '',
        admin_password: ''
      });
      fetchEntidades();
    } catch (err) {
      console.error("Error creando entidad", err);
      const msg = err.response?.data?.detail;
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg) || "Error al crear la entidad");
    } finally {
      setCreando(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-app">
      <Header 
        titulo="Entidades Civiles" 
        subtitle="MÓDULO DE CONCESIONES // COMANDO" 
        actionElement={
          <button 
            onClick={() => setIsModalOpen(true)}
            className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center border border-primary/40 text-primary active:scale-95 transition-all"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        }
      />
      
      <main className="px-4 py-6 max-w-4xl mx-auto pb-24">
        {/* Barra de Estadísticas Globales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
           <Card className="bg-bg-card/20 border-white/5 p-3 lg:p-4 flex items-center gap-3">
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                 <Activity size={18} />
              </div>
              <div>
                 <p className="text-[9px] lg:text-[10px] text-text-muted font-bold uppercase tracking-widest leading-none mb-1">Entidades</p>
                 <p className="text-lg lg:text-xl font-display font-black text-white leading-none">{stats.total_entidades}</p>
              </div>
           </Card>
           <Card className="bg-bg-card/20 border-white/5 p-3 lg:p-4 flex items-center gap-3">
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                 <Users size={18} />
              </div>
              <div>
                 <p className="text-[9px] lg:text-[10px] text-text-muted font-bold uppercase tracking-widest leading-none mb-1">Socios</p>
                 <p className="text-lg lg:text-xl font-display font-black text-white leading-none">{stats.total_usuarios}</p>
              </div>
           </Card>
           <Card className="bg-bg-card/20 border-white/5 p-3 lg:p-4 flex items-center gap-3">
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                 <Car size={18} />
              </div>
              <div>
                 <p className="text-[9px] lg:text-[10px] text-text-muted font-bold uppercase tracking-widest leading-none mb-1">Parque</p>
                 <p className="text-lg lg:text-xl font-display font-black text-white leading-none">{stats.total_vehiculos}</p>
              </div>
           </Card>
           <Card className="bg-bg-card/20 border-white/5 p-3 lg:p-4 flex items-center gap-3">
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20">
                 <Power size={18} />
              </div>
              <div>
                 <p className="text-[9px] lg:text-[10px] text-text-muted font-bold uppercase tracking-widest leading-none mb-1">Suspendidas</p>
                 <p className="text-lg lg:text-xl font-display font-black text-white leading-none">{stats.total_inactivas}</p>
              </div>
           </Card>
        </div>
        {loading ? (
           <p className="text-center text-text-muted text-sm tracking-widest uppercase">Cargando Tácticas...</p>
        ) : (
          <div className="space-y-4">
            {entidades.map(ent => (
                <Card key={ent.id} hoverable elevation={2} className="relative overflow-hidden group border-white/5 bg-bg-card/40 backdrop-blur-sm">
                   <div className="absolute top-0 left-0 w-1 bg-primary/30 h-full group-hover:bg-primary transition-all duration-500"></div>
                   
                   <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                            <Database size={24} />
                         </div>
                         <div>
                            <h4 className="font-display font-black text-xl text-white uppercase tracking-tight">
                              {ent.nombre}
                            </h4>
                            <div className="mt-1">
                               <Badge variant={ent.activo ? 'activa' : 'suspendida'} className="text-[10px] h-5 font-black tracking-widest px-3 border-none bg-opacity-20 uppercase">
                                 {ent.activo ? 'OPERATIVO' : 'SUSPENDIDA'}
                               </Badge>
                            </div>
                         </div>
                      </div>
                      <div className="flex gap-2">
                        <Boton 
                          variant="ghost" 
                          className={`p-2 min-h-0 w-auto rounded-full ${ent.activo ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-red-500 hover:bg-red-500/10'} border border-white/5`}
                          onClick={() => handleToggleEstado(ent.id)}
                          title={ent.activo ? "Suspender Entidad" : "Reactivar Entidad"}
                        >
                           <Power size={18} />
                        </Boton>
                      </div>
                   </div>

                   <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-3 pb-1">
                      <div className="flex flex-col border-r border-white/5">
                         <span className="text-[8px] uppercase font-bold text-text-muted tracking-widest mb-0.5">
                           Capacidad
                         </span>
                         <span className="text-white font-mono font-bold text-sm">
                           {ent.capacidad_vehiculos} <span className="text-[9px] text-text-muted">VEH</span>
                         </span>
                      </div>
                      <div className="flex flex-col border-r border-white/5 pl-2">
                         <span className="text-[8px] uppercase font-bold text-text-muted tracking-widest mb-0.5">
                           Socios
                         </span>
                         <span className="text-white font-mono font-bold text-sm">
                           {ent.total_usuarios || 0} <span className="text-[9px] text-text-muted">UFS</span>
                         </span>
                      </div>
                      <div className="flex flex-col pl-2">
                         <span className="text-[8px] uppercase font-bold text-text-muted tracking-widest mb-0.5">
                           Parque
                         </span>
                         <span className="text-white font-mono font-bold text-sm">
                           {ent.total_vehiculos || 0} <span className="text-[9px] text-text-muted">UNI</span>
                         </span>
                      </div>
                   </div>

                   <div className="mt-4 flex justify-end">
                      <button 
                        onClick={() => navigate(`/comando/entidades/${ent.id}`)}
                        className="text-[10px] font-black uppercase text-primary tracking-widest hover:underline underline-offset-4 flex items-center gap-2 group"
                      >
                         GESTIONAR CONCESIÓN
                         <ShieldCheck size={12} className="group-hover:scale-125 transition-transform" />
                      </button>
                   </div>
                </Card>
            ))}

            {/* Controles de Paginación */}
            {(entidades.length > 0 || page > 0) && (
               <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-4">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase text-white disabled:opacity-30 disabled:pointer-events-none hover:text-primary transition-colors"
                  >
                     ← Anterior
                  </button>
                  <span className="text-[11px] font-mono font-bold text-text-muted uppercase">
                    Página {page + 1}
                  </span>
                  <button
                    disabled={!hasMore}
                    onClick={() => setPage(p => p + 1)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase text-white disabled:opacity-30 disabled:pointer-events-none hover:text-primary transition-colors"
                  >
                     Siguiente →
                  </button>
               </div>
            )}
          </div>
        )}
      </main>

      <BottomNav />

      {/* Modal de Creación */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => !creando && setIsModalOpen(false)} 
        title="Nueva Entidad Civil"
      >
        <form onSubmit={handleCrearEntidad} className="space-y-4 max-h-[70vh] overflow-y-auto px-1 no-scrollbar">
           <div className="space-y-3">
             <h3 className="text-[10px] uppercase font-bold text-primary tracking-[0.2em] mb-2 border-b border-primary/20 pb-1">
               Datos de la Concesión
             </h3>
             <Input 
               label="Nombre de la Entidad"
               icon={<Database size={16} />}
               required
               placeholder="Ej: AEROCLUB"
               value={nuevaEntidad.nombre}
               onChange={(e) => setNuevaEntidad({...nuevaEntidad, nombre: e.target.value.toUpperCase()})}
             />
             <Input 
               label="Capacidad de Vehículos"
               type="number"
               required
               value={nuevaEntidad.capacidad_vehiculos}
               onChange={(e) => setNuevaEntidad({...nuevaEntidad, capacidad_vehiculos: e.target.value})}
             />
           </div>

           <div className="space-y-3 pt-2">
             <h3 className="text-[10px] uppercase font-bold text-primary tracking-[0.2em] mb-2 border-b border-primary/20 pb-1">
               Datos del Administrador
             </h3>
             <div className="grid grid-cols-2 gap-3">
               <Input 
                 label="Nombre"
                 required
                 placeholder="Nombre"
                 value={nuevaEntidad.admin_nombre}
                 onChange={(e) => setNuevaEntidad({...nuevaEntidad, admin_nombre: e.target.value})}
               />
               <Input 
                 label="Apellido"
                 required
                 placeholder="Apellido"
                 value={nuevaEntidad.admin_apellido}
                 onChange={(e) => setNuevaEntidad({...nuevaEntidad, admin_apellido: e.target.value})}
               />
             </div>
             <Input 
               label="Cédula"
               required
               placeholder="V-12345678"
               value={nuevaEntidad.admin_cedula}
               onChange={(e) => setNuevaEntidad({...nuevaEntidad, admin_cedula: e.target.value})}
             />
             <Input 
               label="Email de Usuario"
               type="email"
               required
               placeholder="admin@entidad.com"
               value={nuevaEntidad.admin_email}
               onChange={(e) => setNuevaEntidad({...nuevaEntidad, admin_email: e.target.value})}
             />
             <Input 
               label="Password Inicial"
               type="password"
               required
               placeholder="••••••••"
               value={nuevaEntidad.admin_password}
               onChange={(e) => setNuevaEntidad({...nuevaEntidad, admin_password: e.target.value})}
             />
           </div>

           <div className="pt-4 sticky bottom-0 bg-bg-card pb-2">
             <Boton type="submit" className="w-full" disabled={creando}>
                {creando ? 'PROCESANDO...' : 'ESTABLECER ENTIDAD Y ADMIN'}
             </Boton>
           </div>
        </form>
      </Modal>
    </div>
  );
}
