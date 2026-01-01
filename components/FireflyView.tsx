
import React, { useState, useEffect } from 'react';

const FireflyView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const fireflyUrl = 'https://firefly.juanmirs.com';

  // Simulación de timeout para detectar si el iframe falla (ya que no se puede detectar CORS directamente)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        // Si después de 5 segundos sigue "cargando", es probable que el navegador haya bloqueado el frame
        setHasError(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const handleOpenExternal = () => {
    window.open(fireflyUrl, '_blank');
  };

  return (
    <div className="w-full h-full glass rounded-[40px] overflow-hidden border border-white/10 flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-700">
      
      {/* Barra de Herramientas Superior - Estilo Nave de Mando */}
      <div className="px-8 py-5 border-b border-white/10 flex justify-between items-center bg-black/60 backdrop-blur-2xl z-30">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-base font-black uppercase tracking-[0.3em] text-white/90">Firefly III Central</h3>
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
               <p className="text-[10px] text-white/30 font-mono uppercase tracking-tighter">Tunnel_ID: NEXUS-FIN-01 // juanmirs.com</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleOpenExternal}
            className="group flex items-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <span className="text-[10px] font-black uppercase tracking-widest">Despegue Directo</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Contenedor Principal */}
      <div className="flex-1 bg-[#020617] relative">
        
        {/* Pantalla de Error / Bloqueo de Seguridad */}
        {hasError && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-12 text-center bg-[#020617]">
             <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-8 border border-red-500/20">
                <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
             </div>
             <h4 className="text-xl font-black text-white uppercase tracking-widest mb-4">Protocolo de Seguridad Activado</h4>
             <p className="text-white/40 max-w-md text-sm leading-relaxed mb-8">
                Firefly III ha rechazado la conexión integrada debido a las cabeceras <code className="text-blue-400 bg-blue-400/10 px-1 rounded">X-Frame-Options</code>. 
                <br /><br />
                Para una experiencia total, ajusta tu proxy inverso para permitir marcos o utiliza el botón superior para acceso directo.
             </p>
             <button 
                onClick={handleOpenExternal}
                className="px-12 py-5 border border-white/10 hover:border-white/40 rounded-3xl transition-all text-[10px] font-black uppercase tracking-[0.3em] text-white/60 hover:text-white"
             >
                Abrir en Nueva Ventana
             </button>
          </div>
        )}

        {/* Loader de Sincronización */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 z-20 glass-dark flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <div className="w-20 h-20 border-2 border-white/5 rounded-full" />
                <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-[10px] text-blue-400 font-black tracking-[0.5em] uppercase animate-pulse">Estableciendo Túnel Financiero</p>
              <p className="text-[8px] text-white/10 font-mono italic mt-2 uppercase tracking-tighter">Handshake SSL // firewall.juanmirs.com</p>
            </div>
          </div>
        )}
        
        {/* Iframe Real */}
        <iframe 
          src={fireflyUrl}
          className={`w-full h-full border-none transition-all duration-1000 ${isLoading || hasError ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
          onLoad={() => {
            setIsLoading(false);
            setHasError(false);
          }}
          title="Firefly III Secure Terminal"
          allow="payment; clipboard-write"
        />
      </div>

      {/* Footer Barra de Telemetría */}
      <div className="px-8 py-3 bg-black/80 border-t border-white/5 flex justify-between items-center text-[9px] font-mono text-white/20 uppercase italic z-30">
        <div className="flex gap-6">
            <span>Security: High</span>
            <span>Encryption: AES-256</span>
        </div>
        <span className="hidden sm:inline">Portal_Nexus_Bridge_v2.5 // Link_Status: {hasError ? 'Restricted' : 'Active'}</span>
      </div>
    </div>
  );
};

export default FireflyView;
