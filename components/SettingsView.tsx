
import React, { useState, useEffect, useRef } from 'react';
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
            workingConfig = { ...workingConfig, ...parsed };
            setHaConfig(workingConfig);
        } catch (e) { console.error(e); }
    }

    if (workingConfig.url && workingConfig.token) {
      const cloudConfig = await fetchMasterConfig(username, workingConfig.url, workingConfig.token);
      if (cloudConfig) {
          const merged = { ...workingConfig, ...cloudConfig };
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
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [styles, setStyles] = useState<React.CSSProperties>({});

    const toggle = () => {
      if (!isOpen && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const top = spaceBelow < 300 ? rect.top - 310 : rect.bottom + 8;

        setStyles({ 
          position: 'fixed', 
          top: `${top}px`, 
          left: `${rect.left}px`, 
          width: `${rect.width}px`, 
          zIndex: 999999,
          maxHeight: '300px' 
        });
      }
      setIsOpen(!isOpen);
    };

    const filtered = (haStates || []).filter(s => 
      s.entity_id.toLowerCase().includes(search.toLowerCase()) && 
      (filterPrefixes.length === 0 || filterPrefixes.some((p: string) => s.entity_id.startsWith(p)))
    ).slice(0, 100);

    return (
      <div className="space-y-1 w-full" ref={containerRef}>
        <label className="text-[9px] font-black uppercase text-blue-400 ml-3">{label}</label>
        <div onClick={toggle} className="w-full glass bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-[11px] text-white cursor-pointer truncate hover:bg-white/10 transition-colors">
          {multi ? `${(value || []).length} seleccionadas` : (value || 'Vincular Entidad')}
        </div>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[999998]" onClick={() => setIsOpen(false)} />
            <div className="nexus-dropdown-portal glass-dark border border-white/20 rounded-2xl p-4 bg-[#0a0f1e] shadow-[0_20px_50px_rgba(0,0,0,1)] flex flex-col" style={styles}>
              <input autoFocus placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white/10 rounded-xl px-4 py-2 text-xs mb-3 outline-none border border-white/10 text-white" />
              <div className="overflow-y-auto no-scrollbar space-y-1 flex-1">
                {filtered.length > 0 ? filtered.map(s => (
                  <div key={s.entity_id} onClick={() => {
                    if (multi) {
                      const current = value || [];
                      onChange(current.includes(s.entity_id) ? current.filter((x:string)=>x!==s.entity_id) : [...current, s.entity_id]);
                    } else {
                      onChange(s.entity_id); setIsOpen(false);
                    }
                  }} className={`px-4 py-2 rounded-xl cursor-pointer text-[10px] truncate font-mono transition-colors ${value === s.entity_id || (multi && value?.includes(s.entity_id)) ? 'bg-blue-600 text-white' : 'text-white/70 hover:bg-white/10'}`}>
                    {s.entity_id}
                  </div>
                )) : (
                  <div className="text-[9px] text-white/20 text-center py-4 uppercase font-black">Sin resultados</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-6 pb-24 overflow-hidden relative">
      <div className="flex gap-2 border-b border-white/10 pb-4 overflow-x-auto no-scrollbar shrink-0">
        {['dashboard', 'energy', 'vehicle', 'security', 'weather', 'radar', 'finance', 'core'].map(t => (
          <button key={t} onClick={() => setActiveTab(t as TabType)} className={`px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/20'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar py-4 px-2">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {activeTab === 'dashboard' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {haConfig.dashboardWidgets.map((w, idx) => (
                 <div key={idx} className="glass p-8 rounded-[40px] border border-white/10 space-y-5 bg-black/40 relative group">
                   <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: w.color || '#3b82f6' }} />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">MÓDULO_{idx+1}</span>
                      </div>
                      <button onClick={() => setHaConfig({...haConfig, dashboardWidgets: haConfig.dashboardWidgets.filter((_, i) => i !== idx)})} className="text-red-500/50 hover:text-red-500 text-[10px] font-black uppercase">Desinstalar</button>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-white/20 uppercase ml-2">Identificador</label>
                        <input placeholder="Título" value={w.title} onChange={e => updateWidget(idx, {title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-white/20 uppercase ml-2">Icono (Emoji)</label>
                        <input placeholder="Icono" value={w.icon} onChange={e => updateWidget(idx, {icon: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-2xl text-center" />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-white/20 uppercase ml-2">Naturaleza</label>
                        <select value={w.type} onChange={e => updateWidget(idx, {type: e.target.value as WidgetType})} className="w-full bg-black/80 border border-white/10 rounded-xl p-3 text-[10px] font-black uppercase text-blue-400">
                           <option value="sensor">📡 Telemetría (Sensor)</option>
                           <option value="button">🔘 Protocolo (Botón)</option>
                           <option value="chart">📈 Analítica (Gráfico)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-white/20 uppercase ml-2">Escala Grid</label>
                        <select value={w.colSpan} onChange={e => updateWidget(idx, {colSpan: parseFloat(e.target.value) as any})} className="w-full bg-black/80 border border-white/10 rounded-xl p-3 text-[10px] font-black uppercase text-white">
                           <option value="0.25">0.25 (Mini-Estrecho)</option>
                           <option value="0.5">0.5 (Compacto)</option>
                           <option value="1">1.0 (Estándar)</option>
                           <option value="2">2.0 (Panorámico)</option>
                        </select>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-white/20 uppercase ml-2">Unidad</label>
                        <input placeholder="Ej: kW, %, ºC" value={w.unit || ''} onChange={e => updateWidget(idx, {unit: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] text-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-white/20 uppercase ml-2">Color Acento</label>
                        <input type="color" value={w.color || '#3b82f6'} onChange={e => updateWidget(idx, {color: e.target.value})} className="w-full h-[38px] bg-transparent border-none cursor-pointer rounded-xl overflow-hidden" />
                      </div>
                   </div>

                   <EntitySelector label="Entidad vinculada" value={w.entity_id} onChange={(v:any) => updateWidget(idx, {entity_id: v})} />
                 </div>
               ))}
               <button onClick={() => setHaConfig({...haConfig, dashboardWidgets: [...haConfig.dashboardWidgets, {id: Date.now().toString(), entity_id: '', type: 'sensor', title: 'Nuevo Módulo', colSpan: 1, color: '#3b82f6', icon: '🔹'}]})} className="col-span-full py-10 border-2 border-dashed border-white/5 rounded-[40px] text-[10px] font-black text-white/10 uppercase tracking-[0.5em] hover:bg-white/5 hover:text-blue-500/50 hover:border-blue-500/20 transition-all">
                  + INTEGRAR NUEVO MÓDULO INTELIGENTE
               </button>
             </div>
          )}

          {activeTab === 'energy' && (
            <div className="glass p-10 rounded-[45px] border border-white/10 space-y-8 bg-black/40">
              <h4 className="text-[11px] font-black uppercase text-blue-400 tracking-widest">Matriz Energética</h4>
              <EntitySelector label="Producción Solar (W)" value={haConfig.solar_production_entity} onChange={(v:any) => setHaConfig({...haConfig, solar_production_entity: v})} />
              <EntitySelector label="Consumo Red (W)" value={haConfig.grid_consumption_entity} onChange={(v:any) => setHaConfig({...haConfig, grid_consumption_entity: v})} />
              <EntitySelector label="Exportación Red (W)" value={haConfig.grid_export_entity} onChange={(v:any) => setHaConfig({...haConfig, grid_export_entity: v})} />
              <EntitySelector label="Consumo Casa Total" value={haConfig.house_consumption_entity} onChange={(v:any) => setHaConfig({...haConfig, house_consumption_entity: v})} />
              <EntitySelector label="Sensores Extra (Lista)" value={haConfig.energy_extra_entities} multi onChange={(v:any) => setHaConfig({...haConfig, energy_extra_entities: v})} />
            </div>
          )}

          {activeTab === 'vehicle' && (
            <div className="glass p-10 rounded-[45px] border border-white/10 space-y-6 bg-black/40">
              <h4 className="text-[11px] font-black uppercase text-blue-400 tracking-widest">Módulo LYNK & CO 01</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <EntitySelector label="Batería %" value={haConfig.vehicle.battery_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, battery_entity: v}})} />
                <EntitySelector label="Autonomía Eléctrica" value={haConfig.vehicle.range_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, range_entity: v}})} />
                <EntitySelector label="Odómetro Total" value={haConfig.vehicle.odometer_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, odometer_entity: v}})} />
                <EntitySelector label="Combustible Restante" value={haConfig.vehicle.fuel_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, fuel_entity: v}})} />
                <EntitySelector label="Autonomía Gasolina" value={haConfig.vehicle.fuel_range_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, fuel_range_entity: v}})} />
                <EntitySelector label="Potencia Carga" value={haConfig.vehicle.charging_speed_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, charging_speed_entity: v}})} />
                <EntitySelector label="Estado Bloqueo" value={haConfig.vehicle.lock_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, lock_entity: v}})} />
                <EntitySelector label="GPS Tracker" value={haConfig.vehicle.tracker_entity} filterPrefixes={['device_tracker.']} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, tracker_entity: v}})} />
              </div>
              <input placeholder="URL Imagen Vehículo" value={haConfig.vehicle.image_url} onChange={e => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, image_url: e.target.value}})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white" />
              <EntitySelector label="Script Forzar Refresco" value={haConfig.vehicle.refresh_script} filterPrefixes={['script.']} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, refresh_script: v}})} />
              <EntitySelector label="Entidades Extra Mapa" value={haConfig.vehicle.extra_entities} multi onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, extra_entities: v}})} />
            </div>
          )}

          {activeTab === 'security' && (
            <div className="glass p-10 rounded-[45px] border border-white/10 space-y-8 bg-black/40">
              <h4 className="text-[11px] font-black uppercase text-blue-400 tracking-widest">Matriz de Seguridad</h4>
              <EntitySelector label="Cámaras (Videowall)" value={haConfig.security_cameras} multi filterPrefixes={['camera.']} onChange={(v:any) => setHaConfig({...haConfig, security_cameras: v})} />
              <EntitySelector label="Sensores Perimetrales" value={haConfig.security_sensors} multi filterPrefixes={['binary_sensor.']} onChange={(v:any) => setHaConfig({...haConfig, security_sensors: v})} />
            </div>
          )}

          {activeTab === 'weather' && (
            <div className="space-y-6">
              {['torrejon', 'navalacruz', 'santibanez'].map(node => (
                <div key={node} className="glass p-8 rounded-[40px] border border-white/10 space-y-4 bg-black/40">
                  <h4 className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Nodo: {node.toUpperCase()}</h4>
                  <EntitySelector label="Temperatura" value={haConfig.weather_nodes[node].temp_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, [node]: {...haConfig.weather_nodes[node], temp_entity: v}}})} />
                  <EntitySelector label="Humedad" value={haConfig.weather_nodes[node].humidity_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, [node]: {...haConfig.weather_nodes[node], humidity_entity: v}}})} />
                  <EntitySelector label="Viento" value={haConfig.weather_nodes[node].wind_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, [node]: {...haConfig.weather_nodes[node], wind_entity: v}}})} />
                  <EntitySelector label="Cámara Nodo" value={haConfig.weather_nodes[node].camera_entity} filterPrefixes={['camera.']} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, [node]: {...haConfig.weather_nodes[node], camera_entity: v}}})} />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'radar' && (
            <div className="glass p-10 rounded-[45px] border border-white/10 space-y-8 bg-black/40">
              <h4 className="text-[11px] font-black uppercase text-blue-400 tracking-widest">Sentinel Radar</h4>
              <EntitySelector label="Personas a Rastrear" value={haConfig.tracked_people} multi filterPrefixes={['person.', 'device_tracker.']} onChange={(v:any) => setHaConfig({...haConfig, tracked_people: v})} />
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="glass p-10 rounded-[45px] border border-white/10 space-y-8 bg-black/40">
              <h4 className="text-[11px] font-black uppercase text-blue-400 tracking-widest">Matriz Financiera</h4>
              <input placeholder="URL CSV de Google Sheets" value={haConfig.finance.sheets_csv_url} onChange={e => setHaConfig({...haConfig, finance: {...haConfig.finance, sheets_csv_url: e.target.value}})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white" />
            </div>
          )}

          {activeTab === 'core' && (
            <div className="glass p-10 rounded-[45px] border border-white/10 space-y-8 bg-black/40">
              <h4 className="text-[11px] font-black uppercase text-blue-400 tracking-widest">Protocolo Core</h4>
              <input placeholder="URL Home Assistant" value={haConfig.url} onChange={e => setHaConfig({...haConfig, url: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white" />
              <input type="password" placeholder="Token de Acceso de Larga Duración" value={haConfig.token} onChange={e => setHaConfig({...haConfig, token: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white" />
            </div>
          )}

        </div>
      </div>

      <div className="shrink-0 flex justify-center pt-8 bg-black/60 border-t border-white/10">
        <button onClick={handleSave} className="w-full max-w-xl py-7 bg-blue-600 rounded-[40px] font-black text-[12px] uppercase tracking-[0.6em] shadow-2xl hover:scale-105 active:scale-95 transition-all text-white">
          {status === 'saving' ? 'PROCESANDO SINC...' : 'GUARDAR CONFIGURACIÓN MAESTRA'}
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
