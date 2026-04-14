import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { QRScanner } from '../../components/alcabala/QRScanner';
import { alcabalaService } from '../../services/alcabala.service';
import { Boton } from '../../components/ui/Boton';
import { Card } from '../../components/ui/Card';
import { 
    CheckCircle2, XCircle, User, Car, Shield,
    Zap, Activity, RefreshCw, Power, Clock, Scan, Ticket, Phone, Camera
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';

const InputManual = ({ label, value, onChange, placeholder, icon: Icon, prefix = null, loading = false }) => (
    <div className="flex flex-col gap-1 w-full relative">
        <label className="text-[8px] font-black text-primary/70 dark:text-primary/60 uppercase tracking-widest flex items-center gap-1">
            {Icon && <Icon size={10} />}
            {label}
        </label>
        <div className="relative flex items-center">
            {prefix && (
                <span className="absolute left-3 text-xs font-bold text-text-muted pointer-events-none">
                    {prefix}
                </span>
            )}
            <input 
                type="text" 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={cn(
                    "bg-bg-app dark:bg-bg-app/40 border border-text-main/10 rounded-xl px-3 py-2 text-xs font-bold text-text-main focus:border-primary/50 outline-none uppercase placeholder:text-text-muted/20 transition-all w-full",
                    prefix && "pl-10",
                    loading && "animate-pulse border-primary/30"
                )}
            />
        </div>
    </div>
);

const ScannerAlcabala = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tipoAcceso = searchParams.get('tipo') || 'entrada';
    const [resultado, setResultado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [operador, setOperador] = useState(null);
    
    // Estados para registro manual de emergencia
    const [nombreManual, setNombreManual] = useState('');
    const [cedulaManual, setCedulaManual] = useState('');
    const [telefonoManual, setTelefonoManual] = useState('');
    
    const [placaManual, setPlacaManual] = useState('');
    const [marcaManual, setMarcaManual] = useState('');
    const [modeloManual, setModeloManual] = useState('');
    const [colorManual, setColorManual] = useState('');

    const [iaLoading, setIaLoading] = useState(null); // 'cedula' o 'vehiculo'
    const [modoEscaneoIA, setModoEscaneoIA] = useState(null); // 'cedula' | 'vehiculo' | null

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
        if (cargando || modoEscaneoIA) return;
        setCargando(true);
        try {
            const res = await alcabalaService.validarQR(qrToken, tipoAcceso);
            setResultado(res);
            
            // Pre-cargar datos si existen, o limpiar si requiere manual
            if (res.socio) {
                setNombreManual(`${res.socio.nombre} ${res.socio.apellido}`);
                setCedulaManual(res.socio.cedula);
                setTelefonoManual(res.socio.telefono ? res.socio.telefono.replace('+58', '') : '');
            } else {
                setNombreManual('');
                setCedulaManual('');
                setTelefonoManual('');
            }

            if (res.vehiculo) {
                setPlacaManual(res.vehiculo.placa);
                setMarcaManual(res.vehiculo.marca);
                setModeloManual(res.vehiculo.modelo);
                setColorManual(res.vehiculo.color);
            } else {
                setPlacaManual('');
                setMarcaManual('');
                setModeloManual('');
                setColorManual('');
            }

        } catch (error) {
            const errorMsg = error.response?.data?.detail || "Error en protocolo";
            setResultado({ permitido: false, mensaje: errorMsg, tipo_alerta: "error" });
            toast.error('Fallo en validación', { position: 'bottom-center' });
        } finally {
            setCargando(false);
        }
    };

    const handleCapturarIA = async () => {
        if (!modoEscaneoIA || iaLoading) return;
        
        try {
            const video = document.querySelector('#reader-container video');
            if (!video) {
                toast.error('Sensor no disponible');
                return;
            }

            setIaLoading(modoEscaneoIA);
            
            // Capturar frame del video con alta calidad
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];

            const response = await alcabalaService.extraerDatosIA(base64, modoEscaneoIA);
            const { data } = response;

            if (modoEscaneoIA === 'cedula') {
                if (data.nombre) setNombreManual(data.nombre);
                if (data.apellido) setNombreManual(prev => `${prev} ${data.apellido}`);
                if (data.cedula) setCedulaManual(data.cedula);
                toast.success('Identidad capturada');
            } else {
                if (data.placa) setPlacaManual(data.placa);
                if (data.marca) setMarcaManual(data.marca);
                if (data.modelo) setModeloManual(data.modelo);
                if (data.color) setColorManual(data.color);
                toast.success('Vehículo capturado');
            }
            
            // Cerrar el modo escaneo tras éxito
            setModoEscaneoIA(null);
        } catch (e) {
            toast.error('Fallo en escaneo IA');
        } finally {
            setIaLoading(null);
        }
    };

    const handleConfirmar = async () => {
        try {
            setCargando(true);
            await alcabalaService.registrarAcceso({
                qr_id: resultado.qr_id,
                usuario_id: resultado.usuario_id,
                vehiculo_id: resultado.vehiculo_id,
                tipo: tipoAcceso,
                punto_acceso: operador?.punto?.nombre || 'Alcabala Central',
                es_manual: resultado.requiere_datos_manuales,
                nombre_manual: nombreManual,
                cedula_manual: cedulaManual,
                telefono_manual: telefonoManual ? `+58${telefonoManual}` : null,
                vehiculo_placa: placaManual,
                vehiculo_marca: marcaManual,
                vehiculo_modelo: modeloManual,
                vehiculo_color: colorManual
            });
            toast.success(`Acceso ${tipoAcceso} confirmado`, { position: 'bottom-center' });
            setResultado(null);
            // Limpiar campos
            setNombreManual(''); setCedulaManual(''); setTelefonoManual('');
            setPlacaManual(''); setMarcaManual(''); setModeloManual(''); setColorManual('');
        } catch (error) {
            toast.error("Error al registrar acceso");
        } finally {
            setCargando(false);
        }
    };

    const getBgColor = () => {
        if (!resultado) return 'bg-bg-app';
        // Rojo para denegado, Ámbar para advertencia, Azul para éxito
        if (!resultado.permitido || resultado.tipo_alerta === 'error') return 'bg-red-50 dark:bg-[#1a0605]';
        if (resultado.tipo_alerta === 'warning') return 'bg-amber-50 dark:bg-[#1a1205]';
        return 'bg-blue-50 dark:bg-[#041520]';
    };

    return (
        <div className={cn("min-h-screen flex flex-col transition-colors duration-700 pb-24", getBgColor())}>
            
            {/* Cabecera Adaptativa */}
            <header className="flex items-center justify-between gap-3 p-3 bg-bg-card/80 dark:bg-bg-card/40 backdrop-blur-md border-b border-text-main/10 sticky top-0 z-50 shadow-sm dark:shadow-none">
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
                
                {/* ── MODO SCANNER QR PRINCIPAL ── */}
                {!resultado && !modoEscaneoIA && (
                    <div className="flex flex-col gap-3 flex-1">
                        <Card className="flex-1 bg-black/60 border-text-main/5 rounded-[2rem] overflow-hidden shadow-2xl min-h-[320px]">
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
                                className="h-14 rounded-2xl bg-bg-card/40 border-text-main/5 flex flex-col items-center justify-center gap-1 active:scale-95"
                            >
                                <RefreshCw size={18} className="text-primary" />
                                <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Cambiar Lente</span>
                            </Boton>
                            <Boton
                                onClick={() => scannerRef.current?.toggleScanner()}
                                variant="outline"
                                className="h-14 rounded-2xl bg-bg-card/40 border-text-main/5 flex flex-col items-center justify-center gap-1 active:scale-95"
                            >
                                <Power size={18} className="text-primary" />
                                <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Energía</span>
                            </Boton>
                        </div>
                    </div>
                )}

                {/* ── MODO RESULTADO ── */}
                {resultado && (
                    <div className="flex flex-col gap-3 animate-in zoom-in-95 duration-400">
                        
                        {/* Estado de Autorización (Alerta) */}
                        <div className={cn(
                            "flex flex-col items-center text-center p-6 rounded-2xl border-2 shadow-2xl",
                            resultado.permitido ? "bg-success/5 border-success/30" : "bg-danger/20 border-danger/40"
                        )}>
                            <div className={cn(
                                "w-14 h-14 rounded-full flex items-center justify-center mb-3",
                                resultado.permitido ? "bg-success/20 text-success" : "bg-danger/40 text-white"
                            )}>
                                {resultado.permitido ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
                            </div>
                            <h2 className={cn(
                                "text-3xl font-black uppercase tracking-tighter italic leading-none",
                                resultado.permitido ? "text-success" : "text-white"
                            )}>
                                {resultado.permitido ? "AUTORIZADO" : "DENEGADO"}
                            </h2>
                            <p className={cn(
                                "text-[10px] font-bold uppercase tracking-widest mt-2",
                                resultado.permitido ? "text-text-muted" : "text-white/80"
                            )}>
                                {resultado.mensaje || "Protocolo de Seguridad BAGFM"}
                            </p>
                        </div>
                             {/* Mostrar la ficha SOLO si el pase es válido o requiere registro manual */}
                        {(resultado.permitido || resultado.requiere_datos_manuales) ? (
                            <Card className="bg-bg-card/80 dark:bg-bg-card/40 backdrop-blur-md border border-text-main/10 rounded-2xl p-4 space-y-5 shadow-sm">
                                
                                {/* Ciudadano */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-3 bg-primary rounded-full" />
                                            <h4 className="text-[9px] font-black text-text-main uppercase tracking-widest">Identidad</h4>
                                        </div>
                                        {resultado.requiere_datos_manuales && (
                                            <Boton 
                                                onClick={() => setModoEscaneoIA('cedula')}
                                                className="h-7 px-3 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20 dark:border-primary/30 flex items-center gap-1.5"
                                            >
                                                <Camera size={12} />
                                                <span className="text-[9px] font-black uppercase italic">Escanear Cédula</span>
                                            </Boton>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-bg-app border border-text-main/10 flex items-center justify-center shrink-0">
                                            {resultado.socio?.foto_url ? (
                                                <img src={resultado.socio.foto_url} className="w-full h-full object-cover rounded-2xl" />
                                            ) : (
                                                <User size={32} className="text-text-muted/30" />
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            {resultado.requiere_datos_manuales && !resultado.socio ? (
                                                <div className="grid grid-cols-1 gap-2">
                                                    <InputManual label="Nombre y Apellido" value={nombreManual} onChange={setNombreManual} />
                                                    <InputManual label="Cédula" value={cedulaManual} onChange={setCedulaManual} />
                                                </div>
                                            ) : (
                                                <>
                                                    <h3 className="text-lg font-black text-text-main uppercase leading-none italic">
                                                        {resultado.socio ? `${resultado.socio.nombre} ${resultado.socio.apellido}` : "SIN REGISTRO"}
                                                    </h3>
                                                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">CI: {resultado.socio?.cedula || "N/A"}</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Contacto */}
                                <div className="p-3 bg-bg-app/50 dark:bg-white/5 rounded-xl border border-text-main/5 space-y-2">
                                    <div className="flex items-center gap-2 text-primary/70">
                                        <Phone size={12} />
                                        <span className="text-[8px] font-black uppercase tracking-widest text-text-muted">Contacto de Seguridad (Obligatorio)</span>
                                    </div>
                                    <InputManual value={telefonoManual} onChange={setTelefonoManual} prefix="+58" placeholder="4121234567" />
                                </div>

                                {/* Vehículo */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-3 bg-primary rounded-full" />
                                            <h4 className="text-[9px] font-black text-text-main uppercase tracking-widest">Unidad de Acceso</h4>
                                        </div>
                                        {resultado.requiere_datos_manuales && (
                                            <Boton 
                                                onClick={() => setModoEscaneoIA('vehiculo')}
                                                className="h-7 px-3 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20 dark:border-primary/30 flex items-center gap-1.5"
                                            >
                                                <Car size={12} />
                                                <span className="text-[9px] font-black uppercase italic">Escanear Título</span>
                                            </Boton>
                                        )}
                                    </div>
                                    
                                    <div className="bg-bg-app border border-text-main/5 rounded-xl p-3 flex items-center gap-4">
                                        <div className="w-10 h-10 bg-primary/5 dark:bg-primary/10 rounded-lg flex items-center justify-center shrink-0 border border-primary/10 dark:border-primary/20">
                                            <Car size={20} className="text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            {resultado.requiere_datos_manuales && !resultado.vehiculo ? (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <InputManual label="Placa" value={placaManual} onChange={setPlacaManual} />
                                                    <InputManual label="Color" value={colorManual} onChange={setColorManual} />
                                                    <InputManual label="Marca" value={marcaManual} onChange={setMarcaManual} />
                                                    <InputManual label="Modelo" value={modeloManual} onChange={setModeloManual} />
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-xs font-black text-text-main uppercase italic">{resultado.vehiculo?.marca} {resultado.vehiculo?.modelo || "N/A"}</p>
                                                    <p className="text-xl font-black text-primary tracking-tighter leading-none mt-0.5">[{resultado.vehiculo?.placa || "S/V"}]</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Acciones */}
                                <div className="pt-2 flex flex-col gap-2">
                                    {resultado.permitido && (
                                        <Boton onClick={handleConfirmar} disabled={cargando} className="h-14 rounded-xl bg-primary shadow-tactica-green w-full gap-2">
                                            {cargando ? <RefreshCw className="animate-spin text-bg-app" size={20} /> : <><Shield size={18} className="text-bg-app" /><span className="text-sm font-black uppercase italic text-bg-app">Confirmar Protocolo</span></>}
                                        </Boton>
                                    )}
                                    <button onClick={() => setResultado(null)} className="h-10 text-[9px] font-black uppercase text-text-muted/60 tracking-[0.3em] bg-bg-app/50 dark:bg-white/5 rounded-lg border border-text-main/10">Abortar Operación</button>
                                </div>
                            </Card>
                        ) : (
                            // En error puro no manual, solo damos el botón de intentar de nuevo bien grande
                            <div className="flex justify-center mt-4">
                                <Boton onClick={() => setResultado(null)} className="w-full h-14 rounded-2xl border-white/20 text-white font-black uppercase tracking-widest bg-danger/80 hover:bg-danger">
                                    Intentar de nuevo
                                </Boton>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* ── OVERLAY DE ESCANEO INMERSIVO (IA) ── */}
            {modoEscaneoIA && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300">
                    <div className="absolute top-6 left-6 right-6 flex items-center justify-between text-white z-10">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Sistema OCR Tactigo</p>
                            <h2 className="text-xl font-black uppercase italic mt-1">
                                Escaneando {modoEscaneoIA === 'cedula' ? 'Identidad' : 'Documento'}
                            </h2>
                        </div>
                        <button onClick={() => setModoEscaneoIA(null)} className="p-3 bg-white/10 rounded-full border border-white/20 hover:bg-white/20 transition-all">
                            <XCircle size={28} />
                        </button>
                    </div>

                    <div className="flex-1 relative">
                        <QRScanner
                            ref={scannerRef}
                            onScanSuccess={() => {}} // Desactivar QR en IA mode
                            autoStart={true}
                        />
                        {/* Frame de Encuadre */}
                        <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-12 pointer-events-none">
                            <div className="w-full aspect-[1.6/1] border-2 border-primary/40 rounded-[2.5rem] relative">
                                <div className="absolute -top-1 -left-1 w-12 h-12 border-t-8 border-l-8 border-primary rounded-tl-3xl shadow-[0_0_15px_rgba(var(--color-primary),0.5)]" />
                                <div className="absolute -top-1 -right-1 w-12 h-12 border-t-8 border-r-8 border-primary rounded-tr-3xl shadow-[0_0_15px_rgba(var(--color-primary),0.5)]" />
                                <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-8 border-l-8 border-primary rounded-bl-3xl shadow-[0_0_15px_rgba(var(--color-primary),0.5)]" />
                                <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-8 border-r-8 border-primary rounded-br-3xl shadow-[0_0_15px_rgba(var(--color-primary),0.5)]" />
                                
                                {iaLoading && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-md rounded-[2.5rem]">
                                        <RefreshCw className="text-primary animate-spin mb-4" size={56} />
                                        <span className="text-xs font-black uppercase tracking-[0.5em] text-primary animate-pulse">Analizando...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-12 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col items-center gap-6">
                        <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] text-center max-w-xs">
                            Estabilice el documento dentro del marco de seguridad
                        </p>
                        <button 
                            onClick={handleCapturarIA}
                            disabled={iaLoading}
                            className="w-24 h-24 rounded-full bg-white/10 p-2 shadow-2xl active:scale-90 transition-all disabled:opacity-30 border-2 border-white/20"
                        >
                            <div className="w-full h-full rounded-full bg-primary flex items-center justify-center shadow-[0_0_30px_rgba(var(--color-primary),0.6)]">
                                <div className="w-16 h-16 rounded-full border-4 border-white/30" />
                            </div>
                        </button>
                        <span className="text-[11px] font-black text-primary uppercase tracking-widest italic">Capturar y Procesar</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScannerAlcabala;
