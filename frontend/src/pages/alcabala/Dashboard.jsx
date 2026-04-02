import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, LogIn, LogOut, AlertTriangle, ShieldCheck, ClipboardList, Info } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuthStore } from '../../store/auth.store';
import { Card } from '../../components/ui/Card';
import { Boton } from '../../components/ui/Boton';
import { Badge } from '../../components/ui/Badge';
import { Header } from '../../components/layout/Header';

const DashboardAlcabala = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { lastNotification, setLastNotification } = useNotifications();
    const [stats, setStats] = useState({ entradas: 0, salidas: 0, infracciones: 0 });
    const [alertasLocales, setAlertasLocales] = useState([]);

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

    return (
        <div className="min-h-screen bg-bg-app pb-24">
            <Header />
            
            <main className="p-4 flex flex-col gap-6 animate-fade-in">
                {/* Saludo y Estado */}
                <div className="mt-2">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        Punto de Control
                        <ShieldCheck className="text-primary" size={24} />
                    </h2>
                    <p className="text-text-muted text-sm capitalize">{user?.nombre} {user?.apellido} · Alcabala Central</p>
                </div>

                {/* Acciones Rápidas (Scan Buttons) */}
                <div className="grid grid-cols-2 gap-4">
                     <Boton 
                        onClick={() => handleIniciarEscaneo('entrada')}
                        className="h-32 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#10B98115] to-[#10B98105] border-primary/20 rounded-[2.5rem]"
                     >
                        <LogIn className="text-primary" size={32} />
                        <span className="font-bold text-white uppercase tracking-wider text-sm mt-1">Entrada</span>
                     </Boton>
                     <Boton 
                        onClick={() => handleIniciarEscaneo('salida')}
                        className="h-32 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#F59E0B15] to-[#F59E0B05] border-warning/20 rounded-[2.5rem]"
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

                {/* Sección de Alertas en Tiempo Real (Feedback del usuario) */}
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
                
                {/* Guía Rápida */}
                <Boton variant="outline" className="w-full mt-4 h-14 rounded-2xl flex items-center justify-center gap-2 border-white/5 text-text-muted">
                    <ClipboardList size={18} /> Ver Registro del Turno
                </Boton>
            </main>
        </div>
    );
};

export default DashboardAlcabala;
