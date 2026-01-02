
import React, { useState, useEffect } from 'react';
import { DEFAULT_HA_URL, DEFAULT_HA_TOKEN, getCloudSyncConfig, notifyAuthorizationRequest, fetchHAStates } from '../homeAssistantService';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [authStep, setAuthStep] = useState<'form' | 'waiting' | 'syncing'>('form');

  useEffect(() => {
    const savedUser = localStorage.getItem('nexus_ha_user_link');
    if (!savedUser) setIsFirstRun(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);

    if (isFirstRun) {
      if (username.length < 2) {
        setErrorMsg('Introduce un ID de usuario válido');
        setError(true);
        return;
      }
      
      setAuthStep('waiting');
      await notifyAuthorizationRequest(username);
      
      setTimeout(async () => {
        localStorage.setItem('nexus_ha_user_link', username);
        localStorage.setItem('nexus_authorized', 'true');
        
        setAuthStep('syncing');
        const cloudData = await getCloudSyncConfig(DEFAULT_HA_URL, DEFAULT_HA_TOKEN);
        if (cloudData) {
          localStorage.setItem('nexus_ha_config', JSON.stringify(cloudData.ha));
          localStorage.setItem('nexus_dashboard_widgets_v4', JSON.stringify(cloudData.widgets));
          localStorage.setItem('nexus_firefly_config', JSON.stringify(cloudData.ff));
        }
        onLogin();
      }, 4000);
      return;
    }

    try {
      const states = await fetchHAStates();
      const person = states.find((s: any) => 
        s.entity_id.startsWith('person.') && 
        (s.attributes.friendly_name?.toLowerCase() === username.toLowerCase() || s.entity_id.includes(username.toLowerCase()))
      );

      if (person) {
        onLogin();
      } else {
        setErrorMsg('USUARIO NO RECONOCIDO');
        setError(true);
      }
    } catch (e) {
      setErrorMsg('FALLO DE CONEXIÓN CON HA CORE');
      setError(true);
    }
  };

  if (authStep === 'waiting') {
    return (
      <div className="h-screen w-screen flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-3xl" />
        <div className="relative z-10 glass rounded-[60px] p-16 w-full max-w-lg text-center border-t border-blue-500/30 flex flex-col items-center gap-10">
           <div className="w-24 h-24 bg-blue-600 rounded-[35px] flex items-center justify-center shadow-[0_0_60px_rgba(59,130,246,0.6)] animate-pulse rotate-12">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
           </div>
           <div className="space-y-4">
              <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">Protocolo Handshake</h2>
              <p className="text-white/60 text-sm leading-relaxed max-w-xs mx-auto">
                 Solicitud enviada a <span className="text-blue-400 font-bold">juanmirs@gmail.com</span>. 
                 <br /><br />
                 Autoriza el terminal desde tu dispositivo maestro para sincronizar el perfil.
              </p>
           </div>
           <p className="text-[9px] text-white/20 uppercase tracking-[0.5em] font-black animate-pulse">Waiting for Secure Handshake Ack...</p>
        </div>
      </div>
    );
  }

  if (authStep === 'syncing') {
    return (
      <div className="h-screen w-screen flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" />
        <div className="relative z-10 text-center space-y-12">
           <div className="relative w-40 h-40 mx-auto">
              <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
              <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin" />
           </div>
           <div className="space-y-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-widest">Restaurando Nexus OS</h2>
              <p className="text-[10px] text-blue-400 font-mono uppercase tracking-[0.3em]">Downloading data from Nabu Casa Cloud...</p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-2xl" />
      
      <form 
        onSubmit={handleSubmit}
        className={`relative z-10 glass rounded-[60px] p-12 w-full max-w-md flex flex-col items-center gap-10 border-t border-white/10`}
      >
        <div className="relative group">
           <div className={`w-32 h-32 rounded-[45px] flex items-center justify-center shadow-2xl transition-all duration-1000 ${isFirstRun ? 'bg-green-600' : 'bg-blue-600'}`}>
             <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isFirstRun ? "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" : "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"} />
             </svg>
           </div>
        </div>

        <div className="text-center">
          <h2 className="text-4xl font-black tracking-tighter text-white uppercase italic leading-none">
            {isFirstRun ? 'Nexus Link' : 'Nexus OS'}
          </h2>
          <p className="text-blue-400 mt-3 text-[10px] font-black uppercase tracking-[0.5em]">
            Terminal Validado por Home Assistant
          </p>
        </div>

        <div className="w-full space-y-8">
          <input 
            autoFocus
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-[35px] px-10 py-6 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-bold text-lg" 
            placeholder="Usuario HA"
          />
          <input 
            type="password" 
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-[35px] px-10 py-6 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-bold text-lg" 
          />
        </div>

        {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">{errorMsg}</p>}

        <button 
          type="submit"
          className="w-full py-7 rounded-[35px] font-black text-[12px] tracking-[0.6em] uppercase shadow-2xl transition-all active:scale-95 bg-blue-600 text-white shadow-blue-500/20 hover:scale-[1.02]"
        >
          {isFirstRun ? 'Sincronizar con Juanmirs' : 'Desbloquear'}
        </button>
      </form>
    </div>
  );
};

export default Login;
