import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Boton } from '../../components/ui/Boton';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/auth.store';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import {
    Calendar, Plus, Download, Clock, PackageOpen,
    LayoutGrid, Ticket, UserCheck, ExternalLink,
    Users, QrCode, ChevronRight, Share2, Mail,
    RefreshCw, Upload, CheckCircle2, MapPin, MoreVertical, Copy,
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

const PaseRow = ({ pase, zonas, onCompartir, onEmail }) => {
    const [menuAbierto, setMenuAbierto] = useState(false);
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
                        <p className="text-[9px] text-text-muted/50 italic">Sin datos del portador</p>
                    )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {pase.vehiculo_placa && (
                        <span className="text-[8px] font-bold text-text-muted flex items-center gap-0.5">
                            <Car size={8} /> {pase.vehiculo_placa}
                        </span>
                    )}
                    {pase.zona_asignada_nombre && (
                        <span className="text-[8px] font-bold text-success flex items-center gap-0.5">
                            <ParkingSquare size={8} /> {pase.puesto_asignado_codigo || pase.zona_asignada_nombre}
                        </span>
                    )}
                    <span className={cn(
                        "text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full",
                        pase.activo ? 'bg-success/15 text-success' : 'bg-text-muted/10 text-text-muted/50'
                    )}>
                        {pase.activo ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                {pase.qr_url && (
                    <button onClick={() => onCompartir(pase)}
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-text-muted hover:text-primary transition-all" title="Compartir QR">
                        <Share2 size={13} />
                    </button>
                )}
                <button onClick={() => onEmail(pase)}
                    className="p-1.5 rounded-lg hover:bg-sky-500/10 text-text-muted hover:text-sky-400 transition-all" title="Enviar por email">
                    <Mail size={13} />
                </button>
            </div>
        </div>
    );
};

// ──── Evolución del LoteCard con drill-down ───────────────────────────────────

const LoteCardV2 = ({ lote, zonas, tiposCustom, onRefresh }) => {
    const [generando, setGenerando] = useState(false);
    const [importando, setImportando] = useState(false);
    const [expandido, setExpandido] = useState(false);
    const [pases, setPases] = useState([]);
    const [cargandoPases, setCargandoPases] = useState(false);

    const info = TIPO_INFO[lote.tipo_pase] || TIPO_INFO.simple;
    const Icon = info.icon;

    const cargarPases = useCallback(async () => {
        if (!expandido) return;
        setCargandoPases(true);
        try {
            const res = await api.get(`/pases/lotes/${lote.id}/pases`);
            setPases(res.data);
        } catch (e) {
            // demo
            setPases([
                { id: 'q1', nombre_portador: 'JUAN PÉREZ', cedula_portador: 'V-12345678', vehiculo_placa: 'ABC-123', zona_asignada_nombre: 'Zona VIP', puesto_asignado_codigo: 'A-04', activo: true },
                { id: 'q2', nombre_portador: 'MARÍA GÓMEZ', cedula_portador: 'V-87654321', vehiculo_placa: 'XYZ-789', activo: true },
                { id: 'q3', activo: true },
            ]);
        } finally {
            setCargandoPases(false);
        }
    }, [expandido, lote.id]);

    useEffect(() => { cargarPases(); }, [cargarPases]);

    const handleGenerarZip = async () => {
        setGenerando(true);
        try {
            await pasesService.generarZip(lote.id);
            toast.success('Generación de QRs iniciada');
            onRefresh?.();
        } catch (e) {
            toast.error('Error al generar QRs');
        } finally {
            setGenerando(false);
        }
    };

    const handleImportExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImportando(true);
        
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = evt.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
                
                // Remover el header y las filas vacias
                const dataRows = rows.slice(1);
                const validRows = dataRows.filter(r => r.some(v => v));

                if (validRows.length !== lote.cantidad_pases) {
                    toast.error(`Error: El Excel tiene ${validRows.length} registros, el lote requiere exactamente ${lote.cantidad_pases}.`);
                    setImportando(false);
                    return;
                }

                await pasesService.importarExcelJson(lote.id, { pases: validRows });
                toast.success('Datos importados con éxito');
                onRefresh?.();
            } catch (err) {
                toast.error(err.response?.data?.detail || 'Error en la importación');
            } finally {
                setImportando(false);
                e.target.value = '';
            }
        };

        reader.onerror = () => {
            toast.error('Error al leer el archivo');
            setImportando(false);
        };
        
        reader.readAsBinaryString(file);
    };

    const handleCompartir = async (pase) => {
        const url = pase.qr_url || `${window.location.origin}/portal-evento/${lote.codigo_serial}`;
        if (navigator.share) {
            await navigator.share({ title: `Pase BAGFM — ${lote.nombre_evento}`, url });
        } else {
            await navigator.clipboard.writeText(url);
            toast.success('Enlace copiado');
        }
    };

    const handleEmail = (pase) => {
        if (!pase.email) { toast.error('Este pase no tiene email registrado'); return; }
        toast('Enviando invitación...', { icon: '📧' });
        api.post(`/pases/${pase.id}/enviar-email`).then(() => toast.success('Email enviado')).catch(() => toast.error('Error al enviar email'));
    };

    return (
        <Card className="bg-bg-card/40 border-white/5 overflow-hidden group hover:bg-bg-high/80 transition-all">
            <CardContent className="p-0">
                <div className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-1 flex-wrap">
                                {badgeTipo(lote.tipo_pase)}
                                {lote.tipo_acceso && lote.tipo_acceso !== 'general' && badgeTipo(lote.tipo_acceso, lote.tipo_custom_label)}
                                <span className="text-[9px] font-mono text-text-muted opacity-40 ml-1">#{lote.codigo_serial.split('-').pop()}</span>
                            </div>
                            <h3 className="text-lg font-black text-text-main uppercase leading-tight truncate">{lote.nombre_evento}</h3>
                        </div>
                        <div className="p-2 bg-black/20 rounded-xl border border-white/5 shrink-0">
                            <Icon className={info.color} size={18} />
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-black/20 p-2 rounded-xl border border-white/5 text-center">
                            <div className="text-lg font-black text-primary">{lote.cantidad_pases}</div>
                            <div className="text-[7px] font-black uppercase text-text-muted/50">Pases</div>
                        </div>
                        <div className="bg-black/20 p-2 rounded-xl border border-white/5 text-center">
                            <div className="text-lg font-black text-success">{lote.pases_usados ?? '—'}</div>
                            <div className="text-[7px] font-black uppercase text-text-muted/50">Usados</div>
                        </div>
                        <div className="bg-black/20 p-2 rounded-xl border border-white/5 text-center">
                            <div className="text-[10px] font-black text-text-main">{new Date(lote.fecha_fin).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}</div>
                            <div className="text-[7px] font-black uppercase text-text-muted/50">Vence</div>
                        </div>
                    </div>

                    {/* Zona/Puesto asignado (si aplica) */}
                    {lote.zona_asignada_id && (
                        <div className="flex items-center gap-2 p-2 bg-success/5 border border-success/15 rounded-xl">
                            <ParkingSquare size={13} className="text-success shrink-0" />
                            <span className="text-[9px] font-black text-success uppercase">
                                {lote.zona_asignada_nombre || 'Zona asignada'}
                                {lote.puesto_asignado_codigo && ` · Puesto ${lote.puesto_asignado_codigo}`}
                            </span>
                        </div>
                    )}

                    {/* Estado del paquete */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest px-0.5">
                            <span className="text-text-muted">Estado</span>
                            <span className={lote.zip_generado ? 'text-success' : 'text-warning'}>
                                {lote.zip_generado ? 'DISPONIBLE' : 'PENDIENTE'}
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className={cn("h-full transition-all duration-1000", lote.zip_generado ? 'bg-success w-full' : 'bg-warning w-1/3 animate-pulse')} />
                        </div>
                    </div>

                    {/* Drill-down toggle */}
                    <button onClick={() => setExpandido(!expandido)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/3 border border-white/5 hover:bg-white/8 transition-all">
                        <span className="text-[9px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                            <QrCode size={12} className="text-primary" />
                            Ver pases individuales ({lote.cantidad_pases})
                        </span>
                        <ChevronRight size={14} className={cn("text-text-muted transition-transform", expandido && "rotate-90")} />
                    </button>

                    {/* Pases individuales */}
                    {expandido && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                            {cargandoPases ? (
                                Array(3).fill(0).map((_, i) => (
                                    <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
                                ))
                            ) : pases.length > 0 ? (
                                <div className="max-h-64 overflow-y-auto no-scrollbar space-y-1.5">
                                    {pases.map(p => (
                                        <PaseRow key={p.id} pase={p} zonas={zonas} onCompartir={handleCompartir} onEmail={handleEmail} />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-[9px] text-text-muted/30 uppercase tracking-widest py-3">Sin pases registrados</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="grid grid-cols-3 border-t border-white/5 bg-black/10">
                    {lote.tipo_pase === 'identificado' && !lote.zip_generado ? (
                        <label className="flex items-center justify-center gap-1.5 py-3 text-[9px] font-black uppercase text-text-muted hover:bg-white/5 cursor-pointer transition-all border-r border-white/5">
                            <input type="file" className="hidden" accept=".xlsx" onChange={handleImportExcel} disabled={importando} />
                            {importando ? <RefreshCw className="animate-spin" size={13} /> : <Upload size={13} />}
                            Importar
                        </label>
                    ) : (
                        <button onClick={handleGenerarZip} disabled={generando || lote.zip_generado}
                            className="flex items-center justify-center gap-1.5 py-3 text-[9px] font-black uppercase text-text-muted hover:bg-primary/10 hover:text-primary transition-all border-r border-white/5 disabled:opacity-30">
                            {generando ? <RefreshCw className="animate-spin" size={13} /> : (lote.zip_generado ? <CheckCircle2 className="text-success" size={13} /> : <Ticket size={13} />)}
                            {lote.zip_generado ? 'QRs OK' : 'Generar'}
                        </button>
                    )}

                    <button onClick={() => lote.zip_url && window.open(lote.zip_url, '_blank')} disabled={!lote.zip_generado}
                        className={cn("flex items-center justify-center gap-1.5 py-3 text-[9px] font-black uppercase transition-all border-r border-white/5",
                            lote.zip_generado ? "text-primary hover:bg-primary/10" : "text-text-muted/30 cursor-not-allowed")}>
                        <Download size={13} /> ZIP
                    </button>

                    <button onClick={() => handleCompartir({ qr_url: `${window.location.origin}/portal-evento/${lote.codigo_serial}` })}
                        className="flex items-center justify-center gap-1.5 py-3 text-[9px] font-black uppercase text-text-muted hover:bg-sky-500/10 hover:text-sky-400 transition-all">
                        <Share2 size={13} /> Link
                    </button>
                </div>
            </CardContent>
        </Card>
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

import SelectTactivo from '../../components/ui/SelectTactivo';

const ModalNuevoLote = ({ isOpen, onClose, zonas, tiposCustom, onCreated }) => {
    const { user } = useAuthStore();
    const [form, setForm] = useState({
        nombre_evento: '',
        fecha_inicio: new Date().toISOString().slice(0, 10),
        fecha_fin: '',
        cantidad_pases: 10,
        tipo_pase: 'simple',
        tipo_acceso: 'general',
        tipo_acceso_custom_id: '',
        multi_vehiculo: false,
        max_vehiculos: 1,
        zona_asignada_id: '',
        puesto_asignado_id: '',
        max_accesos_por_pase: 1,
    });
    const [puestosDisponibles, setPuestosDisponibles] = useState([]);
    const [guardando, setGuardando] = useState(false);
    const [maxPasesZona, setMaxPasesZona] = useState(9999);
    const [capacidadExcedida, setCapacidadExcedida] = useState(false);
    const [excelPases, setExcelPases] = useState(null);
    const [nombreTipoActivo, setNombreTipoActivo] = useState('');

    // Combinar tipos de acceso (Base + Custom de la entidad)
    const opcionesAcceso = useMemo(() => {
        const customMapped = tiposCustom.map(tc => ({
            id: tc.id,
            label: tc.nombre,
            icon: Tag,
            isCustom: true,
            color: tc.color
        }));
        return [...TIPOS_ACCESO_BASE, ...customMapped];
    }, [tiposCustom]);

    useEffect(() => {
        if (form.zona_asignada_id) {
            zonaService.getPuestosZona(form.zona_asignada_id)
                .then(p => setPuestosDisponibles(p.filter(px => px.estado === 'libre' || px.estado === 'reservado')))
                .catch(() => setPuestosDisponibles([]));
                
            // Calcular límite de pases si hay zona asignada
            const asig = zonas.find(z => z.zona_id === form.zona_asignada_id);
            if (asig) {
                let cupoParaTipo = 0;
                let nombreTipo = '';
                
                const opt = opcionesAcceso.find(o => o.id === form.tipo_acceso);
                if (opt) nombreTipo = opt.label.toUpperCase();
                setNombreTipoActivo(nombreTipo);

                if (nombreTipo && asig.distribucion_cupos && asig.distribucion_cupos[nombreTipo]) {
                    cupoParaTipo = parseInt(asig.distribucion_cupos[nombreTipo]);
                } else {
                    // Si no tiene distribución específica, asume el remanente (libres)
                    const reservadoOtros = Object.entries(asig.distribucion_cupos || {}).reduce((acc, [k, v]) => {
                        return k === nombreTipo ? acc : acc + parseInt(v);
                    }, 0);
                    cupoParaTipo = asig.cupo_asignado - asig.cupo_reservado_base - reservadoOtros;
                }
                
                const max = Math.max(0, cupoParaTipo);
                setMaxPasesZona(max);
                setCapacidadExcedida(form.cantidad_pases > max);
            }
        } else {
            setPuestosDisponibles([]);
            setMaxPasesZona(9999);
            setCapacidadExcedida(false);
        }
    }, [form.zona_asignada_id, form.tipo_acceso, zonas, opcionesAcceso, form.cantidad_pases]);

    const handleAjustarCapacidad = () => {
        setForm(prev => ({ ...prev, cantidad_pases: maxPasesZona }));
        setCapacidadExcedida(false);
    };

    const handleDescargarPlantilla = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ["NOMBRE COMPLETO", "CEDULA", "EMAIL", "TELEFONO", "PLACA VEHICULO 1", "PLACA VEHICULO 2", "PLACA VEHICULO 3"],
            ["EJ: JUAN PEREZ", "12345678", "juan@correo.com", "04120000000", "ABC-123", "", ""]
        ]);
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

        setGuardando(true);
        try {
            const payload = {
                ...form,
                entidad_id: user?.entidad_id,
                excel_data: excelPases, // Enviaremos los datos del excel si existen
                distribucion_automatica: capacidadExcedida // Indica si aceptó distribuir fuera de su cupo
            };
            await pasesService.crearLote(payload);
            toast.success('Lote de pases creado con éxito');
            onCreated?.();
            onClose();
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Error al crear lote');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="NUEVO LOTE DE PASES">
            <div className="space-y-6">
                {/* Tipo de pase */}
                <div>
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block mb-3">1. Selecciona el Tipo de Pase</label>
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

                {/* Tipo de acceso dinámico */}
                <div>
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block mb-4">
                        2. Clasificación del Portador
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {opcionesAcceso.map(t => {
                            const Icon = t.icon;
                            const sel = form.tipo_acceso === t.id;
                            return (
                                <button key={t.id} onClick={() => setForm({ ...form, tipo_acceso: t.id })}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-2xl border transition-all text-left group relative overflow-hidden",
                                        sel ? 'bg-white/10 border-white/30 text-text-main shadow-xl' : 'bg-white/5 border-white/5 text-text-muted hover:border-white/10 hover:bg-white/8'
                                    )}>
                                    {sel && <div className="absolute top-0 left-0 w-1 h-full bg-primary" />}
                                    <div className={cn("p-2 rounded-xl shrink-0 transition-colors", sel ? 'bg-primary/20 text-primary' : 'bg-black/20 group-hover:bg-black/40')}>
                                        <Icon size={16} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase leading-tight tracking-tight">{t.label}</span>
                                </button>
                            );
                        })}
                    </div>
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
                            onChange={(opt) => setForm({ ...form, zona_asignada_id: opt?.value || '', puesto_asignado_id: '' })}
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
                                            Solicitaste <span className="text-white">{form.cantidad_pases}</span> pases de tipo <span className="text-white">{nombreTipoActivo}</span>, pero solo hay <span className="text-white">{maxPasesZona}</span> cupos reservados en esta zona.
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
                                        onClick={() => setCapacidadExcedida(false)}
                                        className="flex-1 bg-white/5 hover:bg-white/10 text-text-muted text-[8px] font-black uppercase py-2 rounded-lg transition-all"
                                    >
                                        Distribución Libre
                                    </button>
                                </div>
                            </div>
                        )}

                        {puestosDisponibles.length > 0 && !capacidadExcedida && (
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2">
                                <label className="text-[9px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                                    <Hash size={11} className="text-primary" />
                                    Vincular a Puesto Específico
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    <button 
                                        onClick={() => setForm({ ...form, puesto_asignado_id: '' })}
                                        className={cn(
                                            "h-9 rounded-lg border text-[9px] font-black transition-all uppercase",
                                            !form.puesto_asignado_id ? 'bg-primary/20 border-primary text-primary' : 'bg-black/20 border-white/5 text-text-muted hover:bg-white/5'
                                        )}
                                    >
                                        Auto
                                    </button>
                                    {puestosDisponibles.slice(0, 7).map(p => (
                                        <button 
                                            key={p.id}
                                            onClick={() => setForm({ ...form, puesto_asignado_id: p.id })}
                                            className={cn(
                                                "h-9 rounded-lg border text-[9px] font-black transition-all",
                                                form.puesto_asignado_id === p.id ? 'bg-primary/20 border-primary text-primary' : 'bg-black/20 border-white/5 text-text-muted hover:bg-white/5'
                                            )}
                                        >
                                            {p.numero_puesto || p.codigo?.slice(-3)}
                                        </button>
                                    ))}
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
                    <Boton variant="ghost" className="flex-1 h-12" onClick={onClose}>Cancelar</Boton>
                    <Boton onClick={handleSubmit} disabled={guardando}
                        className="flex-[2] bg-primary text-bg-app h-12 font-black uppercase tracking-wider shadow-lg shadow-primary/20">
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
            <header className="relative overflow-hidden bg-bg-card/30 rounded-[2.5rem] border border-white/5 p-6 md:p-8">
                {/* Decoración de fondo */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -mr-32 -mt-32" />
                
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-lg shadow-primary/5">
                                <Calendar className="text-primary" size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black text-text-main uppercase tracking-tighter leading-none">
                                    Eventos y Pases
                                </h1>
                                <p className="text-[10px] md:text-xs text-text-muted font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                    Gestión de Accesos Masivos — {user?.entidad_nombre}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Boton 
                            onClick={() => setShowSolicitudModal(true)} 
                            variant="ghost"
                            className="h-12 px-6 gap-2 text-[10px] font-black uppercase border-white/10 rounded-2xl hover:bg-white/5 transition-all"
                        >
                            <Clock size={16} className="text-warning" /> 
                            Solicitar Evento
                        </Boton>
                        <Boton 
                            onClick={() => setShowModal(true)} 
                            disabled={zonas.length === 0}
                            className="h-12 px-8 gap-2 text-[11px] font-black uppercase bg-primary text-bg-app rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                            <PlusCircle size={18} /> 
                            Crear Nuevo Lote
                        </Boton>
                    </div>
                </div>
            </header>

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
                    <button onClick={fetchData} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                        <RefreshCw size={13} className={cn("text-text-muted", loading && 'animate-spin')} />
                    </button>
                </div>
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array(3).fill(0).map((_, i) => <div key={i} className="h-52 rounded-2xl bg-white/5 animate-pulse border border-white/5" />)}
                    </div>
                ) : lotes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {lotes.map(lote => (
                            <LoteCardV2 key={lote.id} lote={lote} zonas={zonas} tiposCustom={tiposCustom} onRefresh={fetchData} />
                        ))}
                    </div>
                ) : (
                    <div className="relative group py-24 flex flex-col items-center gap-6 bg-bg-card/10 rounded-[3rem] border border-dashed border-white/10 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/5 shadow-inner">
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
