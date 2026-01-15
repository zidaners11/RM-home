
import React, { useState, useEffect, useCallback } from 'react';
import { MOCK_WEATHER } from '../constants';
import { fetchHAStates, fetchAemetXml } from '../homeAssistantService';

const WeatherIcon = ({ condition, className = "w-8 h-8" }: { condition: string, className?: string }) => {
  const cond = condition?.toLowerCase() || '';
  const isThunder = cond.includes('tormenta') || cond.includes('rayos') || cond.includes('thunder');
  const isRain = cond.includes('lluvia') || cond.includes('chubascos') || cond.includes('lluvioso') || cond.includes('rain');
  const isCloudy = cond.includes('nubes') || cond.includes('nuboso') || cond.includes('cubierto') || cond.includes('bruma') || cond.includes('niebla') || cond.includes('cloudy');
  const isSunny = cond.includes('despejado') || cond.includes('poco nuboso') || cond.includes('sunny') || cond.includes('clear');

  if (isThunder) return <svg className={`${className} text-yellow-400 animate-pulse`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
  if (isRain) return <svg className={`${className} text-blue-400 animate-bounce`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>;
  if (isCloudy) return <svg className={`${className} text-white/60`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>;
  if (isSunny) return <svg className={`${className} text-yellow-400 animate-spin-slow`} style={{animationDuration: '8s'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M8 12a4 4 0 118 0 4 4 0 01-8 0z" /></svg>;
  
  return <svg className={`${className} text-white/20`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4a2 2 0 012-2m16 0h-2M4 13H6" /></svg>;
};

const WeatherView: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [haStates, setHaStates] = useState<any[]>([]);
  const [xmlForecast, setXmlForecast] = useState<any[]>([]);
  const [haConfig, setHaConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRadar, setShowRadar] = useState(false);

  const aemetUrls = [
    "https://www.aemet.es/xml/municipios/localidad_28149.xml",
    "https://www.aemet.es/xml/municipios/localidad_05157.xml",
    "https://www.aemet.es/xml/municipios/localidad_10172.xml"
  ];

  const refreshData = useCallback(async () => {
    const saved = localStorage.getItem('nexus_ha_config');
    if (saved) {
      const cfg = JSON.parse(saved);
      setHaConfig(cfg);
      const statesPromise = fetchHAStates(cfg.url, cfg.token);
      const aemetPromise = fetchAemetXml(aemetUrls[activeIdx]);
      const [states, aemetData] = await Promise.all([statesPromise, aemetPromise]);
      if (states) setHaStates(states);
      if (aemetData && aemetData.length > 0) setXmlForecast(aemetData);
      setLoading(false);
    }
  }, [activeIdx]);

  useEffect(() => {
    setLoading(true);
    refreshData();
    const interval = setInterval(refreshData, 300000); 
    return () => clearInterval(interval);
  }, [activeIdx, refreshData]);

  const nodeNames = ['torrejon', 'navalacruz', 'santibanez'];
  const currentNodeKey = nodeNames[activeIdx];
  const activeWeatherMock = MOCK_WEATHER[activeIdx];
  const nodeConfig = haConfig?.weather_nodes?.[currentNodeKey];
  const weatherEntity = haStates.find(s => s.entity_id === nodeConfig?.weather_entity);

  const hasXml = xmlForecast.length > 0;
  const currentTemp = hasXml ? xmlForecast[0].max : (haStates.find(s => s.entity_id === nodeConfig?.temp_entity)?.state || weatherEntity?.attributes?.temperature || activeWeatherMock.temp);
  const currentCondition = hasXml ? xmlForecast[0].cond : (weatherEntity?.state || activeWeatherMock.condition);

  const forecast = hasXml ? xmlForecast : (weatherEntity?.attributes?.forecast?.slice(0, 10).map((f: any) => ({
    day: new Date(f.datetime).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }).toUpperCase(),
    max: Math.round(f.temperature || 0),
    min: Math.round(f.templow || (f.temperature - 5)),
    pop: f.precipitation_probability || 0,
    cond: f.condition
  })) || []);

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center gap-6">
      <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin shadow-[0_0_20px_rgba(59,130,246,0.3)]" />
      <p className="text-blue-400 font-black text-[10px] uppercase tracking-[0.6em] animate-pulse">RECALIBRATING_SENSORS...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 h-full pb-8">
       
       {/* Selector de Nodos - Sticky para acceso rápido */}
       <div className="glass rounded-[25px] p-1.5 border border-white/10 shrink-0 sticky top-0 z-50 backdrop-blur-3xl shadow-2xl">
          <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5 px-0.5">
             {['Torrejón', 'Navalacruz', 'Santibáñez'].map((loc, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveIdx(idx)} 
                  className={`whitespace-nowrap text-[10px] px-5 py-3 rounded-2xl border font-black uppercase tracking-widest transition-all flex-1 ${activeIdx === idx ? 'bg-orange-600 border-orange-400 text-white' : 'bg-white/5 border-transparent text-white/30'}`}
                >
                  {loc}
                </button>
             ))}
             <button onClick={() => setShowRadar(!showRadar)} className={`whitespace-nowrap text-[10px] px-5 py-3 rounded-2xl border font-black uppercase tracking-widest transition-all ${showRadar ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-transparent text-white/30'}`}>
                {showRadar ? 'VISUAL' : 'RADAR'}
              </button>
          </div>
       </div>

       {/* Widget Clima Principal */}
       <div className="flex flex-col gap-5 lg:grid lg:grid-cols-2">
          
          <div className="flex flex-col gap-5">
             {/* Info Actual - Estilo HUD */}
             <div className="glass rounded-[35px] border border-white/10 bg-black/40 p-6 flex items-center justify-between shadow-2xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl -z-10 animate-pulse" />
                <div className="flex flex-col">
                   <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.4em] mb-2">TELEMETRY_LIVE</p>
                   <div className="flex items-center gap-5">
                      <h3 className="text-7xl font-black text-white italic font-orbitron leading-none tracking-tighter">
                        {currentTemp}°
                      </h3>
                      <div className="flex flex-col border-l border-white/10 pl-4">
                         <span className="text-sm font-black text-white/90 uppercase italic leading-none">{currentCondition}</span>
                         <span className="text-[7px] font-bold text-white/20 uppercase mt-2 tracking-widest">NODE_{currentNodeKey.toUpperCase()}</span>
                      </div>
                   </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                   <WeatherIcon condition={currentCondition} className="w-12 h-12" />
                   <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                         <span className="text-[7px] text-white/20 font-black uppercase">HUM</span>
                         <span className="text-xs font-black text-white">{haStates.find(s => s.entity_id === nodeConfig?.humidity_entity)?.state || '--'}%</span>
                      </div>
                      <div className="flex flex-col items-center">
                         <span className="text-[7px] text-white/20 font-black uppercase">WND</span>
                         <span className="text-xs font-black text-white">{haStates.find(s => s.entity_id === nodeConfig?.wind_entity)?.state || '--'}</span>
                      </div>
                   </div>
                </div>
             </div>

             {/* Cámara / Radar - Tamaño optimizado para móvil */}
             <div className="glass rounded-[35px] overflow-hidden border border-white/10 relative bg-black shadow-2xl h-[240px] md:h-[400px]">
                <div className="absolute top-4 left-6 z-10 flex items-center gap-2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                   <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                   <span className="text-[8px] font-black text-white uppercase tracking-widest">SENTINEL_STREAM</span>
                </div>
                {showRadar ? (
                  <iframe 
                    src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&zoom=8&overlay=rain&lat=${activeIdx === 0 ? '40.198' : activeIdx === 1 ? '40.439' : '40.175'}&lon=${activeIdx === 0 ? '-3.801' : activeIdx === 1 ? '-4.938' : '-6.223'}`} 
                    className="w-full h-full border-none opacity-80" 
                  />
                ) : (
                  <div className="w-full h-full relative">
                    <img 
                      src={`${activeWeatherMock.webcamUrl || 'https://via.placeholder.com/800x450/020617/ffffff?text=OFFLINE'}${Date.now()}`} 
                      className="w-full h-full object-cover opacity-90 transition-opacity duration-1000" 
                      alt="Webcam" 
                      onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                  </div>
                )}
             </div>
          </div>

          {/* Previsión - Listado vertical adaptativo */}
          <div className="glass rounded-[35px] border border-white/10 bg-black/40 flex flex-col shadow-2xl overflow-hidden min-h-0">
             <div className="px-6 py-5 border-b border-white/5 bg-white/5 flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">LONG_RANGE_FORECAST</h4>
                <div className="flex gap-1">
                   <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                   <div className="w-1 h-1 rounded-full bg-blue-500/50" />
                </div>
             </div>
             
             <div className="flex-1 p-3 space-y-1.5 overflow-y-auto no-scrollbar max-h-[500px]">
                {forecast.length > 0 ? forecast.map((f: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                     <div className="flex flex-col min-w-[70px]">
                        <span className="text-[11px] font-black text-white uppercase">{f.day}</span>
                        <span className={`text-[8px] font-bold ${f.pop > 30 ? 'text-blue-400' : 'text-white/20'}`}>{f.pop}% POP</span>
                     </div>
                     <WeatherIcon condition={f.cond} className="w-7 h-7 md:w-8 md:h-8" />
                     <div className="flex items-center gap-5">
                        <div className="flex flex-col items-end">
                           <span className="text-base md:text-xl font-black text-white font-orbitron">{f.max}°</span>
                           <span className="text-[7px] text-white/20 uppercase font-black">MAX</span>
                        </div>
                        <div className="flex flex-col items-end opacity-40">
                           <span className="text-sm md:text-lg font-black text-blue-300 font-orbitron">{f.min}°</span>
                           <span className="text-[7px] text-blue-300/40 uppercase font-black">MIN</span>
                        </div>
                     </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-10 opacity-20">
                     <div className="w-6 h-6 border-2 border-white/10 border-t-white rounded-full animate-spin mb-3" />
                     <p className="text-[8px] uppercase font-black">Syncing Matrix...</p>
                  </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};

export default WeatherView;
