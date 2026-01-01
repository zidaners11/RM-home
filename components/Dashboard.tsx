
import React, { useState, useEffect } from 'react';
import { WidgetConfig } from '../types';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { fetchHAStates, callHAService } from '../homeAssistantService';
import { getGlobalNexusStatus } from '../geminiService';

type State = {
  entity_id: string;
  state: string;
};


const Dashboard: React.FC = () => {
  const [haStates, setHaStates] = useState<any[]>([]);
  const [haConfig, setHaConfig] = useState<any>(null);
  const [aiReport, setAiReport] = useState<{ text: string, sources: any[] }>({ text: 'Sincronizando con RM Home Core...', sources: [] });
  const [loadingAI, setLoadingAI] = useState(true);

  useEffect(() => {
    const savedHA = localStorage.getItem('nexus_ha_config');
    if (savedHA) {
      const config = JSON.parse(savedHA);
      setHaConfig(config);
      refreshData(config);
      const interval = setInterval(() => refreshData(config), 30000);
      return () => clearInterval(interval);
    }
  }, []);

  const refreshData = async (config: any) => {
    const states = await fetchHAStates(config.url, config.token);
    if (states) {
      setHaStates(states);
      const report = await getGlobalNexusStatus({
       alarm: states.find((s: State) => s.entity_id === config.alarm_entity)?.state || 'unknown',
       active_alerts: states.filter((s: State) => s.entity_id.startsWith('binary_sensor') && s.state === 'on').length,
       solar: states.find((s: State) => s.entity_id === config.solar_production_entity)?.state || 0

       // alarm: states.find(s => s.entity_id === config.alarm_entity)?.state || 'unknown',
       // active_alerts: states.filter(s => s.entity_id.startsWith('binary_sensor') && s.state === 'on').length,
       // solar: states.find(s => s.entity_id === config.solar_production_entity)?.state || 0
      });
      setAiReport(report);
      setLoadingAI(false);
    }
  };

  const toggleAlarm = async () => {
    if (!haConfig || !haConfig.alarm_entity) return;
    const alarm = haStates.find(s => s.entity_id === haConfig.alarm_entity);
    const service = alarm?.state === 'disarmed' ? 'alarm_arm_away' : 'alarm_disarm';
    await callHAService(haConfig.url, haConfig.token, 'alarm_control_panel', service, haConfig.alarm_entity);
    refreshData(haConfig);
  };

  const getAlertCount = () => {
    return haStates.filter(s => 
      (haConfig?.security_sensors?.includes(s.entity_id)) && s.state === 'on'
    ).length;
  };

  const solarVal = parseFloat(haStates.find(s => s.entity_id === haConfig?.solar_production_entity)?.state) || 0;
  const alarmState = haStates.find(s => s.entity_id === haConfig?.alarm_entity)?.state || 'disarmed';

  return (
    <div className="flex flex-col gap-8 h-full pb-6">
      
      {/* RM HOME STRATEGIC REPORT - FUENTE AMPLIADA */}
      <div className="glass rounded-[40px] p-8 border border-blue-500/20 relative overflow-hidden shrink-0">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-[100px]" />
         <div className="flex flex-col md:flex-row gap-8 relative z-10">
            <div className="w-20 h-20 bg-blue-600 rounded-[28px] flex items-center justify-center shrink-0 shadow-2xl shadow-blue-500/40 animate-pulse">
               <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
               </svg>
            </div>
            <div className="flex-1">
               <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-[12px] font-black uppercase tracking-[0.5em] text-blue-400">Strategic_Intelligence_Core</h2>
                  <div className="h-px flex-1 bg-white/10" />
               </div>
               <div className={`text-lg font-medium leading-relaxed text-white/90 ${loadingAI ? 'animate-pulse' : ''}`}>
                  {aiReport.text.split('\n').map((line, i) => (
                    <p key={i} className="mb-2">{line}</p>
                  ))}
               </div>
               {!loadingAI && aiReport.sources.length > 0 && (
                 <div className="mt-4 flex flex-wrap gap-2">
                    {aiReport.sources.slice(0, 3).map((chunk: any, i: number) => (
                      <a key={i} href={chunk.web?.uri} target="_blank" className="text-[10px] bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full text-white/40 transition-colors uppercase font-black tracking-widest">
                        {chunk.web?.title || 'Nexus_Source'}
                      </a>
                    ))}
                 </div>
               )}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
         
         <div className="space-y-8 flex flex-col">
            <div className={`glass rounded-[40px] p-8 border transition-all duration-700 flex-1 flex flex-col justify-center ${alarmState !== 'disarmed' ? 'border-red-500/40 bg-red-500/5' : 'border-white/5'}`}>
               <div className="flex justify-between items-start mb-6">
                  <div>
                     <p className="text-[11px] uppercase font-black tracking-widest text-white/30 mb-2">Estatus Sentinel</p>
                     <h3 className="text-3xl font-black uppercase tracking-tighter">{alarmState === 'disarmed' ? 'DESARMADO' : 'SENTINEL_ACTIVO'}</h3>
                  </div>
                  <div className={`w-4 h-4 rounded-full ${alarmState === 'disarmed' ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-red-500 animate-ping shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`} />
               </div>
               <button 
                  onClick={toggleAlarm}
                  className={`w-full py-6 rounded-[32px] font-black text-[11px] tracking-[0.4em] uppercase transition-all shadow-2xl active:scale-95 ${alarmState === 'disarmed' ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20' : 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20'}`}
               >
                  {alarmState === 'disarmed' ? 'ARMAR PERÍMETRO' : 'ABORTAR ALARMA'}
               </button>
            </div>

            <div className="glass rounded-[40px] p-8 border border-white/5 flex items-center justify-between relative overflow-hidden h-32 shrink-0">
               <div>
                  <p className="text-[11px] uppercase font-black tracking-widest text-white/30 mb-2">Alertas Sentinel</p>
                  <p className="text-5xl font-black text-white">{getAlertCount()}</p>
               </div>
               <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-3xl font-black ${getAlertCount() > 0 ? 'bg-orange-500/20 text-orange-400 animate-pulse border border-orange-500/30' : 'bg-white/5 text-white/10'}`}>
                  !
               </div>
            </div>
         </div>

         <div className="lg:col-span-2 glass rounded-[40px] p-10 border border-white/5 flex flex-col">
            <div className="flex justify-between items-center mb-8">
               <div>
                  <h3 className="text-2xl font-black uppercase tracking-widest text-white/90">Producción Solar</h3>
                  <p className="text-[11px] font-mono text-white/20 uppercase tracking-[0.4em] mt-2">Telemetry_Sync: Operational_Link_v4</p>
               </div>
               <div className="text-right">
                  <p className="text-5xl font-black text-yellow-400 tracking-tighter">{solarVal.toFixed(1)}<span className="text-lg ml-2 text-white/20 font-black uppercase tracking-widest">kW</span></p>
               </div>
            </div>
            
            <div className="flex-1 min-h-[220px]">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={Array.from({length: 12}, (_, i) => ({ t: `${i*2}:00`, v: solarVal * Math.random() + (solarVal * 0.3) }))}>
                     <defs>
                        <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                           <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', fontSize: '12px', fontWeight: 'bold' }}
                     />
                     <Area type="monotone" dataKey="v" stroke="#fbbf24" fill="url(#solarGrad)" strokeWidth={4} />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

      </div>
    </div>
  );
};

export default Dashboard;
