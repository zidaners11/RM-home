
import React, { useState, useEffect, useCallback } from 'react';
import { AppSection, HomeAssistantConfig } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import EnergyView from './components/EnergyView';
import VehicleView from './components/VehicleView';
import FinanceView from './components/FinanceView';
import FireflyView from './components/FireflyView';
import SecurityView from './components/SecurityView';
import WeatherView from './components/WeatherView';
import MapView from './components/MapView';
import SheetsView from './components/SheetsView';
import SettingsView from './components/SettingsView';
import AIInsightPanel from './components/AIInsightPanel';
import { getCloudSyncConfig, fetchLocalConfig, DEFAULT_HA_URL, DEFAULT_HA_TOKEN } from './homeAssistantService';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<string>('');
  const [activeSection, setActiveSection] = useState<AppSection>(AppSection.DASHBOARD);
  const [showAI, setShowAI] = useState<boolean>(false);
  const [bgUrl, setBgUrl] = useState<string>('https://i.redd.it/6qq8lk9qjqp21.jpg');
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');

  const applyConfig = (config: any) => {
    localStorage.setItem('nexus_ha_config', JSON.stringify(config));
    if (config.custom_bg_url) {
      setBgUrl(config.custom_bg_url);
    }
    window.dispatchEvent(new Event('nexus_config_updated'));
    setSyncState('success');
  };

  const startupSequence = useCallback(async (username: string) => {
    setSyncState('syncing');
    setSyncMessage(`Iniciando secuencia de enlace para ${username}...`);
    
    // 1. INTENTO ARCHIVO LOCAL (DOCKER VOLUME)
    const localConfig = await fetchLocalConfig();
    if (localConfig) {
      console.log("[NEXUS] Enlace local establecido (Docker).");
      applyConfig(localConfig);
      return;
    }

    // 2. INTENTO CLOUD PROBE (HOME ASSISTANT)
    try {
      const cloudConfig = await getCloudSyncConfig(username, DEFAULT_HA_URL, DEFAULT_HA_TOKEN);
      if (cloudConfig) {
        console.log("[NEXUS] Enlace nube establecido.");
        applyConfig(cloudConfig);
        return;
      }
    } catch (e) {}

    // 3. FALLBACK A CACHE LOCAL (SESSION)
    const cached = localStorage.getItem('nexus_ha_config');
    if (cached) {
      console.log("[NEXUS] Utilizando matriz en caché local.");
      applyConfig(JSON.parse(cached));
      return;
    }

    // SI TODO FALLA
    setSyncState('error');
    setSyncMessage("NO SE DETECTÓ MATRIZ: Ni volumen Docker ni Nube respondieron.");
  }, []);

  useEffect(() => {
    const session = localStorage.getItem('nexus_session_active');
    const storedUser = localStorage.getItem('nexus_user');
    
    if (session === 'true' && storedUser) {
      setUser(storedUser);
      setIsAuthenticated(true);
      startupSequence(storedUser);
    }
  }, [startupSequence]);

  const handleLogin = (username: string) => {
    const formalName = username.trim().toLowerCase() === 'juanmi' ? 'Juanmi' : 
                       username.trim().toLowerCase() === 'noemi' ? 'Noemi' : username;
    
    localStorage.setItem('nexus_session_active', 'true');
    localStorage.setItem('nexus_user', formalName);
    setUser(formalName);
    setIsAuthenticated(true);
    startupSequence(formalName);
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    window.location.reload();
  };

  if (!isAuthenticated) return <Login onLogin={handleLogin} />;

  // PANTALLA DE CARGA / ERROR
  if (syncState === 'syncing') {
    return (
      <div className="h-screen w-screen bg-[#020617] flex flex-col items-center justify-center" style={{ backgroundImage: `url('${bgUrl}')`, backgroundSize: 'cover' }}>
         <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" />
         <div className="relative text-center">
            <div className="w-20 h-20 border-4 border-blue-500/10 rounded-full mx-auto" />
            <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin shadow-[0_0_80px_rgba(59,130,246,0.3)]" />
            <div className="mt-12 space-y-4">
               <h3 className="text-blue-400 font-black text-[10px] uppercase tracking-[0.8em] animate-pulse">Nexus Booting</h3>
               <p className="text-[8px] text-white/20 font-mono uppercase tracking-[0.2em]">{syncMessage}</p>
            </div>
         </div>
      </div>
    );
  }

  if (syncState === 'error') {
     return (
       <div className="h-screen w-screen bg-[#020617] flex items-center justify-center p-8" style={{ backgroundImage: `url('${bgUrl}')`, backgroundSize: 'cover' }}>
          <div className="absolute inset-0 bg-black/85 backdrop-blur-3xl" />
          <div className="relative z-10 glass p-12 rounded-[50px] border border-white/10 max-w-lg text-center">
             <div className="w-16 h-16 bg-red-500/10 rounded-[25px] flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             </div>
             <h2 className="text-xl font-black uppercase tracking-widest text-white mb-4">Fallo de Matriz</h2>
             <p className="text-white/40 text-[10px] mb-10 leading-relaxed font-mono px-4">{syncMessage}</p>
             <div className="flex flex-col gap-4">
                <button onClick={() => startupSequence(user)} className="w-full py-5 bg-blue-600 rounded-[30px] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:scale-105 transition-all">REINTENTAR ENLACE</button>
                <button onClick={handleLogout} className="text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-white mt-4">Cerrar Sesión</button>
             </div>
          </div>
       </div>
     );
  }

  return (
    <div 
      className="flex flex-col md:flex-row h-screen w-screen overflow-hidden text-white relative transition-all duration-1000"
      style={{ 
        backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.7), rgba(2, 6, 23, 0.75)), url('${bgUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-black/20 pointer-events-none z-0" />
      
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
        onLogout={handleLogout} 
        onForceSync={() => startupSequence(user)} 
      />
      
      <main className="flex-1 relative z-10 p-4 md:p-8 flex flex-col h-full overflow-hidden">
        <header className="flex justify-between items-center mb-8 px-2 shrink-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-light tracking-tight text-white/90">
              RM <span className="font-bold text-blue-400">Home</span> Hub
            </h1>
            <div className="flex items-center gap-3 mt-1">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
               <p className="text-white/40 text-[9px] uppercase tracking-[0.4em] font-black">Nexus OS // {user} // Sync: VERIFIED</p>
            </div>
          </div>
          <button onClick={() => setShowAI(!showAI)} className="flex items-center gap-3 px-6 py-3 glass rounded-full border border-blue-400/20 hover:bg-blue-400/10 transition-all group">
             <span className={`w-2 h-2 rounded-full ${showAI ? 'bg-blue-400 animate-ping' : 'bg-white/20'}`} />
             <span className="text-[10px] font-black uppercase tracking-widest">IA Strategic</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar animate-in fade-in duration-1000">
           {activeSection === AppSection.DASHBOARD && <Dashboard key="dash" />}
           {activeSection === AppSection.ENERGY && <EnergyView key="energy" />}
           {activeSection === AppSection.VEHICLE && <VehicleView key="vehicle" />}
           {activeSection === AppSection.FINANCE && <FinanceView key="finance" />}
           {activeSection === AppSection.FIREFLY && <FireflyView key="firefly" />}
           {activeSection === AppSection.SECURITY && <SecurityView key="security" />}
           {activeSection === AppSection.WEATHER && <WeatherView key="weather" />}
           {activeSection === AppSection.MAPS && <MapView key="maps" />}
           {activeSection === AppSection.SHEETS && <SheetsView key="sheets" />}
           {activeSection === AppSection.SETTINGS && <SettingsView key="settings" />}
        </div>
      </main>
      
      {showAI && <AIInsightPanel onClose={() => setShowAI(false)} />}
    </div>
  );
};

export default App;
