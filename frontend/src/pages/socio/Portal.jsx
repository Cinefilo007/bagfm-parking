import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth.store';
import socioService from '../../services/socioService';
import QRCode from "react-qr-code";
import { 
  User, 
  Car, 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  Clock,
  Phone,
  LogOut
} from 'lucide-react';

// Componentes Tácticos Locales (Blindaje AEGIS contra Fallos de Módulos)
const LayoutHeader = ({ titulo, subtitle }) => (
  <header className="sticky top-0 z-[50] bg-bg-app/90 backdrop-blur-md pb-4 pt-6 px-4 border-b border-white/5 flex items-center justify-between">
    <div>
      <p className="text-primary font-sans font-medium uppercase tracking-[0.1em] text-[10px] mb-1">{subtitle}</p>
      <h1 className="font-display font-bold text-2xl tracking-tight text-white leading-none uppercase">{titulo}</h1>
    </div>
  </header>
);

const TacticalCard = ({ children, className }) => (
  <div className={`rounded-2xl p-4 bg-bg-card border border-white/5 shadow-xl ${className}`}>
    {children}
  </div>
);

const TacticalBadge = ({ children, variant }) => {
  const styles = variant === 'activa' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-danger/10 text-danger border-danger/20';
  return (
    <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase border ${styles}`}>
      {children}
    </span>
  );
};

const TacticalButton = ({ children, onClick, className, variant = 'primario' }) => {
  const base = "flex items-center justify-center p-4 rounded-xl font-black text-[11px] tracking-widest uppercase transition-all active:scale-95";
  const styles = variant === 'primario' 
    ? "bg-primary text-on-primary shadow-tactica" 
    : "bg-white/5 text-text-muted hover:text-white border border-white/5";
  
  return (
    <button onClick={onClick} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
};

export default function PortalSocio() {
  const { logout, user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPortal = async () => {
    try {
      const res = await socioService.obtenerPortal();
      setData(res);
    } catch (err) {
      console.error("Error sincronizando", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortal();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-app flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
           <RefreshCw className="text-primary animate-spin" size={32} />
           <p className="text-[10px] tracking-[0.3em] text-white/40 uppercase font-black">Validando Credencial...</p>
        </div>
      </div>
    );
  }

  const p = data?.perfil || {};
  const m = p?.membresia || {};
  const esActivo = String(m?.estado) === 'activa' || String(m?.estado) === 'exonerada';

  return (
    <div className="min-h-screen bg-bg-app pb-24 flex flex-col font-sans text-text-main">
      <LayoutHeader titulo="Mi Credencial" subtitle={String(data?.nombre_entidad || 'SISTEMA BAGFM')} />

      <main className="flex-1 px-5 py-6 space-y-6 max-w-md mx-auto w-full">
        <TacticalCard className="text-center py-8 relative overflow-hidden">
           {/* Decoración Táctica */}
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />

           <div className="mb-6">
              <TacticalBadge variant={esActivo ? 'activa' : 'suspendida'}>
                {esActivo ? 'ACCESO AUTORIZADO' : 'ACCESO DENEGADO'}
              </TacticalBadge>
           </div>

           {/* QR Code Library Integration */}
           <div className="p-4 bg-white rounded-3xl mx-auto w-52 h-52 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,255,255,0.05)] border-4 border-white/10">
              <div className="p-2 bg-white">
                {data?.qr_token ? (
                  <QRCode 
                    value={String(data.qr_token)} 
                    size={172} 
                    level="H"
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  />
                ) : (
                  <div className="text-black/20 italic text-xs">Token Inderminado</div>
                )}
              </div>
           </div>

           <div className="space-y-1">
              <h2 className="text-xl font-display font-black tracking-tight uppercase text-white">{String(p?.nombre_completo || user?.nombre || 'SAMUEL ROJAS')}</h2>
              <p className="text-[10px] font-mono text-text-muted tracking-[0.3em] font-bold">CÉDULA: {String(p?.cedula || user?.cedula || 'N/A')}</p>
           </div>

           <div className="mt-8 grid grid-cols-2 border-t border-white/5 pt-6 bg-black/10 -mx-4 -mb-4">
              <div className="py-4">
                 <p className="text-[8px] text-text-muted uppercase font-bold tracking-widest mb-1">Estado m.</p>
                 <div className="flex items-center justify-center gap-1.5">
                    {esActivo ? <ShieldCheck size={12} className="text-primary" /> : <ShieldAlert size={12} className="text-danger" />}
                    <p className={`text-[11px] font-black uppercase ${esActivo ? 'text-primary' : 'text-danger'}`}>{String(m?.estado || 'DESCONOCIDO')}</p>
                 </div>
              </div>
              <div className="py-4 border-l border-white/5">
                 <p className="text-[8px] text-white/30 uppercase font-bold tracking-widest mb-1">Vencimiento</p>
                 <div className="flex items-center justify-center gap-1.5">
                    <Clock size={12} className="text-text-muted" />
                    <p className="text-[11px] font-black text-text-main uppercase font-mono">{m?.fecha_fin ? new Date(m.fecha_fin).toLocaleDateString() : 'N/A'}</p>
                 </div>
              </div>
           </div>
        </TacticalCard>

        <div className="space-y-3">
           <h3 className="text-[10px] uppercase font-black text-text-muted tracking-[0.3em] pl-1 flex items-center gap-2">
             <Car size={12} /> Vehículos Vinculados
           </h3>
           {(p?.vehiculos || []).map((v, i) => (
              <div key={i} className="p-4 bg-bg-low/40 border border-white/5 rounded-2xl flex items-center justify-between group">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-text-muted border border-white/5 group-hover:text-primary transition-colors">
                       <Car size={20} />
                    </div>
                    <div>
                       <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest leading-none mb-1">{String(v.marca)} {String(v.modelo)}</p>
                       <p className="text-lg font-mono font-black text-white leading-none">{String(v.placa)}</p>
                    </div>
                 </div>
                 <span className="text-[8px] font-black text-primary bg-primary/10 px-2 py-1 rounded-lg border border-primary/20">ACTIVO</span>
              </div>
           ))}
           {(!p?.vehiculos || p.vehiculos.length === 0) && (
              <p className="text-center py-6 text-text-muted text-[10px] font-bold uppercase tracking-[0.2em] border border-dashed border-white/10 rounded-2xl italic opacity-50">Sin flota asignada</p>
           )}
        </div>

        <div className="pt-6 space-y-4">
           <TacticalButton onClick={fetchPortal} className="w-full">
              <RefreshCw size={16} className="mr-2" /> ACTUALIZAR SISTEMA
           </TacticalButton>
           
           <button 
             onClick={logout}
             className="w-full py-4 text-[10px] font-black text-danger uppercase tracking-[0.3em] flex items-center justify-center gap-2 hover:bg-danger/5 rounded-2xl transition-all"
           >
             <LogOut size={16} /> FINALIZAR SESIÓN
           </button>
        </div>
      </main>
    </div>
  );
}
