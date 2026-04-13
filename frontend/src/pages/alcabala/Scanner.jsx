import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { QRScanner } from '../../components/alcabala/QRScanner';
import { alcabalaService } from '../../services/alcabala.service';
import { Badge } from '../../components/ui/Badge';
import { Boton } from '../../components/ui/Boton';
import { Card } from '../../components/ui/Card';
import { 
    CheckCircle2, XCircle, AlertTriangle, User, 
    Car, Shield, Zap, Activity, Camera,
    RefreshCw, Power, Clock
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';

const ScannerAlcabala = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const tipoAcceso = searchParams.get('tipo') || 'entrada';
    const [resultado, setResultado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const scannerRef = useRef(null);

    // Formateador de Fecha/Hora Caracas
    const formatCaracas = (dateStr) => {
        if (!dateStr) return 'SIN REGISTRO PREVIO';
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('es-VE', {
            timeZone: 'America/Caracas',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(date);
    };

    const handleScanSuccess = async (qrToken) => {
        if (cargando) return;
        toast.success(`Detección Óptica`, { icon: '🔍', position: 'bottom-center' });
        
        setCargando(true);
        try {
            const res = await alcabalaService.validarQR(qrToken, tipoAcceso);
            setResultado(res);
            toast.success('Identidad Recuperada', { position: 'bottom-center' });
        } catch (error) {
            const errorMsg = error.response?.data?.detail || error.message || "Error Desconocido";
            setResultado({ 
                permitido: false, 
                mensaje: "Error de Protocolo: " + errorMsg, 
                tipo_alerta: "error" 
            });
            toast.error('Fallo en Enlace Táctico', { position: 'bottom-center' });
        } finally {
            setCargando(false);
        }
    };

    const [operador, setOperador] = useState(null);

    useEffect(() => {
        const cargarProtocolo = async () => {
             try {
                const data = await alcabalaService.getMiSituacion();
                setOperador(data);
             } catch (e) {
                console.error("Fallo obteniendo punto:", e);
             }
        };
        cargarProtocolo();
    }, []);

    const handleConfirmar = async () => {
        try {
            await alcabalaService.registrarAcceso({
                qr_id: resultado.qr_id,
                usuario_id: resultado.usuario_id,
                vehiculo_id: resultado.vehiculo_id,
                tipo: tipoAcceso,
                punto_acceso: operador?.punto?.nombre || 'Alcabala Central',
                es_manual: false
            });
            
            toast.success(`Acceso de ${resultado.socio.nombre} confirmado`);
            setResultado(null);
            
            // Forzar reactivación del radar si es necesario
            if (scannerRef.current && !scannerRef.current.isScanning) {
                scannerRef.current.toggleScanner();
            }
        } catch (error) {
            console.error("Error al persistir registro:", error);
            toast.error("Error al registrar: " + error.message);
        }
    };

    // Mapeo de Colores de Fondo según el Resultado
    const getBgColor = () => {
        if (!resultado) return 'bg-bg-app';
        if (!resultado.permitido || resultado.tipo_alerta === 'error') return 'bg-[#4a0a0a]'; // Rojo oscuro elegante
        if (resultado.infracciones_activas?.length > 0 || resultado.tipo_alerta === 'warning') return 'bg-[#4a3a0a]'; // Amarillo/Ambar oscuro
        return 'bg-[#0a2a4a]'; // Azul oscuro/verde azulado para autorizado
    };

    return (
        <div className={cn("min-h-screen pb-24 flex flex-col transition-colors duration-700", getBgColor())}>
            <Header titulo="Terminal de Escaneo" subtitle={`OPERACIÓN ${tipoAcceso.toUpperCase()}`} />
            
            <main className="flex-1 max-w-2xl mx-auto w-full px-6 pt-2 pb-6 space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                
                {/* VISOR: Solo visible si no hay resultado activo para obligar al foco */}
                {!resultado ? (
                    <>
                        <Card className="bg-black/60 border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative shadow-black/80">
                            <QRScanner 
                                ref={scannerRef}
                                onScanSuccess={handleScanSuccess} 
                                autoStart={true} 
                                status="idle"
                            />
                        </Card>

                        {/* Comandos de Seguridad Compactos */}
                        <div className="grid grid-cols-2 gap-3">
                            <Boton 
                                onClick={() => scannerRef.current?.switchCamera()}
                                variant="outline" 
                                className="h-16 rounded-2xl bg-white/5 border-white/5 flex items-center justify-center gap-3 active:scale-95 transition-all"
                            >
                                <RefreshCw size={20} className="text-primary" />
                                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Lente</span>
                            </Boton>
                            <Boton 
                                onClick={() => scannerRef.current?.toggleScanner()}
                                variant="outline" 
                                className="h-16 rounded-2xl bg-white/5 border-white/5 flex items-center justify-center gap-3 active:scale-95 transition-all"
                            >
                                {scannerRef.current?.isScanning ? (
                                    <>
                                        <Power size={20} className="text-error" />
                                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Apagar</span>
                                    </>
                                ) : (
                                    <>
                                        <Zap size={20} className="text-primary" />
                                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Activar</span>
                                    </>
                                )}
                            </Boton>
                        </div>
                    </>
                ) : (
                    /* RESULTADO DE ESCANEO: FICHA TÁCTICA EXPANDIDA */
                    <div className="space-y-4 animate-in zoom-in-95 duration-300 pb-12">
                        {/* Status Card */}
                        <div className={cn(
                            "p-6 rounded-[2.5rem] border-2 shadow-2xl flex flex-col items-center text-center gap-2 backdrop-blur-md",
                            resultado.permitido ? "bg-success/10 border-success/30" : "bg-error/10 border-error/30"
                        )}>
                            <div className={cn(
                                "w-16 h-16 rounded-full flex items-center justify-center mb-1",
                                resultado.permitido ? "bg-success/20 text-success" : "bg-error/20 text-error"
                            )}>
                                {resultado.permitido ? <CheckCircle2 size={40} /> : <XCircle size={40} />}
                            </div>
                            <h2 className={cn("text-3xl font-black uppercase tracking-tighter italic leading-none", resultado.permitido ? "text-success" : "text-error")}>
                                {resultado.permitido ? "ACCESO AUTORIZADO" : "INGRESO DENEGADO"}
                            </h2>
                            <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.3em]">{resultado.mensaje || "Validación Exitosa"}</p>
                        </div>

                        {/* Ficha Social y Vehicular */}
                        <Card className="bg-black/40 border-white/5 rounded-[2.5rem] p-6 backdrop-blur-md relative overflow-hidden">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Datos Socio */}
                                <div className="flex gap-5">
                                    <div className="w-20 h-20 bg-white/5 rounded-[2rem] border-2 border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-xl">
                                        {resultado.socio?.foto_url ? (
                                            <img src={resultado.socio.foto_url} alt="Socio" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={40} className="text-white/20" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex flex-col justify-center">
                                        <h3 className="text-2xl font-black text-white uppercase italic truncate tracking-tight leading-none mb-2">
                                            {resultado.socio?.nombre} {resultado.socio?.apellido}
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge variant="outline" className="text-[8px] bg-primary/10 border-primary/20 text-primary uppercase font-black px-3 py-1">
                                                {resultado.socio?.tipo || 'SOCIO ACTIVO'}
                                            </Badge>
                                            <span className="text-[10px] font-black text-text-muted opacity-40 uppercase tracking-widest mt-1">CI: {resultado.socio?.cedula || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Datos Vehículo (MAXIMA PRIORIDAD) */}
                                <div className="bg-primary/5 rounded-[2rem] p-6 border-2 border-primary/20 flex items-center gap-5 shadow-inner">
                                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 border border-primary/20">
                                        <Car size={32} className="text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[9px] font-black text-primary/60 uppercase tracking-[0.3em] block mb-1.5 italic">Unidad Inteligente</span>
                                        {resultado.vehiculo ? (
                                            <div className="flex flex-col">
                                                <p className="text-xl font-black text-white uppercase italic leading-none truncate mb-1">
                                                    {resultado.vehiculo.marca} {resultado.vehiculo.modelo}
                                                </p>
                                                <p className="text-3xl font-black text-primary leading-none tracking-tighter">
                                                    [{resultado.vehiculo.placa}]
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-lg font-black text-error uppercase italic">SIN VEHÍCULO REGISTRADO</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Info Adicional Táctica */}
                            <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock size={16} className="text-primary opacity-60" />
                                        <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Último Ingreso</span>
                                    </div>
                                    <p className="text-xs font-black text-white uppercase italic">
                                        {formatCaracas(resultado.ultima_entrada)}
                                    </p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Activity size={16} className="text-primary opacity-60" />
                                        <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Punto Anterior</span>
                                    </div>
                                    <p className="text-xs font-black text-white uppercase italic truncate">
                                        {resultado.ultima_entrada_punto || 'HISTORIAL LIMPIO'}
                                    </p>
                                </div>
                            </div>

                            {/* Acciones de Comando Final */}
                            <div className="flex gap-4 mt-8">
                                <Boton 
                                    onClick={() => setResultado(null)}
                                    variant="outline" 
                                    className="flex-1 h-16 rounded-2xl border-white/10 text-white/40 font-black uppercase text-[10px] tracking-widest hover:bg-white/5 hover:text-white transition-all"
                                >
                                    REANUDAR RADAR
                                </Boton>
                                <Boton 
                                    disabled={cargando || !resultado.permitido || !operador}
                                    onClick={handleConfirmar}
                                    className="flex-[2] h-16 rounded-2xl bg-primary text-bg-app font-black uppercase text-sm tracking-[0.2em] hover:bg-primary/90 shadow-2xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {cargando ? <RefreshCw className="animate-spin" size={20} /> : (
                                        <>
                                            <Shield size={20} />
                                            {!operador ? 'SINCRONIZANDO...' : `CONFIRMAR ${tipoAcceso.toUpperCase()}`}
                                        </>
                                    )}
                                </Boton>
                            </div>
                        </Card>
                    </div>
                )}
                
                <div className="h-20" />
            </main>

            {/* Overlay de Carga Táctico */}
            {cargando && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-2xl z-[120] flex items-center justify-center animate-in fade-in duration-300">
                     <div className="flex flex-col items-center gap-6">
                         <div className="relative">
                             <Zap className="text-primary animate-pulse absolute inset-0 m-auto" size={32} />
                             <div className="w-24 h-24 border-4 border-primary/10 border-t-primary rounded-full animate-spin shadow-[0_0_20px_var(--color-primary)]"></div>
                         </div>
                         <p className="text-white font-black tracking-[0.5em] text-[8px] uppercase italic animate-pulse">Sincronizando con Base de Datos...</p>
                     </div>
                </div>
            )}
        </div>
    );
};

export default ScannerAlcabala;
