
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
    // Home Assistant requiere el token para el proxy de imagen
    return `${config.url.replace(/\/$/, '')}${state.attributes.entity_picture}&time=${Date.now()}`;
  };

  const cameraEntities = config?.security_cameras || [];
  const sensorEntities = config?.security_sensors || [];

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/5 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-white/20 font-mono text-[9px] uppercase tracking-[0.3em]">Cargando Matriz Sentinel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
       {/* Sección de Cámaras */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cameraEntities.length > 0 ? cameraEntities.map((id) => {
            const state = states.find(s => s.entity_id === id);
            return (
              <div key={id} className="glass rounded-[40px] overflow-hidden group border border-white/5 relative bg-black">
                <div className="aspect-video relative overflow-hidden">
                   <img 
                      src={getCameraUrl(id)} 
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-1000"
                      onError={(e) => { (e.target as any).src = 'https://via.placeholder.com/800x450/020617/ffffff?text=STREAM_OFFLINE'; }}
                      alt={id}
                   />
                   <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] pointer-events-none opacity-20" />
                   <div className="absolute top-6 left-6 flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse border border-white/20" />
                      <div className="px-3 py-1 glass-dark rounded-full border border-white/10">
                         <p className="text-[10px] font-black uppercase tracking-widest text-white/80">
                            {state?.attributes.friendly_name || id}
                         </p>
                      </div>
                   </div>
                   <div className="absolute bottom-6 right-6 text-white/30 text-[9px] font-mono uppercase tracking-widest">
                      Sentinel_ID: {id.split('.')[1]} // {new Date().toLocaleTimeString()}
                   </div>
                </div>
                <div className="p-4 bg-white/5 flex justify-between items-center border-t border-white/5">
                   <div className="flex gap-4">
                      <div className="text-[8px] text-white/40 uppercase font-black tracking-widest">Estatus: <span className="text-blue-400">ONLINE</span></div>
                      <div className="text-[8px] text-white/40 uppercase font-black tracking-widest">Detección: <span className="text-green-400">READY</span></div>
                   </div>
                   <button className="text-white/20 hover:text-white transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
                   </button>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-2 py-20 glass rounded-[40px] border border-dashed border-white/10 flex flex-col items-center">
               <svg className="w-12 h-12 text-white/10 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeWidth="1.5"/></svg>
               <p className="text-white/20 uppercase text-[10px] tracking-widest font-black">No hay cámaras vinculadas en el Nexo</p>
            </div>
          )}
       </div>

       {/* Sección de Sensores de Seguridad */}
       <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {sensorEntities.map((id) => {
            const state = states.find(s => s.entity_id === id);
            const isActive = state?.state === 'on';
            return (
              <div key={id} className={`glass p-6 rounded-[32px] border transition-all duration-500 ${isActive ? 'bg-red-500/10 border-red-500/40 shadow-lg shadow-red-500/20 animate-pulse' : 'border-white/5 hover:border-white/10'}`}>
                 <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 transition-colors ${isActive ? 'bg-red-500 text-white' : 'bg-white/5 text-white/20'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                 </div>
                 <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1 truncate">{state?.attributes.friendly_name || id}</p>
                 <p className={`text-xs font-black uppercase ${isActive ? 'text-red-400' : 'text-blue-400'}`}>
                    {isActive ? 'DETECTADO' : 'LIMPIO'}
                 </p>
              </div>
            );
          })}
       </div>
    </div>
  );
};

export default SecurityView;
