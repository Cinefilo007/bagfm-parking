import React, { useEffect, useState } from 'react';
import { mapaService } from '../services/mapaService';
import MapaBaseReal from './MapaBaseReal';

const MapaTactico = () => {
    const [situacion, setSituacion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
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

        fetchSituacion();
        const interval = setInterval(fetchSituacion, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return (
      <div className="h-[500px] bg-bg-card rounded-2xl flex items-center justify-center border border-white/5 animate-pulse">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-primary font-display text-xs tracking-widest uppercase">Escaneando Perímetro...</span>
          </div>
      </div>
    );

    return (
        <div className="flex flex-col gap-6">
            {/* Cabecera del Mapa (Minimalista) */}
            <div className="flex flex-col border-l-2 border-primary/50 pl-4">
                <h3 className="text-[12px] font-display font-black text-white tracking-[0.2em] uppercase">
                    Unidad de Vigilancia Perimetral
                </h3>
                <p className="text-[9px] font-mono text-primary/70 uppercase">
                    BAGFM OVERLOOK // ENCRIPTACIÓN ACTIVA AES-256 // SYNC: {new Date().toLocaleTimeString()}
                </p>
            </div>

            {/* Mapa de Situación Real (Leaflet) */}
            <div className="h-[500px] lg:h-[600px] relative z-0">
                <MapaBaseReal 
                    situacion={situacion} 
                    onSelectEntity={(e) => setSelected(e)} 
                />
            </div>

            {/* Tactical Detail Overlay (Selected Entity Info) */}
            {selected && (
               <div className="bg-bg-high/80 backdrop-blur-xl p-5 rounded-2xl border border-primary/30 shadow-[0_0_50px_rgba(78,222,163,0.1)] animate-in slide-in-from-left">
                  <div className="flex justify-between items-start mb-4">
                     <div>
                        <h4 className="text-[10px] text-primary uppercase font-bold tracking-[0.2em] mb-1">Entidad Detectada</h4>
                        <p className="text-xl font-display text-white font-black uppercase leading-tight">{selected.nombre || 'Desconocido'}</p>
                     </div>
                     <button 
                        onClick={() => setSelected(null)} 
                        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/20 transition-all text-white font-bold"
                     >
                        ×
                     </button>
                  </div>
                  
                  {selected.capacidad_total ? (
                     <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                              <span className="text-[9px] uppercase font-bold text-text-muted">Ocupación</span>
                              <div className="text-lg font-display text-white font-black">{selected.ocupacion_actual} / {selected.capacidad_total}</div>
                           </div>
                           <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                              <span className="text-[9px] uppercase font-bold text-text-muted">Estado</span>
                              <div className={`text-lg font-display font-black uppercase ${ (selected.ocupacion_actual / selected.capacidad_total) > 0.8 ? 'text-danger' : 'text-primary' }`}>
                                 { (selected.ocupacion_actual / selected.capacidad_total) > 0.8 ? 'Lleno' : 'Operativo' }
                              </div>
                           </div>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                           <div 
                              className={cn(
                                 "h-full transition-all duration-1000 scroll-smooth",
                                 (selected.ocupacion_actual / selected.capacidad_total) > 0.8 ? 'bg-danger shadow-[0_0_15px_rgba(255,23,23,0.5)]' : 'bg-primary shadow-[0_0_15px_rgba(78,222,163,0.5)]'
                              )} 
                              style={{ width: `${(selected.ocupacion_actual / (selected.capacidad_total || 1)) * 100}%` }}
                           ></div>
                        </div>
                     </div>
                  ) : (
                     <div className="text-sm font-mono text-text-muted italic bg-white/5 p-4 rounded-xl">
                        Aguardando datos de telemetría adicionales...
                     </div>
                  )}
                  
                  {selected.latitud && (
                     <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-text-muted/60">
                        <span>COORD: {selected.latitud.toFixed(4)}N {selected.longitud.toFixed(4)}W</span>
                        <span className="uppercase">Ref-ID: {selected.id.split('-')[0]}</span>
                     </div>
                  )}
               </div>
            )}
        </div>
    );
};

// Helper simple para CN ya que no lo importe
const cn = (...classes) => classes.filter(Boolean).join(' ');

export default MapaTactico;
