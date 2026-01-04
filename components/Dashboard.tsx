
import React, { useState, useEffect } from 'react';
import { WidgetConfig, HomeAssistantConfig } from '../types';
import { fetchHAStates } from '../homeAssistantService';
import { getGlobalNexusStatus } from '../geminiService';

const Dashboard: React.FC = () => {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [haStates, setHaStates] = useState<any[]>([]);
  const [haConfig, setHaConfig] = useState<HomeAssistantConfig | null>(null);
  const [aiReport, setAiReport] = useState<{ text: string, sources: any[] }>({ text: 'Iniciando protocolos de análisis...', sources: [] });
  const [loadingAI, setLoadingAI] = useState(true);
  const [shoppingList, setShoppingList] = useState<{id: string, text: string, done: boolean}[]>([]);

  useEffect(() => {
    const savedHA = localStorage.getItem('nexus_ha_config');
    const savedList = localStorage.getItem('nexus_shopping_list');

    if (savedList) setShoppingList(JSON.parse(savedList));
    
    if (savedHA) {
      try {
        const config: HomeAssistantConfig = JSON.parse(savedHA);
        setHaConfig(config);
        
        // Generar widgets dinámicos basados en PinnedEntities de los ajustes
        const pinned = config.pinnedEntities || [];
        const dynamicWidgets: WidgetConfig[] = pinned.map(entityId => ({
          id: `widget_${entityId}`,
          entity_id: entityId,
          type: 'sensor',
          title: '', 
          colSpan: 1
        }));

        // Añadir la lista de la compra al final si no hay muchas entidades
        dynamicWidgets.push({ id: 'shopping_list', type: 'checklist', title: 'Lista de Suministros', entity_id: '', colSpan: 1 });
        
        setWidgets(dynamicWidgets);
        refreshData(config);
      } catch(e) { console.error("Config load error", e); }
    }
  }, []);

  const refreshData = async (config: HomeAssistantConfig) => {
    const states = await fetchHAStates(config.url, config.token);
    if (states) {
      setHaStates(states);
      if (loadingAI) {
        const report = await getGlobalNexusStatus({
          alarm: states.find((s: any) => s.entity_id === config.alarm_entity)?.state || 'Segura',
          solar: states.find((s: any) => s.entity_id === config.solar_production_entity)?.state || 0,
          temp: states.find((s: any) => s.entity_id.includes('temperature'))?.state || '22'
        });
        setAiReport(report);
        setLoadingAI(false);
      }
    }
  };

  const renderWidget = (widget: WidgetConfig) => {
    const state = haStates.find(s => s.entity_id === widget.entity_id);
    const val = state?.state || '---';
    const friendlyName = state?.attributes?.friendly_name || widget.entity_id.split('.')[1] || widget.title;

    if (widget.type === 'checklist') {
      return (
        <div key={widget.id} className="glass p-10 rounded-[50px] border border-white/10 flex flex-col h-[450px] col-span-1 md:col-span-2 shadow-2xl">
           <div className="flex justify-between items-center mb-8">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-400">Logística_Core</p>
                <h3 className="text-white font-black text-lg uppercase tracking-tight">{widget.title}</h3>
              </div>
              <button onClick={() => {
                const item = prompt('Nuevo artículo:');
                if(item) {
                  const newList = [...shoppingList, {id: Date.now().toString(), text: item, done: false}];
                  setShoppingList(newList);
                  localStorage.setItem('nexus_shopping_list', JSON.stringify(newList));
                }
              }} className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
           </div>
           <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-2">
              {shoppingList.map(item => (
                <div key={item.id} className={`flex items-center justify-between p-5 rounded-3xl transition-all ${item.done ? 'bg-white/5 opacity-30 scale-95' : 'bg-white/[0.03] border border-white/5 hover:border-white/10'}`}>
                   <span onClick={() => {
                      const newList = shoppingList.map(i => i.id === item.id ? {...i, done: !i.done} : i);
                      setShoppingList(newList);
                      localStorage.setItem('nexus_shopping_list', JSON.stringify(newList));
                   }} className={`flex-1 text-[13px] font-bold uppercase tracking-tight cursor-pointer ${item.done ? 'line-through' : 'text-white/80'}`}>{item.text}</span>
                   <button onClick={() => {
                      const newList = shoppingList.filter(i => i.id !== item.id);
                      setShoppingList(newList);
                      localStorage.setItem('nexus_shopping_list', JSON.stringify(newList));
                   }} className="p-2 text-white/10 hover:text-red-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2"/></svg>
                   </button>
                </div>
              ))}
           </div>
        </div>
      );
    }

    return (
      <div key={widget.id} className="glass p-8 rounded-[40px] border border-white/5 flex flex-col justify-between group hover:bg-white/[0.02] transition-all h-[200px] shadow-lg relative overflow-hidden">
         <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
         <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-3 truncate group-hover:text-blue-400 transition-colors">{friendlyName}</p>
            <h4 className="text-4xl font-black text-white italic tracking-tighter">{val}<span className="text-xs ml-2 text-white/20 uppercase font-black not-italic">{state?.attributes?.unit_of_measurement}</span></h4>
         </div>
         <div className="flex justify-between items-center relative z-10">
            <span className="text-[8px] font-mono text-white/10 uppercase tracking-tighter">{widget.entity_id}</span>
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-600/20 transition-all">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>
            </div>
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
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
         {widgets.map(renderWidget)}
         
         {widgets.length <= 1 && (
            <div className="col-span-full py-32 text-center">
               <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/5 opacity-30">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>
               </div>
               <p className="text-[12px] font-black uppercase tracking-[0.5em] text-white/20">Configura tus Widgets en Ajustes - HA Core</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default Dashboard;
