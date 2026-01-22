
import React, { useState, useEffect, useMemo } from 'react';
import { HomeAssistantConfig } from '../types';
import { fetchFinanceFromSheets } from '../fireflyService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LabelList } from 'recharts';
import SheetsView from './SheetsView';

interface TransactionData {
  fecha: string; desc: string; monto: string; cat: string; montoNum: number;
}

const FinanceView: React.FC = () => {
  const [sheetData, setSheetData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showChart, setShowChart] = useState(false);
  const [showSheets, setShowSheets] = useState(false);
  const [showCategoriesMobile, setShowCategoriesMobile] = useState(false);
  const [showTransactionsMobile, setShowTransactionsMobile] = useState(false);
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
    
    // Extracción de Transacciones Recientes
    const transactions: TransactionData[] = rows.slice(1, 100).filter((r: string[]) => r[0] && r[0] !== "Fecha" && r[0] !== "Total").map((r: string[]) => ({
      fecha: r[0], desc: r[1], monto: r[2], cat: r[3], montoNum: parseSpanishNum(r[2])
    }));

    // Extracción de Categorías Mensuales
    let totalBudget = 0;
    let totalRealAccumulated = 0;
    const categories = rows.filter((r: string[]) => normalizeText(r[5]) === activeMonth).map((r: string[]) => {
      const budget = Math.abs(parseSpanishNum(r[7]));
      const real = Math.abs(parseSpanishNum(r[8]));
      totalBudget += budget;
      totalRealAccumulated += real;
      return { 
        name: r[6], 
        budget, 
        real, 
        remaining: budget - real, 
        percent: budget > 0 ? Math.round((real / budget) * 100) : 0 
      };
    }).filter((c: any) => c.name && !["Categoria", "Subtotal", "Total"].includes(c.name)).sort((a: any, b: any) => b.percent - a.percent);

    // Historial de Gráficas
    const history = rows.filter((r: string[]) => r[10] && r[10] !== "Mes" && r[10] !== "Total").map((r: string[]) => {
      const ingresos = Math.abs(parseSpanishNum(r[11]));
      const gastos = Math.abs(parseSpanishNum(r[15]));
      const ahorroColO = parseSpanishNum(r[14]); 
      return { mes: r[10], ingresos, gastos, ahorro: ahorroColO };
    });

    const current = history.find((h: any) => normalizeText(h.mes) === activeMonth) || history[history.length - 1];
    const efficiencyRatio = (current?.ingresos > 0) ? Math.max(0, Math.round((current.ahorro / current.ingresos) * 100)) : 0;

    // NUEVOS KPIs PATRIMONIALES (K16-K21 / L16-L21)
    const getKpiData = (rowIdx: number) => ({
      label: rows[rowIdx]?.[10]?.toUpperCase().replace(/\s/g, '_') || 'S_D',
      value: parseSpanishNum(rows[rowIdx]?.[11])
    });

    const patrimonyKpis = {
      saldoCuentas: getKpiData(15),
      saldoFondos: getKpiData(16),
      sumaPatrimonio: getKpiData(17),
      ingresosPendientes: getKpiData(18),
      saldoCorregido: getKpiData(19),
      margenCorreccion: getKpiData(20)
    };

    return { 
      categories, history, current, saldo: parseSpanishNum(rows[13]?.[14]), 
      transactions, efficiencyRatio, totalRealAccumulated, totalBudget,
      patrimonyKpis
    };
  }, [sheetData]);

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center gap-6">
      <div className="w-12 h-12 border-2 border-white/5 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-blue-400 font-black text-[10px] uppercase tracking-[0.5em] animate-pulse italic">Iniciando Nexus Finance v14...</p>
    </div>
  );

  const ahorroPositivo = (processed?.current?.ahorro || 0) > 0;
  const margenPositivo = (processed?.patrimonyKpis.margenCorreccion.value || 0) >= 0;

  return (
    <div className="flex flex-col gap-6 pb-48 md:pb-12 min-h-full px-1">
      
      {/* SECCIÓN 1: OPERATIVA_MENSUAL */}
      <div className="flex flex-col gap-3">
        <h5 className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] px-2 italic">Dashboard_Operativo</h5>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="col-span-1 grid grid-cols-2 gap-2">
            <button onClick={() => setShowSheets(true)} className="glass flex items-center justify-center p-3 rounded-2xl border-2 border-green-500/40 bg-green-500/10 hover:bg-green-500/20 transition-all shadow-xl">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="3"/></svg>
            </button>
            <button onClick={() => window.open('https://firefly.juanmirs.com/login', '_blank')} className="glass flex items-center justify-center p-3 rounded-2xl border-2 border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 transition-all shadow-xl">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" strokeWidth="3"/></svg>
            </button>
          </div>

          {[
            { label: 'AHORRO_MES', val: processed?.current?.ahorro, unit: '€', color: ahorroPositivo ? 'text-green-400' : 'text-red-400' },
            { label: 'INGRESOS_MES', val: processed?.current?.ingresos, unit: '€', color: 'text-blue-400' },
            { label: 'GASTOS_REAL', val: processed?.totalRealAccumulated, unit: '€', color: 'text-red-500' },
            { label: 'SALDO_BANCO', val: processed?.saldo, unit: '€', color: 'text-purple-400' },
            { label: 'KPI_EFICIENCIA', val: processed?.efficiencyRatio, unit: '%', color: 'text-orange-400' }
          ].map((kpi, i) => (
            <div key={i} className="glass px-4 py-6 rounded-[30px] border border-white/10 flex flex-col justify-center bg-black/50 shadow-2xl">
              <p className="text-[8px] font-black uppercase text-white/30 tracking-[0.2em] mb-2">{kpi.label}</p>
              <h4 className={`text-2xl md:text-3xl font-black italic tracking-tighter ${kpi.color} leading-none font-orbitron drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]`}>
                {formatRMNum(kpi.val || 0)}<span className="text-[10px] opacity-40 ml-1 not-italic uppercase font-bold">{kpi.unit}</span>
              </h4>
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN 2: PATRIMONIO_Y_CORRECCIÓN */}
      <div className="flex flex-col gap-3">
        <h5 className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] px-2 italic">Estado_Patrimonial_Nexus</h5>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { ...processed?.patrimonyKpis.saldoCuentas, color: 'text-white/80' },
            { ...processed?.patrimonyKpis.saldoFondos, color: 'text-blue-300' },
            { ...processed?.patrimonyKpis.sumaPatrimonio, color: 'text-blue-500' },
            { ...processed?.patrimonyKpis.ingresosPendientes, color: 'text-yellow-400/80' },
            { ...processed?.patrimonyKpis.saldoCorregido, color: 'text-purple-500' },
            { ...processed?.patrimonyKpis.margenCorreccion, color: margenPositivo ? 'text-green-500 animate-pulse' : 'text-red-500' }
          ].map((kpi, i) => (
            <div key={i} className={`glass px-4 py-6 rounded-[30px] border border-white/10 flex flex-col justify-center bg-black/70 shadow-2xl transition-all hover:border-white/20`}>
              <p className="text-[8px] font-black uppercase text-white/20 tracking-[0.2em] mb-2 truncate">{kpi.label}</p>
              <h4 className={`text-2xl md:text-3xl font-black italic tracking-tighter ${kpi.color} leading-none font-orbitron`}>
                {formatRMNum(kpi.value || 0)}<span className="text-[10px] opacity-20 ml-1 not-italic uppercase font-bold">€</span>
              </h4>
            </div>
          ))}
        </div>
      </div>

      {/* ACCIONES_GLOBALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button 
          onClick={() => setShowChart(!showChart)}
          className={`w-full py-5 glass rounded-[30px] border-2 transition-all shadow-2xl text-[10px] font-black uppercase tracking-[0.4em] ${showChart ? 'bg-blue-600 border-blue-400 text-white' : 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10'}`}
        >
          {showChart ? 'OCULTAR_ANALÍTICA' : 'ABRIR_ANALÍTICA_HISTÓRICA'}
        </button>
        <button 
          onClick={() => setShowSheets(true)}
          className="w-full py-5 glass rounded-[30px] border-2 border-green-500/30 text-green-400 hover:bg-green-500/10 transition-all shadow-2xl text-[10px] font-black uppercase tracking-[0.4em]"
        >
          VER_MATRIZ_LOGÍSTICA_GLOBAL
        </button>
      </div>

      {showSheets && <SheetsView onClose={() => setShowSheets(false)} />}

      {showChart && (
        <div className="glass rounded-[45px] border border-white/10 bg-black/60 p-8 h-[300px] md:h-[420px] animate-in slide-in-from-top duration-700 shadow-2xl overflow-hidden">
           <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processed?.history || []} margin={{ top: 30, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="mes" stroke="rgba(255,255,255,0.3)" fontSize={11} fontWeight="800" tickLine={false} axisLine={false} dy={10} />
                <YAxis hide />
                <Tooltip contentStyle={{backgroundColor: '#000', border: '2px solid #3b82f6', fontSize: '12px', borderRadius: '15px', fontWeight: '900'}} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
                <Bar name="INGRESOS" dataKey="ingresos" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={24}>
                   <LabelList dataKey="ingresos" position="top" fill="#3b82f6" fontSize={9} fontWeight="900" formatter={(v:any) => v > 0 ? `${formatRMNum(v)}` : ''} />
                </Bar>
                <Bar name="GASTOS" dataKey="gastos" fill="#ef4444" radius={[8, 8, 0, 0]} barSize={24}>
                   <LabelList dataKey="gastos" position="top" fill="#ef4444" fontSize={9} fontWeight="900" formatter={(v:any) => v > 0 ? `${formatRMNum(v)}` : ''} />
                </Bar>
              </BarChart>
           </ResponsiveContainer>
        </div>
      )}

      {/* PANALES_DETALLE */}
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6">
        <div className={`glass rounded-[50px] border border-white/10 bg-black/40 flex flex-col p-8 transition-all duration-300 shadow-2xl ${isMobile && !showCategoriesMobile ? 'h-[105px] overflow-hidden' : 'h-auto'}`}>
          <div className="flex justify-between items-center mb-8 shrink-0">
             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 italic">CATEGORÍAS_MENSUALES</h4>
             {isMobile && (
               <button onClick={() => setShowCategoriesMobile(!showCategoriesMobile)} className="px-6 py-3 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-[9px] font-black uppercase text-blue-400 transition-all active:scale-95">
                 {showCategoriesMobile ? 'REDUCIR' : 'EXPANDIR'}
               </button>
             )}
          </div>
          <div className="space-y-6">
            {processed?.categories.map((cat: any, i: number) => (
              <div key={i} className="bg-white/[0.03] p-6 rounded-[30px] border border-white/5 flex flex-col gap-4 hover:bg-white/10 transition-all group">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                     <span className="text-[13px] font-black text-white uppercase tracking-tight truncate">{cat.name?.replace(' ', '_')}</span>
                     <div className="flex items-center gap-4 mt-2">
                        <span className="text-[9px] font-bold text-white/30 uppercase font-mono italic">REAL: {formatRMNum(cat.real)}€</span>
                        <span className="text-[9px] font-bold text-white/15 uppercase font-mono">PLAN: {formatRMNum(cat.budget)}€</span>
                     </div>
                  </div>
                  <span className={`text-xl font-black italic font-orbitron ${cat.percent > 100 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>{cat.percent}%</span>
                </div>
                <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                  <div className={`h-full transition-all duration-1000 ${cat.percent > 100 ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, cat.percent)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`glass rounded-[50px] border border-white/10 bg-black/40 flex flex-col p-8 transition-all duration-300 shadow-2xl ${isMobile && !showTransactionsMobile ? 'h-[105px] overflow-hidden' : 'h-auto'}`}>
          <div className="flex justify-between items-center mb-8 shrink-0">
             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-green-400 italic">LOG_REGISTRO_NEXUS</h4>
             {isMobile && (
               <button onClick={() => setShowTransactionsMobile(!showTransactionsMobile)} className="px-6 py-3 rounded-2xl bg-green-600/20 border border-green-500/30 text-[9px] font-black uppercase text-green-400 transition-all active:scale-95">
                 {showTransactionsMobile ? 'REDUCIR' : 'EXPANDIR'}
               </button>
             )}
          </div>
          <div className="space-y-3">
            {processed?.transactions.map((tx: any, i: number) => (
              <div key={i} className={`flex justify-between items-center py-5 px-8 rounded-[25px] border border-white/5 shadow-sm hover:border-white/20 transition-all ${i % 2 === 0 ? 'bg-white/[0.04]' : 'bg-transparent'}`}>
                <div className="min-w-0 pr-6">
                  <p className="text-[12px] font-black text-white/90 truncate uppercase leading-tight">{tx.desc?.replace(' ', '_')}</p>
                  <p className="text-[8px] font-bold text-white/20 uppercase mt-2 tracking-widest font-mono italic">{tx.fecha} // {tx.cat?.replace(' ', '_')}</p>
                </div>
                <span className={`text-base font-black tabular-nums italic font-orbitron ${tx.montoNum < 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.monto.replace('€', '')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceView;
