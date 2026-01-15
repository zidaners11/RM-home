
import React, { useState, useEffect, useRef } from 'react';
import { fetchHAStates, fetchHAHistory, callHAService } from '../homeAssistantService';
import { HomeAssistantConfig } from '../types';
import L from 'leaflet';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const formatKm = (val: any) => {
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return new Intl.NumberFormat('es-ES').format(Math.floor(n));
};

const formatFuel = (val: any) => {
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return n.toFixed(2);
};

const VehicleView: React.FC = () => {
  const [states, setStates] = useState<any[]>([]);
  const [config, setConfig] = useState<HomeAssistantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [extraHistories, setExtraHistories] = useState<{[key: string]: any[]}>({});
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const trailRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('nexus_ha_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setConfig(parsed);
      refreshData(parsed);
    }
  }, []);

  const refreshData = async (cfg: HomeAssistantConfig) => {
    const data = await fetchHAStates(cfg.url, cfg.token);
    if (data) setStates(data);
    
    if (cfg.vehicle.tracker_entity) {
      const hist = await fetchHAHistory(cfg.url, cfg.token, cfg.vehicle.tracker_entity, 24);
      setHistory(hist || []);
    }

    const extraEntities = cfg.vehicle.extra_entities || [];
    const histories: {[key: string]: any[]} = {};
    await Promise.all(extraEntities.map(async (id) => {
      const h = await fetchHAHistory(cfg.url, cfg.token, id, 24);
      histories[id] = (h || []).map((entry: any) => ({ v: parseFloat(entry.state) })).filter((e: any) => !isNaN(e.v));
    }));
    setExtraHistories(histories);
    
    setLoading(false);
  };

  const handleCloudSync = async () => {
    if (!config || !config.vehicle.refresh_script) return;
    setIsSyncing(true);
    const scriptName = config.vehicle.refresh_script.replace('script.', '');
    await callHAService(config.url, config.token, 'script', scriptName, {});
    
    setTimeout(async () => {
      await refreshData(config);
      setIsSyncing(false);
    }, 2000);
  };

  useEffect(() => {
    if (loading || !mapContainerRef.current || !config) return;
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false }).setView([40, -3], 15);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapRef.current);
    }

    if (history.length > 1) {
      const pathPoints: [number, number][] = history
        .map(h => {
          const lat = parseFloat(h.attributes?.latitude);
          const lng = parseFloat(h.attributes?.longitude);
          return (isNaN(lat) || isNaN(lng)) ? null : [lat, lng] as [number, number];
        })
        .filter((p): p is [number, number] => p !== null);

      if (pathPoints.length > 0) {
        if (!trailRef.current) {
          trailRef.current = L.polyline(pathPoints, {
            color: '#3b82f6',
            weight: 3,
            opacity: 0.4,
            dashArray: '5, 10'
          }).addTo(mapRef.current);
        } else {
          trailRef.current.setLatLngs(pathPoints);
        }
      }
    }

    const tracker = states.find(s => s.entity_id === config.vehicle.tracker_entity);
    if (tracker?.attributes?.latitude) {
      const pos: [number, number] = [tracker.attributes.latitude, tracker.attributes.longitude];
      if (!markerRef.current) {
        markerRef.current = L.marker(pos, { 
          icon: L.divIcon({ 
            className: 'nexus-marker', 
            html: `<div class="w-10 h-10 rounded-full border-2 border-blue-500 bg-black flex items-center justify-center shadow-[0_0_20px_#3b82f6]"><svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10 M16 16h3M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" stroke-width="2"/></svg></div>` 
          }) 
        }).addTo(mapRef.current);
      } else {
        markerRef.current.setLatLng(pos);
      }
      mapRef.current.panTo(pos);
    }
  }, [loading, states, config, history]);

  const getVal = (id?: string) => states.find(s => s.entity_id === id)?.state || '0';
  const getFriendly = (id?: string) => states.find(st => st.entity_id === id)?.attributes?.friendly_name || id;
  const getUnit = (id?: string) => states.find(st => st.entity_id === id)?.attributes?.unit_of_measurement || '';
  
  const chargingKw = getVal(config?.vehicle.charging_speed_entity);
  const isCharging = parseFloat(chargingKw) > 0;

  if (loading) return <div className="h-full flex items-center justify-center animate-pulse text-blue-400 font-black text-[10px] uppercase tracking-widest text-center">Iniciando Protocolo Lynk Gateway...</div>;

  return (
    <div className="flex flex-col gap-6 pb-32 h-full overflow-y-auto no-scrollbar px-1">
      
      <div className="relative glass rounded-[40px] overflow-hidden border border-white/10 h-[450px] md:h-[550px] bg-black/40 shadow-2xl group shrink-0">
        <img src={config?.vehicle.image_url} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[4s]" alt="Vehículo" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-black/20" />
        
        <div className="absolute top-8 left-8 z-20">
          <h2 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter uppercase leading-none font-orbitron" style={{ fontFamily: 'Orbitron, sans-serif' }}>LYNK & CO <span className="text-blue-500">01</span></h2>
          <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.5em] mt-2">Telemetry_System // Master_Core</p>
        </div>

        {/* BOTÓN DE ACTUALIZACIÓN INTEGRADO EN LA IMAGEN */}
        <button 
          onClick={handleCloudSync}
          disabled={isSyncing}
          className={`absolute bottom-32 right-8 z-40 px-6 py-4 rounded-2xl font-black text-[9px] uppercase tracking-[0.3em] backdrop-blur-3xl border transition-all active:scale-90 shadow-2xl flex items-center gap-3 ${isSyncing ? 'bg-white/5 border-white/10 text-white/20' : 'bg-blue-600/80 border-blue-400 text-white hover:bg-blue-500 shadow-blue-500/20'}`}
        >
          <svg className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isSyncing ? 'SINC_EN_CURSO' : 'ACTUALIZAR_VEHÍCULO'}
        </button>

        <div className="absolute top-8 right-8 bottom-48 w-full max-w-[280px] md:max-w-[420px] z-30 flex flex-col pointer-events-none">
           <div className="pointer-events-auto glass-dark border border-white/10 bg-black/60 rounded-[35px] flex-1 overflow-hidden flex flex-col backdrop-blur-3xl shadow-2xl">
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                 <span className="text-[9px] font-black uppercase text-blue-400 tracking-[0.3em]">Módulos_Extra</span>
                 <div className="flex gap-1">
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar p-3">
                 <div className="grid grid-cols-2 gap-3">
                    {(config?.vehicle.extra_entities || []).map((id, idx) => {
                       const chartData = extraHistories[id] || [];
                       return (
                          <div key={idx} className="glass p-3 rounded-2xl border border-white/5 bg-white/5 h-[90px] relative overflow-hidden flex flex-col justify-between group/card">
                             <div className="absolute inset-0 opacity-20 pointer-events-none">
                                <ResponsiveContainer width="100%" height="100%">
                                   <AreaChart data={chartData} margin={{ top: 40, bottom: 0 }}>
                                      <Area type="monotone" dataKey="v" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} isAnimationActive={false} />
                                   </AreaChart>
                                </ResponsiveContainer>
                             </div>
                             <p className="text-[7px] font-black text-blue-400 uppercase truncate relative z-10">{getFriendly(id).replace('Lynk & Co ', '')}</p>
                             <h5 className="text-lg font-black text-white italic font-orbitron relative z-10" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                                {getVal(id)} <span className="text-[7px] text-white/20 font-bold not-italic ml-1 uppercase">{getUnit(id)}</span>
                             </h5>
                          </div>
                       );
                    })}
                 </div>
              </div>
           </div>
        </div>

        {isCharging && (
          <div className="absolute top-32 left-8 glass px-4 py-2 rounded-xl border border-green-500/30 bg-green-500/10 flex items-center gap-3 backdrop-blur-xl z-20">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-ping shadow-[0_0_10px_green]" />
             <span className="text-[9px] font-black uppercase text-green-400 tracking-widest">{chargingKw} kW</span>
          </div>
        )}

        <div className="absolute bottom-8 left-8 right-8 grid grid-cols-2 md:grid-cols-4 gap-6 z-20">
          <div className="space-y-1">
            <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em]">Energía</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl md:text-5xl font-black text-white italic font-orbitron" style={{ fontFamily: 'Orbitron, sans-serif' }}>{getVal(config?.vehicle.battery_entity)}%</p>
              <p className="text-[10px] md:text-sm font-black text-blue-400 italic">{getVal(config?.vehicle.range_entity)}km</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em]">Fuel</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl md:text-5xl font-black text-yellow-500 italic font-orbitron" style={{ fontFamily: 'Orbitron, sans-serif' }}>{formatFuel(getVal(config?.vehicle.fuel_entity))}L</p>
              <p className="text-[10px] md:text-sm font-black text-yellow-500/60 italic">{getVal(config?.vehicle.fuel_range_entity)}km</p>
            </div>
          </div>
          <div className="space-y-1 hidden md:block">
            <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em]">Odómetro</p>
            <p className="text-2xl md:text-4xl font-black text-white/80 italic font-orbitron" style={{ fontFamily: 'Orbitron, sans-serif' }}>{formatKm(getVal(config?.vehicle.odometer_entity))} <span className="text-xs italic">km</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto">
        <div className="lg:col-span-2 glass rounded-[40px] border border-white/10 h-[450px] md:h-[600px] overflow-hidden relative bg-black shadow-2xl">
           <div ref={mapContainerRef} className="w-full h-full z-0 opacity-80" />
           <div className="absolute top-6 left-6 glass-dark px-5 py-3 rounded-2xl text-[10px] font-black uppercase text-blue-400 tracking-[0.4em] z-[1000] border border-blue-500/20 bg-black/90 shadow-2xl flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,1)]" />
              Sentinel_GPS_Bridge // LIVE_TRACK
           </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="glass rounded-[40px] p-8 border border-white/10 bg-black/40 flex flex-col gap-8 h-full shadow-2xl">
            <div className="space-y-8 flex-1">
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-400 italic mb-6">Estado_Red_Sentinel</h4>
                <div className="space-y-5">
                  {[
                    { label: 'Cierre Central', val: getVal(config?.vehicle.lock_entity), color: 'text-green-400', icon: '🔒' },
                    { label: 'Ubicación', val: getVal(config?.vehicle.tracker_entity), color: 'text-blue-400', icon: '📍' },
                    { label: 'Telemetría', val: isCharging ? 'CARGANDO' : 'NOMINAL', color: isCharging ? 'text-green-400' : 'text-white/20', icon: '⚡' }
                  ].map((d, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-white/5 pb-4 group">
                      <div className="flex items-center gap-3">
                        <span className="text-lg opacity-40 group-hover:opacity-100 transition-opacity">{d.icon}</span>
                        <span className="text-[10px] uppercase font-black text-white/40 tracking-widest">{d.label}</span>
                      </div>
                      <span className={`text-[11px] font-black uppercase ${d.color} truncate max-w-[120px] text-right drop-shadow-sm italic`}>{d.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-orange-400 italic mb-6">Rutas_Recientes</h4>
                <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar pr-2">
                  {history.length > 0 ? history.slice().reverse().filter((h, idx, self) => idx === 0 || h.state !== self[idx-1].state).slice(0, 8).map((h, i) => (
                    <div key={i} className="flex justify-between items-center p-4 rounded-[20px] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-default">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-white uppercase truncate tracking-tight">{h.state}</p>
                        <p className="text-[8px] font-bold text-white/30 uppercase mt-1 tracking-widest">
                          {new Date(h.last_changed).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40 shadow-[0_0_10px_#3b82f6]" />
                    </div>
                  )) : (
                    <p className="text-[9px] text-white/20 uppercase italic text-center py-10 tracking-[0.3em]">Cargando logs de ruta...</p>
                  )}
                </div>
              </div>
            </div>
            {/* El botón ya no está aquí, está arriba en la imagen */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleView;
