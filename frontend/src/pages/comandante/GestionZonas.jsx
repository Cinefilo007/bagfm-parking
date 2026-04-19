import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Boton } from '../../components/ui/Boton';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/auth.store';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import {
    ParkingSquare, Plus, Trash2, RefreshCw, Edit3,
    MapPin, Clock, Users, Shield, ChevronRight,
    ChevronDown, Settings, LayoutGrid, Building2,
    AlertTriangle, CheckCircle2, Timer, Hash,
    Lock, Unlock, Zap
} from 'lucide-react';
import zonaService from '../../services/zona.service';
import api from '../../services/api';

// ──── Sub-componentes ─────────────────────────────────────────────────────────

const StatBadge = ({ valor, label, color = 'text-text-muted' }) => (
    <div className="text-center">
        <div className={cn("text-xl font-black tracking-tighter", color)}>{valor}</div>
        <div className="text-[7px] font-black uppercase tracking-widest text-text-muted/50">{label}</div>
    </div>
);

const PuestoChip = ({ puesto, onEliminar, onEditar }) => {
    const colorMap = {
        libre: 'bg-success/15 border-success/30 text-success',
        ocupado: 'bg-danger/15 border-danger/20 text-danger',
        reservado: 'bg-warning/15 border-warning/20 text-warning',
        mantenimiento: 'bg-text-muted/10 border-text-muted/20 text-text-muted/60',
    };
    return (
        <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-black uppercase",
            colorMap[puesto.estado] || colorMap.libre
        )}>
            <span>{puesto.codigo}</span>
            <button onClick={() => onEliminar(puesto)} className="hover:text-danger/80 transition-all ml-0.5 opacity-50 hover:opacity-100">
                <Trash2 size={9} />
            </button>
        </div>
    );
};

const ZonaRow = ({ zona, entidades, asignaciones, onEditar, onEliminar, onGestionarPuestos, onAjustarTiempo, onAsignar }) => {
    const [expandida, setExpandida] = useState(false);
    const puestos = zona.puestos || [];
    const asignacionesZona = asignaciones.filter(a => a.zona_id === zona.id);
    const totalAsignado = asignacionesZona.reduce((acc, a) => acc + (a.cupo_asignado || 0), 0);
    const reservadoBase = asignacionesZona.reduce((acc, a) => acc + (a.cupo_reservado_base || 0), 0);

    const puestosLibres = puestos.filter(p => p.estado === 'libre').length;
    const puestosOcupados = puestos.filter(p => p.estado === 'ocupado').length;

    return (
        <div className="bg-bg-card/40 border border-white/5 rounded-2xl overflow-hidden transition-all">
            {/* Cabecera de la zona */}
            <div className="flex items-center gap-3 p-4">
                <button
                    onClick={() => setExpandida(!expandida)}
                    className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all shrink-0"
                >
                    <ChevronDown size={16} className={cn("text-text-muted transition-transform", expandida && "rotate-180")} />
                </button>
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shrink-0">
                    <ParkingSquare size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-text-main uppercase tracking-tight truncate">{zona.nombre}</h3>
                        {zona.es_perimetral && (
                            <span className="text-[7px] font-black bg-sky-500/15 text-sky-400 px-1.5 py-0.5 rounded-full border border-sky-500/20 uppercase">
                                Perim.
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[9px] text-text-muted flex items-center gap-1">
                            <Hash size={9} /> Cap: {zona.capacidad || '∞'}
                        </span>
                        {zona.tiempo_limite_llegada_min && (
                            <span className="text-[9px] text-text-muted flex items-center gap-1">
                                <Clock size={9} /> {zona.tiempo_limite_llegada_min} min
                            </span>
                        )}
                        {zona.latitud && (
                            <span className="text-[9px] text-text-muted flex items-center gap-1">
                                <MapPin size={9} /> GPS
                            </span>
                        )}
                    </div>
                </div>

                {/* Mini stats */}
                <div className="hidden sm:flex items-center gap-4 px-4 border-l border-white/5">
                    <StatBadge valor={puestosLibres} label="Libres" color="text-success" />
                    <StatBadge valor={puestosOcupados} label="Ocup." color="text-danger" />
                    <StatBadge valor={asignacionesZona.length} label="Entids." color="text-primary" />
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => onAsignar(zona)} title="Asignar cuota a entidad"
                        className="p-2 rounded-lg hover:bg-primary/10 text-text-muted hover:text-primary transition-all">
                        <Building2 size={15} />
                    </button>
                    <button onClick={() => onAjustarTiempo(zona)} title="Ajustar tiempo límite"
                        className="p-2 rounded-lg hover:bg-warning/10 text-text-muted hover:text-warning transition-all">
                        <Timer size={15} />
                    </button>
                    <button onClick={() => onGestionarPuestos(zona)} title="Gestionar puestos"
                        className="p-2 rounded-lg hover:bg-sky-500/10 text-text-muted hover:text-sky-400 transition-all">
                        <LayoutGrid size={15} />
                    </button>
                    <button onClick={() => onEditar(zona)} title="Editar zona"
                        className="p-2 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-main transition-all">
                        <Edit3 size={15} />
                    </button>
                    <button onClick={() => onEliminar(zona)} title="Eliminar zona"
                        className="p-2 rounded-lg hover:bg-danger/10 text-text-muted/40 hover:text-danger transition-all">
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            {/* Detalle expandido */}
            {expandida && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Asignaciones por entidad */}
                    {asignacionesZona.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-[8px] font-black uppercase tracking-widest text-text-muted/50 flex items-center gap-1.5">
                                <Building2 size={9} /> Cuotas por entidad
                            </p>
                            {asignacionesZona.map(asig => {
                                const entidad = entidades.find(e => e.id === asig.entidad_id);
                                return (
                                    <div key={asig.id} className="flex items-center gap-3 p-2.5 bg-white/3 rounded-xl border border-white/5">
                                        <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <Building2 size={12} className="text-primary" />
                                        </div>
                                        <span className="text-[10px] font-black text-text-main uppercase flex-1 truncate">
                                            {entidad?.nombre || asig.entidad_id}
                                        </span>
                                        <span className="text-[9px] font-bold text-success">{asig.cupo_asignado} cupos</span>
                                        {asig.cupo_reservado_base > 0 && (
                                            <span className="text-[9px] font-bold text-warning">+{asig.cupo_reservado_base} base</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-[9px] text-text-muted/40 italic">Sin cuotas asignadas a entidades</p>
                    )}

                    {/* Puestos */}
                    {puestos.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[8px] font-black uppercase tracking-widest text-text-muted/50 flex items-center gap-1.5">
                                <ParkingSquare size={9} /> Puestos ({puestos.length})
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {puestos.map(p => (
                                    <PuestoChip
                                        key={p.id}
                                        puesto={p}
                                        onEliminar={() => { }}
                                        onEditar={() => { }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {!asignacionesZona.length && !puestos.length && (
                        <p className="text-center text-[9px] text-text-muted/30 uppercase tracking-widest py-2">
                            Zona sin configuración adicional
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

// ──── Página Principal ────────────────────────────────────────────────────────

const FORM_ZONA_INICIAL = {
    nombre: '', descripcion: '', capacidad: '',
    latitud: '', longitud: '', tiempo_limite_llegada_min: 15,
};

export default function GestionZonas() {
    const { user } = useAuthStore();
    const [zonas, setZonas] = useState([]);
    const [entidades, setEntidades] = useState([]);
    const [asignaciones, setAsignaciones] = useState([]);
    const [cargando, setCargando] = useState(true);

    // Modales
    const [modalZona, setModalZona] = useState(false);
    const [modalPuestos, setModalPuestos] = useState(false);
    const [modalAsignar, setModalAsignar] = useState(false);
    const [modalTiempo, setModalTiempo] = useState(false);
    const [zonaActiva, setZonaActiva] = useState(null);

    // Forms
    const [formZona, setFormZona] = useState(FORM_ZONA_INICIAL);
    const [editandoZona, setEditandoZona] = useState(null);
    const [guardando, setGuardando] = useState(false);

    // Puestos
    const [puestosZona, setPuestosZona] = useState([]);
    const [nuevoCodigo, setNuevoCodigo] = useState('');
    const [nuevaLatPuesto, setNuevaLatPuesto] = useState('');
    const [nuevaLonPuesto, setNuevaLonPuesto] = useState('');
    const [creandoPuesto, setCreandoPuesto] = useState(false);

    // Asignación cuota
    const [formAsig, setFormAsig] = useState({ entidad_id: '', cupo_asignado: 1, cupo_reservado_base: 0, notas: '' });
    const [asignando, setAsignando] = useState(false);

    // Tiempo límite
    const [nuevoTiempo, setNuevoTiempo] = useState(15);
    const [ajustando, setAjustando] = useState(false);

    const cargarDatos = useCallback(async () => {
        setCargando(true);
        try {
            const [zonasData, entidadesData, asigData] = await Promise.all([
                zonaService.listarZonas(),
                api.get('/entidades').then(r => r.data).catch(() => []),
                zonaService.listarAsignaciones().catch(() => []),
            ]);
            setZonas(zonasData);
            setEntidades(entidadesData);
            setAsignaciones(asigData);
        } catch (e) {
            // Demo fallback
            setZonas([
                {
                    id: 'z1', nombre: 'Zona VIP Norte', capacidad: 20, tiempo_limite_llegada_min: 15, es_perimetral: false, latitud: '10.1234', longitud: '-66.9876', puestos: [
                        { id: 'p1', codigo: 'A-01', estado: 'libre' },
                        { id: 'p2', codigo: 'A-02', estado: 'ocupado' },
                        { id: 'p3', codigo: 'A-03', estado: 'libre' },
                    ]
                },
                { id: 'z2', nombre: 'Parqueo Logístico', capacidad: 50, tiempo_limite_llegada_min: 25, es_perimetral: true, puestos: [] },
                { id: 'z3', nombre: 'Zona Staff', capacidad: 30, tiempo_limite_llegada_min: 15, es_perimetral: false, puestos: [] },
            ]);
            setEntidades([
                { id: 'e1', nombre: 'CÍRCULO MILITAR VEN' },
                { id: 'e2', nombre: 'ASOCIACIÓN AMIGOS BASE' },
            ]);
            setAsignaciones([
                { id: 'a1', zona_id: 'z1', entidad_id: 'e1', cupo_asignado: 10, cupo_reservado_base: 2 },
                { id: 'a2', zona_id: 'z2', entidad_id: 'e2', cupo_asignado: 20, cupo_reservado_base: 0 },
            ]);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { cargarDatos(); }, [cargarDatos]);

    // ── CRUD Zona ────────────────────────────────────────────────────────────

    const abrirModalZona = (zona = null) => {
        setEditandoZona(zona);
        setFormZona(zona ? {
            nombre: zona.nombre, descripcion: zona.descripcion || '',
            capacidad: zona.capacidad || '', es_perimetral: zona.es_perimetral,
            latitud: zona.latitud || '', longitud: zona.longitud || '',
            tiempo_limite_llegada_min: zona.tiempo_limite_llegada_min || 15,
        } : FORM_ZONA_INICIAL);
        setModalZona(true);
    };

    const handleGuardarZona = async () => {
        if (!formZona.nombre.trim()) { toast.error('Nombre requerido'); return; }
        setGuardando(true);
        try {
            const datos = {
                ...formZona,
                capacidad: formZona.capacidad ? parseInt(formZona.capacidad) : null,
                latitud: formZona.latitud || null,
                longitud: formZona.longitud || null,
                tiempo_limite_llegada_min: parseInt(formZona.tiempo_limite_llegada_min),
            };
            if (editandoZona) {
                await zonaService.actualizarZona(editandoZona.id, datos);
                toast.success('Zona actualizada');
            } else {
                await zonaService.crearZona(datos);
                toast.success('Zona creada');
            }
            setModalZona(false);
            cargarDatos();
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Error al guardar zona');
        } finally {
            setGuardando(false);
        }
    };

    const handleEliminarZona = async (zona) => {
        if (!window.confirm(`¿Eliminar la zona "${zona.nombre}"? Esta acción no se puede deshacer.`)) return;
        try {
            await zonaService.eliminarZona(zona.id);
            toast.success('Zona eliminada');
            cargarDatos();
        } catch (e) {
            toast.error('Error al eliminar zona');
        }
    };

    // ── Gestión de Puestos ───────────────────────────────────────────────────

    const abrirModalPuestos = async (zona) => {
        setZonaActiva(zona);
        setNuevoCodigo('');
        try {
            const puestos = await zonaService.getPuestosZona(zona.id);
            setPuestosZona(puestos);
        } catch (e) {
            setPuestosZona(zona.puestos || []);
        }
        setModalPuestos(true);
    };

    const handleCrearPuesto = async () => {
        if (!nuevoCodigo.trim()) { toast.error('Código requerido'); return; }
        setCreandoPuesto(true);
        try {
            const nuevo = await zonaService.crearPuesto(zonaActiva.id, {
                codigo: nuevoCodigo.toUpperCase(),
                latitud: nuevaLatPuesto || null,
                longitud: nuevaLonPuesto || null,
            });
            setPuestosZona(prev => [...prev, nuevo]);
            setNuevoCodigo('');
            setNuevaLatPuesto('');
            setNuevaLonPuesto('');
            toast.success(`Puesto ${nuevo.codigo} creado`);
        } catch (e) {
            toast.error('Error al crear puesto');
        } finally {
            setCreandoPuesto(false);
        }
    };

    const handleEliminarPuesto = async (puesto) => {
        try {
            await zonaService.eliminarPuesto(puesto.id);
            setPuestosZona(prev => prev.filter(p => p.id !== puesto.id));
            toast.success('Puesto eliminado');
        } catch (e) {
            toast.error('Error al eliminar puesto');
        }
    };

    // ── Asignación de Cuota ──────────────────────────────────────────────────

    const abrirModalAsignar = (zona) => {
        setZonaActiva(zona);
        setFormAsig({ entidad_id: '', cupo_asignado: 1, cupo_reservado_base: 0, notas: '' });
        setModalAsignar(true);
    };

    const handleAsignarCuota = async () => {
        if (!formAsig.entidad_id) { toast.error('Selecciona una entidad'); return; }
        setAsignando(true);
        try {
            await zonaService.crearAsignacion({ ...formAsig, zona_id: zonaActiva.id });
            toast.success('Cuota asignada');
            setModalAsignar(false);
            cargarDatos();
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Error al asignar cuota');
        } finally {
            setAsignando(false);
        }
    };

    // ── Tiempo Límite ────────────────────────────────────────────────────────

    const abrirModalTiempo = (zona) => {
        setZonaActiva(zona);
        setNuevoTiempo(zona.tiempo_limite_llegada_min || 15);
        setModalTiempo(true);
    };

    const handleAjustarTiempo = async () => {
        setAjustando(true);
        try {
            await zonaService.ajustarTiempoLimite(zonaActiva.id, nuevoTiempo);
            toast.success(`Tiempo límite actualizado a ${nuevoTiempo} min`);
            setModalTiempo(false);
            cargarDatos();
        } catch (e) {
            toast.error('Error al ajustar tiempo');
        } finally {
            setAjustando(false);
        }
    };

    // ── Stats globales ───────────────────────────────────────────────────────
    const totalCapacidad = zonas.reduce((acc, z) => acc + (z.capacidad || 0), 0);
    const totalPuestos = zonas.reduce((acc, z) => acc + (z.puestos?.length || 0), 0);

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="p-4 md:p-6 space-y-5 pb-24 max-w-5xl mx-auto animate-in fade-in duration-500">

            {/* Header */}
            <header className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                        <ParkingSquare className="text-primary" size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-text-main uppercase tracking-tight">Gestión de Zonas</h1>
                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Centro de Comando — Distribución de Estacionamientos</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={cargarDatos} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                        <RefreshCw size={16} className={cn("text-text-muted", cargando && 'animate-spin')} />
                    </button>
                    <Boton onClick={() => abrirModalZona()} className="h-10 px-4 gap-1.5 text-[10px] font-black uppercase bg-primary text-bg-app rounded-xl">
                        <Plus size={14} /> Nueva Zona
                    </Boton>
                </div>
            </header>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Zonas Activas', valor: zonas.length, color: 'text-primary', icon: ParkingSquare },
                    { label: 'Cap. Total', valor: totalCapacidad || '—', color: 'text-success', icon: Hash },
                    { label: 'Puestos Creados', valor: totalPuestos, color: 'text-sky-400', icon: LayoutGrid },
                ].map(s => (
                    <Card key={s.label} className="p-4 rounded-2xl border-white/5 flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                            <s.icon size={18} className={s.color} />
                        </div>
                        <div>
                            <div className={cn("text-lg font-black tracking-tight", s.color)}>{s.valor}</div>
                            <div className="text-[8px] font-black uppercase tracking-widest text-text-muted/50">{s.label}</div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Instrucciones */}
            <div className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/15 rounded-xl">
                <Shield size={16} className="text-primary shrink-0 mt-0.5" />
                <p className="text-[9px] text-text-muted leading-relaxed">
                    Crea zonas de estacionamiento y asigna cuotas de puestos a las entidades alojadas. Puedes configurar el tiempo límite de llegada por zona, agregar puestos identificados con código y coordenadas GPS, y reservar puestos para el personal de la base.
                </p>
            </div>

            {/* Lista de zonas */}
            {cargando ? (
                <div className="space-y-3">
                    {Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
                    ))}
                </div>
            ) : zonas.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
                    <ParkingSquare size={48} className="mx-auto text-white/10 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-muted/40">No hay zonas registradas</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {zonas.map(zona => (
                        <ZonaRow
                            key={zona.id}
                            zona={zona}
                            entidades={entidades}
                            asignaciones={asignaciones}
                            onEditar={abrirModalZona}
                            onEliminar={handleEliminarZona}
                            onGestionarPuestos={abrirModalPuestos}
                            onAjustarTiempo={abrirModalTiempo}
                            onAsignar={abrirModalAsignar}
                        />
                    ))}
                </div>
            )}

            {/* ── MODAL: Crear/Editar Zona ── */}
            <Modal isOpen={modalZona} onClose={() => setModalZona(false)} title={editandoZona ? 'EDITAR ZONA' : 'NUEVA ZONA'}>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Input label="Nombre de la Zona *" value={formZona.nombre}
                                onChange={e => setFormZona({ ...formZona, nombre: e.target.value.toUpperCase() })}
                                placeholder="ZONA VIP NORTE, PARQUEO LOGÍSTICO..." />
                        </div>
                        <Input label="Capacidad (vehículos)" type="number" value={formZona.capacidad}
                            onChange={e => setFormZona({ ...formZona, capacidad: e.target.value })}
                            placeholder="Ej: 50" />
                        <Input label="Tiempo límite llegada (min)" type="number" value={formZona.tiempo_limite_llegada_min}
                            onChange={e => setFormZona({ ...formZona, tiempo_limite_llegada_min: e.target.value })}
                            placeholder="15" />
                        <Input label="Latitud (entrada/referencia)" value={formZona.latitud}
                            onChange={e => setFormZona({ ...formZona, latitud: e.target.value })}
                            placeholder="10.123456" />
                        <Input label="Longitud (entrada/referencia)" value={formZona.longitud}
                            onChange={e => setFormZona({ ...formZona, longitud: e.target.value })}
                            placeholder="-66.987654" />
                        <div className="col-span-2">
                            <Input label="Descripción (opcional)" value={formZona.descripcion}
                                onChange={e => setFormZona({ ...formZona, descripcion: e.target.value })}
                                placeholder="Descripción breve de la zona..." />
                        </div>
                    </div>
                    <div className="col-span-2">
                        <Boton onClick={() => {
                            if ("geolocation" in navigator) {
                                toast.loading("Obteniendo ubicación GPS...");
                                navigator.geolocation.getCurrentPosition((pos) => {
                                    setFormZona(f => ({ ...f, latitud: pos.coords.latitude.toFixed(6), longitud: pos.coords.longitude.toFixed(6) }));
                                    toast.dismiss();
                                    toast.success("Ubicación capturada");
                                }, (err) => {
                                    toast.dismiss();
                                    toast.error("Error al obtener GPS: Permiso denegado");
                                });
                            } else {
                                toast.error("GPS no disponible en este navegador");
                            }
                        }} className="w-full h-11 bg-warning/10 text-warning border border-warning/20 text-[10px] gap-2 font-black uppercase">
                            <MapPin size={14} /> Usar mi ubicación actual (GPS Móvil)
                        </Boton>
                    </div>
                    <div className="flex gap-3 pt-2 border-t border-white/5">
                        <Boton variant="ghost" className="flex-1" onClick={() => setModalZona(false)}>Cancelar</Boton>
                        <Boton onClick={handleGuardarZona} disabled={guardando}
                            className="flex-[2] bg-primary text-bg-app h-12 font-black uppercase tracking-wider">
                            {guardando ? <RefreshCw size={16} className="animate-spin" /> : editandoZona ? 'Guardar Cambios' : 'Crear Zona'}
                        </Boton>
                    </div>
                </div>
            </Modal>

            {/* ── MODAL: Gestión de Puestos ── */}
            <Modal isOpen={modalPuestos} onClose={() => setModalPuestos(false)} title={`PUESTOS — ${zonaActiva?.nombre}`}>
                <div className="space-y-4">
                    <p className="text-[9px] text-text-muted uppercase tracking-widest">
                        Agrega puestos identificados con código y coordenadas opcionales.
                    </p>
                    {/* Formulario nuevo puesto */}
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-1">
                                <Input label="Código *" value={nuevoCodigo}
                                    onChange={e => setNuevoCodigo(e.target.value.toUpperCase())}
                                    placeholder="A-01" />
                            </div>
                            <div className="col-span-1">
                                <Input label="Latitud (opc.)" value={nuevaLatPuesto}
                                    onChange={e => setNuevaLatPuesto(e.target.value)}
                                    placeholder="10.1234" />
                            </div>
                            <div className="col-span-1">
                                <Input label="Longitud (opc.)" value={nuevaLonPuesto}
                                    onChange={e => setNuevaLonPuesto(e.target.value)}
                                    placeholder="-66.987" />
                            </div>
                        </div>
                        <Boton onClick={handleCrearPuesto} disabled={creandoPuesto || !nuevoCodigo.trim()}
                            className="w-full h-10 bg-primary/20 text-primary border border-primary/30 rounded-xl text-[10px] font-black uppercase gap-1.5">
                            {creandoPuesto ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                            Agregar Puesto
                        </Boton>
                    </div>
                    {/* Lista de puestos */}
                    {puestosZona.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {puestosZona.map(p => (
                                <PuestoChip key={p.id} puesto={p} onEliminar={handleEliminarPuesto} onEditar={() => { }} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-[9px] text-text-muted/30 uppercase tracking-widest py-4">
                            Sin puestos creados para esta zona
                        </p>
                    )}
                    <Boton variant="ghost" className="w-full" onClick={() => setModalPuestos(false)}>Cerrar</Boton>
                </div>
            </Modal>

            {/* ── MODAL: Asignar Cuota a Entidad ── */}
            <Modal isOpen={modalAsignar} onClose={() => setModalAsignar(false)} title={`ASIGNAR CUOTA — ${zonaActiva?.nombre}`}>
                <div className="space-y-4">
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                        <p className="text-[9px] text-text-muted">
                            Asigna una cantidad de puestos de esta zona a una entidad alojada. También puedes reservar puestos para uso exclusivo del personal de la base dentro de esa asignación.
                        </p>
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest block mb-2">Entidad *</label>
                        <select value={formAsig.entidad_id}
                            onChange={e => setFormAsig({ ...formAsig, entidad_id: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-text-main focus:border-primary/50 outline-none">
                            <option value="">— Seleccionar entidad —</option>
                            {entidades.map(e => (
                                <option key={e.id} value={e.id}>{e.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Cupo asignado" type="number" value={formAsig.cupo_asignado}
                            onChange={e => setFormAsig({ ...formAsig, cupo_asignado: parseInt(e.target.value) })}
                            placeholder="Ej: 15" />
                        <Input label="Reservado base" type="number" value={formAsig.cupo_reservado_base}
                            onChange={e => setFormAsig({ ...formAsig, cupo_reservado_base: parseInt(e.target.value) || 0 })}
                            placeholder="0" />
                    </div>
                    <Input label="Notas (opcional)" value={formAsig.notas}
                        onChange={e => setFormAsig({ ...formAsig, notas: e.target.value })}
                        placeholder="Observaciones..." />
                    <div className="flex gap-3 pt-2 border-t border-white/5">
                        <Boton variant="ghost" className="flex-1" onClick={() => setModalAsignar(false)}>Cancelar</Boton>
                        <Boton onClick={handleAsignarCuota} disabled={asignando || !formAsig.entidad_id}
                            className="flex-[2] bg-primary text-bg-app h-12 font-black uppercase">
                            {asignando ? <RefreshCw size={16} className="animate-spin" /> : <><Building2 size={15} /> Asignar Cuota</>}
                        </Boton>
                    </div>
                </div>
            </Modal>

            {/* ── MODAL: Ajustar Tiempo Límite ── */}
            <Modal isOpen={modalTiempo} onClose={() => setModalTiempo(false)} title={`TIEMPO LÍMITE — ${zonaActiva?.nombre}`}>
                <div className="space-y-5">
                    <div className="p-3 bg-warning/5 border border-warning/20 rounded-xl flex items-start gap-3">
                        <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
                        <p className="text-[9px] text-text-muted">
                            Ajusta temporalmente el tiempo máximo permitido para que un vehículo llegue a esta zona tras pasar por la alcabala. En eventos masivos con colas, aumenta este valor.
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-[8px] font-black text-text-muted/50 uppercase tracking-widest mb-3">Tiempo límite (minutos)</p>
                        <div className="flex items-center justify-center gap-4">
                            <button onClick={() => setNuevoTiempo(Math.max(5, nuevoTiempo - 5))}
                                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-text-main font-black text-lg hover:bg-white/10 transition-all">
                                −
                            </button>
                            <span className="text-5xl font-black text-text-main w-24 text-center">{nuevoTiempo}</span>
                            <button onClick={() => setNuevoTiempo(Math.min(120, nuevoTiempo + 5))}
                                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-text-main font-black text-lg hover:bg-white/10 transition-all">
                                +
                            </button>
                        </div>
                        <p className="text-[9px] text-text-muted/40 mt-3">Config. base: {zonaActiva?.tiempo_limite_llegada_min || 15} min</p>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {[10, 15, 20, 30, 45, 60, 90, 120].map(t => (
                            <button key={t} onClick={() => setNuevoTiempo(t)}
                                className={cn(
                                    "h-10 rounded-xl border-2 text-xs font-black transition-all",
                                    nuevoTiempo === t
                                        ? 'bg-warning/10 border-warning text-warning'
                                        : 'bg-white/5 border-white/10 text-text-muted hover:border-white/20'
                                )}>
                                {t}m
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-3 pt-2 border-t border-white/5">
                        <Boton variant="ghost" className="flex-1" onClick={() => setModalTiempo(false)}>Cancelar</Boton>
                        <Boton onClick={handleAjustarTiempo} disabled={ajustando}
                            className="flex-[2] bg-warning text-bg-app h-12 font-black uppercase">
                            {ajustando ? <RefreshCw size={16} className="animate-spin" /> : <><Timer size={15} /> Aplicar Tiempo</>}
                        </Boton>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
