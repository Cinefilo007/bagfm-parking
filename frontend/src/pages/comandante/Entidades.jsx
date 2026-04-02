import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { Boton } from '../../components/ui/Boton';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Network, Plus, ShieldCheck, Database } from 'lucide-react';
import api from '../../services/api';

export default function Entidades() {
  const navigate = useNavigate();
  const [entidades, setEntidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creando, setCreando] = useState(false);
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

  const fetchEntidades = async () => {
    setLoading(true);
    try {
      const res = await api.get('/entidades');
      setEntidades(res.data);
    } catch (err) {
      console.error("Error cargando entidades", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntidades();
  }, []);

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
      
      <main className="px-4 py-6 max-w-lg mx-auto pb-24">
        {loading ? (
           <p className="text-center text-text-muted text-sm tracking-widest uppercase">Cargando Tácticas...</p>
        ) : (
          <div className="space-y-4">
            {entidades.map(ent => (
               <Card key={ent.id} hoverable elevation={2} className="relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 bg-primary/50 h-full group-hover:bg-primary transition-colors"></div>
                  <div className="flex justify-between items-start pl-2">
                     <div>
                        <h4 className="font-sans font-semibold text-lg text-text-main leading-tight mb-1">
                          {ent.nombre}
                        </h4>
                        <p className="text-text-muted text-xs tracking-wider uppercase flex items-center gap-1.5">
                           <Network size={12} />
                           {ent.codigo_slug}
                        </p>
                     </div>
                     <Badge variant={ent.activo ? 'activa' : 'suspendida'}>
                       {ent.activo ? 'ACTIVO' : 'BAJA'}
                     </Badge>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between pl-2">
                     <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-text-muted tracking-widest mb-0.5">
                          Capacidad
                        </span>
                        <span className="text-text-main font-semibold text-sm">
                          {ent.capacidad_vehiculos} Vehículos
                        </span>
                     </div>
                     <Boton variant="ghost" className="px-3 min-h-[32px] text-xs py-1 rounded-md text-primary" onClick={() => navigate(`/comando/entidades/${ent.id}`)}>
                        GESTIÓN
                     </Boton>
                  </div>
               </Card>
            ))}

            {entidades.length === 0 && (
              <div className="text-center p-8 border border-text-muted/20 border-dashed rounded-xl mt-8">
                <ShieldCheck size={32} className="mx-auto text-text-muted/50 mb-4" />
                <p className="text-text-sec text-xs font-medium tracking-widest uppercase">
                  No hay entidades registradas
                </p>
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
