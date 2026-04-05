import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, LogIn, LogOut, AlertTriangle, 
  ShieldCheck, ClipboardList, Info, 
  UserPlus, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuthStore } from '../../store/auth.store';
import { Card } from '../../components/ui/Card';
import { Boton } from '../../components/ui/Boton';
import { Badge } from '../../components/ui/Badge';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { comandoService } from '../../services/comando.service';
import { toast } from 'react-hot-toast';

const DashboardAlcabala = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { lastNotification } = useNotifications();
    
    const [situacion, setSituacion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ entradas: 0, salidas: 0, infracciones: 0 });
    const [alertasLocales, setAlertasLocales] = useState([]);

    // Formulario de identificación
    const [formIdentificacion, setFormIdentificacion] = useState({
        grado: '',
        nombre: '',
        apellido: '',
        telefono: '',
        unidad: ''
    });

    useEffect(() => {
        fetchSituacion();
    }, []);

    const fetchSituacion = async () => {
        setLoading(true);
        try {
            const data = await comandoService.getMiSituacion();
            setSituacion(data);
            // Pre-rellenar nombre y apellido si el sistema los tiene (opcional)
            setFormIdentificacion(prev => ({
                ...prev,
                nombre: user?.nombre || '',
                apellido: user?.apellido || ''
            }));
        } catch (error) {
            toast.error('Error al verificar estado de la alcabala');
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
            toast.success('Identificación registrada. Turno iniciado.');
            fetchSituacion();
        } catch (error) {
            toast.error('No se pudo registrar la identificación');
        }
    };

    // Manejar notificaciones en tiempo real
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
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
        </div>
    );

    // VISTA DE IDENTIFICACIÓN MANDATORIA
    if (situacion && !situacion.identificado) {
        return (
            <div className="min-h-screen bg-bg-app p-6 flex flex-col items-center justify-center gap-8">
                <div className="text-center space-y-2 max-w-sm">
                    <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
                        <ShieldAlert size={40} />
                    </div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight">Relevo Táctico</h1>
                    <p className="text-text-muted text-sm italic">
                        Debe identificarse para operar en <span className="text-primary font-bold">{situacion.punto.nombre}</span>. Este paso es obligatorio para el registro histórico.
                    </p>
                </div>

                <Card className="w-full max-w-md bg-bg-low/80 border-white/5 backdrop-blur-xl">
                    <form onSubmit={handleIdentificar} className="p-6 space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                            <Input 
                                label="Grado" 
                                placeholder="Ej: S1"
                                value={formIdentificacion.grado}
                                onChange={e => setFormIdentificacion({...formIdentificacion, grado: e.target.value})}
                                required
                            />
                            <div className="col-span-2">
                                <Input 
                                    label="Unidad" 
                                    placeholder="Ej: 311 Batallón"
                                    value={formIdentificacion.unidad}
                                    onChange={e => setFormIdentificacion({...formIdentificacion, unidad: e.target.value})}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Input 
                                label="Nombre" 
                                value={formIdentificacion.nombre}
                                onChange={e => setFormIdentificacion({...formIdentificacion, nombre: e.target.value})}
                                required
                            />
                            <Input 
                                label="Apellido" 
                                value={formIdentificacion.apellido}
                                onChange={e => setFormIdentificacion({...formIdentificacion, apellido: e.target.value})}
                                required
                            />
                        </div>
                        <Input 
                            label="Teléfono de Contacto" 
                            type="tel"
                            placeholder="0412-1234567"
                            value={formIdentificacion.telefono}
                            onChange={e => setFormIdentificacion({...formIdentificacion, telefono: e.target.value})}
                            required
                        />
                        <Boton type="submit" className="w-full h-14 rounded-2xl gap-2 font-bold text-lg mt-4">
                            <UserPlus size={20} />
                            Iniciar Turno
                        </Boton>
                    </form>
                </Card>

                <div className="flex items-center gap-2 text-text-muted text-[10px] uppercase font-bold tracking-widest opacity-30">
                    <ShieldCheck size={12} />
                    Sistema de Seguridad BAGFM
                </div>
            </div>
        );
    }

    // DASHBOARD OPERATIVO NORMAL
    return (
        <div className="min-h-screen bg-bg-app pb-24">
            <Header />
            
            <main className="p-4 flex flex-col gap-6 animate-fade-in">
                {/* Saludo y Estado */}
                <div className="mt-2 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2 tracking-tight">
                            {situacion?.punto?.nombre}
                            <ShieldCheck className="text-success" size={24} />
                        </h2>
                        <p className="text-text-muted text-xs font-medium uppercase tracking-wider">
                            Personal: {situacion?.datos_guardia?.grado} {situacion?.datos_guardia?.nombre} {situacion?.datos_guardia?.apellido}
                        </p>
                    </div>
                </div>

                {/* Acciones Rápidas (Scan Buttons) */}
                <div className="grid grid-cols-2 gap-4">
                     <Boton 
                        onClick={() => handleIniciarEscaneo('entrada')}
                        className="h-32 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#10B98115] to-[#10B98105] border-success/20 rounded-[2.5rem] hover:ring-2 ring-success/30 transition-all"
                     >
                        <LogIn className="text-success" size={32} />
                        <span className="font-bold text-white uppercase tracking-wider text-sm mt-1">Entrada</span>
                     </Boton>
                     <Boton 
                        onClick={() => handleIniciarEscaneo('salida')}
                        className="h-32 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#F59E0B15] to-[#F59E0B05] border-warning/20 rounded-[2.5rem] hover:ring-2 ring-warning/30 transition-all"
                     >
                        <LogOut className="text-warning" size={32} />
                        <span className="font-bold text-white uppercase tracking-wider text-sm mt-1">Salida</span>
                     </Boton>
                </div>

                {/* Estadísticas Rápidas */}
                <div className="grid grid-cols-3 gap-3">
                    <Card className="flex flex-col items-center py-4 bg-bg-low/40">
                         <span className="text-2xl font-bold text-white leading-none">{stats.entradas}</span>
                         <span className="text-[10px] text-text-muted uppercase font-semibold mt-1">Entradas</span>
                    </Card>
                    <Card className="flex flex-col items-center py-4 bg-bg-low/40">
                         <span className="text-2xl font-bold text-white leading-none">{stats.salidas}</span>
                         <span className="text-[10px] text-text-muted uppercase font-semibold mt-1">Salidas</span>
                    </Card>
                    <Card className="flex flex-col items-center py-4 bg-bg-low/40 border-error/10">
                         <span className="text-2xl font-bold text-error leading-none">{stats.infracciones}</span>
                         <span className="text-[10px] text-error/60 uppercase font-semibold mt-1">Alertas</span>
                    </Card>
                </div>

                {/* Alertas Recientes */}
                <section>
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                             Alertas Recientes
                             {alertasLocales.length > 0 && <span className="w-2 h-2 bg-error rounded-full animate-pulse"></span>}
                        </h3>
                        {alertasLocales.length > 0 && (
                            <button onClick={() => setAlertasLocales([])} className="text-xs text-text-muted hover:text-white">Limpiar</button>
                        )}
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        {alertasLocales.length === 0 ? (
                            <div className="flex flex-col items-center py-10 text-center text-text-muted gap-2 border-2 border-dashed border-white/5 rounded-3xl">
                                <Info size={24} className="opacity-20" />
                                <p className="text-sm font-medium">Sin incidentes registrados recientemente</p>
                            </div>
                        ) : (
                            alertasLocales.map((alerta, idx) => (
                                <Card key={idx} className="bg-error/10 border-error/30 p-4 animate-slide-up flex gap-4">
                                     <div className="bg-error/20 p-2 rounded-xl flex items-center justify-center">
                                         <AlertTriangle className="text-error" size={24} />
                                     </div>
                                     <div className="flex-1">
                                          <div className="flex items-center justify-between">
                                               <h4 className="text-white font-bold text-sm">Nueva Infracción</h4>
                                               <span className="text-[10px] text-error/60 font-mono">AHORA</span>
                                          </div>
                                          <p className="text-text-sec text-xs mt-1 line-clamp-1">{alerta.descripcion}</p>
                                          {alerta.bloquea_salida && <Badge variant="error" className="mt-2 text-[10px] bg-error">BLOQUEO SALIDA</Badge>}
                                     </div>
                                 </Card>
                            ))
                        )}
                    </div>
                </section>
                
                <Boton variant="outline" className="w-full mt-4 h-14 rounded-2xl gap-2 border-white/5 text-text-muted">
                    <ClipboardList size={18} /> Ver Registro del Turno
                </Boton>
            </main>
        </div>
    );
};

export default DashboardAlcabala;
