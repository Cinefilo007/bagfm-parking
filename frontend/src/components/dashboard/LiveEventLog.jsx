import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LogIn, LogOut, AlertCircle, Clock, ShieldCheck, Zap } from 'lucide-react';
import { alcabalaService } from '../../services/alcabala.service';

const LiveEventLog = ({ puntoNombre = null }) => {
    const [eventos, setEventos] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [polling, setPolling] = useState(false);
    
    const containerRef = useRef(null);
    const isFetchingRef = useRef(false);

    const loadEventos = useCallback(async (isInitial = false, pageNum = 1) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        
        if (isInitial) setPolling(true);
        else setLoading(true);

        try {
            const data = await alcabalaService.getHistorialTactico(pageNum, 20, puntoNombre);
            
            if (isInitial || pageNum === 1) {
                // Polling or initial load: prepend new items uniquely
                setEventos(prev => {
                    if (pageNum === 1 && !isInitial) {
                        return data.items;
                    }
                    // For polling, just merge carefully (assuming ID is unique)
                    const existingIds = new Set(prev.map(e => e.id));
                    const newItems = data.items.filter(e => !existingIds.has(e.id));
                    return [...newItems, ...prev]; // Prepend new
                });
            } else {
                // Infinite scroll load more
                setEventos(prev => {
                    const existingIds = new Set(prev.map(e => e.id));
                    const newItems = data.items.filter(e => !existingIds.has(e.id));
                    return [...prev, ...newItems]; // Append at end
                });
            }

            setHasMore(data.items.length === 20);
        } catch (error) {
            console.error("Error loading tactical events:", error);
        } finally {
            if (isInitial) setPolling(false);
            else setLoading(false);
            isFetchingRef.current = false;
        }
    }, [puntoNombre]);

    // Initial Load & Polling Interval
    useEffect(() => {
        loadEventos(false, 1);
        
        const interval = setInterval(() => {
            loadEventos(true, 1);
        }, 10000); // Poll every 10 seconds

        return () => clearInterval(interval);
    }, [loadEventos]);

    // Infinite Scroll Intersection Observer implementation logic
    const handleScroll = (e) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore && !loading && !isFetchingRef.current) {
            setPage(prev => {
                const next = prev + 1;
                loadEventos(false, next);
                return next;
            });
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden relative">
            {polling && (
                <div className="absolute top-2 right-2 bg-primary/20 p-1 rounded-full animate-pulse z-10">
                    <Zap size={10} className="text-primary" />
                </div>
            )}
            
            <div 
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 pb-8"
            >
                {eventos.length === 0 && !loading && !polling ? (
                    <div className="h-full min-h-[150px] flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl bg-bg-card/20">
                        <ShieldCheck size={32} className="text-text-muted opacity-20 mb-3" />
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] opacity-40">Sin novedad en el frente</p>
                    </div>
                ) : (
                    eventos.map((evento) => (
                        <div key={evento.id} className="flex items-start gap-3 p-3 bg-bg-low/40 rounded-2xl border border-bg-high/5 hover:bg-bg-high/10 transition-all group animate-in slide-in-from-right-4 duration-300">
                            <div className={`mt-0.5 p-2 rounded-xl border ${
                              evento.tipo === 'entrada' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                              evento.tipo === 'salida' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                              'bg-red-500/10 text-red-500 border-red-500/20'
                            }`}>
                              {evento.tipo === 'entrada' ? <LogIn size={14} /> : 
                               evento.tipo === 'salida' ? <LogOut size={14} /> : 
                               <AlertCircle size={14} />}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <span className="text-[10px] font-black text-text-main uppercase truncate pr-2">
                                  {evento.usuario}
                                </span>
                                <span className="text-[8px] font-mono text-text-muted mt-0.5 shrink-0">
                                  {new Date(evento.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              </div>
                              
                              <p className="text-[9px] text-text-muted font-bold uppercase tracking-tight mt-0.5 flex items-center gap-1">
                                <Clock size={10} className="opacity-40" />
                                {evento.tipo === 'entrada' ? 'Ingreso por' : 'Egreso por'} <span className="text-primary/70">{evento.punto}</span>
                              </p>
                              {evento.vehiculo && evento.vehiculo !== "SIN VEHÍCULO" && (
                                <p className="text-[8px] font-black text-primary/60 uppercase tracking-widest mt-0.5 ml-3.5 flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-primary/40 inline-block"/>
                                  Vehículo: {evento.vehiculo}
                                </p>
                              )}
                            </div>
                        </div>
                    ))
                )}
                
                {loading && (
                    <div className="py-4 flex justify-center">
                        <div className="flex gap-1 h-1 w-12">
                            <div className="flex-1 bg-primary/40 rounded-full animate-pulse" />
                            <div className="flex-1 bg-primary/40 rounded-full animate-pulse delay-75" />
                            <div className="flex-1 bg-primary/40 rounded-full animate-pulse delay-150" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveEventLog;
