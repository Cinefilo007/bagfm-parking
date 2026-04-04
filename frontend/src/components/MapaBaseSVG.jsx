import React, { useMemo } from 'react';
import { Shield, Building, SquareParking } from 'lucide-react';

/**
 * MapaBaseSVG: Un componente que renderiza el perímetro táctico de la base
 * utilizando un SVG dinámico basado en coordenadas reales de La Carlota.
 */
const MapaBaseSVG = ({ situacion, onSelectEntity }) => {
  // Límites aproximados del perímetro de La Carlota (BAGFM)
  const BOUNDS = {
    latMin: 10.4780,
    latMax: 10.4940,
    lonMin: -66.8580,
    lonMax: -66.8250
  };

  // Coordenadas del polígono del perímetro (estimadas para el SVG)
  const PERIMETRO_NODOS = [
    { lat: 10.4905, lon: -66.8550 }, // NW Tip (Near Cubo Negro)
    { lat: 10.4925, lon: -66.8400 }, // North Central (Highway side)
    { lat: 10.4915, lon: -66.8285 }, // NE Tip (Near Parque del Este)
    { lat: 10.4850, lon: -66.8270 }, // East Entry
    { lat: 10.4795, lon: -66.8380 }, // SE (River side)
    { lat: 10.4815, lon: -66.8565 }, // SW (Chuao side)
  ];

  // Función de proyección: Coordenada Geográfica -> Coordenada SVG (0-1000)
  const proyectar = (lat, lon) => {
    const x = ((lon - BOUNDS.lonMin) / (BOUNDS.lonMax - BOUNDS.lonMin)) * 1000;
    const y = ((BOUNDS.latMax - lat) / (BOUNDS.latMax - BOUNDS.latMin)) * 1000;
    return { x, y };
  };

  // Generar el path del perímetro
  const perimetroPath = useMemo(() => {
    return PERIMETRO_NODOS.map((n, i) => {
      const { x, y } = proyectar(n.lat, n.lon);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ') + ' Z';
  }, []);

  // Proyectar entidades
  const renderEntidades = (lista, icono, color) => {
    return lista.map(item => {
      if (!item.latitud || !item.longitud) return null;
      const { x, y } = proyectar(item.latitud, item.longitud);
      const IconComp = icono;
      
      return (
        <g key={item.id} 
           className="cursor-pointer group" 
           onClick={() => onSelectEntity(item)}
           style={{ transition: 'all 0.3s ease' }}
        >
          {/* Aura / Glow */}
          <circle cx={x} cy={y} r="12" fill={color} fillOpacity="0.1" className="group-hover:fill-opacity-20 animate-pulse" />
          {/* Nodo */}
          <circle cx={x} cy={y} r="4" fill={color} className="group-hover:r-6" />
          {/* Etiqueta flotante sutil */}
          <text x={x} y={y - 12} textAnchor="middle" fill="white" fontSize="10" className="opacity-0 group-hover:opacity-100 font-display uppercase tracking-widest fill-text-sec pointer-events-none">
            {item.nombre}
          </text>
        </g>
      );
    });
  };

  return (
    <div className="w-full h-full bg-bg-app relative overflow-hidden flex flex-col border border-white/5 rounded-xl shadow-tactica">
      {/* HUD Header */}
      <div className="absolute top-0 left-0 w-full p-4 z-10 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col">
          <span className="text-[10px] font-display font-black text-primary tracking-[0.3em] uppercase">Tactical Overlook // BAGFM</span>
          <span className="text-[8px] font-mono text-text-muted mt-0.5">SCANNING PERIMETER... 10.485N / 66.843W</span>
        </div>
        <div className="flex gap-4">
           <div className="flex flex-col items-end">
              <span className="text-[8px] font-display text-text-muted uppercase">Sectores Activos</span>
              <span className="text-xl font-display text-text-main font-bold">04</span>
           </div>
        </div>
      </div>

      {/* SVG Map Container */}
      <div className="flex-1 relative cursor-crosshair">
        <svg viewBox="0 0 1000 1000" className="w-full h-full p-12">
          {/* Background Grid */}
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="1000" height="1000" fill="url(#grid)" />

          {/* Runway Approximation (Vía Principal) */}
          <path 
            d="M 120 480 L 880 480" 
            stroke="rgba(78, 222, 163, 0.05)" 
            strokeWidth="40" 
            strokeDasharray="20 10"
          />

          {/* Base Perimeter */}
          <path 
            d={perimetroPath} 
            fill="rgba(16, 185, 129, 0.03)" 
            stroke="rgba(16, 185, 129, 0.3)" 
            strokeWidth="2"
            strokeDasharray="5 5"
          />

          {/* Renderizado de Entidades Tácticas */}
          {situacion && (
            <>
              {/* Zonas de Estacionamiento (con indicador de capacidad circular) */}
              {situacion.zonas_estacionamiento.map(zona => {
                 if (!zona.latitud || !zona.longitud) return null;
                 const { x, y } = proyectar(zona.latitud, zona.longitud);
                 const perc = Math.min((zona.ocupacion_actual / zona.capacidad_total), 1);
                 return (
                   <g key={zona.id} className="cursor-pointer group" onClick={() => onSelectEntity(zona)}>
                      {/* Radio de cobertura */}
                      <circle cx={x} cy={y} r="25" fill="none" stroke="#F59E0B" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
                      {/* Barra de progreso circular */}
                      <circle cx={x} cy={y} r="6" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                      <circle cx={x} cy={y} r="6" fill="none" stroke="#F59E0B" strokeWidth="2" 
                              strokeDasharray={`${perc * 37.7} 37.7`} 
                              transform={`rotate(-90 ${x} ${y})`}
                      />
                      <SquareParking x={x-8} y={y-22} size={16} className="text-warning opacity-0 group-hover:opacity-100 transition-opacity" />
                   </g>
                 );
              })}

              {/* Alcabalas */}
              {renderEntidades(situacion.alcabalas, Shield, '#4EDEA3')}
              
              {/* Entidades Civiles */}
              {renderEntidades(situacion.entidades, Building, '#DEE1F7')}
            </>
          )}
        </svg>
      </div>

      {/* Footer / Legend */}
      <div className="p-3 bg-bg-low/50 border-t border-white/5 flex items-center justify-between">
          <div className="flex gap-4">
             <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <span className="text-[9px] uppercase font-bold text-text-sec">Alcabala</span>
             </div>
             <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-warning"></div>
                <span className="text-[9px] uppercase font-bold text-text-sec">Estacionamientos</span>
             </div>
          </div>
          <div className="text-[8px] font-mono text-text-muted">
            AUTO-SYNC: ACTIVE // LATENCY 12ms
          </div>
      </div>
    </div>
  );
};

export default MapaBaseSVG;
