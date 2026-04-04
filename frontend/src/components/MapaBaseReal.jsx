import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Shield, Building, SquareParking } from 'lucide-react';
import { renderToString } from 'react-dom/server';

// Fix para los iconos por defecto de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createTacticalIcon = (IconComponent, color) => {
  const html = renderToString(
    <div style={{
      color: color,
      backgroundColor: 'rgba(14, 19, 34, 0.95)',
      padding: '6px',
      borderRadius: '8px',
      border: `2px solid ${color}`,
      boxShadow: `0 0 20px ${color}44`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: 'rotate(45deg)'
    }}>
      <div style={{ transform: 'rotate(-45deg)' }}>
        <IconComponent size={20} strokeWidth={2.5} />
      </div>
    </div>
  );

  return L.divIcon({
    html,
    className: 'tactical-icon-wrapper',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const MapaBaseReal = ({ situacion, onSelectEntity }) => {
  const center = [10.4851, -66.8436]; 
  const bounds = [
    [10.46, -66.88], // Sudoeste
    [10.51, -66.80]  // Nordeste
  ];

  const hasCoords = (item) => {
      return item && typeof item.latitud === 'number' && typeof item.longitud === 'number';
  };

  return (
    <div className="w-full h-full bg-bg-app relative flex flex-col gap-4">
      {/* Contenedor del Mapa con Zoom y Límites Bloqueados */}
      <div className="flex-1 min-h-[400px] border border-white/5 rounded-2xl shadow-tactica overflow-hidden relative z-0">
          <MapContainer 
            center={center} 
            zoom={15} 
            minZoom={14}
            maxZoom={18}
            maxBounds={bounds}
            maxBoundsViscosity={1.0}
            scrollWheelZoom={true} 
            className="w-full h-full"
            style={{ background: '#0E1322' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {situacion && (
              <>
                {situacion.alcabalas?.filter(hasCoords).map(alcabala => (
                  <Marker 
                    key={`alcabala-${alcabala.id}`}
                    position={[alcabala.latitud, alcabala.longitud]}
                    icon={createTacticalIcon(Shield, '#4EDEA3')}
                    eventHandlers={{ click: () => onSelectEntity(alcabala) }}
                  >
                    <Popup className="tactical-popup">
                      <div className="p-1">
                          <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Cuerpos de Seguridad</div>
                          <div className="text-sm font-bold uppercase text-white">{alcabala.nombre}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {situacion.entidades?.filter(hasCoords).map(entidad => (
                  <Marker 
                    key={`entidad-${entidad.id}`}
                    position={[entidad.latitud, entidad.longitud]}
                    icon={createTacticalIcon(Building, '#DEE1F7')}
                    eventHandlers={{ click: () => onSelectEntity(entidad) }}
                  >
                    <Popup className="tactical-popup">
                        <div className="p-1">
                            <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Sede Administrativa</div>
                            <div className="text-sm font-bold uppercase text-white">{entidad.nombre}</div>
                        </div>
                    </Popup>
                  </Marker>
                ))}

                {situacion.zonas_estacionamiento?.filter(hasCoords).map(zona => {
                   const perc = Math.min((zona.ocupacion_actual / zona.capacidad_total) || 0, 1);
                   const color = perc > 0.9 ? '#FFAB4B' : perc > 0.7 ? '#F59E0B' : '#4EDEA3';
                   
                   return (
                     <React.Fragment key={`zona-${zona.id}`}>
                        <Circle 
                          center={[zona.latitud, zona.longitud]} 
                          radius={60}
                          pathOptions={{
                            color: color,
                            fillColor: color,
                            fillOpacity: 0.1,
                            weight: 2,
                            dashArray: '8, 8'
                          }}
                        />
                        <Marker 
                          position={[zona.latitud, zona.longitud]}
                          icon={createTacticalIcon(SquareParking, '#F59E0B')}
                          eventHandlers={{ click: () => onSelectEntity(zona) }}
                        >
                           <Popup className="tactical-popup">
                              <div className="p-1">
                                  <div className="text-[10px] font-black uppercase tracking-widest text-warning mb-1">Zona Logística</div>
                                  <div className="text-sm font-bold uppercase text-white mb-2">{zona.nombre}</div>
                                  <div className="flex justify-between items-center text-[11px] font-mono border-t border-white/10 pt-2">
                                     <span className="text-text-sec">CAPACIDAD:</span>
                                     <span className="text-white font-bold">{zona.ocupacion_actual} / {zona.capacidad_total}</span>
                                  </div>
                              </div>
                           </Popup>
                        </Marker>
                     </React.Fragment>
                   );
                })}
              </>
            )}
          </MapContainer>
      </div>

      {/* LEYENDA - Ubicada debajo del mapa como pidió el usuario */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6 bg-bg-card/50 rounded-2xl border border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3 px-2">
             <div className="w-3 h-3 rounded-sm bg-primary rotate-45 shadow-[0_0_12px_#4EDEA3]"></div>
             <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-text-sec tracking-wider">Alcabalas</span>
                <span className="text-[8px] font-mono text-text-muted uppercase">Puntos de Control</span>
             </div>
          </div>
          <div className="flex items-center gap-3 px-2">
             <div className="w-3 h-3 rounded-sm bg-warning rotate-45 shadow-[0_0_12px_#F59E0B]"></div>
             <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-text-sec tracking-wider">Parkings</span>
                <span className="text-[8px] font-mono text-text-muted uppercase">Zonas de Estacionamiento</span>
             </div>
          </div>
          <div className="flex items-center gap-3 px-2">
             <div className="w-3 h-3 rounded-sm bg-text-main rotate-45 shadow-[0_0_12px_#DEE1F7]"></div>
             <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-text-sec tracking-wider">Entidades Civiles</span>
                <span className="text-[8px] font-mono text-text-muted uppercase">Sedes Operativas</span>
             </div>
          </div>
      </div>
    </div>
  );
};

export default MapaBaseReal;
