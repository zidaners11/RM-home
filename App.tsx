
import React, { useState, useEffect } from 'react';
import { AppSection } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import EnergyView from './components/EnergyView';
import FinanceView from './components/FinanceView';
import FireflyView from './components/FireflyView';
import SecurityView from './components/SecurityView';
import WeatherView from './components/WeatherView';
import MapView from './components/MapView';
import RemoteView from './components/RemoteView';
import SheetsView from './components/SheetsView';
import SettingsView from './components/SettingsView';
import AIInsightPanel from './components/AIInsightPanel';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<AppSection>(AppSection.DASHBOARD);
  const [showAI, setShowAI] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const session = localStorage.getItem('nexus_session_active');
    if (session === 'true') {
      setIsAuthenticated(true);
    }
    setCheckingAuth(false);
  }, []);

  const handleLogin = () => {
    localStorage.setItem('nexus_session_active', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('nexus_session_active');
    setIsAuthenticated(false);
  };

  if (checkingAuth) return null;

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeSection) {
      case AppSection.DASHBOARD:
        return <Dashboard />;
      case AppSection.ENERGY:
        return <EnergyView />;
      case AppSection.FINANCE:
        return <FinanceView />;
      case AppSection.FIREFLY:
        return <FireflyView />;
      case AppSection.SECURITY:
        return <SecurityView />;
      case AppSection.WEATHER:
        return <WeatherView />;
      case AppSection.MAPS:
        return <MapView />;
      case AppSection.REMOTE:
        return <RemoteView />;
      case AppSection.SHEETS:
        return <SheetsView />;
      case AppSection.SETTINGS:
        return <SettingsView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden nebula-bg text-white selection:bg-blue-500/30">
      <div className="fixed inset-0 bg-black/40 z-0" />
      
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
        onLogout={handleLogout}
      />

      <main className="flex-1 relative z-10 p-3 md:p-6 flex flex-col h-full overflow-hidden pb-24 md:pb-6">
        <header className="flex justify-between items-center mb-3 md:mb-6 shrink-0 px-2">
          <div>
            <h1 className="text-xl md:text-2xl font-light tracking-tight text-white/90">
              RM <span className="font-bold text-blue-400">Home</span>
            </h1>
            <p className="text-white/40 text-[7px] md:text-[9px] uppercase tracking-[0.4em] font-black">Consola de Control // Hub Persistente</p>
          </div>
          
          <button 
            onClick={() => setShowAI(!showAI)}
            className="flex items-center gap-2 px-3 py-1.5 glass rounded-full hover:bg-white/10 transition-all border-blue-400/30 group"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[8px] md:text-xs font-black uppercase tracking-widest">IA Core</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar animate-in fade-in duration-700 h-full">
          {renderContent()}
        </div>
      </main>

      {showAI && (
        <AIInsightPanel onClose={() => setShowAI(false)} />
      )}
    </div>
  );
};

export default App;
