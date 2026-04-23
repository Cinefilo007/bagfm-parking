import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { QRScanner } from '../../components/alcabala/QRScanner';
import { alcabalaService } from '../../services/alcabala.service';
import { Boton } from '../../components/ui/Boton';
import { Card } from '../../components/ui/Card';
import {
    CheckCircle2, XCircle, User, Car, Shield,
    RefreshCw, Power, Scan, Phone, Camera,
    UserCheck, UserPlus, ArrowRight, ParkingSquare,
    Building2, AlertTriangle, Hash, Tag
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';

/* ── Input para el formulario manual de registrar datos ── */
const InputManual = ({ label, value, onChange, placeholder, prefix = null, loading = false }) => (
    <div className="flex flex-col gap-1 w-full relative">
        <label className="text-[8px] font-black text-text-muted uppercase tracking-widest">
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
                    "bg-bg-low border border-bg-high rounded-xl px-3 py-2 text-xs font-bold text-text-main",
                    "focus:border-primary/60 outline-none uppercase placeholder:text-text-muted/40 transition-all w-full",
                    prefix && "pl-10",
                    loading && "animate-pulse border-primary/30"
                )}
            />
        </div>
    </div>
);

/* ── Tarjeta de datos del socio (modo lectura) ── */
const FichaSocio = ({ socio, vehiculo, vehiculos, vehiculoSeleccionadoId, onSeleccionarVehiculo, entidad }) => {
    const tieneVariosVehiculos = vehiculos && vehiculos.length > 1;

    return (
        <div
            className="rounded-2xl overflow-hidden border border-bg-high"
            style={{ background: 'var(--bg-card)' }}
        >
            {/* Cabecera socio */}
            <div
                className="flex items-center gap-3 p-3 border-b border-bg-high"
                style={{ background: 'var(--bg-low)' }}
            >
                <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-bg-high overflow-hidden"
                    style={{ background: 'var(--bg-app)' }}
                >
                    {socio?.foto_url
                        ? <img src={socio.foto_url} className="w-full h-full object-cover" alt="Foto" />
                        : <User size={22} className="text-text-muted" />
                    }
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-text-main leading-tight truncate">
                        {socio ? `${socio.nombre} ${socio.apellido}` : 'Visitante sin registro'}
                    </p>
                    <p className="text-[10px] font-bold text-text-muted truncate">
                        {socio?.cedula || 'Cédula no registrada'}
                    </p>
                </div>
                {entidad && (
                    <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-full shrink-0">
                        <Building2 size={10} className="text-primary" />
                        <span className="text-[8px] font-black text-primary uppercase tracking-wider truncate max-w-[80px]">
                            {entidad}
                        </span>
                    </div>
                )}
            </div>

            {/* Info contacto */}
            {socio?.telefono && (
                <div className="flex items-center gap-2 px-3 py-2 border-b border-bg-high">
                    <Phone size={11} className="text-primary/70 shrink-0" />
                    <span className="text-[10px] font-bold text-text-muted">{socio.telefono}</span>
                </div>
            )}

            {/* Vehículo(s) */}
            {tieneVariosVehiculos ? (
                <div className="p-3 space-y-2">
                    <p className="text-[8px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1">
                        <Car size={10} />
                        Seleccionar vehículo de acceso
                    </p>
                    <div className="space-y-1.5">
                        {vehiculos.map((v) => (
                            <button
                                key={v.id}
                                onClick={() => onSeleccionarVehiculo(v.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left",
                                    vehiculoSeleccionadoId === v.id
                                        ? "border-primary bg-primary/10"
                                        : "border-bg-high bg-bg-low hover:border-primary/40"
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                    vehiculoSeleccionadoId === v.id ? "bg-primary/20" : "bg-bg-app"
                                )}>
                                    <Car size={16} className={vehiculoSeleccionadoId === v.id ? "text-primary" : "text-text-muted"} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        "text-[10px] font-black uppercase truncate",
                                        vehiculoSeleccionadoId === v.id ? "text-primary" : "text-text-main"
                                    )}>
                                        {v.placa}
                                    </p>
                                    <p className="text-[9px] text-text-muted truncate">
                                        {v.color} · {v.marca} {v.modelo}
                                    </p>
                                </div>
                                {vehiculoSeleccionadoId === v.id && (
                                    <CheckCircle2 size={14} className="text-primary shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            ) : vehiculo ? (
                <div className="flex items-center gap-3 p-3">
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-primary/20"
                        style={{ background: 'var(--bg-low)' }}
                    >
                        <Car size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-text-main uppercase">{vehiculo.placa}</p>
                        <p className="text-[9px] text-text-muted">
                            {vehiculo.color} · {vehiculo.marca} {vehiculo.modelo}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2 p-3">
                    <Car size={14} className="text-text-muted/50" />
                    <span className="text-[10px] text-text-muted italic">Sin vehículo registrado</span>
                </div>
            )}
        </div>
    );
};

/* ── Badge de pase masivo ── */
const BadgePaseMasivo = ({ nombre_evento, serial_legible, accesos_restantes }) => (
    <div
        className="rounded-xl p-3 border border-warning/20 flex items-start gap-2.5"
        style={{ background: 'color-mix(in srgb, var(--warning) 8%, var(--bg-card))' }}
    >
        <Tag size={14} className="text-warning shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-0.5">
            <p className="text-[10px] font-black text-text-main uppercase truncate">{nombre_evento || 'Evento BAGFM'}</p>
            {serial_legible && (
                <p className="text-[9px] text-text-muted flex items-center gap-1">
                    <Hash size={9} />
                    {serial_legible}
                </p>
            )}
            {accesos_restantes !== null && accesos_restantes !== undefined && (
                <p className="text-[9px] text-warning font-bold">
                    Accesos restantes: {accesos_restantes}
                </p>
            )}
        </div>
    </div>
);

/* ══════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════════ */
const ScannerAlcabala = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tipoAcceso = searchParams.get('tipo') || 'entrada';

    const [resultado, setResultado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [operador, setOperador] = useState(null);

    // Vehículo seleccionado cuando hay múltiples
    const [vehiculoSeleccionadoId, setVehiculoSeleccionadoId] = useState(null);

    // Modal de registro manual (SÓLO visible cuando el guardia lo activa)
    const [mostrarFormulario, setMostrarFormulario] = useState(false);

    // Datos del formulario manual
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
    const resultadoRef = useRef(null);

    /* ── Sincronizar situación del guardia ── */
    useEffect(() => {
        const sync = async () => {
            try {
                const data = await alcabalaService.getMiSituacion();
                setOperador(data);
                if (!data.identificado) {
                    toast.error('Sesión operativa no válida o relevo pendiente');
                    navigate('/alcabala/dashboard');
                }
            } catch {
                navigate('/alcabala/dashboard');
            }
        };
        sync();
    }, [navigate]);

    /* ── Al obtener resultado, scroll al tope suavemente ── */
    useEffect(() => {
        if (resultado) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [resultado]);

    /* ── Manejar escaneo de QR ── */
    const handleScanSuccess = async (qrToken) => {
        if (cargando || modoEscaneoIA) return;
        setCargando(true);
        setMostrarFormulario(false);
        setVehiculoSeleccionadoId(null);

        try {
            const res = await alcabalaService.validarQR(qrToken, tipoAcceso);
            setResultado(res);

            // Pre-seleccionar primer vehículo del socio
            if (res.vehiculos && res.vehiculos.length > 0) {
                setVehiculoSeleccionadoId(res.vehiculos[0].id);
            } else if (res.vehiculo) {
                setVehiculoSeleccionadoId(res.vehiculo.id);
            }

        } catch (error) {
            const msg = error.response?.data?.detail || 'Error en protocolo';
            setResultado({ permitido: false, mensaje: msg, tipo_alerta: 'error' });
            toast.error('Fallo en validación', { position: 'bottom-center' });
        } finally {
            setCargando(false);
        }
    };

    /* ── Abrir formulario de datos opcionales ── */
    const handleAbrirFormulario = () => {
        // Rellenar con datos del socio si ya existen
        if (resultado?.socio) {
            setNombreManual(`${resultado.socio.nombre} ${resultado.socio.apellido}`);
            setCedulaManual(resultado.socio.cedula || '');
            setTelefonoManual(resultado.socio.telefono ? resultado.socio.telefono.replace('+58', '') : '');
        }
        // Rellenar con vehículo seleccionado
        const veh = resultado?.vehiculos?.find(v => v.id === vehiculoSeleccionadoId) || resultado?.vehiculo;
        if (veh) {
            setPlacaManual(veh.placa || '');
            setMarcaManual(veh.marca || '');
            setModeloManual(veh.modelo || '');
            setColorManual(veh.color || '');
        }
        setMostrarFormulario(true);
    };

    /* ── Captura IA ── */
    const handleCapturarIA = async () => {
        if (!modoEscaneoIA || iaLoading) return;
        try {
            const video = document.querySelector('#reader-container video');
            if (!video) { toast.error('Sensor no disponible'); return; }
            setIaLoading(modoEscaneoIA);
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
            const response = await alcabalaService.extraerDatosIA(base64, modoEscaneoIA);
            const { data } = response;
            if (modoEscaneoIA === 'cedula') {
                if (data.nombre) setNombreManual(data.nombre + (data.apellido ? ` ${data.apellido}` : ''));
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
        } catch { toast.error('Fallo en escaneo IA'); }
        finally { setIaLoading(null); }
    };

    /* ── Confirmar acceso (botón principal, sin formulario) ── */
    const handleConfirmar = async () => {
        try {
            setCargando(true);
            await alcabalaService.registrarAcceso({
                qr_id: resultado.qr_id,
                usuario_id: resultado.usuario_id,
                vehiculo_id: vehiculoSeleccionadoId || resultado.vehiculo_id,
                tipo: tipoAcceso,
                punto_acceso: operador?.punto?.nombre || 'Alcabala Principal',
                es_manual: false,
            });
            toast.success(`Acceso ${tipoAcceso} confirmado`, { position: 'bottom-center' });
            reiniciar();
        } catch (error) {
            toast.error('Error al registrar acceso');
        } finally {
            setCargando(false);
        }
    };

    /* ── Confirmar acceso CON datos del formulario ── */
    const handleConfirmarConDatos = async () => {
        try {
            setCargando(true);
            await alcabalaService.registrarAcceso({
                qr_id: resultado?.qr_id,
                usuario_id: resultado?.usuario_id,
                vehiculo_id: vehiculoSeleccionadoId || resultado?.vehiculo_id,
                tipo: tipoAcceso,
                punto_acceso: operador?.punto?.nombre || 'Alcabala Principal',
                es_manual: true,
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
        } catch {
            toast.error('Error al registrar acceso');
        } finally {
            setCargando(false);
        }
    };

    const reiniciar = () => {
        setResultado(null);
        setMostrarFormulario(false);
        setVehiculoSeleccionadoId(null);
        setNombreManual(''); setCedulaManual(''); setTelefonoManual('');
        setPlacaManual(''); setMarcaManual(''); setModeloManual(''); setColorManual('');
    };

    /* ── Colores de fondo según resultado y modo ── */
    const getEstiloFondo = () => {
        if (!resultado) return {};
        if (!resultado.permitido || resultado.tipo_alerta === 'error') {
            return { background: 'color-mix(in srgb, var(--danger) 5%, var(--bg-app))' };
        }
        if (resultado.tipo_alerta === 'warning') {
            return { background: 'color-mix(in srgb, var(--warning) 5%, var(--bg-app))' };
        }
        return { background: 'color-mix(in srgb, var(--success) 4%, var(--bg-app))' };
    };

    /* ══════════════════════════════════════════════════
       RENDER
    ══════════════════════════════════════════════════ */
    return (
        <div
            className="min-h-screen flex flex-col transition-colors duration-500 pb-24"
            style={getEstiloFondo()}
        >
            {/* ── Cabecera ── */}
            <header
                className="flex items-center justify-between gap-3 p-3 sticky top-0 z-50 border-b"
                style={{
                    background: 'color-mix(in srgb, var(--bg-card) 90%, transparent)',
                    backdropFilter: 'blur(12px)',
                    borderColor: 'var(--bg-high)',
                }}
            >
                <div className="flex items-center gap-2.5">
                    <div
                        className="p-1.5 rounded-lg shrink-0"
                        style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}
                    >
                        <Scan className="text-primary" size={18} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-text-main uppercase tracking-wide leading-none">
                            Terminal Alcabala
                        </h1>
                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                            <span className={cn(
                                "w-1.5 h-1.5 rounded-full shrink-0",
                                resultado
                                    ? (resultado.permitido ? 'bg-success' : 'bg-danger')
                                    : 'bg-success animate-pulse'
                            )} />
                            Modo: {tipoAcceso.toUpperCase()}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[8px] text-text-muted font-black uppercase tracking-widest opacity-60">
                        Punto de Control
                    </p>
                    <p className="text-[10px] text-text-main font-bold">
                        {operador?.punto?.nombre || 'Sincronizando...'}
                    </p>
                </div>
            </header>

            {/* ── Contenido Principal ── */}
            <main className="flex-1 flex flex-col p-3 gap-3 max-w-lg mx-auto w-full">

                {/* ══ MODO SCANNER (pantalla inicial) ══ */}
                {!resultado && !modoEscaneoIA && (
                    <div className="flex flex-col gap-4 items-center justify-center flex-1 w-full max-w-sm mx-auto">
                        <Card
                            className="w-full aspect-square border-0 rounded-[2rem] overflow-hidden shadow-2xl bg-black"
                        >
                            <QRScanner
                                ref={scannerRef}
                                onScanSuccess={handleScanSuccess}
                                autoStart={true}
                                status="idle"
                            />
                        </Card>

                        <div className="grid grid-cols-2 gap-2 w-full mt-4">
                            <Boton
                                onClick={() => scannerRef.current?.switchCamera()}
                                variant="outline"
                                className="h-14 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--bg-high)' }}
                            >
                                <RefreshCw size={18} className="text-primary" />
                                <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">
                                    Cambiar Lente
                                </span>
                            </Boton>
                            <Boton
                                onClick={() => scannerRef.current?.toggleScanner()}
                                variant="outline"
                                className="h-14 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--bg-high)' }}
                            >
                                <Power size={18} className="text-primary" />
                                <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">
                                    Energía
                                </span>
                            </Boton>
                        </div>
                    </div>
                )}

                {/* ══ MODO RESULTADO ══ */}
                {resultado && !modoEscaneoIA && (
                    <div className="flex flex-col gap-3 animate-in zoom-in-95 duration-400" ref={resultadoRef}>

                        {/* Estado principal (AUTORIZADO / DENEGADO) */}
                        <div className={cn(
                            "flex flex-col items-center text-center p-5 rounded-2xl border-2",
                            resultado.permitido
                                ? "border-success/30"
                                : "border-danger/30"
                        )} style={{
                            background: resultado.permitido
                                ? 'color-mix(in srgb, var(--success) 6%, var(--bg-card))'
                                : 'color-mix(in srgb, var(--danger) 6%, var(--bg-card))'
                        }}>
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center mb-2",
                                resultado.permitido
                                    ? "bg-success/20 text-success"
                                    : "bg-danger/20 text-danger"
                            )}>
                                {resultado.permitido
                                    ? <CheckCircle2 size={28} />
                                    : <XCircle size={28} />
                                }
                            </div>
                            <h2 className={cn(
                                "text-2xl font-black uppercase tracking-tight italic",
                                resultado.permitido ? "text-success" : "text-danger"
                            )}>
                                {resultado.permitido ? 'AUTORIZADO' : 'DENEGADO'}
                            </h2>
                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-1">
                                {resultado.mensaje || 'Validación de Protocolo'}
                            </p>

                            {/* Zona asignada */}
                            {resultado.permitido && resultado.zona_asignada_id && (
                                <div
                                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                                    style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}
                                >
                                    <ParkingSquare size={12} className="text-primary" />
                                    <span className="text-[9px] font-black text-primary uppercase tracking-wider">
                                        {resultado.puesto_asignado_id ? `Puesto ${resultado.puesto_asignado_id}` : 'Zona Asignada'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Badge pase masivo */}
                        {resultado.es_pase_masivo && (
                            <BadgePaseMasivo
                                nombre_evento={resultado.nombre_evento}
                                serial_legible={resultado.serial_legible}
                                accesos_restantes={resultado.accesos_restantes}
                            />
                        )}

                        {/* Infracciones activas */}
                        {resultado.infracciones_activas?.length > 0 && (
                            <div
                                className="rounded-xl p-3 border border-warning/20"
                                style={{ background: 'color-mix(in srgb, var(--warning) 8%, var(--bg-card))' }}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle size={12} className="text-warning" />
                                    <span className="text-[9px] font-black text-warning uppercase tracking-widest">
                                        Infracciones Activas
                                    </span>
                                </div>
                                {resultado.infracciones_activas.map((inf, i) => (
                                    <p key={i} className="text-[10px] text-text-muted">{inf.descripcion}</p>
                                ))}
                            </div>
                        )}

                        {/* Ficha del socio (LECTURA) - sólo si hay datos */}
                        {resultado.permitido && (resultado.socio || resultado.vehiculo || resultado.vehiculos?.length > 0) && (
                            <FichaSocio
                                socio={resultado.socio}
                                vehiculo={resultado.vehiculo}
                                vehiculos={resultado.vehiculos || []}
                                vehiculoSeleccionadoId={vehiculoSeleccionadoId}
                                onSeleccionarVehiculo={setVehiculoSeleccionadoId}
                                entidad={resultado.entidad_nombre}
                            />
                        )}

                        {/* ── Acciones (QR Permitido) ── */}
                        {resultado.permitido && (
                            <div className="flex flex-col gap-2">
                                {/* Botón principal: Confirmar acceso */}
                                <Boton
                                    onClick={handleConfirmar}
                                    disabled={cargando}
                                    className="h-16 rounded-xl w-full gap-3 text-sm font-black uppercase italic tracking-wide"
                                    style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
                                >
                                    {cargando
                                        ? <RefreshCw className="animate-spin" size={20} />
                                        : <>
                                            <Shield size={20} />
                                            Confirmar {tipoAcceso === 'entrada' ? 'Entrada' : 'Salida'}
                                            <ArrowRight size={18} />
                                        </>
                                    }
                                </Boton>

                                {/* Botón secundario: Registrar Datos (OPCIONAL - abre el formulario) */}
                                {!mostrarFormulario && (
                                    <button
                                        onClick={handleAbrirFormulario}
                                        className="h-12 w-full rounded-xl border transition-all flex items-center justify-center gap-2 active:scale-95"
                                        style={{
                                            borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
                                            background: 'color-mix(in srgb, var(--primary) 5%, var(--bg-card))',
                                            color: 'var(--primary)'
                                        }}
                                    >
                                        <UserPlus size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                            Registrar Datos (Opcional)
                                        </span>
                                    </button>
                                )}

                                {/* Botón: Seguir escaneando */}
                                <button
                                    onClick={reiniciar}
                                    className="h-10 w-full rounded-lg border flex items-center justify-center gap-2 active:scale-95 transition-all"
                                    style={{
                                        borderColor: 'var(--bg-high)',
                                        background: 'var(--bg-low)',
                                        color: 'var(--text-muted)'
                                    }}
                                >
                                    <Scan size={12} />
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em]">
                                        Seguir Escaneando
                                    </span>
                                </button>
                            </div>
                        )}

                        {/* ── QR Denegado ── */}
                        {!resultado.permitido && (
                            <button
                                onClick={reiniciar}
                                className="w-full h-12 rounded-xl border flex items-center justify-center gap-2 active:scale-95 transition-all"
                                style={{
                                    borderColor: 'var(--bg-high)',
                                    background: 'var(--bg-low)',
                                    color: 'var(--text-muted)'
                                }}
                            >
                                <Scan size={14} />
                                <span className="text-[9px] font-black uppercase tracking-[0.3em]">
                                    Intentar de nuevo
                                </span>
                            </button>
                        )}

                        {/* ══ FORMULARIO DE DATOS OPCIONALES ══
                            Sólo visible cuando el guardia presiona "Registrar Datos" */}
                        {mostrarFormulario && (
                            <Card
                                className="rounded-2xl p-4 space-y-4 border"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--bg-high)' }}
                            >
                                {/* Encabezado */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-4 rounded-full bg-primary" />
                                        <h4 className="text-[10px] font-black text-text-main uppercase tracking-widest">
                                            Registro de Datos
                                        </h4>
                                    </div>
                                    <button
                                        onClick={() => setMostrarFormulario(false)}
                                        className="text-[8px] font-black text-text-muted uppercase tracking-wider hover:text-danger transition-all"
                                    >
                                        Cerrar
                                    </button>
                                </div>

                                {/* Datos del ciudadano */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[8px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1">
                                            <User size={10} /> Ciudadano
                                        </span>
                                        <button
                                            onClick={() => setModoEscaneoIA('cedula')}
                                            className="h-7 px-3 rounded-lg flex items-center gap-1.5 border transition-all"
                                            style={{
                                                background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                                                borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
                                                color: 'var(--primary)'
                                            }}
                                        >
                                            <Camera size={11} />
                                            <span className="text-[8px] font-black uppercase italic">Escanear Cédula</span>
                                        </button>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden"
                                            style={{ background: 'var(--bg-low)', borderColor: 'var(--bg-high)' }}
                                        >
                                            {resultado?.socio?.foto_url
                                                ? <img src={resultado.socio.foto_url} className="w-full h-full object-cover rounded-xl" alt="Foto" />
                                                : <User size={22} className="text-text-muted" />
                                            }
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <InputManual label="Nombre y Apellido" value={nombreManual} onChange={setNombreManual} placeholder="NOMBRE COMPLETO" />
                                            <InputManual label="Número de Cédula" value={cedulaManual} onChange={setCedulaManual} placeholder="V-00000000" />
                                        </div>
                                    </div>
                                    <InputManual label="Teléfono de Contacto" value={telefonoManual} onChange={setTelefonoManual} prefix="+58" placeholder="4121234567" />
                                </div>

                                {/* Datos del vehículo */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[8px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1">
                                            <Car size={10} /> Vehículo
                                        </span>
                                        <button
                                            onClick={() => setModoEscaneoIA('vehiculo')}
                                            className="h-7 px-3 rounded-lg flex items-center gap-1.5 border transition-all"
                                            style={{
                                                background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                                                borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
                                                color: 'var(--primary)'
                                            }}
                                        >
                                            <Camera size={11} />
                                            <span className="text-[8px] font-black uppercase italic">Escanear Título</span>
                                        </button>
                                    </div>
                                    <div
                                        className="rounded-xl p-3 border grid grid-cols-2 gap-2"
                                        style={{ background: 'var(--bg-low)', borderColor: 'var(--bg-high)' }}
                                    >
                                        <InputManual label="Placa" value={placaManual} onChange={setPlacaManual} placeholder="AB123CD" />
                                        <InputManual label="Color" value={colorManual} onChange={setColorManual} placeholder="BLANCO" />
                                        <InputManual label="Marca" value={marcaManual} onChange={setMarcaManual} placeholder="TOYOTA" />
                                        <InputManual label="Modelo" value={modeloManual} onChange={setModeloManual} placeholder="HILUX" />
                                    </div>
                                </div>

                                {/* Botón confirmar con datos */}
                                <div className="pt-1 flex flex-col gap-2">
                                    <Boton
                                        onClick={handleConfirmarConDatos}
                                        disabled={cargando}
                                        className="h-14 rounded-xl w-full gap-2"
                                        style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
                                    >
                                        {cargando
                                            ? <RefreshCw className="animate-spin" size={20} />
                                            : <>
                                                <UserCheck size={18} />
                                                <span className="text-sm font-black uppercase italic">Confirmar con Datos</span>
                                            </>
                                        }
                                    </Boton>
                                    <button
                                        onClick={reiniciar}
                                        className="h-10 rounded-lg border text-[9px] font-black uppercase tracking-[0.3em] transition-all"
                                        style={{
                                            borderColor: 'var(--bg-high)',
                                            background: 'var(--bg-low)',
                                            color: 'var(--text-muted)'
                                        }}
                                    >
                                        Abortar Operación
                                    </button>
                                </div>
                            </Card>
                        )}
                    </div>
                )}
            </main>

            {/* ══ OVERLAY OCR / IA ══ */}
            {modoEscaneoIA && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300">
                    <div className="absolute top-6 left-6 right-6 flex items-center justify-between text-white z-10">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
                                Sistema OCR Tactigo
                            </p>
                            <h2 className="text-xl font-black uppercase italic mt-1">
                                Escaneando {modoEscaneoIA === 'cedula' ? 'Identidad' : 'Documento'}
                            </h2>
                        </div>
                        <button
                            onClick={() => setModoEscaneoIA(null)}
                            className="p-3 bg-white/10 rounded-full border border-white/20 hover:bg-white/20 transition-all"
                        >
                            <XCircle size={28} />
                        </button>
                    </div>

                    <div className="flex-1 relative">
                        <QRScanner ref={scannerRef} onScanSuccess={() => {}} autoStart={true} />
                        <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
                            <div className="w-full aspect-[1.6/1] border-2 border-primary/40 rounded-[2.5rem] relative">
                                <div className="absolute -top-1 -left-1 w-12 h-12 border-t-8 border-l-8 border-primary rounded-tl-3xl shadow-[0_0_15px_currentColor]" />
                                <div className="absolute -top-1 -right-1 w-12 h-12 border-t-8 border-r-8 border-primary rounded-tr-3xl" />
                                <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-8 border-l-8 border-primary rounded-bl-3xl" />
                                <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-8 border-r-8 border-primary rounded-br-3xl" />
                                {iaLoading && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-md rounded-[2.5rem]">
                                        <RefreshCw className="text-primary animate-spin mb-4" size={56} />
                                        <span className="text-xs font-black uppercase tracking-[0.5em] text-primary animate-pulse">
                                            Analizando...
                                        </span>
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
                            disabled={!!iaLoading}
                            className="w-24 h-24 rounded-full bg-white/10 p-2 shadow-2xl active:scale-90 transition-all disabled:opacity-30 border-2 border-white/20"
                        >
                            <div className="w-full h-full rounded-full bg-primary flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full border-4 border-white/30" />
                            </div>
                        </button>
                        <span className="text-[11px] font-black text-primary uppercase tracking-widest italic">
                            Capturar y Procesar
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScannerAlcabala;
