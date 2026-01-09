
import React, { useState } from 'react';

interface LoginProps {
  onLogin: (user: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validUsers = ['juanmi', 'noemi'];
    const masterPass = 'Juanmi0709@';

    if (validUsers.includes(username.toLowerCase()) && password === masterPass) {
      const formalName = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
      localStorage.setItem('nexus_user', formalName);
      onLogin(formalName);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl" />
      <form onSubmit={handleSubmit} className="relative z-10 glass rounded-[60px] p-12 w-full max-w-md flex flex-col items-center gap-10 border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)]">
        <div className="w-32 h-32 bg-blue-600 rounded-[45px] flex items-center justify-center shadow-2xl animate-pulse">
           <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
           </svg>
        </div>
        <div className="text-center">
          <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">RM Home OS</h2>
          <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.5em] mt-2">Acceso Reservado Personal</p>
        </div>
        <div className="w-full space-y-4">
          <input 
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-3xl px-8 py-5 text-white outline-none focus:ring-2 focus:ring-blue-500/30 font-bold"
            placeholder="USUARIO RM"
          />
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-3xl px-8 py-5 text-white outline-none focus:ring-2 focus:ring-blue-500/30 font-bold"
            placeholder="CONTRASEÑA RM"
          />
        </div>
        {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest animate-bounce">Credenciales Inválidas</p>}
        <button type="submit" className="w-full py-6 bg-blue-600 text-white rounded-[35px] font-black uppercase tracking-[0.5em] text-[12px] shadow-2xl hover:scale-105 active:scale-95 transition-all">
          AUTORIZAR RM NÚCLEO
        </button>
      </form>
    </div>
  );
};

export default Login;
