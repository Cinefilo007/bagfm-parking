import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { QRScanner } from '../../components/alcabala/QRScanner';
import { alcabalaService } from '../../services/alcabala.service';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Boton } from '../../components/ui/Boton';
import { Card } from '../../components/ui/Card';
import { CheckCircle2, XCircle, AlertTriangle, User, Car, Shield } from 'lucide-react';
import { Header } from '../../components/layout/Header';

const ScannerAlcabala = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const tipoAcceso = searchParams.get('tipo') || 'entrada';
    const [resultado, setResultado] = useState(null);
    const [mostrandoModal, setMostrandoModal] = useState(false);
    const [cargando, setCargando] = useState(false);

    const handleScanSuccess = async (qrToken) => {
        setCargando(true);
        try {
            const res = await alcabalaService.validarQR(qrToken, tipoAcceso);
            setResultado(res);
            setMostrandoModal(true);
        } catch (error) {
            console.error(error);
            setResultado({ permitido: false, mensaje: "Error al validar el código QR en el servidor.", tipo_alerta: "error" });
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
            // Éxito: volver al dashboard
            navigate('/alcabala/dashboard');
        } catch (error) {
            alert("Error al registrar el acceso");
        }
    };

    const getAlertaColor = (tipo) => {
        if (tipo === 'error') return 'text-error bg-error/10 border-error/20';
        if (tipo === 'warning') return 'text-warning bg-warning/10 border-warning/20';
        return 'text-primary bg-primary/10 border-primary/20';
    };

    return (
        <div className="min-h-screen bg-bg-app pb-10">
            <Header />
            
            <main className="p-4 flex flex-col items-center gap-6 animate-fade-in max-w-lg mx-auto">
                <div className="text-center mt-4">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                        ESCANEANDO <span className={tipoAcceso === 'entrada' ? 'text-primary' : 'text-warning'}>{tipoAcceso}</span>
                    </h2>
                    <p className="text-text-muted text-sm mt-1">Apunta al código QR principal del socio</p>
                </div>

                <QRScanner onScanSuccess={handleScanSuccess} />

                {cargando && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center">
                         <div className="bg-bg-low p-8 rounded-3xl flex flex-col items-center gap-4 border border-white/5">
                             <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                             <p className="text-white font-bold tracking-widest text-sm italic">CONSULTANDO SISTEMA...</p>
                         </div>
                    </div>
                )}

                {/* Modal de Resultado */}
                <Modal 
                    isOpen={mostrandoModal} 
                    onClose={() => setMostrandoModal(false)}
                    title="VALIDACIÓN DE ACCESO"
                    className="max-w-md w-full rounded-[2.5rem]"
                >
                    <div className="flex flex-col gap-6 py-2">
                        {/* Status Header */}
                        <div className={`p-6 rounded-3xl border flex items-center gap-4 ${getAlertaColor(resultado?.tipo_alerta)} transition-all duration-500`}>
                            {resultado?.permitido ? (
                                <CheckCircle2 size={40} className="shrink-0" />
                            ) : (
                                <XCircle size={40} className="shrink-0 text-error" />
                            )}
                            <div className="flex-1">
                                <h3 className="text-lg font-black uppercase tracking-tight leading-none">
                                    {resultado?.permitido ? "PERMITIDO" : "DENEGADO"}
                                </h3>
                                <p className="text-xs font-semibold opacity-80 mt-1 uppercase leading-tight tracking-wider">
                                    {resultado?.mensaje}
                                </p>
                            </div>
                        </div>

                        {/* Ficha del Socio (Solo si es permitido o warning) */}
                        {resultado?.socio && (
                            <section className="flex flex-col gap-3">
                                <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] px-2">DATOS DE IDENTIDAD</h4>
                                <Card className="p-5 flex flex-col gap-5 border-white/5 shadow-2xl rounded-3xl bg-bg-low/40">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                                            {resultado.socio.foto_url ? (
                                                <img src={resultado.socio.foto_url} alt="Socio" className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="text-white/20" size={32} />
                                            )}
                                        </div>
                                        <div>
                                            <h5 className="text-white font-bold text-lg leading-tight">{resultado.socio.nombre} {resultado.socio.apellido}</h5>
                                            <p className="text-text-muted text-xs font-medium uppercase tracking-wider">{resultado.entidad_nombre}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                                        <div className="flex items-center gap-3 text-text-muted">
                                             <Shield size={14} className="text-primary" />
                                             <span className="text-xs font-bold text-white/80">{resultado.socio.cedula}</span>
                                        </div>
                                        {resultado.vehiculo && (
                                            <div className="flex items-center gap-3 text-text-muted">
                                                 <Car size={14} className="text-warning" />
                                                 <span className="text-xs font-bold text-white/80">{resultado.vehiculo.placa} — {resultado.vehiculo.marca} {resultado.vehiculo.modelo}</span>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </section>
                        )}

                        {/* Infracciones Alert */}
                        {resultado?.infracciones_activas?.length > 0 && (
                            <section className="flex flex-col gap-2">
                                <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                    <AlertTriangle size={12} className="text-error" /> SANCIONES ACTIVAS
                                </h4>
                                {resultado.infracciones_activas.map((inf, idx) => (
                                    <div key={idx} className="bg-error/10 p-3 rounded-2xl border border-error/10 flex items-start gap-3">
                                         <AlertTriangle size={16} className="text-error mt-0.5 shrink-0" />
                                         <p className="text-[11px] text-text-muted leading-tight">
                                             <span className="font-black text-error/80 uppercase mr-1">{inf.tipo}:</span> {inf.descripcion}
                                         </p>
                                    </div>
                                ))}
                            </section>
                        )}

                        <div className="flex gap-3 mt-4">
                             <Boton 
                                variant="outline" 
                                className="flex-1 h-16 rounded-2xl border-white/5 text-text-muted font-bold text-sm uppercase tracking-widest"
                                onClick={() => setMostrandoModal(false)}
                             >
                                 Cancelar
                             </Boton>
                             <Boton 
                                disabled={!resultado?.permitido}
                                className={`flex-1 h-16 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg ${resultado?.permitido ? 'bg-primary shadow-primary/20' : 'bg-bg-low text-white/20'}`}
                                onClick={handleConfirmar}
                             >
                                 {tipoAcceso === 'entrada' ? 'Marcar Entrada' : 'Marcar Salida'}
                             </Boton>
                        </div>
                    </div>
                </Modal>
            </main>
        </div>
    );
};

export default ScannerAlcabala;
