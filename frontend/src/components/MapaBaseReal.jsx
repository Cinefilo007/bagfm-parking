import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, Polygon, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Shield, Building, SquareParking, Crosshair, Target } from 'lucide-react';
import { renderToString } from 'react-dom/server';
import { useThemeStore } from '../store/theme.store';

// Fix para los iconos por defecto de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createTacticalPin = (color, label = "", isSelected = false, isDarkMode = true, IconComponent = Target) => {
  const pinBgColor = isDarkMode ? 'rgba(13, 17, 23, 0.9)' : '#FFFFFF';
  const pinTextColor = isDarkMode ? '#DEE1F7' : '#0F172A';
  
  // Renderizar el icono central
  const innerContent = (
    <div style={{
      color: pinBgColor,
      transform: 'rotate(45deg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
       <IconComponent size={14} strokeWidth={3} />
    </div>
  );

  const html = renderToString(
    <div className={`tactical-marker-container ${isSelected ? 'is-selected' : ''}`} style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      transform: isSelected ? 'scale(1.2)' : 'scale(1)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer'
    }}>
      {/* Pin Shape */}
      <div style={{
        position: 'relative',
        width: '32px',
        height: '32px',
        background: isSelected ? (isDarkMode ? '#FFFFFF' : '#10B981') : color,
        borderRadius: '50% 50% 50% 1px',
        transform: 'rotate(-45deg)',
        border: `2px solid ${pinBgColor}`,
        boxShadow: isSelected ? `0 0 20px ${color}` : `0 4px 10px rgba(0,0,0,0.3)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {innerContent}
      </div>

      {/* Label Box - Usando la clase tactical-label definida en index.css */}
      {label && (
        <div className="tactical-label" style={{
          marginTop: '6px',
          background: pinBgColor,
          backdropFilter: 'blur(8px)',
          padding: '2px 10px',
          borderRadius: '20px',
          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
          zIndex: 1000,
          whiteSpace: 'nowrap'
        }}>
          <span style={{
            color: pinTextColor,
            fontSize: '9px',
            fontFamily: 'Inter, sans-serif',
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>
            {label}
          </span>
        </div>
      )}
    </div>
  );

  return L.divIcon({
    html,
    className: `tactical-marker-pin ${isSelected ? 'is-selected' : ''}`,
    iconSize: [80, 60],
    iconAnchor: [40, 32],
  });
};

// Componente interno para manejar clicks en el mapa
function MapClickHandler({ onMapClick, assignmentMode, drawingMode }) {
  useMapEvents({
    click: (e) => {
      if (assignmentMode || drawingMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Componente interno para forzar el re-calculo del tamaño cuando cambia el contenedor
function MapResizer({ isFullscreen }) {
  const map = useMapEvents({});
  React.useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 100); // Pequeño delay para asegurar que el DOM se ha expandido
  }, [isFullscreen, map]);
  return null;
}

const MapaBaseReal = ({ 
  situacion, 
  onSelectEntity, 
  assignmentMode, 
  drawingMode = false, 
  tempPoints = [], 
  onPointMoved = null, 
  onPointDeleted = null,
  accessPoints = [],
  aiSuggestions = null, 
  showPolygons = true, 
  onMapClick = null, 
  selectedForMove = null, 
  isFullscreen 
}) => {
  const { isDarkMode } = useThemeStore();
  const [mapType, setMapType] = React.useState('satellite'); // 'satellite' | 'tactical'

  const center = [10.4851, -66.8436]; 
  const bounds = [
    [10.475, -66.862],
    [10.498, -66.825]
  ];

  const hasCoords = (item) => {
      return item && typeof item.latitud === 'number' && typeof item.longitud === 'number';
  };

  return (
    <div className="w-full h-full bg-bg-app relative flex flex-col gap-4">
      <div className="flex-1 min-h-[400px] border border-white/5 rounded-2xl shadow-tactica overflow-hidden relative z-0">
          
          {/* Selector de Capas Tácticas */}
          <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
              <button 
                onClick={() => setMapType(mapType === 'satellite' ? 'tactical' : 'satellite')}
                className="p-3 bg-bg-modal/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl hover:bg-primary/20 hover:border-primary/40 transition-all group"
                title={mapType === 'satellite' ? 'Cambiar a Vista Táctica' : 'Cambiar a Vista Satelital'}
              >
                  {mapType === 'satellite' ? (
                    <div className="flex items-center gap-2">
                       <Shield size={18} className="text-primary group-hover:scale-110 transition-transform"/>
                       <span className="text-[10px] font-black uppercase tracking-widest text-text-main pr-1">TÁCTICA</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                       <Target size={18} className="text-warning group-hover:scale-110 transition-transform"/>
                       <span className="text-[10px] font-black uppercase tracking-widest text-text-main pr-1">MISIÓN</span>
                    </div>
                  )}
              </button>
          </div>

          {/* Capas de Feedback Visual modo asignación */}
          {assignmentMode && (
             <div className="absolute top-4 left-16 z-[1000] bg-warning/90 backdrop-blur-md px-4 py-2 rounded-lg border border-warning shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center gap-3 animate-pulse">
                <Crosshair size={18} className="text-bg-app animate-spin" />
                <span className="text-[10px] font-black text-bg-app uppercase tracking-widest leading-none">Modo Georreferencia Activo: Haz clic en el mapa</span>
             </div>
          )}

          <MapContainer 
            center={center} 
            zoom={15.5} 
            minZoom={15}
            maxZoom={19}
            maxBounds={bounds}
            maxBoundsViscosity={1.0}
            scrollWheelZoom={true} 
            attributionControl={false}
            className="w-full h-full"
            style={{ background: isDarkMode ? '#0E1322' : '#F8FAFC', cursor: assignmentMode ? 'crosshair' : 'grab' }}
          >
            {mapType === 'satellite' ? (
              <>
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                  maxNativeZoom={18}
                />
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                  maxNativeZoom={18}
                  opacity={0.8}
                />
              </>
            ) : (
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                maxZoom={19}
              />
            )}

            <MapClickHandler onMapClick={onMapClick} assignmentMode={assignmentMode} drawingMode={drawingMode} />
            <MapResizer isFullscreen={isFullscreen} />

            {situacion && (
              <>
                {situacion.alcabalas?.filter(hasCoords).map(alcabala => (
                  <Marker 
                    key={`alcabala-${alcabala.id}`}
                    position={[alcabala.latitud, alcabala.longitud]}
                    icon={createTacticalPin(
                      '#4EDEA3', 
                      alcabala.nombre, 
                      selectedForMove?.id === alcabala.id && selectedForMove?.tipo === 'alcabala', 
                      isDarkMode,
                      Shield
                    )}
                    eventHandlers={{ click: () => !assignmentMode && onSelectEntity(alcabala) }}
                  >
                    <Popup className="tactical-popup">
                        <div className="p-1">
                          <div className="text-[9px] font-black uppercase tracking-widest text-primary/70 mb-1">Punto de Control</div>
                          <div className="text-[11px] font-display font-black uppercase text-text-main mb-2 tracking-tight">{alcabala.nombre}</div>
                          <div className="grid grid-cols-2 gap-2 border-t border-bg-high/20 pt-2">
                             <div className="flex flex-col">
                                <span className="text-[7px] text-text-muted uppercase font-bold">Entradas</span>
                                <span className="text-[11px] font-mono font-bold text-primary">{alcabala.entradas_hoy || 0}</span>
                             </div>
                             <div className="flex flex-col">
                                <span className="text-[7px] text-text-muted uppercase font-bold">Salidas</span>
                                <span className="text-[11px] font-mono font-bold text-text-main">{alcabala.salidas_hoy || 0}</span>
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
                    icon={createTacticalPin(
                      '#8B5CF6', 
                      entidad.nombre, 
                      selectedForMove?.id === entidad.id && selectedForMove?.tipo === 'entidad', 
                      isDarkMode,
                      Building
                    )}
                    eventHandlers={{ click: () => !assignmentMode && onSelectEntity(entidad) }}
                  >
                    <Popup className="tactical-popup">
                        <div className="p-1">
                            <div className="text-[9px] font-black uppercase tracking-widest text-text-muted mb-0.5">Sede Administrativa</div>
                            <div className="text-[11px] font-display font-black uppercase text-text-main mb-2 tracking-tight">{entidad.nombre}</div>
                            <div className="flex justify-between items-center text-[9px] font-mono border-t border-bg-high/20 pt-2">
                               <span className="text-text-sec font-bold uppercase">Uso:</span>
                               <span className="text-primary font-black text-[11px]">{entidad.ocupacion_actual || 0} / {entidad.capacidad_total || 0}</span>
                            </div>
                        </div>
                    </Popup>
                  </Marker>
                ))}

                {situacion.zonas_estacionamiento?.map(zona => {
                   const hasPolygon = zona.poligono && Array.isArray(zona.poligono) && zona.poligono.length >= 3;
                   return (
                     <React.Fragment key={`zona-group-${zona.id}`}>
                        {hasPolygon && showPolygons && (
                          <Polygon 
                            positions={zona.poligono}
                            pathOptions={{
                               fillColor: '#F59E0B',
                               fillOpacity: 0.15,
                               color: '#F59E0B',
                               weight: 2,
                               dashArray: '5, 5'
                            }}
                          >
                            <Popup className="tactical-popup">
                               <div className="p-1">
                                   <div className="text-[9px] font-black uppercase tracking-widest text-warning mb-0.5">Área Delimitada</div>
                                   <div className="text-[11px] font-bold uppercase text-text-main mb-1">{zona.nombre}</div>
                                   {zona.area_m2 && (
                                     <div className="text-[10px] font-mono text-primary font-black mb-2">{zona.area_m2.toLocaleString()} m²</div>
                                   )}
                                   <div className="flex justify-between items-center text-[9px] font-mono border-t border-bg-high/20 pt-2">
                                       <span className="text-text-sec uppercase font-bold">Uso:</span>
                                       <span className="text-primary font-black text-[11px]">{zona.ocupacion_actual || 0} / {zona.capacidad_total || 0}</span>
                                    </div>
                                </div>
                             </Popup>
                           </Polygon>
                        )}

                        {/* Renderizar Grilla Persistente (Aegis Lab) de la zona */}
                        {zona.grilla_tactica?.map((linea, idx) => (
                           <Polyline 
                               key={`saved-grid-${zona.id}-${idx}`}
                               positions={linea.points || linea} 
                               pathOptions={{ 
                                   color: linea.color || '#F59E0B', 
                                   weight: linea.type === 'via' ? 1.5 : (linea.type === 'divisor_doble' ? 2 : 0.8), 
                                   opacity: linea.type === 'divisor_doble' ? 0.9 : 0.5,
                                   dashArray: linea.type === 'via' ? '5, 8' : '0' 
                               }} 
                           />
                        ))}
                        {hasCoords(zona) && (
                          <Marker 
                            position={[zona.latitud, zona.longitud]}
                            icon={createTacticalPin(
                              '#F59E0B', 
                              zona.nombre, 
                              selectedForMove?.id === zona.id && selectedForMove?.tipo === 'zona', 
                              isDarkMode, 
                              SquareParking
                            )}
                            eventHandlers={{ click: () => !assignmentMode && onSelectEntity(zona) }}
                          >
                             <Popup className="tactical-popup">
                                 <div className="p-1">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-warning mb-0.5">Zona Logística</div>
                                    <div className="text-[11px] font-bold uppercase text-text-main mb-2">{zona.nombre}</div>
                                    <div className="flex justify-between items-center text-[9px] font-mono border-t border-bg-high/20 pt-2 mb-3">
                                       <span className="text-text-sec uppercase font-bold">Uso:</span>
                                       <span className="text-text-main font-black text-[11px]">{zona.ocupacion_actual} / {zona.capacidad_total}</span>
                                    </div>
                                    {drawingMode && (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onPointDeleted && onPointDeleted(-1, zona.poligono); // Usamos el handler para inyectar el polígono
                                        }}
                                        className="w-full py-2 bg-warning text-black text-[10px] font-black uppercase rounded-lg shadow-lg hover:scale-105 transition-all"
                                      >
                                        EDITAR
                                      </button>
                                    )}
                                 </div>
                             </Popup>
                          </Marker>
                        )}
                     </React.Fragment>
                   );
                })}

                {/* Capas de Dibujo Activo */}
                {tempPoints && tempPoints.length > 0 && (
                   <>
                      <Polyline 
                        positions={tempPoints} 
                        pathOptions={{ color: '#4EDEA3', weight: 3, dashArray: '10, 10' }} 
                      />
                      {tempPoints.map((p, i) => (
                        <Marker 
                          key={`temp-pt-${i}`}
                          position={p}
                          draggable={true}
                          icon={L.divIcon({
                            className: 'tactical-vertex',
                            html: `<div class="w-2.5 h-2.5 bg-primary rounded-full border-2 border-bg-app shadow-[0_0_10px_rgba(78,222,163,0.5)]"></div>`,
                            iconSize: [10, 10],
                            iconAnchor: [5, 5]
                          })}
                          eventHandlers={{
                            dragend: (e) => {
                                const { lat, lng } = e.target.getLatLng();
                                onPointMoved && onPointMoved(i, lat, lng);
                            },
                            contextmenu: () => {
                                onPointDeleted && onPointDeleted(i);
                            }
                          }}
                        />
                      ))}
                      {tempPoints.length >= 3 && (
                        <Polygon 
                          positions={tempPoints}
                          pathOptions={{ fillColor: '#4EDEA3', fillOpacity: 0.1, weight: 0 }}
                        />
                      )}
                    </>
                 )}

                 {/* Marcadores de Acceso (Entrada/Salida) */}
                 {accessPoints?.map((ap, i) => (
                    <Marker 
                        key={`ap-${i}`} 
                        position={[ap.lat, ap.lng]}
                        icon={L.divIcon({
                            className: 'custom-div-icon',
                            html: `
                                <div class="flex flex-col items-center">
                                    <div class="px-2 py-0.5 ${ap.type === 'entry' ? 'bg-primary' : 'bg-danger'} text-bg-app text-[8px] font-black rounded-full shadow-lg animate-bounce">
                                        ${ap.type === 'entry' ? 'ENTRADA' : 'SALIDA'}
                                    </div>
                                    <div class="w-2 h-2 ${ap.type === 'entry' ? 'bg-primary' : 'bg-danger'} rounded-full border border-white shadow-lg"></div>
                                </div>
                            `,
                            iconSize: [60, 40],
                            iconAnchor: [30, 40]
                        })}
                    />
                 ))}
                 
                 {/* Sugerencias de IA (Plano Táctico Detallado) */}
                  {aiSuggestions?.lineas?.map((linea, i) => (
                    <Polyline 
                        key={`ai-loc-${i}`} 
                        positions={linea.points || linea} 
                        pathOptions={{ 
                            color: linea.color || '#8b5cf6', 
                            weight: linea.type === 'via' ? 2 : (linea.type === 'divisor_doble' ? 2 : 1), 
                            opacity: linea.type === 'divisor_doble' ? 1 : 0.8, 
                            dashArray: linea.type === 'via' ? '5, 10' : (linea.type === 'flujo' ? '2, 5' : '0')
                        }} 
                    />
                  ))}

                 {/* Plano de Área Utilizable (IA) */}
                 {aiSuggestions?.poligonoSugerido && (
                    <Polygon 
                        positions={aiSuggestions.poligonoSugerido}
                        pathOptions={{ 
                            color: '#8b5cf6', 
                            fillColor: '#8b5cf6', 
                            fillOpacity: 0.1, 
                            weight: 2,
                            dashArray: '10, 10'
                        }}
                    >
                        <Popup className="tactical-popup">
                            <div className="p-1">
                                <div className="text-[9px] font-black uppercase text-indigo-400 mb-1">Propuesta IA</div>
                                <div className="text-[10px] font-mono text-text-main">Área Neta: {aiSuggestions.areaUtilizable || 0} m²</div>
                            </div>
                        </Popup>
                    </Polygon>
                 )}
               </>
            )}
          </MapContainer>
      </div>
    </div>
  );
};

export default MapaBaseReal;
