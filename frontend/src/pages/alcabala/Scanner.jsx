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
    RefreshCw, Power, Clock, Search
} from 'lucide-react';
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
            
            toast.success(`Acceso confirmado`);
            setResultado(null);
            
            if (scannerRef.current && !scannerRef.current.isScanning) {
                scannerRef.current.toggleScanner();
            }
        } catch (error) {
            console.error("Error al registrar:", error);
            toast.error("Error crítico de registro");
        }
    };

    const getBgColor = () => {
        if (!resultado) return 'bg-bg-app';
        if (!resultado.permitido || resultado.tipo_alerta === 'error') return 'bg-[#2a0505]'; // Rojo ultra-oscuro táctico
        if (resultado.infracciones_activas?.length > 0 || resultado.tipo_alerta === 'warning') return 'bg-[#2a2205]'; // Ambar oscuro
        return 'bg-[#051a2a]'; // Azul ultra-oscuro
    };

    return (
        <div className={cn("min-h-screen pb-24 flex flex-col transition-colors duration-1000 p-4 space-y-4", getBgColor())}>
            
            {/* Cabecera Táctica Integrada (Scanner v2) */}
            <header className="flex items-center justify-between gap-3 bg-bg-card/20 p-3 rounded-2xl border border-white/5 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                        <Search className="text-primary" size={20} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-sm font-black text-text-main uppercase tracking-widest leading-none">Terminal Alcabala</h1>
                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                            MODO: {tipoAcceso.toUpperCase()}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[8px] text-text-muted font-black uppercase opacity-60">Punto</p>
                    <p className="text-[10px] text-text-main font-bold truncate max-w-[100px]">{operador?.punto?.nombre || 'SINCRO...'}</p>
                </div>
            </header>
            
            <main className="flex-1 max-w-2xl mx-auto w-full space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                
                {!resultado ? (
                    <>
                        <div className="relative group">
                            <Card className="bg-black/60 border-white/5 rounded-[2rem] overflow-hidden shadow-2xl relative shadow-black/80 aspect-[4/5] sm:aspect-auto sm:h-[450px]">
                                <QRScanner 
                                    ref={scannerRef}
                                    onScanSuccess={handleScanSuccess} 
                                    autoStart={true} 
                                    status="idle"
                                />
                                {/* Overlay HUD Escáner */}
                                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-primary/40 shadow-[0_0_15px_var(--color-primary)] animate-scan-line pointer-events-none" />
                            </Card>
                        </div>

                        {/* Comandos de Seguridad */}
                        <div className="grid grid-cols-2 gap-3">
                            <Boton 
                                onClick={() => scannerRef.current?.switchCamera()}
                                variant="outline" 
                                className="h-16 rounded-2xl bg-bg-card/40 border-white/5 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
                            >
                                <RefreshCw size={18} className="text-primary" />
                                <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Rotar Lente</span>
                            </Boton>
                            <Boton 
                                onClick={() => scannerRef.current?.toggleScanner()}
                                variant="outline" 
                                className="h-16 rounded-2xl bg-bg-card/40 border-white/5 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
                            >
                                {scannerRef.current?.isScanning ? (
                                    <>
                                        <Power size={18} className="text-danger" />
                                        <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Abortar Tarea</span>
                                    </>
                                ) : (
                                    <>
                                        <Zap size={18} className="text-primary" />
                                        <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Rearmar Radar</span>
                                    </>
                                )}
                            </Boton>
                        </div>
                    </>
                ) : (
                    /* FICHA TÁCTICA EXPANDIDA — AEGIS V2 */
                    <div className="space-y-4 animate-in zoom-in-95 duration-500 pb-12">
                        {/* Estado de Autorización */}
                        <div className={cn(
                            "p-6 rounded-[2rem] border-2 shadow-2xl flex flex-col items-center text-center gap-2 backdrop-blur-xl relative overflow-hidden",
                            resultado.permitido ? "bg-success/5 border-success/20" : "bg-danger/5 border-danger/20"
                        )}>
                            <div className={cn(
                                "w-14 h-14 rounded-full flex items-center justify-center mb-1 shadow-inner border border-white/5",
                                resultado.permitido ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                            )}>
                                {resultado.permitido ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
                            </div>
                            <h2 className={cn("text-2xl font-black uppercase tracking-tighter italic leading-none", resultado.permitido ? "text-success" : "text-danger")}>
                                {resultado.permitido ? "ACCESO AUTORIZADO" : "PROTOCOLO DE RECHAZO"}
                            </h2>
                            <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.3em] opacity-60 italic">{resultado.mensaje || "Validación Exitosa"}</p>
                        </div>

                        {/* Ficha Social y Vehicular */}
                        <Card className="bg-bg-card/40 border-white/5 rounded-[2.5rem] p-6 backdrop-blur-md relative overflow-hidden">
                            <div className="space-y-8">
                                {/* Datos Socio */}
                                <div className="flex gap-4 items-center">
                                    <div className="w-16 h-16 bg-bg-app rounded-2xl border-2 border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-xl">
                                        {resultado.socio?.foto_url ? (
                                            <img src={resultado.socio.foto_url} alt="Socio" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={32} className="text-text-muted opacity-20" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-xl font-black text-text-main uppercase italic truncate tracking-tight leading-none mb-1.5">
                                            {resultado.socio?.nombre} {resultado.socio?.apellido}
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            <div className="px-2 py-0.5 rounded-md border border-primary/20 text-[7px] font-black text-primary uppercase tracking-widest bg-primary/5">
                                                {resultado.socio?.tipo || 'SOLICITANTE'}
                                            </div>
                                            <span className="text-[9px] font-black text-text-muted opacity-40 uppercase tracking-widest">ID: {resultado.socio?.cedula || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Unidad de Acceso */}
                                <div className="bg-primary/5 rounded-3xl p-5 border border-primary/20 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 border border-primary/20">
                                        <Car size={24} className="text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[7px] font-black text-primary/60 uppercase tracking-[0.3em] block mb-1">Unidad de Enlace</span>
                                        {resultado.vehiculo ? (
                                            <div className="flex flex-col">
                                                <p className="text-sm font-black text-text-main uppercase italic leading-none truncate mb-1">
                                                    {resultado.vehiculo.marca} {resultado.vehiculo.modelo}
                                                </p>
                                                <p className="text-2xl font-black text-primary leading-none tracking-tighter">
                                                    [{resultado.vehiculo.placa}]
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-sm font-black text-danger uppercase italic">SIN REGISTRO VEHICULAR</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Historial Táctico */}
                            <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-2 gap-3">
                                <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Clock size={14} className="text-primary opacity-60" />
                                        <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Registro Previo</span>
                                    </div>
                                    <p className="text-[10px] font-black text-text-main uppercase truncate">
                                        {formatCaracas(resultado.ultima_entrada)}
                                    </p>
                                </div>
                                <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Activity size={14} className="text-primary opacity-60" />
                                        <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Procedencia</span>
                                    </div>
                                    <p className="text-[10px] font-black text-text-main uppercase truncate">
                                        {resultado.ultima_entrada_punto || 'HISTORIAL VACÍO'}
                                    </p>
                                </div>
                            </div>

                            {/* Acciones de Firma Táctica */}
                            <div className="flex flex-col gap-3 mt-8">
                                <Boton 
                                    disabled={cargando || !resultado.permitido || !operador}
                                    onClick={handleConfirmar}
                                    className="w-full h-16 rounded-2xl bg-primary text-bg-app font-black uppercase text-sm tracking-[0.2em] shadow-tactica hover:scale-[1.02] transition-all disabled:opacity-40"
                                >
                                    {cargando ? <RefreshCw className="animate-spin" size={20} /> : `AUTORIZAR ${tipoAcceso.toUpperCase()}`}
                                </Boton>
                                <Boton 
                                    onClick={() => setResultado(null)}
                                    variant="ghost" 
                                    className="w-full h-12 rounded-xl text-text-muted font-black uppercase text-[9px] tracking-widest border border-white/5"
                                >
                                    REINICIAR MONITOR
                                </Boton>
                            </div>
                        </Card>
                    </div>
                )}
            </main>
            
            <div className="h-12" />
        </div>
    );
};

export default ScannerAlcabala;
