
import React, { useState, useEffect, useMemo } from 'react';
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
    finance: { 
      sheets_csv_url: '',
      use_sheets_mirror: true 
    },
    weather_nodes: { 
      torrejon: { temp_entity: '', humidity_entity: '', wind_entity: '', weather_entity: '', camera_entity: '' }, 
      navalacruz: { temp_entity: '', humidity_entity: '', wind_entity: '', weather_entity: '', camera_entity: '' }, 
      santibanez: { temp_entity: '', humidity_entity: '', wind_entity: '', weather_entity: '', camera_entity: '' } 
    }
  };

  const [haConfig, setHaConfig] = useState<HomeAssistantConfig>(INITIAL_HA_CONFIG);
  const [haStates, setHaStates] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const username = localStorage.getItem('nexus_user') || 'guest';
    const savedLocal = localStorage.getItem('nexus_ha_config');
    let workingConfig = { ...INITIAL_HA_CONFIG };

    if (savedLocal) {
        try {
            const parsed = JSON.parse(savedLocal);
            workingConfig = { 
              ...workingConfig, 
              ...parsed,
              finance: { ...INITIAL_HA_CONFIG.finance, ...parsed.finance },
              weather_nodes: { ...INITIAL_HA_CONFIG.weather_nodes, ...parsed.weather_nodes },
              vehicle: { ...INITIAL_HA_CONFIG.vehicle, ...parsed.vehicle }
            };
            setHaConfig(workingConfig);
        } catch (e) { console.error(e); }
    }

    if (workingConfig.url && workingConfig.token) {
      const cloudConfig = await fetchMasterConfig(username, workingConfig.url, workingConfig.token);
      if (cloudConfig) {
          const merged = { 
            ...workingConfig, 
            ...cloudConfig,
            finance: { ...workingConfig.finance, ...cloudConfig.finance },
            weather_nodes: { ...workingConfig.weather_nodes, ...cloudConfig.weather_nodes },
            vehicle: { ...workingConfig.vehicle, ...cloudConfig.vehicle }
          };
          setHaConfig(merged);
          loadHAEntities(merged.url, merged.token);
      } else {
          loadHAEntities(workingConfig.url, workingConfig.token);
      }
    }
  };

  const loadHAEntities = async (url: string, token: string) => {
    const states = await fetchHAStates(url, token);
    if (states) setHaStates(states);
  };

  const handleSave = async () => {
    setStatus('saving');
    const username = localStorage.getItem('nexus_user') || 'guest';
    localStorage.setItem('nexus_ha_config', JSON.stringify(haConfig));
    const ok = await saveMasterConfig(username, haConfig, haConfig.url, haConfig.token);
    setStatus(ok ? 'success' : 'error');
    window.dispatchEvent(new Event('rm_config_updated'));
    setTimeout(() => setStatus('idle'), 2000);
  };

  const updateWidget = (idx: number, updates: Partial<WidgetConfig>) => {
    const nw = [...haConfig.dashboardWidgets];
    nw[idx] = { ...nw[idx], ...updates };
    setHaConfig({ ...haConfig, dashboardWidgets: nw });
  };

  const EntitySelector = ({ label, value, onChange, multi = false, filterPrefixes = [] }: any) => {
    const [search, setSearch] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    const sortedAndFiltered = useMemo(() => {
      const list = (haStates || []).filter(s => 
        s.entity_id.toLowerCase().includes(search.toLowerCase()) && 
        (filterPrefixes.length === 0 || filterPrefixes.some((p: string) => s.entity_id.startsWith(p)))
      );

      return list.sort((a, b) => {
        const aSel = multi ? (Array.isArray(value) && value.includes(a.entity_id)) : value === a.entity_id;
        const bSel = multi ? (Array.isArray(value) && value.includes(b.entity_id)) : value === b.entity_id;
        if (aSel && !bSel) return -1;
        if (!aSel && bSel) return 1;
        return a.entity_id.localeCompare(b.entity_id);
      }).slice(0, 200);
    }, [haStates, search, value, multi, filterPrefixes]);

    const handleItemToggle = (e: React.MouseEvent, entity_id: string) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (multi) {
        const current = Array.isArray(value) ? value : [];
        const isSelected = current.includes(entity_id);
        const newValue = isSelected
          ? current.filter((x: string) => x !== entity_id)
          : [...current, entity_id];
        onChange(newValue);
      } else {
        onChange(entity_id);
        setIsEditing(false);
      }
    };

    return (
      <div className="space-y-1 w-full" onClick={e => e.stopPropagation()}>
        <label className="text-[9px] font-black uppercase text-white/20 ml-3 tracking-widest">{label}</label>
        <button 
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditing(true); }}
          className="w-full glass bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-[11px] text-white/80 hover:bg-white/10 transition-all text-left flex justify-between items-center"
        >
          <span className="truncate font-mono font-bold pr-4">
            {multi 
              ? (value?.length > 0 ? `${value.length} SELECCIONADOS` : 'GESTIONAR LISTADO...') 
              : (value || 'NO CONFIGURADO')}
          </span>
          <span className="shrink-0 text-[8px] font-black uppercase text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-xl border border-blue-400/20">Vincular</span>
        </button>

        {isEditing && (
          <div 
            className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center p-4"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditing(false); }}
          >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300" />
            
            <div 
              className="relative w-full max-w-xl bg-[#0a0f1e] rounded-[45px] border border-blue-500/30 flex flex-col max-h-[85vh] shadow-[0_0_100px_rgba(0,0,0,1)] animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 border-b border-white/10 flex justify-between items-center shrink-0">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{label}</span>
                  <p className="text-white text-sm font-bold mt-1">
                    {multi ? `Selección Múltiple` : 'Selección Individual'}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="w-12 h-12 bg-white/5 hover:bg-red-500/20 rounded-full flex items-center justify-center text-white transition-all border border-white/10"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="p-6 shrink-0 bg-white/[0.02]">
                <input 
                  autoFocus
                  placeholder="BUSCAR ENTIDAD..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-sm text-white outline-none focus:border-blue-500/50 uppercase font-mono tracking-widest"
                />
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-0 space-y-2">
                {sortedAndFiltered.map(s => {
                  const isSelected = multi ? (Array.isArray(value) && value.includes(s.entity_id)) : value === s.entity_id;
                  return (
                    <div 
                      key={s.entity_id}
                      onClick={(e) => handleItemToggle(e, s.entity_id)}
                      className={`flex items-center justify-between p-5 rounded-2xl cursor-pointer border-2 transition-all ${isSelected ? 'bg-blue-600 border-blue-400 text-white shadow-xl scale-[1.01]' : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'}`}
                    >
                      <div className="flex items-center gap-4 truncate">
                        <div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-white' : 'bg-white/10'}`} />
                        <span className="text-[11px] font-mono truncate">{s.entity_id}</span>
                      </div>
                      {isSelected && <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  );
                })}
              </div>

              <div className="p-6 border-t border-white/10 bg-black/40 rounded-b-[45px] shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="w-full py-6 bg-blue-600 text-white rounded-[25px] text-[11px] font-black uppercase tracking-[0.4em] shadow-xl active:scale-95 transition-all"
                >
                  {multi ? `FINALIZAR (${Array.isArray(value) ? value.length : 0})` : 'CERRAR'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-6 relative overflow-hidden">
      <div className="flex gap-2 border-b border-white/10 pb-4 overflow-x-auto no-scrollbar shrink-0 px-4 mobile-safe-left">
        {['dashboard', 'energy', 'vehicle', 'security', 'weather', 'radar', 'finance', 'core'].map(t => (
          <button key={t} onClick={() => setActiveTab(t as TabType)} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-white/5 text-white/20 hover:text-white/60'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar py-4 px-4 pb-48 mobile-safe-bottom">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {activeTab === 'dashboard' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {haConfig.dashboardWidgets.map((w, idx) => (
                 <div key={idx} className="glass p-8 rounded-[40px] border border-white/10 space-y-6 bg-black/40 relative">
                   <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: w.color || '#3b82f6' }} />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">MÓDULO_{idx+1}</span>
                      </div>
                      <button onClick={() => setHaConfig({...haConfig, dashboardWidgets: haConfig.dashboardWidgets.filter((_, i) => i !== idx)})} className="text-red-500/50 hover:text-red-500 text-[10px] font-black uppercase">Remover</button>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <input placeholder="Título" value={w.title} onChange={e => updateWidget(idx, {title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-white" />
                      <input placeholder="Icono" value={w.icon} onChange={e => updateWidget(idx, {icon: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xl text-center" />
                   </div>
                   <EntitySelector label="Entidad Vincular" value={w.entity_id} onChange={(v:any) => updateWidget(idx, {entity_id: v})} />
                 </div>
               ))}
               <button onClick={() => setHaConfig({...haConfig, dashboardWidgets: [...haConfig.dashboardWidgets, {id: Date.now().toString(), entity_id: '', type: 'sensor', title: 'Nuevo Módulo', colSpan: 1, color: '#3b82f6', icon: '🔹'}]})} className="col-span-full py-12 border-2 border-dashed border-white/5 rounded-[40px] text-[10px] font-black text-white/10 uppercase tracking-[0.5em] hover:bg-white/5 transition-all">
                  + INTEGRAR NUEVO MÓDULO
               </button>
             </div>
          )}

          {activeTab === 'energy' && (
            <div className="glass p-10 rounded-[45px] border border-white/10 space-y-10 bg-black/40">
              <div className="flex items-center gap-4"><div className="w-1.5 h-6 bg-yellow-500 rounded-full" /><h4 className="text-[11px] font-black uppercase text-white tracking-[0.5em]">Matriz Energética</h4></div>
              <div className="space-y-4">
                <EntitySelector label="Posición 1 (Solar)" value={haConfig.solar_production_entity} onChange={(v:any) => setHaConfig({...haConfig, solar_production_entity: v})} />
                <EntitySelector label="Posición 2 (Red)" value={haConfig.grid_consumption_entity} onChange={(v:any) => setHaConfig({...haConfig, grid_consumption_entity: v})} />
                <EntitySelector label="Posición 3 (Exportación)" value={haConfig.grid_export_entity} onChange={(v:any) => setHaConfig({...haConfig, grid_export_entity: v})} />
                <EntitySelector label="Posición 4 (Casa)" value={haConfig.house_consumption_entity} onChange={(v:any) => setHaConfig({...haConfig, house_consumption_entity: v})} />
                <EntitySelector label="Sensores Extra" value={haConfig.energy_extra_entities} multi onChange={(v:any) => setHaConfig({...haConfig, energy_extra_entities: v})} />
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="glass p-10 rounded-[45px] border border-white/10 space-y-10 bg-black/40">
              <div className="flex items-center gap-4"><div className="w-1.5 h-6 bg-green-500 rounded-full" /><h4 className="text-[11px] font-black uppercase text-white tracking-[0.5em]">Matriz Financiera</h4></div>
              <div className="space-y-4">
                <label className="text-[9px] font-black uppercase text-blue-400 ml-3">URL CSV Google Sheets</label>
                <input 
                  placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv" 
                  value={haConfig.finance.sheets_csv_url} 
                  onChange={e => setHaConfig({...haConfig, finance: {...haConfig.finance, sheets_csv_url: e.target.value}})} 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xs text-white outline-none" 
                />
              </div>
            </div>
          )}

          {activeTab === 'vehicle' && (
            <div className="glass p-10 rounded-[45px] border border-white/10 space-y-8 bg-black/40 shadow-2xl">
              <div className="flex items-center gap-4"><div className="w-1.5 h-6 bg-blue-500 rounded-full" /><h4 className="text-[11px] font-black uppercase text-white tracking-[0.5em]">Módulo Vehículo</h4></div>
              <div className="grid grid-cols-1 gap-6">
                <EntitySelector label="Batería %" value={haConfig.vehicle.battery_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, battery_entity: v}})} />
                <EntitySelector label="Combustible" value={haConfig.vehicle.fuel_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, fuel_entity: v}})} />
                <EntitySelector label="GPS Tracker" value={haConfig.vehicle.tracker_entity} filterPrefixes={['device_tracker.']} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, tracker_entity: v}})} />
                <EntitySelector label="Script Refresco" value={haConfig.vehicle.refresh_script} filterPrefixes={['script.']} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, refresh_script: v}})} />
                <EntitySelector label="Sensores Extra" value={haConfig.vehicle.extra_entities} multi onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, extra_entities: v}})} />
              </div>
            </div>
          )}

          {activeTab === 'weather' && (
            <div className="glass p-10 rounded-[45px] border border-white/10 space-y-10 bg-black/40">
              <div className="flex items-center gap-4"><div className="w-1.5 h-6 bg-orange-500 rounded-full" /><h4 className="text-[11px] font-black uppercase text-white tracking-[0.5em]">Nodos Climáticos</h4></div>
              {Object.keys(haConfig.weather_nodes).map(node => (
                <div key={node} className="space-y-4 p-6 bg-white/5 rounded-3xl border border-white/5">
                  <p className="text-[10px] font-black uppercase text-orange-400">{node}</p>
                  <EntitySelector label="Entidad Clima" value={haConfig.weather_nodes[node].weather_entity} filterPrefixes={['weather.']} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, [node]: {...haConfig.weather_nodes[node], weather_entity: v}}})} />
                  <EntitySelector label="Sensor Temp" value={haConfig.weather_nodes[node].temp_entity} filterPrefixes={['sensor.']} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, [node]: {...haConfig.weather_nodes[node], temp_entity: v}}})} />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="glass p-10 rounded-[45px] border border-white/10 space-y-10 bg-black/40">
              <div className="flex items-center gap-4"><div className="w-1.5 h-6 bg-red-600 rounded-full" /><h4 className="text-[11px] font-black uppercase text-white tracking-[0.5em]">Seguridad</h4></div>
              <EntitySelector label="Cámaras" value={haConfig.security_cameras} multi filterPrefixes={['camera.']} onChange={(v:any) => setHaConfig({...haConfig, security_cameras: v})} />
              <EntitySelector label="Sensores" value={haConfig.security_sensors} multi filterPrefixes={['binary_sensor.', 'sensor.']} onChange={(v:any) => setHaConfig({...haConfig, security_sensors: v})} />
            </div>
          )}

          {activeTab === 'radar' && (
            <div className="glass p-10 rounded-[45px] border border-white/10 space-y-10 bg-black/40">
              <div className="flex items-center gap-4"><div className="w-1.5 h-6 bg-purple-500 rounded-full" /><h4 className="text-[11px] font-black uppercase text-white tracking-[0.5em]">Rastreo</h4></div>
              <EntitySelector label="Personas" value={haConfig.tracked_people} multi filterPrefixes={['person.', 'device_tracker.']} onChange={(v:any) => setHaConfig({...haConfig, tracked_people: v})} />
            </div>
          )}
          
          {activeTab === 'core' && (
            <div className="glass p-10 rounded-[45px] border border-white/10 space-y-8 bg-black/40 shadow-2xl">
              <div className="flex items-center gap-4"><div className="w-1.5 h-6 bg-blue-600 rounded-full" /><h4 className="text-[11px] font-black uppercase text-white tracking-[0.5em]">Protocolo Core</h4></div>
              <div className="space-y-6">
                <input placeholder="HA URL" value={haConfig.url} onChange={e => setHaConfig({...haConfig, url: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xs text-white outline-none" />
                <input type="password" placeholder="Token" value={haConfig.token} onChange={e => setHaConfig({...haConfig, token: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xs text-white outline-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent z-[200] mobile-safe-bottom">
        <button 
          onClick={handleSave} 
          className="w-full py-6 bg-blue-600 rounded-[35px] font-black text-[12px] uppercase tracking-[0.5em] shadow-xl text-white backdrop-blur-xl transition-all active:scale-95"
        >
          {status === 'saving' ? 'SINC...' : status === 'success' ? 'ÉXITO ✓' : 'GUARDAR CONFIGURACIÓN'}
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
