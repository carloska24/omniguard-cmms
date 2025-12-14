import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { ResponsiveContainer, AreaChart, Area, Tooltip, CartesianGrid } from 'recharts';

// Tipos
interface ComponentHotspot {
    id: string;
    x: number;
    y: number;
    label: string;
    status: 'ok' | 'warning' | 'critical';
    value: string;
    unit: string;
    type: string; // Ex: TEMPERATURE, ROTATION
}

// Dados simulados para o gráfico
const generateTrendData = (baseValue: number, volatility: number) => {
    return Array.from({ length: 30 }, (_, i) => ({
        time: i,
        value: baseValue + (Math.random() - 0.5) * volatility
    }));
};

export const DigitalTwinView: React.FC = () => {
  const [activeAsset, setActiveAsset] = useState('TG-01');
  const [viewMode, setViewMode] = useState<'standard' | 'thermal' | 'blueprint'>('standard');
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);
  const [chartData, setChartData] = useState(generateTrendData(50, 10));

  // Configuração dos Ativos e Hotspots (Baseado nas imagens)
  const assetData = {
      'TG-01': {
          id: 'TG-01',
          name: 'Turbina a Gás SGT-400',
          image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=1600',
          status: 'critical',
          hotspots: [
              { id: 'c1', x: 45, y: 58, label: 'Rolamento Central', status: 'critical', value: '8.2', unit: 'mm/s', type: 'VIBRATION' },
              { id: 'c2', x: 28, y: 45, label: 'Câmara de Combustão', status: 'ok', value: '450', unit: '°C', type: 'TEMPERATURE' },
              { id: 'c3', x: 65, y: 70, label: 'Alternador', status: 'warning', value: '98', unit: '%', type: 'ROTATION' }
          ] as ComponentHotspot[]
      },
      'R-04': {
          id: 'R-04',
          name: 'Braço Robótico KR-1000',
          image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=1600',
          status: 'ok',
          hotspots: [
              { id: 'c1', x: 55, y: 45, label: 'Junta J2 (Cotovelo)', status: 'ok', value: '42', unit: '°C', type: 'TEMPERATURE' },
              { id: 'c2', x: 35, y: 75, label: 'Base Giratória J1', status: 'ok', value: '1200', unit: 'rpm', type: 'ROTATION' },
              { id: 'c3', x: 78, y: 38, label: 'Efetuador (Garra)', status: 'ok', value: '6.5', unit: 'bar', type: 'PRESSURE' }
          ] as ComponentHotspot[]
      }
  };

  const currentAsset = assetData[activeAsset as keyof typeof assetData];

  // Efeito para simular dados em tempo real no gráfico
  useEffect(() => {
    const targetHotspot = currentAsset.hotspots.find(h => h.id === selectedComponentId) || currentAsset.hotspots[0];
    const baseVal = parseFloat(targetHotspot.value);
    
    const interval = setInterval(() => {
        setChartData(prev => {
            const lastVal = prev[prev.length - 1].value;
            const newVal = lastVal + (Math.random() - 0.5) * (baseVal * 0.05); // Menor volatilidade para parecer mais real
            return [...prev.slice(1), { time: prev[prev.length - 1].time + 1, value: newVal }];
        });
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedComponentId, activeAsset, currentAsset]);

  // Filtros visuais
  const getImageFilter = () => {
      switch(viewMode) {
          case 'thermal': return 'contrast(125%) brightness(110%) hue-rotate(180deg) saturate(150%)'; 
          case 'blueprint': return 'grayscale(100%) invert(100%) sepia(100%) hue-rotate(180deg) saturate(400%) contrast(90%)';
          default: return 'none';
      }
  };

  const getActiveComponent = () => {
      return currentAsset.hotspots.find(h => h.id === (selectedComponentId || hoveredComponentId)) || null;
  };

  // Helper para ícones dinâmicos
  const getTypeIcon = (type: string) => {
      switch(type) {
          case 'TEMPERATURE': return <Icons.Thermometer className="w-3 h-3" />;
          case 'ROTATION': return <Icons.Activity className="w-3 h-3" />;
          case 'PRESSURE': return <Icons.TrendingDown className="w-3 h-3" />; // Using generic trend for pressure
          case 'VIBRATION': return <Icons.Activity className="w-3 h-3" />;
          default: return <Icons.Cpu className="w-3 h-3" />;
      }
  }

  const activeComp = getActiveComponent();

  return (
    <div className="flex-1 p-6 grid grid-cols-12 gap-6 h-full relative overflow-hidden bg-omni-dark">
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] grid-bg"></div>

      {/* --- COLUNA ESQUERDA: VIEWER 3D (9 Colunas) --- */}
      <div className="col-span-12 lg:col-span-9 flex flex-col gap-4 z-10 h-full overflow-hidden">
          
          {/* Header Controls Overlay */}
          <div className="flex justify-between items-center bg-omni-panel border border-omni-border p-2 rounded-lg shrink-0">
              <div className="flex gap-1">
                  {Object.values(assetData).map(asset => (
                      <button 
                        key={asset.id}
                        onClick={() => { setActiveAsset(asset.id); setSelectedComponentId(null); }}
                        className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all border ${
                            activeAsset === asset.id 
                            ? 'bg-omni-cyan/10 border-omni-cyan text-omni-cyan' 
                            : 'bg-transparent border-transparent text-slate-500 hover:text-white hover:bg-white/5'
                        }`}
                      >
                          {asset.name}
                      </button>
                  ))}
              </div>

              <div className="flex gap-1 bg-black/40 p-1 rounded border border-white/5">
                  {['RGB', 'IR', 'CAD'].map((mode, idx) => {
                      const modeKey = mode === 'RGB' ? 'standard' : mode === 'IR' ? 'thermal' : 'blueprint';
                      const isActive = viewMode === modeKey;
                      return (
                        <button 
                            key={mode} 
                            onClick={() => setViewMode(modeKey as any)} 
                            className={`flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-bold transition-all ${isActive ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
                        >
                            {mode === 'RGB' && <Icons.Camera className="w-3 h-3" />}
                            {mode === 'IR' && <Icons.Thermometer className="w-3 h-3" />}
                            {mode === 'CAD' && <Icons.FileText className="w-3 h-3" />}
                            {mode}
                        </button>
                      )
                  })}
              </div>
          </div>

          {/* MAIN VIEWPORT */}
          <div className="flex-1 bg-black border border-omni-border rounded-xl relative overflow-hidden group shadow-2xl">
              
              {/* Overlay: Live Feed Info */}
              <div className="absolute top-4 left-4 z-20 pointer-events-none">
                  <div className="flex flex-col">
                      <span className="text-[9px] font-mono text-omni-cyan uppercase tracking-widest mb-1">LIVE FEED • 60 FPS</span>
                      <span className="text-xl font-display font-bold text-white tracking-wider drop-shadow-md">{currentAsset.name}</span>
                  </div>
              </div>

              {/* Overlay: Status Badge */}
              <div className="absolute top-4 right-4 z-20">
                  <span className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 backdrop-blur-md border ${
                      currentAsset.status === 'critical' ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-green-500/20 border-green-500 text-green-500'
                  }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${currentAsset.status === 'critical' ? 'bg-red-500 animate-ping' : 'bg-green-500'}`}></span>
                      {currentAsset.status === 'critical' ? 'Status Crítico' : 'Operação Normal'}
                  </span>
              </div>

              {/* IMAGE CONTAINER */}
              <div className="w-full h-full relative overflow-hidden bg-slate-900">
                  <img 
                    src={currentAsset.image} 
                    className="w-full h-full object-cover transition-all duration-700"
                    style={{ filter: getImageFilter() }}
                    alt="Asset View"
                  />
                  
                  {/* Grid Overlay (Blueprint Mode) */}
                  {viewMode === 'blueprint' && (
                      <div className="absolute inset-0 z-10 pointer-events-none opacity-20" 
                           style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                      </div>
                  )}

                  {/* --- AR HOTSPOTS SYSTEM --- */}
                  {currentAsset.hotspots.map(hs => {
                      const isHovered = hoveredComponentId === hs.id;
                      const isSelected = selectedComponentId === hs.id;
                      const isActive = isHovered || isSelected;
                      const isRightSide = hs.x > 50;
                      
                      // Define dynamic colors based on status
                      const statusColorBg = hs.status === 'critical' ? 'bg-red-500' : hs.status === 'warning' ? 'bg-amber-500' : 'bg-omni-cyan';
                      const statusColorBorder = hs.status === 'critical' ? 'border-red-500' : hs.status === 'warning' ? 'border-amber-500' : 'border-omni-cyan';
                      const statusColorText = hs.status === 'critical' ? 'text-red-500' : hs.status === 'warning' ? 'text-amber-500' : 'text-omni-cyan';
                      
                      return (
                      <div 
                        key={hs.id}
                        className="absolute z-40"
                        style={{ top: `${hs.y}%`, left: `${hs.x}%` }}
                      >
                          {/* 1. Hit Area (Larger for usability) */}
                          <div 
                             className="absolute -top-4 -left-4 w-8 h-8 rounded-full cursor-pointer z-50"
                             onMouseEnter={() => setHoveredComponentId(hs.id)}
                             onMouseLeave={() => setHoveredComponentId(null)}
                             onClick={() => setSelectedComponentId(isSelected ? null : hs.id)}
                          ></div>

                          {/* 2. Visual Dot (The anchor) */}
                          <div className="relative pointer-events-none">
                              {/* Outer Ring (Always visible, breathes) */}
                              <div className={`absolute -top-2 -left-2 w-4 h-4 rounded-full border transition-all duration-1000 ease-in-out ${isActive ? `scale-150 ${statusColorBorder} opacity-100` : `scale-100 border-white/40 opacity-50`}`}></div>
                              
                              {/* Core Dot (Always colored now) */}
                              <div className={`w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg transition-all duration-300 ${statusColorBg} ${isActive ? 'shadow-[0_0_15px_currentColor] scale-110' : ''}`}></div>
                          </div>

                          {/* 3. AR Callout Line & Card (Only visible when active) */}
                          {/* CENTERED VERTICALLY: -translate-y-1/2 ensures the line comes from the exact center of the dot */}
                          <div className={`
                                absolute top-0 pointer-events-none transition-all duration-300 ease-out flex items-center
                                ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0'}
                                ${isRightSide ? 'right-0 flex-row-reverse origin-right pr-3 translate-x-4' : 'left-0 flex-row origin-left pl-3 -translate-x-4'}
                                -translate-y-1/2
                          `}>
                              
                              {/* The Leader Line */}
                              <div className="flex items-center">
                                   {/* Line segment */}
                                   <div className={`h-[1px] bg-white/60 shadow-[0_0_8px_rgba(255,255,255,0.6)] transition-all duration-500 ease-out ${isActive ? 'w-12' : 'w-0'}`}></div>
                                   {/* End Dot */}
                                   <div className={`w-1 h-1 rounded-full ${statusColorBg}`}></div>
                              </div>

                              {/* The Data Card */}
                              <div className={`
                                  bg-omni-panel/95 backdrop-blur-xl border border-omni-border p-3 rounded-lg shadow-2xl min-w-[160px] mx-2
                                  transition-all duration-500 delay-75
                                  ${isActive ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'}
                              `}>
                                  <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 text-slate-400`}>
                                      {hs.label}
                                  </h4>
                                  <div className="flex items-baseline gap-2">
                                      <span className={`text-xl font-display font-bold ${statusColorText}`}>
                                          {hs.value}
                                      </span>
                                      <span className={`text-xs font-mono ${statusColorText}`}>{hs.unit}</span>
                                  </div>
                                  <div className="mt-1 flex items-center justify-between border-t border-white/5 pt-1">
                                      <span className="text-[9px] text-slate-500">{hs.type}</span>
                                      <div className={`w-1.5 h-1.5 rounded-full ${statusColorBg}`}></div>
                                  </div>
                              </div>
                          </div>

                      </div>
                  )})}
              </div>

              {/* Decorative Scanline */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-omni-cyan/5 to-transparent h-[20%] w-full animate-scan pointer-events-none z-10 opacity-20"></div>
          </div>

          {/* BOTTOM PANELS (Charts & KPI) */}
          <div className="h-40 shrink-0 grid grid-cols-12 gap-4">
              
              {/* Main Chart Card */}
              <div className="col-span-8 bg-omni-panel border border-omni-border rounded-xl p-4 flex flex-col relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2 relative z-10">
                      <div>
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                            {activeComp ? `ANÁLISE: ${activeComp.label}` : 'MONITORAMENTO GERAL'}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">Tempo Real (últimos 30s)</p>
                      </div>
                      <Icons.Activity className="w-4 h-4 text-omni-cyan opacity-50" />
                  </div>
                  
                  <div className="flex-1 w-full -ml-2 relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px' }} 
                                itemStyle={{ color: '#06b6d4' }}
                                labelStyle={{ display: 'none' }}
                                cursor={{ stroke: '#334155', strokeWidth: 1 }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#06b6d4" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorVal)" 
                                isAnimationActive={true}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Subtle Grid Background for Chart */}
                  <div className="absolute inset-0 border-t border-slate-800/50 mt-10 mx-4" style={{ backgroundSize: '20px 20px', backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)' }}></div>
              </div>

              {/* OEE KPI Card */}
              <div className="col-span-4 bg-omni-panel border border-omni-border rounded-xl p-5 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex justify-between items-start z-10">
                      <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">EFICIÊNCIA (OEE)</span>
                      <Icons.TrendingUp className="w-4 h-4 text-omni-cyan" />
                  </div>
                  
                  <div className="text-right z-10 mt-auto mb-2">
                      <span className="text-5xl font-display font-bold text-white tracking-tight">94<span className="text-2xl text-slate-500">.2%</span></span>
                  </div>

                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden z-10">
                      <div className="h-full bg-omni-cyan w-[94%] shadow-[0_0_10px_#06b6d4]"></div>
                  </div>
                  
                  {/* Decorative Background Blur */}
                  <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-omni-cyan/10 rounded-full blur-2xl"></div>
              </div>
          </div>
      </div>

      {/* --- COLUNA DIREITA: DADOS & LOGS (3 Colunas) --- */}
      <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 z-10 h-full overflow-hidden">
          
          {/* LISTA DE SUB-SISTEMAS (TOTALMENTE REDESENHADA) */}
          <div className="bg-omni-panel border border-omni-border rounded-xl flex flex-col h-[55%] overflow-hidden shadow-lg relative group">
              {/* Glass Header with Status Cluster */}
              <div className="px-4 py-3 border-b border-omni-border bg-gradient-to-r from-omni-dark/80 to-omni-panel/80 backdrop-blur-sm flex justify-between items-center z-10">
                  <div>
                      <span className="text-xs font-bold text-white uppercase tracking-wider block">Sub-Sistemas</span>
                      <span className="text-[9px] text-omni-cyan font-mono tracking-tight">MONITORAMENTO ATIVO</span>
                  </div>
                  
                  {/* Cyberpunk Status Dots Cluster */}
                  <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-full border border-white/5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]" title="Sensores OK"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-omni-cyan shadow-[0_0_6px_#06b6d4]" title="Rede OK"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400 opacity-50" title="IO Warning"></div>
                  </div>
              </div>
              
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar relative z-10">
                  {currentAsset.hotspots.map((part) => {
                      const isActive = selectedComponentId === part.id || hoveredComponentId === part.id;
                      const statusColorText = part.status === 'critical' ? 'text-red-500' : part.status === 'warning' ? 'text-amber-500' : 'text-omni-cyan';
                      const statusBorder = part.status === 'critical' ? 'border-red-500' : part.status === 'warning' ? 'border-amber-500' : 'border-omni-cyan';
                      
                      return (
                      <div 
                        key={part.id}
                        onMouseEnter={() => setHoveredComponentId(part.id)}
                        onMouseLeave={() => setHoveredComponentId(null)}
                        onClick={() => setSelectedComponentId(part.id === selectedComponentId ? null : part.id)}
                        className={`
                            w-full px-3 py-3 rounded border-l-2 flex justify-between items-center cursor-pointer transition-all duration-200 group
                            ${isActive 
                                ? `bg-white/5 ${statusBorder} shadow-[inset_10px_0_20px_-10px_rgba(0,0,0,0.5)]` 
                                : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10'
                            }
                        `}
                      >
                          {/* Left: Icon & Name */}
                          <div className="flex items-center gap-3">
                              <div className={`p-1.5 rounded bg-black/40 border border-white/5 ${statusColorText}`}>
                                  {getTypeIcon(part.type)}
                              </div>
                              <div className="flex flex-col">
                                  <span className={`text-xs font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                      {part.label}
                                  </span>
                                  <div className="flex items-center gap-1 mt-0.5">
                                      <span className="text-[8px] text-slate-600 font-bold uppercase tracking-wider bg-black/30 px-1 rounded">
                                          {part.type}
                                      </span>
                                      {/* Mini Visual Bar for value intensity */}
                                      <div className="h-1 w-8 bg-slate-800 rounded-full overflow-hidden ml-1">
                                          <div className={`h-full w-[60%] ${part.status === 'critical' ? 'bg-red-500' : 'bg-slate-500'}`}></div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          
                          {/* Right: Value */}
                          <div className="text-right">
                              <div className={`text-sm font-mono font-bold ${statusColorText}`}>
                                  {part.value} 
                              </div>
                              <span className="text-[9px] text-slate-500 uppercase">{part.unit}</span>
                          </div>
                      </div>
                  )})}
                  
                  <div className="my-2 border-t border-dashed border-slate-800 mx-2"></div>

                  <div className="px-3 py-1 text-[10px] text-slate-500 font-mono uppercase opacity-50 mb-1">
                      Auxiliares
                  </div>
                  
                  <div className="px-3 py-2 flex justify-between items-center opacity-60 hover:opacity-100 rounded hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-2">
                          <Icons.Zap className="w-3 h-3 text-slate-500" />
                          <span className="text-xs text-slate-400">Inversores de Freq.</span>
                      </div>
                      <span className="text-[9px] font-bold text-omni-success bg-omni-success/10 px-1.5 py-0.5 rounded border border-omni-success/20">OK</span>
                  </div>
                   <div className="px-3 py-2 flex justify-between items-center opacity-60 hover:opacity-100 rounded hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-2">
                          <Icons.Droplets className="w-3 h-3 text-slate-500" />
                          <span className="text-xs text-slate-400">Lubrificação Auto.</span>
                      </div>
                      <span className="text-[9px] font-bold text-omni-success bg-omni-success/10 px-1.5 py-0.5 rounded border border-omni-success/20">OK</span>
                  </div>
              </div>
              
              {/* Footer Decoration */}
              <div className="h-1 w-full bg-gradient-to-r from-transparent via-omni-cyan/20 to-transparent absolute bottom-0"></div>
          </div>

          {/* TERMINAL LOGS (Refatorado para corresponder à imagem) */}
          <div className="bg-black border border-omni-border rounded-xl flex-1 flex flex-col overflow-hidden shadow-inner relative font-mono text-[10px]">
              {/* Terminal Header */}
              <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center shrink-0">
                  <span className="text-omni-cyan font-bold tracking-wider">SYSTEM LOGS</span>
                  <Icons.More className="w-3 h-3 text-slate-600" />
              </div>
              
              {/* Log Content */}
              <div className="absolute inset-0 top-8 p-3 overflow-y-auto space-y-1.5 custom-scrollbar">
                   {/* Background Noise Texture */}
                   <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'}}></div>
                   
                   {Array.from({length: 8}).map((_, i) => (
                       <div key={i} className="flex gap-2 items-start opacity-80 hover:opacity-100 transition-opacity">
                           <span className="text-slate-600 shrink-0 select-none">07:53:3{4+i}</span>
                           <span className="text-purple-400 font-bold shrink-0">KERNEL</span>
                           <span className="text-slate-400 break-words">Reading sensor data stream block {3490 + i}...</span>
                       </div>
                   ))}
                   
                   <div className="flex gap-2 items-start mt-2">
                       <span className="text-slate-600 shrink-0">07:53:42</span>
                       <span className="text-green-500 font-bold shrink-0">SYS</span>
                       <span className="text-slate-300">Sync completed successfully.</span>
                   </div>

                   {/* Example of Warning Log */}
                   {currentAsset.status === 'critical' && (
                       <div className="flex gap-2 items-start mt-2 bg-red-900/10 p-1 -mx-1 rounded">
                           <span className="text-red-800 shrink-0">07:53:45</span>
                           <span className="text-red-500 font-bold shrink-0">ALARM</span>
                           <span className="text-red-400">Threshold exceeded on {currentAsset.hotspots[0].id}</span>
                       </div>
                   )}
              </div>
          </div>

      </div>

      <style>{`
        @keyframes scan {
            0% { top: -10%; opacity: 0; }
            10% { opacity: 0.5; }
            90% { opacity: 0.5; }
            100% { top: 110%; opacity: 0; }
        }
        .animate-scan {
            animation: scan 4s linear infinite;
        }
      `}</style>
    </div>
  );
};