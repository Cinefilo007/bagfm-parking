import React, { useState } from 'react';
import { useAuthStore, RolTipo } from '../store/auth.store';
import { 
  User, LogOut, Shield, Mail, BadgeCheck, Settings, 
  CalendarRange, ChevronRight, Phone, Lock, Save,
  UserCog, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Boton } from '../components/ui/Boton';
import { NavLink } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Ajustes() {
  const { user, logout, updatePerfil, cambiarPassword } = useAuthStore();

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

  const [isSavingPerfil, setIsSavingPerfil] = useState(false);
  const [isSavingPass, setIsSavingPass] = useState(false);

  if (!user) return null;

  const isComandante = user.rol === RolTipo.COMANDANTE;
  const showEventos = user.rol === RolTipo.COMANDANTE || user.rol === RolTipo.ADMIN_BASE || user.rol === RolTipo.ADMIN_ENTIDAD;
  const eventosLink = user.rol === RolTipo.ADMIN_ENTIDAD ? '/entidad/eventos' : '/comando/eventos';

  const handleUpdatePerfil = async (e) => {
    e.preventDefault();
    setIsSavingPerfil(true);
    try {
      // Filtrar datos: si no es comandante, el backend ignorará cedula/nombre/apellido
      // pero aquí los enviamos de todos modos si cambiaron (o solo enviamos los permitidos)
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
      toast.success('Perfil actualizado correctamente');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar perfil');
    } finally {
      setIsSavingPerfil(false);
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

    setIsSavingPass(true);
    try {
      await cambiarPassword(passwordData.nuevaPassword);
      toast.success('Contraseña actualizada con éxito');
      setPasswordData({ nuevaPassword: '', confirmarPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cambiar contraseña');
    } finally {
      setIsSavingPass(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-app text-text-main font-sans selection:bg-primary/30">
      {/* Header Táctico Aegis v2 */}
      <div className="bg-bg-low/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
              <Settings size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight italic">Configuración Personal</h1>
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

      <main className="max-w-[1400px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 pb-32">
        
        {/* Columna Izquierda: Identidad y Contacto */}
        <div className="lg:col-span-7 space-y-8">
          
          <form onSubmit={handleUpdatePerfil} className="space-y-6">
            <Card className="bg-bg-low/40 border-white/5 backdrop-blur-md overflow-hidden relative group">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-focus-within:bg-primary transition-colors" />
              <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserCog className="text-primary" size={20} />
                    <CardTitle className="text-sm font-black uppercase tracking-widest italic">Identidad Táctica</CardTitle>
                  </div>
                  {isComandante ? (
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold tracking-tighter uppercase">Editable (Sucesión)</span>
                  ) : (
                    <span className="text-[9px] bg-white/5 text-text-muted px-2 py-0.5 rounded-full border border-white/10 font-bold tracking-tighter uppercase">Solo Lectura</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Cédula / Identificación</label>
                    <div className="relative">
                      <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                      <input 
                        type="text"
                        disabled={!isComandante}
                        className={`w-full h-12 bg-bg-app/50 border ${!isComandante ? 'border-transparent' : 'border-white/10 focus:border-primary'} rounded-xl pl-12 pr-4 text-sm font-bold text-white transition-all disabled:opacity-50`}
                        value={perfilData.cedula}
                        onChange={(e) => setPerfilData({...perfilData, cedula: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Primer Nombre</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                      <input 
                        type="text"
                        disabled={!isComandante}
                        className={`w-full h-12 bg-bg-app/50 border ${!isComandante ? 'border-transparent' : 'border-white/10 focus:border-primary'} rounded-xl pl-12 pr-4 text-sm font-bold text-white transition-all disabled:opacity-50`}
                        value={perfilData.nombre}
                        onChange={(e) => setPerfilData({...perfilData, nombre: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Apellido Completo</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                      <input 
                        type="text"
                        disabled={!isComandante}
                        className={`w-full h-12 bg-bg-app/50 border ${!isComandante ? 'border-transparent' : 'border-white/10 focus:border-primary'} rounded-xl pl-12 pr-4 text-sm font-bold text-white transition-all disabled:opacity-50`}
                        value={perfilData.apellido}
                        onChange={(e) => setPerfilData({...perfilData, apellido: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {!isComandante && (
                  <div className="p-3 bg-white/5 rounded-xl flex gap-3 text-text-muted border border-white/5">
                    <Info size={18} className="shrink-0 text-primary" />
                    <p className="text-[10px] font-bold italic leading-relaxed">
                      Los datos de identidad core están bloqueados por protocolo de seguridad. Solo el Comandante puede modificarlos para fines de sucesión de cargo.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-bg-low/40 border-white/5 backdrop-blur-md overflow-hidden relative group">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50 group-focus-within:bg-emerald-500 transition-colors" />
              <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <Mail className="text-emerald-400" size={20} />
                  <CardTitle className="text-sm font-black uppercase tracking-widest italic">Contacto y Comunicación</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Correo Electrónico</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                      <input 
                        type="email"
                        placeholder="ejemplo@bagfm.mil"
                        className="w-full h-12 bg-bg-app/50 border border-white/10 focus:border-emerald-500 rounded-xl pl-12 pr-4 text-sm font-bold text-white transition-all"
                        value={perfilData.email}
                        onChange={(e) => setPerfilData({...perfilData, email: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Teléfono de Contacto</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                      <input 
                        type="tel"
                        placeholder="+58 4XX XXXXXXX"
                        className="w-full h-12 bg-bg-app/50 border border-white/10 focus:border-emerald-500 rounded-xl pl-12 pr-4 text-sm font-bold text-white transition-all"
                        value={perfilData.telefono}
                        onChange={(e) => setPerfilData({...perfilData, telefono: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Boton 
                    type="submit" 
                    className="h-12 px-8 bg-emerald-500 hover:bg-emerald-400 text-bg-app font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/10"
                    disabled={isSavingPerfil}
                  >
                    <Save size={18} />
                    {isSavingPerfil ? 'Sincronizando...' : 'Guardar Perfil'}
                  </Boton>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Columna Derecha: Seguridad y Accesos Rápidos */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Cambio de Contraseña */}
          <form onSubmit={handleUpdatePassword}>
            <Card className="bg-bg-low/40 border-white/5 backdrop-blur-md overflow-hidden relative group">
              <div className="absolute top-0 left-0 w-1 h-full bg-danger/50 group-focus-within:bg-danger transition-colors" />
              <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <Lock className="text-danger" size={20} />
                  <CardTitle className="text-sm font-black uppercase tracking-widest italic">Seguridad y Credenciales</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Nueva Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                      <input 
                        type="password"
                        placeholder="********"
                        className="w-full h-12 bg-bg-app/50 border border-white/10 focus:border-danger rounded-xl pl-12 pr-4 text-sm font-bold text-white transition-all"
                        value={passwordData.nuevaPassword}
                        onChange={(e) => setPasswordData({...passwordData, nuevaPassword: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Confirmar Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                      <input 
                        type="password"
                        placeholder="********"
                        className="w-full h-12 bg-bg-app/50 border border-white/10 focus:border-danger rounded-xl pl-12 pr-4 text-sm font-bold text-white transition-all"
                        value={passwordData.confirmarPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmarPassword: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Boton 
                    type="submit" 
                    className="w-full h-12 bg-danger/10 hover:bg-danger text-danger hover:text-white border border-danger/20 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all"
                    disabled={isSavingPass}
                  >
                    <Save size={18} />
                    {isSavingPass ? 'Procesando...' : 'Actualizar Credencial'}
                  </Boton>
                </div>
              </CardContent>
            </Card>
          </form>

          {/* Acceso Rápido a Eventos */}
          {showEventos && (
            <NavLink to={eventosLink}>
              <Card className="hover:bg-primary/5 border-white/5 transition-all group overflow-hidden relative active:scale-95">
                <div className="absolute top-0 right-0 p-2 text-primary/20 rotate-12 group-hover:rotate-0 transition-transform">
                  <CalendarRange size={100} />
                </div>
                <CardContent className="p-6 flex items-center justify-between relative">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-lg shadow-primary/5">
                      <CalendarRange size={28} />
                    </div>
                    <div>
                      <h4 className="text-md font-black text-white uppercase tracking-tight italic">Mando de Eventos</h4>
                      <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Protocolo FL-08 Activo</p>
                    </div>
                  </div>
                  <ChevronRight size={24} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                </CardContent>
              </Card>
            </NavLink>
          )}

          {/* Cerrar Sesión */}
          <Card className="bg-danger/5 border-danger/20">
             <CardContent className="p-6">
                <Boton 
                  variant="ghost" 
                  className="w-full h-14 border-danger/10 text-danger hover:bg-danger/10 hover:text-danger group rounded-2xl flex items-center justify-between"
                  onClick={logout}
                >
                  <span className="flex items-center gap-3 font-black uppercase text-xs tracking-widest">
                    <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                    Finalizar Sesión Activa
                  </span>
                  <ChevronRight size={20} />
                </Boton>
             </CardContent>
          </Card>

        </div>
      </main>

      <footer className="fixed bottom-0 left-0 w-full bg-bg-app/80 backdrop-blur-md border-t border-white/5 py-4 z-30">
        <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between">
          <p className="text-[9px] text-text-muted uppercase tracking-[0.3em] font-black opacity-40">
            AEGIS TACTICAL SYSTEM // V4.2.1
          </p>
          <p className="text-[9px] text-text-muted italic flex items-center gap-2 font-bold opacity-40">
            <Shield size={10} />
            CONEXIÓN CIFRADA PUNTO A PUNTO
          </p>
        </div>
      </footer>
    </div>
  );
}
