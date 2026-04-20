import React, { useState, useRef, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Boton } from '../../components/ui/Boton';
import { Input } from '../../components/ui/Input';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import {
    Palette, Eye, Printer, Download, RefreshCw,
    CreditCard, Tag, Ticket, BadgeCheck, ChevronDown,
    Settings, Type, Paintbrush, Save, Share2,
    User, Car, ParkingSquare, Calendar, Shield
} from 'lucide-react';
import PlantillaPreview from '../../components/carnets/PlantillaPreview';

// ──── Constantes ──────────────────────────────────────────────────────────────

const PLANTILLAS = [
    { id: 'colgante', label: 'Colgante', desc: 'Vertical, para cuello con cordón', icon: BadgeCheck },
    { id: 'cartera', label: 'Cartera', desc: 'Horizontal, tamaño tarjeta', icon: CreditCard },
    { id: 'ticket', label: 'Ticket', desc: 'Compacto, estilo boleto', icon: Ticket },
    { id: 'credencial', label: 'Credencial', desc: 'Formal, tipo tarjeta laboral', icon: Tag },
];

const PRESETS_COLOR = [
    { id: 'aegis', label: 'Aegis Tactical', primario: '#4EDEA3', fondo: '#0d0f12', textoHeader: '#ffffff', textoNombre: '#e5e5e7' },
    { id: 'militar', label: 'Militar', primario: '#6B8F4A', fondo: '#1a1c15', textoHeader: '#ffffff', textoNombre: '#d4d7cd' },
    { id: 'navy', label: 'Navy', primario: '#3B82F6', fondo: '#0c1220', textoHeader: '#ffffff', textoNombre: '#c8d6e5' },
    { id: 'obsidian', label: 'Obsidian', primario: '#a855f7', fondo: '#0d0b14', textoHeader: '#ffffff', textoNombre: '#d4c6ec' },
    { id: 'gold', label: 'VIP Dorado', primario: '#d4a843', fondo: '#15130e', textoHeader: '#1a1204', textoNombre: '#e8dcc8' },
    { id: 'clean', label: 'Clásico Blanco', primario: '#1a1a1a', fondo: '#ffffff', textoHeader: '#ffffff', textoNombre: '#1a1a1a' },
    { id: 'crimson', label: 'Crimson', primario: '#ef4444', fondo: '#140a0a', textoHeader: '#ffffff', textoNombre: '#e5c8c8' },
];

const DATOS_DEMO = {
    nombre: 'CARLOS RAMÍREZ LÓPEZ',
    cedula: 'V-18.456.789',
    tipo_acceso: 'VIP PRODUCTOR',
    entidad: 'CÍRCULO MILITAR VEN',
    evento: 'FESTIVAL AÉREO 2026',
    vehiculo_placa: 'ABC-123',
    zona_nombre: 'ZONA VIP NORTE',
    puesto_codigo: 'A-04',
    serial: 'BAGFM-V2-4E8F',
    fecha_inicio: '18/04/2026',
    fecha_fin: '20/04/2026',
    foto_url: '',
};

// ──── Sub-componentes ─────────────────────────────────────────────────────────

const ColorSwatch = ({ color, selected, onClick, label }) => (
    <button onClick={onClick} title={label}
        className={cn(
            "w-8 h-8 rounded-xl border-2 transition-all active:scale-90 hover:scale-105",
            selected ? 'border-primary ring-2 ring-primary/30 scale-110' : 'border-white/10 hover:border-white/20'
        )}
        style={{ background: color }} />
);

const SeccionPlegable = ({ titulo, icono: Icon, children, defaultOpen = false }) => {
    const [abierto, setAbierto] = useState(defaultOpen);
    return (
        <div className="border border-white/5 rounded-xl overflow-hidden">
            <button onClick={() => setAbierto(!abierto)}
                className="w-full flex items-center gap-2 px-4 py-3 bg-white/3 hover:bg-white/5 transition-all text-left">
                <Icon size={14} className="text-primary" />
                <span className="text-[10px] font-black text-text-main uppercase tracking-widest flex-1">{titulo}</span>
                <ChevronDown size={14} className={cn("text-text-muted transition-transform", abierto && "rotate-180")} />
            </button>
            {abierto && (
                <div className="p-4 space-y-3 animate-in slide-in-from-top-2 duration-200 border-t border-white/5">
                    {children}
                </div>
            )}
        </div>
    );
};

// ──── Página Principal ────────────────────────────────────────────────────────

export default function EditorCarnets() {
    const previewRef = useRef(null);

    // Estado del editor
    const [plantillaActiva, setPlantillaActiva] = useState('colgante');
    const [presetActivo, setPresetActivo] = useState('aegis');
    const [coloresCustom, setColoresCustom] = useState(PRESETS_COLOR[0]);
    const [configCarnet, setConfigCarnet] = useState({
        titulo: 'BAGFM ACCESS',
        subtitulo: 'BASE AÉREA GRAL. FRANCISCO DE MIRANDA',
    });
    const [datosPreview, setDatosPreview] = useState({ ...DATOS_DEMO });
    const [imprimiendo, setImprimiendo] = useState(false);

    // Aplicar preset de color
    const aplicarPreset = useCallback((presetId) => {
        const preset = PRESETS_COLOR.find(p => p.id === presetId);
        if (preset) {
            setPresetActivo(presetId);
            setColoresCustom(preset);
        }
    }, []);

    // Imprimir / exportar
    const handleImprimir = () => {
        setImprimiendo(true);
        setTimeout(() => {
            const contenido = document.getElementById('carnet-preview');
            if (!contenido) { toast.error('No se encontró el preview'); setImprimiendo(false); return; }

            // Recopilar TODAS las reglas de estilo de la aplicación para inyectarlas
            let stylesRaw = '';
            try {
                for (const sheet of document.styleSheets) {
                    try {
                        for (const rule of sheet.cssRules) {
                            stylesRaw += rule.cssText;
                        }
                    } catch (e) { /* Saltar hojas de estilo externas inaccesibles por CORS */ }
                }
            } catch (e) { console.error("Error al recopilar estilos", e); }

            // Determinar orientación según plantilla
            const esHorizontal = ['cartera', 'ticket'].includes(plantillaActiva);
            const orientacion = esHorizontal ? 'landscape' : 'portrait';

            const ventana = window.open('', '_blank', 'width=850,height=900');
            ventana.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Carnet BAGFM - ${datosPreview.nombre}</title>
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
                    <style>
                        /* Inyección de estilos de la app */
                        ${stylesRaw}

                        /* Reset y Configuración de Impresión */
                        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        
                        @page { 
                            size: ${orientacion}; 
                            margin: 0mm; /* Elimina encabezados y pies de página del navegador */
                        }

                        body { 
                            display: flex; 
                            align-items: center; 
                            justify-content: center; 
                            width: 100vw;
                            height: 100vh;
                            background: white !important; 
                            font-family: 'Inter', sans-serif;
                            overflow: hidden;
                        }

                        .carnet-print-wrapper { 
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            width: 100%;
                            height: 100%;
                        }

                        #carnet-preview {
                            box-shadow: none !important;
                            border: 1px solid rgba(0,0,0,0.05) !important;
                        }
                        
                        @media screen {
                            .carnet-print-wrapper { transform: scale(1.4); }
                        }

                        @media print {
                            body { background: white !important; }
                            .carnet-print-wrapper { transform: scale(1); }
                        }
                    </style>
                </head>
                <body>
                    <div class="carnet-print-wrapper">${contenido.outerHTML}</div>
                    <script>
                        window.onload = () => {
                            setTimeout(() => {
                                window.print();
                                // window.close(); 
                            }, 800);
                        };
                    </script>
                </body>
                </html>
            `);
            ventana.document.close();
            setImprimiendo(false);
        }, 150);
    };

    const handleGuardarPlantilla = () => {
        const plantillaData = {
            plantilla: plantillaActiva,
            preset: presetActivo,
            colores: coloresCustom,
            config: configCarnet,
        };
        localStorage.setItem('bagfm_carnet_plantilla', JSON.stringify(plantillaData));
        toast.success('Plantilla guardada localmente');
    };

    const handleCargarPlantilla = () => {
        try {
            const saved = localStorage.getItem('bagfm_carnet_plantilla');
            if (saved) {
                const data = JSON.parse(saved);
                setPlantillaActiva(data.plantilla);
                setPresetActivo(data.preset);
                setColoresCustom(data.colores);
                setConfigCarnet(data.config);
                toast.success('Plantilla restaurada');
            } else {
                toast('No hay plantilla guardada', { icon: 'ℹ️' });
            }
        } catch (e) {
            toast.error('Error al cargar plantilla');
        }
    };

    const configCompleta = {
        titulo: configCarnet.titulo,
        subtitulo: configCarnet.subtitulo,
        colores: {
            primario: coloresCustom.primario,
            fondo: coloresCustom.fondo,
            textoHeader: coloresCustom.textoHeader,
            textoNombre: coloresCustom.textoNombre,
        },
    };

    return (
        <div className="p-4 md:p-6 pb-24 max-w-6xl mx-auto animate-in fade-in duration-500">

            {/* Header */}
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                        <Palette className="text-primary" size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-text-main uppercase tracking-tight">Editor de Carnets</h1>
                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Diseñador Visual — Pases y Credenciales</p>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Boton onClick={handleCargarPlantilla} variant="ghost" className="h-9 px-3 text-[9px] font-black uppercase gap-1.5 rounded-xl">
                        <RefreshCw size={13} /> Restaurar
                    </Boton>
                    <Boton onClick={handleGuardarPlantilla} variant="ghost" className="h-9 px-3 text-[9px] font-black uppercase gap-1.5 border-primary/30 rounded-xl">
                        <Save size={13} /> Guardar
                    </Boton>
                    <Boton onClick={handleImprimir} disabled={imprimiendo}
                        className="h-9 px-4 bg-primary text-bg-app text-[9px] font-black uppercase gap-1.5 rounded-xl">
                        {imprimiendo ? <RefreshCw size={13} className="animate-spin" /> : <Printer size={13} />}
                        Imprimir
                    </Boton>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">

                {/* ── PANEL DE CONFIGURACIÓN (izquierda) ── */}
                <div className="space-y-3 order-2 lg:order-1">

                    {/* Selector de plantilla */}
                    <SeccionPlegable titulo="Plantilla" icono={Eye} defaultOpen={true}>
                        <div className="grid grid-cols-2 gap-2">
                            {PLANTILLAS.map(p => {
                                const Icon = p.icon;
                                const sel = plantillaActiva === p.id;
                                return (
                                    <button key={p.id} onClick={() => setPlantillaActiva(p.id)}
                                        className={cn(
                                            "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                                            sel ? 'bg-primary/10 border-primary text-primary' : 'bg-white/5 border-white/10 text-text-muted hover:border-white/20 hover:text-text-main'
                                        )}>
                                        <Icon size={20} />
                                        <span className="text-[9px] font-black uppercase tracking-tight">{p.label}</span>
                                        <span className="text-[7px] font-bold text-text-muted/50 leading-tight text-center">{p.desc}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </SeccionPlegable>

                    {/* Colores */}
                    <SeccionPlegable titulo="Paleta de Colores" icono={Paintbrush} defaultOpen={true}>
                        <div className="space-y-3">
                            <p className="text-[8px] font-bold text-text-muted/50 uppercase tracking-widest">Presets</p>
                            <div className="flex flex-wrap gap-2">
                                {PRESETS_COLOR.map(p => (
                                    <div key={p.id} className="flex flex-col items-center gap-1">
                                        <ColorSwatch color={p.primario} selected={presetActivo === p.id} onClick={() => aplicarPreset(p.id)} label={p.label} />
                                        <span className="text-[7px] font-bold text-text-muted/40">{p.label.split(' ')[0]}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-2 border-t border-white/5 space-y-2">
                                <p className="text-[8px] font-bold text-text-muted/50 uppercase tracking-widest">Colores Personalizados</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[8px] font-bold text-text-muted/40 block mb-1">Primario</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={coloresCustom.primario}
                                                onChange={e => setColoresCustom({ ...coloresCustom, primario: e.target.value })}
                                                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0" />
                                            <span className="text-[9px] font-mono text-text-muted">{coloresCustom.primario}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-bold text-text-muted/40 block mb-1">Fondo</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={coloresCustom.fondo}
                                                onChange={e => setColoresCustom({ ...coloresCustom, fondo: e.target.value })}
                                                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0" />
                                            <span className="text-[9px] font-mono text-text-muted">{coloresCustom.fondo}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-bold text-text-muted/40 block mb-1">Texto Header</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={coloresCustom.textoHeader}
                                                onChange={e => setColoresCustom({ ...coloresCustom, textoHeader: e.target.value })}
                                                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0" />
                                            <span className="text-[9px] font-mono text-text-muted">{coloresCustom.textoHeader}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-bold text-text-muted/40 block mb-1">Texto Nombre</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={coloresCustom.textoNombre}
                                                onChange={e => setColoresCustom({ ...coloresCustom, textoNombre: e.target.value })}
                                                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0" />
                                            <span className="text-[9px] font-mono text-text-muted">{coloresCustom.textoNombre}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SeccionPlegable>

                    {/* Textos del carnet */}
                    <SeccionPlegable titulo="Textos del Carnet" icono={Type}>
                        <Input label="Título Principal" value={configCarnet.titulo}
                            onChange={e => setConfigCarnet({ ...configCarnet, titulo: e.target.value.toUpperCase() })}
                            placeholder="BAGFM ACCESS" />
                        <Input label="Subtítulo" value={configCarnet.subtitulo}
                            onChange={e => setConfigCarnet({ ...configCarnet, subtitulo: e.target.value.toUpperCase() })}
                            placeholder="BASE AÉREA..." />
                    </SeccionPlegable>

                    {/* Datos de preview */}
                    <SeccionPlegable titulo="Datos de Prueba" icono={Settings}>
                        <div className="space-y-2">
                            <Input label="Nombre completo" value={datosPreview.nombre}
                                onChange={e => setDatosPreview({ ...datosPreview, nombre: e.target.value.toUpperCase() })} />
                            <div className="grid grid-cols-2 gap-2">
                                <Input label="Cédula" value={datosPreview.cedula}
                                    onChange={e => setDatosPreview({ ...datosPreview, cedula: e.target.value })} />
                                <Input label="Tipo de Acceso" value={datosPreview.tipo_acceso}
                                    onChange={e => setDatosPreview({ ...datosPreview, tipo_acceso: e.target.value.toUpperCase() })} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Input label="Entidad" value={datosPreview.entidad}
                                    onChange={e => setDatosPreview({ ...datosPreview, entidad: e.target.value.toUpperCase() })} />
                                <Input label="Evento" value={datosPreview.evento}
                                    onChange={e => setDatosPreview({ ...datosPreview, evento: e.target.value.toUpperCase() })} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Input label="Placa vehículo" value={datosPreview.vehiculo_placa}
                                    onChange={e => setDatosPreview({ ...datosPreview, vehiculo_placa: e.target.value.toUpperCase() })} />
                                <Input label="Zona asignada" value={datosPreview.zona_nombre}
                                    onChange={e => setDatosPreview({ ...datosPreview, zona_nombre: e.target.value.toUpperCase() })} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Input label="Fecha inicio" value={datosPreview.fecha_inicio}
                                    onChange={e => setDatosPreview({ ...datosPreview, fecha_inicio: e.target.value })} />
                                <Input label="Fecha fin" value={datosPreview.fecha_fin}
                                    onChange={e => setDatosPreview({ ...datosPreview, fecha_fin: e.target.value })} />
                            </div>
                            <button onClick={() => setDatosPreview({ ...DATOS_DEMO })}
                                className="w-full h-8 text-[9px] font-black uppercase text-text-muted/50 border border-dashed border-white/10 rounded-xl hover:bg-white/5 transition-all">
                                Restaurar datos demo
                            </button>
                        </div>
                    </SeccionPlegable>
                </div>

                {/* ── PREVIEW EN VIVO (derecha) ── */}
                <div className="order-1 lg:order-2 sticky top-20">
                    <Card className="p-6 rounded-2xl border-white/5 bg-bg-card/30">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Eye size={14} className="text-primary" />
                                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                                    Vista Previa — {PLANTILLAS.find(p => p.id === plantillaActiva)?.label}
                                </p>
                            </div>
                            <span className="text-[8px] font-bold text-text-muted/40 px-2 py-1 bg-white/5 rounded-lg">
                                {PRESETS_COLOR.find(p => p.id === presetActivo)?.label}
                            </span>
                        </div>

                        {/* Canvas de preview */}
                        <div ref={previewRef}
                            className="flex items-center justify-center py-8 px-4 rounded-xl min-h-[400px]"
                            style={{
                                background: 'repeating-conic-gradient(rgba(255,255,255,0.02) 0% 25%, transparent 0% 50%) 0 0 / 20px 20px',
                            }}>
                            <PlantillaPreview
                                plantilla={plantillaActiva}
                                datos={datosPreview}
                                config={configCompleta}
                            />
                        </div>

                        {/* Acciones rápidas bajo preview */}
                        <div className="flex gap-2 mt-4 flex-wrap justify-center">
                            {PLANTILLAS.map(p => (
                                <button key={p.id} onClick={() => setPlantillaActiva(p.id)}
                                    className={cn(
                                        "h-8 px-3 rounded-lg text-[9px] font-black uppercase transition-all",
                                        plantillaActiva === p.id
                                            ? 'bg-primary text-bg-app'
                                            : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-main'
                                    )}>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* Info */}
                    <div className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/15 rounded-xl mt-3">
                        <Shield size={14} className="text-primary shrink-0 mt-0.5" />
                        <p className="text-[9px] text-text-muted leading-relaxed">
                            Personaliza el diseño visual y presiona <strong className="text-primary">Imprimir</strong> para generar el PDF. En producción, el QR real del pase se insertará automáticamente al momento de la impresión masiva.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
