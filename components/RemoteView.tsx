
import React from 'react';

const RemoteView: React.FC = () => {
  return (
    <div className="h-[75vh] w-full glass rounded-[40px] overflow-hidden border border-white/10 flex flex-col">
       <div className="p-8 flex-1 flex flex-col items-center justify-center text-center gap-6">
          <div className="w-32 h-32 bg-orange-500/10 rounded-[40px] flex items-center justify-center border border-orange-500/20 group">
             <svg className="w-16 h-16 text-orange-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
             </svg>
          </div>
          <div>
             <h2 className="text-2xl font-bold">Puerta de Enlace Remota</h2>
             <p className="text-white/40 max-w-sm mt-2">Acceso seguro a tus servidores Ubuntu via Apache Guacamole con túnel SSL.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full max-w-lg mt-4">
             <button className="glass p-6 rounded-3xl hover:bg-white/10 transition-all border-white/10 group">
                <p className="text-sm font-bold group-hover:text-blue-400 transition-colors">SERVIDOR_UBUNTU_01</p>
                <p className="text-[10px] text-white/30 font-mono mt-1">192.168.1.50 / SSH</p>
             </button>
             <button className="glass p-6 rounded-3xl hover:bg-white/10 transition-all border-white/10 group">
                <p className="text-sm font-bold group-hover:text-blue-400 transition-colors">SERVIDOR_UBUNTU_02</p>
                <p className="text-[10px] text-white/30 font-mono mt-1">192.168.1.51 / RDP</p>
             </button>
          </div>
          <button className="mt-4 px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold transition-all shadow-xl shadow-blue-500/20">
             INICIAR SESIÓN MAESTRA
          </button>
       </div>
    </div>
  );
};

export default RemoteView;
