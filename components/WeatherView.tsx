
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
      if (aemetData && aemetData.length > 0) {
        setXmlForecast(aemetData);
      } else {
        setXmlForecast([]);
      }
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
      <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin shadow-[0_0_20px_rgba(249,115,22,0.3)]" />
      <p className="text-orange-400 font-black text-[10px] uppercase tracking-[0.6em] animate-pulse italic">SYNCING_ATMOSPHERE_CORE...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 h-full pb-32 md:pb-8">
       
       {/* SELECTOR SUPERIOR */}
       <div className="glass-dark rounded-[30px] p-2 border border-white/10 shrink-0 sticky top-0 z-50 backdrop-blur-3xl shadow-2xl">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 px-1">
             {['Torrejón', 'Navalacruz', 'Santibáñez'].map((loc, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveIdx(idx)} 
                  className={`whitespace-nowrap text-[10px] px-6 py-3 md:py-4 rounded-2xl border font-black uppercase tracking-[0.2em] transition-all flex-1 ${activeIdx === idx ? 'bg-orange-600 border-orange-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}`}
                >
                  {loc}
                </button>
             ))}
             <button onClick={() => setShowRadar(!showRadar)} className={`whitespace-nowrap text-[10px] px-6 py-3 md:py-4 rounded-2xl border font-black uppercase tracking-[0.2em] transition-all ${showRadar ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/5 text-white/30'}`}>
                {showRadar ? 'WEATHER' : 'RADAR'}
              </button>
          </div>
       </div>

       {/* LAYOUT PRINCIPAL - Ajustado para iPhone 15 Pro */}
       <div className="flex flex-col lg:grid lg:grid-cols-[60%_40%] gap-6">
          
          {/* SECCIÓN ACTUAL + VISUAL */}
          <div className="flex flex-col gap-6">
             {/* KPI ACTUAL */}
             <div className="glass rounded-[40px] border border-orange-500/30 bg-orange-600/5 p-6 md:p-10 flex items-center justify-between shadow-2xl group transition-all">
                <div className="flex flex-col">
                   <div className="flex items-center gap-3 mb-2">
                      <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.4em] italic">{hasXml ? 'AEMET' : 'HA'}</p>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                   </div>
                   <div className="flex items-center gap-4 md:gap-8">
                      <h3 className="text-6xl md:text-8xl font-black text-white italic font-orbitron leading-none tracking-tighter">
                        {currentTemp}°
                      </h3>
                      <div className="flex flex-col">
                         <span className="text-xs md:text-sm font-black text-white/90 uppercase tracking-widest italic">{currentCondition}</span>
                         <span className="text-[7px] font-bold text-white/20 uppercase mt-1 tracking-widest font-mono">NODE_{currentNodeKey.toUpperCase()}</span>
                      </div>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                   <div className="flex flex-col items-center p-3 md:p-5 rounded-2xl bg-white/5 border border-white/5">
                      <span className="text-[7px] text-white/20 font-black uppercase mb-1">HUM</span>
                      <span className="text-sm md:text-xl font-black text-white">{haStates.find(s => s.entity_id === nodeConfig?.humidity_entity)?.state || '--'}%</span>
                   </div>
                   <div className="hidden md:flex flex-col items-center p-5 rounded-2xl bg-white/5 border border-white/5">
                      <span className="text-[7px] text-white/20 font-black uppercase mb-1">VIENTO</span>
                      <span className="text-xl font-black text-white">{haStates.find(s => s.entity_id === nodeConfig?.wind_entity)?.state || '--'}</span>
                   </div>
                </div>
             </div>

             {/* VISUAL / RADAR */}
             <div className="glass rounded-[40px] overflow-hidden border border-white/10 relative bg-black shadow-2xl h-[280px] md:h-[450px]">
                <div className="absolute top-4 left-6 z-10 flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-xl border border-white/10">
                   <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                   <span className="text-[8px] font-black text-white uppercase tracking-widest">SENTINEL_VISION</span>
                </div>
                
                {showRadar ? (
                  <iframe 
                    src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&zoom=8&overlay=rain&lat=${activeIdx === 0 ? '40.198' : activeIdx === 1 ? '40.439' : '40.175'}&lon=${activeIdx === 0 ? '-3.801' : activeIdx === 1 ? '-4.938' : '-6.223'}`} 
                    className="w-full h-full border-none opacity-90" 
                  />
                ) : (
                  <>
                    <img 
                      src={`${activeWeatherMock.webcamUrl || 'https://via.placeholder.com/800x450/020617/ffffff?text=OFFLINE'}${Date.now()}`} 
                      className="w-full h-full object-cover opacity-80" 
                      alt="Webcam" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                  </>
                )}
             </div>
          </div>

          {/* PREVISIÓN - PRIORIDAD EN MÓVIL */}
          <div className="glass rounded-[40px] border border-white/10 bg-black/40 flex flex-col shadow-2xl overflow-hidden min-h-[400px]">
             <div className="p-6 md:p-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-400 italic">PREVISIÓN_10_DÍAS</h4>
                <div className="w-10 h-1 bg-orange-500/20 rounded-full" />
             </div>
             
             <div className="flex-1 p-3 md:p-6 space-y-2 overflow-y-auto no-scrollbar">
                {forecast.length > 0 ? forecast.map((f: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 md:py-4 rounded-3xl bg-white/[0.03] border border-white/5 hover:bg-white/5 transition-all">
                     <div className="flex flex-col min-w-[70px]">
                        <span className="text-[10px] md:text-xs font-black text-white uppercase">{f.day}</span>
                        <span className={`text-[8px] font-bold ${f.pop > 20 ? 'text-blue-400' : 'text-white/20'}`}>{f.pop}% POP</span>
                     </div>
                     
                     <WeatherIcon condition={f.cond} className="w-8 h-8 md:w-10 md:h-10" />
                     
                     <div className="flex items-center gap-4 md:gap-6">
                        <div className="flex flex-col items-end">
                           <span className="text-lg md:text-2xl font-black text-white font-orbitron">{f.max}°</span>
                           <span className="text-[7px] text-white/20 uppercase font-black">MAX</span>
                        </div>
                        <div className="flex flex-col items-end opacity-40">
                           <span className="text-sm md:text-xl font-black text-blue-300 font-orbitron">{f.min}°</span>
                           <span className="text-[7px] text-blue-300/40 uppercase font-black">MIN</span>
                        </div>
                     </div>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                     <div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin mb-4" />
                     <p className="text-[8px] uppercase font-black tracking-widest">Capturando Datos...</p>
                  </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};

export default WeatherView;
