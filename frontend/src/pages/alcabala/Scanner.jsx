import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { QRScanner } from '../../components/alcabala/QRScanner';
import { alcabalaService } from '../../services/alcabala.service';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Boton } from '../../components/ui/Boton';
import { Card, CardContent } from '../../components/ui/Card';
import { 
    CheckCircle2, XCircle, AlertTriangle, User, 
    Car, Shield, Zap, Activity, ChevronRight,
    Camera
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { cn } from '../../lib/utils';

const ScannerAlcabala = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const tipoAcceso = searchParams.get('tipo') || 'entrada';
    const [resultado, setResultado] = useState(null);
    const [mostrandoModal, setMostrandoModal] = useState(false);
    const [cargando, setCargando] = useState(false);

    const handleScanSuccess = async (qrToken) => {
        if (cargando) return;
        setCargando(true);
        console.log("Iniciando validación táctica del token QR...");
        try {
            const res = await alcabalaService.validarQR(qrToken, tipoAcceso);
            setResultado(res);
            setMostrandoModal(true);
        } catch (error) {
            console.error("Fallo crítico en reconocimiento QR:", error);
            setResultado({ 
                permitido: false, 
                mensaje: "Fallo en protocolo de comunicación con la base central.", 
                tipo_alerta: "error" 
            });
            setMostrandoModal(true);
        } finally {
            setCargando(false);
        }
    };

    const handleConfirmar = async () => {
        try {
            await alcabalaService.registrarAcceso({
                qr_id: resultado.qr_id,
                usuario_id: resultado.usuario_id,
                vehiculo_id: resultado.vehiculo_id,
                tipo: tipoAcceso,
                es_manual: false
            });
            navigate('/alcabala/dashboard');
        } catch (error) {
            console.error("Error al persistir registro:", error);
        }
    };

    const getStatusStyles = (res) => {
        if (!res?.permitido) return 'bg-danger/10 border-danger/20 text-danger';
        if (res?.tipo_alerta === 'warning') return 'bg-warning/10 border-warning/20 text-warning';
        return 'bg-primary/10 border-primary/20 text-primary';
    };

    return (
        <div className="min-h-screen bg-bg-app pb-10 flex flex-col">
            <Header titulo="Terminal de Escaneo" subtitle={`OPERACIÓN ${tipoAcceso.toUpperCase()}`} />
            
            <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                
                {/* Cabecera del Escáner */}
                <div className="flex items-center justify-between px-2">
                    <div>
                        <h2 className="text-2xl font-black text-text-main dark:text-white uppercase tracking-tighter italic leading-none">
                            Detector <span className={tipoAcceso === 'entrada' ? 'text-primary' : 'text-warning'}>QR</span>
                        </h2>
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mt-2 opacity-60">
                            Alinee el código en el centro del visor
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                         <div className="flex flex-col items-end">
                             <span className="text-[8px] font-black text-text-muted uppercase tracking-widest leading-none mb-1">Status</span>
                             <div className="flex items-center gap-1.5">
                                 <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--color-primary)]" />
                                 <span className="text-[10px] font-black text-text-main dark:text-white uppercase italic">Online</span>
                             </div>
                         </div>
                    </div>
                </div>

                {/* Componente de Escaneo Aegis v2 */}
                <Card className="bg-black/40 border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative aspect-square">
                    <div className="absolute inset-0 z-0 opactiy-20">
                         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />
                    </div>
                    <div className="relative z-10 w-full h-full p-2">
                         <QRScanner onScanSuccess={handleScanSuccess} />
                    </div>
                    
                    {/* Guías Visuales del Scanner */}
                    <div className="absolute inset-x-8 inset-y-8 pointer-events-none border-2 border-white/10 rounded-3xl border-dashed">
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
                    </div>
                </Card>

                <div className="grid grid-cols-2 gap-4 h-16">
                    <Card className="bg-bg-low/40 border-white/5 flex items-center justify-center gap-3">
                        <Camera size={20} className="text-primary" />
                        <span className="text-[10px] font-black text-text-main dark:text-white uppercase tracking-widest">Activo</span>
                    </Card>
                    <Card className="bg-bg-low/40 border-white/5 flex items-center justify-center gap-3">
                        <Activity size={20} className={tipoAcceso === 'entrada' ? 'text-primary' : 'text-warning'} />
                        <span className="text-[10px] font-black text-text-main dark:text-white uppercase tracking-widest">{tipoAcceso}</span>
                    </Card>
                </div>

                {/* Overlay de Carga Táctico */}
                {cargando && (
                    <div className="fixed inset-0 bg-bg-app/80 backdrop-blur-xl z-[120] flex items-center justify-center animate-in fade-in duration-300">
                         <div className="flex flex-col items-center gap-6">
                             <div className="relative">
                                 <Zap className="text-primary animate-pulse absolute inset-0 m-auto" size={32} />
                                 <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                             </div>
                             <p className="text-white font-black tracking-[0.4em] text-[10px] uppercase italic animate-pulse">Consultando Seguridad Central...</p>
                         </div>
                    </div>
                )}

                {/* Resultado de Validación Aegis v2 */}
                <Modal 
                    isOpen={mostrandoModal} 
                    onClose={() => setMostrandoModal(false)}
                    title="VALIDACIÓN DE TERMINAL"
                >
                    <div className="space-y-6">
                        {/* Cabecera de Resultado */}
                        <div className={cn("p-8 rounded-[2rem] border-2 transition-all duration-500 shadow-2xl", getStatusStyles(resultado))}>
                            <div className="flex items-center gap-6">
                                {resultado?.permitido ? (
                                    <div className="h-16 w-16 bg-primary/20 rounded-2xl flex items-center justify-center shadow-inner">
                                        <CheckCircle2 size={40} strokeWidth={2.5} />
                                    </div>
                                ) : (
                                    <div className="h-16 w-16 bg-danger/20 rounded-2xl flex items-center justify-center shadow-inner">
                                        <XCircle size={40} strokeWidth={2.5} className="text-danger" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h3 className="text-2xl font-black uppercase tracking-tighter italic leading-none">
                                        {resultado?.permitido ? "Acceso Permitido" : "Entrada Denegada"}
                                    </h3>
                                    <p className="text-xs font-bold opacity-80 mt-2 uppercase tracking-widest italic line-clamp-2">
                                        {resultado?.mensaje}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Ficha Táctica del Socio */}
                        {resultado?.socio && (
                            <section className="space-y-4">
                                <div className="px-2 flex items-center gap-2">
                                    <BadgeCheck size={14} className="text-primary" />
                                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Ficha de Identidad Identificada</span>
                                </div>
                                <Card className="p-6 bg-bg-low/40 border-white/5 rounded-[2rem] overflow-hidden relative">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center overflow-hidden border-2 border-white/10 shrink-0 shadow-2xl">
                                            {resultado.socio.foto_url ? (
                                                <img src={resultado.socio.foto_url} alt="Socio" className="w-full h-full object-cover grayscale-[0.5] hover:grayscale-0 transition-all" />
                                            ) : (
                                                <User className="text-white/10" size={40} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h5 className="text-2xl font-black text-text-main dark:text-white uppercase tracking-tight italic truncate leading-none">
                                                {resultado.socio.nombre} {resultado.socio.apellido}
                                            </h5>
                                            <div className="mt-3 flex flex-wrap gap-3">
                                                 <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase italic">
                                                     {resultado.entidad_nombre}
                                                 </span>
                                                 <span className="text-[10px] font-black text-text-muted bg-white/5 px-3 py-1 rounded-full uppercase">
                                                     ID: {resultado.socio.cedula}
                                                 </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                                         {resultado.membresia_info && (
                                             <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                                                 <span className="text-[8px] font-black text-text-muted uppercase tracking-widest block mb-1">Membresía</span>
                                                 <p className={cn("text-xs font-black uppercase italic", resultado.membresia_info.dias_restantes < 5 ? 'text-danger' : 'text-primary')}>
                                                     {resultado.membresia_info.dias_restantes} DÍAS VIG.
                                                 </p>
                                             </div>
                                         )}
                                         {resultado.vehiculo && (
                                             <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                                                 <span className="text-[8px] font-black text-text-muted uppercase tracking-widest block mb-1">Vehículo</span>
                                                 <p className="text-xs font-black text-warning uppercase italic truncate">
                                                     {resultado.vehiculo.placa}
                                                 </p>
                                             </div>
                                         )}
                                    </div>
                                </Card>
                            </section>
                        )}

                        {/* Alertas de Sanciones */}
                        {resultado?.infracciones_activas?.length > 0 && (
                            <div className="space-y-3">
                                {resultado.infracciones_activas.map((inf, idx) => (
                                    <Card key={idx} className="bg-danger/10 border-danger/30 p-4 rounded-2xl flex items-start gap-4">
                                         <AlertTriangle size={18} className="text-danger mt-0.5 shrink-0" />
                                         <p className="text-xs text-text-muted font-medium italic">
                                             <span className="font-black text-danger uppercase mr-2">{inf.tipo}:</span> {inf.descripcion}
                                         </p>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Botones de Comando */}
                        <div className="flex gap-4 pt-4">
                             <Boton 
                                variant="outline" 
                                className="flex-1 h-16 rounded-2xl border-white/5 text-text-muted font-black uppercase tracking-widest"
                                onClick={() => setMostrandoModal(false)}
                             >
                                 Abortar
                             </Boton>
                             <Boton 
                                disabled={!resultado?.permitido}
                                className={cn(
                                    "flex-1 h-16 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all",
                                    resultado?.permitido 
                                        ? (tipoAcceso === 'entrada' ? 'bg-primary text-bg-app shadow-primary/20 scale-105' : 'bg-warning text-bg-app shadow-warning/20 scale-105')
                                        : 'bg-bg-low text-white/10 scale-100 cursor-not-allowed border-white/5'
                                )}
                                onClick={handleConfirmar}
                             >
                                 Confirmar {tipoAcceso}
                             </Boton>
                        </div>
                    </div>
                </Modal>
            </main>
        </div>
    );
};

// Icono auxiliar no importado
const BadgeCheck = ({ size, className }) => (
    <div className={className}>
        <CheckCircle2 size={size} />
    </div>
);

export default ScannerAlcabala;
