
import React, { useState, useEffect, useMemo } from 'react';
import { WidgetConfig, HomeAssistantConfig } from '../types';
import { fetchHAStates, callHAService, fetchHAHistory } from '../homeAssistantService';
import { getGlobalNexusStatus } from '../geminiService';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const Dashboard: React.FC = () => {
  const [haStates, setHaStates] = useState<any[]>([]);
  const [haConfig, setHaConfig] = useState<HomeAssistantConfig | null>(null);
  const [aiReport, setAiReport] = useState<{ text: string, sources: any[], needsKey?: boolean }>({ text: 'Iniciando secuencia de enlace...', sources: [] });
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

  const activeWidgets = useMemo(() => {
    if (!haConfig) return [];
    if (haConfig.dashboardWidgets && haConfig.dashboardWidgets.length > 0) return haConfig.dashboardWidgets;

    return [
      { id: 'solar', entity_id: haConfig.solar_production_entity || '', type: 'chart', title: 'Energía Estelar', colSpan: 1 },
      { id: 'car', entity_id: haConfig.vehicle?.battery_entity || '', type: 'sensor', title: 'Módulo de Transporte', colSpan: 1 },
      { id: 'alarm', entity_id: haConfig.alarm_entity || '', type: 'sensor', title: 'Escudo Perimetral', colSpan: 1 }
    ].filter(w => w.entity_id);
  }, [haConfig]);

  useEffect(() => {
    loadConfig();
    window.addEventListener('nexus_config_updated', loadConfig);
    const interval = setInterval(() => { if (haConfig) refreshData(haConfig); }, 30000);
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
          temp: states.find((s: any) => s.entity_id?.includes('temperature'))?.state || 'N/A'
        });
        setAiReport(report);
        setLoadingAI(false);
      }
    }
  };

  const handleOpenKeySelector = async () => {
    if ((window as any).aistudio) {
        await (window as any).aistudio.openSelectKey();
        window.location.reload();
    } else {
        alert("El selector de claves oficial solo está disponible en el entorno de producción. Por favor, introduce tu clave en Ajustes.");
    }
  };

  const renderWidget = (widget: WidgetConfig) => {
    const state = haStates.find(s => s.entity_id === widget.entity_id);
    const val = state?.state || '---';
    const friendlyName = widget.title || state?.attributes?.friendly_name || 'Nodo Desconectado';
    const unit = state?.attributes?.unit_of_measurement || '';

    return (
      <div key={widget.id} className="glass p-8 rounded-[40px] border border-white/10 flex flex-col justify-between h-[220px] shadow-2xl group hover:border-purple-500/50 transition-all duration-500">
         <div className="flex justify-between items-start">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 group-hover:text-purple-400 transition-colors">{friendlyName}</p>
            <div className="w-2 h-2 rounded-full bg-purple-500/20 group-hover:bg-purple-500 shadow-none group-hover:shadow-[0_0_10px_#a855f7] transition-all" />
         </div>
         <div>
            <h4 className="text-4xl font-black text-white italic tracking-tighter nebula-text-glow">
                {val}<span className="text-[10px] ml-1 text-white/20 uppercase font-black not-italic">{unit}</span>
            </h4>
         </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-10 h-full pb-24">
      {/* HEADER AI CON ESTILO NEBULA */}
      <div className="glass rounded-[50px] p-10 border border-purple-500/20 relative overflow-hidden shadow-2xl nebula-border-glow">
         <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] ai-active-glow" />
         <div className="flex flex-col md:flex-row gap-10 relative z-10 items-center">
            <div className="w-24 h-24 bg-purple-600 rounded-[35px] flex items-center justify-center shrink-0 shadow-[0_0_40px_rgba(168,85,247,0.4)] border border-purple-400/30">
               <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div className="flex-1 text-center md:text-left space-y-3">
               <h2 className="text-[12px] font-black uppercase tracking-[0.5em] text-purple-400">Nexus Strategic Core</h2>
               <div className={`text-lg leading-relaxed text-white/90 font-medium ${loadingAI ? 'animate-pulse' : ''}`}>
                  {aiReport.text}
               </div>
               
               {aiReport.needsKey && (
                  <button onClick={handleOpenKeySelector} className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-600/30">
                     Autorizar Protocolo IA
                  </button>
               )}

               {aiReport.sources && aiReport.sources.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                    {aiReport.sources.map((source: any, idx: number) => (
                        <a key={idx} href={source.web?.uri} target="_blank" rel="noopener noreferrer" className="text-[8px] bg-white/5 hover:bg-purple-500/20 border border-white/10 px-3 py-1.5 rounded-full text-purple-300 transition-all uppercase font-black tracking-widest">
                          {source.web?.title || 'Fuente'}
                        </a>
                    ))}
                  </div>
               )}
            </div>
         </div>
      </div>

      {/* GRID DE WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeWidgets
          .map(w => ({ ...w, type: w.type as WidgetType }))
          .map(renderWidget)}
      </div>
    </div>
  );
};

export default Dashboard;
