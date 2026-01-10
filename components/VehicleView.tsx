
import React, { useState, useEffect, useRef } from 'react';
import { fetchHAStates, fetchHAHistory, callHAService } from '../homeAssistantService';
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
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
    setLoading(false);
  };

  const handleCloudSync = async () => {
    if (!config || !config.vehicle.refresh_script) return;
    setIsSyncing(true);
    // Extraemos el nombre del script (quitando el dominio script. si existe)
    const scriptName = config.vehicle.refresh_script.replace('script.', '');
    await callHAService(config.url, config.token, 'script', scriptName, {});
    
    // Esperar un poco para que el script surta efecto y refrescar
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

    const tracker = states.find(s => s.entity_id === config.vehicle.tracker_entity);
    if (tracker?.attributes?.latitude) {
      const pos: [number, number] = [tracker.attributes.latitude, tracker.attributes.longitude];
      if (!markerRef.current) {
        markerRef.current = L.marker(pos, { icon: L.divIcon({ className: 'nexus-marker', html: `<div class="w-10 h-10 rounded-full border-2 border-blue-500 bg-black flex items-center justify-center shadow-[0_0_15px_#3b82f6]"><svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10 M16 16h3M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" stroke-width="2"/></svg></div>` }) }).addTo(mapRef.current);
      } else {
        markerRef.current.setLatLng(pos);
      }
      mapRef.current.setView(pos);
    }
  }, [loading, states, config]);

  const getVal = (id?: string) => states.find(s => s.entity_id === id)?.state || '0';
  const getFriendly = (id?: string) => states.find(st => st.entity_id === id)?.attributes?.friendly_name || id;
  const getUnit = (id?: string) => states.find(st => st.entity_id === id)?.attributes?.unit_of_measurement || '';
  
  const fuelLiters = parseFloat(getVal(config?.vehicle.fuel_entity));
  const fuelRange = getVal(config?.vehicle.fuel_range_entity);
  const batteryPct = getVal(config?.vehicle.battery_entity);
  const rangeKm = getVal(config?.vehicle.range_entity);
  const chargingKw = getVal(config?.vehicle.charging_speed_entity);
  const isCharging = parseFloat(chargingKw) > 0;

  if (loading) return <div className="h-full flex items-center justify-center animate-pulse text-blue-400 font-black text-[10px] uppercase tracking-widest text-center">Iniciando Protocolo Lynk Gateway...</div>;

  return (
    <div className="flex flex-col gap-4 pb-32 h-full overflow-y-auto no-scrollbar px-1">
      <div className="relative glass rounded-[35px] overflow-hidden border border-white/10 h-[260px] md:h-[420px] shrink-0 bg-black/40">
        <img src={config?.vehicle.image_url} className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
        <div className="absolute top-6 left-6 md:top-10 md:left-10">
          <h2 className="text-3xl md:text-6xl font-black text-white italic tracking-tighter uppercase leading-none">LYNK & CO <span className="text-blue-500">01</span></h2>
          <p className="text-[8px] md:text-[10px] font-bold text-white/30 uppercase tracking-[0.4em] mt-2">Hybrid Telemetry System</p>
        </div>
        
        {isCharging && (
          <div className="absolute top-6 right-6 md:top-10 md:right-10 glass px-4 py-2 rounded-2xl border border-green-500/30 bg-green-500/10 flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
             <span className="text-[10px] font-black uppercase text-green-400">Charging: {chargingKw} kW</span>
          </div>
        )}

        <div className="absolute bottom-6 left-6 right-6 grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-4">
          <div className="space-y-0.5">
            <p className="text-[7px] md:text-[9px] font-black text-white/30 uppercase tracking-widest">Energía</p>
            <div className="flex items-baseline gap-1">
              <p className="text-xl md:text-4xl font-black text-white">{batteryPct}%</p>
              <p className="text-[8px] md:text-sm font-black text-blue-400 italic">{rangeKm}km</p>
            </div>
          </div>
          <div className="space-y-0.5">
            <p className="text-[7px] md:text-[9px] font-black text-white/30 uppercase tracking-widest">Combustible</p>
            <div className="flex items-baseline gap-1">
              <p className="text-xl md:text-4xl font-black text-yellow-500">{fuelLiters}L</p>
              <p className="text-[8px] md:text-sm font-black text-yellow-500/60 italic">{fuelRange}km</p>
            </div>
          </div>
          <div className="space-y-0.5">
            <p className="text-[7px] md:text-[9px] font-black text-white/30 uppercase tracking-widest">Odómetro</p>
            <p className="text-lg md:text-4xl font-black text-white/80">{formatKm(getVal(config?.vehicle.odometer_entity))} <span className="text-[8px] md:text-sm italic">km</span></p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0">
        <div className="lg:col-span-2 glass rounded-[35px] border border-white/10 h-[350px] md:h-[500px] overflow-hidden relative bg-black/60 shadow-2xl">
           <div ref={mapContainerRef} className="w-full h-full z-0" />
           <div className="absolute top-4 left-4 glass px-4 py-2 rounded-xl text-[8px] font-black uppercase text-blue-400 tracking-widest z-[1000] border border-blue-500/20 bg-black/60">Sentinel_GPS_Link</div>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="glass rounded-[35px] p-6 md:p-8 border border-white/10 bg-black/40 flex flex-col gap-6">
            <div className="space-y-4">
              <h4 className="text-[9px] font-black uppercase tracking-widest text-blue-400 italic">Estado General</h4>
              <div className="space-y-3 px-2">
                {[
                  { label: 'Cierre Central', val: getVal(config?.vehicle.lock_entity), color: 'text-green-400' },
                  { label: 'Estado Carga', val: isCharging ? 'Conectado' : 'Desconectado', color: isCharging ? 'text-green-400' : 'text-white/40' },
                  { label: 'Potencia Carga', val: chargingKw, unit: 'kW', color: isCharging ? 'text-green-400' : 'text-white/20' }
                ].map((d, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[9px] uppercase font-bold text-white/40 tracking-widest">{d.label}</span>
                    <span className={`text-[10px] font-black uppercase ${d.color}`}>{d.val} {d.unit}</span>
                  </div>
                ))}
              </div>
            </div>
            <button 
              onClick={handleCloudSync} 
              disabled={isSyncing}
              className={`w-full py-5 rounded-[25px] text-[10px] font-black uppercase tracking-widest shadow-xl text-white transition-all active:scale-95 ${isSyncing ? 'bg-blue-900 opacity-50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'}`}
            >
              {isSyncing ? 'EJECUTANDO SCRIPT...' : 'SINC_CLOUD_SCRIPT'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
             {(config?.vehicle.extra_entities || []).map((id, idx) => (
               <div key={idx} className="glass p-4 rounded-3xl border border-white/5 bg-black/40 flex flex-col justify-between h-[100px]">
                  <p className="text-[8px] font-black text-white/30 uppercase truncate">{getFriendly(id)}</p>
                  <p className="text-lg font-black text-white italic">{getVal(id)} <span className="text-[8px] not-italic opacity-20">{getUnit(id)}</span></p>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleView;
