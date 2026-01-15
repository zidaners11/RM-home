
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
    "https://www.aemet.es/xml/municipios/localidad_28149.xml", // Torrejón
    "https://www.aemet.es/xml/municipios/localidad_05157.xml", // Navalacruz
    "https://www.aemet.es/xml/municipios/localidad_10172.xml"  // Santibáñez
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
    <div className="flex flex-col gap-6 h-full overflow-hidden animate-in fade-in duration-1000">
       
       {/* SELECTOR SUPERIOR */}
       <div className="glass-dark rounded-[30px] p-2 border border-white/10 shrink-0 sticky top-0 z-50 backdrop-blur-3xl shadow-2xl">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 px-1">
             {['Torrejón', 'Navalacruz', 'Santibáñez'].map((loc, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveIdx(idx)} 
                  className={`whitespace-nowrap text-[10px] px-8 py-4 rounded-2xl border font-black uppercase tracking-[0.2em] transition-all flex-1 ${activeIdx === idx ? 'bg-orange-600 border-orange-400 text-white shadow-[0_0_25px_rgba(234,88,12,0.4)]' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}`}
                >
                  {loc}
                </button>
             ))}
             <button onClick={() => setShowRadar(!showRadar)} className={`whitespace-nowrap text-[10px] px-8 py-4 rounded-2xl border font-black uppercase tracking-[0.2em] transition-all ${showRadar ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-white/30'}`}>
                RADAR_VIEW
              </button>
          </div>
       </div>

       {/* GRID PRINCIPAL: COMPOSICIÓN SIMÉTRICA DE ALTO TOTAL */}
       <div className="flex-1 grid grid-cols-1 lg:grid-cols-[60%_40%] gap-6 min-h-0">
          
          {/* COLUMNA IZQUIERDA: ESTADO ACTUAL + CÁMARA */}
          <div className="flex flex-col gap-6 min-h-0">
             {/* PANEL ESTADO ACTUAL */}
             <div className="glass rounded-[45px] border border-orange-500/40 bg-orange-600/5 p-6 md:p-8 flex items-center justify-between shadow-2xl shrink-0 group transition-all hover:border-orange-500/80">
                <div className="flex flex-col">
                   <div className="flex items-center gap-3 mb-2">
                      <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.4em] italic">{hasXml ? 'AEMET_SYNC' : 'LOCAL_HA'}</p>
                      <div className={`w-1.5 h-1.5 rounded-full ${hasXml ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`} />
                   </div>
                   <div className="flex items-center gap-6">
                      <h3 className="text-7xl md:text-8xl font-black text-white italic font-orbitron leading-none tracking-tighter drop-shadow-2xl">
                        {currentTemp}°
                      </h3>
                      <div className="flex flex-col">
                         <span className="text-sm font-black text-white/90 uppercase tracking-[0.2em] italic">{currentCondition}</span>
                         <span className="text-[8px] font-bold text-white/20 uppercase mt-2 tracking-widest font-mono italic">NODE_ID: {currentNodeKey.toUpperCase()}</span>
                      </div>
                   </div>
                </div>
                <div className="hidden sm:grid grid-cols-2 gap-3">
                   <div className="flex flex-col items-center p-4 rounded-[25px] bg-white/5 border border-white/5 min-w-[100px]">
                      <span className="text-[8px] text-white/20 font-black uppercase tracking-widest mb-1">HUMID</span>
                      <span className="text-xl font-black text-white">{haStates.find(s => s.entity_id === nodeConfig?.humidity_entity)?.state || '--'}%</span>
                   </div>
                   <div className="flex flex-col items-center p-4 rounded-[25px] bg-white/5 border border-white/5 min-w-[100px]">
                      <span className="text-[8px] text-white/20 font-black uppercase tracking-widest mb-1">WIND</span>
                      <span className="text-xl font-black text-white">{haStates.find(s => s.entity_id === nodeConfig?.wind_entity)?.state || '--'}</span>
                   </div>
                </div>
             </div>

             {/* BLOQUE CÁMARA - OCUPA EL RESTO DEL ESPACIO IZQUIERDO */}
             <div className="glass rounded-[50px] overflow-hidden border border-white/10 relative bg-black shadow-2xl group flex-1 flex flex-col min-h-0">
                <div className="p-5 border-b border-white/5 bg-white/5 flex justify-between items-center shrink-0">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_red]" />
                      <span className="text-[10px] font-black text-white uppercase tracking-[0.4em] italic">Visual_Matrix_Feed</span>
                   </div>
                   <span className="text-[8px] font-mono text-white/30 uppercase">LOC: {activeIdx === 0 ? 'Torrejon' : activeIdx === 1 ? 'Navalacruz' : 'Santibanez'}</span>
                </div>
                
                <div className="flex-1 relative">
                   {showRadar ? (
                     <iframe 
                       src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&zoom=8&overlay=rain&lat=${activeIdx === 0 ? '40.198' : activeIdx === 1 ? '40.439' : '40.175'}&lon=${activeIdx === 0 ? '-3.801' : activeIdx === 1 ? '-4.938' : '-6.223'}`} 
                       className="w-full h-full border-none opacity-80" 
                     />
                   ) : (
                     <>
                       <img 
                         src={`${activeWeatherMock.webcamUrl || 'https://via.placeholder.com/800x450/020617/ffffff?text=STREAM_OFFLINE'}${Date.now()}`} 
                         className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-1000" 
                         alt="Webcam" 
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />
                     </>
                   )}
                </div>
             </div>
          </div>

          {/* COLUMNA DERECHA: PREVISIÓN AMPLIADA SIN SCROLL */}
          <div className="glass rounded-[50px] border border-white/10 bg-black/40 flex flex-col shadow-2xl overflow-hidden group min-h-0">
             <div className="p-8 border-b border-white/5 bg-white/5 flex justify-between items-center shrink-0">
                <div className="flex flex-col">
                   <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-orange-400 italic leading-none">Previsión_Oficial_AEMET</h4>
                   <p className="text-[8px] font-bold text-white/20 mt-3 uppercase tracking-widest">{hasXml ? 'VERIFIED_SATELLITE_LINK' : 'BACKUP_HA_BRIDGE'}</p>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-2xl font-black text-white/80 font-orbitron italic">10_DÍAS</span>
                   <div className="w-10 h-1 bg-orange-500/30 rounded-full mt-2" />
                </div>
             </div>
             
             {/* LISTADO DINÁMICO: ELIMINADO SCROLL Y ESPACIADO AJUSTADO */}
             <div className="flex-1 p-4 space-y-1.5 bg-gradient-to-b from-transparent to-orange-500/5 overflow-hidden flex flex-col justify-between">
                {forecast.length > 0 ? forecast.slice(0, 10).map((f: any, i: number) => (
                  <div key={i} className="flex-1 flex items-center justify-between px-6 py-2 rounded-[30px] bg-white/5 border border-white/5 hover:border-orange-500/40 transition-all group/item hover:bg-white/10 hover:scale-[1.01]">
                     <div className="flex flex-col min-w-[90px]">
                        <span className="text-[12px] font-black text-white uppercase tracking-tighter">{f.day}</span>
                        <div className="flex items-center gap-2">
                           <div className={`w-1 h-1 rounded-full ${f.pop >= 30 ? 'bg-blue-500 animate-pulse' : 'bg-white/10'}`} />
                           <span className={`text-[9px] font-bold ${f.pop > 10 ? 'text-blue-400' : 'text-white/20'}`}>{f.pop}%</span>
                        </div>
                     </div>
                     
                     <WeatherIcon condition={f.cond} className="w-8 h-8 md:w-10 md:h-10 group-hover/item:scale-110 transition-transform" />
                     
                     <div className="flex items-center gap-6 min-w-[90px] justify-end">
                        <div className="flex flex-col items-end">
                           <span className="text-xl md:text-2xl font-black text-white italic font-orbitron leading-none">{f.max}°</span>
                           <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">MAX</span>
                        </div>
                        <div className="flex flex-col items-end opacity-40">
                           <span className="text-base md:text-xl font-black text-blue-300 italic font-orbitron leading-none">{f.min}°</span>
                           <span className="text-[8px] font-bold text-blue-300/50 uppercase tracking-widest">MIN</span>
                        </div>
                     </div>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center gap-4 opacity-20">
                     <div className="w-8 h-8 border-2 border-white/5 border-t-white/20 rounded-full animate-spin" />
                     <p className="text-white uppercase font-black text-[9px] tracking-[0.5em]">CAPTURING_ATMOSPHERE_MODEL...</p>
                  </div>
                )}
             </div>
          </div>
       </div>

       {/* MINI GRID INFERIOR - RESUMEN RÁPIDO (OPCIONAL/DECORATIVO) */}
       <div className="hidden md:grid grid-cols-4 gap-4 pb-4 shrink-0">
          {forecast.slice(0, 4).map((item: any, i: number) => (
             <div key={i} className="glass px-6 py-4 rounded-[30px] border border-white/10 flex items-center justify-between bg-black/60 hover:border-orange-500/40 transition-all">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase text-white/20 tracking-[0.2em]">{item.day}</span>
                  <p className="text-2xl font-black text-white italic font-orbitron">{item.max}°</p>
                </div>
                <WeatherIcon condition={item.cond} className="w-8 h-8" />
             </div>
          ))}
       </div>
    </div>
  );
};

export default WeatherView;
