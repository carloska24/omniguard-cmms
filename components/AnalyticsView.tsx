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
  Area,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Line,
  Cell,
} from 'recharts';
import ReactECharts from 'echarts-for-react';
import { Icons } from './Icons';
import { useMaintenance } from '../context/MaintenanceContext';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { motion } from 'framer-motion';

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

// --- ANIMATION VARIANTS (Framer Motion) ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 12 },
  },
};

// --- ECHARTS COMPONENTS ---

// 1. Fleet Health Gauge (Alive)
const FleetHealthGauge = ({ onlinePercentage }: { onlinePercentage: number }) => {
  // LIVE SIMULATION STATE
  const [simulatedValue, setSimulatedValue] = useState(onlinePercentage);

  useEffect(() => {
    const interval = setInterval(() => {
      // Oscilação randômica pequena (+/- 2%)
      const noise = (Math.random() - 0.5) * 4;
      setSimulatedValue(Math.max(0, Math.min(100, onlinePercentage + noise)));
    }, 2000);
    return () => clearInterval(interval);
  }, [onlinePercentage]);

  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        splitNumber: 10,
        axisLine: {
          lineStyle: {
            width: 10,
            color: [
              [0.7, THEME.colors.danger], // < 70% Red
              [0.9, THEME.colors.warning], // 70-90% Yellow
              [1, THEME.colors.success], // > 90% Green
            ],
          },
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
          length: '12%',
          width: 20,
          offsetCenter: [0, '-60%'],
          itemStyle: {
            color: 'auto',
          },
        },
        axisTick: {
          length: 12,
          lineStyle: {
            color: 'auto',
            width: 2,
          },
        },
        splitLine: {
          length: 20,
          lineStyle: {
            color: 'auto',
            width: 5,
          },
        },
        axisLabel: {
          color: '#cbd5e1',
          fontSize: 10,
          distance: -60,
          formatter: function (value: number) {
            if (value === 0 || value === 100) {
              return value + '';
            }
            return '';
          },
        },
        title: {
          offsetCenter: [0, '-20%'],
          fontSize: 30,
        },
        detail: {
          fontSize: 36,
          offsetCenter: [0, '0%'],
          valueAnimation: true,
          formatter: function (value: number) {
            return Math.round(value) + '%';
          },
          color: 'auto',
          fontFamily: 'monospace',
          fontWeight: 'bold',
        },
        data: [
          {
            value: simulatedValue,
            name: 'Health',
          },
        ],
      },
    ],
    graphic: {
      elements: [
        {
          type: 'text',
          left: 'center',
          top: 'bottom',
          style: {
            text: 'FROTA ONLINE',
            font: 'bold 12px sans-serif',
            fill: '#64748b',
          },
        },
      ],
    },
    backgroundColor: 'transparent',
  };

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />;
};

// --- CUSTOM COMPONENTS (RECHARTS) ---

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
                  style={{ backgroundColor: entry.color || entry.fill || entry.stroke }}
                ></div>
                <span className="text-slate-300 font-medium capitalize">{entry.name}:</span>
              </div>
              <span className="text-white font-mono font-bold tracking-wide">
                {typeof entry.value === 'number' && entry.name?.toLowerCase().includes('custo')
                  ? `R$ ${entry.value.toLocaleString('pt-BR')}`
                  : typeof entry.value === 'number' && entry.unit === '%'
                  ? `${entry.value.toFixed(1)}%`
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

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
    <div className="bg-omni-panel border border-omni-border rounded-2xl p-5 shadow-lg flex flex-col h-full hover:border-red-500/30 transition-all group relative overflow-hidden backdrop-blur-sm">
      <h4 className="text-xs font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
        <Icons.Grid3X3 className="w-3 h-3 text-red-500" /> Mapa de Calor (Falhas)
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
              const intensity = Math.min(value * 40, 255);
              return (
                <div
                  key={`${day}-${tIdx}`}
                  className="h-6 rounded-sm transition-all hover:scale-110 hover:brightness-150 cursor-help relative group/cell"
                  style={{
                    backgroundColor:
                      value === 0 ? '#1e293b' : `rgba(239, 68, 68, ${0.2 + intensity / 255})`,
                    border:
                      value > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid transparent',
                  }}
                >
                  {value > 0 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-[9px] rounded opacity-0 group-hover/cell:opacity-100 whitespace-nowrap z-50 pointer-events-none">
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

const FailurePareto = ({ tickets }: { tickets: any[] }) => {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.forEach(t => {
      const type = t.type || 'outros';
      counts[type] = (counts[type] || 0) + 1;
    });

    const sorted = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const total = sorted.reduce((acc, curr) => acc + curr.value, 0);
    let accum = 0;

    return sorted.slice(0, 6).map(item => {
      accum += item.value;
      return {
        ...item,
        cumulative: Math.round((accum / total) * 100),
      };
    });
  }, [tickets]);

  return (
    <div className="bg-omni-panel border border-omni-border rounded-2xl p-5 shadow-lg flex flex-col h-full relative overflow-hidden backdrop-blur-sm">
      <h4 className="text-xs font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
        <Icons.BarChart2 className="w-3 h-3 text-yellow-500" /> Pareto de Causas
      </h4>
      <div className="flex-1 w-full min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#f59e0b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              unit="%"
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'white', opacity: 0.05 }} />
            <Bar
              yAxisId="left"
              dataKey="value"
              name="Ocorrências"
              fill="#3b82f6"
              barSize={30}
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              name="% Acumulado"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 4, fill: '#f59e0b' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 5. Team Radar (Alive)
const TeamRadar = () => {
  // LIVE SIMULATION
  const [data, setData] = useState([
    { subject: 'Mecânica', A: 120, fullMark: 150 },
    { subject: 'Elétrica', A: 98, fullMark: 150 },
    { subject: 'Hidráulica', A: 86, fullMark: 150 },
    { subject: 'SW/IoT', A: 99, fullMark: 150 },
    { subject: 'Segurança', A: 140, fullMark: 150 },
    { subject: 'Gestão', A: 85, fullMark: 150 },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev =>
        prev.map(item => ({
          ...item,
          A: Math.min(150, Math.max(50, item.A + (Math.random() - 0.5) * 5)),
        }))
      );
    }, 1500); // 1.5s refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-omni-panel border border-omni-border rounded-2xl p-5 shadow-lg flex flex-col h-full relative overflow-hidden backdrop-blur-sm">
      <h4 className="text-xs font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
        <Icons.Crosshair className="w-3 h-3 text-purple-500" /> Matriz de Competências
      </h4>
      <div className="flex-1 w-full min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="#334155" opacity={0.5} />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
            <Radar
              name="Nível Médio"
              dataKey="A"
              stroke={THEME.colors.secondary}
              strokeWidth={3}
              fill={THEME.colors.secondary}
              fillOpacity={0.4}
              isAnimationActive={true} // Recharts handles this transition
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 6. AI Command Center (Mantido)
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
        lastMonthTrend: 'Analise os dados financeiros e de falhas fornecidos',
      };
      const prompt = `Atue como IA Industrial JARVIS. Analise: ${JSON.stringify(
        summary
      )}. Gere insight estratégico curto (max 2 frases) sobre eficiência, custos e riscos. Tom futurista e direto.`;
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
    <div className="bg-gradient-to-r from-slate-900 to-[#0B0E14] border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl group hover:border-omni-cyan/30 transition-all">
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
    const monthlyStats = months.map(m => ({ name: m, custo: 0, tickets: 0, disponibilidade: 100 }));

    tickets.forEach(ticket => {
      const date = new Date(ticket.createdAt);
      const monthIdx = date.getMonth();
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

  const fleetHealth = useMemo(() => {
    const total = assets.length;
    if (total === 0) return 100;
    const operational = assets.filter(a => a.status === 'operational').length;
    return (operational / total) * 100;
  }, [assets]);

  const totalCostYTD = financialData.reduce((acc, m) => acc + m.custo, 0);

  return (
    <div className="flex flex-col h-full bg-[#020408] p-6 overflow-y-auto custom-scrollbar relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#020408_0%,#090c14_100%)] z-0"></div>
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-cyan-600/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-[1600px] mx-auto w-full space-y-6">
        {/* Header */}
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

        {/* BENTO GRID LAYOUT - ANIMATED */}
        <motion.div
          className="grid grid-cols-12 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* 1. AI Command Center */}
          <motion.div className="col-span-12" variants={itemVariants}>
            <AiCommandCenter data={financialData} tickets={tickets} />
          </motion.div>

          {/* 2. Main Financial Chart */}
          <motion.div
            className="col-span-12 lg:col-span-8 bg-[#0e121b] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-white/10 transition-all"
            variants={itemVariants}
          >
            <div className="flex justify-between items-center mb-6 z-10 relative">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Icons.TrendingUp className="w-5 h-5 text-omni-cyan" /> Tendência Financeira
              </h3>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Total YTD</p>
                  <p className="text-xl font-mono text-white font-bold">
                    R$ {(totalCostYTD / 1000).toFixed(1)}k
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCusto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.colors.primary} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={THEME.colors.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDisp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.colors.secondary} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={THEME.colors.secondary} stopOpacity={0} />
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
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={val => `${val}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    yAxisId="left"
                    dataKey="custo"
                    stroke={THEME.colors.primary}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorCusto)"
                  />
                  <Area
                    type="monotone"
                    yAxisId="right"
                    dataKey="disponibilidade"
                    stroke={THEME.colors.secondary}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorDisp)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* 3. Fleet Health Gauge (New - ECharts) */}
          <motion.div
            className="col-span-12 lg:col-span-4 bg-[#0e121b] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-white/10 transition-all flex flex-col"
            variants={itemVariants}
          >
            <h3 className="text-lg font-bold text-white mb-2 z-10 flex items-center gap-2">
              <Icons.Activity className="w-5 h-5 text-emerald-500" /> Saúde da Frota
            </h3>
            <div className="flex-1 w-full min-h-[250px] relative">
              <FleetHealthGauge onlinePercentage={fleetHealth} />
            </div>
          </motion.div>

          {/* 4. Bottom Grid (3 Cols) */}
          <motion.div className="col-span-12 lg:col-span-4 h-[280px]" variants={itemVariants}>
            <FailureHeatmap tickets={tickets} />
          </motion.div>
          <motion.div className="col-span-12 lg:col-span-4 h-[280px]" variants={itemVariants}>
            <FailurePareto tickets={tickets} />
          </motion.div>
          <motion.div className="col-span-12 lg:col-span-4 h-[280px]" variants={itemVariants}>
            <TeamRadar />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
