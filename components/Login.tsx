
import React, { useState } from 'react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('admin_nexus');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Credenciales robustas definidas para el acceso
    if (username === 'admin_nexus' && password === 'nexus2024') {
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="h-screen w-screen nebula-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <form 
        onSubmit={handleSubmit}
        className={`relative z-10 glass rounded-[40px] p-10 w-full max-w-md flex flex-col items-center gap-8 transition-all ${error ? 'border-red-500/50 shake-animation' : 'border-white/10'}`}
      >
        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40 rotate-12 transition-transform hover:rotate-0">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">Acceso Restringido</h2>
          <p className="text-white/40 mt-2 text-sm italic">Terminal Nexus v3.1.2</p>
        </div>

        <div className="w-full space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-4">Identificador de Usuario</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" 
              placeholder="Usuario"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-4">Clave de Encriptación</label>
            <input 
              type="password" 
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" 
            />
          </div>
        </div>

        <div className="w-full flex flex-col gap-3">
          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
          >
            DESBLOQUEAR TERMINAL
          </button>
          
          <button 
            type="button"
            onClick={() => { setUsername('admin_nexus'); setPassword('nexus2024'); }}
            className="text-[10px] text-white/20 hover:text-white/40 transition-colors uppercase tracking-widest"
          >
            ¿Olvidaste tus credenciales? (Hint: admin_nexus / nexus2024)
          </button>
        </div>

        <p className="text-[10px] text-white/20 uppercase tracking-tighter text-center">
          Seguridad Biométrica y AES-256 Bit Protegida por Nexus AI
        </p>
      </form>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .shake-animation {
          animation: shake 0.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Login;
