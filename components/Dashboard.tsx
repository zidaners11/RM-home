
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
  const [aiReport, setAiReport] = useState<{ text: string, sources: any[] }>({ text: 'Estableciendo enlace con RM Strategic Core...', sources: [] });
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
        const report = await getGlobalNexusStatus({ 
          solar: states.find((s: any) => s.entity_id === config.solar_production_entity)?.state || 0,
          energy: states.find((s: any) => s.entity_id === config.grid_consumption_entity)?.state || 0
        });
        setAiReport(report);
        setLoadingAI(false);
      }
    }
  };

  const handleCommand = async (entityId: string) => {
    if (!haConfig) return;
    const parts = entityId.split('.');
    const domain = parts[0];
    const service = parts[1];
    
    if (domain === 'shell_command' || domain === 'script' || domain === 'automation' || domain === 'scene') {
      const targetService = domain === 'scene' ? 'turn_on' : service;
      const targetDomain = domain === 'scene' ? 'scene' : domain;
      const serviceData = domain === 'scene' ? { entity_id: entityId } : {};

      await callHAService(haConfig.url, haConfig.token, targetDomain, service, serviceData);
      window.dispatchEvent(new CustomEvent('nexus_notification', { 
        detail: `Protocolo ${service.toUpperCase()} ejecutado.` 
      }));
    }
  };

  const renderWidget = (widget: WidgetConfig) => {
    const state = haStates.find(s => s.entity_id === widget.entity_id);
    const val = state?.state || '---';
    const friendlyName = widget.title || state?.attributes?.friendly_name || widget.entity_id;
    const unit = state?.attributes?.unit_of_measurement || widget.unit || '';
    const isNumeric = !isNaN(parseFloat(val));
    const chartPoints = historyData[widget.entity_id] || [];
    const accentColor = widget.color || '#3b82f6';
    const customIcon = widget.icon || '⚡';
    
    let colSpanClass = 'col-span-1';
    if (widget.colSpan === 2) colSpanClass = 'col-span-2 md:col-span-2';
    if (widget.colSpan === 0.5) colSpanClass = 'col-span-1 md:col-span-1';
    if (widget.colSpan === 0.25) colSpanClass = 'col-span-1 md:col-span-1 scale-75 origin-center';

    // BOTÓN DE ACCIÓN (Comandos)
    if (widget.type === 'button') {
      const isShell = widget.entity_id.startsWith('shell_command.');
      return (
        <button 
          key={widget.id} 
          onClick={() => handleCommand(widget.entity_id)} 
          className={`glass p-6 rounded-[35px] border-2 flex flex-col justify-between h-[140px] md:h-[180px] shadow-2xl active:scale-90 transition-all text-left group overflow-hidden ${colSpanClass} hover:bg-white/10`}
          style={{ borderColor: `${accentColor}66`, boxShadow: `0 15px 45px -10px ${accentColor}44` }}
        >
           <div className="flex justify-between items-start w-full relative z-10">
              <div className="flex flex-col min-w-0">
                <p className="text-[12px] md:text-lg font-black text-white uppercase truncate tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">{friendlyName}</p>
                {isShell && <span className="text-[8px] font-black text-orange-400 mt-1 bg-black/40 px-2 py-0.5 rounded-full border border-orange-400/20">SYS_CORE_CMD</span>}
              </div>
              <div className="text-3xl md:text-5xl group-hover:scale-125 transition-transform duration-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                 {customIcon}
              </div>
           </div>
           <div className="relative z-10 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}` }} />
              <p className="text-[9px] font-black uppercase text-white/80 tracking-widest italic drop-shadow-md">Ejecutar Protocolo</p>
           </div>
           <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
              <span className="text-8xl">{customIcon}</span>
           </div>
        </button>
      );
    }

    // TIPO SENSOR / KPI (General)
    return (
      <div 
        key={widget.id} 
        className={`glass p-6 rounded-[35px] border-2 flex flex-col justify-between shadow-2xl relative overflow-hidden group hover:border-white/30 transition-all ${widget.colSpan === 0.25 ? 'h-[120px] md:h-[140px]' : 'h-[140px] md:h-[200px]'} ${colSpanClass}`} 
        style={{ borderColor: `${accentColor}55`, boxShadow: `0 15px 45px -10px ${accentColor}33` }}
      >
         <div className="flex flex-col h-full justify-between relative z-10">
            <div className="flex justify-between items-start">
              <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white/80 group-hover:text-white transition-colors drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">{friendlyName}</p>
              <span className="text-2xl md:text-4xl group-hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{customIcon}</span>
            </div>
            
            <div className="mt-auto">
               <h4 className={`${widget.colSpan === 0.25 ? 'text-2xl' : 'text-3xl md:text-5xl'} font-black text-white italic tracking-tighter truncate leading-none drop-shadow-[0_6px_16px_rgba(0,0,0,1)]`}>
                  {friendlyName.toLowerCase().includes('km') ? formatKm(val) : val}
                  {unit && <span className="text-[10px] md:text-lg ml-1 opacity-70 not-italic uppercase font-bold drop-shadow-none">{unit}</span>}
               </h4>
            </div>
         </div>
         {isNumeric && chartPoints.length > 0 && widget.colSpan >= 0.5 && (
           <div className="absolute bottom-0 left-0 right-0 h-1/2 opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartPoints}>
                    <Area type="monotone" dataKey="v" stroke={accentColor} fill={accentColor} strokeWidth={3} isAnimationActive={false} />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
         )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 h-full pb-10">
      <div className="glass rounded-[35px] md:rounded-[50px] p-6 md:p-8 border border-blue-500/30 relative overflow-hidden bg-black/85 shrink-0 shadow-2xl">
         <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center">
            <div className="relative shrink-0">
               <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-600 rounded-[22px] flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.6)]">
                  <svg className="w-7 h-7 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
               </div>
               <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-black border-2 border-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
               </div>
            </div>
            <div className="text-center md:text-left flex-1">
               <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 italic drop-shadow-md">RM NEXUS STRATEGIC CORE</h2>
                  <span className="h-px w-12 bg-blue-500/40" />
               </div>
               <div className={`text-xs md:text-[15px] leading-relaxed text-white font-medium drop-shadow-[0_2px_10px_rgba(0,0,0,1)] ${loadingAI ? 'animate-pulse opacity-40' : ''}`}>
                  {aiReport.text}
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 px-1 auto-rows-min">
         {(haConfig?.dashboardWidgets || []).map(renderWidget)}
      </div>
    </div>
  );
};

export default Dashboard;
