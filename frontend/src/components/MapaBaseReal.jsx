import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Shield, Building, SquareParking, Crosshair } from 'lucide-react';
import { renderToString } from 'react-dom/server';

// Fix para los iconos por defecto de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createTacticalPin = (color, label = "", isSelected = false) => {
  const html = renderToString(
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      filter: isSelected ? `drop-shadow(0 0 10px ${color})` : 'none',
      transform: isSelected ? 'scale(1.15)' : 'scale(1)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      {/* Pin Shape */}
      <div style={{
        position: 'relative',
        width: '32px',
        height: '32px',
        background: isSelected ? '#FFF' : color,
        borderRadius: '50% 50% 50% 1px',
        transform: 'rotate(-45deg)',
        border: `3px solid rgba(13, 17, 23, 0.8)`,
        boxShadow: `0 0 15px ${color}66`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Inner Circle / Icon Dot */}
        <div style={{
          width: '10px',
          height: '10px',
          background: 'rgba(13, 17, 23, 0.9)',
          borderRadius: '50%',
          transform: 'rotate(45deg)',
          border: `2px solid ${isSelected ? color : '#FFF'}`
        }} />
      </div>

      {/* Label Box */}
      {label && (
        <div style={{
          marginTop: '6px',
          background: 'rgba(13, 17, 23, 0.85)',
          backdropBlur: '4px',
          padding: '2px 8px',
          borderRadius: '6px',
          border: `1px solid ${color}44`,
          boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
        }}>
          <span style={{
            color: 'white',
            fontSize: '9px',
            fontFamily: 'Inter, sans-serif',
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
            textShadow: '0 1px 2px rgba(0,0,0,0.8)'
          }}>
            {label}
          </span>
        </div>
      )}
    </div>
  );

  return L.divIcon({
    html,
    className: 'tactical-marker-pin',
    iconSize: [80, 60],
    iconAnchor: [40, 36],
  });
};

// Componente interno para manejar clicks en el mapa
function MapClickHandler({ onMapClick, assignmentMode }) {
  useMapEvents({
    click: (e) => {
      if (assignmentMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

const MapaBaseReal = ({ situacion, onSelectEntity, assignmentMode, onMapClick, selectedForMove }) => {
  const center = [10.4851, -66.8436]; 
  const bounds = [
    [10.46, -66.88],
    [10.51, -66.80]
  ];

  const hasCoords = (item) => {
      return item && typeof item.latitud === 'number' && typeof item.longitud === 'number';
  };

  return (
    <div className="w-full h-full bg-bg-app relative flex flex-col gap-4">
      <div className="flex-1 min-h-[400px] border border-white/5 rounded-2xl shadow-tactica overflow-hidden relative z-0">
          
          {/* Capas de Feedback Visual modo asignación */}
          {assignmentMode && (
             <div className="absolute top-4 right-4 z-[1000] bg-warning/90 backdrop-blur-md px-4 py-2 rounded-lg border border-warning shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center gap-3 animate-pulse">
                <Crosshair size={18} className="text-bg-app animate-spin" />
                <span className="text-[10px] font-black text-bg-app uppercase tracking-widest leading-none">Modo Georreferencia Activo: Haz clic en el mapa</span>
             </div>
          )}

          <MapContainer 
            center={center} 
            zoom={15} 
            minZoom={14}
            maxZoom={18}
            maxBounds={bounds}
            maxBoundsViscosity={1.0}
            scrollWheelZoom={true} 
            className="w-full h-full"
            style={{ background: '#0E1322', cursor: assignmentMode ? 'crosshair' : 'grab' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            <MapClickHandler onMapClick={onMapClick} assignmentMode={assignmentMode} />

            {situacion && (
              <>
                {situacion.alcabalas?.filter(hasCoords).map(alcabala => (
                  <Marker 
                    key={`alcabala-${alcabala.id}`}
                    position={[alcabala.latitud, alcabala.longitud]}
                    icon={createTacticalPin('#4EDEA3', alcabala.nombre, selectedForMove?.id === alcabala.id && selectedForMove?.tipo === 'alcabala')}
                    eventHandlers={{ click: () => !assignmentMode && onSelectEntity(alcabala) }}
                  >
                    <Popup className="tactical-popup">
                      <div className="p-1">
                          <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Cuerpos de Seguridad</div>
                          <div className="text-sm font-bold uppercase text-white mb-2">{alcabala.nombre}</div>
                          <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-2">
                             <div className="flex flex-col">
                                <span className="text-[8px] text-text-muted uppercase">Entradas Hoy</span>
                                <span className="text-xs font-mono font-bold text-white">{alcabala.entradas_hoy || 0}</span>
                             </div>
                             <div className="flex flex-col">
                                <span className="text-[8px] text-text-muted uppercase">Salidas Hoy</span>
                                <span className="text-xs font-mono font-bold text-white">{alcabala.salidas_hoy || 0}</span>
                             </div>
                          </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {situacion.entidades?.filter(hasCoords).map(entidad => (
                  <Marker 
                    key={`entidad-${entidad.id}`}
                    position={[entidad.latitud, entidad.longitud]}
                    icon={createTacticalPin('#DEE1F7', entidad.nombre, selectedForMove?.id === entidad.id && selectedForMove?.tipo === 'entidad')}
                    eventHandlers={{ click: () => !assignmentMode && onSelectEntity(entidad) }}
                  >
                    <Popup className="tactical-popup">
                        <div className="p-1">
                            <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Sede Administrativa</div>
                            <div className="text-sm font-bold uppercase text-white mb-2">{entidad.nombre}</div>
                            <div className="flex justify-between items-center text-[11px] font-mono border-t border-white/10 pt-2">
                               <span className="text-text-sec">OCUPACIÓN:</span>
                               <span className="text-white font-bold">{entidad.ocupacion_actual || 0} / {entidad.capacidad_total || 0}</span>
                            </div>
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
                          icon={createTacticalPin('#F59E0B', zona.nombre, selectedForMove?.id === zona.id && selectedForMove?.tipo === 'zona')}
                          eventHandlers={{ click: () => !assignmentMode && onSelectEntity(zona) }}
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

      {/* LEYENDA (Debajo del mapa) */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6 bg-bg-card/30 rounded-2xl border border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3 px-2">
             <div className="w-4 h-4 rounded-full border-2 border-primary bg-primary/20 shadow-[0_0_12px_#4EDEA3]"></div>
             <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-text-sec tracking-wider">Alcabalas</span>
                <span className="text-[8px] font-mono text-text-muted uppercase opacity-60">Control Perimetral</span>
             </div>
          </div>
          <div className="flex items-center gap-3 px-2">
             <div className="w-4 h-4 rounded-full border-2 border-warning bg-warning/20 shadow-[0_0_12px_#F59E0B]"></div>
             <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-text-sec tracking-wider">Parkings</span>
                <span className="text-[8px] font-mono text-text-muted uppercase opacity-60">Estacionamientos</span>
             </div>
          </div>
          <div className="flex items-center gap-3 px-2">
             <div className="w-4 h-4 rounded-full border-2 border-white bg-white/20 shadow-[0_0_12px_#DEE1F7]"></div>
             <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-text-sec tracking-wider">Civiles</span>
                <span className="text-[8px] font-mono text-text-muted uppercase opacity-60">Sedes Entidades</span>
             </div>
          </div>
      </div>
    </div>
  );
};

export default MapaBaseReal;
