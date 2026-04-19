import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { QRScanner } from '../../components/alcabala/QRScanner';
import { alcabalaService } from '../../services/alcabala.service';
import { Boton } from '../../components/ui/Boton';
import { Card } from '../../components/ui/Card';
import { 
    CheckCircle2, XCircle, User, Car, Shield,
    RefreshCw, Power, Scan, Phone, Camera,
    UserCheck, UserPlus, ArrowRight, MapPin, ParkingSquare
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';

const InputManual = ({ label, value, onChange, placeholder, icon: Icon, prefix = null, loading = false }) => (
    <div className="flex flex-col gap-1 w-full relative">
        <label className="text-[8px] font-black text-primary/60 uppercase tracking-widest flex items-center gap-1">
            {Icon && <Icon size={10} />}
            {label}
        </label>
        <div className="relative flex items-center">
            {prefix && (
                <span className="absolute left-3 text-xs font-bold text-white/40 pointer-events-none">
                    {prefix}
                </span>
            )}
            <input 
                type="text" 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={cn(
                    "bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-text-main focus:border-primary/50 outline-none uppercase placeholder:text-white/20 transition-all w-full",
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
    
    // Estado para el panel de datos opcional (visible sólo si el usuario lo activa)
    const [mostrarDatos, setMostrarDatos] = useState(false);
    
    // Estados para registro manual
    const [nombreManual, setNombreManual] = useState('');
    const [cedulaManual, setCedulaManual] = useState('');
    const [telefonoManual, setTelefonoManual] = useState('');
    const [placaManual, setPlacaManual] = useState('');
    const [marcaManual, setMarcaManual] = useState('');
    const [modeloManual, setModeloManual] = useState('');
    const [colorManual, setColorManual] = useState('');

    const [iaLoading, setIaLoading] = useState(null);
    const [modoEscaneoIA, setModoEscaneoIA] = useState(null);

    const scannerRef = useRef(null);

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
        setMostrarDatos(false);
        try {
            const res = await alcabalaService.validarQR(qrToken, tipoAcceso);
            setResultado(res);
            
            // Pre-cargar datos si el socio ya está registrado
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

            // Si hay datos del socio, activar automáticamente el panel de datos
            if (res.socio || res.vehiculo) {
                setMostrarDatos(true);
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
                es_manual: resultado.requiere_datos_manuales || mostrarDatos,
                nombre_manual: nombreManual || null,
                cedula_manual: cedulaManual || null,
                telefono_manual: telefonoManual ? `+58${telefonoManual}` : null,
                vehiculo_placa: placaManual || null,
                vehiculo_marca: marcaManual || null,
                vehiculo_modelo: modeloManual || null,
                vehiculo_color: colorManual || null,
            });
            toast.success(`Acceso ${tipoAcceso} confirmado`, { position: 'bottom-center' });
            reiniciar();
        } catch (error) {
            toast.error("Error al registrar acceso");
        } finally {
            setCargando(false);
        }
    };

    const reiniciar = () => {
        setResultado(null);
        setMostrarDatos(false);
        setNombreManual(''); setCedulaManual(''); setTelefonoManual('');
        setPlacaManual(''); setMarcaManual(''); setModeloManual(''); setColorManual('');
    };

    const getBgColor = () => {
        if (!resultado) return 'bg-bg-app';
        if (!resultado.permitido || resultado.tipo_alerta === 'error') return 'bg-red-50 dark:bg-[#1a0605]';
        if (resultado.tipo_alerta === 'warning') return 'bg-amber-50 dark:bg-[#1a1205]';
        return 'bg-blue-50 dark:bg-[#041520]';
    };

    return (
        <div className={cn("min-h-screen flex flex-col transition-colors duration-700 pb-24", getBgColor())}>
            
            {/* Cabecera */}
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
                            "flex flex-col items-center text-center p-5 rounded-2xl border-2",
                            resultado.permitido ? "bg-success/5 border-success/30" : "bg-danger/5 border-danger/30"
                        )}>
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center mb-2 shadow-lg",
                                resultado.permitido ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                            )}>
                                {resultado.permitido ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
                            </div>
                            <h2 className={cn("text-2xl font-black uppercase tracking-tight italic", resultado.permitido ? "text-success" : "text-danger")}>
                                {resultado.permitido ? "AUTORIZADO" : "DENEGADO"}
                            </h2>
                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-1">
                                {resultado.mensaje || "Validación de Protocolo"}
                            </p>
                            {/* Zona/Puesto asignado si existe */}
                            {resultado.permitido && resultado.zona_asignada_id && (
                                <div className="mt-2 flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full">
                                    <ParkingSquare size={12} className="text-primary" />
                                    <span className="text-[9px] font-black text-primary uppercase tracking-wider">
                                        {resultado.puesto_asignado_id ? `Puesto ${resultado.puesto_asignado_id}` : 'Zona Asignada'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* ── ACCIONES RÁPIDAS (QR válido sin datos extra) ── */}
                        {resultado.permitido && !mostrarDatos && (
                            <div className="flex flex-col gap-2">
                                {/* Botón principal: Registrar Entrada */}
                                <Boton 
                                    onClick={handleConfirmar} 
                                    disabled={cargando}
                                    className="h-16 rounded-xl bg-primary shadow-tactica-green w-full gap-3 text-sm font-black uppercase italic tracking-wide"
                                >
                                    {cargando ? <RefreshCw className="animate-spin" size={20} /> : (
                                        <>
                                            <Shield size={20} />
                                            Confirmar {tipoAcceso === 'entrada' ? 'Entrada' : 'Salida'}
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </Boton>

                                {/* Botón secundario: Registrar Datos (opcional) */}
                                <button 
                                    onClick={() => setMostrarDatos(true)}
                                    className="h-12 w-full rounded-xl border border-primary/30 bg-primary/5 text-primary flex items-center justify-center gap-2 active:scale-95 transition-all"
                                >
                                    <UserPlus size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Registrar Datos (Opcional)</span>
                                </button>

                                {/* Botón terciario: Seguir Escaneando */}
                                <button 
                                    onClick={reiniciar}
                                    className="h-10 w-full text-[9px] font-black uppercase text-text-muted/60 tracking-[0.3em] bg-white/5 rounded-lg border border-white/5 flex items-center justify-center gap-2"
                                >
                                    <Scan size={12} />
                                    Seguir Escaneando
                                </button>
                            </div>
                        )}

                        {/* ── PANEL DE DATOS COMPLETO (si mostrarDatos=true o QR sin validar manual) ── */}
                        {(resultado.permitido && mostrarDatos) || resultado.requiere_datos_manuales ? (
                            <Card className="bg-bg-card/40 backdrop-blur-md border-white/5 rounded-2xl p-4 space-y-5">
                                
                                {/* Sección: Datos del Ciudadano */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-3 bg-primary rounded-full" />
                                            <h4 className="text-[9px] font-black text-text-main uppercase tracking-widest">Datos del Ciudadano</h4>
                                        </div>
                                        <button 
                                            onClick={() => setModoEscaneoIA('cedula')}
                                            className="h-7 px-3 rounded-lg bg-primary/20 text-primary border border-primary/30 flex items-center gap-1.5"
                                        >
                                            <Camera size={12} />
                                            <span className="text-[9px] font-black uppercase italic">Escanear Cédula</span>
                                        </button>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-1">
                                            {resultado.socio?.foto_url ? (
                                                <img src={resultado.socio.foto_url} className="w-full h-full object-cover rounded-2xl" />
                                            ) : (
                                                <User size={28} className="text-white/20" />
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <InputManual 
                                                label="Nombre y Apellido" 
                                                value={nombreManual} 
                                                onChange={setNombreManual}
                                                placeholder={resultado.socio ? `${resultado.socio.nombre} ${resultado.socio.apellido}` : "NOMBRE COMPLETO"}
                                            />
                                            <InputManual 
                                                label="Número de Cédula" 
                                                value={cedulaManual} 
                                                onChange={setCedulaManual}
                                                placeholder={resultado.socio?.cedula || "V-00000000"}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Sección: Contacto */}
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Phone size={12} className="text-primary/70" />
                                        <span className="text-[8px] font-black uppercase tracking-widest text-text-muted">Teléfono de Contacto</span>
                                    </div>
                                    <InputManual label="Móvil" value={telefonoManual} onChange={setTelefonoManual} prefix="+58" placeholder="4121234567" />
                                </div>

                                {/* Sección: Vehículo */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-3 bg-primary rounded-full" />
                                            <h4 className="text-[9px] font-black text-text-main uppercase tracking-widest">Unidad de Acceso</h4>
                                        </div>
                                        <button 
                                            onClick={() => setModoEscaneoIA('vehiculo')}
                                            className="h-7 px-3 rounded-lg bg-primary/20 text-primary border border-primary/30 flex items-center gap-1.5"
                                        >
                                            <Car size={12} />
                                            <span className="text-[9px] font-black uppercase italic">Escanear Título</span>
                                        </button>
                                    </div>
                                    
                                    <div className="bg-bg-app border border-white/5 rounded-xl p-3 flex items-start gap-3">
                                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 border border-primary/20 mt-1">
                                            <Car size={20} className="text-primary" />
                                        </div>
                                        <div className="flex-1 grid grid-cols-2 gap-2">
                                            <InputManual label="Placa" value={placaManual} onChange={setPlacaManual} placeholder={resultado.vehiculo?.placa || "AB123CD"} />
                                            <InputManual label="Color" value={colorManual} onChange={setColorManual} placeholder={resultado.vehiculo?.color || "BLANCO"} />
                                            <InputManual label="Marca" value={marcaManual} onChange={setMarcaManual} placeholder={resultado.vehiculo?.marca || "TOYOTA"} />
                                            <InputManual label="Modelo" value={modeloManual} onChange={setModeloManual} placeholder={resultado.vehiculo?.modelo || "HILUX"} />
                                        </div>
                                    </div>
                                </div>

                                {/* Acciones */}
                                <div className="pt-2 flex flex-col gap-2">
                                    <Boton onClick={handleConfirmar} disabled={cargando} className="h-14 rounded-xl bg-primary shadow-tactica-green w-full gap-2">
                                        {cargando ? <RefreshCw className="animate-spin" size={20} /> : <><UserCheck size={18} /><span className="text-sm font-black uppercase italic">Confirmar con Datos</span></>}
                                    </Boton>
                                    <button onClick={reiniciar} className="h-10 text-[9px] font-black uppercase text-text-muted/60 tracking-[0.3em] bg-white/5 rounded-lg border border-white/5">Abortar Operación</button>
                                </div>
                            </Card>
                        ) : null}

                        {/* QR Denegado */}
                        {!resultado.permitido && (
                            <button onClick={reiniciar} className="w-full h-12 text-[9px] font-black uppercase text-white/60 tracking-[0.3em] bg-white/5 rounded-xl border border-white/10 flex items-center justify-center gap-2">
                                <Scan size={14} />
                                Intentar de nuevo
                            </button>
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
                            onScanSuccess={() => {}}
                            autoStart={true}
                        />
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
