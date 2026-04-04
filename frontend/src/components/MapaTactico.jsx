import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { mapaService } from '../services/mapaService';
import MapaBaseSVG from './MapaBaseSVG';

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
      <div className="h-[500px] bg-bg-card rounded-xl flex items-center justify-center border border-white/5 animate-pulse">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-primary font-display text-xs tracking-widest uppercase">Escaneando Perímetro...</span>
          </div>
      </div>
    );

    return (
        <div className="flex flex-col gap-4">
            {/* Mapa Base SVG */}
            <div className="h-[500px]">
                <MapaBaseSVG 
                    situacion={situacion} 
                    onSelectEntity={(e) => setSelected(e)} 
                />
            </div>

            {/* Tactical Detail Overlay (Selected Entity Info) */}
            {selected && (
               <div className="glass-card p-4 rounded-lg border-l-4 border-primary animate-in slide-in-from-left">
                  <div className="flex justify-between items-start">
                     <div>
                        <h4 className="text-[10px] text-primary uppercase font-display font-black tracking-widest">Información Táctica</h4>
                        <p className="text-lg font-display text-text-main font-bold uppercase">{selected.nombre}</p>
                     </div>
                     <button onClick={() => setSelected(null)} className="text-text-muted hover:text-white">×</button>
                  </div>
                  {selected.capacidad_total && (
                     <div className="mt-2">
                        <div className="flex justify-between text-[10px] mb-1 font-bold">
                           <span className="text-text-sec">STATUS: {selected.status || 'OPERATIVO'}</span>
                           <span className="text-warning">{selected.ocupacion_actual}/{selected.capacidad_total}</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                           <div className="h-full bg-warning" style={{ width: `${(selected.ocupacion_actual / selected.capacidad_total) * 100}%` }}></div>
                        </div>
                     </div>
                   )}
                   {selected.latitud && (
                      <div className="mt-2 text-[9px] font-mono text-text-muted">
                         LOC: {selected.latitud}, {selected.longitud} // ID-REF: {selected.id.split('-')[0]}
                      </div>
                   )}
               </div>
            )}
        </div>
    );
};

export default MapaTactico;
