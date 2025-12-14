import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { ViewState } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useMaintenance } from '../context/MaintenanceContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';

interface DashboardViewProps {
  setView: (view: ViewState) => void;
}

// Initial Data Generation
const generateInitialData = () => {
  return Array.from({ length: 24 }, (_, i) => ({
    time: `${i.toString().padStart(2, '0')}:00`,
    load: 40 + Math.random() * 30,
    energy: 30 + Math.random() * 20,
  }));
};

// Mock Data para Sparklines dos Cards (Static for now)
const sparkData1 = [{ v: 10 }, { v: 15 }, { v: 12 }, { v: 20 }, { v: 18 }, { v: 25 }, { v: 22 }];

// --- CUSTOM TOOLTIP PARA O GRÁFICO CENTRAL ---
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-lg shadow-2xl backdrop-blur-md min-w-[180px] z-50">
        <p className="mb-2 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1 flex justify-between">
          <span>Horário:</span> <span className="text-white">{label}</span>
        </p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-2 text-slate-300">
                <div
                  className="w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]"
                  style={{ backgroundColor: entry.color }}
                ></div>
                {entry.name === 'load' ? 'Carga Fabril' : 'Consumo Energia'}
              </span>
              <span className="font-mono font-bold text-white text-sm">
                {entry.value.toFixed(1)}
                <span className="text-slate-500 text-[10px] ml-0.5">
                  {entry.name === 'load' ? '%' : 'kW'}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const DashboardView: React.FC<DashboardViewProps> = ({ setView }) => {
  const { assets, tickets } = useMaintenance();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [liveData, setLiveData] = useState(generateInitialData());

  // AI Insight State
  const [aiBriefing, setAiBriefing] = useState<string | null>(null);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);

  const totalAssets = assets.length;
  const criticalAssets = assets.filter(
    a => a.status === 'maintenance' || a.criticality === 'high'
  ).length;
  const openTickets = tickets.filter(t => t.status !== 'done').length;
  const highPriorityTickets = tickets.filter(
    t => t.urgency === 'critical' || t.urgency === 'high'
  ).length;

  // Cálculo simples de OEE simulado
  const oeeValue = 88.5;

  // 1. Live Clock Effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Live Chart Simulation Effect
  useEffect(() => {
    const chartTimer = setInterval(() => {
      setLiveData(prevData => {
        const lastItem = prevData[prevData.length - 1];
        // Parse last time hour
        const lastHour = parseInt(lastItem.time.split(':')[0]);
        const nextHour = (lastHour + 1) % 24;

        const newItem = {
          time: `${nextHour.toString().padStart(2, '0')}:00`,
          load: Math.max(20, Math.min(90, lastItem.load + (Math.random() - 0.5) * 15)), // Random walk
          energy: Math.max(10, Math.min(80, lastItem.energy + (Math.random() - 0.5) * 10)),
        };

        // Remove first, add new at end (Sliding Window)
        return [...prevData.slice(1), newItem];
      });
    }, 3000); // Updates every 3 seconds
    return () => clearInterval(chartTimer);
  }, []);

  // 3. AI Briefing Generator
  const generateDailyBriefing = async () => {
    setIsGeneratingBriefing(true);
    setAiBriefing(null);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      // Contexto simplificado para a IA
      const context = {
        totalAssets,
        criticalAssets,
        openTickets,
        highPriorityTickets,
        oee: oeeValue,
        currentHour: currentTime.getHours(),
      };

      const prompt = `
            Atue como um Gestor de Planta Industrial Inteligente.
            Analise os dados abaixo e forneça um "Briefing Diário" curto e executivo para o Gerente de Manutenção.
            
            Dados: ${JSON.stringify(context)}
            
            Regras:
            1. Use tom profissional e direto.
            2. Destaque pontos de atenção (especialmente chamados de alta prioridade e ativos críticos).
            3. Dê uma recomendação estratégica baseada no OEE.
            4. Máximo de 3 parágrafos curtos. Use formatação HTML simples (<b>, <br>) para destaque.
          `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (text) {
        setAiBriefing(text);
      }
    } catch (error: any) {
      console.error('Erro AI Briefing:', error);
      setAiBriefing(`Erro na conexão com IA: ${error.message || JSON.stringify(error)}`);
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050608] p-6 overflow-hidden relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none"></div>

      {/* HEADER DO DASHBOARD */}
      <div className="flex justify-between items-end mb-6 shrink-0 z-10">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-wide">
            Visão Geral da Planta
          </h2>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]"></span>
            Operação em Tempo Real • Turno A
          </p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-2xl font-mono font-bold text-white tracking-widest text-shadow-glow">
            {currentTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </p>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
            {currentTime
              .toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })
              .toUpperCase()}
          </p>
        </div>
      </div>

      {/* GRID PRINCIPAL */}
      <div className="flex-1 grid grid-cols-12 grid-rows-[auto_auto_1fr] gap-6 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-6 z-10">
        {/* AI BRIEFING CARD */}
        <div className="col-span-12 relative group perspective-1000">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 to-omni-cyan/30 rounded-xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500 animate-pulse-slow"></div>
          <div className="relative bg-gradient-to-r from-[#1a1033] to-[#0f172a] border border-purple-500/50 rounded-xl p-5 flex gap-5 items-start shadow-[0_0_30px_rgba(168,85,247,0.15)] group-hover:shadow-[0_0_50px_rgba(168,85,247,0.3)] transition-all duration-500 group-hover:scale-[1.005]">
            <div className="p-3 bg-purple-500/20 rounded-xl border border-purple-500/30 shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <Icons.Bot className="w-8 h-8 text-purple-400" />
            </div>

            <div className="flex-1">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Smart Daily Briefing
                    <span className="text-[9px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
                      AI Analysis
                    </span>
                  </h3>
                  {!aiBriefing && (
                    <p className="text-xs text-slate-400 mt-1">
                      Análise estratégica dos KPIs em tempo real.
                    </p>
                  )}
                </div>
                {!aiBriefing && (
                  <button
                    onClick={generateDailyBriefing}
                    disabled={isGeneratingBriefing}
                    className="text-xs bg-white text-purple-900 hover:bg-purple-100 font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg"
                  >
                    {isGeneratingBriefing ? (
                      <Icons.Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <Icons.Sparkles className="w-4 h-4" />
                    )}
                    {isGeneratingBriefing ? 'Processando...' : 'Gerar Resumo do Turno'}
                  </button>
                )}
              </div>

              {aiBriefing ? (
                <div className="bg-black/30 rounded-lg p-4 border border-white/5 animate-in fade-in slide-in-from-bottom-2">
                  <div
                    className="text-sm text-slate-200 leading-relaxed font-light"
                    dangerouslySetInnerHTML={{ __html: aiBriefing }}
                  />
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                    <span className="text-[10px] text-slate-500 font-mono">
                      Modelo: Gemini 2.5 Pro • Latência: 420ms
                    </span>
                    <button
                      onClick={() => setAiBriefing(null)}
                      className="text-[10px] text-purple-400 hover:text-white uppercase font-bold"
                    >
                      Atualizar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-2 w-full bg-slate-800/50 rounded overflow-hidden mt-2">
                  <div className="h-full bg-purple-500/50 w-1/3 animate-pulse"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- ROW 1: KPI CARDS --- */}

        {/* Card 1: Assets */}
        <div
          onClick={() => setView('assets')}
          className="col-span-12 sm:col-span-6 lg:col-span-3 bg-omni-panel border border-omni-border rounded-xl p-5 cursor-pointer group hover:border-blue-500/50 transition-all shadow-lg hover:shadow-blue-900/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Icons.Box className="w-16 h-16 text-blue-500 transform rotate-12" />
          </div>
          <div className="flex justify-between items-center mb-4 relative z-10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Total Ativos
            </span>
            <div className="flex items-center gap-1 text-[10px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
              <Icons.ArrowUpRight className="w-3 h-3" /> 5%
            </div>
          </div>
          <div className="flex items-end justify-between relative z-10">
            <div>
              <span className="text-4xl font-display font-bold text-white block tracking-tight">
                {totalAssets}
              </span>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                3 setores monitorados
              </span>
            </div>
            {/* Mini Bar Chart */}
            <div className="w-16 h-10 pb-1 opacity-70 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ v: 10 }, { v: 20 }, { v: 15 }, { v: 25 }]}>
                  <Bar dataKey="v" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Card 2: Work Orders */}
        <div
          onClick={() => setView('tickets')}
          className="col-span-12 sm:col-span-6 lg:col-span-3 bg-omni-panel border border-omni-border rounded-xl p-5 cursor-pointer group hover:border-omni-cyan/50 transition-all shadow-lg hover:shadow-cyan-900/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Icons.ClipboardList className="w-16 h-16 text-omni-cyan transform -rotate-6" />
          </div>
          <div className="flex justify-between items-center mb-4 relative z-10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Chamados Abertos
            </span>
            <div className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded border border-red-400/20">
              <Icons.ArrowUpRight className="w-3 h-3" /> +2
            </div>
          </div>
          <div className="flex items-end justify-between relative z-10">
            <div>
              <span className="text-4xl font-display font-bold text-white block tracking-tight">
                {openTickets}
              </span>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Alta Prioridade: {highPriorityTickets}
              </span>
            </div>
            {/* Sparkline Area */}
            <div className="w-20 h-10 pb-1 opacity-70 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData1}>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="#06b6d4"
                    fill="#06b6d4"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Card 3: Critical */}
        <div
          onClick={() => setView('assets')}
          className={`col-span-12 sm:col-span-6 lg:col-span-3 bg-omni-panel border rounded-xl p-5 cursor-pointer group transition-all shadow-lg relative overflow-hidden ${
            criticalAssets > 0
              ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
              : 'border-omni-border hover:border-red-500/50'
          }`}
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Icons.AlertTriangle className="w-16 h-16 text-red-500 transform rotate-12" />
          </div>
          {criticalAssets > 0 && (
            <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
          )}

          <div className="flex justify-between items-center mb-4 relative z-10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Alertas Críticos
            </span>
            <div className="flex items-center gap-1 text-[10px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
              <Icons.ArrowDownRight className="w-3 h-3" /> -1 vs ontem
            </div>
          </div>
          <div className="flex items-end justify-between relative z-10">
            <div>
              <span
                className={`text-4xl font-display font-bold block tracking-tight ${
                  criticalAssets > 0 ? 'text-red-500' : 'text-white'
                }`}
              >
                {criticalAssets}
              </span>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">Ação Imediata</span>
            </div>
            <div className="w-16 h-8 flex items-end gap-1 pb-1 opacity-80">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className={`flex-1 rounded-sm ${
                    i <= criticalAssets ? 'bg-red-500' : 'bg-slate-800'
                  }`}
                  style={{ height: `${i * 20}%` }}
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 4: OEE */}
        <div
          onClick={() => setView('analytics')}
          className="col-span-12 sm:col-span-6 lg:col-span-3 bg-omni-panel border border-omni-border rounded-xl p-5 cursor-pointer group hover:border-purple-500/50 transition-all shadow-lg hover:shadow-purple-900/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Icons.Activity className="w-16 h-16 text-purple-500 transform -rotate-12" />
          </div>
          <div className="flex justify-between items-center mb-4 relative z-10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              OEE Global
            </span>
            <div className="flex items-center gap-1 text-[10px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
              <Icons.ArrowUpRight className="w-3 h-3" /> +1.2%
            </div>
          </div>
          <div className="flex items-end justify-between relative z-10">
            <div>
              <span className="text-4xl font-display font-bold text-white block tracking-tight">
                {oeeValue}%
              </span>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">Meta: 85%</span>
            </div>
            {/* Circular Progress */}
            <div className="relative w-10 h-10 rounded-full border-4 border-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-l-transparent border-b-transparent rotate-45"></div>
              <span className="text-[9px] font-bold text-purple-500">A</span>
            </div>
          </div>
        </div>

        {/* --- ROW 2: MAIN CONTENT --- */}

        {/* COLUMN LEFT: Live Monitor Chart (Large) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 min-h-[300px]">
          <div className="bg-omni-panel border border-omni-border rounded-xl p-5 flex flex-col h-full relative overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center mb-4 z-10 relative">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-omni-cyan/10 rounded-lg text-omni-cyan border border-omni-cyan/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                  <Icons.Activity className="w-5 h-5 animate-pulse-slow" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Carga da Planta vs. Energia</h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Monitoramento de Capacidade
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-omni-cyan shadow-[0_0_8px_#06b6d4]"></span>
                  <span className="text-[10px] text-slate-400">Produção</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]"></span>
                  <span className="text-[10px] text-slate-400">Energia (kW)</span>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full min-h-0 z-10 relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={liveData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="#475569"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={30}
                  />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  {/* CROSSHAIR IMPLEMENTED HERE */}
                  <Tooltip
                    content={<CustomChartTooltip />}
                    cursor={{
                      stroke: 'rgba(6, 182, 212, 0.5)',
                      strokeWidth: 1,
                      strokeDasharray: '4 4',
                    }}
                    trigger="hover"
                  />
                  <Area
                    type="monotone"
                    dataKey="load"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorLoad)"
                    isAnimationActive={true}
                    animationDuration={2000}
                  />
                  <Area
                    type="monotone"
                    dataKey="energy"
                    stroke="#a855f7"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorEnergy)"
                    isAnimationActive={true}
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Background Grid Pattern */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            ></div>
          </div>

          {/* QUICK ACCESS (Launchpad Style) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: 'Novo Chamado',
                icon: Icons.Plus,
                color: 'text-omni-cyan',
                bg: 'hover:bg-omni-cyan/5',
                action: () => setView('tickets'),
              },
              {
                label: 'Gêmeo Digital',
                icon: Icons.Cpu,
                color: 'text-purple-500',
                bg: 'hover:bg-purple-500/5',
                action: () => setView('digital-twin'),
              },
              {
                label: 'Preventivas',
                icon: Icons.Calendar,
                color: 'text-green-500',
                bg: 'hover:bg-green-500/5',
                action: () => setView('preventive'),
              },
              {
                label: 'Kanban',
                icon: Icons.ClipboardList,
                color: 'text-orange-500',
                bg: 'hover:bg-orange-500/5',
                action: () => setView('kanban'),
              },
            ].map((btn, idx) => (
              <button
                key={idx}
                onClick={btn.action}
                className={`bg-omni-panel border border-omni-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all group ${btn.bg} hover:border-white/20 hover:-translate-y-1 shadow-md hover:shadow-xl`}
              >
                <div
                  className={`p-3 rounded-full bg-omni-dark border border-omni-border group-hover:scale-110 transition-transform ${btn.color} shadow-lg`}
                >
                  <btn.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-white">
                  {btn.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* COLUMN RIGHT: Feed & Status */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          {/* Recent Alerts Panel */}
          <div className="bg-omni-panel border border-omni-border rounded-xl flex-1 flex flex-col overflow-hidden shadow-lg hover:border-white/10 transition-colors">
            <div className="p-4 border-b border-omni-border flex justify-between items-center bg-slate-900/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <div className="relative">
                  <Icons.Bell className="w-4 h-4 text-slate-400" />
                  <span className="absolute -top-1 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                  <span className="absolute -top-1 -right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>
                </div>
                Feed de Alertas
              </h3>
              <button
                onClick={() => setView('tickets')}
                className="text-[10px] text-omni-cyan hover:underline"
              >
                Ver Todos
              </button>
            </div>

            <div className="p-2 overflow-y-auto custom-scrollbar flex-1 space-y-2">
              <div
                onClick={() => setView('tickets')}
                className="p-3 bg-red-500/5 border-l-2 border-red-500 rounded hover:bg-red-500/10 transition-all cursor-pointer group active:scale-95 hover:scale-[1.02]"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                    <Icons.Alert className="w-3 h-3" /> Vibração Crítica
                  </span>
                  {/* TIMER IMPLEMENTED */}
                  <span className="text-[9px] text-red-300 font-mono flex items-center gap-1 bg-red-500/10 px-1.5 rounded animate-pulse">
                    <Icons.Clock className="w-3 h-3" /> Há 14 min
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium group-hover:text-white">
                  Turbina TG-01 excedeu limites operacionais.
                </p>
              </div>

              <div
                onClick={() => setView('tickets')}
                className="p-3 bg-orange-500/5 border-l-2 border-orange-500 rounded hover:bg-orange-500/10 transition-all cursor-pointer group active:scale-95 hover:scale-[1.02]"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-orange-400 flex items-center gap-1">
                    <Icons.Thermometer className="w-3 h-3" /> Temp. Elevada
                  </span>
                  <span className="text-[9px] text-orange-300 font-mono">Há 2h</span>
                </div>
                <p className="text-xs text-slate-300 font-medium group-hover:text-white">
                  Compressor C-22 operando acima de 85°C.
                </p>
              </div>

              <div
                onClick={() => setView('preventive')}
                className="p-3 bg-blue-500/5 border-l-2 border-blue-500 rounded hover:bg-blue-500/10 transition-all cursor-pointer group active:scale-95 hover:scale-[1.02]"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                    <Icons.Calendar className="w-3 h-3" /> Preventiva Próxima
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">Amanhã</span>
                </div>
                <p className="text-xs text-slate-300 font-medium group-hover:text-white">
                  Braço Robótico R-04 requer calibração.
                </p>
              </div>
            </div>
          </div>

          {/* Mini Status Card (IoT Pulse) */}
          <div className="bg-gradient-to-br from-[#0a2015] to-[#050608] border border-green-500/20 rounded-xl p-4 flex items-center justify-between shadow-[0_0_20px_rgba(34,197,94,0.05)] relative overflow-hidden group">
            {/* Scanline effect */}
            <div className="absolute inset-0 bg-green-500/5 w-full h-full animate-[scan_2s_linear_infinite] pointer-events-none opacity-0 group-hover:opacity-100"></div>

            <div className="flex items-center gap-4 z-10">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/30 text-green-500">
                  <Icons.Wifi className="w-6 h-6" />
                </div>
                {/* IOT PULSE ANIMATION */}
                <div className="absolute inset-0 rounded-full border border-green-500 opacity-0 animate-ping"></div>
                <div className="absolute inset-0 rounded-full border border-green-400 opacity-20 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
              </div>

              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  Conectividade IoT
                  <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_5px_lime]"></span>
                </p>
                <p className="text-[10px] text-green-400 font-mono mt-0.5">128 Sensores Online</p>
              </div>
            </div>
            <div className="text-right z-10">
              <p className="text-xl font-mono font-bold text-white shadow-green-glow">12ms</p>
              <p className="text-[9px] text-slate-500 uppercase font-bold">Latência</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
