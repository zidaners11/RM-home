
import React from 'react';
import { AppSection } from '../types';

interface SidebarProps {
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
  onLogout: () => void;
  onForceSync?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange, onLogout, onForceSync }) => {
  const menuItems = [
    { id: AppSection.DASHBOARD, icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Inicio' },
    { id: AppSection.ENERGY, icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'Energía' },
    { id: AppSection.VEHICLE, icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10 M16 16h3', label: 'Coche' },
    { id: AppSection.WEATHER, icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z', label: 'Clima' },
    { id: AppSection.FINANCE, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2', label: 'Finanzas' },
    { id: AppSection.SECURITY, icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', label: 'Seguridad' },
    { id: AppSection.MAPS, icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z', label: 'Radar' },
    { id: AppSection.SHEETS, icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: 'Hojas' },
    { id: AppSection.SETTINGS, icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066', label: 'Ajustes' },
  ];

  return (
    <>
      <nav className="hidden md:flex flex-col w-24 bg-black/40 backdrop-blur-3xl border-r border-white/10 z-50 py-8 items-center h-screen shrink-0">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-10 shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <div className="flex-1 w-full flex flex-col gap-4 px-2 items-center overflow-y-auto no-scrollbar">
          {menuItems.map((item) => (
            <button key={item.id} onClick={() => onSectionChange(item.id)} className={`p-3 w-full rounded-2xl transition-all flex flex-col items-center gap-1.5 ${activeSection === item.id ? 'bg-blue-600/20 text-blue-400 border border-blue-400/20' : 'text-white/20 hover:text-white/60 hover:bg-white/5'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
              <span className="text-[7px] uppercase tracking-widest font-black text-center">{item.label}</span>
            </button>
          ))}
          
          <div className="h-px w-8 bg-white/5 my-2" />
          
          <button onClick={onForceSync} className="p-3 w-full rounded-2xl text-white/20 hover:text-blue-400 hover:bg-white/5 transition-all flex flex-col items-center gap-1.5">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
             <span className="text-[6px] uppercase tracking-widest font-black text-center">Sync Cloud</span>
          </button>
        </div>
        
        <button onClick={onLogout} className="p-4 text-white/10 hover:text-red-400 transition-colors mt-6 border-t border-white/5 w-full"><svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg></button>
      </nav>
      
      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-black/90 backdrop-blur-3xl border-t border-white/10 z-[100] flex items-center justify-around px-2 overflow-x-auto no-scrollbar">
        {menuItems.slice(0, 5).map((item) => (
          <button key={item.id} onClick={() => onSectionChange(item.id)} className={`flex flex-col items-center justify-center px-3 h-full gap-1 ${activeSection === item.id ? 'text-blue-400' : 'text-white/20'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
          </button>
        ))}
        <button onClick={onForceSync} className="flex flex-col items-center justify-center px-3 h-full gap-1 text-white/20">
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </nav>
    </>
  );
};

export default Sidebar;
