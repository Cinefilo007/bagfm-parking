import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Boton } from '../ui/Boton';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { 
    Shield, User, CreditCard, Phone, Mail, 
    Car, Hash, Palette, Calendar, CheckCircle2,
    RefreshCw, Share2, LayoutGrid, MessageCircle
} from 'lucide-react';
import api from '../../services/api';
import { QRCode } from 'react-qr-code';

export const ModalPaseBase = ({ isOpen, onClose, zona, onGenerated }) => {
    const [form, setForm] = useState({
        nombre_portador: '',
        cedula_portador: '',
        telefono_portador: '',
        vehiculo_placa: '',
        vehiculo_marca: '',
        vehiculo_modelo: '',
        vehiculo_color: '',
        es_permanente: false,
        dias_vigencia: 7,
        fecha_fin_custom: '' // Campo para fecha personalizada
    });
    const [loading, setLoading] = useState(false);
    const [resultado, setResultado] = useState(null);

    const handleSubmit = async () => {
        if (!form.nombre_portador || !form.vehiculo_placa) {
            return toast.error('Nombre y Placa son mandatorios');
        }
        setLoading(true);
        try {
            // Si hay fecha custom, calcular días o mandarla directo si el backend lo soporta
            const payload = { ...form, zona_id: zona.id };
            if (form.fecha_fin_custom && !form.es_permanente) {
                payload.fecha_expiracion = form.fecha_fin_custom;
            }

            const res = await api.post('/comando/pases-reservados', payload);
            setResultado(res.data);
            toast.success('Pase de Comando generado con éxito');
            if (onGenerated) onGenerated();
        } catch (e) {
            const errorDetail = e.response?.data?.detail;
            const message = typeof errorDetail === 'string' ? errorDetail : 'Error al generar pase';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setResultado(null);
        setForm({
            nombre_portador: '',
            cedula_portador: '',
            telefono_portador: '',
            email_portador: '',
            vehiculo_placa: '',
            vehiculo_marca: '',
            vehiculo_modelo: '',
            vehiculo_color: '',
            es_permanente: false,
            dias_vigencia: 7,
            fecha_fin_custom: ''
        });
    };

    const [mostrarQR, setMostrarQR] = useState(false);
    const qrRef = React.useRef(null);

    const handleWhatsApp = async () => {
        if (!resultado) return;
        const mensaje = [
            `🎫 *PASE OFICIAL DE COMANDO — BAGFM*`,
            `📋 Serial: \`${resultado.serial_legible}\``,
            `👤 Portador: ${resultado.nombre_portador}`,
            `🚗 Vehículo: ${resultado.vehiculo_placa}`,
            ``,
            `_Presente este código en Alcabala y Parking_`,
        ].join('\n');

        const phone = form.telefono_portador.replace(/\D/g, '');
        const url = phone 
            ? `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`
            : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
        
        window.open(url, '_blank');
    };

    if (resultado) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="PASE GENERADO CON ÉXITO" balanced className="max-w-md">
                <div className="space-y-6 text-center">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center border border-success/20">
                            <CheckCircle2 size={32} className="text-success" />
                        </div>
                        <h3 className="text-sm font-black text-text-main uppercase tracking-widest">Pase Registrado</h3>
                        <p className="text-[10px] text-text-muted uppercase font-bold">Serial Oficial: {resultado.serial_legible}</p>
                    </div>

                    <div className="bg-black/30 rounded-2xl p-8 border border-white/5 flex flex-col items-center gap-4 w-full">
                        <div className="animate-in zoom-in-95 duration-200 flex flex-col items-center gap-4">
                            <div className="p-4 bg-white rounded-2xl shadow-2xl shadow-black/60">
                                <QRCode 
                                    value={resultado.token || resultado.serial_legible} 
                                    size={180} 
                                    level="M"
                                />
                            </div>
                            <div className="space-y-1 text-center">
                                <p className="text-[9px] text-primary font-black uppercase tracking-widest">Pase Oficial Firmado</p>
                                <p className="text-[7px] text-text-muted italic uppercase font-bold leading-tight">Token de Seguridad Criptográfico</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 w-full">
                        <button 
                            onClick={handleWhatsApp}
                            className="w-full h-11 bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white border border-[#25D366]/20 hover:border-transparent rounded-xl flex items-center justify-center gap-2 transition-all text-[10px] font-black uppercase cursor-pointer shadow-lg shadow-[#25D366]/5"
                        >
                            <MessageCircle size={16} /> Compartir por WhatsApp
                        </button>
                        
                        <button 
                            onClick={onClose}
                            className="w-full h-10 bg-white/5 hover:bg-white/10 border border-white/10 text-text-muted hover:text-text-main rounded-xl transition-all text-[10px] font-black uppercase cursor-pointer"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`PASE DE COMANDO — ${zona?.nombre}`} balanced className="max-w-2xl">
            <div className="space-y-5">
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-3">
                    <Shield size={16} className="text-primary shrink-0 mt-0.5" />
                    <p className="text-[9px] text-text-muted leading-relaxed uppercase tracking-tighter font-bold">
                        Estás generando un pase oficial para un cupo reservado de la base. 
                        Este pase tendrá prioridad en los puntos de control.
                    </p>
                </div>

                <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5">
                    <Input label="Nombre Completo *" icon={<User size={12}/>} value={form.nombre_portador} 
                           onChange={e => setForm({...form, nombre_portador: e.target.value.toUpperCase()})} />
                    <Input label="Cédula/ID" icon={<CreditCard size={12}/>} value={form.cedula_portador} 
                           onChange={e => setForm({...form, cedula_portador: e.target.value.replace(/\D/g, '')})} 
                           placeholder="SOLO NÚMEROS" />
                    <Input label="Teléfono" icon={<Phone size={12}/>} value={form.telefono_portador} 
                           onChange={e => setForm({...form, telefono_portador: e.target.value.replace(/\D/g, '')})} 
                           placeholder="SOLO NÚMEROS" />
                    <div className="md:col-span-1 hidden md:block" /> { /* Espaciado para quitar email */ }
                </div>

                    <div className="h-px bg-white/5 my-2" />

                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                    <Input label="Placa *" icon={<Hash size={12}/>} value={form.vehiculo_placa} 
                           onChange={e => setForm({...form, vehiculo_placa: e.target.value.toUpperCase()})} />
                    <Input label="Marca" icon={<Car size={12}/>} value={form.vehiculo_marca} 
                           onChange={e => setForm({...form, vehiculo_marca: e.target.value.toUpperCase()})} />
                    <Input label="Modelo" icon={<LayoutGrid size={12}/>} value={form.vehiculo_modelo} 
                           onChange={e => setForm({...form, vehiculo_modelo: e.target.value.toUpperCase()})} />
                    <Input label="Color" icon={<Palette size={12}/>} value={form.vehiculo_color} 
                           onChange={e => setForm({...form, vehiculo_color: e.target.value.toUpperCase()})} />
                </div>

                <div className="p-3 bg-white/3 rounded-xl border border-white/5 space-y-3">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar size={12} className="text-primary" />
                            <span className="text-[9px] font-black text-text-main uppercase tracking-widest">Vigencia</span>
                        </div>
                        <div className="flex bg-black/40 p-0.5 rounded-lg">
                            <button onClick={() => setForm({...form, es_permanente: false})}
                                className={cn("px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all", 
                                    !form.es_permanente ? 'bg-primary text-bg-app shadow-lg' : 'text-text-muted hover:text-text-main')}>
                                Temporal
                            </button>
                            <button onClick={() => setForm({...form, es_permanente: true})}
                                className={cn("px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all", 
                                    form.es_permanente ? 'bg-primary text-bg-app shadow-lg' : 'text-text-muted hover:text-text-main')}>
                                Permanente
                            </button>
                        </div>
                     </div>
                         {!form.es_permanente && (
                         <div className="space-y-3 pt-1">
                             <div className="flex items-center gap-2">
                                 <span className="text-[8px] text-text-muted font-black uppercase w-16">Rápido:</span>
                                 <div className="flex flex-1 gap-1">
                                     {[1, 3, 7, 15, 30].map(d => (
                                         <button key={d} onClick={() => setForm({...form, dias_vigencia: d, fecha_fin_custom: ''})}
                                            className={cn("flex-1 py-1 rounded-md border text-[8px] font-black transition-all",
                                            form.dias_vigencia === d && !form.fecha_fin_custom ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 text-text-muted hover:border-white/10')}>
                                            {d}D
                                         </button>
                                     ))}
                                 </div>
                             </div>
                             <div className="flex items-center gap-2">
                                 <span className="text-[8px] text-text-muted font-black uppercase w-16">Hasta:</span>
                                 <input 
                                    type="date"
                                    value={form.fecha_fin_custom}
                                    onChange={e => setForm({...form, fecha_fin_custom: e.target.value, dias_vigencia: 0})}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-md px-2 py-1 text-[10px] text-text-main focus:border-primary outline-none"
                                    min={new Date().toISOString().split('T')[0]}
                                 />
                             </div>
                         </div>
                     )}
                </div>
                </div>

                <div className="flex gap-2 pt-2">
                    <button 
                        className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-text-muted hover:text-text-main font-black uppercase text-[10px] transition-all cursor-pointer" 
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <Boton className="flex-[2] bg-primary text-bg-app h-10 font-black uppercase gap-2 shadow-xl shadow-primary/20 text-[10px]" 
                           onClick={handleSubmit} disabled={loading}>
                        {loading ? <RefreshCw size={14} className="animate-spin" /> : <Shield size={14} />}
                        {loading ? 'PROCESANDO...' : 'GENERAR PASE OFICIAL'}
                    </Boton>
                </div>
            </div>
        </Modal>
    );
};
