
import React, { useState, useEffect } from 'react';
import { HomeAssistantConfig, WidgetType, WidgetConfig } from '../types';
import { fetchHAStates, DEFAULT_HA_URL, DEFAULT_HA_TOKEN, saveMasterConfig, fetchMasterConfig } from '../homeAssistantService';

const SettingsView: React.FC = () => {
  type TabType = 'dashboard' | 'energy' | 'vehicle' | 'security' | 'weather' | 'radar' | 'finance' | 'core';
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
    let workingConfig = { ...INITIAL_HA_CONFIG };

    if (savedLocal) {
        try {
            const parsed = JSON.parse(savedLocal);
            workingConfig = { 
              ...workingConfig, 
              ...parsed,
              vehicle: { ...workingConfig.vehicle, ...(parsed.vehicle || {}) },
              finance: { ...workingConfig.finance, ...(parsed.finance || {}) },
              weather_nodes: { ...workingConfig.weather_nodes, ...(parsed.weather_nodes || {}) }
            };
            setHaConfig(workingConfig);
        } catch (e) { console.error(e); }
    }

    try {
        if (workingConfig.url && workingConfig.token) {
          const cloudConfig = await fetchMasterConfig(username, workingConfig.url, workingConfig.token);
          if (cloudConfig) {
              const merged = { 
                ...workingConfig, 
                ...cloudConfig,
                vehicle: { ...workingConfig.vehicle, ...(cloudConfig.vehicle || {}) },
                weather_nodes: { ...workingConfig.weather_nodes, ...(cloudConfig.weather_nodes || {}) }
              };
              setHaConfig(merged);
              localStorage.setItem('nexus_ha_config', JSON.stringify(merged));
              await loadHAEntities(merged.url, merged.token);
          } else {
              await loadHAEntities(workingConfig.url, workingConfig.token);
          }
        }
    } catch (e) {
      console.warn("Fallo sync nube, usando local.");
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
      localStorage.setItem('nexus_ha_config', JSON.stringify(haConfig));
      await saveMasterConfig(username, haConfig, haConfig.url, haConfig.token);
      setStatus('success');
      window.dispatchEvent(new Event('rm_config_updated'));
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) { 
      setStatus('error'); 
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const updateWidget = (idx: number, updates: Partial<WidgetConfig>) => {
    const nw = [...haConfig.dashboardWidgets];
    nw[idx] = { ...nw[idx], ...updates };
    setHaConfig({ ...haConfig, dashboardWidgets: nw });
  };

  const EntitySelector = ({ label, value, onChange, multi = false, filterPrefixes = [] }: any) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    
    const filtered = (haStates || []).filter(s => {
      const matchesSearch = s.entity_id.toLowerCase().includes(search.toLowerCase());
      const matchesPrefix = filterPrefixes.length > 0 
        ? filterPrefixes.some((p: string) => s.entity_id.toLowerCase().startsWith(p.toLowerCase())) 
        : true;
      return matchesSearch && matchesPrefix;
    }).slice(0, 100);

    return (
      <div className="space-y-1 relative w-full">
        <label className="text-[9px] font-black uppercase text-blue-400 ml-3 tracking-widest">{label}</label>
        <div onClick={() => setIsOpen(!isOpen)} className="w-full glass bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-[11px] text-white cursor-pointer flex justify-between items-center min-h-[44px]">
           <span className="truncate">{multi ? `${(value || []).length} seleccionadas` : (value || 'Seleccionar entidad...')}</span>
           <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2"/></svg>
        </div>
        {isOpen && (
          <div className="absolute z-[300] w-full mt-2 glass-dark border border-white/20 rounded-2xl p-4 bg-black/95 shadow-2xl">
            <input placeholder="Filtrar entidades..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white/10 rounded-xl px-4 py-2 text-[11px] text-white mb-3 outline-none border border-white/10" />
            <div className="max-h-56 overflow-y-auto no-scrollbar space-y-1">
              {filtered.map(s => (
                <div key={s.entity_id} onClick={() => {
                  if(multi) {
                    const current = value || [];
                    const newValue = current.includes(s.entity_id) ? current.filter((x:any) => x !== s.entity_id) : [...current, s.entity_id];
                    onChange(newValue);
                  } else { onChange(s.entity_id); setIsOpen(false); }
                }} className={`px-4 py-2 rounded-xl cursor-pointer text-[10px] flex justify-between items-center hover:bg-blue-600/20 ${(multi && (value || []).includes(s.entity_id)) ? 'bg-blue-600/40' : ''}`}>
                  <div className="min-w-0 pr-4">
                    <p className="truncate font-mono text-white/90">{s.entity_id}</p>
                    <p className="text-[8px] opacity-40 italic truncate">{s.attributes?.friendly_name}</p>
                  </div>
                  {multi && (value || []).includes(s.entity_id) && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                </div>
              ))}
              {filtered.length === 0 && <p className="text-center py-4 text-[9px] text-white/20 uppercase tracking-widest">Sin resultados</p>}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-6 pb-24 overflow-hidden">
      <div className="flex gap-2 border-b border-white/10 pb-4 overflow-x-auto no-scrollbar shrink-0">
        {['dashboard', 'energy', 'vehicle', 'security', 'weather', 'radar', 'finance', 'core'].map(t => (
          <button key={t} onClick={() => setActiveTab(t as TabType)} className={`px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-white/20'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar py-4 px-2">
        <div className="max-w-5xl mx-auto space-y-12">
          {activeTab === 'dashboard' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="col-span-full flex justify-between items-center px-2">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Dashboard_Main_Grid</h4>
                 <span className="text-[8px] text-white/20 uppercase font-bold">Total: {(haConfig.dashboardWidgets || []).length}</span>
               </div>
               
               {(haConfig.dashboardWidgets || []).map((w, idx) => (
                 <div key={w.id || idx} className="glass p-6 rounded-3xl border border-white/10 space-y-4 bg-black/40 relative group">
                   <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-tighter">Módulo_ID: {w.id?.substring(0,6) || idx}</p>
                      <button onClick={() => {
                        const nw = haConfig.dashboardWidgets.filter((_, i) => i !== idx);
                        setHaConfig({...haConfig, dashboardWidgets: nw});
                      }} className="text-red-500/60 hover:text-red-500 text-[9px] font-black uppercase transition-colors">Eliminar</button>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] uppercase font-black text-white/20 ml-2">Título Visual</label>
                        <input placeholder="Nombre" value={w.title} onChange={e => updateWidget(idx, {title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] text-white focus:border-blue-500/40 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] uppercase font-black text-white/20 ml-2">Tipo Módulo</label>
                        <select value={w.type} onChange={e => updateWidget(idx, {type: e.target.value as WidgetType})} className="w-full bg-black/80 border border-white/10 rounded-xl p-3 text-[11px] text-white">
                           <option value="sensor">Sensor (Valor + Gráfico)</option>
                           <option value="chart">Gráfico (Solo Tendencia)</option>
                           <option value="button">Botón (Script/Shell/Scene)</option>
                        </select>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] uppercase font-black text-white/20 ml-2">Ancho Grid</label>
                        <select value={w.colSpan} onChange={e => updateWidget(idx, {colSpan: parseFloat(e.target.value) as 0.5|1|2})} className="w-full bg-black/80 border border-white/10 rounded-xl p-3 text-[11px] text-white">
                           <option value="0.5">Compacto (0.5)</option>
                           <option value="1">Estándar (1.0)</option>
                           <option value="2">Expandido (2.0)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] uppercase font-black text-white/20 ml-2">Color Temático</label>
                        <div className="flex gap-2 items-center">
                          <input type="color" value={w.color || '#3b82f6'} onChange={e => updateWidget(idx, {color: e.target.value})} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-lg overflow-hidden shrink-0" />
                          <input value={w.color || '#3b82f6'} onChange={e => updateWidget(idx, {color: e.target.value})} className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2.5 text-[10px] text-white font-mono uppercase" />
                        </div>
                      </div>
                   </div>

                   <EntitySelector 
                     label="Vincular Entidad" 
                     value={w.entity_id} 
                     filterPrefixes={w.type === 'button' ? ['script.', 'shell_command.', 'scene.', 'automation.'] : ['sensor.', 'binary_sensor.', 'input_number.']}
                     onChange={(v:any) => updateWidget(idx, {entity_id: v})} 
                   />
                 </div>
               ))}
               <button onClick={() => setHaConfig({...haConfig, dashboardWidgets: [...(haConfig.dashboardWidgets || []), {id: Date.now().toString(), entity_id: '', type: 'sensor', title: 'Nuevo Módulo', colSpan: 1, color: '#3b82f6'}]})} className="col-span-full py-10 border-2 border-dashed border-white/10 rounded-[40px] text-[10px] font-black text-white/20 uppercase tracking-[0.6em] transition-all hover:bg-white/5 hover:border-blue-500/20 active:scale-95 flex items-center justify-center gap-4">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeWidth="3" strokeLinecap="round"/></svg>
                  AÑADIR_MÓDULO_NEXUS
               </button>
             </div>
          )}

          {activeTab === 'weather' && (
             <div className="space-y-12">
               {['torrejon', 'navalacruz', 'santibanez'].map(node => (
                 <div key={node} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 glass rounded-[40px] border border-white/5 bg-black/20">
                    <h4 className="col-span-full text-[10px] font-black uppercase tracking-[0.5em] text-blue-400 italic">Protocolo_Meteorológico_{node.toUpperCase()}</h4>
                    <EntitySelector label="Sensor Temperatura" value={haConfig.weather_nodes?.[node]?.temp_entity} filterPrefixes={["sensor."]} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, [node]: {...haConfig.weather_nodes[node], temp_entity: v}}})} />
                    <EntitySelector label="Sensor Humedad" value={haConfig.weather_nodes?.[node]?.humidity_entity} filterPrefixes={["sensor."]} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, [node]: {...haConfig.weather_nodes[node], humidity_entity: v}}})} />
                    <EntitySelector label="Sensor Viento" value={haConfig.weather_nodes?.[node]?.wind_entity} filterPrefixes={["sensor."]} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, [node]: {...haConfig.weather_nodes[node], wind_entity: v}}})} />
                    <EntitySelector label="Feed Cámara Nodo" value={haConfig.weather_nodes?.[node]?.camera_entity} filterPrefixes={["camera."]} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, [node]: {...haConfig.weather_nodes[node], camera_entity: v}}})} />
                 </div>
               ))}
             </div>
          )}

          {activeTab === 'security' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <h4 className="col-span-full text-[10px] font-black uppercase tracking-widest text-blue-400 italic">Sentinel_Security_Matrix</h4>
               <EntitySelector label="Cámaras Prioritarias" value={haConfig.security_cameras} multi filterPrefixes={["camera."]} onChange={(v:any) => setHaConfig({...haConfig, security_cameras: v})} />
               <EntitySelector label="Sensores Perimetrales" value={haConfig.security_sensors} multi filterPrefixes={["binary_sensor.", "sensor."]} onChange={(v:any) => setHaConfig({...haConfig, security_sensors: v})} />
             </div>
          )}

          {activeTab === 'radar' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <h4 className="col-span-full text-[10px] font-black uppercase tracking-widest text-blue-400 italic">Radar_People_Tracking</h4>
               <EntitySelector label="Entidades de Rastreo" value={haConfig.tracked_people} multi filterPrefixes={["device_tracker.", "person."]} onChange={(v:any) => setHaConfig({...haConfig, tracked_people: v})} />
             </div>
          )}

          {activeTab === 'vehicle' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <h4 className="col-span-full text-[10px] font-black uppercase tracking-widest text-blue-400 italic">Lynk Gateway Telemetry</h4>
               <EntitySelector label="Batería (%)" value={haConfig.vehicle.battery_entity} filterPrefixes={["sensor."]} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, battery_entity: v}})} />
               <EntitySelector label="Rango Eléctrico" value={haConfig.vehicle.range_entity} filterPrefixes={["sensor."]} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, range_entity: v}})} />
               <EntitySelector label="Odómetro" value={haConfig.vehicle.odometer_entity} filterPrefixes={["sensor."]} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, odometer_entity: v}})} />
               <EntitySelector label="Script Sincronización" value={haConfig.vehicle.refresh_script} filterPrefixes={["script.", "shell_command."]} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, refresh_script: v}})} />
               <div className="col-span-full">
                  <EntitySelector label="KPIs Extras" value={haConfig.vehicle.extra_entities} multi filterPrefixes={["sensor."]} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, extra_entities: v}})} />
               </div>
               <div className="col-span-full">
                  <label className="text-[9px] uppercase font-black text-blue-400 ml-3">URL Imagen Vehículo</label>
                  <input value={haConfig.vehicle.image_url} onChange={e => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, image_url: e.target.value}})} className="w-full bg-white/5 p-4 rounded-2xl text-[11px] text-white border border-white/10 outline-none" />
               </div>
             </div>
          )}

          {activeTab === 'energy' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <h4 className="col-span-full text-[10px] font-black uppercase tracking-widest text-blue-400 italic">Matriz Energética</h4>
               <EntitySelector label="Producción Solar" value={haConfig.solar_production_entity} filterPrefixes={["sensor."]} onChange={(v:any) => setHaConfig({...haConfig, solar_production_entity: v})} />
               <EntitySelector label="Consumo Red" value={haConfig.grid_consumption_entity} filterPrefixes={["sensor."]} onChange={(v:any) => setHaConfig({...haConfig, grid_consumption_entity: v})} />
               <EntitySelector label="Consumo Casa" value={haConfig.house_consumption_entity} filterPrefixes={["sensor."]} onChange={(v:any) => setHaConfig({...haConfig, house_consumption_entity: v})} />
               <div className="col-span-full">
                  <EntitySelector label="Sensores Extra" value={haConfig.energy_extra_entities} multi filterPrefixes={["sensor."]} onChange={(v:any) => setHaConfig({...haConfig, energy_extra_entities: v})} />
               </div>
             </div>
          )}

          {activeTab === 'finance' && (
             <div className="grid grid-cols-1 gap-8">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 italic">Finanzas de Matriz</h4>
               <input value={haConfig.finance.sheets_csv_url} onChange={e => setHaConfig({...haConfig, finance: {...haConfig.finance, sheets_csv_url: e.target.value}})} className="w-full bg-white/5 p-4 rounded-2xl text-[11px] text-white border border-white/10 outline-none" placeholder="Google Sheets CSV URL" />
               <p className="text-[8px] text-white/20 px-3 uppercase tracking-widest italic">Análisis: Columna O (Indice 14) para ahorro mensual.</p>
             </div>
          )}

          {activeTab === 'core' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <h4 className="col-span-full text-[10px] font-black uppercase tracking-widest text-blue-400 italic">RM Core Server</h4>
               <input value={haConfig.url} onChange={e => setHaConfig({...haConfig, url: e.target.value})} className="w-full bg-white/5 p-4 rounded-2xl text-[11px] text-white border border-white/10" placeholder="URL HA (nabu.casa)" />
               <input type="password" value={haConfig.token} onChange={e => setHaConfig({...haConfig, token: e.target.value})} className="w-full bg-white/5 p-4 rounded-2xl text-[11px] text-white border border-white/10" placeholder="Token HA" />
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 flex justify-center pt-6 border-t border-white/10 bg-black/40">
        <button onClick={handleSave} className="w-full max-w-xl py-6 bg-blue-600 rounded-[35px] font-black text-[12px] uppercase tracking-[0.4em] shadow-2xl hover:scale-[1.02] text-white transition-all">
          {status === 'saving' ? 'PROCESANDO_PROTOCOLOS...' : status === 'success' ? 'PROTOCOLOS_DIFUNDIDOS' : 'GUARDAR AJUSTES NEXUS'}
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
