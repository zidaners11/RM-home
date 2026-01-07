
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, YAxis, CartesianGrid } from 'recharts';
import { fetchHAStates, fetchHAHistory } from '../homeAssistantService';
import { HomeAssistantConfig } from '../types';

const formatNexusNum = (val: any) => {
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
};

const EnergyView: React.FC = () => {
  const [haConfig, setHaConfig] = useState<HomeAssistantConfig | null>(null);
  const [states, setStates] = useState<any[]>([]);
  const [mainHistory, setMainHistory] = useState<any[]>([]);
  const [extraHistories, setExtraHistories] = useState<{[key: string]: any[]}>({});
  const [loading, setLoading] = useState(true);

  const loadConfig = () => {
    const saved = localStorage.getItem('nexus_ha_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setHaConfig(config);
        refreshData(config);
      } catch (e) { 
        console.error("Error cargando config:", e);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    window.addEventListener('nexus_config_updated', loadConfig);
    const interval = setInterval(() => {
      const saved = localStorage.getItem('nexus_ha_config');
      if (saved) refreshData(JSON.parse(saved));
    }, 30000);
    return () => {
      window.removeEventListener('nexus_config_updated', loadConfig);
      clearInterval(interval);
    };
  }, []);

  const refreshData = async (config: HomeAssistantConfig) => {
    try {
      const data = await fetchHAStates(config.url, config.token);
      if (data) setStates(data);

      if (config.solar_production_entity && config.grid_consumption_entity) {
        const solarHist = await fetchHAHistory(config.url, config.token, config.solar_production_entity, 24);
        const gridHist = await fetchHAHistory(config.url, config.token, config.grid_consumption_entity, 24);
        
        const dayData = Array.from({ length: 24 }, (_, i) => ({
          time: i.toString().padStart(2, '0') + ':00',
          solar: 0,
          grid: 0,
          hour: i
        }));

        solarHist?.forEach((entry: any) => {
          const date = new Date(entry.last_changed);
          if (!isNaN(date.getTime())) dayData[date.getHours()].solar = Math.max(0, parseFloat(entry.state) || 0);
        });

        gridHist?.forEach((entry: any) => {
          const date = new Date(entry.last_changed);
          if (!isNaN(date.getTime())) dayData[date.getHours()].grid = Math.max(0, parseFloat(entry.state) || 0);
        });

        setMainHistory(dayData);
      }

      if (config.energy_extra_entities && config.energy_extra_entities.length > 0) {
        const newExtraHistories: {[key: string]: any[]} = {};
        for (const id of config.energy_extra_entities) {
          const hist = await fetchHAHistory(config.url, config.token, id, 24);
          const processed = (hist || []).map((entry: any) => ({
            time: new Date(entry.last_changed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            val: parseFloat(entry.state) || 0
          })).slice(-30);
          newExtraHistories[id] = processed;
        }
        setExtraHistories(newExtraHistories);
      }

    } catch (e) { 
      console.error("Error en refreshData:", e);
    } finally {
      setLoading(false);
    }
  };

  const getVal = (id?: string) => {
    const s = states.find(st => st.entity_id === id);
    return s ? s.state : '0';
  };

  const solarNow = parseFloat(getVal(haConfig?.solar_production_entity));
  const gridCons = parseFloat(getVal(haConfig?.grid_consumption_entity));
  const houseManualNow = haConfig?.house_consumption_entity ? parseFloat(getVal(haConfig.house_consumption_entity)) : null;
  const houseNow = (houseManualNow !== null && !isNaN(houseManualNow)) ? houseManualNow : (solarNow + gridCons);

  const extraColors = ['#06b6d4', '#d946ef', '#84cc16', '#f59e0b', '#ef4444', '#3b82f6'];

  if (loading && mainHistory.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-blue-400 font-black text-[9px] uppercase tracking-[0.4em] animate-pulse">Sincronizando Matriz Energética...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-32 animate-in fade-in duration-700 overflow-y-auto no-scrollbar h-full px-2">
       
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass p-8 rounded-[45px] border border-yellow-500/20 bg-yellow-500/[0.02] flex flex-col justify-between h-[180px] shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full blur-[50px] -mr-10 -mt-10" />
             <p className="text-[10px] text-yellow-500/40 uppercase font-black tracking-[0.4em] italic">Generación Placas</p>
             <div>
                <h4 className="text-6xl font-black text-yellow-400 italic tracking-tighter">{formatNexusNum(solarNow)}<span className="text-sm ml-2 text-yellow-500/20 not-italic uppercase">W</span></h4>
                <p className="text-[9px] text-yellow-500/20 font-black uppercase mt-2 tracking-widest">Producción Fotovoltaica</p>
             </div>
          </div>
          <div className="glass p-8 rounded-[45px] border border-blue-500/20 bg-blue-500/[0.02] flex flex-col justify-between h-[180px] shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/5 rounded-full blur-[50px] -mr-10 -mt-10" />
             <p className="text-[10px] text-blue-500/40 uppercase font-black tracking-[0.4em] italic">Extracción de Red</p>
             <div>
                <h4 className="text-6xl font-black text-blue-400 italic tracking-tighter">{formatNexusNum(gridCons)}<span className="text-sm ml-2 text-blue-500/20 not-italic uppercase">W</span></h4>
                <p className="text-[9px] text-blue-500/20 font-black uppercase mt-2 tracking-widest">Consumo Externo</p>
             </div>
          </div>
          <div className="glass p-8 rounded-[45px] border border-purple-500/20 bg-purple-500/[0.02] flex flex-col justify-between h-[180px] shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400/5 rounded-full blur-[50px] -mr-10 -mt-10" />
             <p className="text-[10px] text-purple-500/40 uppercase font-black tracking-[0.4em] italic">Consumo Casa</p>
             <div>
                <h4 className="text-6xl font-black text-purple-400 italic tracking-tighter">{formatNexusNum(houseNow)}<span className="text-sm ml-2 text-purple-500/20 not-italic uppercase">W</span></h4>
                <p className="text-[9px] text-purple-500/20 font-black uppercase mt-2 tracking-widest">{haConfig?.house_consumption_entity ? 'Lectura Directa Sensor' : 'Carga Calculada Vivienda'}</p>
             </div>
          </div>
       </div>

       <div className="glass p-8 rounded-[50px] border border-white/10 h-[520px] relative shadow-2xl bg-black/40 overflow-hidden">
          <div className="flex justify-between items-center mb-10">
             <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 italic">Ciclo Diario 24H (Vatios)</h4>
             <div className="flex gap-8">
                <div className="flex items-center gap-3">
                   <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_15px_#facc15]" />
                   <span className="text-[10px] uppercase font-black text-white/40 tracking-widest">Placas</span>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_15px_#3b82f6]" />
                   <span className="text-[10px] uppercase font-black text-white/40 tracking-widest">Red</span>
                </div>
             </div>
          </div>
          <div className="h-[380px]">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mainHistory} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                   <defs>
                      <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorGrid" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
                   <XAxis 
                     dataKey="time" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 10}} 
                     interval={2} 
                   />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 10}} width={50} />
                   <Tooltip 
                      contentStyle={{backgroundColor: 'rgba(2, 6, 23, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '24px', fontSize: '11px', color: 'white', backdropFilter: 'blur(15px)'}}
                      itemStyle={{padding: '4px 0', textTransform: 'uppercase', fontWeight: 'bold'}}
                      cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                   />
                   <Area type="monotone" name="Producción Solar" dataKey="solar" stroke="#fbbf24" fillOpacity={1} fill="url(#colorSolar)" strokeWidth={4} dot={false} isAnimationActive={true} />
                   <Area type="monotone" name="Consumo Red" dataKey="grid" stroke="#3b82f6" fillOpacity={1} fill="url(#colorGrid)" strokeWidth={4} strokeDasharray="5 5" dot={false} isAnimationActive={true} />
                </AreaChart>
             </ResponsiveContainer>
          </div>
       </div>

       {(haConfig?.energy_extra_entities || []).length > 0 && (
          <div className="space-y-6">
             <div className="flex items-center gap-6 px-4">
                <div className="h-px flex-1 bg-white/10" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.6em] text-white/20 italic">Sensores Inteligentes (24h)</h4>
                <div className="h-px flex-1 bg-white/10" />
             </div>
             <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6 px-2">
                {(haConfig?.energy_extra_entities || []).map((id, i) => {
                   const s = states.find(st => st.entity_id === id);
                   const color = extraColors[i % extraColors.length];
                   const hist = extraHistories[id] || [];
                   const vals = hist.map(h => h.val);
                   const maxVal = vals.length ? Math.max(...vals) : 0;

                   return (
                      <div key={id} className="glass p-6 rounded-[40px] border border-white/5 hover:bg-white/[0.04] transition-all flex flex-col justify-between h-[180px] relative overflow-hidden group">
                         <div className="relative z-10 flex flex-col justify-between h-full pointer-events-none">
                            <div>
                               <p className="text-[9px] text-white/30 uppercase font-black tracking-widest truncate">{s?.attributes?.friendly_name || id.split('.')[1]}</p>
                               <h4 className="text-3xl font-black text-white italic tracking-tighter mt-1">{formatNexusNum(s?.state)}<span className="text-[10px] ml-1 text-white/20 uppercase not-italic">W</span></h4>
                            </div>
                            <p className="text-[8px] font-black text-white/10 uppercase tracking-widest">Pico 24h: {maxVal.toFixed(0)}W</p>
                         </div>
                         <div className="absolute inset-0 z-0 opacity-40 group-hover:opacity-70 transition-opacity">
                            <ResponsiveContainer width="100%" height="100%">
                               <AreaChart data={hist} margin={{ top: 80, right: 0, left: 0, bottom: 0 }}>
                                  <Tooltip 
                                    contentStyle={{backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '10px', fontSize: '9px'}}
                                    labelStyle={{display: 'none'}}
                                    cursor={{stroke: color, strokeWidth: 1}}
                                  />
                                  <Area type="monotone" dataKey="val" stroke={color} fill={color} strokeWidth={2} fillOpacity={0.1} isAnimationActive={false} />
                               </AreaChart>
                            </ResponsiveContainer>
                         </div>
                      </div>
                   );
                })}
             </div>
          </div>
       )}
    </div>
  );
};

export default EnergyView;
