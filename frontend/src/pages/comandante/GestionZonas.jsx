import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Boton } from '../../components/ui/Boton';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/auth.store';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import {
    ParkingSquare, Plus, Trash2, RefreshCw, Edit3, Edit2, X,
    MapPin, Clock, Users, Shield, ChevronRight,
    ChevronDown, Settings, LayoutGrid, Building2,
    AlertTriangle, CheckCircle2, Timer, Hash,
    Lock, Unlock, Zap, Activity, MessageCircle, UserCheck
} from 'lucide-react';
import SelectTactivo from '../../components/ui/SelectTactivo';
import zonaService from '../../services/zona.service';
import api from '../../services/api';
import { ModalConfirmacion } from '../../components/ui/ModalConfirmacion';
import { ModalPaseBase } from '../../components/comando/ModalPaseBase';


// ──── Sub-componentes ─────────────────────────────────────────────────────────

const StatBadge = ({ valor, label, color = 'text-text-muted', subLabel }) => (
    <div className="text-center group">
        <div className={cn("text-xl font-black tracking-tighter transition-transform group-hover:scale-110", color)}>{valor}</div>
        <div className="text-[7px] font-black uppercase tracking-widest text-text-muted/50">{label}</div>
        {subLabel && <div className="text-[6px] font-bold text-text-muted/30 uppercase">{subLabel}</div>}
    </div>
);

const PuestoCuadro = ({ puesto, onClick }) => {
    const config = puesto.reservado_base 
        ? { border: 'border-indigo-500/30', bg: 'bg-indigo-500/8', dot: 'bg-indigo-400', icon: 'text-indigo-400' }
        : { border: 'border-white/10', bg: 'bg-white/5', dot: 'bg-text-muted', icon: 'text-text-muted' };

    return (
        <button
            onClick={onClick}
            className={cn(
                'relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all active:scale-95 hover:brightness-110',
                config.border, config.bg
            )}
        >
            <div className={cn('w-2 h-2 rounded-full mb-1', config.dot, puesto.estado === 'ocupado' ? 'animate-pulse bg-danger' : config.dot)} />
            <ParkingSquare size={16} className={puesto.estado === 'ocupado' ? 'text-danger' : config.icon} />
            <span className="text-[7px] font-black uppercase tracking-tight mt-1 text-text-main leading-none">
                {puesto.numero_puesto || puesto.codigo || '—'}
            </span>
            <span className={cn(
                'text-[5px] font-black uppercase tracking-wide leading-none mt-0.5',
                puesto.reservado_base ? 'text-indigo-400' : 'text-text-muted'
            )}>
                {puesto.estado === 'ocupado' ? 'OCUPADO' : 'BASE'}
            </span>
            {puesto.reservado_base && <Lock size={7} className="absolute top-1 right-1 text-indigo-400/60" />}
        </button>
    );
};

const PuestoChip = ({ puesto, onEliminar, onEditar, onGPS }) => {
    const colorMap = {
        libre: 'bg-success/15 border-success/30 text-success',
        ocupado: 'bg-danger/15 border-danger/20 text-danger',
        reservado: 'bg-warning/15 border-warning/20 text-warning',
        reservado_base: 'bg-warning/30 border-warning/50 text-warning ring-1 ring-warning/30',
        mantenimiento: 'bg-text-muted/10 border-text-muted/20 text-text-muted/60',
    };
    return (
        <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-black uppercase transition-all hover:bg-white/5",
            colorMap[puesto.estado] || colorMap.libre
        )}>
            <span>{puesto.numero_puesto || puesto.codigo}</span>
            {puesto.latitud && <MapPin size={8} className="text-primary animate-pulse" />}
            <div className="flex items-center gap-1 ml-1 pl-1 border-l border-white/10">
                <button onClick={() => onGPS(puesto)} title="Capturar GPS para este puesto"
                    className="hover:text-primary transition-all opacity-50 hover:opacity-100">
                    <Zap size={9} />
                </button>
                <button onClick={() => onEliminar(puesto)} title="Eliminar puesto"
                    className="hover:text-danger transition-all opacity-50 hover:opacity-100">
                    <Trash2 size={9} />
                </button>
            </div>
        </div>
    );
};

const ZonaRow = ({ 
    zona, entidades, asignaciones, zonas, onEditar, onEliminar, 
    onGestionarPuestos, onAjustarTiempo, onAsignar, 
    onEliminarAsignacion, onEliminarPuesto, onCapturarGPSPuesto,
    onGenerarPaseBase
}) => {
    const [expandida, setExpandida] = useState(false);
    const puestos = zona.puestos || [];
    const asignacionesZona = asignaciones.filter(a => a.zona_id === zona.id);
    const totalAsignado = asignacionesZona.reduce((acc, a) => acc + (a.cupo_asignado || 0), 0);
    const reservadoBase = asignacionesZona.reduce((acc, a) => acc + (a.cupo_reservado_base || 0), 0);

    const puestosOcupados = zona.ocupacion_actual || 0;

    const puestosLibres = Math.max(0, zona.capacidad_total - totalAsignado - reservadoBase - puestosOcupados);

    const puestosReservados = reservadoBase; 

    // Puestos base (físicos y virtuales) - Ahora vienen del servidor para mostrar ocupación real
    const [puestosBaseServidor, setPuestosBaseServidor] = useState([]);
    
    useEffect(() => {
        const fetchPuestosBase = async () => {
            try {
                const res = await api.get(`/comando/puestos-reservados?zona_id=${zona.id}`);
                setPuestosBaseServidor(res.data);
            } catch (e) {
                console.error("Error al cargar puestos base", e);
            }
        };
        // Refrescar cada vez que la zona se expande o cambia el estado global de zonas
        if (expandida) fetchPuestosBase();
    }, [expandida, zona.id, asignaciones, zonas]);

    // Combinar puestos base del servidor con el cupo total reservado
    const puestosBaseCompletos = (() => {
        // 1. Empezamos con los pases reales que el servidor dice que están activos
        const listaFinal = [...puestosBaseServidor];
        
        // 2. Calculamos cuántas cajas libres faltan según el cupo reservado de la base
        // reservadoBase viene de la asignación configurada
        const faltantes = Math.max(0, reservadoBase - listaFinal.length);
        
        // 3. Agregamos las cajas libres necesarias
        for (let i = 0; i < faltantes; i++) {
            listaFinal.push({
                id: `v-empty-${zona.id}-${i}`,
                numero_puesto: `BASE-FREE`,
                estado: 'libre',
                reservado_base: true,
                virtual: true
            });
        }
        return listaFinal;
    })();

    return (
        <div className="bg-bg-card/40 border border-white/5 rounded-2xl overflow-hidden transition-all">
            {/* Cabecera de la zona (Responsiva) */}
            <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Bloque 1: Identificación y Nombre */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
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
                        <div className="flex items-center gap-3 mt-0.5 opacity-60">
                            <span className="text-[8px] text-text-muted flex items-center gap-1">
                                <Hash size={9} /> Cap: {zona.capacidad_total || '∞'}
                            </span>
                            {zona.tiempo_limite_llegada_min && (
                                <span className="text-[8px] text-text-muted flex items-center gap-1">
                                    <Clock size={9} /> {zona.tiempo_limite_llegada_min} min
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bloque 2: Indicadores (KPIs internos) y Botones de Acción */}
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 md:pl-4 sm:border-l border-white/5">
                    <div className="flex items-center gap-3 pr-2 sm:pr-0">
                        <StatBadge valor={puestosLibres} label="Lib." color="text-success" />
                        <StatBadge valor={puestosOcupados} label="Ocu." color="text-danger" />
                        <StatBadge valor={puestosReservados} label="Res." color="text-warning" />
                    </div>

                    <div className="flex items-center gap-0.5 bg-white/5 sm:bg-transparent p-1 sm:p-0 rounded-xl">
                        <button onClick={() => onAsignar(zona)} title="Asignar"
                            className="p-2 rounded-lg hover:bg-primary/10 text-text-muted hover:text-primary transition-all">
                            <Building2 size={14} />
                        </button>
                        <button onClick={() => onAjustarTiempo(zona)} title="Tiempo"
                            className="p-2 rounded-lg hover:bg-warning/10 text-text-muted hover:text-warning transition-all">
                            <Timer size={14} />
                        </button>
                        <button onClick={() => onGestionarPuestos(zona)} title="Puestos"
                            className="p-2 rounded-lg hover:bg-sky-500/10 text-text-muted hover:text-sky-400 transition-all">
                            <LayoutGrid size={14} />
                        </button>
                        <button onClick={() => onEditar(zona)} title="Editar"
                            className="p-2 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-main transition-all">
                            <Edit3 size={14} />
                        </button>
                        <button onClick={() => onEliminar(zona)} title="Eliminar"
                            className="p-2 rounded-lg hover:bg-danger/10 text-text-muted/40 hover:text-danger transition-all">
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Detalle expandido */}
            {expandida && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Asignaciones por entidad */}
                    {asignacionesZona.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-[8px] font-black uppercase tracking-widest text-text-muted/50 flex items-center gap-1.5">
                                <Building2 size={9} /> Puestos asignados por entidad
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
                                        <div className="flex items-center gap-1 border-l border-white/10 pl-2 ml-1">
                                            <button onClick={() => onAsignar(zona, asig)} title="Editar asignación"
                                                className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-main transition-all">
                                                <Edit2 size={12} />
                                            </button>
                                            <button onClick={() => onEliminarAsignacion(asig)} title="Eliminar asignación"
                                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted/40 hover:text-red-400 transition-all">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-[9px] text-text-muted/40 italic">Sin puestos asignados a entidades</p>
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
                                        onEliminar={onEliminarPuesto}
                                        onEditar={() => { }}
                                        onGPS={onCapturarGPSPuesto}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Puestos Reservados Base (Diseño Parquero) */}
                    {puestosReservados > 0 && (
                        <div className="space-y-2 p-3 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                            <p className="text-[8px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5 px-1">
                                <Shield size={9} /> Cupos Reservados del Comando (Click para Asignar)
                            </p>
                            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                                {puestosBaseCompletos.map(p => (
                                    <PuestoCuadro 
                                        key={p.id} 
                                        puesto={p} 
                                        onClick={() => {
                                            if (p.estado === 'ocupado') {
                                                onVerDetalle(p);
                                            } else {
                                                onGenerarPaseBase(zona);
                                            }
                                        }} 
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {!asignacionesZona.length && !puestos.length && !puestosReservados && (
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
    nombre: '', descripcion_ubicacion: '', capacidad_total: '',
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
    const [modalPaseBase, setModalPaseBase] = useState(false);
    const [modalDetallePuesto, setModalDetallePuesto] = useState(false);
    const [puestoDetalle, setPuestoDetalle] = useState(null);
    const [liberandoPuesto, setLiberandoPuesto] = useState(false);
    const [zonaActiva, setZonaActiva] = useState(null);
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null, loading: false });


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
    
    // Batch Puestos
    const [batchConfig, setBatchConfig] = useState({ prefijo: '', cantidad: 0 });
    const [creandoBatch, setCreandoBatch] = useState(false);

    // Asignación puestos
    const [formAsig, setFormAsig] = useState({ entidad_id: '', cupo_asignado: 1, cupo_reservado_base: 0, notas: '' });
    const [editandoAsig, setEditandoAsig] = useState(null);
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
                    id: 'z1', nombre: 'Zona VIP Norte', capacidad_total: 20, tiempo_limite_llegada_min: 15, es_perimetral: false, latitud: '10.1234', longitud: '-66.9876', puestos: [
                        { id: 'p1', codigo: 'A-01', estado: 'libre' },
                        { id: 'p2', codigo: 'A-02', estado: 'ocupado' },
                        { id: 'p3', codigo: 'A-03', estado: 'libre' },
                    ]
                },
                { id: 'z2', nombre: 'Parqueo Logístico', capacidad_total: 50, tiempo_limite_llegada_min: 25, es_perimetral: true, puestos: [] },
                { id: 'z3', nombre: 'Zona Staff', capacidad_total: 30, tiempo_limite_llegada_min: 15, es_perimetral: false, puestos: [] },
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
            nombre: zona.nombre, descripcion_ubicacion: zona.descripcion_ubicacion || '',
            capacidad_total: zona.capacidad_total || '', es_perimetral: zona.es_perimetral,
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
                capacidad_total: formZona.capacidad_total ? parseInt(formZona.capacidad_total) : 0,
                latitud: formZona.latitud ? parseFloat(formZona.latitud) : null,
                longitud: formZona.longitud ? parseFloat(formZona.longitud) : null,
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

    const handleEliminarZona = (zona) => {
        setConfirmConfig({
            isOpen: true,
            title: 'ELIMINAR ZONA TÁCTICA',
            message: `¿Está seguro de que desea eliminar la zona "${zona.nombre}"? Esta acción purgará todos los registros asociados de forma permanente.`,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, loading: true }));
                try {
                    await zonaService.eliminarZona(zona.id);
                    toast.success('Zona eliminada correctamente');
                    cargarDatos();
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                } catch (e) {
                    toast.error('Error crítico al eliminar la zona');
                } finally {
                    setConfirmConfig(prev => ({ ...prev, loading: false }));
                }
            }
        });
    };

    // ── Gestión de Puestos ───────────────────────────────────────────────────

    const abrirModalPuestos = async (zona) => {
        setZonaActiva(zona);
        try {
            const puestos = await zonaService.getPuestosZona(zona.id);
            setPuestosZona(puestos);
        } catch (e) {
            setPuestosZona(zona.puestos || []);
        }
        setModalPuestos(true);
    };

    const handleCrearBatch = async () => {
        if (!batchConfig.prefijo.trim() || !batchConfig.cantidad) { toast.error('Datos incompletos'); return; }
        
        const cantidad = parseInt(batchConfig.cantidad);
        const totalSimulado = puestosZona.length + cantidad;
        
        if (totalSimulado > zonaActiva.capacidad_total) {
            toast.error(`Error: Se excedería la capacidad total (${zonaActiva.capacidad_total}). Disponibles: ${zonaActiva.capacidad_total - puestosZona.length}`);
            return;
        }

        setCreandoBatch(true);
        try {
            await api.post(`/zonas/${zonaActiva.id}/puestos`, {
                prefijo: batchConfig.prefijo.toUpperCase(),
                cantidad: parseInt(batchConfig.cantidad)
            });
            const puestos = await zonaService.getPuestosZona(zonaActiva.id);
            setPuestosZona(puestos);
            setBatchConfig({ prefijo: '', cantidad: 0 });
            toast.success(`${batchConfig.cantidad} puestos generados`);
            cargarDatos();
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Error al generar lote');
        } finally {
            setCreandoBatch(false);
        }
    };

    const handleCapturarGPSPuesto = async (puesto) => {
        if (!("geolocation" in navigator)) return toast.error("GPS no disponible");
        
        const loadingToast = toast.loading(`Capturando GPS para ${puesto.numero_puesto}...`);
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const lat = pos.coords.latitude.toFixed(6);
                const lon = pos.coords.longitude.toFixed(6);
                await api.patch(`/zonas/puestos/${puesto.id}`, { latitud: lat, longitud: lon });
                
                setPuestosZona(prev => prev.map(p => p.id === puesto.id ? { ...p, latitud: lat, longitud: lon } : p));
                toast.dismiss(loadingToast);
                toast.success(`GPS de puesto ${puesto.numero_puesto} actualizado`);
            } catch (e) {
                toast.dismiss(loadingToast);
                toast.error("Error al guardar coordenadas");
            }
        }, (err) => {
            toast.dismiss(loadingToast);
            toast.error("Error GPS: Permiso denegado");
        });
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

    const abrirModalAsignar = (zona, asig = null) => {
        setZonaActiva(zona);
        if (asig) {
            setEditandoAsig(asig);
            setFormAsig({
                entidad_id: asig.entidad_id,
                cupo_asignado: asig.cupo_asignado,
                cupo_reservado_base: asig.cupo_reservado_base || 0,
                notas: asig.notas || ''
            });
        } else {
            setEditandoAsig(null);
            setFormAsig({ entidad_id: '', cupo_asignado: 1, cupo_reservado_base: 0, notas: '' });
        }
        setModalAsignar(true);
    };

    const handleAsignarPuestos = async () => {
        if (!formAsig.entidad_id) { toast.error('Selecciona una entidad'); return; }
        setAsignando(true);
        try {
            const payload = {
                ...formAsig,
                cupo_asignado: parseInt(formAsig.cupo_asignado) || 0,
                cupo_reservado_base: parseInt(formAsig.cupo_reservado_base) || 0
            };
            if (editandoAsig) {
                await zonaService.actualizarAsignacion(editandoAsig.id, payload);
                toast.success('Asignación actualizada correctamente');
            } else {
                await zonaService.crearAsignacion({ ...payload, zona_id: zonaActiva.id });
                toast.success('Puestos asignados correctamente');
            }
            setModalAsignar(false);
            cargarDatos();
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Error al procesar asignación');
        } finally {
            setAsignando(false);
        }
    };

    const handleEliminarAsignacion = (asig) => {
        setConfirmConfig({
            isOpen: true,
            title: 'REVOCAR ASIGNACIÓN TÁCTICA',
            message: `¿CONFIRMA LA REVOCACIÓN de los cupos para la entidad? Esta acción liberará la capacidad en la zona pero no eliminará los puestos físicos si ya fueron generados.`,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, loading: true }));
                try {
                    await zonaService.eliminarAsignacion(asig.id);
                    toast.success('Asignación revocada');
                    cargarDatos();
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                } catch (e) {
                    toast.error('Error al revocar asignación');
                } finally {
                    setConfirmConfig(prev => ({ ...prev, loading: false }));
                }
            }
        });
    };

    // ── Tiempo Límite ────────────────────────────────────────────────────────

    const handleVerDetalle = (puesto) => {
        setPuestoDetalle(puesto);
        setModalDetallePuesto(true);
    };

    const handleLiberarPuestoBase = async () => {
        if (!puestoDetalle?.detalle_pase?.id) return;
        
        setLiberandoPuesto(true);
        try {
            await api.delete(`/comando/pases-reservados/${puestoDetalle.detalle_pase.id}`);
            toast.success('Puesto liberado y pase anulado con éxito');
            setModalDetallePuesto(false);
            cargarDatos(); // Recargar zonas y detalles
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Error al liberar puesto');
        } finally {
            setLiberandoPuesto(false);
        }
    };

    const abrirModalPaseBase = (zona) => {
        setZonaActiva(zona);
        setModalPaseBase(true);
    };

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
    const totalCapacidad = zonas.reduce((acc, z) => acc + (z.capacidad_total || 0), 0);
    const totalOcupados = zonas.reduce((acc, z) => acc + (z.ocupacion_actual || 0), 0);
    
    const totalReservados = asignaciones.reduce((acc, a) => acc + (a.cupo_reservado_base || 0), 0);



    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="p-4 md:p-6 space-y-5 pb-24 max-w-5xl mx-auto animate-in fade-in duration-500">

            {/* Header */}
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 
                               bg-bg-card/30 p-4 md:p-5 rounded-2xl border border-white/5">
                <div className="min-w-0">
                    <h1 className="text-2xl font-black text-text-main flex items-center gap-3 tracking-tight">
                        <div className="p-2 bg-primary/10 rounded-xl shrink-0">
                            <ParkingSquare className="text-primary" size={24} />
                        </div>
                        <span className="uppercase">Gestión de Zonas</span>
                    </h1>
                    <p className="text-text-muted text-sm mt-1 flex items-center gap-1.5 px-1 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" />
                        Distribución y Georreferenciación de Estacionamientos
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto self-end">
                    <Boton onClick={() => abrirModalZona()} className="gap-2 h-11 px-6 w-full sm:w-auto shrink-0 
                                                        bg-primary text-bg-app font-black uppercase tracking-widest text-[11px]
                                                        rounded-xl shadow-tactica hover:scale-[1.02] active:scale-[0.98] transition-all">
                        <Plus size={16} />
                        <span>Nueva Zona Táctica</span>
                    </Boton>
                </div>
            </header>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Zonas Activas', valor: zonas?.length || 0, color: 'text-primary', icon: ParkingSquare },
                    { label: 'Cap. Total', valor: totalCapacidad || 0, color: 'text-success', icon: Hash },
                    { label: 'Ocupación Total', valor: totalOcupados || 0, color: 'text-danger', icon: Activity },
                    { label: 'Reservados', valor: totalReservados || 0, color: 'text-warning', icon: Shield },
                ].map(s => {
                    const Icon = s.icon;
                    return (
                        <Card key={s.label} className="p-3 md:p-4 rounded-2xl border-white/5 flex items-center gap-3 bg-bg-card">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", 
                                s.color.replace('text-', 'bg-') + "/10",
                                s.color.replace('text-', 'border-') + "/20"
                            )}>
                                <Icon className={s.color} size={18} />
                            </div>
                            <div>
                                <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest leading-none mb-1">{s.label}</p>
                                <p className={cn("text-lg font-display font-black leading-none", s.color)}>{String(s.valor)}</p>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Instrucciones */}
            <div className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/15 rounded-xl">
                <Shield size={16} className="text-primary shrink-0 mt-0.5" />
                <p className="text-[9px] text-text-muted leading-relaxed">
                    Gestiona la capacidad táctica de la base. Configura tiempos límite, georreferencia puestos y reserva espacios VIP para personal autorizado.
                </p>
            </div>
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
                            zonas={zonas}
                            onEditar={abrirModalZona}
                            onEliminar={handleEliminarZona}
                            onGestionarPuestos={abrirModalPuestos}
                            onAjustarTiempo={abrirModalTiempo}
                            onAsignar={abrirModalAsignar}
                            onEliminarAsignacion={handleEliminarAsignacion}
                            onEliminarPuesto={handleEliminarPuesto}
                            onCapturarGPSPuesto={handleCapturarGPSPuesto}
                            onGenerarPaseBase={(z) => { setZonaActiva(z); setModalPaseBase(true); }}
                        />
                    ))}
                </div>
            )}

            {/* ── MODAL: Crear/Editar Zona ── */}
            <Modal isOpen={modalZona} onClose={() => setModalZona(false)} title={editandoZona ? 'EDITAR ZONA' : 'NUEVA ZONA'} balanced={true}>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Input label="Nombre de la Zona *" value={formZona.nombre}
                                onChange={e => setFormZona({ ...formZona, nombre: e.target.value })}
                                placeholder="Ej: Zona VIP Norte, Parqueo Logístico..." />
                        </div>
                        <Input label="Capacidad *" type="number" value={formZona.capacidad_total}
                            onChange={e => setFormZona({ ...formZona, capacidad_total: e.target.value })}
                            placeholder="Ej: 50" />
                        <Input label="Tiempo Límite (min)" type="number" value={formZona.tiempo_limite_llegada_min}
                            onChange={e => setFormZona({ ...formZona, tiempo_limite_llegada_min: e.target.value })}
                            placeholder="15" />
                        <Input label="Latitud" value={formZona.latitud}
                            onChange={e => setFormZona({ ...formZona, latitud: e.target.value })}
                            placeholder="10.123456" />
                        <Input label="Longitud" value={formZona.longitud}
                            onChange={e => setFormZona({ ...formZona, longitud: e.target.value })}
                            placeholder="-66.987654" />
                        <div className="col-span-2">
                            <Input label="Descripción de Ubicación" value={formZona.descripcion_ubicacion}
                                onChange={e => setFormZona({ ...formZona, descripcion_ubicacion: e.target.value })}
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
                        }} className="w-full h-11 bg-primary text-bg-app border border-primary/20 text-[10px] gap-2 font-black uppercase shadow-[0_0_15px_rgba(78,222,163,0.2)] hover:scale-[1.01] transition-all">
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
            <Modal isOpen={modalPuestos} onClose={() => setModalPuestos(false)} title={`GESTIÓN DE PUESTOS — ${zonaActiva?.nombre}`} balanced={true}>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] text-text-muted uppercase tracking-widest">
                            Generación masiva y georreferenciación de puestos físicos.
                        </p>
                        <div className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded-lg border border-primary/20">
                           CAPACIDAD: {puestosZona.length} / {zonaActiva?.capacidad_total || 0}
                        </div>
                    </div>

                    {/* Formulario LOTE (Batch) */}
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-4 shadow-inner">
                        <div className="flex items-center gap-2">
                             <Zap size={14} className="text-primary" />
                             <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">Generación por Lote (Optimizado)</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Input label="Prefijo (Ex: A)" value={batchConfig.prefijo}
                                onChange={e => setBatchConfig({ ...batchConfig, prefijo: e.target.value.toUpperCase() })}
                                placeholder="A, B, VIP..." />
                            <Input label="Cantidad" type="number" value={batchConfig.cantidad || ''}
                                onChange={e => setBatchConfig({ ...batchConfig, cantidad: e.target.value })}
                                placeholder="Ej: 50" />
                        </div>
                        <Boton onClick={handleCrearBatch} disabled={creandoBatch || !batchConfig.prefijo || !batchConfig.cantidad}
                            className="w-full h-11 bg-primary text-bg-app rounded-xl text-[11px] font-black uppercase gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
                            {creandoBatch ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                            Generar Lote de Puestos
                        </Boton>
                    </div>

                    {/* Lista de puestos */}
                    {puestosZona.length > 0 ? (
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 bg-black/10 rounded-lg">
                            {puestosZona.map(p => (
                                <PuestoChip key={p.id} puesto={p} onEliminar={handleEliminarPuesto} onEditar={() => { }} onGPS={handleCapturarGPSPuesto} />
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

            {/* ── MODAL: Asignar Puestos a Entidad ── */}
            <Modal isOpen={modalAsignar} onClose={() => setModalAsignar(false)} 
                   title={editandoAsig ? `EDITAR ASIGNACIÓN — ${zonaActiva?.nombre}` : `ASIGNAR PUESTOS — ${zonaActiva?.nombre}`} 
                   balanced={true}>
                <div className="space-y-4">
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <ParkingSquare size={40} />
                        </div>
                        <p className="text-[9px] text-text-muted relative z-10">
                            Asigna una cantidad de puestos de esta zona a una entidad alojada. También puedes reservar puestos para uso exclusivo del personal de la base dentro de esa asignación.
                        </p>
                        
                        {zonaActiva && (
                            <div className="mt-3 pt-3 border-t border-primary/10 flex items-center justify-between relative z-10">
                                <div className="flex flex-col">
                                    <span className="text-[7px] font-black uppercase tracking-widest text-text-muted/50">Disponibilidad Actual</span>
                                    <span className={cn(
                                        "text-lg font-black tracking-tight",
                                        (zonaActiva.capacidad_total - (asignaciones.filter(a => a.zona_id === zonaActiva.id && a.id !== editandoAsig?.id).reduce((acc, a) => acc + (a.cupo_asignado || 0) + (a.cupo_reservado_base || 0), 0))) <= 0 ? 'text-danger' : 'text-primary'
                                    )}>
                                        {zonaActiva.capacidad_total - (asignaciones.filter(a => a.zona_id === zonaActiva.id && a.id !== editandoAsig?.id).reduce((acc, a) => acc + (a.cupo_asignado || 0) + (a.cupo_reservado_base || 0), 0))} PUESTOS LIBRES
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[7px] font-black uppercase tracking-widest text-text-muted/50">Capacidad Total</span>
                                    <div className="text-sm font-bold text-text-main">{zonaActiva.capacidad_total} PUESTOS</div>
                                </div>
                            </div>
                        )}
                    </div>
                    <SelectTactivo 
                        label="Entidad *"
                        icon={<Building2 size={12} />}
                        placeholder="Buscar y seleccionar entidad..."
                        options={entidades.map(e => ({ value: e.id, label: e.nombre }))}
                        value={entidades.filter(e => e.id === formAsig.entidad_id).map(e => ({ value: e.id, label: e.nombre }))[0] || null}
                        onChange={(opt) => setFormAsig({ ...formAsig, entidad_id: opt ? opt.value : '' })}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Puestos asignados" type="number" value={formAsig.cupo_asignado}
                            onChange={e => setFormAsig({ ...formAsig, cupo_asignado: e.target.value })}
                            placeholder="Ej: 15" />
                        <Input label="Reservado base" type="number" value={formAsig.cupo_reservado_base}
                            onChange={e => setFormAsig({ ...formAsig, cupo_reservado_base: e.target.value })}
                            placeholder="0" />
                    </div>
                    <Input label="Notas (opcional)" value={formAsig.notes}
                        onChange={e => setFormAsig({ ...formAsig, notes: e.target.value })}
                        placeholder="Observaciones..." />
                    <div className="flex gap-3 pt-2 border-t border-white/5">
                        <Boton variant="ghost" className="flex-1" onClick={() => setModalAsignar(false)}>Cancelar</Boton>
                        <Boton onClick={handleAsignarPuestos} disabled={asignando || !formAsig.entidad_id}
                            className="flex-[2] bg-primary text-bg-app h-12 font-black uppercase">
                            {asignando ? <RefreshCw size={16} className="animate-spin" /> : <><Building2 size={15} /> {editandoAsig ? 'Actualizar Cupos' : 'Asignar Puestos'}</>}
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
                            {ajustando && <RefreshCw size={16} className="animate-spin" />}
                            {!ajustando && <Timer size={15} />}
                            {ajustando ? 'Aplicando...' : 'Aplicar Tiempo'}
                        </Boton>
                    </div>
                </div>
            </Modal>
            <ModalConfirmacion
                {...confirmConfig}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
            />
            <ModalPaseBase 
                isOpen={modalPaseBase} 
                onClose={() => setModalPaseBase(false)}
                zona={zonaActiva}
                onGenerated={cargarDatos}
            />

            {/* Modal Detalle Puesto Base */}
            <Modal
                isOpen={modalDetallePuesto}
                onClose={() => setModalDetallePuesto(false)}
                title="DETALLE DE ASIGNACIÓN — BASE"
                className="max-w-2xl"
            >
                {puestoDetalle && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-2xl border border-primary/20">
                            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                                <Shield className="text-primary" size={24} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-text-main uppercase">
                                    Puesto: {puestoDetalle.numero_puesto}
                                </h4>
                                <p className="text-[10px] text-text-muted uppercase font-bold">
                                    Acceso Prioritario de Comando
                                </p>
                            </div>
                        </div>

                        {puestoDetalle.detalle_pase && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h5 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                                        <Users size={12} /> Datos del Portador
                                    </h5>
                                    <div className="space-y-2">
                                        <div className="flex justify-between border-b border-white/5 py-1">
                                            <span className="text-[10px] text-text-muted uppercase">Nombre:</span>
                                            <span className="text-[11px] font-bold text-text-main uppercase">{puestoDetalle.detalle_pase.nombre_portador}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-white/5 py-1">
                                            <span className="text-[10px] text-text-muted uppercase">Serial:</span>
                                            <span className="text-[11px] font-mono text-primary font-bold uppercase">{puestoDetalle.detalle_pase.serial_legible}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h5 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                                        <ParkingSquare size={12} /> Vehículo Asignado
                                    </h5>
                                    <div className="space-y-2">
                                        <div className="flex justify-between border-b border-white/5 py-1">
                                            <span className="text-[10px] text-text-muted uppercase">Placa:</span>
                                            <span className="text-[11px] font-bold text-text-main uppercase">{puestoDetalle.detalle_pase.vehiculo_placa}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-white/5 py-1">
                                            <span className="text-[10px] text-text-muted uppercase">Vehículo:</span>
                                            <span className="text-[11px] font-bold text-text-main uppercase">
                                                {puestoDetalle.detalle_pase.vehiculo_marca} {puestoDetalle.detalle_pase.vehiculo_modelo}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <Boton variant="ghost" className="flex-1" onClick={() => setModalDetallePuesto(false)}>Cerrar</Boton>
                            <Boton 
                                className="flex-1 bg-danger/10 text-danger hover:bg-danger hover:text-white transition-all font-black uppercase text-[10px]"
                                onClick={handleLiberarPuestoBase}
                                disabled={liberandoPuesto}
                            >
                                {liberandoPuesto ? 'Liberando...' : 'Liberar y Anular Pase'}
                            </Boton>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
