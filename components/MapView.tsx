
import React, { useState, useEffect, useRef } from 'react';
import { HomeAssistantConfig, UserLocation } from '../types';
import { fetchHAStates, fetchHAHistory } from '../homeAssistantService';
import L from 'leaflet';

// Paleta de colores Sentinel
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

  useEffect(() => {
    const saved = localStorage.getItem('nexus_ha_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setConfig(parsed);
      refreshMapData(parsed);
      const interval = setInterval(() => refreshMapData(parsed), 30000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    if (!loading && mapContainerRef.current && !mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([40.4168, -3.7038], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(mapRef.current);
      
      updateMapElements(people);
    }
  }, [loading]);

  const refreshMapData = async (cfg: HomeAssistantConfig) => {
    try {
      const states = await fetchHAStates(cfg.url, cfg.token);
      if (!states) return;

      const peopleList = await Promise.all(
        (cfg.tracked_people || []).map(async (id, index) => {
          const s = states.find((st: any) => st.entity_id === id);
          const historyData = await fetchHAHistory(cfg.url, cfg.token, id, 72); // 72 horas
          
          const history = (historyData || [])
            .map((h: any) => ({
              lat: h.attributes?.latitude,
              lng: h.attributes?.longitude,
              time: h.last_changed
            }))
            .filter((h: any) => h.lat != null && h.lng != null);

          // Obtener imagen real de HA
          let picture = '';
          if (s?.attributes?.entity_picture) {
            picture = `${cfg.url.replace(/\/$/, '')}${s.attributes.entity_picture}`;
          }

          return {
            entity_id: id,
            name: s?.attributes?.friendly_name || id,
            lat: s?.attributes?.latitude || 40.4168,
            lng: s?.attributes?.longitude || -3.7038,
            lastSeen: s?.last_changed ? new Date(s.last_changed).toLocaleTimeString() : '---',
            battery: s?.attributes?.battery_level || 100,
            status: s?.state || 'unknown',
            history,
            color: SENTINEL_COLORS[index % SENTINEL_COLORS.length],
            picture: picture || `https://i.pravatar.cc/150?u=${id}`
          };
        })
      );

      setPeople(peopleList);
      if (mapRef.current) updateMapElements(peopleList);
      setLoading(false);
    } catch (e) {
      console.error("Error refreshing map data:", e);
      setLoading(false);
    }
  };

  const updateMapElements = (peopleList: any[]) => {
    if (!mapRef.current) return;

    peopleList.forEach((p) => {
      const pos: [number, number] = [p.lat, p.lng];
      
      // Marcador con color dinámico
      if (!markersRef.current[p.entity_id]) {
        const icon = L.divIcon({
          className: 'nexus-marker',
          html: `
            <div class="relative flex flex-col items-center group">
              <div class="w-14 h-14 rounded-full border-2 bg-black p-0.5 overflow-hidden shadow-2xl transition-transform group-hover:scale-110" style="border-color: ${p.color}; box-shadow: 0 0 20px ${p.color}66">
                <img src="${p.picture}" class="w-full h-full rounded-full object-cover" />
              </div>
              <div class="px-2 py-0.5 rounded-full mt-1 border border-white/20 shadow-lg" style="background-color: ${p.color}">
                <span class="text-[8px] font-black text-white uppercase tracking-tighter">${p.name}</span>
              </div>
            </div>
          `,
          iconSize: [56, 70],
          iconAnchor: [28, 70]
        });
        markersRef.current[p.entity_id] = L.marker(pos, { icon }).addTo(mapRef.current!);
      } else {
        markersRef.current[p.entity_id].setLatLng(pos);
      }

      // Trail de 72 horas con color del usuario
      const pathPoints: [number, number][] = [
        ...(p.history ? p.history.map((h: any) => [h.lat, h.lng] as [number, number]) : []),
        pos
      ];

      if (pathPoints.length > 1) {
        if (!trailsRef.current[p.entity_id]) {
          trailsRef.current[p.entity_id] = L.polyline(pathPoints, {
            color: p.color,
            weight: 3,
            opacity: 0.6,
            dashArray: '10, 15',
            lineJoin: 'round'
          }).addTo(mapRef.current!);
        } else {
          trailsRef.current[p.entity_id].setLatLngs(pathPoints);
        }
      }
    });

    if (!focusedId && peopleList.length > 0) {
      setFocusedId(peopleList[0].entity_id);
      mapRef.current.panTo([peopleList[0].lat, peopleList[0].lng]);
    }
  };

  const focusPerson = (id: string) => {
    setFocusedId(id);
    const p = people.find(x => x.entity_id === id);
    if (p && mapRef.current) {
      mapRef.current.flyTo([p.lat, p.lng], 16, { animate: true, duration: 1.5 });
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center">
      <div className="w-16 h-16 border-4 border-white/5 border-t-blue-500 rounded-full animate-spin mb-6" />
      <p className="text-[10px] uppercase font-black tracking-[0.6em] text-blue-400 animate-pulse">Iniciando Barrido Térmico 72h...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
       <div className="glass rounded-[40px] overflow-hidden border border-white/10 h-[680px] relative">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Overlay Flotante Táctico */}
          <div className="absolute top-8 left-8 flex flex-col gap-4 pointer-events-none z-[1000]">
             <div className="glass-dark px-6 py-6 rounded-[32px] border border-white/10 pointer-events-auto shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-3 h-3 rounded-full animate-ping" style={{ backgroundColor: people.find(p => p.entity_id === focusedId)?.color || '#3b82f6' }} />
                   <p className="text-[10px] font-black text-white/90 uppercase tracking-[0.2em]">Red Sentinel Nexus</p>
                </div>
                <div className="space-y-3">
                   {people.map(p => (
                     <button 
                        key={p.entity_id} 
                        onClick={() => focusPerson(p.entity_id)}
                        className={`flex items-center gap-4 w-full text-left p-3 rounded-2xl transition-all border ${focusedId === p.entity_id ? 'bg-white/10' : 'hover:bg-white/5 opacity-50'}`}
                        style={{ borderColor: focusedId === p.entity_id ? p.color : 'transparent' }}
                     >
                        <div className="w-10 h-10 rounded-full border-2 overflow-hidden" style={{ borderColor: p.color }}>
                           <img src={p.picture} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div>
                           <p className="text-[10px] font-black uppercase text-white">{p.name}</p>
                           <p className="text-[8px] font-mono uppercase" style={{ color: p.color }}>{p.status}</p>
                        </div>
                     </button>
                   ))}
                </div>
             </div>
          </div>

          {/* Telemetría de Ruta */}
          <div className="absolute bottom-8 right-8 glass-dark p-6 rounded-[32px] border border-white/10 pointer-events-auto w-72 shadow-2xl z-[1000]">
             <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: people.find(p => p.entity_id === focusedId)?.color || '#3b82f6' }}>
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                </div>
                <div>
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-white/80">Trayectoria 72h</h4>
                   <p className="text-[8px] text-white/20 font-mono uppercase italic">Análisis de desplazamiento</p>
                </div>
             </div>
             <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                   <span className="text-[9px] uppercase font-black text-white/10 tracking-widest">Puntos en Trail</span>
                   <span className="text-[10px] font-black" style={{ color: people.find(p => p.entity_id === focusedId)?.color }}>
                      {people.find(p => p.entity_id === focusedId)?.history?.length || 0}
                   </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                   <span className="text-[9px] uppercase font-black text-white/10 tracking-widest">Coordenadas</span>
                   <span className="text-[10px] font-mono text-white/40">
                      {people.find(p => p.entity_id === focusedId)?.lat.toFixed(4)}, {people.find(p => p.entity_id === focusedId)?.lng.toFixed(4)}
                   </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                   <span className="text-[9px] uppercase font-black text-white/10 tracking-widest">Estado Radar</span>
                   <span className="text-[10px] font-black text-green-500 uppercase tracking-tighter">Sincronizado</span>
                </div>
             </div>
          </div>
       </div>

       {/* Tarjetas de Usuarios */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {people.map(p => (
            <div 
               key={p.entity_id} 
               onClick={() => focusPerson(p.entity_id)} 
               className={`glass p-6 rounded-[32px] border cursor-pointer transition-all duration-500 ${focusedId === p.entity_id ? 'bg-white/5' : 'border-white/5 hover:border-white/20'}`}
               style={{ borderLeft: `4px solid ${p.color}` }}
            >
               <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                     <img src={p.picture} className="w-14 h-14 rounded-2xl object-cover border border-white/10" alt="" />
                     <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-[#020617] flex items-center justify-center ${p.status === 'home' ? 'bg-green-500' : 'bg-blue-500'}`}>
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                     </div>
                  </div>
                  <div className="overflow-hidden">
                     <p className="text-sm font-black uppercase tracking-tighter text-white truncate">{p.name}</p>
                     <p className="text-[9px] text-white/20 font-mono">Última: {p.lastSeen}</p>
                  </div>
               </div>
               <div className="flex justify-between items-center py-3 bg-white/5 px-4 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2">
                     <svg className="w-3.5 h-3.5" style={{ color: p.color }} fill="currentColor" viewBox="0 0 24 24"><path d="M17 6h-1V4c0-.55-.45-1-1-1H9c-.55 0-1 .45-1 1v2H7c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>
                     <span className={`text-[10px] font-black ${p.battery < 20 ? 'text-red-400' : 'text-white/80'}`}>{p.battery}%</span>
                  </div>
                  <div className="text-[8px] font-black uppercase tracking-widest text-white/20">72h Tracking</div>
               </div>
            </div>
          ))}
       </div>
    </div>
  );
};

export default MapView;
