
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
      try {
        const config: HomeAssistantConfig = JSON.parse(savedHA);
        if (config.custom_bg_url) {
          setBgUrl(config.custom_bg_url);
        }
      } catch (e) {
        console.error("Error loading background", e);
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
    setIsAuthenticated(false);
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
      <div className="absolute inset-0 bg-black/30 pointer-events-none z-0" />
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} onLogout={handleLogout} />
      <main className="flex-1 relative z-10 p-4 md:p-8 flex flex-col h-full overflow-hidden">
        <header className="flex justify-between items-center mb-8 px-2 shrink-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-light tracking-tight text-white/90">
              RM <span className="font-bold text-blue-400">Home</span> Hub
            </h1>
            <p className="text-white/30 text-[9px] uppercase tracking-[0.5em] font-black">Nexus OS // Unidad: {user}</p>
          </div>
          <button onClick={() => setShowAI(!showAI)} className="flex items-center gap-3 px-6 py-3 glass rounded-full border border-blue-400/20 hover:bg-blue-400/10 transition-all group">
             <span className={`w-2 h-2 rounded-full ${showAI ? 'bg-blue-400 animate-ping' : 'bg-white/20'}`} />
             <span className="text-[10px] font-black uppercase tracking-widest">IA Strategic</span>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto no-scrollbar animate-in fade-in duration-1000">
           {activeSection === AppSection.DASHBOARD && <Dashboard />}
           {activeSection === AppSection.ENERGY && <EnergyView />}
           {activeSection === AppSection.VEHICLE && <VehicleView />}
           {activeSection === AppSection.FINANCE && <FinanceView />}
           {activeSection === AppSection.FIREFLY && <FireflyView />}
           {activeSection === AppSection.SECURITY && <SecurityView />}
           {activeSection === AppSection.WEATHER && <WeatherView />}
           {activeSection === AppSection.MAPS && <MapView />}
           {activeSection === AppSection.SHEETS && <SheetsView />}
           {activeSection === AppSection.SETTINGS && <SettingsView />}
        </div>
      </main>
      {showAI && <AIInsightPanel onClose={() => setShowAI(false)} />}
    </div>
  );
};

export default App;
