import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  Area,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Legend,
} from 'recharts';
import { Icons } from './Icons';
import { useMaintenance } from '../context/MaintenanceContext';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- CONFIGURAÇÃO DE DESIGN (THEME PREMIUM) ---
const THEME = {
  colors: {
    primary: '#06b6d4', // Cyan Neon
    secondary: '#8b5cf6', // Violet Neon
    accent: '#f472b6', // Pink Neon
    success: '#10b981', // Emerald
    warning: '#f59e0b', // Amber
    danger: '#ef4444', // Red
    dark: '#020408', // Deepest Void
    panel: '#0e121b', // Glass Panel
    grid: '#1e293b', // Slate 800
  },
};

// --- CUSTOM COMPONENTS ---
// 1. AI Command Center (Já existente, mantido)
const AiCommandCenter = ({ data, tickets }: { data: any; tickets: any[] }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [typedText, setTypedText] = useState('');

  const generateInsight = async () => {
    setLoading(true);
    setInsight(null);
    setTypedText('');
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const summary = {
        totalTickets: tickets.length,
        criticalTickets: tickets.filter(t => t.urgency === 'critical').length,
        costYTD: data.reduce((acc: number, m: any) => acc + m.custo, 0),
        trends: 'Dados populados. Analise os padrões.',
      };
      const prompt = `Atue como IA Industrial JARVIS. Analise: ${JSON.stringify(
        summary
      )}. Gere insight estratégico de 2 linhas sobre eficiência e custos. Tom futurista.`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      setInsight(response.text());
    } catch (e) {
      setInsight('⚠ Falha na conexão neural. Impossível gerar insights táticos no momento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (insight) {
      let i = 0;
      const timer = setInterval(() => {
        setTypedText(insight.substring(0, i));
        i++;
        if (i > insight.length) clearInterval(timer);
      }, 20);
      return () => clearInterval(timer);
    }
  }, [insight]);

  return (
    <div className="col-span-12 bg-gradient-to-r from-slate-900 to-[#0B0E14] border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl group hover:border-omni-cyan/30 transition-all">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
      <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
        <Icons.Bot className="w-32 h-32 text-omni-cyan animate-pulse" />
      </div>
      <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start">
        <div className="shrink-0 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-cyan-950/30 border border-cyan-500/50 flex items-center justify-center relative shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <div className="absolute inset-0 rounded-full border border-cyan-400 opacity-30 animate-ping"></div>
            <Icons.Cpu className={`w-8 h-8 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
          </div>
          <button
            onClick={generateInsight}
            disabled={loading}
            className="mt-3 text-[10px] uppercase font-bold text-cyan-500 hover:text-cyan-300 tracking-widest bg-cyan-900/10 px-3 py-1 rounded border border-cyan-800 transition-all hover:bg-cyan-900/30"
          >
            {loading ? 'Analisando...' : 'Gerar Análise'}
          </button>
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="text-sm font-display font-bold text-white flex items-center gap-2 tracking-wide">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>AI COMMAND
            CENTER <span className="text-xs text-slate-500 font-mono opacity-50">v3.0.1</span>
          </h3>
          <div className="bg-black/40 border border-white/5 rounded-lg p-4 min-h-[80px] font-mono text-sm leading-relaxed text-cyan-100 shadow-inner">
            {insight ? (
              typedText
            ) : (
              <span className="text-slate-600 italic">
                Aguardando solicitação para processamento neural dos dados de manutenção...
              </span>
            )}
            <span className="inline-block w-2 h-4 bg-cyan-500 ml-1 animate-blink"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. Custom Tooltip (Premium)
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0f1219]/95 border border-white/10 p-4 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-xl z-50 min-w-[200px] animate-in fade-in zoom-in-95 duration-200">
        <p className="text-white font-display font-bold text-xs mb-3 border-b border-white/10 pb-2 uppercase tracking-widest opacity-80">
          {label}
        </p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6 text-xs group">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]"
                  style={{ backgroundColor: entry.color || entry.fill }}
                ></div>
                <span className="text-slate-300 font-medium capitalize">{entry.name}:</span>
              </div>
              <span className="text-white font-mono font-bold tracking-wide">
                {typeof entry.value === 'number' && entry.name.toLowerCase().includes('custo')
                  ? `R$ ${entry.value.toLocaleString('pt-BR')}`
                  : entry.value}
                {entry.name === 'Disponibilidade' && '%'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// 3. Failure Heatmap (Mantido e Polido)
const FailureHeatmap = ({ tickets }: { tickets: any[] }) => {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const timeBlocks = ['00-04h', '04-08h', '08-12h', '12-16h', '16-20h', '20-24h'];
  const gridData = useMemo(() => {
    const grid = Array(7)
      .fill(0)
      .map(() => Array(6).fill(0));
    tickets.forEach(t => {
      const d = new Date(t.createdAt);
      const day = d.getDay();
      const hour = d.getHours();
      grid[day][Math.floor(hour / 4)] += 1;
    });
    return grid;
  }, [tickets]);

  return (
    <div className="bg-omni-panel border border-omni-border rounded-xl p-5 shadow-lg flex flex-col h-full hover:border-red-500/30 transition-all group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-red-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2 z-10">
        <Icons.Grid3X3 className="w-4 h-4 text-red-500" /> Mapa de Calor de Falhas
      </h4>
      <div className="flex-1 flex flex-col justify-center z-10">
        <div className="grid grid-cols-7 gap-1">
          <div className="col-span-1"></div>
          {timeBlocks.map(t => (
            <div key={t} className="text-[7px] text-slate-500 text-center uppercase font-bold">
              {t}
            </div>
          ))}
        </div>
        {days.map((day, dIdx) => (
          <div key={day} className="grid grid-cols-7 gap-1 mb-1 items-center">
            <div className="text-[8px] text-slate-400 font-bold uppercase text-right pr-2">
              {day}
            </div>
            {timeBlocks.map((_, tIdx) => {
              const value = gridData[dIdx][tIdx];
              const intensity = Math.min(value * 30, 255); // Mais sensível com poucos dados
              return (
                <div
                  key={`${day}-${tIdx}`}
                  className="h-6 rounded-sm transition-all hover:scale-110 hover:brightness-150 cursor-help relative group/cell"
                  style={{
                    backgroundColor:
                      value === 0 ? '#1e293b' : `rgba(239, 68, 68, ${0.2 + intensity / 200})`,
                    border:
                      value > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid transparent',
                  }}
                >
                  {value > 0 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-[9px] rounded opacity-0 group-hover/cell:opacity-100 whitespace-nowrap z-50">
                      {value} falhas
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// 4. Pareto Chart (NOVO)
const FailurePareto = ({ tickets }: { tickets: any[] }) => {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.forEach(t => {
      const type = t.type || 'outros';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5
  }, [tickets]);

  return (
    <div className="bg-omni-panel border border-omni-border rounded-xl p-5 shadow-lg flex flex-col h-full relative overflow-hidden">
      <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2 z-10">
        <Icons.BarChart2 className="w-4 h-4 text-yellow-500" /> Top 5 Causas (Pareto)
      </h4>
      <div className="flex-1 w-full min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              stroke="#94a3b8"
              fontSize={10}
              width={80}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'white', opacity: 0.05 }} />
            <Bar
              dataKey="value"
              name="Ocorrências"
              fill={THEME.colors.warning}
              radius={[0, 4, 4, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 5. Team Radar (NOVO)
const TeamRadar = () => {
  // Mock Data para Radar de Equipe
  const data = [
    { subject: 'Mecânica', A: 120, fullMark: 150 },
    { subject: 'Elétrica', A: 98, fullMark: 150 },
    { subject: 'Hidráulica', A: 86, fullMark: 150 },
    { subject: 'Software', A: 99, fullMark: 150 },
    { subject: 'Segurança', A: 140, fullMark: 150 },
    { subject: 'Gestão', A: 65, fullMark: 150 },
  ];

  return (
    <div className="bg-omni-panel border border-omni-border rounded-xl p-5 shadow-lg flex flex-col h-full relative overflow-hidden">
      <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2 z-10">
        <Icons.Crosshair className="w-4 h-4 text-purple-500" /> Skills da Equipe
      </h4>
      <div className="flex-1 w-full min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="#334155" opacity={0.5} />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
            <Radar
              name="Competência Média"
              dataKey="A"
              stroke={THEME.colors.secondary}
              strokeWidth={2}
              fill={THEME.colors.secondary}
              fillOpacity={0.3}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- MAIN VIEW ---
export const AnalyticsView: React.FC = () => {
  const { tickets, assets } = useMaintenance();
  const [timeRange, setTimeRange] = useState<'YTD' | '30D' | '7D'>('YTD');

  // Aggregations
  const financialData = useMemo(() => {
    const months = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ];
    const currentYear = new Date().getFullYear();
    const monthlyStats = months.map(m => ({ name: m, custo: 0, tickets: 0, disponibilidade: 100 }));

    tickets.forEach(ticket => {
      const date = new Date(ticket.createdAt);
      const monthIdx = date.getMonth(); // Independent of year for demo
      // if (date.getFullYear() === currentYear) { ... } // Relaxed for seeding demo
      monthlyStats[monthIdx].custo += ticket.totalCost || 0;
      monthlyStats[monthIdx].tickets += 1;
      let impact = ticket.urgency === 'critical' ? 2.5 : ticket.urgency === 'high' ? 1.0 : 0.2;
      monthlyStats[monthIdx].disponibilidade = Math.max(
        0,
        monthlyStats[monthIdx].disponibilidade - impact
      );
    });

    return monthlyStats.map(m => ({
      ...m,
      disponibilidade: parseFloat(m.disponibilidade.toFixed(1)),
    }));
  }, [tickets]);

  const healthData = useMemo(() => {
    const counts = { operational: 0, warning: 0, critical: 0 };
    assets.forEach(a => {
      if (a.status === 'operational') counts.operational++;
      else if (a.status === 'maintenance') counts.warning++;
      else counts.critical++;
    });
    return [
      { name: 'Operacional', value: counts.operational, color: THEME.colors.success },
      { name: 'Atenção/Prev.', value: counts.warning, color: THEME.colors.warning },
      { name: 'Crítico/Parado', value: counts.critical, color: THEME.colors.danger },
    ].filter(d => d.value > 0);
  }, [assets]);

  const totalCostYTD = financialData.reduce((acc, m) => acc + m.custo, 0);

  return (
    <div className="flex flex-col h-full bg-[#020408] p-6 overflow-y-auto custom-scrollbar relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#020408_0%,#090c14_100%)] z-0"></div>
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-cyan-600/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-[1600px] mx-auto w-full space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                BI & Analytics
              </span>
              <span className="text-slate-500 text-[10px]">●</span>
              <span className="text-slate-400 text-[10px] font-mono">SYSTEM_ONLINE</span>
            </div>
            <h2 className="text-4xl font-display font-bold text-white tracking-tight flex items-center gap-3">
              Analytics &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                Performance
              </span>
            </h2>
          </div>
          <div className="flex gap-4">
            <button className="bg-[#0e121b] border border-white/5 hover:border-slate-500 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-cyan-500/10 active:scale-95 group">
              <Icons.RefreshCw className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />{' '}
              Atualizar
            </button>
            <div className="flex bg-[#0e121b] border border-white/5 rounded-xl p-1 shadow-lg">
              {['7D', '30D', 'YTD'].map(r => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r as any)}
                  className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                    timeRange === r
                      ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow'
                      : 'text-slate-500 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <AiCommandCenter data={financialData} tickets={tickets} />

        {/* KPI Row */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-[#0e121b]/80 backdrop-blur border border-white/5 rounded-2xl p-6 relative overflow-hidden shadow-2xl hover:border-cyan-500/30 transition-all">
            <p className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest mb-1">
              Custo Operacional
            </p>
            <h3 className="text-3xl font-mono font-bold text-white">
              R$ {(totalCostYTD / 1000).toFixed(1)}k
            </h3>
            <div className="h-12 w-full mt-4 opacity-50">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialData}>
                  <Area
                    type="monotone"
                    dataKey="custo"
                    stroke={THEME.colors.primary}
                    fill={THEME.colors.primary}
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-[#0e121b]/80 backdrop-blur border border-white/5 rounded-2xl p-6 relative overflow-hidden shadow-2xl hover:border-purple-500/30 transition-all">
            <p className="text-[10px] text-purple-500 font-bold uppercase tracking-widest mb-1">
              Disponibilidade
            </p>
            <h3 className="text-3xl font-mono font-bold text-white">96.8%</h3>
            <div className="h-12 w-full mt-4 opacity-50">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialData}>
                  <Area
                    type="monotone"
                    dataKey="disponibilidade"
                    stroke={THEME.colors.secondary}
                    fill={THEME.colors.secondary}
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-[#0e121b]/80 backdrop-blur border border-white/5 rounded-2xl p-6 relative overflow-hidden shadow-2xl hover:border-emerald-500/30 transition-all">
            <div className="flex justify-between">
              <div>
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-1">
                  Ativos Operacionais
                </p>
                <h3 className="text-3xl font-mono font-bold text-white">
                  {tickets.length > 0 ? '24/30' : '0/0'}
                </h3>
              </div>
              <Icons.Activity className="w-8 h-8 text-emerald-500/50" />
            </div>
            <div className="mt-6 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[80%] shadow-[0_0_10px_#10b981]"></div>
            </div>
          </div>
          <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-[#0e121b]/80 backdrop-blur border border-white/5 rounded-2xl p-6 relative overflow-hidden shadow-2xl hover:border-orange-500/30 transition-all">
            <div className="flex justify-between">
              <div>
                <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest mb-1">
                  Chamados Abertos
                </p>
                <h3 className="text-3xl font-mono font-bold text-white">
                  {tickets.filter(t => t.status !== 'done').length}
                </h3>
              </div>
              <Icons.AlertTriangle className="w-8 h-8 text-orange-500/50" />
            </div>
            <div className="mt-6 flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${i <= 3 ? 'bg-orange-500' : 'bg-slate-800'}`}
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[350px]">
          {/* Chart 1: Main Trend */}
          <div className="col-span-2 bg-[#0e121b] border border-white/5 rounded-2xl p-6 shadow-2xl flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Icons.TrendingUp className="w-5 h-5 text-omni-cyan" /> Tendência Financeira
              </h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_5px_cyan]"></span>{' '}
                  Custo
                </div>
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_5px_purple]"></span>{' '}
                  Disp.
                </div>
              </div>
            </div>
            <div className="flex-1 w-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={financialData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="mainBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.colors.primary} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={THEME.colors.primary} stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1e293b"
                    vertical={false}
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={val => `R$${val / 1000}k`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={val => `${val}%`}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="custo"
                    name="Custo"
                    fill="url(#mainBarGrad)"
                    barSize={24}
                    radius={[4, 4, 0, 0]}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="disponibilidade"
                    name="Disp."
                    stroke={THEME.colors.secondary}
                    strokeWidth={3}
                    fill="none"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Asset Health Donut (Improved) */}
          <div className="col-span-1 bg-[#0e121b] border border-white/5 rounded-2xl p-6 shadow-2xl flex flex-col relative overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-4 z-10">Saúde da Frota</h3>
            <div className="flex-1 relative z-10 w-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {healthData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="rgba(0,0,0,0.5)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
                <span className="text-4xl font-display font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                  {assets.length}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  Ativos Totais
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Support Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[250px]">
          <FailureHeatmap tickets={tickets} />
          <FailurePareto tickets={tickets} />
          <TeamRadar />
        </div>
      </div>
    </div>
  );
};
