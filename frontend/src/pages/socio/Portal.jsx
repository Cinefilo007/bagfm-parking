import React, { useState, useEffect } from 'react';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Boton } from '../../components/ui/Boton';
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
import { useAuthStore } from '../../store/auth.store';

export default function PortalSocio() {
  const { logout } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPortal = async () => {
    setLoading(true);
    try {
      const res = await socioService.obtenerPortal();
      setData(res);
      setError(null);
    } catch (err) {
      console.error("Error cargando portal", err);
      setError("No se pudo sincronizar su credencial táctica.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortal();
  }, []);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-bg-app flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="mx-auto text-primary animate-spin" size={32} />
          <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Autenticando Credenciales...</p>
        </div>
      </div>
    );
  }

  const p = data?.perfil;
  const m = p?.membresia;
  const esActivo = m?.estado === 'activa' || m?.estado === 'exonerada';
  const esVencido = m?.progreso?.vencida;
  const esSuspendido = m?.estado === 'suspendida';

  return (
    <div className="min-h-screen bg-bg-app pb-20">
      <Header 
        titulo="Portal del Socio" 
        subtitle={data?.nombre_entidad || 'SISTEMA BAGFM'} 
      />

      <main className="px-5 py-6 max-w-md mx-auto space-y-6">
        {/* Card Principal de Identidad */}
        <Card elevation={2} className="relative overflow-hidden border-white/5 py-8">
          {/* Fondo decorativo táctico */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          
          <div className="flex flex-col items-center text-center">
            {/* Estado del Acceso */}
            <div className="mb-6">
              <Badge variant={esActivo && !esVencido ? 'activa' : 'suspendida'} className="scale-110 shadow-lg shadow-black/20">
                {esActivo && !esVencido ? 'ACCESO AUTORIZADO' : 'ACCESO DENEGADO'}
              </Badge>
            </div>

            {/* QR Code */}
            <div className={`p-4 bg-white rounded-3xl mb-6 shadow-2xl transition-all duration-500 scale-100 ring-4 ${esActivo && !esVencido ? 'ring-primary/20' : 'ring-danger/20'}`}>
              <div className="bg-white p-1">
                {data?.qr_token ? (
                  <QRCode 
                    value={data.qr_token} 
                    size={180}
                    level="H"
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  />
                ) : (
                  <div className="w-[180px] h-[180px] flex items-center justify-center bg-gray-100 rounded-xl">
                    <ShieldAlert size={48} className="text-gray-300" />
                  </div>
                )}
              </div>
            </div>

            {/* Datos del Socio */}
            <div className="space-y-1">
              <h2 className="text-xl font-display font-black text-text-main tracking-tight uppercase">
                {data?.perfil?.nombre_completo}
              </h2>
              <p className="text-xs font-mono text-text-muted tracking-[0.2em] font-bold">
                CÉDULA: {data?.perfil?.cedula}
              </p>
            </div>
          </div>

          {/* Información de Membresía */}
          <div className="mt-8 grid grid-cols-2 gap-px bg-white/5 border-t border-white/5">
             <div className="p-4 text-center group transition-colors hover:bg-white/5">
                <p className="text-[9px] uppercase font-bold text-text-muted mb-1 tracking-widest">Estado</p>
                <div className="flex items-center justify-center gap-1.5">
                   {esActivo ? <ShieldCheck size={14} className="text-primary" /> : <ShieldAlert size={14} className="text-danger" />}
                   <p className={`text-[11px] font-black uppercase ${esActivo ? 'text-primary' : 'text-danger'}`}>
                      {m?.estado}
                   </p>
                </div>
             </div>
             <div className="p-4 text-center group transition-colors hover:bg-white/5 border-l border-white/5">
                <p className="text-[9px] uppercase font-bold text-text-muted mb-1 tracking-widest">Vencimiento</p>
                <div className="flex items-center justify-center gap-1.5">
                   <Clock size={14} className="text-text-muted" />
                   <p className="text-[11px] font-black text-text-main uppercase">
                      {m?.fecha_fin ? new Date(m.fecha_fin).toLocaleDateString() : 'N/A'}
                   </p>
                </div>
             </div>
          </div>
        </Card>

        {/* Vehículos Autorizados */}
        <div className="space-y-3">
           <h3 className="text-[10px] uppercase font-black text-text-muted tracking-[0.3em] pl-1 flex items-center gap-2">
             <Car size={12} /> Vehículos Vinculados
           </h3>
           <div className="grid grid-cols-1 gap-3">
              {data?.perfil?.vehiculos?.map((v, i) => (
                <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-black/40 rounded-xl flex items-center justify-center border border-white/5 text-text-muted group-hover:text-primary transition-colors">
                      <Car size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none mb-1">{v.marca} {v.modelo}</p>
                      <p className="text-lg font-mono font-black text-text-main leading-none">{v.placa}</p>
                    </div>
                  </div>
                  <Badge variant="activa" className="bg-primary/10 text-primary border-none text-[8px]">AUTORIZADO</Badge>
                </div>
              ))}
              {(!data?.perfil?.vehiculos || data.perfil.vehiculos.length === 0) && (
                <p className="text-center py-4 text-text-muted text-[10px] font-bold uppercase tracking-widest italic border border-dashed border-white/10 rounded-2xl">
                  Sin vehículos registrados
                </p>
              )}
           </div>
        </div>

        {/* Acciones e Información de contacto */}
        <div className="space-y-3 pt-4">
           {esSuspendido || esVencido ? (
             <div className="p-4 bg-danger/5 border border-danger/20 rounded-2xl space-y-3">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="text-danger shrink-0" size={20} />
                  <div>
                    <h4 className="text-sm font-bold text-text-main uppercase">Atención Requerida</h4>
                    <p className="text-[10px] text-text-muted font-medium leading-relaxed mt-1">
                      Su acceso ha sido restringido por {esSuspendido ? 'suspensión administrativa' : 'vencimiento de membresía'}. 
                      Por favor, contacte a su entidad para regularizar su situación.
                    </p>
                  </div>
                </div>
                <Boton variant="ghost" className="w-full bg-danger/10 border-danger/10 text-danger hover:bg-danger/20 text-[10px] font-black tracking-widest">
                  <Phone size={14} className="mr-2" /> CONTACTAR SOPORTE
                </Boton>
             </div>
           ) : null}

           <Boton 
             variant="ghost" 
             className="w-full h-12 bg-white/5 border-white/5 text-text-muted hover:text-white"
             onClick={fetchPortal}
           >
             <RefreshCw size={16} className="mr-2" /> ACTUALIZAR ESTADO
           </Boton>

           <button 
             onClick={logout}
             className="w-full py-4 text-[10px] font-black text-danger uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-danger/5 rounded-2xl transition-all"
           >
             <LogOut size={16} /> CERRAR SESIÓN TÁCTICA
           </button>
        </div>
      </main>
    </div>
  );
}
