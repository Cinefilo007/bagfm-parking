import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Car, ParkingSquare, CheckCircle2, XCircle,
    RefreshCw, Shield, Zap, Activity,
    LogIn, LogOut, LayoutGrid, Share2,
    Bell, Clock, Tag, Lock
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/auth.store';
import { Card } from '../../components/ui/Card';
import { parqueroService } from '../../services/parquero.service';
import ModalInfoPuesto from '../../components/parquero/ModalInfoPuesto';
import ReporteRapido from '../../components/infracciones/ReporteRapido';

// ──────────────────────────────────────────────────────────────────────────────
// Sub-componentes
// ──────────────────────────────────────────────────────────────────────────────

const KpiCard = ({ label, valor, icon: Icon, color = 'text-primary' }) => (
    <Card className="flex flex-col p-4 relative overflow-hidden group hover:bg-bg-high transition-all border-white/5 rounded-2xl">
        <div className="flex justify-between items-start mb-3">
            <Icon size={22} className={color} />
            <div className="w-1.5 h-1.5 rounded-full bg-primary/20 group-hover:bg-primary/50 transition-colors" />
        </div>
        <div className="font-black text-2xl tracking-tighter leading-none mb-1 text-text-main">{valor}</div>
        <div className="text-[9px] uppercase font-black tracking-widest text-text-muted opacity-60">{label}</div>
    </Card>
);

// ── Tarjeta de puesto en el mapa ──────────────────────────────────────────
const TarjetaPuesto = ({ puesto, vehiculosEnZona = [], onClick }) => {
    const esBase = puesto.reservado_base === true;
    const esEntidad = !esBase && puesto.reservado_entidad_id;
    const esOcupado = puesto.estado === 'ocupado';

    // Buscar vehículo si está ocupado
    const vehiculo = esOcupado 
        ? vehiculosEnZona.find(v => v.puesto_asignado_id === puesto.id || (v.puesto_codigo === puesto.numero_puesto))
        : null;

    const config = esBase
        ? { border: 'border-indigo-500/30', bg: 'bg-indigo-500/8', dot: 'bg-indigo-400', icon: 'text-indigo-400' }
        : esEntidad
        ? { border: 'border-warning/30', bg: 'bg-warning/8', dot: 'bg-warning', icon: 'text-warning' }
        : puesto.estado === 'libre'
        ? { border: 'border-success/30', bg: 'bg-success/5', dot: 'bg-success', icon: 'text-success' }
        : esOcupado
        ? { border: 'border-danger/20', bg: 'bg-danger/5', dot: 'bg-danger', icon: 'text-danger' }
        : puesto.estado === 'mantenimiento'
        ? { border: 'border-white/10', bg: 'bg-white/3', dot: 'bg-text-muted', icon: 'text-text-muted/50' }
        : { border: 'border-white/10', bg: 'bg-white/5', dot: 'bg-text-muted', icon: 'text-text-muted' };

    // Regla de oro: Si está ocupado, la P es roja
    const iconColor = esOcupado ? 'text-danger' : config.icon;
    const dotColor = esOcupado ? 'bg-danger' : config.dot;

    const etiqueta = esBase ? 'BASE'
        : esEntidad ? (puesto.tipo_acceso_nombre || 'VIP')
        : puesto.estado === 'libre' ? 'Libre'
        : esOcupado ? 'Ocup.'
        : puesto.estado === 'mantenimiento' ? 'Mant.'
        : puesto.estado || '—';

    return (
        <button
            onClick={onClick}
            className={cn(
                'relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all active:scale-95 hover:brightness-110',
                config.border, config.bg,
                esOcupado && 'border-danger/20 bg-danger/5'
            )}
        >
            <div className={cn('w-2.5 h-2.5 rounded-full mb-1.5', dotColor)} />
            <ParkingSquare size={18} className={cn(iconColor, esOcupado && 'animate-pulse')} />
            <span className="text-[8px] font-black uppercase tracking-tight mt-1 text-text-main leading-none">
                {puesto.numero_puesto || puesto.codigo || '—'}
            </span>
            
            {esOcupado && vehiculo?.placa ? (
                <span className="text-[7px] font-black text-danger uppercase tracking-tighter mt-1 animate-pulse">
                    {vehiculo.placa}
                </span>
            ) : (
                <span className={cn(
                    'text-[6px] font-black uppercase tracking-wide leading-none mt-0.5',
                    !esOcupado && esBase ? 'text-indigo-400' : !esOcupado && esEntidad ? 'text-warning' : iconColor
                )}>
                    {etiqueta}
                </span>
            )}
            
            {esBase && <Lock size={8} className="absolute top-1 right-1 text-indigo-400/60" />}
        </button>
    );
};

// ── Vehículo en zona ──────────────────────────────────────────────────────
const TarjetaVehiculo = ({ vehiculo }) => {
    const tiempoDisplay = () => {
        if (!vehiculo.tiempo_en_zona_min) return null;
        const h = Math.floor(vehiculo.tiempo_en_zona_min / 60);
        const m = vehiculo.tiempo_en_zona_min % 60;
        return h > 0 ? `${h}h ${m}min` : `${m} min`;
    };

    return (
        <div className="flex items-center gap-3 p-3 bg-bg-card/30 rounded-xl border border-white/5">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 border border-primary/20">
                <Car size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-text-main uppercase tracking-tight">{vehiculo.placa}</p>
                <p className="text-[9px] text-text-muted uppercase tracking-wide">
                    {[vehiculo.color, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' · ') || 'Sin datos'}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {vehiculo.puesto_codigo && (
                        <span className="inline-flex items-center gap-1 text-[8px] font-black text-success bg-success/10 px-2 py-0.5 rounded-full">
                            <ParkingSquare size={8} /> {vehiculo.puesto_codigo}
                        </span>
                    )}
                    {tiempoDisplay() && (
                        <span className="inline-flex items-center gap-1 text-[8px] text-text-muted bg-white/5 px-2 py-0.5 rounded-full">
                            <Clock size={8} /> {tiempoDisplay()}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Leyenda del mapa ─────────────────────────────────────────────────────
const ItemLeyenda = ({ color, label, count }) => (
    <div className="flex items-center gap-1.5">
        <div className={cn('w-2 h-2 rounded-full', color)} />
        <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">{label}</span>
        {count !== undefined && <span className="text-[9px] font-black text-text-main ml-0.5">{count}</span>}
    </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
const DashboardParquero = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [zonaInfo, setZonaInfo] = useState(null);
    const [puestos, setPuestos] = useState([]);
    const [vehiculosEnZona, setVehiculosEnZona] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [puestoModal, setPuestoModal] = useState(null); // puesto seleccionado

    const cargarDatos = useCallback(async () => {
        try {
            // Cargar zona con KPIs reales
            const zonaData = await parqueroService.getMiZona();
            setZonaInfo(zonaData);

            if (zonaData?.id) {
                const [puestosData, vehiculosData] = await Promise.all([
                    parqueroService.getPuestosZona(zonaData.id),
                    parqueroService.getVehiculosEnZona(zonaData.id),
                ]);

                // Si la zona NO usa puestos identificados pero tiene capacidad definida,
                // generamos puestos virtuales basados en la capacidad
                if (!zonaData.usa_puestos_identificados && (!puestosData || puestosData.length === 0)) {
                    const puestosVirtuales = generarPuestosVirtuales(zonaData);
                    setPuestos(puestosVirtuales);
                } else {
                    setPuestos(puestosData || []);
                }

                setVehiculosEnZona(vehiculosData || []);
            }
        } catch (e) {
            console.warn('Error al cargar datos del parquero:', e);
            toast.error('No se pudieron cargar los datos de la zona');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargarDatos();
        const interval = setInterval(cargarDatos, 30000);
        return () => clearInterval(interval);
    }, [cargarDatos]);

    // ── Generar puestos virtuales si la zona no tiene físicos ──────────────
    const generarPuestosVirtuales = (zona) => {
        const total            = zona.capacidad_total   || 0;
        const nBase            = zona.kpis?.reservados_base    || 0;
        const nEntidad         = zona.kpis?.reservados_entidad || 0;
        
        const ocBase           = zona.kpis?.ocupados_base      || 0;
        const ocEntidad        = zona.kpis?.ocupados_entidad   || 0;
        const ocGeneral        = zona.kpis?.ocupados_general   || 0;

        return Array.from({ length: total }, (_, i) => {
            const num = String(i + 1).padStart(2, '0');
            
            // ── CASO A: Reservados BASE ──
            if (i < nBase) {
                return {
                    id: `virtual-base-${i}`,
                    numero_puesto: `B-${num}`,
                    estado: i < ocBase ? 'ocupado' : 'libre',
                    reservado_base: true,
                    virtual: true,
                };
            }
            
            // ── CASO B: Reservados ENTIDAD (VIP/ETC) ──
            if (i < nBase + nEntidad) {
                const relativeIdx = i - nBase;
                return {
                    id: `virtual-ent-${i}`,
                    numero_puesto: `V-${num}`,
                    estado: relativeIdx < ocEntidad ? 'ocupado' : 'libre',
                    reservado_base: false,
                    reservado_entidad_id: 'entidad',
                    virtual: true,
                };
            }
            
            // ── CASO C: GENERALES ──
            const relativeIdx = i - nBase - nEntidad;
            return {
                id: `virtual-${i}`,
                numero_puesto: `P-${num}`,
                estado: relativeIdx < ocGeneral ? 'ocupado' : 'libre',
                reservado_base: false,
                reservado_entidad_id: null,
                virtual: true,
            };
        });
    };

    // ── KPIs reales desde el backend ──────────────────────────────────────
    const kpis = zonaInfo?.kpis || {
        libres:             puestos.filter(p => p.estado === 'libre' && !p.reservado_base && !p.reservado_entidad_id).length,
        ocupados:           puestos.filter(p => p.estado === 'ocupado').length,
        reservados:         puestos.filter(p => p.reservado_base || p.reservado_entidad_id || p.estado === 'reservado').length,
        reservados_base:    puestos.filter(p => p.reservado_base).length,
        reservados_entidad: puestos.filter(p => p.reservado_entidad_id && !p.reservado_base).length,
        mantenimiento:      puestos.filter(p => p.estado === 'mantenimiento').length,
        total:              puestos.length,
    };


    const handleCompartirUbicacion = async () => {
        const nombre = zonaInfo?.nombre || 'Zona de Estacionamiento';
        const mensaje = `Parking BAGFM — ${nombre}`;
        if (zonaInfo?.latitud && zonaInfo?.longitud) {
            const url = `https://maps.google.com/?q=${zonaInfo.latitud},${zonaInfo.longitud}`;
            if (navigator.share) { await navigator.share({ title: `BAGFM - ${nombre}`, text: mensaje, url }); return; }
            await navigator.clipboard.writeText(`${mensaje}\n${url}`);
            toast.success('Ubicación copiada');
        } else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const url = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
                if (navigator.share) await navigator.share({ title: `BAGFM - ${nombre}`, text: mensaje, url });
                else { await navigator.clipboard.writeText(`${mensaje}\n${url}`); toast.success('Ubicación copiada'); }
            }, () => toast.error('No se pudo obtener GPS'));
        } else {
            toast.error('Comparte la ubicación manualmente');
        }
    };

    const navegarConZona = (ruta) => {
        navigate(ruta, { state: { zonaData: zonaInfo } });
    };

    if (cargando) return (
        <div className="min-h-screen bg-bg-app flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Zap className="text-primary animate-pulse" size={48} />
                <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.4em]">Cargando zona...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-bg-app pb-24">
            <ReporteRapido zonaId={zonaInfo?.id} />

            {/* ── Header ── */}
            <header className="sticky top-0 z-40 bg-bg-card/90 backdrop-blur-md border-b border-white/5 px-4 py-3">
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                            <ParkingSquare className="text-primary" size={18} />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-text-main uppercase tracking-wide leading-none">Portal Parquero</h1>
                            <p className="text-[9px] text-text-muted font-bold flex items-center gap-1 mt-0.5">
                                <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                                {zonaInfo?.nombre || 'Sin zona asignada'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navegarConZona('/parquero/notificaciones')}
                            className="relative flex items-center gap-1.5 h-9 px-3 rounded-xl bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase hover:bg-primary/20 transition-all"
                        >
                            <Bell size={13} />
                        </button>
                        <button
                            onClick={handleCompartirUbicacion}
                            className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white/5 text-text-muted border border-white/10 text-[9px] font-black uppercase hover:bg-white/10 transition-all"
                            title="Compartir ubicación de zona"
                        >
                            <Share2 size={13} />
                        </button>
                        <button onClick={() => cargarDatos()} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all active:scale-90">
                            <RefreshCw size={16} className="text-text-muted" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-2xl mx-auto p-4 space-y-4">

                {/* ── Sin zona asignada ── */}
                {!zonaInfo && (
                    <Card className="p-8 rounded-2xl border-white/5 text-center">
                        <ParkingSquare size={40} className="mx-auto mb-3 text-text-muted/30" />
                        <p className="text-sm font-black text-text-muted uppercase tracking-widest">Sin zona asignada</p>
                        <p className="text-[10px] text-text-muted/60 mt-1">Contacta a tu supervisor</p>
                    </Card>
                )}

                {zonaInfo && <>

                    {/* ── KPIs ── */}
                    <div className="grid grid-cols-4 gap-2">
                        <KpiCard label="Libres"    valor={kpis.libres}    icon={CheckCircle2} color="text-success" />
                        <KpiCard label="Ocupados"  valor={kpis.ocupados}  icon={Car}          color="text-danger"  />

                        {/* Reservados: card expandida con desglose */}
                        <Card className="flex flex-col p-4 relative overflow-hidden group hover:bg-bg-high transition-all border-white/5 rounded-2xl">
                            <div className="flex justify-between items-start mb-1">
                                <Shield size={22} className="text-warning" />
                                <div className="w-1.5 h-1.5 rounded-full bg-warning/20 group-hover:bg-warning/50 transition-colors" />
                            </div>
                            <div className="font-black text-2xl tracking-tighter leading-none text-text-main">{kpis.reservados}</div>
                            <div className="text-[9px] uppercase font-black tracking-widest text-text-muted opacity-60 mt-0.5">Reservados</div>
                            {(kpis.reservados_base > 0 || kpis.reservados_entidad > 0) && (
                                <div className="flex flex-col gap-0.5 mt-1.5 border-t border-white/5 pt-1.5">
                                    {kpis.reservados_base > 0 && (
                                        <span className="text-[7px] font-black text-indigo-400 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" /> {kpis.reservados_base} BASE
                                        </span>
                                    )}
                                    {kpis.reservados_entidad > 0 && (
                                        <span className="text-[7px] font-black text-warning flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 bg-warning rounded-full" /> {kpis.reservados_entidad} ENTIDAD
                                        </span>
                                    )}
                                </div>
                            )}
                        </Card>

                        <KpiCard label="Total"     valor={kpis.total}     icon={LayoutGrid}   color="text-primary" />
                    </div>


                    {/* ── RECIBIR / DESPACHAR ── */}
                    <Card className="p-4 rounded-2xl border-white/5">
                        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Activity size={12} className="text-primary" />
                            Operaciones de Zona
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => navegarConZona('/parquero/recibir')}
                                className="flex flex-col items-center gap-2 p-5 rounded-xl bg-success/5 border-2 border-success/30 hover:bg-success/10 hover:border-success/50 active:scale-95 transition-all"
                            >
                                <div className="w-12 h-12 bg-success/15 rounded-xl flex items-center justify-center">
                                    <LogIn size={26} className="text-success" />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-widest text-success">Recibir</span>
                                <span className="text-[8px] text-text-muted uppercase tracking-wide">Registrar Llegada</span>
                            </button>
                            <button
                                onClick={() => navegarConZona('/parquero/despachar')}
                                className="flex flex-col items-center gap-2 p-5 rounded-xl bg-warning/5 border-2 border-warning/30 hover:bg-warning/10 hover:border-warning/50 active:scale-95 transition-all"
                            >
                                <div className="w-12 h-12 bg-warning/15 rounded-xl flex items-center justify-center">
                                    <LogOut size={26} className="text-warning" />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-widest text-warning">Despachar</span>
                                <span className="text-[8px] text-text-muted uppercase tracking-wide">Registrar Salida</span>
                            </button>
                        </div>
                    </Card>

                    {/* ── MAPA DE PUESTOS ── */}
                    <Card className="p-4 rounded-2xl border-white/5">
                        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                            <LayoutGrid size={12} className="text-primary" />
                            Mapa de Puestos — {zonaInfo.nombre}
                        </p>

                        {/* Leyenda */}
                        <div className="flex flex-wrap gap-3 mb-4 px-1">
                            <ItemLeyenda color="bg-indigo-400" label="Base"    count={kpis.reservados_base    || 0} />
                            <ItemLeyenda color="bg-warning"    label="Entidad" count={kpis.reservados_entidad || 0} />
                            <ItemLeyenda color="bg-success"    label="Libre"   count={kpis.libres} />
                            <ItemLeyenda color="bg-danger"     label="Ocup."   count={kpis.ocupados} />
                            {(kpis.mantenimiento || 0) > 0 && <ItemLeyenda color="bg-text-muted" label="Mant." count={kpis.mantenimiento} />}
                        </div>


                        {/* Grid de puestos */}
                        {puestos.length > 0 ? (
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                {puestos.map(puesto => (
                                    <TarjetaPuesto
                                        key={puesto.id}
                                        puesto={puesto}
                                        vehiculosEnZona={vehiculosEnZona}
                                        onClick={() => !puesto.virtual && setPuestoModal(puesto)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-text-muted/40">
                                <ParkingSquare size={36} className="mx-auto mb-3 opacity-30" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Zona sin mapa de puestos físicos</p>
                                <p className="text-[9px] opacity-60 mt-1">Capacidad total: {zonaInfo.capacidad_total}</p>
                            </div>
                        )}
                    </Card>

                    {/* ── VEHÍCULOS EN ZONA ── */}
                    <Card className="p-4 rounded-2xl border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                            <Activity size={14} className="text-primary" />
                            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                                Vehículos en Zona ({vehiculosEnZona.length})
                            </p>
                        </div>
                        <div className="space-y-2">
                            {vehiculosEnZona.map(v => (
                                <TarjetaVehiculo key={v.id} vehiculo={v} />
                            ))}
                            {vehiculosEnZona.length === 0 && (
                                <div className="text-center py-6 text-text-muted/40">
                                    <Car size={32} className="mx-auto mb-2 opacity-40" />
                                    <p className="text-[9px] font-black uppercase tracking-widest">Sin vehículos activos en zona</p>
                                </div>
                            )}
                        </div>
                    </Card>

                </>}
            </div>

            {/* ── Modal info puesto ── */}
            {puestoModal && (
                <ModalInfoPuesto
                    puesto={puestoModal}
                    vehiculosEnZona={vehiculosEnZona}
                    onClose={() => setPuestoModal(null)}
                    onActualizar={() => { setPuestoModal(null); cargarDatos(); }}
                />
            )}
        </div>
    );
};

export default DashboardParquero;
