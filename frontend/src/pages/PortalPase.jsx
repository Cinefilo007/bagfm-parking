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

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-blue-500/30">
            {/* Header Táctico */}
            <div className="max-w-md mx-auto pt-10 px-6 pb-6 border-b border-white/5 bg-gradient-to-b from-blue-500/5 to-transparent">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold tracking-[0.3em] text-blue-400 uppercase">Aegis Tactical v2.2</span>
                </div>
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
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/20">
                                        <User className="w-5 h-5 text-blue-400" />
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
                                                onChange={(e) => setForm({...form, nombre: e.target.value})}
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
                                                    onChange={(e) => setForm({...form, cedula: e.target.value})}
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
                                            <Car className="w-4 h-4 text-blue-400" />
                                            <span className="text-xs font-bold uppercase tracking-wider">Vehículo Autorizado</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Placa</label>
                                                <input 
                                                    value={form.placa}
                                                    onChange={(e) => setForm({...form, placa: e.target.value})}
                                                    className="w-full bg-[#121214] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 outline-none transition-all uppercase"
                                                    placeholder="ABC123D"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Marca / Modelo</label>
                                                <input 
                                                    value={form.marca}
                                                    onChange={(e) => setForm({...form, marca: e.target.value})}
                                                    className="w-full bg-[#121214] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 outline-none transition-all uppercase"
                                                    placeholder="TOYOTA YARIS"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        type="submit"
                                        disabled={saving}
                                        className="w-full mt-6 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20"
                                    >
                                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Generar Pase Digital <ArrowRight className="w-4 h-4" /></>}
                                    </button>
                                </form>
                            </div>
                    </div>
                ) : (
                    <div className="animate-in zoom-in-95 duration-500 space-y-6">
                            {/* Card de Pase Digital */}
                            <div className="bg-white rounded-[2rem] p-8 text-[#0a0a0b] shadow-2xl shadow-white/5 relative overflow-hidden">
                                {/* Decoración Táctica */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px]" />
                                
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase">Pase de Acceso</span>
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
                                            <p className="text-xs font-black">{pase.vehiculo?.placa || 'PEATONAL'}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Expiración</span>
                                            <p className="text-xs font-black">{new Date(lote.fecha_fin).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Info className="w-4 h-4 text-blue-400" />
                                </div>
                                <p className="text-[10px] leading-relaxed text-gray-400 uppercase font-medium">
                                    Este pase es personal e intransferible. Debe presentarlo digitalmente o impreso en la Alcabala de Acceso.
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
                    Powered by Aegis Tactical & Resend
                </p>
            </div>
        </div>
    );
};

export default PortalPase;
