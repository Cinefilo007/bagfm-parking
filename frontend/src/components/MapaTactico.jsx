import React, { useEffect, useState } from 'react';
import { Target, MapPin, X, Check, Search, Filter } from 'lucide-react';
import { mapaService } from '../services/mapaService';
import MapaBaseReal from './MapaBaseReal';
import { Card } from './ui/Card';
import { toast } from 'react-hot-toast';

const MapaTactico = () => {
    const [situacion, setSituacion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    
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
        fetchSituacion();
        const interval = setInterval(fetchSituacion, 30000);
        return () => clearInterval(interval);
    }, []);

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

    if (loading) return (
      <div className="h-[450px] bg-bg-card rounded-2xl flex items-center justify-center border border-white/5 animate-pulse">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-primary font-display text-xs tracking-widest uppercase">Estableciendo Link Satelital...</span>
          </div>
      </div>
    );

    return (
        <div className="flex flex-col gap-6">
            
            {/* HERRAMIENTAS DE GEORREFERENCIA */}
            <div className="flex items-center justify-between">
                {!isAssigning ? (
                    <button 
                       onClick={() => setShowSelectionModal(true)}
                       className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all shadow-[0_0_15px_rgba(78,222,163,0.1)]"
                    >
                       <MapPin size={14} />
                       Georreferenciar Entidad
                    </button>
                ) : (
                    <div className="flex items-center gap-4 bg-warning/10 border border-warning/30 p-2 rounded-xl">
                       <span className="text-[10px] font-black text-warning uppercase px-2">Modo Asignación: {selectedEntityToMove?.nombre}</span>
                       <button 
                          onClick={() => { setIsAssigning(false); setSelectedEntityToMove(null); }}
                          className="p-1 px-3 bg-danger/20 text-danger rounded-lg text-[9px] font-bold uppercase"
                       >
                          Cancelar
                       </button>
                    </div>
                )}
            </div>

            {/* Mapa de Situación Real */}
            <div className="h-[450px] relative z-0">
                <MapaBaseReal 
                    situacion={situacion} 
                    onSelectEntity={(e) => setSelected(e)} 
                    assignmentMode={isAssigning}
                    onMapClick={handleMapClick}
                    selectedForMove={selectedEntityToMove}
                />
            </div>

            {/* TEXTO DEBAJO DEL MAPA - Como pidió el usuario */}
            <div className="flex flex-col border-l-2 border-primary/50 pl-4 py-2">
                <h3 className="text-[12px] font-display font-black text-white tracking-[0.2em] uppercase">
                    Unidad de Vigilancia Perimetral
                </h3>
                <p className="text-[9px] font-mono text-primary/70 uppercase">
                    BAGFM OVERLOOK // ENCRIPTACIÓN ACTIVA AES-256 // SYNC: {new Date().toLocaleTimeString()}
                </p>
            </div>

            {/* Modal de Selección de Entidad para Georreferenciar */}
            {showSelectionModal && (
               <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-bg-app/80 backdrop-blur-sm">
                  <div className="bg-bg-card w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
                     <div className="p-6 border-b border-white/5 flex justify-between items-center bg-bg-low/50">
                        <h4 className="text-sm font-display font-bold uppercase tracking-widest text-white">Seleccionar Entidad</h4>
                        <button onClick={() => setShowSelectionModal(false)} className="text-text-muted hover:text-white"><X size={18} /></button>
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
                              className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 hover:border-primary/30 transition-all text-left"
                           >
                              <div className="flex flex-col">
                                 <span className={`text-[8px] font-black uppercase tracking-tighter ${item.color}`}>{item.tipo_label}</span>
                                 <span className="text-xs font-bold text-white uppercase">{item.nombre}</span>
                                 {(!item.latitud) && <span className="text-[9px] text-danger font-bold mt-1 uppercase italic underline underline-offset-4">¡SIN UBICACIÓN EN EL MAPA!</span>}
                              </div>
                              <Target size={16} className="text-primary opacity-50" />
                           </button>
                        ))}
                     </div>
                  </div>
               </div>
            )}

            {/* Tactical Detail Overlay (Selected Entity Info) */}
            {selected && !isAssigning && (
               <div className="bg-bg-high/80 backdrop-blur-xl p-5 rounded-2xl border border-primary/30 shadow-[0_0_50px_rgba(78,222,163,0.1)] animate-in slide-in-from-left">
                  <div className="flex justify-between items-start mb-4">
                     <div>
                        <h4 className="text-[10px] text-primary uppercase font-bold tracking-[0.2em] mb-1">Entidad Detectada</h4>
                        <p className="text-xl font-display text-white font-black uppercase leading-tight">{selected.nombre}</p>
                     </div>
                     <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/20 transition-all text-white font-bold">×</button>
                  </div>
                  
                  {selected.capacidad_total ? (
                     <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                              <span className="text-[9px] uppercase font-bold text-text-muted">Ocupación</span>
                              <div className="text-lg font-display text-white font-black">{selected.ocupacion_actual} / {selected.capacidad_total}</div>
                           </div>
                           <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                              <span className="text-[9px] uppercase font-bold text-text-muted">Estado</span>
                              <div className={`text-lg font-display font-black uppercase ${ (selected.ocupacion_actual / selected.capacidad_total) > 0.8 ? 'text-danger' : 'text-primary' }`}>
                                 { (selected.ocupacion_actual / selected.capacidad_total) > 0.8 ? 'Saturado' : 'Nominal' }
                              </div>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <p className="text-[11px] text-text-muted italic bg-white/5 p-3 rounded-lg">Analizando patrones de acceso perimetral en tiempo real...</p>
                  )}
               </div>
            )}
        </div>
    );
};

export default MapaTactico;
