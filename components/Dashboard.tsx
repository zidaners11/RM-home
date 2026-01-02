
import React, { useState, useEffect } from 'react';
import { WidgetConfig } from '../types';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { fetchHAStates, callHAService, fetchHAHistory } from '../homeAssistantService';
import { getGlobalNexusStatus } from '../geminiService';

const Dashboard: React.FC = () => {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [haStates, setHaStates] = useState<any[]>([]);
  const [haConfig, setHaConfig] = useState<any>(null);
  const [aiReport, setAiReport] = useState<{ text: string, sources: any[] }>({ text: 'Sincronizando con RM Home Core...', sources: [] });
  const [loadingAI, setLoadingAI] = useState(true);
  const [shoppingList, setShoppingList] = useState<{id: string, text: string, done: boolean}[]>([]);
  const [historyData, setHistoryData] = useState<{[key: string]: any[]}>({});

  useEffect(() => {
    const savedHA = localStorage.getItem('nexus_ha_config');
    const savedWidgets = localStorage.getItem('nexus_dashboard_widgets_v4');
    const savedList = localStorage.getItem('nexus_shopping_list');

    if (savedList) setShoppingList(JSON.parse(savedList));
    
    if (savedWidgets) {
      setWidgets(JSON.parse(savedWidgets));
    } else {
      const defaults: WidgetConfig[] = [
        { id: '1', type: 'checklist', title: 'Lista de la Compra', colSpan: 1, entity_id: '' },
      ];
      setWidgets(defaults);
      localStorage.setItem('nexus_dashboard_widgets_v4', JSON.stringify(defaults));
    }

    if (savedHA) {
      const config = JSON.parse(savedHA);
      setHaConfig(config);
      refreshData(config);
      const interval = setInterval(() => refreshData(config), 30000);
      return () => clearInterval(interval);
    }
  }, []);

  const refreshData = async (config: any) => {
    const states = await fetchHAStates(config.url, config.token);
    if (states) {
      setHaStates(states);
      widgets.filter(w => w.type === 'chart').forEach(async (w) => {
        const h = await fetchHAHistory(config.url, config.token, w.entity_id);
        setHistoryData(prev => ({...prev, [w.entity_id]: h}));
      });

      if (loadingAI) {
        const report = await getGlobalNexusStatus({
          alarm: states.find((s: any) => s.entity_id === config.alarm_entity)?.state || 'unknown',
          active_alerts: states.filter((s: any) => s.entity_id.startsWith('binary_sensor') && s.state === 'on').length,
          solar: states.find((s: any) => s.entity_id === config.solar_production_entity)?.state || 0
        });
        setAiReport(report);
        setLoadingAI(false);
      }
    }
  };

  const handleToggle = async (entityId: string, domain: string = 'switch') => {
    if (!haConfig) return;
    const currentState = haStates.find(s => s.entity_id === entityId)?.state;
    const service = currentState === 'on' ? 'turn_off' : 'turn_on';
    await callHAService(haConfig.url, haConfig.token, domain, service, { entity_id: entityId });
    refreshData(haConfig);
  };

  const handleClimate = async (entityId: string, temp: number) => {
    if (!haConfig) return;
    await callHAService(haConfig.url, haConfig.token, 'climate', 'set_temperature', { entity_id: entityId, temperature: temp });
    refreshData(haConfig);
  };

  const updateShoppingList = (newList: any[]) => {
    setShoppingList(newList);
    localStorage.setItem('nexus_shopping_list', JSON.stringify(newList));
  };

  const renderWidget = (widget: WidgetConfig) => {
    const state = haStates.find(s => s.entity_id === widget.entity_id);
    const val = state?.state || '---';

    switch (widget.type) {
      case 'sensor':
        return (
          <div key={widget.id} className="glass p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-white/5 flex flex-col justify-between group hover:bg-white/[0.03] transition-all">
             <div>
                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">{widget.title || state?.attributes?.friendly_name}</p>
                <h4 className="text-xl md:text-3xl font-black text-white">{val}<span className="text-[9px] md:text-sm ml-1 text-white/20 font-bold uppercase">{widget.unit || state?.attributes?.unit_of_measurement}</span></h4>
             </div>
             <div className="flex justify-end mt-2 md:mt-4">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20 group-hover:text-blue-400 transition-all">
                   <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
             </div>
          </div>
        );

      case 'switch':
        const isOn = state?.state === 'on';
        return (
          <div key={widget.id} onClick={() => handleToggle(widget.entity_id, widget.entity_id.split('.')[0])} className={`glass p-4 md:p-6 rounded-[24px] md:rounded-[32px] border cursor-pointer transition-all duration-500 flex flex-col justify-between ${isOn ? 'bg-blue-600/10 border-blue-500/40 shadow-lg shadow-blue-500/20' : 'border-white/5 hover:border-white/10'}`}>
             <div className="flex justify-between items-start">
                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{widget.title}</p>
                <div className={`w-1.5 h-1.5 rounded-full ${isOn ? 'bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]' : 'bg-white/10'}`} />
             </div>
             <div className="mt-4 md:mt-6 flex items-center justify-between">
                <span className={`text-[10px] md:text-sm font-black uppercase tracking-widest ${isOn ? 'text-white' : 'text-white/20'}`}>{isOn ? 'ACTIVO' : 'APAGADO'}</span>
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center transition-all ${isOn ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/20'}`}>
                   <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.547.547A3.374 3.374 0 0012 18.75c-1.03 0-1.9.4-2.593.463l-.547-.547z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
             </div>
          </div>
        );

      case 'checklist':
        return (
          <div key={widget.id} className="glass p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-white/10 flex flex-col h-[200px] md:h-[300px]">
             <div className="flex justify-between items-center mb-3 md:mb-4">
                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{widget.title}</p>
                <button onClick={() => {
                  const item = prompt('Nuevo suministro:');
                  if(item) updateShoppingList([...shoppingList, {id: Date.now().toString(), text: item, done: false}]);
                }} className="text-[7px] md:text-[9px] bg-blue-600 px-2 md:px-3 py-1 rounded-lg font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Añadir</button>
             </div>
             <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                {shoppingList.length === 0 ? (
                  <p className="text-center py-6 text-[7px] md:text-[9px] text-white/10 uppercase tracking-widest font-black italic">Inventario Completo</p>
                ) : shoppingList.map(item => (
                  <div key={item.id} onClick={() => updateShoppingList(shoppingList.map(i => i.id === item.id ? {...i, done: !i.done} : i))} className={`flex items-center justify-between p-2 md:p-3 rounded-lg md:rounded-xl border transition-all cursor-pointer ${item.done ? 'bg-white/5 border-white/5 opacity-30' : 'bg-white/[0.03] border-white/10'}`}>
                     <span className={`text-[9px] md:text-xs font-bold uppercase tracking-tight ${item.done ? 'line-through' : ''}`}>{item.text}</span>
                     <button onClick={(e) => {
                       e.stopPropagation();
                       updateShoppingList(shoppingList.filter(i => i.id !== item.id));
                     }} className="text-white/10 hover:text-red-500 transition-colors">
                        <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                     </button>
                  </div>
                ))}
             </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 h-full pb-24">
      
      {/* Strategic Intelligence Core */}
      <div className="glass rounded-[24px] md:rounded-[40px] p-4 md:p-6 border border-blue-500/20 relative overflow-hidden shrink-0">
         <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full -mr-24 -mt-24 blur-[80px]" />
         <div className="flex flex-col md:flex-row gap-4 md:gap-6 relative z-10">
            <div className="w-10 h-10 md:w-16 md:h-16 bg-blue-600 rounded-xl md:rounded-[24px] flex items-center justify-center shrink-0 shadow-2xl animate-pulse">
               <svg className="w-5 h-5 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
               </svg>
            </div>
            <div className="flex-1">
               <div className="flex items-center gap-4 mb-2">
                  <h2 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.5em] text-blue-400">Strategic Intelligence Core</h2>
                  <div className="h-px flex-1 bg-white/10" />
               </div>
               <div className={`text-xs md:text-base font-medium leading-relaxed text-white/90 ${loadingAI ? 'animate-pulse' : ''}`}>
                  {aiReport.text.split('\n').map((line, i) => (
                    <p key={i} className="mb-1">{line}</p>
                  ))}
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 auto-rows-max">
         {widgets.map(renderWidget)}
         
         {haConfig?.alarm_entity && (
            <div className={`glass p-4 md:p-6 rounded-[24px] md:rounded-[32px] border flex flex-col justify-center min-h-[120px] md:min-h-[160px] transition-all duration-700 ${haStates.find(s => s.entity_id === haConfig.alarm_entity)?.state !== 'disarmed' ? 'border-red-500/40 bg-red-500/5' : 'border-white/5'}`}>
               <div className="flex justify-between items-center mb-3">
                  <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-white/20">Sentinel Security</p>
                  <div className={`w-2 h-2 rounded-full ${haStates.find(s => s.entity_id === haConfig.alarm_entity)?.state === 'disarmed' ? 'bg-blue-500' : 'bg-red-500 animate-ping'}`} />
               </div>
               <button 
                  onClick={async () => {
                    const alarm = haStates.find(s => s.entity_id === haConfig.alarm_entity);
                    const service = alarm?.state === 'disarmed' ? 'alarm_arm_away' : 'alarm_disarm';
                    await callHAService(haConfig.url, haConfig.token, 'alarm_control_panel', service, { entity_id: haConfig.alarm_entity });
                    refreshData(haConfig);
                  }}
                  className={`w-full py-3 md:py-4 rounded-xl md:rounded-[20px] font-black text-[8px] md:text-[10px] tracking-[0.3em] uppercase shadow-2xl transition-all active:scale-95 ${haStates.find(s => s.entity_id === haConfig.alarm_entity)?.state === 'disarmed' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}
               >
                  {haStates.find(s => s.entity_id === haConfig.alarm_entity)?.state === 'disarmed' ? 'ACTIVAR ALARMA' : 'DESACTIVAR'}
               </button>
            </div>
         )}
      </div>
    </div>
  );
};

export default Dashboard;
