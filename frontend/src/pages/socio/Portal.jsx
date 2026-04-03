import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth.store';
import socioService from '../../services/socioService';

// Componentes Embebidos para eliminar cualquier fallo de importación (SOP AEGIS)
const HeaderSimulado = ({ titulo, subtitle }) => (
  <header className="sticky top-0 z-[50] bg-[#0A0D0E]/90 backdrop-blur-md pb-4 pt-6 px-4 border-b border-white/5">
    <p className="text-[#36A2FF] font-sans font-medium uppercase tracking-[0.1em] text-[10px] mb-1">{subtitle}</p>
    <h1 className="font-display font-bold text-2xl tracking-tight text-white leading-none uppercase">{titulo}</h1>
  </header>
);

const CardSimulada = ({ children, className }) => (
  <div className={`rounded-2xl p-4 bg-[#141819] border border-white/5 transition-all ${className}`}>
    {children}
  </div>
);

const BadgeSimulada = ({ children, variant }) => {
  const styles = variant === 'activa' ? 'bg-[#36A2FF]/10 text-[#36A2FF]' : 'bg-[#FF4A5F]/10 text-[#FF4A5F]';
  return (
    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest uppercase border border-current/20 ${styles}`}>
      {children}
    </span>
  );
};

const BotonSimulado = ({ children, onClick, className }) => (
  <button 
    onClick={onClick}
    className={`flex items-center justify-center p-3 rounded-xl bg-[#36A2FF] text-[#0A0D0E] font-black text-[11px] tracking-widest uppercase transition-all active:scale-95 ${className}`}
  >
    {children}
  </button>
);

export default function PortalSocio() {
  const { logout, user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPortal = async () => {
    try {
      const res = await socioService.obtenerPortal();
      setData(res);
    } catch (err) {
      console.error("Fallo de sincronización", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortal();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0D0E] flex items-center justify-center">
        <p className="text-[10px] tracking-widest text-white/40 uppercase font-black animate-pulse">Sincronizando Sistema...</p>
      </div>
    );
  }

  const p = data?.perfil || {};
  const m = p?.membresia || {};
  const esActivo = String(m?.estado) === 'activa' || String(m?.estado) === 'exonerada';

  return (
    <div className="min-h-screen bg-[#0A0D0E] pb-24 flex flex-col font-sans text-white">
      <HeaderSimulado titulo="Mi Credencial" subtitle={String(data?.nombre_entidad || 'SISTEMA BAGFM')} />

      <main className="flex-1 px-5 py-6 space-y-6 max-w-md mx-auto w-full">
        <CardSimulada className="text-center py-8">
           <div className="mb-6">
              <BadgeSimulada variant={esActivo ? 'activa' : 'suspendida'}>
                {esActivo ? 'ACCESO AUTORIZADO' : 'ACCESO DENEGADO'}
              </BadgeSimulada>
           </div>

           {/* QR MANUAL (SVG Simple para evitar librerías externas que causen Error 130) */}
           <div className="p-4 bg-white rounded-2xl mx-auto w-48 h-48 flex items-center justify-center mb-6 shadow-2xl">
              {data?.qr_token ? (
                 <div className="text-black font-mono text-[8px] break-all p-2 uppercase leading-tight">
                    {String(data.qr_token)}
                    <div className="mt-2 text-[12px] font-black">QR TÁCTICO ACTIVO</div>
                 </div>
              ) : (
                 <div className="text-black/20 text-[10px] font-black italic">NIVEL 0: TOKEN NO DISPONIBLE</div>
              )}
           </div>

           <div className="space-y-1">
              <h2 className="text-xl font-black tracking-tight uppercase">{String(p?.nombre_completo || user?.nombre || 'SOCIO NO IDENTIFICADO')}</h2>
              <p className="text-[10px] font-mono text-white/40 tracking-[0.3em]">CÉDULA: {String(p?.cedula || user?.cedula || 'N/A')}</p>
           </div>

           <div className="mt-8 grid grid-cols-2 border-t border-white/5 pt-4">
              <div>
                 <p className="text-[8px] text-white/30 uppercase font-bold tracking-widest">Estado</p>
                 <p className={`text-[10px] font-black uppercase ${esActivo ? 'text-[#36A2FF]' : 'text-[#FF4A5F]'}`}>{String(m?.estado || 'DESCONOCIDO')}</p>
              </div>
              <div className="border-l border-white/5">
                 <p className="text-[8px] text-white/30 uppercase font-bold tracking-widest">Fin Membresía</p>
                 <p className="text-[10px] font-black uppercase">{m?.fecha_fin ? new Date(m.fecha_fin).toLocaleDateString() : 'INDET.'}</p>
              </div>
           </div>
        </CardSimulada>

        <div className="space-y-3">
           <h3 className="text-[10px] uppercase font-black text-white/30 tracking-[0.3em] pl-1">Vehículos Vinculados</h3>
           {(p?.vehiculos || []).map((v, i) => (
              <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
                 <div>
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest leading-none mb-1">{String(v.marca)} {String(v.modelo)}</p>
                    <p className="text-lg font-mono font-black leading-none">{String(v.placa)}</p>
                 </div>
                 <span className="text-[8px] font-black text-[#36A2FF] bg-[#36A2FF]/10 px-2 py-1 rounded-lg">ACTIVO</span>
              </div>
           ))}
           {(!p?.vehiculos || p.vehiculos.length === 0) && (
              <p className="text-center py-6 text-white/20 text-[9px] font-black uppercase tracking-[0.2em] border border-dashed border-white/10 rounded-2xl italic">Sin flota asignada</p>
           )}
        </div>

        <div className="pt-6 space-y-3">
           <BotonSimulado onClick={fetchPortal} className="w-full">
              REVALIDAR CREDENCIAL
           </BotonSimulado>
           <button 
             onClick={logout}
             className="w-full py-4 text-[10px] font-black text-[#FF4A5F] uppercase tracking-[0.2em] hover:bg-[#FF4A5F]/5 rounded-2xl transition-all"
           >
             FINALIZAR SESIÓN TÁCTICA
           </button>
        </div>
      </main>
    </div>
  );
}
