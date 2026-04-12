import React, { useEffect, useState } from 'react';
import { Target, MapPin, X, Check, Search, Filter, Maximize2, Minimize2, Shield, Users, Car } from 'lucide-react';
import { mapaService } from '../services/mapaService';
import MapaBaseReal from './MapaBaseReal';
import { Card } from './ui/Card';
import { toast } from 'react-hot-toast';

const MapaTactico = ({ pollingEnabled = true, situacionPreload = null }) => {
    const [situacion, setSituacion] = useState(situacionPreload);
    const [loading, setLoading] = useState(!situacionPreload);
    const [selected, setSelected] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Estados para modo asignación
    const [isAssigning, setIsAssigning] = useState(false);
    const [selectedEntityToMove, setSelectedEntityToMove] = useState(null);
    const [showSelectionModal, setShowSelectionModal] = useState(false);

    const fetchSituacion = async () => {
        try {
            const data = await mapaService.getSituacion();
            setSituacion(data);
        } catch (error) {
            console.error("Error cargando situación táctica:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (situacionPreload) {
            setSituacion(situacionPreload);
            setLoading(false);
        }
    }, [situacionPreload]);

    useEffect(() => {
        if (pollingEnabled) {
            fetchSituacion();
            const interval = setInterval(fetchSituacion, 30000);
            return () => clearInterval(interval);
        }
    }, [pollingEnabled]);

    const handleMapClick = async (lat, lng) => {
        if (!selectedEntityToMove) return;

        try {
            toast.loading("Geresolviendo ubicación...", { id: 'geo' });
            await mapaService.actualizarUbicacion(
                selectedEntityToMove.tipo,
                selectedEntityToMove.id,
                lat,
                lng
            );
            toast.success("Ubicación táctica establecida", { id: 'geo' });
            setIsAssigning(false);
            setSelectedEntityToMove(null);
            fetchSituacion();
        } catch (error) {
            toast.error("Error al georreferenciar", { id: 'geo' });
        }
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    if (loading) return (
      <div className="h-[450px] bg-bg-card rounded-2xl flex items-center justify-center border border-bg-high/10 animate-pulse">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-primary font-display text-xs tracking-widest uppercase">Estableciendo Link Satelital...</span>
          </div>
      </div>
    );

    return (
        <div className={`flex flex-col gap-6 h-full relative transition-all duration-500 ${isFullscreen ? 'fixed inset-0 z-[3000] bg-bg-app p-6' : ''}`}>
            
            {/* Mapa de Situación Real */}
            <div className="flex-1 relative z-0 border border-bg-high/10 rounded-3xl overflow-hidden shadow-2xl bg-bg-low">
                <MapaBaseReal 
                    situacion={situacion} 
                    onSelectEntity={(e) => setSelected(e)} 
                    assignmentMode={isAssigning}
                    onMapClick={handleMapClick}
                    selectedForMove={selectedEntityToMove}
                />

                {/* BOTÓN: Fullscreen Toggle */}
                <div className="absolute top-4 right-4 z-[1000]">
                    <button 
                        onClick={toggleFullscreen}
                        className="w-10 h-10 bg-bg-card/80 backdrop-blur-md text-text-main rounded-xl flex items-center justify-center border border-bg-high/20 shadow-lg hover:scale-105 active:scale-95 transition-all"
                    >
                        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>
                </div>

                {/* BOTÓN FLOTANTE: Georreferenciar (Esquina Inferior Izquierda) */}
                <div className="absolute bottom-6 left-6 z-[1000]">
                    {!isAssigning ? (
                        <button 
                           onClick={() => setShowSelectionModal(true)}
                           className="w-12 h-12 bg-primary text-bg-app rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(78,222,163,0.4)] hover:scale-110 active:scale-95 transition-all outline-none border-none group"
                           title="Georreferenciar Entidad"
                        >
                           <span className="text-3xl font-light leading-none mb-1">+</span>
                        </button>
                    ) : (
                        <div className="flex items-center gap-4 bg-warning/90 backdrop-blur-md border border-warning px-4 py-2 rounded-2xl shadow-xl animate-pulse">
                           <span className="text-[10px] font-black text-bg-app uppercase tracking-widest">{selectedEntityToMove?.nombre}</span>
                           <button 
                              onClick={() => { setIsAssigning(false); setSelectedEntityToMove(null); }}
                              className="px-3 py-1 bg-bg-app text-warning rounded-lg text-[9px] font-bold uppercase hover:bg-warning hover:text-bg-app transition-colors"
                           >
                              Cancelar
                           </button>
                        </div>
                    )}
                </div>

                {/* OVERLAYS LATERALES (Solo en Fullscreen) */}
                {isFullscreen && (
                    <div className="absolute top-4 left-4 z-[1000] w-64 flex flex-col gap-4 animate-in slide-in-from-left duration-500">
                        <Card className="bg-bg-card/90 backdrop-blur-md border-bg-high/10 p-4 shadow-2xl">
                            <h4 className="text-[10px] font-display font-black text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Shield size={12} /> Estado Alcabalas
                            </h4>
                            <div className="space-y-2">
                                {situacion?.alcabalas.map(alc => (
                                    <div key={alc.id} className="flex justify-between items-center text-[10px]">
                                        <span className="text-text-main font-bold truncate pr-2 uppercase">{alc.nombre}</span>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-emerald-500 font-mono font-bold">{alc.entradas_hoy} IN</span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card className="bg-bg-card/90 backdrop-blur-md border-bg-high/10 p-4 shadow-2xl">
                            <h4 className="text-[10px] font-display font-black text-warning uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Users size={12} /> Ocupación Entidades
                            </h4>
                            <div className="space-y-3">
                                {situacion?.entidades.slice(0, 4).map(ent => (
                                    <div key={ent.id} className="space-y-1">
                                        <div className="flex justify-between text-[9px] font-bold uppercase text-text-main">
                                            <span>{ent.nombre}</span>
                                            <span className="text-text-muted">{ent.ocupacion_actual}/{ent.capacidad_total}</span>
                                        </div>
                                        <div className="h-1 bg-bg-high/20 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-warning transition-all duration-1000" 
                                                style={{ width: `${(ent.ocupacion_actual / ent.capacidad_total) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                )}
            </div>

            {/* TEXTO DEBAJO DEL MAPA */}
            {!isFullscreen && (
                <div className="flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity">
                    <div className="flex flex-col border-l-2 border-primary/50 pl-4">
                        <h3 className="text-[11px] font-display font-black text-text-main tracking-[0.2em] uppercase">
                            Unidad de Vigilancia Perimetral
                        </h3>
                        <p className="text-[8px] font-mono text-primary/70 uppercase">
                            BAGFM OVERLOOK // ENCRIPTACIÓN ACTIVA AES-256 // SYNC: {new Date().toLocaleTimeString()}
                        </p>
                    </div>
                </div>
            )}

            {/* Modal de Selección de Entidad para Georreferenciar */}
            {showSelectionModal && (
               <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-bg-app/80 backdrop-blur-sm">
                  <div className="bg-bg-card w-full max-w-md rounded-2xl border border-bg-high/10 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
                     <div className="p-6 border-b border-bg-high/10 flex justify-between items-center bg-bg-low/50">
                        <h4 className="text-sm font-display font-bold uppercase tracking-widest text-text-main">Seleccionar Entidad</h4>
                        <button onClick={() => setShowSelectionModal(false)} className="text-text-muted hover:text-text-main"><X size={18} /></button>
                     </div>
                     
                     <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 no-scrollbar">
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest mb-1 px-2">Entidades para Ubicar</span>
                        
                        {/* Grupos de Entidades a Seleccionar (Seguridad anti-null) */}
                        {[
                           ...(situacion?.entidades || []).map(e => ({...e, tipo_label: 'Entidad Civil', tipo: 'entidad', color: 'text-text-muted'})),
                           ...(situacion?.alcabalas || []).map(a => ({...a, tipo_label: 'Control Acceso', tipo: 'alcabala', color: 'text-primary'})),
                           ...(situacion?.zonas_estacionamiento || []).map(z => ({...z, tipo_label: 'Zona Logística', tipo: 'zona', color: 'text-warning'}))
                        ].map(item => (
                           <button 
                              key={`${item.tipo}-${item.id}`}
                              onClick={() => {
                                 setSelectedEntityToMove(item);
                                 setIsAssigning(true);
                                 setShowSelectionModal(false);
                                 toast.success(`Modo Georreferencia: Haz clic en el mapa para ubicar ${item.nombre}`);
                              }}
                              className="flex items-center justify-between p-4 bg-bg-high/5 rounded-xl border border-bg-high/5 hover:bg-bg-high/10 hover:border-primary/30 transition-all text-left"
                           >
                              <div className="flex flex-col">
                                 <span className={`text-[8px] font-black uppercase tracking-tighter ${item.color}`}>{item.tipo_label}</span>
                                 <span className="text-xs font-bold text-text-main uppercase">{item.nombre}</span>
                                 {(!item.latitud) && <span className="text-[9px] text-danger font-bold mt-1 uppercase italic underline underline-offset-4">¡SIN UBICACIÓN EN EL MAPA!</span>}
                              </div>
                              <Target size={16} className="text-primary opacity-50" />
                           </button>
                        ))}
                     </div>
                  </div>
               </div>
            )}
        </div>
    );
};

export default MapaTactico;
