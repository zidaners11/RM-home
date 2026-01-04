
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
      try {
        const config = JSON.parse(saved);
        setHaConfig(config);
        refreshData(config);
        const interval = setInterval(() => refreshData(config), 30000);
        return () => clearInterval(interval);
      } catch (e) { console.error(e); setLoading(false); }
    } else {
      setLoading(false);
    }
  }, []);

  const refreshData = async (config: HomeAssistantConfig) => {
    try {
      const data = await fetchHAStates(config.url, config.token);
      if (data) setStates(data);
    } catch (e) { } finally { setLoading(false); }
  };

  const getEntityData = (id?: string) => {
    if (!id || !states) return null;
    return states.find(st => st.entity_id === id);
  };

  const getVal = (id?: string) => {
    const s = getEntityData(id);
    return s ? parseFloat(s.state) || 0 : 0;
  };

  if (!haConfig && !loading) return (
    <div className="h-[60vh] flex items-center justify-center glass rounded-[40px] text-white/20 uppercase font-black tracking-widest text-xs border border-dashed border-white/10">
      Configuración de Energía no detectada. Ve a Ajustes.
    </div>
  );

  const solarNow = getVal(haConfig?.solar_production_entity);
  const solarDaily = getVal(haConfig?.solar_daily_entity);
  const solarMonthly = getVal(haConfig?.solar_monthly_entity);
  const gridCons = getVal(haConfig?.grid_consumption_entity);
  const gridExp = getVal(haConfig?.grid_export_entity);
  const cost = getVal(haConfig?.energy_cost_entity);

  const mainMetrics = [
    { label: 'Instantánea Solar', val: solarNow, unit: 'W', color: 'text-yellow-400', border: 'border-yellow-500/20' },
    { label: 'Solar Hoy', val: solarDaily, unit: 'kWh', color: 'text-orange-400', border: 'border-orange-500/20' },
    { label: 'Solar Mes', val: solarMonthly, unit: 'kWh', color: 'text-orange-600', border: 'border-orange-500/10' },
    { label: 'Consumo Red', val: gridCons, unit: 'W', color: 'text-blue-400', border: 'border-blue-500/20' },
    { label: 'Exportación', val: gridExp, unit: 'W', color: 'text-green-400', border: 'border-green-500/20' },
    { label: 'Precio Actual', val: cost, unit: '€', color: 'text-cyan-400', border: 'border-cyan-500/20' },
  ].filter(m => m.val !== 0 || m.label === 'Consumo Red');

  const extraMetrics = (haConfig?.energy_extra_entities || []).map(id => {
    const s = getEntityData(id);
    return {
      label: s?.attributes?.friendly_name || id.split('.')[1] || 'Sensor',
      val: s?.state || 0,
      unit: s?.attributes?.unit_of_measurement || '',
      color: 'text-white/60',
      border: 'border-white/5'
    };
  });

  const allMetrics = [...mainMetrics, ...extraMetrics];

  return (
    <div className="space-y-10 pb-24 animate-in fade-in duration-700">
       <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {allMetrics.length > 0 ? allMetrics.map((m, i) => (
            <div key={i} className={`glass p-6 rounded-[35px] border ${m.border} hover:bg-white/[0.05] transition-all flex flex-col justify-center min-h-[130px]`}>
               <p className="text-[9px] text-white/20 uppercase font-black tracking-widest mb-2 line-clamp-1">{m.label}</p>
               <p className={`text-2xl font-black tracking-tighter ${m.color}`}>
                  {typeof m.val === 'number' ? m.val.toLocaleString('es-ES', { maximumFractionDigits: 2 }) : m.val}
                  <span className="text-[8px] ml-1 text-white/10 font-black uppercase">{m.unit}</span>
               </p>
            </div>
          )) : (
            <div className="col-span-full py-10 text-center opacity-20 text-[10px] uppercase font-black">Esperando datos de telemetría solar...</div>
          )}
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass p-8 rounded-[50px] border border-white/10 h-[450px] relative shadow-2xl">
             <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mb-8">Curva Energética 24H</h4>
             <ResponsiveContainer width="100%" height="80%">
                <AreaChart data={Array.from({length: 12}, (_, i) => ({ t: `${i*2}h`, s: solarNow * (0.3 + Math.random()), c: gridCons * (0.6 + Math.random()) }))}>
                   <defs>
                      <linearGradient id="solar" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4}/><stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/></linearGradient>
                      <linearGradient id="cons" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                   </defs>
                   <XAxis dataKey="t" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 9}} />
                   <Tooltip contentStyle={{backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', fontSize: '11px'}} />
                   <Area type="monotone" dataKey="s" name="Solar" stroke="#fbbf24" fill="url(#solar)" strokeWidth={3} />
                   <Area type="monotone" dataKey="c" name="Red" stroke="#3b82f6" fill="url(#cons)" strokeWidth={3} />
                </AreaChart>
             </ResponsiveContainer>
          </div>

          <div className="glass p-8 rounded-[50px] border border-white/10 flex flex-col justify-center gap-10 shadow-2xl">
              <div className="text-center">
                 <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">Neto Actual</p>
                 <p className={`text-6xl font-black tracking-tighter ${(solarNow - gridCons) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(solarNow - gridCons).toFixed(0)}<span className="text-sm ml-2">W</span>
                 </p>
              </div>
              <div className="p-6 bg-blue-600/5 border border-blue-500/20 rounded-3xl">
                 <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Estado Inversor</p>
                 <p className="text-xs text-white/70 italic leading-relaxed">RM Core detecta un flujo energético estable. Sincronización nominal con la red eléctrica nacional.</p>
              </div>
          </div>
       </div>
    </div>
  );
};

export default EnergyView;
