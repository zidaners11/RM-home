
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, YAxis, CartesianGrid, Legend, LabelList } from 'recharts';
import { fetchHAStates, fetchHAHistory } from '../homeAssistantService';
import { HomeAssistantConfig } from '../types';

const formatNexusNum = (val: any) => {
  const n = parseFloat(val);
  return isNaN(n) ? '0' : Math.round(n).toString();
};

const EXTRA_COLORS = ['#a855f7', '#06b6d4', '#10b981', '#f43f5e', '#f59e0b', '#3b82f6'];

const EnergyView: React.FC = () => {
  const [haConfig, setHaConfig] = useState<HomeAssistantConfig | null>(null);
  const [states, setStates] = useState<any[]>([]);
  const [mainHistory, setMainHistory] = useState<any[]>([]);
  const [extraHistory, setExtraHistory] = useState<{[key: string]: any[]}>({});
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<number | null>(null);

  // Carga de estados instantáneos (Rápida)
  const fetchInstantStates = useCallback(async (config: HomeAssistantConfig) => {
    const data = await fetchHAStates(config.url, config.token);
    if (data) setStates(data);
  }, []);

  // Carga de historiales (Pesada)
  const fetchHistories = useCallback(async (config: HomeAssistantConfig) => {
    const historyPromises = [
      fetchHAHistory(config.url, config.token, config.solar_production_entity || '', 24),
      fetchHAHistory(config.url, config.token, config.grid_consumption_entity || '', 24)
    ];

    const extraIds = config.energy_extra_entities || [];
    extraIds.forEach(id => {
      historyPromises.push(fetchHAHistory(config.url, config.token, id, 24));
    });

    const results = await Promise.all(historyPromises);
    
    // Procesar Historial Principal
    const solarHist = results[0];
    const gridHist = results[1];
    const dayData = Array.from({ length: 24 }, (_, i) => ({ 
      time: i.toString().padStart(2, '0') + ':00', 
      solar: 0, 
      grid: 0 
    }));

    solarHist?.forEach((e: any) => { 
      const d = new Date(e.last_changed); 
      dayData[d.getHours()].solar = Math.round(parseFloat(e.state) || 0); 
    });
    gridHist?.forEach((e: any) => { 
      const d = new Date(e.last_changed); 
      dayData[d.getHours()].grid = Math.round(parseFloat(e.state) || 0); 
    });
    setMainHistory(dayData);

    // Procesar Historiales Extra
    const extraResults = results.slice(2);
    const newExtraHistory: {[key: string]: any[]} = {};
    extraResults.forEach((h, idx) => {
      const id = extraIds[idx];
      newExtraHistory[id] = (h || [])
        .map((e: any) => ({ v: parseFloat(e.state) }))
        .filter((x: any) => !isNaN(x.v));
    });
    setExtraHistory(newExtraHistory);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('nexus_ha_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setHaConfig(parsed);
      
      // Primera carga completa
      Promise.all([
        fetchInstantStates(parsed),
        fetchHistories(parsed)
      ]).finally(() => setLoading(false));

      // Intervalo para estados instantáneos (cada 5 segs)
      refreshTimerRef.current = window.setInterval(() => {
        fetchInstantStates(parsed);
      }, 5000);

      // Intervalo para historiales (cada 5 min para no saturar)
      const historyInterval = window.setInterval(() => {
        fetchHistories(parsed);
      }, 300000);

      return () => {
        if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
        clearInterval(historyInterval);
      };
    }
  }, [fetchInstantStates, fetchHistories]);

  const getVal = (id?: string) => states.find(st => st.entity_id === id)?.state || '0';
  const getUnit = (id?: string) => states.find(st => st.entity_id === id)?.attributes?.unit_of_measurement || '';
  const getFriendly = (id?: string) => states.find(st => st.entity_id === id)?.attributes?.friendly_name || id;

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
      <p className="text-yellow-400 font-black text-[10px] uppercase tracking-[0.4em] animate-pulse">Sincronizando Matriz Energética...</p>
    </div>
  );

  return (
    <div className="space-y-4 pb-32 h-full overflow-y-auto no-scrollbar px-1">
       {/* KPIs Superiores */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'SOLAR_INPUT', val: getVal(haConfig?.solar_production_entity), color: 'text-yellow-400', border: 'border-yellow-500/20' },
            { label: 'GRID_USAGE', val: getVal(haConfig?.grid_consumption_entity), color: 'text-blue-400', border: 'border-blue-500/20' },
            { label: 'EXPORT_RED', val: getVal(haConfig?.grid_export_entity), color: 'text-orange-400', border: 'border-orange-500/20' },
            { label: 'HOME_TOTAL', val: getVal(haConfig?.house_consumption_entity), color: 'text-purple-400', border: 'border-purple-500/20' }
          ].map((kpi, idx) => (
            <div key={idx} className={`glass p-4 rounded-[25px] border ${kpi.border} bg-black/40 h-[100px] md:h-[160px] flex flex-col justify-between transition-all duration-500`}>
               <div className="flex justify-between items-start">
                  <p className={`text-[7px] md:text-[9px] uppercase font-black italic opacity-60 ${kpi.color}`}>{kpi.label}</p>
                  <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
               </div>
               <h4 className={`text-xl md:text-4xl font-black italic truncate ${kpi.color}`}>{formatNexusNum(kpi.val)} <span className="text-[7px] md:text-xs not-italic opacity-30">W</span></h4>
            </div>
          ))}
       </div>

       {/* Gráfico Principal */}
       <div className="glass p-5 md:p-8 rounded-[30px] border border-white/10 h-[350px] md:h-[500px] bg-black/60 relative overflow-hidden">
          <h4 className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20 mb-4">Telemetría_Analítica_24H</h4>
          <ResponsiveContainer width="100%" height="90%">
             <AreaChart data={mainHistory} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={10} interval={3} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} />
                <Tooltip contentStyle={{backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px'}} />
                <Legend verticalAlign="top" height={36} wrapperStyle={{fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold'}} />
                <Area name="Producción Solar" type="monotone" dataKey="solar" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.15} strokeWidth={3} isAnimationActive={false}>
                   <LabelList dataKey="solar" position="top" offset={10} fill="#fbbf24" fontSize={9} formatter={(v:any) => v > 500 ? `${v}W` : ''} />
                </Area>
                <Area name="Consumo Red" type="monotone" dataKey="grid" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={3} isAnimationActive={false}>
                   <LabelList dataKey="grid" position="top" offset={10} fill="#3b82f6" fontSize={9} formatter={(v:any) => v > 500 ? `${v}W` : ''} />
                </Area>
             </AreaChart>
          </ResponsiveContainer>
       </div>

       {/* Sensores Extra */}
       <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(haConfig?.energy_extra_entities || []).map((id, idx) => {
            const chartData = extraHistory[id] || [];
            const color = EXTRA_COLORS[idx % EXTRA_COLORS.length];
            return (
              <div key={idx} className="glass p-4 rounded-[25px] border border-white/5 bg-black/40 h-[100px] md:h-[160px] relative overflow-hidden flex flex-col justify-between transition-all hover:border-white/20 group">
                 <div className="absolute inset-0 opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={chartData}>
                          <Area type="monotone" dataKey="v" stroke={color} fill={color} isAnimationActive={false} />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
                 <p className="text-[7px] md:text-[9px] font-black uppercase z-10 opacity-40 group-hover:opacity-100" style={{ color }}>{getFriendly(id)}</p>
                 <h4 className="text-lg md:text-2xl font-black text-white italic z-10 leading-none">
                    {getVal(id)} <span className="text-[8px] opacity-20">{getUnit(id)}</span>
                 </h4>
              </div>
            );
          })}
       </div>
    </div>
  );
};

export default EnergyView;
