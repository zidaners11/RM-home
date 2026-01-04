
import React, { useState, useEffect } from 'react';
import { fetchHAStates } from '../homeAssistantService';
import { HomeAssistantConfig } from '../types';

const VehicleView: React.FC = () => {
  const [states, setStates] = useState<any[]>([]);
  const [config, setConfig] = useState<HomeAssistantConfig | null>(null);
  const [loading, setLoading] = useState(true);

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

  const getEntityData = (id?: string) => {
    if (!id || !states) return null;
    return states.find(st => st.entity_id === id);
  };

  const getVal = (entityId?: string, fallback = '---') => {
    const s = getEntityData(entityId);
    return s?.state || fallback;
  };

  // Fix: Explicitly return loader when in loading state to prevent union type errors below
  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/5 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-blue-400 font-black text-[9px] uppercase tracking-[0.4em] animate-pulse">Sincronizando Telemetría de Vehículo...</p>
      </div>
    );
  }

  // Fix: Ensure config is present before rendering main view
  if (!config) return (
    <div className="h-[60vh] flex items-center justify-center glass rounded-[40px] text-white/20 uppercase font-black tracking-widest text-xs border border-dashed border-white/10">
      Telemetría de Vehículo no configurada. Abre Ajustes.
    </div>
  );

  // Fix: With loading and null checks complete, car is now safely typed as VehicleConfig
  const car = config.vehicle;
  const battery = parseFloat(getVal(car.battery_entity, '0'));
  const status = getVal(car.status_entity, 'Parked');
  const isCharging = status.toLowerCase().includes('charge');

  const primaryKPIs = [
    { label: 'Autonomía', val: getVal(car.range_entity), unit: 'km', color: 'text-cyan-400' },
    { label: 'Odómetro', val: getVal(car.odometer_entity), unit: 'km', color: 'text-white' },
    { label: 'Ahorro', val: getVal(car.saving_entity), unit: '€', color: 'text-green-400' },
    { label: 'Consumo', val: getVal(car.avg_consumption_entity), unit: 'kWh', color: 'text-blue-400' }
  ];

  const extraTelemetry = (car.extra_entities || []).map(id => {
    const s = getEntityData(id);
    return {
      label: s?.attributes?.friendly_name || id.split('.')[1] || 'Sensor',
      val: s?.state || '---',
      unit: s?.attributes?.unit_of_measurement || ''
    };
  });

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
            <h2 className="text-7xl font-black text-white italic tracking-tighter uppercase leading-none">NEXUS <span className="text-cyan-400 font-light">FLEET</span></h2>
         </div>

         <div className="absolute top-12 right-12">
            <div className="relative w-32 h-32 flex flex-col items-center justify-center">
               <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="50%" cy="50%" r="45%" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                  <circle cx="50%" cy="50%" r="45%" fill="none" stroke={isCharging ? '#4ade80' : '#22d3ee'} strokeWidth="6" strokeDasharray={`${battery * 2} 1000`} className="transition-all duration-[2s]" />
               </svg>
               <p className="text-4xl font-black text-white">{battery}<span className="text-xs ml-1">%</span></p>
            </div>
         </div>

         <div className="absolute bottom-12 left-12 right-12 grid grid-cols-2 md:grid-cols-4 gap-8">
            {primaryKPIs.map((k, i) => (
               <div key={i}>
                  <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">{k.label}</p>
                  <p className={`text-3xl font-black tracking-tight ${k.color}`}>{k.val}<span className="text-[10px] ml-1 opacity-40 uppercase">{k.unit}</span></p>
               </div>
            ))}
         </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
         {extraTelemetry.map((k, i) => (
            <div key={i} className="glass p-6 rounded-[35px] border border-white/5 hover:bg-white/[0.08] transition-all flex flex-col justify-center min-h-[140px]">
               <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2 line-clamp-1">{k.label}</p>
               <p className="text-xl font-black text-white">
                  {k.val}
                  <span className="text-[9px] ml-1 opacity-20 uppercase font-black">{k.unit}</span>
               </p>
            </div>
         ))}
      </div>
    </div>
  );
};

export default VehicleView;
