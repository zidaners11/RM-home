
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
      const interval = setInterval(() => refreshMapData(parsed), 30000);
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

      const peopleToTrack = cfg.tracked_people || [];
      if (peopleToTrack.length === 0) {
        setLoading(false);
        return;
      }

      const peopleList = await Promise.all(
        peopleToTrack.map(async (id, index) => {
          const s = states.find((st: any) => st.entity_id === id);
          if (!s) return null;

          const historyData = await fetchHAHistory(cfg.url, cfg.token, id, 72); 
          const history = (historyData || [])
            .map((h: any) => ({
              lat: h.attributes?.latitude || h.state?.latitude,
              lng: h.attributes?.longitude || h.state?.longitude,
              time: h.last_changed
            }))
            .filter((h: any) => h.lat != null && h.lng != null && !isNaN(h.lat));

          let picture = s.attributes?.entity_picture 
            ? `${cfg.url.replace(/\/$/, '')}${s.attributes.entity_picture}` 
            : `https://i.pravatar.cc/150?u=${id}`;

          return {
            entity_id: id,
            name: s.attributes?.friendly_name || id.split('.')[1],
            lat: s.attributes?.latitude || 40.4168,
            lng: s.attributes?.longitude || -3.7038,
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
      if (mapRef.current) updateMapElements(validPeople);
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
      
      if (!markersRef.current[p.entity_id]) {
        const icon = L.divIcon({
          className: 'nexus-marker',
          html: `
            <div class="relative flex flex-col items-center group">
              <div class="w-12 h-12 rounded-full border-2 bg-black p-0.5 overflow-hidden shadow-[0_0_20px_${p.color}aa]" style="border-color: ${p.color}">
                <img src="${p.picture}" class="w-full h-full rounded-full object-cover" />
              </div>
              <div class="px-2 py-0.5 rounded-full mt-1 border border-white/20 shadow-lg" style="background-color: ${p.color}">
                <span class="text-[8px] font-black text-white uppercase tracking-tighter">${p.name}</span>
              </div>
            </div>
          `,
          iconSize: [48, 60],
          iconAnchor: [24, 60]
        });
        markersRef.current[p.entity_id] = L.marker(pos, { icon }).addTo(mapRef.current!);
      } else {
        markersRef.current[p.entity_id].setLatLng(pos);
      }

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
            dashArray: '5, 10',
            smoothFactor: 2
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
      mapRef.current.flyTo([p.lat, p.lng], 15, { animate: true, duration: 1.5 });
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center">
      <div className="w-16 h-16 border-4 border-white/5 border-t-blue-500 rounded-full animate-spin mb-6" />
      <p className="text-[10px] uppercase font-black tracking-[0.6em] text-blue-400 animate-pulse">Sincronizando Radar Sentinel...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700 h-full flex flex-col">
       <div className="glass rounded-[50px] overflow-hidden border border-white/10 flex-1 relative min-h-[500px]">
          <div ref={mapContainerRef} className="w-full h-full z-0" />
          
          {people.length === 0 && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
               <svg className="w-16 h-16 text-white/10 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="1.5"/></svg>
               <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Sin entidades de rastreo configuradas</p>
               <p className="text-[9px] text-white/10 mt-2">Ve a Ajustes > Radar para añadir personas.</p>
            </div>
          )}

          <div className="absolute top-8 left-8 flex flex-col gap-4 pointer-events-none z-[1000]">
             <div className="glass-dark px-6 py-6 rounded-[35px] border border-white/10 pointer-events-auto shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                   <p className="text-[9px] font-black text-white/90 uppercase tracking-[0.3em]">Nodos Activos: {people.length}</p>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar">
                   {people.map(p => (
                     <button 
                        key={p.entity_id} 
                        onClick={() => focusPerson(p.entity_id)}
                        className={`flex items-center gap-4 w-full text-left p-3 rounded-2xl transition-all border ${focusedId === p.entity_id ? 'bg-white/10' : 'hover:bg-white/5 opacity-40'}`}
                        style={{ borderColor: focusedId === p.entity_id ? p.color : 'transparent' }}
                     >
                        <img src={p.picture} className="w-10 h-10 rounded-full object-cover border-2 shadow-lg" style={{ borderColor: p.color }} alt="" />
                        <div className="flex-1 overflow-hidden">
                           <p className="text-[10px] font-black uppercase text-white truncate">{p.name}</p>
                           <p className="text-[8px] font-bold uppercase tracking-widest mt-0.5" style={{ color: p.color }}>{p.status}</p>
                        </div>
                     </button>
                   ))}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

export default MapView;
