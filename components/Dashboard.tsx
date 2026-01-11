
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
    
    // Lógica mejorada para Shell Commands y Scripts
    const parts = entityId.split('.');
    const domain = parts[0];
    const service = parts[1];
    
    // Solo permitimos dominios ejecutables
    if (domain === 'shell_command' || domain === 'script' || domain === 'automation' || domain === 'scene') {
      const targetService = domain === 'scene' ? 'turn_on' : service;
      const targetDomain = domain === 'scene' ? 'scene' : domain;
      const serviceData = domain === 'scene' ? { entity_id: entityId } : {};

      await callHAService(haConfig.url, haConfig.token, targetDomain, service, serviceData);
      
      // Feedback táctico
      window.dispatchEvent(new CustomEvent('nexus_notification', { 
        detail: `Protocolo ${service.toUpperCase()} iniciado` 
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
    
    // Motor de Grid: Restaurado colSpan 0.5, 1 y 2
    let colSpanClass = 'col-span-1';
    if (widget.colSpan === 2) colSpanClass = 'col-span-2 md:col-span-2';
    if (widget.colSpan === 0.5) colSpanClass = 'col-span-1 md:col-span-1 scale-90 origin-center';

    // TIPO BOTÓN (Script / Shell Command / Scene)
    if (widget.type === 'button') {
      const isShell = widget.entity_id.startsWith('shell_command.');
      return (
        <button 
          key={widget.id} 
          onClick={() => handleCommand(widget.entity_id)} 
          className={`glass p-5 rounded-[30px] border flex flex-col justify-between h-[120px] md:h-[160px] shadow-lg active:scale-95 transition-all text-left group ${colSpanClass} hover:bg-white/5`}
          style={{ borderColor: `${accentColor}44` }}
        >
           <div className="flex justify-between items-start w-full">
              <div className="flex flex-col min-w-0">
                <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest truncate" style={{ color: accentColor }}>
                  {isShell ? 'SHELL_EXEC' : 'NEXUS_PROC'}
                </p>
                <p className="text-[10px] md:text-sm font-bold text-white uppercase truncate mt-1">{friendlyName}</p>
              </div>
              <div className="w-8 h-8 flex items-center justify-center rounded-xl border shrink-0 transition-all group-hover:scale-110 shadow-lg" style={{ backgroundColor: `${accentColor}22`, color: accentColor, borderColor: `${accentColor}44`, boxShadow: `0 0 15px ${accentColor}33` }}>
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" strokeWidth="2.5"/></svg>
              </div>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
              <p className="text-[7px] font-black uppercase text-white/20 tracking-[0.2em] italic">Ready_for_execution</p>
           </div>
        </button>
      );
    }

    // TIPO GRÁFICO O HERO (colSpan 2)
    if (widget.type === 'chart' || (widget.colSpan === 2 && isNumeric)) {
        return (
          <div key={widget.id} className={`glass p-6 rounded-[35px] border flex flex-col justify-between h-[150px] md:h-[220px] shadow-2xl relative overflow-hidden bg-black/50 group ${colSpanClass}`} style={{ borderColor: `${accentColor}33` }}>
             <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-40 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartPoints}>
                      <Area type="monotone" dataKey="v" stroke={accentColor} fill={accentColor} strokeWidth={4} isAnimationActive={false} />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
             <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                   <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                      <p className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.3em] text-white/40">{friendlyName}</p>
                   </div>
                   <div className="w-12 h-0.5 mt-2 opacity-30" style={{ backgroundColor: accentColor }} />
                </div>
                <div className="flex items-baseline gap-2">
                   <h4 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter truncate leading-none">
                      {friendlyName.toLowerCase().includes('km') ? formatKm(val) : val}
                   </h4>
                   <span className="text-xs md:text-lg text-white/20 uppercase font-black not-italic tracking-widest">{unit}</span>
                </div>
             </div>
          </div>
        );
    }

    // WIDGET ESTÁNDAR / SENSOR
    return (
      <div key={widget.id} className={`glass p-5 rounded-[30px] border flex flex-col justify-between shadow-xl relative overflow-hidden bg-black/40 group hover:border-white/20 transition-all ${widget.colSpan === 0.5 ? 'h-[110px] md:h-[130px]' : 'h-[130px] md:h-[180px]'} ${colSpanClass}`} style={{ borderColor: `${accentColor}22` }}>
         <div className="flex flex-col h-full justify-between relative z-10">
            <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/30 truncate group-hover:text-blue-400 transition-colors">{friendlyName}</p>
            <div>
               <h4 className={`${widget.colSpan === 0.5 ? 'text-xl md:text-2xl' : 'text-2xl md:text-4xl'} font-black text-white italic tracking-tighter truncate leading-none`}>
                  {friendlyName.toLowerCase().includes('km') ? formatKm(val) : val}
               </h4>
               <p className="text-[8px] font-black mt-1 uppercase tracking-widest" style={{ color: `${accentColor}aa` }}>{unit || 'SENS_DATA'}</p>
            </div>
         </div>
         {isNumeric && chartPoints.length > 0 && (
           <div className="absolute bottom-0 left-0 right-0 h-1/2 opacity-10 pointer-events-none group-hover:opacity-25 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartPoints}>
                    <Area type="monotone" dataKey="v" stroke={accentColor} fill={accentColor} strokeWidth={2} isAnimationActive={false} />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
         )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 h-full pb-10">
      {/* AI STRATEGIC PANEL */}
      <div className="glass rounded-[35px] md:rounded-[50px] p-6 md:p-8 border border-blue-500/10 relative overflow-hidden bg-black/60 shrink-0 shadow-2xl">
         <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center">
            <div className="relative shrink-0">
               <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-600 rounded-[22px] md:rounded-[28px] flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.4)]">
                  <svg className="w-7 h-7 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
               </div>
               <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-black border-2 border-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
               </div>
            </div>
            <div className="text-center md:text-left flex-1">
               <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                  <h2 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 italic">RM NEXUS STRATEGIC CORE</h2>
                  <span className="h-px w-12 bg-blue-500/20" />
               </div>
               <div className={`text-xs md:text-[15px] leading-relaxed text-white/80 font-medium ${loadingAI ? 'animate-pulse opacity-40' : ''}`}>
                  {aiReport.text}
               </div>
            </div>
         </div>
      </div>

      {/* DYNAMIC GRID ENGINE */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 px-1">
         {(haConfig?.dashboardWidgets || []).map(renderWidget)}
      </div>
    </div>
  );
};

export default Dashboard;
