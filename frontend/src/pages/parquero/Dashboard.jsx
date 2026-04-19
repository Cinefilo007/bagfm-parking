import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Car, ParkingSquare, Scan, CheckCircle2, XCircle,
    RefreshCw, Clock, Shield, Zap, Activity,
    AlertTriangle, LogIn, LogOut, Users, MapPin,
    LayoutGrid, List, ChevronRight, Circle, Share2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/auth.store';
import { Card } from '../../components/ui/Card';
import { Boton } from '../../components/ui/Boton';
import { parqueroService } from '../../services/parquero.service';
import { QRScanner } from '../../components/alcabala/QRScanner';
import ReporteRapido from '../../components/infracciones/ReporteRapido';

// ──── Componentes internos ────────────────────────────────────────────────────

const KpiCard = ({ label, valor, icon: Icon, color = 'text-primary' }) => (
    <Card className="flex flex-col p-4 relative overflow-hidden group hover:bg-bg-high transition-all border-white/5 rounded-2xl">
        <div className="flex justify-between items-start mb-3">
            <Icon size={22} className={color} />
            <div className="w-1.5 h-1.5 rounded-full bg-primary/20 group-hover:bg-primary/50 transition-colors" />
        </div>
        <div className="font-black text-2xl tracking-tighter leading-none mb-1 text-text-main">
            {valor}
        </div>
        <div className="text-[9px] uppercase font-black tracking-widest text-text-muted opacity-60">
            {label}
        </div>
    </Card>
);

const EstadoPuesto = ({ label, color, count }) => (
    <div className="flex items-center gap-2">
        <div className={cn("w-2 h-2 rounded-full", color)} />
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{label}</span>
        <span className="ml-auto text-[10px] font-black text-text-main">{count}</span>
    </div>
);

const TarjetaPuesto = ({ puesto, onAsignar, seleccionado, onClick }) => {
    const estadoColor = {
        libre: 'border-success/30 bg-success/5',
        ocupado: 'border-danger/20 bg-danger/5',
        reservado: 'border-warning/30 bg-warning/5',
        mantenimiento: 'border-text-muted/20 bg-white/3',
    };
    const dotColor = {
        libre: 'bg-success',
        ocupado: 'bg-danger',
        reservado: 'bg-warning',
        mantenimiento: 'bg-text-muted',
    };

    const estadoLabel = {
        libre: 'Libre',
        ocupado: 'Ocupado',
        reservado: 'Reservado',
        mantenimiento: 'Mant.',
    };

    return (
        <button
            onClick={onClick}
            disabled={puesto.estado !== 'libre'}
            className={cn(
                "relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all active:scale-95",
                estadoColor[puesto.estado] || 'border-white/10',
                puesto.estado === 'libre' && 'hover:border-primary/50 hover:bg-primary/10 cursor-pointer',
                puesto.estado !== 'libre' && 'cursor-not-allowed opacity-60',
                seleccionado && puesto.estado === 'libre' && 'border-primary shadow-[0_0_12px_rgba(var(--color-primary),0.3)] ring-1 ring-primary/50'
            )}
        >
            <div className={cn(
                "w-3 h-3 rounded-full mb-1.5",
                dotColor[puesto.estado] || 'bg-text-muted',
                seleccionado && puesto.estado === 'libre' && 'animate-pulse'
            )} />
            <ParkingSquare size={20} className={cn(
                puesto.estado === 'libre' ? 'text-success' : 
                puesto.estado === 'ocupado' ? 'text-danger/70' : 
                puesto.estado === 'reservado' ? 'text-warning/70' : 'text-text-muted/50'
            )} />
            <span className="text-[8px] font-black uppercase tracking-wider mt-1 text-text-main">{puesto.codigo || puesto.numero || '—'}</span>
            <span className={cn(
                "text-[7px] font-bold uppercase",
                puesto.estado === 'libre' ? 'text-success' : 
                puesto.estado === 'ocupado' ? 'text-danger/70' :
                puesto.estado === 'reservado' ? 'text-warning/70' : 'text-text-muted/50'
            )}>{estadoLabel[puesto.estado] || puesto.estado}</span>
            {seleccionado && puesto.estado === 'libre' && (
                <div className="absolute inset-0 rounded-xl border-2 border-primary/70 animate-pulse" />
            )}
        </button>
    );
};

const TarjetaVehiculo = ({ vehiculo, puestos, onAsignarPuesto }) => (
    <div className="flex items-start gap-3 p-3 bg-bg-card/30 rounded-xl border border-white/5">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 border border-primary/20">
            <Car size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-text-main uppercase tracking-tight">{vehiculo.placa}</p>
            <p className="text-[9px] text-text-muted uppercase tracking-wide">{vehiculo.marca} {vehiculo.modelo}</p>
            {vehiculo.puesto_asignado_id ? (
                <span className="inline-flex items-center gap-1 text-[8px] font-black text-success bg-success/10 px-2 py-0.5 rounded-full mt-1">
                    <CheckCircle2 size={9} /> Puesto asignado
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 text-[8px] font-black text-warning bg-warning/10 px-2 py-0.5 rounded-full mt-1">
                    <Circle size={9} /> Sin puesto
                </span>
            )}
        </div>
        {!vehiculo.puesto_asignado_id && (
            <button
                onClick={() => onAsignarPuesto(vehiculo)}
                className="shrink-0 h-8 px-3 rounded-lg bg-primary/20 text-primary border border-primary/30 flex items-center gap-1.5 text-[9px] font-black uppercase"
            >
                <ParkingSquare size={12} />
                Asignar
            </button>
        )}
    </div>
);

// ──── Página Principal ────────────────────────────────────────────────────────

const VISTAS = { PANEL: 'panel', SCANNER: 'scanner', MAPA: 'mapa' };

const DashboardParquero = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [vista, setVista] = useState(VISTAS.PANEL);
    const [zonaInfo, setZonaInfo] = useState(null);
    const [puestos, setPuestos] = useState([]);
    const [vehiculosEnZona, setVehiculosEnZona] = useState([]);
    const [vehiculosPendientes, setVehiculosPendientes] = useState([]);
    const [cargando, setCargando] = useState(true);

    // Estados del scanner
    const [modoScanner, setModoScanner] = useState(null); // 'llegada' | 'salida'
    const [escaneando, setEscaneando] = useState(false);
    const [ultimoEscaneo, setUltimoEscaneo] = useState(null);
    const scannerRef = useRef(null);

    // Asignación de puesto
    const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState(null);
    const [puestoSeleccionado, setPuestoSeleccionado] = useState(null);
    const [asignando, setAsignando] = useState(false);

    const cargarDatos = useCallback(async () => {
        try {
            const zona = await parqueroService.getMiZona();
            setZonaInfo(zona);
            if (zona?.id) {
                const [p, vz] = await Promise.all([
                    parqueroService.getPuestosZona(zona.id),
                    parqueroService.getVehiculosEnZona(zona.id),
                ]);
                setPuestos(p || []);
                setVehiculosEnZona(vz || []);
            }
        } catch (e) {
            // Si la API falla, usar datos simulados para UI
            setZonaInfo({ id: 'demo', nombre: 'Zona Alpha - Parqueo VIP', capacidad: 12 });
            setPuestos([
                { id: '1', codigo: 'A-01', estado: 'libre' },
                { id: '2', codigo: 'A-02', estado: 'ocupado' },
                { id: '3', codigo: 'A-03', estado: 'libre' },
                { id: '4', codigo: 'A-04', estado: 'reservado' },
                { id: '5', codigo: 'A-05', estado: 'libre' },
                { id: '6', codigo: 'A-06', estado: 'ocupado' },
                { id: '7', codigo: 'A-07', estado: 'libre' },
                { id: '8', codigo: 'A-08', estado: 'libre' },
                { id: '9', codigo: 'A-09', estado: 'mantenimiento' },
                { id: '10', codigo: 'A-10', estado: 'libre' },
                { id: '11', codigo: 'A-11', estado: 'ocupado' },
                { id: '12', codigo: 'A-12', estado: 'libre' },
            ]);
            setVehiculosEnZona([
                { id: 'v1', placa: 'AB123CD', marca: 'TOYOTA', modelo: 'HILUX', puesto_asignado_id: '2' },
                { id: 'v2', placa: 'XZ456FG', marca: 'FORD', modelo: 'F150', puesto_asignado_id: null },
                { id: 'v3', placa: 'NG789HK', marca: 'CHEVROLET', modelo: 'SILVERADO', puesto_asignado_id: '6' },
            ]);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargarDatos();
        const interval = setInterval(cargarDatos, 30000);
        return () => clearInterval(interval);
    }, [cargarDatos]);

    const stats = {
        libres: puestos.filter(p => p.estado === 'libre').length,
        ocupados: puestos.filter(p => p.estado === 'ocupado').length,
        reservados: puestos.filter(p => p.estado === 'reservado').length,
        total: puestos.length,
    };

    const handleScanQR = async (qrToken) => {
        if (escaneando) return;
        setEscaneando(true);
        try {
            if (modoScanner === 'llegada' && zonaInfo?.id) {
                const result = await parqueroService.registrarLlegada(qrToken, zonaInfo.id);
                setUltimoEscaneo({ tipo: 'llegada', ...result });
                toast.success('Vehículo registrado en zona', { icon: '🚗' });
            } else if (modoScanner === 'salida') {
                const result = await parqueroService.registrarSalida(qrToken);
                setUltimoEscaneo({ tipo: 'salida', ...result });
                toast.success('Salida registrada', { icon: '✅' });
            }
            await cargarDatos();
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Error al procesar QR');
        } finally {
            setEscaneando(false);
        }
    };

    const handleAsignarPuesto = async () => {
        if (!vehiculoSeleccionado || !puestoSeleccionado) return;
        setAsignando(true);
        try {
            await parqueroService.asignarPuesto(vehiculoSeleccionado.id, puestoSeleccionado.id);
            toast.success(`Puesto ${puestoSeleccionado.codigo} asignado a ${vehiculoSeleccionado.placa}`);
            setVehiculoSeleccionado(null);
            setPuestoSeleccionado(null);
            await cargarDatos();
        } catch (e) {
            toast.error('No se pudo asignar el puesto');
        } finally {
            setAsignando(false);
        }
    };

    const handleCompartirUbicacion = async () => {
        const nombre = zonaInfo?.nombre || 'Zona de Estacionamiento';
        let mensaje = `Parking BAGFM — ${nombre}`;
        if (zonaInfo?.latitud && zonaInfo?.longitud) {
            const url = `https://maps.google.com/?q=${zonaInfo.latitud},${zonaInfo.longitud}`;
            if (navigator.share) {
                await navigator.share({ title: `BAGFM - ${nombre}`, text: mensaje, url });
                return;
            }
            await navigator.clipboard.writeText(`${mensaje}\n${url}`);
            toast.success('Ubicacion copiada al portapapeles');
        } else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const url = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
                if (navigator.share) {
                    await navigator.share({ title: `BAGFM - ${nombre}`, text: mensaje, url });
                } else {
                    await navigator.clipboard.writeText(`${mensaje}\n${url}`);
                    toast.success('Ubicacion copiada al portapapeles');
                }
            }, () => toast.error('No se pudo obtener GPS'));
        } else {
            toast.error('Comparte la ubicacion de la zona manualmente');
        }
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
                        <button onClick={handleCompartirUbicacion}
                            className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase hover:bg-primary/20 transition-all"
                            title="Compartir ubicacion de zona">
                            <Share2 size={13} /> Compartir
                        </button>
                        <button onClick={() => cargarDatos()} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all active:scale-90">
                            <RefreshCw size={16} className="text-text-muted" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-2xl mx-auto p-4 space-y-4">

                {/* ── KPIs ── */}
                <div className="grid grid-cols-4 gap-2">
                    <KpiCard label="Libres" valor={stats.libres} icon={CheckCircle2} color="text-success" />
                    <KpiCard label="Ocupados" valor={stats.ocupados} icon={Car} color="text-danger" />
                    <KpiCard label="Reservados" valor={stats.reservados} icon={Shield} color="text-warning" />
                    <KpiCard label="Total" valor={stats.total} icon={LayoutGrid} color="text-primary" />
                </div>

                {/* ── Acciones de Escaneo ── */}
                <Card className="p-4 rounded-2xl border-white/5">
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Scan size={12} className="text-primary" />
                        Acciones de Escaneo QR
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => { setModoScanner('llegada'); setVista(VISTAS.SCANNER); setUltimoEscaneo(null); }}
                            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-success/5 border-2 border-success/30 hover:bg-success/10 hover:border-success/50 active:scale-95 transition-all"
                        >
                            <div className="w-10 h-10 bg-success/20 rounded-xl flex items-center justify-center">
                                <LogIn size={22} className="text-success" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-success">Recibir</span>
                            <span className="text-[8px] text-text-muted uppercase tracking-wide">Registrar Llegada</span>
                        </button>
                        <button
                            onClick={() => { setModoScanner('salida'); setVista(VISTAS.SCANNER); setUltimoEscaneo(null); }}
                            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-warning/5 border-2 border-warning/30 hover:bg-warning/10 hover:border-warning/50 active:scale-95 transition-all"
                        >
                            <div className="w-10 h-10 bg-warning/20 rounded-xl flex items-center justify-center">
                                <LogOut size={22} className="text-warning" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-warning">Despachar</span>
                            <span className="text-[8px] text-text-muted uppercase tracking-wide">Registrar Salida</span>
                        </button>
                    </div>
                </Card>

                {/* ── PANEL DE SCANNER (in-page) ── */}
                {vista === VISTAS.SCANNER && (
                    <Card className="p-0 rounded-2xl border-white/5 overflow-hidden">
                        <div className="bg-bg-app/60 px-4 py-3 flex items-center justify-between border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full animate-pulse", modoScanner === 'llegada' ? 'bg-success' : 'bg-warning')} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-text-main">
                                    {modoScanner === 'llegada' ? 'Modo Recepción' : 'Modo Despacho'}
                                </span>
                            </div>
                            <button
                                onClick={() => setVista(VISTAS.PANEL)}
                                className="text-[9px] font-black uppercase text-text-muted/60 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10"
                            >
                                Cerrar
                            </button>
                        </div>

                        {/* Scanner */}
                        <div className="aspect-video max-h-72 bg-black relative">
                            <QRScanner
                                ref={scannerRef}
                                onScanSuccess={handleScanQR}
                                autoStart={true}
                            />
                            {escaneando && (
                                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center backdrop-blur-sm">
                                    <RefreshCw className="text-primary animate-spin mb-3" size={36} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Procesando...</span>
                                </div>
                            )}
                        </div>

                        {/* Resultado último escaneo */}
                        {ultimoEscaneo && (
                            <div className={cn(
                                "flex items-center gap-3 p-3 border-t",
                                ultimoEscaneo.tipo === 'llegada' ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'
                            )}>
                                {ultimoEscaneo.tipo === 'llegada' 
                                    ? <CheckCircle2 size={18} className="text-success shrink-0" />
                                    : <LogOut size={18} className="text-warning shrink-0" />
                                }
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-wide text-text-main">
                                        {ultimoEscaneo.placa || 'Vehículo'} — {ultimoEscaneo.tipo === 'llegada' ? 'Ingresado' : 'Despachado'}
                                    </p>
                                    <p className="text-[8px] text-text-muted">
                                        {ultimoEscaneo.puesto_asignado_id ? `Puesto: ${ultimoEscaneo.puesto_asignado_id}` : 'Sin puesto asignado aún'}
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        <p className="text-center text-[9px] font-black text-text-muted/40 uppercase tracking-widest py-3">
                            Apunte la cámara al código QR del vehículo
                        </p>
                    </Card>
                )}

                {/* ── MAPA DE PUESTOS ── */}
                <Card className="p-4 rounded-2xl border-white/5">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                            <LayoutGrid size={12} className="text-primary" />
                            Mapa de Puestos — {zonaInfo?.nombre}
                        </p>
                        {(vehiculoSeleccionado && puestoSeleccionado) && (
                            <button
                                onClick={handleAsignarPuesto}
                                disabled={asignando}
                                className="h-8 px-3 rounded-lg bg-primary text-bg-app text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5"
                            >
                                {asignando ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                Confirmar Asignación
                            </button>
                        )}
                    </div>

                    {/* Leyenda */}
                    <div className="flex flex-wrap gap-4 mb-4 px-1">
                        <EstadoPuesto label="Libre" color="bg-success" count={stats.libres} />
                        <EstadoPuesto label="Ocupado" color="bg-danger" count={stats.ocupados} />
                        <EstadoPuesto label="Reservado" color="bg-warning" count={stats.reservados} />
                    </div>

                    {vehiculoSeleccionado && (
                        <div className="mb-3 p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Car size={16} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-primary uppercase">Asignando para:</p>
                                <p className="text-xs font-black text-text-main">{vehiculoSeleccionado.placa}</p>
                            </div>
                            <button onClick={() => { setVehiculoSeleccionado(null); setPuestoSeleccionado(null); }} className="ml-auto text-[8px] text-text-muted/60 font-black uppercase">Cancelar</button>
                        </div>
                    )}

                    {/* Grilla de puestos */}
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {puestos.map(puesto => (
                            <TarjetaPuesto
                                key={puesto.id}
                                puesto={puesto}
                                seleccionado={puestoSeleccionado?.id === puesto.id}
                                onClick={() => {
                                    if (puesto.estado !== 'libre') return;
                                    setPuestoSeleccionado(prev => prev?.id === puesto.id ? null : puesto);
                                }}
                            />
                        ))}
                    </div>

                    {puestos.length === 0 && (
                        <div className="text-center py-8 text-text-muted/50">
                            <ParkingSquare size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Esta zona no tiene puestos gestionados</p>
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
                            <TarjetaVehiculo
                                key={v.id}
                                vehiculo={v}
                                puestos={puestos.filter(p => p.estado === 'libre')}
                                onAsignarPuesto={(veh) => {
                                    setVehiculoSeleccionado(veh);
                                    setPuestoSeleccionado(null);
                                    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
                                }}
                            />
                        ))}
                        {vehiculosEnZona.length === 0 && (
                            <div className="text-center py-6 text-text-muted/40">
                                <Car size={32} className="mx-auto mb-2 opacity-40" />
                                <p className="text-[9px] font-black uppercase tracking-widest">Sin vehículos activos en zona</p>
                            </div>
                        )}
                    </div>
                </Card>

            </div>
        </div>
    );
};

export default DashboardParquero;
