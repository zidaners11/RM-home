
import React, { useState, useEffect, useMemo } from 'react';
import { HomeAssistantConfig } from '../types';
import { fetchFinanceFromSheets } from '../fireflyService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TransactionData {
  fecha: string; desc: string; monto: string; cat: string; montoNum: number;
}

const FinanceView: React.FC = () => {
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
    if (now.getDate() >= 20) monthIdx = (now.getMonth() + (now.getDate() >= 20 ? 1 : 0)) % 12;
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
    const categories = rows.filter((r: string[]) => normalizeText(r[5]) === activeMonth).map((r: string[]) => {
      const budget = Math.abs(parseSpanishNum(r[7]));
      const real = Math.abs(parseSpanishNum(r[8]));
      return { name: r[6], budget, real, remaining: budget - real, percent: budget > 0 ? Math.round((real / budget) * 100) : 0 };
    }).filter((c: any) => c.name && !["Categoria", "Subtotal", "Total"].includes(c.name)).sort((a: any, b: any) => b.percent - a.percent);

    const history = rows.filter((r: string[]) => r[10] && r[10] !== "Mes" && r[10] !== "Total").map((r: string[]) => ({
      mes: r[10], ingresos: Math.abs(parseSpanishNum(r[11])), gastos: Math.abs(parseSpanishNum(r[15])), ahorro: parseSpanishNum(r[14])
    }));

    const current = history.find((h: any) => normalizeText(h.mes) === activeMonth) || history[history.length - 1];
    return { categories, history, current, saldo: parseSpanishNum(rows[13]?.[14]), transactions };
  }, [sheetData]);

  if (loading) return <div className="h-full flex items-center justify-center animate-pulse text-blue-400 font-black text-[10px]">SYNC_FINANCE_STREAM...</div>;

  return (
    <div className="flex flex-col gap-4 pb-32 h-full overflow-y-auto no-scrollbar px-1">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'AHORRO_MES', val: processed?.current?.ahorro, color: (processed?.current?.ahorro || 0) > 0 ? 'text-green-400' : 'text-red-400' },
          { label: 'INGRESOS', val: processed?.current?.ingresos, color: 'text-green-400' },
          { label: 'GASTOS', val: processed?.current?.gastos, color: 'text-red-400' },
          { label: 'SALDO_CORE', val: processed?.saldo, color: 'text-purple-400' }
        ].map((kpi, i) => (
          <div key={i} className="glass p-4 rounded-[25px] border border-white/10 h-[80px] md:h-[120px] flex flex-col justify-between bg-black/60 shadow-xl">
            <p className="text-[10px] md:text-[11px] font-black uppercase text-white/40 tracking-widest leading-none">{kpi.label}</p>
            <h4 className={`text-lg md:text-2xl font-black italic leading-none truncate ${kpi.color}`}>{formatRMNum(kpi.val || 0)}€</h4>
          </div>
        ))}
      </div>

      <div className="glass rounded-[35px] border border-white/10 bg-black/40 p-6 md:p-10 h-[380px] md:h-[500px]">
        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-8 italic">Métricas de Flujo Anual</h4>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={processed?.history || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="mes" stroke="rgba(255,255,255,0.3)" fontSize={9} />
            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={9} />
            <Tooltip contentStyle={{backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px'}} />
            <Bar name="Ingresos" dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar name="Gastos" dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass rounded-[35px] border border-white/10 bg-black/40 p-6 md:p-10 flex flex-col gap-6">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 italic">Presupuesto por Categoría (%)</h4>
          <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
            {processed?.categories.map((cat: any, i: number) => (
              <div key={i} className="bg-white/[0.03] p-4 rounded-3xl border border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-black text-white truncate uppercase tracking-widest">{cat.name}</span>
                  <span className={`text-base font-black ${cat.percent > 100 ? 'text-red-500' : 'text-blue-400'}`}>{cat.percent}%</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${cat.percent > 100 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, cat.percent)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-[35px] border border-white/10 bg-black/40 p-6 md:p-10 flex flex-col gap-6">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-green-400 italic">Transacciones del Período</h4>
          <div className="space-y-3 overflow-y-auto max-h-[400px] no-scrollbar">
            {processed?.transactions.map((tx: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-2xl border-b border-white/5">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-white truncate uppercase tracking-tight">{tx.desc}</p>
                  <p className="text-[8px] font-bold text-white/20 uppercase mt-1">{tx.fecha}</p>
                </div>
                <span className={`text-[12px] font-black tabular-nums ${tx.montoNum < 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.monto}
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
