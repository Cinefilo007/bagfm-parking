import React, { useState, useEffect, useRef } from 'react';
import { Header } from '../../components/layout/Header';
import { Boton } from '../../components/ui/Boton';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { SocioCard } from '../../components/entidades/SocioCard';
import { useAuthStore } from '../../store/auth.store';
import { 
  Users, UserPlus, Hash, User, Mail, 
  Phone, Search, FileUp, Car, Plus, 
  Trash2, Download, RefreshCw, Filter,
  FileSpreadsheet
} from 'lucide-react';
import api from '../../services/api';
import socioService from '../../services/socioService';
import { toast } from 'react-hot-toast';

export default function SociosEntidad() {
  const { user } = useAuthStore();
  const [socios, setSocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);
  
  const [nuevoSocio, setNuevoSocio] = useState({
    cedula: '',
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    entidad_id: user?.entidad_id,
    vehiculos: []
  });

  const [isRenovarModalOpen, setIsRenovarModalOpen] = useState(false);
  const [socioSeleccionado, setSocioSeleccionado] = useState(null);
  const [mesesRenovacion, setMesesRenovacion] = useState(1);

  const fetchSocios = async () => {
    if (!user?.entidad_id) return;
    setLoading(true);
    try {
      const data = await socioService.listarPorEntidad(user.entidad_id);
      setSocios(data);
    } catch (err) {
      console.error("Error cargando socios", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocios();
  }, [user]);

  const handleCrearSocio = async (e) => {
    e.preventDefault();
    try {
      await api.post('/socios/', {
        ...nuevoSocio,
        entidad_id: user.entidad_id
      });
      setIsModalOpen(false);
      setNuevoSocio({ 
        cedula: '', nombre: '', apellido: '', email: '', telefono: '', 
        entidad_id: user.entidad_id, vehiculos: []
      });
      fetchSocios();
      toast.success('Miembro registrado con éxito');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al registrar miembro');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/socios/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'PLANTILLA_SOCIOS_BAGFM.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Error al descargar plantilla');
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setLoading(true);
      await api.post(`/socios/importar?entidad_id=${user.entidad_id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchSocios();
      toast.success('Importación completada');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Fallo en la importación');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addVehiculo = () => {
    setNuevoSocio({
      ...nuevoSocio,
      vehiculos: [...nuevoSocio.vehiculos, { placa: '', marca: '', modelo: '', color: '' }]
    });
  };

  const removeVehiculo = (index) => {
    const updated = [...nuevoSocio.vehiculos];
    updated.splice(index, 1);
    setNuevoSocio({ ...nuevoSocio, vehiculos: updated });
  };

  const updateVehiculo = (index, field, value) => {
    const updated = [...nuevoSocio.vehiculos];
    updated[index][field] = value.toUpperCase();
    setNuevoSocio({ ...nuevoSocio, vehiculos: updated });
  };

  const handleAction = async (type, payload) => {
    if (type === 'renovacion') {
      setSocioSeleccionado(payload);
      setIsRenovarModalOpen(true);
    } else if (type === 'estado') {
      const { socio, nuevoEstado } = payload;
      await socioService.cambiarEstado(socio.id, nuevoEstado);
      fetchSocios();
    }
  };

  const confirmarRenovacion = async () => {
    try {
      await socioService.renovar(socioSeleccionado.id, mesesRenovacion);
      setIsRenovarModalOpen(false);
      setMesesRenovacion(1);
      fetchSocios();
      toast.success('Membresía renovada');
    } catch (err) {
      toast.error('Error en la renovación');
    }
  };

  const sociosFiltrados = socios.filter(s => 
    s.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.cedula.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-bg-app animate-in fade-in duration-500">
      <Header 
        titulo="Gestión de Miembros" 
        subtitle={user?.entidad_nombre || 'ADMINISTRACIÓN DE SOCIOS'} 
      />

      <main className="max-w-[1400px] mx-auto px-6 py-8 pb-32">
        
        {/* Barra de Herramientas Táctica */}
        <section className="bg-bg-low/40 border border-white/5 rounded-3xl p-6 mb-8 backdrop-blur-md">
           <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
              
              {/* Buscador */}
              <div className="w-full lg:max-w-md">
                 <Input 
                   placeholder="BUSCAR MIEMBRO POR IDENTIDAD..."
                   icon={<Search size={18} className="text-primary" />}
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                   className="h-14 bg-bg-app/60 border-white/10"
                 />
              </div>

              {/* Acciones de Lote y Registro */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                 <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx" onChange={handleImportExcel} />
                 
                 <Boton 
                   variant="ghost" 
                   className="h-14 px-6 gap-3 border-white/10 text-text-muted hover:text-primary transition-all font-black uppercase tracking-widest text-[11px]"
                   onClick={handleDownloadTemplate}
                 >
                    <Download size={18} />
                    Plantilla
                 </Boton>

                 <Boton 
                   variant="ghost" 
                   className="h-14 px-6 gap-3 border-white/10 text-text-muted hover:text-primary transition-all font-black uppercase tracking-widest text-[11px]"
                   onClick={() => fileInputRef.current?.click()}
                 >
                    <FileSpreadsheet size={18} />
                    Importar Excel
                 </Boton>

                 <Boton 
                   onClick={() => setIsModalOpen(true)}
                   className="h-14 px-8 gap-3 bg-primary text-bg-app font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/10 hover:scale-105 active:scale-95 transition-all"
                 >
                    <UserPlus size={20} />
                    Nuevo Miembro
                 </Boton>
              </div>
           </div>
        </section>

        {/* Status Bar */}
        <div className="flex items-center justify-between mb-6 px-4">
           <div className="flex items-center gap-3">
              <Users size={18} className="text-primary opacity-60" />
              <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] italic">
                 Censo Institucional ({sociosFiltrados.length})
              </h3>
           </div>
           <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Base de Datos Activa</span>
           </div>
        </div>

        {/* Lista de Registros */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
             Array(6).fill(0).map((_, i) => (
               <div key={i} className="h-48 rounded-3xl bg-white/5 animate-pulse border border-white/5" />
             ))
          ) : (
            <>
              {sociosFiltrados.map(socio => (
                <div key={socio.id} className="animate-in zoom-in-95 duration-300">
                  <SocioCard socio={socio} onAction={handleAction} />
                </div>
              ))}

              {sociosFiltrados.length === 0 && (
                <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-3xl bg-bg-low/20 backdrop-blur-sm">
                   <Users size={48} className="mx-auto text-white/5 mb-6" />
                   <p className="text-text-muted text-[11px] font-black uppercase tracking-[0.3em]">
                     {searchTerm ? 'Criterio de búsqueda sin coincidencias' : 'No se detectan socios vinculados a esta entidad'}
                   </p>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* --- MODALES --- */}

      {/* Modal Registro */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Protocolo de Afiliación"
      >
        <form onSubmit={handleCrearSocio} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Datos Personales */}
             <div className="md:col-span-2 space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                   <User size={14} className="text-primary" />
                   <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Identidad del Miembro</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <Input 
                      label="Cédula" required placeholder="V-000000"
                      value={nuevoSocio.cedula}
                      onChange={(e) => setNuevoSocio({...nuevoSocio, cedula: e.target.value.toUpperCase()})}
                   />
                   <Input 
                      label="Teléfono" placeholder="0412-0000000"
                      value={nuevoSocio.telefono}
                      onChange={(e) => setNuevoSocio({...nuevoSocio, telefono: e.target.value})}
                   />
                </div>
                
                <Input 
                  label="Nombres" required placeholder="IDENTIDAD COMPLETA"
                  value={nuevoSocio.nombre}
                  onChange={(e) => setNuevoSocio({...nuevoSocio, nombre: e.target.value.toUpperCase()})}
                />
                
                <Input 
                  label="Apellidos" required
                  value={nuevoSocio.apellido}
                  onChange={(e) => setNuevoSocio({...nuevoSocio, apellido: e.target.value.toUpperCase()})}
                />
                
                <Input 
                  label="Correo Electrónico" type="email"
                  value={nuevoSocio.email}
                  onChange={(e) => setNuevoSocio({...nuevoSocio, email: e.target.value.toLowerCase()})}
                />
             </div>

             {/* Vehículos */}
             <div className="md:col-span-2 space-y-4 pt-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                   <div className="flex items-center gap-2">
                      <Car size={14} className="text-secondary" />
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Parque Automotor</span>
                   </div>
                   <Boton type="button" variant="ghost" className="h-8 px-4 text-[9px] border-secondary/20 text-secondary" onClick={addVehiculo}>
                      <Plus size={14} /> AÑADIR VEHÍCULO
                   </Boton>
                </div>

                <div className="space-y-4">
                  {nuevoSocio.vehiculos.map((v, i) => (
                    <div key={i} className="p-4 bg-bg-app border border-white/10 rounded-2xl relative shadow-xl">
                      <button type="button" onClick={() => removeVehiculo(i)} className="absolute top-4 right-4 text-danger/40 hover:text-danger">
                        <Trash2 size={16} />
                      </button>
                      <div className="grid grid-cols-2 gap-4">
                        <Input label="Placa" value={v.placa} onChange={(e) => updateVehiculo(i, 'placa', e.target.value)} />
                        <Input label="Marca" value={v.marca} onChange={(e) => updateVehiculo(i, 'marca', e.target.value)} />
                        <Input label="Modelo" value={v.modelo} onChange={(e) => updateVehiculo(i, 'modelo', e.target.value)} />
                        <Input label="Color" value={v.color} onChange={(e) => updateVehiculo(i, 'color', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>

          <div className="pt-6 border-t border-white/5 flex gap-4">
             <Boton type="button" variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancelar</Boton>
             <Boton type="submit" className="flex-[2] bg-primary text-bg-app font-black uppercase tracking-[0.2em] h-14">
                Finalizar Registro
             </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal Renovación */}
      <Modal 
        isOpen={isRenovarModalOpen} 
        onClose={() => setIsRenovarModalOpen(false)} 
        title="Protocolo de Renovación"
      >
        <div className="space-y-8">
          <div className="flex items-center gap-5 p-6 bg-bg-app border border-white/10 rounded-3xl">
             <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-2xl">
                <RefreshCw size={32} />
             </div>
             <div>
                <p className="text-[10px] uppercase font-black text-primary tracking-[0.3em] mb-1">Membresía Activa</p>
                <h4 className="text-xl font-black text-white italic uppercase tracking-tight">{socioSeleccionado?.nombre_completo}</h4>
             </div>
          </div>

          <div className="space-y-4">
             <label className="text-[10px] uppercase font-black text-text-muted tracking-[0.3em] ml-2 opacity-60">Seleccionar Ciclo Operativo</label>
             <div className="grid grid-cols-2 gap-4">
                {[1, 3, 6, 12].map(num => (
                  <button
                    key={num}
                    onClick={() => setMesesRenovacion(num)}
                    className={`h-20 rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                      mesesRenovacion === num 
                      ? 'bg-primary/20 border-primary text-primary' 
                      : 'bg-white/5 border-white/5 text-text-muted hover:border-white/20'
                    }`}
                  >
                    <span className="text-2xl font-black italic font-display leading-none">{num}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest">{num === 1 ? 'MES' : 'MESES'}</span>
                  </button>
                ))}
             </div>
          </div>

          <Boton onClick={confirmarRenovacion} className="w-full h-16 bg-primary text-bg-app font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/10">
            Confirmar Renovación
          </Boton>
        </div>
      </Modal>
    </div>
  );
}
