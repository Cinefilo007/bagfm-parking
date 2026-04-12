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
            toast.loading("Georreferenciando...", { id: 'geo' });
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

    if (loading) return (
      <div className="h-[450px] bg-bg-card rounded-2xl flex items-center justify-center border border-bg-high/10 animate-pulse">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-primary font-display text-xs tracking-widest uppercase">Estableciendo Link Satelital...</span>
          </div>
      </div>
    );

    return (
        <div className="flex flex-col gap-6 h-full relative">
            {/* Mapa de Situación Real */}
            <div className="flex-1 relative z-0 border border-bg-high/10 rounded-3xl overflow-hidden shadow-2xl bg-bg-low">
                <MapaBaseReal 
                    situacion={situacion} 
                    onSelectEntity={(e) => setSelected(e)} 
                    assignmentMode={isAssigning}
                    onMapClick={handleMapClick}
                    selectedForMove={selectedEntityToMove}
                    isFullscreen={false}
                />

                {/* BOTÓN FLOTANTE: Georreferenciar */}
                <div className="absolute bottom-6 left-6 z-[1000]">
                    {!isAssigning ? (
                        <button 
                           onClick={() => setShowSelectionModal(true)}
                           className="w-12 h-12 bg-primary text-bg-app rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(78,222,163,0.4)] hover:scale-110 active:scale-95 transition-all outline-none border-none"
                        >
                           <span className="text-3xl font-light leading-none mb-1">+</span>
                        </button>
                    ) : (
                        <div className="flex items-center gap-4 bg-warning/90 backdrop-blur-md border border-warning px-4 py-2 rounded-2xl shadow-xl animate-pulse">
                           <span className="text-[10px] font-black text-bg-app uppercase tracking-widest leading-none">{selectedEntityToMove?.nombre}</span>
                           <button 
                              onClick={() => { setIsAssigning(false); setSelectedEntityToMove(null); }}
                              className="px-3 py-1 bg-bg-app text-warning rounded-lg text-[9px] font-bold uppercase hover:bg-warning hover:text-bg-app transition-colors"
                           >
                              Cancelar
                           </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Selección */}
            {showSelectionModal && (
               <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-bg-app/80 backdrop-blur-sm">
                  <div className="bg-bg-card w-full max-w-md rounded-2xl border border-bg-high/10 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
                     <div className="p-6 border-b border-bg-high/10 flex justify-between items-center bg-bg-low/50">
                        <h4 className="text-sm font-display font-bold uppercase tracking-widest text-text-main">Seleccionar Entidad</h4>
                        <button onClick={() => setShowSelectionModal(false)} className="text-text-muted hover:text-text-main"><X size={18} /></button>
                     </div>
                     
                     <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 no-scrollbar">
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest mb-1 px-2">Entidades para Ubicar</span>
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
                              className="flex items-center justify-between p-4 bg-bg-high/5 rounded-xl border border-bg-high/5 hover:bg-bg-high/10 hover:border-primary/30 transition-all text-left outline-none"
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
