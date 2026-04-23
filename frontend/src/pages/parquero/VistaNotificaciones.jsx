import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    ArrowLeft, Bell, Car, ParkingSquare, LogOut, LogIn,
    RefreshCw, ChevronDown, ChevronUp, Clock, Shield,
    AlertCircle, CheckCircle2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { parqueroService } from '../../services/parquero.service';

// ── Helpers de formato ────────────────────────────────────────────────────
const formatearHora = (isoString) => {
    if (!isoString) return '—';
    try {
        const d = new Date(isoString);
        return d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
};

const formatearFechaHora = (isoString) => {
    if (!isoString) return '—';
    try {
        const d = new Date(isoString);
        return d.toLocaleString('es-VE', {
            day: '2-digit', month: 'short',
            hour: '2-digit', minute: '2-digit'
        });
    } catch { return '—'; }
};

const tiempoRelativo = (isoString) => {
    if (!isoString) return null;
    try {
        const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
        if (diff < 60) return 'Hace un momento';
        if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
        return formatearFechaHora(isoString);
    } catch { return null; }
};

// ── Icono y color por tipo de evento ─────────────────────────────────────
const CONFIG_TIPO = {
    alcabala: {
        Icon: Shield,
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20',
        dot: 'bg-indigo-400',
        label: 'Alcabala',
    },
    ingreso_zona: {
        Icon: LogIn,
        color: 'text-success',
        bg: 'bg-success/10',
        border: 'border-success/20',
        dot: 'bg-success',
        label: 'Ingresó a Zona',
    },
    salida_zona: {
        Icon: LogOut,
        color: 'text-warning',
        bg: 'bg-warning/10',
        border: 'border-warning/20',
        dot: 'bg-warning',
        label: 'Salió de Zona',
    },
};

// ── Tarjeta de evento individual ──────────────────────────────────────────
const TarjetaEvento = ({ evento }) => {
    const cfg = CONFIG_TIPO[evento.tipo] || CONFIG_TIPO.alcabala;
    const { Icon } = cfg;

    return (
        <div className={cn(
            'flex items-start gap-3 p-3 rounded-xl border transition-all',
            cfg.bg, cfg.border
        )}>
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', cfg.bg, cfg.border, 'border')}>
                <Icon size={15} className={cfg.color} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <span className={cn('text-[9px] font-black uppercase tracking-widest', cfg.color)}>
                        {cfg.label}
                    </span>
                    <span className="text-[9px] text-text-muted/60 shrink-0">
                        {formatearHora(evento.timestamp)}
                    </span>
                </div>
                <p className="text-[11px] font-black text-text-main mt-0.5">
                    {evento.placa ? (
                        <span className="font-black tracking-wider">{evento.placa}</span>
                    ) : (
                        <span className="text-text-muted italic">Placa no registrada</span>
                    )}
                </p>
                {evento.descripcion && (
                    <p className="text-[10px] text-text-muted mt-0.5">{evento.descripcion}</p>
                )}
                {evento.tipo === 'ingreso_zona' && evento.puesto_asignado_id && (
                    <div className="flex items-center gap-1 mt-1">
                        <ParkingSquare size={10} className="text-success" />
                        <span className="text-[9px] text-success font-bold">Puesto asignado</span>
                    </div>
                )}
                {evento.tipo === 'ingreso_zona' && evento.activo === false && (
                    <div className="flex items-center gap-1 mt-1">
                        <CheckCircle2 size={10} className="text-text-muted" />
                        <span className="text-[9px] text-text-muted">Ya salió de la zona</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Grupo de vehículo con trazabilidad expandible ─────────────────────────
const GrupoVehiculo = ({ placa, eventos }) => {
    const [expandido, setExpandido] = useState(false);
    const ultimoEvento = eventos[0];
    const cfg = CONFIG_TIPO[ultimoEvento?.tipo] || CONFIG_TIPO.alcabala;

    return (
        <div className="bg-bg-card rounded-2xl border border-white/5 overflow-hidden">
            <button
                onClick={() => setExpandido(p => !p)}
                className="w-full flex items-center gap-3 p-3 hover:bg-white/3 transition-colors"
            >
                <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
                    cfg.bg, cfg.border
                )}>
                    <Car size={18} className={cfg.color} />
                </div>
                <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-black text-text-main tracking-wider">{placa || 'Sin placa'}</p>
                    <p className={cn('text-[9px] font-black uppercase tracking-widest', cfg.color)}>
                        {cfg.label}
                        <span className="text-text-muted/60 font-normal ml-2">
                            {tiempoRelativo(ultimoEvento?.timestamp)}
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-text-muted bg-white/5 px-2 py-1 rounded-full">
                        {eventos.length} {eventos.length === 1 ? 'evento' : 'eventos'}
                    </span>
                    {expandido
                        ? <ChevronUp size={14} className="text-text-muted" />
                        : <ChevronDown size={14} className="text-text-muted" />
                    }
                </div>
            </button>

            {expandido && (
                <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-2">
                    {eventos.map((evento, i) => (
                        <TarjetaEvento key={i} evento={evento} />
                    ))}
                </div>
            )}
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// VISTA PRINCIPAL: NOTIFICACIONES
// ══════════════════════════════════════════════════════════════════════════════
const VistaNotificaciones = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [zonaDataInternal, setZonaDataInternal] = useState(location.state?.zonaData || null);
    const zonaId = zonaDataInternal?.id;
    const zonaNombre = zonaDataInternal?.nombre || 'Cargando...';

    const [eventos, setEventos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [vistaMode, setVistaMode] = useState('vehiculos'); // 'vehiculos' | 'timeline'

    const cargarZonaYHistorial = useCallback(async () => {
        try {
            let targetId = zonaId;
            let targetNombre = zonaNombre;

            if (!targetId) {
                const z = await parqueroService.getMiZona();
                if (z) {
                    setZonaDataInternal(z);
                    targetId = z.id;
                }
            }

            if (targetId) {
                const data = await parqueroService.getTrazabilidadZona(targetId);
                setEventos(data || []);
            }
        } catch (err) {
            console.error("Error cargando trazabilidad:", err);
        } finally {
            setCargando(false);
        }
    }, [zonaId, zonaNombre]);

    useEffect(() => {
        cargarZonaYHistorial();
        const interval = setInterval(cargarZonaYHistorial, 15000);
        return () => clearInterval(interval);
    }, [cargarZonaYHistorial]);

    // Agrupar eventos por placa para vista "vehiculos"
    const eventosPorPlaca = eventoAgrupadoPorPlaca(eventos);

    return (
        <div className="min-h-screen bg-bg-app flex flex-col">

            {/* Header */}
            <header className="sticky top-0 z-40 bg-bg-card/90 backdrop-blur-md border-b border-white/5 px-4 py-3">
                <div className="flex items-center gap-4 max-w-2xl mx-auto w-full">
                    <button
                        onClick={() => navigate('/parquero/')}
                        className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
                    >
                        <ArrowLeft size={18} className="text-text-muted" />
                    </button>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-wide text-text-main leading-none flex items-center gap-2">
                            <Bell size={14} className="text-primary" /> Notificaciones
                        </h1>
                        <p className="text-[9px] text-text-muted font-bold mt-0.5">{zonaNombre}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <span className="text-[9px] font-black text-text-muted bg-white/5 px-2 py-1 rounded-full">
                            {eventos.length} eventos
                        </span>
                        <button
                            onClick={cargarZonaYHistorial}
                            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
                        >
                            <RefreshCw size={16} className={cn('text-text-muted', cargando && 'animate-spin')} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Tabs vista */}
            <div className="max-w-2xl mx-auto w-full px-4 pt-4">
                <div className="flex gap-2 max-w-md bg-bg-low rounded-2xl p-1 border border-white/5">
                    <button
                        onClick={() => setVistaMode('vehiculos')}
                        className={cn(
                            'flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all',
                            vistaMode === 'vehiculos'
                                ? 'bg-bg-card text-primary border border-primary/20 shadow-sm'
                                : 'text-text-muted hover:text-text-main'
                        )}
                    >
                        <Car size={12} /> Por Vehículo
                    </button>
                    <button
                        onClick={() => setVistaMode('timeline')}
                        className={cn(
                            'flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all',
                            vistaMode === 'timeline'
                                ? 'bg-bg-card text-primary border border-primary/20 shadow-sm'
                                : 'text-text-muted hover:text-text-main'
                        )}
                    >
                        <Clock size={12} /> Línea de Tiempo
                    </button>
                </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 space-y-4 pb-10">

                {cargando && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <RefreshCw size={32} className="text-primary animate-spin" />
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Cargando trazabilidad...</p>
                    </div>
                )}

                {!cargando && eventos.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Bell size={40} className="text-text-muted/30" />
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Sin eventos en esta zona</p>
                    </div>
                )}

                {/* Vista: Agrupado por vehículo */}
                {!cargando && vistaMode === 'vehiculos' && (
                    <>
                        {/* Leyenda */}
                        <div className="flex flex-wrap gap-2 py-1">
                            {Object.entries(CONFIG_TIPO).map(([tipo, cfg]) => {
                                const { Icon } = cfg;
                                return (
                                    <div key={tipo} className={cn('flex items-center gap-1.5 px-2 py-1 rounded-full border text-[9px] font-black', cfg.bg, cfg.border, cfg.color)}>
                                        <Icon size={10} />
                                        {cfg.label}
                                    </div>
                                );
                            })}
                        </div>

                        {Object.entries(eventosPorPlaca).map(([placa, evts]) => (
                            <GrupoVehiculo key={placa} placa={placa} eventos={evts} />
                        ))}
                    </>
                )}

                {/* Vista: Línea de tiempo crónica */}
                {!cargando && vistaMode === 'timeline' && (
                    <div className="space-y-2">
                        {eventos.map((evento, i) => (
                            <div key={i} className="flex gap-3 items-start">
                                {/* Línea temporal */}
                                <div className="flex flex-col items-center shrink-0 pt-1">
                                    <div className={cn(
                                        'w-2.5 h-2.5 rounded-full',
                                        (CONFIG_TIPO[evento.tipo] || CONFIG_TIPO.alcabala).dot
                                    )} />
                                    {i < eventos.length - 1 && (
                                        <div className="w-px flex-1 min-h-[24px] bg-white/10 mt-1" />
                                    )}
                                </div>
                                {/* Contenido */}
                                <div className="flex-1 pb-3">
                                    <TarjetaEvento evento={evento} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Helper: agrupar eventos por placa ────────────────────────────────────
function eventoAgrupadoPorPlaca(eventos) {
    return eventos.reduce((acc, evento) => {
        const key = evento.placa || 'SIN_PLACA';
        if (!acc[key]) acc[key] = [];
        acc[key].push(evento);
        return acc;
    }, {});
}

export default VistaNotificaciones;
