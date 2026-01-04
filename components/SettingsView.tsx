
import React, { useState, useEffect } from 'react';
import { HomeAssistantConfig, FireflyConfig, WidgetConfig, WidgetType } from '../types';
import { fetchHAStates, DEFAULT_HA_URL, DEFAULT_HA_TOKEN, saveMasterConfig } from '../homeAssistantService';

const SettingsView: React.FC = () => {
  type TabType = 'dashboard' | 'security' | 'energy' | 'vehicle' | 'radar' | 'finance' | 'core' | 'appearance';
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  const INITIAL_HA_CONFIG: HomeAssistantConfig = {
    url: DEFAULT_HA_URL, 
    token: DEFAULT_HA_TOKEN, 
    pinnedEntities: [], 
    dashboardWidgets: [],
    security_cameras: [], 
    security_sensors: [], 
    temperature_sensors: [], 
    tracked_people: [],
    solar_production_entity: '',
    solar_daily_entity: '',
    solar_monthly_entity: '',
    grid_consumption_entity: '',
    grid_export_entity: '',
    energy_cost_entity: '',
    energy_extra_entities: [],
    car_battery_entity: '',
    custom_bg_url: 'https://i.redd.it/6qq8lk9qjqp21.jpg',
    finance: {
      url: '',
      token: '',
      use_sheets_mirror: true,
      sheets_csv_url: ''
    },
    vehicle: { 
      battery_entity: '', range_entity: '', odometer_entity: '', fuel_entity: '', fuel_range_entity: '', service_km_entity: '', saving_entity: '',
      electric_use_entity: '', avg_consumption_entity: '', time_to_charge_entity: '', charge_limit_entity: '', plug_status_entity: '',
      km_today_entity: '', charging_speed_entity: '', status_entity: '', lock_entity: '', climate_entity: '',
      windows_entity: '', last_update_entity: '', image_url: '', refresh_script: '', extra_entities: []
    },
    weather_nodes: { 
      torrejon: {id: 'tj', name: 'TJ'}, 
      navalacruz: {id: 'nv', name: 'NV'}, 
      santibanez: {id: 'sb', name: 'SB'} 
    }
  };

  const [haConfig, setHaConfig] = useState<HomeAssistantConfig>(INITIAL_HA_CONFIG);
  const [haStates, setHaStates] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadSettings();
    window.addEventListener('nexus_config_updated', loadSettings);
    return () => window.removeEventListener('nexus_config_updated', loadSettings);
  }, []);

  const loadSettings = () => {
    const savedHA = localStorage.getItem('nexus_ha_config');
    if (savedHA) {
      try {
        const parsed = JSON.parse(savedHA);
        setHaConfig({
          ...INITIAL_HA_CONFIG,
          ...parsed,
          finance: { ...INITIAL_HA_CONFIG.finance, ...(parsed.finance || {}) },
          vehicle: { ...INITIAL_HA_CONFIG.vehicle, ...(parsed.vehicle || {}) },
          weather_nodes: { ...INITIAL_HA_CONFIG.weather_nodes, ...(parsed.weather_nodes || {}) }
        });
        loadHAEntities(parsed.url || DEFAULT_HA_URL, parsed.token || DEFAULT_HA_TOKEN);
      } catch (e) { console.error("Restore failed", e); }
    } else {
      loadHAEntities(DEFAULT_HA_URL, DEFAULT_HA_TOKEN);
    }
  };

  const loadHAEntities = async (url: string, token: string) => {
    try {
      const states = await fetchHAStates(url, token);
      if (states) setHaStates(states);
    } catch (e) { }
  };

  const handleSave = async () => {
    setStatus('saving');
    const username = localStorage.getItem('nexus_user') || 'guest';
    
    try {
      // Ahora enviamos haConfig que ya contiene la propiedad .finance con los datos de Google Sheets
      const syncSuccess = await saveMasterConfig(username, haConfig, haConfig.url, haConfig.token);
      
      if (syncSuccess) {
        localStorage.setItem('nexus_ha_config', JSON.stringify(haConfig));
        setStatus('success');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        throw new Error("SYNC_FAILED");
      }
    } catch (err) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const EntitySelector = ({ label, value, onChange, multi = false, filterPrefix = '' }: any) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const filtered = (haStates || []).filter(s => {
      const matchesSearch = s.entity_id.toLowerCase().includes(search.toLowerCase()) ||
                          (s.attributes.friendly_name || '').toLowerCase().includes(search.toLowerCase());
      const matchesPrefix = filterPrefix ? s.entity_id.startsWith(filterPrefix) : true;
      return matchesSearch && matchesPrefix;
    }).slice(0, 40);

    return (
      <div className="space-y-1 relative">
        <label className="text-[9px] font-black uppercase text-blue-400/60 ml-3 tracking-widest">{label}</label>
        <div onClick={() => setIsOpen(!isOpen)} className="w-full glass bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-[11px] text-white cursor-pointer flex justify-between items-center hover:bg-white/10 transition-all">
           <span className="truncate">{multi ? `${(value || []).length} seleccionadas` : (value || '---')}</span>
           <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-blue-400' : 'text-white/20'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        {isOpen && (
          <div className="absolute z-[300] w-full mt-2 glass-dark border border-white/20 rounded-2xl p-4 shadow-2xl backdrop-blur-3xl">
            <input autoFocus placeholder="Filtrar..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-[11px] text-white mb-3" />
            <div className="max-h-48 overflow-y-auto no-scrollbar space-y-1">
              {filtered.map(s => {
                const isSelected = multi ? (Array.isArray(value) && value.includes(s.entity_id)) : value === s.entity_id;
                return (
                  <div key={s.entity_id} onClick={() => {
                    if(multi) {
                      const current = Array.isArray(value) ? value : [];
                      onChange(isSelected ? current.filter((x:any) => x !== s.entity_id) : [...current, s.entity_id]);
                    } else {
                      onChange(s.entity_id); setIsOpen(false);
                    }
                  }} className={`px-4 py-2 rounded-xl cursor-pointer text-[10px] ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-white/5 text-white/40'}`}>
                    {s.attributes.friendly_name || s.entity_id}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-6 pb-24 overflow-hidden animate-in fade-in">
      <div className="flex gap-2 border-b border-white/10 pb-4 overflow-x-auto no-scrollbar shrink-0">
        {['dashboard', 'security', 'energy', 'vehicle', 'radar', 'finance', 'core', 'appearance'].map(t => (
          <button key={t} onClick={() => setActiveTab(t as TabType)} className={`px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white/5 text-white/20 hover:bg-white/10'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar py-4">
        <div className="max-w-5xl mx-auto space-y-10">
          
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
               <div className="flex justify-between items-center"><h3 className="text-[10px] font-black uppercase text-white/40">Editor Dashboard</h3><button onClick={() => setHaConfig({...haConfig, dashboardWidgets: [...haConfig.dashboardWidgets, {id: Math.random().toString(), entity_id: '', type: 'sensor', title: 'Nuevo Widget', colSpan: 1}]})} className="px-4 py-2 bg-blue-600 rounded-xl text-[9px] font-black uppercase">Añadir Widget</button></div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {haConfig.dashboardWidgets.map(w => (
                    <div key={w.id} className="glass p-5 rounded-3xl border border-white/10 space-y-3">
                       <div className="flex justify-between"><select value={w.type} onChange={e => setHaConfig({...haConfig, dashboardWidgets: haConfig.dashboardWidgets.map(x => x.id === w.id ? {...x, type: e.target.value as WidgetType} : x)})} className="bg-white/10 border-none text-[9px] uppercase font-bold text-blue-400 rounded-lg p-1"><option value="sensor">Sensor</option><option value="switch">Interruptor</option><option value="button">Botón</option><option value="climate">Clima</option><option value="chart">Gráfico</option></select><button onClick={() => setHaConfig({...haConfig, dashboardWidgets: haConfig.dashboardWidgets.filter(x => x.id !== w.id)})} className="text-red-500/50">×</button></div>
                       <input value={w.title} onChange={e => setHaConfig({...haConfig, dashboardWidgets: haConfig.dashboardWidgets.map(x => x.id === w.id ? {...x, title: e.target.value} : x)})} placeholder="Título" className="w-full bg-white/5 p-2 rounded-xl text-[10px]" />
                       <EntitySelector label="Entidad" value={w.entity_id} onChange={(v:any) => setHaConfig({...haConfig, dashboardWidgets: haConfig.dashboardWidgets.map(x => x.id === w.id ? {...x, entity_id: v} : x)})} />
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'energy' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <EntitySelector label="Solar Instantánea" value={haConfig.solar_production_entity} onChange={(v:any) => setHaConfig({...haConfig, solar_production_entity: v})} />
               <EntitySelector label="Solar Hoy" value={haConfig.solar_daily_entity} onChange={(v:any) => setHaConfig({...haConfig, solar_daily_entity: v})} />
               <EntitySelector label="Solar Mes" value={haConfig.solar_monthly_entity} onChange={(v:any) => setHaConfig({...haConfig, solar_monthly_entity: v})} />
               <EntitySelector label="Consumo Red" value={haConfig.grid_consumption_entity} onChange={(v:any) => setHaConfig({...haConfig, grid_consumption_entity: v})} />
               <EntitySelector label="Exportación Red" value={haConfig.grid_export_entity} onChange={(v:any) => setHaConfig({...haConfig, grid_export_entity: v})} />
               <EntitySelector label="Precio Luz" value={haConfig.energy_cost_entity} onChange={(v:any) => setHaConfig({...haConfig, energy_cost_entity: v})} />
            </div>
          )}

          {activeTab === 'vehicle' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <EntitySelector label="Batería (%)" value={haConfig.vehicle.battery_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, battery_entity: v}})} />
               <EntitySelector label="Autonomía EV" value={haConfig.vehicle.range_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, range_entity: v}})} />
               <EntitySelector label="Autonomía Gasolina" value={haConfig.vehicle.fuel_range_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, fuel_range_entity: v}})} />
               <EntitySelector label="Gasolina (L)" value={haConfig.vehicle.fuel_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, fuel_entity: v}})} />
               <EntitySelector label="Odómetro" value={haConfig.vehicle.odometer_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, odometer_entity: v}})} />
               <EntitySelector label="Estado (Parked/Charging)" value={haConfig.vehicle.status_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, status_entity: v}})} />
               <EntitySelector label="Cerraduras" value={haConfig.vehicle.lock_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, lock_entity: v}})} />
               <EntitySelector label="Ventanas" value={haConfig.vehicle.windows_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, windows_entity: v}})} />
               <EntitySelector label="Climatización" value={haConfig.vehicle.climate_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, climate_entity: v}})} />
               <EntitySelector label="Última Actualización" value={haConfig.vehicle.last_update_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, last_update_entity: v}})} />
               <EntitySelector label="Script de Actualización" filterPrefix="script." value={haConfig.vehicle.refresh_script} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, refresh_script: v}})} />
               <div className="md:col-span-2 lg:col-span-3 space-y-2"><label className="text-[9px] uppercase font-black text-white/20 ml-4">URL Imagen Coche</label><input value={haConfig.vehicle.image_url} onChange={e => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, image_url: e.target.value}})} className="w-full bg-white/5 p-4 rounded-2xl text-xs" /></div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <EntitySelector label="Cámaras CCTV" value={haConfig.security_cameras} onChange={(v:any) => setHaConfig({...haConfig, security_cameras: v})} multi={true} />
               <EntitySelector label="Sensores Acceso" value={haConfig.security_sensors} onChange={(v:any) => setHaConfig({...haConfig, security_sensors: v})} multi={true} />
               <EntitySelector label="Alarma" value={haConfig.alarm_entity} onChange={(v:any) => setHaConfig({...haConfig, alarm_entity: v})} />
            </div>
          )}

          {activeTab === 'radar' && (
            <EntitySelector label="Rastreo Personas" value={haConfig.tracked_people} onChange={(v:any) => setHaConfig({...haConfig, tracked_people: v})} multi={true} />
          )}

          {activeTab === 'finance' && (
            <div className="space-y-6">
               <div className="flex items-center gap-3">
                 <input 
                   type="checkbox" 
                   checked={haConfig.finance.use_sheets_mirror} 
                   onChange={e => setHaConfig({...haConfig, finance: {...haConfig.finance, use_sheets_mirror: e.target.checked}})} 
                 />
                 <label className="text-[10px] font-black uppercase text-white">Usar Google Sheets Mirror</label>
               </div>
               <div className="space-y-2">
                 <label className="text-[9px] uppercase font-black text-white/20 ml-4">URL CSV de Google Sheets</label>
                 <input 
                   value={haConfig.finance.sheets_csv_url} 
                   onChange={e => setHaConfig({...haConfig, finance: {...haConfig.finance, sheets_csv_url: e.target.value}})} 
                   placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv" 
                   className="w-full bg-white/5 p-4 rounded-2xl text-xs text-white" 
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-[9px] uppercase font-black text-white/20 ml-4">Token Firefly III (Opcional)</label>
                 <input 
                   type="password"
                   value={haConfig.finance.token} 
                   onChange={e => setHaConfig({...haConfig, finance: {...haConfig.finance, token: e.target.value}})} 
                   className="w-full bg-white/5 p-4 rounded-2xl text-xs text-white" 
                 />
               </div>
            </div>
          )}

          {activeTab === 'core' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2"><label className="text-[9px] uppercase font-black text-white/20 ml-4">URL Home Assistant</label><input value={haConfig.url} onChange={e => setHaConfig({...haConfig, url: e.target.value})} className="w-full bg-white/5 p-4 rounded-2xl text-xs" /></div>
               <div className="space-y-2"><label className="text-[9px] uppercase font-black text-white/20 ml-4">Token Maestro</label><input type="password" value={haConfig.token} onChange={e => setHaConfig({...haConfig, token: e.target.value})} className="w-full bg-white/5 p-4 rounded-2xl text-xs" /></div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-2"><label className="text-[9px] uppercase font-black text-white/20 ml-4">Fondo de Pantalla URL</label><input value={haConfig.custom_bg_url} onChange={e => setHaConfig({...haConfig, custom_bg_url: e.target.value})} className="w-full bg-white/5 p-4 rounded-2xl text-xs" /></div>
          )}

        </div>
      </div>

      <div className="shrink-0 flex justify-center pt-6 border-t border-white/10">
        <button onClick={handleSave} className="w-full max-w-xl py-5 bg-blue-600 rounded-3xl font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] text-white transition-all">
          {status === 'saving' ? 'SINCRONIZANDO NÚCLEO...' : status === 'success' ? 'PERFIL ACTUALIZADO ✓' : status === 'error' ? 'FALLO DE ENLACE' : 'GUARDAR CONFIGURACIÓN MAESTRA'}
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
