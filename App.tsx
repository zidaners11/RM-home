
import React, { useState, useEffect, useCallback } from 'react';
import { AppSection, HomeAssistantConfig } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import EnergyView from './components/EnergyView';
import VehicleView from './components/VehicleView';
import FinanceView from './components/FinanceView';
import SecurityView from './components/SecurityView';
import WeatherView from './components/WeatherView';
import MapView from './components/MapView';
import SheetsView from './components/SheetsView';
import SettingsView from './components/SettingsView';
import AIInsightPanel from './components/AIInsightPanel';
import { fetchMasterConfig, DEFAULT_HA_URL, DEFAULT_HA_TOKEN } from './homeAssistantService';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<string>('');
  const [activeSection, setActiveSection] = useState<AppSection>(AppSection.DASHBOARD);
  const [showAI, setShowAI] = useState<boolean>(false);
  const [bgUrl, setBgUrl] = useState<string>('https://i.redd.it/6qq8lk9qjqp21.jpg');
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');

  const applyConfig = (config: any) => {
    if (!config) return;
    localStorage.setItem('nexus_ha_config', JSON.stringify(config));
    if (config.custom_bg_url) {
      setBgUrl(config.custom_bg_url);
    }
    setTimeout(() => {
        window.dispatchEvent(new Event('rm_config_updated'));
    }, 150);
  };

  const startupSequence = useCallback(async (username: string) => {
    setSyncState('syncing');
    let haUrl = DEFAULT_HA_URL;
    let haToken = DEFAULT_HA_TOKEN;
    const savedConfigRaw = localStorage.getItem('nexus_ha_config');
    if (savedConfigRaw) {
      try {
        const parsed = JSON.parse(savedConfigRaw);
        if (parsed.url) haUrl = parsed.url;
        if (parsed.token) haToken = parsed.token;
      } catch (e) {}
    }
    try {
      const config = await fetchMasterConfig(username, haUrl, haToken);
      if (config) {
        applyConfig(config);
        setSyncState('success');
      } else {
        setSyncState(savedConfigRaw ? 'success' : 'error');
      }
      setIsAuthenticated(true);
    } catch (err) {
      setSyncState('error');
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    const session = localStorage.getItem('nexus_session_active');
    const storedUser = localStorage.getItem('nexus_user');
    if (session === 'true' && storedUser) {
      setUser(storedUser);
      startupSequence(storedUser);
    }
  }, [startupSequence]);

  const handleLogin = (username: string) => {
    const formalName = username.trim().toLowerCase() === 'juanmi' ? 'Juanmi' : 
                       username.trim().toLowerCase() === 'noemi' ? 'Noemi' : username;
    localStorage.setItem('nexus_session_active', 'true');
    localStorage.setItem('nexus_user', formalName);
    setUser(formalName);
    startupSequence(formalName);
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    window.location.reload();
  };

  if (!isAuthenticated && syncState !== 'syncing') return <Login onLogin={handleLogin} />;

  if (syncState === 'syncing') {
    return (
      <div className="h-screen w-screen bg-[#020617] flex flex-col items-center justify-center relative overflow-hidden">
         <div className="absolute inset-0 bg-cover bg-center opacity-30 blur-xl" style={{ backgroundImage: `url('${bgUrl}')` }} />
         <div className="absolute inset-0 bg-black/80 backdrop-blur-3xl" />
         <div className="relative text-center">
            <div className="w-24 h-24 border-2 border-blue-500/10 rounded-full mx-auto" />
            <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin shadow-[0_0_50px_rgba(59,130,246,0.3)]" />
            <div className="mt-12 space-y-4 px-6">
               <h3 className="text-blue-400 font-black text-[10px] uppercase tracking-[0.5em] animate-pulse">Sincronizando Nexus Hub</h3>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col md:flex-row h-[100dvh] w-screen overflow-hidden text-white relative transition-all duration-1000 bg-cover bg-center bg-fixed bg-no-repeat"
      style={{ 
        backgroundImage: `url('${bgUrl}')`
      }}
    >
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
        onLogout={handleLogout} 
        onForceSync={() => startupSequence(user)} 
      />
      
      <main className="flex-1 relative z-10 flex flex-col h-full overflow-hidden bg-black/10 backdrop-blur-[2px]">
        {/* Header totalmente transparente y pegado arriba (Dynamic Island integration) */}
        <header className="flex justify-between items-center px-6 md:px-8 pb-4 pt-3 md:pt-8 shrink-0">
          <div className="min-w-0">
            <h1 className="text-xl md:text-3xl font-light tracking-tighter text-white/90 truncate">
              NEXUS <span className="font-bold text-blue-400">HUB</span>
            </h1>
            <p className="text-white/20 text-[7px] md:text-[9px] uppercase tracking-[0.5em] font-black truncate">
               {user} // OS_STABLE
            </p>
          </div>
          <button onClick={() => setShowAI(!showAI)} className="p-2.5 glass rounded-full border border-blue-400/20 active:scale-90 transition-all bg-white/5">
             <div className={`w-1.5 h-1.5 rounded-full ${showAI ? 'bg-blue-400 animate-ping' : 'bg-white/40'}`} />
          </button>
        </header>

        {/* Contenedor de scroll que sube hasta arriba y baja hasta el final */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 md:px-8 pb-[calc(65px+env(safe-area-inset-bottom)+20px)] md:pb-8">
           {activeSection === AppSection.DASHBOARD && <Dashboard key="dash" />}
           {activeSection === AppSection.ENERGY && <EnergyView key="energy" />}
           {activeSection === AppSection.VEHICLE && <VehicleView key="vehicle" />}
           {activeSection === AppSection.FINANCE && <FinanceView key="finance" />}
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
