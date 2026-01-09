
import React, { useState, useEffect, useMemo } from 'react';
import { HomeAssistantConfig, CustomFinanceWidget } from '../types';
import { fetchFinanceFromSheets } from '../fireflyService';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Line, PieChart, Pie, Cell, Legend, Area, ComposedChart, LabelList
} from 'recharts';

// Added index signature to CategoryData to fix Recharts type compatibility
interface CategoryData {
  [key: string]: any;
  name: string;
  budget: number;
  real: number;
  remaining: number;
  percent: number;
  transactions: TransactionData[];
}

interface TransactionData {
  fecha: string;
  desc: string;
  monto: string;
  cat: string;
  montoNum: number;
}

interface HistoryPoint {
  mes: string;
  ingresos: number;
  gastosReal: number;
  gastosPrevisto: number;
  ahorroNeto: number;
  ahorroAcumulado: number;
}

const FinanceView: React.FC = () => {
  const [haConfig, setHaConfig] = useState<HomeAssistantConfig | null>(null);
  const [sheetData, setSheetData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
    window.addEventListener('rm_config_updated', loadConfig);
    return () => window.removeEventListener('rm_config_updated', loadConfig);
  }, []);

  const loadConfig = async () => {
    const saved = localStorage.getItem('nexus_ha_config');
    if (saved) {
      const parsed: HomeAssistantConfig = JSON.parse(saved);
      setHaConfig(parsed);
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
    if (now.getDate() >= 20) monthIdx = (monthIdx + 1) % 12;
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return months[monthIdx];
  };

  const parseSpanishNum = (val: any): number => {
    if (val === undefined || val === null || val === '0' || val === '-' || val === "") return 0;
    let str = String(val).trim().replace('€', '').replace(/\s/g, '');
    const isNegative = str.includes('-') || str.includes('(');
    str = str.replace(/[()\-]/g, '');
    
    if (str.includes(',') && str.includes('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',')) {
      str = str.replace(',', '.');
    }
    
    const n = parseFloat(str);
    const final = isNaN(n) ? 0 : n;
    return isNegative ? -Math.abs(final) : final;
  };

  const formatRMNum = (val: number) => {
    return new Intl.NumberFormat('de-DE', { 
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(Math.round(val));
  };

  const normalizeText = (text: string) => {
    return text?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() || "";
  };

  const processed = useMemo(() => {
    if (!sheetData?.matrix || sheetData.matrix.length < 2) return null;
    
    const activeMonth = normalizeText(getActiveMonth());
    const rows = sheetData.matrix;

    const transactions: TransactionData[] = rows
      .slice(1, 150)
      .filter((r: string[]) => r[0] && r[0] !== "Fecha")
      .map((r: string[]) => ({
        fecha: r[0],
        desc: r[1],
        monto: r[2],
        cat: r[3],
        montoNum: parseSpanishNum(r[2])
      }));

    const categories: CategoryData[] = rows
      .filter((r: string[]) => normalizeText(r[5]) === activeMonth)
      .map((r: string[]) => {
        const name = r[6] || "Sin nombre";
        const budget = Math.abs(parseSpanishNum(r[7]));
        const real = Math.abs(parseSpanishNum(r[8]));
        const remaining = budget - real;
        const percent = budget > 0 ? Math.round((real / budget) * 100) : 0;
        
        const relatedTx = transactions.filter((tx: TransactionData) => 
          normalizeText(tx.cat).includes(normalizeText(name)) || 
          normalizeText(name).includes(normalizeText(tx.cat))
        );

        return { name, budget, real, remaining, percent, transactions: relatedTx };
      })
      .filter((c: CategoryData) => c.name && !["Categoria", "Subtotal", "Total"].includes(c.name))
      .sort((a: CategoryData, b: CategoryData) => b.percent - a.percent);

    let runningTotal = 0;
    const history: HistoryPoint[] = rows
      .map((r: string[]) => {
        const ahorroMes = parseSpanishNum(r[14]);
        if (r[10] && r[10] !== "Mes") {
          runningTotal += ahorroMes;
        }
        return {
          mes: r[10],
          ingresos: parseSpanishNum(r[11]),
          gastosReal: parseSpanishNum(r[12]),
          gastosPrevisto: parseSpanishNum(r[13]),
          ahorroNeto: ahorroMes,
          ahorroAcumulado: runningTotal,
        };
      })
      .filter((h: HistoryPoint) => h.mes && h.mes !== "Mes" && (h.ingresos !== 0 || h.gastosReal !== 0 || h.ahorroNeto !== 0));

    const currentStats = history.find((h: HistoryPoint) => normalizeText(h.mes) === activeMonth) || history[history.length - 1];
    const saldoO14 = parseSpanishNum(rows[13]?.[14]);

    const ahorroPercent = currentStats?.ingresos > 0 ? Math.round((currentStats.ahorroNeto / currentStats.ingresos) * 100) : 0;
    const gastoPercent = currentStats?.gastosPrevisto > 0 ? Math.round((currentStats.gastosReal / currentStats.gastosPrevisto) * 100) : 0;

    const customKPIs = (haConfig?.finance?.custom_widgets || []).map((w: CustomFinanceWidget) => {
      const rawVal = w.cell ? sheetData.getCellValue(w.cell) : "0";
      return {
        ...w,
        value: parseSpanishNum(rawVal)
      };
    });

    return { categories, history, currentStats, saldoO14, ahorroPercent, gastoPercent, customKPIs };
  }, [sheetData, haConfig]);

  const COLORS = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#d946ef'];

  const getAccentColor = (colorName?: string) => {
    switch(colorName) {
      case 'blue': return 'text-blue-400 border-blue-500/20';
      case 'green': return 'text-green-400 border-green-500/20';
      case 'orange': return 'text-orange-400 border-orange-500/20';
      case 'purple': return 'text-purple-400 border-purple-500/20';
      case 'red': return 'text-red-400 border-red-500/20';
      default: return 'text-white border-white/10';
    }
  };

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center gap-6">
      <div className="w-20 h-20 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-blue-400 font-black text-xs uppercase tracking-[1em] animate-pulse">Sincronizando RM Capital...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-10 pb-32 h-full overflow-y-auto no-scrollbar px-6 animate-in fade-in duration-1000">
      
      {/* KPIs MAESTROS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
        <div className="glass rounded-[40px] p-8 border border-blue-500/20 bg-black/40 h-[220px] flex flex-col justify-between shadow-2xl transition-all">
          <p className="text-lg font-black uppercase tracking-[0.4em] text-blue-400 italic">Ahorro Mensual</p>
          <div>
            <h4 className={`text-5xl font-black italic tabular-nums leading-none ${ (processed?.currentStats?.ahorroNeto || 0) < 0 ? 'text-red-500' : 'text-white' }`}>
              {formatRMNum(processed?.currentStats?.ahorroNeto || 0)}€
            </h4>
            <p className="text-xl font-black text-blue-400 mt-3 uppercase tracking-widest border-t border-white/5 pt-3">
              {processed?.ahorroPercent}% <span className="text-[10px] text-white/30 tracking-[0.2em] font-medium ml-1">EFICIENCIA</span>
            </p>
          </div>
        </div>

        <div className="glass rounded-[40px] p-8 border border-green-500/20 bg-black/40 h-[220px] flex flex-col justify-between shadow-2xl transition-all">
          <p className="text-lg font-black uppercase tracking-[0.4em] text-green-400 italic">Ingresos</p>
          <h4 className="text-5xl font-black text-green-400 italic tabular-nums leading-none">
            {formatRMNum(processed?.currentStats?.ingresos || 0)}€
          </h4>
        </div>

        <div className="glass rounded-[40px] p-8 border border-red-500/20 bg-black/40 h-[220px] flex flex-col justify-between shadow-2xl transition-all">
          <p className="text-lg font-black uppercase tracking-[0.4em] text-red-400 italic">Gastos Reales</p>
          <div>
            <h4 className="text-5xl font-black text-red-400 italic tabular-nums leading-none">
              {formatRMNum(processed?.currentStats?.gastosReal || 0)}€
            </h4>
            <div className="flex justify-between items-center mt-3 border-t border-white/10 pt-3">
              <span className={`text-xl font-black ${processed?.gastoPercent && processed.gastoPercent > 100 ? 'text-red-500' : 'text-white'}`}>
                {processed?.gastoPercent}% <span className="text-[10px] text-white/30 tracking-widest italic font-medium ml-1">EJECUTADO</span>
              </span>
            </div>
          </div>
        </div>

        <div className="glass rounded-[40px] p-8 border border-purple-500/30 bg-purple-500/5 h-[220px] flex flex-col justify-between shadow-2xl relative transition-all">
          <p className="text-lg font-black uppercase tracking-[0.4em] text-purple-400 italic">Patrimonio Neto</p>
          <h4 className={`text-5xl font-black italic tabular-nums leading-none ${ (processed?.saldoO14 || 0) < 0 ? 'text-red-500' : 'text-white' }`}>
            {formatRMNum(processed?.saldoO14 || 0)}€
          </h4>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 shrink-0">
        
        {/* DISTRIBUCIÓN INTEGRADA CON TRANSACCIONES (DRILL-DOWN) */}
        <div className="lg:col-span-2 glass rounded-[50px] border border-white/10 bg-black/30 flex flex-col h-[850px] overflow-hidden">
          <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
            <h4 className="text-xl font-black uppercase tracking-[0.4em] text-white italic border-l-4 border-blue-500 pl-6">Distribución Operativa RM</h4>
            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Auditoría de Flujos</span>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-8">
            {processed?.categories.map((cat: CategoryData, idx: number) => (
              <div key={idx} className="space-y-4">
                <div className="bg-white/[0.04] p-6 rounded-[35px] border border-white/10 shadow-xl">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <span className="text-2xl font-black text-white uppercase italic tracking-wider">{cat.name}</span>
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mt-1">Presupuesto: {formatRMNum(cat.budget)}€</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-3xl font-black ${cat.percent > 100 ? 'text-red-500' : 'text-white'}`}>{cat.percent}%</span>
                      <p className="text-[10px] font-black text-white/20 uppercase mt-1">Consumo</p>
                    </div>
                  </div>
                  
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-6">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${cat.percent > 100 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`} 
                      style={{ width: `${Math.min(100, cat.percent)}%` }} 
                    />
                  </div>

                  {cat.transactions.length > 0 ? (
                    <div className="space-y-2 border-t border-white/5 pt-4">
                      <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.4em] mb-4 ml-2">Movimientos Relacionados</p>
                      {cat.transactions.map((tx: TransactionData, txIdx: number) => (
                        <div key={txIdx} className="flex justify-between items-center px-6 py-3 bg-white/[0.02] rounded-2xl border border-white/5 group hover:bg-white/[0.05] transition-all">
                          <div className="flex items-center gap-6 min-w-0">
                            <span className="text-[10px] font-mono text-white/20 uppercase w-20">{tx.fecha}</span>
                            <span className="text-sm font-bold text-white/80 uppercase truncate max-w-[300px]">{tx.desc}</span>
                          </div>
                          <span className={`text-lg font-black tabular-nums ${tx.montoNum < 0 ? 'text-green-400' : 'text-red-500'}`}>
                            {formatRMNum(tx.montoNum)}€
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 border-t border-white/5 mt-4">
                      <span className="text-[8px] font-black text-white/10 uppercase tracking-widest italic">Sin transacciones directas registradas</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MIX DE CONSUMO (PIE) */}
        <div className="glass rounded-[50px] p-10 border border-white/10 bg-black/30 flex flex-col items-center h-[850px] shadow-2xl relative">
          <h4 className="text-lg font-black uppercase tracking-[0.4em] text-white/30 italic mb-10">Mix de Consumo</h4>
          <div className="w-full h-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  {COLORS.map((color, i) => (
                    <radialGradient key={`grad-${i}`} id={`pieGrad-${i}`} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                      <stop offset="0%" stopColor={color} stopOpacity={1} />
                      <stop offset="100%" stopColor="#000" stopOpacity={0.8} />
                    </radialGradient>
                  ))}
                </defs>
                <Pie 
                  data={processed?.categories || []} 
                  dataKey="real" 
                  nameKey="name" 
                  cx="50%" cy="40%" 
                  innerRadius={110} 
                  outerRadius={160} 
                  paddingAngle={6}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth={3}
                >
                  {processed?.categories.map((_: CategoryData, index: number) => (
                    <Cell key={`cell-${index}`} fill={`url(#pieGrad-${index % COLORS.length})`} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string) => [`${formatRMNum(value)}€`, name.toUpperCase()]}
                  contentStyle={{backgroundColor: '#000', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '30px', color: '#fff', fontSize: '14px', fontWeight: '900', padding: '15px'}}
                  itemStyle={{color: '#fff', textTransform: 'uppercase'}}
                />
                <Legend 
                  layout="vertical" 
                  align="center" 
                  verticalAlign="bottom"
                  wrapperStyle={{ 
                    paddingTop: '30px', 
                    fontSize: '12px', 
                    textTransform: 'uppercase', 
                    fontWeight: '900',
                    color: 'white',
                    letterSpacing: '0.1em'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none flex flex-col z-10">
              <span className="text-[10px] font-black text-white/20 block tracking-[0.5em] mb-2 uppercase">Gasto Ciclo</span>
              <h5 className="text-5xl font-black text-white italic leading-none">{formatRMNum(processed?.currentStats?.gastosReal || 0)}€</h5>
              <div className="h-1 w-12 bg-red-500/40 mx-auto mt-4 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
            </div>
          </div>
        </div>

        {/* PROYECCIÓN PATRIMONIAL UNIFICADA */}
        <div className="lg:col-span-3 glass rounded-[50px] p-12 border border-white/10 bg-black/40 h-[600px] shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-12">
             <div className="flex flex-col gap-1">
                <h4 className="text-xl font-black uppercase tracking-[0.4em] text-white italic border-l-4 border-purple-500 pl-6">Proyección de Patrimonio & Ahorro RM</h4>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest pl-10">Análisis Histórico Interconectado</p>
             </div>
             <div className="flex gap-8">
                <div className="flex items-center gap-3">
                   <div className="w-4 h-1 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
                   <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Patrimonio Total</span>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-4 h-1 rounded-full bg-green-500 shadow-[0_0_10px_#10b981]" />
                   <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Ahorro (+)</span>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-4 h-1 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]" />
                   <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Déficit (-)</span>
                </div>
             </div>
          </div>
          
          <div className="h-full pb-14">
            <ResponsiveContainer width="100%" height="90%">
              <ComposedChart data={processed?.history} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="mes" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '900'}} 
                />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 12}} />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'ahorroAcumulado') return [`${formatRMNum(value)}€`, 'PATRIMONIO'];
                    return [`${formatRMNum(value)}€`, 'NETO MES'];
                  }}
                  contentStyle={{backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '25px', color: '#fff', fontWeight: '900', padding: '15px'}}
                />
                
                <Area type="monotone" dataKey="ahorroAcumulado" fill="url(#colorAcumulado)" stroke="none" />
                
                <Line 
                  type="monotone" 
                  name="ahorroAcumulado" 
                  dataKey="ahorroAcumulado" 
                  stroke="#3b82f6" 
                  strokeWidth={8} 
                  dot={{r: 6, fill: '#3b82f6', strokeWidth: 0}} 
                  activeDot={{r: 10, stroke: '#fff', strokeWidth: 4}} 
                >
                  <LabelList 
                    dataKey="ahorroAcumulado" 
                    position="top" 
                    offset={15} 
                    content={(props: any) => {
                      const { x, y, value } = props;
                      return (
                        <text x={x} y={y - 10} fill="#3b82f6" fontSize={11} fontWeight="900" textAnchor="middle" style={{fontFamily: 'JetBrains Mono'}}>
                          {formatRMNum(value)}€
                        </text>
                      );
                    }}
                  />
                </Line>
                
                <Line 
                  type="stepAfter" 
                  name="ahorroNeto" 
                  dataKey="ahorroNeto" 
                  strokeWidth={3}
                  strokeDasharray="6 4"
                  stroke="#ffffff15"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const color = payload.ahorroNeto < 0 ? '#ef4444' : '#10b981';
                    return (
                      <g key={`node-${payload.mes}`}>
                        <circle cx={cx} cy={cy} r={6} fill={color} stroke="white" strokeWidth={1.5} />
                        <text x={cx} y={cy + 25} fill={color} fontSize={10} fontWeight="900" textAnchor="middle" style={{fontFamily: 'JetBrains Mono'}}>
                           {payload.ahorroNeto > 0 ? '+' : ''}{formatRMNum(payload.ahorroNeto)}
                        </text>
                        {payload.ahorroNeto < 0 && (
                          <circle cx={cx} cy={cy} r={12} fill={color} fillOpacity={0.15} className="animate-pulse" />
                        )}
                      </g>
                    );
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECCIÓN DE KPIs PERSONALIZADOS (DATOS DE SHEETS) */}
        {processed?.customKPIs && processed.customKPIs.length > 0 && (
          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 shrink-0 mt-4">
            <div className="col-span-full mb-2">
               <h4 className="text-[10px] font-black uppercase tracking-[0.6em] text-white/30 italic flex items-center gap-4">
                  <div className="h-px flex-1 bg-white/5" />
                  RM Telemetría de Hoja Directa
                  <div className="h-px flex-1 bg-white/5" />
               </h4>
            </div>
            {processed.customKPIs.map((kpi: any, i: number) => (
              <div key={i} className={`glass p-6 rounded-[35px] border ${getAccentColor(kpi.color)} bg-black/40 shadow-xl flex flex-col justify-between h-[180px] group hover:scale-[1.02] transition-transform`}>
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">{kpi.title || `KPI ${kpi.cell}`}</p>
                 <div>
                    <h5 className="text-4xl font-black italic tabular-nums leading-none">
                       {formatRMNum(kpi.value)}
                       <span className="text-xs ml-2 opacity-20 not-italic uppercase font-black">{kpi.unit || '€'}</span>
                    </h5>
                    <p className="text-[8px] font-mono opacity-10 uppercase tracking-widest mt-3">COORD: RM_LOG_{kpi.cell}</p>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanceView;
