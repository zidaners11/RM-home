
import React from 'react';
import { AppSection } from '../types';

interface SidebarProps {
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange, onLogout }) => {
  const menuItems = [
    { id: AppSection.DASHBOARD, icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Inicio' },
    { id: AppSection.ENERGY, icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'Energía' },
    { id: AppSection.FINANCE, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Finanzas' },
    { id: AppSection.FIREFLY, icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Firefly' },
    { id: AppSection.WEATHER, icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z', label: 'Clima' },
    { id: AppSection.SECURITY, icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z', label: 'Seguridad' },
    { id: AppSection.MAPS, icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z', label: 'Radar' },
    { id: AppSection.SHEETS, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: 'Hojas' },
    { id: AppSection.SETTINGS, icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', label: 'Ajustes' },
  ];

  return (
    <>
      {/* NAVEGACIÓN DE ESCRITORIO (Sidebar) */}
      <nav className="hidden md:flex flex-col w-28 bg-black/40 backdrop-blur-2xl border-r border-white/10 z-50 py-8 items-center h-screen shrink-0">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30 mb-10 shrink-0">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        
        <div className="flex-1 w-full overflow-y-auto no-scrollbar flex flex-col gap-4 px-2 items-center">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`p-4 w-full rounded-2xl transition-all flex flex-col items-center gap-2 group ${
                activeSection === item.id 
                  ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-400/30 shadow-lg shadow-blue-500/10' 
                  : 'text-white/30 hover:text-white hover:bg-white/5'
              }`}
            >
              <svg className={`w-6 h-6 transition-transform group-hover:scale-110`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className="text-[9px] uppercase tracking-widest font-black text-center">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-white/5 w-full flex flex-col items-center shrink-0">
          <button 
            onClick={onLogout}
            className="p-4 text-white/20 hover:text-red-400 transition-colors group"
            title="Cerrar Sesión"
          >
            <svg className="w-6 h-6 transition-transform group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </nav>

      {/* NAVEGACIÓN MÓVIL (Bottom Bar) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-3xl border-t border-white/10 z-[100] flex items-center px-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 min-w-max h-full">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`flex flex-col items-center justify-center px-5 h-full transition-all gap-1 ${
                activeSection === item.id 
                  ? 'text-blue-400' 
                  : 'text-white/30'
              }`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className="text-[8px] uppercase tracking-widest font-black">{item.label}</span>
              {activeSection === item.id && <div className="w-1 h-1 rounded-full bg-blue-400 mt-0.5" />}
            </button>
          ))}
          <div className="w-px h-8 bg-white/10 mx-2" />
          <button 
            onClick={onLogout}
            className="flex flex-col items-center justify-center px-5 h-full text-red-500/50"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
            </svg>
            <span className="text-[8px] uppercase tracking-widest font-black">Salir</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
