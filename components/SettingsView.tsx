
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
    custom_bg_url: 'https://i.redd.it/6qq8lk9qjqp21.jpg',
    vehicle: { 
      battery_entity: '', odometer_entity: '', fuel_entity: '', service_km_entity: '', saving_entity: '',
      electric_use_entity: '', avg_consumption_entity: '', time_to_charge_entity: '', km_today_entity: '', 
      charging_speed_entity: '', status_entity: '', refresh_button_entity: '', image_url: ''
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
          vehicle: { ...INITIAL_HA_CONFIG.vehicle, ...(parsed.vehicle || {}) },
          weather_nodes: { ...INITIAL_HA_CONFIG.weather_nodes, ...(parsed.weather_nodes || {}) }
        });
        loadHAEntities(parsed.url || DEFAULT_HA_URL, parsed.token || DEFAULT_HA_TOKEN);
      } catch (e) { console.error("Restore failed", e); }
    } else {
      loadHAEntities(DEFAULT_HA_URL, DEFAULT_HA_TOKEN);
    }
    
    if (savedFF) {
      try {
        setFireflyConfig(prev => ({ ...prev, ...JSON.parse(savedFF) }));
      } catch (e) { console.error("Restore finance failed", e); }
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
      setTimeout(() => {
        setStatus('idle');
        window.location.reload(); 
      }, 800);
    }, 1000);
  };

  const EntitySelector = ({ label, value, onChange, multi = false }: any) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const filtered = (haStates || []).filter(s => 
      s.entity_id.toLowerCase().includes(search.toLowerCase()) ||
      (s.attributes.friendly_name || '').toLowerCase().includes(search.toLowerCase())
    ).slice(0, 50);

    return (
      <div className="space-y-2 relative">
        <label className="text-[9px] font-black uppercase text-white/30 ml-4 tracking-widest">{label}</label>
        <div onClick={() => setIsOpen(!isOpen)} className="w-full glass bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white cursor-pointer flex justify-between items-center hover:bg-white/10 transition-all">
           <span className="truncate max-w-[85%] font-medium">
              {multi ? `${(value || []).length} seleccionados` : (value || 'No configurado')}
           </span>
           <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-blue-400' : 'text-white/20'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        {isOpen && (
          <div className="absolute z-[100] w-full mt-2 glass-dark border border-white/20 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-2">
            <input autoFocus placeholder="Filtrar entidades..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white/10 border-none rounded-xl px-4 py-2 text-xs text-white mb-3 outline-none ring-1 ring-blue-500/20" />
            <div className="max-h-56 overflow-y-auto no-scrollbar space-y-1">
              {filtered.map(s => {
                const isSelected = multi ? (Array.isArray(value) && value.includes(s.entity_id)) : value === s.entity_id;
                return (
                  <div key={s.entity_id} onClick={() => {
                    if(multi) {
                      const next = isSelected ? value.filter((x:any) => x !== s.entity_id) : [...(value||[]), s.entity_id];
                      onChange(next);
                    } else {
                      onChange(s.entity_id); setIsOpen(false);
                    }
                  }} className={`px-4 py-2.5 rounded-xl cursor-pointer text-[10px] flex justify-between items-center transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-white/5 text-white/50'}`}>
                    <div className="flex flex-col">
                       <span className="font-bold">{s.attributes.friendly_name || s.entity_id}</span>
                       <span className="opacity-40 text-[8px] font-mono">{s.entity_id}</span>
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
    <div className="h-full flex flex-col gap-6 pb-20 overflow-hidden">
      <div className="flex gap-3 border-b border-white/10 pb-4 overflow-x-auto no-scrollbar shrink-0">
        {[
          {id: 'core', label: 'HA Core'}, 
          {id: 'energy', label: 'Energía'},
          {id: 'vehicle', label: 'Coche'}, 
          {id: 'finance', label: 'Finanzas'},
          {id: 'radar', label: 'Radar'},
          {id: 'appearance', label: 'Apariencia'}
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as TabType)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar py-4 px-1">
        <div className="max-w-4xl space-y-10">
          
          {activeTab === 'core' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-white/30 ml-4 tracking-widest">URL Instancia HA</label>
                    <input type="text" value={haConfig.url} onChange={e => setHaConfig({...haConfig, url: e.target.value})} className="w-full glass bg-white/5 p-4 rounded-2xl outline-none text-xs text-white border border-white/5" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-white/30 ml-4 tracking-widest">Token Acceso Maestro</label>
                    <input type="password" value={haConfig.token} onChange={e => setHaConfig({...haConfig, token: e.target.value})} className="w-full glass bg-white/5 p-4 rounded-2xl outline-none text-xs text-white border border-white/5" />
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <EntitySelector label="Cámaras Videowall" value={haConfig.security_cameras} onChange={(v:any) => setHaConfig({...haConfig, security_cameras: v})} multi={true} />
                 <EntitySelector label="Sensores Perimetrales" value={haConfig.security_sensors} onChange={(v:any) => setHaConfig({...haConfig, security_sensors: v})} multi={true} />
              </div>
            </div>
          )}

          {activeTab === 'energy' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-2">
                <EntitySelector label="Producción Solar (W)" value={haConfig.solar_production_entity} onChange={(v:any) => setHaConfig({...haConfig, solar_production_entity: v})} />
                <EntitySelector label="Solar Diario (kWh)" value={haConfig.solar_daily_entity} onChange={(v:any) => setHaConfig({...haConfig, solar_daily_entity: v})} />
                <EntitySelector label="Consumo de Red (W)" value={haConfig.grid_consumption_entity} onChange={(v:any) => setHaConfig({...haConfig, grid_consumption_entity: v})} />
                <EntitySelector label="Exportación Red (W)" value={haConfig.grid_export_entity} onChange={(v:any) => setHaConfig({...haConfig, grid_export_entity: v})} />
                <EntitySelector label="Precio Energía (€/kWh)" value={haConfig.energy_cost_entity} onChange={(v:any) => setHaConfig({...haConfig, energy_cost_entity: v})} />
             </div>
          )}

          {activeTab === 'vehicle' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <EntitySelector label="Batería (%)" value={haConfig.vehicle.battery_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, battery_entity: v}})} />
                <EntitySelector label="Estado (Charging/Parked)" value={haConfig.vehicle.status_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, status_entity: v}})} />
                <EntitySelector label="Odómetro (km)" value={haConfig.vehicle.odometer_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, odometer_entity: v}})} />
                <EntitySelector label="Combustible (L)" value={haConfig.vehicle.fuel_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, fuel_entity: v}})} />
                <EntitySelector label="Kilómetros Hoy" value={haConfig.vehicle.km_today_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, km_today_entity: v}})} />
                <EntitySelector label="Velocidad Carga (kW)" value={haConfig.vehicle.charging_speed_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, charging_speed_entity: v}})} />
              </div>
              <div className="space-y-2">
                 <label className="text-[9px] font-black uppercase text-white/30 ml-4 tracking-widest">URL Imagen del Vehículo</label>
                 <input type="text" value={haConfig.vehicle.image_url} onChange={e => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, image_url: e.target.value}})} className="w-full glass bg-white/5 p-4 rounded-2xl outline-none text-xs text-white border border-white/5" placeholder="https://..." />
              </div>
            </div>
          )}

          {activeTab === 'radar' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2">
              <EntitySelector label="Personas a rastrear" value={haConfig.tracked_people} onChange={(v:any) => setHaConfig({...haConfig, tracked_people: v})} multi={true} />
              <p className="text-[10px] text-white/20 italic px-4 uppercase font-bold tracking-widest">Selecciona las entidades 'device_tracker' o 'person' para verlas en el Radar.</p>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2">
               <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-6 rounded-full relative transition-colors ${fireflyConfig.use_sheets_mirror ? 'bg-blue-600' : 'bg-white/10'}`} onClick={() => setFireflyConfig({...fireflyConfig, use_sheets_mirror: !fireflyConfig.use_sheets_mirror})}>
                     <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${fireflyConfig.use_sheets_mirror ? 'left-7' : 'left-1'}`} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Usar Google Sheets Mirror</span>
               </div>
               {fireflyConfig.use_sheets_mirror && (
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-white/30 ml-4 tracking-widest">CSV URL de Google Sheets</label>
                    <input type="text" value={fireflyConfig.sheets_csv_url} onChange={e => setFireflyConfig({...fireflyConfig, sheets_csv_url: e.target.value})} className="w-full glass bg-white/5 p-4 rounded-2xl outline-none text-xs text-white border border-white/5" placeholder="https://docs.google.com/spreadsheets/.../pub?output=csv" />
                 </div>
               )}
            </div>
          )}

          {activeTab === 'appearance' && (
             <div className="space-y-6 animate-in slide-in-from-bottom-2">
                <div className="space-y-2">
                   <label className="text-[9px] font-black uppercase text-white/30 ml-4 tracking-widest">URL Fondo de Pantalla Principal</label>
                   <input type="text" value={haConfig.custom_bg_url} onChange={e => setHaConfig({...haConfig, custom_bg_url: e.target.value})} className="w-full glass bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white" />
                </div>
             </div>
          )}
        </div>
      </div>

      <div className="shrink-0 flex justify-center pt-8 border-t border-white/10">
        <button onClick={handleSave} className="w-full max-w-lg py-6 bg-blue-600 rounded-[35px] font-black text-[12px] tracking-[0.5em] uppercase shadow-2xl transition-all hover:scale-[1.02] active:scale-95">
          {status === 'saving' ? 'GUARDANDO PROTOCOLOS...' : status === 'success' ? '✓ NÚCLEO ACTUALIZADO' : 'APLICAR CONFIGURACIÓN MAESTRA'}
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
