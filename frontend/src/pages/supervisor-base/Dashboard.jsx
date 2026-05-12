import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Boton } from '../../components/ui/Boton';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { cn } from '../../lib/utils';
import { 
    Shield, Car, Users, AlertTriangle, Map, 
    Radio, Plus, Search, Filter, RefreshCw,
    Activity, ArrowRight, UserCheck, ShieldAlert,
    Clock, Hash, Phone, Building2, MapPin,
    AlertCircle, FileText, QrCode, ExternalLink,
    ChevronRight, Calendar, User, CheckCircle2
} from 'lucide-react';
import supervisorBaseService from '../../services/supervisorBase.service';
import { toast } from 'react-hot-toast';

// ──── Componentes de Apoyo ───────────────────────────────────────────────────

const AlertaBadge = ({ nivel }) => {
    const styles = {
        CRITICA: 'bg-danger/20 text-danger border-danger/30',
        ALTA: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
        MEDIA: 'bg-warning/20 text-warning border-warning/30',
        BAJA: 'bg-primary/20 text-primary border-primary/30',
        NINGUNA: 'bg-success/20 text-success border-success/30'
    };
    return (
        <span className={cn(
            "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border",
            styles[nivel] || styles.NINGUNA
        )}>
            ALERTA {nivel}
        </span>
    );
};

// ──── Componentes de Tab ──────────────────────────────────────────────────────

const CensoVehicularTab = () => {
    const [vehiculos, setVehiculos] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await supervisorBaseService.getCensoVehicular();
            setVehiculos(data.vehiculos || []);
        } catch (error) {
            toast.error("Error al cargar censo vehicular");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-black uppercase tracking-tight italic text-text-main">
                    Censo Vehicular en Tiempo Real
                </h2>
                <Boton variant="ghost" size="sm" onClick={loadData} className="h-8 w-8 p-0">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </Boton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
                    ))
                ) : vehiculos.length === 0 ? (
                    <div className="col-span-full p-12 text-center bg-bg-card/20 rounded-2xl border border-dashed border-white/10">
                        <Car size={48} className="mx-auto text-text-muted/30 mb-4" />
                        <p className="text-xs font-bold text-text-muted uppercase">No hay vehículos reportados en base</p>
                    </div>
                ) : (
                    vehiculos.map((v) => (
                        <Card key={v.vehiculo_pase_id} className="p-4 border-white/5 bg-bg-card/40 hover:bg-bg-high/40 transition-all group">
                            <div className="flex justify-between items-start">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={cn(
                                            "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest",
                                            v.estado === 'EN_ESTACIONAMIENTO' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                                        )}>
                                            {v.estado.replace('_', ' ')}
                                        </span>
                                        <span className="text-[10px] font-black text-primary uppercase tracking-tighter">
                                            {v.placa}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-black text-text-main uppercase truncate">
                                        {v.marca} {v.modelo}
                                    </h3>
                                    <div className="mt-2 space-y-1">
                                        <p className="text-[9px] text-text-muted font-bold uppercase flex items-center gap-1.5">
                                            <User size={10} /> {v.nombre_conductor}
                                        </p>
                                        <p className="text-[9px] text-text-muted font-bold uppercase flex items-center gap-1.5">
                                            <MapPin size={10} /> {v.zona_nombre || 'Sector Desconocido'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-2xl font-black text-text-main font-display">
                                        {v.horas_en_base || 0}h
                                    </div>
                                    <div className="text-[8px] font-black text-text-muted uppercase tracking-widest">
                                        En Base
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

const CensoPersonasTab = () => {
    const [personas, setPersonas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedPersona, setSelectedPersona] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const loadData = async (val) => {
        setLoading(true);
        try {
            const data = await supervisorBaseService.getCensoPersonas({ busqueda: val });
            setPersonas(data);
        } catch (error) {
            toast.error("Error al buscar personas");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (search.length > 3) loadData(search);
            else if (search === '') loadData('');
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const handleVerPerfil = async (cedula) => {
        try {
            toast.loading("Obteniendo trazabilidad...", { id: 'perfil' });
            const data = await supervisorBaseService.getPerfilPersona(cedula);
            setSelectedPersona(data);
            setIsModalOpen(true);
            toast.dismiss('perfil');
        } catch (error) {
            toast.error("Error al obtener perfil", { id: 'perfil' });
        }
    };

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                    type="text"
                    placeholder="IDENTIFICAR POR CÉDULA O NOMBRE..."
                    className="w-full h-14 bg-bg-card/40 border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-bold text-text-main focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-text-muted/40 uppercase"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 gap-3">
                {loading ? (
                    <div className="py-20 text-center animate-pulse">
                        <Users size={32} className="mx-auto text-primary/30 mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50">Consultando Base de Datos Central</span>
                    </div>
                ) : personas.length === 0 ? (
                    <div className="p-12 text-center bg-bg-card/20 rounded-2xl border border-dashed border-white/10">
                        <Users size={40} className="mx-auto text-text-muted/20 mb-4" />
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest opacity-40 italic">
                            Ingresa una cédula para iniciar trazabilidad
                        </p>
                    </div>
                ) : (
                    personas.map((p) => (
                        <button 
                            key={p.cedula}
                            onClick={() => handleVerPerfil(p.cedula)}
                            className="flex items-center gap-4 p-4 bg-bg-card/40 border border-white/5 rounded-2xl hover:bg-bg-high/40 transition-all text-left group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-bg-app border border-white/10 flex items-center justify-center text-text-muted group-hover:text-primary group-hover:border-primary/30 transition-all">
                                <User size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <AlertaBadge nivel={p.alerta_nivel} />
                                    <span className="text-[10px] font-black text-primary uppercase tracking-tighter">
                                        V-{p.cedula}
                                    </span>
                                </div>
                                <h3 className="text-sm font-black text-text-main uppercase truncate">
                                    {p.nombre_completo}
                                </h3>
                                <div className="flex items-center gap-3 mt-1 text-[9px] font-bold text-text-muted uppercase">
                                    <span>{p.total_pases} PASES</span>
                                    <span>{p.total_vehiculos} VEHÍCULOS</span>
                                    <span>{p.total_accesos} ACCESOS</span>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-text-muted/40 group-hover:text-primary transition-all" />
                        </button>
                    ))
                )}
            </div>

            {/* Modal de Perfil/Trazabilidad */}
            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title="Trazabilidad Sentinel"
                className="max-w-2xl"
            >
                {selectedPersona && (
                    <div className="space-y-6">
                        {/* Resumen */}
                        <div className="flex items-center gap-4 p-4 bg-bg-low/30 rounded-2xl border border-white/5">
                            <div className="w-16 h-16 rounded-2xl bg-bg-app border border-white/10 flex items-center justify-center text-primary">
                                <Shield size={32} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-text-main uppercase tracking-tight leading-none">
                                    {selectedPersona.nombre_completo}
                                </h2>
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">
                                    DOCUMENTO: V-{selectedPersona.cedula}
                                </p>
                                <div className="mt-2">
                                    <AlertaBadge nivel={selectedPersona.alerta_nivel} />
                                </div>
                            </div>
                        </div>

                        {/* Indicadores de Patrón */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <Card className="p-3 border-white/5 bg-bg-card/40">
                                <p className="text-[8px] font-black text-text-muted uppercase mb-1">Visitas 30D</p>
                                <p className="text-lg font-black text-text-main font-display">{selectedPersona.total_pases}</p>
                            </Card>
                            <Card className="p-3 border-white/5 bg-bg-card/40">
                                <p className="text-[8px] font-black text-text-muted uppercase mb-1">Vehículos</p>
                                <p className="text-lg font-black text-text-main font-display">{selectedPersona.total_vehiculos}</p>
                            </Card>
                            <Card className="p-3 border-white/5 bg-bg-card/40">
                                <p className="text-[8px] font-black text-text-muted uppercase mb-1">Punto Frec.</p>
                                <p className="text-lg font-black text-primary truncate uppercase">{selectedPersona.punto_frecuente || 'N/A'}</p>
                            </Card>
                            <Card className="p-3 border-white/5 bg-bg-card/40">
                                <p className="text-[8px] font-black text-text-muted uppercase mb-1">Alerta IA</p>
                                <p className="text-lg font-black text-danger font-display">{selectedPersona.puntos_alerta}</p>
                            </Card>
                        </div>

                        {/* Hallazgos IA */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                                <Activity size={14} /> Análisis de Patrones Sentinel
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                                {selectedPersona.hallazgos.map((h, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-danger/5 border border-danger/10 rounded-xl">
                                        <AlertTriangle size={14} className="text-danger shrink-0" />
                                        <p className="text-[10px] font-bold text-text-main uppercase">{h}</p>
                                    </div>
                                ))}
                                {selectedPersona.hallazgos.length === 0 && (
                                    <div className="flex items-center gap-3 p-3 bg-success/5 border border-success/10 rounded-xl">
                                        <CheckCircle2 size={14} className="text-success shrink-0" />
                                        <p className="text-[10px] font-bold text-success uppercase">Sin patrones anómalos detectados</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Listado de Vehículos */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                                <Car size={14} /> Vehículos Vinculados
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {selectedPersona.vehiculos.map((v, i) => (
                                    <div key={i} className="p-3 bg-bg-card/60 border border-white/5 rounded-xl flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black text-text-main uppercase">{v.marca} {v.modelo}</p>
                                            <p className="text-[11px] font-black text-primary uppercase">{v.placa}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[8px] font-black text-text-muted uppercase">Accesos</p>
                                            <p className="text-sm font-black text-text-main font-display">{v.usos}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

const PaseTemporalTab = () => {
    const [formData, setFormData] = useState({
        cedula: '',
        nombre: '',
        placa: '',
        motivo: '',
        zona_id: ''
    });
    const [zonas, setZonas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generatedPass, setGeneratedPass] = useState(null);

    useEffect(() => {
        const fetchZonas = async () => {
            try {
                const data = await supervisorBaseService.getCensoVehicular(); // Reuso para obtener zonas si el servicio lo da
                // Nota: mejor usar un endpoint de zonas genérico si existe
            } catch (error) {}
        };
        fetchZonas();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await supervisorBaseService.generarPaseTemporal(formData);
            setGeneratedPass(res);
            toast.success("Pase de seguridad generado");
        } catch (error) {
            toast.error(error.response?.data?.detail || "Error al generar pase");
        } finally {
            setLoading(false);
        }
    };

    if (generatedPass) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-6 animate-in zoom-in-95 duration-300">
                <div className="p-6 bg-white rounded-3xl shadow-2xl">
                    <QrCode size={200} className="text-bg-app" />
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-2xl font-black text-text-main uppercase tracking-tighter">Pase de Emergencia</h3>
                    <p className="text-sm font-bold text-text-muted uppercase">Válido por 24 horas // Link Táctico</p>
                    <div className="pt-4 flex flex-col gap-2">
                        <div className="px-4 py-2 bg-primary/10 rounded-xl border border-primary/20 text-primary font-black uppercase text-xs tracking-widest">
                            Token: {generatedPass.token_evento}
                        </div>
                        <Boton onClick={() => setGeneratedPass(null)} variant="ghost" className="text-[10px] font-black uppercase tracking-widest">
                            Generar otro pase
                        </Boton>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 bg-amber-400/10 border border-amber-400/20 rounded-2xl flex items-start gap-3">
                <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Atención: Emisión Directa</p>
                    <p className="text-[9px] text-amber-400/70 font-bold uppercase leading-tight">
                        Este pase elude los controles convencionales y se utiliza solo para interrogación en campo o emergencias de seguridad.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Cédula del Portador</label>
                    <input
                        className="w-full h-12 bg-bg-card/40 border border-white/10 rounded-xl px-4 text-sm font-bold text-text-main outline-none focus:ring-1 focus:ring-primary uppercase transition-all"
                        required
                        value={formData.cedula}
                        onChange={(e) => setFormData({...formData, cedula: e.target.value.toUpperCase()})}
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Nombre Completo</label>
                    <input
                        className="w-full h-12 bg-bg-card/40 border border-white/10 rounded-xl px-4 text-sm font-bold text-text-main outline-none focus:ring-1 focus:ring-primary uppercase transition-all"
                        required
                        value={formData.nombre}
                        onChange={(e) => setFormData({...formData, nombre: e.target.value.toUpperCase()})}
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Placa Vehículo</label>
                    <input
                        className="w-full h-12 bg-bg-card/40 border border-white/10 rounded-xl px-4 text-sm font-bold text-text-main outline-none focus:ring-1 focus:ring-primary uppercase transition-all"
                        required
                        value={formData.placa}
                        onChange={(e) => setFormData({...formData, placa: e.target.value.toUpperCase()})}
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Motivo / Caso</label>
                    <input
                        className="w-full h-12 bg-bg-card/40 border border-white/10 rounded-xl px-4 text-sm font-bold text-text-main outline-none focus:ring-1 focus:ring-primary uppercase transition-all"
                        required
                        placeholder="EJ: EMERGENCIA MÉDICA"
                        value={formData.motivo}
                        onChange={(e) => setFormData({...formData, motivo: e.target.value.toUpperCase()})}
                    />
                </div>
            </div>

            <Boton 
                type="submit" 
                isLoading={loading}
                className="w-full h-14 bg-primary text-bg-app font-black uppercase tracking-[0.2em] shadow-tactica"
            >
                Autorizar Ingreso Excepcional
            </Boton>
        </form>
    );
};

const MapaInfraccionesTab = () => {
    const [infracciones, setInfracciones] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await supervisorBaseService.getInfraccionesMapa();
            setInfracciones(data);
        } catch (error) {
            toast.error("Error al cargar mapa de infracciones");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    return (
        <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h2 className="text-lg font-black uppercase tracking-tight italic text-text-main">
                    Mapa de Incidentes Tácticos
                </h2>
                <Boton variant="ghost" size="sm" onClick={loadData} className="h-8 w-8 p-0">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </Boton>
            </div>

            {loading ? (
                <div className="h-64 bg-bg-card/20 rounded-3xl border border-white/5 flex items-center justify-center animate-pulse">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Cargando Coordenadas...</span>
                </div>
            ) : (
                <div className="space-y-3">
                    {infracciones.length === 0 ? (
                        <div className="p-12 text-center bg-bg-card/20 rounded-2xl border border-dashed border-white/10">
                            <CheckCircle2 size={40} className="mx-auto text-success/20 mb-4" />
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest opacity-40">
                                No hay infracciones geolocalizadas reportadas
                            </p>
                        </div>
                    ) : (
                        infracciones.map((inf) => (
                            <Card key={inf.id} className="p-4 border-danger/10 bg-danger/5 hover:bg-danger/10 transition-all flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-danger/20 border border-danger/30 flex items-center justify-center text-danger shrink-0">
                                    <AlertTriangle size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-danger text-white uppercase tracking-widest">
                                            {inf.gravedad}
                                        </span>
                                        <span className="text-[10px] font-black text-text-main uppercase tracking-tighter">
                                            {inf.tipo_infraccion}
                                        </span>
                                    </div>
                                    <p className="text-[11px] font-bold text-text-muted uppercase truncate italic">
                                        "{inf.descripcion}"
                                    </p>
                                    <p className="text-[9px] text-text-muted/60 font-black uppercase mt-1">
                                        📍 {inf.latitud.toFixed(6)}, {inf.longitud.toFixed(6)} • {new Date(inf.created_at).toLocaleTimeString()}
                                    </p>
                                </div>
                                <Boton size="sm" variant="ghost" className="shrink-0 h-10 w-10 p-0 text-danger hover:bg-danger/10">
                                    <MapPin size={18} />
                                </Boton>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

// ──── Main Dashboard ─────────────────────────────────────────────────────────

const DashboardSupervisorBase = () => {
    const [activeTab, setActiveTab] = useState('censo');
    const [situacion, setSituacion] = useState(null);

    const tabs = [
        { id: 'censo', label: 'Censo', icon: Car },
        { id: 'personas', label: 'Personas', icon: Users },
        { id: 'mapa', label: 'Mapa', icon: Map },
        { id: 'pases', label: 'Pases', icon: Shield },
    ];

    const loadSituacion = async () => {
        try {
            const data = await supervisorBaseService.getSituacion();
            setSituacion(data);
        } catch (error) {
            console.error("Error al cargar situación", error);
        }
    };

    useEffect(() => {
        loadSituacion();
        const interval = setInterval(loadSituacion, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-4 md:p-6 space-y-6 pb-24 max-w-[1400px] mx-auto animate-in fade-in duration-500">
            {/* Header Táctico */}
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 
                             bg-bg-card/30 p-4 md:p-5 rounded-2xl border border-white/5">
                <div className="min-w-0">
                    <h1 className="text-2xl font-black text-text-main flex items-center gap-3 tracking-tight">
                        <div className="p-2 bg-amber-400/10 rounded-xl shrink-0">
                            <Shield className="text-amber-400" size={24} />
                        </div>
                        <span className="uppercase tracking-tighter">Sentinel Interface</span>
                    </h1>
                    <p className="text-text-muted text-[10px] mt-1 flex items-center gap-1.5 px-1 font-black uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" />
                        Supervisor de Base — Control Táctico Nivel 1
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                    <Card className="flex items-center gap-3 px-4 py-2 bg-bg-card/60 border-white/5 shrink-0">
                        <Activity size={14} className="text-primary" />
                        <div>
                            <p className="text-[8px] font-black text-text-muted uppercase tracking-tighter">Censo</p>
                            <p className="text-xs font-black text-text-main font-display">{situacion?.vehiculos_en_base || 0}</p>
                        </div>
                    </Card>
                    <Card className="flex items-center gap-3 px-4 py-2 bg-bg-card/60 border-white/5 shrink-0">
                        <ShieldAlert size={14} className="text-danger" />
                        <div>
                            <p className="text-[8px] font-black text-text-muted uppercase tracking-tighter">Incidentes</p>
                            <p className="text-xs font-black text-danger font-display">{situacion?.alertas_activas || 0}</p>
                        </div>
                    </Card>
                </div>
            </header>

            {/* Tabs de Navegación */}
            <div className="flex p-1 bg-bg-card/40 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all min-w-[100px]",
                                isActive 
                                    ? "bg-primary text-bg-app shadow-lg" 
                                    : "text-text-muted hover:text-text-main hover:bg-white/5"
                            )}
                        >
                            <Icon size={16} className={isActive ? 'text-bg-app' : 'text-primary'} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Contenido Dinámico */}
            <main className="animate-in slide-in-from-bottom-2 duration-300 min-h-[400px]">
                {activeTab === 'censo' && <CensoVehicularTab />}
                {activeTab === 'personas' && <CensoPersonasTab />}
                {activeTab === 'mapa' && <MapaInfraccionesTab />}
                {activeTab === 'pases' && <PaseTemporalTab />}
            </main>
        </div>
    );
};

export default DashboardSupervisorBase;
