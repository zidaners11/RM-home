
import React, { useState, useEffect } from 'react';
import { HomeAssistantConfig } from '../types';
import { fetchHAStates } from '../homeAssistantService';

const SecurityView: React.FC = () => {
  const [config, setConfig] = useState<HomeAssistantConfig | null>(null);
  const [states, setStates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('nexus_ha_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setConfig(parsed);
      refreshData(parsed);
      const interval = setInterval(() => setRefreshTrigger(p => p + 1), 5000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    if (config) refreshData(config);
  }, [refreshTrigger]);

  const refreshData = async (cfg: HomeAssistantConfig) => {
    try {
      const data = await fetchHAStates(cfg.url, cfg.token);
      if (data) setStates(data);
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  const getCameraUrl = (entityId: string) => {
    if (!config) return '';
    const state = states.find(s => s.entity_id === entityId);
    if (!state || !state.attributes.entity_picture) return '';
    return `${config.url.replace(/\/$/, '')}${state.attributes.entity_picture}&time=${Date.now()}`;
  };

  const cameraEntities = config?.security_cameras || [];
  const sensorEntities = config?.security_sensors || [];

  // Agrupamos en filas de 3 para maximizar tamaño y detalle
  const cameraBlocks = [];
  for (let i = 0; i < cameraEntities.length; i += 3) {
    cameraBlocks.push(cameraEntities.slice(i, i + 3));
  }

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/5 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-blue-400 font-black text-[9px] uppercase tracking-[0.4em] animate-pulse">Iniciando Videowall Triple-Grid...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full min-h-0 pb-24 lg:pb-6 overflow-hidden">
       
       <div className="flex-1 overflow-y-auto no-scrollbar space-y-12">
          <div className="flex items-center justify-between px-4">
             <div className="flex items-center gap-4">
                <div className="w-2 h-8 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white/90 italic">Sentinel_Triple_Feed</h2>
             </div>
             <div className="hidden sm:flex gap-6 items-center">
                <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Grid_3xN: Active</span>
                <span className="text-[10px] font-mono text-blue-400/60 uppercase tracking-widest">{cameraEntities.length} Nodes</span>
             </div>
          </div>

          <div className="space-y-16">
             {cameraBlocks.length > 0 ? cameraBlocks.map((block, blockIdx) => (
               <div key={`block-${blockIdx}`} className="space-y-6">
                 <div className="flex items-center gap-4 px-4">
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.5em]">Trio_Sector_0{blockIdx + 1}</span>
                    <div className="h-px flex-1 bg-white/5" />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {block.map((id) => {
                      const state = states.find(s => s.entity_id === id);
                      return (
                        <div key={id} className="glass rounded-[35px] overflow-hidden group border border-white/5 relative bg-black shadow-2xl transition-all hover:scale-[1.03] hover:z-10 hover:border-blue-500/40">
                          <div className="aspect-video relative overflow-hidden">
                             <div className="scanline" />
                             <img 
                                src={getCameraUrl(id)} 
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700"
                                onError={(e) => { (e.target as any).src = 'https://via.placeholder.com/800x450/020617/ffffff?text=STREAM_OFFLINE'; }}
                                alt={id}
                             />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />
                             <div className="absolute top-4 left-4 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_rgba(220,38,38,1)]" />
                                <div className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-xl border border-white/10">
                                   <p className="text-[8px] font-black uppercase tracking-widest text-white">
                                      {state?.attributes.friendly_name || id.split('.')[1].replace('_', ' ')}
                                   </p>
                                </div>
                             </div>
                             <div className="absolute bottom-4 right-4">
                                <span className="text-[7px] font-mono text-white/30 bg-black/60 px-2 py-1 rounded-lg border border-white/5">NODE_{id.split('.')[1].substring(0,6).toUpperCase()}</span>
                             </div>
                          </div>
                          <div className="px-6 py-3 bg-white/[0.02] flex justify-between items-center border-t border-white/5 text-[8px] font-mono text-white/20 uppercase">
                             <div className="flex gap-4">
                                <span className="text-blue-500/50 italic">Live_Encrypted</span>
                             </div>
                             <button className="hover:text-blue-400 transition-all transform hover:scale-125">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" strokeWidth="2.5"/></svg>
                             </button>
                          </div>
                        </div>
                      );
                    })}
                    {block.length < 3 && Array.from({ length: 3 - block.length }).map((_, i) => (
                       <div key={`empty-${i}`} className="aspect-video glass rounded-[35px] border border-dashed border-white/5 flex flex-col items-center justify-center opacity-5 bg-black/40">
                          <p className="text-[8px] font-black uppercase tracking-widest">Available_Slot</p>
                       </div>
                    ))}
                 </div>
               </div>
             )) : (
               <div className="py-32 glass rounded-[48px] border border-dashed border-white/10 flex flex-col items-center justify-center">
                  <p className="text-white/20 uppercase text-[10px] tracking-[0.4em] font-black">Escaneando Fuentes de Video...</p>
               </div>
             )}
          </div>
       </div>

       <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0 h-full overflow-hidden">
          <div className="flex items-center gap-4 px-4">
             <div className="w-2 h-8 bg-red-600 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
             <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white/90 italic">Status_Log</h2>
          </div>
          <div className="flex-1 glass rounded-[40px] border border-white/10 p-6 space-y-4 overflow-y-auto no-scrollbar">
             {sensorEntities.map((id) => {
               const state = states.find(s => s.entity_id === id);
               const isActive = state?.state === 'on';
               return (
                 <div key={id} className={`p-4 rounded-[28px] border transition-all ${isActive ? 'bg-red-500/10 border-red-500/40' : 'bg-white/[0.02] border-white/5'}`}>
                    <div className="flex justify-between items-center">
                       <div>
                          <p className="text-[10px] font-black text-white uppercase truncate">{state?.attributes.friendly_name || id.split('.')[1]}</p>
                          <p className={`text-[8px] font-bold mt-1 ${isActive ? 'text-red-400' : 'text-blue-400/40'}`}>{isActive ? 'BREACH' : 'SECURED'}</p>
                       </div>
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-red-500 animate-pulse' : 'bg-white/5'}`}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2"/></svg>
                       </div>
                    </div>
                 </div>
               );
             })}
          </div>
       </div>
    </div>
  );
};

export default SecurityView;
