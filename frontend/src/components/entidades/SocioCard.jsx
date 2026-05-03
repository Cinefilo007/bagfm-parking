import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Boton } from '../ui/Boton';
import { 
  User, 
  Car, 
  Calendar, 
  RefreshCw, 
  Pause, 
  Play, 
  ShieldCheck, 
  ChevronDown,
  Clock,
  ShieldAlert
} from 'lucide-react';

export const SocioCard = ({ socio, onAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const tieneVehiculos = socio.vehiculos && socio.vehiculos.length > 0;
  const m = socio.membresia;
  const progreso = m?.progreso;
  
  const esActivo = m?.estado === 'activa';
  const esExonerado = m?.estado === 'exonerada';
  const esSuspendido = m?.estado === 'suspendida';
  const esVencido = progreso?.vencida || m?.estado === 'vencida';

  // Determinar color y mensaje de estado
  let statusColor = 'text-text-muted';
  let statusLabel = 'SIN ACCESO';
  let badgeVariant = 'sin-membresia';

  if (esExonerado) {
    statusColor = 'text-primary';
    statusLabel = 'EXONERADO';
    badgeVariant = 'activa';
  } else if (esActivo && !esVencido) {
    statusColor = 'text-primary';
    statusLabel = 'ACTIVO';
    badgeVariant = 'activa';
  } else if (esSuspendido) {
    statusColor = 'text-danger';
    statusLabel = 'SUSPENDIDO';
    badgeVariant = 'suspendida';
  } else if (esVencido) {
    statusColor = 'text-amber-500';
    statusLabel = 'VENCIDO';
    badgeVariant = 'pendiente';
  }

  return (
    <Card elevation={1} className={`group relative overflow-hidden border-white/5 transition-all duration-300 hover:border-white/10 ${isOpen ? 'ring-1 ring-primary/20 bg-bg-high/5' : ''}`}>
      {/* Indicador de estado superior */}
      <div className={`absolute top-0 left-0 w-1 h-full ${statusColor.replace('text-', 'bg-')}`} />
      
      <div 
        className="flex justify-between items-start cursor-pointer group/header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className={`h-11 w-11 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 transition-colors group-hover:border-primary/30 ${statusColor}`}>
            <User size={22} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-main leading-none mb-1.5 flex items-center gap-2">
              {socio.nombre_completo}
              {esExonerado && <ShieldCheck size={14} className="text-primary" />}
            </h4>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-[10px] text-text-muted font-mono uppercase tracking-widest">
                ID: {socio.cedula}
              </p>
              <span className="text-white/10">•</span>
              <p className="text-[10px] font-bold uppercase tracking-tighter text-text-muted/60">
                {socio.telefono || 'SIN TEL'}
              </p>
              {socio.email && (
                <>
                  <span className="text-white/10">•</span>
                  <p className="text-[10px] font-bold text-primary/40 lowercase tracking-tight truncate max-w-[150px] sm:max-w-none">
                    {socio.email}
                  </p>
                </>
              )}
            </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end mr-2">
            <span className="text-[8px] font-black text-text-muted uppercase tracking-widest opacity-40">Membresía</span>
            <span className={`text-[10px] font-black uppercase ${statusColor}`}>{statusLabel}</span>
          </div>
          <Badge variant={badgeVariant}>
            {statusLabel}
          </Badge>
          <ChevronDown size={16} className={`text-text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Barra de Progreso de Membresía (Siempre Visible si existe) */}
      {m && !esExonerado && (
        <div className="mt-4 px-1">
          <div className="flex justify-between items-end mb-1.5">
            <div className="flex items-center gap-2">
               <Clock size={12} className="text-text-muted/40" />
               <span className="text-[8px] uppercase font-bold tracking-widest text-text-muted">TIEMPO DE ACCESO</span>
            </div>
            <span className={`text-[10px] font-mono font-bold ${progreso.porcentaje > 80 ? 'text-danger' : 'text-text-muted'}`}>
              {progreso.dias_restantes} DÍAS RESTANTES
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div 
              className={`h-full transition-all duration-1000 ${
                progreso.porcentaje > 90 ? 'bg-danger' : 
                progreso.porcentaje > 70 ? 'bg-amber-500' : 'bg-primary'
              }`}
              style={{ width: `${100 - progreso.porcentaje}%` }}
            />
          </div>
        </div>
      )}

      {/* SECCIÓN DESPLEGABLE */}
      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 mt-6 border-t border-white/5 pt-4">
          {esExonerado && (
            <div className="mb-4 px-3 py-2 bg-primary/5 rounded-lg border border-primary/10 flex items-center gap-3">
              <ShieldCheck size={16} className="text-primary" />
              <p className="text-[10px] font-bold text-primary/80 uppercase tracking-widest">Acceso Permanente (Exonerado)</p>
            </div>
          )}

          {/* Resumen de Vehículos y Fecha */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
            <div className="md:col-span-8 p-3 bg-white/2 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Car size={14} className="text-primary" />
                <span className="text-[10px] uppercase font-black text-text-muted tracking-widest">Unidades Vinculadas</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tieneVehiculos ? (
                  socio.vehiculos.map((v, idx) => (
                    <div key={idx} className="flex flex-col gap-1 bg-black/20 p-2.5 rounded-xl border border-white/5 hover:border-primary/20 transition-all">
                      <div className="flex justify-between items-center">
                         <span className="text-xs font-black text-primary font-mono tracking-wider">{v.placa}</span>
                         <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-white/5 text-text-muted/60 uppercase">{v.color || 'COLOR N/A'}</span>
                      </div>
                      <span className="text-[10px] font-bold text-text-main uppercase opacity-80">{v.marca} {v.modelo}</span>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-4 text-center">
                    <p className="text-[10px] font-black text-danger/40 uppercase tracking-widest italic">Sin Unidades en Sistema</p>
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-4 p-3 bg-white/2 rounded-xl border border-white/5 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={14} className="text-secondary" />
                <span className="text-[10px] uppercase font-black text-text-muted tracking-widest">Estado de Vigencia</span>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                 <p className="text-[9px] font-bold text-text-muted uppercase mb-1">Vencimiento del Ciclo</p>
                 <p className="text-2xl font-black font-mono text-text-main italic">
                   {m?.fecha_fin ? new Date(m.fecha_fin).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : 'NO ASIGNADA'}
                 </p>
              </div>
            </div>
          </div>

          {/* Acciones Tácticas */}
          <div className="pt-4 border-t border-white/5 grid grid-cols-2 md:grid-cols-3 gap-2">
            <Boton 
              variant="ghost" 
              className="h-9 text-[9px] bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
              onClick={() => onAction('renovacion', socio)}
            >
              <RefreshCw size={14} className="mr-1.5" /> RENOVAR
            </Boton>
            
            <Boton 
              variant="ghost" 
              className={`h-9 text-[9px] ${esSuspendido ? 'bg-primary/5 border-primary/10 text-primary' : 'bg-danger/5 border-danger/10 text-danger'}`}
              onClick={() => onAction('estado', { socio, nuevoEstado: esSuspendido ? 'activa' : 'suspendida' })}
            >
              {esSuspendido ? <Play size={14} className="mr-1.5" /> : <Pause size={14} className="mr-1.5" />}
              {esSuspendido ? 'ACTIVAR' : 'SUSPENDER'}
            </Boton>

            <Boton 
              variant="ghost" 
              className={`h-9 text-[9px] col-span-2 md:col-span-1 ${esExonerado ? 'bg-primary/20 border-primary/30 text-primary font-black' : 'bg-white/5 border-white/10 text-text-muted'}`}
              onClick={() => onAction('estado', { socio, nuevoEstado: esExonerado ? 'activa' : 'exonerada' })}
            >
              <ShieldAlert size={14} className="mr-1.5" /> {esExonerado ? 'EXONERADO' : 'EXONERAR'}
            </Boton>
          </div>
        </div>
      )}
    </Card>
  );
};
