import React from 'react';
import { LogIn, LogOut, AlertCircle, Clock, ShieldCheck } from 'lucide-react';
import LiveEventLog from './LiveEventLog';

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

      <div className="flex-1 overflow-hidden p-2 relative h-[500px]">
        {/* Usar el nuevo manejador de scroll infinito en tiempo real */}
        <LiveEventLog />
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
