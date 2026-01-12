
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, YAxis, CartesianGrid, LabelList } from 'recharts';
import { fetchHAStates, fetchHAHistory } from '../homeAssistantService';
import { HomeAssistantConfig } from '../types';

const formatNexusNum = (val: any) => {
  const n = parseFloat(val);
  return isNaN(n) ? '0' : Math.round(n).toString();
};

const EXTRA_COLORS = ['#06b6d4', '#a855f7', '#10b981', '#f43f5e', '#f59e0b', '#3b82f6'];

const EnergyView: React.FC = () => {
  const [haConfig, setHaConfig] = useState<HomeAssistantConfig | null>(null);
  const [states, setStates] = useState<any[]>([]);
  const [mainHistory, setMainHistory] = useState<any[]>([]);
  const [allHistories, setAllHistories] = useState<{[key: string]: any[]}>({});
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showGraphOnMobile, setShowGraphOnMobile] = useState(false);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchInstantStates = useCallback(async (config: HomeAssistantConfig) => {
    const data = await fetchHAStates(config.url, config.token);
    if (data) setStates(data);
  }, []);

  const fetchHistories = useCallback(async (config: HomeAssistantConfig) => {
    const mainEntities = [
      config.solar_production_entity,
      config.grid_consumption_entity,
      config.grid_export_entity,
      config.house_consumption_entity
    ].filter(Boolean) as string[];

    const extraEntities = config.energy_extra_entities || [];
    const allEntitiesToFetch = Array.from(new Set([...mainEntities, ...extraEntities]));

    const historyPromises = allEntitiesToFetch.map(id => 
      fetchHAHistory(config.url, config.token, id, 24)
    );

    const results = await Promise.all(historyPromises);
    const newHistories: {[key: string]: any[]} = {};
    
    results.forEach((h, idx) => {
      const id = allEntitiesToFetch[idx];
      newHistories[id] = (h || [])
        .map((e: any) => ({ v: parseFloat(e.state) }))
        .filter((x: any) => !isNaN(x.v));
    });

    setAllHistories(newHistories);

    const now = new Date();
    const currentHour = now.getHours();
    const dayData = Array.from({ length: currentHour + 1 }, (_, i) => ({ 
      time: i.toString().padStart(2, '0') + ':00', 
      solar: 0, 
      grid: 0 
    }));

    const solarHistRaw = results[allEntitiesToFetch.indexOf(config.solar_production_entity || '')];
    const gridHistRaw = results[allEntitiesToFetch.indexOf(config.grid_consumption_entity || '')];

    solarHistRaw?.forEach((e: any) => {
      const d = new Date(e.last_changed);
      const h = d.getHours();
      if (h <= currentHour && d.toDateString() === now.toDateString()) {
        dayData[h].solar = Math.round(parseFloat(e.state) || 0);
      }
    });

    gridHistRaw?.forEach((e: any) => {
      const d = new Date(e.last_changed);
      const h = d.getHours();
      if (h <= currentHour && d.toDateString() === now.toDateString()) {
        dayData[h].grid = Math.round(parseFloat(e.state) || 0);
      }
    });

    setMainHistory(dayData);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('nexus_ha_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setHaConfig(parsed);
      
      Promise.all([
        fetchInstantStates(parsed),
        fetchHistories(parsed)
      ]).finally(() => setLoading(false));

      refreshTimerRef.current = window.setInterval(() => {
        fetchInstantStates(parsed);
      }, 10000);

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

  const extraEntities = haConfig?.energy_extra_entities || [];
  const rightExtras = extraEntities.slice(0, 4);
  const bottomExtras = extraEntities.slice(4);

  const mainKPIs = [
    { id: haConfig?.solar_production_entity, label: 'PRODUCCIÓN_SOLAR', color: 'text-yellow-400', accent: '#fbbf24' },
    { id: haConfig?.grid_consumption_entity, label: 'CONSUMO_RED', color: 'text-blue-400', accent: '#3b82f6' },
    { id: haConfig?.grid_export_entity, label: 'EXPORTACIÓN_ACTIVA', color: 'text-orange-400', accent: '#f97316' },
    { id: haConfig?.house_consumption_entity, label: 'CONSUMO_TOTAL', color: 'text-purple-400', accent: '#a855f7' }
  ];

  return (
    <div className="space-y-6 pb-32 h-full overflow-y-auto no-scrollbar px-1">
       
       {/* 1. KPIs PRINCIPALES CON GRÁFICOS SIEMPRE VISIBLES */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mainKPIs.map((kpi, idx) => {
            const chartData = allHistories[kpi.id || ''] || [];
            return (
              <div key={idx} className="glass p-4 rounded-[30px] border border-white/15 bg-black/50 h-[115px] flex flex-col justify-between relative overflow-hidden group shadow-2xl transition-all hover:border-white/30">
                 <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity pointer-events-none">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={chartData} margin={{ top: 60, right: 0, left: 0, bottom: 0 }}>
                          <Area type="monotone" dataKey="v" stroke={kpi.accent} fill={kpi.accent} strokeWidth={3} fillOpacity={0.3} isAnimationActive={false} />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-full h-10 blur-2xl opacity-20 pointer-events-none" style={{ background: `radial-gradient(circle, ${kpi.accent} 0%, transparent 70%)` }} />
                 <p className={`text-[9px] uppercase font-black tracking-widest ${kpi.color} z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]`}>{kpi.label}</p>
                 <h4 className={`text-3xl md:text-4xl font-black italic truncate z-10 ${kpi.color} font-orbitron drop-shadow-[0_2px_10px_rgba(0,0,0,1)]`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    {formatNexusNum(getVal(kpi.id))} <span className="text-[10px] not-italic opacity-40 uppercase font-bold">W</span>
                 </h4>
              </div>
            );
          })}
       </div>

       {/* 2. BOTÓN DE DESPLIEGUE (SÓLO MÓVIL) */}
       {isMobile && (
         <button 
           onClick={() => setShowGraphOnMobile(!showGraphOnMobile)}
           className="w-full py-4 glass rounded-[25px] border border-blue-500/30 text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg bg-black/40"
         >
           <svg className={`w-4 h-4 transition-transform ${showGraphOnMobile ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
           </svg>
           {showGraphOnMobile ? 'Ocultar Analítica' : 'Desplegar Analítica Histórica'}
         </button>
       )}

       {/* 3. ÁREA CENTRAL: GRÁFICO (IZQ) + 4 EXTRAS (DER) */}
       {/* En móvil, solo se muestra si showGraphOnMobile es true. En escritorio siempre visible */}
       <div className={`${(isMobile && !showGraphOnMobile) ? 'hidden' : 'flex'} flex-col lg:flex-row gap-4 h-auto lg:h-[480px]`}>
          
          <div className="glass p-6 md:p-8 rounded-[40px] border border-white/10 bg-black/70 flex-1 relative overflow-hidden shadow-2xl min-h-[350px]">
             <div className="flex justify-between items-center mb-6">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 italic">Matriz_Analítica_Hoy</h4>
                <div className="flex gap-4 text-[8px] font-black uppercase text-white/30">
                   <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-400" /> SOLAR</div>
                   <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /> RED</div>
                </div>
             </div>
             {/* Key={showGraphOnMobile} fuerza a Recharts a recalcular el tamaño cuando se despliega el contenedor */}
             <ResponsiveContainer width="100%" height="85%" key={showGraphOnMobile ? 'visible' : 'hidden'}>
                <AreaChart data={mainHistory} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                   <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                   <YAxis hide={true} />
                   <Tooltip contentStyle={{backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', borderRadius: '15px'}} />
                   <Area name="Solar" type="monotone" dataKey="solar" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.15} strokeWidth={5}>
                      <LabelList dataKey="solar" position="top" fill="#fbbf24" fontSize={10} fontWeight="900" offset={15} formatter={(v: any) => v > 50 ? v : ''} />
                   </Area>
                   <Area name="Red" type="monotone" dataKey="grid" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={5}>
                      <LabelList dataKey="grid" position="top" fill="#3b82f6" fontSize={10} fontWeight="900" offset={15} formatter={(v: any) => v > 50 ? v : ''} />
                   </Area>
                </AreaChart>
             </ResponsiveContainer>
          </div>

          <div className="w-full lg:w-[320px] grid grid-cols-2 lg:grid-cols-1 gap-3">
             {rightExtras.map((id, idx) => {
               const chartData = allHistories[id] || [];
               const color = EXTRA_COLORS[idx % EXTRA_COLORS.length];
               return (
                 <div key={idx} className="glass p-4 rounded-[24px] border border-white/10 bg-black/50 h-[100px] lg:h-[110px] relative overflow-hidden flex flex-col justify-between group shadow-lg">
                    <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity">
                       <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 50, bottom: 0 }}>
                             <Area type="monotone" dataKey="v" stroke={color} fill={color} fillOpacity={0.25} strokeWidth={3} isAnimationActive={false} />
                          </AreaChart>
                       </ResponsiveContainer>
                    </div>
                    <div className="relative z-10 drop-shadow-lg">
                       <p className="text-[8px] font-black uppercase tracking-widest opacity-60 truncate" style={{ color }}>{getFriendly(id)}</p>
                       <h4 className="text-2xl font-black text-white italic font-orbitron mt-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                          {getVal(id)} <span className="text-[8px] opacity-30 not-italic ml-1">{getUnit(id)}</span>
                       </h4>
                    </div>
                 </div>
               );
             })}
          </div>
       </div>

       {/* 4. EXTRAS RESTANTES (ABAJO) */}
       <div className={`space-y-4 pt-4`}>
          <h5 className="text-[9px] font-black text-white/30 uppercase tracking-[0.5em] px-2">Telemetría_Adicional</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
             {/* Los extras que van a la derecha se duplican aquí en móvil si el gráfico central está oculto para que no se pierda información */}
             {isMobile && !showGraphOnMobile && rightExtras.map((id, idx) => {
                const color = EXTRA_COLORS[idx % EXTRA_COLORS.length];
                const chartData = allHistories[id] || [];
                return (
                  <div key={`mob-${idx}`} className="glass p-4 rounded-[24px] border border-white/10 bg-black/40 h-[105px] relative overflow-hidden flex flex-col justify-center group">
                    <div className="absolute inset-0 opacity-40 pointer-events-none">
                       <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 50 }}>
                             <Area type="monotone" dataKey="v" stroke={color} fill={color} fillOpacity={0.25} strokeWidth={3} isAnimationActive={false} />
                          </AreaChart>
                       </ResponsiveContainer>
                    </div>
                    <p className="text-[8px] font-bold opacity-60 uppercase truncate relative z-10" style={{ color }}>{getFriendly(id)}</p>
                    <p className="text-xl font-black text-white italic font-orbitron relative z-10" style={{ fontFamily: 'Orbitron, sans-serif' }}>{getVal(id)} <span className="text-[8px] opacity-30 font-bold">{getUnit(id)}</span></p>
                  </div>
                );
             })}

             {bottomExtras.map((id, idx) => {
               const color = EXTRA_COLORS[(idx + 4) % EXTRA_COLORS.length];
               const chartData = allHistories[id] || [];
               return (
                 <div key={idx} className="glass p-5 rounded-[30px] border border-white/10 bg-black/40 h-[115px] relative overflow-hidden flex flex-col justify-center gap-1 hover:border-white/30 transition-all group">
                    <div className="absolute inset-0 opacity-40 pointer-events-none">
                       <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 50 }}>
                             <Area type="monotone" dataKey="v" stroke={color} fill={color} fillOpacity={0.25} strokeWidth={3} isAnimationActive={false} />
                          </AreaChart>
                       </ResponsiveContainer>
                    </div>
                    <p className="text-[8px] font-bold opacity-60 uppercase truncate relative z-10" style={{ color }}>{getFriendly(id)}</p>
                    <p className="text-xl font-black text-white italic font-orbitron relative z-10" style={{ fontFamily: 'Orbitron, sans-serif' }}>{getVal(id)} <span className="text-[8px] opacity-30 font-bold">{getUnit(id)}</span></p>
                 </div>
               );
             })}
          </div>
       </div>
    </div>
  );
};

export default EnergyView;
