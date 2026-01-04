
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
      const interval = setInterval(() => refreshMapData(parsed), 60000);
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

          const historyData = await fetchHAHistory(cfg.url, cfg.token, id, 72); 
          
          const history = (historyData || [])
            .map((h: any) => ({
              lat: parseFloat(h.attributes?.latitude),
              lng: parseFloat(h.attributes?.longitude),
              time: h.last_changed
            }))
            .filter((h: any) => !isNaN(h.lat) && !isNaN(h.lng) && h.lat !== 0)
            .sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());

          let picture = s.attributes?.entity_picture 
            ? `${cfg.url.replace(/\/$/, '')}${s.attributes.entity_picture}` 
            : `https://i.pravatar.cc/150?u=${id}`;

          const cLat = parseFloat(s.attributes?.latitude);
          const cLng = parseFloat(s.attributes?.longitude);

          return {
            entity_id: id,
            name: s.attributes?.friendly_name || id.split('.')[1],
            lat: !isNaN(cLat) ? cLat : (history.length > 0 ? history[history.length-1].lat : 40.4168),
            lng: !isNaN(cLng) ? cLng : (history.length > 0 ? history[history.length-1].lng : -3.7038),
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
      if (!markersRef.current[p.entity_id]) {
        const icon = L.divIcon({
          className: 'nexus-marker',
          html: `<div class="relative flex flex-col items-center"><div class="w-12 h-12 rounded-full border-2 bg-black overflow-hidden shadow-[0_0_20px_${p.color}88]" style="border-color: ${p.color}"><img src="${p.picture}" class="w-full h-full object-cover" /></div></div>`,
          iconSize: [48, 48],
          iconAnchor: [24, 24]
        });
        markersRef.current[p.entity_id] = L.marker(pos, { icon }).addTo(mapRef.current!);
      } else {
        markersRef.current[p.entity_id].setLatLng(pos);
      }
      const pathPoints: [number, number][] = [...(p.history.map((h: any) => [h.lat, h.lng] as [number, number])), pos];
      if (pathPoints.length > 1) {
        if (!trailsRef.current[p.entity_id]) {
          trailsRef.current[p.entity_id] = L.polyline(pathPoints, { color: p.color, weight: 3, opacity: 0.4, dashArray: '5, 10' }).addTo(mapRef.current!);
        } else {
          trailsRef.current[p.entity_id].setLatLngs(pathPoints);
        }
      }
    });
  };

  if (!config && !loading) return <div className="h-full flex items-center justify-center glass rounded-[40px] text-white/20 uppercase font-black text-xs border border-dashed border-white/10">Radar no configurado.</div>;

  return (
    <div className="flex flex-col gap-6 h-full pb-20 relative">
       <div className="glass rounded-[50px] overflow-hidden border border-white/10 flex-1 relative shadow-2xl">
          <div ref={mapContainerRef} className="w-full h-full z-0 grayscale-[0.8]" />
          <div className="absolute top-8 left-8 flex flex-col gap-4 z-20">
             <div className="glass-dark px-6 py-6 rounded-[35px] border border-white/10 shadow-2xl min-w-[240px]">
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-6">Sentinel Radar</h3>
                <div className="space-y-3">
                   {people.map(p => (
                     <button key={p.entity_id} onClick={() => { setFocusedId(p.entity_id); mapRef.current?.flyTo([p.lat, p.lng], 16); }} className={`flex items-center gap-4 w-full p-3 rounded-2xl transition-all ${focusedId === p.entity_id ? 'bg-white/10' : 'opacity-40 hover:opacity-80'}`}>
                        <img src={p.picture} className="w-10 h-10 rounded-full border-2" style={{ borderColor: p.color }} />
                        <div className="text-left overflow-hidden">
                           <p className="text-[10px] font-black uppercase text-white truncate">{p.name}</p>
                           <p className="text-[8px] font-bold text-blue-400 uppercase">{p.status}</p>
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
