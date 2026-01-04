
import React, { useState, useEffect } from 'react';
import { fetchHAStates, callHAService } from '../homeAssistantService';
import { HomeAssistantConfig } from '../types';

const formatNexusNum = (val: any) => {
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  // Formato español: punto para miles, coma para decimales
  return new Intl.NumberFormat('es-ES', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(n);
};

const VehicleView: React.FC = () => {
  const [states, setStates] = useState<any[]>([]);
  const [config, setConfig] = useState<HomeAssistantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('nexus_ha_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
        refreshData(parsed);
        const interval = setInterval(() => refreshData(parsed), 30000);
        return () => clearInterval(interval);
      } catch (e) { console.error(e); setLoading(false); }
    } else {
      setLoading(false);
    }
  }, []);

  const refreshData = async (cfg: HomeAssistantConfig) => {
    try {
      const data = await fetchHAStates(cfg.url, cfg.token);
      if (data) setStates(data);
    } catch (e) { } finally { setLoading(false); }
  };

  const handleManualRefresh = async () => {
    if (!config || !config.vehicle.refresh_script) return;
    setIsRefreshing(true);
    try {
      const [domain, service] = config.vehicle.refresh_script.split('.');
      await callHAService(config.url, config.token, domain || 'script', service, {});
      setTimeout(() => {
        refreshData(config);
        setIsRefreshing(false);
      }, 3000);
    } catch (e) {
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

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/5 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-blue-400 font-black text-[9px] uppercase tracking-[0.4em] animate-pulse">Sincronizando Telemetría Lynk&co...</p>
      </div>
    );
  }

  if (!config) return (
    <div className="h-[60vh] flex items-center justify-center glass rounded-[40px] text-white/20 uppercase font-black tracking-widest text-xs border border-dashed border-white/10">
      Telemetría de Vehículo no configurada. Abre Ajustes.
    </div>
  );

  const car = config.vehicle;
  const batteryRaw = parseFloat(getVal(car.battery_entity, '0'));
  const battery = isNaN(batteryRaw) ? 0 : batteryRaw;
  const status = getVal(car.status_entity, 'Parked');
  const isCharging = status.toLowerCase().includes('charge');

  // Circunferencia matemática exacta para r=45 -> 2 * PI * 45 ≈ 282.743
  const circumference = 2 * Math.PI * 45;
  // Offset inverso: al 100% el offset debe ser 0 para cerrar el círculo.
  const offset = circumference - (battery / 100) * circumference;

  const primaryKPIs = [
    { label: 'Autonomía EV', val: getVal(car.range_entity), unit: 'km', color: 'text-cyan-400' },
    { label: 'Autonomía Gas', val: getVal(car.fuel_range_entity), unit: 'km', color: 'text-orange-400' },
    { label: 'Gasolina', val: getVal(car.fuel_entity), unit: 'L', color: 'text-yellow-500' },
    { label: 'Odómetro', val: getVal(car.odometer_entity), unit: 'km', color: 'text-white' },
    { label: 'Ahorro', val: getVal(car.saving_entity), unit: '€', color: 'text-green-400' },
    { label: 'Consumo', val: getVal(car.avg_consumption_entity), unit: 'kWh', color: 'text-blue-400' }
  ];

  const extraTelemetry = [
    { label: 'Ventanas', val: getVal(car.windows_entity), unit: '' },
    { label: 'Último Sync', val: getVal(car.last_update_entity), unit: '' }
  ];

  return (
    <div className="flex flex-col gap-10 pb-32 animate-in fade-in duration-1000">
      
      <div className="relative glass rounded-[60px] overflow-hidden border border-white/10 h-[450px] shadow-2xl shrink-0 group">
         <img src={car.image_url || "https://images.unsplash.com/photo-1617788138017-80ad42243c5d?q=80&w=2000"} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[10s]" alt="Car" />
         <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
         
         <div className="absolute top-12 left-12 space-y-2">
            <div className="flex items-center gap-3">
               <div className={`w-3 h-3 rounded-full ${isCharging ? 'bg-green-400 animate-ping shadow-[0_0_15px_#4ade80]' : 'bg-blue-500 animate-pulse'}`} />
               <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/60">{status}</span>
            </div>
            <h2 className="text-7xl font-black text-white italic tracking-tighter uppercase leading-none">Lynk&co <span className="text-cyan-400 font-light">01</span></h2>
         </div>

         <div className="absolute top-12 right-12 flex flex-col items-center gap-6">
            <div className="relative w-32 h-32 flex flex-col items-center justify-center">
               <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                  <circle 
                    cx="50" cy="50" r="45" 
                    fill="none" 
                    stroke={isCharging ? '#4ade80' : '#22d3ee'} 
                    strokeWidth="6" 
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-[2s] ease-out" 
                  />
               </svg>
               <p className="text-4xl font-black text-white">{battery}<span className="text-xs ml-1">%</span></p>
            </div>
            
            {car.refresh_script && (
               <button 
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className={`p-5 rounded-full glass border border-white/10 transition-all ${isRefreshing ? 'animate-spin opacity-50' : 'hover:bg-blue-600/20 hover:scale-110 active:scale-95'}`}
               >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
               </button>
            )}
         </div>

         <div className="absolute bottom-12 left-12 right-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {primaryKPIs.map((k, i) => (
               <div key={i}>
                  <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">{k.label}</p>
                  <p className={`text-2xl font-black tracking-tight ${k.color}`}>{formatNexusNum(k.val)}<span className="text-[10px] ml-1 opacity-40 uppercase font-black">{k.unit}</span></p>
               </div>
            ))}
         </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
         {extraTelemetry.map((k, i) => (
            <div key={i} className="glass p-6 rounded-[35px] border border-white/5 hover:bg-white/[0.08] transition-all flex flex-col justify-center min-h-[140px]">
               <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2 line-clamp-1">{k.label}</p>
               <p className="text-xl font-black text-white">
                  {formatNexusNum(k.val)}
                  <span className="text-[9px] ml-1 opacity-20 uppercase font-black">{k.unit}</span>
               </p>
            </div>
         ))}
      </div>
    </div>
  );
};

export default VehicleView;
