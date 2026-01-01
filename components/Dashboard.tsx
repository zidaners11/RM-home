
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
      // Widgets por defecto si no hay configuración
      const defaults: WidgetConfig[] = [
        { id: '1', type: 'checklist', title: 'Lista de la Compra', colSpan: 1, entity_id: '' },
        { id: '2', type: 'sensor', title: 'Temperatura Salón', entity_id: 'sensor.temperature_salon', colSpan: 1 },
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
      // Cargar historias para charts
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
          <div key={widget.id} className={`glass p-8 rounded-[40px] border border-white/5 flex flex-col justify-between group hover:bg-white/[0.03] transition-all`}>
             <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-2">{widget.title || state?.attributes?.friendly_name}</p>
                <h4 className="text-4xl font-black text-white">{val}<span className="text-sm ml-1 text-white/20 font-bold uppercase">{widget.unit || state?.attributes?.unit_of_measurement}</span></h4>
             </div>
             <div className="flex justify-end mt-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-all">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
             </div>
          </div>
        );

      case 'switch':
        const isOn = state?.state === 'on';
        return (
          <div key={widget.id} onClick={() => handleToggle(widget.entity_id, widget.entity_id.split('.')[0])} className={`glass p-8 rounded-[40px] border cursor-pointer transition-all duration-500 flex flex-col justify-between ${isOn ? 'bg-blue-600/10 border-blue-500/40 shadow-lg shadow-blue-500/20' : 'border-white/5 hover:border-white/10'}`}>
             <div className="flex justify-between items-start">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{widget.title}</p>
                <div className={`w-2 h-2 rounded-full ${isOn ? 'bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-white/10'}`} />
             </div>
             <div className="mt-8 flex items-center justify-between">
                <span className={`text-xl font-black uppercase tracking-tighter ${isOn ? 'text-white' : 'text-white/20'}`}>{isOn ? 'ACTIVO' : 'OFF'}</span>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isOn ? 'bg-blue-600 text-white rotate-0' : 'bg-white/5 text-white/20 -rotate-12'}`}>
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.547.547A3.374 3.374 0 0012 18.75c-1.03 0-1.9.4-2.593.463l-.547-.547z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
             </div>
          </div>
        );

      case 'climate':
        const currentTemp = parseFloat(state?.attributes?.current_temperature || 0);
        const targetTemp = parseFloat(state?.attributes?.temperature || 21);
        return (
          <div key={widget.id} className="glass p-8 rounded-[40px] border border-white/10 flex flex-col gap-6">
             <div className="flex justify-between items-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{widget.title}</p>
                <span className="text-xs font-mono text-blue-400 uppercase tracking-widest">{state?.attributes?.hvac_action || 'IDLE'}</span>
             </div>
             <div className="flex items-center justify-center gap-10">
                <button onClick={() => handleClimate(widget.entity_id, targetTemp - 0.5)} className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 transition-all text-white/40 hover:text-white">-</button>
                <div className="text-center">
                   <p className="text-5xl font-black text-white tracking-tighter">{targetTemp.toFixed(1)}°</p>
                   <p className="text-[10px] text-white/20 uppercase font-bold mt-2">Real: {currentTemp}°</p>
                </div>
                <button onClick={() => handleClimate(widget.entity_id, targetTemp + 0.5)} className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 transition-all text-white/40 hover:text-white">+</button>
             </div>
          </div>
        );

      case 'checklist':
        return (
          <div key={widget.id} className="glass p-8 rounded-[40px] border border-white/10 flex flex-col h-[340px]">
             <div className="flex justify-between items-center mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{widget.title}</p>
                <button onClick={() => {
                  const item = prompt('Nuevo suministro:');
                  if(item) updateShoppingList([...shoppingList, {id: Date.now().toString(), text: item, done: false}]);
                }} className="text-[10px] bg-blue-600 px-4 py-2 rounded-xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Añadir</button>
             </div>
             <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                {shoppingList.length === 0 ? (
                  <p className="text-center py-12 text-[10px] text-white/10 uppercase tracking-widest font-black italic">Inventario Completo</p>
                ) : shoppingList.map(item => (
                  <div key={item.id} onClick={() => updateShoppingList(shoppingList.map(i => i.id === item.id ? {...i, done: !i.done} : i))} className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${item.done ? 'bg-white/5 border-white/5 opacity-30' : 'bg-white/[0.03] border-white/10 hover:border-blue-500/30'}`}>
                     <span className={`text-xs font-bold uppercase tracking-tight ${item.done ? 'line-through' : ''}`}>{item.text}</span>
                     <button onClick={(e) => {
                       e.stopPropagation();
                       updateShoppingList(shoppingList.filter(i => i.id !== item.id));
                     }} className="text-white/10 hover:text-red-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                     </button>
                  </div>
                ))}
             </div>
          </div>
        );

      case 'chart':
        const data = historyData[widget.entity_id] || [];
        return (
          <div key={widget.id} className="glass p-8 rounded-[40px] border border-white/10 flex flex-col h-[340px]">
             <div className="flex justify-between items-center mb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{widget.title}</p>
                <span className="text-2xl font-black text-white tracking-tighter">{val}{widget.unit}</span>
             </div>
             <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={data.map((h:any) => ({ v: parseFloat(h.state) }))}>
                      <defs>
                         <linearGradient id={`grad-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={widget.color || "#3b82f6"} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={widget.color || "#3b82f6"} stopOpacity={0}/>
                         </linearGradient>
                      </defs>
                      <Tooltip contentStyle={{display: 'none'}} />
                      <Area type="monotone" dataKey="v" stroke={widget.color || "#3b82f6"} fill={`url(#grad-${widget.id})`} strokeWidth={3} />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-8 h-full pb-24">
      
      {/* RM HOME STRATEGIC REPORT */}
      <div className="glass rounded-[40px] p-8 border border-blue-500/20 relative overflow-hidden shrink-0">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-[100px]" />
         <div className="flex flex-col md:flex-row gap-8 relative z-10">
            <div className="w-20 h-20 bg-blue-600 rounded-[28px] flex items-center justify-center shrink-0 shadow-2xl shadow-blue-500/40 animate-pulse">
               <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
               </svg>
            </div>
            <div className="flex-1">
               <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-[12px] font-black uppercase tracking-[0.5em] text-blue-400">Strategic_Intelligence_Core</h2>
                  <div className="h-px flex-1 bg-white/10" />
               </div>
               <div className={`text-lg font-medium leading-relaxed text-white/90 ${loadingAI ? 'animate-pulse' : ''}`}>
                  {aiReport.text.split('\n').map((line, i) => (
                    <p key={i} className="mb-2">{line}</p>
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* Bento Grid Dynamically Rendered */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-max">
         {widgets.map(renderWidget)}
         
         {/* Botón rápido de Alarma si está configurada */}
         {haConfig?.alarm_entity && (
            <div className={`glass p-8 rounded-[40px] border flex flex-col justify-center min-h-[220px] transition-all duration-700 ${haStates.find(s => s.entity_id === haConfig.alarm_entity)?.state !== 'disarmed' ? 'border-red-500/40 bg-red-500/5' : 'border-white/5'}`}>
               <div className="flex justify-between items-center mb-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20">SENTINEL_SECURITY</p>
                  <div className={`w-3 h-3 rounded-full ${haStates.find(s => s.entity_id === haConfig.alarm_entity)?.state === 'disarmed' ? 'bg-blue-500' : 'bg-red-500 animate-ping'}`} />
               </div>
               <button 
                  onClick={async () => {
                    const alarm = haStates.find(s => s.entity_id === haConfig.alarm_entity);
                    const service = alarm?.state === 'disarmed' ? 'alarm_arm_away' : 'alarm_disarm';
                    await callHAService(haConfig.url, haConfig.token, 'alarm_control_panel', service, { entity_id: haConfig.alarm_entity });
                    refreshData(haConfig);
                  }}
                  className={`w-full py-5 rounded-[24px] font-black text-[10px] tracking-[0.4em] uppercase shadow-2xl transition-all active:scale-95 ${haStates.find(s => s.entity_id === haConfig.alarm_entity)?.state === 'disarmed' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}
               >
                  {haStates.find(s => s.entity_id === haConfig.alarm_entity)?.state === 'disarmed' ? 'ACTIVAR PERÍMETRO' : 'ABORTAR ALARMA'}
               </button>
            </div>
         )}
      </div>
    </div>
  );
};

export default Dashboard;
