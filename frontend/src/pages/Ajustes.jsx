import React, { useState, useEffect } from 'react';
import { useAuthStore, RolTipo } from '../store/auth.store';
import { 
  User, LogOut, Shield, Mail, BadgeCheck, Settings, 
  CalendarRange, ChevronRight, Phone, Lock, Save,
  UserCog, Edit3, Key, Fingerprint, AtSign, Smartphone,
  Trash2, Plus, MonitorSmartphone
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Boton } from '../components/ui/Boton';
import { Modal } from '../components/ui/Modal';
import { NavLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { Bell, BellOff, BellRing } from 'lucide-react';

export default function Ajustes() {
  const { 
    user, logout, updatePerfil, cambiarPassword, 
    getCredenciales, registrarDispositivoBiometrico, eliminarDispositivo 
  } = useAuthStore();

  const { isSubscribed, subscribeUser, error: pushError } = usePushNotifications();

  // Estados para modales
  const [activeModal, setActiveModal] = useState(null); // 'perfil', 'password', 'biometria'
  const [dispositivos, setDispositivos] = useState([]);
  const [loadingDispositivos, setLoadingDispositivos] = useState(false);
  const [nombreNuevoDispositivo, setNombreNuevoDispositivo] = useState('');

  // Estados formularios
  const [perfilData, setPerfilData] = useState({
    nombre: user?.nombre || '',
    apellido: user?.apellido || '',
    cedula: user?.cedula || '',
    email: user?.email || '',
    telefono: user?.telefono || ''
  });

  const [passwordData, setPasswordData] = useState({
    nuevaPassword: '',
    confirmarPassword: ''
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    cargarDispositivos();
  }, []);

  const cargarDispositivos = async () => {
    setLoadingDispositivos(true);
    try {
      const data = await getCredenciales();
      setDispositivos(data);
    } catch (error) {
      console.error("Error al cargar dispositivos", error);
    } finally {
      setLoadingDispositivos(false);
    }
  };

  const handleRegistrarDispositivo = async (e) => {
    e.preventDefault();
    if (!nombreNuevoDispositivo) return toast.error('Asigna un nombre al dispositivo');
    
    setIsSaving(true);
    try {
      await registrarDispositivoBiometrico(nombreNuevoDispositivo);
      toast.success('Dispositivo vinculado correctamente');
      setNombreNuevoDispositivo('');
      setActiveModal(null);
      await cargarDispositivos();
    } catch (error) {
      toast.error('Error al registrar dispositivo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEliminarDispositivo = async (id) => {
    if (!confirm('¿Seguro que deseas desvincular este dispositivo? Perderás el acceso rápido desde él.')) return;
    
    try {
      await eliminarDispositivo(id);
      toast.success('Dispositivo desvinculado');
      await cargarDispositivos();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  if (!user) return null;

  const isComandante = user.rol === RolTipo.COMANDANTE;
  const showEventos = user.rol === RolTipo.COMANDANTE || user.rol === RolTipo.ADMIN_BASE || user.rol === RolTipo.ADMIN_ENTIDAD;
  const eventosLink = user.rol === RolTipo.ADMIN_ENTIDAD ? '/entidad/eventos' : '/comando/eventos';

  const closeModals = () => {
    setActiveModal(null);
    setIsSaving(false);
    setPasswordData({ nuevaPassword: '', confirmarPassword: '' });
  };

  const handleUpdatePerfil = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const dataToSend = {
        email: perfilData.email,
        telefono: perfilData.telefono
      };

      if (isComandante) {
        dataToSend.nombre = perfilData.nombre;
        dataToSend.apellido = perfilData.apellido;
        dataToSend.cedula = perfilData.cedula;
      }

      await updatePerfil(dataToSend);
      toast.success('Información personal actualizada');
      closeModals();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordData.nuevaPassword !== passwordData.confirmarPassword) {
      return toast.error('Las contraseñas no coinciden');
    }
    
    setIsSaving(true);
    try {
      await cambiarPassword(passwordData.nuevaPassword);
      toast.success('Contraseña actualizada con éxito');
      closeModals();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error en seguridad');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-2 md:p-4 space-y-4 md:space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Visual de Perfil */}
      <section className="relative">
        <div className="h-28 md:h-48 rounded-3xl bg-gradient-to-br from-primary/30 via-bg-low to-secondary/10 border border-white/5 overflow-hidden shadow-2xl">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
        </div>

        <div className="max-w-4xl mx-auto px-2 md:px-6 -mt-12 md:-mt-16 relative z-10">
          <Card className="bg-bg-low/80 backdrop-blur-2xl border-white/10 shadow-2xl overflow-visible">
            <CardContent className="pt-0 pb-6 md:pb-10 px-4 md:px-8">
              <div className="flex flex-col items-center -mt-12 md:mt-[-4rem]">
                <div className="relative group">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-bg-app p-1 md:p-1.5 shadow-2xl group-hover:rotate-3 transition-transform duration-500 ring-4 ring-primary/20">
                    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center text-primary overflow-hidden relative border border-white/5">
                      <User size={48} className="md:w-16 md:h-16 group-hover:scale-110 transition-transform duration-500 opacity-80" />
                      {/* Badge de Seguridad */}
                      <div className="absolute bottom-2 right-2 w-6 h-6 bg-emerald-500 rounded-full border-2 border-bg-app flex items-center justify-center text-white">
                         <BadgeCheck size={14} />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 text-center">
                  <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight italic">
                    {user.nombre} {user.apellido}
                  </h1>
                  <div className="flex items-center justify-center gap-3 mt-2">
                    <span className="text-xs font-black text-primary uppercase tracking-[0.2em] opacity-80">
                      {(user?.rol || '').replace('_', ' ')}
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                    <span className="text-[10px] text-text-muted font-bold tracking-widest uppercase">Base BAGFM</span>
                  </div>
                </div>
              </div>

              {/* Grid de Información Actual (Expediente) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mt-8 md:mt-12">
                 <div className="p-3 md:p-4 rounded-2xl bg-bg-app/50 dark:bg-white/[0.02] border border-bg-high/20 dark:border-white/5 hover:border-primary/40 transition-colors group">
                    <p className="text-[9px] text-text-muted font-black uppercase tracking-widest opacity-60 mb-2">Identificación</p>
                    <div className="flex items-center gap-3">
                       <Fingerprint size={18} className="text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                       <span className="text-sm font-mono font-bold text-text-main dark:text-white">{user.cedula}</span>
                    </div>
                 </div>
                 <div className="p-3 md:p-4 rounded-2xl bg-bg-app/50 dark:bg-white/[0.02] border border-bg-high/20 dark:border-white/5 hover:border-primary/40 transition-colors group">
                    <p className="text-[9px] text-text-muted font-black uppercase tracking-widest opacity-60 mb-2">Comunicación</p>
                    <div className="flex items-center gap-3">
                       <AtSign size={18} className="text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                       <span className="text-sm font-bold text-text-main dark:text-white truncate">{user.email || 'SIN REGISTRO'}</span>
                    </div>
                 </div>
                 <div className="p-3 md:p-4 rounded-2xl bg-bg-app/50 dark:bg-white/[0.02] border border-bg-high/20 dark:border-white/5 hover:border-primary/40 transition-colors group">
                    <p className="text-[9px] text-text-muted font-black uppercase tracking-widest opacity-60 mb-2">Contacto Directo</p>
                    <div className="flex items-center gap-3">
                       <Smartphone size={18} className="text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                       <span className="text-sm font-bold text-text-main dark:text-white">{user.telefono || 'SIN REGISTRO'}</span>
                    </div>
                 </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex flex-col md:flex-row justify-center items-center gap-4 mt-8 md:mt-10">
                 <Boton 
                    onClick={() => setActiveModal('perfil')}
                    className="h-12 md:h-14 w-full md:max-w-[260px] bg-primary hover:bg-primary-dark text-bg-app border border-white/10 font-bold uppercase tracking-[0.1em] text-[10px] md:text-[11px] flex items-center justify-center gap-3 group transition-all shadow-[0_10px_20px_-5px_rgba(16,185,129,0.3)] hover:shadow-[0_15px_25px_-5px_rgba(16,185,129,0.4)]"
                 >
                    <UserCog size={18} className="group-hover:rotate-12 transition-transform" />
                    Actualizar Perfil
                 </Boton>
                 <Boton 
                    onClick={() => setActiveModal('password')}
                    className="h-12 md:h-14 w-full md:max-w-[260px] bg-[#252a3d] hover:bg-[#2f3448] text-white border border-white/5 font-bold uppercase tracking-[0.1em] text-[10px] md:text-[11px] flex items-center justify-center gap-3 group transition-all shadow-xl"
                 >
                    <Lock size={18} className="group-hover:scale-110 transition-transform" />
                    Seguridad de Acceso
                 </Boton>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Seguridad Invisible (Biometría) */}
      <section className="max-w-4xl mx-auto px-2 md:px-6 space-y-4">
        <p className="text-[10px] text-text-muted uppercase font-black tracking-[0.3em] opacity-40 ml-2">Seguridad Invisible</p>
        <Card className="bg-bg-low/40 border-white/5 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
                  <Fingerprint size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight italic">Acceso por Biometría</h4>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Dispositivos de Confianza Masivos</p>
                </div>
              </div>
              <Boton 
                className="h-10 px-6 text-[10px] font-black uppercase tracking-widest bg-primary text-bg-app border border-white/10 hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 w-full sm:w-auto"
                onClick={() => setActiveModal('biometria')}
              >
                <Plus size={16} className="mr-2" />
                Vincular Nuevo
              </Boton>
            </div>

            <div className="space-y-3">
              {loadingDispositivos ? (
                <div className="py-8 flex justify-center">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : dispositivos.length === 0 ? (
                <div className="py-10 text-center rounded-2xl border border-dashed border-white/5 bg-white/[0.01]">
                   <MonitorSmartphone size={32} className="mx-auto text-text-muted opacity-20 mb-3" />
                   <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Sin dispositivos vinculados</p>
                </div>
              ) : (
                dispositivos.map((disp, idx) => (
                  <div key={disp.id} className="group flex items-center justify-between p-4 rounded-2xl bg-bg-app/50 dark:bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all hover:translate-x-1">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-bg-app border border-white/10 flex items-center justify-center text-text-muted group-hover:text-primary transition-colors">
                        <Smartphone size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white uppercase tracking-tight">{disp.nombre_dispositivo}</p>
                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Registrado: {new Date(disp.creado_en).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleEliminarDispositivo(disp.id)}
                      className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                      title="Eliminar Dispositivo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Alertas en Tiempo Real (Push) */}
      <section className="max-w-4xl mx-auto px-2 md:px-6 space-y-4">
        <p className="text-[10px] text-text-muted uppercase font-black tracking-[0.3em] opacity-40 ml-2">Alertas Tácticas</p>
        <Card className="bg-bg-low/40 border-white/5 backdrop-blur-md group hover:border-primary/20 transition-all">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg",
                  isSubscribed 
                    ? "bg-primary/10 text-primary shadow-primary/5" 
                    : "bg-danger/10 text-danger shadow-danger/5"
                )}>
                  {isSubscribed ? <BellRing size={28} className="animate-pulse" /> : <BellOff size={28} />}
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight italic">
                    {isSubscribed ? "Notificaciones Activas" : "Notificaciones Desactivadas"}
                  </h4>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">
                    {isSubscribed ? "Recibiendo alertas de alcabala en tiempo real" : "No recibirá alertas proactivas en este dispositivo"}
                  </p>
                </div>
              </div>

              {!isSubscribed && (
                <Boton 
                  className="h-12 px-8 bg-primary text-bg-app font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 w-full sm:w-auto hover:bg-primary-dark transition-all active:scale-95"
                  onClick={async () => {
                    await subscribeUser();
                    if (!pushError) toast.success('Alertas tácticas activadas');
                    else toast.error('Error al activar alertas');
                  }}
                >
                  <Bell className="mr-2" size={16} />
                  Activar Alertas
                </Boton>
              )}
              
              {isSubscribed && (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest text-center">Enlace Operativo Estable</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>


      {/* Cerrar Sesión (Estilo Botón Eliminar) */}
      <section className="max-w-4xl mx-auto px-2 md:px-6 pt-4">
        <button 
          className="w-full h-14 bg-red-500 hover:bg-red-600 active:scale-[0.98] transition-all rounded-xl flex items-center justify-center gap-3 px-8 shadow-[0_10px_20px_-5px_rgba(239,68,68,0.4)] group border border-white/10"
          onClick={logout}
        >
          <LogOut size={18} className="text-white" />
          <span className="font-bold uppercase text-[11px] tracking-[0.1em] text-white">
            Finalizar Sesión Operativa
          </span>
        </button>
      </section>

      {/* --- MODALES --- */}

      {/* Modal de Datos Personales */}
      <Modal 
        isOpen={activeModal === 'perfil'} 
        onClose={closeModals} 
        title={isComandante ? "Gestión de Sucesión Táctica" : "Configuración de Contacto"}
        className="max-w-xl"
      >
        <form onSubmit={handleUpdatePerfil} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Datos Protegidos (Solo Comandante puede editarlos) */}
             <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Cédula</label>
                <div className="relative">
                   <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                   <input 
                      type="text"
                      disabled={!isComandante}
                      className="w-full h-12 bg-bg-app border border-white/10 focus:border-primary rounded-xl pl-12 pr-4 text-sm font-bold text-white transition-all disabled:opacity-50"
                      value={perfilData.cedula}
                      onChange={(e) => setPerfilData({...perfilData, cedula: e.target.value})}
                   />
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Nombre</label>
                <div className="relative">
                   <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                   <input 
                      type="text"
                      disabled={!isComandante}
                      className="w-full h-12 bg-bg-app border border-white/10 focus:border-primary rounded-xl pl-12 pr-4 text-sm font-bold text-white transition-all disabled:opacity-50"
                      value={perfilData.nombre}
                      onChange={(e) => setPerfilData({...perfilData, nombre: e.target.value})}
                   />
                </div>
             </div>
             <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Apellido</label>
                <div className="relative">
                   <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                   <input 
                      type="text"
                      disabled={!isComandante}
                      className="w-full h-12 bg-bg-app border border-white/10 focus:border-primary rounded-xl pl-12 pr-4 text-sm font-bold text-white transition-all disabled:opacity-50"
                      value={perfilData.apellido}
                      onChange={(e) => setPerfilData({...perfilData, apellido: e.target.value})}
                   />
                </div>
             </div>

             {/* Datos de Contacto (Editables por todos) */}
             <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Correo Electrónico</label>
                <div className="relative">
                   <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                   <input 
                      type="email"
                      className="w-full h-12 bg-bg-app border border-white/10 focus:border-emerald-500 rounded-xl pl-12 pr-4 text-sm font-bold text-white transition-all"
                      value={perfilData.email}
                      onChange={(e) => setPerfilData({...perfilData, email: e.target.value})}
                   />
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Teléfono</label>
                <div className="relative">
                   <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                   <input 
                      type="tel"
                      className="w-full h-12 bg-bg-app border border-white/10 focus:border-emerald-500 rounded-xl pl-12 pr-4 text-sm font-bold text-white transition-all"
                      value={perfilData.telefono}
                      onChange={(e) => setPerfilData({...perfilData, telefono: e.target.value})}
                   />
                </div>
             </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-white/5">
             <Boton type="button" variant="ghost" className="flex-1" onClick={closeModals}>Cancelar</Boton>
             <Boton 
                type="submit" 
                className="flex-1 bg-primary text-bg-app font-black uppercase tracking-widest text-xs flex justify-center items-center gap-2 h-12"
                disabled={isSaving}
             >
                <Save size={18} />
                {isSaving ? 'Actualizando...' : 'Guardar Cambios'}
             </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal de Password */}
      <Modal 
        isOpen={activeModal === 'password'} 
        onClose={closeModals} 
        title="Modificar Acceso Táctico"
        className="max-w-md"
      >
        <form onSubmit={handleUpdatePassword} className="space-y-6">
          <div className="space-y-2">
             <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Nueva Contraseña</label>
             <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input 
                   type="password"
                   placeholder="Mínimo 4 caracteres"
                   className="w-full h-12 bg-bg-app border border-white/10 focus:border-danger rounded-xl pl-12 pr-4 text-sm font-bold text-white transition-all"
                   value={passwordData.nuevaPassword}
                   onChange={(e) => setPasswordData({...passwordData, nuevaPassword: e.target.value})}
                   required
                />
             </div>
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Confirmar Contraseña</label>
             <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input 
                   type="password"
                   placeholder="Repita la clave"
                   className="w-full h-12 bg-bg-app border border-white/10 focus:border-danger rounded-xl pl-12 pr-4 text-sm font-bold text-white transition-all"
                   value={passwordData.confirmarPassword}
                   onChange={(e) => setPasswordData({...passwordData, confirmarPassword: e.target.value})}
                   required
                />
             </div>
          </div>
          <Boton 
            type="submit" 
            className="w-full h-14 bg-danger/10 hover:bg-danger text-danger hover:text-white border border-danger/20 font-black uppercase tracking-widest text-xs flex justify-center items-center gap-3 transition-all"
            disabled={isSaving}
          >
            <Lock size={18} />
            {isSaving ? 'Cifrando...' : 'Actualizar Acceso'}
          </Boton>
        </form>
      </Modal>

      {/* Modal de Biometría */}
      <Modal 
        isOpen={activeModal === 'biometria'} 
        onClose={closeModals} 
        title="Vínculo de Seguridad Táctica"
        className="max-w-md"
      >
        <form onSubmit={handleRegistrarDispositivo} className="space-y-6">
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 mb-6">
             <div className="flex gap-3">
                <Shield size={20} className="text-primary shrink-0" />
                <div>
                   <p className="text-xs font-bold text-white uppercase mb-1">Protección WebAuthn (Passkeys)</p>
                   <p className="text-[10px] text-text-muted leading-relaxed font-medium">Al vincular este dispositivo, el sistema solicitará tu huella, rostro o PIN local para acceder sin contraseñas. El proceso es invisible y seguro.</p>
                </div>
             </div>
          </div>

          <div className="space-y-2">
             <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Nombre para este Dispositivo</label>
             <div className="relative">
                <MonitorSmartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input 
                   type="text"
                   placeholder="Ej: Mi iPhone 15, Laptop Oficina"
                   className="w-full h-12 bg-bg-app border border-white/10 focus:border-primary rounded-xl pl-12 pr-4 text-sm font-bold text-white transition-all"
                   value={nombreNuevoDispositivo}
                   onChange={(e) => setNombreNuevoDispositivo(e.target.value)}
                   required
                />
             </div>
          </div>
          
          <Boton 
            type="submit" 
            className="w-full h-14 bg-primary text-bg-app font-black uppercase tracking-widest text-xs flex justify-center items-center gap-3 transition-all"
            disabled={isSaving}
          >
            <Fingerprint size={18} />
            {isSaving ? 'Vinculando Hardware...' : 'Activar Seguridad Invisible'}
          </Boton>
        </form>
      </Modal>

    </div>
  );
}
