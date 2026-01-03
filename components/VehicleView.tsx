
import React, { useState, useEffect } from 'react';
import { fetchHAStates, callHAService } from '../homeAssistantService';

const VehicleView: React.FC = () => {
  const [states, setStates] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
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

  const refreshData = async (cfg: any) => {
    setIsRefreshing(true);
    const data = await fetchHAStates(cfg.url, cfg.token);
    if (data) setStates(data);
    setLoading(false);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleUpdateCar = async () => {
    if (!config || !config.vehicle?.refresh_button_entity) {
       await refreshData(config);
       return;
    };
    
    setIsRefreshing(true);
    const entityId = config.vehicle.refresh_button_entity;
    const domain = entityId.split('.')[0];
    
    let service = 'turn_on';
    if (domain === 'button') service = 'press';
    if (domain === 'script' || domain === 'automation') service = 'turn_on';

    await callHAService(config.url, config.token, domain, service, {
      entity_id: entityId
    });

    // Esperar a que el coche envíe datos
    setTimeout(() => refreshData(config), 3000);
  };

  const getVal = (entityId?: string, fallback = '---') => {
    if (!entityId) return fallback;
    const s = states.find(st => st.entity_id === entityId);
    return s?.state || fallback;
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center">
       <div className="w-16 h-16 border-4 border-white/5 border-t-cyan-400 rounded-full animate-spin mb-6" />
       <p className="text-cyan-400 font-black text-[10px] uppercase tracking-[0.5em] animate-pulse">Engaging Lynk & Co Systems...</p>
    </div>
  );

  const battery = parseFloat(getVal(config?.vehicle?.battery_entity, '0'));
  const isCharging = getVal(config?.vehicle?.status_entity).toLowerCase().includes('charge');
  
  // Imagen con fallback de respaldo si la URL personalizada falla
  const carImageUrl = config?.vehicle?.image_url || "https://www.lynkco.com/dam/jcr:168b4952-0c9f-43b9-879e-400923055845/01_Black_Hero.jpg";

  return (
    <div className="flex flex-col gap-6 pb-24 animate-in fade-in zoom-in-95 duration-1000">
      
      {/* Hero Header */}
      <div className="relative glass rounded-[50px] overflow-hidden border border-white/10 h-[380px] md:h-[450px] shadow-2xl">
         <img 
            key={carImageUrl}
            src={carImageUrl} 
            className="absolute inset-0 w-full h-full object-cover opacity-90 transition-opacity duration-1000"
            alt="Lynk & Co 01"
            onError={(e) => { 
               console.error("Image load failed, using fallback");
               (e.target as any).src = 'https://images.unsplash.com/photo-1542362567-b05503f3af15?q=80&w=2000&auto=format&fit=crop'; 
            }}
         />
         <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
         <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
         
         <div className="absolute top-10 left-10 md:top-14 md:left-14 space-y-4">
            <div className="flex items-center gap-3">
               <div className={`w-3 h-3 rounded-full ${isCharging ? 'bg-green-400 animate-ping' : 'bg-cyan-400 animate-pulse'} shadow-[0_0_15px_#22d3ee]`} />
               <span className="text-[10px] font-black uppercase tracking-[0.6em] text-white/40">
                  {isCharging ? 'Charging System Active' : 'Vehicle Secure // Hub Connected'}
               </span>
            </div>
            <h2 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter">Lynk & Co <span className="text-cyan-400">01</span></h2>
            <p className="text-white/30 font-mono text-[10px] uppercase tracking-[0.4em]">Tactical Black // {getVal(config?.vehicle?.status_entity)}</p>
            
            <button 
              onClick={handleUpdateCar}
              disabled={isRefreshing}
              className={`mt-6 px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-4 transition-all group ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <svg className={`w-4 h-4 text-cyan-400 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              <span className="text-[9px] font-black uppercase tracking-widest text-white/60">
                {isRefreshing ? 'Sincronizando...' : 'Actualizar Estado Real'}
              </span>
            </button>
         </div>

         <div className="absolute bottom-10 right-10 md:bottom-14 md:right-14">
            <div className="relative w-40 h-40 md:w-48 md:h-48">
               <svg className="w-full h-full -rotate-90">
                  <circle cx="50%" cy="50%" r="45%" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#22d3ee" strokeWidth="8" strokeDasharray={`${battery * 2.8} 1000`} className="transition-all duration-1000" />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-4xl md:text-5xl font-black text-white">{battery}<span className="text-sm text-white/30">%</span></p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Charge Level</p>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         {[
            { label: 'Uso Eléctrico', val: getVal(config?.vehicle?.electric_use_entity), unit: '%', color: 'text-green-400' },
            { label: 'Consumo Medio', val: getVal(config?.vehicle?.avg_consumption_entity), unit: 'kWh', color: 'text-white' },
            { label: 'Km Hoy', val: getVal(config?.vehicle?.km_today_entity), unit: 'km', color: 'text-cyan-400' },
            { label: 'Tiempo Carga', val: getVal(config?.vehicle?.time_to_charge_entity), unit: 'min', color: 'text-yellow-400' },
         ].map((m, i) => (
            <div key={i} className="glass p-6 rounded-[35px] border border-white/5 hover:bg-white/[0.02] transition-all">
               <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">{m.label}</p>
               <p className={`text-3xl font-black ${m.color}`}>{m.val}<span className="text-xs ml-1 opacity-20 uppercase font-black">{m.unit}</span></p>
            </div>
         ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="glass p-8 rounded-[45px] border border-white/10 flex flex-col justify-between">
            <div className="flex justify-between items-start">
               <div>
                  <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-1">Carga de Red</h3>
                  <p className="text-3xl font-black text-white">{getVal(config?.vehicle?.charging_speed_entity)} kW</p>
               </div>
               <div className="w-10 h-10 bg-cyan-400/10 rounded-xl flex items-center justify-center text-cyan-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth={2}/></svg>
               </div>
            </div>
            <div className="mt-8 space-y-4">
               <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/20">
                  <span>Flujo_DC</span>
                  <span>Estable</span>
               </div>
               <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 animate-[pulse_2s_infinite]" style={{ width: '45%' }} />
               </div>
            </div>
         </div>

         <div className="glass p-8 rounded-[45px] border border-white/10">
            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-6">Mantenimiento</h3>
            <div className="space-y-6">
               <div className="flex justify-between items-end">
                  <div>
                     <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Odómetro</p>
                     <p className="text-2xl font-black text-white">{getVal(config?.vehicle?.odometer_entity)} km</p>
                  </div>
                  <div className="text-right">
                     <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Revisión</p>
                     <p className="text-2xl font-black text-white/60">{getVal(config?.vehicle?.service_km_entity)} km</p>
                  </div>
               </div>
               <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-white/20 w-[60%]" />
               </div>
            </div>
         </div>

         <div className="glass p-8 rounded-[45px] border border-white/10 flex flex-col justify-between">
            <div>
               <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-4">Combustible</h3>
               <div className="flex items-end gap-3">
                  <span className="text-4xl font-black text-white">{getVal(config?.vehicle?.fuel_entity)}</span>
                  <span className="text-xl font-black text-white/20 mb-1">LITROS</span>
               </div>
            </div>
            <div className="mt-6 flex justify-between items-center">
               <div className="flex gap-1">
                  {[1,2,3,4,5,6,7,8].map(i => <div key={i} className={`w-2 h-6 rounded-sm ${i < 6 ? 'bg-orange-500/50' : 'bg-white/5'}`} />)}
               </div>
               <span className="text-[10px] font-black uppercase text-white/20 tracking-widest">Rango: 450km</span>
            </div>
         </div>
      </div>
    </div>
  );
};

export default VehicleView;
