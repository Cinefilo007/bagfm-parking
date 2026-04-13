import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { QRScanner } from '../../components/alcabala/QRScanner';
import { alcabalaService } from '../../services/alcabala.service';
import { Badge } from '../../components/ui/Badge';
import { Boton } from '../../components/ui/Boton';
import { Card, CardContent } from '../../components/ui/Card';
import { 
    CheckCircle2, XCircle, AlertTriangle, User, 
    Car, Shield, Zap, Activity, ChevronRight,
    Camera
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';

// Componentes Locales (Hoisted explicitly)
const BadgeCheck = ({ size, className }) => (
    <div className={className}>
        <CheckCircle2 size={size} />
    </div>
);

const ScannerAlcabala = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const tipoAcceso = searchParams.get('tipo') || 'entrada';
    const [resultado, setResultado] = useState(null);
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        console.log(">>> TERMINAL DE ESCANEO MONTADA. TIPO:", tipoAcceso);
    }, [tipoAcceso]);

    const handleScanSuccess = async (qrToken) => {
        if (cargando) return;
        
        // CONFIRMACIÓN INMEDIATA DE DETECCIÓN (Para cualquier QR)
        toast.success(`Detección: ${qrToken.substring(0, 10)}...`, { icon: '🔍' });
        
        let tokenFinal = qrToken;
        // Si el QR es una URL (común en escaneos directos de cámara), extraer el token
        if (qrToken.includes('token=')) {
            try {
                const url = new URL(qrToken);
                tokenFinal = url.searchParams.get('token') || qrToken;
            } catch (e) {
                console.warn("No es una URL válida, usando texto crudo");
            }
        }

        console.log(">>> [SENSOR] TOKEN DETECTADO:", tokenFinal.substring(0, 15) + "...");
        const toastId = toast.loading('Sincronizando con Base Central...', { duration: 5000 });
        
        setCargando(true);
        try {
            console.log(">>> [RED] ENVIANDO VALIDACIÓN:", { token: qrToken.substring(0, 20), tipo: tipoAcceso });
            const res = await alcabalaService.validarQR(qrToken, tipoAcceso);
            
            console.log(">>> [BACKEND] RESPUESTA RECIBIDA:", res);
            setResultado(res);
            toast.success('Identidad Recuperada', { id: toastId });
        } catch (error) {
            console.error(">>> [ERROR] FALLO EN VALIDACIÓN:", error);
            const errorMsg = error.response?.data?.detail || error.message || "Error Desconocido";
            
             setResultado({ 
                permitido: false, 
                mensaje: "Error de Protocolo: " + errorMsg, 
                tipo_alerta: "error" 
            });
            toast.error('Fallo en Enlace Táctico', { id: toastId });
        } finally {
            setCargando(false);
        }
    };

    const handleConfirmar = async () => {
        try {
            await alcabalaService.registrarAcceso({
                qr_id: resultado.qr_id,
                usuario_id: resultado.usuario_id,
                vehiculo_id: resultado.vehiculo_id,
                tipo: tipoAcceso,
                es_manual: false
            });
            navigate('/alcabala/dashboard');
        } catch (error) {
            console.error("Error al persistir registro:", error);
        }
    };

    const getStatusStyles = (res) => {
        if (!res?.permitido) return 'bg-danger/10 border-danger/20 text-danger';
        if (res?.tipo_alerta === 'warning') return 'bg-warning/10 border-warning/20 text-warning';
        return 'bg-primary/10 border-primary/20 text-primary';
    };

    return (
        <div className="min-h-screen bg-bg-app pb-24 flex flex-col">
            <Header titulo="Terminal de Escaneo" subtitle={`OPERACIÓN ${tipoAcceso.toUpperCase()}`} />
            
            <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                
                {/* Cabecera Táctica Estilo Original */}
                <div className="flex items-center justify-between px-2">
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">
                            Detector <span className="text-primary">QR</span>
                        </h2>
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mt-2 opacity-60">
                            Alinee el código en el centro del visor
                        </p>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black text-text-muted uppercase tracking-widest leading-none mb-1">Status</span>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--color-primary)]" />
                            <span className="text-[10px] font-black text-white uppercase italic">Online</span>
                        </div>
                    </div>
                </div>

                {/* Visor del Escáner */}
                <Card className="bg-black/40 border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative aspect-square">
                    <div className="relative z-10 w-full h-full p-2">
                         <QRScanner 
                            onScanSuccess={handleScanSuccess} 
                            autoStart={true} 
                            status={resultado ? (resultado.permitido ? 'success' : 'error') : 'idle'}
                         />
                    </div>
                    
                    {/* Guías Visuales */}
                    <div className="absolute inset-x-8 inset-y-8 pointer-events-none border-2 border-white/5 rounded-3xl border-dashed">
                        <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
                        <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
                        <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
                        <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-2xl" />
                    </div>
                </Card>

                {/* Info de Operación (Botones Inferiores Originales) */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-bg-low/40 border-white/5 p-4 rounded-2xl flex items-center justify-center gap-3">
                        <Camera size={20} className="text-primary" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Activo</span>
                    </Card>
                    <Card className="bg-bg-low/40 border-white/5 p-4 rounded-2xl flex items-center justify-center gap-3">
                        <Activity size={20} className="text-primary" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{tipoAcceso}</span>
                    </Card>
                </div>

                {/* RESULTADO INTEGRADO (Sin Modal) */}
                {resultado && (
                    <div className="animate-in slide-in-from-top-4 fade-in duration-500 space-y-4 pb-12">
                        {/* Banner de Estado */}
                        <div className={cn(
                            "p-6 rounded-3xl border-2 flex items-center gap-4 transition-all duration-500",
                            resultado.permitido ? "bg-primary/10 border-primary text-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]" : "bg-error/10 border-error text-error shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                        )}>
                            {resultado.permitido ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
                            <div>
                                <h4 className="text-xl font-black uppercase italic tracking-tighter leading-none">
                                    {resultado.permitido ? "Acceso Autorizado" : "Acceso Denegado"}
                                </h4>
                                <p className="text-[10px] font-bold uppercase opacity-80 mt-1">{resultado.mensaje}</p>
                            </div>
                        </div>

                        {/* Ficha del Socio */}
                        {resultado.socio && (
                            <Card className="bg-bg-card border-white/10 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden">
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-3xl bg-white/5 border-2 border-white/10 overflow-hidden shrink-0">
                                        {resultado.socio.foto_url ? (
                                            <img src={resultado.socio.foto_url} alt="Socio" className="w-full h-full object-cover grayscale-[0.3]" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center"><User size={32} className="text-white/20" /></div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h5 className="text-2xl font-black text-white uppercase italic tracking-tight leading-none truncate">
                                            {resultado.socio.nombre} {resultado.socio.apellido}
                                        </h5>
                                        <div className="flex gap-2 mt-2">
                                            <Badge variant="outline" className="text-[8px] font-black border-white/10 uppercase tracking-widest">CI: {resultado.socio.cedula}</Badge>
                                            <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase tracking-widest">{resultado.entidad_nombre}</Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* Info Vehículo y Membresía */}
                                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/5">
                                    <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Shield size={12} className="text-primary" />
                                            <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Membresía</span>
                                        </div>
                                        <p className="text-sm font-black text-white uppercase italic">
                                            {resultado.membresia_info?.dias_restantes || 0} Días Vig.
                                        </p>
                                    </div>
                                    <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Car size={12} className="text-warning" />
                                            <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Vehículo</span>
                                        </div>
                                        <p className="text-sm font-black text-warning uppercase italic truncate">
                                            {resultado.vehiculo?.placa || 'SIN ASIGNAR'}
                                        </p>
                                    </div>
                                </div>

                                {/* Acciones Directas */}
                                <div className="flex gap-3 mt-6">
                                     <Boton 
                                        onClick={() => setResultado(null)}
                                        variant="outline" 
                                        className="flex-1 h-16 rounded-2xl border-white/5 text-text-muted font-black uppercase text-[10px] tracking-widest"
                                     >
                                         NUEVO ESCANEO
                                     </Boton>
                                     <Boton 
                                        disabled={!resultado.permitido}
                                        onClick={handleConfirmar}
                                        className={cn(
                                            "flex-[1.5] h-16 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all",
                                            resultado.permitido 
                                                ? "bg-primary text-bg-app shadow-lg shadow-primary/20 scale-105" 
                                                : "bg-white/5 text-white/10 border-white/5 opacity-50"
                                        )}
                                     >
                                         CONFIRMAR {tipoAcceso}
                                     </Boton>
                                </div>
                            </Card>
                        )}
                    </div>
                )}
                
                {/* Espaciador para no tapar con el Nav inferior si existiera */}
                <div className="h-20" />
            </main>

            {/* Overlay de Carga Táctico */}
            {cargando && (
                <div className="fixed inset-0 bg-bg-app/80 backdrop-blur-xl z-[120] flex items-center justify-center animate-in fade-in duration-300">
                     <div className="flex flex-col items-center gap-6">
                         <div className="relative">
                             <Zap className="text-primary animate-pulse absolute inset-0 m-auto" size={32} />
                             <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                         </div>
                         <p className="text-white font-black tracking-[0.4em] text-[10px] uppercase italic animate-pulse">Sincronizando Link...</p>
                     </div>
                </div>
            )}
        </div>
    );
};

export default ScannerAlcabala;
