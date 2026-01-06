
import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, YAxis, CartesianGrid } from 'recharts';
import { fetchHAStates, fetchHAHistory } from '../homeAssistantService';
import { HomeAssistantConfig } from '../types';

const formatNexusNum = (val: any) => {
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
};

const EnergyView: React.FC = () => {
  const [haConfig, setHaConfig] = useState<HomeAssistantConfig | null>(null);
  const [states, setStates] = useState<any[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConfig = () => {
    const saved = localStorage.getItem('nexus_ha_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setHaConfig(config);
        refreshData(config);
      } catch (e) { console.error(e); }
    }
  };

  useEffect(() => {
    loadConfig();
    window.addEventListener('nexus_config_updated', loadConfig);
    const interval = setInterval(() => {
      if (haConfig) refreshData(haConfig);
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

        if (solarHist.length > 0 || gridHist.length > 0) {
          const combined = solarHist.map((s: any, idx: number) => {
            const time = new Date(s.last_changed).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const g = gridHist[idx] || { state: '0' };
            const solarVal = Math.max(0, parseFloat(s.state) || 0);
            const gridVal = parseFloat(g.state) || 0;
            return {
              time,
              solar: solarVal,
              grid: gridVal,
              house: solarVal + gridVal
            };
          }).filter((_: unknown, i: number) => i % 4 === 0);
          setHistoryData(combined);
        }
      }
    } catch (e) { 
      console.error("Energy Telemetry Sync Failed", e);
    } finally { 
      setLoading(false); 
    }
  };

  const getEntityData = (id?: string) => {
    if (!id || !states) return null;
    return states.find(st => st.entity_id === id);
  };

  const getVal = (id?: string) => {
    const s = getEntityData(id);
    return s ? s.state : '0';
  };

  const solarNow = parseFloat(getVal(haConfig?.solar_production_entity));
  const gridCons = parseFloat(getVal(haConfig?.grid_consumption_entity));

  const mainMetrics = useMemo(() => {
    if (!haConfig) return [];
    return [
      { label: 'Instantánea Solar', val: getVal(haConfig.solar_production_entity), unit: 'W', color: 'text-yellow-400', border: 'border-yellow-500/20' },
      { label: 'Consumo Real Casa', val: (solarNow + gridCons).toString(), unit: 'W', color: 'text-purple-400', border: 'border-purple-500/20' },
      { label: 'Importación Red', val: getVal(haConfig.grid_consumption_entity), unit: 'W', color: 'text-blue-400', border: 'border-blue-500/20' },
      { label: 'Exportación Red', val: getVal(haConfig.grid_export_entity), unit: 'W', color: 'text-green-400', border: 'border-green-500/20' },
      { label: 'Generación Diaria', val: getVal(haConfig.solar_daily_entity), unit: 'kWh', color: 'text-orange-400', border: 'border-orange-500/20' },
      { label: 'Generación Mensual', val: getVal(haConfig.solar_monthly_entity), unit: 'kWh', color: 'text-cyan-400', border: 'border-cyan-500/20' },
      { label: 'Coste Energía', val: getVal(haConfig.energy_cost_entity), unit: '€', color: 'text-white/40', border: 'border-white/10' },
    ];
  }, [haConfig, states, solarNow, gridCons]);

  const extraMetrics = useMemo(() => {
    if (!haConfig) return [];
    return (haConfig.energy_extra_entities || []).map(id => {
      const data = getEntityData(id);
      return {
        label: data?.attributes?.friendly_name || id.split('.')[1],
        val: data?.state || '---',
        unit: data?.attributes?.unit_of_measurement || '',
        color: 'text-white/30',
        border: 'border-white/5'
      };
    });
  }, [haConfig, states]);

  return (
    <div className="space-y-10 pb-32 animate-in fade-in duration-700 overflow-y-auto no-scrollbar h-full">
       {/* KPIs MAESTROS */}
       <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 shrink-0 px-2">
          {mainMetrics.map((m, i) => (
            <div key={i} className={`glass p-5 rounded-[30px] border ${m.border} hover:bg-white/[0.08] transition-all flex flex-col justify-center min-h-[120px] shadow-xl group`}>
               <p className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-1 group-hover:text-white transition-colors line-clamp-2">{m.label}</p>
               <p className={`text-xl font-black tracking-tighter ${m.color}`}>
                  {formatNexusNum(m.val)}
                  <span className="text-[9px] ml-1 text-white/10 font-black uppercase">{m.unit}</span>
               </p>
            </div>
          ))}
       </div>

       {/* GRÁFICO Y BALANCE */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 shrink-0">
          <div className="lg:col-span-2 glass p-8 rounded-[50px] border border-white/10 h-[500px] relative shadow-2xl bg-black/20">
             <div className="flex justify-between items-center mb-6">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Telemetría de Flujo Maestro (Watts)</h4>
                <div className="flex gap-4">
                   <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-yellow-400" />
                      <span className="text-[8px] uppercase font-black text-white/40 tracking-widest">Placas</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
                      <span className="text-[8px] uppercase font-black text-white/40 tracking-widest">Casa</span>
                   </div>
                </div>
             </div>
             <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                       <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 9}} minTickGap={40} />
                       <YAxis axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 9}} width={40} />
                       <Tooltip contentStyle={{backgroundColor: 'rgba(2, 6, 23, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', fontSize: '10px', color: 'white'}} />
                       <Area type="monotone" dataKey="solar" name="Placas" stroke="#fbbf24" fill="url(#solarGrad)" strokeWidth={3} dot={false} fillOpacity={0.1} />
                       <Area type="monotone" dataKey="grid" name="Red" stroke="#3b82f6" fill="rgba(59,130,246,0.05)" strokeWidth={2} dot={false} />
                       <Area type="monotone" dataKey="house" name="Casa" stroke="#a855f7" fill="url(#houseGrad)" strokeWidth={4} dot={false} fillOpacity={0.2} />
                       <defs>
                          <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fbbf24" stopOpacity={0.2}/><stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/></linearGradient>
                          <linearGradient id="houseGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/><stop offset="95%" stopColor="#a855f7" stopOpacity={0}/></linearGradient>
                       </defs>
                    </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="glass p-10 rounded-[50px] border border-white/10 flex flex-col justify-center gap-12 shadow-2xl text-center relative overflow-hidden bg-black/30">
             <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/5 rounded-full blur-[100px]" />
             <div className="relative z-10">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mb-4">Balance Estratégico</p>
                <p className={`text-7xl font-black tracking-tighter italic ${(solarNow - gridCons) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                   {formatNexusNum(solarNow - gridCons)}<span className="text-sm ml-2 not-italic">W</span>
                </p>
                <p className="text-[9px] uppercase font-black text-white/20 mt-4 tracking-widest">Sincronización de Red</p>
             </div>
             <div className="p-6 bg-white/5 border border-white/10 rounded-[35px] relative z-10">
                <p className="text-[10px] text-white/50 italic leading-relaxed font-medium">
                   "Visualización maestra. Las métricas de telemetría auxiliar se han desplazado al panel inferior para optimizar el flujo de datos principal."
                </p>
             </div>
          </div>
       </div>

       {/* KPIs EXTRAS (DEBAJO DEL GRÁFICO) */}
       {extraMetrics.length > 0 && (
         <div className="space-y-6 shrink-0">
            <div className="flex items-center gap-4 px-6">
               <div className="h-px flex-1 bg-white/10" />
               <h4 className="text-[10px] font-black uppercase tracking-[0.6em] text-white/20">Telemetría Auxiliar</h4>
               <div className="h-px flex-1 bg-white/10" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 px-2">
               {extraMetrics.map((m, i) => (
                  <div key={i} className={`glass p-4 rounded-[24px] border ${m.border} hover:bg-white/[0.05] transition-all flex flex-col justify-center min-h-[90px]`}>
                     <p className="text-[8px] text-white/20 uppercase font-bold tracking-widest mb-1 truncate">{m.label}</p>
                     <p className={`text-lg font-black tracking-tighter ${m.color}`}>
                        {formatNexusNum(m.val)}
                        <span className="text-[8px] ml-1 text-white/5 font-black uppercase">{m.unit}</span>
                     </p>
                  </div>
               ))}
            </div>
         </div>
       )}
    </div>
  );
};

export default EnergyView;
