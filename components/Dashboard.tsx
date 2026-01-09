
import React, { useState, useEffect } from 'react';
import { WidgetConfig, HomeAssistantConfig } from '../types';
import { fetchHAStates, callHAService, fetchHAHistory } from '../homeAssistantService';
import { getGlobalNexusStatus } from '../geminiService';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const formatKm = (val: any) => {
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return new Intl.NumberFormat('es-ES').format(Math.floor(n));
};

const Dashboard: React.FC = () => {
  const [haStates, setHaStates] = useState<any[]>([]);
  const [haConfig, setHaConfig] = useState<HomeAssistantConfig | null>(null);
  const [aiReport, setAiReport] = useState<{ text: string, sources: any[] }>({ text: 'Estableciendo enlace neuronal...', sources: [] });
  const [historyData, setHistoryData] = useState<{[key: string]: any[]}>({});
  const [loadingAI, setLoadingAI] = useState(true);

  const loadConfig = () => {
    const savedHA = localStorage.getItem('nexus_ha_config');
    if (savedHA) {
      try {
        const config: HomeAssistantConfig = JSON.parse(savedHA);
        setHaConfig(config);
        refreshData(config);
      } catch(e) { console.error(e); }
    }
  };

  useEffect(() => {
    loadConfig();
    window.addEventListener('rm_config_updated', loadConfig);
    const interval = setInterval(() => {
      if (haConfig) refreshData(haConfig);
    }, 20000);

    return () => {
      window.removeEventListener('rm_config_updated', loadConfig);
      clearInterval(interval);
    };
  }, []);

  const refreshData = async (config: HomeAssistantConfig) => {
    const states = await fetchHAStates(config.url, config.token);
    if (states) {
      setHaStates(states);
      
      const activeWidgets = config.dashboardWidgets || [];
      activeWidgets.forEach(async (w) => {
        if (w.type !== 'button') {
          const hours = w.historyHours || 24;
          const h = await fetchHAHistory(config.url, config.token, w.entity_id, hours);
          
          let processedHistory = (h || []).map((entry: any) => ({
            v: parseFloat(entry.state),
            time: new Date(entry.last_changed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          })).filter((e: any) => !isNaN(e.v));

          const targetPoints = w.historyPoints || 30;
          if (processedHistory.length > targetPoints) {
            const step = Math.ceil(processedHistory.length / targetPoints);
            processedHistory = processedHistory.filter((_:any, i:number) => i % step === 0);
          }

          setHistoryData(prev => ({ ...prev, [w.entity_id]: processedHistory }));
        }
      });

      if (loadingAI) {
        const report = await getGlobalNexusStatus({
          solar: states.find((s: any) => s.entity_id === config.solar_production_entity)?.state || 0,
          user: localStorage.getItem('nexus_user')
        });
        setAiReport(report);
        setLoadingAI(false);
      }
    }
  };

  const renderWidget = (widget: WidgetConfig) => {
    const state = haStates.find(s => s.entity_id === widget.entity_id);
    const val = state?.state || '---';
    const friendlyName = widget.title || state?.attributes?.friendly_name || widget.entity_id;
    const unit = state?.attributes?.unit_of_measurement || '';
    const isNumeric = !isNaN(parseFloat(val));

    if (widget.type === 'button') {
      return (
        <button 
          key={widget.id} 
          onClick={() => haConfig && callHAService(haConfig.url, haConfig.token, 'script', widget.entity_id.replace('script.', ''), {})}
          className="glass p-8 rounded-[45px] border border-green-500/20 flex flex-col justify-between h-[200px] shadow-lg group hover:bg-green-500/10 transition-all text-left bg-black/20"
        >
           <div className="flex justify-between items-start">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-green-400/40">{friendlyName}</p>
              <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20 group-hover:scale-110 transition-transform">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" strokeWidth="2"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>
              </div>
           </div>
           <p className="text-xs font-black uppercase text-white tracking-widest italic">RM Ejecutar Script_</p>
        </button>
      );
    }

    const chartPoints = historyData[widget.entity_id] || [];
    const values = chartPoints.map(p => p.v);
    const hasValues = values.length > 0;
    const maxVal = hasValues ? Math.max(...values) : 0;
    const minVal = hasValues ? Math.min(...values) : 0;
    const chartColor = widget.type === 'chart' ? '#a855f7' : '#3b82f6';

    return (
      <div key={widget.id} className={`glass p-8 rounded-[45px] border ${widget.type === 'chart' ? 'border-purple-500/20' : 'border-blue-500/20'} flex flex-col justify-between h-[200px] shadow-lg group relative overflow-hidden bg-black/30 transition-all hover:bg-black/40`}>
         {isNumeric && (
           <div className="absolute inset-0 z-0 opacity-40">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartPoints} margin={{ top: 50, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`grad_${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: `1px solid ${chartColor}44`, borderRadius: '15px', fontSize: '9px', color: 'white', backdropFilter: 'blur(15px)' }}
                      itemStyle={{ color: chartColor, fontWeight: '900', textTransform: 'uppercase' }}
                      labelStyle={{ color: 'rgba(255,255,255,0.4)', marginBottom: '4px', fontWeight: 'bold' }}
                      cursor={{ stroke: chartColor, strokeWidth: 1, strokeDasharray: '4 4' }}
                      formatter={(value: any) => [`${value} ${unit}`, friendlyName]}
                    />
                    <XAxis dataKey="time" hide={true} />
                    <YAxis hide={true} domain={['dataMin - 1', 'dataMax + 1']} />
                    <Area 
                      type="monotone" 
                      dataKey="v" 
                      stroke={chartColor} 
                      fill={`url(#grad_${widget.id})`} 
                      strokeWidth={3} 
                      isAnimationActive={true} 
                      animationDuration={1000}
                    />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
         )}

         <div className="relative z-10 flex flex-col h-full justify-between pointer-events-none">
            <div className="flex justify-between items-start">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 truncate group-hover:text-white transition-colors">{friendlyName}</p>
              {isNumeric && hasValues && (
                <div className="flex flex-col items-end gap-1">
                   <span className={`text-[7px] font-black ${widget.type === 'chart' ? 'bg-purple-600/20 text-purple-400' : 'bg-blue-600/20 text-blue-400'} px-2 py-1 rounded-full border border-white/5`}>{widget.historyHours || 24}H</span>
                   <span className="text-[8px] font-black text-white/30 bg-black/40 px-2 py-0.5 rounded-md">MAX: {maxVal.toFixed(1)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-end">
              <div>
                <h4 className="text-4xl font-black text-white italic tracking-tighter truncate">
                   {friendlyName.toLowerCase().includes('km') ? formatKm(val) : (friendlyName.toLowerCase().includes('batería') ? Math.round(parseFloat(val)) : val)}
                   <span className="text-xs ml-2 text-white/20 uppercase font-black not-italic">{unit}</span>
                </h4>
                {isNumeric && hasValues && (
                  <p className="text-[8px] font-black text-white/10 mt-1 uppercase tracking-widest">MIN: {minVal.toFixed(1)} {unit}</p>
                )}
              </div>
              {isNumeric && chartPoints.length > 0 && (
                 <div className="flex gap-3 text-[7px] font-black text-white/20 uppercase tracking-[0.2em] pb-1">
                    <span>{chartPoints[0].time}</span>
                    <span className="animate-pulse opacity-50"></span>
                    <span>AHORA</span>
                 </div>
              )}
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-10 h-full pb-32">
      <div className="glass rounded-[65px] p-12 border border-blue-500/10 relative overflow-hidden shadow-2xl shrink-0 bg-black/40">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[150px]" />
         <div className="flex flex-col md:flex-row gap-12 relative z-10 items-center">
            <div className="w-28 h-28 bg-blue-600 rounded-[45px] flex items-center justify-center shrink-0 shadow-[0_0_60px_rgba(59,130,246,0.3)] border border-blue-400/20">
               <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div className="flex-1 text-center md:text-left space-y-4">
               <h2 className="text-[12px] font-black uppercase tracking-[0.7em] text-blue-400">RM STRATEGIC CORE</h2>
               <div className={`text-xl leading-relaxed text-white/90 font-medium ${loadingAI ? 'animate-pulse' : ''}`}>
                  {aiReport.text}
               </div>
               {aiReport.sources && aiReport.sources.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                    {aiReport.sources.map((source: any, idx: number) => (
                        <a key={idx} href={source.web?.uri} target="_blank" rel="noopener noreferrer" className="text-[8px] bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full text-blue-400 transition-all uppercase font-black tracking-[0.3em]">{source.web?.title || 'RM Referencia'}</a>
                    ))}
                  </div>
               )}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 px-2">
         {haConfig?.dashboardWidgets?.map(renderWidget)}
         {(!haConfig?.dashboardWidgets || haConfig.dashboardWidgets.length === 0) && (
            <div className="col-span-full py-20 glass rounded-[50px] border border-dashed border-white/10 flex flex-col items-center justify-center opacity-40">
               <p className="text-xs font-black uppercase tracking-widest italic">RM OS: Añade widgets desde Ajustes</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default Dashboard;
