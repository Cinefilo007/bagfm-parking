import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, LogIn, LogOut, AlertTriangle, 
  ShieldCheck, ClipboardList, Info, 
  UserPlus, CheckCircle2, ShieldAlert,
  Zap, Activity, ChevronRight, Shield,
  Car, RefreshCw, Clock
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuthStore } from '../../store/auth.store';
import { useUIStore } from '../../store/ui.store';
import { Card, CardContent } from '../../components/ui/Card';
import { Boton } from '../../components/ui/Boton';
import { Badge } from '../../components/ui/Badge';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { comandoService } from '../../services/comando.service';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';

const DashboardAlcabala = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { lockNavigation } = useUIStore();
    const { lastNotification } = useNotifications();
    
    const [situacion, setSituacion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ entradas: 0, salidas: 0, infracciones: 0 });

    const fetchSituacion = React.useCallback(async (showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            const data = await comandoService.getMiSituacion();
            setSituacion(data);
            if (data.stats) setStats(data.stats);
            lockNavigation(!data.identificado);
        } catch (error) {
            console.error('Error sincronizando situación:', error);
        } finally {
            setLoading(false);
        }
    }, [lockNavigation]);

    useEffect(() => {
        fetchSituacion(true);
        return () => lockNavigation(false);
    }, [fetchSituacion, lockNavigation]);

    useEffect(() => {
        if (situacion?.identificado) {
            const interval = setInterval(() => fetchSituacion(false), 15000);
            return () => clearInterval(interval);
        }
    }, [situacion?.identificado, fetchSituacion]);

    const handleIdentificar = async (formDatos) => {
        try {
            await comandoService.identificarGuardia({
                punto_id: situacion.punto.id,
                ...formDatos
            });
            toast.success('Protocolo de identidad verificado. Turno iniciado.');
            fetchSituacion();
        } catch (error) {
            toast.error('Error en validación de identidad');
        }
    };

    const handleIniciarEscaneo = (tipo) => {
        navigate(`/alcabala/scanner?tipo=${tipo}`);
    }

    if (loading) return (
        <div className="min-h-screen bg-bg-app flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Zap className="text-primary animate-pulse" size={48} />
                <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.4em]">Sincronizando Sistema...</p>
            </div>
        </div>
    );

    // SEGURIDAD: Si no hay situación (error 500) o no está identificado, NO mostrar el dashboard
    if (!situacion) {
        return (
            <div className="min-h-screen bg-bg-app flex flex-col items-center justify-center p-6 text-center">
                <ShieldAlert size={64} className="text-danger mb-6 animate-pulse" />
                <h2 className="text-2xl font-black text-text-main uppercase italic mb-2">Error de Sincronización</h2>
                <p className="text-text-muted text-xs font-bold uppercase tracking-[0.2em] max-w-xs mx-auto mb-8">
                    No se pudo validar el estado del punto de acceso con el centro de mando.
                </p>
                <Boton onClick={() => fetchSituacion(true)} className="h-12 px-8 rounded-xl gap-2 font-black uppercase tracking-widest">
                    <RefreshCw size={18} /> Reintentar Conexión
                </Boton>
            </div>
        );
    }

    if (!situacion.identificado) {
        return <ModuloIdentificacion punto={situacion.punto} authUser={user} onConfirm={handleIdentificar} />;
    }

    return (
        <div className="p-4 md:p-6 space-y-6 pb-24 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Cabecera Táctica Estandarizada */}
            <header className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-bg-card/30 p-4 md:p-6 rounded-[2rem] border border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl shrink-0 border border-primary/20 shadow-lg shadow-primary/5">
                        <Shield className="text-primary" size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-text-main tracking-tighter uppercase italic">
                            {situacion?.punto?.nombre || 'Terminal Alcabala'}
                        </h1>
                        <p className="text-text-muted text-[10px] md:text-xs mt-0.5 flex items-center gap-1.5 font-black uppercase tracking-[0.2em]">
                            <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
                            Puesto de control y acceso
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex flex-col items-end mr-4">
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest opacity-40">Estado del Sistema</span>
                        <span className="text-xs font-black text-success uppercase italic">Operativo // Aegis v4.2</span>
                    </div>
                    <Boton variant="outline" className="h-12 px-6 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border-white/10 gap-2 bg-white/5">
                        <Activity size={18} className="text-primary" />
                        Live
                    </Boton>
                </div>
            </header>
            
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                
                {/* LADO IZQUIERDO: Control y Métricas (8/12) */}
                <div className="xl:col-span-8 flex flex-col gap-8">
                    
                    {/* Banner de Operador - Rediseño más compacto y elegante */}
                    <Card className="bg-gradient-to-br from-bg-card to-bg-card/40 border-primary/10 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative overflow-hidden group border-white/5">
                        <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-10 transition-all duration-700">
                             <Shield size={240} className="text-primary rotate-12" />
                        </div>
                        
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                            <div className="flex items-center gap-6">
                                <div className="h-20 w-20 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20 ring-4 ring-primary/5">
                                    <ShieldCheck size={40} />
                                </div>
                                <div>
                                    <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-1 font-display">Comandante de guardia</h3>
                                    <p className="text-2xl md:text-3xl font-black text-text-main uppercase tracking-tighter italic leading-none">
                                        {situacion?.datos_guardia?.grado} {situacion?.datos_guardia?.nombre} {situacion?.datos_guardia?.apellido}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-text-muted/60 uppercase tracking-widest">
                                        <span className="flex items-center gap-1.5"><Clock size={12}/> Inicio: {new Date().toLocaleTimeString('es-VE', {hour:'2-digit', minute:'2-digit'})}</span>
                                        <span className="w-1 h-1 rounded-full bg-white/20" />
                                        <span className="flex items-center gap-1.5"><Activity size={12}/> ID: #{situacion?.punto?.id?.slice(0,6)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex md:flex-col gap-2 w-full md:w-auto">
                                <Badge variant="activa" className="px-6 py-2 shadow-xl shadow-primary/20 uppercase tracking-[0.2em] text-[10px] font-black italic flex-1 md:flex-none justify-center">EN TURNO</Badge>
                                <Boton variant="ghost" className="h-10 text-[9px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 flex-1 md:flex-none">Finalizar</Boton>
                            </div>
                        </div>
                    </Card>

                    {/* Comando de Acceso Principal */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <button 
                            onClick={() => handleIniciarEscaneo('entrada')}
                            className="group relative h-44 flex flex-col items-center justify-center gap-4 bg-bg-card border-2 border-primary/10 rounded-[3rem] p-8 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 transition-all outline-none"
                        >
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[3rem]" />
                            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-bg-app transition-all shadow-inner ring-8 ring-primary/5">
                                <LogIn size={40} strokeWidth={2.5} />
                            </div>
                            <div className="text-center relative z-10">
                                <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.4em] mb-1">Entrada</p>
                                <h4 className="text-2xl font-black text-text-main uppercase italic tracking-tight">Registrar Ingreso</h4>
                            </div>
                        </button>

                        <button 
                            onClick={() => handleIniciarEscaneo('salida')}
                            className="group relative h-44 flex flex-col items-center justify-center gap-4 bg-bg-card border-2 border-warning/10 rounded-[3rem] p-8 hover:border-warning/40 hover:shadow-2xl hover:shadow-warning/10 transition-all outline-none"
                        >
                            <div className="absolute inset-0 bg-warning/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[3rem]" />
                            <div className="h-20 w-20 rounded-full bg-warning/10 flex items-center justify-center text-warning group-hover:scale-110 group-hover:bg-warning group-hover:text-bg-app transition-all shadow-inner ring-8 ring-warning/5">
                                <LogOut size={40} strokeWidth={2.5} />
                            </div>
                            <div className="text-center relative z-10">
                                <p className="text-[10px] font-black text-warning/60 uppercase tracking-[0.4em] mb-1">Salida</p>
                                <h4 className="text-2xl font-black text-text-main uppercase italic tracking-tight">Registrar Egreso</h4>
                            </div>
                        </button>
                    </div>

                    {/* KPIs de Rendimiento */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <Card className="bg-bg-card/40 border-white/5 p-8 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
                             <div className="absolute -bottom-4 -left-4 opacity-[0.03] rotate-12"><LogIn size={80}/></div>
                             <span className="text-4xl font-black text-text-main font-display italic tracking-tighter">{stats.entradas}</span>
                             <span className="text-[10px] text-text-muted font-black uppercase mt-3 tracking-[0.3em] opacity-40">Total entradas ciclicas</span>
                        </Card>
                        <Card className="bg-bg-card/40 border-white/5 p-8 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
                             <div className="absolute -bottom-4 -left-4 opacity-[0.03] rotate-12"><LogOut size={80}/></div>
                             <span className="text-4xl font-black text-text-main font-display italic tracking-tighter">{stats.salidas}</span>
                             <span className="text-[10px] text-text-muted font-black uppercase mt-3 tracking-[0.3em] opacity-40">Total salidas ciclicas</span>
                        </Card>
                        <Card className={cn(
                            "col-span-2 md:col-span-1 p-8 rounded-[2rem] flex flex-col items-center justify-center text-center border transition-all shadow-lg relative overflow-hidden",
                            stats.infracciones > 0 ? "bg-danger/5 border-danger/30 shadow-danger/5" : "bg-bg-card/40 border-white/5"
                        )}>
                             <div className="absolute -bottom-4 -left-4 opacity-[0.03] rotate-12"><ShieldAlert size={80}/></div>
                             <span className={cn("text-4xl font-black font-display italic tracking-tighter", stats.infracciones > 0 ? "text-danger" : "text-text-main")}>{stats.infracciones}</span>
                             <span className={cn("text-[10px] font-black uppercase mt-3 tracking-[0.3em]", stats.infracciones > 0 ? "text-danger/60" : "text-text-muted opacity-40")}>Alertas detectadas</span>
                        </Card>
                    </div>
                </div>

                {/* LADO DERECHO: Historial / Bitácora (4/12) */}
                <div className="xl:col-span-4 flex flex-col gap-5">
                    <div className="flex items-center justify-between px-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-primary rounded-full" />
                            <h3 className="text-xs font-black text-text-main uppercase tracking-[0.4em] italic">Bitácora táctica</h3>
                        </div>
                        <span className="text-[8px] font-black text-success uppercase tracking-widest animate-pulse">En vivo</span>
                    </div>
                    
                    <div className="flex flex-col space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                        {(!stats.eventos_recientes || stats.eventos_recientes.length === 0) ? (
                            <div className="py-20 text-center border border-dashed border-white/5 rounded-[2.5rem] bg-bg-low/10">
                                <Info size={32} className="mx-auto text-text-muted opacity-20 mb-3" />
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] opacity-40">Sin novedad en el frente</p>
                            </div>
                        ) : (
                            stats.eventos_recientes.map((evento, idx) => (
                                <div key={evento.id} className="bg-bg-card/40 border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:border-primary/20 transition-all group">
                                     <div className={cn(
                                         "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                         evento.tipo === 'entrada' ? "bg-primary/20 text-primary" : "bg-warning/20 text-warning"
                                     )}>
                                         {evento.tipo === 'entrada' ? <LogIn size={20} /> : <LogOut size={20} />}
                                     </div>
                                     <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between mb-0.5">
                                               <h4 className="text-text-main font-black text-[11px] uppercase truncate">{evento.socio_nombre}</h4>
                                               <span className="text-[8px] font-bold text-text-muted opacity-50">
                                                   {new Date(evento.timestamp).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                                               </span>
                                          </div>
                                          <div className="flex items-center gap-2 text-[9px] font-bold text-text-muted/60 uppercase">
                                              <Car size={12} className="opacity-30" />
                                              <span className="truncate">{evento.vehiculo}</span>
                                          </div>
                                     </div>
                                </div>
                            ))
                        )}
                        
                        <button className="w-full py-4 text-[9px] font-black text-text-muted uppercase tracking-[0.3em] border border-white/5 rounded-2xl hover:bg-white/5 transition-all">
                            Ver bitácora completa
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// COMPONENTE INTERNO: Formulario de Relevo Táctico
const ModuloIdentificacion = ({ punto, authUser, onConfirm }) => {
    const [form, setForm] = useState({
        grado: '',
        nombre: authUser?.nombre || '',
        apellido: authUser?.apellido || '',
        telefono: '',
        unidad: ''
    });

    return (
        <div className="min-h-screen bg-bg-app p-6 flex flex-col items-center justify-center animate-in fade-in duration-700">
            <div className="w-full max-w-lg space-y-8">
                <div className="text-center space-y-3">
                    <div className="w-20 h-20 bg-primary/10 text-primary rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-primary/20 shadow-2xl shadow-primary/10">
                        <ShieldAlert size={40} />
                    </div>
                    <h1 className="text-3xl font-black text-text-main uppercase tracking-tighter italic">Relevo Táctico</h1>
                    <p className="text-text-muted text-xs font-bold uppercase tracking-widest px-4">
                        Terminal: <span className="text-primary">{punto?.nombre}</span>
                    </p>
                    <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-warning uppercase">
                        <Clock size={12} />
                        Corte de turno: 08:30 AM
                    </div>
                </div>

                <Card className="bg-bg-card border-white/5 shadow-tactica rounded-[2.5rem] overflow-hidden">
                    <form onSubmit={(e) => { e.preventDefault(); onConfirm(form); }} className="p-8 space-y-5">
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-4">
                                <Input 
                                    label="Grado" required placeholder="Ej: S1"
                                    value={form.grado}
                                    onChange={e => setForm({...form, grado: e.target.value.toUpperCase()})}
                                />
                            </div>
                            <div className="col-span-8">
                                <Input 
                                    label="Unidad / Destino" required placeholder="BATALLÓN / UNIDAD"
                                    value={form.unidad}
                                    onChange={e => setForm({...form, unidad: e.target.value.toUpperCase()})}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input 
                                label="Nombres" required
                                value={form.nombre}
                                onChange={e => setForm({...form, nombre: e.target.value.toUpperCase()})}
                            />
                            <Input 
                                label="Apellidos" required
                                value={form.apellido}
                                onChange={e => setForm({...form, apellido: e.target.value.toUpperCase()})}
                            />
                        </div>
                        <Input 
                            label="Teléfono de contacto" type="tel" required placeholder="04XX-XXXXXXX"
                            value={form.telefono}
                            onChange={e => setForm({...form, telefono: e.target.value})}
                        />
                        <Boton type="submit" className="w-full h-16 rounded-2xl gap-3 font-black text-sm shadow-xl shadow-primary/20 uppercase tracking-widest">
                            <LogIn size={20} />
                            Iniciar Turno Operativo
                        </Boton>
                    </form>
                </Card>

                <p className="text-center text-[9px] text-text-muted font-black uppercase tracking-[0.4em] opacity-20">
                    Aegis Tactical System — Secure Node Identification
                </p>
            </div>
        </div>
    );
};

export default DashboardAlcabala;
