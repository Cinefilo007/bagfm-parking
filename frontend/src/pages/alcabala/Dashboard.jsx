import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, LogIn, LogOut, AlertTriangle, 
  ShieldCheck, ClipboardList, Info, 
  UserPlus, CheckCircle2, ShieldAlert,
  Zap, Activity, ChevronRight
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
    const [alertasLocales, setAlertasLocales] = useState([]);

    // Formulario de identificación
    const [formIdentificacion, setFormIdentificacion] = useState({
        grado: '',
        nombre: user?.nombre || '',
        apellido: user?.apellido || '',
        telefono: '',
        unidad: ''
    });

    useEffect(() => {
        fetchSituacion();
        // Limpiar bloqueo al desmontar por seguridad
        return () => lockNavigation(false);
    }, []);

    const fetchSituacion = async () => {
        setLoading(true);
        try {
            const data = await comandoService.getMiSituacion();
            setSituacion(data);
            
            // Si no está identificado, BLOQUEAR navegación
            if (!data.identificado) {
                lockNavigation(true);
            } else {
                lockNavigation(false);
            }
        } catch (error) {
            toast.error('Fallo en sincronización táctica');
        } finally {
            setLoading(false);
        }
    };

    const handleIdentificar = async (e) => {
        e.preventDefault();
        try {
            await comandoService.identificarGuardia({
                punto_id: situacion.punto.id,
                ...formIdentificacion
            });
            toast.success('Protocolo de identidad verificado. Turno iniciado.');
            fetchSituacion();
        } catch (error) {
            toast.error('Error en validación de identidad');
        }
    };

    useEffect(() => {
        if (lastNotification?.evento === 'INFRACCION_REGISTRADA') {
            setAlertasLocales(prev => [lastNotification.datos, ...prev].slice(0, 5));
            setStats(prev => ({ ...prev, infracciones: prev.infracciones + 1 }));
        }
    }, [lastNotification]);

    const handleIniciarEscaneo = (tipo) => {
        navigate(`/alcabala/scanner?tipo=${tipo}`);
    }

    if (loading) return (
        <div className="min-h-screen bg-bg-app flex items-center justify-center">
            <Zap className="text-primary animate-pulse" size={48} />
        </div>
    );

    // VISTA DE IDENTIFICACIÓN MANDATORIA (FUERZA BRUTA DE UI)
    if (situacion && !situacion.identificado) {
        return (
            <div className="min-h-screen bg-bg-app p-6 flex flex-col items-center justify-center animate-in fade-in duration-700">
                <div className="w-full max-w-lg space-y-8">
                    <div className="text-center space-y-4">
                        <div className="w-24 h-24 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6 border border-primary/20 shadow-2xl shadow-primary/10 animate-bounce">
                            <ShieldAlert size={48} />
                        </div>
                        <h1 className="text-3xl font-black text-text-main uppercase tracking-tighter italic">Relevo de Guardia</h1>
                        <p className="text-text-muted text-sm font-bold uppercase tracking-widest opacity-60">
                            Terminal: <span className="text-primary">{situacion.punto.nombre}</span>
                        </p>
                    </div>

                    <Card className="bg-bg-card border-bg-high shadow-tactica rounded-[2.5rem] overflow-hidden">
                        <div className="p-8 pb-0 flex flex-col items-center">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="w-8 h-[1px] bg-primary/30" />
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] italic">Protocolo de Registro</span>
                                <span className="w-8 h-[1px] bg-primary/30" />
                            </div>
                            <h2 className="text-xl font-black text-text-main uppercase tracking-tight">Verificación de Identidad</h2>
                        </div>
                        <form onSubmit={handleIdentificar} className="p-8 pt-6 space-y-6">
                            <div className="grid grid-cols-3 gap-4">
                                <Input 
                                    label="Grado" required placeholder="S1"
                                    value={formIdentificacion.grado}
                                    onChange={e => setFormIdentificacion({...formIdentificacion, grado: e.target.value.toUpperCase()})}
                                />
                                <div className="col-span-2">
                                    <Input 
                                        label="Unidad / Destino" required placeholder="BATALLÓN..."
                                        value={formIdentificacion.unidad}
                                        onChange={e => setFormIdentificacion({...formIdentificacion, unidad: e.target.value.toUpperCase()})}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input 
                                    label="Nombres" required
                                    value={formIdentificacion.nombre}
                                    onChange={e => setFormIdentificacion({...formIdentificacion, nombre: e.target.value.toUpperCase()})}
                                />
                                <Input 
                                    label="Apellidos" required
                                    value={formIdentificacion.apellido}
                                    onChange={e => setFormIdentificacion({...formIdentificacion, apellido: e.target.value.toUpperCase()})}
                                />
                            </div>
                            <Input 
                                label="Teléfono (Red Operativa)" type="tel" required placeholder="04XX-XXXXXXX"
                                value={formIdentificacion.telefono}
                                onChange={e => setFormIdentificacion({...formIdentificacion, telefono: e.target.value})}
                            />
                            <Boton type="submit" className="w-full h-16 rounded-2xl gap-3 font-black text-lg mt-4 shadow-xl shadow-primary/20 uppercase tracking-widest">
                                <LogIn size={20} />
                                Tomar Posesión
                            </Boton>
                        </form>
                    </Card>

                    <p className="text-center text-[9px] text-text-muted font-black uppercase tracking-[0.4em] opacity-20">
                        Aegis Tactical System — Secure Node Identification
                    </p>
                </div>
            </div>
        );
    }

    // DASHBOARD OPERATIVO AEGIS V2
    return (
        <div className="min-h-screen bg-bg-app pb-32">
            <Header titulo="Terminal Alcabala" subtitle={situacion?.punto?.nombre} />
            
            <main className="max-w-4xl mx-auto p-6 flex flex-col gap-8 animate-in slide-in-from-bottom-4 duration-500">
                
                {/* Banner de Operador */}
                <Card className="bg-bg-low/40 border-primary/10 overflow-hidden rounded-3xl">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg border border-primary/20">
                                <ShieldCheck size={28} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] opacity-60">Operador en Servicio</h3>
                                <p className="text-lg font-black text-text-main uppercase tracking-tight italic">
                                    {situacion?.datos_guardia?.grado} {situacion?.datos_guardia?.nombre} {situacion?.datos_guardia?.apellido}
                                </p>
                            </div>
                        </div>
                        <Badge variant="activa" className="hidden sm:flex px-4 py-1">EN TURNO</Badge>
                    </CardContent>
                </Card>

                {/* Comando de Acceso (Botones Principales) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <button 
                        onClick={() => handleIniciarEscaneo('entrada')}
                        className="group relative h-48 flex flex-col items-center justify-center gap-4 bg-bg-card border-2 border-primary/20 rounded-[3rem] shadow-2xl shadow-primary/5 hover:border-primary hover:scale-[1.02] active:scale-95 transition-all outline-none"
                     >
                        <div className="absolute top-6 right-8 opacity-10 group-hover:opacity-20 transition-opacity">
                             <Zap size={64} className="text-primary fill-primary" />
                        </div>
                        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-bg-app transition-colors shadow-inner">
                            <LogIn size={40} strokeWidth={2.5} />
                        </div>
                        <span className="font-black text-text-main dark:text-white uppercase tracking-[0.3em] text-sm italic">Registrar Entrada</span>
                     </button>

                     <button 
                        onClick={() => handleIniciarEscaneo('salida')}
                        className="group relative h-48 flex flex-col items-center justify-center gap-4 bg-bg-card border-2 border-warning/20 rounded-[3rem] shadow-2xl shadow-warning/5 hover:border-warning hover:scale-[1.02] active:scale-95 transition-all outline-none"
                     >
                        <div className="absolute top-6 right-8 opacity-10 group-hover:opacity-20 transition-opacity">
                             <ShieldAlert size={64} className="text-warning fill-warning" />
                        </div>
                        <div className="h-20 w-20 rounded-full bg-warning/10 flex items-center justify-center text-warning group-hover:bg-warning group-hover:text-bg-app transition-colors shadow-inner">
                            <LogOut size={40} strokeWidth={2.5} />
                        </div>
                        <span className="font-black text-text-main dark:text-white uppercase tracking-[0.3em] text-sm italic">Registrar Salida</span>
                     </button>
                </div>

                {/* Dashboard de Métricas */}
                <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-bg-low/40 border-white/5 py-6">
                         <div className="flex flex-col items-center">
                             <span className="text-3xl font-black text-text-main dark:text-white leading-none tracking-tighter">{stats.entradas}</span>
                             <span className="text-[10px] text-text-muted font-black uppercase mt-2 tracking-widest opacity-60">Entradas</span>
                         </div>
                    </Card>
                    <Card className="bg-bg-low/40 border-white/5 py-6">
                         <div className="flex flex-col items-center">
                             <span className="text-3xl font-black text-text-main dark:text-white leading-none tracking-tighter">{stats.salidas}</span>
                             <span className="text-[10px] text-text-muted font-black uppercase mt-2 tracking-widest opacity-60">Salidas</span>
                         </div>
                    </Card>
                    <Card className={cn("bg-bg-low/40 border-white/5 py-6 transition-colors", stats.infracciones > 0 && "border-danger/30 bg-danger/5")}>
                         <div className="flex flex-col items-center">
                             <span className={cn("text-3xl font-black leading-none tracking-tighter", stats.infracciones > 0 ? "text-danger" : "text-text-main dark:text-white")}>{stats.infracciones}</span>
                             <span className={cn("text-[10px] font-black uppercase mt-2 tracking-widest opacity-60", stats.infracciones > 0 ? "text-danger/60" : "text-text-muted")}>Alertas</span>
                         </div>
                    </Card>
                </div>

                {/* Inteligencia de Alertas */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <Activity size={18} className="text-primary animate-pulse" />
                            <h3 className="text-xs font-black text-text-main dark:text-white uppercase tracking-[0.3em] italic">Monitor de Alertas</h3>
                        </div>
                        {alertasLocales.length > 0 && (
                            <button onClick={() => setAlertasLocales([])} className="text-[10px] font-black text-text-muted hover:text-text-main dark:hover:text-white uppercase tracking-widest border-b border-white/5">Limpiar Historial</button>
                        )}
                    </div>
                    
                    <div className="space-y-3">
                        {alertasLocales.length === 0 ? (
                            <div className="py-16 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] bg-bg-low/10 group">
                                <Info size={40} className="mx-auto text-white/5 mb-4 group-hover:scale-110 transition-transform" />
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-40">Zona Segura // Sin Incidentes</p>
                            </div>
                        ) : (
                            alertasLocales.map((alerta, idx) => (
                                <Card key={idx} className="bg-danger/10 border-danger/20 p-5 animate-in slide-in-from-right duration-500 overflow-hidden relative">
                                     <div className="absolute left-0 top-0 h-full w-1.5 bg-danger" />
                                     <div className="flex items-center gap-5">
                                         <div className="bg-danger/20 p-3 rounded-2xl flex items-center justify-center shadow-lg">
                                             <AlertTriangle className="text-danger" size={24} />
                                         </div>
                                         <div className="flex-1">
                                              <div className="flex items-center justify-between">
                                                   <h4 className="text-white font-black text-sm uppercase italic">Alerta de Seguridad</h4>
                                                   <span className="text-[9px] font-black text-danger bg-danger/10 px-2 py-0.5 rounded-full uppercase">Crítico</span>
                                              </div>
                                              <p className="text-text-muted text-xs mt-1 font-medium">{alerta.descripcion}</p>
                                         </div>
                                         <ChevronRight size={16} className="text-danger opacity-40" />
                                     </div>
                                 </Card>
                            ))
                        )}
                    </div>
                </section>
                
                <Boton variant="outline" className="w-full h-16 rounded-2xl gap-3 border-white/10 text-text-muted font-black uppercase tracking-widest hover:bg-white/5 transition-all">
                    <ClipboardList size={20} />
                    Consultar Bitácora del Turno
                </Boton>
            </main>
        </div>
    );
};

export default DashboardAlcabala;
