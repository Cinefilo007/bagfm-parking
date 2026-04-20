import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Boton } from '../../components/ui/Boton';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/auth.store';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import SelectTactivo from '../../components/ui/SelectTactivo';
import {
    Calendar, Plus, Download, Clock, PackageOpen,
    LayoutGrid, Ticket, UserCheck, ExternalLink,
    Users, QrCode, ChevronRight, Share2, Mail,
    ParkingSquare, Car, Tag, Edit3, RefreshCw,
    Upload, CheckCircle2, MapPin, MoreVertical, Copy,
    Shield, Camera, Star, AlertTriangle, FileSpreadsheet, PlusCircle
} from 'lucide-react';
import { eventosService } from '../../services/eventos.service';
import { pasesService } from '../../services/pasesService';
import zonaService from '../../services/zona.service';
import api from '../../services/api';
import * as XLSX from 'xlsx';

// ──── Helpers ─────────────────────────────────────────────────────────────────

const TIPO_INFO = {
    simple: { label: 'Pase Simple', icon: Ticket, color: 'text-primary', bg: 'bg-primary/10' },
    identificado: { label: 'Identificado', icon: UserCheck, color: 'text-success', bg: 'bg-success/10' },
    portal: { label: 'Auto-Registro', icon: ExternalLink, color: 'text-warning', bg: 'bg-warning/10' },
    general: { label: 'Público General', icon: Users, color: 'text-text-muted', bg: 'bg-white/5' },
    vip: { label: 'VIP', icon: Shield, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    staff: { label: 'Staff', icon: Shield, color: 'text-sky-400', bg: 'bg-sky-400/10' },
    produccion: { label: 'Producción', icon: LayoutGrid, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    logistica: { label: 'Logística', icon: Car, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    prensa: { label: 'Prensa', icon: Camera, color: 'text-pink-400', bg: 'bg-pink-400/10' },
    artista: { label: 'Artista', icon: Star, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    custom: { label: 'Personalizado', icon: Tag, color: 'text-white', bg: 'bg-white/10' },
};

const badgeTipo = (tipo, labelCustom) => {
    const info = TIPO_INFO[tipo] || TIPO_INFO.simple;
    const Icon = info.icon;
    return (
        <span className={cn('px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border border-white/5 flex items-center gap-1', info.color, info.bg)}>
            <Icon size={9} /> {labelCustom || info.label}
        </span>
    );
};

// ──── PaseRow: fila individual de un pase dentro del drill-down ───────────────

const PaseRow = ({ pase, zonas, onCompartir, onEmail, onEditar }) => {
    return (
        <div className="flex items-center gap-3 p-3 bg-white/3 rounded-xl border border-white/5 hover:bg-white/5 transition-all group">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/15 shrink-0">
                <QrCode size={15} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    {pase.nombre_portador && (
                        <p className="text-[10px] font-black text-text-main uppercase truncate">{pase.nombre_portador}</p>
                    )}
                    {pase.cedula_portador && (
                        <span className="text-[8px] text-text-muted font-mono">{pase.cedula_portador}</span>
                    )}
                    {!pase.nombre_portador && (
                        <p className="text-[9px] text-text-muted/50 italic">Sin asignar</p>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {pase.vehiculo_placa && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg border border-white/5 text-[9px] font-black text-primary">
                            <Car size={10} /> {pase.vehiculo_placa}
                        </div>
                    )}
                    
                    {pase.zona_asignada_id && (
                        <span className="text-[8px] font-bold text-success flex items-center gap-0.5 ml-auto">
                            <ParkingSquare size={8} /> {pase.puesto_asignado_codigo || pase.zona_asignada_nombre}
                        </span>
                    )}

                    <span className={cn(
                        "text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full ml-auto",
                        pase.activo ? 'bg-success/15 text-success' : 'bg-text-muted/10 text-text-muted/50'
                    )}>
                        {pase.activo ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEditar(pase)}
                    className="p-2 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-main transition-all" title="Editar Pase">
                    <Edit3 size={13} />
                </button>
                <button onClick={() => onCompartir(pase)}
                    className="p-2 rounded-lg hover:bg-primary/10 text-text-muted hover:text-primary transition-all" title="Compartir QR">
                    <Share2 size={13} />
                </button>
                <button onClick={() => onEmail(pase)}
                    className="p-2 rounded-lg hover:bg-sky-500/10 text-text-muted hover:text-sky-400 transition-all" title="Enviar Email">
                    <Mail size={13} />
                </button>
            </div>
        </div>
    );
};

// ──── Evolución del LoteCard: Formato Horizontal Táctico ──────────────────────

const ModalEditarPase = ({ pase, isOpen, onClose, onRefresh }) => {
    const [form, setForm] = useState({
        nombre_portador: '', cedula_portador: '', email_portador: '', telefono_portador: '',
        vehiculo_placa: '', vehiculo_marca: '', vehiculo_modelo: '', vehiculo_color: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (pase) {
            setForm({
                nombre_portador: pase.nombre_portador || '',
                cedula_portador: pase.cedula_portador || '',
                email_portador: pase.email_portador || '',
                telefono_portador: pase.telefono_portador || '',
                vehiculo_placa: pase.vehiculo_placa || '',
                vehiculo_marca: pase.vehiculo_marca || '',
                vehiculo_modelo: pase.vehiculo_modelo || '',
                vehiculo_color: pase.vehiculo_color || ''
            });
        }
    }, [pase]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.patch(`/pases/${pase.id}`, form);
            toast.success('Pase actualizado con éxito');
            onRefresh();
            onClose();
        } catch (e) {
            toast.error('Fallo al actualizar pase');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="EDITAR DATOS DEL PASE" size="lg">
            <div className="space-y-6">
                <section>
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Users size={12} /> Información del Portador
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="NOMBRE COMPLETO" value={form.nombre_portador} onChange={e => setForm({...form, nombre_portador: e.target.value})} placeholder="EJ: JUAN PÉREZ" />
                        <Input label="CÉDULA / ID" value={form.cedula_portador} onChange={e => setForm({...form, cedula_portador: e.target.value})} placeholder="EJ: V-12345678" />
                        <Input label="EMAIL" type="email" value={form.email_portador} onChange={e => setForm({...form, email_portador: e.target.value})} placeholder="ejemplo@email.com" />
                        <Input label="TELÉFONO" value={form.telefono_portador} onChange={e => setForm({...form, telefono_portador: e.target.value})} placeholder="+58 412..." />
                    </div>
                </section>

                <section>
                    <h4 className="text-[10px] font-black text-warning uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Car size={12} /> Detalles del Vehículo
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="PLACA" value={form.vehiculo_placa} onChange={e => setForm({...form, vehiculo_placa: e.target.value.toUpperCase()})} placeholder="ALFA-01" />
                        <Input label="MARCA" value={form.vehiculo_marca} onChange={e => setForm({...form, vehiculo_marca: e.target.value.toUpperCase()})} placeholder="TOYOTA" />
                        <Input label="MODELO" value={form.vehiculo_modelo} onChange={e => setForm({...form, vehiculo_modelo: e.target.value.toUpperCase()})} placeholder="FORTUNER" />
                        <Input label="COLOR" value={form.vehiculo_color} onChange={e => setForm({...form, vehiculo_color: e.target.value.toUpperCase()})} placeholder="NEGRO" />
                    </div>
                </section>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                    <Boton variant="ghost" onClick={onClose}>Cancelar</Boton>
                    <Boton onClick={handleSave} isLoading={loading}>Guardar Cambios</Boton>
                </div>
            </div>
        </Modal>
    );
};

const ModalListaPases = ({ isOpen, onClose, lote, zonas }) => {
    const [pases, setPases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [paseEdicion, setPaseEdicion] = useState(null);

    const fetchPases = useCallback(async () => {
        if (!lote?.id) return;
        setLoading(true);
        try {
            const res = await api.get(`/pases/lotes/${lote.id}/pases`);
            setPases(res.data);
        } catch (e) {
            toast.error('Error al cargar pases individuales');
        } finally {
            setLoading(false);
        }
    }, [lote?.id]);

    useEffect(() => { if (isOpen) fetchPases(); }, [isOpen, fetchPases]);

    const filtrados = useMemo(() => {
        if (!busqueda) return pases;
        const q = busqueda.toLowerCase();
        return pases.filter(p => 
            p.nombre_portador?.toLowerCase().includes(q) ||
            p.cedula_portador?.toLowerCase().includes(q) ||
            p.vehiculo_placa?.toLowerCase().includes(q) ||
            p.serial_legible?.toLowerCase().includes(q)
        );
    }, [pases, busqueda]);

    const handleCompartir = async (pase) => {
        try {
            const url = pase.qr_url || `${window.location.origin}/portal-evento/${lote.codigo_serial}`;
            if (navigator.share && navigator.canShare && navigator.canShare({ url })) {
                await navigator.share({ title: `PASE BAGFM: ${lote.nombre_evento}`, url });
            } else {
                await navigator.clipboard.writeText(url);
                toast.success('Enlace copiado al portapapeles');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                const url = pase.qr_url || `${window.location.origin}/portal-evento/${lote.codigo_serial}`;
                await navigator.clipboard.writeText(url);
                toast.success('Copiado al portapapeles (Share bloqueado)');
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`GESTIÓN DE PASES: ${lote?.nombre_evento}`} size="xl">
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Input 
                            placeholder="BUSCAR POR NOMBRE, CÉDULA O PLACA..." 
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            className="pl-10"
                        />
                        <LayoutGrid size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted opacity-40" />
                    </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                    {loading ? (
                        Array(5).fill(0).map((_, i) => (
                            <div key={i} className="h-16 w-full animate-pulse bg-white/5 rounded-xl border border-white/5" />
                        ))
                    ) : filtrados.length > 0 ? (
                        filtrados.map(pase => (
                            <PaseRow 
                                key={pase.id} 
                                pase={pase} 
                                zonas={zonas} 
                                onCompartir={handleCompartir} 
                                onEditar={setPaseEdicion}
                                onEmail={(p) => toast('Envío de email en desarrollo táctico...', { icon: '📧' })}
                            />
                        ))
                    ) : (
                        <div className="text-center py-10 opacity-30 italic text-sm">
                            No se encontraron pases que coincidan...
                        </div>
                    )}
                </div>
            </div>

            <ModalEditarPase 
                isOpen={!!paseEdicion} 
                onClose={() => setPaseEdicion(null)} 
                pase={paseEdicion} 
                onRefresh={fetchPases}
            />
        </Modal>
    );
};

const TacticalKPIs = ({ lotes }) => {
    const stats = useMemo(() => {
        const totalPases = lotes.reduce((acc, l) => acc + (l.cantidad_pases || 0), 0);
        const usados = lotes.reduce((acc, l) => acc + (l.pases_usados || 0), 0);
        const activos = lotes.filter(l => new Date(l.fecha_fin) >= new Date()).length;
        const eficiencia = totalPases > 0 ? Math.round((usados / totalPases) * 100) : 0;
        
        return [
            { label: 'Lotes Activos', val: activos, icon: PackageOpen, color: 'text-primary', sub: 'Paquetes vigentes' },
            { label: 'Pases Totales', val: totalPases.toLocaleString(), icon: Ticket, color: 'text-warning', sub: 'Generados globalmente' },
            { label: 'Accesos Usados', val: usados.toLocaleString(), icon: UserCheck, color: 'text-success', sub: 'Registros en alcabala' },
            { label: 'Eficiencia', val: `${eficiencia}%`, icon: Shield, color: 'text-sky-400', sub: 'Uso de cupos' },
        ];
    }, [lotes]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {stats.map((s, i) => (
                <div key={i} className="p-4 bg-bg-card/40 border border-white/5 rounded-2xl flex items-center gap-4 group hover:bg-bg-high/80 transition-all border-b-2 border-b-transparent hover:border-b-primary/50">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-black/40 border border-white/5", s.color)}>
                        <s.icon size={22} />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-text-main leading-tight">{s.val}</div>
                        <div className="text-[10px] font-black uppercase text-text-muted tracking-widest">{s.label}</div>
                        <div className="text-[8px] text-text-muted opacity-40 uppercase font-bold mt-0.5">{s.sub}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const LoteCardV2 = ({ lote, zonas, tiposCustom, onRefresh, onVerPases }) => {
    const [generando, setGenerando] = useState(false);
    const [progreso, setProgreso] = useState(0);

    const info = TIPO_INFO[lote.tipo_pase] || TIPO_INFO.simple;
    const Icon = info.icon;

    const handleGenerarZip = async () => {
        setGenerando(true);
        setProgreso(0);
        try {
            await pasesService.generarZip(lote.id);
            toast.success('Generación de QRs iniciada');
            const total = lote.cantidad_pases || 1;
            const intervalo = setInterval(async () => {
                try {
                    const res = await api.get(`/pases/lotes/${lote.id}/pases`);
                    const generados = Array.isArray(res.data) ? res.data.length : 0;
                    const pct = Math.min(100, Math.round((generados / total) * 100));
                    setProgreso(pct);
                    if (pct >= 100) {
                        clearInterval(intervalo);
                        setGenerando(false);
                    }
                } catch { }
            }, 1800);
            setTimeout(() => { clearInterval(intervalo); setGenerando(false); }, 180_000);
        } catch (e) {
            toast.error('Error al generar QRs');
            setGenerando(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row items-center gap-4 p-4 bg-bg-card/40 border border-white/5 rounded-2xl group hover:border-white/10 hover:bg-bg-high/60 transition-all">
            <div className="flex flex-row md:flex-col items-center gap-3 w-full md:w-24 shrink-0 md:border-r border-white/5 md:pr-4">
                <div className={cn("p-3 rounded-2xl border border-white/5 shadow-inner", info.bg)}>
                    <Icon className={info.color} size={22} />
                </div>
                <div className="flex flex-col gap-1 items-start md:items-center">
                    {badgeTipo(lote.tipo_pase)}
                    <span className="text-[10px] font-mono text-text-muted opacity-40 font-bold">#{lote.codigo_serial.split('-').pop()}</span>
                </div>
            </div>

            <div className="flex-1 min-w-0 space-y-1 w-full text-left">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-text-main uppercase leading-tight truncate">{lote.nombre_evento}</h3>
                    {lote.tipo_acceso && lote.tipo_acceso !== 'general' && badgeTipo(lote.tipo_acceso, lote.tipo_custom_label)}
                </div>
                <div className="flex items-center gap-3 text-text-muted text-[10px] font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Calendar size={12} className="opacity-40" /> {new Date(lote.fecha_inicio).toLocaleDateString()}</span>
                    <span className="opacity-20">|</span>
                    <span className="flex items-center gap-1"><Clock size={12} className="opacity-40" /> Vence {new Date(lote.fecha_fin).toLocaleDateString()}</span>
                </div>
            </div>

            <div className="flex items-center gap-4 px-4 border-l border-white/5 shrink-0 hidden md:flex">
                <div className="text-center">
                    <div className="text-xl font-black text-white">{lote.cantidad_pases}</div>
                    <div className="text-[8px] font-black text-text-muted uppercase">Pases</div>
                </div>
                <div className="text-center">
                    <div className="text-xl font-black text-success">{lote.pases_usados ?? 0}</div>
                    <div className="text-[8px] font-black text-text-muted uppercase">Usados</div>
                </div>
            </div>

            <div className="w-full md:w-36 shrink-0 space-y-2 md:border-l border-white/5 md:pl-4">
                <div className="flex justify-between items-center text-[9px] font-black tracking-widest">
                    <span className="text-text-muted uppercase">Estado</span>
                    <span className={lote.zip_generado || progreso >= 100 ? 'text-success' : generando ? 'text-primary' : 'text-warning'}>
                        {lote.zip_generado || progreso >= 100 ? 'LISTO' : generando ? `${progreso}%` : 'PENDIENTE'}
                    </span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-500", lote.zip_generado || progreso >= 100 ? 'bg-success' : generando ? 'bg-primary' : 'bg-white/10')} style={{ width: lote.zip_generado || progreso >= 100 ? '100%' : generando ? `${progreso}%` : '0%' }} />
                </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto shrink-0 md:pl-2">
                {lote.zip_generado || progreso >= 100 ? (
                    <a href={lote.zip_url} download className="h-9 px-3 bg-success/15 hover:bg-success/25 border border-success/20 rounded-xl flex items-center gap-2 transition-all">
                        <Download size={14} className="text-success" />
                        <span className="text-[10px] font-black text-success uppercase">ZIP</span>
                    </a>
                ) : (
                    <Boton size="sm" onClick={handleGenerarZip} isLoading={generando} disabled={generando} className="flex-1 md:flex-none">
                        <QrCode size={14} /> GENERAR
                    </Boton>
                )}
                <Boton variant="ghost" size="sm" onClick={() => onVerPases(lote)} className="h-9 px-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-2 text-primary hover:bg-primary/20">
                    <Users size={14} /> <span className="text-[10px] font-black uppercase">GESTIONAR</span>
                </Boton>
            </div>
        </div>
    );
};


// ──── Modal: Crear lote con asignación zona/puesto + multi-vehículo ─────────

const TIPOS_PASE_OPTIONS = [
    { id: 'simple', label: 'Simple', icon: Ticket, desc: 'Sin datos previos' },
    { id: 'identificado', label: 'Identificado', icon: UserCheck, desc: 'Carga vía Excel' },
    { id: 'portal', label: 'Portal', icon: ExternalLink, desc: 'Auto-registro' },
];

const TIPOS_ACCESO_BASE = [
    { id: 'general', label: 'Público General', icon: Users },
    { id: 'staff', label: 'Staff / Apoyo', icon: Shield },
    { id: 'produccion', label: 'Productores', icon: LayoutGrid },
    { id: 'logistica', label: 'Logística', icon: Car },
    { id: 'vip', label: 'Invitados VIP', icon: Tag },
];


const ModalNuevoLote = ({ isOpen, onClose, zonas, tiposCustom, onCreated }) => {
    const { user } = useAuthStore();
    const [form, setForm] = useState({
        nombre_evento: '',
        fecha_inicio: new Date().toISOString().slice(0, 10),
        fecha_fin: '',
        cantidad_pases: 10,
        tipo_pase: 'simple',
        tipo_acceso: 'general',         // Siempre empieza en general
        tipo_acceso_custom_id: null,     // null = Público General
        multi_vehiculo: false,
        max_vehiculos: 1,
        zona_asignada_id: null,
        puesto_asignado_id: null,
        max_accesos_por_pase: 1,
    });
    const [guardando, setGuardando] = useState(false);
    const [maxPasesZona, setMaxPasesZona] = useState(9999);
    const [capacidadExcedida, setCapacidadExcedida] = useState(false);
    const [warningIgnorada, setWarningIgnorada] = useState(false);
    const [excelPases, setExcelPases] = useState(null);

    // Opciones de acceso: 'Público General' fijo + tipos custom de la entidad
    const OPCION_GENERAL = { id: 'general', label: 'Público General', icon: Users, color: null };
    const opcionesAcceso = useMemo(() => {
        const customs = tiposCustom
            .filter(tc => tc.activo !== false)
            .map(tc => ({
                id: tc.id,           // UUID directo
                label: tc.nombre,
                icon: Tag,
                color: tc.color_hex || tc.color,
                isCustom: true
            }));
        return [OPCION_GENERAL, ...customs];
    }, [tiposCustom]);

    // Capacidad total de la entidad en todas sus zonas asignadas
    const totalCapacidadEntidad = useMemo(() => {
        return zonas.reduce((acc, z) => acc + (z.cupo_asignado || 0) - (z.cupo_reservado_base || 0), 0);
    }, [zonas]);

    useEffect(() => {
        if (!form.zona_asignada_id) {
            // Sin zona: el sistema asigna automáticamente, sin alerta de bloqueo.
            setMaxPasesZona(totalCapacidadEntidad || 9999);
            setCapacidadExcedida(false);
            return;
        }

        const asig = zonas.find(z => z.zona_id === form.zona_asignada_id);
        if (!asig) return;

        const distribucion = asig.distribucion_cupos || {};
        const cupoTotal = parseInt(asig.cupo_asignado) || 0;
        const cupoBase  = parseInt(asig.cupo_reservado_base) || 0;
        const cuposCat  = Object.values(distribucion).reduce((acc, v) => acc + (parseInt(v) || 0), 0);
        // Cupos libres = Total - Reservados operativos - Todos los categorizados
        const cuposLibres = Math.max(0, cupoTotal - cupoBase - cuposCat);

        // Todos los tipos custom usan el remanente libre de la zona
        setMaxPasesZona(cuposLibres);
        setCapacidadExcedida(cuposLibres > 0 && form.cantidad_pases > cuposLibres && !warningIgnorada);
    }, [form.zona_asignada_id, zonas, form.cantidad_pases, warningIgnorada, totalCapacidadEntidad]);

    const handleAjustarCapacidad = () => {
        setForm(prev => ({ ...prev, cantidad_pases: maxPasesZona }));
        setCapacidadExcedida(false);
        setWarningIgnorada(false);
    };

    const handleIgnorarWarning = () => {
        setWarningIgnorada(true);
        setCapacidadExcedida(false);
    };

    const handleDescargarPlantilla = () => {
        const headers = [
            "NOMBRE COMPLETO", "CEDULA", "EMAIL", "TELEFONO", 
            "PLACA V1", "MARCA V1", "MODELO V1", "COLOR V1",
            "PLACA V2", "MARCA V2", "MODELO V2", "COLOR V2",
            "PLACA V3", "MARCA V3", "MODELO V3", "COLOR V3",
            "PLACA V4", "MARCA V4", "MODELO V4", "COLOR V4"
        ];
        const example = [
            "EJ: JUAN PEREZ", "12345678", "juan@correo.com", "04120000000", 
            "ABC-123", "TOYOTA", "COROLLA", "BLANCO",
            "", "", "", "",
            "", "", "", "",
            "", "", "", ""
        ];
        const ws = XLSX.utils.aoa_to_sheet([headers, example]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "PLANTILLA_PASES");
        XLSX.writeFile(wb, `PLANTILLA_PASES_${form.nombre_evento || 'EV'}.xlsx`);
    };

    const handleCargarExcelFrontend = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = evt.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                const dataRows = rows.slice(1).filter(r => r.some(v => v));

                if (dataRows.length !== form.cantidad_pases) {
                    toast.error(`ERROR TÁCTICO: El Excel tiene ${dataRows.length} registros, pero solicitaste ${form.cantidad_pases} pases.`);
                    e.target.value = '';
                    setExcelPases(null);
                    return;
                }
                setExcelPases(dataRows);
                toast.success('Excel validado correctamente');
            } catch (err) {
                toast.error('Error al procesar el Excel');
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleSubmit = async () => {
        if (!form.nombre_evento.trim() || !form.fecha_fin) {
            toast.error('Completa los campos requeridos');
            return;
        }
        if (form.tipo_pase === 'identificado' && !excelPases) {
            toast.error('Debes cargar el Excel con los datos de los pases');
            return;
        }

        // BLOQUEO TÁCTICO: No permitir si supera la capacidad total de la entidad
        if (form.cantidad_pases > totalCapacidadEntidad) {
            toast.error(`CAPACIDAD AGOTADA: Solicitaste ${form.cantidad_pases} pases, pero la entidad solo tiene ${totalCapacidadEntidad} puestos disponibles en total.`, {
                icon: '🚨',
                duration: 6000
            });
            return;
        }

        setGuardando(true);
        try {
            // Limpieza táctica del payload: convertir strings vacíos de IDs en null
            const cleanForm = { ...form };
            ['zona_asignada_id', 'puesto_asignado_id', 'tipo_acceso_custom_id'].forEach(key => {
                if (cleanForm[key] === '') cleanForm[key] = null;
            });

            const payload = {
                ...cleanForm,
                entidad_id: user?.entidad_id,
                excel_data: excelPases, 
                distribucion_automatica: capacidadExcedida,
                
                // Mapeo explícito
                zona_id: cleanForm.zona_asignada_id,
                puesto_id: cleanForm.puesto_asignado_id
            };
            await pasesService.crearLote(payload);
            toast.success('Lote de pases creado con éxito');
            onCreated?.();
            onClose();
        } catch (e) {
            const errorData = e.response?.data?.detail;
            if (Array.isArray(errorData)) {
                // Error de validación de FastAPI (422)
                const msg = errorData.map(err => `${err.loc[err.loc.length-1]}: ${err.msg}`).join(', ');
                toast.error(`ERROR TÁCTICO: ${msg.toUpperCase()}`);
            } else {
                toast.error(errorData || 'Error al crear lote');
            }
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="NUEVO LOTE DE PASES">
            <div className="space-y-6">
                {/* Tipo de pase */}
                <div>
                    <label className="text-[10px] font-black text-text-muted/60 uppercase tracking-widest block mb-3">1. Selecciona el Tipo de Pase</label>
                    <div className="grid grid-cols-3 gap-2">
                        {TIPOS_PASE_OPTIONS.map(t => {
                            const Icon = t.icon;
                            const sel = form.tipo_pase === t.id;
                            return (
                                <button key={t.id} onClick={() => setForm({ ...form, tipo_pase: t.id })}
                                    className={cn(
                                        "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                                        sel ? 'bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(78,222,163,0.1)]' : 'bg-white/5 border-white/10 text-text-muted hover:border-white/20'
                                    )}>
                                    <Icon size={18} />
                                    <span className="text-[10px] font-black uppercase">{t.label}</span>
                                    <span className="text-[7px] opacity-60 font-bold">{t.desc}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Clasificación del portador - SelectTactivo para ahorro de espacio */}
                <div className="pt-2">
                    <SelectTactivo 
                        label="2. Categoría de Acceso"
                        icon={<Tag size={12} className="text-primary" />}
                        placeholder="Seleccionar categoría..."
                        options={opcionesAcceso.map(t => ({ 
                            value: t.id,
                            label: t.label.toUpperCase()
                        }))}
                        value={(() => {
                            // Si es 'general', mostrar la opción fija
                            if (form.tipo_acceso === 'general' || !form.tipo_acceso_custom_id) {
                                return { value: 'general', label: 'PÚBLICO GENERAL' };
                            }
                            // Si es custom, buscar por UUID
                            const opt = opcionesAcceso.find(t => t.id === form.tipo_acceso_custom_id);
                            return opt ? { value: opt.id, label: opt.label.toUpperCase() } : { value: 'general', label: 'PÚBLICO GENERAL' };
                        })()}
                        onChange={(opt) => {
                            if (!opt || opt.value === 'general') {
                                // Público General: tipo_acceso='general', sin ID custom
                                setForm({ ...form, tipo_acceso: 'general', tipo_acceso_custom_id: null });
                            } else {
                                // Tipo custom: tipo_acceso='custom' + UUID
                                setForm({ ...form, tipo_acceso: 'custom', tipo_acceso_custom_id: opt.value });
                            }
                        }}
                        isSearchable
                    />
                </div>

                {/* Datos del lote */}
                <div className="space-y-4 pt-2 border-t border-white/5">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <Input label="Nombre del Evento / Lote *"
                                value={form.nombre_evento}
                                onChange={e => setForm({ ...form, nombre_evento: e.target.value.toUpperCase() })}
                                placeholder="EJ: CONCIERTO ANIVERSARIO 2026" />
                        </div>
                        <Input label="Fecha inicio" type="date" value={form.fecha_inicio}
                            onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} />
                        <Input label="Fecha fin *" type="date" value={form.fecha_fin}
                            onChange={e => setForm({ ...form, fecha_fin: e.target.value })} />
                        <div className="space-y-1">
                            <Input label="Cantidad de pases" type="number" min="1" max={maxPasesZona} value={form.cantidad_pases}
                                onChange={e => {
                                    let v = parseInt(e.target.value) || 1;
                                    if (v > maxPasesZona) v = maxPasesZona;
                                    setForm({ ...form, cantidad_pases: v });
                                }} />
                            {maxPasesZona !== 9999 && (
                                <p className="text-[8px] text-warning uppercase font-bold px-1">Límite por zona: {maxPasesZona}</p>
                            )}
                        </div>
                        <Input label="Máx. accesos por pase" type="number" value={form.max_accesos_por_pase}
                            onChange={e => setForm({ ...form, max_accesos_por_pase: parseInt(e.target.value) || 1 })} />
                    </div>

                    {/* Asignación táctica zona/puesto */}
                    <div className="space-y-4 pt-2">
                        <SelectTactivo 
                            label="Zona de Estacionamiento"
                            icon={<MapPin size={10} className="text-primary" />}
                            placeholder="Buscar zona física..."
                            options={zonas.map(z => ({ 
                                value: z.zona_id, 
                                label: z.zona_nombre?.toUpperCase() || `ZONA ${z.zona_id.slice(-4)}`
                            }))}
                            value={zonas.find(z => z.zona_id === form.zona_asignada_id) ? {
                                value: form.zona_asignada_id,
                                label: zonas.find(z => z.zona_id === form.zona_asignada_id)?.zona_nombre?.toUpperCase()
                            } : null}
                            onChange={(opt) => setForm({ ...form, zona_asignada_id: opt?.value || null })}
                            isClearable
                        />

                        {/* Alerta de Capacidad */}
                        {capacidadExcedida && (
                            <div className="bg-warning/10 border border-warning/30 rounded-2xl p-4 space-y-3 animate-in zoom-in-95">
                                <div className="flex gap-3">
                                    <AlertTriangle className="text-warning shrink-0" size={18} />
                                    <div>
                                        <p className="text-[10px] font-black text-warning uppercase tracking-widest">Capacidad Excedida</p>
                                        <p className="text-[9px] text-text-muted font-bold mt-1 leading-relaxed">
                                            Solicitaste <span className="text-white">{form.cantidad_pases}</span> pases, pero solo hay <span className="text-white">{maxPasesZona}</span> cupos libres en esta zona.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleAjustarCapacidad}
                                        className="flex-1 bg-warning/20 hover:bg-warning/30 text-warning text-[8px] font-black uppercase py-2 rounded-lg transition-all"
                                    >
                                        Ajustar al Máximo
                                    </button>
                                    <button 
                                        onClick={handleIgnorarWarning}
                                        className="flex-1 bg-white/5 hover:bg-white/10 text-text-muted text-[8px] font-black uppercase py-2 rounded-lg transition-all"
                                    >
                                        Distribución Libre
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Sección Excel para Identificados */}
                    {form.tipo_pase === 'identificado' && (
                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-4 animate-in slide-in-from-bottom-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileSpreadsheet size={16} className="text-primary" />
                                    <span className="text-[10px] font-black text-text-main uppercase">Carga de Integrantes</span>
                                </div>
                                <button 
                                    onClick={handleDescargarPlantilla}
                                    className="text-[9px] font-black text-primary hover:underline uppercase flex items-center gap-1.5"
                                >
                                    <Download size={12} /> Plantilla
                                </button>
                            </div>
                            
                            <div className="relative group">
                                <input 
                                    type="file" 
                                    accept=".xlsx, .xls"
                                    onChange={handleCargarExcelFrontend}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                />
                                <div className={cn(
                                    "p-6 border-2 border-dashed rounded-xl flex flex-col items-center gap-2 transition-all",
                                    excelPases ? 'bg-success/5 border-success/30 text-success' : 'bg-black/20 border-white/10 text-text-muted group-hover:border-primary/40'
                                )}>
                                    {excelPases ? <CheckCircle2 size={24} /> : <Upload size={24} />}
                                    <span className="text-[10px] font-black uppercase">
                                        {excelPases ? `${excelPases.length} REGISTROS CARGADOS` : 'Haga clic o arrastre el Excel aquí'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Multi-vehículo */}
                    <button onClick={() => setForm({ ...form, multi_vehiculo: !form.multi_vehiculo })}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/8 transition-all">
                        <div className="flex items-center gap-2">
                            <Car size={15} className="text-text-muted" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-text-main">Acceso Multi-Vehículo</span>
                        </div>
                        <span className={form.multi_vehiculo ? "text-success text-[10px] font-black" : "text-text-muted/40 text-[10px] font-black"}>
                            {form.multi_vehiculo ? "ACTIVO" : "NO"}
                        </span>
                    </button>

                    {form.multi_vehiculo && (
                        <div>
                            <label className="text-[9px] font-black text-text-muted uppercase tracking-widest block mb-2">
                                Máx. vehículos por pase
                            </label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4].map(n => (
                                    <button key={n} onClick={() => setForm({ ...form, max_vehiculos: n })}
                                        className={cn("flex-1 h-10 rounded-xl border-2 text-sm font-black transition-all",
                                            form.max_vehiculos === n ? 'bg-primary/10 border-primary text-primary' : 'bg-white/5 border-white/10 text-text-muted')}>
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 pt-4">
                    <Boton variant="ghost" className="flex-1 h-11 text-[11px] rounded-xl" onClick={onClose}>Cancelar</Boton>
                    <Boton onClick={handleSubmit} disabled={guardando}
                        className="flex-[2] bg-primary text-bg-app h-14 font-black uppercase tracking-widest text-[11px] rounded-xl shadow-tactica hover:scale-[1.02] transition-transform">
                        {guardando ? <RefreshCw size={16} className="animate-spin" /> : <><Plus size={15} /> Crear Lote</>}
                    </Boton>
                </div>
            </div>
        </Modal>
    );
};

// ──── Página Principal ────────────────────────────────────────────────────────

export default function EventosV2() {
    const { user } = useAuthStore();
    const [solicitudes, setSolicitudes] = useState([]);
    const [lotes, setLotes] = useState([]);
    const [zonas, setZonas] = useState([]);
    const [tiposCustom, setTiposCustom] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showSolicitudModal, setShowSolicitudModal] = useState(false);
    const [loteDetalle, setLoteDetalle] = useState(null); // Nuevo estado para drill-down
    const [formSolicitud, setFormSolicitud] = useState({
        nombre_evento: '', fecha_evento: '', cantidad_solicitada: 10, motivo: '', tipo_pase: 'simple', entidad_id: user?.entidad_id
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        
        const fetchSafe = async (fn, fallback = []) => {
            try {
                const res = await fn();
                return res;
            } catch (err) {
                console.warn("Fallo táctico en carga (Eventos):", err);
                return fallback;
            }
        };

        try {
            const [sData, lData, asigData, tData] = await Promise.all([
                fetchSafe(() => eventosService.getSolicitudes()),
                fetchSafe(() => pasesService.listarLotes()),
                fetchSafe(() => zonaService.getMisAsignaciones(), []),
                fetchSafe(() => zonaService.listarTiposAcceso(user?.entidad_id), []),
            ]);

            setSolicitudes(sData);
            setLotes(lData);
            setZonas(asigData);
            setTiposCustom(tData);
        } catch (e) {
            console.error("Error crítico en sincronización de eventos:", e);
        } finally {
            setLoading(false);
        }
    }, [user?.entidad_id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSolicitud = async (e) => {
        e.preventDefault();
        try {
            await eventosService.crearSolicitud({ ...formSolicitud, entidad_id: user?.entidad_id });
            toast.success('Protocolo enviado a Mando');
            setShowSolicitudModal(false);
            fetchData();
        } catch (e) {
            toast.error('Error al enviar solicitud');
        }
    };

    const pendientes = solicitudes.filter(s => s.estado === 'pendiente');

    return (
        <div className="p-4 space-y-6 pb-32 max-w-[1400px] mx-auto animate-in fade-in duration-500">
            {/* Cabecera Táctica */}
            <header className="relative overflow-hidden bg-bg-card/30 rounded-2xl border border-white/5 p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Decoración de fondo */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -mr-32 -mt-32" />
                
                {/* Bloque Izquierdo: Identidad */}
                <div className="relative flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 shadow-lg shadow-primary/5">
                        <Calendar className="text-primary" size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-text-main uppercase tracking-tighter leading-none">
                            Eventos y Pases
                        </h1>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-2 px-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" />
                            Gestión de Accesos Masivos — {user?.entidad_nombre}
                        </p>
                    </div>
                </div>

                {/* Bloque Derecho: Acciones */}
                <div className="relative flex items-center gap-2 w-full sm:w-auto">
                    <Boton 
                        onClick={() => setShowModal(true)} 
                        className="gap-2 h-12 px-6 bg-primary text-bg-app font-black uppercase tracking-widest text-[11px] shadow-tactica hover:scale-[1.02] transition-all whitespace-nowrap min-w-fit"
                    >
                        <PlusCircle size={18} /> 
                        Crear Nuevo Lote
                    </Boton>
                </div>
            </header>

            {/* Panel de Indicadores KPI */}
            {!loading && lotes.length > 0 && <TacticalKPIs lotes={lotes} />}

            {/* ERROR NO PARKING */}
            {zonas.length === 0 && !loading && (
                <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex gap-3 text-warning">
                    <Shield className="shrink-0 mt-0.5" size={20} />
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider">Configuración de Estacionamiento Incompleta</p>
                        <p className="text-[10px] mt-1 font-bold opacity-80 leading-relaxed">
                            No puedes generar pases masivos en este momento. Debes tener asignaciones de estacionamiento activas. Si ya el Comando Central te asignó espacios, asegúrate de consolidar tu esquema de estacionamientos en el panel de Estacionamientos.
                        </p>
                    </div>
                </div>
            )}

            {/* Solicitudes Pendientes */}
            {pendientes.length > 0 && (
                <section className="space-y-3">
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2 px-1">
                        <Clock size={11} className="text-warning" /> {pendientes.length} solicitud(es) en revisión
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {pendientes.map(s => (
                            <Card key={s.id} className="bg-bg-card/40 border-warning/20 border-l-4 border-l-warning">
                                <CardContent className="p-4 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-black text-text-main uppercase">{s.nombre_evento}</p>
                                        <p className="text-[9px] text-text-muted mt-0.5">{s.fecha_evento} · {s.cantidad_solicitada} pases</p>
                                    </div>
                                    <span className="text-[8px] font-black text-warning bg-warning/10 px-2.5 py-1.5 rounded-full border border-warning/20 uppercase">En Revisión</span>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            )}

            {/* Lotes de Pases */}
            <section className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                        <LayoutGrid size={11} className="text-primary" /> {lotes.length} lotes activos
                    </p>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowSolicitudModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/10 text-warning text-[9px] font-black uppercase border border-warning/10 hover:bg-warning/20 transition-all"
                        >
                            <Clock size={11} /> Solicitar Evento
                        </button>
                        <button onClick={fetchData} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                            <RefreshCw size={13} className={cn("text-text-muted", loading && 'animate-spin')} />
                        </button>
                    </div>
                </div>
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array(3).fill(0).map((_, i) => <div key={i} className="h-52 rounded-2xl bg-white/5 animate-pulse border border-white/5" />)}
                    </div>
                ) : lotes.length > 0 ? (
                    <div className="flex flex-col gap-3">
                        {lotes.map(lote => (
                            <LoteCardV2 key={lote.id} lote={lote} zonas={zonas} tiposCustom={tiposCustom} onRefresh={fetchData} onVerPases={setLoteDetalle} />
                        ))}
                    </div>
                ) : (
                    <div className="relative group py-24 flex flex-col items-center gap-6 bg-bg-card/10 rounded-2xl border border-dashed border-white/10 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner">
                            <PackageOpen className="text-text-muted/20" size={40} />
                        </div>
                        
                        <div className="relative text-center px-6 space-y-2">
                            <h3 className="text-text-main font-black uppercase tracking-[0.2em] text-sm">
                                Terminal de Pases Vacía
                            </h3>
                            <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest max-w-xs mx-auto leading-relaxed opacity-60">
                                No se detectan lotes de acceso activos para {user?.entidad_nombre}. 
                                Utiliza el panel superior para iniciar un nuevo protocolo.
                            </p>
                        </div>

                        <Boton 
                            onClick={() => setShowModal(true)} 
                            variant="ghost"
                            className="relative mt-2 h-10 px-6 gap-2 text-[9px] font-black uppercase border-white/5 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                        >
                            <Plus size={14} /> Iniciar Primer Lote
                        </Boton>
                    </div>
                )}
            </section>

            {/* Modal crear lote v2 */}
            <ModalNuevoLote isOpen={showModal} onClose={() => setShowModal(false)} zonas={zonas} tiposCustom={tiposCustom} onCreated={fetchData} />

            {/* Modal Gestión de Pases Individuales */}
            <ModalListaPases 
                isOpen={!!loteDetalle} 
                onClose={() => setLoteDetalle(null)} 
                lote={loteDetalle} 
                zonas={zonas} 
            />

            {/* Modal solicitud evento */}
            <Modal isOpen={showSolicitudModal} onClose={() => setShowSolicitudModal(false)} title="NUEVA SOLICITUD FL-08">
                <form onSubmit={handleSolicitud} className="space-y-4">
                    <Input label="Nombre del evento *" value={formSolicitud.nombre_evento}
                        onChange={e => setFormSolicitud({ ...formSolicitud, nombre_evento: e.target.value.toUpperCase() })} required />
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Fecha programada *" type="date" value={formSolicitud.fecha_evento}
                            onChange={e => setFormSolicitud({ ...formSolicitud, fecha_evento: e.target.value })} required />
                        <Input label="Pases solicitados" type="number" value={formSolicitud.cantidad_solicitada}
                            onChange={e => setFormSolicitud({ ...formSolicitud, cantidad_solicitada: parseInt(e.target.value) })} />
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest block mb-1.5">Justificación *</label>
                        <textarea required value={formSolicitud.motivo}
                            onChange={e => setFormSolicitud({ ...formSolicitud, motivo: e.target.value })}
                            rows={3} placeholder="Describe la finalidad del evento..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-text-main focus:border-primary/50 outline-none resize-none placeholder:text-white/20" />
                    </div>
                    <div className="flex gap-3 pt-2 border-t border-white/5">
                        <Boton type="button" variant="ghost" className="flex-1" onClick={() => setShowSolicitudModal(false)}>Cancelar</Boton>
                        <Boton type="submit" className="flex-[2] bg-primary text-bg-app h-12 font-black uppercase">Enviar a Mando</Boton>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
