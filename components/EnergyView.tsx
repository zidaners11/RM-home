
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
    { label: 'Solar Mes', val: solarMonthly, unit: 'kWh', color: 'text-orange-600', border: 'border-orange-500/10' },
    { label: 'Consumo Red', val: gridCons, unit: 'W', color: 'text-blue-400', border: 'border-blue-500/20' },
    { label: 'Retornado', val: gridExp, unit: 'W', color: 'text-green-400', border: 'border-green-500/20' },
    { label: 'Precio Actual', val: cost, unit: '€', color: 'text-cyan-400', border: 'border-cyan-500/20' },
    { label: 'Batería Coche', val: car, unit: '%', color: 'text-blue-600', border: 'border-blue-500/10' }
  ].filter(m => m.val !== 0);

  return (
    <div className="space-y-10 pb-24 animate-in fade-in duration-700">
       {/* Metrics Grid Flexible */}
       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {metrics.map((m, i) => (
            <div key={i} className={`glass p-6 rounded-[40px] border ${m.border} hover:bg-white/[0.02] transition-all flex flex-col justify-center`}>
               <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-2">{m.label}</p>
               <p className={`text-3xl font-black tracking-tighter ${m.color}`}>{m.val.toFixed(m.unit === '€' ? 4 : 1)}<span className="text-[10px] ml-1 text-white/20 font-black">{m.unit}</span></p>
            </div>
          ))}
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 glass p-10 rounded-[60px] border border-white/10 h-[500px] relative overflow-hidden">
             <div className="mb-10 flex justify-between items-center">
                <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-white/20">Matriz de Producción vs Consumo</h4>
                <div className="flex gap-4">
                   <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-400" /><span className="text-[9px] uppercase font-bold text-white/40">Solar</span></div>
                   <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[9px] uppercase font-bold text-white/40">Red</span></div>
                </div>
             </div>
             <ResponsiveContainer width="100%" height="80%">
                <AreaChart data={Array.from({length: 12}, (_, i) => ({ t: `${i*2}:00`, s: solarNow * (0.5 + Math.random()), c: gridCons * (0.8 + Math.random()) }))}>
                   <defs>
                      <linearGradient id="solar" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4}/><stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/></linearGradient>
                      <linearGradient id="cons" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                   </defs>
                   <XAxis dataKey="t" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 'bold'}} />
                   <Tooltip contentStyle={{backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', fontSize: '12px', color: '#fff'}} itemStyle={{color: '#fff'}} />
                   <Area type="monotone" dataKey="s" name="Producción" stroke="#fbbf24" fill="url(#solar)" strokeWidth={3} />
                   <Area type="monotone" dataKey="c" name="Consumo" stroke="#3b82f6" fill="url(#cons)" strokeWidth={3} />
                </AreaChart>
             </ResponsiveContainer>
          </div>

          <div className="space-y-8">
             <div className="glass p-10 rounded-[50px] border border-white/10 h-full flex flex-col justify-between">
                <div>
                   <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mb-10">Optimización de Red</h4>
                   <div className="space-y-8">
                      <div className="flex justify-between items-end border-b border-white/5 pb-6">
                         <span className="text-xs font-bold text-white/40 uppercase">Eficiencia Solar</span>
                         <span className="text-4xl font-black text-yellow-400">{(solarNow > 0 ? (solarNow / 5000 * 100).toFixed(0) : 0)}%</span>
                      </div>
                      <div className="flex justify-between items-end border-b border-white/5 pb-6">
                         <span className="text-xs font-bold text-white/40 uppercase">Neto Actual</span>
                         <span className={`text-4xl font-black ${(solarNow - gridCons) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(solarNow - gridCons).toFixed(0)} <span className="text-xs opacity-20 ml-1">W</span>
                         </span>
                      </div>
                   </div>
                </div>
                <div className="p-8 bg-blue-600/5 border border-blue-500/20 rounded-[40px] mt-10">
                   <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Recomendación IA</p>
                   <p className="text-xs text-white/70 italic leading-relaxed">
                      {solarNow > 2000 ? "Producción alta detectada. Es el momento óptimo para activar electrodomésticos de alto consumo." : "Producción limitada. Priorizando mantenimiento de carga en sistemas críticos."}
                   </p>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

export default EnergyView;
