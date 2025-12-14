
import React, { useState } from 'react';
import { Icons } from './Icons';

interface LandingPageProps {
  onEnter: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [isBooting, setIsBooting] = useState(false);

  const handleStart = () => {
    setIsBooting(true);
    // Simula um tempo de "boot" do sistema para efeito dramático
    setTimeout(() => {
      onEnter();
    }, 1500);
  };

  const features = [
    {
      icon: Icons.Box,
      title: "Gestão de Ativos 3.1",
      desc: "Cadastro completo, árvore de ativos e rastreabilidade total de equipamentos e peças.",
      color: "text-blue-400",
      border: "hover:border-blue-500/50"
    },
    {
      icon: Icons.Wrench,
      title: "Kanban de Execução 3.2",
      desc: "Controle de O.S. em tempo real com cronômetro, checklists de IA e fluxo visual.",
      color: "text-orange-400",
      border: "hover:border-orange-500/50"
    },
    {
      icon: Icons.Calendar,
      title: "Planejamento 3.3",
      desc: "Geração automática de preventivas baseada em tempo, uso ou condição (IoT).",
      color: "text-green-400",
      border: "hover:border-green-500/50"
    },
    {
      icon: Icons.Cpu,
      title: "Gêmeo Digital & IoT",
      desc: "Monitoramento 3D em tempo real com mapas de calor e telemetria de sensores.",
      color: "text-purple-400",
      border: "hover:border-purple-500/50"
    },
    {
      icon: Icons.Sparkles,
      title: "Inteligência Artificial",
      desc: "Diagnósticos preditivos, geração de procedimentos técnicos e chat assistente.",
      color: "text-omni-cyan",
      border: "hover:border-omni-cyan/50"
    },
    {
      icon: Icons.BarChart,
      title: "BI & Analytics",
      desc: "KPIs financeiros (MTBF, MTTR), custos de manutenção e análise de falhas.",
      color: "text-red-400",
      border: "hover:border-red-500/50"
    }
  ];

  return (
    <div className="min-h-screen bg-[#050608] text-white font-sans overflow-hidden relative flex flex-col">
      
      {/* Background Effects */}
      <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-omni-cyan/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header Minimalista */}
      <header className="px-8 py-6 flex justify-between items-center z-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-black border border-white/10 rounded-lg flex items-center justify-center shadow-lg">
             <Icons.Activity className="text-omni-cyan w-6 h-6" />
          </div>
          <div>
             <h1 className="font-display font-bold text-xl tracking-widest text-white leading-none">
                OMNI<span className="text-omni-cyan">GUARD</span>
             </h1>
             <span className="text-[10px] text-slate-500 font-mono tracking-[0.3em] uppercase block">Industrial OS v2.0</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6 text-xs font-mono text-slate-400">
           <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> SERVER ONLINE</span>
           <span>LATENCY: 12ms</span>
           <span>SECURE CONNECTION</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 py-12">
        
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16 animate-in zoom-in-95 duration-700 delay-100">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-omni-cyan text-[10px] font-bold uppercase tracking-widest mb-6 hover:bg-white/10 transition-colors cursor-default">
              <Icons.Zap className="w-3 h-3" /> Manutenção Preditiva 4.0
           </div>
           
           <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-200 to-slate-500">
              O Futuro da Gestão <br/> de Ativos Industriais
           </h1>
           
           <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
              Centralize operações, preveja falhas com IA e gerencie sua planta com Gêmeos Digitais. 
              O OmniGuard eleva o padrão do CMMS tradicional.
           </p>

           <button 
             onClick={handleStart}
             disabled={isBooting}
             className={`
                group relative px-10 py-5 bg-omni-cyan text-omni-dark font-display font-bold text-xl tracking-wider uppercase rounded-lg 
                shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_50px_rgba(6,182,212,0.6)] hover:bg-cyan-300 transition-all duration-300
                disabled:opacity-80 disabled:cursor-wait
             `}
           >
              {isBooting ? (
                 <span className="flex items-center gap-3">
                    <Icons.Cpu className="w-6 h-6 animate-spin" /> INICIALIZANDO SISTEMA...
                 </span>
              ) : (
                 <span className="flex items-center gap-3">
                    ACESSAR PLATAFORMA <Icons.ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                 </span>
              )}
              
              {/* Decorative electrical lines */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="absolute bottom-0 right-0 w-full h-[1px] bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
           </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl w-full animate-in slide-in-from-bottom-8 duration-700 delay-300">
           {features.map((feat, idx) => (
              <div key={idx} className={`p-6 rounded-xl bg-omni-panel/40 border border-white/5 backdrop-blur-sm transition-all duration-300 group hover:bg-omni-panel ${feat.border}`}>
                 <div className={`w-12 h-12 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feat.icon className={`w-6 h-6 ${feat.color}`} />
                 </div>
                 <h3 className="text-lg font-bold text-white mb-2 font-display tracking-wide">{feat.title}</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
              </div>
           ))}
        </div>

      </main>

      {/* Footer */}
      <footer className="px-8 py-6 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-600 font-mono z-10">
         <div>
            © 2024 OMNIGUARD SYSTEMS INC. ALL RIGHTS RESERVED.
         </div>
         <div className="flex gap-4">
            <span>PRIVACY PROTOCOL</span>
            <span>SYSTEM STATUS: STABLE</span>
            <span>V2.4.1 (BUILD 9920)</span>
         </div>
      </footer>

      {/* Overlay de Boot (Full Screen) */}
      {isBooting && (
         <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden mb-4">
               <div className="h-full bg-omni-cyan animate-[loading_1.5s_ease-in-out_forwards]"></div>
            </div>
            <div className="text-omni-cyan font-mono text-xs uppercase tracking-[0.2em] animate-pulse">
               Carregando Módulos...
            </div>
            
            {/* Matrix rain effect simplified */}
            <div className="absolute inset-0 pointer-events-none opacity-20" style={{backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(6, 182, 212, .3) 25%, rgba(6, 182, 212, .3) 26%, transparent 27%, transparent 74%, rgba(6, 182, 212, .3) 75%, rgba(6, 182, 212, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(6, 182, 212, .3) 25%, rgba(6, 182, 212, .3) 26%, transparent 27%, transparent 74%, rgba(6, 182, 212, .3) 75%, rgba(6, 182, 212, .3) 76%, transparent 77%, transparent)', backgroundSize: '50px 50px'}}></div>
         </div>
      )}

      <style>{`
        @keyframes loading {
           0% { width: 0%; }
           40% { width: 30%; }
           70% { width: 80%; }
           100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};
