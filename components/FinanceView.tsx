
import React, { useState, useEffect, useMemo } from 'react';
import { HomeAssistantConfig } from '../types';
import { fetchFinanceFromSheets } from '../fireflyService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Legend, ReferenceLine } from 'recharts';

interface TransactionData {
  fecha: string; desc: string; monto: string; cat: string; montoNum: number;
}

const FinanceView: React.FC = () => {
  const [sheetData, setSheetData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    loadConfig();
    window.addEventListener('rm_config_updated', loadConfig);
    return () => window.removeEventListener('rm_config_updated', loadConfig);
  }, []);

  const loadConfig = async () => {
    const saved = localStorage.getItem('nexus_ha_config');
    if (saved) {
      const parsed: HomeAssistantConfig = JSON.parse(saved);
      if (parsed.finance?.sheets_csv_url) {
        const data = await fetchFinanceFromSheets(parsed.finance.sheets_csv_url);
        setSheetData(data);
      }
    }
    setLoading(false);
  };

  const getActiveMonth = () => {
    const now = new Date();
    let monthIdx = now.getMonth();
    if (now.getDate() >= 20) monthIdx = (now.getMonth() + 1) % 12;
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return months[monthIdx];
  };

  const parseSpanishNum = (val: any): number => {
    if (!val || val === '-' || val === "") return 0;
    let str = String(val).trim().replace('€', '').replace(/\s/g, '');
    const isNegative = str.includes('-') || str.includes('(');
    str = str.replace(/[()\-]/g, '');
    if (str.includes(',') && str.includes('.')) str = str.replace(/\./g, '').replace(',', '.');
    else if (str.includes(',')) str = str.replace(',', '.');
    const n = parseFloat(str);
    return isNegative ? -Math.abs(n) : n;
  };

  const formatRMNum = (val: number) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(Math.round(val));
  const normalizeText = (text: string) => text?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() || "";

  const processed = useMemo(() => {
    if (!sheetData?.matrix || sheetData.matrix.length < 2) return null;
    const activeMonth = normalizeText(getActiveMonth());
    const rows = sheetData.matrix;
    
    const transactions: TransactionData[] = rows.slice(1, 150).filter((r: string[]) => r[0] && r[0] !== "Fecha" && r[0] !== "Total").map((r: string[]) => ({
      fecha: r[0], desc: r[1], monto: r[2], cat: r[3], montoNum: parseSpanishNum(r[2])
    }));

    let totalBudget = 0;
    let totalRealAccumulated = 0;
    const categories = rows.filter((r: string[]) => normalizeText(r[5]) === activeMonth).map((r: string[]) => {
      const budget = Math.abs(parseSpanishNum(r[7]));
      const real = Math.abs(parseSpanishNum(r[8]));
      totalBudget += budget;
      totalRealAccumulated += real;
      return { name: r[6], budget, real, remaining: budget - real, percent: budget > 0 ? Math.round((real / budget) * 100) : 0 };
    }).filter((c: any) => c.name && !["Categoria", "Subtotal", "Total"].includes(c.name)).sort((a: any, b: any) => b.percent - a.percent);

    const history = rows.filter((r: string[]) => r[10] && r[10] !== "Mes" && r[10] !== "Total").map((r: string[]) => {
      const ingresos = Math.abs(parseSpanishNum(r[11]));
      const gastos = Math.abs(parseSpanishNum(r[15]));
      // Columna O -> Índice 14 (Ahorro calculado en Sheets)
      const ahorroColO = parseSpanishNum(r[14]); 
      return {
        mes: r[10], 
        ingresos: ingresos, 
        gastos: gastos, 
        ahorro: ahorroColO
      };
    });

    const current = history.find((h: any) => normalizeText(h.mes) === activeMonth) || history[history.length - 1];
    const budgetExecution = totalBudget > 0 ? Math.round((totalRealAccumulated / totalBudget) * 100) : 0;
    const efficiencyRatio = (current?.ingresos > 0) ? Math.max(0, Math.round((current.ahorro / current.ingresos) * 100)) : 0;

    return { 
      categories, history, current, saldo: parseSpanishNum(rows[13]?.[14]), 
      transactions, budgetExecution, efficiencyRatio, totalRealAccumulated, totalBudget
    };
  }, [sheetData]);

  if (loading) return <div className="h-full flex items-center justify-center animate-pulse text-blue-400 font-black text-[10px]">SYNC_FINANCE_STREAM...</div>;

  const ahorroPositivo = (processed?.current?.ahorro || 0) > 0;

  return (
    <div className="flex flex-col gap-6 pb-32 h-full overflow-y-auto no-scrollbar px-1">
      {/* QUICK LINKS */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <button onClick={() => window.open('https://docs.google.com/spreadsheets/d/1CH7PHgZUrXuNXb6LlNcARf-w7rPrHj-z8UUeF7KOVxM/edit?gid=2034898252#gid=2034898252', '_blank')} className="glass-dark p-5 rounded-[30px] border border-green-400/30 flex items-center gap-4 bg-black/60 shadow-xl active:scale-95 transition-all">
          <div className="w-10 h-10 rounded-xl bg-green-400 flex items-center justify-center text-black shrink-0"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2.5"/></svg></div>
          <span className="text-[10px] font-black text-white uppercase tracking-widest">MATRIZ_G</span>
        </button>
        <button onClick={() => window.open('https://firefly.juanmirs.com/login', '_blank')} className="glass-dark p-5 rounded-[30px] border border-blue-400/30 flex items-center gap-4 bg-black/60 shadow-xl active:scale-95 transition-all">
          <div className="w-10 h-10 rounded-xl bg-blue-400 flex items-center justify-center text-black shrink-0"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" strokeWidth="2.5"/></svg></div>
          <span className="text-[10px] font-black text-white uppercase tracking-widest">FIREFLY_III</span>
        </button>
      </div>

      {/* BIG KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass p-6 rounded-[35px] border border-white/10 flex flex-col justify-between bg-black/60 h-[160px] md:h-[220px]">
          <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em]">Balance_Mensual</p>
          <div>
            <h4 className={`text-4xl md:text-6xl font-black italic leading-none ${ahorroPositivo ? 'text-green-400' : 'text-red-400'}`}>{formatRMNum(processed?.current?.ahorro || 0)}<span className="text-xs md:text-xl ml-1">€</span></h4>
            <p className="text-[11px] font-black text-white/30 mt-4">{processed?.efficiencyRatio}% MARGEN</p>
          </div>
        </div>
        <div className="glass p-6 rounded-[35px] border border-white/10 flex flex-col justify-between bg-black/60 h-[160px] md:h-[220px]">
          <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em]">Ingresos_Mes</p>
          <h4 className="text-4xl md:text-6xl font-black italic leading-none text-blue-400">{formatRMNum(processed?.current?.ingresos || 0)}<span className="text-xs md:text-xl ml-1">€</span></h4>
          <p className="text-[11px] font-black text-white/30 mt-4">CASH_FLOW</p>
        </div>
        <div className="glass p-6 rounded-[35px] border border-red-500/20 flex flex-col justify-between bg-black/80 h-[160px] md:h-[220px]">
          <p className="text-[10px] font-black uppercase text-red-500/60 tracking-[0.2em]">Gastos_Reales</p>
          <div>
            <h4 className="text-4xl md:text-6xl font-black italic leading-none text-red-500">{formatRMNum(processed?.totalRealAccumulated || 0)}<span className="text-xs md:text-xl ml-1">€</span></h4>
            <p className="text-[11px] font-black text-white/30 mt-4">{processed?.budgetExecution}% PRESUPUESTO</p>
          </div>
        </div>
        <div className="glass p-6 rounded-[35px] border border-white/10 flex flex-col justify-between bg-black/60 h-[160px] md:h-[220px]">
          <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em]">Saldo_Actual</p>
          <h4 className="text-4xl md:text-6xl font-black italic leading-none text-purple-400">{formatRMNum(processed?.saldo || 0)}<span className="text-xs md:text-xl ml-1">€</span></h4>
          <p className="text-[11px] font-black text-white/30 mt-4">LIQUIDEZ</p>
        </div>
      </div>

      {/* CHART TOGGLE SECTION */}
      <div className="flex flex-col gap-4">
        <button 
          onClick={() => setShowChart(!showChart)}
          className={`w-full py-6 rounded-[35px] border border-blue-500/30 font-black text-[11px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4 ${showChart ? 'bg-blue-600 text-white' : 'glass-dark bg-black/60 text-blue-400'}`}
        >
          <svg className={`w-5 h-5 transition-transform ${showChart ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {showChart ? 'CERRAR ANALÍTICA' : 'DESPLEGAR ANÁLISIS HISTÓRICO'}
        </button>

        {showChart && (
          <div className="glass rounded-[45px] border border-blue-500/20 bg-black/90 p-6 md:p-12 h-[500px] md:h-[750px] shadow-2xl animate-in slide-in-from-top duration-500 relative overflow-hidden">
             <div className="absolute top-8 left-12 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <h4 className="text-[12px] font-black uppercase tracking-[0.5em] text-blue-400 italic">Tendencia_Anual_Master</h4>
             </div>

             <ResponsiveContainer width="100%" height="90%">
                <BarChart data={processed?.history || []} margin={{ top: 80, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis 
                    dataKey="mes" 
                    stroke="rgba(255,255,255,0.4)" 
                    fontSize={12} 
                    tick={{fill: 'rgba(255,255,255,0.6)', fontWeight: 'bold'}} 
                    axisLine={false} 
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.2)" 
                    fontSize={10} 
                    tick={{fill: 'rgba(255,255,255,0.3)'}} 
                    axisLine={false} 
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{backgroundColor: '#000', border: '1px solid #3b82f6', fontSize: '14px', borderRadius: '20px', color: '#fff', fontWeight: 'bold', padding: '15px'}}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{paddingBottom: '40px', fontSize: '10px', fontWeight: '900', letterSpacing: '2px'}} />
                  
                  {/* LÍNEA DE REFERENCIA DE BALANCE (AHORRO - COLUMNA O) */}
                  <ReferenceLine 
                    y={0} 
                    stroke={ahorroPositivo ? "#10b981" : "#ef4444"} 
                    strokeDasharray="8 8" 
                    strokeWidth={3} 
                    label={{ position: 'right', value: 'BAL_CERO', fill: '#ffffff30', fontSize: 10, fontWeight: '900' }} 
                  />

                  <Bar name="INGRESOS" dataKey="ingresos" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={25}>
                    <LabelList dataKey="ingresos" position="top" fill="#3b82f6" fontSize={10} fontWeight="900" formatter={(v: number) => v > 1000 ? `${formatRMNum(v)}` : ''} offset={12} />
                  </Bar>
                  <Bar name="GASTOS" dataKey="gastos" fill="#ef4444" radius={[10, 10, 0, 0]} barSize={25}>
                    <LabelList dataKey="gastos" position="top" fill="#ef4444" fontSize={10} fontWeight="900" formatter={(v: number) => v > 1000 ? `${formatRMNum(v)}` : ''} offset={12} />
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* CATEGORIES & TRANSACTIONS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-[45px] border border-white/10 bg-black/50 p-8 md:p-12 flex flex-col gap-8 shadow-2xl">
          <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-blue-400 italic">Análisis_Por_Categoría</h4>
          <div className="space-y-6 max-h-[600px] overflow-y-auto no-scrollbar">
            {processed?.categories.map((cat: any, i: number) => (
              <div key={i} className="bg-white/[0.03] p-8 rounded-[35px] border border-white/5 hover:border-blue-500/30 transition-all">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-base md:text-xl font-black text-white uppercase">{cat.name}</span>
                  <span className={`text-xl md:text-3xl font-black ${cat.percent > 100 ? 'text-red-500' : 'text-blue-400'}`}>{cat.percent}%</span>
                </div>
                <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${cat.percent > 100 ? 'bg-red-500' : 'bg-blue-500Shadow-[0_0_10px_#3b82f6]'}`} style={{ width: `${Math.min(100, cat.percent)}%` }} />
                </div>
                <div className="flex justify-between mt-4">
                   <span className="text-[11px] font-black text-white/40 uppercase">R: {formatRMNum(cat.real)}€</span>
                   <span className="text-[11px] font-black text-white/20 uppercase">P: {formatRMNum(cat.budget)}€</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-[45px] border border-white/10 bg-black/50 p-8 md:p-12 flex flex-col gap-8 shadow-2xl">
          <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-green-400 italic">Operaciones_Recientes</h4>
          <div className="space-y-4 overflow-y-auto max-h-[600px] no-scrollbar">
            {processed?.transactions.map((tx: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-6 rounded-[30px] border-b border-white/5 hover:bg-white/5 transition-all group">
                <div className="min-w-0">
                  <p className="text-base md:text-lg font-black text-white truncate uppercase tracking-tight">{tx.desc}</p>
                  <p className="text-[11px] font-black text-white/30 uppercase mt-2">{tx.fecha} // {tx.cat}</p>
                </div>
                <span className={`text-xl md:text-2xl font-black tabular-nums ${tx.montoNum < 0 ? 'text-green-400' : 'text-red-400'}`}>{tx.monto}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceView;
