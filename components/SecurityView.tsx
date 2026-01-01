
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

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/5 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-blue-400 font-black text-[9px] uppercase tracking-[0.4em] animate-pulse">Iniciando Protocolos Sentinel...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0 pb-24 lg:pb-6 overflow-hidden">
       
       {/* PANEL CENTRAL: VIDEOWALL */}
       <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
          <div className="flex items-center justify-between px-4">
             <div className="flex items-center gap-4">
                <div className="w-2 h-8 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white/90">VideoWall_Alpha</h2>
             </div>
             <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">{cameraEntities.length} Streams_Active</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {cameraEntities.length > 0 ? cameraEntities.map((id) => {
               const state = states.find(s => s.entity_id === id);
               return (
                 <div key={id} className="glass rounded-[40px] overflow-hidden group border border-white/5 relative bg-black shadow-2xl">
                   <div className="aspect-video relative overflow-hidden">
                      <img 
                         src={getCameraUrl(id)} 
                         className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000"
                         onError={(e) => { (e.target as any).src = 'https://via.placeholder.com/800x450/020617/ffffff?text=STREAM_LOST'; }}
                         alt={id}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute top-6 left-6 flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                         <div className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/80">
                               {state?.attributes.friendly_name || id.split('.')[1].replace('_', ' ')}
                            </p>
                         </div>
                      </div>
                      <div className="absolute bottom-6 left-6 flex gap-2">
                         <div className="px-2 py-1 bg-blue-600/20 backdrop-blur-md rounded border border-blue-500/30 text-[8px] font-black text-blue-400 uppercase tracking-widest">NV_ENCRYPTED</div>
                         <div className="px-2 py-1 bg-white/5 backdrop-blur-md rounded border border-white/10 text-[8px] font-black text-white/40 uppercase tracking-widest">LIVE_DENSE</div>
                      </div>
                   </div>
                   <div className="p-4 bg-white/[0.02] flex justify-between items-center border-t border-white/5 text-[9px] font-mono text-white/20 uppercase">
                      <span>CH_0{cameraEntities.indexOf(id) + 1}</span>
                      <div className="flex gap-4">
                         <span>SEC_LEVEL_4</span>
                         <button className="hover:text-white transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" strokeWidth="2"/></svg>
                         </button>
                      </div>
                   </div>
                 </div>
               );
             }) : (
               <div className="col-span-2 py-32 glass rounded-[48px] border border-dashed border-white/10 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
                     <svg className="w-8 h-8 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeWidth="1.5"/></svg>
                  </div>
                  <p className="text-white/20 uppercase text-[10px] tracking-[0.4em] font-black">Esperando Enlace de Video</p>
               </div>
             )}
          </div>
       </div>

       {/* PANEL LATERAL: TELEMETRÍA DE ACCESOS Y ENERGÍA */}
       <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0 h-full overflow-hidden">
          <div className="flex items-center gap-4 px-4">
             <div className="w-2 h-8 bg-red-600 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
             <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white/90">Estatus_Perimetral</h2>
          </div>

          <div className="flex-1 glass rounded-[48px] border border-white/10 p-8 flex flex-col min-h-[400px] overflow-y-auto no-scrollbar">
             <div className="space-y-4">
                {sensorEntities.length > 0 ? sensorEntities.map((id) => {
                  const state = states.find(s => s.entity_id === id);
                  const isActive = state?.state === 'on';
                  const battery = state?.attributes?.battery_level || state?.attributes?.battery || null;
                  const isLowBattery = battery !== null && battery < 20;

                  return (
                    <div key={id} className={`group p-5 rounded-[32px] border transition-all duration-500 relative overflow-hidden flex flex-col gap-4 ${isActive ? 'bg-red-500/10 border-red-500/40 shadow-lg shadow-red-500/10' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
                       
                       <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-white/20'}`}>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isActive ? "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" : "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"} />
                                </svg>
                             </div>
                             <div>
                                <p className="text-[11px] font-black text-white uppercase tracking-tight line-clamp-1">{state?.attributes.friendly_name || id.split('.')[1].replace('_', ' ')}</p>
                                <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${isActive ? 'text-red-400' : 'text-blue-400/60'}`}>
                                   {isActive ? 'ALERTA: ABIERTO' : 'ASEGURADO'}
                                </p>
                             </div>
                          </div>
                          
                          {/* Monitor de Batería */}
                          {battery !== null && (
                            <div className="flex flex-col items-end">
                               <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-black tabular-nums ${isLowBattery ? 'text-red-500' : 'text-white/40'}`}>
                                     {battery}%
                                  </span>
                                  <div className={`w-5 h-2.5 rounded-[3px] border p-0.5 flex relative ${isLowBattery ? 'border-red-500/40' : 'border-white/20'}`}>
                                     <div className={`h-full rounded-[1px] transition-all ${isLowBattery ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${battery}%` }} />
                                     <div className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-1 h-1.5 rounded-r-[1px] ${isLowBattery ? 'bg-red-500/40' : 'bg-white/20'}`} />
                                  </div>
                               </div>
                               <span className="text-[7px] font-black text-white/10 uppercase tracking-widest mt-1">Power_Node</span>
                            </div>
                          )}
                       </div>

                       {/* Barra de estado visual inferior */}
                       <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${isActive ? 'w-full bg-red-500' : 'w-0 bg-blue-500'}`} />
                       </div>
                    </div>
                  );
                }) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center opacity-20">
                     <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="1.5"/></svg>
                     <p className="text-[9px] font-black uppercase tracking-widest">No hay sensores de acceso configurados</p>
                  </div>
                )}
             </div>

             <div className="mt-auto pt-10">
                <div className="p-6 bg-blue-600/5 border border-blue-500/20 rounded-[32px] flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-white uppercase tracking-widest">Estado de Red</p>
                      <p className="text-[9px] text-blue-400/60 font-mono uppercase">Sentinel_Handshake_OK</p>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

export default SecurityView;
