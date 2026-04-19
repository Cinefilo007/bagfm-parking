import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Boton } from '../../components/ui/Boton';
import { Modal } from '../../components/ui/Modal';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/auth.store';
import {
    AlertTriangle, Shield, RefreshCw, MapPin,
    CheckCircle2, XCircle, Filter, Search,
    Car, ChevronUp, Clock, Users, Hash,
    Ban, Scale, ChevronRight, Flame, Eye,
    TrendingUp, Map
} from 'lucide-react';
import api from '../../services/api';

// ──── Constantes ──────────────────────────────────────────────────────────────

const GRAVEDAD_CONFIG = {
    leve:     { color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  border: 'border-yellow-400/30',  dot: 'bg-yellow-400',  label: 'LEVE' },
    moderada: { color: 'text-orange-400',  bg: 'bg-orange-400/10',  border: 'border-orange-400/30',  dot: 'bg-orange-400',  label: 'MODERADA' },
    grave:    { color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/30',     dot: 'bg-red-400',     label: 'GRAVE' },
    critica:  { color: 'text-gray-200',    bg: 'bg-gray-900/80',    border: 'border-gray-400/30',    dot: 'bg-gray-300',    label: 'CRÍTICA' },
};

const ESTADO_CONFIG = {
    activa:      { color: 'text-danger',     label: 'Activa' },
    resuelta:    { color: 'text-success',    label: 'Resuelta' },
    perdonada:   { color: 'text-sky-400',    label: 'Perdonada' },
    en_revision: { color: 'text-warning',    label: 'En revisión' },
    apelada:     { color: 'text-purple-400', label: 'Apelada' },
};

// ── Permisos de resolución por gravedad ──
const puedeResolver = (rol, gravedad) => {
    if (rol === 'COMANDANTE') return true;
    if (rol === 'ADMIN_BASE') return ['leve', 'moderada', 'grave'].includes(gravedad);
    if (rol === 'SUPERVISOR') return ['leve', 'moderada'].includes(gravedad);
    if (rol === 'SUPERVISOR_PARQUEROS' || rol === 'ADMIN_ENTIDAD') return gravedad === 'leve';
    return false;
};

// ──── Sub-componentes ─────────────────────────────────────────────────────────

const KpiInfraccion = ({ label, valor, color, icon: Icon }) => (
    <Card className="flex flex-col p-4 rounded-2xl border-white/5">
        <div className="flex justify-between mb-2">
            <Icon size={18} className={color} />
            <div className="w-1.5 h-1.5 rounded-full bg-primary/20" />
        </div>
        <div className={cn("text-2xl font-black tracking-tighter", color)}>{valor}</div>
        <div className="text-[8px] font-black uppercase tracking-widest text-text-muted/50 mt-0.5">{label}</div>
    </Card>
);

const InfraccionCard = ({ infraccion, userRol, onResolver, onEscalar, onDetalle }) => {
    const gcfg = GRAVEDAD_CONFIG[infraccion.gravedad] || GRAVEDAD_CONFIG.leve;
    const ecfg = ESTADO_CONFIG[infraccion.estado] || ESTADO_CONFIG.activa;
    const canResolve = puedeResolver(userRol, infraccion.gravedad) && infraccion.estado === 'activa';

    return (
        <div className={cn("p-4 rounded-xl border transition-all space-y-3", gcfg.bg, gcfg.border)}>
            <div className="flex items-start gap-3">
                <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", gcfg.dot)} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border", gcfg.color, gcfg.bg, gcfg.border)}>
                            {gcfg.label}
                        </span>
                        <span className="text-xs font-black text-text-main uppercase">
                            {infraccion.tipo?.replace(/_/g, ' ')}
                        </span>
                        <span className={cn("text-[8px] font-bold ml-auto", ecfg.color)}>{ecfg.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {infraccion.vehiculo_placa && (
                            <span className="text-[9px] text-text-muted flex items-center gap-1">
                                <Car size={9} /> {infraccion.vehiculo_placa}
                            </span>
                        )}
                        {infraccion.zona_nombre && (
                            <span className="text-[9px] text-text-muted flex items-center gap-1">
                                <MapPin size={9} /> {infraccion.zona_nombre}
                            </span>
                        )}
                        {(infraccion.latitud_infraccion || infraccion.latitud) && (
                            <span className="text-[9px] text-success flex items-center gap-1">
                                <MapPin size={9} /> GPS
                            </span>
                        )}
                        <span className="text-[9px] text-text-muted flex items-center gap-1">
                            <Clock size={9} /> {new Date(infraccion.created_at || Date.now()).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                    </div>
                    {infraccion.descripcion && (
                        <p className="text-[9px] text-text-muted/70 mt-1 line-clamp-1">{infraccion.descripcion}</p>
                    )}
                </div>
            </div>

            {/* Consecuencias activas */}
            {infraccion.bloquea_acceso_futuro && (
                <div className="flex items-center gap-2 p-2 bg-danger/10 border border-danger/20 rounded-lg">
                    <Ban size={11} className="text-danger shrink-0" />
                    <span className="text-[8px] font-black text-danger uppercase">Acceso bloqueado</span>
                </div>
            )}

            {/* Acciones */}
            {infraccion.estado === 'activa' && (
                <div className="flex gap-2 flex-wrap">
                    {canResolve && (
                        <button onClick={() => onResolver(infraccion, 'resolver')}
                            className="h-7 px-3 rounded-lg bg-success/15 text-success border border-success/25 text-[9px] font-black uppercase flex items-center gap-1.5 hover:bg-success/25 transition-all">
                            <CheckCircle2 size={11} /> Resolver
                        </button>
                    )}
                    {canResolve && (
                        <button onClick={() => onResolver(infraccion, 'perdonar')}
                            className="h-7 px-3 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/20 text-[9px] font-black uppercase flex items-center gap-1.5 hover:bg-sky-500/25 transition-all">
                            <Scale size={11} /> Perdonar
                        </button>
                    )}
                    {!canResolve && (
                        <button onClick={() => onEscalar(infraccion)}
                            className="h-7 px-3 rounded-lg bg-orange-400/15 text-orange-400 border border-orange-400/20 text-[9px] font-black uppercase flex items-center gap-1.5 hover:bg-orange-400/25 transition-all">
                            <ChevronUp size={11} /> Escalar
                        </button>
                    )}
                    {(infraccion.latitud_infraccion || infraccion.latitud) && (
                        <button onClick={() => {
                            const lat = infraccion.latitud_infraccion || infraccion.latitud;
                            const lon = infraccion.longitud_infraccion || infraccion.longitud;
                            window.open(`https://maps.google.com/?q=${lat},${lon}`, '_blank');
                        }}
                            className="h-7 px-3 rounded-lg bg-green-500/15 text-green-400 border border-green-500/20 text-[9px] font-black uppercase flex items-center gap-1.5 hover:bg-green-500/25 transition-all">
                            <Map size={11} /> Ver en Mapa
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// ──── Página Principal ────────────────────────────────────────────────────────

const FILTROS_GRAVEDAD = ['todas', 'leve', 'moderada', 'grave', 'critica'];
const FILTROS_ESTADO = ['todas', 'activa', 'resuelta', 'apelada'];

export default function DashboardInfracciones() {
    const { user } = useAuthStore();
    const [infracciones, setInfracciones] = useState([]);
    const [listaNegra, setListaNegra] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [tab, setTab] = useState('activas');
    const [filtroGravedad, setFiltroGravedad] = useState('todas');
    const [filtroBusqueda, setFiltroBusqueda] = useState('');

    // Modal resolve
    const [modalResolver, setModalResolver] = useState(false);
    const [infSeleccionada, setInfSeleccionada] = useState(null);
    const [accionResolver, setAccionResolver] = useState('resolver');
    const [notasResolucion, setNotasResolucion] = useState('');
    const [resolviendo, setResolviendo] = useState(false);

    const cargarDatos = useCallback(async () => {
        setCargando(true);
        try {
            const [infData, lnData] = await Promise.allSettled([
                api.get('/infracciones/').then(r => r.data),
                api.get('/infracciones/lista-negra').then(r => r.data),
            ]);
            if (infData.status === 'fulfilled') setInfracciones(infData.value);
            if (lnData.status === 'fulfilled') setListaNegra(lnData.value);
        } catch (_) {
            // Demo
            setInfracciones([
                { id: 'i1', tipo: 'mal_estacionado', gravedad: 'leve', estado: 'activa', vehiculo_placa: 'ABC-123', zona_nombre: 'Zona VIP', created_at: new Date().toISOString(), descripcion: 'Vehículo ocupando dos puestos' },
                { id: 'i2', tipo: 'colision', gravedad: 'grave', estado: 'activa', vehiculo_placa: 'XYZ-789', zona_nombre: 'Parqueo Logístico', latitud: '10.1234', longitud: '-66.987', bloquea_acceso_futuro: true, created_at: new Date(Date.now() - 3600000).toISOString(), descripcion: 'Colisión con poste de señalización' },
                { id: 'i3', tipo: 'exceso_velocidad', gravedad: 'moderada', estado: 'resuelta', vehiculo_placa: 'LMN-456', zona_nombre: 'Entrada Principal', created_at: new Date(Date.now() - 7200000).toISOString() },
                { id: 'i4', tipo: 'acceso_no_autorizado', gravedad: 'critica', estado: 'activa', vehiculo_placa: 'RST-111', bloquea_acceso_futuro: true, created_at: new Date(Date.now() - 900000).toISOString(), descripcion: 'Intento de acceso con QR falsificado' },
                { id: 'i5', tipo: 'zona_prohibida', gravedad: 'moderada', estado: 'en_revision', vehiculo_placa: 'QRS-321', zona_nombre: 'Zona Staff', latitud_infraccion: '10.1235', longitud_infraccion: '-66.9871', created_at: new Date(Date.now() - 1800000).toISOString() },
            ]);
            setListaNegra([
                { id: 'ln1', nombre: 'CARLOS DÍAZ', cedula: 'V-14567890', placa: 'RST-111', motivo: 'Acceso no autorizado reiterado', bloqueado_at: new Date().toISOString() },
            ]);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargarDatos();
        const iv = setInterval(cargarDatos, 30000);
        return () => clearInterval(iv);
    }, [cargarDatos]);

    const handleAbrirResolver = (inf, accion) => {
        setInfSeleccionada(inf);
        setAccionResolver(accion);
        setNotasResolucion('');
        setModalResolver(true);
    };

    const handleEscalar = async (inf) => {
        try {
            await api.put(`/infracciones/${inf.id}/escalar`, { notas: 'Escalado desde dashboard de comando' });
            toast.success('Infracción escalada');
            cargarDatos();
        } catch (e) {
            toast.error('Error al escalar');
        }
    };

    const handleResolver = async () => {
        setResolviendo(true);
        try {
            await api.put(`/infracciones/${infSeleccionada.id}/resolver`, {
                accion: accionResolver,
                notas_resolucion: notasResolucion,
            });
            toast.success(accionResolver === 'resolver' ? 'Infracción resuelta' : 'Infracción perdonada');
            setModalResolver(false);
            cargarDatos();
        } catch (e) {
            toast.error(e.response?.data?.detail || 'No tienes permiso para esta acción');
        } finally {
            setResolviendo(false);
        }
    };

    const handleRetirarListaNegra = async (persona) => {
        if (!window.confirm(`¿Retirar a ${persona.nombre} de la lista negra?`)) return;
        if (user?.rol !== 'COMANDANTE') { toast.error('Solo el Comandante puede retirar de lista negra'); return; }
        try {
            await api.delete(`/infracciones/lista-negra/${persona.id}`);
            toast.success('Retirado de lista negra');
            cargarDatos();
        } catch (e) {
            toast.error('Error');
        }
    };

    // Filtrado
    const infFiltradas = infracciones.filter(i => {
        const enTab = tab === 'activas' ? i.estado === 'activa' || i.estado === 'en_revision' || i.estado === 'apelada' : i.estado === 'resuelta' || i.estado === 'perdonada';
        const enGravedad = filtroGravedad === 'todas' || i.gravedad === filtroGravedad;
        const enBusqueda = !filtroBusqueda || i.vehiculo_placa?.includes(filtroBusqueda.toUpperCase()) || i.tipo?.includes(filtroBusqueda.toLowerCase());
        return enTab && enGravedad && enBusqueda;
    });

    // Stats
    const stats = {
        activas: infracciones.filter(i => i.estado === 'activa').length,
        criticas: infracciones.filter(i => i.gravedad === 'critica' && i.estado === 'activa').length,
        bloqueados: infracciones.filter(i => i.bloquea_acceso_futuro && i.estado === 'activa').length,
        listaNegra: listaNegra.length,
    };

    return (
        <div className="p-4 md:p-6 pb-24 max-w-4xl mx-auto animate-in fade-in duration-500 space-y-5">

            {/* Header */}
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-danger/10 rounded-xl flex items-center justify-center border border-danger/20">
                        <AlertTriangle className="text-danger" size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-text-main uppercase tracking-tight">Infracciones</h1>
                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Centro de Comando — Registro de Sanciones</p>
                    </div>
                </div>
                <button onClick={cargarDatos} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                    <RefreshCw size={16} className={cn("text-text-muted", cargando && 'animate-spin')} />
                </button>
            </header>

            {/* KPIs */}
            <div className="grid grid-cols-4 gap-2">
                <KpiInfraccion label="Activas" valor={stats.activas} color="text-danger" icon={AlertTriangle} />
                <KpiInfraccion label="Críticas" valor={stats.criticas} color="text-gray-300" icon={Flame} />
                <KpiInfraccion label="Bloqueados" valor={stats.bloqueados} color="text-orange-400" icon={Ban} />
                <KpiInfraccion label="Lista Negra" valor={stats.listaNegra} color="text-red-400" icon={Shield} />
            </div>

            {/* Tabs */}
            <div className="flex bg-bg-card/40 rounded-xl p-1 border border-white/5 gap-1">
                {[
                    { id: 'activas', label: 'Activas', badge: stats.activas },
                    { id: 'historial', label: 'Historial', badge: null },
                    { id: 'lista_negra', label: 'Lista Negra', badge: stats.listaNegra },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                            tab === t.id ? 'bg-danger text-white shadow-md' : 'text-text-muted hover:text-text-main hover:bg-white/5'
                        )}>
                        {t.label}
                        {t.badge > 0 && (
                            <span className={cn("text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[16px] text-center",
                                tab === t.id ? 'bg-white/20' : 'bg-danger text-white')}>
                                {t.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Filtros */}
            {tab !== 'lista_negra' && (
                <div className="flex gap-2 flex-wrap">
                    <div className="flex-1 min-w-[150px]">
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 h-9">
                            <Search size={13} className="text-text-muted/60" />
                            <input
                                value={filtroBusqueda}
                                onChange={e => setFiltroBusqueda(e.target.value)}
                                placeholder="Buscar placa o tipo..."
                                className="flex-1 bg-transparent text-xs font-bold text-text-main outline-none placeholder:text-white/20 uppercase"
                            />
                        </div>
                    </div>
                    <div className="flex gap-1 overflow-x-auto no-scrollbar">
                        {FILTROS_GRAVEDAD.map(g => (
                            <button key={g} onClick={() => setFiltroGravedad(g)}
                                className={cn(
                                    "h-9 px-3 rounded-xl text-[9px] font-black uppercase whitespace-nowrap transition-all",
                                    filtroGravedad === g
                                        ? g === 'todas' ? 'bg-primary/20 text-primary border border-primary/30' : `${GRAVEDAD_CONFIG[g]?.bg} ${GRAVEDAD_CONFIG[g]?.color} border ${GRAVEDAD_CONFIG[g]?.border}`
                                        : 'bg-white/5 border border-white/10 text-text-muted hover:border-white/20'
                                )}>
                                {g === 'todas' ? 'Todas' : GRAVEDAD_CONFIG[g]?.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Contenido por Tab ── */}

            {/* ACTIVAS / HISTORIAL */}
            {tab !== 'lista_negra' && (
                <div className="space-y-3">
                    {cargando ? (
                        Array(3).fill(0).map((_, i) => <div key={i} className="h-28 rounded-xl bg-white/5 animate-pulse border border-white/5" />)
                    ) : infFiltradas.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                            <CheckCircle2 size={36} className="mx-auto text-success/40 mb-3" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted/40">
                                {tab === 'activas' ? 'Sin infracciones activas' : 'Sin historial'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {infFiltradas.map(inf => (
                                <InfraccionCard
                                    key={inf.id}
                                    infraccion={inf}
                                    userRol={user?.rol}
                                    onResolver={handleAbrirResolver}
                                    onEscalar={handleEscalar}
                                    onDetalle={() => {}}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* LISTA NEGRA */}
            {tab === 'lista_negra' && (
                <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-danger/5 border border-danger/20 rounded-xl">
                        <Ban size={15} className="text-danger shrink-0 mt-0.5" />
                        <p className="text-[9px] text-text-muted">
                            Personas en lista negra son <strong className="text-danger">rechazadas automáticamente</strong> al intentar acceder. Solo el <strong className="text-text-main">Comandante</strong> puede retirarlas.
                        </p>
                    </div>
                    {listaNegra.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                            <Shield size={36} className="mx-auto text-success/40 mb-3" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted/40">Lista negra vacía</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {listaNegra.map(persona => (
                                <div key={persona.id} className="flex items-center gap-3 p-4 bg-danger/5 border border-danger/15 rounded-xl">
                                    <div className="w-9 h-9 bg-danger/15 rounded-xl flex items-center justify-center">
                                        <Ban size={18} className="text-danger" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-text-main uppercase">{persona.nombre}</p>
                                        <p className="text-[9px] text-text-muted">{persona.cedula} · {persona.placa}</p>
                                        <p className="text-[8px] text-danger/70 mt-0.5">{persona.motivo}</p>
                                    </div>
                                    {user?.rol === 'COMANDANTE' && (
                                        <button onClick={() => handleRetirarListaNegra(persona)}
                                            className="shrink-0 h-8 px-3 rounded-lg bg-success/15 text-success border border-success/25 text-[9px] font-black uppercase flex items-center gap-1.5 hover:bg-success/25 transition-all">
                                            <XCircle size={11} /> Retirar
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── MODAL: Resolver / Perdonar ── */}
            <Modal isOpen={modalResolver} onClose={() => setModalResolver(false)}
                title={accionResolver === 'resolver' ? 'RESOLVER INFRACCIÓN' : 'PERDONAR INFRACCIÓN'}>
                {infSeleccionada && (
                    <div className="space-y-4">
                        <div className={cn("p-3 rounded-xl border", GRAVEDAD_CONFIG[infSeleccionada.gravedad]?.bg, GRAVEDAD_CONFIG[infSeleccionada.gravedad]?.border)}>
                            <p className={cn("text-[9px] font-black uppercase tracking-widest", GRAVEDAD_CONFIG[infSeleccionada.gravedad]?.color)}>
                                {GRAVEDAD_CONFIG[infSeleccionada.gravedad]?.label}
                            </p>
                            <p className="text-sm font-black text-text-main uppercase mt-1">{infSeleccionada.tipo?.replace(/_/g, ' ')}</p>
                            {infSeleccionada.vehiculo_placa && <p className="text-[9px] text-text-muted mt-0.5">🚗 {infSeleccionada.vehiculo_placa}</p>}
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-text-muted uppercase tracking-widest block mb-1.5">
                                Notas de Resolución
                            </label>
                            <textarea value={notasResolucion} onChange={e => setNotasResolucion(e.target.value)}
                                rows={3} placeholder="Observaciones de la resolución..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-text-main focus:border-primary/50 outline-none resize-none placeholder:text-white/20" />
                        </div>
                        <div className="flex gap-3 pt-2 border-t border-white/5">
                            <Boton variant="ghost" className="flex-1" onClick={() => setModalResolver(false)}>Cancelar</Boton>
                            <Boton onClick={handleResolver} disabled={resolviendo}
                                className={cn("flex-[2] h-12 font-black uppercase tracking-wider",
                                    accionResolver === 'resolver' ? 'bg-success text-bg-app' : 'bg-sky-600 text-white')}>
                                {resolviendo ? <RefreshCw size={16} className="animate-spin" /> :
                                    accionResolver === 'resolver' ? <><CheckCircle2 size={15} /> Confirmar Resolución</> : <><Scale size={15} /> Confirmar Perdón</>
                                }
                            </Boton>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
