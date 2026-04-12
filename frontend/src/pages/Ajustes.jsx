import React, { useState } from 'react';
import { useAuthStore, RolTipo } from '../store/auth.store';
import { 
  User, LogOut, Shield, Mail, BadgeCheck, Settings, 
  CalendarRange, ChevronRight, Phone, Lock, Save,
  UserCog, Info, Edit3, Key
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Boton } from '../components/ui/Boton';
import { Modal } from '../components/ui/Modal';
import { NavLink } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Ajustes() {
  const { user, logout, updatePerfil, cambiarPassword } = useAuthStore();

  // Estados para controlar los modales
  const [activeModal, setActiveModal] = useState(null); // 'perfil', 'identidad', 'password'

  // Estados locales para los formularios
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

      if (isComandante && activeModal === 'identidad') {
        dataToSend.nombre = perfilData.nombre;
        dataToSend.apellido = perfilData.apellido;
        dataToSend.cedula = perfilData.cedula;
      }

      await updatePerfil(dataToSend);
      toast.success('Información actualizada correctamente');
      closeModals();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error en la actualización');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordData.nuevaPassword !== passwordData.confirmarPassword) {
      return toast.error('Las contraseñas no coinciden');
    }
    if (passwordData.nuevaPassword.length < 4) {
      return toast.error('La contraseña debe tener al menos 4 caracteres');
    }

    setIsSaving(true);
    try {
      await cambiarPassword(passwordData.nuevaPassword);
      toast.success('Contraseña actualizada con éxito');
      closeModals();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cambiar contraseña');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-app text-text-main font-sans selection:bg-primary/30 pb-32">
      {/* Header Táctico Aegis v2 */}
      <div className="bg-bg-low/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
              <Settings size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight italic">Panel de Ajustes</h1>
              <p className="text-[10px] text-text-muted font-bold tracking-[0.3em] uppercase opacity-60">Terminal de Autogestión Táctica</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-white uppercase">{user.nombre} {user.apellido}</p>
                <p className="text-[9px] text-primary font-black tracking-widest uppercase">{user.rol.replace('_', ' ')}</p>
             </div>
             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-primary-dark p-[1px]">
                <div className="w-full h-full rounded-full bg-bg-low flex items-center justify-center text-white overflow-hidden border border-white/10">
                   <User size={20} />
                </div>
             </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Columna Izquierda: Información del Usuario (Expediente) */}
        <div className="lg:col-span-8 space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
          
          {/* Tarjeta de Identidad */}
          <Card className="bg-bg-low/40 border-white/5 backdrop-blur-md overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary/40 group-hover:bg-primary transition-colors" />
            <CardHeader className="border-b border-white/5 bg-white/[0.02] flex flex-row items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <UserCog className="text-primary" size={18} />
                <CardTitle className="text-sm font-black uppercase tracking-widest italic">Identidad Táctica</CardTitle>
              </div>
              {isComandante && (
                <Boton 
                  onClick={() => setActiveModal('identidad')}
                  variant="ghost" 
                  className="h-8 px-3 text-[10px] font-black uppercase tracking-widest bg-primary/5 hover:bg-primary/20 text-primary border border-primary/10 rounded-lg"
                >
                  <Edit3 size={12} className="mr-2" />
                  Sucesión
                </Boton>
              )}
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className="space-y-1">
                  <p className="text-[8px] text-text-muted font-black uppercase tracking-widest opacity-50">Cédula / ID</p>
                  <p className="text-md font-mono text-white flex items-center gap-2">
                    <Shield size={14} className="text-primary/40" />
                    {user.cedula}
                  </p>
               </div>
               <div className="space-y-1">
                  <p className="text-[8px] text-text-muted font-black uppercase tracking-widest opacity-50">Nombres</p>
                  <p className="text-md font-bold text-white uppercase italic">{user.nombre}</p>
               </div>
               <div className="space-y-1">
                  <p className="text-[8px] text-text-muted font-black uppercase tracking-widest opacity-50">Apellidos</p>
                  <p className="text-md font-bold text-white uppercase italic">{user.apellido}</p>
               </div>
            </CardContent>
          </Card>

          {/* Tarjeta de Contacto */}
          <Card className="bg-bg-low/40 border-white/5 backdrop-blur-md overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/40 group-hover:bg-emerald-500 transition-colors" />
            <CardHeader className="border-b border-white/5 bg-white/[0.02] flex flex-row items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Mail className="text-emerald-400" size={18} />
                <CardTitle className="text-sm font-black uppercase tracking-widest italic">Información de Contacto</CardTitle>
              </div>
              <Boton 
                onClick={() => setActiveModal('perfil')}
                variant="ghost" 
                className="h-8 px-3 text-[10px] font-black uppercase tracking-widest bg-emerald-500/5 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/10 rounded-lg"
              >
                <Edit3 size={12} className="mr-2" />
                Actualizar
              </Boton>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-1">
                  <p className="text-[8px] text-text-muted font-black uppercase tracking-widest opacity-50">Correo Institucional</p>
                  <p className="text-md font-bold text-white flex items-center gap-3">
                    <Mail size={16} className="text-emerald-500/40" />
                    {user.email || 'NO REGISTRADO'}
                  </p>
               </div>
               <div className="space-y-1">
                  <p className="text-[8px] text-text-muted font-black uppercase tracking-widest opacity-50">Teléfono Móvil</p>
                  <p className="text-md font-bold text-white flex items-center gap-3">
                    <Phone size={16} className="text-emerald-500/40" />
                    {user.telefono || 'NO REGISTRADO'}
                  </p>
               </div>
            </CardContent>
          </Card>

          {/* Sección Informativa Táctica */}
          <div className="p-6 bg-gradient-to-r from-primary/5 to-transparent border border-primary/10 rounded-2xl flex gap-4 items-center">
             <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Info size={24} />
             </div>
             <div>
                <h4 className="text-xs font-black uppercase tracking-widest italic text-primary">Protocolo de Privacidad Táctica</h4>
                <p className="text-[10px] text-text-muted font-medium mt-1 leading-relaxed">
                   Sus datos están cifrados bajo el estándar AEGIS. Solo el Comandante posee privilegios para gestionar el relevo de cargo a través de la actualización de identidad.
                </p>
             </div>
          </div>

        </div>

        {/* Columna Derecha: Accesos de Seguridad */}
        <div className="lg:col-span-4 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          
          <Card className="bg-bg-low/40 border-white/5 backdrop-blur-md overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-1 h-full bg-danger/40 group-hover:bg-danger transition-colors" />
            <CardHeader className="border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <Lock className="text-danger" size={18} />
                <CardTitle className="text-sm font-black uppercase tracking-widest italic">Seguridad de Acceso</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
               <p className="text-[10px] text-text-muted font-bold uppercase tracking-tight italic">Contraseña y Credenciales</p>
               <Boton 
                onClick={() => setActiveModal('password')}
                className="w-full h-12 bg-danger/10 hover:bg-danger text-danger hover:text-white border border-danger/20 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all"
               >
                 <Key size={16} />
                 Modificar Contraseña
               </Boton>
            </CardContent>
          </Card>

          {/* Accesos Rápidos Tácticos */}
          {showEventos && (
            <NavLink to={eventosLink}>
              <Card className="hover:bg-primary/5 border-white/5 transition-all group overflow-hidden relative active:scale-95 cursor-pointer">
                <div className="absolute -top-4 -right-4 text-primary/10 rotate-12 group-hover:rotate-0 transition-transform">
                  <CalendarRange size={120} />
                </div>
                <CardContent className="p-6 flex flex-col gap-4 relative">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <CalendarRange size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-tight italic">Panel de Eventos</h4>
                    <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest mt-1">Gestión Masiva FL-08</p>
                  </div>
                  <ChevronRight size={20} className="absolute right-6 top-1/2 -translate-y-1/2 text-text-muted group-hover:translate-x-1 transition-transform" />
                </CardContent>
              </Card>
            </NavLink>
          )}

          <Boton 
            onClick={logout}
            variant="ghost" 
            className="w-full h-14 border-white/5 text-text-muted hover:bg-danger/10 hover:text-danger group rounded-2xl flex items-center justify-between px-6"
          >
            <span className="flex items-center gap-3 font-black uppercase text-[10px] tracking-widest">
              <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
              Finalizar Sesión
            </span>
            <ChevronRight size={18} />
          </Boton>

        </div>
      </main>

      {/* FOOTER FIXO */}
      <footer className="fixed bottom-0 left-0 w-full bg-bg-app/90 backdrop-blur-md border-t border-white/5 py-3 z-30">
        <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <p className="text-[8px] text-text-muted uppercase tracking-[0.4em] font-black opacity-40">
                AEGIS TACTICAL SYSTEM // V4.2.1
             </p>
          </div>
          <p className="text-[8px] text-text-muted italic flex items-center gap-2 font-bold opacity-30">
            CONFIDENCIALIDAD NIVEL 4
          </p>
        </div>
      </footer>

      {/* --- MODALES --- */}

      {/* Modal de Identidad / Sucesión */}
      <Modal 
        isOpen={activeModal === 'identidad'} 
        onClose={closeModals} 
        title="Protocolo de Sucesión de Mando"
        className="max-w-2xl"
      >
        <form onSubmit={handleUpdatePerfil} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Cédula del Titular</label>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input 
                  type="text"
                  className="w-full h-12 bg-bg-app border border-white/10 focus:border-primary rounded-xl pl-12 pr-4 text-sm font-bold text-white transition-all shadow-inner"
                  value={perfilData.cedula}
                  onChange={(e) => setPerfilData({...perfilData, cedula: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Nombre del Sucesor</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input 
                  type="text"
                  className="w-full h-12 bg-bg-app border border-white/10 focus:border-primary rounded-xl pl-12 pr-4 text-sm font-bold text-white transition-all shadow-inner"
                  value={perfilData.nombre}
                  onChange={(e) => setPerfilData({...perfilData, nombre: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Apellidos del Sucesor</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input 
                  type="text"
                  className="w-full h-12 bg-bg-app border border-white/10 focus:border-primary rounded-xl pl-12 pr-4 text-sm font-bold text-white transition-all shadow-inner"
                  value={perfilData.apellido}
                  onChange={(e) => setPerfilData({...perfilData, apellido: e.target.value})}
                  required
                />
              </div>
            </div>
          </div>
          <div className="flex gap-4 pt-4 border-t border-white/5">
             <Boton type="button" variant="ghost" className="flex-1 h-12 text-xs font-bold uppercase tracking-widest" onClick={closeModals}>Cancelar</Boton>
             <Boton 
                type="submit" 
                className="flex-1 h-12 bg-primary text-bg-app font-black uppercase tracking-widest text-xs flex justify-center items-center gap-2"
                disabled={isSaving}
             >
                <Save size={18} />
                {isSaving ? 'Actualizando...' : 'Confirmar Relevo'}
             </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal de Contacto */}
      <Modal 
        isOpen={activeModal === 'perfil'} 
        onClose={closeModals} 
        title="Actualización de Comunicación"
        className="max-w-lg"
      >
        <form onSubmit={handleUpdatePerfil} className="space-y-6">
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
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Teléfono Móvil</label>
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
          <Boton 
            type="submit" 
            className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-bg-app font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
            disabled={isSaving}
          >
            <Save size={18} />
            {isSaving ? 'Sincronizando...' : 'Sincronizar Datos'}
          </Boton>
        </form>
      </Modal>

      {/* Modal de Password */}
      <Modal 
        isOpen={activeModal === 'password'} 
        onClose={closeModals} 
        title="Modificación de Acceso Táctico"
        className="max-w-md"
      >
        <form onSubmit={handleUpdatePassword} className="space-y-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Nueva Clave de Acceso</label>
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
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Verificación de Clave</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input 
                  type="password"
                  placeholder="Mismo valor arriba"
                  className="w-full h-12 bg-bg-app border border-white/10 focus:border-danger rounded-xl pl-12 pr-4 text-sm font-bold text-white transition-all"
                  value={passwordData.confirmarPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmarPassword: e.target.value})}
                  required
                />
              </div>
            </div>
          </div>
          <Boton 
            type="submit" 
            className="w-full h-12 bg-danger/20 hover:bg-danger text-danger hover:text-white border border-danger/20 font-black uppercase tracking-widest text-xs flex justify-center items-center gap-3 transition-colors"
            disabled={isSaving}
          >
            <Save size={18} />
            {isSaving ? 'Actualizando...' : 'Cifrar Nueva Clave'}
          </Boton>
        </form>
      </Modal>

    </div>
  );
}
