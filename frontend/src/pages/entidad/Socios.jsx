import React, { useState, useEffect } from 'react';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { Boton } from '../../components/ui/Boton';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { SocioCard } from '../../components/entidades/SocioCard';
import { useAuthStore } from '../../store/auth.store';
import { 
  Users, 
  UserPlus, 
  Hash, 
  User, 
  Mail, 
  Phone,
  Search,
  FileUp,
  Car,
  Plus,
  Trash2,
  Download,
  Info
} from 'lucide-react';
import { useRef } from 'react';
import api from '../../services/api';

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

  const fetchSocios = async () => {
    if (!user?.entidad_id) return;
    setLoading(true);
    try {
      const res = await api.get(`/socios/entidad/${user.entidad_id}`);
      setSocios(res.data);
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
        cedula: '', 
        nombre: '', 
        apellido: '', 
        email: '', 
        telefono: '', 
        entidad_id: user.entidad_id,
        vehiculos: []
      });
      fetchSocios();
    } catch (err) {
      console.error("Error creando socio", err);
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
      console.error("Error bajando plantilla", err);
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

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      const res = await api.post(`/socios/importar?entidad_id=${user.entidad_id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const { exitosos, errores, total } = res.data;
      alert(`IMPORTACIÓN FINALIZADA:\n- Total: ${total}\n- Exitosos: ${exitosos}\n- Errores: ${errores.length}`);
      
      if (errores.length > 0) {
        console.table(errores);
      }
      
      fetchSocios();
    } catch (err) {
        console.error("Error importando excel", err);
        alert("Error crítico al procesar el archivo. Verifique el formato.");
    } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const sociosFiltrados = socios.filter(s => 
    s.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.cedula.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-bg-app">
      <Header 
        titulo="Gestión de Miembros" 
        subtitle={user?.entidad_nombre || 'CONCESIÓN CIVIL'} 
      />

      <main className="px-4 py-6 max-w-lg mx-auto pb-24">
        {/* Buscador Táctico */}
        <div className="mb-6">
           <Input 
             placeholder="BUSCAR POR NOMBRE O CÉDULA..."
             icon={<Search size={18} />}
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
           />
        </div>

        {/* Lista de Socios */}
        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-2">
           <h3 className="text-text-main font-display font-bold uppercase tracking-widest text-sm">
             Personal ({sociosFiltrados.length})
           </h3>
            <div className="flex gap-2">
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 className="hidden" 
                 accept=".xlsx"
                 onChange={handleImportExcel}
               />
               <Boton 
                 variant="ghost" 
                 className="h-8 px-3 text-[10px] gap-1.5 border-white/10 text-white/40 hover:text-primary transition-colors"
                 onClick={handleDownloadTemplate}
                 title="Descargar Plantilla"
               >
                 <Download size={14} />
               </Boton>
               <Boton 
                 variant="ghost" 
                 className="h-8 px-3 text-[10px] gap-1.5 border-white/10 text-text-muted"
                 onClick={() => fileInputRef.current?.click()}
               >
                 <FileUp size={14} />
                 EXCEL
               </Boton>
               <Boton 
                 variant="ghost" 
                 className="h-8 px-3 text-[10px] gap-1.5 border-primary/20 text-primary"
                 onClick={() => setIsModalOpen(true)}
               >
                 <Plus size={14} />
                 NUEVO
               </Boton>
            </div>
        </div>

        {loading ? (
           <p className="text-center text-text-muted text-[10px] uppercase tracking-widest animate-pulse">Sincronizando Base de Datos...</p>
        ) : (
          <div className="space-y-4">
            {sociosFiltrados.map(socio => (
              <SocioCard key={socio.id} socio={socio} />
            ))}

            {sociosFiltrados.length === 0 && (
              <div className="text-center p-12 border border-dashed border-white/10 rounded-2xl">
                 <Users size={32} className="mx-auto text-text-muted/30 mb-4" />
                 <p className="text-text-muted text-xs uppercase tracking-widest font-medium">
                   {searchTerm ? 'No se encontraron resultados' : 'No hay socios registrados'}
                 </p>
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav />

      {/* Modal Registro */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Registro de Miembro"
      >
        <form onSubmit={handleCrearSocio} className="max-h-[70vh] overflow-y-auto no-scrollbar pr-1">
          <div className="space-y-4 pb-6">
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-4">
              <h4 className="text-[10px] uppercase font-bold text-primary flex items-center gap-2">
                <User size={12} /> Datos Personales
              </h4>
              <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Cédula"
                    icon={<Hash size={14} />}
                    required
                    placeholder="V12345678"
                    value={nuevoSocio.cedula}
                    onChange={(e) => setNuevoSocio({...nuevoSocio, cedula: e.target.value.toUpperCase()})}
                  />
                  <Input 
                    label="Teléfono"
                    icon={<Phone size={14} />}
                    placeholder="0412..."
                    value={nuevoSocio.telefono}
                    onChange={(e) => setNuevoSocio({...nuevoSocio, telefono: e.target.value})}
                  />
              </div>
              
              <Input 
                label="Nombre"
                icon={<User size={14} />}
                required
                placeholder="Ej: MARÍA"
                value={nuevoSocio.nombre}
                onChange={(e) => setNuevoSocio({...nuevoSocio, nombre: e.target.value.toUpperCase()})}
              />
              
              <Input 
                label="Apellido"
                icon={<User size={14} />}
                required
                placeholder="Ej: DELGADO"
                value={nuevoSocio.apellido}
                onChange={(e) => setNuevoSocio({...nuevoSocio, apellido: e.target.value.toUpperCase()})}
              />
              
              <Input 
                label="Correo (Opcional)"
                type="email"
                icon={<Mail size={14} />}
                placeholder="maria@ejemplo.com"
                value={nuevoSocio.email}
                onChange={(e) => setNuevoSocio({...nuevoSocio, email: e.target.value.toLowerCase()})}
              />
            </div>

            {/* Vehículos */}
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] uppercase font-bold text-primary flex items-center gap-2">
                  <Car size={12} /> Vehículos Autorizados
                </h4>
                <Boton 
                  type="button" 
                  variant="ghost" 
                  className="h-6 px-2 text-[9px] border-primary/20 text-primary"
                  onClick={addVehiculo}
                >
                  <Plus size={12} /> AÑADIR
                </Boton>
              </div>

              {nuevoSocio.vehiculos.length === 0 ? (
                <p className="text-[10px] text-text-muted text-center py-2 italic">Sin vehículos registrados</p>
              ) : (
                <div className="space-y-4">
                  {nuevoSocio.vehiculos.map((v, i) => (
                    <div key={i} className="p-3 bg-black/20 rounded-lg relative border border-white/5">
                      <button 
                        type="button"
                        onClick={() => removeVehiculo(i)}
                        className="absolute top-2 right-2 text-white/20 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="grid grid-cols-2 gap-3">
                        <Input 
                          label="Placa"
                          placeholder="ABC123"
                          value={v.placa}
                          onChange={(e) => updateVehiculo(i, 'placa', e.target.value)}
                        />
                        <Input 
                          label="Marca"
                          placeholder="TOYOTA"
                          value={v.marca}
                          onChange={(e) => updateVehiculo(i, 'marca', e.target.value)}
                        />
                        <Input 
                          label="Modelo"
                          placeholder="COROLLA"
                          value={v.modelo}
                          onChange={(e) => updateVehiculo(i, 'modelo', e.target.value)}
                        />
                         <Input 
                          label="Color"
                          placeholder="PLATA"
                          value={v.color}
                          onChange={(e) => updateVehiculo(i, 'color', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 bg-bg-card pt-2 pb-2">
            <Boton type="submit" className="w-full">
               GUARDAR MIEMBRO
            </Boton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
