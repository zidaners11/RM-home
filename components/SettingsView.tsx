
import React, { useState, useEffect } from 'react';
import { HomeAssistantConfig, FireflyConfig } from '../types';
import { fetchHAStates, testHAConnection } from '../homeAssistantService';

const SettingsView: React.FC = () => {
  const [haConfig, setHaConfig] = useState<HomeAssistantConfig>({
    url: '', token: '', pinnedEntities: [], solar_production_entity: '', grid_consumption_entity: '', 
    grid_export_entity: '', car_battery_entity: '', invoice_entity: '',
    security_cameras: [], security_sensors: [], temperature_sensors: [], tracked_people: [],
    weather_nodes: {
      torrejon: { id: 'torrejon', name: 'Torrejón de la Calzada' },
      navalacruz: { id: 'navalacruz', name: 'Navalacruz' },
      santibanez: { id: 'santibanez', name: 'Santibáñez el Bajo' }
    }
  });
  const [fireflyConfig, setFireflyConfig] = useState<FireflyConfig>({
    url: '', token: '', use_sheets_mirror: true, sheets_csv_url: ''
  });

  const [haStates, setHaStates] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [testStatus, setTestStatus] = useState<{loading: boolean, result: string | null}>({loading: false, result: null});
  const [activeTab, setActiveTab] = useState<'core' | 'energy' | 'security' | 'weather' | 'finance'>('core');

  useEffect(() => {
    const savedHA = localStorage.getItem('nexus_ha_config');
    const savedFF = localStorage.getItem('nexus_firefly_config');
    
    if (savedHA) {
      const parsed = JSON.parse(savedHA);
      setHaConfig(prev => ({...prev, ...parsed}));
      loadHAEntities(parsed.url, parsed.token);
    }
    if (savedFF) setFireflyConfig(JSON.parse(savedFF));
  }, []);

  const loadHAEntities = async (url: string, token: string) => {
    if (!url || !token) return;
    try {
      const states = await fetchHAStates(url, token);
      if (states) setHaStates(states);
    } catch(e) {}
  };

  const handleTestHA = async () => {
    setTestStatus({loading: true, result: null});
    try {
      const res = await testHAConnection(haConfig.url, haConfig.token);
      setTestStatus({
        loading: false, 
        result: res.success ? `CONECTADO (v${res.version})` : `ERROR: ${res.error}`
      });
      if (res.success) loadHAEntities(haConfig.url, haConfig.token);
    } catch (e: any) {
      setTestStatus({loading: false, result: `ERROR: ${e.message}`});
    }
  };

  const handleSave = () => {
    setStatus('saving');
    localStorage.setItem('nexus_ha_config', JSON.stringify(haConfig));
    localStorage.setItem('nexus_firefly_config', JSON.stringify(fireflyConfig));
    setTimeout(() => {
      setStatus('success');
      loadHAEntities(haConfig.url, haConfig.token);
    }, 800);
    setTimeout(() => setStatus('idle'), 3000);
  };

  const SearchableEntitySelect = ({ label, value, onChange, filterType, multi = false }: { label: string, value: any, onChange: (val: any) => void, filterType?: string, multi?: boolean }) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    
    const safeStates = haStates || [];
    const filtered = safeStates.filter(s => 
      (!filterType || s.entity_id.startsWith(filterType)) &&
      (s.entity_id.toLowerCase().includes(search.toLowerCase()) || 
       (s.attributes.friendly_name || '').toLowerCase().includes(search.toLowerCase()))
    ).slice(0, 50);

    const getEntityLabel = (id: string) => safeStates.find(s => s.entity_id === id)?.attributes.friendly_name || id;

    return (
      <div className="space-y-2 relative">
        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30 ml-4">{label}</label>
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[13px] text-white cursor-pointer flex justify-between items-center hover:bg-white/10 min-h-[56px] transition-all"
        >
          <div className="flex flex-wrap gap-2">
            {multi ? (
              (value as string[] || []).length > 0 ? (value as string[]).map(v => (
                <span key={v} className="bg-blue-600/40 px-3 py-1 rounded-lg text-[10px] border border-blue-400/30 font-black uppercase">{getEntityLabel(v)}</span>
              )) : <span className="text-white/20 uppercase font-black tracking-widest text-[11px]">Multiple Selection...</span>
            ) : (
              <span className={value ? 'text-white font-bold' : 'text-white/20 uppercase font-black tracking-widest text-[11px]'}>{value ? getEntityLabel(value as string) : 'No seleccionado'}</span>
            )}
          </div>
          <svg className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        
        {isOpen && (
          <div className="absolute z-[100] w-full mt-2 glass-dark border border-white/20 rounded-3xl p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
             <input autoFocus placeholder="Filtrar Entidades..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white mb-4 outline-none focus:border-blue-500/50" />
             <div className="max-h-64 overflow-y-auto space-y-1 no-scrollbar pr-2">
                {filtered.map(s => {
                  const isSelected = multi ? (value as string[] || []).includes(s.entity_id) : value === s.entity_id;
                  return (
                    <button 
                      key={s.entity_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (multi) {
                          const current = (value as string[] || []);
                          onChange(isSelected ? current.filter(x => x !== s.entity_id) : [...current, s.entity_id]);
                        } else {
                          onChange(s.entity_id);
                          setIsOpen(false);
                        }
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all flex justify-between items-center ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-white/10 text-white/50'}`}
                    >
                      <div className="pointer-events-none">
                        <p className="text-[12px] font-black uppercase tracking-tight">{s.attributes.friendly_name || s.entity_id}</p>
                        <p className="text-[9px] opacity-30 font-mono mt-1">{s.entity_id}</p>
                      </div>
                      {isSelected && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
                    </button>
                  );
                })}
             </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-8 animate-in fade-in duration-500 overflow-hidden pb-8">
      
      <div className="flex gap-4 overflow-x-auto no-scrollbar shrink-0 px-2">
        {[
          {id: 'core', label: 'HA Core'},
          {id: 'energy', label: 'Energía'},
          {id: 'security', label: 'Seguridad'},
          {id: 'weather', label: 'Nodos Clima'},
          {id: 'finance', label: 'Finanzas'}
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] transition-all shrink-0 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/40 scale-105' : 'glass text-white/30 hover:bg-white/10'}`}>{tab.label}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-4 no-scrollbar">
        <div className="space-y-8">
          {activeTab === 'core' && (
            <div className="glass rounded-[48px] p-10 border border-white/10 space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-white uppercase tracking-widest">RM_Core_Handshake</h2>
                {testStatus.result && (
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${testStatus.result.includes('CONECTADO') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {testStatus.result}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase text-white/20 ml-4">URL Home Assistant</label>
                    <input placeholder="https://mi-ha.duckdns.org" value={haConfig.url} onChange={e => setHaConfig({...haConfig, url: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm text-white outline-none focus:border-blue-500/50" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase text-white/20 ml-4">Token Larga Duración</label>
                    <input type="password" placeholder="API_SECRET_KEY..." value={haConfig.token} onChange={e => setHaConfig({...haConfig, token: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm text-white outline-none focus:border-blue-500/50" />
                 </div>
              </div>
              <button 
                onClick={handleTestHA}
                disabled={testStatus.loading}
                className="flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] text-white/60 transition-all disabled:opacity-50"
              >
                {testStatus.loading ? 'COMPROBANDO ENLACE...' : 'TEST DE CONEXIÓN'}
              </button>
            </div>
          )}

          {activeTab === 'energy' && (
            <div className="glass rounded-[48px] p-10 border border-white/10 space-y-8">
              <h2 className="text-2xl font-black text-yellow-500 uppercase tracking-widest">Matriz_Energética_Config</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <SearchableEntitySelect label="Producción Solar" value={haConfig.solar_production_entity || ''} onChange={v => setHaConfig({...haConfig, solar_production_entity: v})} filterType="sensor" />
                <SearchableEntitySelect label="Consumo Red" value={haConfig.grid_consumption_entity || ''} onChange={v => setHaConfig({...haConfig, grid_consumption_entity: v})} filterType="sensor" />
                <SearchableEntitySelect label="Exportación Red" value={haConfig.grid_export_entity || ''} onChange={v => setHaConfig({...haConfig, grid_export_entity: v})} filterType="sensor" />
                <SearchableEntitySelect label="Batería Coche" value={haConfig.car_battery_entity || ''} onChange={v => setHaConfig({...haConfig, car_battery_entity: v})} filterType="sensor" />
                <SearchableEntitySelect label="Entidad Factura (€)" value={haConfig.invoice_entity || ''} onChange={v => setHaConfig({...haConfig, invoice_entity: v})} filterType="sensor" />
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="glass rounded-[48px] p-10 border border-white/10 space-y-8">
              <h2 className="text-2xl font-black text-red-600 uppercase tracking-widest">Protocolos_Seguridad_Sentinel</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <SearchableEntitySelect label="Panel de Alarma" value={haConfig.alarm_entity || ''} onChange={v => setHaConfig({...haConfig, alarm_entity: v})} filterType="alarm_control_panel" />
                <SearchableEntitySelect label="Cámaras Sentinel" value={haConfig.security_cameras || []} onChange={v => setHaConfig({...haConfig, security_cameras: v})} filterType="camera" multi />
                <SearchableEntitySelect label="Sensores Perimetrales" value={haConfig.security_sensors || []} onChange={v => setHaConfig({...haConfig, security_sensors: v})} filterType="binary_sensor" multi />
                <SearchableEntitySelect label="Personas a Trakear" value={haConfig.tracked_people || []} onChange={v => setHaConfig({...haConfig, tracked_people: v})} filterType="person" multi />
              </div>
            </div>
          )}

          {activeTab === 'weather' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
              {['torrejon', 'navalacruz', 'santibanez'].map((key) => {
                const node = haConfig.weather_nodes?.[key as 'torrejon'] || { id: key, name: key };
                return (
                  <div key={key} className="glass rounded-[32px] p-8 border border-white/10 space-y-6">
                    <h3 className="text-lg font-black text-blue-400 uppercase tracking-[0.4em]">{node.name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <SearchableEntitySelect label="Cámara" value={node.camera_entity || ''} onChange={v => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, [key]: {...node, camera_entity: v}}})} filterType="camera" />
                      <SearchableEntitySelect label="Sensor Temperatura" value={node.temp_entity || ''} onChange={v => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, [key]: {...node, temp_entity: v}}})} filterType="sensor" />
                      <SearchableEntitySelect label="Sensor Humedad" value={node.humidity_entity || ''} onChange={v => setHaConfig({...haConfig, weather_nodes: {...haConfig.weather_nodes, [key]: {...node, humidity_entity: v}}})} filterType="sensor" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="glass rounded-[48px] p-10 border border-white/10 space-y-8">
              <h2 className="text-2xl font-black text-blue-500 uppercase tracking-widest">Espejo_Financiero_Sheets</h2>
              <div className="space-y-6">
                 <div className="flex items-center gap-4 p-5 bg-blue-500/10 border border-blue-500/20 rounded-3xl">
                    <input 
                      type="checkbox" 
                      checked={fireflyConfig.use_sheets_mirror} 
                      onChange={e => setFireflyConfig({...fireflyConfig, use_sheets_mirror: e.target.checked})} 
                      className="w-6 h-6 rounded bg-black border-white/10 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-sm font-black uppercase text-white tracking-widest">Activar Espejo de Datos (Google Sheets)</p>
                      <p className="text-[10px] text-white/40 font-medium">Usa una hoja publicada en la web como fuente principal de finanzas.</p>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase text-white/20 ml-4">URL de Publicación CSV</label>
                    <input 
                      placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv" 
                      value={fireflyConfig.sheets_csv_url} 
                      onChange={e => setFireflyConfig({...fireflyConfig, sheets_csv_url: e.target.value})} 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm text-white outline-none focus:border-blue-500/50" 
                    />
                    <p className="text-[9px] text-white/20 ml-4 font-mono">Formato: Archivo - Publicar en la web - CSV</p>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center shrink-0 pt-6 border-t border-white/10">
        <button onClick={handleSave} className="w-full max-w-2xl py-6 bg-blue-600 rounded-[32px] font-black tracking-[0.6em] text-[11px] uppercase shadow-2xl transition-all hover:scale-[1.03] active:scale-95 shadow-blue-500/40">
          {status === 'saving' ? 'SINCRONIZANDO RED NEXUS...' : 'CONFIRMAR CAMBIOS MAESTROS'}
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
