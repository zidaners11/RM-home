
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchHAStates } from '../homeAssistantService';
import { HomeAssistantConfig } from '../types';

const EnergyView: React.FC = () => {
  const [haConfig, setHaConfig] = useState<HomeAssistantConfig | null>(null);
  const [states, setStates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const metrics = [
    { label: 'Generación Solar', val: getVal(haConfig?.solar_production_entity), unit: 'kW', color: 'text-yellow-400', border: 'border-yellow-500/20' },
    { label: 'Consumo Red', val: getVal(haConfig?.grid_consumption_entity), unit: 'kW', color: 'text-blue-400', border: 'border-blue-500/20' },
    { label: 'Energía Revertida', val: getVal(haConfig?.grid_export_entity), unit: 'kW', color: 'text-green-400', border: 'border-green-500/20' },
    { label: 'Importe Factura', val: getVal(haConfig?.invoice_entity), unit: '€', color: 'text-white', border: 'border-purple-500/20' },
    { label: 'Carga EV', val: getVal(haConfig?.car_battery_entity), unit: '%', color: 'text-blue-300', border: 'border-white/5' }
  ].filter(m => m.label.toLowerCase().includes(search.toLowerCase()));

  const solar = getVal(haConfig?.solar_production_entity);
  const cons = getVal(haConfig?.grid_consumption_entity);

  return (
    <div className="space-y-8 pb-24 text-left">
       <div className="glass-dark rounded-[32px] p-6 flex items-center gap-6 border border-white/10">
          <div className="relative flex-1">
             <input 
                type="text" 
                placeholder="Explorar métricas energéticas de RM Home..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-[24px] px-16 py-5 text-base text-white outline-none focus:border-blue-500/40 transition-all"
             />
             <svg className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {metrics.map((m, i) => (
            <div key={i} className={`glass p-8 rounded-[40px] border ${m.border} group hover:bg-white/[0.02] transition-all`}>
               <p className="text-[11px] text-white/30 uppercase font-black tracking-[0.2em] mb-2 group-hover:text-white/50">{m.label}</p>
               <p className={`text-4xl font-black tracking-tighter ${m.color}`}>{m.val.toFixed(m.unit === '€' ? 2 : 1)}<span className="text-sm ml-2 text-white/20 font-black">{m.unit}</span></p>
            </div>
          ))}
       </div>

       <div className="glass p-12 rounded-[56px] border border-white/10 h-[450px] relative overflow-hidden">
          <div className="absolute top-8 left-8">
             <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-white/20">Matriz de Carga de Red</h4>
          </div>
          <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={Array.from({length: 12}, (_, i) => ({ t: `${i*2}:00`, s: solar * Math.random(), c: cons * Math.random() }))}>
                <defs>
                   <linearGradient id="solar" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4}/><stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/></linearGradient>
                   <linearGradient id="cons" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                </defs>
                <XAxis dataKey="t" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 'bold'}} />
                <Tooltip contentStyle={{backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', fontWeight: 'bold'}} />
                <Area type="monotone" dataKey="s" name="Producción" stroke="#fbbf24" fill="url(#solar)" strokeWidth={4} />
                <Area type="monotone" dataKey="c" name="Consumo" stroke="#3b82f6" fill="url(#cons)" strokeWidth={4} />
             </AreaChart>
          </ResponsiveContainer>
       </div>
    </div>
  );
};

export default EnergyView;
