import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    ArrowLeft, Scan, Keyboard, LogIn, CheckCircle2,
    RefreshCw, Car, XCircle, Camera, User, UserCheck,
    ParkingSquare, AlertTriangle, Power
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { QRScanner } from '../../components/alcabala/QRScanner';
import { parqueroService } from '../../services/parquero.service';

// ── Campo de formulario genérico ──────────────────────────────────────────
const InputField = ({ label, value, onChange, placeholder, prefix }) => (
    <div className="space-y-1">
        <label className="text-[8px] font-black uppercase tracking-widest text-text-muted">{label}</label>
        <div className="flex items-center bg-bg-low border border-white/10 rounded-lg overflow-hidden focus-within:border-primary/50 transition-all">
            {prefix && <span className="px-2 text-[10px] text-text-muted border-r border-white/10 py-2 bg-white/5">{prefix}</span>}
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value.toUpperCase())}
                placeholder={placeholder}
                className="flex-1 bg-transparent px-3 py-2 text-xs font-black text-text-main uppercase outline-none placeholder:text-text-muted/30 placeholder:font-normal placeholder:normal-case"
            />
        </div>
    </div>
);

// ── Ficha de vehículo encontrado (flujo exitoso sin modal) ───────────────
const FichaVehiculo = ({ datos, onConfirmar, cargando, onReset }) => (
    <div className="space-y-3 animate-in fade-in duration-300">
        <div className="bg-bg-card rounded-2xl border border-white/5 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-white/5">
                <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center border border-success/20 shrink-0">
                    <Car size={22} className="text-success" />
                </div>
                <div className="flex-1">
                    <p className="text-xl font-black text-text-main tracking-wider">{datos.placa}</p>
                    {(datos.marca || datos.modelo) && (
                        <p className="text-[10px] text-text-muted">
                            {[datos.color, datos.marca, datos.modelo].filter(Boolean).join(' · ')}
                        </p>
                    )}
                    {datos.nombre_portador && (
                        <p className="text-[9px] font-bold text-success/80 mt-0.5">{datos.nombre_portador}</p>
                    )}
                </div>
            </div>
        </div>

        <button
            onClick={onConfirmar}
            disabled={cargando}
            className="w-full h-14 rounded-xl bg-success text-bg-app text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 active:scale-98 transition-all disabled:opacity-50"
        >
            {cargando ? <RefreshCw size={18} className="animate-spin" /> : <LogIn size={18} />}
            Confirmar Ingreso
        </button>
        <button
            onClick={onReset}
            className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-text-muted text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
        >
            Cancelar
        </button>
    </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// MODAL DE REGISTRO DE DATOS — ADAPTATIVO
//
//  · solo_persona=false  → Falta TODO: datos del ciudadano + datos del vehículo
//  · solo_persona=true   → Vehículo ya identificado (QR), solo falta el portador
//
// El guardado siempre va a `codigos_qr` si hay qrId (NO a `usuarios`).
// Si no hay qrId (sin QR), el VehiculoPase ya fue creado; solo se confirma.
// ══════════════════════════════════════════════════════════════════════════════
const ModalRegistroDatos = ({ resultadoSinDatos, zonaId, onRegistrado, onCerrar }) => {
    const scannerIARef = useRef(null);

    const soloPersona    = resultadoSinDatos?.solo_persona === true;
    const qrId           = resultadoSinDatos?.qr_id || null;
    const vehiculoPaseId = resultadoSinDatos?.vehiculo_pase_id || null;

    // Pre-rellenar desde el backend
    const [nombre,   setNombre]   = useState(resultadoSinDatos?.nombre_portador || '');
    const [cedula,   setCedula]   = useState(resultadoSinDatos?.cedula_portador  || '');
    const [telefono, setTelefono] = useState(resultadoSinDatos?.telefono_portador || '');
    const [placa,    setPlaca]    = useState(resultadoSinDatos?.placa  || '');
    const [marca,    setMarca]    = useState(resultadoSinDatos?.marca  || '');
    const [modelo,   setModelo]   = useState(resultadoSinDatos?.modelo || '');
    const [color,    setColor]    = useState(resultadoSinDatos?.color  || '');

    const [modoIA,   setModoIA]   = useState(null); // 'cedula' | 'vehiculo'
    const [iaLoad,   setIaLoad]   = useState(false);
    const [cargando, setCargando] = useState(false);

    // ── Captura IA ──────────────────────────────────────────────────────────
    const handleCapturarIA = async () => {
        if (!modoIA || iaLoad) return;
        setIaLoad(true);
        try {
            const video = document.querySelector('#ia-parquero video');
            if (!video) { toast.error('Cámara no disponible'); return; }
            const canvas = document.createElement('canvas');
            canvas.width  = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            const base64   = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
            // Reutilizamos el servicio de alcabala para la extracción IA
            const { default: alcabalaService } = await import('../../services/alcabala.service');
            const { data }  = await alcabalaService.extraerDatosIA(base64, modoIA);
            if (modoIA === 'cedula') {
                if (data.nombre)  setNombre(data.nombre + (data.apellido ? ` ${data.apellido}` : ''));
                if (data.cedula)  setCedula(data.cedula);
                toast.success('Identidad capturada con IA');
            } else {
                if (data.placa)   setPlaca(data.placa);
                if (data.marca)   setMarca(data.marca);
                if (data.modelo)  setModelo(data.modelo);
                if (data.color)   setColor(data.color);
                toast.success('Datos del vehículo capturados');
            }
            setModoIA(null);
        } catch {
            toast.error('Error en escaneo IA');
        } finally {
            setIaLoad(false);
        }
    };

    // ── Confirmar ───────────────────────────────────────────────────────────
    const handleConfirmar = async () => {
        setCargando(true);
        try {
            if (soloPersona && qrId && vehiculoPaseId) {
                // CASO 1: Vehículo ya identificado por QR — guardar portador en codigos_qr e ingresar
                await parqueroService.completarDatosPortador(qrId, vehiculoPaseId, {
                    nombre:   nombre   || null,
                    cedula:   cedula   || null,
                    telefono: telefono ? (telefono.startsWith('+58') ? telefono : `+58${telefono}`) : null,
                    zona_id:  zonaId   // Envía la zona para activar ocupación
                });
                toast.success(`Portador registrado ✔ ${placa}`);
                onRegistrado?.({ placa, vehiculoPaseId });
            } else {
                // CASO 2: Sin QR — vehículo completamente desconocido
                if (!placa.trim()) { toast.error('La placa es obligatoria'); return; }
                const res = await parqueroService.registrarLlegadaPlaca(placa.trim().toUpperCase(), zonaId);
                toast.success(`${placa} registrado en zona`);
                onRegistrado?.(res);
            }
        } catch (e) {
            toast.error(e.response?.data?.detail || 'No se pudo registrar');
        } finally {
            setCargando(false);
        }
    };

    // ── Pantalla de escáner IA ───────────────────────────────────────────────
    if (modoIA) return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-in fade-in duration-200">
            <div className="absolute top-6 left-4 right-4 flex items-center justify-between text-white z-10">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Sistema OCR · IA</p>
                    <h2 className="text-lg font-black uppercase italic mt-1">
                        {modoIA === 'cedula' ? 'Escaneando Cédula' : 'Escaneando Vehículo'}
                    </h2>
                </div>
                <button onClick={() => setModoIA(null)} className="p-3 bg-white/10 rounded-full border border-white/20">
                    <XCircle size={24} />
                </button>
            </div>

            <div className="flex-1 relative" id="ia-parquero">
                <QRScanner ref={scannerIARef} onScanSuccess={() => {}} autoStart />
                <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
                    <div className="w-full aspect-[1.6/1] border-2 border-primary/50 rounded-3xl relative">
                        {['tl','tr','bl','br'].map(c => (
                            <div key={c} className={cn(
                                'absolute w-10 h-10 border-4 border-primary',
                                c === 'tl' && '-top-1 -left-1 border-r-0 border-b-0 rounded-tl-2xl',
                                c === 'tr' && '-top-1 -right-1 border-l-0 border-b-0 rounded-tr-2xl',
                                c === 'bl' && '-bottom-1 -left-1 border-r-0 border-t-0 rounded-bl-2xl',
                                c === 'br' && '-bottom-1 -right-1 border-l-0 border-t-0 rounded-br-2xl',
                            )} />
                        ))}
                    </div>
                </div>
                {iaLoad && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                        <RefreshCw className="text-primary animate-spin mb-3" size={48} />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Analizando...</p>
                    </div>
                )}
            </div>

            <div className="p-6 pb-10">
                <button
                    onClick={handleCapturarIA}
                    disabled={iaLoad}
                    className="w-full h-16 rounded-2xl bg-primary text-bg-app font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {iaLoad ? <RefreshCw size={20} className="animate-spin" /> : <Camera size={20} />}
                    Capturar y Analizar
                </button>
            </div>
        </div>
    );

    // ── Formulario ───────────────────────────────────────────────────────────
    return (
        <div
            className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:ml-64 bg-black/60 backdrop-blur-sm p-4"
            onClick={e => e.target === e.currentTarget && onCerrar()}
        >
            <div className="w-full max-w-sm bg-bg-card rounded-2xl border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-bg-low/50">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 rounded-full bg-warning" />
                        <p className="text-[11px] font-black uppercase tracking-wider text-text-main">
                            {soloPersona ? 'Registrar Portador' : 'Registro de Datos'}
                        </p>
                    </div>
                    <button onClick={onCerrar} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                        <XCircle size={15} className="text-text-muted" />
                    </button>
                </div>

                {/* Badge vehículo ya identificado */}
                {soloPersona && (
                    <div className="px-4 pt-3">
                        <div className="flex items-center gap-3 p-3 bg-success/5 rounded-xl border border-success/20">
                            <CheckCircle2 size={16} className="text-success shrink-0" />
                            <div>
                                <p className="text-[10px] font-black text-success uppercase tracking-widest">Vehículo Identificado</p>
                                <p className="text-sm font-black text-text-main">{placa}</p>
                                {(marca || modelo) && (
                                    <p className="text-[9px] text-text-muted">{[color, marca, modelo].filter(Boolean).join(' · ')}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="overflow-y-auto flex-1 p-4 space-y-4">

                    {/* Datos del ciudadano (siempre visible) */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1">
                                <User size={10} /> Ciudadano
                            </span>
                            <button
                                onClick={() => setModoIA('cedula')}
                                className="h-7 px-3 rounded-lg flex items-center gap-1.5 text-primary border border-primary/30 bg-primary/10 text-[8px] font-black uppercase"
                            >
                                <Camera size={11} /> Escanear Cédula
                            </button>
                        </div>
                        <InputField label="Nombre y Apellido" value={nombre} onChange={setNombre} placeholder="NOMBRE COMPLETO" />
                        <InputField label="Número de Cédula" value={cedula} onChange={setCedula} placeholder="V-00000000" />
                        <InputField label="Teléfono" value={telefono} onChange={setTelefono} prefix="+58" placeholder="4121234567" />
                    </div>

                    {/* Datos del vehículo — SOLO si falta todo (no solo_persona) */}
                    {!soloPersona && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1">
                                    <Car size={10} /> Vehículo
                                </span>
                                <button
                                    onClick={() => setModoIA('vehiculo')}
                                    className="h-7 px-3 rounded-lg flex items-center gap-1.5 text-primary border border-primary/30 bg-primary/10 text-[8px] font-black uppercase"
                                >
                                    <Camera size={11} /> Escanear Título
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 bg-bg-low rounded-xl p-3 border border-white/5">
                                <InputField label="Placa *" value={placa} onChange={setPlaca} placeholder="AB123CD" />
                                <InputField label="Color"   value={color}  onChange={setColor}  placeholder="BLANCO"  />
                                <InputField label="Marca"   value={marca}  onChange={setMarca}  placeholder="TOYOTA"  />
                                <InputField label="Modelo"  value={modelo} onChange={setModelo} placeholder="HILUX"   />
                            </div>
                        </div>
                    )}

                </div>

                <div className="p-4 border-t border-white/5 space-y-2">
                    <button
                        onClick={handleConfirmar}
                        disabled={cargando}
                        className="w-full h-12 rounded-xl bg-success text-bg-app text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {cargando ? <RefreshCw size={15} className="animate-spin" /> : <UserCheck size={15} />}
                        {soloPersona ? 'Confirmar Portador e Ingresar' : 'Registrar e Ingresar'}
                    </button>
                    <button
                        onClick={onCerrar}
                        className="w-full h-9 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-text-muted"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// VISTA PRINCIPAL: RECIBIR
// ══════════════════════════════════════════════════════════════════════════════
const VistaRecibir = () => {
    const navigate  = useNavigate();
    const location  = useLocation();
    const zonaData  = location.state?.zonaData || null;
    const zonaId    = zonaData?.id;
    const zonaNombre = zonaData?.nombre || 'Mi Zona';

    const scannerRef = useRef(null);
    const [tab,     setTab]     = useState('placa'); // 'qr' | 'placa'
    const [placaInput, setPlacaInput] = useState('');
    const [buscando,   setBuscando]   = useState(false);
    const [escaneando, setEscaneando] = useState(false);
    const [resultado,  setResultado]  = useState(null);       // VehiculoPase con sin_datos=false
    const [sinDatos,   setSinDatos]   = useState(null);       // objeto sin_datos=true del backend
    const [confirmando, setConfirmando] = useState(false);

    const resetear = () => {
        setResultado(null);
        setSinDatos(null);
        setPlacaInput('');
    };

    // ── Buscar por placa ────────────────────────────────────────────────────
    const handleBuscarPlaca = async () => {
        const placa = placaInput.trim().toUpperCase();
        if (!placa || !zonaId) { toast.error('Ingrese una placa válida'); return; }
        setBuscando(true);
        try {
            const res = await parqueroService.registrarLlegadaPlaca(placa, zonaId);
            if (res.sin_datos) {
                // La placa no existe en ninguna fuente; mostrar modal de registro
                setSinDatos(res);
            } else {
                // Vehículo encontrado: mostrar ficha para confirmar
                setResultado(res);
            }
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Error al buscar vehículo');
        } finally {
            setBuscando(false);
        }
    };

    // ── QR scan ────────────────────────────────────────────────────────────
    const handleScanQR = useCallback(async (qrToken) => {
        if (escaneando || !zonaId) return;
        setEscaneando(true);
        try {
            const res = await parqueroService.registrarLlegadaQR(qrToken, zonaId);
            if (res.sin_datos) {
                setSinDatos(res);
            } else {
                setResultado(res);
                toast.success(`${res.placa || 'Vehículo'} registrado en zona`);
            }
        } catch (e) {
            toast.error(e.response?.data?.detail || 'QR no válido o ya usado');
        } finally {
            setEscaneando(false);
        }
    }, [zonaId, escaneando]);

    // ── Confirmar ingreso (solo cuando hubo sin_datos=false y se mostró ficha) ──
    const handleConfirmarIngreso = async () => {
        // El VehiculoPase ya fue creado en el backend al buscar la placa.
        // Solo notificamos al usuario y reseteamos.
        toast.success(`${resultado.placa} ingresó a la zona`);
        resetear();
    };

    return (
        <div className="min-h-screen bg-bg-app flex flex-col">

            {/* Header */}
            <header className="sticky top-0 z-40 bg-bg-card/90 backdrop-blur-md border-b border-white/5 px-4 py-3">
                <div className="flex items-center gap-3 max-w-lg mx-auto">
                    <button
                        onClick={() => navigate('/parquero/')}
                        className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
                    >
                        <ArrowLeft size={18} className="text-text-muted" />
                    </button>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-wide text-success leading-none">Recibir Vehículo</h1>
                        <p className="text-[9px] text-text-muted font-bold mt-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                            {zonaNombre}
                        </p>
                    </div>
                    <div className="ml-auto">
                        <div className="w-9 h-9 bg-success/10 rounded-xl flex items-center justify-center border border-success/20">
                            <LogIn size={18} className="text-success" />
                        </div>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="max-w-lg mx-auto w-full px-4 pt-4">
                <div className="flex gap-1 bg-bg-low rounded-2xl p-1 border border-white/5">
                    <button
                        onClick={() => { setTab('placa'); resetear(); }}
                        className={cn(
                            'flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all',
                            tab === 'placa'
                                ? 'bg-bg-card text-success border border-success/20 shadow-sm'
                                : 'text-text-muted hover:text-text-main'
                        )}
                    >
                        <Keyboard size={14} /> Ingresar Placa
                    </button>
                    <button
                        onClick={() => { setTab('qr'); resetear(); }}
                        className={cn(
                            'flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all',
                            tab === 'qr'
                                ? 'bg-bg-card text-success border border-success/20 shadow-sm'
                                : 'text-text-muted hover:text-text-main'
                        )}
                    >
                        <Scan size={14} /> Escanear QR
                    </button>
                </div>
            </div>

            {/* Contenido principal */}
            <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-4">

                {/* ── TAB PLACA ── */}
                {tab === 'placa' && !resultado && !sinDatos && (
                    <div className="bg-bg-card rounded-2xl border border-white/5 p-4 space-y-3">
                        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                            Ingrese la placa del vehículo que llega
                        </p>
                        <input
                            type="text"
                            value={placaInput}
                            onChange={e => setPlacaInput(e.target.value.toUpperCase())}
                            onKeyDown={e => e.key === 'Enter' && handleBuscarPlaca()}
                            placeholder="AB123CD"
                            maxLength={8}
                            className="w-full bg-bg-low border border-white/10 rounded-xl px-4 py-3 text-2xl font-black text-text-main uppercase tracking-widest focus:border-success/50 outline-none transition-all text-center placeholder:text-text-muted/30"
                            autoFocus
                        />
                        <button
                            onClick={handleBuscarPlaca}
                            disabled={buscando || !placaInput.trim()}
                            className="w-full h-12 rounded-xl bg-success/10 border border-success/30 text-success text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-success/20 transition-all disabled:opacity-50"
                        >
                            {buscando ? <RefreshCw size={15} className="animate-spin" /> : <Car size={15} />}
                            Buscar Vehículo
                        </button>
                    </div>
                )}

                {/* Vehículo encontrado → mostrar ficha */}
                {resultado && (
                    <FichaVehiculo
                        datos={resultado}
                        cargando={confirmando}
                        onConfirmar={handleConfirmarIngreso}
                        onReset={resetear}
                    />
                )}

                {/* ── TAB QR ── */}
                {tab === 'qr' && !resultado && !sinDatos && (
                    <div className="space-y-3">
                        <div className="aspect-square w-full max-w-[320px] mx-auto bg-black rounded-2xl overflow-hidden relative border border-white/5 shadow-2xl">
                            <QRScanner
                                ref={scannerRef}
                                onScanSuccess={handleScanQR}
                                autoStart
                            />
                            {escaneando && (
                                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center backdrop-blur-sm">
                                    <RefreshCw className="text-success animate-spin mb-3" size={40} />
                                    <p className="text-[10px] font-black text-success uppercase tracking-widest">Procesando...</p>
                                </div>
                            )}
                        </div>

                        {/* Controles de cámara (Solo durante el escaneo) */}
                        <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-700">
                            <button
                                onClick={() => scannerRef.current?.switchCamera()}
                                className="h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted hover:bg-white/10 transition-all active:scale-95"
                            >
                                <RefreshCw size={14} className="text-success" /> Lente
                            </button>
                            <button
                                onClick={() => scannerRef.current?.toggleScanner()}
                                className="h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted hover:bg-white/10 transition-all active:scale-95"
                            >
                                <Power size={14} className="text-success" /> Energía
                            </button>
                        </div>

                        <p className="text-center text-[9px] text-text-muted/50 font-black uppercase tracking-widest">
                            Apunte la cámara al QR del pase del vehículo
                        </p>
                    </div>
                )}

            </div>

            {/* Modal de registro — solo se abre cuando sin_datos=true */}
            {sinDatos && (
                <ModalRegistroDatos
                    resultadoSinDatos={sinDatos}
                    zonaId={zonaId}
                    onRegistrado={() => { toast.success('Vehículo registrado correctamente'); resetear(); }}
                    onCerrar={resetear}
                />
            )}
        </div>
    );
};

export default VistaRecibir;
