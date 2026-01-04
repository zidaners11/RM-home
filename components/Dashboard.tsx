
import React, { useState, useEffect, useMemo } from 'react';
import { WidgetConfig, HomeAssistantConfig } from '../types';
import { fetchHAStates, callHAService, fetchHAHistory } from '../homeAssistantService';
import { getGlobalNexusStatus } from '../geminiService';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

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
      } catch(e) { console.error("Error cargando config en Dashboard:", e); }
    }
  };

  // GENERADOR DINÁMICO DE WIDGETS
  // Si dashboardWidgets está vacío, construimos una interfaz basada en el perfil
  const activeWidgets = useMemo(() => {
    if (!haConfig) return [];
    if (haConfig.dashboardWidgets && haConfig.dashboardWidgets.length > 0) {
      return haConfig.dashboardWidgets;
    }

    const autoWidgets: WidgetConfig[] = [];
    
    // 1. Añadir Cámaras
    if (haConfig.security_cameras && haConfig.security_cameras.length > 0) {
      haConfig.security_cameras.forEach((cam, idx) => {
        autoWidgets.push({ id: `auto_cam_${idx}`, entity_id: cam, type: 'sensor', title: 'CCTV Online', colSpan: 1 });
      });
    }

    // 2. Añadir Energía Solar (Tu sensor Shelly)
    if (haConfig.solar_production_entity) {
      autoWidgets.push({ id: 'auto_solar', entity_id: haConfig.solar_production_entity, type: 'chart', title: 'Producción Solar', colSpan: 1 });
    }

    // 3. Añadir Personas (Radar)
    if (haConfig.tracked_people && haConfig.tracked_people.length > 0) {
      haConfig.tracked_people.forEach((p, idx) => {
        autoWidgets.push({ id: `auto_p_${idx}`, entity_id: p, type: 'sensor', title: 'Localización', colSpan: 1 });
      });
    }

    // 4. Añadir Coche (Si hay batería)
    if (haConfig.vehicle?.battery_entity) {
       autoWidgets.push({ id: 'auto_car', entity_id: haConfig.vehicle.battery_entity, type: 'sensor', title: 'Estado Vehículo', colSpan: 1 });
    }

    return autoWidgets;
  }, [haConfig]);

  useEffect(() => {
    loadConfig();
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
      
      activeWidgets.forEach(async (w) => {
        if (w.type === 'chart') {
          const h = await fetchHAHistory(config.url, config.token, w.entity_id, 24);
          setHistoryData(prev => ({ ...prev, [w.entity_id]: h }));
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

  const handleAction = async (entityId: string, domain: string, service: string) => {
    if (!haConfig) return;
    await callHAService(haConfig.url, haConfig.token, domain, service, { entity_id: entityId });
    setTimeout(() => refreshData(haConfig), 500);
  };

  const renderWidget = (widget: WidgetConfig) => {
    const state = haStates.find(s => s.entity_id === widget.entity_id);
    const val = state?.state || '---';
    const friendlyName = widget.title || state?.attributes?.friendly_name || widget.entity_id;
    const unit = state?.attributes?.unit_of_measurement || '';

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
                 <h4 className="text-4xl font-black text-white italic tracking-tighter">{val}<span className="text-[10px] ml-1 text-white/20 uppercase font-black not-italic">{unit}</span></h4>
              </div>
           </div>
        </div>
      );
    }

    return (
      <div key={widget.id} className="glass p-8 rounded-[40px] border border-white/5 flex flex-col justify-between h-[200px] shadow-lg group hover:bg-white/[0.02] transition-all">
         <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 truncate group-hover:text-blue-400 transition-colors">{friendlyName}</p>
         <div>
            <h4 className="text-4xl font-black text-white italic tracking-tighter">
                {val}
                <span className="text-xs ml-2 text-white/20 uppercase font-black not-italic">{unit}</span>
            </h4>
            {state?.attributes?.entity_picture && (
                <div className="mt-2 text-[8px] text-blue-400 font-black uppercase tracking-widest">Multimedia Link Active</div>
            )}
         </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-10 h-full pb-24">
      {/* HEADER AI ADAPTADO A TU ESTILO */}
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
                    {aiReport.sources.map((source: any, idx: number) => (
                        <a key={idx} href={source.web?.uri} target="_blank" rel="noopener noreferrer" className="text-[8px] bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-full text-blue-400 transition-all uppercase font-black tracking-widest">
                          {source.web?.title || 'Referencia'}
                        </a>
                    ))}
                  </div>
               )}
            </div>
         </div>
      </div>

      {/* GRID DE WIDGETS DUAL (MANUAL + AUTO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
         {activeWidgets.map(renderWidget)}
         
         {activeWidgets.length === 0 && !loadingAI && (
            <div className="col-span-full py-20 text-center glass rounded-[48px] border border-dashed border-white/10">
               <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
               </div>
               <p className="text-[12px] font-black uppercase tracking-[0.5em] text-white/40">Sincronizando perfiles de Home Assistant...</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default Dashboard;
