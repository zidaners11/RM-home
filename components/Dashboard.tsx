
import React, { useState, useEffect } from 'react';
import { WidgetConfig, HomeAssistantConfig } from '../types';
import { fetchHAStates, callHAService, fetchHAHistory } from '../homeAssistantService';
import { getGlobalNexusStatus } from '../geminiService';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const Dashboard: React.FC = () => {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [haStates, setHaStates] = useState<any[]>([]);
  const [haConfig, setHaConfig] = useState<HomeAssistantConfig | null>(null);
  const [aiReport, setAiReport] = useState<{ text: string, sources: any[] }>({ text: 'Sincronizando matriz...', sources: [] });
  const [historyData, setHistoryData] = useState<{[key: string]: any[]}>({});
  const [loadingAI, setLoadingAI] = useState(true);

  const loadConfig = () => {
    const savedHA = localStorage.getItem('nexus_ha_config');
    if (savedHA) {
      try {
        const config: HomeAssistantConfig = JSON.parse(savedHA);
        setHaConfig(config);
        setWidgets(config.dashboardWidgets || []);
        refreshData(config);
      } catch(e) { console.error(e); }
    }
  };

  useEffect(() => {
    loadConfig();
    // Escuchar si la configuración cambia (por sincronización de nube)
    window.addEventListener('nexus_config_updated', loadConfig);
    const interval = setInterval(() => {
      if (haConfig) refreshData(haConfig);
    }, 15000);

    return () => {
      window.removeEventListener('nexus_config_updated', loadConfig);
      clearInterval(interval);
    };
  }, []);

  const refreshData = async (config: HomeAssistantConfig) => {
    const states = await fetchHAStates(config.url, config.token);
    if (states) {
      setHaStates(states);
      
      config.dashboardWidgets.forEach(async (w) => {
        if (w.type === 'chart') {
          const h = await fetchHAHistory(config.url, config.token, w.entity_id, 24);
          setHistoryData(prev => ({ ...prev, [w.entity_id]: h }));
        }
      });

      if (loadingAI) {
        const report = await getGlobalNexusStatus({
          alarm: states.find((s: any) => s.entity_id === config.alarm_entity)?.state || 'Segura',
          solar: states.find((s: any) => s.entity_id === config.solar_production_entity)?.state || 0
        });
        setAiReport(report);
        setLoadingAI(false);
      }
    }
  };

  const handleAction = async (entityId: string, domain: string, service: string) => {
    if (!haConfig) return;
    await callHAService(haConfig.url, haConfig.token, domain, service, { entity_id: entityId });
    setTimeout(() => refreshData(haConfig), 500);
  };

  const renderWidget = (widget: WidgetConfig) => {
    const state = haStates.find(s => s.entity_id === widget.entity_id);
    const val = state?.state || '---';
    const friendlyName = widget.title || state?.attributes?.friendly_name || widget.entity_id;

    if (widget.type === 'switch') {
      const isOn = val === 'on';
      const domain = widget.entity_id.split('.')[0];
      return (
        <div key={widget.id} className="glass p-8 rounded-[40px] border border-white/5 flex flex-col justify-between h-[200px] shadow-lg group">
           <div className="flex justify-between items-start">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 truncate max-w-[70%]">{friendlyName}</p>
              <button onClick={() => handleAction(widget.entity_id, domain, 'toggle')} className={`w-14 h-8 rounded-full p-1 transition-all ${isOn ? 'bg-blue-600' : 'bg-white/10'}`}>
                 <div className={`w-6 h-6 bg-white rounded-full transition-all ${isOn ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
           </div>
           <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isOn ? 'bg-blue-600/20 border-blue-400 text-blue-400' : 'bg-white/5 border-white/10 text-white/20'}`}>
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeWidth="2"/></svg>
              </div>
              <span className={`text-2xl font-black uppercase tracking-tighter ${isOn ? 'text-white' : 'text-white/20'}`}>{isOn ? 'ON' : 'OFF'}</span>
           </div>
        </div>
      );
    }

    if (widget.type === 'button') {
      const domain = widget.entity_id.split('.')[0];
      return (
        <button key={widget.id} onClick={() => handleAction(widget.entity_id, domain, 'turn_on')} className="glass p-8 rounded-[40px] border border-white/5 flex flex-col items-center justify-center gap-4 h-[200px] shadow-lg group active:scale-95 transition-all hover:bg-white/[0.05]">
           <div className="w-16 h-16 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(59,130,246,0.1)]">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2"/></svg>
           </div>
           <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/80">{friendlyName}</p>
        </button>
      );
    }

    if (widget.type === 'chart') {
      const chartPoints = historyData[widget.entity_id] || [];
      return (
        <div key={widget.id} className="glass p-8 rounded-[40px] border border-white/5 flex flex-col justify-between h-[200px] shadow-lg group relative overflow-hidden">
           <div className="absolute inset-0 z-0 opacity-40">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartPoints.map(p => ({ v: parseFloat(p.state) }))}>
                    <Area type="monotone" dataKey="v" stroke="#3b82f6" fill="#3b82f6" strokeWidth={3} fillOpacity={0.1} />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
           <div className="relative z-10 flex flex-col h-full justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 truncate">{friendlyName}</p>
              <div>
                 <h4 className="text-4xl font-black text-white italic tracking-tighter">{val}<span className="text-[10px] ml-1 text-white/20 uppercase font-black not-italic">{state?.attributes?.unit_of_measurement}</span></h4>
              </div>
           </div>
        </div>
      );
    }

    if (widget.type === 'climate') {
      const temp = state?.attributes?.current_temperature || val;
      return (
        <div key={widget.id} className="glass p-8 rounded-[40px] border border-white/5 flex flex-col justify-between h-[200px] shadow-lg group">
           <div className="flex justify-between items-start">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 truncate">{friendlyName}</p>
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3" strokeWidth="2"/></svg>
              </div>
           </div>
           <div className="flex items-center justify-between">
              <div className="text-5xl font-black text-white tracking-tighter">{temp}<span className="text-xl text-white/20 font-light ml-1">°C</span></div>
              <div className="flex flex-col gap-2">
                 <button onClick={() => handleAction(widget.entity_id, 'climate', 'turn_on')} className="w-8 h-8 glass rounded-lg flex items-center justify-center text-white/40 hover:text-white">+</button>
                 <button onClick={() => handleAction(widget.entity_id, 'climate', 'turn_off')} className="w-8 h-8 glass rounded-lg flex items-center justify-center text-white/40 hover:text-white">-</button>
              </div>
           </div>
        </div>
      );
    }

    return (
      <div key={widget.id} className="glass p-8 rounded-[40px] border border-white/5 flex flex-col justify-between h-[200px] shadow-lg group hover:bg-white/[0.02] transition-all">
         <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 truncate group-hover:text-blue-400 transition-colors">{friendlyName}</p>
         <div>
            <h4 className="text-4xl font-black text-white italic tracking-tighter">{val}<span className="text-xs ml-2 text-white/20 uppercase font-black not-italic">{state?.attributes?.unit_of_measurement}</span></h4>
         </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-10 h-full pb-24">
      <div className="glass rounded-[60px] p-12 border border-blue-500/20 relative overflow-hidden shadow-2xl shrink-0">
         <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[150px]" />
         <div className="flex flex-col md:flex-row gap-12 relative z-10 items-center">
            <div className="w-28 h-28 bg-blue-600 rounded-[40px] flex items-center justify-center shrink-0 shadow-[0_0_60px_rgba(59,130,246,0.5)] border border-blue-400/30">
               <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div className="flex-1 text-center md:text-left space-y-4">
               <h2 className="text-[14px] font-black uppercase tracking-[0.6em] text-blue-400">Nexus Strategic Core</h2>
               <div className={`text-xl leading-relaxed text-white/90 font-medium ${loadingAI ? 'animate-pulse' : ''}`}>
                  {aiReport.text}
               </div>
               {aiReport.sources && aiReport.sources.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                    {aiReport.sources.map((source: any, idx: number) => {
                      const web = source.web;
                      if (!web) return null;
                      return (
                        <a key={idx} href={web.uri} target="_blank" rel="noopener noreferrer" className="text-[8px] bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-full text-blue-400 transition-all uppercase font-black tracking-widest">
                          {web.title || 'Referencia'}
                        </a>
                      );
                    })}
                  </div>
               )}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
         {widgets.map(renderWidget)}
         {widgets.length === 0 && (
            <div className="col-span-full py-20 text-center glass rounded-[48px] border border-dashed border-white/10 opacity-40">
               <p className="text-[12px] font-black uppercase tracking-[0.5em]">No hay widgets en la nube para este perfil</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default Dashboard;
