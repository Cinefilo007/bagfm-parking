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
import QRCode from "react-qr-code";

export const ModalPaseBase = ({ isOpen, onClose, zona, onGenerated }) => {
    const [form, setForm] = useState({
        nombre_portador: '',
        cedula_portador: '',
        telefono_portador: '',
        email_portador: '',
        vehiculo_placa: '',
        vehiculo_marca: '',
        vehiculo_modelo: '',
        vehiculo_color: '',
        es_permanente: false,
        dias_vigencia: 7
    });
    const [loading, setLoading] = useState(false);
    const [resultado, setResultado] = useState(null);

    const handleSubmit = async () => {
        if (!form.nombre_portador || !form.vehiculo_placa) {
            return toast.error('Nombre y Placa son mandatorios');
        }
        setLoading(true);
        try {
            const res = await api.post('/comando/pases-reservados', {
                ...form,
                zona_id: zona.id
            });
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
            dias_vigencia: 7
        });
    };

    if (resultado) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="PASE GENERADO" balanced className="max-w-2xl">
                <div className="space-y-6 text-center py-4">
                    <div className="flex justify-center flex-col items-center gap-4">
                        <div className="bg-success/20 p-4 rounded-full">
                            <CheckCircle2 size={48} className="text-success" />
                        </div>
                        <h3 className="text-xl font-bold text-text-main">REGISTRO EXITOSO</h3>
                    </div>

                    <div className="bg-white p-6 rounded-3xl mx-auto w-fit shadow-2xl ring-8 ring-indigo-500/10">
                        <QRCode value={resultado.token} size={180} level="H" />
                    </div>

                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-text-muted">SERIAL:</span>
                            <span className="text-text-main font-bold">{resultado.serial_legible}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-text-muted">PORTADOR:</span>
                            <span className="text-text-main font-bold uppercase">{resultado.nombre_portador}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Boton className="w-full bg-success text-white" 
                               onClick={() => {
                                   const text = `BAGFM - PASE\nSerial: ${resultado.serial_legible}`;
                                   window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
                               }}>
                            WhatsApp
                        </Boton>
                        <Boton variant="ghost" className="w-full" onClick={handleReset}>Generar Otro</Boton>
                        <Boton variant="ghost" className="w-full" onClick={onClose}>Cerrar</Boton>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Nombre Completo *" icon={<User size={12}/>} value={form.nombre_portador} 
                               onChange={e => setForm({...form, nombre_portador: e.target.value})} />
                        <Input label="Cédula/ID" icon={<CreditCard size={12}/>} value={form.cedula_portador} 
                               onChange={e => setForm({...form, cedula_portador: e.target.value})} />
                        <Input label="Teléfono" icon={<Phone size={12}/>} value={form.telefono_portador} 
                               onChange={e => setForm({...form, telefono_portador: e.target.value})} />
                        <Input label="Email" icon={<Mail size={12}/>} value={form.email_portador} 
                               onChange={e => setForm({...form, email_portador: e.target.value})} />
                    </div>

                    <div className="h-px bg-white/5 my-2" />

                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Placa *" icon={<Hash size={12}/>} value={form.vehiculo_placa} 
                               onChange={e => setForm({...form, vehiculo_placa: e.target.value})} />
                        <Input label="Marca" icon={<Car size={12}/>} value={form.vehiculo_marca} 
                               onChange={e => setForm({...form, vehiculo_marca: e.target.value})} />
                        <Input label="Modelo" icon={<LayoutGrid size={12}/>} value={form.vehiculo_modelo} 
                               onChange={e => setForm({...form, vehiculo_modelo: e.target.value})} />
                        <Input label="Color" icon={<Palette size={12}/>} value={form.vehiculo_color} 
                               onChange={e => setForm({...form, vehiculo_color: e.target.value})} />
                    </div>

                    <div className="p-4 bg-white/3 rounded-2xl border border-white/5 space-y-4 mt-2">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-primary" />
                                <span className="text-[10px] font-black text-text-main uppercase tracking-widest">Vigencia del Pase</span>
                            </div>
                            <div className="flex bg-black/20 p-1 rounded-xl">
                                <button onClick={() => setForm({...form, es_permanente: false})}
                                    className={cn("px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all", 
                                        !form.es_permanente ? 'bg-primary text-bg-app shadow-lg' : 'text-text-muted hover:text-text-main')}>
                                    Temporal
                                </button>
                                <button onClick={() => setForm({...form, es_permanente: true})}
                                    className={cn("px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all", 
                                        form.es_permanente ? 'bg-primary text-bg-app shadow-lg' : 'text-text-muted hover:text-text-main')}>
                                    Permanente
                                </button>
                            </div>
                         </div>
                         {!form.es_permanente && (
                             <div className="flex items-center gap-2">
                                 <span className="text-[9px] text-text-muted font-bold uppercase w-20">Duración:</span>
                                 <div className="flex flex-1 gap-2">
                                     {[1, 3, 7, 15, 30].map(d => (
                                         <button key={d} onClick={() => setForm({...form, dias_vigencia: d})}
                                            className={cn("flex-1 py-1.5 rounded-lg border text-[9px] font-black transition-all",
                                            form.dias_vigencia === d ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 text-text-muted hover:border-white/10')}>
                                            {d}d
                                         </button>
                                     ))}
                                 </div>
                             </div>
                         )}
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Boton variant="ghost" className="flex-1" onClick={onClose} disabled={loading}>Cancelar</Boton>
                    <Boton className="flex-[2] bg-primary text-bg-app h-12 font-black uppercase gap-2 shadow-xl shadow-primary/20" 
                           onClick={handleSubmit} disabled={loading}>
                        {loading && <RefreshCw size={16} className="animate-spin" />}
                        {!loading && <Shield size={16} />}
                        {loading ? 'Procesando...' : 'Generar Pase Oficial'}
                    </Boton>
                </div>
            </div>
        </Modal>
    );
};
