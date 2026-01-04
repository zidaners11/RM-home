
import React, { useState, useEffect } from 'react';
import { fetchHAStates } from '../homeAssistantService';
import { HomeAssistantConfig } from '../types';

const VehicleView: React.FC = () => {
  const [states, setStates] = useState<any[]>([]);
  const [config, setConfig] = useState<HomeAssistantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('nexus_ha_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setConfig(parsed);
      refreshData(parsed);
      const interval = setInterval(() => refreshData(parsed), 30000);
      return () => clearInterval(interval);
    }
  }, []);

  const refreshData = async (cfg: HomeAssistantConfig) => {
    setIsRefreshing(true);
    const data = await fetchHAStates(cfg.url, cfg.token);
    if (data) setStates(data);
    setLoading(false);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getEntityData = (id?: string) => {
    if (!id) return null;
    return states.find(st => st.entity_id === id);
  };

  const getVal = (entityId?: string, fallback = '---') => {
    const s = getEntityData(entityId);
    return s?.state || fallback;
  };

  if (loading || !config) return (
    <div className="h-[60vh] flex flex-col items-center justify-center">
       <div className="w-16 h-16 border-4 border-white/5 border-t-cyan-400 rounded-full animate-spin mb-6" />
       <p className="text-cyan-400 font-black text-[10px] uppercase tracking-[0.5em] animate-pulse">Iniciando Enlace de Telemetría...</p>
    </div>
  );

  const car = config.vehicle;
  const battery = parseFloat(getVal(car.battery_entity, '0'));
  const status = getVal(car.status_entity, 'Parked');
  const isCharging = status.toLowerCase().includes('charge');

  // KPIs Principales
  const primaryKPIs = [
    { label: 'Autonomía', val: getVal(car.range_entity), unit: 'km', color: 'text-cyan-400', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { label: 'Odómetro', val: getVal(car.odometer_entity), unit: 'km', color: 'text-white', icon: 'M12 8v4l3 3' },
    { label: 'Uso Eléctrico', val: getVal(car.electric_use_entity), unit: 'kWh', color: 'text-blue-400', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { label: 'Ahorro', val: getVal(car.saving_entity), unit: '€', color: 'text-green-400', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2' }
  ];

  // Telemetría Completa y Dinámica (Permite ver los 11+ mencionados)
  const basicTelemetry = [
    { label: 'Consumo Medio', val: getVal(car.avg_consumption_entity), unit: 'kWh/100', icon: 'M13 7h8m0 0V9m0 8l-8-8-4 4-6-6' },
    { label: 'Límite Carga', val: getVal(car.charge_limit_entity), unit: '%', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { label: 'Potencia Carga', val: getVal(car.charging_speed_entity), unit: 'kW', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { label: 'Próximo Servicio', val: getVal(car.service_km_entity), unit: 'km', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066' },
    { label: 'Ventanas', val: getVal(car.windows_entity), unit: '', icon: 'M4 8V4m0 0h4M4 4l5 5' },
    { label: 'Climatización', val: getVal(car.climate_entity), unit: '', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { label: 'Sincronización', val: getVal(car.last_update_entity), unit: '', icon: 'M12 8v4l3 3' }
  ].filter(k => k.val !== '---');

  const extraTelemetry = (car.extra_entities || []).map(id => {
    const s = getEntityData(id);
    return {
      label: s?.attributes?.friendly_name || id.split('.')[1],
      val: s?.state || '---',
      unit: s?.attributes?.unit_of_measurement || '',
      icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    };
  });

  const fullTelemetry = [...basicTelemetry, ...extraTelemetry];

  return (
    <div className="flex flex-col gap-10 pb-32 animate-in fade-in duration-1000">
      
      {/* Hero Section */}
      <div className="relative glass rounded-[60px] overflow-hidden border border-white/10 h-[500px] shadow-2xl shrink-0 group">
         <img src={car.image_url || "https://images.unsplash.com/photo-1617788138017-80ad42243c5d?q=80&w=2000"} className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 group-hover:scale-110 transition-transform duration-[5s]" alt="Car" />
         <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent" />
         
         <div className="absolute top-16 left-16 space-y-4">
            <div className="flex items-center gap-4">
               <div className={`w-4 h-4 rounded-full ${isCharging ? 'bg-green-400 animate-ping shadow-[0_0_20px_#4ade80]' : 'bg-blue-500 animate-pulse'}`} />
               <span className="text-[12px] font-black uppercase tracking-[0.8em] text-white/60">{status}</span>
            </div>
            <h2 className="text-8xl font-black text-white italic tracking-tighter uppercase leading-none">NEXUS <span className="text-cyan-400 font-light">FLEET</span></h2>
         </div>

         <div className="absolute top-16 right-16">
            <div className="relative w-40 h-40">
               <svg className="w-full h-full -rotate-90">
                  <circle cx="50%" cy="50%" r="45%" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <circle cx="50%" cy="50%" r="45%" fill="none" stroke={isCharging ? '#4ade80' : '#22d3ee'} strokeWidth="8" strokeDasharray={`${battery * 2.5} 1000`} className="transition-all duration-[2s]" />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-5xl font-black text-white">{battery}<span className="text-xs text-white/30 font-black ml-1">%</span></p>
               </div>
            </div>
         </div>

         <div className="absolute bottom-16 left-16 right-16 grid grid-cols-2 md:grid-cols-4 gap-12">
            {primaryKPIs.map((k, i) => (
               <div key={i} className="space-y-2">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">{k.label}</p>
                  <p className={`text-4xl font-black tracking-tight ${k.color}`}>{k.val}<span className="text-[11px] ml-1 opacity-40 uppercase font-black">{k.unit}</span></p>
               </div>
            ))}
         </div>
      </div>

      {/* Grid de Telemetría Dinámico (Sin límite de items) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
         {fullTelemetry.map((k, i) => (
            <div key={i} className="glass p-8 rounded-[40px] border border-white/5 hover:bg-white/[0.08] transition-all flex flex-col justify-between h-[200px] group shadow-xl">
               <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={k.icon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <span className="text-[8px] font-mono text-white/10 uppercase">TELEMETRY_DATA_PT_{i+1}</span>
               </div>
               <div>
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1 truncate">{k.label}</p>
                  <p className="text-2xl font-black text-white truncate">
                     {k.val}
                     <span className="text-[10px] ml-1 opacity-20 uppercase font-black">{k.unit}</span>
                  </p>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
};

export default VehicleView;
