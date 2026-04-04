import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
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
      <div className="h-[500px] bg-bg-card rounded-xl flex items-center justify-center border border-white/5 animate-pulse">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-primary font-display text-xs tracking-widest uppercase">Escaneando Perímetro...</span>
          </div>
      </div>
    );

    return (
        <div className="flex flex-col gap-4">
            {/* Registro de Situación de la Base */}
            <div className="flex justify-between items-center px-2">
                <div className="flex flex-col">
                    <h3 className="text-[11px] font-display font-black text-primary tracking-[0.3em] uppercase underline underline-offset-4 decoration-primary/30">
                        Tactical Overlook // BAGFM
                    </h3>
                    <p className="text-[8px] font-mono text-text-muted mt-1 uppercase">
                       Scanning Perimeter... Latency 12ms // Auth Secure
                    </p>
                </div>
                <div className="flex gap-4">
                   <div className="flex flex-col items-end">
                      <span className="text-[8px] font-display text-text-muted uppercase tracking-tighter">Vehículos Hoy</span>
                      <span className="text-xl font-display text-text-main font-bold">
                        {situacion?.vehiculos_hoy?.toString().padStart(2, '0') || '00'}
                      </span>
                   </div>
                   <div className="flex flex-col items-end">
                      <span className="text-[8px] font-display text-text-muted uppercase tracking-tighter">Alertas Activas</span>
                      <span className={`text-xl font-display font-bold ${situacion?.alertas_activas > 0 ? 'text-danger' : 'text-success'}`}>
                        {situacion?.alertas_activas?.toString().padStart(2, '0') || '00'}
                      </span>
                   </div>
                </div>
            </div>

            {/* Mapa de Situación Real (Leaflet) */}
            <div className="h-[500px] relative">
                <MapaBaseReal 
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
                     <button onClick={() => setSelected(null)} className="text-text-muted hover:text-white transition-colors">×</button>
                  </div>
                  {selected.capacidad_total && (
                     <div className="mt-2">
                        <div className="flex justify-between text-[10px] mb-1 font-bold">
                           <span className="text-text-sec uppercase">Estado del Estacionamiento</span>
                           <span className="text-warning">{selected.ocupacion_actual}/{selected.capacidad_total} VEH</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                           <div 
                              className="h-full bg-warning transition-all duration-1000" 
                              style={{ width: `${(selected.ocupacion_actual / selected.capacidad_total) * 100}%` }}
                           ></div>
                        </div>
                        <div className="flex justify-between mt-1">
                           <span className="text-[8px] font-mono text-text-muted uppercase">Nivel de Alerta: { (selected.ocupacion_actual / selected.capacidad_total) > 0.8 ? 'ALTO' : 'NOMINAL' }</span>
                           <span className="text-[8px] font-mono text-text-muted uppercase">Sync: Online</span>
                        </div>
                     </div>
                   )}
                   {selected.latitud && (
                      <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
                         <div className="text-[9px] font-mono text-text-muted uppercase tracking-tighter">
                            GeoRef: {selected.latitud.toFixed(4)}, {selected.longitud.toFixed(4)}
                         </div>
                         <div className="text-[9px] font-mono text-text-muted uppercase tracking-tighter">
                            HASH-ID: {selected.id.split('-')[0]}
                         </div>
                      </div>
                   )}
               </div>
            )}
        </div>
    );
};

export default MapaTactico;
