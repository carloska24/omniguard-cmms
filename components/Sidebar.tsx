import React, { useState } from 'react';
import { Icons } from './Icons';
import { ViewState } from '../types';
import { useMaintenance } from '../context/MaintenanceContext';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const { currentUser } = useMaintenance();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Menu Configuration with Updated Lucide Icons
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Geral', icon: Icons.Dashboard },
    { id: 'analytics', label: 'BI & Analytics', icon: Icons.BarChart },
    { id: 'assets', label: 'Gestão de Ativos', icon: Icons.Asset },
    { id: 'tickets', label: 'Corretivas (Chamados)', icon: Icons.Alert, badge: 2 },
    { id: 'preventive', label: 'Planos Preventivos', icon: Icons.Preventive }, // Updated Icon
    { id: 'kanban', label: 'Execução (Kanban)', icon: Icons.Kanban }, // Updated Icon
    { id: 'inventory', label: 'Estoque (Almox)', icon: Icons.Package },
    { id: 'purchases', label: 'Compras & Suprimentos', icon: Icons.ShoppingCart },
    { id: 'digital-twin', label: 'Gêmeo Digital 3D', icon: Icons.Cpu },
  ];

  return (
    <aside
      className={`
            relative bg-[#0B0E14] border-r border-white/5 flex flex-col h-full sticky top-0 z-50 hidden md:flex transition-all duration-300 ease-in-out shadow-2xl
            ${isCollapsed ? 'w-20' : 'w-72'}
        `}
    >
      {/* --- COLLAPSE TOGGLE BUTTON --- */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 z-50 bg-omni-dark border border-white/10 rounded-full p-1.5 text-slate-400 hover:text-omni-cyan hover:border-omni-cyan transition-all shadow-lg hover:shadow-omni-cyan/20 group"
      >
        {isCollapsed ? (
          <Icons.Expand className="w-3 h-3" />
        ) : (
          <Icons.Collapse className="w-3 h-3" />
        )}
      </button>

      {/* --- LOGO SECTION --- */}
      <div
        className={`flex items-center ${
          isCollapsed ? 'justify-center px-0' : 'px-6'
        } py-6 relative overflow-hidden transition-all duration-300 shrink-0 h-24`}
      >
        {/* Glow Effect Background */}
        {!isCollapsed && (
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-omni-cyan via-blue-600 to-transparent opacity-50"></div>
        )}

        <div className="relative group cursor-default">
          {/* Logo Icon Container */}
          <div
            className={`
                relative flex items-center justify-center transition-all duration-500
                ${
                  isCollapsed
                    ? 'w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-black border border-white/10 shadow-lg'
                    : 'w-10 h-10 bg-gradient-to-br from-slate-800 to-black border border-white/10 rounded-lg shadow-lg'
                }
            `}
          >
            <div
              className={`absolute inset-0 bg-omni-cyan blur-lg rounded-full transition-opacity duration-500 ${
                isCollapsed ? 'opacity-40 group-hover:opacity-60' : 'opacity-20'
              }`}
            ></div>
            <Icons.Activity
              className={`text-omni-cyan relative z-10 transition-all duration-300 ${
                isCollapsed ? 'w-6 h-6' : 'w-5 h-5'
              }`}
            />
          </div>
        </div>

        {/* Logo Text (Hidden when collapsed) */}
        <div
          className={`ml-3 transition-all duration-300 overflow-hidden whitespace-nowrap ${
            isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
          }`}
        >
          <h1 className="font-display font-bold text-2xl tracking-widest text-white leading-none flex items-center">
            OMNI<span className="text-omni-cyan">GUARD</span>
          </h1>
          <span className="text-[9px] text-slate-500 font-mono tracking-[0.2em] uppercase block mt-1">
            Industrial OS v2.0
          </span>
        </div>
      </div>

      {/* --- NAVIGATION --- */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {!isCollapsed && (
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 font-display animate-in fade-in duration-500">
            Menu Principal
          </p>
        )}

        {menuItems.map(item => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewState)}
              className={`
                w-full flex items-center relative rounded-xl transition-all duration-300 group ease-out
                ${isCollapsed ? 'justify-center py-3' : 'justify-start px-3 py-3 hover:pl-4'}
                ${
                  isActive
                    ? 'bg-gradient-to-r from-omni-cyan/20 to-transparent text-white shadow-[inset_2px_0_0_0_#06b6d4]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              {/* Active Glow Background */}
              {isActive && (
                <div className="absolute inset-0 bg-omni-cyan/5 blur-sm -z-10 rounded-xl"></div>
              )}

              {/* Active Indicator Bar (Left) */}
              {isActive && !isCollapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-omni-cyan rounded-r-full shadow-[0_0_8px_#06b6d4]"></div>
              )}

              {/* Icon */}
              <div
                className={`relative z-10 transition-all duration-300 ${
                  isActive
                    ? 'text-omni-cyan scale-110 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]'
                    : 'group-hover:text-omni-cyan group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                }`}
              >
                <item.icon className="w-5 h-5" />
              </div>

              {/* Label (Expanded) */}
              <span
                className={`ml-3 text-sm tracking-wide whitespace-nowrap transition-all duration-300 ${
                  isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 block'
                } ${isActive ? 'font-bold text-white' : 'font-medium group-hover:text-white'}`}
              >
                {item.label}
              </span>

              {/* Badge (Expanded) */}
              {!isCollapsed && item.badge && (
                <div className="ml-auto relative z-10 animate-in fade-in">
                  <span className="bg-omni-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(239,68,68,0.4)]">
                    {item.badge}
                  </span>
                </div>
              )}

              {/* Notification Dot (Collapsed) */}
              {isCollapsed && item.badge && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-omni-danger rounded-full border border-[#0B0E14] animate-pulse"></div>
              )}

              {/* Collapsed Tooltip (Floating Shadcn Style) */}
              {isCollapsed && (
                <div className="absolute left-14 top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md border border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-[60] shadow-xl translate-x-[-10px] group-hover:translate-x-0">
                  {item.label}
                  {/* Tooltip Arrow */}
                  <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45 border-l border-b border-slate-700"></div>
                </div>
              )}
            </button>
          );
        })}

        <div className={`my-4 border-t border-white/5 ${isCollapsed ? 'mx-2' : 'mx-4'}`}></div>

        {/* Mobile View Button */}
        <button
          onClick={() => setView('mobile-field')}
          className={`
                w-full flex items-center rounded-lg transition-all duration-300 group hover:bg-white/5 text-slate-400 hover:text-purple-400
                ${isCollapsed ? 'justify-center py-3' : 'justify-between px-3 py-2.5'}
            `}
          title={isCollapsed ? 'Modo Técnico Mobile' : undefined}
        >
          <div className="flex items-center gap-3">
            <Icons.Smartphone className="w-5 h-5" />
            {!isCollapsed && <span className="text-sm font-medium">Modo Técnico</span>}
          </div>
          {!isCollapsed && <Icons.ChevronRight className="w-4 h-4 opacity-50" />}

          {isCollapsed && (
            <div className="absolute left-14 top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-slate-900 text-purple-400 text-xs font-bold rounded-md border border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-[60] shadow-xl translate-x-[-10px] group-hover:translate-x-0">
              Modo Mobile
              <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45 border-l border-b border-slate-700"></div>
            </div>
          )}
        </button>
      </nav>

      {/* --- USER PROFILE SECTION --- */}
      <div className={`border-t border-white/5 bg-black/20 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        <div
          onClick={() => setView('settings')}
          className={`
                relative group cursor-pointer rounded-xl border transition-all backdrop-blur-md flex items-center overflow-visible
                ${
                  isCollapsed
                    ? 'justify-center p-2 bg-transparent hover:bg-white/5 border-transparent'
                    : 'gap-3 p-3 bg-white/5 border-white/5 hover:border-white/10'
                }
                ${
                  currentView === 'settings' && !isCollapsed
                    ? 'bg-white/10 border-omni-cyan/50'
                    : ''
                }
            `}
        >
          {/* Active Glow for Profile */}
          <div
            className={`absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
              currentView === 'settings' ? 'opacity-100' : ''
            }`}
          ></div>

          <div className="relative shrink-0">
            <img
              src={currentUser.avatar}
              alt="User"
              className="w-9 h-9 rounded-lg border border-white/10 object-cover shadow-sm group-hover:border-white/30 transition-colors"
            />
            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-omni-success rounded-full border-2 border-[#0B0E14]"></div>
          </div>

          {/* Expanded User Info */}
          <div
            className={`flex-1 overflow-hidden transition-all duration-300 ${
              isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 block'
            }`}
          >
            <p className="text-sm font-bold text-white truncate font-display">{currentUser.name}</p>
            <p className="text-[10px] text-slate-400 truncate font-mono uppercase tracking-tight">
              {currentUser.role}
            </p>
          </div>

          {/* Settings Icon (Expanded Only) */}
          <div
            className={`text-slate-500 transition-colors p-1.5 rounded-lg ${
              isCollapsed ? 'hidden' : 'block'
            } ${currentView === 'settings' ? 'text-omni-cyan' : 'group-hover:text-white'}`}
          >
            <Icons.Settings
              className={`w-4 h-4 ${currentView === 'settings' ? 'animate-spin-slow' : ''}`}
            />
          </div>

          {/* Collapsed Tooltip for Profile */}
          {isCollapsed && (
            <div className="absolute left-14 bottom-0 ml-2 px-4 py-3 bg-slate-900 text-white rounded-lg border border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-[60] shadow-2xl w-48 translate-x-[-10px] group-hover:translate-x-0">
              <p className="text-xs font-bold text-white">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 uppercase mb-2">{currentUser.role}</p>
              <div className="flex items-center gap-2 text-[10px] text-omni-cyan font-bold pt-2 border-t border-white/10">
                <Icons.Settings className="w-3 h-3" /> Configurações
              </div>
              <div className="absolute left-0 bottom-4 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-l border-b border-slate-700"></div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
