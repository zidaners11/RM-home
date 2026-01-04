
import React, { useState, useEffect } from 'react';
import { HomeAssistantConfig, FireflyConfig } from '../types';
import { fetchHAStates, DEFAULT_HA_URL, DEFAULT_HA_TOKEN } from '../homeAssistantService';

const SettingsView: React.FC = () => {
  type TabType = 'core' | 'energy' | 'vehicle' | 'finance' | 'radar' | 'appearance';
  const [activeTab, setActiveTab] = useState<TabType>('core');
  
  const INITIAL_HA_CONFIG: HomeAssistantConfig = {
    url: DEFAULT_HA_URL, 
    token: DEFAULT_HA_TOKEN, 
    pinnedEntities: [], 
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
    vehicle: { 
      battery_entity: '', range_entity: '', odometer_entity: '', fuel_entity: '', service_km_entity: '', saving_entity: '',
      electric_use_entity: '', avg_consumption_entity: '', time_to_charge_entity: '', charge_limit_entity: '', plug_status_entity: '',
      km_today_entity: '', charging_speed_entity: '', status_entity: '', lock_entity: '', climate_entity: '',
      tire_pressure_fl_entity: '', tire_pressure_fr_entity: '', tire_pressure_rl_entity: '', tire_pressure_rr_entity: '',
      windows_entity: '', last_update_entity: '', image_url: '', extra_entities: []
    },
    weather_nodes: { 
      torrejon: {id: 'tj', name: 'TJ'}, 
      navalacruz: {id: 'nv', name: 'NV'}, 
      santibanez: {id: 'sb', name: 'SB'} 
    }
  };

  const [haConfig, setHaConfig] = useState<HomeAssistantConfig>(INITIAL_HA_CONFIG);
  const [fireflyConfig, setFireflyConfig] = useState<FireflyConfig>({
    url: '', token: '', use_sheets_mirror: true, sheets_csv_url: ''
  });
  const [haStates, setHaStates] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  useEffect(() => {
    const savedHA = localStorage.getItem('nexus_ha_config');
    const savedFF = localStorage.getItem('nexus_firefly_config');
    
    if (savedHA) {
      try {
        const parsed = JSON.parse(savedHA);
        setHaConfig({
          ...INITIAL_HA_CONFIG,
          ...parsed,
          pinnedEntities: parsed.pinnedEntities || [],
          energy_extra_entities: parsed.energy_extra_entities || [],
          vehicle: { 
            ...INITIAL_HA_CONFIG.vehicle, 
            ...(parsed.vehicle || {}),
            extra_entities: parsed.vehicle?.extra_entities || []
          }
        });
        loadHAEntities(parsed.url || DEFAULT_HA_URL, parsed.token || DEFAULT_HA_TOKEN);
      } catch (e) { console.error("Restore failed", e); }
    } else {
      loadHAEntities(DEFAULT_HA_URL, DEFAULT_HA_TOKEN);
    }

    if (savedFF) {
      try {
        setFireflyConfig(prev => ({ ...prev, ...JSON.parse(savedFF) }));
      } catch (e) { }
    }
  }, []);

  const loadHAEntities = async (url: string, token: string) => {
    try {
      const states = await fetchHAStates(url, token);
      if (states) setHaStates(states);
    } catch (e) { console.error("Entity fetch failed", e); }
  };

  const handleSave = () => {
    setStatus('saving');
    localStorage.setItem('nexus_ha_config', JSON.stringify(haConfig));
    localStorage.setItem('nexus_firefly_config', JSON.stringify(fireflyConfig));
    
    setTimeout(() => {
      setStatus('success');
      setTimeout(() => setStatus('idle'), 1500);
      window.location.reload(); 
    }, 800);
  };

  const EntitySelector = ({ label, value, onChange, multi = false }: any) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    
    const filtered = (haStates || []).filter(s => 
      s.entity_id.toLowerCase().includes(search.toLowerCase()) ||
      (s.attributes.friendly_name || '').toLowerCase().includes(search.toLowerCase())
    ).slice(0, 100);

    return (
      <div className="space-y-2 relative">
        <label className="text-[10px] font-black uppercase text-blue-400/60 ml-4 tracking-widest">{label}</label>
        <div onClick={() => setIsOpen(!isOpen)} className="w-full glass bg-white/5 border border-white/10 rounded-3xl px-6 py-5 text-xs text-white cursor-pointer flex justify-between items-center hover:bg-white/10 transition-all shadow-lg">
           <span className="truncate max-w-[85%] font-bold">
              {multi ? `${(value || []).length} seleccionadas` : (value || 'No configurado')}
           </span>
           <svg className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180 text-blue-400' : 'text-white/20'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        {isOpen && (
          <div className="absolute z-[200] w-full mt-3 glass-dark border border-white/20 rounded-[32px] p-6 shadow-2xl animate-in fade-in slide-in-from-top-4 backdrop-blur-3xl">
            <div className="relative mb-4">
               <input autoFocus placeholder="Buscar entidad..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-xs text-white outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div className="max-h-60 overflow-y-auto no-scrollbar space-y-1">
              {filtered.map(s => {
                const isSelected = multi ? (Array.isArray(value) && value.includes(s.entity_id)) : value === s.entity_id;
                return (
                  <div key={s.entity_id} onClick={() => {
                    if(multi) {
                      const current = Array.isArray(value) ? value : [];
                      const next = isSelected ? current.filter((x:any) => x !== s.entity_id) : [...current, s.entity_id];
                      onChange(next);
                    } else {
                      onChange(s.entity_id); setIsOpen(false);
                    }
                  }} className={`px-5 py-3 rounded-2xl cursor-pointer text-[10px] flex justify-between items-center transition-all ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'hover:bg-white/5 text-white/40'}`}>
                    <div className="flex flex-col">
                       <span className="font-black uppercase">{s.attributes.friendly_name || s.entity_id}</span>
                       <span className="opacity-30 text-[8px] font-mono">{s.entity_id}</span>
                    </div>
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
    <div className="h-full flex flex-col gap-6 pb-24 overflow-hidden animate-in fade-in duration-700">
      <div className="flex gap-4 border-b border-white/10 pb-6 overflow-x-auto no-scrollbar shrink-0">
        {[
          {id: 'core', label: 'HA Core'}, 
          {id: 'energy', label: 'Energía'},
          {id: 'vehicle', label: 'Coche'}, 
          {id: 'finance', label: 'Finanzas'},
          {id: 'radar', label: 'Radar'},
          {id: 'appearance', label: 'Fondo'}
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as TabType)} className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shrink-0 ${activeTab === t.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/40' : 'bg-white/5 text-white/20 hover:bg-white/10'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar py-6">
        <div className="max-w-5xl space-y-12 pb-10 mx-auto">
          
          {activeTab === 'core' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-white/20 ml-4 tracking-widest">URL Instancia HA</label>
                    <input type="text" value={haConfig.url} onChange={e => setHaConfig({...haConfig, url: e.target.value})} className="w-full glass bg-white/5 p-5 rounded-3xl outline-none text-xs text-white border border-white/10" />
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-white/20 ml-4 tracking-widest">Access Token</label>
                    <input type="password" value={haConfig.token} onChange={e => setHaConfig({...haConfig, token: e.target.value})} className="w-full glass bg-white/5 p-5 rounded-3xl outline-none text-xs text-white border border-white/10" />
                 </div>
              </div>
              <div className="p-8 bg-blue-600/5 border border-blue-500/20 rounded-[40px]">
                 <EntitySelector label="Widgets de Inicio (Dashboard)" value={haConfig.pinnedEntities} onChange={(v:any) => setHaConfig({...haConfig, pinnedEntities: v})} multi={true} />
              </div>
            </div>
          )}

          {activeTab === 'energy' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-4">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <EntitySelector label="Solar Instantánea" value={haConfig.solar_production_entity} onChange={(v:any) => setHaConfig({...haConfig, solar_production_entity: v})} />
                  <EntitySelector label="Solar Diario" value={haConfig.solar_daily_entity} onChange={(v:any) => setHaConfig({...haConfig, solar_daily_entity: v})} />
                  <EntitySelector label="Solar Mensual" value={haConfig.solar_monthly_entity} onChange={(v:any) => setHaConfig({...haConfig, solar_monthly_entity: v})} />
                  <EntitySelector label="Consumo Red" value={haConfig.grid_consumption_entity} onChange={(v:any) => setHaConfig({...haConfig, grid_consumption_entity: v})} />
                  <EntitySelector label="Exportación Red" value={haConfig.grid_export_entity} onChange={(v:any) => setHaConfig({...haConfig, grid_export_entity: v})} />
                  <EntitySelector label="Precio Energía" value={haConfig.energy_cost_entity} onChange={(v:any) => setHaConfig({...haConfig, energy_cost_entity: v})} />
               </div>
               <div className="p-8 bg-yellow-600/5 border border-yellow-500/20 rounded-[40px]">
                  <EntitySelector label="Más Sensores de Energía (KPIs ilimitados)" value={haConfig.energy_extra_entities} onChange={(v:any) => setHaConfig({...haConfig, energy_extra_entities: v})} multi={true} />
               </div>
            </div>
          )}

          {activeTab === 'vehicle' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <EntitySelector label="Batería (%)" value={haConfig.vehicle.battery_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, battery_entity: v}})} />
                <EntitySelector label="Autonomía (km)" value={haConfig.vehicle.range_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, range_entity: v}})} />
                <EntitySelector label="Odómetro" value={haConfig.vehicle.odometer_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, odometer_entity: v}})} />
                <EntitySelector label="Consumo Medio" value={haConfig.vehicle.avg_consumption_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, avg_consumption_entity: v}})} />
                <EntitySelector label="Ahorro Acumulado" value={haConfig.vehicle.saving_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, saving_entity: v}})} />
                <EntitySelector label="Uso Eléctrico" value={haConfig.vehicle.electric_use_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, electric_use_entity: v}})} />
                <EntitySelector label="Límite Carga" value={haConfig.vehicle.charge_limit_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, charge_limit_entity: v}})} />
                <EntitySelector label="Potencia Carga" value={haConfig.vehicle.charging_speed_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, charging_speed_entity: v}})} />
                <EntitySelector label="Tiempo Restante" value={haConfig.vehicle.time_to_charge_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, time_to_charge_entity: v}})} />
                <EntitySelector label="Conector" value={haConfig.vehicle.plug_status_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, plug_status_entity: v}})} />
                <EntitySelector label="Cerraduras" value={haConfig.vehicle.lock_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, lock_entity: v}})} />
                <EntitySelector label="Ventanas" value={haConfig.vehicle.windows_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, windows_entity: v}})} />
                <EntitySelector label="Última Sincro" value={haConfig.vehicle.last_update_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, last_update_entity: v}})} />
              </div>
              <div className="p-8 bg-blue-600/5 border border-blue-500/20 rounded-[40px]">
                 <EntitySelector label="Cualquier otro sensor de coche" value={haConfig.vehicle.extra_entities} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, extra_entities: v}})} multi={true} />
              </div>
              <div className="space-y-3">
                 <label className="text-[10px] font-black uppercase text-white/20 ml-4 tracking-widest">URL Imagen Vehículo</label>
                 <input type="text" value={haConfig.vehicle.image_url} onChange={e => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, image_url: e.target.value}})} className="w-full glass bg-white/5 p-5 rounded-3xl outline-none text-xs text-white border border-white/10" placeholder="https://..." />
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-4">
               <div className="flex items-center gap-4 mb-4">
                  <input type="checkbox" checked={fireflyConfig.use_sheets_mirror} onChange={e => setFireflyConfig({...fireflyConfig, use_sheets_mirror: e.target.checked})} className="w-6 h-6 rounded-lg bg-white/5 border-white/10" />
                  <label className="text-xs font-black uppercase tracking-widest text-white">Usar Google Sheets Mirror (CSV)</label>
               </div>
               
               {fireflyConfig.use_sheets_mirror ? (
                  <div className="space-y-3">
                     <label className="text-[10px] font-black uppercase text-white/20 ml-4 tracking-widest">Google Sheets CSV Public URL</label>
                     <input type="text" value={fireflyConfig.sheets_csv_url} onChange={e => setFireflyConfig({...fireflyConfig, sheets_csv_url: e.target.value})} className="w-full glass bg-white/5 p-5 rounded-3xl outline-none text-xs text-white border border-white/10" placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv" />
                  </div>
               ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-white/20 ml-4 tracking-widest">Firefly III URL</label>
                        <input type="text" value={fireflyConfig.url} onChange={e => setFireflyConfig({...fireflyConfig, url: e.target.value})} className="w-full glass bg-white/5 p-5 rounded-3xl outline-none text-xs text-white border border-white/10" />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-white/20 ml-4 tracking-widest">Personal Access Token</label>
                        <input type="password" value={fireflyConfig.token} onChange={e => setFireflyConfig({...fireflyConfig, token: e.target.value})} className="w-full glass bg-white/5 p-5 rounded-3xl outline-none text-xs text-white border border-white/10" />
                     </div>
                  </div>
               )}
            </div>
          )}

          {activeTab === 'radar' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4">
               <EntitySelector label="Rastreo de Personas" value={haConfig.tracked_people} onChange={(v:any) => setHaConfig({...haConfig, tracked_people: v})} multi={true} />
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4">
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-white/20 ml-4 tracking-widest">Fondo de Pantalla Personalizado (URL)</label>
                  <input type="text" value={haConfig.custom_bg_url} onChange={e => setHaConfig({...haConfig, custom_bg_url: e.target.value})} className="w-full glass bg-white/5 border border-white/10 rounded-3xl px-8 py-5 text-xs text-white" />
               </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 flex justify-center pt-10 border-t border-white/10">
        <button onClick={handleSave} className="w-full max-w-2xl py-7 bg-blue-600 rounded-[40px] font-black text-[14px] tracking-[0.6em] uppercase shadow-[0_0_50px_rgba(59,130,246,0.4)] transition-all hover:scale-[1.02] active:scale-95 text-white">
          {status === 'saving' ? 'SINCRONIZANDO...' : status === 'success' ? '✓ AJUSTES GUARDADOS' : 'APLICAR CONFIGURACIÓN MAESTRA'}
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
