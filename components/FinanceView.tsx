
import React, { useState, useEffect } from 'react';
import { FireflyConfig } from '../types';
import { fetchFireflyTransactions, fetchFinanceFromSheets } from '../fireflyService';
import { getFinanceInsights } from '../geminiService';

const FinanceView: React.FC = () => {
  const [config, setConfig] = useState<FireflyConfig | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const monthsOrder = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  useEffect(() => {
    const saved = localStorage.getItem('nexus_firefly_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setConfig(parsed);
      refreshData(parsed);
    } else {
      setLoading(false);
    }
  }, []);

  const getCycleMonth = () => {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth();
    const cycleIndex = day >= 20 ? (month + 1) % 12 : month;
    return monthsOrder[cycleIndex];
  };

  const refreshData = async (cfg: FireflyConfig) => {
    setIsRefreshing(true);
    try {
      if (cfg.use_sheets_mirror && cfg.sheets_csv_url) {
        const data = await fetchFinanceFromSheets(cfg.sheets_csv_url);
        setTransactions(data.transactions);
        setBudgets(data.budgets);
        setSummaries(data.summaries);
      } else if (cfg.url && cfg.token) {
        const txs = await fetchFireflyTransactions(cfg.url, cfg.token, cfg.main_account_id, cfg.proxy_url);
        setTransactions(txs);
      }
    } catch (e: any) {
      console.error("Finance Load Error:", e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefreshManual = () => {
    if (config) refreshData(config);
  };

  const currentCycle = getCycleMonth();
  
  // Ordenar presupuestos por porcentaje de consumo (de mayor a menor)
  const currentBudgets = budgets
    .filter(b => b.month === currentCycle)
    .sort((a, b) => {
      const percentA = (a.spent / a.limit) * 100;
      const percentB = (b.spent / b.limit) * 100;
      return percentB - percentA;
    });

  const currentSummary = summaries.find(s => s.month === currentCycle);

  const calculateAccumulatedSavings = () => {
    let total = 0;
    const currentMonthIdx = monthsOrder.indexOf(currentCycle);
    for (let i = 0; i <= currentMonthIdx; i++) {
      const monthData = summaries.find(s => s.month === monthsOrder[i]);
      if (monthData) {
        if (monthData.realSpent > 0 || i < currentMonthIdx) {
          total += (monthData.income - monthData.realSpent);
        }
      }
    }
    return total;
  };

  const accumulatedSavings = calculateAccumulatedSavings();
  const realSavings = currentSummary ? currentSummary.income - currentSummary.realSpent : 0;

  const handleAIAnalysis = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    const result = await getFinanceInsights({
      cycle: currentCycle,
      summary: currentSummary,
      accumulatedSavings,
      activeBudgets: currentBudgets
    });
    setAiInsight(result ?? null);
    setAiLoading(false);
  };

  const getCategoryColor = (cat: string) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('alimentacion')) return 'text-green-400 border-green-500/30 bg-green-500/10';
    if (c.includes('transporte')) return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
    if (c.includes('ocio')) return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    if (c.includes('servicios')) return 'text-red-400 border-red-500/30 bg-red-500/10';
    return 'text-white/60 border-white/10 bg-white/5';
  };

  // Lógica de agrupación por fechas
  const groupedTransactions = transactions.reduce((groups: { [key: string]: any[] }, tx) => {
    const date = tx.attributes.transactions[0].date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(tx);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center">
      <div className="w-16 h-16 border-4 border-white/5 border-t-blue-500 rounded-full animate-spin mb-6" />
      <p className="text-blue-400 font-black text-xs uppercase tracking-[0.4em] animate-pulse">Sincronizando Consola Nexus...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 pb-24">
       
       {/* Cabecera de Mando */}
       <div className="flex justify-between items-center shrink-0 glass px-8 py-5 rounded-[32px] border border-white/10">
          <div className="flex items-center gap-6">
             <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/40">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
             </div>
             <div>
                <h2 className="text-xl font-black uppercase tracking-[0.2em] text-white">Consola Financiera Nexus</h2>
                <div className="flex items-center gap-3 mt-1">
                   <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                   <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Mirror_Active // Ciclo: {currentCycle}</p>
                </div>
             </div>
          </div>
          <button 
             onClick={handleRefreshManual} 
             className={`p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all ${isRefreshing ? 'animate-spin text-blue-400' : 'text-white/40'}`}
          >
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
       </div>

       {/* KPIs de Alto Nivel */}
       {currentSummary && (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
            {[
              { label: 'Gasto Real', val: currentSummary.realSpent, color: currentSummary.realSpent > currentSummary.predictedSpent ? 'text-red-400' : 'text-white', icon: 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6' },
              { label: 'Ahorro Mensual', val: realSavings, color: 'text-blue-400', bg: 'bg-blue-500/5', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
              { label: 'Ahorro Acumulado', val: accumulatedSavings, color: 'text-green-400', bg: 'bg-green-500/5', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
              { label: 'Ingresos Totales', val: currentSummary.income, color: 'text-white/80', icon: 'M7 11l5-5m0 0l5 5m-5-5v12' }
            ].map((m, i) => (
              <div key={i} className={`glass px-7 py-6 rounded-[32px] border border-white/5 flex items-center justify-between ${m.bg || ''}`}>
                 <div>
                    <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-2">{m.label}</p>
                    <p className={`text-3xl font-black tabular-nums ${m.color}`}>{m.val.toLocaleString('es-ES')}€</p>
                 </div>
                 <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={m.icon} /></svg>
                 </div>
              </div>
            ))}
         </div>
       )}

       {/* Panel de IA */}
       <div className={`glass rounded-[32px] border transition-all duration-700 shrink-0 ${aiInsight ? 'border-blue-500/40 bg-blue-500/5' : 'border-white/5'}`}>
          <div className="px-8 py-4 flex items-center justify-between gap-8">
             <div className="flex items-center gap-5 shrink-0">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${aiLoading ? 'bg-blue-600 animate-pulse' : 'bg-blue-600/10 border border-blue-500/20'}`}>
                   <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div className="hidden md:block">
                   <h3 className="text-xs font-black uppercase tracking-widest text-white">Asistente Estratégico</h3>
                   <p className="text-[9px] text-white/20 font-mono uppercase">Deep_Scan_Operational</p>
                </div>
             </div>
             <div className="flex-1">
                {aiInsight ? (
                  <p className="text-sm text-blue-100/80 leading-snug italic font-medium">"{aiInsight}"</p>
                ) : (
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                     <div className={`h-full bg-blue-500/20 transition-all duration-1000 ${aiLoading ? 'w-full translate-x-0' : 'w-0 -translate-x-full'}`} />
                  </div>
                )}
             </div>
             <button onClick={handleAIAnalysis} disabled={aiLoading} className="px-8 py-3 bg-white text-black rounded-2xl text-[10px] font-black tracking-widest uppercase hover:scale-105 active:scale-95 disabled:opacity-50 transition-all shrink-0">
                {aiLoading ? 'ANALIZANDO...' : 'RECALCULAR TÁCTICA'}
             </button>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Historial de Transacciones AGRUPADO */}
          <div className="lg:col-span-3 glass rounded-[40px] p-8 border border-white/10 flex flex-col min-h-[500px]">
             <div className="flex justify-between items-center mb-8">
                <h2 className="text-sm font-black tracking-[0.3em] text-white uppercase italic">Historial de Flujos</h2>
                <span className="text-[10px] font-mono text-white/20 bg-white/5 px-3 py-1 rounded-full uppercase">Ingesta_Agrupada_v3</span>
             </div>

             <div className="space-y-12">
                {sortedDates.map((date) => {
                  const dayTxs = groupedTransactions[date];
                  // Sumamos todos los movimientos del día
                  const daySum = dayTxs.reduce((acc, curr) => acc + parseFloat(curr.attributes.transactions[0].amount), 0);
                  
                  // Definimos color y signo basado en si es neto gasto o neto ingreso
                  // Basado en el feedback: Gastos (Rojo/Positivo en origen) -> Mostrar Negativo. Ingresos (Verde/Negativo en origen) -> Mostrar Positivo.
                  const isNetExpense = daySum > 0;
                  
                  return (
                    <div key={date} className="space-y-6">
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="h-px w-8 bg-white/10" />
                          <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40">{date}</span>
                          <div className="h-px flex-1 bg-white/5" />
                        </div>
                        <div className={`ml-4 px-4 py-1 rounded-full border text-[10px] font-black tabular-nums transition-all ${daySum !== 0 ? (isNetExpense ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400') : 'bg-white/5 border-white/10 text-white/20'}`}>
                           {isNetExpense ? '-' : '+'}{Math.abs(daySum).toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                        </div>
                      </div>
                      <div className="space-y-3">
                        {dayTxs.map((tx, i) => {
                          const d = tx.attributes.transactions[0];
                          const val = parseFloat(d.amount);
                          const isExpense = val > 0; // Suponiendo que en tu CSV los gastos vienen positivos y los ingresos negativos
                          return (
                            <div key={i} className="flex justify-between items-center p-5 bg-white/[0.02] hover:bg-white/[0.05] rounded-[24px] border border-white/5 transition-all group">
                               <div className="flex items-center gap-5">
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-[10px] uppercase border transition-transform group-hover:scale-110 ${getCategoryColor(d.category_name)}`}>
                                     {d.category_name.substring(0,3)}
                                  </div>
                                  <div>
                                     <p className="text-[13px] font-black text-white uppercase tracking-tight line-clamp-1">{d.description}</p>
                                     <p className="text-[9px] text-white/20 uppercase font-black tracking-widest mt-1">{d.category_name}</p>
                                  </div>
                               </div>
                               <div className="text-right">
                                  <p className={`text-lg font-black tabular-nums ${isExpense ? 'text-red-400' : 'text-green-400'}`}>
                                     {isExpense ? '-' : '+'}{Math.abs(val).toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                                  </p>
                               </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>

          {/* Presupuestos y Límites (ORDENADOS POR CONSUMO) */}
          <div className="lg:col-span-2 glass rounded-[40px] p-8 border border-white/10 flex flex-col h-fit">
             <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white/80">Control de Presupuestos</h3>
             </div>

             <div className="space-y-10">
                {currentBudgets.length > 0 ? currentBudgets.map((b, i) => {
                   const percent = Math.min(100, (b.spent / b.limit) * 100);
                   const isCritical = percent > 90;
                   return (
                      <div key={i} className="space-y-4">
                         <div className="flex justify-between items-end px-1">
                            <div>
                               <p className="text-[11px] font-black text-white/40 uppercase tracking-widest">{b.category}</p>
                               <p className="text-base font-black text-white mt-1">
                                  {b.spent.toLocaleString('es-ES')}€ 
                                  <span className="text-white/20 text-xs ml-2">/ {b.limit.toLocaleString('es-ES')}€</span>
                               </p>
                            </div>
                            <div className={`text-xs font-black px-3 py-1 rounded-lg ${isCritical ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-white/5 text-white/40'}`}>
                               {percent.toFixed(0)}%
                            </div>
                         </div>
                         <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                            <div 
                               className={`h-full rounded-full transition-all duration-1000 ${isCritical ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.3)]'}`} 
                               style={{ width: `${percent}%` }} 
                            />
                         </div>
                      </div>
                   );
                }) : (
                   <div className="py-20 flex flex-col items-center justify-center text-center opacity-20">
                      <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      <p className="text-xs font-black uppercase tracking-widest">No hay presupuestos activos en este ciclo</p>
                   </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};

export default FinanceView;
