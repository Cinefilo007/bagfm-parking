import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
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

// Función para crear iconos tácticos personalizados
const createTacticalIcon = (IconComponent, color) => {
  const html = renderToString(
    <div style={{
      color: color,
      backgroundColor: 'rgba(14, 19, 34, 0.8)',
      padding: '4px',
      borderRadius: '4px',
      border: `1px solid ${color}`,
      boxShadow: `0 0 10px ${color}44`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <IconComponent size={20} />
    </div>
  );

  return L.divIcon({
    html,
    className: 'tactical-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

const MapaBaseReal = ({ situacion, onSelectEntity }) => {
  const center = [10.4851, -66.8436]; // Centro de La Carlota

  return (
    <div className="w-full h-full bg-bg-app relative overflow-hidden flex flex-col border border-white/5 rounded-xl shadow-tactica z-0">
      <MapContainer 
        center={center} 
        zoom={15} 
        scrollWheelZoom={true} 
        className="w-full h-full"
        style={{ background: '#0E1322' }}
      >
        {/* TileLayer minimalista oscuro - CartoDB Dark Matter */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {situacion && (
          <>
            {/* Alcabalas */}
            {situacion.alcabalas.map(alcabala => (
              <Marker 
                key={alcabala.id}
                position={[alcabala.latitud, alcabala.longitud]}
                icon={createTacticalIcon(Shield, '#4EDEA3')}
                eventHandlers={{ click: () => onSelectEntity(alcabala) }}
              >
                <Popup className="tactical-popup">
                  <div className="text-xs font-bold uppercase tracking-widest">{alcabala.nombre}</div>
                </Popup>
              </Marker>
            ))}

            {/* Entidades Civiles */}
            {situacion.entidades.map(entidad => (
              <Marker 
                key={entidad.id}
                position={[entidad.latitud, entidad.longitud]}
                icon={createTacticalIcon(Building, '#DEE1F7')}
                eventHandlers={{ click: () => onSelectEntity(entidad) }}
              />
            ))}

            {/* Zonas de Estacionamiento */}
            {situacion.zonas_estacionamiento.map(zona => {
               const perc = Math.min((zona.ocupacion_actual / zona.capacidad_total), 1);
               const color = perc > 0.9 ? '#FFAB4B' : perc > 0.7 ? '#F59E0B' : '#4EDEA3';
               
               return (
                 <React.Fragment key={zona.id}>
                    <Circle 
                      center={[zona.latitud, zona.longitud]} 
                      radius={40}
                      pathOptions={{
                        color: color,
                        fillColor: color,
                        fillOpacity: 0.1,
                        weight: 2,
                        dashArray: '5, 5'
                      }}
                    />
                    <Marker 
                      position={[zona.latitud, zona.longitud]}
                      icon={createTacticalIcon(SquareParking, '#F59E0B')}
                      eventHandlers={{ click: () => onSelectEntity(zona) }}
                    />
                 </React.Fragment>
               );
            })}
          </>
        )}
      </MapContainer>

      {/* Leyenda Táctica Flotante */}
      <div className="absolute bottom-4 right-4 bg-bg-low/90 backdrop-blur-md p-3 rounded-lg border border-white/5 z-[1000] flex flex-col gap-2 shadow-xl">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-primary"></div>
             <span className="text-[8px] font-black uppercase text-text-sec tracking-wider">Puntos de Acceso (Alcabalas)</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-warning"></div>
             <span className="text-[8px] font-black uppercase text-text-sec tracking-wider">Zonas de Parking</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-text-main"></div>
             <span className="text-[8px] font-black uppercase text-text-sec tracking-wider">Entidades Relacionadas</span>
          </div>
      </div>
    </div>
  );
};

export default MapaBaseReal;
