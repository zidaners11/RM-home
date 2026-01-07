
import React, { useState, useEffect } from 'react';
import { HomeAssistantConfig, WidgetConfig, WidgetType } from '../types';
import { fetchHAStates, DEFAULT_HA_URL, DEFAULT_HA_TOKEN, saveMasterConfig } from '../homeAssistantService';

const SettingsView: React.FC = () => {
  type TabType = 'dashboard' | 'energy' | 'vehicle' | 'security' | 'weather' | 'finance' | 'radar' | 'core';
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
    house_consumption_entity: '', 
    energy_cost_entity: '',
    energy_extra_entities: [],
    car_battery_entity: '',
    custom_bg_url: 'https://i.redd.it/6qq8lk9qjqp21.jpg',
    finance: { use_sheets_mirror: true, sheets_csv_url: '' },
    vehicle: { 
      battery_entity: '', range_entity: '', odometer_entity: '', fuel_entity: '', fuel_range_entity: '', service_km_entity: '', saving_entity: '',
      electric_use_entity: '', avg_consumption_entity: '', time_to_charge_entity: '', charge_limit_entity: '', plug_status_entity: '',
      km_today_entity: '', charging_speed_entity: '', status_entity: '', lock_entity: '', climate_entity: '',
      windows_entity: '', last_update_entity: '', image_url: '', refresh_script: '', extra_entities: [],
      tracker_entity: '', user_entity: '', 
      fuel_unit: 'liters', tank_capacity: 42 
    },
    weather_nodes: { 
      torrejon: { temp_entity: '', humidity_entity: '', wind_entity: '', camera_entity: '' }, 
      navalacruz: { temp_entity: '', humidity_entity: '', wind_entity: '', camera_entity: '' }, 
      santibanez: { temp_entity: '', humidity_entity: '', wind_entity: '', camera_entity: '' } 
    }
  };

  const [haConfig, setHaConfig] = useState<HomeAssistantConfig>(INITIAL_HA_CONFIG);
  const [haStates, setHaStates] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const savedHA = localStorage.getItem('nexus_ha_config');
    if (savedHA) {
      try {
        const parsed = JSON.parse(savedHA);
        setHaConfig({
          ...INITIAL_HA_CONFIG,
          ...parsed,
          dashboardWidgets: parsed.dashboardWidgets || [],
          vehicle: { ...INITIAL_HA_CONFIG.vehicle, ...(parsed.vehicle || {}) },
          finance: { ...INITIAL_HA_CONFIG.finance, ...(parsed.finance || {}) },
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

  const addWidget = (type: WidgetType) => {
    const newWidget: WidgetConfig = {
      id: `w_${Date.now()}`,
      entity_id: '',
      type,
      title: type === 'sensor' ? 'Nuevo Sensor' : type === 'chart' ? 'Nueva Gráfica' : 'Nuevo Botón',
      colSpan: 1
    };
    setHaConfig({ ...haConfig, dashboardWidgets: [...(haConfig.dashboardWidgets || []), newWidget] });
  };

  const removeWidget = (id: string) => {
    setHaConfig({ ...haConfig, dashboardWidgets: haConfig.dashboardWidgets.filter(w => w.id !== id) });
  };

  const updateWidget = (id: string, updates: Partial<WidgetConfig>) => {
    setHaConfig({
      ...haConfig,
      dashboardWidgets: haConfig.dashboardWidgets.map(w => w.id === id ? { ...w, ...updates } : w)
    });
  };

  const updateWeatherNode = (node: string, field: string, val: string) => {
    setHaConfig({
      ...haConfig,
      weather_nodes: {
        ...haConfig.weather_nodes,
        [node]: { ...haConfig.weather_nodes[node], [field]: val }
      }
    });
  };

  const handleSave = async () => {
    setStatus('saving');
    const username = localStorage.getItem('nexus_user') || 'guest';
    try {
      const syncSuccess = await saveMasterConfig(username, haConfig, haConfig.url, haConfig.token);
      if (syncSuccess) {
        localStorage.setItem('nexus_ha_config', JSON.stringify(haConfig));
        setStatus('success');
        setTimeout(() => window.location.reload(), 1500);
      } else { throw new Error("SYNC_FAILED"); }
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
    }).slice(0, 50);

    return (
      <div className="space-y-1 relative">
        <label className="text-[9px] font-black uppercase text-blue-400/60 ml-3 tracking-widest">{label}</label>
        <div onClick={() => setIsOpen(!isOpen)} className="w-full glass bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-[11px] text-white cursor-pointer flex justify-between items-center hover:bg-white/10 transition-all">
           <span className="truncate text-white/90 italic">{multi ? `${(value || []).length} seleccionadas` : (value || '---')}</span>
           <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-blue-400' : 'text-white/20'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        {isOpen && (
          <div className="absolute z-[300] w-full mt-2 glass-dark border border-white/20 rounded-2xl p-4 shadow-2xl backdrop-blur-3xl">
            <input autoFocus placeholder="Filtrar..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-[11px] text-white mb-3 outline-none" />
            <div className="max-h-56 overflow-y-auto no-scrollbar space-y-1">
              {filtered.map(s => {
                const isSelected = multi ? (Array.isArray(value) && value.includes(s.entity_id)) : value === s.entity_id;
                return (
                  <div key={s.entity_id} onClick={() => {
                    if(multi) {
                      const current = Array.isArray(value) ? value : [];
                      const newValue = isSelected ? current.filter((x:any) => x !== s.entity_id) : [...current, s.entity_id];
                      onChange(newValue);
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
        {['dashboard', 'energy', 'vehicle', 'security', 'weather', 'finance', 'radar', 'core'].map(t => (
          <button key={t} onClick={() => setActiveTab(t as TabType)} className={`px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white/5 text-white/20 hover:bg-white/10'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar py-4 px-2">
        <div className="max-w-5xl mx-auto space-y-12">
          
          {activeTab === 'dashboard' && (
             <div className="space-y-8">
               <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 italic">Arquitectura Dashboard</h4>
                  <div className="flex gap-2">
                     <button onClick={() => addWidget('sensor')} className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-xl text-[8px] font-black border border-blue-400/20 hover:bg-blue-600/40 transition-all">+ SENSOR</button>
                     <button onClick={() => addWidget('chart')} className="px-4 py-2 bg-purple-600/20 text-purple-400 rounded-xl text-[8px] font-black border border-purple-400/20 hover:bg-purple-600/40 transition-all">+ GRÁFICA</button>
                     <button onClick={() => addWidget('button')} className="px-4 py-2 bg-green-600/20 text-green-400 rounded-xl text-[8px] font-black border border-green-400/20 hover:bg-green-600/40 transition-all">+ BOTÓN</button>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(haConfig.dashboardWidgets || []).map((w) => (
                    <div key={w.id} className="p-6 glass rounded-[35px] border border-white/5 space-y-4 relative group bg-white/[0.01]">
                       <button onClick={() => removeWidget(w.id)} className="absolute top-4 right-4 text-white/10 hover:text-red-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2"/></svg>
                       </button>
                       <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${w.type === 'sensor' ? 'bg-blue-500/20 text-blue-400' : w.type === 'chart' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}`}>{w.type}</span>
                          <input 
                            value={w.title} 
                            onChange={e => updateWidget(w.id, { title: e.target.value })}
                            className="bg-transparent border-none text-[11px] font-black uppercase text-white outline-none w-full"
                          />
                       </div>
                       <EntitySelector 
                         label="Entidad vinculada" 
                         value={w.entity_id} 
                         onChange={(v:string) => updateWidget(w.id, { entity_id: v })}
                         filterPrefix={w.type === 'button' ? 'script.' : 'sensor.'}
                       />
                    </div>
                  ))}
                  {(haConfig.dashboardWidgets || []).length === 0 && (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[40px] opacity-20">
                      <p className="text-[10px] font-black uppercase tracking-widest">Dashboard vacío. Añade tu primer widget.</p>
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'energy' && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <h4 className="col-span-full text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 italic">Matriz Energética Core</h4>
                <EntitySelector label="Consumo de Casa (W) - Sensor Manual" value={haConfig.house_consumption_entity} onChange={(v:any) => setHaConfig({...haConfig, house_consumption_entity: v})} filterPrefix="sensor." />
                <EntitySelector label="Producción Solar Instantánea (W)" value={haConfig.solar_production_entity} onChange={(v:any) => setHaConfig({...haConfig, solar_production_entity: v})} filterPrefix="sensor." />
                <EntitySelector label="Consumo de Red Instantáneo (W)" value={haConfig.grid_consumption_entity} onChange={(v:any) => setHaConfig({...haConfig, grid_consumption_entity: v})} filterPrefix="sensor." />
                <EntitySelector label="Exportación a Red (W)" value={haConfig.grid_export_entity} onChange={(v:any) => setHaConfig({...haConfig, grid_export_entity: v})} filterPrefix="sensor." />
                <EntitySelector label="Energía Solar Diaria (kWh)" value={haConfig.solar_daily_entity} onChange={(v:any) => setHaConfig({...haConfig, solar_daily_entity: v})} filterPrefix="sensor." />
                <EntitySelector label="Energía Solar Mensual (kWh)" value={haConfig.solar_monthly_entity} onChange={(v:any) => setHaConfig({...haConfig, solar_monthly_entity: v})} filterPrefix="sensor." />
                <EntitySelector label="Coste Energía Actual (€)" value={haConfig.energy_cost_entity} onChange={(v:any) => setHaConfig({...haConfig, energy_cost_entity: v})} filterPrefix="sensor." />
                
                <div className="col-span-full pt-8 border-t border-white/5 mt-4">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white italic mb-4">Sensores Auxiliares (Micro-Gráficos 24h)</h4>
                   <EntitySelector multi label="Seleccionar Entidades de Consumo (Multi)" value={haConfig.energy_extra_entities || []} onChange={(v:any) => setHaConfig({...haConfig, energy_extra_entities: v})} filterPrefix="sensor." />
                </div>
             </div>
          )}

          {activeTab === 'security' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <h4 className="col-span-full text-[10px] font-black uppercase tracking-[0.4em] text-red-500 italic">Protocolo Sentinel - Seguridad</h4>
               <EntitySelector multi label="Cámaras de Seguridad" value={haConfig.security_cameras} onChange={(v:any) => setHaConfig({...haConfig, security_cameras: v})} filterPrefix="camera." />
               <EntitySelector multi label="Sensores de Apertura/Movimiento" value={haConfig.security_sensors} onChange={(v:any) => setHaConfig({...haConfig, security_sensors: v})} filterPrefix="binary_sensor." />
               <EntitySelector label="Entidad Alarma" value={haConfig.alarm_entity} onChange={(v:any) => setHaConfig({...haConfig, alarm_entity: v})} filterPrefix="alarm_control_panel." />
             </div>
          )}

          {activeTab === 'weather' && (
             <div className="space-y-12">
               {['torrejon', 'navalacruz', 'santibanez'].map(node => (
                 <div key={node} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 glass rounded-[35px] border border-white/5">
                   <h4 className="col-span-full text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 italic mb-4">Nodo Meteorológico: {node.toUpperCase()}</h4>
                   <EntitySelector label="Temperatura" value={haConfig.weather_nodes?.[node]?.temp_entity} onChange={(v:any) => updateWeatherNode(node, 'temp_entity', v)} filterPrefix="sensor." />
                   <EntitySelector label="Humedad" value={haConfig.weather_nodes?.[node]?.humidity_entity} onChange={(v:any) => updateWeatherNode(node, 'humidity_entity', v)} filterPrefix="sensor." />
                   <EntitySelector label="Viento" value={haConfig.weather_nodes?.[node]?.wind_entity} onChange={(v:any) => updateWeatherNode(node, 'wind_entity', v)} filterPrefix="sensor." />
                   <EntitySelector label="Cámara / Webcam" value={haConfig.weather_nodes?.[node]?.camera_entity} onChange={(v:any) => updateWeatherNode(node, 'camera_entity', v)} filterPrefix="camera." />
                 </div>
               ))}
             </div>
          )}

          {activeTab === 'finance' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <h4 className="col-span-full text-[10px] font-black uppercase tracking-[0.4em] text-green-500 italic">Nexus Finance - Google Sheets Bridge</h4>
               <div className="col-span-full space-y-4">
                 <div className="flex items-center gap-4 mb-4">
                   <input type="checkbox" checked={haConfig.finance.use_sheets_mirror} onChange={e => setHaConfig({...haConfig, finance: {...haConfig.finance, use_sheets_mirror: e.target.checked}})} className="w-5 h-5 rounded bg-white/10" />
                   <label className="text-xs text-white/60 font-black uppercase">Usar Mirror de Google Sheets (CSV)</label>
                 </div>
                 <div className="space-y-2">
                   <label className="text-[9px] uppercase font-black text-white/20 ml-4">URL CSV Google Sheets</label>
                   <input value={haConfig.finance.sheets_csv_url} onChange={e => setHaConfig({...haConfig, finance: {...haConfig.finance, sheets_csv_url: e.target.value}})} className="w-full bg-white/5 p-4 rounded-2xl text-xs text-white border border-white/5 outline-none focus:border-blue-500/50" placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv" />
                 </div>
               </div>
             </div>
          )}

          {activeTab === 'radar' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <h4 className="col-span-full text-[10px] font-black uppercase tracking-[0.4em] text-purple-500 italic">Sentinel Radar - Localización</h4>
               <EntitySelector multi label="Personas a Rastrear (Tracked People)" value={haConfig.tracked_people} onChange={(v:any) => setHaConfig({...haConfig, tracked_people: v})} filterPrefix="person." />
               <p className="col-span-full text-[9px] text-white/20 uppercase tracking-widest leading-loose">
                 * El radar utiliza las entidades de tipo "person" para obtener coordenadas GPS y mostrar el historial de 24h.
               </p>
             </div>
          )}

          {activeTab === 'vehicle' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <h4 className="col-span-full text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 italic">Lynk OS 01 Interface</h4>
               <EntitySelector label="Batería (%)" value={haConfig.vehicle.battery_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, battery_entity: v}})} />
               <EntitySelector label="Gasolina (Litros)" value={haConfig.vehicle.fuel_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, fuel_entity: v}})} />
               <EntitySelector label="GPS Tracker" value={haConfig.vehicle.tracker_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, tracker_entity: v}})} filterPrefix="device_tracker." />
               <EntitySelector label="Kilómetros Totales" value={haConfig.vehicle.odometer_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, odometer_entity: v}})} />
               <EntitySelector label="Autonomía EV" value={haConfig.vehicle.range_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, range_entity: v}})} />
               <EntitySelector label="Autonomía GAS" value={haConfig.vehicle.fuel_range_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, fuel_range_entity: v}})} />
               <EntitySelector label="Bloqueo Puertas" value={haConfig.vehicle.lock_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, lock_entity: v}})} filterPrefix="lock." />
               <EntitySelector label="Script de Refresco" value={haConfig.vehicle.refresh_script} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, refresh_script: v}})} filterPrefix="script." />
            </div>
          )}

          {activeTab === 'core' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <h4 className="col-span-full text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 italic">Protocolos de Conectividad</h4>
               <div className="space-y-2">
                 <label className="text-[9px] uppercase font-black text-white/20 ml-4">Servidor HA</label>
                 <input value={haConfig.url} onChange={e => setHaConfig({...haConfig, url: e.target.value})} className="w-full bg-white/5 p-4 rounded-2xl text-xs text-white border border-white/5 outline-none" />
               </div>
               <div className="space-y-2">
                 <label className="text-[9px] uppercase font-black text-white/20 ml-4">Long Lived Access Token</label>
                 <input type="password" value={haConfig.token} onChange={e => setHaConfig({...haConfig, token: e.target.value})} className="w-full bg-white/5 p-4 rounded-2xl text-xs text-white border border-white/5 outline-none" />
               </div>
               <div className="col-span-full space-y-2">
                 <label className="text-[9px] uppercase font-black text-white/20 ml-4">URL Fondo de Pantalla Personalizado</label>
                 <input value={haConfig.custom_bg_url} onChange={e => setHaConfig({...haConfig, custom_bg_url: e.target.value})} className="w-full bg-white/5 p-4 rounded-2xl text-xs text-white border border-white/5 outline-none" placeholder="https://..." />
               </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 flex justify-center pt-6 border-t border-white/10">
        <button onClick={handleSave} className="w-full max-w-xl py-6 bg-blue-600 rounded-[35px] font-black text-[12px] uppercase tracking-[0.4em] shadow-2xl hover:scale-[1.02] text-white transition-all">
          {status === 'saving' ? 'SINCRONIZANDO...' : status === 'success' ? 'NÚCLEO ACTUALIZADO' : 'GUARDAR CONFIGURACIÓN MAESTRA'}
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
