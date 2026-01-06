
import React, { useState, useEffect, useRef } from 'react';
import { fetchHAStates, callHAService, fetchHAHistory } from '../homeAssistantService';
import { HomeAssistantConfig } from '../types';
import L from 'leaflet';

const formatKm = (val: any) => {
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return new Intl.NumberFormat('es-ES').format(Math.floor(n));
};

const VehicleView: React.FC = () => {
  const [states, setStates] = useState<any[]>([]);
  const [config, setConfig] = useState<HomeAssistantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{ car?: L.Marker }>({});
  const trailRef = useRef<L.Polyline | null>(null);

  const loadLocalConfig = () => {
    const saved = localStorage.getItem('nexus_ha_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
        refreshData(parsed);
      } catch (e) { setLoading(false); }
    } else { setLoading(false); }
  };

  useEffect(() => {
    loadLocalConfig();
  }, []);

  const refreshData = async (cfg: HomeAssistantConfig) => {
    setIsRefreshing(true);
    try {
      const data = await fetchHAStates(cfg.url, cfg.token);
      if (data) setStates(data);
      
      if (cfg.vehicle.tracker_entity) {
        const hist = await fetchHAHistory(cfg.url, cfg.token, cfg.vehicle.tracker_entity, 24);
        setHistory(hist || []);
      }

      if (cfg.vehicle.refresh_script) {
        await callHAService(cfg.url, cfg.token, 'script', cfg.vehicle.refresh_script.replace('script.', ''), {});
      }
    } catch (e) { } finally { 
      setLoading(false); 
      setIsRefreshing(false);
    }
  };

  const getEntityData = (id?: string) => {
    if (!id || !states) return null;
    return states.find(st => st.entity_id === id);
  };

  const getVal = (entityId?: string, fallback = '---') => {
    const s = getEntityData(entityId);
    return s?.state || fallback;
  };

  useEffect(() => {
    if (!config || loading || !mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true
      }).setView([40.4168, -3.7038], 15);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
      }).addTo(mapRef.current);
    }

    const updateMap = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
        
        const carTracker = getEntityData(config.vehicle.tracker_entity);
        const carLat = parseFloat(carTracker?.attributes?.latitude || '0');
        const carLng = parseFloat(carTracker?.attributes?.longitude || '0');

        const pathPoints: [number, number][] = history
          .map((h: any) => {
            const lat = parseFloat(h.attributes?.latitude);
            const lng = parseFloat(h.attributes?.longitude);
            return (isNaN(lat) || isNaN(lng)) ? null : [lat, lng] as [number, number];
          })
          .filter(Boolean) as [number, number][];

        if (pathPoints.length > 1) {
          if (!trailRef.current) {
            trailRef.current = L.polyline(pathPoints, {
              color: '#3b82f6',
              weight: 3,
              opacity: 0.6,
              dashArray: '5, 10'
            }).addTo(mapRef.current);
          } else {
            trailRef.current.setLatLngs(pathPoints);
          }
        }

        if (carLat && carLng) {
          const pos: [number, number] = [carLat, carLng];
          if (!markersRef.current.car) {
            markersRef.current.car = L.marker(pos, {
              icon: L.divIcon({
                className: 'nexus-marker',
                html: `
                  <div class="relative flex flex-col items-center">
                    <div class="w-14 h-14 rounded-full border-4 bg-black flex items-center justify-center shadow-[0_0_35px_#3b82f6]" style="border-color: #3b82f6">
                      <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10 M16 16h3M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                    </div>
                    <div class="absolute -bottom-1 w-4 h-4 bg-blue-500 border-2 border-black rounded-full shadow-lg"></div>
                  </div>`,
                iconSize: [56, 56],
                iconAnchor: [28, 50]
              })
            }).addTo(mapRef.current);
          } else {
            markersRef.current.car.setLatLng(pos);
          }
          mapRef.current.flyTo(pos, 16, { animate: true });
        }
      }
    };

    const timer = setTimeout(updateMap, 500);
    return () => clearTimeout(timer);
  }, [loading, states, config, history]);

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-[9px] font-black uppercase text-blue-400 tracking-widest italic">Sincronizando Lynx OS...</p>
    </div>
  );

  const car = config?.vehicle;
  const batteryRaw = parseFloat(getVal(car?.battery_entity, '0'));
  const battery = isNaN(batteryRaw) ? 0 : Math.round(batteryRaw);
  
  const fuelValue = parseFloat(getVal(car?.fuel_entity, '0'));
  const tankCap = car?.tank_capacity || 42;
  const fuelLiters = isNaN(fuelValue) ? '---' : fuelValue.toFixed(1);
  const fuelPercentage = isNaN(fuelValue) ? 0 : (fuelValue / tankCap) * 100;

  return (
    <div className="flex flex-col gap-10 pb-32 h-full overflow-y-auto no-scrollbar relative">
      <style>{`
         @keyframes breathing {
           0% { transform: scale(1.05); }
           50% { transform: scale(1.15); }
           100% { transform: scale(1.05); }
         }
         .car-zoom-bg {
           animation: breathing 15s ease-in-out infinite;
         }
         .leaflet-container {
           background: #020617 !important;
           border-radius: 40px;
         }
         .car-map-container .leaflet-tile-pane {
           filter: brightness(1.5) contrast(1.1) grayscale(0.1) hue-rotate(210deg) saturate(1.2);
         }
      `}</style>
      
      <div className="flex justify-between items-center px-6 shrink-0">
         <div className="flex items-center gap-4">
            <div className="w-2 h-8 bg-blue-600 rounded-full shadow-[0_0_15px_#3b82f6]" />
            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-white">Central de Telemetría</h2>
         </div>
      </div>
      
      <div className="relative glass rounded-[60px] overflow-hidden border border-white/10 h-[480px] shrink-0 shadow-2xl">
         <img 
           src={car?.image_url || "https://images.unsplash.com/photo-1617788138017-80ad42243c5d?q=80&w=2000"} 
           className="absolute inset-0 w-full h-full object-cover opacity-40 car-zoom-bg" 
           alt="Car" 
         />
         <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-black/20" />
         
         <button 
           onClick={() => config && refreshData(config)}
           className={`absolute top-10 right-10 glass-dark px-6 py-3 rounded-2xl flex items-center gap-3 border border-white/10 hover:bg-blue-600/40 transition-all active:scale-95 shadow-2xl z-20 ${isRefreshing ? 'opacity-50' : ''}`}
         >
            <svg className={`w-4 h-4 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-[9px] font-black uppercase tracking-widest text-white/80">Refrescar Sensores</span>
         </button>

         <div className="absolute top-12 left-12">
            <h2 className="text-6xl font-black text-white italic tracking-tighter uppercase leading-none">Lynk & Co <span className="text-blue-500">01</span></h2>
            <div className="flex items-center gap-3 mt-4 px-5 py-2 glass rounded-2xl border border-white/10 w-fit">
               <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Sentinel OS Active</span>
            </div>
         </div>

         <div className="absolute bottom-12 left-12 right-12 grid grid-cols-2 md:grid-cols-4 gap-10">
            <div className="space-y-2 group">
               <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] group-hover:text-blue-400 transition-colors">Batería</p>
               <p className="text-5xl font-black text-white tabular-nums">{battery}%</p>
               <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" style={{ width: `${battery}%` }} />
                  </div>
                  <span className="text-[11px] font-black text-blue-400 uppercase">{getVal(car?.range_entity)} km</span>
               </div>
            </div>
            <div className="space-y-2 group">
               <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] group-hover:text-orange-400 transition-colors">Gasolina</p>
               <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-black text-orange-400 tabular-nums">{fuelLiters}</p>
                  <span className="text-xl font-black text-orange-400/40 italic uppercase tracking-tighter">L</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-orange-500 shadow-[0_0_10px_#f97316]" style={{ width: `${fuelPercentage}%` }} />
                  </div>
                  <span className="text-[11px] font-black text-orange-400 uppercase">{getVal(car?.fuel_range_entity)} km</span>
               </div>
            </div>
            <div className="space-y-2">
               <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Carga</p>
               <p className="text-5xl font-black text-green-400 tabular-nums">{getVal(car?.charging_speed_entity)}<span className="text-sm ml-1 opacity-40 uppercase">kW</span></p>
               <p className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">{getVal(car?.plug_status_entity, 'Disconnected')}</p>
            </div>
            <div className="space-y-2 text-right md:text-left">
               <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Odómetro</p>
               <p className="text-5xl font-black text-white/80 tabular-nums">{formatKm(getVal(car?.odometer_entity))}<span className="text-sm ml-1 opacity-40 uppercase">km</span></p>
               <p className="text-[10px] font-black text-blue-400/40 uppercase tracking-widest italic">Global_Tracker</p>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 shrink-0 h-[520px]">
         <div className="lg:col-span-2 glass rounded-[50px] border border-white/10 p-2 overflow-hidden shadow-2xl relative car-map-container bg-[#000000]">
            <div ref={mapContainerRef} className="w-full h-full rounded-[45px]" />
            <div className="absolute top-8 left-8 z-[1000] glass px-6 py-3 rounded-2xl border border-white/20 flex items-center gap-3 backdrop-blur-3xl">
               <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping shadow-[0_0_15px_#3b82f6]" />
               <span className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Rastreo Histórico (24h)</span>
            </div>
         </div>

         <div className="glass rounded-[50px] p-12 border border-white/10 flex flex-col justify-between shadow-2xl bg-black/20">
            <div>
               <h3 className="text-[12px] font-black uppercase tracking-[0.5em] text-blue-400 mb-12 italic">Diagnostic Shield</h3>
               <div className="space-y-10">
                  <div className="flex justify-between items-center border-b border-white/5 pb-5 group">
                     <span className="text-[10px] uppercase font-bold text-white/40 tracking-[0.3em] group-hover:text-white transition-colors">Seguridad</span>
                     <span className="text-xs font-black text-green-400 uppercase tracking-widest italic">{getVal(car?.lock_entity, 'SECURE')}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-5 group">
                     <span className="text-[10px] uppercase font-bold text-white/40 tracking-[0.3em] group-hover:text-white transition-colors">Clima</span>
                     <span className="text-xs font-black text-cyan-400 uppercase tracking-widest italic">{getVal(car?.climate_entity, 'IDLE')}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-5 group">
                     <span className="text-[10px] uppercase font-bold text-white/40 tracking-[0.3em] group-hover:text-white transition-colors">Ventanillas</span>
                     <span className="text-xs font-black text-white uppercase tracking-widest italic">{getVal(car?.windows_entity, 'CLOSED')}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-5 group">
                     <span className="text-[10px] uppercase font-bold text-white/40 tracking-[0.3em] group-hover:text-white transition-colors">Trayecto Hoy</span>
                     <span className="text-xs font-black text-purple-400 uppercase tracking-widest italic">{getVal(car?.km_today_entity, '0')} km</span>
                  </div>
               </div>
            </div>
            
            <button 
              onClick={() => {
                if (config) {
                  const s = getEntityData(config.vehicle.lock_entity);
                  const isLocked = s?.state === 'locked';
                  callHAService(config.url, config.token, 'lock', isLocked ? 'unlock' : 'lock', { entity_id: config.vehicle.lock_entity });
                }
              }}
              className="w-full py-6 bg-blue-600 rounded-[35px] text-[11px] font-black uppercase tracking-[0.5em] shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all text-white mt-12"
            >
               Toggle Lock Status
            </button>
         </div>
      </div>
    </div>
  );
};

export default VehicleView;
