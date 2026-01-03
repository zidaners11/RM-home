
import React, { useState, useEffect } from 'react';
import { HomeAssistantConfig, WidgetConfig, WidgetType, FireflyConfig } from '../types';
import { fetchHAStates, DEFAULT_HA_URL, DEFAULT_HA_TOKEN } from '../homeAssistantService';

const SettingsView: React.FC = () => {
  const user = localStorage.getItem('nexus_user') || 'Juanmi';
  type TabType = 'core' | 'energy' | 'vehicle' | 'finance' | 'radar' | 'desktop' | 'appearance';
  const [activeTab, setActiveTab] = useState<TabType>('core');
  
  const [haConfig, setHaConfig] = useState<HomeAssistantConfig>({
    url: DEFAULT_HA_URL, token: DEFAULT_HA_TOKEN, pinnedEntities: [], 
    security_cameras: [], security_sensors: [], temperature_sensors: [], tracked_people: [],
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
  });
  
  const [fireflyConfig, setFireflyConfig] = useState<FireflyConfig>({
    url: '', token: '', use_sheets_mirror: true, sheets_csv_url: ''
  });

  const [dashboardWidgets, setDashboardWidgets] = useState<WidgetConfig[]>([]);
  const [haStates, setHaStates] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  useEffect(() => {
    const savedHA = localStorage.getItem('nexus_ha_config');
    const savedFF = localStorage.getItem('nexus_firefly_config');
    const savedWidgets = localStorage.getItem(`nexus_widgets_${user}`);
    
    if (savedHA) {
      const parsed = JSON.parse(savedHA);
      setHaConfig(prev => ({...prev, ...parsed}));
      loadHAEntities(parsed.url, parsed.token);
    }
    if (savedFF) setFireflyConfig(JSON.parse(savedFF));
    if (savedWidgets) setDashboardWidgets(JSON.parse(savedWidgets));
  }, []);

  const loadHAEntities = async (url: string, token: string) => {
    const states = await fetchHAStates(url, token);
    if (states) setHaStates(states);
  };

  const handleSave = () => {
    setStatus('saving');
    localStorage.setItem('nexus_ha_config', JSON.stringify(haConfig));
    localStorage.setItem('nexus_firefly_config', JSON.stringify(fireflyConfig));
    localStorage.setItem(`nexus_widgets_${user}`, JSON.stringify(dashboardWidgets));
    
    setTimeout(() => {
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
      window.location.reload(); 
    }, 1000);
  };

  const EntitySelector = ({ label, value, onChange, multi = false }: any) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const filtered = (haStates || []).filter(s => 
      s.entity_id.toLowerCase().includes(search.toLowerCase()) ||
      (s.attributes.friendly_name || '').toLowerCase().includes(search.toLowerCase())
    ).slice(0, 40);

    const toggleSelection = (entityId: string) => {
      if (multi) {
        const current = Array.isArray(value) ? value : [];
        const next = current.includes(entityId) 
          ? current.filter(x => x !== entityId) 
          : [...current, entityId];
        onChange(next);
      } else {
        onChange(entityId);
        setIsOpen(false);
      }
    };

    return (
      <div className="space-y-2 relative">
        <label className="text-[9px] font-black uppercase text-white/30 ml-4 tracking-widest">{label}</label>
        <div onClick={() => setIsOpen(!isOpen)} className="w-full glass bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white cursor-pointer flex justify-between items-center hover:bg-white/10 transition-all">
           <span className="truncate max-w-[85%]">
              {multi 
                ? `${(value || []).length} seleccionados` 
                : (value || 'No configurado')
              }
           </span>
           <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        {isOpen && (
          <div className="absolute z-[100] w-full mt-2 glass-dark border border-white/20 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-2">
            <input autoFocus placeholder="Filtrar entidades..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white/10 border-none rounded-xl px-4 py-2 text-xs text-white mb-3 outline-none" />
            <div className="max-h-56 overflow-y-auto no-scrollbar space-y-1">
              {filtered.map(s => {
                const isSelected = multi 
                  ? (Array.isArray(value) && value.includes(s.entity_id)) 
                  : value === s.entity_id;
                return (
                  <div key={s.entity_id} onClick={() => toggleSelection(s.entity_id)} className={`px-4 py-2.5 rounded-xl cursor-pointer text-[10px] flex justify-between items-center transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-white/5 text-white/50'}`}>
                    <div className="flex flex-col">
                       <span className="font-bold">{s.attributes.friendly_name || s.entity_id}</span>
                       <span className="opacity-40 text-[8px]">{s.entity_id}</span>
                    </div>
                    {isSelected && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
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
      {/* Tab Navigation */}
      <div className="flex gap-3 border-b border-white/10 pb-4 overflow-x-auto no-scrollbar shrink-0">
        {[
          {id: 'core', label: 'HA Core'}, 
          {id: 'energy', label: 'Energía'},
          {id: 'vehicle', label: 'Coche'}, 
          {id: 'finance', label: 'Finanzas'},
          {id: 'radar', label: 'Radar'},
          {id: 'desktop', label: 'Escritorio'}, 
          {id: 'appearance', label: 'Apariencia'}
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as TabType)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar py-4 px-1">
        <div className="max-w-4xl space-y-10">
          
          {/* HA CORE */}
          {activeTab === 'core' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-white/30 ml-4 tracking-widest">URL Instancia</label>
                    <input type="text" value={haConfig.url} onChange={e => setHaConfig({...haConfig, url: e.target.value})} className="w-full glass bg-white/5 p-4 rounded-2xl outline-none text-xs text-white border border-white/5" placeholder="https://..." />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-white/30 ml-4 tracking-widest">Token Maestro</label>
                    <input type="password" value={haConfig.token} onChange={e => setHaConfig({...haConfig, token: e.target.value})} className="w-full glass bg-white/5 p-4 rounded-2xl outline-none text-xs text-white border border-white/5" placeholder="eyJ..." />
                 </div>
              </div>
              <button onClick={() => loadHAEntities(haConfig.url, haConfig.token)} className="px-8 py-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-400 transition-all">Sincronizar Catálogo de Entidades</button>
            </div>
          )}

          {/* ENERGÍA */}
          {activeTab === 'energy' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2">
              <EntitySelector label="Producción Solar (W)" value={haConfig.solar_production_entity} onChange={(v:any) => setHaConfig({...haConfig, solar_production_entity: v})} />
              <EntitySelector label="Solar Hoy (kWh)" value={haConfig.solar_daily_entity} onChange={(v:any) => setHaConfig({...haConfig, solar_daily_entity: v})} />
              <EntitySelector label="Solar Mes (kWh)" value={haConfig.solar_monthly_entity} onChange={(v:any) => setHaConfig({...haConfig, solar_monthly_entity: v})} />
              <EntitySelector label="Consumo Red (W)" value={haConfig.grid_consumption_entity} onChange={(v:any) => setHaConfig({...haConfig, grid_consumption_entity: v})} />
              <EntitySelector label="Exportación Red (W)" value={haConfig.grid_export_entity} onChange={(v:any) => setHaConfig({...haConfig, grid_export_entity: v})} />
              <EntitySelector label="Coste Energía (€/kWh)" value={haConfig.energy_cost_entity} onChange={(v:any) => setHaConfig({...haConfig, energy_cost_entity: v})} />
              <EntitySelector label="Batería Coche (%)" value={haConfig.car_battery_entity} onChange={(v:any) => setHaConfig({...haConfig, car_battery_entity: v})} />
              <EntitySelector label="Factura Estimada (€)" value={haConfig.invoice_entity} onChange={(v:any) => setHaConfig({...haConfig, invoice_entity: v})} />
            </div>
          )}

          {/* COCHE */}
          {activeTab === 'vehicle' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2">
              <div className="p-8 bg-blue-600/5 border border-blue-500/20 rounded-[40px] space-y-6">
                 <h4 className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Multimedia y Control</h4>
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase text-white/30 ml-4 tracking-widest">URL Imagen del Coche</label>
                       <input type="text" value={haConfig.vehicle.image_url} onChange={e => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, image_url: e.target.value}})} className="w-full glass bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white" placeholder="https://..." />
                    </div>
                    <EntitySelector label="Entidad Botón Actualizar (Real)" value={haConfig.vehicle.refresh_button_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, refresh_button_entity: v}})} />
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <EntitySelector label="Nivel Batería (%)" value={haConfig.vehicle.battery_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, battery_entity: v}})} />
                <EntitySelector label="Consumo Medio" value={haConfig.vehicle.avg_consumption_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, avg_consumption_entity: v}})} />
                <EntitySelector label="Kilómetros Hoy" value={haConfig.vehicle.km_today_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, km_today_entity: v}})} />
                <EntitySelector label="Estado Operacional" value={haConfig.vehicle.status_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, status_entity: v}})} />
                <EntitySelector label="Odómetro Total" value={haConfig.vehicle.odometer_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, odometer_entity: v}})} />
                <EntitySelector label="Combustible (Litros)" value={haConfig.vehicle.fuel_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, fuel_entity: v}})} />
              </div>
            </div>
          )}

          {/* FINANZAS (CSV MIRROR) */}
          {activeTab === 'finance' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2">
               <div className="p-8 bg-green-500/5 border border-green-500/20 rounded-[40px] space-y-6">
                  <h4 className="text-[10px] font-black uppercase text-green-400 tracking-widest">Espejo Google Sheets</h4>
                  <div className="space-y-6">
                     <div className="flex items-center gap-4 px-4">
                        <input type="checkbox" checked={fireflyConfig.use_sheets_mirror} onChange={e => setFireflyConfig({...fireflyConfig, use_sheets_mirror: e.target.checked})} className="w-6 h-6 accent-green-600 rounded-lg" id="mirror-check" />
                        <label htmlFor="mirror-check" className="text-xs font-black text-white/70 cursor-pointer uppercase tracking-widest">Activar Sincronización CSV</label>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-white/30 ml-4 tracking-widest">URL CSV Directa</label>
                        <input type="text" value={fireflyConfig.sheets_csv_url} onChange={e => setFireflyConfig({...fireflyConfig, sheets_csv_url: e.target.value})} className="w-full glass bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white" placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv" />
                     </div>
                  </div>
               </div>
               <div className="space-y-4">
                  <label className="text-[9px] font-black uppercase text-white/30 ml-4 tracking-widest">Token API Firefly (Opcional)</label>
                  <input type="password" value={fireflyConfig.token} onChange={e => setFireflyConfig({...fireflyConfig, token: e.target.value})} className="w-full glass bg-white/5 p-4 rounded-2xl outline-none text-xs text-white border border-white/5" />
               </div>
            </div>
          )}

          {/* RADAR (TRACKED PEOPLE) */}
          {activeTab === 'radar' && (
             <div className="space-y-6 animate-in slide-in-from-bottom-2">
                <div className="glass p-8 rounded-[40px] border border-white/10">
                   <EntitySelector label="Personas / Dispositivos a Rastrear" value={haConfig.tracked_people} onChange={(v:any) => setHaConfig({...haConfig, tracked_people: v})} multi={true} />
                   <p className="mt-4 px-4 text-[9px] text-white/20 italic uppercase tracking-widest">Selecciona las entidades 'person' o 'device_tracker' que deseas ver en el radar táctico.</p>
                </div>
             </div>
          )}

          {/* APARIENCIA (BACKGROUND) */}
          {activeTab === 'appearance' && (
             <div className="space-y-8 animate-in slide-in-from-bottom-2">
                <div className="p-8 bg-purple-500/5 border border-purple-500/20 rounded-[40px] space-y-6">
                   <h4 className="text-[10px] font-black uppercase text-purple-400 tracking-widest">Interfaz Estética</h4>
                   <div className="space-y-4">
                      <div className="space-y-2">
                         <label className="text-[9px] font-black uppercase text-white/30 ml-4 tracking-widest">Fondo de Pantalla Global (URL Imagen)</label>
                         <input type="text" value={haConfig.custom_bg_url} onChange={e => setHaConfig({...haConfig, custom_bg_url: e.target.value})} className="w-full glass bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white" placeholder="https://..." />
                      </div>
                   </div>
                </div>
                <div className="relative glass h-48 rounded-[40px] overflow-hidden border border-white/5 group">
                   <img src={haConfig.custom_bg_url} className="w-full h-full object-cover opacity-60 transition-transform group-hover:scale-110 duration-1000" alt="Preview" />
                   <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">Vista Previa del Fondo</span>
                   </div>
                </div>
             </div>
          )}

          {/* ESCRITORIO (WIDGETS) */}
          {activeTab === 'desktop' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2">
               <div className="flex justify-between items-center px-4">
                  <h3 className="text-[10px] font-black uppercase text-white/30 tracking-[0.4em]">Módulos de Inicio</h3>
                  <button onClick={() => setDashboardWidgets([...dashboardWidgets, {id: Date.now().toString(), type: 'sensor', title: 'Nuevo Módulo', entity_id: '', colSpan: 1}])} className="bg-blue-600 px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all">Añadir Widget</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {dashboardWidgets.map(w => (
                    <div key={w.id} className="glass p-6 rounded-[35px] border border-white/10 space-y-4 relative group hover:border-blue-500/30 transition-all">
                       <button onClick={() => setDashboardWidgets(dashboardWidgets.filter(x => x.id !== w.id))} className="absolute top-4 right-4 text-red-500 p-2 hover:bg-red-500/10 rounded-full transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                       </button>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[8px] font-black uppercase text-white/20 tracking-widest">Título</label>
                             <input value={w.title} onChange={e => setDashboardWidgets(dashboardWidgets.map(x => x.id === w.id ? {...x, title: e.target.value} : x))} className="w-full bg-white/5 p-3 rounded-xl text-[10px] text-white outline-none border border-white/5" placeholder="Nombre" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[8px] font-black uppercase text-white/20 tracking-widest">Tipo</label>
                             <select value={w.type} onChange={e => setDashboardWidgets(dashboardWidgets.map(x => x.id === w.id ? {...x, type: e.target.value as WidgetType} : x))} className="w-full bg-white/5 p-3 rounded-xl text-[10px] text-white appearance-none outline-none border border-white/5">
                                <option value="sensor">Sensor</option>
                                <option value="chart">Gráfico</option>
                                <option value="switch">Interruptor</option>
                                <option value="button">Botón</option>
                             </select>
                          </div>
                       </div>
                       <EntitySelector label="Entidad Vinculada" value={w.entity_id} onChange={(v: string) => setDashboardWidgets(dashboardWidgets.map(x => x.id === w.id ? {...x, entity_id: v} : x))} />
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 flex justify-center pt-8 border-t border-white/10">
        <button onClick={handleSave} className="w-full max-w-lg py-6 bg-blue-600 rounded-[35px] font-black text-[12px] tracking-[0.5em] uppercase shadow-2xl transition-all hover:scale-[1.02] active:scale-95">
          {status === 'saving' ? 'CONFIGURANDO NÚCLEO...' : status === 'success' ? '✓ CAMBIOS APLICADOS' : 'GUARDAR Y REINICIAR SISTEMA'}
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
