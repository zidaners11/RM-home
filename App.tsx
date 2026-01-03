
import React, { useState, useEffect } from 'react';
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

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<string>('');
  const [activeSection, setActiveSection] = useState<AppSection>(AppSection.DASHBOARD);
  const [showAI, setShowAI] = useState<boolean>(false);
  const [bgUrl, setBgUrl] = useState<string>('https://i.redd.it/6qq8lk9qjqp21.jpg');

  useEffect(() => {
    const session = localStorage.getItem('nexus_session_active');
    const storedUser = localStorage.getItem('nexus_user');
    if (session === 'true' && storedUser) {
      setIsAuthenticated(true);
      setUser(storedUser);
      loadUserConfig();
    }
  }, []);

  const loadUserConfig = () => {
    const savedHA = localStorage.getItem('nexus_ha_config');
    if (savedHA) {
      const config: HomeAssistantConfig = JSON.parse(savedHA);
      if (config.custom_bg_url) {
        setBgUrl(config.custom_bg_url);
      }
    }
  };

  const handleLogin = (username: string) => {
    localStorage.setItem('nexus_session_active', 'true');
    setUser(username);
    setIsAuthenticated(true);
    loadUserConfig();
  };

  const handleLogout = () => {
    localStorage.removeItem('nexus_session_active');
    localStorage.removeItem('nexus_user');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) return <Login onLogin={handleLogin} />;

  const renderContent = () => {
    switch (activeSection) {
      case AppSection.DASHBOARD: return <Dashboard />;
      case AppSection.ENERGY: return <EnergyView />;
      case AppSection.VEHICLE: return <VehicleView />;
      case AppSection.FINANCE: return <FinanceView />;
      case AppSection.FIREFLY: return <FireflyView />;
      case AppSection.SECURITY: return <SecurityView />;
      case AppSection.WEATHER: return <WeatherView />;
      case AppSection.MAPS: return <MapView />;
      case AppSection.SHEETS: return <SheetsView />;
      case AppSection.SETTINGS: return <SettingsView />;
      default: return <Dashboard />;
    }
  };

  return (
    <div 
      className="flex flex-col md:flex-row h-screen w-screen overflow-hidden nebula-bg text-white selection:bg-blue-500/30"
      style={{ backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.5), rgba(2, 6, 23, 0.3)), url('${bgUrl}')` }}
    >
      <div className="fixed inset-0 bg-black/40 z-0" />
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} onLogout={handleLogout} />
      <main className="flex-1 relative z-10 p-3 md:p-6 flex flex-col h-full overflow-hidden pb-24 md:pb-6">
        <header className="flex justify-between items-center mb-6 px-2">
          <div>
            <h1 className="text-xl md:text-2xl font-light tracking-tight text-white/90">
              RM <span className="font-bold text-blue-400">Home</span> Hub
            </h1>
            <p className="text-white/40 text-[8px] uppercase tracking-[0.4em] font-black">Unidad: {user} // Terminal 01</p>
          </div>
          <div className="flex gap-4">
             <button onClick={() => setShowAI(!showAI)} className="flex items-center gap-2 px-4 py-2 glass rounded-full border border-blue-400/30">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">IA Strategic</span>
             </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto no-scrollbar animate-in fade-in duration-700 h-full">{renderContent()}</div>
      </main>
      {showAI && <AIInsightPanel onClose={() => setShowAI(false)} />}
    </div>
  );
};

export default App;
