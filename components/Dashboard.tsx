
import React, { useState, useEffect } from 'react';
import { WidgetConfig, HomeAssistantConfig } from '../types';
import { fetchHAStates, callHAService, fetchHAHistory } from '../homeAssistantService';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const formatKm = (val: any) => {
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return new Intl.NumberFormat('es-ES').format(Math.floor(n));
};

const Dashboard: React.FC = () => {
  const [haStates, setHaStates] = useState<any[]>([]);
  const [haConfig, setHaConfig] = useState<HomeAssistantConfig | null>(null);
  const [historyData, setHistoryData] = useState<{[key: string]: any[]}>({});

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
          className={`glass p-6 rounded-[35px] border-2 flex flex-col justify-between h-[140px] md:h-[180px] shadow-2xl active:scale-90 transition-all text-left group overflow-hidden ${colSpanClass} hover:bg-white/5`}
          style={{ borderColor: `${accentColor}44`, boxShadow: `0 10px 40px -10px ${accentColor}33` }}
        >
           <div className="flex justify-between items-start w-full relative z-10">
              <div className="flex flex-col min-w-0">
                <p className="text-[12px] md:text-lg font-black text-white uppercase truncate tracking-tight">{friendlyName}</p>
                {isShell && <span className="text-[8px] font-black text-orange-400 mt-1">SYS_CORE_CMD</span>}
              </div>
              <div className="text-3xl md:text-5xl group-hover:scale-125 transition-transform duration-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                 {customIcon}
              </div>
           </div>
           <div className="relative z-10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
              <p className="text-[9px] font-black uppercase text-white/30 tracking-widest italic">Ejecutar</p>
           </div>
           <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
              <span className="text-8xl">{customIcon}</span>
           </div>
        </button>
      );
    }

    // TIPO SENSOR / KPI (General)
    return (
      <div 
        key={widget.id} 
        className={`glass p-6 rounded-[35px] border-2 flex flex-col justify-between shadow-2xl relative overflow-hidden bg-black/40 group hover:border-white/30 transition-all ${widget.colSpan === 0.25 ? 'h-[120px] md:h-[140px]' : 'h-[140px] md:h-[200px]'} ${colSpanClass}`} 
        style={{ borderColor: `${accentColor}33`, boxShadow: `0 10px 40px -10px ${accentColor}22` }}
      >
         <div className="flex flex-col h-full justify-between relative z-10">
            <div className="flex justify-between items-start">
              <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">{friendlyName}</p>
              <span className="text-2xl md:text-4xl group-hover:scale-110 transition-transform">{customIcon}</span>
            </div>
            
            <div className="mt-auto">
               <h4 className={`${widget.colSpan === 0.25 ? 'text-2xl' : 'text-3xl md:text-5xl'} font-black text-white italic tracking-tighter truncate leading-none`}>
                  {friendlyName.toLowerCase().includes('km') ? formatKm(val) : val}
                  {unit && <span className="text-[10px] md:text-lg ml-1 opacity-40 not-italic uppercase font-bold">{unit}</span>}
               </h4>
            </div>
         </div>
         {isNumeric && chartPoints.length > 0 && widget.colSpan >= 0.5 && (
           <div className="absolute bottom-0 left-0 right-0 h-1/2 opacity-10 pointer-events-none group-hover:opacity-30 transition-opacity">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 px-1 auto-rows-min">
         {(haConfig?.dashboardWidgets || []).map(renderWidget)}
      </div>
    </div>
  );
};

export default Dashboard;
