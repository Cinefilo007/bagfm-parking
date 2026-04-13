import React from 'react';
import { LogIn, LogOut, AlertCircle, Clock, ShieldCheck } from 'lucide-react';

const EventMonitor = ({ eventos = [] }) => {
  return (
    <div className="flex flex-col h-full bg-bg-card rounded-3xl border border-bg-high/10 overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-bg-high/10 bg-bg-high/5 flex justify-between items-center">
        <div>
          <h3 className="text-xs font-display font-black text-text-main uppercase tracking-widest">Monitor Táctico de Eventos</h3>
          <p className="text-[9px] text-text-muted font-bold font-mono uppercase mt-0.5">Link Satelital // Live Stream</p>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 bg-primary/10 rounded-full border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[8px] font-black text-primary uppercase">Sync</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar space-y-3">
        {!eventos || eventos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
            <ShieldCheck size={32} className="mb-2 text-primary/50" />
            <p className="text-[10px] uppercase font-black tracking-widest text-text-muted">Sin actividad operativa reciente</p>
          </div>
        ) : (
          eventos.map((evento) => (
            <div 
              key={evento.id} 
              className="flex items-start gap-3 p-3 bg-bg-low/40 rounded-2xl border border-bg-high/5 hover:bg-bg-high/10 transition-all group animate-in slide-in-from-right-4 duration-300"
            >
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
                {evento.vehiculo && (
                  <p className="text-[8px] font-black text-primary/60 uppercase tracking-widest mt-0.5 ml-3.5">
                    Unidad: {evento.vehiculo}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 bg-bg-high/5 border-t border-bg-high/10 flex justify-between items-center opacity-60">
        <span className="text-[8px] font-mono uppercase tracking-widest text-text-muted">BAGFM Overlook Protocol v4.2.1</span>
        <div className="flex gap-1 h-1.5 w-16">
          <div className="flex-1 bg-emerald-500/40 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
          <div className="flex-1 bg-primary/40 rounded-full animate-pulse shadow-[0_0_8px_rgba(78,222,163,0.3)] delay-75" />
          <div className="flex-1 bg-emerald-500/40 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.3)] delay-150" />
        </div>
      </div>
    </div>
  );
};

export default EventMonitor;
