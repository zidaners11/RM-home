
import React, { useState, useEffect } from 'react';
import { WidgetConfig } from '../types';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { fetchHAStates, callHAService, fetchHAHistory } from '../homeAssistantService';
import { getGlobalNexusStatus } from '../geminiService';

const Dashboard: React.FC = () => {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [haStates, setHaStates] = useState<any[]>([]);
  const [haConfig, setHaConfig] = useState<any>(null);
  const [aiReport, setAiReport] = useState<{ text: string, sources: any[] }>({ text: 'Sincronizando Sistemas...', sources: [] });
  const [loadingAI, setLoadingAI] = useState(true);
  const [historyData, setHistoryData] = useState<{[key: string]: any[]}>({});
  const [shoppingList, setShoppingList] = useState<{id: string, text: string, done: boolean}[]>([]);

  useEffect(() => {
    const user = localStorage.getItem('nexus_user') || 'Juanmi';
    const savedHA = localStorage.getItem('nexus_ha_config');
    const savedWidgets = localStorage.getItem(`nexus_widgets_${user}`);
    const savedList = localStorage.getItem('nexus_shopping_list');

    if (savedList) setShoppingList(JSON.parse(savedList));
    
    if (savedWidgets) {
      setWidgets(JSON.parse(savedWidgets));
    } else {
      const defaults: WidgetConfig[] = [
        { id: '1', type: 'checklist', title: 'Lista de la Compra', colSpan: 1, entity_id: '' },
      ];
      setWidgets(defaults);
      localStorage.setItem(`nexus_widgets_${user}`, JSON.stringify(defaults));
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
      
      // Cargar historial para gráficos
      const chartWidgets = widgets.filter(w => w.type === 'chart');
      for (const w of chartWidgets) {
        if (w.entity_id) {
           const history = await fetchHAHistory(config.url, config.token, w.entity_id, 24);
           setHistoryData(prev => ({...prev, [w.entity_id]: history}));
        }
      }

      if (loadingAI) {
        const report = await getGlobalNexusStatus({
          alarm: states.find((s: any) => s.entity_id === config.alarm_entity)?.state || 'unknown',
          solar: states.find((s: any) => s.entity_id === config.solar_production_entity)?.state || 0
        });
        setAiReport(report);
        setLoadingAI(false);
      }
    }
  };

  const renderWidget = (widget: WidgetConfig) => {
    const state = haStates.find(s => s.entity_id === widget.entity_id);
    const val = state?.state || '---';

    switch (widget.type) {
      case 'sensor':
        return (
          <div key={widget.id} className="glass p-6 rounded-[32px] border border-white/5 flex flex-col justify-between group">
             <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">{widget.title || state?.attributes?.friendly_name}</p>
                <h4 className="text-3xl font-black text-white">{val}<span className="text-sm ml-1 text-white/20 uppercase">{widget.unit || state?.attributes?.unit_of_measurement}</span></h4>
             </div>
             <div className="flex justify-end mt-4">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>
                </div>
             </div>
          </div>
        );

      case 'chart':
        const hData = historyData[widget.entity_id] || [];
        const formatted = hData.map((d: any) => ({ val: parseFloat(d.state) || 0 }));
        return (
          <div key={widget.id} className="glass p-6 rounded-[32px] border border-white/5 col-span-2 h-[200px] flex flex-col">
             <div className="flex justify-between items-center mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{widget.title}</p>
                <span className="text-lg font-black text-white">{val}</span>
             </div>
             <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={formatted}>
                      <Area type="monotone" dataKey="val" stroke="#3b82f6" fill="rgba(59,130,246,0.1)" strokeWidth={2} />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>
        );

      case 'switch':
        const isOn = val === 'on';
        return (
          <div key={widget.id} onClick={() => callHAService(haConfig.url, haConfig.token, 'switch', isOn ? 'turn_off' : 'turn_on', { entity_id: widget.entity_id })} className={`glass p-6 rounded-[32px] border cursor-pointer transition-all ${isOn ? 'bg-blue-600/20 border-blue-500/40' : 'border-white/5 opacity-70'}`}>
             <div className="flex justify-between items-center mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{widget.title}</p>
                <div className={`w-2 h-2 rounded-full ${isOn ? 'bg-blue-500 animate-pulse' : 'bg-white/10'}`} />
             </div>
             <div className="flex items-center justify-between">
                <span className="text-sm font-black uppercase tracking-widest">{isOn ? 'ACTIVO' : 'APAGADO'}</span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOn ? 'bg-blue-600' : 'bg-white/5'}`}>
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2"/></svg>
                </div>
             </div>
          </div>
        );

      case 'checklist':
        return (
          <div key={widget.id} className="glass p-6 rounded-[32px] border border-white/10 flex flex-col h-[250px]">
             <div className="flex justify-between items-center mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{widget.title}</p>
                <button onClick={() => {
                  const item = prompt('Nuevo suministro:');
                  if(item) setShoppingList([...shoppingList, {id: Date.now().toString(), text: item, done: false}]);
                }} className="text-[8px] bg-blue-600 px-3 py-1 rounded-lg font-black uppercase tracking-widest">Añadir</button>
             </div>
             <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                {shoppingList.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                     <span className={`text-xs font-bold uppercase ${item.done ? 'line-through opacity-30' : ''}`}>{item.text}</span>
                  </div>
                ))}
             </div>
          </div>
        );

      case 'button':
        return (
          <div key={widget.id} onClick={() => callHAService(haConfig.url, haConfig.token, widget.entity_id.split('.')[0], 'press', { entity_id: widget.entity_id })} className="glass p-6 rounded-[32px] border border-white/5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/5 active:scale-95 transition-all">
             <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2"/></svg>
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{widget.title}</p>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full pb-24">
      <div className="glass rounded-[40px] p-6 border border-blue-500/20 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-[80px]" />
         <div className="flex gap-6 relative z-10">
            <div className="w-16 h-16 bg-blue-600 rounded-[24px] flex items-center justify-center shrink-0 shadow-2xl animate-pulse">
               <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div className="flex-1">
               <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-400 mb-2">Nexus Core Intelligence</h2>
               <div className={`text-sm leading-relaxed text-white/90 ${loadingAI ? 'animate-pulse' : ''}`}>
                  {aiReport.text}
               </div>
            </div>
         </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         {widgets.map(renderWidget)}
      </div>
    </div>
  );
};

export default Dashboard;
