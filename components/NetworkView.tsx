
import React, { useState, useEffect } from 'react';
import { HomeAssistantConfig, AppSection } from '../types';
import { fetchHAStates } from '../homeAssistantService';

const NetworkView: React.FC = () => {
  const [states, setStates] = useState<any[]>([]);
  const [config, setConfig] = useState<HomeAssistantConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('nexus_ha_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setConfig(parsed);
      refreshData(parsed);
      const interval = setInterval(() => refreshData(parsed), 15000);
      return () => clearInterval(interval);
    }
  }, []);

  const refreshData = async (cfg: HomeAssistantConfig) => {
    const data = await fetchHAStates(cfg.url, cfg.token);
    if (data) setStates(data);
    setLoading(false);
  };

  const getEntity = (id: string) => states.find(s => s.entity_id === id);

  const handleLaunchRadarr = () => {
    // Disparamos un evento para cambiar de sección en App.tsx o simplemente informamos
    window.dispatchEvent(new CustomEvent('nexus_section_change', { detail: AppSection.RADARR }));
  };

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-2 border-white/5 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-blue-400 font-black text-[10px] uppercase tracking-[0.4em] animate-pulse">Sincronizando Network Ops Center...</p>
    </div>
  );

  const net = config?.network;

  return (
    <div className="flex flex-col gap-8 pb-32 animate-in fade-in duration-1000 px-1">
      
      {/* HEADER STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-8 rounded-[40px] border border-white/10 bg-black/40 flex items-center gap-6 shadow-2xl transition-all hover:bg-black/60">
           <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
              <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3m0 0a10.003 10.003 0 0110 10c0 1.956-.563 3.781-1.539 5.318l-.053.09a9.96 9.96 0 01-2.903 2.898m-.001 0l-.053.09A10.003 10.003 0 0112 21c-1.956 0-3.781-.563-5.318-1.539l-.09-.053a9.96 9.96 0 01-2.898-2.903" strokeWidth="2"/></svg>
           </div>
           <div>
              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">AdGuard_DNS</p>
              <h4 className="text-3xl font-black text-white italic font-orbitron">{getEntity(net?.adguard_entities.queries || '')?.state || '0'} <span className="text-[10px] opacity-30 uppercase">req/s</span></h4>
           </div>
        </div>

        <div className="glass p-8 rounded-[40px] border border-white/10 bg-black/40 flex items-center gap-6 shadow-2xl transition-all hover:bg-black/60">
           <div className="w-16 h-16 bg-red-600/20 rounded-2xl flex items-center justify-center border border-red-500/30">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeWidth="2"/></svg>
           </div>
           <div>
              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">CrowdSec_Shield</p>
              <h4 className="text-3xl font-black text-red-500 italic font-orbitron">{getEntity(net?.crowdsec_entities.banned_ips || '')?.state || '0'} <span className="text-[10px] opacity-30 uppercase">bans</span></h4>
           </div>
        </div>

        <div className="glass p-8 rounded-[40px] border border-white/10 bg-black/40 flex items-center gap-6 shadow-2xl transition-all hover:bg-black/60">
           <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center border border-green-500/30">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" strokeWidth="2"/></svg>
           </div>
           <div>
              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Docker_Dozzle</p>
              <h4 className="text-3xl font-black text-green-500 italic font-orbitron">{getEntity(net?.dozzle_entities.containers_active || '')?.state || '0'} <span className="text-[10px] opacity-30 uppercase">active</span></h4>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* UPTIME KUMA MONITOR */}
        <div className="glass rounded-[50px] border border-white/10 bg-black/40 p-8 flex flex-col gap-6 shadow-2xl">
           <div className="flex justify-between items-center px-2">
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-400 italic">UPTIME_KUMA_MATRIX</h3>
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                 <span className="text-[8px] font-mono text-white/20">LIVE_PULSE_NOMINAL</span>
              </div>
           </div>
           <div className="space-y-3">
              {(net?.uptime_kuma_entities || []).map((id) => {
                const s = getEntity(id);
                const isOnline = s?.state === 'on' || s?.state === 'up' || s?.state === 'online';
                return (
                  <div key={id} className="flex items-center justify-between p-5 rounded-[25px] bg-white/[0.03] border border-white/5 hover:border-blue-500/30 transition-all group">
                     <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full transition-all duration-500 ${isOnline ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`} />
                        <span className="text-[11px] font-black text-white/90 uppercase truncate max-w-[150px]">{s?.attributes.friendly_name || id.split('.')[1]}</span>
                     </div>
                     <span className={`text-[9px] font-black uppercase tracking-widest ${isOnline ? 'text-green-400' : 'text-red-500'}`}>{isOnline ? 'ESTABLE' : 'CRITICAL_OFF'}</span>
                  </div>
                )
              })}
           </div>
        </div>

        {/* RADAR / RADARR MOVIE SERVER */}
        <div className="glass rounded-[50px] border border-white/10 bg-black/40 p-8 flex flex-col gap-6 shadow-2xl">
           <div className="flex justify-between items-center px-2">
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-yellow-500 italic">RADARR_SYSTEM_LOG</h3>
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-ping" />
                 <span className="text-[8px] font-mono text-white/20">SYNC_NAS_CORE</span>
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-4 h-full">
              <div className="p-6 rounded-[35px] bg-white/[0.03] border border-white/5 flex flex-col justify-center">
                 <p className="text-[8px] font-black text-white/20 uppercase mb-2">Upcoming_Releases</p>
                 <h5 className="text-4xl font-black text-white italic font-orbitron leading-none">{getEntity(net?.radarr_entities.upcoming || '')?.state || '0'}</h5>
              </div>
              <div className="p-6 rounded-[35px] bg-white/[0.03] border border-white/5 flex flex-col justify-center">
                 <p className="text-[8px] font-black text-white/20 uppercase mb-2">Volume_Disk_Space</p>
                 <h5 className="text-xl font-black text-yellow-500 italic font-orbitron">{getEntity(net?.radarr_entities.disk_space || '')?.state || '0'}</h5>
              </div>
           </div>

           <button 
            onClick={handleLaunchRadarr}
            className="w-full py-5 bg-yellow-600/10 border-2 border-yellow-500/30 rounded-[30px] text-[10px] font-black text-yellow-500 uppercase tracking-[0.5em] hover:bg-yellow-500/20 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
           >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              ABRIR_INTERFAZ_CINE_INTEGRADA
           </button>
        </div>

      </div>

      {/* SEGURIDAD AVANZADA (ADGUARD) */}
      <div className="glass rounded-[50px] border border-white/10 bg-black/40 p-10 shadow-2xl transition-all hover:bg-black/60">
         <div className="flex flex-col md:flex-row gap-10 items-center">
            <div className="relative shrink-0">
               <div className="w-24 h-24 bg-blue-600/10 rounded-[35px] flex items-center justify-center border border-blue-500/20 shadow-2xl">
                  <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeWidth="2"/></svg>
               </div>
               <div className="absolute -bottom-2 -right-2 px-3 py-1 bg-green-500 rounded-lg text-[8px] font-black text-white uppercase tracking-widest shadow-lg">SHIELD_ACTIVE</div>
            </div>
            <div className="flex-1 text-center md:text-left">
               <h3 className="text-xl font-black text-white uppercase italic tracking-widest mb-4 font-orbitron">Protocolo AdGuard_Home Activo</h3>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                     <p className="text-[8px] font-black text-white/30 uppercase mb-1">Bloqueos_Totales</p>
                     <p className="text-2xl font-black text-blue-400 font-orbitron">{getEntity(net?.adguard_entities.blocked || '')?.state || '0'}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                     <p className="text-[8px] font-black text-white/30 uppercase mb-1">Ratio_Eficiencia</p>
                     <p className="text-2xl font-black text-green-400 font-orbitron">{getEntity(net?.adguard_entities.ratio || '')?.state || '0'}%</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                     <p className="text-[8px] font-black text-white/30 uppercase mb-1">Protocolos_SSL</p>
                     <p className="text-2xl font-black text-white font-orbitron">TLS_1.3</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                     <p className="text-[8px] font-black text-white/30 uppercase mb-1">Latencia_DOH</p>
                     <p className="text-2xl font-black text-white font-orbitron">12<span className="text-xs opacity-40">ms</span></p>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default NetworkView;
