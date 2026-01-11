
import React, { useState, useEffect } from 'react';
import { MOCK_WEATHER } from '../constants';
import { fetchHAStates } from '../homeAssistantService';

const WeatherIcon = ({ condition, className = "w-8 h-8" }: { condition: string, className?: string }) => {
  const cond = condition.toLowerCase();
  if (cond.includes('despejado') || cond.includes('sol')) {
    return (
      <svg className={`${className} text-yellow-400 animate-[pulse_3s_infinite]`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707" />
      </svg>
    );
  }
  if (cond.includes('nuboso') || cond.includes('nubes') || cond.includes('intervalos')) {
    return (
      <svg className={`${className} text-white/70`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    );
  }
  if (cond.includes('lluvia')) {
    return (
      <svg className={`${className} text-blue-400 animate-bounce`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    );
  }
  return (
    <svg className={`${className} text-white/40`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
};

const WeatherView: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [haStates, setHaStates] = useState<any[]>([]);
  const [haConfig, setHaConfig] = useState<any>(null);
  const [camTimestamp, setCamTimestamp] = useState(Date.now());
  const [showRadar, setShowRadar] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('nexus_ha_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setHaConfig(parsed);
      refreshHA(parsed);
    }
    const interval = setInterval(() => {
      setCamTimestamp(Date.now());
      if (haConfig) refreshHA(haConfig);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const refreshHA = async (cfg: any) => {
    const states = await fetchHAStates(cfg.url, cfg.token);
    if (states) setHaStates(states);
  };

  const activeWeather = MOCK_WEATHER[activeIdx];
  const nodeKeys: ('torrejon' | 'navalacruz' | 'santibanez')[] = ['torrejon', 'navalacruz', 'santibanez'];
  const currentNodeKey = nodeKeys[activeIdx];
  
  const getRealVal = (entityId?: string) => {
    if (!entityId) return null;
    return haStates.find(s => s.entity_id === entityId)?.state;
  };

  const currentTemp = getRealVal(haConfig?.weather_nodes?.[currentNodeKey]?.temp_entity) || activeWeather.temp;
  const currentHumidity = getRealVal(haConfig?.weather_nodes?.[currentNodeKey]?.humidity_entity) || activeWeather.humidity;
  const currentWind = getRealVal(haConfig?.weather_nodes?.[currentNodeKey]?.wind_entity) || activeWeather.wind;
  const cameraEntity = haConfig?.weather_nodes?.[currentNodeKey]?.camera_entity;

  const getCameraUrl = () => {
    if (cameraEntity) {
      const state = haStates.find(s => s.entity_id === cameraEntity);
      if (state?.attributes?.entity_picture) {
        return `${haConfig.url.replace(/\/$/, '')}${state.attributes.entity_picture}&t=${camTimestamp}`;
      }
    }
    return `${activeWeather.webcamUrl}${camTimestamp}`;
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 h-full overflow-hidden pb-6 animate-in fade-in duration-700">
       {/* Header con Selector Dinámico */}
       <div className="glass-dark rounded-[28px] p-4 md:p-6 flex flex-col lg:flex-row justify-between items-center gap-6 border border-white/10 shrink-0 shadow-2xl">
          <div className="flex items-center gap-4 md:gap-6 w-full lg:w-auto">
             <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-[22px] flex items-center justify-center shadow-2xl shadow-blue-500/40 shrink-0">
                <WeatherIcon condition={activeWeather.condition} className="w-6 h-6 md:w-10 md:h-10" />
             </div>
             <div className="min-w-0">
                <h2 className="text-sm md:text-2xl font-black uppercase tracking-widest text-white leading-none truncate">{activeWeather.location}</h2>
                <div className="flex items-center gap-2 mt-2">
                   <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                   <p className="text-blue-400/80 text-[7px] md:text-[10px] uppercase font-black tracking-[0.4em] truncate italic">Telemetría Activa // RM_NODE_{currentNodeKey.toUpperCase()}</p>
                </div>
             </div>
          </div>
          
          {/* Selector de Ubicación con Scroll Horizontal Forzado en Móvil */}
          <div className="w-full lg:w-auto">
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 snap-x px-1">
              {MOCK_WEATHER.map((w, idx) => (
                <button 
                  key={idx} 
                  onClick={() => { setActiveIdx(idx); setShowRadar(false); }} 
                  className={`snap-center whitespace-nowrap text-[9px] md:text-[11px] px-6 py-4 rounded-2xl border-2 font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeIdx === idx ? 'bg-blue-600 border-blue-400 text-white shadow-xl shadow-blue-500/30' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'}`}
                >
                  {w.location.split(' ')[0]}
                </button>
              ))}
              <div className="w-px h-10 bg-white/10 mx-1 shrink-0 self-center" />
              <button 
                onClick={() => setShowRadar(!showRadar)} 
                className={`snap-center whitespace-nowrap text-[9px] md:text-[11px] px-6 py-4 rounded-2xl border-2 font-black uppercase tracking-[0.2em] transition-all duration-300 ${showRadar ? 'bg-orange-600 border-orange-400 text-white shadow-xl shadow-orange-500/30' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'}`}
              >
                🛰️ Radar
              </button>
            </div>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 flex-1 min-h-0 overflow-hidden">
          <div className="lg:col-span-3 flex flex-col gap-4 md:gap-6 overflow-hidden h-full">
             {/* Feed Visual (Cámara o Radar) */}
             <div className="glass rounded-[35px] md:rounded-[45px] overflow-hidden border border-white/10 relative h-[65%] lg:h-[75%] bg-black group shrink-0 shadow-inner">
                {showRadar ? (
                  <iframe src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=8&overlay=rain&product=ecmwf&level=surface&lat=${activeIdx === 0 ? 40.198 : activeIdx === 1 ? 40.439 : 40.175}&lon=${activeIdx === 0 ? -3.801 : activeIdx === 1 ? -4.938 : -6.223}`} className="w-full h-full border-none opacity-90 scale-105" title="Radar" />
                ) : (
                  <div className="w-full h-full relative">
                    <img key={activeIdx + camTimestamp} src={getCameraUrl()} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-1000" alt="Webcam" />
                    <div className="absolute top-4 left-4 md:top-8 md:left-8">
                       <div className="px-4 py-2 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/20 flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_red]" />
                          <span className="text-[9px] md:text-[11px] font-black uppercase text-white tracking-[0.3em]">RM_LIVE_FEED</span>
                       </div>
                    </div>
                  </div>
                )}
             </div>

             {/* Forecast Timeline */}
             <div className="grid grid-cols-4 gap-3 flex-1 min-h-0 overflow-hidden mb-2">
                {activeWeather.forecastTimeline.map((item, i) => (
                   <div key={i} className="glass p-3 md:p-5 rounded-[28px] border border-white/10 flex flex-col items-center justify-center gap-2 group hover:bg-white/10 transition-all cursor-default">
                      <span className="text-[8px] md:text-[11px] font-black uppercase text-white/30 tracking-[0.3em]">{item.time}</span>
                      <WeatherIcon condition={item.condition} className="w-6 h-6 md:w-10 md:h-10" />
                      <p className="text-base md:text-2xl font-black text-white italic">{item.temp}°</p>
                   </div>
                ))}
             </div>
          </div>

          <div className="flex flex-col gap-4 md:gap-6 overflow-hidden h-full">
             <div className="glass rounded-[35px] md:rounded-[45px] p-8 md:p-10 border border-white/10 flex flex-col flex-1 relative overflow-hidden min-h-0 bg-black/40 shadow-2xl">
                <div className="mb-6 md:mb-10">
                   <p className="text-[9px] md:text-[11px] font-black text-blue-400 uppercase tracking-[0.5em] mb-4 md:mb-6 italic">Métricas Tiempo Real</p>
                   <div className="flex items-center justify-between">
                      <div className="text-4xl md:text-6xl font-black text-white tracking-tighter italic">{currentTemp}°</div>
                      <WeatherIcon condition={activeWeather.condition} className="w-10 h-10 md:w-14 md:h-14" />
                   </div>
                </div>

                <div className="space-y-6 md:space-y-8 pt-6 md:pt-10 border-t border-white/10 flex-1 overflow-y-auto no-scrollbar">
                   <div className="flex justify-between items-center group">
                      <span className="text-[9px] md:text-[11px] uppercase font-black text-white/40 tracking-[0.3em]">Humedad</span>
                      <span className="text-xl md:text-3xl font-black text-white italic">{currentHumidity}%</span>
                   </div>
                   <div className="flex justify-between items-center group">
                      <span className="text-[9px] md:text-[11px] uppercase font-black text-white/40 tracking-[0.3em]">Viento</span>
                      <span className="text-xl md:text-3xl font-black text-white italic">{currentWind} <span className="text-[10px] text-white/20 ml-1">K/h</span></span>
                   </div>
                </div>

                <div className="mt-6 md:mt-10">
                   <div className="p-5 md:p-7 bg-blue-600/10 border border-blue-500/20 rounded-[25px] md:rounded-[35px] shadow-inner">
                      <p className="text-[8px] md:text-[10px] font-black uppercase text-blue-400 tracking-widest mb-2 md:mb-3">Previsión IA RM</p>
                      <p className="text-[11px] md:text-sm text-white/70 leading-relaxed italic font-medium">"{activeWeather.forecast}"</p>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

export default WeatherView;
