import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { QRScanner } from '../../components/alcabala/QRScanner';
import { alcabalaService } from '../../services/alcabala.service';
import { Badge } from '../../components/ui/Badge';
import { Boton } from '../../components/ui/Boton';
import { Card } from '../../components/ui/Card';
import { 
    CheckCircle2, XCircle, AlertTriangle, User, 
    Car, Shield, Zap, Activity, Camera,
    RefreshCw, Power, Clock
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';

const ScannerAlcabala = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const tipoAcceso = searchParams.get('tipo') || 'entrada';
    const [resultado, setResultado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const scannerRef = useRef(null);

    // Formateador de Fecha/Hora Caracas
    const formatCaracas = (dateStr) => {
        if (!dateStr) return 'SIN REGISTRO PREVIO';
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('es-VE', {
            timeZone: 'America/Caracas',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(date);
    };

    const handleScanSuccess = async (qrToken) => {
        if (cargando) return;
        toast.success(`Detección Óptica`, { icon: '🔍', position: 'bottom-center' });
        
        setCargando(true);
        try {
            const res = await alcabalaService.validarQR(qrToken, tipoAcceso);
            setResultado(res);
            toast.success('Identidad Recuperada', { position: 'bottom-center' });
        } catch (error) {
            const errorMsg = error.response?.data?.detail || error.message || "Error Desconocido";
            setResultado({ 
                permitido: false, 
                mensaje: "Error de Protocolo: " + errorMsg, 
                tipo_alerta: "error" 
            });
            toast.error('Fallo en Enlace Táctico', { position: 'bottom-center' });
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
            toast.error("Error al registrar: " + error.message);
        }
    };

    // Mapeo de Colores de Fondo según el Resultado
    const getBgColor = () => {
        if (!resultado) return 'bg-bg-app';
        if (!resultado.permitido || resultado.tipo_alerta === 'error') return 'bg-[#4a0a0a]'; // Rojo oscuro elegante
        if (resultado.infracciones_activas?.length > 0 || resultado.tipo_alerta === 'warning') return 'bg-[#4a3a0a]'; // Amarillo/Ambar oscuro
        return 'bg-[#0a2a4a]'; // Azul oscuro/verde azulado para autorizado
    };

    return (
        <div className={cn("min-h-screen pb-24 flex flex-col transition-colors duration-700", getBgColor())}>
            <Header titulo="Terminal de Escaneo" subtitle={`OPERACIÓN ${tipoAcceso.toUpperCase()}`} />
            
            <main className="flex-1 max-w-2xl mx-auto w-full px-6 pt-2 pb-6 space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                
                {/* VISOR: Solo visible si no hay resultado activo para obligar al foco */}
                {!resultado ? (
                    <>
                        <Card className="bg-black/60 border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative shadow-black/80">
                            <QRScanner 
                                ref={scannerRef}
                                onScanSuccess={handleScanSuccess} 
                                autoStart={true} 
                                status="idle"
                            />
                        </Card>

                        {/* Comandos de Seguridad Compactos */}
                        <div className="grid grid-cols-2 gap-3">
                            <Boton 
                                onClick={() => scannerRef.current?.switchCamera()}
                                variant="outline" 
                                className="h-16 rounded-2xl bg-white/5 border-white/5 flex items-center justify-center gap-3 active:scale-95 transition-all"
                            >
                                <RefreshCw size={20} className="text-primary" />
                                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Lente</span>
                            </Boton>
                            <Boton 
                                onClick={() => scannerRef.current?.toggleScanner()}
                                variant="outline" 
                                className="h-16 rounded-2xl bg-white/5 border-white/5 flex items-center justify-center gap-3 active:scale-95 transition-all"
                            >
                                {scannerRef.current?.isScanning ? (
                                    <>
                                        <Power size={20} className="text-error" />
                                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Apagar</span>
                                    </>
                                ) : (
                                    <>
                                        <Zap size={20} className="text-primary" />
                                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Activar</span>
                                    </>
                                )}
                            </Boton>
                        </div>
                    </>
                ) : (
                    /* RESULTADO INTEGRADO: Ocupa todo el espacio visual */
                    <div className="animate-in zoom-in-95 duration-500 space-y-4 pb-12">
                        {/* Banner de Estado */}
                        <div className={cn(
                            "p-6 rounded-3xl border-2 flex items-center gap-4 transition-all duration-500 backdrop-blur-md",
                            resultado.permitido ? "bg-primary/20 border-primary text-primary" : "bg-error/20 border-error text-error"
                        )}>
                            {resultado.permitido ? <CheckCircle2 size={36} /> : <XCircle size={36} />}
                            <div>
                                <h4 className="text-2xl font-black uppercase italic tracking-tighter leading-none">
                                    {resultado.permitido ? "Acceso Autorizado" : "Ingreso Denegado"}
                                </h4>
                                <p className="text-[10px] font-bold uppercase opacity-80 mt-1 tracking-wider">{resultado.mensaje}</p>
                            </div>
                        </div>

                        {/* Ficha Social y Telemetría Refinada */}
                        {resultado.socio && (
                            <Card className="bg-black/60 backdrop-blur-3xl border-white/10 rounded-[2.5rem] p-5 shadow-2xl relative overflow-hidden">
                                <div className="flex items-center gap-5">
                                    <div className="w-20 h-20 rounded-[1.8rem] bg-white/5 border-2 border-white/10 overflow-hidden shrink-0 shadow-xl">
                                        {resultado.socio.foto_url ? (
                                            <img src={resultado.socio.foto_url} alt="Socio" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center"><User size={32} className="text-white/20" /></div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h5 className="text-xl font-black text-white uppercase italic tracking-tight leading-none mb-2 truncate">
                                            {resultado.socio.nombre} {resultado.socio.apellido}
                                        </h5>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="text-[7px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-widest border border-primary/20">{resultado.entidad_nombre}</span>
                                            <span className="text-[7px] font-black text-white/40 bg-white/5 px-2.5 py-1 rounded-full uppercase tracking-widest border border-white/5">CI: {resultado.socio.cedula}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Telemetría Espacial (Ultima Entrada + Punto) */}
                                <div className="mt-5 p-4 bg-white/5 rounded-3xl border border-white/5 flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center shrink-0">
                                        <Clock size={20} className={resultado.ultima_entrada ? "text-primary" : "text-white/20"} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <span className="text-[7px] font-black text-text-muted uppercase tracking-[0.2em] block mb-1">Último Ingreso Histórico</span>
                                        <p className="text-xs font-black text-white uppercase italic truncate">
                                            {formatCaracas(resultado.ultima_entrada)}
                                        </p>
                                        {resultado.ultima_entrada_punto && (
                                            <p className="text-[8px] font-bold text-primary/60 uppercase mt-0.5 tracking-widest">
                                                Detección en: {resultado.ultima_entrada_punto}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Info Vehículo (Prioridad Operativa) */}
                                <div className="mt-4 p-4 bg-primary/5 rounded-3xl border border-primary/10 flex items-center gap-4">
                                    <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                                        <Car size={20} className="text-primary" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <span className="text-[7px] font-black text-primary/60 uppercase tracking-[0.2em] block mb-1">Unidad Identificada</span>
                                        {resultado.vehiculo ? (
                                            <div className="flex items-baseline gap-2 overflow-hidden">
                                                <p className="text-sm font-black text-white uppercase italic leading-none truncate">
                                                    {resultado.vehiculo.marca} {resultado.vehiculo.modelo}
                                                </p>
                                                <p className="text-lg font-black text-primary leading-none">
                                                    [{resultado.vehiculo.placa}]
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-xs font-black text-error uppercase italic">SIN VEHÍCULO REGISTRADO</p>
                                        )}
                                    </div>
                                </div>

                                {/* Acciones de Comando Final */}
                                <div className="flex gap-3 mt-6">
                                     <Boton 
                                        onClick={() => setResultado(null)}
                                        variant="outline" 
                                        className="flex-1 h-14 rounded-2xl border-white/5 text-text-muted font-bold uppercase text-[9px] tracking-widest hover:bg-white/5"
                                     >
                                         REANUDAR RADAR
                                     </Boton>
                                     <Boton 
                                        disabled={!resultado.permitido}
                                        onClick={handleConfirmar}
                                        className={cn(
                                            "flex-[1.5] h-14 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all",
                                            resultado.permitido 
                                                ? "bg-primary text-bg-app shadow-xl shadow-black/40" 
                                                : "bg-white/5 text-white/10 border-white/5 opacity-40 cursor-not-allowed"
                                        )}
                                     >
                                         CONFIRMAR {tipoAcceso}
                                     </Boton>
                                </div>
                            </Card>
                        )}
                    </div>
                )}
                
                <div className="h-20" />
            </main>

            {/* Overlay de Carga Táctico */}
            {cargando && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-2xl z-[120] flex items-center justify-center animate-in fade-in duration-300">
                     <div className="flex flex-col items-center gap-6">
                         <div className="relative">
                             <Zap className="text-primary animate-pulse absolute inset-0 m-auto" size={32} />
                             <div className="w-24 h-24 border-4 border-primary/10 border-t-primary rounded-full animate-spin shadow-[0_0_20px_var(--color-primary)]"></div>
                         </div>
                         <p className="text-white font-black tracking-[0.5em] text-[8px] uppercase italic animate-pulse">Sincronizando con Base de Datos...</p>
                     </div>
                </div>
            )}
        </div>
    );
};

export default ScannerAlcabala;
