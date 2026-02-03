
import React, { useState, useEffect } from 'react';
import { HomeAssistantConfig } from '../types';

const RadarrView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [radarrUrl, setRadarrUrl] = useState<string>('');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('nexus_ha_config');
    if (saved) {
      const config: HomeAssistantConfig = JSON.parse(saved);
      if (config.network?.radarr_url) {
        setRadarrUrl(config.network.radarr_url);
      } else {
        setHasError(true);
      }
    }
  }, []);

  const handleOpenExternal = () => {
    if (radarrUrl) window.open(radarrUrl, '_blank');
  };

  if (!radarrUrl && !isLoading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center p-8">
        <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 border border-yellow-500/20">
          <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">Radarr no Configurado</h3>
        <p className="text-white/40 max-w-sm text-xs leading-relaxed">
          Debes definir la URL de acceso a Radarr en el panel de Ajustes - Network.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full glass rounded-[40px] overflow-hidden border border-white/10 flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-700">
      
      <div className="px-8 py-5 border-b border-white/10 flex justify-between items-center bg-black/60 backdrop-blur-2xl z-30">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500 border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-base font-black uppercase tracking-[0.3em] text-white/90">Radarr Cinema Matrix</h3>
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
               <p className="text-[10px] text-white/30 font-mono uppercase tracking-tighter">Terminal: {radarrUrl}</p>
            </div>
          </div>
        </div>

        <button 
          onClick={handleOpenExternal}
          className="flex items-center gap-3 px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-2xl transition-all shadow-lg shadow-yellow-500/20 active:scale-95"
        >
          <span className="text-[10px] font-black uppercase tracking-widest">Abrir Externo</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="flex-1 bg-[#020617] relative">
        {isLoading && (
          <div className="absolute inset-0 z-20 glass-dark flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <div className="w-20 h-20 border-2 border-white/5 rounded-full" />
                <div className="absolute inset-0 border-t-2 border-yellow-500 rounded-full animate-spin" />
            </div>
            <p className="text-[10px] text-yellow-400 font-black tracking-[0.5em] uppercase animate-pulse">Estableciendo Enlace Cinematográfico</p>
          </div>
        )}
        
        <iframe 
          src={radarrUrl}
          className={`w-full h-full border-none transition-all duration-1000 ${isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
          onLoad={() => setIsLoading(false)}
          title="Radarr Web UI"
          allow="clipboard-write"
        />
      </div>

      <div className="px-8 py-3 bg-black/80 border-t border-white/5 flex justify-between items-center text-[9px] font-mono text-white/20 uppercase italic z-30">
        <div className="flex gap-6">
            <span>Status: Online</span>
            <span>Mode: WebUI_Integrated</span>
        </div>
        <span>Nexus_Cinema_Bridge_v1.0</span>
      </div>
    </div>
  );
};

export default RadarrView;
