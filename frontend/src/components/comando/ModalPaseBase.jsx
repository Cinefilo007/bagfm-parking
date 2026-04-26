import React, { useState, useRef, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Boton } from '../ui/Boton';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import {
    Shield, User, CreditCard, Phone,
    Car, Hash, Palette, Calendar, CheckCircle2,
    RefreshCw, LayoutGrid, MessageCircle, Download, Loader2
} from 'lucide-react';
import api from '../../services/api';
import { QRCode } from 'react-qr-code';
import PlantillaPreview from '../carnets/PlantillaPreview';
import SelectTactivo from '../ui/SelectTactivo';
import { toPng } from 'html-to-image';

// Suma días a una fecha string YYYY-MM-DD y devuelve YYYY-MM-DD
const sumarDias = (fechaBase, dias) => {
    const d = fechaBase ? new Date(fechaBase + 'T00:00:00') : new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().split('T')[0];
};

const hoy = () => new Date().toISOString().split('T')[0];

const preloadBase64Fonts = async () => {
    try {
        const styleSheets = Array.from(document.styleSheets);
        let finalCss = '';
        for (const sheet of styleSheets) {
            try {
                const rules = Array.from(sheet.cssRules || []);
                for (const rule of rules) {
                    if (rule.type === CSSRule.FONT_FACE_RULE) {
                        finalCss += rule.cssText + '\n';
                    }
                }
            } catch (e) {
                // Ignore cross-origin errors
            }
        }
        return finalCss;
    } catch (e) {
        return '';
    }
};

const PRESETS_COLOR = [
    { id: 'aegis', nombre: 'Aegis', primario: '#4ade80', fondo: '#09090b', textoHeader: '#000000', textoNombre: '#ffffff' },
    { id: 'militar', nombre: 'Militar', primario: '#84cc16', fondo: '#1f2937', textoHeader: '#ffffff', textoNombre: '#f1f5f9' },
    { id: 'civil', nombre: 'Civil', primario: '#38bdf8', fondo: '#0f172a', textoHeader: '#ffffff', textoNombre: '#f8fafc' },
    { id: 'vip', nombre: 'VIP', primario: '#facc15', fondo: '#18181b', textoHeader: '#000000', textoNombre: '#ffeeaa' },
    { id: 'alfa', nombre: 'Alfa', primario: '#ef4444', fondo: '#450a0a', textoHeader: '#ffffff', textoNombre: '#fecaca' }
];

export const ModalPaseBase = ({ isOpen, onClose, zona, onGenerated }) => {
    const [form, setForm] = useState({
        nombre_portador: '',
        cedula_portador: '',
        telefono_portador: '',
        vehiculo_placa: '',
        vehiculo_marca: '',
        vehiculo_modelo: '',
        vehiculo_color: '',
        es_permanente: false,
        dias_vigencia: 7,
        fecha_inicio: hoy(),
        fecha_fin_custom: sumarDias(hoy(), 7),
    });
    const [loading, setLoading] = useState(false);
    const [resultado, setResultado] = useState(null);

    const [modoExport, setModoExport] = useState('qr');
    const [presetId, setPresetId] = useState('militar');
    const [capturando, setCapturando] = useState(false);
    const carnetRef = useRef(null);
    const svgRef = useRef(null);

    // Selecciona duración rápida y recalcula fecha_fin desde fecha_inicio
    const seleccionarDias = (dias) => {
        const fin = sumarDias(form.fecha_inicio || hoy(), dias);
        setForm(f => ({ ...f, dias_vigencia: dias, fecha_fin_custom: fin }));
    };

    // Cuando cambia fecha_inicio, recalcular fecha_fin
    const cambiarFechaInicio = (nuevaFecha) => {
        const fin = sumarDias(nuevaFecha, form.dias_vigencia || 7);
        setForm(f => ({ ...f, fecha_inicio: nuevaFecha, fecha_fin_custom: fin }));
    };

    const handleSubmit = async () => {
        if (!form.nombre_portador || !form.vehiculo_placa) {
            return toast.error('Nombre y Placa son mandatorios');
        }
        if (!form.es_permanente && form.fecha_inicio && form.fecha_fin_custom) {
            if (form.fecha_fin_custom < form.fecha_inicio) {
                return toast.error('La fecha de fin no puede ser anterior a la fecha de inicio');
            }
        }
        setLoading(true);
        try {
            const payload = {
                ...form,
                zona_id: zona?.id,
                fecha_inicio: form.fecha_inicio
                    ? new Date(form.fecha_inicio + 'T00:00:00').toISOString()
                    : undefined,
                fecha_expiracion: (!form.es_permanente && form.fecha_fin_custom)
                    ? new Date(form.fecha_fin_custom + 'T23:59:59').toISOString()
                    : undefined,
            };
            delete payload.fecha_fin_custom;

            const res = await api.post('/comando/pases-reservados', payload);
            setResultado(res.data);
            toast.success('Pase de Comando generado con éxito');
            if (onGenerated) onGenerated();
        } catch (e) {
            const errorDetail = e.response?.data?.detail;
            const message = typeof errorDetail === 'string' ? errorDetail : 'Error al generar pase';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setResultado(null);
        setModoExport('qr');
        setPresetId('militar');
        setForm({
            nombre_portador: '',
            cedula_portador: '',
            telefono_portador: '',
            vehiculo_placa: '',
            vehiculo_marca: '',
            vehiculo_modelo: '',
            vehiculo_color: '',
            es_permanente: false,
            dias_vigencia: 7,
            fecha_inicio: hoy(),
            fecha_fin_custom: sumarDias(hoy(), 7),
        });
    };

    // ─────────────────────────────────────────────────────────────────
    // RUTINA MOTOR DE CARNETS
    // ─────────────────────────────────────────────────────────────────

    const datosDinamicosActuales = useMemo(() => {
        if (!resultado) return {};
        const qrValue = resultado.token || resultado.serial_legible || '';
        return {
            nombre: resultado.nombre_portador || 'SIN REGISTRO',
            cedula: resultado.cedula_portador || null,
            entidad: 'COMANDO BAGFM',
            evento: zona?.nombre || 'ZONA OFICIAL',
            vehiculo_placa: resultado.vehiculo_placa || null,
            zona_nombre: zona?.nombre || null,
            tipo_acceso: 'PASE TÁCTICO',
            fecha_inicio: resultado.fecha_creacion ? new Date(resultado.fecha_creacion).toLocaleDateString() : new Date().toLocaleDateString(),
            fecha_fin: resultado.fecha_expiracion ? new Date(resultado.fecha_expiracion).toLocaleDateString() : 'PERMANENTE',
            qr: qrValue,
            serial: resultado.serial_legible || ''
        };
    }, [resultado, zona]);

    const presetObj = PRESETS_COLOR.find(p => p.id === presetId) || PRESETS_COLOR[0];
    const confGenerica = {
        titulo: 'BAGFM ACCESS',
        subtitulo: 'BASE AÉREA GRAL. FRANCISCO DE MIRANDA',
        colores: presetObj
    };

    const getLayoutDims = () => {
        switch(modoExport) {
            case 'qr': return { h: 220, s: 1 };
            case 'colgante': return { h: 340, s: 0.75 };
            case 'credencial': return { h: 300, s: 0.75 };
            case 'ticket': return { h: 210, s: 0.75 };
            case 'cartera': return { h: 160, s: 0.65 };
            default: return { h: 300, s: 0.75 };
        }
    };
    const layout = getLayoutDims();

    const generarImagen = async () => {
        setCapturando(true);
        try {
            if (modoExport === 'qr') {
                const svgEl = svgRef.current?.querySelector('svg');
                if (!svgEl) throw new Error('SVG no encontrado');
                const svgData = new XMLSerializer().serializeToString(svgEl);
                const canvas = document.createElement('canvas');
                const size = 400;
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, size, size);
                
                const img = new Image();
                const blob = await new Promise((resolve, reject) => {
                    img.onload = () => {
                        ctx.drawImage(img, 20, 20, size - 40, size - 40);
                        canvas.toBlob(blob => resolve(blob), 'image/png', 1.0);
                    };
                    img.onerror = reject;
                    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
                });
                return blob;
            } else {
                if (!carnetRef.current) throw new Error('DOM Node no encontrado');
                const fontCSSData = await preloadBase64Fonts();
                const dataUrl = await toPng(carnetRef.current, {
                    pixelRatio: 3,
                    width: carnetRef.current.offsetWidth,
                    height: carnetRef.current.offsetHeight,
                    fontEmbedCSS: fontCSSData,
                    style: { transform: 'none', margin: '0' }
                });
                const res = await fetch(dataUrl);
                return await res.blob();
            }
        } finally {
            setCapturando(false);
        }
    };

    const handleDescargar = async () => {
        try {
            const blob = await generarImagen();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${modoExport === 'qr' ? 'QR' : 'CARNET'}_${resultado.serial_legible}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('Imagen descargada exitosamente');
        } catch (err) {
            console.error(err);
            toast.error('Error al generar la imagen. Intente de nuevo.');
        }
    };

    const handleWhatsApp = async () => {
        if (!resultado) return;
        try {
            toast.loading('Preparando imagen...', { id: 'wa-share' });
            const mensaje = [
                `🎫 *PASE OFICIAL DE COMANDO — BAGFM*`,
                `📋 Serial: \`${resultado.serial_legible}\``,
                `👤 Portador: ${resultado.nombre_portador}`,
                `🚗 Vehículo: ${resultado.vehiculo_placa}`,
                ``,
                `_Presente este código en Alcabala y Parking_`
            ].join('\n');

            const isMobile = /mobile|android|iphone|ipad/i.test(navigator.userAgent);
            
            if (isMobile && navigator.share && navigator.canShare) {
                try {
                    const blob = await generarImagen();
                    const file = new File([blob], `${resultado.serial_legible}.png`, { type: 'image/png' });
                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file], title: `Pase Oficial Comando`, text: mensaje });
                        toast.dismiss('wa-share');
                        return;
                    }
                } catch (shareErr) {
                    if (shareErr.name === 'AbortError') {
                        toast.dismiss('wa-share');
                        return; 
                    }
                }
            }

            const phone = form.telefono_portador.replace(/\D/g, '');
            const urlWhatsApp = phone
                ? `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`
                : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
            
            window.open(urlWhatsApp, '_blank');
            toast.dismiss('wa-share');
            if (!isMobile) toast("En PC debes descargar el archivo y adjuntarlo", { icon: '💡' });
        } catch (err) {
            console.error(err);
            toast.error('Error enviando a WhatsApp', { id: 'wa-share' });
        }
    };

    if (resultado) {
        return (
            <Modal isOpen={isOpen} onClose={handleReset} title="PASE GENERADO CON ÉXITO" balanced className="max-w-md">
                <div className="space-y-6 text-center w-full px-2 pb-2">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center border border-success/20">
                            <CheckCircle2 size={32} className="text-success" />
                        </div>
                        <h3 className="text-sm font-black text-text-main uppercase tracking-widest">{resultado.nombre_portador}</h3>
                        <p className="text-[10px] text-text-muted uppercase font-bold">Serial Oficial: {resultado.serial_legible}</p>
                    </div>

                    {/* Contenedor Visualizable */}
                    <div 
                        className="w-full relative rounded-2xl bg-black/20 border border-white/5 overflow-hidden transition-all duration-300 ease-in-out mt-4 mx-auto" 
                        style={{ height: layout.h, maxWidth: '340px' }}
                    >
                        {capturando && (
                             <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
                                 <Loader2 size={32} className="text-primary animate-spin" />
                             </div>
                        )}
                        
                        {modoExport === 'qr' ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div ref={svgRef} className="bg-white rounded-2xl p-4 shadow-xl shadow-black/40" style={{ width: 188, height: 188, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <QRCode value={resultado.token || ' '} size={168} bgColor="#ffffff" fgColor="#0d1117" level="M" />
                                </div>
                            </div>
                        ) : (
                            <div 
                                className="absolute left-1/2 top-1/2 origin-center flex justify-center items-center transition-transform duration-300 ease-in-out"
                                style={{ transform: `translate(-50%, -50%) scale(${layout.s})` }}
                            >
                                <div ref={carnetRef} className="shrink-0 w-max h-max bg-transparent inline-block p-1">
                                    <PlantillaPreview 
                                        plantilla={modoExport} 
                                        config={confGenerica} 
                                        datos={datosDinamicosActuales} 
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controles de Formato y Estilo */}
                    <div className="w-full flex justify-center">
                        <div className="w-full max-w-[340px] flex gap-3 text-left">
                            <div className={modoExport === 'qr' ? 'w-full' : 'w-1/2'}>
                                <label className="block text-[9px] font-black tracking-widest text-text-muted uppercase px-1 mb-1">Formato</label>
                                <SelectTactivo 
                                    menuPlacement="top"
                                    value={[
                                        { value: 'qr', label: 'Solo QR' },
                                        { value: 'colgante', label: 'Colgante' },
                                        { value: 'credencial', label: 'Credencial' },
                                        { value: 'ticket', label: 'Ticket' },
                                        { value: 'cartera', label: 'Cartera' }
                                    ].find(o => o.value === modoExport)} 
                                    onChange={option => setModoExport(option?.value || 'qr')}
                                    options={[
                                        { value: 'qr', label: 'Solo QR' },
                                        { value: 'colgante', label: 'Colgante' },
                                        { value: 'credencial', label: 'Credencial' },
                                        { value: 'ticket', label: 'Ticket' },
                                        { value: 'cartera', label: 'Cartera' }
                                    ]}
                                />
                            </div>
                            {modoExport !== 'qr' && (
                                <div className="w-1/2">
                                    <label className="block text-[9px] font-black tracking-widest text-text-muted uppercase px-1 mb-1">Estilo (Preset)</label>
                                    <SelectTactivo 
                                        menuPlacement="top"
                                        value={PRESETS_COLOR.map(p => ({ value: p.id, label: p.nombre })).find(o => o.value === presetId)} 
                                        onChange={option => setPresetId(option?.value || 'militar')}
                                        options={PRESETS_COLOR.map(p => ({ value: p.id, label: p.nombre }))}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-[340px] mx-auto mt-4">
                        <button
                            onClick={handleDescargar}
                            className="flex-1 h-11 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex justify-center items-center gap-2 text-[10px] font-black uppercase text-text-muted hover:text-white transition-all cursor-pointer"
                        >
                            <Download size={15} /> Descargar
                        </button>
                        <button
                            onClick={handleWhatsApp}
                            className="flex-[1.5] h-11 bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white border border-[#25D366]/20 hover:border-transparent rounded-xl flex items-center justify-center gap-2 transition-all text-[10px] font-black uppercase cursor-pointer shadow-lg shadow-[#25D366]/5"
                        >
                            <MessageCircle size={15} /> WhatsApp
                        </button>
                    </div>

                    <div className="w-full max-w-[340px] mx-auto mt-2">
                        <button
                            onClick={handleReset}
                            className="w-full h-9 text-text-muted hover:text-white transition-all text-[10px] font-black uppercase cursor-pointer"
                        >
                            Crear Nuevo Pase
                        </button>
                    </div>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`PASE DE COMANDO — ${zona?.nombre}`} balanced className="max-w-2xl">
            <div className="space-y-5">
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-3">
                    <Shield size={16} className="text-primary shrink-0 mt-0.5" />
                    <p className="text-[9px] text-text-muted leading-relaxed uppercase tracking-tighter font-bold">
                        Estás generando un pase oficial para un cupo reservado de la base.
                        Este pase tendrá prioridad en los puntos de control.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5">
                        <Input label="Nombre Completo *" icon={<User size={12}/>} value={form.nombre_portador}
                               onChange={e => setForm({...form, nombre_portador: e.target.value.toUpperCase()})} />
                        <Input label="Cédula/ID" icon={<CreditCard size={12}/>} value={form.cedula_portador}
                               onChange={e => setForm({...form, cedula_portador: e.target.value.replace(/\D/g, '')})}
                               placeholder="SOLO NÚMEROS" />
                        <Input label="Teléfono" icon={<Phone size={12}/>} value={form.telefono_portador}
                               onChange={e => setForm({...form, telefono_portador: e.target.value.replace(/\D/g, '')})}
                               placeholder="SOLO NÚMEROS" />
                        <div className="md:col-span-1 hidden md:block" />
                    </div>

                    <div className="h-px bg-white/5 my-2" />

                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                        <Input label="Placa *" icon={<Hash size={12}/>} value={form.vehiculo_placa}
                               onChange={e => setForm({...form, vehiculo_placa: e.target.value.toUpperCase()})} />
                        <Input label="Marca" icon={<Car size={12}/>} value={form.vehiculo_marca}
                               onChange={e => setForm({...form, vehiculo_marca: e.target.value.toUpperCase()})} />
                        <Input label="Modelo" icon={<LayoutGrid size={12}/>} value={form.vehiculo_modelo}
                               onChange={e => setForm({...form, vehiculo_modelo: e.target.value.toUpperCase()})} />
                        <Input label="Color" icon={<Palette size={12}/>} value={form.vehiculo_color}
                               onChange={e => setForm({...form, vehiculo_color: e.target.value.toUpperCase()})} />
                    </div>

                    {/* ── Vigencia ── */}
                    <div className="p-3 bg-white/3 rounded-xl border border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Calendar size={12} className="text-primary" />
                                <span className="text-[9px] font-black text-text-main uppercase tracking-widest">Vigencia</span>
                            </div>
                            <div className="flex bg-black/40 p-0.5 rounded-lg">
                                <button onClick={() => setForm({...form, es_permanente: false})}
                                    className={cn("px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all",
                                        !form.es_permanente ? 'bg-primary text-bg-app shadow-lg' : 'text-text-muted hover:text-text-main')}>
                                    Temporal
                                </button>
                                <button onClick={() => setForm({...form, es_permanente: true})}
                                    className={cn("px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all",
                                        form.es_permanente ? 'bg-primary text-bg-app shadow-lg' : 'text-text-muted hover:text-text-main')}>
                                    Permanente
                                </button>
                            </div>
                        </div>

                        {!form.es_permanente && (
                            <div className="space-y-3 pt-1">
                                {/* Fecha Inicio */}
                                <div className="flex items-center gap-2">
                                    <span className="text-[8px] text-text-muted font-black uppercase w-16 shrink-0">Desde:</span>
                                    <input
                                        type="date"
                                        value={form.fecha_inicio}
                                        onChange={e => cambiarFechaInicio(e.target.value)}
                                        className="flex-1 bg-black/40 border border-white/10 rounded-md px-2 py-1 text-[10px] text-text-main focus:border-primary outline-none"
                                        min={hoy()}
                                    />
                                </div>

                                {/* Selector rápido de duración */}
                                <div className="flex items-center gap-2">
                                    <span className="text-[8px] text-text-muted font-black uppercase w-16 shrink-0">Rápido:</span>
                                    <div className="flex flex-1 gap-1">
                                        {[1, 3, 7, 15, 30].map(d => (
                                            <button key={d} onClick={() => seleccionarDias(d)}
                                                className={cn("flex-1 py-1 rounded-md border text-[8px] font-black transition-all",
                                                form.dias_vigencia === d ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 text-text-muted hover:border-white/10')}>
                                                {d}D
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Fecha Fin */}
                                <div className="flex items-center gap-2">
                                    <span className="text-[8px] text-text-muted font-black uppercase w-16 shrink-0">Hasta:</span>
                                    <input
                                        type="date"
                                        value={form.fecha_fin_custom}
                                        onChange={e => setForm({...form, fecha_fin_custom: e.target.value, dias_vigencia: 0})}
                                        className="flex-1 bg-black/40 border border-white/10 rounded-md px-2 py-1 text-[10px] text-text-main focus:border-primary outline-none"
                                        min={form.fecha_inicio || hoy()}
                                    />
                                </div>

                                {/* Resumen de vigencia */}
                                {form.fecha_inicio && form.fecha_fin_custom && (
                                    <div className="flex items-center justify-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/10">
                                        <span className="text-[8px] text-text-muted uppercase font-bold">Válido:</span>
                                        <span className="text-[9px] text-primary font-black">
                                            {new Date(form.fecha_inicio + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}
                                        </span>
                                        <span className="text-text-muted text-[8px]">→</span>
                                        <span className="text-[9px] text-warning font-black">
                                            {new Date(form.fecha_fin_custom + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 pt-2">
                    <button
                        className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-text-muted hover:text-text-main font-black uppercase text-[10px] transition-all cursor-pointer"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <Boton className="flex-[2] bg-primary text-bg-app h-10 font-black uppercase gap-2 shadow-xl shadow-primary/20 text-[10px]"
                           onClick={handleSubmit} disabled={loading}>
                        {loading ? <RefreshCw size={14} className="animate-spin" /> : <Shield size={14} />}
                        {loading ? 'PROCESANDO...' : 'GENERAR PASE OFICIAL'}
                    </Boton>
                </div>
            </div>
        </Modal>
    );
};
