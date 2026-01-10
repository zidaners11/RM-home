
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
  }, [refreshTrigger, config]);

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

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/5 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-blue-400 font-black text-[9px] uppercase tracking-[0.4em] animate-pulse">Sincronizando Videowall Sentinel...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 h-full pb-32 overflow-y-auto no-scrollbar px-1">
       
       {/* SECCIÓN DE CÁMARAS - PRIORIDAD 1 */}
       <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
             <div className="flex items-center gap-4">
                <div className="w-2 h-8 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white italic">Live_Visual_Matrix</h2>
             </div>
             <span className="text-[10px] font-mono text-blue-400/60 uppercase tracking-widest">{cameraEntities.length} Feeds Activos</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
             {cameraEntities.map((id) => {
               const state = states.find(s => s.entity_id === id);
               return (
                 <div key={id} className="glass rounded-[35px] overflow-hidden group border border-white/5 relative bg-black shadow-2xl aspect-video transition-all hover:border-blue-500/40">
                   <img 
                      src={getCameraUrl(id)} 
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-all duration-700"
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
                   <div className="absolute bottom-4 right-4 text-[7px] font-mono text-white/30 uppercase">
                      SECURED_FEED_{id.split('.')[1].substring(0,4)}
                   </div>
                 </div>
               );
             })}
          </div>
       </div>

       {/* LOG DE SENSORES - PRIORIDAD 2 */}
       <div className="space-y-6 mt-6">
          <div className="flex items-center gap-4 px-2">
             <div className="w-2 h-8 bg-red-600 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
             <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white italic">Perimeter_Sensors</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
             {sensorEntities.map((id) => {
               const state = states.find(s => s.entity_id === id);
               const isActive = state?.state === 'on';
               return (
                 <div key={id} className={`p-4 rounded-[28px] border transition-all flex flex-col justify-between h-[100px] ${isActive ? 'bg-red-500/10 border-red-500/40' : 'bg-black/40 border-white/5'}`}>
                    <p className="text-[8px] font-black text-white/40 uppercase truncate">{state?.attributes.friendly_name || id.split('.')[1]}</p>
                    <div className="flex justify-between items-end">
                       <span className={`text-[9px] font-black ${isActive ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>{isActive ? 'ALERT' : 'OK'}</span>
                       <svg className={`w-5 h-5 ${isActive ? 'text-red-500' : 'text-white/10'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2"/></svg>
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
