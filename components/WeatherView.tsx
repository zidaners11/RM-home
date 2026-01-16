
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
      <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
      <p className="text-orange-400 font-black text-[10px] uppercase tracking-[0.6em] animate-pulse">SINCRO_ATMOSFERA...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 md:gap-6 h-full pb-48 md:pb-8 overflow-y-auto no-scrollbar animate-in fade-in duration-1000">
       
       {/* SELECTOR_SUPERIOR */}
       <div className="glass rounded-[25px] p-2 border border-white/10 shrink-0 sticky top-0 z-[60] backdrop-blur-3xl shadow-xl">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
             {['TORREJÓN', 'NAVALACRUZ', 'SANTIBÁÑEZ'].map((loc, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveIdx(idx)} 
                  className={`whitespace-nowrap text-[9px] px-6 py-4 rounded-2xl border font-black uppercase tracking-widest transition-all flex-1 ${activeIdx === idx ? 'bg-orange-600 border-orange-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-white/30'}`}
                >
                  {loc}
                </button>
             ))}
             <button onClick={() => setShowRadar(!showRadar)} className={`whitespace-nowrap text-[9px] px-6 py-4 rounded-2xl border font-black uppercase tracking-widest transition-all ${showRadar ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-white/30'}`}>
                {showRadar ? 'CÁMARA_NODO' : 'RADAR_LLUVIA'}
              </button>
          </div>
       </div>

       <div className="flex flex-col lg:grid lg:grid-cols-[60%_40%] gap-4 md:gap-6">
          
          <div className="flex flex-col gap-4 md:gap-6">
             {/* ESTADO_ACTUAL */}
             <div className="glass rounded-[35px] md:rounded-[45px] border-2 border-orange-500/30 bg-black/60 p-6 md:p-10 flex items-center justify-between shadow-2xl">
                <div className="flex flex-col">
                   <div className="flex items-center gap-3 mb-2">
                      <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest italic">SINCRO_DATA_ATMOS</p>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                   </div>
                   <div className="flex items-center gap-4 md:gap-8">
                      <h3 className="text-6xl md:text-9xl font-black text-white italic leading-none tracking-tighter drop-shadow-2xl">
                        {currentTemp}°
                      </h3>
                      <div className="flex flex-col">
                         <span className="text-xs md:text-lg font-black text-white/90 uppercase tracking-widest italic">{currentCondition?.replace(' ', '_')}</span>
                         <span className="text-[7px] font-bold text-white/20 uppercase mt-2 tracking-tighter font-mono italic">ID_NODO: {currentNodeKey.toUpperCase()}</span>
                      </div>
                   </div>
                </div>
                <div className="hidden sm:grid grid-cols-2 gap-3">
                   <div className="flex flex-col items-center p-4 rounded-3xl bg-white/5 border border-white/10 min-w-[90px]">
                      <span className="text-[8px] text-white/20 font-black uppercase mb-1">HUMEDAD_REL</span>
                      <span className="text-xl font-black text-white">{haStates.find(s => s.entity_id === nodeConfig?.humidity_entity)?.state || '--'}%</span>
                   </div>
                   <div className="flex flex-col items-center p-4 rounded-3xl bg-white/5 border border-white/10 min-w-[90px]">
                      <span className="text-[8px] text-white/20 font-black uppercase mb-1">VIENTO_KMH</span>
                      <span className="text-xl font-black text-white">{haStates.find(s => s.entity_id === nodeConfig?.wind_entity)?.state || '--'}</span>
                   </div>
                </div>
             </div>

             {/* VISUAL_FEED_NODO */}
             <div className="glass rounded-[35px] md:rounded-[50px] overflow-hidden border border-white/10 relative bg-black shadow-2xl group min-h-[300px] h-[350px] md:h-auto md:flex-1">
                <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_red]" />
                   <span className="text-[9px] font-black text-white uppercase tracking-widest italic bg-black/40 px-3 py-1 rounded-lg backdrop-blur-md">STREAM_LIVE_{currentNodeKey.toUpperCase()}</span>
                </div>
                
                <div className="w-full h-full relative">
                   {showRadar ? (
                     <iframe 
                       src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&zoom=8&overlay=rain&lat=${activeIdx === 0 ? '40.198' : activeIdx === 1 ? '40.439' : '40.175'}&lon=${activeIdx === 0 ? '-3.801' : activeIdx === 1 ? '-4.938' : '-6.223'}`} 
                       className="w-full h-full border-none opacity-80" 
                     />
                   ) : (
                     <img 
                       src={`${activeWeatherMock.webcamUrl || 'https://via.placeholder.com/800x450/020617/ffffff?text=CAMERA_LINK_OFFLINE'}${Date.now()}`} 
                       className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700" 
                       alt="NEXUS_FEED" 
                       onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/800x450/020617/ffffff?text=FEED_NOT_AVAILABLE')}
                     />
                   )}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                </div>
             </div>
          </div>

          {/* PREVISIÓN_DIEZ_DÍAS */}
          <div className="glass rounded-[35px] md:rounded-[50px] border border-white/10 bg-black/50 flex flex-col shadow-2xl h-[450px] lg:h-auto overflow-hidden">
             <div className="p-8 border-b border-white/10 bg-white/5 flex justify-between items-center shrink-0">
                <div className="flex flex-col">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-400 italic">PREVISIÓN_SISTEMA</h4>
                   <p className="text-[7px] font-bold text-white/20 mt-2 uppercase tracking-widest font-mono">MODELO_AEMET_SYNC_10D</p>
                </div>
                <span className="text-2xl font-black text-white/90 italic">10_DÍAS</span>
             </div>
             
             {/* LISTADO_DESLIZABLE_CORREGIDO */}
             <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2.5">
                {forecast.length > 0 ? forecast.map((f: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-6 py-4 rounded-[30px] bg-white/5 border border-white/5 hover:border-orange-500/40 transition-all group/item hover:bg-white/10">
                     <div className="flex flex-col min-w-[80px]">
                        <span className="text-[10px] font-black text-white uppercase tracking-tight">{f.day?.replace(' ', '_')}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                           <div className={`w-1 h-1 rounded-full ${f.pop >= 30 ? 'bg-blue-500 animate-pulse' : 'bg-white/10'}`} />
                           <span className={`text-[8px] font-bold ${f.pop > 10 ? 'text-blue-400' : 'text-white/20'}`}>{f.pop}%_POP</span>
                        </div>
                     </div>
                     
                     <WeatherIcon condition={f.cond} className="w-8 h-8 group-hover/item:scale-125 transition-transform" />
                     
                     <div className="flex items-center gap-5 min-w-[90px] justify-end">
                        <div className="flex flex-col items-end">
                           <span className="text-xl font-black text-white italic leading-none">{f.max}°</span>
                           <span className="text-[7px] font-bold text-white/20 uppercase mt-1">MAX_C</span>
                        </div>
                        <div className="flex flex-col items-end opacity-40">
                           <span className="text-base font-black text-blue-300 italic leading-none">{f.min}°</span>
                           <span className="text-[7px] font-bold text-blue-300/50 uppercase mt-1">MIN_C</span>
                        </div>
                     </div>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center gap-4 opacity-20 py-20">
                     <div className="w-10 h-10 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
                     <p className="text-white uppercase font-black text-[8px] tracking-widest">CAPTURA_MODELOS_DATOS...</p>
                  </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};

export default WeatherView;
