import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    ArrowLeft, Scan, Keyboard, LogIn, CheckCircle2,
    RefreshCw, Car, User, ParkingSquare, AlertTriangle,
    Camera, XCircle, UserCheck, UserPlus, Phone
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { QRScanner } from '../../components/alcabala/QRScanner';
import { parqueroService } from '../../services/parquero.service';
import { alcabalaService } from '../../services/alcabala.service';

// ── Componente: Input reutilizable ─────────────────────────────────────────
const InputField = ({ label, value, onChange, placeholder, prefix = null, loading = false }) => (
    <div className="flex flex-col gap-1 w-full">
        <label className="text-[8px] font-black text-text-muted uppercase tracking-widest">{label}</label>
        <div className="relative flex items-center">
            {prefix && (
                <span className="absolute left-3 text-xs font-bold text-text-muted pointer-events-none">{prefix}</span>
            )}
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value.toUpperCase())}
                placeholder={placeholder}
                className={cn(
                    "bg-bg-low border border-bg-high rounded-xl px-3 py-2.5 text-xs font-bold text-text-main",
                    "focus:border-primary/60 outline-none uppercase placeholder:text-text-muted/40 transition-all w-full",
                    prefix && "pl-10",
                    loading && "animate-pulse border-primary/30"
                )}
            />
        </div>
    </div>
);

// ── Componente: Ficha de vehículo confirmado ────────────────────────────────
const FichaVehiculo = ({ datos, onConfirmar, cargando, onReset }) => (
    <div className="space-y-3 animate-in fade-in duration-300">
        <div className="flex items-center gap-3 p-4 bg-success/5 rounded-2xl border border-success/20">
            <div className="w-12 h-12 bg-success/15 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} className="text-success" />
            </div>
            <div className="flex-1">
                <p className="text-[10px] font-black text-success uppercase tracking-widest">Vehículo Encontrado</p>
                <p className="text-lg font-black text-text-main tracking-wider">{datos.placa}</p>
                {(datos.marca || datos.modelo) && (
                    <p className="text-[10px] text-text-muted">
                        {[datos.color, datos.marca, datos.modelo].filter(Boolean).join(' · ')}
                    </p>
                )}
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

// ── Modal de Registro de Datos (mismo de la Alcabala, con escáner IA) ──────
const ModalRegistroDatos = ({ placaInicial = '', zonaId, onRegistrado, onCerrar }) => {
    const scannerIARef = useRef(null);
    const [nombre, setNombre] = useState('');
    const [cedula, setCedula] = useState('');
    const [telefono, setTelefono] = useState('');
    const [placa, setPlaca] = useState(placaInicial);
    const [marca, setMarca] = useState('');
    const [modelo, setModelo] = useState('');
    const [color, setColor] = useState('');
    const [modoIA, setModoIA] = useState(null); // 'cedula' | 'vehiculo'
    const [iaLoading, setIaLoading] = useState(false);
    const [cargando, setCargando] = useState(false);

    const handleCapturarIA = async () => {
        if (!modoIA || iaLoading) return;
        try {
            const video = document.querySelector('#ia-scanner-parquero video');
            if (!video) { toast.error('Cámara no disponible'); return; }
            setIaLoading(true);
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
            const response = await alcabalaService.extraerDatosIA(base64, modoIA);
            const { data } = response;
            if (modoIA === 'cedula') {
                if (data.nombre) setNombre(data.nombre + (data.apellido ? ` ${data.apellido}` : ''));
                if (data.cedula) setCedula(data.cedula);
                toast.success('Identidad capturada con IA');
            } else {
                if (data.placa) setPlaca(data.placa);
                if (data.marca) setMarca(data.marca);
                if (data.modelo) setModelo(data.modelo);
                if (data.color) setColor(data.color);
                toast.success('Vehículo capturado con IA');
            }
            setModoIA(null);
        } catch {
            toast.error('Error en escaneo IA');
        } finally {
            setIaLoading(false);
        }
    };

    const handleConfirmar = async () => {
        if (!placa.trim()) {
            toast.error('La placa es obligatoria');
            return;
        }
        setCargando(true);
        try {
            // Registrar el ingreso con la placa (ya que no existía en BD, el backend creará el registro)
            const result = await parqueroService.registrarLlegadaPlaca(placa, zonaId);
            // Aquí idealmente se haría un PATCH con los datos de la persona, pero el flujo mínimo es registrar la llegada
            toast.success(`Vehículo ${placa} registrado en zona`);
            onRegistrado?.(result);
        } catch (e) {
            toast.error(e.response?.data?.detail || 'No se pudo registrar');
        } finally {
            setCargando(false);
        }
    };

    // Overlay de cámara IA
    if (modoIA) {
        return (
            <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-in fade-in duration-200">
                <div className="absolute top-6 left-4 right-4 flex items-center justify-between text-white z-10">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Sistema OCR · IA</p>
                        <h2 className="text-lg font-black uppercase italic mt-1">
                            Escaneando {modoIA === 'cedula' ? 'Cédula' : 'Título del Vehículo'}
                        </h2>
                    </div>
                    <button onClick={() => setModoIA(null)} className="p-3 bg-white/10 rounded-full border border-white/20">
                        <XCircle size={24} />
                    </button>
                </div>

                <div className="flex-1 relative" id="ia-scanner-parquero">
                    <QRScanner ref={scannerIARef} onScanSuccess={() => {}} autoStart={true} />
                    <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
                        <div className="w-full aspect-[1.6/1] border-2 border-primary/50 rounded-3xl relative">
                            <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
                            <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
                            <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
                            <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-2xl" />
                        </div>
                    </div>
                    {iaLoading && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                            <RefreshCw className="text-primary animate-spin mb-3" size={48} />
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Analizando...</p>
                        </div>
                    )}
                </div>

                <div className="p-6 pb-10">
                    <button
                        onClick={handleCapturarIA}
                        disabled={iaLoading}
                        className="w-full h-16 rounded-2xl bg-primary text-bg-app font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {iaLoading ? <RefreshCw size={20} className="animate-spin" /> : <Camera size={20} />}
                        Capturar y Analizar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
            <div className="w-full max-w-sm bg-bg-card rounded-2xl border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-bg-low/50">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 rounded-full bg-warning" />
                        <p className="text-[11px] font-black uppercase tracking-wider text-text-main">Registro de Datos</p>
                    </div>
                    <button onClick={onCerrar} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                        <XCircle size={15} className="text-text-muted" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-4 space-y-4">
                    {/* Datos del ciudadano */}
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

                    {/* Datos del vehículo */}
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
                            <InputField label="Color" value={color} onChange={setColor} placeholder="BLANCO" />
                            <InputField label="Marca" value={marca} onChange={setMarca} placeholder="TOYOTA" />
                            <InputField label="Modelo" value={modelo} onChange={setModelo} placeholder="HILUX" />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white/5 space-y-2">
                    <button
                        onClick={handleConfirmar}
                        disabled={cargando}
                        className="w-full h-12 rounded-xl bg-success text-bg-app text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {cargando ? <RefreshCw size={15} className="animate-spin" /> : <UserCheck size={15} />}
                        Registrar e Ingresar
                    </button>
                    <button onClick={onCerrar} className="w-full h-9 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-text-muted">
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
    const navigate = useNavigate();
    const location = useLocation();
    const zonaData = location.state?.zonaData || null;
    const zonaId = zonaData?.id;
    const zonaNombre = zonaData?.nombre || 'Mi Zona';

    const scannerRef = useRef(null);
    const [tab, setTab] = useState('qr'); // 'qr' | 'placa'
    const [placaInput, setPlacaInput] = useState('');
    const [buscando, setBuscando] = useState(false);
    const [escaneando, setEscaneando] = useState(false);
    const [resultado, setResultado] = useState(null); // { sin_datos, placa, ... }
    const [mostrarModalRegistro, setMostrarModalRegistro] = useState(false);
    const [confirmando, setConfirmando] = useState(false);

    const resetear = () => {
        setResultado(null);
        setPlacaInput('');
        setMostrarModalRegistro(false);
    };

    // ── Escaneo QR ──────────────────────────────────────────────────────────
    const handleScanQR = async (qrToken) => {
        if (escaneando || !zonaId) return;
        setEscaneando(true);
        try {
            // El QR contiene un UUID del código
            const qrId = qrToken; // El token del QR será el UUID del código
            const res = await parqueroService.registrarLlegadaQR(qrId, zonaId);
            if (res.sin_datos) {
                setResultado(res);
                setMostrarModalRegistro(true);
            } else {
                toast.success(`✅ ${res.placa || 'Vehículo'} ingresado a zona`, { duration: 3000 });
                setResultado({ ...res, confirmado: true });
            }
        } catch (e) {
            // Si el QR no es UUID (es JWT del pase), manejarlo como datos pendientes
            toast.error(e.response?.data?.detail || 'Error al procesar QR');
        } finally {
            setEscaneando(false);
        }
    };

    // ── Búsqueda por placa ──────────────────────────────────────────────────
    const handleBuscarPlaca = async () => {
        const placa = placaInput.trim().toUpperCase();
        if (!placa || !zonaId) {
            toast.error('Ingrese una placa válida');
            return;
        }
        setBuscando(true);
        try {
            const res = await parqueroService.registrarLlegadaPlaca(placa, zonaId);
            if (res.sin_datos) {
                setResultado(res);
                setMostrarModalRegistro(true);
            } else {
                setResultado(res);
            }
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Error al buscar vehículo');
        } finally {
            setBuscando(false);
        }
    };

    // ── Confirmar ingreso (vehículo encontrado en BD) ───────────────────────
    const handleConfirmarIngreso = async () => {
        if (!resultado?.vehiculo_pase_id) return;
        setConfirmando(true);
        try {
            toast.success(`${resultado.placa} registrado en zona`);
            resetear();
        } catch (e) {
            toast.error('Error al confirmar');
        } finally {
            setConfirmando(false);
        }
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
                </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-4">

                {/* ── TAB QR ── */}
                {tab === 'qr' && !resultado && (
                    <div className="space-y-3">
                        <div className="aspect-square max-h-80 bg-black rounded-2xl overflow-hidden relative border border-white/5">
                            <QRScanner
                                ref={scannerRef}
                                onScanSuccess={handleScanQR}
                                autoStart={true}
                            />
                            {escaneando && (
                                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center backdrop-blur-sm">
                                    <RefreshCw className="text-success animate-spin mb-3" size={40} />
                                    <p className="text-[10px] font-black text-success uppercase tracking-widest">Procesando...</p>
                                </div>
                            )}
                        </div>
                        <p className="text-center text-[9px] text-text-muted/50 font-black uppercase tracking-widest">
                            Apunte la cámara al código QR del vehículo
                        </p>
                    </div>
                )}

                {/* QR procesado exitosamente */}
                {tab === 'qr' && resultado?.confirmado && (
                    <div className="space-y-3 animate-in fade-in duration-300">
                        <div className="flex items-center gap-3 p-5 bg-success/5 rounded-2xl border border-success/20 text-center flex-col">
                            <CheckCircle2 size={40} className="text-success" />
                            <p className="text-lg font-black text-text-main">{resultado.placa}</p>
                            <p className="text-[10px] text-success font-black uppercase tracking-widest">Ingresado a zona correctamente</p>
                        </div>
                        <button onClick={resetear} className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-text-muted text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                            <Scan size={13} className="inline mr-2" /> Escanear Siguiente
                        </button>
                    </div>
                )}

                {/* ── TAB PLACA ── */}
                {tab === 'placa' && !resultado && (
                    <div className="space-y-3">
                        <div className="bg-bg-card rounded-2xl border border-white/5 p-4 space-y-3">
                            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                                Ingrese la placa del vehículo
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={placaInput}
                                    onChange={(e) => setPlacaInput(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => e.key === 'Enter' && handleBuscarPlaca()}
                                    placeholder="AB123CD"
                                    maxLength={8}
                                    className="flex-1 bg-bg-low border border-white/10 rounded-xl px-4 py-3 text-xl font-black text-text-main uppercase tracking-widest focus:border-success/50 outline-none transition-all text-center placeholder:text-text-muted/30"
                                    autoFocus
                                />
                            </div>
                            <button
                                onClick={handleBuscarPlaca}
                                disabled={buscando || !placaInput.trim()}
                                className="w-full h-12 rounded-xl bg-success/10 border border-success/30 text-success text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-success/20 transition-all disabled:opacity-50"
                            >
                                {buscando ? <RefreshCw size={15} className="animate-spin" /> : <Car size={15} />}
                                Buscar Vehículo
                            </button>
                        </div>
                    </div>
                )}

                {/* Resultado placa encontrada */}
                {tab === 'placa' && resultado && !resultado.sin_datos && (
                    <FichaVehiculo
                        datos={resultado}
                        cargando={confirmando}
                        onConfirmar={handleConfirmarIngreso}
                        onReset={resetear}
                    />
                )}

            </div>

            {/* Modal de registro con IA */}
            {mostrarModalRegistro && (
                <ModalRegistroDatos
                    placaInicial={resultado?.placa || placaInput}
                    zonaId={zonaId}
                    onRegistrado={() => {
                        setMostrarModalRegistro(false);
                        toast.success('Vehículo registrado e ingresado a zona');
                        resetear();
                    }}
                    onCerrar={() => setMostrarModalRegistro(false)}
                />
            )}
        </div>
    );
};

export default VistaRecibir;
