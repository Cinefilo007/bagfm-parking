import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { QRScanner } from '../../components/alcabala/QRScanner';
import { alcabalaService } from '../../services/alcabala.service';
import { Boton } from '../../components/ui/Boton';
import { Card } from '../../components/ui/Card';
import { 
    CheckCircle2, XCircle, User, Car, Shield,
    Zap, Activity, RefreshCw, Power, Clock, Scan
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';

const ScannerAlcabala = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tipoAcceso = searchParams.get('tipo') || 'entrada';
    const [resultado, setResultado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [operador, setOperador] = useState(null);
    const scannerRef = useRef(null);

    // Formato Caracas para fechas
    const formatCaracas = (dateStr) => {
        if (!dateStr) return 'Sin registro previo';
        return new Intl.DateTimeFormat('es-VE', {
            timeZone: 'America/Caracas',
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        }).format(new Date(dateStr));
    };

    useEffect(() => {
        const syncSituacion = async () => {
            try {
                const data = await alcabalaService.getMiSituacion();
                setOperador(data);
                if (!data.identificado) {
                    toast.error('Sesión operativa no válida o relevo pendiente');
                    navigate('/alcabala/dashboard');
                }
            } catch (e) {
                console.error("Fallo sincronizando situación táctica:", e);
                navigate('/alcabala/dashboard');
            }
        };
        syncSituacion();
    }, [navigate]);

    const handleScanSuccess = async (qrToken) => {
        if (cargando) return;
        setCargando(true);
        try {
            const res = await alcabalaService.validarQR(qrToken, tipoAcceso);
            setResultado(res);
        } catch (error) {
            const errorMsg = error.response?.data?.detail || "Error en protocolo";
            setResultado({ permitido: false, mensaje: errorMsg, tipo_alerta: "error" });
            toast.error('Fallo en validación', { position: 'bottom-center' });
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
                punto_acceso: operador?.punto?.nombre || 'Alcabala Central',
                es_manual: false
            });
            toast.success(`Acceso ${tipoAcceso} confirmado`, { position: 'bottom-center' });
            
            // Limpiar resultado para volver al modo escáner
            setResultado(null);
        } catch (error) {
            toast.error("Error al registrar acceso");
        }
    };

    // Color de fondo dinámico según resultado del escaneo
    const getBgColor = () => {
        if (!resultado) return 'bg-bg-app';
        if (!resultado.permitido || resultado.tipo_alerta === 'error') return 'bg-[#1a0605]';
        if (resultado.tipo_alerta === 'warning') return 'bg-[#1a1205]';
        return 'bg-[#041520]';
    };

    return (
        <div className={cn("min-h-screen flex flex-col transition-colors duration-700 pb-24", getBgColor())}>
            
            {/* ─── Cabecera Compacta del Scanner ─── */}
            <header className="flex items-center justify-between gap-3 p-3 bg-bg-card/20 backdrop-blur-md border-b border-white/5 sticky top-0 z-10">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
                        <Scan className="text-primary" size={18} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-text-main uppercase tracking-wide leading-none">Terminal Alcabala</h1>
                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", resultado ? (resultado.permitido ? 'bg-success' : 'bg-danger') : 'bg-success animate-pulse')} />
                            Modo: {tipoAcceso.toUpperCase()}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[8px] text-text-muted font-black uppercase tracking-widest opacity-60">Punto de Control</p>
                    <p className="text-[10px] text-text-main font-bold">{operador?.punto?.nombre || 'Sincronizando...'}</p>
                </div>
            </header>
            
            <main className="flex-1 flex flex-col p-3 gap-3 max-w-lg mx-auto w-full">
                
                {/* ── MODO ESCÁNER: Sin resultado activo ── */}
                {!resultado && (
                    <>
                        <Card className="bg-black/60 border-white/5 rounded-[2rem] overflow-hidden shadow-2xl flex-1 min-h-[320px]">
                            <QRScanner
                                ref={scannerRef}
                                onScanSuccess={handleScanSuccess}
                                autoStart={true}
                                status="idle"
                            />
                        </Card>

                        <div className="grid grid-cols-2 gap-2">
                            <Boton
                                onClick={() => scannerRef.current?.switchCamera()}
                                variant="outline"
                                className="h-14 rounded-2xl bg-bg-card/40 border-white/5 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
                            >
                                <RefreshCw size={18} className="text-primary" />
                                <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Cambiar Lente</span>
                            </Boton>
                            <Boton
                                onClick={() => scannerRef.current?.toggleScanner()}
                                variant="outline"
                                className="h-14 rounded-2xl bg-bg-card/40 border-white/5 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
                            >
                                <Power size={18} className="text-primary" />
                                <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Activar/Apagar</span>
                            </Boton>
                        </div>
                    </>
                )}

                {/* ── MODO RESULTADO: Ficha táctica expandida ── */}
                {resultado && (
                    <div className="flex flex-col gap-3 animate-in zoom-in-95 duration-400">
                        
                        {/* Estado de Autorización */}
                        <div className={cn(
                            "flex flex-col items-center text-center p-5 rounded-2xl border-2",
                            resultado.permitido
                                ? "bg-success/5 border-success/30"
                                : "bg-danger/5 border-danger/30"
                        )}>
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center mb-2",
                                resultado.permitido ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                            )}>
                                {resultado.permitido ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
                            </div>
                            <h2 className={cn(
                                "text-2xl font-black uppercase tracking-tight italic leading-none",
                                resultado.permitido ? "text-success" : "text-danger"
                            )}>
                                {resultado.permitido ? "AUTORIZADO" : "DENEGADO"}
                            </h2>
                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-1 opacity-70">
                                {resultado.mensaje || "Validación Exitosa"}
                            </p>
                        </div>

                        {/* Ficha del Socio */}
                        <Card className="bg-bg-card/50 border-white/5 rounded-2xl overflow-hidden">
                            <div className="p-4 space-y-4">
                                
                                    {/* Identidad del Socio o Evento */}
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-14 h-14 rounded-2xl border-2 flex items-center justify-center shrink-0 overflow-hidden shadow-xl",
                                            resultado.es_pase_masivo ? "bg-warning/10 border-warning/30" : "bg-bg-app border-white/10"
                                        )}>
                                            {resultado.es_pase_masivo ? (
                                                <Ticket size={28} className="text-warning" />
                                            ) : (
                                                resultado.socio?.foto_url ? (
                                                    <img src={resultado.socio.foto_url} alt="Socio" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={28} className="text-text-muted opacity-30" />
                                                )
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {/* Nombre / Evento */}
                                            <h3 className="text-xl font-black text-text-main uppercase italic leading-tight break-words">
                                                {resultado.es_pase_masivo ? resultado.nombre_evento : `${resultado.socio?.nombre} ${resultado.socio?.apellido}`}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-widest",
                                                    resultado.es_pase_masivo 
                                                        ? "bg-warning/10 border-warning/20 text-warning" 
                                                        : "bg-primary/5 border-primary/20 text-primary"
                                                )}>
                                                    {resultado.es_pase_masivo ? 'PASE MASIVO' : (resultado.socio?.tipo || 'SOCIO ACTIVO')}
                                                </span>
                                                <span className="text-[9px] font-bold text-text-muted uppercase tracking-wide">
                                                    {resultado.es_pase_masivo ? `SERIAL: ${resultado.serial_legible}` : `CI: ${resultado.socio?.cedula || 'N/A'}`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                {/* Línea divisoria */}
                                <div className="border-t border-white/5" />

                                {/* Vehículo — Máxima prioridad visual */}
                                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4">
                                    <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 border border-primary/20">
                                        <Car size={22} className="text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[8px] font-black text-primary/60 uppercase tracking-[0.25em] mb-1">Unidad de Acceso</p>
                                        {resultado.vehiculo ? (
                                            <div>
                                                {/* Marca y Modelo — sin truncado */}
                                                <p className="text-sm font-black text-text-main uppercase italic leading-tight break-words">
                                                    {resultado.vehiculo.marca} {resultado.vehiculo.modelo}
                                                </p>
                                                {/* Placa — valor más importante, siempre visible */}
                                                <p className="text-2xl font-black text-primary leading-none tracking-tighter mt-0.5">
                                                    [{resultado.vehiculo.placa}]
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-sm font-black text-danger uppercase italic">
                                                SIN VEHÍCULO REGISTRADO
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Historial / Info Adicional */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            {resultado.es_pase_masivo ? (
                                                <Zap size={12} className="text-warning opacity-70 shrink-0" />
                                            ) : (
                                                <Clock size={12} className="text-primary opacity-70 shrink-0" />
                                            )}
                                            <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">
                                                {resultado.es_pase_masivo ? 'Accesos Restantes' : 'Último Ingreso'}
                                            </span>
                                        </div>
                                        <p className={cn(
                                            "text-[10px] font-bold uppercase leading-snug",
                                            resultado.es_pase_masivo ? "text-warning animate-pulse" : "text-text-main"
                                        )}>
                                            {resultado.es_pase_masivo 
                                                ? (resultado.accesos_restantes !== null ? `${resultado.accesos_restantes} DISPONIBLES` : 'SIN LÍMITE') 
                                                : formatCaracas(resultado.ultima_entrada)}
                                        </p>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <Activity size={12} className="text-primary opacity-70 shrink-0" />
                                            <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Punto Anterior</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-text-main uppercase leading-snug break-words">
                                            {resultado.ultima_entrada_punto || 'HISTORIAL VACÍO'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Acciones de Firma — botones full-width para evitar truncado */}
                            <div className="p-4 pt-0 flex flex-col gap-2">
                                {resultado.permitido && (
                                    <Boton
                                        disabled={cargando || !operador}
                                        onClick={handleConfirmar}
                                        className="w-full h-14 rounded-xl bg-primary text-bg-app font-black uppercase tracking-widest text-sm shadow-tactica hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                                    >
                                        {cargando ? (
                                            <RefreshCw className="animate-spin" size={20} />
                                        ) : (
                                            <>
                                                <Shield size={18} />
                                                <span>Confirmar {tipoAcceso.charAt(0).toUpperCase() + tipoAcceso.slice(1)}</span>
                                            </>
                                        )}
                                    </Boton>
                                )}
                                <button
                                    onClick={() => setResultado(null)}
                                    className="w-full h-11 rounded-xl border border-white/10 text-text-muted font-black uppercase text-[9px] tracking-widest hover:bg-white/5 active:scale-[0.99] transition-all"
                                >
                                    Reiniciar Monitor
                                </button>
                            </div>
                        </Card>
                    </div>
                )}
            </main>

            {/* Overlay de carga */}
            {cargando && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xl z-50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-text-main font-black tracking-[0.4em] text-[9px] uppercase animate-pulse">
                            Validando protocolo...
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScannerAlcabala;
