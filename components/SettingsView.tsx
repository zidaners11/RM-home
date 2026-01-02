
import React, { useState, useEffect } from 'react';
import { HomeAssistantConfig, FireflyConfig, WidgetConfig, WidgetType } from '../types';
import { fetchHAStates, testHAConnection, saveConfigToHA, DEFAULT_HA_URL, DEFAULT_HA_TOKEN } from '../homeAssistantService';

const SettingsView: React.FC = () => {
  const [haConfig, setHaConfig] = useState<HomeAssistantConfig>({
    url: DEFAULT_HA_URL, 
    token: DEFAULT_HA_TOKEN, 
    pinnedEntities: [], solar_production_entity: '', grid_consumption_entity: '', 
    grid_export_entity: '', car_battery_entity: '', invoice_entity: '',
    security_cameras: [], security_sensors: [], temperature_sensors: [], tracked_people: [],
    weather_nodes: {
      torrejon: { id: 'torrejon', name: 'Torrejón de la Calzada' },
      navalacruz: { id: 'navalacruz', name: 'Navalacruz' },
      santibanez: { id: 'santibanez', name: 'Santibáñez el Bajo' }
    }
  });
  const [fireflyConfig, setFireflyConfig] = useState<FireflyConfig>({
    url: '', token: '', use_sheets_mirror: true, sheets_csv_url: ''
  });
  const [dashboardWidgets, setDashboardWidgets] = useState<WidgetConfig[]>([]);
  const [userProfile, setUserProfile] = useState({ username: '', password: '' });

  const [haStates, setHaStates] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done'>('idle');
  const [testStatus, setTestStatus] = useState<{loading: boolean, result: string | null}>({loading: false, result: null});
  const [activeTab, setActiveTab] = useState<'profile' | 'core' | 'desktop' | 'energy' | 'security' | 'weather' | 'finance'>('profile');

  useEffect(() => {
    const savedHA = localStorage.getItem('nexus_ha_config');
    const savedFF = localStorage.getItem('nexus_firefly_config');
    const savedWidgets = localStorage.getItem('nexus_dashboard_widgets_v4');
    const savedUser = localStorage.getItem('nexus_ha_user_link');
    
    if (savedHA) {
      const parsed = JSON.parse(savedHA);
      setHaConfig(prev => ({...prev, ...parsed}));
      loadHAEntities(parsed.url || DEFAULT_HA_URL, parsed.token || DEFAULT_HA_TOKEN);
    } else {
      loadHAEntities(DEFAULT_HA_URL, DEFAULT_HA_TOKEN);
    }
    
    if (savedFF) setFireflyConfig(JSON.parse(savedFF));
    if (savedWidgets) setDashboardWidgets(JSON.parse(savedWidgets));
    if (savedUser) setUserProfile(prev => ({...prev, username: savedUser}));
  }, []);

  const loadHAEntities = async (url: string, token: string) => {
    if (!url || !token) return;
    try {
      const states = await fetchHAStates(url, token);
      if (states) setHaStates(states);
    } catch(e) {}
  };

  const handleCloudSync = async () => {
    setSyncStatus('syncing');
    const fullBundle = {
       ha: haConfig,
       ff: fireflyConfig,
       widgets: dashboardWidgets,
       user: userProfile,
       timestamp: new Date().toISOString()
    };
    const success = await saveConfigToHA(haConfig.url, haConfig.token, fullBundle);
    if (success) {
       setSyncStatus('done');
       setTimeout(() => setSyncStatus('idle'), 3000);
    } else {
       setSyncStatus('idle');
       alert("Error en la sincronización de nube.");
    }
  };

  const handleTestHA = async () => {
    setTestStatus({ loading: true, result: null });
    const res = await testHAConnection(haConfig.url, haConfig.token);
    if (res.success) {
      setTestStatus({ loading: false, result: `OK: v${res.version}` });
      loadHAEntities(haConfig.url, haConfig.token);
    } else {
      setTestStatus({ loading: false, result: `ERROR: ${res.error}` });
    }
    setTimeout(() => setTestStatus({ loading: false, result: null }), 3000);
  };

  const handleSave = () => {
    setStatus('saving');
    localStorage.setItem('nexus_ha_config', JSON.stringify(haConfig));
    localStorage.setItem('nexus_firefly_config', JSON.stringify(fireflyConfig));
    localStorage.setItem('nexus_dashboard_widgets_v4', JSON.stringify(dashboardWidgets));
    
    if (haConfig.url && haConfig.token) handleCloudSync();

    setTimeout(() => {
      setStatus('success');
    }, 800);
    setTimeout(() => setStatus('idle'), 3000);
  };

  const addWidget = () => {
    const newWidget: WidgetConfig = {
      id: Date.now().toString(),
      type: 'sensor',
      title: 'Nuevo Indicador',
      entity_id: '',
      colSpan: 1
    };
    setDashboardWidgets([...dashboardWidgets, newWidget]);
  };

  const removeWidget = (id: string) => {
    setDashboardWidgets(dashboardWidgets.filter(w => w.id !== id));
  };

  const updateWidget = (id: string, updates: Partial<WidgetConfig>) => {
    setDashboardWidgets(dashboardWidgets.map(w => w.id === id ? {...w, ...updates} : w));
  };

  const SearchableEntitySelect = ({ label, value, onChange, filterType, multi = false }: { label: string, value: any, onChange: (val: any) => void, filterType?: string | string[], multi?: boolean }) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    
    const safeStates = haStates || [];
    const filtered = safeStates.filter(s => {
      const matchesType = !filterType || 
        (Array.isArray(filterType) ? filterType.some(t => s.entity_id.startsWith(t)) : s.entity_id.startsWith(filterType));
      const matchesSearch = s.entity_id.toLowerCase().includes(search.toLowerCase()) || 
        (s.attributes.friendly_name || '').toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    }).slice(0, 50);

    const getEntityLabel = (id: string) => safeStates.find(s => s.entity_id === id)?.attributes.friendly_name || id;

    return (
      <div className="space-y-2 relative">
        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-6">{label}</label>
        <div onClick={() => setIsOpen(!isOpen)} className="w-full bg-white/5 border border-white/10 rounded-[24px] px-6 py-4 text-[13px] text-white cursor-pointer flex justify-between items-center hover:bg-white/10 min-h-[56px] transition-all">
          <div className="flex flex-wrap gap-2 text-left">
            {multi ? (
              (value as string[] || []).length > 0 ? (value as string[]).map(v => (
                <span key={v} className="bg-blue-600/40 px-2 py-1 rounded-lg text-[8px] border border-blue-400/30 font-black uppercase tracking-tighter">{getEntityLabel(v)}</span>
              )) : <span className="text-white/10 uppercase font-black tracking-widest text-[9px]">Seleccionar...</span>
            ) : (
              <span className={value ? 'text-white font-bold' : 'text-white/10 uppercase font-black tracking-widest text-[9px]'}>{value ? getEntityLabel(value as string) : 'No seleccionado'}</span>
            )}
          </div>
          <svg className={`w-4 h-4 text-white/30 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        {isOpen && (
          <div className="absolute z-[100] w-full mt-2 glass-dark border border-white/20 rounded-[28px] p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
             <input autoFocus placeholder="Buscar en HA Core..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white mb-4 outline-none focus:border-blue-500/50" />
             <div className="max-h-60 overflow-y-auto space-y-2 no-scrollbar pr-2">
                {filtered.map(s => {
                  const isSelected = multi ? (value as string[] || []).includes(s.entity_id) : value === s.entity_id;
                  return (
                    <button key={s.entity_id} onClick={(e) => { e.stopPropagation(); if (multi) { const current = (value as string[] || []); onChange(isSelected ? current.filter(x => x !== s.entity_id) : [...current, s.entity_id]); } else { onChange(s.entity_id); setIsOpen(false); } }} className={`w-full text-left px-4 py-3 rounded-xl transition-all flex justify-between items-center ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-white/5 text-white/40'}`}>
                      <div className="pointer-events-none text-left">
                        <p className="text-[10px] font-black uppercase tracking-tight">{s.attributes.friendly_name || s.entity_id}</p>
                        <p className="text-[8px] opacity-20 font-mono mt-0.5">{s.entity_id}</p>
                      </div>
                    </button>
                  );
                })}
             </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-6 md:gap-10 animate-in fade-in duration-500 overflow-hidden pb-24">
      
      {/* NAVEGACIÓN DE PESTAÑAS - Títulos Limpios */}
      <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar shrink-0 px-2 py-2">
        {[
          {id: 'profile', label: 'Seguridad y Perfil', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'},
          {id: 'core', label: 'Nexus Handshake', icon: 'M13 10V3L4 14h7v7l9-11h-7z'},
          {id: 'desktop', label: 'Escritorio', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z'},
          {id: 'energy', label: 'Matriz Energía', icon: 'M13 10V3L4 14h7v7l9-11h-7z'},
          {id: 'security', label: 'Sentinel Perimeter', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'},
          {id: 'weather', label: 'Climate Network', icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999'},
          {id: 'finance', label: 'Finance Bridge', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2'}
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`px-6 md:px-8 py-4 md:py-5 rounded-[24px] md:rounded-[28px] text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] transition-all shrink-0 flex items-center gap-3 md:gap-4 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/40 scale-105' : 'glass text-white/30 hover:bg-white/10'}`}
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={tab.icon} /></svg>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-4 no-scrollbar">
        <div className="max-w-6xl mx-auto space-y-12">
          
          {activeTab === 'profile' && (
            <div className="space-y-10">
               <div className="glass rounded-[32px] md:rounded-[48px] p-8 md:p-12 border border-white/10 relative overflow-hidden">
                  <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter italic mb-8 flex items-center gap-4">Vínculo Administrativo</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 ml-6">Usuario HA Vinculado</label>
                        <div className="w-full bg-white/5 border border-white/10 rounded-[24px] px-8 py-5 text-blue-400 font-black text-lg flex justify-between items-center">
                           {userProfile.username || 'Invitado'}
                           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'desktop' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center px-4">
                <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-widest italic">Matriz de Escritorio</h2>
                <button onClick={addWidget} className="px-6 py-3 bg-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Añadir Widget</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dashboardWidgets.map((w) => (
                  <div key={w.id} className="glass rounded-[32px] p-6 md:p-8 border border-white/10 space-y-6 group relative">
                    <button onClick={() => removeWidget(w.id)} className="absolute top-6 right-6 text-white/10 hover:text-red-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" /></svg>
                    </button>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-white/20 ml-4">Etiqueta</label>
                        <input value={w.title} onChange={e => updateWidget(w.id, {title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-white/20 ml-4">Motor</label>
                        <select value={w.type} onChange={e => updateWidget(w.id, {type: e.target.value as WidgetType})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white appearance-none cursor-pointer">
                          <option value="sensor">Sensor</option>
                          <option value="switch">Interruptor</option>
                          <option value="checklist">Lista</option>
                        </select>
                      </div>
                    </div>

                    <SearchableEntitySelect label="Entidad HA Core" value={w.entity_id} onChange={v => updateWidget(w.id, {entity_id: v})} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'energy' && (
            <div className="glass rounded-[32px] md:rounded-[48px] p-8 md:p-12 border border-white/10 space-y-12">
              <h2 className="text-xl md:text-3xl font-black text-yellow-500 uppercase tracking-widest italic">Matriz de Energía</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <SearchableEntitySelect label="Producción Solar" value={haConfig.solar_production_entity || ''} onChange={v => setHaConfig({...haConfig, solar_production_entity: v})} filterType="sensor" />
                <SearchableEntitySelect label="Consumo de Red" value={haConfig.grid_consumption_entity || ''} onChange={v => setHaConfig({...haConfig, grid_consumption_entity: v})} filterType="sensor" />
                <SearchableEntitySelect label="Exportación" value={haConfig.grid_export_entity || ''} onChange={v => setHaConfig({...haConfig, grid_export_entity: v})} filterType="sensor" />
                <SearchableEntitySelect label="Factura Mensual" value={haConfig.invoice_entity || ''} onChange={v => setHaConfig({...haConfig, invoice_entity: v})} filterType="sensor" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center shrink-0 pt-8 border-t border-white/10 px-4">
        <button onClick={handleSave} className="w-full max-w-4xl py-6 md:py-8 bg-blue-600 rounded-[32px] md:rounded-[40px] font-black tracking-[0.4em] text-[10px] md:text-[12px] uppercase shadow-2xl transition-all hover:scale-[1.02] active:scale-95">
          {status === 'saving' ? 'SINCRONIZANDO...' : 'CONFIRMAR CAMBIOS'}
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
