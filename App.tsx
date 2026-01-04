
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
    localStorage.setItem('nexus_ha_config', JSON.stringify(config));
    if (config.custom_bg_url) {
      setBgUrl(config.custom_bg_url);
    }
    // Despachar evento para componentes
    setTimeout(() => {
        window.dispatchEvent(new Event('nexus_config_updated'));
    }, 150);
  };

  const startupSequence = useCallback(async (username: string) => {
    setSyncState('syncing');
    
    // 1. Verificar si hay algo local para no dejar la pantalla en blanco si falla HA
    const savedConfigRaw = localStorage.getItem('nexus_ha_config');
    let haUrl = DEFAULT_HA_URL;
    let haToken = DEFAULT_HA_TOKEN;
    
    if (savedConfigRaw) {
      try {
        const parsed = JSON.parse(savedConfigRaw);
        if (parsed.url) haUrl = parsed.url;
        if (parsed.token) haToken = parsed.token;
      } catch (e) {}
    }

    // 2. INTENTO NUBE
    const config = await fetchMasterConfig(username, haUrl, haToken);
    
    if (config) {
      applyConfig(config);
      setSyncState('success');
      setIsAuthenticated(true);
    } else {
      // 3. SI NO HAY NUBE: Ver si podemos entrar con lo local
      if (savedConfigRaw) {
        console.log("[NEXUS] Entrando con caché local. Nube no disponible.");
        setIsAuthenticated(true);
        setSyncState('success');
      } else {
        // Primera vez absoluta
        setSyncState('error');
        setIsAuthenticated(true); // Permitimos entrar para que vaya a ajustes
      }
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
    
    localStorage.setItem('nexus_ session_active', 'true');
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
      <div className="h-screen w-screen bg-[#020617] flex flex-col items-center justify-center" 
           style={{ backgroundImage: `url('${bgUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
         <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl" />
         <div className="relative text-center">
            <div className="w-24 h-24 border-2 border-blue-500/10 rounded-full mx-auto" />
            <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin shadow-[0_0_50px_rgba(59,130,246,0.3)]" />
            <div className="mt-12 space-y-4">
               <h3 className="text-blue-400 font-black text-[11px] uppercase tracking-[0.8em] animate-pulse">Handshake Nube</h3>
               <p className="text-[8px] text-white/30 font-mono uppercase tracking-[0.2em]">Sincronizando Sensor Maestro...</p>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col md:flex-row h-screen w-screen overflow-hidden text-white relative transition-all duration-1000"
      style={{ 
        backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.75), rgba(2, 6, 23, 0.85)), url('${bgUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-black/10 pointer-events-none z-0" />
      
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
               <div className={`w-2 h-2 rounded-full ${syncState === 'error' ? 'bg-orange-500' : 'bg-green-500'} animate-pulse`} />
               <p className="text-white/40 text-[9px] uppercase tracking-[0.4em] font-black">
                  {syncState === 'error' ? 'MODO LOCAL: Sincronización Pendiente' : `NUBE ACTIVA // ${user}`}
               </p>
            </div>
          </div>
          <button onClick={() => setShowAI(!showAI)} className="flex items-center gap-3 px-6 py-3 glass rounded-full border border-blue-400/20 hover:bg-blue-400/10 transition-all group">
             <span className={`w-2 h-2 rounded-full ${showAI ? 'bg-blue-400 animate-ping' : 'bg-white/20'}`} />
             <span className="text-[10px] font-black uppercase tracking-widest">Protocolo IA</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar animate-in fade-in zoom-in-95 duration-1000">
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
