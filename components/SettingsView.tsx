
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
        <div onClick={() => setIsOpen(!isOpen)} className="w-full bg-white/5 border border-white/10 rounded-[28px] px-8 py-5 text-[13px] text-white cursor-pointer flex justify-between items-center hover:bg-white/10 min-h-[64px] transition-all">
          <div className="flex flex-wrap gap-2 text-left">
            {multi ? (
              (value as string[] || []).length > 0 ? (value as string[]).map(v => (
                <span key={v} className="bg-blue-600/40 px-3 py-1 rounded-xl text-[9px] border border-blue-400/30 font-black uppercase tracking-tighter">{getEntityLabel(v)}</span>
              )) : <span className="text-white/10 uppercase font-black tracking-widest text-[10px]">Seleccionar...</span>
            ) : (
              <span className={value ? 'text-white font-bold' : 'text-white/10 uppercase font-black tracking-widest text-[10px]'}>{value ? getEntityLabel(value as string) : 'No seleccionado'}</span>
            )}
          </div>
          <svg className={`w-5 h-5 text-white/30 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        {isOpen && (
          <div className="absolute z-[100] w-full mt-2 glass-dark border border-white/20 rounded-[35px] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
             <input autoFocus placeholder="Buscar en HA Core..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded-2xl px-5 py-4 text-sm text-white mb-6 outline-none focus:border-blue-500/50" />
             <div className="max-h-80 overflow-y-auto space-y-2 no-scrollbar pr-3">
                {filtered.map(s => {
                  const isSelected = multi ? (value as string[] || []).includes(s.entity_id) : value === s.entity_id;
                  return (
                    <button key={s.entity_id} onClick={(e) => { e.stopPropagation(); if (multi) { const current = (value as string[] || []); onChange(isSelected ? current.filter(x => x !== s.entity_id) : [...current, s.entity_id]); } else { onChange(s.entity_id); setIsOpen(false); } }} className={`w-full text-left px-5 py-4 rounded-2xl transition-all flex justify-between items-center ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-white/5 text-white/40'}`}>
                      <div className="pointer-events-none text-left">
                        <p className="text-[11px] font-black uppercase tracking-tight">{s.attributes.friendly_name || s.entity_id}</p>
                        <p className="text-[9px] opacity-20 font-mono mt-1">{s.entity_id}</p>
                      </div>
                      {isSelected && <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
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
    <div className="h-full flex flex-col gap-10 animate-in fade-in duration-500 overflow-hidden pb-24">
      
      {/* NAVEGACIÓN DE PESTAÑAS */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar shrink-0 px-2 py-2">
        {[
          {id: 'profile', label: 'Seguridad y Perfil', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'},
          {id: 'core', label: 'Nexus_Handshake', icon: 'M13 10V3L4 14h7v7l9-11h-7z'},
          {id: 'desktop', label: 'Desktop_Matrix', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z'},
          {id: 'energy', label: 'Energía Solar', icon: 'M13 10V3L4 14h7v7l9-11h-7z'},
          {id: 'security', label: 'Cámaras y Sensores', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'},
          {id: 'weather', label: 'Nodos de Clima', icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999'},
          {id: 'finance', label: 'Finance_Sync', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2'}
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`px-8 py-5 rounded-[28px] text-[10px] font-black uppercase tracking-[0.3em] transition-all shrink-0 flex items-center gap-4 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/40 scale-105' : 'glass text-white/30 hover:bg-white/10'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={tab.icon} /></svg>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-4 no-scrollbar">
        <div className="max-w-6xl mx-auto space-y-12">
          
          {activeTab === 'profile' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
               <div className="glass rounded-[48px] p-12 border border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-[100px]" />
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic mb-10 flex items-center gap-4">
                     <div className="w-3 h-10 bg-blue-600 rounded-full" />
                     Vínculo Administrativo
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 ml-8">Usuario HA Vinculado</label>
                        <div className="w-full bg-white/5 border border-white/10 rounded-[30px] px-10 py-6 text-blue-400 font-black text-xl flex justify-between items-center">
                           {userProfile.username || 'Pestaña_Pausada'}
                           <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                        </div>
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 ml-8">Protocolo de Emergencia</label>
                        <button className="w-full bg-red-600/10 border border-red-500/20 rounded-[30px] px-10 py-6 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-600/20 transition-all">
                           CERRAR SESIÓN EN TODOS LOS DISPOSITIVOS
                        </button>
                     </div>
                  </div>
               </div>

               <div className="glass rounded-[48px] p-12 border border-blue-500/20 bg-blue-500/5 space-y-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
                     <div className="flex-1">
                        <h2 className="text-2xl font-black text-blue-400 uppercase tracking-widest italic">Sincronización Nube_NabuCasa</h2>
                        <p className="text-sm text-white/40 mt-3 leading-relaxed">Este terminal está configurado para autorizar accesos externos vía <span className="text-white font-bold">juanmirs@gmail.com</span>.</p>
                     </div>
                     <button 
                        onClick={handleCloudSync}
                        disabled={syncStatus === 'syncing'}
                        className={`px-12 py-7 rounded-[35px] font-black text-[11px] uppercase tracking-widest transition-all ${syncStatus === 'done' ? 'bg-green-600' : 'bg-blue-600 shadow-2xl shadow-blue-500/30 active:scale-95'}`}
                     >
                        {syncStatus === 'syncing' ? 'SUBIENDO MATRIZ...' : syncStatus === 'done' ? '✓ SINCRONIZADO EN HA' : 'SUBIR CONFIGURACIÓN A LA NUBE'}
                     </button>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'core' && (
            <div className="glass rounded-[48px] p-12 border border-white/10 space-y-10 animate-in slide-in-from-bottom-4">
              <h2 className="text-2xl font-black text-white uppercase tracking-widest italic">Nexus_Secure_Handshake</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-white/20 ml-8">Túnel Nabu Casa</label>
                    <input placeholder="URL de HA" value={haConfig.url} onChange={e => setHaConfig({...haConfig, url: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-[30px] px-10 py-6 text-sm text-white focus:border-blue-500/50 outline-none" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-white/20 ml-8">Long-Lived Access Token</label>
                    <input type="password" placeholder="Token Maestro" value={haConfig.token} onChange={e => setHaConfig({...haConfig, token: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-[30px] px-10 py-6 text-sm text-white focus:border-blue-500/50 outline-none" />
                 </div>
              </div>
              <button onClick={handleTestHA} className="flex items-center gap-6 px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[30px] text-[10px] font-black uppercase tracking-[0.4em] text-white/60 transition-all">
                {testStatus.loading ? 'TESTEANDO CONEXIÓN...' : testStatus.result || 'TEST DE HANDSHAKE'}
              </button>
            </div>
          )}

          {activeTab === 'energy' && (
            <div className="glass rounded-[48px] p-12 border border-white/10 space-y-12 animate-in slide-in-from-bottom-4">
              <h2 className="text-3xl font-black text-yellow-500 uppercase tracking-widest italic">Power_Grid_Matrix</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <SearchableEntitySelect label="Producción Solar (kW)" value={haConfig.solar_production_entity || ''} onChange={v => setHaConfig({...haConfig, solar_production_entity: v})} filterType="sensor" />
                <SearchableEntitySelect label="Consumo de Red (kW)" value={haConfig.grid_consumption_entity || ''} onChange={v => setHaConfig({...haConfig, grid_consumption_entity: v})} filterType="sensor" />
                <SearchableEntitySelect label="Exportación Red (kW)" value={haConfig.grid_export_entity || ''} onChange={v => setHaConfig({...haConfig, grid_export_entity: v})} filterType="sensor" />
                <SearchableEntitySelect label="Coste Factura Mensual" value={haConfig.invoice_entity || ''} onChange={v => setHaConfig({...haConfig, invoice_entity: v})} filterType="sensor" />
                <SearchableEntitySelect label="Batería Vehículo Eléctrico" value={haConfig.car_battery_entity || ''} onChange={v => setHaConfig({...haConfig, car_battery_entity: v})} filterType="sensor" />
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="glass rounded-[48px] p-12 border border-white/10 space-y-12 animate-in slide-in-from-bottom-4">
              <h2 className="text-3xl font-black text-red-500 uppercase tracking-widest italic">Sentinel_Perimeter</h2>
              <div className="space-y-10">
                <SearchableEntitySelect label="Matriz de VideoWall (Cámaras)" value={haConfig.security_cameras} onChange={v => setHaConfig({...haConfig, security_cameras: v})} filterType="camera" multi={true} />
                <SearchableEntitySelect label="Sensores de Acceso Perimetral" value={haConfig.security_sensors} onChange={v => setHaConfig({...haConfig, security_sensors: v})} filterType="binary_sensor" multi={true} />
                <SearchableEntitySelect label="Unidad de Alarma" value={haConfig.alarm_entity || ''} onChange={v => setHaConfig({...haConfig, alarm_entity: v})} filterType="alarm_control_panel" />
                <SearchableEntitySelect label="Nodos de Rastreo Radar" value={haConfig.tracked_people} onChange={v => setHaConfig({...haConfig, tracked_people: v})} filterType="person" multi={true} />
              </div>
            </div>
          )}

          {activeTab === 'weather' && (
            <div className="glass rounded-[48px] p-12 border border-white/10 space-y-12 animate-in slide-in-from-bottom-4">
              <h2 className="text-3xl font-black text-blue-400 uppercase tracking-widest italic">Climate_Network</h2>
              {['torrejon', 'navalacruz', 'santibanez'].map(node => (
                <div key={node} className="space-y-6 pb-10 border-b border-white/5 last:border-0">
                  <h3 className="text-xl font-black uppercase text-white/40 tracking-[0.4em] ml-4">{node.toUpperCase()}_NODE</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <SearchableEntitySelect label="Sensor Temperatura" value={haConfig.weather_nodes[node as any].temp_entity || ''} onChange={v => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, [node]: {...haConfig.weather_nodes[node as any], temp_entity: v}}})} filterType="sensor" />
                     <SearchableEntitySelect label="Cámara de Nodo" value={haConfig.weather_nodes[node as any].camera_entity || ''} onChange={v => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, [node]: {...haConfig.weather_nodes[node as any], camera_entity: v}}})} filterType="camera" />
                     <SearchableEntitySelect label="Sensor Viento" value={haConfig.weather_nodes[node as any].wind_entity || ''} onChange={v => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, [node]: {...haConfig.weather_nodes[node as any], wind_entity: v}}})} filterType="sensor" />
                     <SearchableEntitySelect label="Sensor Humedad" value={haConfig.weather_nodes[node as any].humidity_entity || ''} onChange={v => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, [node]: {...haConfig.weather_nodes[node as any], humidity_entity: v}}})} filterType="sensor" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="glass rounded-[48px] p-12 border border-white/10 space-y-12 animate-in slide-in-from-bottom-4">
              <h2 className="text-3xl font-black text-green-500 uppercase tracking-widest italic">Finance_Bridge</h2>
              <div className="space-y-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 ml-8">Google Sheets CSV Mirror URL</label>
                  <input placeholder="URL del CSV de Finanzas" value={fireflyConfig.sheets_csv_url} onChange={e => setFireflyConfig({...fireflyConfig, sheets_csv_url: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-[30px] px-10 py-6 text-sm text-white focus:border-blue-500/50 outline-none" />
                </div>
                <div className="flex items-center gap-6 p-8 bg-green-500/5 border border-green-500/20 rounded-[40px]">
                   <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-green-500/20">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </div>
                   <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-widest">Sincronización Firefly III ACTIVA</h4>
                      <p className="text-[10px] text-white/40 mt-1 uppercase">Nexus utiliza este mirror para generar informes de IA financieros en tiempo real.</p>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center shrink-0 pt-10 border-t border-white/10">
        <button onClick={handleSave} className="w-full max-w-4xl py-8 bg-blue-600 rounded-[40px] font-black tracking-[0.6em] text-[12px] uppercase shadow-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-blue-500/50">
          {status === 'saving' ? 'ENCRIPTANDO Y SINCRONIZANDO...' : 'CONFIRMAR CAMBIOS Y SINCRONIZAR TERMINAL'}
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
