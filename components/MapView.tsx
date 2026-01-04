
import React, { useState, useEffect, useRef } from 'react';
import { HomeAssistantConfig, UserLocation } from '../types';
import { fetchHAStates, fetchHAHistory } from '../homeAssistantService';
import L from 'leaflet';

const SENTINEL_COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

const MapView: React.FC = () => {
  const [config, setConfig] = useState<HomeAssistantConfig | null>(null);
  const [people, setPeople] = useState<(UserLocation & { color: string, picture?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const trailsRef = useRef<{ [key: string]: L.Polyline }>({});
  const historyPointsRef = useRef<{ [key: string]: L.LayerGroup }>({});

  useEffect(() => {
    const saved = localStorage.getItem('nexus_ha_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setConfig(parsed);
      refreshMapData(parsed);
      const interval = setInterval(() => refreshMapData(parsed), 30000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && mapContainerRef.current && !mapRef.current) {
      // Usamos preferCanvas: true para manejar cientos de puntos sin lag
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true
      }).setView([40.4168, -3.7038], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(mapRef.current);
    }
    if (people.length > 0) updateMapElements(people);
  }, [loading, people]);

  const refreshMapData = async (cfg: HomeAssistantConfig) => {
    try {
      const states = await fetchHAStates(cfg.url, cfg.token);
      if (!states) return;

      const peopleToTrack = cfg.tracked_people || [];
      const peopleList = await Promise.all(
        peopleToTrack.map(async (id, index) => {
          const s = states.find((st: any) => st.entity_id === id);
          if (!s) return null;

          // Descargamos las últimas 48h
          const historyData = await fetchHAHistory(cfg.url, cfg.token, id, 48); 
          
          // RECONSTRUCCIÓN LÓGICA DE TRAYECTORIA:
          // HA a veces omite lat/lng si no han cambiado respecto al punto anterior.
          // Hacemos "forward-fill" para no perder ni un solo timestamp.
          let lastLat = 0;
          let lastLng = 0;

          const history = (historyData || [])
            .map((h: any) => {
              const lat = parseFloat(h.attributes?.latitude);
              const lng = parseFloat(h.attributes?.longitude);
              
              if (!isNaN(lat) && lat !== 0) {
                lastLat = lat;
                lastLng = lng;
              }

              return {
                lat: lastLat,
                lng: lastLng,
                time: h.last_changed,
                state: h.state
              };
            })
            // Filtramos solo puntos que tengan coordenadas válidas (reconstruidas o no)
            .filter((h: any) => h.lat !== 0)
            .sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());

          let picture = s.attributes?.entity_picture 
            ? `${cfg.url.replace(/\/$/, '')}${s.attributes.entity_picture}` 
            : `https://i.pravatar.cc/150?u=${id}`;

          const cLat = parseFloat(s.attributes?.latitude) || lastLat;
          const cLng = parseFloat(s.attributes?.longitude) || lastLng;

          return {
            entity_id: id,
            name: s.attributes?.friendly_name || id.split('.')[1],
            lat: cLat,
            lng: cLng,
            lastSeen: s.last_changed ? new Date(s.last_changed).toLocaleTimeString() : '---',
            battery: s.attributes?.battery_level || 100,
            status: s.state || 'unknown',
            history,
            color: SENTINEL_COLORS[index % SENTINEL_COLORS.length],
            picture
          };
        })
      );

      setPeople(peopleList.filter(p => p !== null) as any[]);
      setLoading(false);
    } catch (e) { console.error(e); setLoading(false); }
  };

  const updateMapElements = (peopleList: any[]) => {
    if (!mapRef.current) return;
    
    peopleList.forEach((p) => {
      const pos: [number, number] = [p.lat, p.lng];
      
      // 1. MARCADOR ACTUAL (Sentinel Core)
      if (!markersRef.current[p.entity_id]) {
        const icon = L.divIcon({
          className: 'nexus-marker',
          html: `
            <div class="relative flex flex-col items-center">
              <div class="w-14 h-14 rounded-full border-4 bg-black overflow-hidden shadow-[0_0_35px_${p.color}] transition-all duration-500" style="border-color: ${p.color}">
                <img src="${p.picture}" class="w-full h-full object-cover" />
              </div>
              <div class="absolute -bottom-1 w-4 h-4 bg-white border-2 border-black rounded-full shadow-lg" style="background-color: ${p.color}"></div>
            </div>`,
          iconSize: [56, 56],
          iconAnchor: [28, 50]
        });
        markersRef.current[p.entity_id] = L.marker(pos, { icon, zIndexOffset: 5000 }).addTo(mapRef.current!);
      } else {
        markersRef.current[p.entity_id].setLatLng(pos);
      }

      // 2. NODOS DE TELEMETRÍA (Breadcrumbs individuales)
      if (!historyPointsRef.current[p.entity_id]) {
        historyPointsRef.current[p.entity_id] = L.layerGroup().addTo(mapRef.current!);
      } else {
        historyPointsRef.current[p.entity_id].clearLayers();
      }

      // Dibujamos CADA punto que nos ha devuelto el historial
      p.history.forEach((point: any, idx: number) => {
        // Marcador circular táctico
        L.circleMarker([point.lat, point.lng], {
          radius: 3,
          color: p.color,
          fillColor: p.color,
          fillOpacity: 0.6,
          weight: 1,
          opacity: 0.8,
          pane: 'markerPane' // Para que queden por encima de la línea pero debajo del avatar
        }).bindTooltip(`<b>${p.name}</b><br/>${new Date(point.time).toLocaleString()}<br/>Estado: ${point.state}`, { 
          direction: 'top', 
          className: 'nexus-tooltip',
          sticky: true 
        }).addTo(historyPointsRef.current[p.entity_id]);
      });

      // 3. LÍNEA DE TRAYECTORIA (Vector de conexión)
      const pathPoints: [number, number][] = [
        ...(p.history.map((h: any) => [h.lat, h.lng] as [number, number])),
        pos
      ];

      if (pathPoints.length > 1) {
        if (!trailsRef.current[p.entity_id]) {
          trailsRef.current[p.entity_id] = L.polyline(pathPoints, { 
            color: p.color, 
            weight: 2, 
            opacity: 0.3,
            lineJoin: 'round',
            lineCap: 'round',
            dashArray: '10, 10'
          }).addTo(mapRef.current!);
        } else {
          trailsRef.current[p.entity_id].setLatLngs(pathPoints);
        }
      }
    });
  };

  if (!config && !loading) return (
    <div className="h-full flex items-center justify-center glass rounded-[40px] text-white/20 uppercase font-black text-xs border border-dashed border-white/10">
      Radar no configurado. Activa el rastreo en Ajustes.
    </div>
  );

  return (
    <div className="flex flex-col gap-6 h-full pb-20 relative animate-in fade-in duration-1000">
       <style>{`
         .nexus-tooltip {
           background: rgba(2, 6, 23, 0.95) !important;
           border: 1px solid rgba(255, 255, 255, 0.1) !important;
           color: white !important;
           font-family: 'JetBrains Mono', monospace !important;
           font-size: 9px !important;
           text-transform: uppercase !important;
           padding: 8px 12px !important;
           border-radius: 12px !important;
           box-shadow: 0 10px 30px rgba(0,0,0,0.8) !important;
           backdrop-filter: blur(10px);
         }
         .leaflet-container {
           background: #020617 !important;
         }
       `}</style>
       
       <div className="glass rounded-[50px] overflow-hidden border border-white/10 flex-1 relative shadow-2xl">
          {/* El mapa ocupa todo el contenedor */}
          <div ref={mapContainerRef} className="w-full h-full z-0 grayscale-[0.5] brightness-[0.7] contrast-[1.1]" />
          
          {/* Panel Flotante de Agentes */}
          <div className="absolute top-8 left-8 flex flex-col gap-4 z-20">
             <div className="glass-dark px-6 py-6 rounded-[35px] border border-white/10 shadow-2xl min-w-[280px] backdrop-blur-3xl">
                <div className="flex items-center justify-between mb-6">
                   <div>
                      <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Sentinel Radar</h3>
                      <p className="text-[7px] text-blue-400 font-bold uppercase mt-1 tracking-widest">Deep_Trace_Active // 100%_Nodes</p>
                   </div>
                   <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                </div>
                
                <div className="space-y-3">
                   {people.length > 0 ? people.map(p => (
                     <button 
                        key={p.entity_id} 
                        onClick={() => { 
                          setFocusedId(p.entity_id); 
                          mapRef.current?.flyTo([p.lat, p.lng], 17, { duration: 2 }); 
                        }} 
                        className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all border ${focusedId === p.entity_id ? 'bg-blue-600/20 border-blue-500/30' : 'border-transparent opacity-60 hover:opacity-100 hover:bg-white/5'}`}
                     >
                        <div className="relative">
                           <img src={p.picture} className="w-11 h-11 rounded-full border-2 shadow-lg" style={{ borderColor: p.color }} />
                           <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-black" style={{ backgroundColor: p.color }} />
                        </div>
                        <div className="text-left overflow-hidden">
                           <p className="text-[11px] font-black uppercase text-white truncate">{p.name}</p>
                           <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{p.status}</p>
                        </div>
                        <div className="ml-auto flex flex-col items-end">
                           <span className={`text-[10px] font-black tabular-nums ${p.battery < 20 ? 'text-red-500' : 'text-white/40'}`}>{p.battery}%</span>
                           <div className="w-5 h-2 bg-white/5 rounded-full mt-1 overflow-hidden border border-white/10">
                              <div className={`h-full ${p.battery < 20 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${p.battery}%` }} />
                           </div>
                        </div>
                     </button>
                   )) : (
                     <div className="py-10 text-center opacity-20">
                        <p className="text-[9px] font-black uppercase tracking-widest">Sincronizando satélites...</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
          
          {/* Leyenda Táctica Inferior */}
          <div className="absolute bottom-8 right-8 z-20">
             <div className="glass-dark px-6 py-4 rounded-2xl border border-white/5 text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-6 shadow-2xl">
                <div className="flex items-center gap-3">
                   <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
                   <span>Nodo Telemetría</span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <div className="flex items-center gap-3">
                   <div className="w-5 h-0.5 bg-white/20 border-t border-dashed border-white/40" />
                   <span>Vector Movimiento</span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <span className="text-blue-400">Escaneo: {people.reduce((acc, p) => acc + p.history.length, 0)} Puntos</span>
             </div>
          </div>
       </div>
    </div>
  );
};

export default MapView;
