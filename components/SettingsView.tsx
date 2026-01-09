
import React, { useState, useEffect } from 'react';
import { HomeAssistantConfig, WidgetConfig, WidgetType, CustomFinanceWidget } from '../types';
import { fetchHAStates, DEFAULT_HA_URL, DEFAULT_HA_TOKEN, saveMasterConfig, fetchMasterConfig } from '../homeAssistantService';

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
    finance: { use_sheets_mirror: true, sheets_csv_url: '', custom_widgets: [] },
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    const username = localStorage.getItem('nexus_user') || 'guest';
    const savedLocal = localStorage.getItem('nexus_ha_config');
    
    let currentUrl = DEFAULT_HA_URL;
    let currentToken = DEFAULT_HA_TOKEN;

    if (savedLocal) {
        try {
            const parsed = JSON.parse(savedLocal);
            currentUrl = parsed.url || DEFAULT_HA_URL;
            currentToken = parsed.token || DEFAULT_HA_TOKEN;
            setHaConfig(prev => ({ ...prev, ...parsed }));
        } catch (e) {}
    }

    try {
        const cloudConfig = await fetchMasterConfig(username, currentUrl, currentToken);
        if (cloudConfig) {
            const mergedConfig = {
                ...INITIAL_HA_CONFIG,
                ...cloudConfig,
                vehicle: { ...INITIAL_HA_CONFIG.vehicle, ...(cloudConfig.vehicle || {}) },
                finance: { ...INITIAL_HA_CONFIG.finance, ...(cloudConfig.finance || {}) },
                weather_nodes: { ...INITIAL_HA_CONFIG.weather_nodes, ...(cloudConfig.weather_nodes || {}) }
            };
            setHaConfig(mergedConfig);
            localStorage.setItem('nexus_ha_config', JSON.stringify(mergedConfig));
            await loadHAEntities(mergedConfig.url, mergedConfig.token);
        } else {
            await loadHAEntities(currentUrl, currentToken);
        }
    } catch (e) {
        console.error("Cloud load failed", e);
    } finally {
        setIsLoading(false);
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
      const success = await saveMasterConfig(username, haConfig, haConfig.url, haConfig.token);
      if (success) {
        localStorage.setItem('nexus_ha_config', JSON.stringify(haConfig));
        setStatus('success');
        setTimeout(() => setStatus('idle'), 2000);
      } else { 
        throw new Error("FAIL"); 
      }
    } catch (err) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const addWidget = (type: WidgetType) => {
    const newWidget: WidgetConfig = {
      id: `w_${Date.now()}`,
      entity_id: '',
      type,
      title: type === 'sensor' ? 'Nuevo Sensor' : type === 'chart' ? 'Nueva Gráfica' : 'Nuevo Botón',
      colSpan: 1,
      historyHours: 24,
      historyPoints: 30
    };
    setHaConfig({ ...haConfig, dashboardWidgets: [...(haConfig.dashboardWidgets || []), newWidget] });
  };

  const addFinanceKPI = () => {
    const newKPI: CustomFinanceWidget = {
      id: `kpi_${Date.now()}`,
      type: 'kpi',
      title: 'Nuevo KPI',
      cell: 'A1',
      color: 'blue',
      unit: '€'
    };
    setHaConfig({
      ...haConfig,
      finance: {
        ...haConfig.finance,
        custom_widgets: [...(haConfig.finance.custom_widgets || []), newKPI]
      }
    });
  };

  const updateFinanceKPI = (id: string, updates: Partial<CustomFinanceWidget>) => {
    setHaConfig({
      ...haConfig,
      finance: {
        ...haConfig.finance,
        custom_widgets: (haConfig.finance.custom_widgets || []).map(w => w.id === id ? { ...w, ...updates } : w)
      }
    });
  };

  const removeFinanceKPI = (id: string) => {
    setHaConfig({
      ...haConfig,
      finance: {
        ...haConfig.finance,
        custom_widgets: (haConfig.finance.custom_widgets || []).filter(w => w.id !== id)
      }
    });
  };

  const updateWidget = (id: string, updates: Partial<WidgetConfig>) => {
    setHaConfig({
      ...haConfig,
      dashboardWidgets: haConfig.dashboardWidgets.map(w => w.id === id ? { ...w, ...updates } : w)
    });
  };

  const updateVehicle = (field: keyof typeof haConfig.vehicle, val: any) => {
    setHaConfig({ ...haConfig, vehicle: { ...haConfig.vehicle, [field]: val } });
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
      <div className="space-y-1 relative w-full">
        <label className="text-[9px] font-black uppercase text-blue-400/60 ml-3 tracking-widest">{label}</label>
        <div onClick={() => setIsOpen(!isOpen)} className="w-full glass bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-[11px] text-white cursor-pointer flex justify-between items-center hover:bg-white/10 transition-all min-h-[44px]">
           <span className="truncate text-white/90 italic">
             {multi ? `${(Array.isArray(value) ? value.length : 0)} seleccionadas` : (value || 'Seleccionar entidad...')}
           </span>
           <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-blue-400' : 'text-white/20'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        {isOpen && (
          <div className="absolute z-[300] w-full mt-2 glass-dark border border-white/20 rounded-2xl p-4 shadow-2xl backdrop-blur-3xl">
            <input autoFocus placeholder="Filtrar entidades..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-[11px] text-white mb-3 outline-none" />
            <div className="max-h-56 overflow-y-auto no-scrollbar space-y-1">
              {filtered.map(s => {
                const isSelected = multi ? (Array.isArray(value) && value.includes(s.entity_id)) : value === s.entity_id;
                return (
                  <div key={s.entity_id} onClick={(e) => {
                    e.stopPropagation();
                    if(multi) {
                      const current = Array.isArray(value) ? value : [];
                      const newValue = isSelected ? current.filter((x:any) => x !== s.entity_id) : [...current, s.entity_id];
                      onChange(newValue);
                    } else {
                      onChange(s.entity_id); setIsOpen(false);
                    }
                  }} className={`px-4 py-2 rounded-xl cursor-pointer text-[10px] flex justify-between items-center ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-white/5 text-white/40'}`}>
                    <span className="truncate mr-2">{s.attributes.friendly_name || s.entity_id}</span>
                    <span className="opacity-30 text-[8px] shrink-0">{s.entity_id}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
      return (
          <div className="h-full flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-blue-400 font-black text-[9px] uppercase tracking-[0.4em] animate-pulse">Inyectando Protocolos Nexus...</p>
          </div>
      );
  }

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
                    <div key={w.id} className="p-6 glass rounded-[35px] border border-white/5 space-y-4 relative group">
                       <button onClick={() => setHaConfig({...haConfig, dashboardWidgets: haConfig.dashboardWidgets.filter(x => x.id !== w.id)})} className="absolute top-4 right-4 text-white/10 hover:text-red-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2"/></svg>
                       </button>
                       <input value={w.title} onChange={e => updateWidget(w.id, {title: e.target.value})} className="bg-transparent text-[11px] font-black uppercase text-white outline-none mb-2 w-full border-b border-white/5 pb-1" placeholder="Nombre del Widget" />
                       <EntitySelector 
                         label="Entidad vinculada" 
                         value={w.entity_id} 
                         onChange={(v:string) => updateWidget(w.id, { entity_id: v })}
                         filterPrefix={w.type === 'button' ? 'script.' : ''}
                       />
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                             <label className="text-[8px] uppercase text-white/20 font-black ml-2">Horas Hist.</label>
                             <input type="number" value={w.historyHours} onChange={e => updateWidget(w.id, {historyHours: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-white" />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[8px] uppercase text-white/20 font-black ml-2">Puntos</label>
                             <input type="number" value={w.historyPoints} onChange={e => updateWidget(w.id, {historyPoints: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-white" />
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'energy' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <h4 className="col-span-full text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 italic">Matriz Energética</h4>
               <EntitySelector label="Producción Solar Actual (W)" value={haConfig.solar_production_entity} onChange={(v:any) => setHaConfig({...haConfig, solar_production_entity: v})} />
               <EntitySelector label="Consumo de Red Actual (W)" value={haConfig.grid_consumption_entity} onChange={(v:any) => setHaConfig({...haConfig, grid_consumption_entity: v})} />
               <EntitySelector label="Consumo Casa (Manual/Opcional)" value={haConfig.house_consumption_entity} onChange={(v:any) => setHaConfig({...haConfig, house_consumption_entity: v})} />
               <EntitySelector label="Energía Solar Diaria (kWh)" value={haConfig.solar_daily_entity} onChange={(v:any) => setHaConfig({...haConfig, solar_daily_entity: v})} />
               <EntitySelector label="Sensores Extra (Dashboard)" value={haConfig.energy_extra_entities} multi onChange={(v:any) => setHaConfig({...haConfig, energy_extra_entities: v})} filterPrefix="sensor." />
             </div>
          )}

          {activeTab === 'vehicle' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <h4 className="col-span-full text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 italic">Sentinel Vehicle OS</h4>
               <EntitySelector label="Batería (%)" value={haConfig.vehicle.battery_entity} onChange={(v:any) => updateVehicle('battery_entity', v)} />
               <EntitySelector label="Autonomía Eléctrica (km)" value={haConfig.vehicle.range_entity} onChange={(v:any) => updateVehicle('range_entity', v)} />
               <EntitySelector label="Odómetro (km)" value={haConfig.vehicle.odometer_entity} onChange={(v:any) => updateVehicle('odometer_entity', v)} />
               <EntitySelector label="Nivel Combustible" value={haConfig.vehicle.fuel_entity} onChange={(v:any) => updateVehicle('fuel_entity', v)} />
               <EntitySelector label="Rastreador GPS" value={haConfig.vehicle.tracker_entity} onChange={(v:any) => updateVehicle('tracker_entity', v)} filterPrefix="device_tracker." />
               <EntitySelector label="Script Refresco" value={haConfig.vehicle.refresh_script} onChange={(v:any) => updateVehicle('refresh_script', v)} filterPrefix="script." />
               <div className="col-span-full space-y-2">
                 <label className="text-[9px] uppercase font-black text-white/20 ml-4">URL Imagen Vehículo</label>
                 <input value={haConfig.vehicle.image_url} onChange={e => updateVehicle('image_url', e.target.value)} className="w-full bg-white/5 p-4 rounded-2xl text-xs text-white border border-white/5 outline-none" />
               </div>
             </div>
          )}

          {activeTab === 'security' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <h4 className="col-span-full text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 italic">Perímetro Sentinel</h4>
               <EntitySelector label="Cámaras de Seguridad" value={haConfig.security_cameras} multi onChange={(v:any) => setHaConfig({...haConfig, security_cameras: v})} filterPrefix="camera." />
               <EntitySelector label="Sensores Puertas/Movimiento" value={haConfig.security_sensors} multi onChange={(v:any) => setHaConfig({...haConfig, security_sensors: v})} filterPrefix="binary_sensor." />
               <EntitySelector label="Entidad Alarma" value={haConfig.alarm_entity} onChange={(v:any) => setHaConfig({...haConfig, alarm_entity: v})} filterPrefix="alarm_control_panel." />
             </div>
          )}

          {activeTab === 'weather' && (
             <div className="space-y-10">
               <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 italic">Nodos Meteorológicos</h4>
               {['torrejon', 'navalacruz', 'santibanez'].map(node => (
                 <div key={node} className="glass p-6 rounded-[32px] border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <p className="col-span-full text-[9px] font-black uppercase text-white/30 tracking-widest border-b border-white/5 pb-2 mb-2">{node.toUpperCase()}</p>
                    <EntitySelector label="Temperatura" value={haConfig.weather_nodes[node].temp_entity} onChange={(v:any) => updateWeatherNode(node, 'temp_entity', v)} />
                    <EntitySelector label="Humedad" value={haConfig.weather_nodes[node].humidity_entity} onChange={(v:any) => updateWeatherNode(node, 'humidity_entity', v)} />
                    <EntitySelector label="Cámara / Webcam" value={haConfig.weather_nodes[node].camera_entity} onChange={(v:any) => updateWeatherNode(node, 'camera_entity', v)} />
                 </div>
               ))}
             </div>
          )}

          {activeTab === 'radar' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <h4 className="col-span-full text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 italic">Rastreo Geográfico</h4>
               <EntitySelector label="Personas a Rastrear" value={haConfig.tracked_people} multi onChange={(v:any) => setHaConfig({...haConfig, tracked_people: v})} filterPrefix="person." />
             </div>
          )}

          {activeTab === 'finance' && (
             <div className="space-y-10">
               <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 italic">Finanzas & Matriz Google</h4>
               <div className="space-y-2">
                 <label className="text-[9px] uppercase font-black text-white/20 ml-4">Google Sheets CSV URL (Mirror)</label>
                 <input value={haConfig.finance.sheets_csv_url} onChange={e => setHaConfig({...haConfig, finance: {...haConfig.finance, sheets_csv_url: e.target.value}})} className="w-full bg-white/5 p-4 rounded-2xl text-xs text-white border border-white/5 outline-none" />
               </div>

               <div className="space-y-8">
                  <div className="flex justify-between items-center border-t border-white/5 pt-8">
                     <h5 className="text-[9px] font-black uppercase text-blue-400 tracking-widest">RM Custom KPIs (Telemetría de Celda)</h5>
                     <button onClick={addFinanceKPI} className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-xl text-[8px] font-black border border-blue-400/20">+ AÑADIR MÉTRICA</button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {(haConfig.finance.custom_widgets || []).map(kpi => (
                        <div key={kpi.id} className="glass p-6 rounded-[30px] border border-white/5 space-y-4 relative">
                           <button onClick={() => removeFinanceKPI(kpi.id)} className="absolute top-4 right-4 text-white/10 hover:text-red-500">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2"/></svg>
                           </button>
                           
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                 <label className="text-[8px] uppercase text-white/20 font-black">Título</label>
                                 <input value={kpi.title} onChange={e => updateFinanceKPI(kpi.id, {title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-white" />
                              </div>
                              <div className="space-y-1">
                                 <label className="text-[8px] uppercase text-white/20 font-black">Celda (Ej: J13)</label>
                                 <input value={kpi.cell} onChange={e => updateFinanceKPI(kpi.id, {cell: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-white" />
                              </div>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                 <label className="text-[8px] uppercase text-white/20 font-black">Unidad (Ej: €)</label>
                                 <input value={kpi.unit} onChange={e => updateFinanceKPI(kpi.id, {unit: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-white" />
                              </div>
                              <div className="space-y-1">
                                 <label className="text-[8px] uppercase text-white/20 font-black">Color Acento</label>
                                 <select value={kpi.color} onChange={e => updateFinanceKPI(kpi.id, {color: e.target.value as any})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-white outline-none">
                                    <option value="blue">Azul</option>
                                    <option value="green">Verde</option>
                                    <option value="orange">Naranja</option>
                                    <option value="purple">Púrpura</option>
                                    <option value="red">Rojo</option>
                                 </select>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
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
                 <label className="text-[9px] uppercase font-black text-white/20 ml-4">Fondo de Pantalla Nexus (URL)</label>
                 <input value={haConfig.custom_bg_url} onChange={e => setHaConfig({...haConfig, custom_bg_url: e.target.value})} className="w-full bg-white/5 p-4 rounded-2xl text-xs text-white border border-white/5 outline-none" />
               </div>
            </div>
          )}
          
        </div>
      </div>

      <div className="shrink-0 flex justify-center pt-6 border-t border-white/10">
        <button onClick={handleSave} className="w-full max-w-xl py-6 bg-blue-600 rounded-[35px] font-black text-[12px] uppercase tracking-[0.4em] shadow-2xl hover:scale-[1.02] text-white transition-all">
          {status === 'saving' ? 'ENVIANDO A HOME ASSISTANT...' : status === 'success' ? 'NÚCLEO SINCRONIZADO' : 'GUARDAR CONFIGURACIÓN MAESTRA'}
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
