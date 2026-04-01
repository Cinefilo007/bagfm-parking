import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { User, Car, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const SocioCard = ({ socio }) => {
  const tieneMembresia = socio.membresias && socio.membresias.length > 0;
  const membresiaActual = tieneMembresia ? socio.membresias[0] : null;
  
  return (
    <Card elevation={1} className="relative overflow-hidden border-white/5 hover:border-primary/30 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-text-muted">
            <User size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-main leading-none mb-1">
              {socio.nombre_completo}
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

      {membresiaActual && (
        <div className="mt-4 grid grid-cols-2 gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
          <div className="space-y-1">
            <span className="text-[8px] uppercase tracking-widest text-text-muted block">Vehículo</span>
            <div className="flex items-center gap-1.5 text-text-sec">
               <Car size={14} className="text-primary/60" />
               <span className="text-xs font-bold font-mono">{membresiaActual.vehiculo_placa}</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[8px] uppercase tracking-widest text-text-muted block">Vence</span>
            <div className="flex items-center gap-1.5 text-text-sec">
               <ShieldAlert size={14} className="text-warning/60" />
               <span className="text-xs font-medium">
                 {new Date(membresiaActual.fecha_vencimiento).toLocaleDateString()}
               </span>
            </div>
          </div>
        </div>
      )}
      
      {!membresiaActual && (
        <div className="mt-4 p-3 bg-danger/5 rounded-xl border border-danger/10 flex items-center justify-center gap-2">
           <ShieldAlert size={14} className="text-danger" />
           <span className="text-[10px] text-danger uppercase font-bold tracking-widest">Requiere Regularización</span>
        </div>
      )}
    </Card>
  );
};
