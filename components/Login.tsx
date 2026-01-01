
import React, { useState, useEffect } from 'react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isNewSystem, setIsNewSystem] = useState(false);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('nexus_user_db');
    if (!savedUser) {
      setIsNewSystem(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isNewSystem) {
      if (username.length < 4 || password.length < 6) {
        setErrorMsg('Mínimo 4 caracteres de usuario y 6 de clave.');
        setError(true);
        setTimeout(() => setError(false), 2000);
        return;
      }
      localStorage.setItem('nexus_user_db', JSON.stringify({ username, password }));
      onLogin();
      return;
    }

    const savedUser = JSON.parse(localStorage.getItem('nexus_user_db') || '{}');
    if (username === savedUser.username && password === savedUser.password) {
      onLogin();
    } else {
      setErrorMsg('Credenciales Inválidas. Acceso Denegado.');
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="h-screen w-screen nebula-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      
      <form 
        onSubmit={handleSubmit}
        className={`relative z-10 glass rounded-[50px] p-12 w-full max-w-md flex flex-col items-center gap-8 transition-all duration-500 border-t ${error ? 'border-red-500/50 shake-animation' : 'border-white/10 shadow-[0_0_100px_rgba(59,130,246,0.1)]'}`}
      >
        <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center shadow-2xl transition-all duration-1000 ${isNewSystem ? 'bg-green-600 shadow-green-500/40 rotate-0' : 'bg-blue-600 shadow-blue-500/40 rotate-12'}`}>
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isNewSystem ? "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" : "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"} />
          </svg>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">
            {isNewSystem ? 'Inicializar Nexus' : 'Protocolo de Acceso'}
          </h2>
          <p className="text-white/30 mt-2 text-[10px] font-bold uppercase tracking-[0.4em]">
            {isNewSystem ? 'Configuración de Usuario Maestro' : 'Terminal Nexus OS v4.1'}
          </p>
        </div>

        <div className="w-full space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.3em] text-white/20 font-black ml-6">Identificador_ID</label>
            <input 
              autoFocus
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full bg-white/5 border border-white/10 rounded-[24px] px-8 py-5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-white/10 font-bold" 
              placeholder="Admin_User"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.3em] text-white/20 font-black ml-6">Clave_Encriptada</label>
            <input 
              type="password" 
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-white/5 border border-white/10 rounded-[24px] px-8 py-5 text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-bold" 
            />
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
            {errorMsg}
          </div>
        )}

        <button 
          type="submit"
          className={`w-full py-6 rounded-[24px] font-black text-[11px] tracking-[0.5em] uppercase shadow-2xl transition-all active:scale-95 ${isNewSystem ? 'bg-green-600 shadow-green-500/20 text-white' : 'bg-blue-600 shadow-blue-500/20 text-white hover:bg-blue-500'}`}
        >
          {isNewSystem ? 'CREAR NÚCLEO MAESTRO' : 'SINCRONIZAR TERMINAL'}
        </button>

        <div className="pt-4 border-t border-white/5 w-full text-center">
           <p className="text-[9px] text-white/20 uppercase tracking-tighter leading-relaxed">
             {isNewSystem 
               ? 'Estás configurando las credenciales permanentes de este nodo. No las pierdas.' 
               : 'Seguridad AES-256 Bit Protegida por RM Strategic AI Core'}
           </p>
        </div>
      </form>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .shake-animation {
          animation: shake 0.2s ease-in-out 2;
        }
      `}</style>
    </div>
  );
};

export default Login;
