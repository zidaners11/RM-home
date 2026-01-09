
import React, { useState } from 'react';

const SheetsView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const sheetId = '1CH7PHgZUrXuNXb6LlNcARf-w7rPrHj-z8UUeF7KOVxM';
  const gid = '2034898252';
  const embedUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit?gid=${gid}&rm=minimal`;

  return (
    <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none">
      <div className="w-[85vw] h-[85vh] pointer-events-auto glass rounded-[48px] overflow-hidden border border-white/10 flex flex-col shadow-[0_0_120px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-1000">
        
        <div className="px-10 py-6 border-b border-white/10 flex justify-between items-center bg-black/60 backdrop-blur-3xl shrink-0 z-30">
           <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-green-500/10 rounded-[20px] flex items-center justify-center text-green-400 border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                 <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                 </svg>
              </div>
              <div>
                 <h3 className="text-lg font-black uppercase tracking-[0.4em] text-white/90">RM Matriz Logística</h3>
                 <p className="text-[10px] text-white/20 font-mono tracking-tighter uppercase">RM Home OS // Dense_View // GID_{gid}</p>
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="flex flex-col items-end mr-6">
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] text-green-500/60 font-black tracking-widest uppercase">Stream Activo</span>
                 </div>
                 <span className="text-[8px] text-white/10 font-mono">RM_DENSIDAD_AUTO</span>
              </div>
              <button 
                onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${sheetId}`, '_blank')}
                className="group flex items-center gap-3 px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white">RM Editor</span>
                <svg className="w-4 h-4 text-white/20 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
           </div>
        </div>
        
        <div className="flex-1 bg-[#f8f9fa] relative overflow-hidden">
           {isLoading && (
              <div className="absolute inset-0 z-20 glass-dark flex flex-col items-center justify-center gap-8">
                 <div className="relative">
                    <div className="w-20 h-20 border-2 border-white/5 rounded-full" />
                    <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin" />
                 </div>
                 <div className="text-center space-y-2">
                    <p className="text-[10px] text-blue-400 font-black tracking-[0.6em] uppercase">RM: Recalibrando Lentes</p>
                    <p className="text-[9px] text-white/20 font-mono italic">RM factor de escala 0.8x...</p>
                 </div>
              </div>
           )}
           
           <div className="w-full h-full overflow-hidden bg-white">
              <iframe 
                src={embedUrl}
                style={{
                  width: '125%',
                  height: '125%',
                  transform: 'scale(0.8)',
                  transformOrigin: '0 0',
                }}
                className={`border-none transition-all duration-1000 ${isLoading ? 'opacity-0 blur-lg' : 'opacity-100 blur-0'}`}
                onLoad={() => setIsLoading(false)}
                title="RM Google Sheets Bridge"
              />
           </div>
        </div>

        <div className="px-10 py-4 bg-black/80 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-white/10 uppercase italic shrink-0">
           <span>Protocolo: RM_DenseView_v1 // Cifrado: AES-256</span>
           <span className="flex gap-4">
              <span>RM_LATENCY: OK</span>
           </span>
        </div>
      </div>
    </div>
  );
};

export default SheetsView;
