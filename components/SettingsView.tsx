
import React, { useState, useEffect, useMemo } from 'react';
import { HomeAssistantConfig, WidgetType, WidgetConfig } from '../types';
import { fetchHAStates, DEFAULT_HA_URL, DEFAULT_HA_TOKEN, saveMasterConfig, fetchMasterConfig } from '../homeAssistantService';

const SettingsView: React.FC = () => {
  type TabType = 'dashboard' | 'energy' | 'vehicle' | 'security' | 'weather' | 'radar' | 'finance' | 'network' | 'core';
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
    finance: { sheets_csv_url: '', use_sheets_mirror: true },
    network: {
      radarr_url: '',
      uptime_kuma_entities: [],
      adguard_entities: { queries: '', blocked: '', ratio: '' },
      radarr_entities: { upcoming: '', status: '', disk_space: '' },
      crowdsec_entities: { alerts: '', banned_ips: '' },
      dozzle_entities: { containers_active: '' }
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
            workingConfig = { ...workingConfig, ...parsed };
            // Aseguramos que los objetos anidados existan
            if (!workingConfig.network) workingConfig.network = INITIAL_HA_CONFIG.network;
            if (!workingConfig.network.adguard_entities) workingConfig.network.adguard_entities = INITIAL_HA_CONFIG.network.adguard_entities;
            if (!workingConfig.network.radarr_entities) workingConfig.network.radarr_entities = INITIAL_HA_CONFIG.network.radarr_entities;
            if (!workingConfig.network.crowdsec_entities) workingConfig.network.crowdsec_entities = INITIAL_HA_CONFIG.network.crowdsec_entities;
            if (!workingConfig.network.dozzle_entities) workingConfig.network.dozzle_entities = INITIAL_HA_CONFIG.network.dozzle_entities;
            
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
      }).slice(0, 150);
    }, [haStates, search, value, multi, filterPrefixes]);

    const handleItemToggle = (e: React.MouseEvent, entity_id: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (multi) {
        const current = Array.isArray(value) ? value : [];
        const isSelected = current.includes(entity_id);
        const newValue = isSelected ? current.filter((x: string) => x !== entity_id) : [...current, entity_id];
        onChange(newValue);
      } else {
        onChange(entity_id);
        setIsEditing(false);
      }
    };

    return (
      <div className="space-y-1 w-full">
        <label className="text-[9px] font-black uppercase text-white/20 ml-3 tracking-widest">{label}</label>
        <button type="button" onClick={() => setIsEditing(true)}
          className="w-full glass bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-[11px] text-white/80 hover:bg-white/10 transition-all text-left flex justify-between items-center">
          <span className="truncate font-mono font-bold pr-4">
            {multi ? (value?.length > 0 ? `${value.length} SELECCIONADOS` : 'GESTIONAR LISTADO...') : (value || 'NO CONFIGURADO')}
          </span>
          <span className="shrink-0 text-[8px] font-black uppercase text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-xl border border-blue-400/20">Vincular</span>
        </button>
        {isEditing && (
          <div className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center p-4" onClick={() => setIsEditing(false)}>
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300" />
            <div className="relative w-full max-w-xl bg-[#0a0f1e] rounded-[45px] border border-blue-500/30 flex flex-col max-h-[85vh] shadow-[0_0_100px_rgba(0,0,0,1)] animate-in slide-in-from-bottom duration-300" onClick={(e) => e.stopPropagation()}>
              <div className="p-8 border-b border-white/10 flex justify-between items-center shrink-0">
                <div className="flex flex-col"><span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{label}</span><p className="text-white text-sm font-bold mt-1">{multi ? `Selección Múltiple` : 'Selección Individual'}</p></div>
                <button type="button" onClick={() => setIsEditing(false)} className="w-12 h-12 bg-white/5 hover:bg-red-500/20 rounded-full flex items-center justify-center text-white transition-all border border-white/10">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-6 shrink-0 bg-white/[0.02]"><input autoFocus placeholder="BUSCAR ENTIDAD..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-sm text-white outline-none focus:border-blue-500/50 uppercase font-mono tracking-widest" /></div>
              <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-0 space-y-2">
                {sortedAndFiltered.map(s => {
                  const isSelected = multi ? (Array.isArray(value) && value.includes(s.entity_id)) : value === s.entity_id;
                  return (
                    <div key={s.entity_id} onClick={(e) => handleItemToggle(e, s.entity_id)}
                      className={`flex items-center justify-between p-5 rounded-2xl cursor-pointer border-2 transition-all ${isSelected ? 'bg-blue-600 border-blue-400 text-white shadow-xl scale-[1.01]' : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'}`}>
                      <div className="flex items-center gap-4 truncate"><div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-white' : 'bg-white/10'}`} /><span className="text-[11px] font-mono truncate">{s.entity_id}</span></div>
                      {isSelected && <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  );
                })}
              </div>
              <div className="p-6 border-t border-white/10 bg-black/40 rounded-b-[45px] shrink-0">
                <button type="button" onClick={() => setIsEditing(false)} className="w-full py-6 bg-blue-600 text-white rounded-[25px] text-[11px] font-black uppercase tracking-[0.4em] shadow-xl active:scale-95 transition-all">
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
      <div className="flex gap-2 border-b border-white/10 pb-4 overflow-x-auto no-scrollbar shrink-0 px-4">
        {['dashboard', 'energía', 'coche', 'seguridad', 'clima', 'radar', 'finanzas', 'red', 'core'].map(t => (
          <button key={t} onClick={() => {
            const map: any = { 'dashboard': 'dashboard', 'energía': 'energy', 'coche': 'vehicle', 'seguridad': 'security', 'clima': 'weather', 'radar': 'radar', 'finanzas': 'finance', 'red': 'network', 'core': 'core' };
            setActiveTab(map[t] as TabType);
          }} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === (['dashboard', 'energy', 'vehicle', 'security', 'weather', 'radar', 'finance', 'network', 'core'][['dashboard', 'energía', 'coche', 'seguridad', 'clima', 'radar', 'finanzas', 'red', 'core'].indexOf(t)]) ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-white/5 text-white/20 hover:text-white/60'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar py-4 px-4 pb-48">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {activeTab === 'dashboard' && (
            <div className="glass p-10 rounded-[45px] border border-white/10 space-y-10 bg-black/40">
               <h4 className="text-[11px] font-black uppercase text-white tracking-[0.5em]">Configuración Panel Inicio</h4>
               <div className="space-y-6">
                  <p className="text-white/30 text-xs italic">Añade o quita widgets del panel principal.</p>
                  <EntitySelector label="Widgets de Inicio (Múltiple)" value={haConfig.dashboardWidgets?.map(w => w.entity_id) || []} multi onChange={(v:any) => {}} />
               </div>
            </div>
          )}

          {activeTab === 'energy' && (
            <div className="glass p-10 rounded-[45px] border border-white/10 space-y-10 bg-black/40">
               <h4 className="text-[11px] font-black uppercase text-white tracking-[0.5em]">Nodos Matriz Energética</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <EntitySelector label="Producción Solar" value={haConfig.solar_production_entity} onChange={(v:any) => setHaConfig({...haConfig, solar_production_entity: v})} />
                  <EntitySelector label="Consumo Casa" value={haConfig.house_consumption_entity} onChange={(v:any) => setHaConfig({...haConfig, house_consumption_entity: v})} />
                  <EntitySelector label="Consumo Red" value={haConfig.grid_consumption_entity} onChange={(v:any) => setHaConfig({...haConfig, grid_consumption_entity: v})} />
                  <EntitySelector label="Exportación Red" value={haConfig.grid_export_entity} onChange={(v:any) => setHaConfig({...haConfig, grid_export_entity: v})} />
                  <div className="col-span-1 md:col-span-2">
                    <EntitySelector label="Entidades Extra Energía" value={haConfig.energy_extra_entities || []} multi onChange={(v:any) => setHaConfig({...haConfig, energy_extra_entities: v})} />
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'vehicle' && (
            <div className="glass p-10 rounded-[45px] border border-white/10 space-y-10 bg-black/40">
               <h4 className="text-[11px] font-black uppercase text-white tracking-[0.5em]">Pasarela Lynk Gateway</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <EntitySelector label="Batería (%)" value={haConfig.vehicle.battery_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, battery_entity: v}})} />
                  <EntitySelector label="Autonomía Eléctrica" value={haConfig.vehicle.range_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, range_entity: v}})} />
                  <EntitySelector label="Odómetro (KM Totales)" value={haConfig.vehicle.odometer_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, odometer_entity: v}})} />
                  <EntitySelector label="Combustible (%)" value={haConfig.vehicle.fuel_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, fuel_entity: v}})} />
                  <EntitySelector label="Autonomía Combustible" value={haConfig.vehicle.fuel_range_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, fuel_range_entity: v}})} />
                  <EntitySelector label="Próxima Revisión (KM)" value={haConfig.vehicle.service_km_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, service_km_entity: v}})} />
                  <EntitySelector label="Ahorro Acumulado" value={haConfig.vehicle.saving_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, saving_entity: v}})} />
                  <EntitySelector label="Uso Eléctrico" value={haConfig.vehicle.electric_use_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, electric_use_entity: v}})} />
                  <EntitySelector label="Consumo Medio" value={haConfig.vehicle.avg_consumption_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, avg_consumption_entity: v}})} />
                  <EntitySelector label="Tiempo para Carga" value={haConfig.vehicle.time_to_charge_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, time_to_charge_entity: v}})} />
                  <EntitySelector label="Límite de Carga" value={haConfig.vehicle.charge_limit_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, charge_limit_entity: v}})} />
                  <EntitySelector label="Estado Enchufe" value={haConfig.vehicle.plug_status_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, plug_status_entity: v}})} />
                  <EntitySelector label="KM Hoy" value={haConfig.vehicle.km_today_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, km_today_entity: v}})} />
                  <EntitySelector label="Velocidad de Carga" value={haConfig.vehicle.charging_speed_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, charging_speed_entity: v}})} />
                  <EntitySelector label="Estado General" value={haConfig.vehicle.status_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, status_entity: v}})} />
                  <EntitySelector label="Cierre Centralizado" value={haConfig.vehicle.lock_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, lock_entity: v}})} />
                  <EntitySelector label="Climatización" value={haConfig.vehicle.climate_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, climate_entity: v}})} />
                  <EntitySelector label="Estado Ventanas" value={haConfig.vehicle.windows_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, windows_entity: v}})} />
                  <EntitySelector label="Última Actualización" value={haConfig.vehicle.last_update_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, last_update_entity: v}})} />
                  <EntitySelector label="Rastreador GPS" value={haConfig.vehicle.tracker_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, tracker_entity: v}})} />
                  <EntitySelector label="Usuario Vehículo" value={haConfig.vehicle.user_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, user_entity: v}})} />
                  <div className="col-span-1 md:col-span-2">
                    <label className="text-[9px] font-black uppercase text-white/20 ml-3 tracking-widest">URL Imagen Vehículo</label>
                    <input type="text" value={haConfig.vehicle.image_url} onChange={(e) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, image_url: e.target.value}})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white" />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <EntitySelector label="Entidades Extra Vehículo" value={haConfig.vehicle.extra_entities || []} multi onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, extra_entities: v}})} />
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="glass p-10 rounded-[45px] border border-white/10 space-y-10 bg-black/40">
               <h4 className="text-[11px] font-black uppercase text-white tracking-[0.5em]">Feeds de Seguridad Sentinel</h4>
               <div className="space-y-6">
                  <EntitySelector label="Cámaras de Video" value={haConfig.security_cameras || []} multi filterPrefixes={['camera.']} onChange={(v:any) => setHaConfig({...haConfig, security_cameras: v})} />
                  <EntitySelector label="Sensores Perimetrales" value={haConfig.security_sensors || []} multi filterPrefixes={['binary_sensor.']} onChange={(v:any) => setHaConfig({...haConfig, security_sensors: v})} />
               </div>
            </div>
          )}

          {activeTab === 'weather' && (
            <div className="glass p-10 rounded-[45px] border border-white/10 space-y-10 bg-black/40">
               <h4 className="text-[11px] font-black uppercase text-white tracking-[0.5em]">Sincronización de Nodos Atmos</h4>
               <div className="space-y-10">
                  {/* Nodo Torrejón */}
                  <div className="p-8 bg-white/5 rounded-[35px] border border-white/5 space-y-6">
                     <p className="text-orange-400 text-[10px] font-black uppercase tracking-widest">Nodo Torrejón</p>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <EntitySelector label="Temperatura" value={haConfig.weather_nodes.torrejon.temp_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, torrejon: {...haConfig.weather_nodes.torrejon, temp_entity: v}}})} />
                        <EntitySelector label="Humedad" value={haConfig.weather_nodes.torrejon.humidity_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, torrejon: {...haConfig.weather_nodes.torrejon, humidity_entity: v}}})} />
                        <EntitySelector label="Viento" value={haConfig.weather_nodes.torrejon.wind_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, torrejon: {...haConfig.weather_nodes.torrejon, wind_entity: v}}})} />
                        <EntitySelector label="Estado Clima" value={haConfig.weather_nodes.torrejon.weather_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, torrejon: {...haConfig.weather_nodes.torrejon, weather_entity: v}}})} />
                        <div className="col-span-1 md:col-span-2">
                           <EntitySelector label="Cámara / Feed" value={haConfig.weather_nodes.torrejon.camera_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, torrejon: {...haConfig.weather_nodes.torrejon, camera_entity: v}}})} />
                        </div>
                     </div>
                  </div>
                  {/* Nodo Navalacruz */}
                  <div className="p-8 bg-white/5 rounded-[35px] border border-white/5 space-y-6">
                     <p className="text-orange-400 text-[10px] font-black uppercase tracking-widest">Nodo Navalacruz</p>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <EntitySelector label="Temperatura" value={haConfig.weather_nodes.navalacruz.temp_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, navalacruz: {...haConfig.weather_nodes.navalacruz, temp_entity: v}}})} />
                        <EntitySelector label="Humedad" value={haConfig.weather_nodes.navalacruz.humidity_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, navalacruz: {...haConfig.weather_nodes.navalacruz, humidity_entity: v}}})} />
                        <EntitySelector label="Viento" value={haConfig.weather_nodes.navalacruz.wind_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, navalacruz: {...haConfig.weather_nodes.navalacruz, wind_entity: v}}})} />
                        <EntitySelector label="Estado Clima" value={haConfig.weather_nodes.navalacruz.weather_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, navalacruz: {...haConfig.weather_nodes.navalacruz, weather_entity: v}}})} />
                        <div className="col-span-1 md:col-span-2">
                           <EntitySelector label="Cámara / Feed" value={haConfig.weather_nodes.navalacruz.camera_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, navalacruz: {...haConfig.weather_nodes.navalacruz, camera_entity: v}}})} />
                        </div>
                     </div>
                  </div>
                  {/* Nodo Santibáñez */}
                  <div className="p-8 bg-white/5 rounded-[35px] border border-white/5 space-y-6">
                     <p className="text-orange-400 text-[10px] font-black uppercase tracking-widest">Nodo Santibáñez</p>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <EntitySelector label="Temperatura" value={haConfig.weather_nodes.santibanez.temp_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, santibanez: {...haConfig.weather_nodes.santibanez, temp_entity: v}}})} />
                        <EntitySelector label="Humedad" value={haConfig.weather_nodes.santibanez.humidity_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, santibanez: {...haConfig.weather_nodes.santibanez, humidity_entity: v}}})} />
                        <EntitySelector label="Viento" value={haConfig.weather_nodes.santibanez.wind_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, santibanez: {...haConfig.weather_nodes.santibanez, wind_entity: v}}})} />
                        <EntitySelector label="Estado Clima" value={haConfig.weather_nodes.santibanez.weather_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, santibanez: {...haConfig.weather_nodes.santibanez, weather_entity: v}}})} />
                        <div className="col-span-1 md:col-span-2">
                           <EntitySelector label="Cámara / Feed" value={haConfig.weather_nodes.santibanez.camera_entity} onChange={(v:any) => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, santibanez: {...haConfig.weather_nodes.santibanez, camera_entity: v}}})} />
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'radar' && (
            <div className="glass p-10 rounded-[45px] border border-white/10 space-y-10 bg-black/40">
               <h4 className="text-[11px] font-black uppercase text-white tracking-[0.5em]">Radar Sentinel Geofence</h4>
               <EntitySelector label="Usuarios a Rastrear" value={haConfig.tracked_people || []} multi filterPrefixes={['person.', 'device_tracker.']} onChange={(v:any) => setHaConfig({...haConfig, tracked_people: v})} />
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="glass p-10 rounded-[45px] border border-white/10 space-y-10 bg-black/40">
               <h4 className="text-[11px] font-black uppercase text-white tracking-[0.5em]">Sincronización Finanzas</h4>
               <div className="space-y-4">
                  <label className="text-[9px] font-black uppercase text-white/20 ml-3 tracking-widest">URL CSV de Google Sheets (Firefly Mirror)</label>
                  <input type="text" value={haConfig.finance.sheets_csv_url} onChange={(e) => setHaConfig({...haConfig, finance: {...haConfig.finance, sheets_csv_url: e.target.value}})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white" />
               </div>
            </div>
          )}

          {activeTab === 'network' && (
            <div className="glass p-10 rounded-[45px] border border-white/10 space-y-10 bg-black/40">
              <h4 className="text-[11px] font-black uppercase text-white tracking-[0.5em]">Configuración Red RM</h4>
              <div className="space-y-8">
                 <div className="bg-white/[0.03] p-8 rounded-[35px] border border-white/5 space-y-4">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Acceso Directo WebUI</p>
                    <div className="space-y-1 w-full">
                        <label className="text-[9px] font-black uppercase text-white/20 ml-3 tracking-widest">Radarr Nginx URL</label>
                        <input type="text" value={haConfig.network?.radarr_url || ''} onChange={(e) => setHaConfig({...haConfig, network: {...haConfig.network, radarr_url: e.target.value}})} placeholder="https://radarr.tudominio.com" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                    </div>
                 </div>

                 {/* UPTIME KUMA */}
                 <EntitySelector 
                    label="Monitores Uptime Kuma (Múltiple)" 
                    value={haConfig.network?.uptime_kuma_entities || []} 
                    multi 
                    filterPrefixes={['binary_sensor', 'sensor']} 
                    onChange={(v:any) => setHaConfig({...haConfig, network: {...haConfig.network, uptime_kuma_entities: v}})} 
                 />

                 {/* ADGUARD */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <EntitySelector label="AdGuard: Consultas por segundo" value={haConfig.network?.adguard_entities.queries} onChange={(v:any) => setHaConfig({...haConfig, network: {...haConfig.network, adguard_entities: {...haConfig.network.adguard_entities, queries: v}}})} />
                    <EntitySelector label="AdGuard: Bloqueos totales" value={haConfig.network?.adguard_entities.blocked} onChange={(v:any) => setHaConfig({...haConfig, network: {...haConfig.network, adguard_entities: {...haConfig.network.adguard_entities, blocked: v}}})} />
                    <EntitySelector label="AdGuard: Ratio de bloqueo" value={haConfig.network?.adguard_entities.ratio} onChange={(v:any) => setHaConfig({...haConfig, network: {...haConfig.network, adguard_entities: {...haConfig.network.adguard_entities, ratio: v}}})} />
                 </div>

                 {/* RADARR TELEMETRY */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <EntitySelector label="Radarr: Próximos estrenos" value={haConfig.network?.radarr_entities.upcoming} onChange={(v:any) => setHaConfig({...haConfig, network: {...haConfig.network, radarr_entities: {...haConfig.network.radarr_entities, upcoming: v}}})} />
                    <EntitySelector label="Radarr: Estado sistema" value={haConfig.network?.radarr_entities.status} onChange={(v:any) => setHaConfig({...haConfig, network: {...haConfig.network, radarr_entities: {...haConfig.network.radarr_entities, status: v}}})} />
                    <EntitySelector label="Radarr: Espacio en disco" value={haConfig.network?.radarr_entities.disk_space} onChange={(v:any) => setHaConfig({...haConfig, network: {...haConfig.network, radarr_entities: {...haConfig.network.radarr_entities, disk_space: v}}})} />
                 </div>

                 {/* CROWDSEC */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <EntitySelector label="CrowdSec: Alertas activas" value={haConfig.network?.crowdsec_entities.alerts} onChange={(v:any) => setHaConfig({...haConfig, network: {...haConfig.network, crowdsec_entities: {...haConfig.network.crowdsec_entities, alerts: v}}})} />
                    <EntitySelector label="CrowdSec: IPs baneadas" value={haConfig.network?.crowdsec_entities.banned_ips} onChange={(v:any) => setHaConfig({...haConfig, network: {...haConfig.network, crowdsec_entities: {...haConfig.network.crowdsec_entities, banned_ips: v}}})} />
                 </div>

                 {/* DOZZLE */}
                 <EntitySelector label="Dozzle: Contenedores activos" value={haConfig.network?.dozzle_entities.containers_active} onChange={(v:any) => setHaConfig({...haConfig, network: {...haConfig.network, dozzle_entities: {...haConfig.network.dozzle_entities, containers_active: v}}})} />
              </div>
            </div>
          )}

          {activeTab === 'core' && (
            <div className="glass p-10 rounded-[45px] border border-white/10 space-y-10 bg-black/40">
               <h4 className="text-[11px] font-black uppercase text-white tracking-[0.5em]">Núcleo Sistema RM</h4>
               <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-white/20 ml-3 tracking-widest">Home Assistant URL</label>
                    <input type="text" value={haConfig.url} onChange={(e) => setHaConfig({...haConfig, url: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-white/20 ml-3 tracking-widest">Token Acceso Maestro</label>
                    <input type="password" value={haConfig.token} onChange={(e) => setHaConfig({...haConfig, token: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-white/20 ml-3 tracking-widest">URL Fondo Pantalla</label>
                    <input type="text" value={haConfig.custom_bg_url} onChange={(e) => setHaConfig({...haConfig, custom_bg_url: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white" />
                  </div>
               </div>
            </div>
          )}

        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent z-[200]">
        <button onClick={handleSave} className="w-full py-6 bg-blue-600 rounded-[35px] font-black text-[12px] uppercase tracking-[0.5em] shadow-xl text-white backdrop-blur-xl transition-all active:scale-95">
          {status === 'saving' ? 'PROCESANDO...' : status === 'success' ? 'DATOS GUARDADOS ✓' : 'GUARDAR CONFIGURACIÓN MAESTRA'}
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
