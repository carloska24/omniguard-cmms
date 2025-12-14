import React, { useState } from 'react';
import { Icons } from './Icons';
import { ViewState } from '../types';
import { useMaintenance } from '../context/MaintenanceContext';

interface HeaderProps {
  title: string;
  status?: string;
  setView: (view: ViewState) => void;
}

export const Header: React.FC<HeaderProps> = ({ title, status = 'SISTEMA ONLINE', setView }) => {
  const { isOnline, toggleConnection, pendingSyncs } = useMaintenance(); // CONTEXT ACCESS

  const [isListening, setIsListening] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Falha Crítica TG-01', time: '10 min atrás', type: 'critical' },
    { id: 2, title: 'Nova O.S. Atribuída', time: '1 hora atrás', type: 'info' },
    { id: 3, title: 'Estoque Baixo: Rolamento', time: '2 horas atrás', type: 'warning' },
  ]);
  const [unreadCount, setUnreadCount] = useState(3);

  // Simulação de Comando de Voz
  const handleMicClick = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      alert("🎤 Comando Reconhecido: 'Navegar para Dashboard'");
      setView('dashboard');
    }, 3000);
  };

  const handleScanClick = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setView('assets');
    }, 2500);
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    if (unreadCount > 0) setUnreadCount(0);
  };

  const handleViewAllAlerts = () => {
    setView('tickets');
    setShowNotifications(false);
  };

  return (
    <header className="h-20 border-b border-white/5 bg-omni-dark/80 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-40 shadow-[0_4px_30px_rgba(0,0,0,0.5)] relative hidden md:flex">
      {/* SCANNING OVERLAY MODAL */}
      {isScanning && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="relative w-72 h-72 border-2 border-omni-cyan/50 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.3)] bg-slate-900">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'url("https://media.giphy.com/media/3o7aD010K8b5X7090s/giphy.gif")',
                backgroundSize: 'cover',
              }}
            ></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_15px_red] animate-[scan_2s_linear_infinite]"></div>
            <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-omni-cyan"></div>
            <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-omni-cyan"></div>
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-omni-cyan"></div>
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-omni-cyan"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-omni-cyan font-mono text-xs animate-pulse bg-black/50 px-2 rounded">
                BUSCANDO QR CODE...
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsScanning(false)}
            className="mt-8 bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-full border border-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
              `}</style>
        </div>
      )}

      {/* Title & Breadcrumbs Area */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            Planta 01 / Manutenção
          </span>
          <Icons.ChevronRight className="w-3 h-3 text-slate-600" />
          <span className="text-[10px] font-mono text-omni-cyan uppercase tracking-widest">
            Main View
          </span>
        </div>
        <h2 className="text-2xl font-display font-bold text-white tracking-wide">{title}</h2>
      </div>

      {/* Global Command Center (Search) */}
      <div className="flex-1 max-w-xl mx-12 hidden lg:block">
        <div className="relative group flex items-center gap-2">
          <div className="flex-1 relative bg-black/40 border border-white/10 rounded-lg flex items-center px-4 py-2.5 transition-colors focus-within:border-omni-cyan/50 focus-within:bg-black/60 group-hover:border-white/20">
            <Icons.Search className="w-4 h-4 text-slate-500 mr-3" />
            <input
              type="text"
              placeholder="Pesquisar ativos, ordens, tags (Ctrl + K)..."
              className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-slate-600 font-sans"
            />
            <div className="flex gap-1">
              <span className="text-[10px] bg-white/10 text-slate-400 px-1.5 py-0.5 rounded border border-white/5 font-mono">
                ⌘
              </span>
              <span className="text-[10px] bg-white/10 text-slate-400 px-1.5 py-0.5 rounded border border-white/5 font-mono">
                K
              </span>
            </div>
          </div>
          <button
            onClick={handleScanClick}
            className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-slate-400 hover:text-omni-cyan hover:border-omni-cyan/50 hover:bg-omni-cyan/10 transition-all shadow-sm"
            title="Escanear QR Code"
          >
            <Icons.QrCode className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Right Controls & HUD Status */}
      <div className="flex items-center gap-6">
        {/* NETWORK TOGGLE SIMULATOR */}
        <button
          onClick={toggleConnection}
          className={`hidden md:flex items-center gap-3 border rounded-full px-4 py-1.5 backdrop-blur-sm transition-all ${
            isOnline ? 'bg-black/40 border-white/10' : 'bg-red-900/20 border-red-500/50'
          }`}
          title="Clique para Simular Offline"
        >
          <div className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isOnline ? 'bg-omni-success' : 'bg-red-500'
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 shadow-[0_0_8px] ${
                isOnline ? 'bg-omni-success shadow-[#22c55e]' : 'bg-red-500 shadow-red-500'
              }`}
            ></span>
          </div>
          <div className="flex flex-col leading-none text-left">
            <span
              className={`text-[9px] font-bold tracking-widest uppercase ${
                isOnline ? 'text-omni-success' : 'text-red-500'
              }`}
            >
              {isOnline ? 'SISTEMA ONLINE' : 'MODO OFFLINE'}
            </span>
            <span className="text-[9px] font-mono text-slate-500">
              {isOnline ? 'PING: 12ms • ESTÁVEL' : `${pendingSyncs} AÇÕES PENDENTES`}
            </span>
          </div>
        </button>

        <div className="h-8 w-px bg-white/10"></div>

        <div className="flex items-center gap-3 relative">
          <button
            onClick={handleMicClick}
            className={`flex items-center justify-center w-10 h-10 rounded-lg border transition-all group relative overflow-hidden ${
              isListening
                ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                : 'bg-white/5 border border-white/5 text-slate-400 hover:text-omni-cyan hover:bg-omni-cyan/10 hover:border-omni-cyan/30'
            }`}
            title="Comando de Voz"
          >
            {isListening ? (
              <Icons.Mic className="w-5 h-5 relative z-10 animate-bounce" />
            ) : (
              <Icons.Mic className="w-5 h-5 relative z-10" />
            )}
          </button>

          <div className="relative">
            <button
              onClick={handleNotificationClick}
              className={`flex items-center justify-center w-10 h-10 rounded-lg border transition-all relative ${
                showNotifications
                  ? 'bg-white/10 text-white border-white/20 shadow-inner'
                  : 'bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icons.Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-omni-danger rounded-full border-2 border-omni-dark shadow-[0_0_5px_#ef4444]"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute top-12 right-0 w-80 bg-omni-panel border border-omni-border rounded-xl shadow-2xl z-50 animate-in zoom-in-95 duration-200 overflow-hidden ring-1 ring-white/10">
                <div className="px-4 py-3 border-b border-omni-border bg-omni-dark flex justify-between items-center">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Notificações
                  </span>
                  <button
                    onClick={() => setNotifications([])}
                    className="text-[10px] text-slate-500 hover:text-white transition-colors"
                  >
                    Limpar Tudo
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto custom-scrollbar bg-slate-900/50">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center gap-2 text-slate-500 opacity-60">
                      <Icons.Bell className="w-8 h-8 mb-1" />
                      <span className="text-xs">Nenhuma notificação nova.</span>
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          setView('tickets');
                          setShowNotifications(false);
                        }}
                        className="p-3 border-b border-omni-border last:border-0 hover:bg-white/5 cursor-pointer transition-colors flex gap-3 group"
                      >
                        <div
                          className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${
                            notif.type === 'critical'
                              ? 'bg-red-500 shadow-[0_0_6px_red] animate-pulse'
                              : notif.type === 'warning'
                              ? 'bg-orange-500'
                              : 'bg-blue-500'
                          }`}
                        ></div>
                        <div>
                          <p className="text-sm font-bold text-slate-200 leading-tight group-hover:text-white transition-colors">
                            {notif.title}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1 font-mono">{notif.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-2 bg-omni-dark border-t border-omni-border text-center">
                  <button
                    onClick={handleViewAllAlerts}
                    className="text-[10px] text-omni-cyan font-bold hover:underline tracking-wide uppercase"
                  >
                    Ver Central de Alertas
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
