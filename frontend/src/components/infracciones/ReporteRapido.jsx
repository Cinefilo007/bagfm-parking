import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Boton } from '../ui/Boton';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import {
    AlertTriangle, MapPin, Camera, RefreshCw,
    CheckCircle2, XCircle
} from 'lucide-react';
import api from '../../services/api';

const TIPOS = [
    { value: 'mal_estacionado', label: 'Mal estacionado' },
    { value: 'exceso_velocidad', label: 'Exceso velocidad' },
    { value: 'zona_prohibida', label: 'Zona prohibida' },
    { value: 'colision', label: 'Colisión' },
    { value: 'acceso_no_autorizado', label: 'Acceso no autoriz.' },
    { value: 'conducta_indebida', label: 'Conducta indebida' },
    { value: 'daño_propiedad', label: 'Daño a propiedad' },
    { value: 'otro', label: 'Otro' },
];

const GRAVEDADES = [
    { value: 'leve', label: 'LEVE', color: 'border-yellow-400/50 bg-yellow-400/10 text-yellow-400' },
    { value: 'moderada', label: 'MODERADA', color: 'border-orange-400/50 bg-orange-400/10 text-orange-400' },
    { value: 'grave', label: 'GRAVE', color: 'border-red-400/50 bg-red-400/10 text-red-400' },
    { value: 'critica', label: 'CRÍTICA', color: 'border-red-700/60 bg-red-900/20 text-red-300' },
];

/**
 * Componente de reporte rápido de infracción.
 * Se usa como botón flotante desde el Portal del Parquero y Scanner Alcabala.
 */
export default function ReporteInfraccionRapido({ placa = '', vehiculoId = null, zonaId = null }) {
    const [abierto, setAbierto] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [form, setForm] = useState({
        tipo: 'mal_estacionado',
        gravedad: 'leve',
        descripcion: '',
        placa_manual: placa,
        latitud: null,
        longitud: null,
    });
    const [obteniendoGPS, setObteniendoGPS] = useState(false);
    const [gpsOk, setGpsOk] = useState(null);

    const resetForm = () => {
        setForm({ tipo: 'mal_estacionado', gravedad: 'leve', descripcion: '', placa_manual: placa, latitud: null, longitud: null });
        setGpsOk(null);
    };

    const handleObtenerUbicacion = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocalización no disponible en este dispositivo');
            return;
        }
        setObteniendoGPS(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setForm(prev => ({
                    ...prev,
                    latitud: parseFloat(pos.coords.latitude.toFixed(8)),
                    longitud: parseFloat(pos.coords.longitude.toFixed(8)),
                }));
                setGpsOk(true);
                setObteniendoGPS(false);
                toast.success('Ubicación capturada');
            },
            () => {
                setGpsOk(false);
                setObteniendoGPS(false);
                toast.error('No se pudo obtener la ubicación');
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    const handleEnviar = async () => {
        if (!form.descripcion.trim() && form.gravedad !== 'leve') {
            toast.error('La descripción es requerida para infracciones moderadas o superiores');
            return;
        }
        setEnviando(true);
        try {
            await api.post('/infracciones/reporte-rapido', {
                tipo: form.tipo,
                gravedad: form.gravedad,
                descripcion: form.descripcion || null,
                vehiculo_id: vehiculoId || null,
                vehiculo_placa: form.placa_manual || null,
                zona_id: zonaId || null,
                latitud_infraccion: form.latitud,
                longitud_infraccion: form.longitud,
            });
            toast.success('Infracción reportada', { icon: '⚠️' });
            setAbierto(false);
            resetForm();
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Error al reportar infracción');
        } finally {
            setEnviando(false);
        }
    };

    return (
        <>
            {/* Botón flotante */}
            <button
                onClick={() => setAbierto(true)}
                className="fixed bottom-24 right-4 z-50 w-14 h-14 bg-warning text-bg-app rounded-full shadow-2xl shadow-warning/30 flex items-center justify-center active:scale-90 transition-all border-2 border-warning/50 hover:bg-warning/90"
                title="Reportar infracción"
            >
                <AlertTriangle size={24} strokeWidth={3} />
            </button>

            <Modal isOpen={abierto} onClose={() => { setAbierto(false); resetForm(); }} title="⚠️ REPORTE DE INFRACCIÓN">
                <div className="space-y-4">

                    {/* Tipo de infracción */}
                    <div>
                        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest block mb-2">
                            Tipo de infracción
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {TIPOS.map(t => (
                                <button key={t.value} onClick={() => setForm({ ...form, tipo: t.value })}
                                    className={cn(
                                        "h-9 px-3 rounded-xl border-2 text-[10px] font-black uppercase text-left transition-all",
                                        form.tipo === t.value
                                            ? 'bg-primary/10 border-primary text-primary'
                                            : 'bg-white/5 border-white/10 text-text-muted hover:border-white/20 hover:text-text-main'
                                    )}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Gravedad */}
                    <div>
                        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest block mb-2">
                            Gravedad
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {GRAVEDADES.map(g => (
                                <button key={g.value} onClick={() => setForm({ ...form, gravedad: g.value })}
                                    className={cn(
                                        "h-10 rounded-xl border-2 text-[9px] font-black uppercase transition-all",
                                        form.gravedad === g.value
                                            ? g.color
                                            : 'bg-white/5 border-white/10 text-text-muted/50 hover:border-white/20'
                                    )}>
                                    {g.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Placa */}
                    <div>
                        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest block mb-1.5">
                            Placa del vehículo
                        </label>
                        <input
                            value={form.placa_manual}
                            onChange={e => setForm({ ...form, placa_manual: e.target.value.toUpperCase() })}
                            placeholder="ABC-123"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-text-main focus:border-primary/50 outline-none uppercase placeholder:text-white/20"
                        />
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest block mb-1.5">
                            Descripción {form.gravedad !== 'leve' && <span className="text-danger">*</span>}
                        </label>
                        <textarea
                            value={form.descripcion}
                            onChange={e => setForm({ ...form, descripcion: e.target.value })}
                            placeholder="Descripción del incidente..."
                            rows={2}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-text-main focus:border-primary/50 outline-none resize-none placeholder:text-white/20"
                        />
                    </div>

                    {/* Geolocalización (OPCIONAL) */}
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MapPin size={14} className={form.latitud ? 'text-success' : 'text-text-muted/60'} />
                                <span className="text-[9px] font-black uppercase tracking-wider text-text-muted">
                                    Registrar Ubicación <span className="text-text-muted/40">(Opcional)</span>
                                </span>
                            </div>
                            <button
                                onClick={handleObtenerUbicacion}
                                disabled={obteniendoGPS}
                                className={cn(
                                    "h-7 px-3 rounded-lg text-[9px] font-black uppercase flex items-center gap-1.5 transition-all border",
                                    form.latitud
                                        ? 'bg-success/15 text-success border-success/30'
                                        : 'bg-primary/15 text-primary border-primary/30 hover:bg-primary/25'
                                )}
                            >
                                {obteniendoGPS ? <RefreshCw size={11} className="animate-spin" /> :
                                    form.latitud ? <><CheckCircle2 size={11} /> GPS OK</> : <><MapPin size={11} /> Capturar</>
                                }
                            </button>
                        </div>
                        {form.latitud && (
                            <p className="text-[8px] text-success/70 mt-2 font-mono">
                                Lat: {form.latitud} · Lon: {form.longitud}
                            </p>
                        )}
                    </div>

                    {/* Aviso de consecuencias */}
                    {form.gravedad !== 'leve' && (
                        <div className="flex items-start gap-2 p-3 bg-danger/5 border border-danger/20 rounded-xl">
                            <AlertTriangle size={13} className="text-danger shrink-0 mt-0.5" />
                            <p className="text-[9px] text-text-muted">
                                {form.gravedad === 'moderada' && 'Infracción MODERADA: bloqueará la salida del vehículo hasta resolución por el personal de la base.'}
                                {form.gravedad === 'grave' && 'Infracción GRAVE: bloqueará salida + suspensión temporal de acceso. Requiere aprobación del Comandante o Admin Base.'}
                                {form.gravedad === 'critica' && '⚫ Infracción CRÍTICA: lista negra permanente + reporte a autoridades. Solo el Comandante puede resolver.'}
                            </p>
                        </div>
                    )}

                    {/* Acciones */}
                    <div className="flex gap-3 pt-2 border-t border-white/5">
                        <Boton variant="ghost" className="flex-1" onClick={() => { setAbierto(false); resetForm(); }}>
                            Cancelar
                        </Boton>
                        <Boton onClick={handleEnviar} disabled={enviando}
                            className="flex-[2] bg-warning text-bg-app h-12 font-black uppercase tracking-wider">
                            {enviando ? <RefreshCw size={16} className="animate-spin" /> : <><AlertTriangle size={16} /> Reportar Infracción</>}
                        </Boton>
                    </div>
                </div>
            </Modal>
        </>
    );
}
