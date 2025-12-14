import React from 'react';
import { Icons } from './Icons';
import { ViewState } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const { profile, signOut } = useAuth(); // Auth Hook

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Geral', icon: Icons.Dashboard },
    { id: 'analytics', label: 'BI & Analytics', icon: Icons.BarChart },
    { id: 'assets', label: 'Gestão de Ativos', icon: Icons.Asset },
    { id: 'tickets', label: 'Corretivas (Chamados)', icon: Icons.Alert, badge: 2 },
    { id: 'preventive', label: 'Planos Preventivos', icon: Icons.Calendar },
    { id: 'inventory', label: 'Estoque (Almox)', icon: Icons.Package },
    { id: 'purchases', label: 'Compras & Suprimentos', icon: Icons.ShoppingCart },
    { id: 'kanban', label: 'Execução (Kanban)', icon: Icons.WorkOrder },
    { id: 'digital-twin', label: 'Gêmeo Digital 3D', icon: Icons.Cpu },
  ];

  return (
    <aside className="w-72 bg-omni-dark/95 backdrop-blur-xl border-r border-white/5 flex flex-col h-full sticky top-0 shadow-2xl z-50 hidden md:flex">
      {/* Logo Section */}
      <div className="p-8 pb-6 flex items-center gap-4 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-omni-cyan via-blue-600 to-transparent opacity-50"></div>

        <div className="relative">
          <div className="absolute inset-0 bg-omni-cyan blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
          <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-black border border-white/10 rounded-lg flex items-center justify-center relative z-10 shadow-lg">
            <Icons.Activity className="text-omni-cyan w-6 h-6" />
          </div>
        </div>

        <div>
          <h1 className="font-display font-bold text-2xl tracking-widest text-white leading-none">
            OMNI<span className="text-omni-cyan">GUARD</span>
          </h1>
          <span className="text-[9px] text-slate-500 font-mono tracking-[0.2em] uppercase block mt-1">
            Industrial OS v2.0
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
        <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">
          Menu Principal
        </p>
        {menuItems.map(item => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewState)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                isActive
                  ? 'bg-gradient-to-r from-omni-cyan/20 to-transparent text-white border-l-2 border-omni-cyan shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-omni-cyan/5 animate-pulse mix-blend-overlay"></div>
              )}

              <div className="flex items-center gap-3 relative z-10">
                <item.icon
                  className={`w-5 h-5 transition-transform duration-300 ${
                    isActive
                      ? 'text-omni-cyan scale-110 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]'
                      : 'text-slate-500 group-hover:text-slate-300 group-hover:scale-105'
                  }`}
                />
                <span
                  className={`text-sm font-medium tracking-wide ${
                    isActive ? 'font-bold text-shadow-sm' : ''
                  }`}
                >
                  {item.label}
                </span>
              </div>

              {item.badge && (
                <div className="relative z-10">
                  <span className="bg-omni-danger text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse">
                    {item.badge}
                  </span>
                </div>
              )}
            </button>
          );
        })}

        <div className="my-4 border-t border-white/5"></div>
        <button
          onClick={() => setView('mobile-field')}
          className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 group bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 text-slate-300 hover:text-white`}
        >
          <div className="flex items-center gap-3">
            <Icons.Smartphone className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-bold">Modo Técnico (Mobile)</span>
          </div>
          <Icons.ChevronRight className="w-4 h-4 opacity-50" />
        </button>
      </nav>

      {/* User Profile - Glass Card */}
      <div className="p-4 border-t border-white/5">
        <div className="relative group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all backdrop-blur-md">
            <div className="relative">
              <img
                src="https://picsum.photos/id/64/100/100"
                alt="User"
                className="w-10 h-10 rounded-lg border border-white/10 object-cover"
              />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-omni-success rounded-full border-2 border-omni-dark"></div>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate font-display">
                {profile?.name || 'Usuário'}
              </p>
              <p className="text-[10px] text-slate-400 truncate font-mono uppercase">
                {profile?.role === 'technician'
                  ? 'Técnico'
                  : profile?.role === 'manager'
                  ? 'Gestor'
                  : 'Admin'}{' '}
                • ID: {profile?.id.substring(0, 6)}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setView('settings')}
                className={`text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 ${
                  currentView === 'settings' ? 'text-omni-cyan' : ''
                }`}
                title="Configurações"
              >
                <Icons.Settings
                  className={`w-4 h-4 ${
                    currentView === 'settings' ? 'animate-spin-slow' : 'hover:animate-spin'
                  }`}
                />
              </button>
              <button
                onClick={() => signOut()}
                className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10"
                title="Sair do Sistema"
              >
                <Icons.LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
