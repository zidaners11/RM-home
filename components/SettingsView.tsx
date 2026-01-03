
import React, { useState, useEffect } from 'react';
import { HomeAssistantConfig, WidgetConfig, WidgetType, FireflyConfig } from '../types';
import { fetchHAStates, DEFAULT_HA_URL, DEFAULT_HA_TOKEN } from '../homeAssistantService';

const SettingsView: React.FC = () => {
  const user = localStorage.getItem('nexus_user') || 'Juanmi';
  type TabType = 'core' | 'energy' | 'vehicle' | 'finance' | 'radar' | 'appearance';
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

  const [haStates, setHaStates] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  useEffect(() => {
    const savedHA = localStorage.getItem('nexus_ha_config');
    const savedFF = localStorage.getItem('nexus_firefly_config');
    
    if (savedHA) {
      const parsed = JSON.parse(savedHA);
      // Asegurar que el objeto vehicle existe para evitar errores de undefined
      if (!parsed.vehicle) parsed.vehicle = haConfig.vehicle;
      setHaConfig(prev => ({...prev, ...parsed}));
      loadHAEntities(parsed.url, parsed.token);
    }
    if (savedFF) setFireflyConfig(JSON.parse(savedFF));
  }, []);

  const loadHAEntities = async (url: string, token: string) => {
    try {
      const states = await fetchHAStates(url, token);
      if (states) setHaStates(states);
    } catch (e) {
      console.error("Error loading HA entities:", e);
    }
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
      }, 1000);
    }, 1000);
  };

  const EntitySelector = ({ label, value, onChange, multi = false }: any) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const filtered = (haStates || []).filter(s => 
      s.entity_id.toLowerCase().includes(search.toLowerCase()) ||
      (s.attributes.friendly_name || '').toLowerCase().includes(search.toLowerCase())
    ).slice(0, 50);

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
          
          {/* VEHÍCULO - TODOS LOS KPIS AHORA MAPEABLES */}
          {activeTab === 'vehicle' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-2">
              <div className="p-8 bg-blue-600/5 border border-blue-500/20 rounded-[40px] space-y-6">
                 <h4 className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Multimedia y Control</h4>
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase text-white/30 ml-4 tracking-widest">URL Imagen del Coche (JPG/PNG)</label>
                       <input 
                         type="text" 
                         value={haConfig.vehicle.image_url} 
                         onChange={e => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, image_url: e.target.value}})} 
                         className="w-full glass bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500/50" 
                         placeholder="Ej: https://mi-imagen.com/coche.jpg" 
                       />
                       <p className="text-[8px] text-white/20 italic ml-4">Esta imagen se mostrará como fondo en la sección de coche.</p>
                    </div>
                    <EntitySelector label="Botón Actualizar Datos" value={haConfig.vehicle.refresh_button_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, refresh_button_entity: v}})} />
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                <div className="space-y-6">
                  <h5 className="text-[9px] font-black uppercase text-blue-500/60 tracking-widest px-4 border-l-2 border-blue-500">Estado Base</h5>
                  <EntitySelector label="Nivel Batería (%)" value={haConfig.vehicle.battery_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, battery_entity: v}})} />
                  <EntitySelector label="Estado Operacional" value={haConfig.vehicle.status_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, status_entity: v}})} />
                  <EntitySelector label="Odómetro Total (km)" value={haConfig.vehicle.odometer_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, odometer_entity: v}})} />
                  <EntitySelector label="Combustible (Litros)" value={haConfig.vehicle.fuel_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, fuel_entity: v}})} />
                </div>

                <div className="space-y-6">
                  <h5 className="text-[9px] font-black uppercase text-green-500/60 tracking-widest px-4 border-l-2 border-green-500">Energía y Carga</h5>
                  <EntitySelector label="Velocidad Carga (kW)" value={haConfig.vehicle.charging_speed_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, charging_speed_entity: v}})} />
                  <EntitySelector label="Tiempo para Carga (min)" value={haConfig.vehicle.time_to_charge_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, time_to_charge_entity: v}})} />
                  <EntitySelector label="Uso Eléctrico (%)" value={haConfig.vehicle.electric_use_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, electric_use_entity: v}})} />
                  <EntitySelector label="Consumo Medio" value={haConfig.vehicle.avg_consumption_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, avg_consumption_entity: v}})} />
                </div>

                <div className="space-y-6">
                  <h5 className="text-[9px] font-black uppercase text-purple-500/60 tracking-widest px-4 border-l-2 border-purple-500">Diario y Revisión</h5>
                  <EntitySelector label="Km Hoy" value={haConfig.vehicle.km_today_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, km_today_entity: v}})} />
                  <EntitySelector label="Km para Revisión" value={haConfig.vehicle.service_km_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, service_km_entity: v}})} />
                  <EntitySelector label="Ahorro Acumulado (€)" value={haConfig.vehicle.saving_entity} onChange={(v:any) => setHaConfig({...haConfig, vehicle: {...haConfig.vehicle, saving_entity: v}})} />
                </div>
              </div>
            </div>
          )}

          {/* OTRAS PESTAÑAS */}
          {activeTab === 'core' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-white/30 ml-4 tracking-widest">URL Instancia Home Assistant</label>
                    <input type="text" value={haConfig.url} onChange={e => setHaConfig({...haConfig, url: e.target.value})} className="w-full glass bg-white/5 p-4 rounded-2xl outline-none text-xs text-white border border-white/5" placeholder="https://..." />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-white/30 ml-4 tracking-widest">Token de Acceso de Larga Duración</label>
                    <input type="password" value={haConfig.token} onChange={e => setHaConfig({...haConfig, token: e.target.value})} className="w-full glass bg-white/5 p-4 rounded-2xl outline-none text-xs text-white border border-white/5" placeholder="eyJ..." />
                 </div>
              </div>
              <button onClick={() => loadHAEntities(haConfig.url, haConfig.token)} className="px-8 py-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-400 transition-all">Sincronizar Catálogo de Entidades</button>
            </div>
          )}

          {activeTab === 'appearance' && (
             <div className="space-y-8 animate-in slide-in-from-bottom-2">
                <div className="p-8 bg-purple-500/5 border border-purple-500/20 rounded-[40px] space-y-6">
                   <h4 className="text-[10px] font-black uppercase text-purple-400 tracking-widest">Estética Global</h4>
                   <div className="space-y-4">
                      <div className="space-y-2">
                         <label className="text-[9px] font-black uppercase text-white/30 ml-4 tracking-widest">URL Fondo de Pantalla Principal</label>
                         <input type="text" value={haConfig.custom_bg_url} onChange={e => setHaConfig({...haConfig, custom_bg_url: e.target.value})} className="w-full glass bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white" placeholder="https://..." />
                      </div>
                   </div>
                </div>
             </div>
          )}
        </div>
      </div>

      <div className="shrink-0 flex justify-center pt-8 border-t border-white/10">
        <button onClick={handleSave} className="w-full max-w-lg py-6 bg-blue-600 rounded-[35px] font-black text-[12px] tracking-[0.5em] uppercase shadow-2xl transition-all hover:scale-[1.02] active:scale-95">
          {status === 'saving' ? 'CONFIGURANDO NÚCLEO...' : status === 'success' ? '✓ SISTEMA ACTUALIZADO' : 'APLICAR CONFIGURACIÓN MAESTRA'}
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
