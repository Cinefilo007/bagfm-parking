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
  FileUp
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
    entidad_id: user?.entidad_id
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
      setNuevoSocio({ cedula: '', nombre: '', apellido: '', email: '', telefono: '', entidad_id: user.entidad_id });
      fetchSocios();
    } catch (err) {
      console.error("Error creando socio", err);
    }
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
                 <UserPlus size={14} />
                 REGISTRAR
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
        title="Nuevo Registro de Miembro"
      >
        <form onSubmit={handleCrearSocio} className="space-y-4">
           <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Cédula"
                icon={<Hash size={16} />}
                required
                placeholder="V12345678"
                value={nuevoSocio.cedula}
                onChange={(e) => setNuevoSocio({...nuevoSocio, cedula: e.target.value.toUpperCase()})}
              />
              <Input 
                label="Teléfono"
                icon={<Phone size={16} />}
                placeholder="0412..."
                value={nuevoSocio.telefono}
                onChange={(e) => setNuevoSocio({...nuevoSocio, telefono: e.target.value})}
              />
           </div>
           
           <Input 
             label="Nombre"
             icon={<User size={16} />}
             required
             placeholder="Ej: MARÍA"
             value={nuevoSocio.nombre}
             onChange={(e) => setNuevoSocio({...nuevoSocio, nombre: e.target.value.toUpperCase()})}
           />
           
           <Input 
             label="Apellido"
             icon={<User size={16} />}
             required
             placeholder="Ej: DELGADO"
             value={nuevoSocio.apellido}
             onChange={(e) => setNuevoSocio({...nuevoSocio, apellido: e.target.value.toUpperCase()})}
           />
           
           <Input 
             label="Correo Electrónico"
             type="email"
             icon={<Mail size={16} />}
             placeholder="maria@ejemplo.com"
             value={nuevoSocio.email}
             onChange={(e) => setNuevoSocio({...nuevoSocio, email: e.target.value.toLowerCase()})}
           />

           <div className="pt-4">
             <Boton type="submit" className="w-full">
                COMPLETAR REGISTRO
             </Boton>
           </div>
        </form>
      </Modal>
    </div>
  );
}
