import React from 'react';
import { Icons } from './Icons';

const predictions = [
  {
    id: 1,
    asset: 'Turbina TG-01',
    status: 'Falha Iminente',
    message: 'Falha no rolamento interno',
    probability: 94,
    color: 'text-omni-danger',
    bgColor: 'bg-omni-danger/10',
    borderColor: 'border-omni-danger/30',
    icon: Icons.Alert,
    timeLeft: '14h restantes'
  },
  {
    id: 2,
    asset: 'Braço R-04',
    status: 'Operação Normal',
    message: 'Padrão de vibração estável',
    probability: 2,
    color: 'text-omni-success',
    bgColor: 'bg-omni-panel',
    borderColor: 'border-omni-border',
    icon: Icons.Check,
    timeLeft: '> 3000h'
  },
  {
    id: 3,
    asset: 'Bomba Hidráulica P-02',
    status: 'Atenção (Cavitação)',
    message: 'Pressão de sucção instável',
    probability: 45,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/5',
    borderColor: 'border-yellow-400/20',
    icon: Icons.Activity,
    timeLeft: '12 dias restantes'
  }
];

export const PredictiveAIView: React.FC = () => {
  return (
    <div className="flex-1 p-6 grid grid-cols-12 gap-6 max-h-[calc(100vh-64px)] overflow-hidden">
        
        {/* Left Focus Area */}
        <div className="col-span-8 bg-gradient-to-br from-omni-dark to-omni-panel rounded-xl border border-omni-border p-12 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
            
            <div className="relative z-10 w-48 h-48 rounded-full border-4 border-omni-panel flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(124,58,237,0.2)]">
                 <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-r-purple-500 border-b-transparent border-l-transparent animate-spin duration-[3000ms]"></div>
                 <Icons.Cpu className="w-16 h-16 text-purple-400" />
            </div>

            <h2 className="text-3xl font-display font-bold text-white mb-4">Diagnóstico da IA</h2>
            <p className="text-slate-400 text-center max-w-lg mb-8 leading-relaxed">
                Baseado na análise espectral de vibração das últimas 48h, o sistema detectou uma <strong className="text-white">falha no rolamento interno</strong> com 94% de probabilidade. Recomenda-se parada programada imediata para evitar falha catastrófica.
            </p>

            <div className="w-full max-w-xl bg-omni-dark/50 border border-omni-border rounded-lg p-4 backdrop-blur-sm">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Saúde Estimada do Componente</span>
                    <span className="text-omni-danger font-bold">12% Restante</span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-4">
                    <div className="h-full w-[12%] bg-omni-danger"></div>
                </div>
                
                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Falha estimada em: <span className="text-white">14 horas</span></span>
                    <button className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded text-sm font-medium transition-colors shadow-[0_0_15px_rgba(147,51,234,0.4)]">
                        Gerar Ordem
                    </button>
                </div>
            </div>
        </div>

        {/* Right List */}
        <div className="col-span-4 flex flex-col gap-4 overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Previsões de Falha (Próximos 30 dias)</h3>
            
            {predictions.map((item) => (
                <div key={item.id} className={`${item.bgColor} border ${item.borderColor} rounded-xl p-4 transition-all hover:scale-[1.02] cursor-pointer group`}>
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${item.color === 'text-omni-danger' ? 'bg-red-500/10' : 'bg-slate-700/50'}`}>
                                <item.icon className={`w-5 h-5 ${item.color}`} />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-sm">{item.asset}</h4>
                                <p className={`text-xs font-bold ${item.color}`}>{item.status}</p>
                            </div>
                        </div>
                        <span className="text-xs font-mono text-slate-500">{item.timeLeft}</span>
                    </div>
                    {item.message && (
                        <p className="text-xs text-slate-400 ml-12">{item.message}</p>
                    )}
                </div>
            ))}
        </div>

    </div>
  );
};