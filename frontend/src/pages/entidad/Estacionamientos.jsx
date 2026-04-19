import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Boton } from '../../components/ui/Boton';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/auth.store';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import {
    ParkingSquare, Car, Plus, Trash2, RefreshCw,
    Shield, MapPin, Users, Tag, CheckCircle2,
    Circle, Edit3, ToggleLeft, ToggleRight, Zap, AlertTriangle
} from 'lucide-react';
import { zonaService } from '../../services/zona.service';

// ──── Componentes internos ────────────────────────────────────────────────────

const BadgeEstado = ({ estado }) => {
    const cfg = {
        libre: { color: 'bg-success/15 text-success border-success/30', label: 'Libre' },
        ocupado: { color: 'bg-danger/15 text-danger border-danger/30', label: 'Ocupado' },
        reservado: { color: 'bg-warning/15 text-warning border-warning/30', label: 'Reservado' },
        mantenimiento: { color: 'bg-text-muted/15 text-text-muted border-text-muted/20', label: 'Mant.' },
    };
    const c = cfg[estado] || cfg.libre;
    return (
        <span className={cn('text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border', c.color)}>
            {c.label}
        </span>
    );
};

const TarjetaPuesto = ({ puesto, onAsignar, onLiberar }) => (
    <div className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all",
        puesto.estado === 'libre' && 'bg-success/5 border-success/20',
        puesto.estado === 'ocupado' && 'bg-danger/5 border-danger/15',
        puesto.estado === 'reservado' && 'bg-warning/5 border-warning/20',
        puesto.estado === 'mantenimiento' && 'bg-white/3 border-white/5 opacity-60',
    )}>
        <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
            puesto.estado === 'libre' ? 'bg-success/20' : 
            puesto.estado === 'ocupado' ? 'bg-danger/15' :
            puesto.estado === 'reservado' ? 'bg-warning/20' : 'bg-white/5'
        )}>
            <ParkingSquare size={18} className={cn(
                puesto.estado === 'libre' ? 'text-success' :
                puesto.estado === 'ocupado' ? 'text-danger/70' :
                puesto.estado === 'reservado' ? 'text-warning' : 'text-text-muted/50'
            )} />
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
                <p className="text-xs font-black text-text-main uppercase">{puesto.codigo || puesto.numero || `Puesto ${puesto.id?.slice(-4)}`}</p>
                <BadgeEstado estado={puesto.estado} />
            </div>
            {puesto.zona_nombre && (
                <p className="text-[9px] text-text-muted font-bold flex items-center gap-1 mt-0.5">
                    <MapPin size={9} /> {puesto.zona_nombre}
                </p>
            )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
            {puesto.estado === 'libre' || puesto.estado === 'reservado' ? (
                <button
                    onClick={() => onAsignar(puesto)}
                    className="h-7 px-2.5 rounded-lg bg-primary/20 text-primary border border-primary/30 text-[9px] font-black uppercase flex items-center gap-1 hover:bg-primary/30 transition-all"
                >
                    <Users size={10} /> Asignar
                </button>
            ) : puesto.estado === 'ocupado' ? (
                <button
                    onClick={() => onLiberar(puesto)}
                    className="h-7 px-2.5 rounded-lg bg-danger/15 text-danger border border-danger/20 text-[9px] font-black uppercase flex items-center gap-1 hover:bg-danger/25 transition-all"
                >
                    <Circle size={10} /> Liberar
                </button>
            ) : null}
        </div>
    </div>
);

const TarjetaTipoAcceso = ({ tipo, onEditar, onEliminar, onToggle }) => (
    <div className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all",
        tipo.activo ? 'bg-bg-card/40 border-white/5' : 'bg-white/2 border-white/5 opacity-50'
    )}>
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
            <Tag size={16} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-text-main uppercase truncate">{tipo.nombre}</p>
            {tipo.descripcion && (
                <p className="text-[9px] text-text-muted truncate">{tipo.descripcion}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
                {tipo.requiere_vehiculo && (
                    <span className="text-[7px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                        <Car size={7} /> Req. Vehículo
                    </span>
                )}
                {tipo.color_badge && (
                    <span className="inline-block w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: tipo.color_badge }} />
                )}
            </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onToggle(tipo)} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
                {tipo.activo
                    ? <ToggleRight size={20} className="text-success" />
                    : <ToggleLeft size={20} className="text-text-muted/40" />
                }
            </button>
            <button onClick={() => onEditar(tipo)} className="p-1.5 rounded-lg hover:bg-white/10 transition-all text-text-muted hover:text-primary transition-all">
                <Edit3 size={14} />
            </button>
            <button onClick={() => onEliminar(tipo)} className="p-1.5 rounded-lg hover:bg-danger/10 transition-all text-text-muted/40 hover:text-danger transition-all">
                <Trash2 size={14} />
            </button>
        </div>
    </div>
);

// ──── Página Principal ────────────────────────────────────────────────────────

const TABS = { PUESTOS: 'puestos', TIPOS: 'tipos' };

export default function EstacionamientosEntidad() {
    const { user } = useAuthStore();
    const [tab, setTab] = useState(TABS.PUESTOS);

    // Estado de puestos
    const [puestos, setPuestos] = useState([]);
    const [cargandoPuestos, setCargandoPuestos] = useState(true);
    const [puestoSeleccionado, setPuestoSeleccionado] = useState(null);
    const [modalAsignar, setModalAsignar] = useState(false);
    const [asignacion, setAsignacion] = useState({ socio_id: '', notas: '' });
    const [asignando, setAsignando] = useState(false);

    // Estado de tipos de acceso
    const [tipos, setTipos] = useState([]);
    const [cargandoTipos, setCargandoTipos] = useState(true);
    const [modalTipo, setModalTipo] = useState(false);
    const [tipoEditar, setTipoEditar] = useState(null);
    const [formTipo, setFormTipo] = useState({
        nombre: '',
        descripcion: '',
        requiere_vehiculo: true,
        max_vehiculos: 1,
        color_badge: '#4EDEA3',
        activo: true,
    });
    const [guardandoTipo, setGuardandoTipo] = useState(false);

    // ── Carga de datos ────────────────────────────────────────────────────────

    const cargarPuestos = useCallback(async () => {
        setCargandoPuestos(true);
        try {
            const data = await zonaService.getMisPuestos();
            setPuestos(data);
        } catch (e) {
            // Datos demo si la API no responde
            setPuestos([
                { id: '1', codigo: 'E-01', estado: 'libre', zona_nombre: 'Zona VIP Norte' },
                { id: '2', codigo: 'E-02', estado: 'ocupado', zona_nombre: 'Zona VIP Norte' },
                { id: '3', codigo: 'E-03', estado: 'reservado', zona_nombre: 'Zona VIP Norte' },
                { id: '4', codigo: 'E-04', estado: 'libre', zona_nombre: 'Parqueo Logístico' },
                { id: '5', codigo: 'E-05', estado: 'libre', zona_nombre: 'Parqueo Logístico' },
                { id: '6', codigo: 'E-06', estado: 'mantenimiento', zona_nombre: 'Parqueo Logístico' },
            ]);
        } finally {
            setCargandoPuestos(false);
        }
    }, []);

    const cargarTipos = useCallback(async () => {
        if (!user?.entidad_id) return;
        setCargandoTipos(true);
        try {
            const data = await zonaService.listarTiposAcceso(user.entidad_id);
            setTipos(data);
        } catch (e) {
            // Datos demo
            setTipos([
                { id: 't1', nombre: 'Staff Técnico', descripcion: 'Personal técnico de producción', requiere_vehiculo: true, max_vehiculos: 1, color_badge: '#4EDEA3', activo: true },
                { id: 't2', nombre: 'Productor VIP', descripcion: 'Acceso preferencial con zona asignada', requiere_vehiculo: true, max_vehiculos: 2, color_badge: '#F59E0B', activo: true },
                { id: 't3', nombre: 'Logístico', descripcion: 'Vehículos de carga y apoyo', requiere_vehiculo: true, max_vehiculos: 3, color_badge: '#60A5FA', activo: false },
            ]);
        } finally {
            setCargandoTipos(false);
        }
    }, [user?.entidad_id]);

    useEffect(() => { cargarPuestos(); }, [cargarPuestos]);
    useEffect(() => { cargarTipos(); }, [cargarTipos]);

    // ── Acciones: Puestos ─────────────────────────────────────────────────────

    const handleAbrirAsignar = (puesto) => {
        setPuestoSeleccionado(puesto);
        setAsignacion({ socio_id: '', notas: '' });
        setModalAsignar(true);
    };

    const handleAsignar = async () => {
        if (!puestoSeleccionado) return;
        setAsignando(true);
        try {
            await zonaService.asignarPuestoASocio(puestoSeleccionado.id, asignacion);
            toast.success(`Puesto ${puestoSeleccionado.codigo} asignado`);
            setModalAsignar(false);
            await cargarPuestos();
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Error al asignar puesto');
        } finally {
            setAsignando(false);
        }
    };

    const handleLiberar = async (puesto) => {
        try {
            await zonaService.liberarPuesto(puesto.id);
            toast.success(`Puesto ${puesto.codigo} liberado`);
            await cargarPuestos();
        } catch (e) {
            toast.error('Error al liberar puesto');
        }
    };

    // ── Acciones: Tipos de Acceso ─────────────────────────────────────────────

    const abrirModalTipo = (tipo = null) => {
        setTipoEditar(tipo);
        setFormTipo(tipo ? { ...tipo } : {
            nombre: '', descripcion: '', requiere_vehiculo: true,
            max_vehiculos: 1, color_badge: '#4EDEA3', activo: true,
        });
        setModalTipo(true);
    };

    const handleGuardarTipo = async () => {
        if (!formTipo.nombre.trim()) {
            toast.error('El nombre es requerido');
            return;
        }
        setGuardandoTipo(true);
        try {
            if (tipoEditar) {
                await zonaService.actualizarTipoAcceso(tipoEditar.id, formTipo);
                toast.success('Tipo de acceso actualizado');
            } else {
                await zonaService.crearTipoAcceso({ ...formTipo, entidad_id: user.entidad_id });
                toast.success('Tipo de acceso creado');
            }
            setModalTipo(false);
            await cargarTipos();
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Error al guardar');
        } finally {
            setGuardandoTipo(false);
        }
    };

    const handleToggleTipo = async (tipo) => {
        try {
            await zonaService.actualizarTipoAcceso(tipo.id, { activo: !tipo.activo });
            toast.success(tipo.activo ? 'Tipo desactivado' : 'Tipo activado');
            await cargarTipos();
        } catch (e) {
            toast.error('Error al cambiar estado');
        }
    };

    const handleEliminarTipo = async (tipo) => {
        if (!window.confirm(`¿Eliminar el tipo "${tipo.nombre}"?`)) return;
        try {
            await zonaService.eliminarTipoAcceso(tipo.id);
            toast.success('Tipo eliminado');
            await cargarTipos();
        } catch (e) {
            toast.error('Error al eliminar');
        }
    };

    // ── Estadísticas rápidas ──────────────────────────────────────────────────

    const stats = {
        total: puestos.length,
        libres: puestos.filter(p => p.estado === 'libre').length,
        ocupados: puestos.filter(p => p.estado === 'ocupado').length,
        reservados: puestos.filter(p => p.estado === 'reservado').length,
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="p-4 md:p-6 space-y-5 pb-24 max-w-4xl mx-auto animate-in fade-in duration-500">

            {/* Header */}
            <header className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                        <ParkingSquare className="text-primary" size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-text-main uppercase tracking-tight">Estacionamientos</h1>
                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest">{user?.entidad_nombre} — Puestos Asignados</p>
                    </div>
                </div>
            </header>

            {/* KPIs mini */}
            <div className="grid grid-cols-4 gap-2">
                {[
                    { label: 'Total', valor: stats.total, color: 'text-primary' },
                    { label: 'Libres', valor: stats.libres, color: 'text-success' },
                    { label: 'Ocupados', valor: stats.ocupados, color: 'text-danger' },
                    { label: 'Reservados', valor: stats.reservados, color: 'text-warning' },
                ].map(s => (
                    <Card key={s.label} className="p-3 rounded-2xl border-white/5 text-center">
                        <div className={cn("text-2xl font-black tracking-tighter", s.color)}>{s.valor}</div>
                        <div className="text-[8px] font-black uppercase tracking-widest text-text-muted/60 mt-0.5">{s.label}</div>
                    </Card>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex bg-bg-card/40 rounded-xl p-1 border border-white/5 gap-1">
                {[
                    { id: TABS.PUESTOS, label: 'Mis Puestos Asignados', icon: ParkingSquare },
                    { id: TABS.TIPOS, label: 'Tipos de Acceso Custom', icon: Tag },
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                            tab === t.id
                                ? 'bg-primary text-bg-app shadow-md'
                                : 'text-text-muted hover:text-text-main hover:bg-white/5'
                        )}
                    >
                        <t.icon size={13} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── TAB: PUESTOS ── */}
            {tab === TABS.PUESTOS && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                            <Shield size={11} className="text-primary" />
                            Puestos asignados por el Comandante
                        </p>
                        <button onClick={cargarPuestos} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                            <RefreshCw size={14} className={cn("text-text-muted", cargandoPuestos && 'animate-spin')} />
                        </button>
                    </div>

                    {cargandoPuestos ? (
                        <div className="space-y-2">
                            {Array(4).fill(0).map((_, i) => (
                                <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse border border-white/5" />
                            ))}
                        </div>
                    ) : puestos.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                            <ParkingSquare size={40} className="mx-auto text-white/10 mb-3" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted/40">
                                Tu entidad no tiene puestos asignados aún
                            </p>
                            <p className="text-[9px] text-text-muted/30 mt-1">
                                Contáctate con el Comandante de la base para solicitar la asignación de puestos
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Agrupado por zona */}
                            {Object.entries(
                                puestos.reduce((acc, p) => {
                                    const zona = p.zona_nombre || 'Sin Zona';
                                    if (!acc[zona]) acc[zona] = [];
                                    acc[zona].push(p);
                                    return acc;
                                }, {})
                            ).map(([zonaNombre, zonaPuestos]) => (
                                <div key={zonaNombre} className="space-y-2">
                                    <p className="text-[8px] font-black text-text-muted/50 uppercase tracking-widest px-1 flex items-center gap-1.5">
                                        <MapPin size={9} className="text-primary/60" />
                                        {zonaNombre} — {zonaPuestos.length} puestos
                                    </p>
                                    {zonaPuestos.map(p => (
                                        <TarjetaPuesto
                                            key={p.id}
                                            puesto={p}
                                            onAsignar={handleAbrirAsignar}
                                            onLiberar={handleLiberar}
                                        />
                                    ))}
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}

            {/* ── TAB: TIPOS DE ACCESO ── */}
            {tab === TABS.TIPOS && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                            <Tag size={11} className="text-primary" />
                            {tipos.length} tipos de acceso configurados
                        </p>
                        <Boton
                            onClick={() => abrirModalTipo()}
                            className="h-9 px-4 gap-1.5 text-[10px] font-black uppercase rounded-xl bg-primary text-bg-app"
                        >
                            <Plus size={14} /> Nuevo Tipo
                        </Boton>
                    </div>

                    {/* Info box */}
                    <div className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                        <Zap size={16} className="text-primary shrink-0 mt-0.5" />
                        <p className="text-[9px] text-text-muted leading-relaxed">
                            Los <strong className="text-text-main">tipos de acceso custom</strong> te permiten definir categorías propias (Staff, VIP, Logístico) que se asignan al crear pases para tus socios. Puedes configurar si requieren vehículo, cuántos pueden registrar y un color identificador.
                        </p>
                    </div>

                    {cargandoTipos ? (
                        <div className="space-y-2">
                            {Array(3).fill(0).map((_, i) => (
                                <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse border border-white/5" />
                            ))}
                        </div>
                    ) : tipos.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                            <Tag size={40} className="mx-auto text-white/10 mb-3" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted/40">
                                Sin tipos de acceso custom definidos
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {tipos.map(tipo => (
                                <TarjetaTipoAcceso
                                    key={tipo.id}
                                    tipo={tipo}
                                    onEditar={abrirModalTipo}
                                    onEliminar={handleEliminarTipo}
                                    onToggle={handleToggleTipo}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── MODAL: Asignar Puesto ── */}
            <Modal
                isOpen={modalAsignar}
                onClose={() => setModalAsignar(false)}
                title={`ASIGNAR PUESTO ${puestoSeleccionado?.codigo || ''}`}
            >
                <div className="space-y-5">
                    <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                        <ParkingSquare size={20} className="text-primary shrink-0" />
                        <div>
                            <p className="text-[9px] font-black text-primary uppercase tracking-wider">Puesto seleccionado</p>
                            <p className="text-sm font-black text-text-main">{puestoSeleccionado?.codigo} — {puestoSeleccionado?.zona_nombre}</p>
                        </div>
                    </div>

                    <Input
                        label="ID o Cédula del Socio"
                        placeholder="V-00000000 o UUID del socio"
                        value={asignacion.socio_id}
                        onChange={e => setAsignacion({ ...asignacion, socio_id: e.target.value })}
                    />
                    <Input
                        label="Notas (Opcional)"
                        placeholder="Observaciones de la asignación..."
                        value={asignacion.notas}
                        onChange={e => setAsignacion({ ...asignacion, notas: e.target.value })}
                    />

                    <div className="flex gap-3 pt-2">
                        <Boton variant="ghost" className="flex-1" onClick={() => setModalAsignar(false)}>Cancelar</Boton>
                        <Boton
                            onClick={handleAsignar}
                            disabled={asignando || !asignacion.socio_id}
                            className="flex-[2] bg-primary text-bg-app h-12 font-black uppercase tracking-wider"
                        >
                            {asignando ? <RefreshCw size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> Confirmar Asignación</>}
                        </Boton>
                    </div>
                </div>
            </Modal>

            {/* ── MODAL: Crear/Editar Tipo de Acceso ── */}
            <Modal
                isOpen={modalTipo}
                onClose={() => setModalTipo(false)}
                title={tipoEditar ? 'EDITAR TIPO DE ACCESO' : 'NUEVO TIPO DE ACCESO'}
            >
                <div className="space-y-5">
                    <Input
                        label="Nombre del Tipo *"
                        placeholder="Ej: STAFF TÉCNICO, PRODUCTOR VIP..."
                        value={formTipo.nombre}
                        onChange={e => setFormTipo({ ...formTipo, nombre: e.target.value.toUpperCase() })}
                    />
                    <Input
                        label="Descripción (Opcional)"
                        placeholder="Breve descripción de este tipo de acceso"
                        value={formTipo.descripcion}
                        onChange={e => setFormTipo({ ...formTipo, descripcion: e.target.value })}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[9px] font-black text-text-muted uppercase tracking-widest block mb-2">
                                Máx. Vehículos
                            </label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4].map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setFormTipo({ ...formTipo, max_vehiculos: n })}
                                        className={cn(
                                            "flex-1 h-10 rounded-xl border-2 text-sm font-black transition-all",
                                            formTipo.max_vehiculos === n
                                                ? 'bg-primary/10 border-primary text-primary'
                                                : 'bg-white/5 border-white/10 text-text-muted hover:border-white/20'
                                        )}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-text-muted uppercase tracking-widest block mb-2">
                                Color Badge
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={formTipo.color_badge}
                                    onChange={e => setFormTipo({ ...formTipo, color_badge: e.target.value })}
                                    className="w-10 h-10 rounded-xl border border-white/10 bg-transparent cursor-pointer"
                                />
                                <span className="text-xs font-black text-text-muted">{formTipo.color_badge}</span>
                            </div>
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="space-y-3">
                        <button
                            onClick={() => setFormTipo({ ...formTipo, requiere_vehiculo: !formTipo.requiere_vehiculo })}
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <Car size={16} className="text-text-muted" />
                                <span className="text-[10px] font-black uppercase tracking-wider text-text-main">Requiere Vehículo</span>
                            </div>
                            {formTipo.requiere_vehiculo
                                ? <ToggleRight size={22} className="text-success" />
                                : <ToggleLeft size={22} className="text-text-muted/40" />
                            }
                        </button>
                    </div>

                    <div className="flex gap-3 pt-2 border-t border-white/5">
                        <Boton variant="ghost" className="flex-1" onClick={() => setModalTipo(false)}>Cancelar</Boton>
                        <Boton
                            onClick={handleGuardarTipo}
                            disabled={guardandoTipo}
                            className="flex-[2] bg-primary text-bg-app h-12 font-black uppercase tracking-wider"
                        >
                            {guardandoTipo ? <RefreshCw size={16} className="animate-spin" /> : tipoEditar ? 'Guardar Cambios' : 'Crear Tipo'}
                        </Boton>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
