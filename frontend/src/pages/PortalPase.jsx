import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pasesService } from '../services/pasesService';
import { 
  QrCode, 
  User, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Car, 
  ArrowRight,
  Loader2,
  AlertTriangle,
  Download,
  Info
} from 'lucide-react';

const PortalPase = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [pase, setPase] = useState(null);
    const [lote, setLote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        nombre: '',
        cedula: '',
        email: '',
        telefono: '',
        placa: '',
        marca: '',
        modelo: '',
        color: ''
    });

    useEffect(() => {
        cargarDatos();
    }, [token]);

    const cargarDatos = async () => {
        try {
            const data = await pasesService.obtenerPasePublico(token);
            setPase(data.pase);
            setLote(data.lote);
            
            // Si el pase tiene datos, poblar el formulario por si acaso
            if (data.pase) {
                setForm({
                    nombre: data.pase.nombre || '',
                    cedula: data.pase.cedula || '',
                    email: data.pase.email || '',
                    telefono: data.pase.telefono || '',
                    placa: data.pase.vehiculo?.placa || '',
                    marca: data.pase.vehiculo?.marca || '',
                    modelo: data.pase.vehiculo?.modelo || '',
                    color: data.pase.vehiculo?.color || ''
                });
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Error al cargar el pase táctico');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await pasesService.completarPasePublico(token, form);
            await cargarDatos(); // Recargar para mostrar el QR
        } catch (err) {
            alert(err.response?.data?.detail || 'Fallo en la sincronización de datos');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2 uppercase tracking-tighter">Acceso Denegado</h1>
                <p className="text-gray-400 max-w-sm mb-6">{error}</p>
                <button 
                    onClick={() => navigate('/')}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all uppercase text-sm font-bold tracking-widest"
                >
                    Volver al Inicio
                </button>
            </div>
        );
    }

    // Lógica de visualización:
    // Si es tipo PORTAL y NO tiene nombre -> Mostrar Formulario
    // De lo contrario -> Mostrar QR
    const mostrarForm = lote.tipo_pase === 'portal' && !pase.nombre;

    // Configuración de visualización dinámica (v2.4)
    const visual = pase?.visual || { layout: 'qr', color_preset: 'aegis' };
    
    const PRESETS = {
        aegis:   { primary: '#4EDEA3', accent: 'text-[#4EDEA3]', bg: 'bg-[#4EDEA3]', shadow: 'shadow-[#4EDEA3]/20' },
        militar: { primary: '#6B7280', accent: 'text-gray-400',   bg: 'bg-gray-600',   shadow: 'shadow-gray-600/20' },
        civil:   { primary: '#3B82F6', accent: 'text-blue-400',   bg: 'bg-blue-500',   shadow: 'shadow-blue-500/20' },
        vip:     { primary: '#F2C94C', accent: 'text-yellow-500', bg: 'bg-yellow-500', shadow: 'shadow-yellow-500/20' },
        alfa:    { primary: '#EB5757', accent: 'text-red-500',    bg: 'bg-red-500',    shadow: 'shadow-red-500/20' },
    };
    
    // Obtener estilo base y sobreescribir con color_hex si existe
    const baseStyle = PRESETS[visual.color_preset] || PRESETS.aegis;
    const style = {
        ...baseStyle,
        primary: visual.color_hex || baseStyle.primary,
        dynamicAccent: { color: visual.color_hex || baseStyle.primary },
        dynamicBg: { backgroundColor: visual.color_hex || baseStyle.primary },
        dynamicShadow: { boxShadow: `0 10px 15px -3px ${(visual.color_hex || baseStyle.primary)}33` }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-blue-500/30">
            {/* Header Táctico */}
            <div className={`max-w-md mx-auto pt-10 px-6 pb-6 border-b border-white/5 bg-gradient-to-b from-${visual.color_preset === 'aegis' ? 'blue' : 'gray'}-500/5 to-transparent`}>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: visual.color_hex || style.primary }} />
                    <span className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-60">Emisión Autorizada</span>
                </div>
                <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">{pase?.entidad_nombre || 'BAGFM ACCESS'}</h2>
                <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none mb-1">
                    {lote.nombre_evento}
                </h1>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(lote.fecha_inicio).toLocaleDateString()} — {new Date(lote.fecha_fin).toLocaleDateString()}</span>
                </div>
            </div>

            <main className="max-w-md mx-auto p-6 pb-12">
                {mostrarForm ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className={`w-10 h-10 rounded-xl ${style.bg}/20 flex items-center justify-center border border-${style.primary}/20`}>
                                        <User className={`w-5 h-5 ${style.accent}`} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">Completar Registro</h2>
                                        <p className="text-xs text-gray-500">Sus datos son necesarios para el acceso</p>
                                    </div>
                                </div>

                                <form onSubmit={handleSave} className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Nombre Completo</label>
                                            <input 
                                                required
                                                value={form.nombre}
                                                onChange={(e) => setForm({...form, nombre: e.target.value.toUpperCase()})}
                                                className="w-full bg-[#121214] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 outline-none transition-all"
                                                placeholder="EJ. JUAN PÉREZ"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Cédula / ID</label>
                                                <input 
                                                    required
                                                    value={form.cedula}
                                                    onChange={(e) => setForm({...form, cedula: e.target.value.toUpperCase()})}
                                                    className="w-full bg-[#121214] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 outline-none transition-all"
                                                    placeholder="V-000..."
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Teléfono</label>
                                                <input 
                                                    required
                                                    value={form.telefono}
                                                    onChange={(e) => setForm({...form, telefono: e.target.value})}
                                                    className="w-full bg-[#121214] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 outline-none transition-all"
                                                    placeholder="0414..."
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Correo Electrónico</label>
                                            <input 
                                                required
                                                type="email"
                                                value={form.email}
                                                onChange={(e) => setForm({...form, email: e.target.value})}
                                                className="w-full bg-[#121214] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 outline-none transition-all"
                                                placeholder="correo@ejemplo.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4 pb-2 border-t border-white/5 mt-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Car className={`w-4 h-4 ${style.accent}`} />
                                            <span className="text-xs font-bold uppercase tracking-wider">Vehículo Autorizado</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Placa</label>
                                                <input 
                                                    value={form.placa}
                                                    onChange={(e) => setForm({...form, placa: e.target.value.toUpperCase()})}
                                                    className="w-full bg-[#121214] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 outline-none transition-all uppercase"
                                                    placeholder="PLACA"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Color</label>
                                                <input 
                                                    value={form.color}
                                                    onChange={(e) => setForm({...form, color: e.target.value.toUpperCase()})}
                                                    className="w-full bg-[#121214] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 outline-none transition-all uppercase"
                                                    placeholder="COLOR"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Marca</label>
                                                <input 
                                                    value={form.marca}
                                                    onChange={(e) => setForm({...form, marca: e.target.value.toUpperCase()})}
                                                    className="w-full bg-[#121214] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 outline-none transition-all uppercase"
                                                    placeholder="TOYOTA"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Modelo</label>
                                                <input 
                                                    value={form.modelo}
                                                    onChange={(e) => setForm({...form, modelo: e.target.value.toUpperCase()})}
                                                    className="w-full bg-[#121214] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 outline-none transition-all uppercase"
                                                    placeholder="YARIS"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        type="submit"
                                        disabled={saving}
                                        className="w-full mt-6 py-4 hover:brightness-110 disabled:opacity-50 text-white rounded-2xl font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-3 shadow-lg"
                                        style={{ ...style.dynamicBg, ...style.dynamicShadow }}
                                    >
                                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Generar Pase Digital <ArrowRight className="w-4 h-4" /></>}
                                    </button>
                                </form>
                            </div>
                    </div>
                ) : (
                    <div className="animate-in zoom-in-95 duration-500 space-y-6">
                            {/* Card de Pase Digital Dinámico */}
                            <div className={cn(
                                "bg-white p-8 text-[#0a0a0b] shadow-2xl relative overflow-hidden transition-all",
                                visual.layout === 'qr' && "rounded-[2rem]",
                                visual.layout === 'colgante' && "rounded-b-[2rem] border-t-[12px]",
                                visual.layout === 'credencial' && "rounded-lg border-l-8",
                                visual.layout === 'parabrisas' && "rounded-3xl border-b-[16px] border-double",
                                visual.layout === 'cartera' && "rounded-[2.5rem] border-x-4",
                                visual.layout === 'ticket' && "rounded-md border-t-4 border-dashed",
                                // Aplicación de colores según preset y layout
                                visual.color_preset === 'aegis' && visual.layout !== 'qr' ? 'border-green-500' : '',
                                visual.color_preset === 'vip' && visual.layout !== 'qr' ? 'border-yellow-500' : '',
                                visual.color_preset === 'militar' && visual.layout !== 'qr' ? 'border-gray-800' : '',
                                visual.color_preset === 'alfa' && visual.layout !== 'qr' ? 'border-red-600' : '',
                            )}>
                                {visual.layout === 'parabrisas' && (
                                    <div className="absolute top-4 right-4 opacity-10">
                                        <Car size={80} />
                                    </div>
                                )}
                                {visual.layout === 'ticket' && (
                                    <div className="absolute -top-1 left-0 w-full flex justify-around opacity-20">
                                        {[...Array(10)].map((_,i) => <div key={i} className="w-2 h-2 rounded-full bg-black -mt-1" />)}
                                    </div>
                                )}                                {/* Decoración Táctica */}
                                <div className={`absolute top-0 right-0 w-32 h-32 ${style.bg}/5 blur-[60px]`} />
                                
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <span className="text-[10px] font-black tracking-widest uppercase opacity-40" style={style.dynamicAccent}>Pase de Acceso</span>
                                        <h3 className="text-2xl font-black leading-none mt-1">{pase.serial}</h3>
                                    </div>
                                    <div className="p-2 bg-green-500/10 rounded-lg">
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    </div>
                                </div>

                                <div className="flex flex-col items-center mb-8">
                                    <div className="p-4 bg-white border-2 border-[#f0f0f0] rounded-3xl mb-4">
                                        <QrCode value={token} size={200} className="w-48 h-48" />
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Escanee en el Punto de Control</p>
                                </div>

                                <div className="space-y-4 border-t-2 border-dashed border-gray-100 pt-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Titular</span>
                                            <p className="text-xs font-black truncate">{pase.nombre || 'INVITADO'}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Identificación</span>
                                            <p className="text-xs font-black">{pase.cedula || 'SIN ID'}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Vehículo</span>
                                            <div className="flex flex-col">
                                                <p className="text-xs font-black">{pase.vehiculo?.placa || 'PEATONAL'}</p>
                                                {pase.vehiculo?.marca && (
                                                    <p className="text-[8px] font-bold text-gray-500 uppercase">{pase.vehiculo.marca} {pase.vehiculo.modelo}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Expiración</span>
                                            <p className="text-xs font-black">{new Date(lote.fecha_fin).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                                <div className={`p-2 ${style.bg}/10 rounded-lg`}>
                                    <Info className={`w-4 h-4 ${style.accent}`} />
                                </div>
                                <p className="text-[10px] leading-relaxed text-gray-400 uppercase font-medium">
                                    Este pase {visual.layout !== 'qr' ? 'personalizado' : ''} es intransferible. Debe presentarlo digitalmente o impreso en la Alcabala de Acceso.
                                </p>
                            </div>
                            
                            <button 
                                onClick={() => window.print()}
                                className="w-full py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3"
                            >
                                <Download className="w-4 h-4" /> Descargar Versión PDF
                            </button>
                        </div>
                    )}
            </main>

            {/* Footer */}
            <div className="max-w-md mx-auto px-6 py-8 text-center border-t border-white/5">
                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">
                    Powered by BAGFM
                </p>
            </div>
        </div>
    );
};

// Helper for classNames
function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}

export default PortalPase;
