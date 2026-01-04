
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
import { getCloudSyncConfig, DEFAULT_HA_URL, DEFAULT_HA_TOKEN } from './homeAssistantService';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<string>('');
  const [activeSection, setActiveSection] = useState<AppSection>(AppSection.DASHBOARD);
  const [showAI, setShowAI] = useState<boolean>(false);
  const [bgUrl, setBgUrl] = useState<string>('https://i.redd.it/6qq8lk9qjqp21.jpg');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('Iniciando...');

  const syncUserConfig = useCallback(async (username: string) => {
    setIsSyncing(true);
    setSyncStatus('Conectando con la nube...');
    
    // 1. DETERMINAR LA MEJOR URL PARA BUSCAR
    let haUrl = DEFAULT_HA_URL;
    let haToken = DEFAULT_HA_TOKEN;
    
    const savedLocalHA = localStorage.getItem('nexus_ha_config');
    if (savedLocalHA) {
      try {
        const local = JSON.parse(savedLocalHA);
        // Si el usuario ya tiene una URL propia, es mucho más probable que su config esté allí
        if (local.url && local.token) {
          haUrl = local.url;
          haToken = local.token;
          console.log(`[NEXUS] Usando URL guardada para sincronizar: ${haUrl}`);
        }
      } catch (e) {}
    }

    try {
      // 2. DESCARGA DE LA NUBE
      setSyncStatus('Descargando Verdad Maestra...');
      let cloudConfig = await getCloudSyncConfig(username, haUrl, haToken);
      
      // Fallback: Si no está en su URL personalizada, probar en la de por defecto (por si acaso)
      if (!cloudConfig && haUrl !== DEFAULT_HA_URL) {
        console.log("[NEXUS] Fallback: Buscando en URL por defecto...");
        cloudConfig = await getCloudSyncConfig(username, DEFAULT_HA_URL, DEFAULT_HA_TOKEN);
      }
      
      if (cloudConfig) {
        setSyncStatus('Aplicando configuración...');
        // LA NUBE PREVALECE SIEMPRE
        localStorage.setItem('nexus_ha_config', JSON.stringify(cloudConfig));
        
        if (cloudConfig.custom_bg_url) {
          setBgUrl(cloudConfig.custom_bg_url);
        }
        
        // Notificar a todos los componentes
        window.dispatchEvent(new Event('nexus_config_updated'));
        console.log("[NEXUS] Sincronización completa. Configuración de nube aplicada.");
      } else {
        console.warn("[NEXUS] No se encontró configuración en la nube. Usando última local conocida.");
      }
    } catch (err) {
      console.error("[NEXUS] Error crítico en sincronización:", err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const session = localStorage.getItem('nexus_session_active');
    const storedUser = localStorage.getItem('nexus_user');
    
    if (session === 'true' && storedUser) {
      setUser(storedUser);
      setIsAuthenticated(true);
      syncUserConfig(storedUser);
    }
  }, [syncUserConfig]);

  const handleLogin = async (username: string) => {
    const formalName = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
    localStorage.setItem('nexus_session_active', 'true');
    localStorage.setItem('nexus_user', formalName);
    setUser(formalName);
    setIsAuthenticated(true);
    await syncUserConfig(formalName);
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    window.location.reload();
  };

  if (!isAuthenticated) return <Login onLogin={handleLogin} />;

  return (
    <div 
      className="flex flex-col md:flex-row h-screen w-screen overflow-hidden text-white relative"
      style={{ 
        backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.7), rgba(2, 6, 23, 0.6)), url('${bgUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* OVERLAY DE SINCRONIZACIÓN PRIORITARIO */}
      {isSyncing && (
        <div className="absolute inset-0 z-[1000] bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center gap-8 animate-in fade-in duration-500">
           <div className="relative">
              <div className="w-24 h-24 border-4 border-blue-500/10 rounded-full" />
              <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin shadow-[0_0_40px_rgba(59,130,246,0.4)]" />
           </div>
           <div className="text-center space-y-3">
             <h3 className="text-blue-400 font-black text-sm uppercase tracking-[0.6em] animate-pulse">Nexus Cloud Sync</h3>
             <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest">{syncStatus}</p>
           </div>
        </div>
      )}

      <div className="absolute inset-0 bg-black/30 pointer-events-none z-0" />
      
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
        onLogout={handleLogout} 
        onForceSync={() => syncUserConfig(user)} 
      />
      
      <main className="flex-1 relative z-10 p-4 md:p-8 flex flex-col h-full overflow-hidden">
        <header className="flex justify-between items-center mb-8 px-2 shrink-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-light tracking-tight text-white/90">
              RM <span className="font-bold text-blue-400">Home</span> Hub
            </h1>
            <div className="flex items-center gap-3 mt-1">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
               <p className="text-white/40 text-[9px] uppercase tracking-[0.4em] font-black">Nexus OS // Perfil: {user} // Cloud: ONLINE</p>
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
