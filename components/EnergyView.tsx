
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchHAStates } from '../homeAssistantService';
import { HomeAssistantConfig } from '../types';

const EnergyView: React.FC = () => {
  const [haConfig, setHaConfig] = useState<HomeAssistantConfig | null>(null);
  const [states, setStates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('nexus_ha_config');
    if (saved) {
      const config = JSON.parse(saved);
      setHaConfig(config);
      refreshData(config);
      const interval = setInterval(() => refreshData(config), 20000);
      return () => clearInterval(interval);
    }
  }, []);

  const refreshData = async (config: HomeAssistantConfig) => {
    const data = await fetchHAStates(config.url, config.token);
    if (data) setStates(data);
    setLoading(false);
  };

  const getVal = (id?: string) => {
    if (!id) return 0;
    const s = states.find(st => st.entity_id === id);
    return s ? parseFloat(s.state) || 0 : 0;
  };

  const solarNow = getVal(haConfig?.solar_production_entity);
  const solarDaily = getVal(haConfig?.solar_daily_entity);
  const solarMonthly = getVal(haConfig?.solar_monthly_entity);
  const gridCons = getVal(haConfig?.grid_consumption_entity);
  const gridExp = getVal(haConfig?.grid_export_entity);
  const cost = getVal(haConfig?.energy_cost_entity);
  const car = getVal(haConfig?.car_battery_entity);

  const metrics = [
    { label: 'Instantánea Solar', val: solarNow, unit: 'W', color: 'text-yellow-400', border: 'border-yellow-500/20' },
    { label: 'Solar Hoy', val: solarDaily, unit: 'kWh', color: 'text-orange-400', border: 'border-orange-500/20' },
    { label: 'Consumo Red', val: gridCons, unit: 'W', color: 'text-blue-400', border: 'border-blue-500/20' },
    { label: 'Precio Actual', val: cost, unit: '€', color: 'text-green-400', border: 'border-green-500/20' },
    { label: 'Batería Coche', val: car, unit: '%', color: 'text-cyan-400', border: 'border-cyan-500/20' }
  ];

  return (
    <div className="space-y-6 md:space-y-8 pb-24 text-left">
       <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
          {metrics.map((m, i) => (
            <div key={i} className={`glass p-5 md:p-8 rounded-[30px] md:rounded-[40px] border ${m.border} group hover:bg-white/[0.02] transition-all`}>
               <p className="text-[8px] md:text-[11px] text-white/30 uppercase font-black tracking-[0.2em] mb-1 md:mb-2 group-hover:text-white/50">{m.label}</p>
               <p className={`text-2xl md:text-4xl font-black tracking-tighter ${m.color}`}>{m.val.toFixed(m.unit === '€' ? 4 : 1)}<span className="text-[10px] md:text-sm ml-1 text-white/20 font-black">{m.unit}</span></p>
            </div>
          ))}
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass p-6 md:p-10 rounded-[40px] md:rounded-[56px] border border-white/10 h-[300px] md:h-[450px] relative overflow-hidden">
             <div className="absolute top-6 left-6 md:top-8 md:left-8">
                <h4 className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] text-white/20">Matriz de Producción vs Consumo</h4>
             </div>
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={Array.from({length: 12}, (_, i) => ({ t: `${i*2}:00`, s: solarNow * Math.random(), c: gridCons * Math.random() }))}>
                   <defs>
                      <linearGradient id="solar" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4}/><stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/></linearGradient>
                      <linearGradient id="cons" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                   </defs>
                   <XAxis dataKey="t" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 'bold'}} />
                   <Tooltip contentStyle={{backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', fontSize: '12px'}} />
                   <Area type="monotone" dataKey="s" name="Producción" stroke="#fbbf24" fill="url(#solar)" strokeWidth={3} />
                   <Area type="monotone" dataKey="c" name="Consumo" stroke="#3b82f6" fill="url(#cons)" strokeWidth={3} />
                </AreaChart>
             </ResponsiveContainer>
          </div>

          <div className="glass p-8 rounded-[40px] border border-white/10 flex flex-col justify-between">
             <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mb-6">Totales del Ciclo</h4>
                <div className="space-y-6">
                   <div className="flex justify-between items-end border-b border-white/5 pb-4">
                      <span className="text-xs font-bold text-white/40">Solar este Mes</span>
                      <span className="text-3xl font-black text-white">{solarMonthly.toFixed(1)} <span className="text-xs opacity-20">kWh</span></span>
                   </div>
                   <div className="flex justify-between items-end border-b border-white/5 pb-4">
                      <span className="text-xs font-bold text-white/40">Retornado a Red</span>
                      <span className="text-3xl font-black text-green-400">{gridExp.toFixed(0)} <span className="text-xs opacity-20">W</span></span>
                   </div>
                </div>
             </div>
             <div className="p-6 bg-blue-600/5 border border-blue-500/20 rounded-3xl">
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Ahorro Energía IA</p>
                <p className="text-xs text-white/60 italic leading-relaxed">"Sistemas fotovoltaicos operando al {(solarNow/5000*100).toFixed(0)}% de capacidad nominal. Recomiendo activar carga EV ahora."</p>
             </div>
          </div>
       </div>
    </div>
  );
};

export default EnergyView;
