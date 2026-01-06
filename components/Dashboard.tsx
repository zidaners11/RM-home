
import React, { useState, useEffect, useMemo } from 'react';
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

  const activeWidgets = useMemo(() => {
    if (!haConfig) return [];
    if (haConfig.dashboardWidgets && haConfig.dashboardWidgets.length > 0) {
      return haConfig.dashboardWidgets;
    }

    const autoWidgets: WidgetConfig[] = [];
    
    if (haConfig.solar_production_entity) {
      autoWidgets.push({ id: 'auto_solar', entity_id: haConfig.solar_production_entity, type: 'chart', title: 'Producción Solar', colSpan: 1 });
    }

    if (haConfig.grid_consumption_entity) {
      autoWidgets.push({ id: 'auto_grid', entity_id: haConfig.grid_consumption_entity, type: 'chart', title: 'Consumo Red', colSpan: 1 });
    }

    if (haConfig.vehicle?.battery_entity) {
       autoWidgets.push({ id: 'auto_car', entity_id: haConfig.vehicle.battery_entity, type: 'sensor', title: 'Lynk & Co 01', colSpan: 1 });
    }

    if (haConfig.tracked_people && haConfig.tracked_people.length > 0) {
       autoWidgets.push({ id: `auto_p_0`, entity_id: haConfig.tracked_people[0], type: 'sensor', title: 'Ubicación Agente', colSpan: 1 });
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

  const renderWidget = (widget: WidgetConfig) => {
    const state = haStates.find(s => s.entity_id === widget.entity_id);
    const val = state?.state || '---';
    const friendlyName = widget.title || state?.attributes?.friendly_name || widget.entity_id;
    const unit = state?.attributes?.unit_of_measurement || '';

    if (widget.id === 'auto_car') {
      // REDONDEO DE BATERÍA EN DASHBOARD
      const battRaw = parseFloat(val);
      const battRound = isNaN(battRaw) ? '---' : Math.round(battRaw);
      
      const fuelValue = parseFloat(haStates.find(s => s.entity_id === haConfig?.vehicle?.fuel_entity)?.state || '0');
      const fuelLiters = isNaN(fuelValue) ? '---' : fuelValue.toFixed(1);
      
      const rangeEV = haStates.find(s => s.entity_id === haConfig?.vehicle?.range_entity)?.state || '---';
      const rangeGas = haStates.find(s => s.entity_id === haConfig?.vehicle?.fuel_range_entity)?.state || '---';
      
      return (
        <div key={widget.id} className="glass p-8 rounded-[45px] border border-blue-500/10 flex flex-col justify-between h-[220px] shadow-lg group hover:bg-white/[0.03] transition-all overflow-hidden relative">
           <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[40px] -mr-10 -mt-10" />
           <div className="flex justify-between items-start relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 truncate group-hover:text-blue-400 transition-colors">ESTADO VEHÍCULO</p>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
           </div>
           <div className="relative z-10 grid grid-cols-2 gap-4">
              <div>
                 <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">EV</p>
                 <h4 className="text-3xl font-black text-white italic tracking-tighter">{battRound}%</h4>
                 <p className="text-[9px] font-bold text-blue-400 uppercase mt-1">{rangeEV} km</p>
              </div>
              <div>
                 <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">GAS</p>
                 <h4 className="text-3xl font-black text-orange-400 italic tracking-tighter">{fuelLiters}L</h4>
                 <p className="text-[9px] font-bold text-orange-400 uppercase mt-1">{rangeGas} km</p>
              </div>
           </div>
        </div>
      );
    }

    if (widget.type === 'chart') {
      const chartPoints = historyData[widget.entity_id] || [];
      return (
        <div key={widget.id} className="glass p-8 rounded-[45px] border border-white/5 flex flex-col justify-between h-[220px] shadow-lg group relative overflow-hidden">
           <div className="absolute inset-0 z-0 opacity-40">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartPoints.map(p => ({ v: parseFloat(p.state) }))}>
                    <Area type="monotone" dataKey="v" stroke={friendlyName.includes('Solar') ? '#fbbf24' : '#3b82f6'} fill={friendlyName.includes('Solar') ? '#fbbf24' : '#3b82f6'} strokeWidth={3} fillOpacity={0.1} />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
           <div className="relative z-10 flex flex-col h-full justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 truncate group-hover:text-white transition-colors">{friendlyName}</p>
              <div>
                 <h4 className="text-4xl font-black text-white italic tracking-tighter">{val}<span className="text-xs ml-2 text-white/20 uppercase font-black not-italic">{unit}</span></h4>
              </div>
           </div>
        </div>
      );
    }

    return (
      <div key={widget.id} className="glass p-8 rounded-[45px] border border-white/5 flex flex-col justify-between h-[220px] shadow-lg group hover:bg-white/[0.02] transition-all">
         <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 truncate group-hover:text-blue-400 transition-colors">{friendlyName}</p>
         <div>
            <h4 className="text-4xl font-black text-white italic tracking-tighter truncate">
                {friendlyName.toLowerCase().includes('km') || friendlyName.toLowerCase().includes('odómetro') ? formatKm(val) : val}
                <span className="text-xs ml-2 text-white/20 uppercase font-black not-italic">{unit}</span>
            </h4>
            {state?.attributes?.entity_picture && (
                <div className="mt-3 text-[8px] text-blue-400 font-black uppercase tracking-widest border-l-2 border-blue-500 pl-3">Sincronización Multimedia OK</div>
            )}
         </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-10 h-full pb-32">
      <div className="glass rounded-[65px] p-12 border border-blue-500/20 relative overflow-hidden shadow-2xl shrink-0 bg-black/40">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[150px]" />
         <div className="flex flex-col md:flex-row gap-12 relative z-10 items-center">
            <div className="w-28 h-28 bg-blue-600 rounded-[45px] flex items-center justify-center shrink-0 shadow-[0_0_60px_rgba(59,130,246,0.4)] border border-blue-400/30">
               <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div className="flex-1 text-center md:text-left space-y-4">
               <h2 className="text-[12px] font-black uppercase tracking-[0.7em] text-blue-400">NEXUS STRATEGIC CORE</h2>
               <div className={`text-xl leading-relaxed text-white/90 font-medium ${loadingAI ? 'animate-pulse' : ''}`}>
                  {aiReport.text}
               </div>
               {aiReport.sources && aiReport.sources.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                    {aiReport.sources.map((source: any, idx: number) => (
                        <a key={idx} href={source.web?.uri} target="_blank" rel="noopener noreferrer" className="text-[8px] bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full text-blue-400 transition-all uppercase font-black tracking-[0.3em]">
                          {source.web?.title || 'Referencia'}
                        </a>
                    ))}
                  </div>
               )}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 px-2">
         {activeWidgets.map(renderWidget)}
      </div>
    </div>
  );
};

export default Dashboard;
