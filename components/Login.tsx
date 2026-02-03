
import React, { useState } from 'react';
import { logAccessFailure, recordAuthAudit, DEFAULT_HA_URL, DEFAULT_HA_TOKEN } from '../homeAssistantService';

interface LoginProps {
  onLogin: (user: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userLower = username.toLowerCase().trim();
    const validUsers = ['juanmi', 'noemi'];
    const masterPass = 'Juanmi0709@';

    if (validUsers.includes(userLower) && password === masterPass) {
      const formalName = userLower.charAt(0).toUpperCase() + userLower.slice(1);
      
      // Log de éxito para Nginx
      await recordAuthAudit(formalName, 'success');
      
      localStorage.setItem('nexus_user', formalName);
      if (rememberMe) {
        localStorage.setItem('nexus_remember', 'true');
        localStorage.setItem('nexus_session_active', 'true');
      }
      onLogin(formalName);
    } else {
      setError(true);
      const savedConfig = localStorage.getItem('nexus_ha_config');
      let url = DEFAULT_HA_URL;
      let token = DEFAULT_HA_TOKEN;
      if (savedConfig) {
        try {
          const cfg = JSON.parse(savedConfig);
          if (cfg.url) url = cfg.url;
          if (cfg.token) token = cfg.token;
        } catch(e) {}
      }
      // Log de fallo para CrowdSec y HA
      await logAccessFailure(username || 'anonymous', url, token);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#010409]" />
      <div className="absolute inset-0 bg-cover bg-center opacity-40 blur-sm" style={{ backgroundImage: "url('https://i.redd.it/6qq8lk9qjqp21.jpg')" }} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#010409]/80 to-[#010409]" />
      
      <form 
        onSubmit={handleSubmit} 
        className={`relative z-10 glass rounded-[60px] p-8 md:p-12 w-full max-w-md flex flex-col items-center gap-8 border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] transition-all duration-300 ${error ? 'animate-shake border-red-500/50' : ''}`}
      >
        <div className="relative">
           <div className="w-28 h-28 bg-blue-600 rounded-[40px] flex items-center justify-center shadow-2xl shadow-blue-500/40 border border-blue-400/30">
              <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
           </div>
           <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full border-4 border-[#0a0f19] animate-pulse" />
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter font-orbitron">KAME HOUSE RM</h2>
          <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.4em]">Protocolo de Identificación</p>
        </div>

        <div className="w-full space-y-4">
          <div className="space-y-1">
             <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-4">ID Usuario</label>
             <input 
               type="text" 
               value={username}
               autoComplete="username"
               onChange={(e) => setUsername(e.target.value)}
               className="w-full bg-white/5 border border-white/10 rounded-3xl px-8 py-5 text-white outline-none focus:border-blue-500/50 font-bold transition-all uppercase placeholder:text-white/10"
               placeholder="INTRODUCIR ID"
             />
          </div>
          <div className="space-y-1">
             <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-4">Código Acceso</label>
             <input 
               type="password" 
               value={password}
               autoComplete="current-password"
               onChange={(e) => setPassword(e.target.value)}
               className="w-full bg-white/5 border border-white/10 rounded-3xl px-8 py-5 text-white outline-none focus:border-blue-500/50 font-bold transition-all placeholder:text-white/10"
               placeholder="••••••••••••"
             />
          </div>
        </div>

        <div className="w-full flex items-center justify-between px-2">
           <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)}
                className="hidden"
              />
              <div className={`w-5 h-5 rounded-lg border border-white/20 flex items-center justify-center transition-all ${rememberMe ? 'bg-blue-600 border-blue-400' : 'bg-white/5'}`}>
                 {rememberMe && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest group-hover:text-white/60 transition-colors">Recordar Sesión</span>
           </label>
        </div>

        {error && (
          <div className="w-full py-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
             <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">Acceso Denegado</p>
          </div>
        )}

        <button 
          type="submit" 
          className="w-full py-6 bg-blue-600 text-white rounded-[35px] font-black uppercase tracking-[0.5em] text-[12px] shadow-2xl hover:bg-blue-500 active:scale-95 transition-all mt-2 border border-blue-400/30"
        >
          AUTORIZAR NÚCLEO
        </button>
      </form>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Login;
