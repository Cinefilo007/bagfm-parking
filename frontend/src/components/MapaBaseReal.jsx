import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Shield, Building, SquareParking } from 'lucide-react';
import { renderToString } from 'react-dom/server';

// Fix para los iconos por defecto de Leaflet (No usar assets locales que den 404)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Función para crear iconos tácticos personalizados con seguridad
const createTacticalIcon = (IconComponent, color) => {
  const html = renderToString(
    <div style={{
      color: color,
      backgroundColor: 'rgba(14, 19, 34, 0.9)',
      padding: '5px',
      borderRadius: '6px',
      border: `2px solid ${color}`,
      boxShadow: `0 0 15px ${color}66`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: 'rotate(45deg)'
    }}>
      <div style={{ transform: 'rotate(-45deg)' }}>
        <IconComponent size={18} strokeWidth={3} />
      </div>
    </div>
  );

  return L.divIcon({
    html,
    className: 'tactical-icon-wrapper',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const MapaBaseReal = ({ situacion, onSelectEntity }) => {
  const center = [10.4851, -66.8436]; // Ubicación central de la BAGFM

  // Validación de coordenadas para evitar el error "reading 'lat' of null"
  const hasCoords = (item) => {
      return item && typeof item.latitud === 'number' && typeof item.longitud === 'number';
  };

  return (
    <div className="w-full h-full bg-bg-app relative overflow-hidden flex flex-col border border-white/5 rounded-xl shadow-tactica z-0">
      <MapContainer 
        center={center} 
        zoom={15} 
        scrollWheelZoom={true} 
        className="w-full h-full"
        style={{ background: '#0E1322' }}
      >
        {/* Cartografía Tactical Dark */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {situacion && (
          <>
            {/* Renderizado Seguro de Alcabalas */}
            {situacion.alcabalas?.filter(hasCoords).map(alcabala => (
              <Marker 
                key={`alcabala-${alcabala.id}`}
                position={[alcabala.latitud, alcabala.longitud]}
                icon={createTacticalIcon(Shield, '#4EDEA3')}
                eventHandlers={{ click: () => onSelectEntity(alcabala) }}
              >
                <Popup className="tactical-popup">
                  <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Punto de Control</div>
                  <div className="text-xs font-bold uppercase">{alcabala.nombre}</div>
                </Popup>
              </Marker>
            ))}

            {/* Renderizado Seguro de Entidades Civiles */}
            {situacion.entidades?.filter(hasCoords).map(entidad => (
              <Marker 
                key={`entidad-${entidad.id}`}
                position={[entidad.latitud, entidad.longitud]}
                icon={createTacticalIcon(Building, '#DEE1F7')}
                eventHandlers={{ click: () => onSelectEntity(entidad) }}
              >
                 <Popup className="tactical-popup">
                    <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Entidad Relacionada</div>
                    <div className="text-xs font-bold uppercase">{entidad.nombre}</div>
                 </Popup>
              </Marker>
            ))}

            {/* Renderizado Seguro de Zonas de Estacionamiento */}
            {situacion.zonas_estacionamiento?.filter(hasCoords).map(zona => {
               const perc = Math.min((zona.ocupacion_actual / zona.capacidad_total) || 0, 1);
               const color = perc > 0.9 ? '#FFAB4B' : perc > 0.7 ? '#F59E0B' : '#4EDEA3';
               
               return (
                 <React.Fragment key={`zona-${zona.id}`}>
                    <Circle 
                      center={[zona.latitud, zona.longitud]} 
                      radius={50}
                      pathOptions={{
                        color: color,
                        fillColor: color,
                        fillOpacity: 0.1,
                        weight: 1,
                        dashArray: '10, 10'
                      }}
                    />
                    <Marker 
                      position={[zona.latitud, zona.longitud]}
                      icon={createTacticalIcon(SquareParking, '#F59E0B')}
                      eventHandlers={{ click: () => onSelectEntity(zona) }}
                    >
                       <Popup className="tactical-popup">
                          <div className="text-[10px] font-black uppercase tracking-widest text-warning mb-1">Zona de Parking</div>
                          <div className="text-xs font-bold uppercase">{zona.nombre}</div>
                          <div className="text-[10px] font-mono mt-1">Ocupación: {Math.round(perc*100)}%</div>
                       </Popup>
                    </Marker>
                 </React.Fragment>
               );
            })}
          </>
        )}
      </MapContainer>

      {/* Leyenda Táctica - Bottom Right */}
      <div className="absolute bottom-6 right-6 bg-bg-low/80 backdrop-blur-xl p-4 rounded-xl border border-white/5 z-[1000] flex flex-col gap-3 shadow-2xl pointer-events-none">
          <div className="flex items-center gap-3">
             <div className="w-2.5 h-2.5 bg-primary shadow-[0_0_10px_#4EDEA3]"></div>
             <span className="text-[9px] font-black uppercase text-text-sec tracking-[0.1em]">Puntos de Acceso / Alcabalas</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-2.5 h-2.5 bg-warning shadow-[0_0_10px_#F59E0B]"></div>
             <span className="text-[9px] font-black uppercase text-text-sec tracking-[0.1em]">Zonas de Estacionamiento</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-2.5 h-2.5 bg-text-main shadow-[0_0_10px_#DEE1F7]"></div>
             <span className="text-[9px] font-black uppercase text-text-sec tracking-[0.1em]">Entidades Operativas</span>
          </div>
          <div className="mt-1 pt-2 border-t border-white/5 flex justify-between items-center">
             <span className="text-[8px] font-mono text-text-muted">SIGINT: ACTIVE</span>
             <span className="text-[8px] font-mono text-success">ENCRYPTED</span>
          </div>
      </div>
    </div>
  );
};

export default MapaBaseReal;
