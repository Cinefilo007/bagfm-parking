import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { User, Car, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const SocioCard = ({ socio }) => {
  const tieneVehiculos = socio.vehiculos && socio.vehiculos.length > 0;
  const membresiaActual = socio.membresias && socio.membresias.length > 0 ? socio.membresias[0] : null;
  const esActivo = membresiaActual?.estado?.toLowerCase() === 'activa';
  
  return (
    <Card elevation={1} className={`relative overflow-hidden border-white/5 transition-all duration-300 hover:scale-[1.01] ${esActivo ? 'hover:border-primary/40' : 'hover:border-danger/40'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-text-muted">
            <User size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-main leading-none mb-1">
              {socio.nombre_completo || `${socio.nombre} ${socio.apellido}`}
            </h4>
            <p className="text-[10px] text-text-muted font-mono uppercase tracking-widest">
              ID: {socio.cedula}
            </p>
          </div>
        </div>
        
        {membresiaActual ? (
          <Badge variant={membresiaActual.estado.toLowerCase() === 'activo' ? 'activa' : 'suspendida'}>
            {membresiaActual.estado}
          </Badge>
        ) : (
          <Badge variant="sin-membresia">SIN ACCESO</Badge>
        )}
      </div>

      {/* Resumen de Acceso y Vehículos */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
          <span className="text-[8px] uppercase tracking-widest text-text-muted block font-bold">Vehículos</span>
          <div className="flex items-center gap-1.5">
             <Car size={14} className={tieneVehiculos ? "text-primary" : "text-text-muted/30"} />
             <span className={`text-[11px] font-bold font-mono ${tieneVehiculos ? "text-text-main" : "text-text-muted"}`}>
               {tieneVehiculos ? `${socio.vehiculos.length} AUTORIZADOS` : 'SIN REGISTRO'}
             </span>
          </div>
          {tieneVehiculos && (
            <p className="text-[9px] text-text-muted truncate font-mono">
              {socio.vehiculos.map(v => v.placa).join(', ')}
            </p>
          )}
        </div>

        <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
          <span className="text-[8px] uppercase tracking-widest text-text-muted block font-bold">Estado</span>
          <div className="flex items-center gap-1.5">
             {esActivo ? (
               <CheckCircle2 size={14} className="text-primary" />
             ) : (
               <ShieldAlert size={14} className="text-danger" />
             )}
             <span className={`text-[11px] font-bold uppercase tracking-widest ${esActivo ? "text-primary" : "text-danger"}`}>
               {esActivo ? 'VIGENTE' : 'CADUCADO'}
             </span>
          </div>
          <p className="text-[9px] text-text-muted truncate">
             {membresiaActual ? `VENCE: ${new Date(membresiaActual.fecha_vencimiento).toLocaleDateString()}` : 'REVISAR ACCESO'}
          </p>
        </div>
      </div>
    </Card>
  );
};
