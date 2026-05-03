import React, { useState, useEffect, useRef } from 'react';
import { Boton } from '../../components/ui/Boton';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { SocioCard } from '../../components/entidades/SocioCard';
import { useAuthStore } from '../../store/auth.store';
import { 
  Users, UserPlus, Hash, User, Mail, 
  Phone, Search, FileUp, Car, Plus, 
  Trash2, Download, RefreshCw, Filter,
  FileSpreadsheet, ShieldCheck, Clock, Pause
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

  const stats = {
    total: socios.length,
    activos: socios.filter(s => s.membresia?.estado === 'activa' && !s.membresia?.progreso?.vencida).length,
    vencidos: socios.filter(s => s.membresia?.estado === 'vencida' || s.membresia?.progreso?.vencida).length,
    suspendidos: socios.filter(s => s.membresia?.estado === 'suspendida').length,
  };

  const sociosFiltrados = socios.filter(s => 
    s.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.cedula.includes(searchTerm)
  );

  return (
    <div className="p-4 space-y-8 pb-24 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* Cabecera Táctica v2: Gestión de Miembros */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-bg-card/30 p-4 rounded-3xl border border-white/5">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-text-main flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-primary/10 rounded-xl">
                <Users className="text-primary shrink-0" size={24} />
            </div>
            <span className="truncate uppercase">Gestión de Miembros</span>
          </h1>
          <p className="text-text-muted text-sm mt-1 flex items-center gap-1.5 px-1 font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            {user?.entidad_nombre || 'ADMINISTRACIÓN'} // {sociosFiltrados.length} SOCIOS
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
           <Boton 
             size="lg" 
             onClick={() => setIsModalOpen(true)}
             className="gap-2 h-12 px-6 bg-primary text-bg-app font-black uppercase tracking-widest text-[11px] shadow-tactica hover:scale-[1.02] transition-transform"
           >
             <UserPlus size={18} />
             <span>Nuevo Miembro</span>
           </Boton>
        </div>
      </header>

      {/* Panel de Indicadores KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Miembros', valor: stats.total, color: 'text-primary', icon: Users, sub: 'Padrón registrado' },
          { label: 'Acceso Activo', valor: stats.activos, color: 'text-success', icon: ShieldCheck, sub: 'Membresías al día' },
          { label: 'Vencidos', valor: stats.vencidos, color: 'text-amber-500', icon: Clock, sub: 'Requieren renovación' },
          { label: 'Suspendidos', valor: stats.suspendidos, color: 'text-danger', icon: Pause, sub: 'Acceso restringido' },
        ].map((s, i) => (
          <div key={i} className="p-4 bg-bg-card/40 border border-white/5 rounded-2xl flex items-center gap-4 group hover:bg-bg-high/80 transition-all border-b-2 border-b-transparent hover:border-b-primary/50">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-black/40 border border-white/5 shrink-0 ${s.color}`}>
              <s.icon size={22} />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl font-black leading-tight truncate ${s.color}`}>{s.valor}</div>
              <div className="text-[10px] font-black uppercase text-text-muted tracking-widest truncate">{s.label}</div>
              <div className="text-[8px] text-text-muted opacity-40 uppercase font-bold mt-0.5 whitespace-nowrap">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <main className="space-y-6">
        {/* Barra de Herramientas Táctica Inline */}
        <section className="bg-bg-card/40 border border-white/5 rounded-2xl p-4 backdrop-blur-md">
           <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Buscador HUD */}
              <div className="w-full lg:max-w-md">
                 <Input 
                   placeholder="BUSCAR POR IDENTIDAD O NOMBRE..."
                   icon={<Search size={18} className="text-primary" />}
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                   className="h-12 bg-bg-app border-white/10 text-sm font-bold"
                 />
              </div>

              {/* Acciones de Lote */}
              <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar">
                 <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx" onChange={handleImportExcel} />
                 
                 <Boton 
                   variant="ghost" 
                   className="h-12 px-4 gap-2 border-white/5 text-text-muted hover:text-primary transition-all font-black uppercase tracking-widest text-[10px]"
                   onClick={handleDownloadTemplate}
                 >
                    <Download size={16} />
                    Plantilla
                 </Boton>

                 <Boton 
                   variant="ghost" 
                   className="h-12 px-4 gap-2 border-white/5 text-text-muted hover:text-primary transition-all font-black uppercase tracking-widest text-[10px]"
                   onClick={() => fileInputRef.current?.click()}
                 >
                    <FileSpreadsheet size={16} />
                    Importar
                 </Boton>
              </div>
           </div>
        </section>

        {/* Lista de Registros Aegis v2 - Una sola columna para mayor detalle */}
        <section className="grid grid-cols-1 gap-4">
          {loading ? (
             Array(6).fill(0).map((_, i) => (
               <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
             ))
          ) : (
            <>
              {sociosFiltrados.map(socio => (
                <div key={socio.id} className="animate-in zoom-in-95 duration-300">
                  <SocioCard socio={socio} onAction={handleAction} />
                </div>
              ))}

              {sociosFiltrados.length === 0 && (
                <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-[32px] bg-bg-card/20 backdrop-blur-sm">
                   <Users size={48} className="mx-auto text-white/5 mb-6 opacity-20" />
                   <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                     {searchTerm ? 'Criterio sin coincidencias tácticas' : 'Padrón de socios vacío'}
                   </p>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* MODALES ESTANDARIZADOS */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="PROTOCOLO DE AFILIACIÓN"
      >
        <form onSubmit={handleCrearSocio} className="space-y-6">
          <div className="space-y-4">
             <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <User size={14} className="text-primary" />
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Identidad Institucional</span>
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
             
             <div className="grid grid-cols-2 gap-4">
               <Input 
                 label="Nombres" required placeholder="NOMBRE"
                 value={nuevoSocio.nombre}
                 onChange={(e) => setNuevoSocio({...nuevoSocio, nombre: e.target.value.toUpperCase()})}
               />
               <Input 
                 label="Apellidos" required placeholder="APELLIDO"
                 value={nuevoSocio.apellido}
                 onChange={(e) => setNuevoSocio({...nuevoSocio, apellido: e.target.value.toUpperCase()})}
               />
             </div>
             
             <Input 
               label="Correo Electrónico" type="email" placeholder="socio@entidad.com"
               value={nuevoSocio.email}
               onChange={(e) => setNuevoSocio({...nuevoSocio, email: e.target.value.toLowerCase()})}
             />

             {/* Vehículos */}
             <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                   <div className="flex items-center gap-2">
                      <Car size={14} className="text-secondary" />
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Unidades Vinculadas</span>
                   </div>
                   <Boton type="button" variant="ghost" className="h-8 px-3 text-[9px] border-secondary/20 text-secondary font-black" onClick={addVehiculo}>
                      <Plus size={14} /> ADJUNTAR
                   </Boton>
                </div>

                <div className="space-y-3">
                  {nuevoSocio.vehiculos.map((v, i) => (
                    <div key={i} className="p-4 bg-bg-app border border-white/10 rounded-xl relative">
                      <button type="button" onClick={() => removeVehiculo(i)} className="absolute top-4 right-4 text-text-muted hover:text-danger hover:scale-110 transition-all">
                        <Trash2 size={16} />
                      </button>
                      <div className="grid grid-cols-2 gap-3">
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
             <Boton type="button" variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Abortar</Boton>
             <Boton type="submit" className="flex-[2] bg-primary text-bg-app font-black uppercase tracking-[0.2em] h-14 shadow-tactica">
                Finalizar Registro
             </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal Renovación */}
      <Modal 
        isOpen={isRenovarModalOpen} 
        onClose={() => setIsRenovarModalOpen(false)} 
        title="RENOVACIÓN DE MEMBRESÍA"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-5 bg-bg-app border border-white/5 rounded-2xl">
             <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <RefreshCw size={24} />
             </div>
             <div className="min-w-0">
                <p className="text-[10px] uppercase font-black text-primary tracking-[0.2em] mb-1">Renovación Táctica</p>
                <h4 className="text-lg font-black text-text-main italic uppercase truncate">{socioSeleccionado?.nombre_completo}</h4>
             </div>
          </div>

          <div className="space-y-3">
             <label className="text-[10px] uppercase font-black text-text-muted tracking-[0.2em] px-1 opacity-60">Periodo de Extensión</label>
             <div className="grid grid-cols-2 gap-3">
                {[1, 3, 6, 12].map(num => (
                  <button
                    key={num}
                    onClick={() => setMesesRenovacion(num)}
                    className={`h-16 rounded-xl border-2 transition-all flex flex-col items-center justify-center ${
                      mesesRenovacion === num 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'bg-black/20 border-white/5 text-text-muted hover:border-white/10'
                    }`}
                  >
                    <span className="text-xl font-black italic leading-none">{num}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-60">{num === 1 ? 'MES' : 'MESES'}</span>
                  </button>
                ))}
             </div>
          </div>

          <Boton onClick={confirmarRenovacion} className="w-full h-14 bg-primary text-bg-app font-black uppercase tracking-[0.2em] shadow-tactica">
            Confirmar Ciclo
          </Boton>
        </div>
      </Modal>
    </div>
  );
}
