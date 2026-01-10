
import React, { useState, useEffect } from 'react';
import { WidgetConfig, HomeAssistantConfig } from '../types';
import { fetchHAStates, callHAService, fetchHAHistory } from '../homeAssistantService';
import { getGlobalNexusStatus } from '../geminiService';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const formatKm = (val: any) => {
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return new Intl.NumberFormat('es-ES').format(Math.floor(n));
};

const Dashboard: React.FC = () => {
  const [haStates, setHaStates] = useState<any[]>([]);
  const [haConfig, setHaConfig] = useState<HomeAssistantConfig | null>(null);
  const [aiReport, setAiReport] = useState<{ text: string, sources: any[] }>({ text: 'Iniciando enlace neuronal...', sources: [] });
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
          const h = await fetchHAHistory(config.url, config.token, w.entity_id, 24);
          let processed = (h || []).map((entry: any) => ({ v: parseFloat(entry.state) })).filter((e: any) => !isNaN(e.v));
          setHistoryData(prev => ({ ...prev, [w.entity_id]: processed }));
        }
      });

      if (loadingAI) {
        const report = await getGlobalNexusStatus({ solar: states.find((s: any) => s.entity_id === config.solar_production_entity)?.state || 0 });
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
    const chartPoints = historyData[widget.entity_id] || [];
    const accentColor = widget.color || '#3b82f6';

    if (widget.type === 'button') {
      return (
        <button key={widget.id} onClick={() => haConfig && callHAService(haConfig.url, haConfig.token, 'script', widget.entity_id.replace('script.', ''), {})} className="glass p-4 rounded-[25px] md:rounded-[35px] border border-green-500/20 flex flex-col justify-between h-[110px] md:h-[180px] shadow-lg active:scale-95 transition-all text-left bg-black/40">
           <div className="flex justify-between items-start">
              <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-green-400/60 truncate w-3/4">{friendlyName}</p>
              <div className="w-6 h-6 bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20 rounded-lg">
                 <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" strokeWidth="2"/></svg>
              </div>
           </div>
           <p className="text-[7px] font-black uppercase text-white/40 tracking-widest italic">EJECUTAR_NÚCLEO</p>
        </button>
      );
    }

    return (
      <div key={widget.id} className="glass p-4 rounded-[25px] md:rounded-[35px] border border-white/5 flex flex-col justify-between h-[110px] md:h-[180px] shadow-lg relative overflow-hidden bg-black/40 group hover:border-white/20 transition-all">
         {isNumeric && (
           <div className="absolute inset-0 z-0 opacity-40 group-hover:opacity-60 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartPoints}>
                    <Area type="monotone" dataKey="v" stroke={accentColor} fill={accentColor} strokeWidth={2} isAnimationActive={false} />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
         )}
         <div className="relative z-10 flex flex-col h-full justify-between">
            <p className="text-[7px] md:text-[10px] font-black uppercase tracking-widest text-white/50 truncate group-hover:text-white transition-colors">{friendlyName}</p>
            <h4 className="text-xl md:text-3xl font-black text-white italic tracking-tighter truncate leading-none">
               {friendlyName.toLowerCase().includes('km') ? formatKm(val) : val}
               <span className="text-[7px] md:text-[12px] ml-1 text-white/20 uppercase font-black not-italic">{unit}</span>
            </h4>
         </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 md:gap-10 h-full pb-10">
      <div className="glass rounded-[30px] md:rounded-[65px] p-5 md:p-10 border border-blue-500/10 relative overflow-hidden bg-black/60 shrink-0">
         <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center">
            <div className="w-10 h-10 md:w-20 md:h-20 bg-blue-600 rounded-[15px] md:rounded-[40px] flex items-center justify-center shrink-0 shadow-xl">
               <svg className="w-5 h-5 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div className="text-center md:text-left">
               <h2 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 mb-1">RM AI STRATEGY CORE</h2>
               <div className={`text-[10px] md:text-lg leading-tight md:leading-relaxed text-white/90 font-medium ${loadingAI ? 'animate-pulse' : ''}`}>
                  {aiReport.text}
               </div>
            </div>
         </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8 px-1">
         {(haConfig?.dashboardWidgets || []).map(renderWidget)}
      </div>
    </div>
  );
};

export default Dashboard;
