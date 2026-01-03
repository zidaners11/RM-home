
import React, { useState, useEffect } from 'react';
import { WidgetConfig, AppSection } from '../types';
import { fetchHAStates } from '../homeAssistantService';
import { getGlobalNexusStatus } from '../geminiService';

const Dashboard: React.FC = () => {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [haStates, setHaStates] = useState<any[]>([]);
  const [haConfig, setHaConfig] = useState<any>(null);
  const [aiReport, setAiReport] = useState<{ text: string, sources: any[] }>({ text: 'Iniciando protocolos de análisis...', sources: [] });
  const [loadingAI, setLoadingAI] = useState(true);
  const [shoppingList, setShoppingList] = useState<{id: string, text: string, done: boolean}[]>([]);

  useEffect(() => {
    const user = localStorage.getItem('nexus_user') || 'Admin';
    const savedHA = localStorage.getItem('nexus_ha_config');
    const savedWidgets = localStorage.getItem(`nexus_widgets_${user}`);
    const savedList = localStorage.getItem('nexus_shopping_list');

    if (savedList) setShoppingList(JSON.parse(savedList));
    
    if (savedHA) {
      try {
        const config = JSON.parse(savedHA);
        setHaConfig(config);
        
        // Si no hay widgets, creamos unos por defecto basados en la config
        if (!savedWidgets) {
          const defaults: WidgetConfig[] = [
            { id: 'solar_now', type: 'sensor', title: 'Producción Solar', entity_id: config.solar_production_entity || '', colSpan: 1, unit: 'W' },
            { id: 'car_bat', type: 'sensor', title: 'Batería Coche', entity_id: config.vehicle?.battery_entity || '', colSpan: 1, unit: '%' },
            { id: 'list_1', type: 'checklist', title: 'Lista de la Compra', colSpan: 1, entity_id: '' },
          ];
          setWidgets(defaults.filter(w => w.type === 'checklist' || w.entity_id));
        } else {
          setWidgets(JSON.parse(savedWidgets));
        }

        refreshData(config);
      } catch(e) { console.error("Config load error", e); }
    }
  }, []);

  const refreshData = async (config: any) => {
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

    if (widget.type === 'checklist') {
      return (
        <div key={widget.id} className="glass p-8 rounded-[40px] border border-white/10 flex flex-col h-[400px] col-span-2 md:col-span-1 shadow-2xl">
           <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Suministros</p>
                <h3 className="text-white font-bold text-sm uppercase">{widget.title}</h3>
              </div>
              <button onClick={() => {
                const item = prompt('Nuevo artículo:');
                if(item) {
                  const newList = [...shoppingList, {id: Date.now().toString(), text: item, done: false}];
                  setShoppingList(newList);
                  localStorage.setItem('nexus_shopping_list', JSON.stringify(newList));
                }
              }} className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
           </div>
           <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
              {shoppingList.length > 0 ? shoppingList.map(item => (
                <div key={item.id} className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${item.done ? 'bg-white/5 opacity-30' : 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.08]'}`}>
                   <span onClick={() => {
                      const newList = shoppingList.map(i => i.id === item.id ? {...i, done: !i.done} : i);
                      setShoppingList(newList);
                      localStorage.setItem('nexus_shopping_list', JSON.stringify(newList));
                   }} className={`flex-1 text-xs font-bold uppercase tracking-tight ${item.done ? 'line-through' : 'text-white/80'}`}>{item.text}</span>
                   <button onClick={() => {
                      const newList = shoppingList.filter(i => i.id !== item.id);
                      setShoppingList(newList);
                      localStorage.setItem('nexus_shopping_list', JSON.stringify(newList));
                   }} className="p-2 text-white/10 hover:text-red-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round"/></svg>
                   </button>
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20">
                   <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeWidth="1.5"/></svg>
                   <p className="text-[8px] font-black uppercase tracking-widest">Lista Vacía</p>
                </div>
              )}
           </div>
        </div>
      );
    }

    return (
      <div key={widget.id} className="glass p-8 rounded-[40px] border border-white/5 flex flex-col justify-between group hover:bg-white/[0.02] transition-all shadow-xl h-[180px]">
         <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">{widget.title || state?.attributes?.friendly_name || 'Sensor'}</p>
            <h4 className="text-4xl font-black text-white">{val}<span className="text-sm ml-1 text-white/20 uppercase font-black">{widget.unit || state?.attributes?.unit_of_measurement}</span></h4>
         </div>
         <div className="flex justify-between items-center mt-4">
            <span className="text-[8px] font-mono text-white/10">{widget.entity_id}</span>
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20 group-hover:text-blue-400 group-hover:bg-blue-400/10 transition-all">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8 h-full pb-24">
      {/* Panel de IA Principal */}
      <div className="glass rounded-[50px] p-10 border border-blue-500/20 relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />
         <div className="flex flex-col md:flex-row gap-10 relative z-10 items-center">
            <div className="w-24 h-24 bg-blue-600 rounded-[35px] flex items-center justify-center shrink-0 shadow-[0_0_50px_rgba(59,130,246,0.4)] animate-pulse">
               <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div className="flex-1 text-center md:text-left">
               <h2 className="text-[12px] font-black uppercase tracking-[0.6em] text-blue-400 mb-4">Nexus Intelligence Report</h2>
               <div className={`text-lg leading-relaxed text-white/90 font-medium ${loadingAI ? 'animate-pulse' : ''}`}>
                  {aiReport.text}
               </div>
               {aiReport.sources.length > 0 && (
                 <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
                   {aiReport.sources.map((source: any, idx: number) => {
                     const url = source.web?.uri || source.maps?.uri;
                     if (!url) return null;
                     return (
                       <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-[9px] bg-white/5 hover:bg-blue-600 px-3 py-1.5 rounded-lg border border-white/10 transition-all text-white/40 hover:text-white font-black uppercase tracking-widest">
                         Fuente_{idx + 1}
                       </a>
                     );
                   })}
                 </div>
               )}
            </div>
         </div>
      </div>

      {/* Grid de Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {widgets.map(renderWidget)}
         
         {/* Widget Informativo de Ayuda si no hay muchos widgets */}
         {widgets.length < 4 && (
           <div className="glass p-8 rounded-[40px] border border-dashed border-white/10 flex flex-col items-center justify-center text-center opacity-40 hover:opacity-100 transition-opacity cursor-help">
              <svg className="w-10 h-10 mb-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" strokeWidth="1.5"/></svg>
              <p className="text-[10px] font-black uppercase tracking-widest">Personalizar Inicio</p>
              <p className="text-[9px] mt-2">Configura entidades en Ajustes para ver más KPIs aquí.</p>
           </div>
         )}
      </div>
    </div>
  );
};

export default Dashboard;
