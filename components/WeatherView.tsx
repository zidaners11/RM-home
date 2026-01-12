
import React, { useState, useEffect, useCallback } from 'react';
import { MOCK_WEATHER } from '../constants';
import { fetchHAStates } from '../homeAssistantService';

const WeatherIcon = ({ condition, className = "w-8 h-8" }: { condition: string, className?: string }) => {
  const cond = condition?.toLowerCase() || '';
  
  const isThunder = cond.includes('thunder') || cond.includes('tormenta') || cond.includes('lightning');
  const isRain = cond.includes('rain') || cond.includes('lluvia') || cond.includes('pouring');
  const isCloudy = cond.includes('cloudy') || cond.includes('nubes') || cond.includes('nuboso') || cond.includes('fog');
  const isSunny = cond.includes('sunny') || cond.includes('clear') || cond.includes('despejado');

  if (isThunder) return <svg className={`${className} text-yellow-400 animate-pulse`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
  if (isRain) return <svg className={`${className} text-blue-400 animate-bounce`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>;
  if (isCloudy) return <svg className={`${className} text-white/60`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>;
  if (isSunny) return <svg className={`${className} text-yellow-400 animate-spin-slow`} style={{animationDuration: '8s'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M8 12a4 4 0 118 0 4 4 0 01-8 0z" /></svg>;
  
  return <svg className={`${className} text-white/20`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4a2 2 0 012-2m16 0h-2M4 13H6" /></svg>;
};

const WeatherView: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [haStates, setHaStates] = useState<any[]>([]);
  const [haConfig, setHaConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [camTimestamp, setCamTimestamp] = useState(Date.now());
  const [showRadar, setShowRadar] = useState(false);

  const refreshData = useCallback(async () => {
    const saved = localStorage.getItem('nexus_ha_config');
    if (saved) {
      const cfg = JSON.parse(saved);
      setHaConfig(cfg);
      const states = await fetchHAStates(cfg.url, cfg.token);
      if (states) setHaStates(states);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(() => {
      refreshData();
      setCamTimestamp(Date.now());
    }, 300000); // 5 minutos
    return () => clearInterval(interval);
  }, [refreshData]);

  const nodeKeys = ['torrejon', 'navalacruz', 'santibanez'];
  const currentNodeKey = nodeKeys[activeIdx];
  const activeWeatherMock = MOCK_WEATHER[activeIdx];
  
  // Buscar entidad weather.* en HA que coincida o sensores configurados
  const weatherEntity = haStates.find(s => 
    s.entity_id.startsWith('weather.') && 
    (s.entity_id.includes(currentNodeKey) || s.attributes.friendly_name?.toLowerCase().includes(currentNodeKey))
  );

  const getSensorVal = (haEntityId?: string, fallback?: any) => {
    const state = haStates.find(s => s.entity_id === haEntityId);
    return state ? state.state : fallback;
  };

  // Datos consolidados
  const currentTemp = weatherEntity?.attributes.temperature || getSensorVal(haConfig?.weather_nodes?.[currentNodeKey]?.temp_entity, activeWeatherMock.temp);
  const currentHumidity = weatherEntity?.attributes.humidity || getSensorVal(haConfig?.weather_nodes?.[currentNodeKey]?.humidity_entity, activeWeatherMock.humidity);
  const currentWind = weatherEntity?.attributes.wind_speed || getSensorVal(haConfig?.weather_nodes?.[currentNodeKey]?.wind_entity, activeWeatherMock.wind);
  const currentCondition = weatherEntity?.state || activeWeatherMock.condition;

  // Previsión (de HA o Mock si falla)
  const forecast = weatherEntity?.attributes.forecast?.slice(0, 7).map((f: any) => ({
    day: new Date(f.datetime).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }).toUpperCase(),
    max: f.temperature,
    min: f.templow,
    pop: f.precipitation_probability || 0,
    cond: f.condition
  })) || [
    { day: 'LUN 12', max: 13, min: 5, pop: 0, cond: 'sunny' },
    { day: 'MAR 13', max: 15, min: 2, pop: 60, cond: 'lightning' },
    { day: 'MIE 14', max: 12, min: 3, pop: 100, cond: 'rainy' },
    { day: 'JUE 15', max: 11, min: 1, pop: 95, cond: 'rainy' },
    { day: 'VIE 16', max: 9, min: 4, pop: 50, cond: 'cloudy' },
    { day: 'SAB 17', max: 8, min: 1, pop: 25, cond: 'cloudy' },
    { day: 'DOM 18', max: 9, min: 1, pop: 10, cond: 'sunny' }
  ];

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center gap-6">
      <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-blue-400 font-black text-[10px] uppercase tracking-[0.6em] animate-pulse">Sincronizando Sensores...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto no-scrollbar pb-32 animate-in fade-in duration-700">
       <div className="glass-dark rounded-[25px] p-2 border border-white/10 shrink-0 sticky top-0 z-50 backdrop-blur-3xl">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 px-1 snap-x">
             {['Torrejón', 'Navalacruz', 'Santibáñez'].map((loc, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveIdx(idx)} 
                  className={`snap-start whitespace-nowrap text-[10px] px-6 py-4 rounded-xl border font-black uppercase tracking-[0.2em] transition-all shrink-0 ${activeIdx === idx ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-white/30'}`}
                >
                  {loc}
                </button>
             ))}
             <button onClick={() => setShowRadar(!showRadar)} className={`snap-start whitespace-nowrap text-[10px] px-6 py-4 rounded-xl border font-black uppercase tracking-[0.2em] transition-all shrink-0 ${showRadar ? 'bg-orange-600 border-orange-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-white/30'}`}>
                RADAR_LIVE
              </button>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-[68%_32%] gap-4 shrink-0">
          <div className="flex flex-col gap-4">
             <div className="glass rounded-[45px] border border-blue-500/40 bg-blue-600/5 p-8 flex flex-col md:flex-row items-center justify-between shadow-2xl shrink-0">
                <div className="flex flex-col items-center md:items-start">
                   <div className="flex items-center gap-3 mb-2">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] italic">SENSORES_ACTIVOS_NODE_{activeIdx}</p>
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                   </div>
                   <div className="flex items-center gap-6">
                      <h3 className="text-8xl font-black text-white italic font-orbitron leading-none tracking-tighter drop-shadow-2xl">
                        {currentTemp}°
                      </h3>
                      <div className="flex flex-col">
                         <span className="text-[14px] font-black text-white/90 uppercase tracking-widest leading-tight">{currentCondition}</span>
                         <span className="text-[9px] font-bold text-white/20 uppercase mt-1 italic font-mono tracking-tighter uppercase">Telemetría_HA_OK</span>
                      </div>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full md:w-auto mt-6 md:mt-0">
                   <div className="flex flex-col items-center p-6 rounded-3xl bg-white/5 border border-white/5 min-w-[130px]">
                      <span className="text-[9px] text-white/20 font-black uppercase tracking-widest mb-2">Humedad</span>
                      <span className="text-3xl font-black text-white leading-none">{currentHumidity}%</span>
                   </div>
                   <div className="flex flex-col items-center p-6 rounded-3xl bg-white/5 border border-white/5 min-w-[130px]">
                      <span className="text-[9px] text-white/20 font-black uppercase tracking-widest mb-2">Viento</span>
                      <span className="text-3xl font-black text-white leading-none">{currentWind} <small className="text-xs">km/h</small></span>
                   </div>
                </div>
             </div>

             <div className="glass rounded-[45px] overflow-hidden border border-white/10 relative bg-black shadow-2xl h-[450px]">
                {showRadar ? (
                  <iframe 
                    src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&zoom=8&overlay=rain&lat=${activeWeatherMock.location.includes('Torrejón') ? '40.198' : '40.439'}&lon=${activeWeatherMock.location.includes('Torrejón') ? '-3.801' : '-4.938'}`} 
                    className="w-full h-full border-none opacity-80" 
                  />
                ) : (
                  <div className="w-full h-full relative">
                    <img src={`${activeWeatherMock.webcamUrl}${camTimestamp}`} className="absolute inset-0 w-full h-full object-cover opacity-90 transition-opacity duration-1000" alt="Webcam" />
                    <div className="absolute top-8 left-8">
                       <div className="px-5 py-2.5 bg-black/80 backdrop-blur-3xl rounded-[22px] border border-white/10 flex items-center gap-4 shadow-2xl">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_15px_red]" />
                          <span className="text-[11px] font-black uppercase text-white tracking-[0.4em] italic">NEXUS_CAM_FEED</span>
                       </div>
                    </div>
                  </div>
                )}
             </div>
          </div>

          <div className="glass rounded-[45px] border border-white/10 bg-black/40 flex flex-col shadow-2xl overflow-hidden h-full">
             <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
                <div className="flex flex-col">
                   <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-orange-400 italic leading-none">Previsión_Semanal</h4>
                   <p className="text-[8px] text-white/20 font-bold uppercase mt-2 tracking-widest italic tracking-tighter uppercase">Dynamic_Sync_Active</p>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
                {forecast.map((f: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-5 rounded-[35px] bg-white/5 border border-white/5 hover:border-orange-500/40 transition-all group">
                     <div className="flex flex-col min-w-[85px]">
                        <span className="text-[11px] font-black text-white/90 uppercase tracking-tighter">{f.day}</span>
                        <div className="flex items-center gap-2 mt-1">
                           <div className={`w-1.5 h-1.5 rounded-full ${f.pop >= 60 ? 'bg-blue-500 animate-pulse' : 'bg-white/10'}`} />
                           <span className={`text-[9px] font-bold ${f.pop > 10 ? 'text-blue-400' : 'text-white/20'}`}>{f.pop}% POP</span>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <WeatherIcon condition={f.cond} className="w-10 h-10 group-hover:scale-110 transition-all" />
                        <div className="flex flex-col items-end min-w-[60px]">
                           <span className="text-2xl font-black text-yellow-400 italic font-orbitron leading-none">{f.max}°</span>
                           <span className="text-[10px] font-bold text-blue-300 mt-1 uppercase tracking-widest">{f.min}° Min</span>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
       </div>

       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          {forecast.slice(0, 4).map((item: any, i: number) => (
             <div key={i} className="glass p-7 rounded-[38px] border border-white/10 flex flex-col items-center justify-center gap-3 bg-black/60 hover:border-blue-500/40 transition-all">
                <span className="text-[10px] font-black uppercase text-white/20 tracking-[0.2em]">{item.day}</span>
                <WeatherIcon condition={item.cond} className="w-10 h-10" />
                <p className="text-3xl font-black text-white italic font-orbitron">{item.max}°</p>
             </div>
          ))}
       </div>
    </div>
  );
};

export default WeatherView;
