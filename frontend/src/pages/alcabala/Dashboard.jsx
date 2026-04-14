import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, LogIn, LogOut, AlertTriangle, 
  ShieldCheck, ClipboardList, Info, 
  UserPlus, CheckCircle2, ShieldAlert,
  Zap, Activity, ChevronRight, Shield,
  Car
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

    // VISTA DE IDENTIFICACIÓN MANDATORIA (FUERZA BRUTA DE UI)
    if (situacion && !situacion.identificado) {
        return <ModuloIdentificacion punto={situacion.punto} authUser={user} onConfirm={handleIdentificar} />;
    }

    return (
        <div className="p-4 md:p-6 space-y-6 pb-24 max-w-[1400px] mx-auto animate-in fade-in duration-500">
            {/* Cabecera Táctica Estandarizada */}
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-bg-card/30 p-4 md:p-5 rounded-2xl border border-white/5">
                <div className="min-w-0">
                    <h1 className="text-2xl font-black text-text-main flex items-center gap-3 tracking-tight">
                        <div className="p-2 bg-primary/10 rounded-xl shrink-0">
                            <Shield className="text-primary" size={24} />
                        </div>
                        <span className="uppercase">{situacion?.punto?.nombre || 'Terminal Alcabala'}</span>
                    </h1>
                    <p className="text-text-muted text-sm mt-1 flex items-center gap-1.5 px-1 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" />
                        Puesto de control y acceso
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Boton variant="outline" className="h-11 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl border-white/10 gap-2">
                        <Activity size={16} className="text-primary" />
                        Estado: Operativo
                    </Boton>
                </div>
            </header>
            
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                
                {/* LADO IZQUIERDO: Control y Métricas */}
                <div className="xl:col-span-8 space-y-6">
                    
                    {/* Banner de Operador */}
                    <Card className="bg-bg-card/40 border-primary/10 backdrop-blur-md rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                             <Shield size={100} className="text-primary" />
                        </div>
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-5">
                                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
                                    <ShieldCheck size={28} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-[9px] font-black text-text-muted uppercase tracking-[0.3em] opacity-60 mb-0.5">Comandante de guardia</h3>
                                    <p className="text-lg font-black text-text-main uppercase tracking-tight italic truncate">
                                        {situacion?.datos_guardia?.grado} {situacion?.datos_guardia?.nombre} {situacion?.datos_guardia?.apellido}
                                    </p>
                                </div>
                            </div>
                            <div className="hidden sm:flex flex-col items-end">
                                <Badge variant="activa" className="px-4 py-1 shadow-lg shadow-primary/20 uppercase tracking-widest text-[8px] font-black mb-1">EN TURNO</Badge>
                                <p className="text-[10px] font-bold text-text-muted/40 uppercase tracking-widest">Iniciado: {new Date().toLocaleTimeString('es-VE', {hour:'2-digit', minute:'2-digit'})}</p>
                            </div>
                        </div>
                    </Card>

                    {/* Comando de Acceso Principal */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button 
                            onClick={() => handleIniciarEscaneo('entrada')}
                            className="group h-32 flex items-center gap-6 bg-bg-card border border-white/5 rounded-3xl p-6 hover:border-primary/40 hover:bg-primary/5 transition-all outline-none"
                        >
                            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <LogIn size={32} />
                            </div>
                            <div className="text-left">
                                <p className="text-[9px] font-black text-primary uppercase tracking-[0.25em] mb-1">Ingreso táctico</p>
                                <h4 className="text-xl font-black text-text-main uppercase italic">Registrar Entrada</h4>
                            </div>
                        </button>

                        <button 
                            onClick={() => handleIniciarEscaneo('salida')}
                            className="group h-32 flex items-center gap-6 bg-bg-card border border-white/5 rounded-3xl p-6 hover:border-warning/40 hover:bg-warning/5 transition-all outline-none"
                        >
                            <div className="h-16 w-16 rounded-2xl bg-warning/10 flex items-center justify-center text-warning group-hover:scale-110 transition-transform">
                                <LogOut size={32} />
                            </div>
                            <div className="text-left">
                                <p className="text-[9px] font-black text-warning uppercase tracking-[0.25em] mb-1">Egreso táctico</p>
                                <h4 className="text-xl font-black text-text-main uppercase italic">Registrar Salida</h4>
                            </div>
                        </button>
                    </div>

                    {/* KPIs de Rendimiento */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-bg-card/40 border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                             <span className="text-3xl font-black text-text-main font-display">{stats.entradas}</span>
                             <span className="text-[9px] text-text-muted font-black uppercase mt-2 tracking-widest opacity-60">Entradas hoy</span>
                        </div>
                        <div className="bg-bg-card/40 border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                             <span className="text-3xl font-black text-text-main font-display">{stats.salidas}</span>
                             <span className="text-[9px] text-text-muted font-black uppercase mt-2 tracking-widest opacity-60">Salidas hoy</span>
                        </div>
                        <div className={cn(
                            "col-span-2 md:col-span-1 p-6 rounded-2xl flex flex-col items-center justify-center text-center border transition-all",
                            stats.infracciones > 0 ? "bg-danger/5 border-danger/30" : "bg-bg-card/40 border-white/5"
                        )}>
                             <span className={cn("text-3xl font-black font-display", stats.infracciones > 0 ? "text-danger" : "text-text-main")}>{stats.infracciones}</span>
                             <span className="text-[9px] text-text-muted font-black uppercase mt-2 tracking-widest opacity-60">Infracciones det.</span>
                        </div>
                    </div>
                </div>

                {/* LADO DERECHO: Historial / Bitácora */}
                <div className="xl:col-span-4 space-y-4">
                    <div className="flex items-center gap-3 px-2">
                        <Activity size={18} className="text-primary" />
                        <h3 className="text-xs font-black text-text-main uppercase tracking-[0.4em] italic">Bitácora en tiempo real</h3>
                    </div>
                    
                    <div className="flex flex-col space-y-3">
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
