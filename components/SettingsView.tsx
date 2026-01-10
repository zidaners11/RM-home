
import React, { useState, useEffect } from 'react';
import { HomeAssistantConfig } from '../types';
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
    grid_consumption_entity: '',
    grid_export_entity: '',
    house_consumption_entity: '', 
    energy_extra_entities: [],
    vehicle: { 
      battery_entity: '', range_entity: '', odometer_entity: '', fuel_entity: '', fuel_range_entity: '', service_km_entity: '', saving_entity: '',
      electric_use_entity: '', avg_consumption_entity: '', time_to_charge_entity: '', charge_limit_entity: '', plug_status_entity: '',
      km_today_entity: '', charging_speed_entity: '', status_entity: '', lock_entity: '', climate_entity: '',
      windows_entity: '', last_update_entity: '', image_url: '', refresh_script: '', extra_entities: [],
      tracker_entity: '', user_entity: '', fuel_unit: 'liters', tank_capacity: 42 
    },
    finance: { sheets_csv_url: '' },
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
            setHaConfig(prev => ({ ...prev, ...cloudConfig }));
            await loadHAEntities(cloudConfig.url, cloudConfig.token);
        } else {
            await loadHAEntities(currentUrl, currentToken);
        }
    } catch (e) {} finally { setIsLoading(false); }
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
        window.dispatchEvent(new Event('rm_config_updated'));
        setTimeout(() => setStatus('idle'), 2000);
      }
    } catch (err) { setStatus('error'); }
  };

  const EntitySelector = ({ label, value, onChange, multi = false, filterPrefix = '' }: any) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const filtered = (haStates || []).filter(s => {
      const matchesSearch = s.entity_id.toLowerCase().includes(search.toLowerCase());
      const matchesPrefix = filterPrefix ? s.entity_id.startsWith(filterPrefix) : true;
      return matchesSearch && matchesPrefix;
    }).slice(0, 40);

    return (
      <div className="space-y-1 relative w-full">
        <label className="text-[9px] font-black uppercase text-blue-400 ml-3 tracking-widest">{label}</label>
        <div onClick={() => setIsOpen(!isOpen)} className="w-full glass bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-[11px] text-white cursor-pointer flex justify-between items-center min-h-[44px]">
           <span className="truncate">{multi ? `${(value || []).length} selecionadas` : (value || 'Seleccionar...')}</span>
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2"/></svg>
        </div>
        {isOpen && (
          <div className="absolute z-[300] w-full mt-2 glass-dark border border-white/20 rounded-2xl p-4 bg-black/95 shadow-2xl">
            <input placeholder="Filtrar..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white/10 rounded-xl px-4 py-2 text-[11px] text-white mb-3 outline-none border border-white/10" />
            <div className="max-h-56 overflow-y-auto no-scrollbar space-y-1">
              {filtered.map(s => (
                <div key={s.entity_id} onClick={() => {
                  if(multi) {
                    const current = value || [];
                    const newValue = current.includes(s.entity_id) ? current.filter((x:any) => x !== s.entity_id) : [...current, s.entity_id];
                    onChange(newValue);
                  } else { onChange(s.entity_id); setIsOpen(false); }
                }} className={`px-4 py-2 rounded-xl cursor-pointer text-[10px] flex justify-between hover:bg-blue-600/20 ${(multi && (value || []).includes(s.entity_id)) ? 'bg-blue-600/40' : ''}`}>
                  <span className="truncate">{s.attributes.friendly_name || s.entity_id}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) return <div className="h-full flex items-center justify-center animate-pulse text-blue-400 text-[10px] uppercase font-black">Sincronizando Módulos...</div>;

  return (
    <div className="h-full flex flex-col gap-6 pb-24 overflow-hidden">
      <div className="flex gap-2 border-b border-white/10 pb-4 overflow-x-auto no-scrollbar shrink-0">
        {['dashboard', 'energy', 'vehicle', 'security', 'weather', 'finance', 'radar', 'core'].map(t => (
          <button key={t} onClick={() => setActiveTab(t as TabType)} className={`px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/20'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar py-4 px-2">
        <div className="max-w-5xl mx-auto space-y-12">
          {activeTab === 'dashboard' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <h4 className="col-span-full text-[10px] font-black uppercase tracking-widest text-blue-400">Dashboard_Main</h4>
               {haConfig.dashboardWidgets.map((w, idx) => (
                 <div key={idx} className="glass p-4 rounded-3xl border border-white/5 space-y-2 relative bg-black/40">
                   <input value={w.title} onChange={e => {
                     const nw = [...haConfig.dashboardWidgets]; nw[idx].title = e.target.value; setHaConfig({...haConfig, dashboardWidgets: nw});
                   }} className="w-full bg-white/5 rounded-lg p-2 text-[10px] text-white outline-none" />
                   <EntitySelector label="Entidad" value={w.entity_id} onChange={(v:any) => {
                     const nw = [...haConfig.dashboardWidgets]; nw[idx].entity_id = v; setHaConfig({...haConfig, dashboardWidgets: nw});
                   }} />
                 </div>
               ))}
               <button onClick={() => setHaConfig({...haConfig, dashboardWidgets: [...haConfig.dashboardWidgets, {id: Date.now().toString(), entity_id: '', type: 'sensor', title: 'Nuevo', colSpan: 1}]})} className="col-span-full py-4 border border-dashed border-white/20 rounded-3xl text-[9px] font-black text-white/20 uppercase">+ AÑADIR WIDGET</button>
             </div>
          )}

          {activeTab === 'energy' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <h4 className="col-span-full text-[10px] font-black uppercase tracking-widest text-blue-400 italic">Matriz Energética</h4>
               <EntitySelector label="Producción Solar" value={haConfig.solar_production_entity} onChange={(v:any) => setHaConfig({...haConfig, solar_production_entity: v})} />
               <EntitySelector label="Consumo Red" value={haConfig.grid_consumption_entity} onChange={(v:any) => setHaConfig({...haConfig, grid_consumption_entity: v})} />
               <EntitySelector label="Energía Revertida (Export)" value={haConfig.grid_export_entity} onChange={(v:any) => setHaConfig({...haConfig, grid_export_entity: v})} />
               <EntitySelector label="Consumo Casa" value={haConfig.house_consumption_entity} onChange={(v:any) => setHaConfig({...haConfig, house_consumption_entity: v})} />
               <div className="col-span-full">
                  <EntitySelector label="Sensores Extra (Dashboard Energía)" value={haConfig.energy_extra_entities} multi onChange={(v:any) => setHaConfig({...haConfig, energy_extra_entities: v})} />
               </div>
             </div>
          )}

          {activeTab === 'vehicle' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <h4 className="col-span-full text-[10px] font-black uppercase tracking-widest text-blue-400 italic">Lynk Gateway</h4>
               <EntitySelector label="Batería (%)" value={haConfig.vehicle.battery_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, battery_entity: v}})} />
               <EntitySelector label="Potencia Carga (kW)" value={haConfig.vehicle.charging_speed_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, charging_speed_entity: v}})} />
               <EntitySelector label="Autonomía Estimada (km)" value={haConfig.vehicle.range_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, range_entity: v}})} />
               <EntitySelector label="Litros Gasolina" value={haConfig.vehicle.fuel_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, fuel_entity: v}})} />
               <EntitySelector label="Odómetro Total" value={haConfig.vehicle.odometer_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, odometer_entity: v}})} />
               <EntitySelector label="Cierre Central" value={haConfig.vehicle.lock_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, lock_entity: v}})} />
               <EntitySelector label="Script Sincronización (Refresh)" value={haConfig.vehicle.refresh_script} filterPrefix="script." onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, refresh_script: v}})} />
               <div className="col-span-full">
                  <EntitySelector label="KPIs Extra para el Vehículo" value={haConfig.vehicle.extra_entities} multi onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, extra_entities: v}})} />
               </div>
               <div className="col-span-full">
                  <label className="text-[9px] uppercase font-black text-blue-400 ml-3">URL Imagen Vehículo</label>
                  <input value={haConfig.vehicle.image_url} onChange={e => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, image_url: e.target.value}})} className="w-full bg-white/5 p-4 rounded-2xl text-[11px] text-white border border-white/10 outline-none" />
               </div>
             </div>
          )}

          {activeTab === 'weather' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <h4 className="col-span-full text-[10px] font-black uppercase tracking-widest text-blue-400 italic">Weather_Nodes</h4>
               <div className="p-4 border border-white/10 rounded-3xl space-y-4 bg-black/40">
                  <p className="text-[9px] font-black text-white/20 uppercase">Nodo Torrejón</p>
                  <EntitySelector label="Temperatura" value={haConfig.weather_nodes.torrejon.temp_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, torrejon: {...haConfig.weather_nodes.torrejon, temp_entity: v}}})} />
                  <EntitySelector label="Cámara" value={haConfig.weather_nodes.torrejon.camera_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, torrejon: {...haConfig.weather_nodes.torrejon, camera_entity: v}}})} />
               </div>
               <div className="p-4 border border-white/10 rounded-3xl space-y-4 bg-black/40">
                  <p className="text-[9px] font-black text-white/20 uppercase">Nodo Navalacruz</p>
                  <EntitySelector label="Temperatura" value={haConfig.weather_nodes.navalacruz.temp_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, navalacruz: {...haConfig.weather_nodes.navalacruz, temp_entity: v}}})} />
                  <EntitySelector label="Cámara" value={haConfig.weather_nodes.navalacruz.camera_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, navalacruz: {...haConfig.weather_nodes.navalacruz, camera_entity: v}}})} />
               </div>
               <div className="p-4 border border-white/10 rounded-3xl space-y-4 bg-black/40">
                  <p className="text-[9px] font-black text-white/20 uppercase">Nodo Santibáñez</p>
                  <EntitySelector label="Temperatura" value={haConfig.weather_nodes.santibanez.temp_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, santibanez: {...haConfig.weather_nodes.santibanez, temp_entity: v}}})} />
                  <EntitySelector label="Cámara" value={haConfig.weather_nodes.santibanez.camera_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, santibanez: {...haConfig.weather_nodes.santibanez, camera_entity: v}}})} />
               </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <h4 className="col-span-full text-[10px] font-black uppercase tracking-widest text-blue-400 italic">Sentinel_Security</h4>
               <EntitySelector label="Cámaras de Vigilancia" value={haConfig.security_cameras} multi onChange={(v:any) => setHaConfig({...haConfig, security_cameras: v})} filterPrefix="camera." />
               <EntitySelector label="Sensores Perimetrales" value={haConfig.security_sensors} multi onChange={(v:any) => setHaConfig({...haConfig, security_sensors: v})} filterPrefix="binary_sensor." />
            </div>
          )}

          {activeTab === 'finance' && (
             <div className="space-y-6">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 italic">Financial_Strategy</h4>
               <div className="space-y-2">
                 <label className="text-[9px] uppercase font-black text-white/40 ml-4">URL CSV Google Sheets</label>
                 <input value={haConfig.finance.sheets_csv_url} onChange={e => setHaConfig({...haConfig, finance: {...haConfig.finance, sheets_csv_url: e.target.value}})} className="w-full bg-white/5 p-4 rounded-2xl text-[11px] text-white border border-white/10 outline-none focus:border-blue-500/50" />
               </div>
            </div>
          )}
          
          {activeTab === 'radar' && (
             <div className="space-y-6">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 italic">Sentinel_Radar</h4>
               <EntitySelector label="Personas a Rastrear" value={haConfig.tracked_people} multi onChange={(v:any) => setHaConfig({...haConfig, tracked_people: v})} filterPrefix="person." />
            </div>
          )}

          {activeTab === 'core' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <h4 className="col-span-full text-[10px] font-black uppercase tracking-widest text-blue-400 italic">RM Core Server</h4>
               <input value={haConfig.url} onChange={e => setHaConfig({...haConfig, url: e.target.value})} className="w-full bg-white/5 p-4 rounded-2xl text-[11px] text-white border border-white/10" placeholder="URL HA (nabu.casa)" />
               <input type="password" value={haConfig.token} onChange={e => setHaConfig({...haConfig, token: e.target.value})} className="w-full bg-white/5 p-4 rounded-2xl text-[11px] text-white border border-white/10" placeholder="Token de Larga Duración" />
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 flex justify-center pt-6 border-t border-white/10">
        <button onClick={handleSave} className="w-full max-w-xl py-6 bg-blue-600 rounded-[35px] font-black text-[12px] uppercase tracking-[0.4em] shadow-2xl hover:scale-[1.02] text-white transition-all">
          {status === 'saving' ? 'PROTOCOLIZANDO...' : status === 'success' ? 'ÉXITO' : 'GUARDAR CONFIGURACIÓN MAESTRA'}
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
