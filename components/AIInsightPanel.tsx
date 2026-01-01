
import React, { useState, useEffect } from 'react';
import { getHomeInsights } from '../geminiService';
import { fetchHAStates } from '../homeAssistantService';
import { MOCK_WEATHER } from '../constants';

interface AIInsightPanelProps {
  onClose: () => void;
}

const AIInsightPanel: React.FC<AIInsightPanelProps> = ({ onClose }) => {
  const [insight, setInsight] = useState<string>('Estableciendo conexión con RM Home Core...');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData() {
      let finalData: any = {
        weather: MOCK_WEATHER,
        timestamp: new Date().toISOString()
      };

      const savedHA = localStorage.getItem('nexus_ha_config');
      const savedWidgets = localStorage.getItem('nexus_widgets_v2');
      
      if (savedWidgets) finalData.active_widgets = JSON.parse(savedWidgets);

      if (savedHA) {
        const config = JSON.parse(savedHA);
        const states = await fetchHAStates(config.url, config.token);
        if (states) {
          finalData.real_telemetry = states.filter((s: any) => 
            finalData.active_widgets?.some((w: any) => w.entity_id === s.entity_id)
          );
        }
      }

      const result = await getHomeInsights(finalData);
      setInsight(result || "Error al conectar con la red neuronal de RM Home.");
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div className="fixed inset-y-4 right-4 w-full max-w-sm z-50 animate-in slide-in-from-right duration-500 h-[calc(100vh-32px)]">
      <div className="h-full glass rounded-[32px] flex flex-col border border-blue-500/30 shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                 <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <div>
                 <h3 className="text-sm font-bold uppercase tracking-widest text-white">RM Home AI</h3>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
           {loading ? (
             <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] uppercase font-black tracking-widest text-center">Analizando Matriz...</p>
             </div>
           ) : (
             <div className="space-y-6">
                <div className="bg-blue-500/5 border border-blue-500/20 p-5 rounded-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-2 opacity-20">
                      <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 13.1216 16 12.017 16L9.017 16C7.91243 16 7.017 16.8954 7.017 18L7.017 21" /></svg>
                   </div>
                   <p className="text-blue-100/90 leading-relaxed text-xs italic font-medium">
                      "{insight}"
                   </p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl flex items-center gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                   <p className="text-[9px] uppercase font-bold text-white/30 tracking-widest">RM CORE_STATUS: NOMINAL</p>
                </div>
             </div>
           )}
        </div>

        <div className="p-6 border-t border-white/10 bg-black/20">
           <input 
             type="text" 
             placeholder="Consulta a RM AI..."
             className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/30" 
           />
        </div>
      </div>
    </div>
  );
};

export default AIInsightPanel;
