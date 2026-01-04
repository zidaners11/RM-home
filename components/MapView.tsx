
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

  useEffect(() => {
    const saved = localStorage.getItem('nexus_ha_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setConfig(parsed);
      refreshMapData(parsed);
      const interval = setInterval(() => refreshMapData(parsed), 45000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && mapContainerRef.current && !mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
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

          // Pedir exactamente 72 horas de histórico
          const historyData = await fetchHAHistory(cfg.url, cfg.token, id, 72); 
          
          // Procesar historial con validación estricta de coordenadas
          const history = (historyData || [])
            .map((h: any) => ({
              lat: parseFloat(h.attributes?.latitude),
              lng: parseFloat(h.attributes?.longitude),
              time: h.last_changed
            }))
            .filter((h: any) => !isNaN(h.lat) && !isNaN(h.lng) && h.lat !== 0 && h.lng !== 0)
            .sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());

          let picture = s.attributes?.entity_picture 
            ? `${cfg.url.replace(/\/$/, '')}${s.attributes.entity_picture}` 
            : `https://i.pravatar.cc/150?u=${id}`;

          const currentLat = parseFloat(s.attributes?.latitude);
          const currentLng = parseFloat(s.attributes?.longitude);

          return {
            entity_id: id,
            name: s.attributes?.friendly_name || id.split('.')[1],
            lat: !isNaN(currentLat) ? currentLat : (history.length > 0 ? history[history.length-1].lat : 40.4168),
            lng: !isNaN(currentLng) ? currentLng : (history.length > 0 ? history[history.length-1].lng : -3.7038),
            lastSeen: s.last_changed ? new Date(s.last_changed).toLocaleTimeString() : '---',
            battery: s.attributes?.battery_level || 100,
            status: s.state || 'unknown',
            history,
            color: SENTINEL_COLORS[index % SENTINEL_COLORS.length],
            picture
          };
        })
      );

      const validPeople = peopleList.filter(p => p !== null) as any[];
      setPeople(validPeople);
      setLoading(false);
    } catch (e) {
      console.error("Radar Sync Error:", e);
      setLoading(false);
    }
  };

  const updateMapElements = (peopleList: any[]) => {
    if (!mapRef.current) return;

    peopleList.forEach((p) => {
      const pos: [number, number] = [p.lat, p.lng];
      
      // Actualizar o Crear Marcador
      if (!markersRef.current[p.entity_id]) {
        const icon = L.divIcon({
          className: 'nexus-marker',
          html: `
            <div class="relative flex flex-col items-center group">
              <div class="w-14 h-14 rounded-full border-2 bg-black p-0.5 overflow-hidden shadow-[0_0_30px_${p.color}88] transition-all duration-1000" style="border-color: ${p.color}">
                <img src="${p.picture}" class="w-full h-full rounded-full object-cover" />
              </div>
              <div class="px-3 py-1 rounded-lg mt-2 border border-white/10 shadow-2xl backdrop-blur-md" style="background-color: ${p.color}aa">
                <span class="text-[9px] font-black text-white uppercase tracking-widest">${p.name}</span>
              </div>
            </div>
          `,
          iconSize: [56, 75],
          iconAnchor: [28, 75]
        });
        markersRef.current[p.entity_id] = L.marker(pos, { icon }).addTo(mapRef.current!);
      } else {
        markersRef.current[p.entity_id].setLatLng(pos);
      }

      // Dibujar Rastro Histórico (Polyline)
      const pathPoints: [number, number][] = [
        ...(p.history ? p.history.map((h: any) => [h.lat, h.lng] as [number, number]) : []),
        pos
      ];

      if (pathPoints.length > 1) {
        if (!trailsRef.current[p.entity_id]) {
          trailsRef.current[p.entity_id] = L.polyline(pathPoints, {
            color: p.color,
            weight: 4,
            opacity: 0.6,
            dashArray: '10, 15',
            smoothFactor: 1.5,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(mapRef.current!);
        } else {
          trailsRef.current[p.entity_id].setLatLngs(pathPoints);
        }
      }
    });
  };

  const focusPerson = (id: string) => {
    setFocusedId(id);
    const p = people.find(x => x.entity_id === id);
    if (p && mapRef.current) {
      mapRef.current.flyTo([p.lat, p.lng], 15, { animate: true, duration: 2 });
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full pb-20 relative animate-in fade-in duration-700">
       <div className="glass rounded-[50px] overflow-hidden border border-white/10 flex-1 relative shadow-2xl">
          {/* Radar Sweep Animation Layer */}
          <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden opacity-20">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_340deg,rgba(59,130,246,0.5)_360deg)] animate-[spin_4s_linear_infinite]" />
          </div>

          <div ref={mapContainerRef} className="w-full h-full z-0 grayscale-[0.8] contrast-[1.2] invert-[0.05]" />
          
          <div className="absolute top-8 left-8 flex flex-col gap-4 z-20">
             <div className="glass-dark px-8 py-8 rounded-[40px] border border-white/10 shadow-2xl min-w-[280px]">
                <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_#3b82f6]" />
                      <h3 className="text-[11px] font-black text-white uppercase tracking-[0.4em]">Sentinel Radar</h3>
                   </div>
                   <span className="text-[8px] font-mono text-white/30 uppercase">72H_TRACE_SYNC</span>
                </div>

                <div className="space-y-4 max-h-[40vh] overflow-y-auto no-scrollbar">
                   {people.length > 0 ? people.map(p => (
                     <button 
                        key={p.entity_id} 
                        onClick={() => focusPerson(p.entity_id)}
                        className={`flex items-center gap-5 w-full text-left p-4 rounded-3xl transition-all border ${focusedId === p.entity_id ? 'bg-white/10 border-white/20' : 'hover:bg-white/5 border-transparent opacity-40'}`}
                     >
                        <div className="relative">
                           <img src={p.picture} className="w-12 h-12 rounded-full object-cover border-2 shadow-lg" style={{ borderColor: p.color }} alt="" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                           <p className="text-[10px] font-black uppercase text-white truncate tracking-tight">{p.name}</p>
                           <p className="text-[8px] font-bold uppercase tracking-widest mt-1" style={{ color: p.color }}>{p.status}</p>
                           <div className="flex items-center gap-2 mt-2">
                              <span className="text-[7px] font-mono text-white/20">{p.battery}% PWR</span>
                              <span className="text-[7px] font-mono text-white/20">{p.lastSeen}</span>
                           </div>
                        </div>
                     </button>
                   )) : (
                     <p className="text-[9px] text-white/20 text-center py-4 uppercase font-bold">Esperando señal GPS...</p>
                   )}
                </div>
             </div>
          </div>

          <div className="absolute bottom-8 right-8 z-20 flex gap-2">
             <button onClick={() => window.location.reload()} className="glass-dark p-4 rounded-2xl border border-white/10 hover:bg-blue-600/20 transition-all">
                <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth="2"/></svg>
             </button>
          </div>
       </div>
    </div>
  );
};

export default MapView;
