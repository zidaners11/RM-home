
import React, { useState, useEffect, useMemo } from 'react';
import { HomeAssistantConfig } from '../types';
import { fetchFinanceFromSheets } from '../fireflyService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface TransactionData {
  fecha: string; desc: string; monto: string; cat: string; montoNum: number;
}

const FinanceView: React.FC = () => {
  const [sheetData, setSheetData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showChart, setShowChart] = useState(false);
  const [showCategoriesMobile, setShowCategoriesMobile] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    loadConfig();
    window.addEventListener('rm_config_updated', loadConfig);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('rm_config_updated', loadConfig);
    };
  }, []);

  const isMobile = windowWidth < 768;

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
    
    const transactions: TransactionData[] = rows.slice(1, 100).filter((r: string[]) => r[0] && r[0] !== "Fecha" && r[0] !== "Total").map((r: string[]) => ({
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
      const ahorroColO = parseSpanishNum(r[14]); 
      return { mes: r[10], ingresos, gastos, ahorro: ahorroColO };
    });

    const current = history.find((h: any) => normalizeText(h.mes) === activeMonth) || history[history.length - 1];
    const efficiencyRatio = (current?.ingresos > 0) ? Math.max(0, Math.round((current.ahorro / current.ingresos) * 100)) : 0;

    return { 
      categories, history, current, saldo: parseSpanishNum(rows[13]?.[14]), 
      transactions, efficiencyRatio, totalRealAccumulated, totalBudget
    };
  }, [sheetData]);

  if (loading) return <div className="h-full flex items-center justify-center animate-pulse text-blue-400 font-black text-[10px]">SYNC_FINANCE_STREAM...</div>;

  const ahorroPositivo = (processed?.current?.ahorro || 0) > 0;

  return (
    <div className="flex flex-col gap-3 pb-32 md:pb-6 min-h-full px-1">
      
      {/* HEADER - KPIs GRANDES */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 shrink-0">
        <div className="col-span-1 grid grid-cols-2 gap-2">
           <button onClick={() => window.open('https://docs.google.com/spreadsheets/d/1CH7PHgZUrXuNXb6LlNcARf-w7rPrHj-z8UUeF7KOVxM/edit', '_blank')} className="glass flex items-center justify-center p-3 rounded-2xl border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 transition-all">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2.5"/></svg>
           </button>
           <button onClick={() => window.open('https://firefly.juanmirs.com/login', '_blank')} className="glass flex items-center justify-center p-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-all">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" strokeWidth="2.5"/></svg>
           </button>
        </div>

        {[
          { label: 'BALANCE', val: processed?.current?.ahorro, unit: '€', color: ahorroPositivo ? 'text-green-400' : 'text-red-400' },
          { label: 'INGRESOS', val: processed?.current?.ingresos, unit: '€', color: 'text-blue-400' },
          { label: 'GASTOS', val: processed?.totalRealAccumulated, unit: '€', color: 'text-red-500' },
          { label: 'SALDO', val: processed?.saldo, unit: '€', color: 'text-purple-400' },
          { label: 'EFICIENCIA', val: processed?.efficiencyRatio, unit: '%', color: 'text-orange-400' }
        ].map((kpi, i) => (
          <div key={i} className="glass px-3 py-3 rounded-2xl border border-white/10 flex flex-col justify-center bg-black/40 backdrop-blur-xl">
            <p className="text-[7px] font-black uppercase text-white/30 tracking-[0.2em] leading-none mb-1">{kpi.label}</p>
            <h4 className={`text-2xl md:text-3xl font-black italic tracking-tighter ${kpi.color} leading-none`}>
              {formatRMNum(kpi.val || 0)}<span className="text-[10px] opacity-40 ml-0.5 not-italic uppercase font-bold">{kpi.unit}</span>
            </h4>
          </div>
        ))}
      </div>

      {/* CHART TOGGLE SLIM */}
      <button 
        onClick={() => setShowChart(!showChart)}
        className="w-full py-1.5 glass rounded-lg border border-white/5 text-[7px] font-black uppercase tracking-[0.5em] text-white/20 hover:text-blue-400 transition-all shrink-0"
      >
        {showChart ? 'COLAPSAR ANALÍTICA' : 'EXPANDIR ANALÍTICA'}
      </button>

      {showChart && (
        <div className="glass rounded-xl border border-blue-500/10 bg-black/40 p-2 h-[120px] md:h-[160px] animate-in slide-in-from-top duration-300 shrink-0">
           <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processed?.history || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                <XAxis dataKey="mes" stroke="rgba(255,255,255,0.2)" fontSize={7} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{backgroundColor: '#000', border: '1px solid #3b82f6', fontSize: '8px', borderRadius: '8px'}} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                <Bar name="ING" dataKey="ingresos" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={8} />
                <Bar name="GAS" dataKey="gastos" fill="#ef4444" radius={[2, 2, 0, 0]} barSize={8} />
              </BarChart>
           </ResponsiveContainer>
        </div>
      )}

      {/* GRID DE DATOS */}
      <div className="flex flex-col md:flex-row gap-3">
        
        {/* COLUMNA CATEGORÍAS */}
        <div className={`glass rounded-[30px] border border-white/5 bg-black/20 flex flex-col p-4 md:p-5 flex-[1.2] transition-all duration-300 ${isMobile && !showCategoriesMobile ? 'h-[55px] overflow-hidden' : 'h-auto'}`}>
          <div className="flex justify-between items-center mb-3 shrink-0">
             <h4 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-blue-400 italic">CATEGORÍAS_MES</h4>
             {isMobile && (
               <button 
                onClick={(e) => { e.preventDefault(); setShowCategoriesMobile(!showCategoriesMobile); }}
                className="px-4 py-2 bg-blue-600/20 border border-blue-500/40 rounded-xl text-[9px] font-black text-blue-400 uppercase tracking-widest active:scale-95 transition-all"
               >
                 {showCategoriesMobile ? 'CERRAR' : 'VER'}
               </button>
             )}
          </div>
          
          {(showCategoriesMobile || !isMobile) && (
            <div className="space-y-2.5">
              {processed?.categories.map((cat: any, i: number) => (
                <div key={i} className="bg-white/[0.02] p-3 md:p-4 rounded-xl border border-white/5 flex flex-col gap-1.5 hover:bg-white/5 transition-all">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] md:text-xs font-black text-white/90 uppercase tracking-tight truncate pr-2">{cat.name}</span>
                    <span className={`text-[11px] md:text-sm font-black italic ${cat.percent > 100 ? 'text-red-500' : 'text-blue-400'}`}>{cat.percent}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-700 ${cat.percent > 100 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, cat.percent)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLUMNA TRANSACCIONES (REGISTROS) */}
        <div className="glass rounded-[30px] border border-white/5 bg-black/20 flex flex-col p-4 md:p-5 flex-1 h-auto min-h-[400px]">
          <div className="flex justify-between items-center mb-4 shrink-0">
             <h4 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-green-400 italic">REGISTROS_HISTÓRICOS</h4>
             <span className="text-[7px] font-mono text-white/20 uppercase tracking-widest">REAL_TIME</span>
          </div>
          <div className="space-y-1">
            {processed?.transactions.map((tx: any, i: number) => (
              <div key={i} className={`flex justify-between items-center py-2.5 px-3 rounded-xl border-b border-white/[0.02] ${i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'}`}>
                <div className="min-w-0 pr-4">
                  <p className="text-[10px] font-black text-white/80 truncate uppercase leading-tight">{tx.desc}</p>
                  <p className="text-[7px] font-bold text-white/20 uppercase mt-1 tracking-tighter">{tx.fecha} • {tx.cat}</p>
                </div>
                <span className={`text-[11px] font-black tabular-nums shrink-0 italic ${tx.montoNum < 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.monto.replace('€', '')}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* FOOTER BARRA DE STATUS - SIEMPRE AL FINAL DEL FLUJO */}
      <div className="glass-dark mt-4 px-4 py-2.5 rounded-xl flex justify-between items-center border border-white/10 shrink-0 bg-black/60">
         <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40 animate-pulse" />
            <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">NEXUS_FINANCE_v4.7_STABLE</span>
         </div>
         <span className="text-[7px] font-mono text-white/10 uppercase italic">MOBILE_FULL_SCROLL_ENABLED</span>
      </div>
    </div>
  );
};

export default FinanceView;
