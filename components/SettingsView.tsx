import React, { useState } from 'react';
import { Icons } from './Icons';
import { Technician, SystemSettings } from '../types';
import { useMaintenance } from '../context/MaintenanceContext';

import { supabase } from '../lib/supabase';

export const SettingsView: React.FC = () => {
  const { technicians, settings, addTechnician, updateTechnician, updateSettings, seedDatabase } =
    useMaintenance(); // CONTEXT CONNECTED

  const [activeTab, setActiveTab] = useState<'general' | 'team' | 'system'>('team');

  // Form States for New Technician
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  const [newTech, setNewTech] = useState<Partial<Technician>>({
    status: 'active',
    shift: 'morning',
    skills: [],
  });
  const [seeding, setSeeding] = useState(false); // State for seeding loading

  // Local state for editing settings before saving
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);

  const handleSaveSettings = () => {
    updateSettings(localSettings);
    alert('Configurações do sistema salvas e aplicadas globalmente!');
  };

  const handleAddTech = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTech.name || !newTech.role) return;

    const tech: Technician = {
      id: Date.now().toString(),
      name: newTech.name,
      role: newTech.role,
      email: newTech.email || 'user@omni.ind',
      status: newTech.status || 'active',
      skills: newTech.skills || [],
      shift: newTech.shift || 'morning',
      efficiency: 85, // Default start
      avatar: `https://i.pravatar.cc/150?u=${Math.random()}`,
    };
    addTechnician(tech);
    setIsAddUserOpen(false);
    setNewTech({ status: 'active', shift: 'morning', skills: [] });
  };

  const toggleSkill = (skill: string) => {
    const currentSkills = newTech.skills || [];
    if (currentSkills.includes(skill)) {
      setNewTech({ ...newTech, skills: currentSkills.filter(s => s !== skill) });
    } else {
      setNewTech({ ...newTech, skills: [...currentSkills, skill] });
    }
  };

  const toggleTechStatus = (tech: Technician) => {
    const newStatus = tech.status === 'active' ? 'inactive' : 'active';
    updateTechnician({ ...tech, status: newStatus });
  };

  const availableSkills = [
    'Mecânica',
    'Elétrica',
    'Hidráulica',
    'Pneumática',
    'PLC',
    'NR10',
    'NR35',
    'Solda',
    'Robótica',
  ];

  return (
    <div className="flex flex-col h-full bg-[#050608] p-6 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Icons.Settings className="w-5 h-5 text-omni-cyan" />
            Administração do Sistema
          </h2>
          <p className="text-xs text-slate-400">
            Configurações Globais, Gestão de Acessos e Equipes
          </p>
        </div>
        <button
          onClick={handleSaveSettings}
          className="bg-omni-cyan hover:bg-cyan-400 text-omni-dark font-bold py-2 px-6 rounded-lg text-sm flex items-center gap-2 transition-all shadow-lg shadow-cyan-900/20"
        >
          <Icons.Check className="w-4 h-4" /> Salvar Alterações
        </button>
      </div>

      {/* Content Container */}
      <div className="flex-1 bg-omni-panel border border-omni-border rounded-xl flex overflow-hidden">
        {/* Sidebar Navigation inside Settings */}
        <div className="w-64 bg-omni-dark border-r border-omni-border p-4 flex flex-col gap-2">
          <button
            onClick={() => setActiveTab('team')}
            className={`text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-all ${
              activeTab === 'team'
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icons.User className="w-4 h-4" /> Equipe Técnica
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-all ${
              activeTab === 'general'
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icons.Factory className="w-4 h-4" /> Dados da Planta
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-all ${
              activeTab === 'system'
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icons.Cpu className="w-4 h-4" /> Parâmetros do Sistema
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-grid-white/[0.02]">
          {/* --- TEAM MANAGEMENT TAB --- */}
          {activeTab === 'team' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white">Quadro de Técnicos</h3>
                <button
                  onClick={() => setIsAddUserOpen(true)}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2"
                >
                  <Icons.Plus className="w-4 h-4" /> Adicionar Técnico
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {technicians.map(tech => (
                  <div
                    key={tech.id}
                    className="bg-omni-dark border border-omni-border rounded-xl p-5 hover:border-slate-500 transition-all group relative overflow-hidden"
                  >
                    <button
                      onClick={() => toggleTechStatus(tech)}
                      className="absolute top-0 right-0 p-3 hover:bg-white/5 rounded-bl-xl transition-colors cursor-pointer"
                      title={tech.status === 'active' ? 'Desativar' : 'Ativar'}
                    >
                      <span
                        className={`w-3 h-3 rounded-full block ${
                          tech.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      ></span>
                    </button>
                    <div className="flex items-center gap-4 mb-4">
                      <img
                        src={tech.avatar}
                        className="w-14 h-14 rounded-full border-2 border-slate-700"
                        alt={tech.name}
                      />
                      <div>
                        <h4 className="font-bold text-white">{tech.name}</h4>
                        <p className="text-xs text-omni-cyan font-mono">{tech.role}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                          Especialidades
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {tech.skills.map(skill => (
                            <span
                              key={skill}
                              className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-black/20 p-2 rounded">
                          <p className="text-[9px] text-slate-500 uppercase">Eficiência</p>
                          <p
                            className={`text-sm font-bold ${
                              tech.efficiency > 90 ? 'text-green-500' : 'text-yellow-500'
                            }`}
                          >
                            {tech.efficiency}%
                          </p>
                        </div>
                        <div className="bg-black/20 p-2 rounded">
                          <p className="text-[9px] text-slate-500 uppercase">Turno</p>
                          <p className="text-sm font-bold text-white capitalize">
                            {tech.shift === 'morning'
                              ? 'Manhã'
                              : tech.shift === 'afternoon'
                              ? 'Tarde'
                              : 'Noite'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- GENERAL SETTINGS TAB --- */}
          {activeTab === 'general' && (
            <div className="max-w-2xl animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-bold text-white mb-6">Configurações da Planta</h3>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    Nome da Unidade Industrial
                  </label>
                  <input
                    className="w-full bg-omni-dark border border-omni-border rounded-lg px-4 py-3 text-white focus:border-omni-cyan outline-none"
                    value={localSettings.plantName}
                    onChange={e =>
                      setLocalSettings({ ...localSettings, plantName: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                      Fuso Horário
                    </label>
                    <select
                      className="w-full bg-omni-dark border border-omni-border rounded-lg px-4 py-3 text-white focus:border-omni-cyan outline-none"
                      value={localSettings.timezone}
                      onChange={e =>
                        setLocalSettings({ ...localSettings, timezone: e.target.value })
                      }
                    >
                      <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                      <option value="America/Manaus">Manaus (GMT-4)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                      Moeda Padrão
                    </label>
                    <select
                      className="w-full bg-omni-dark border border-omni-border rounded-lg px-4 py-3 text-white focus:border-omni-cyan outline-none"
                      value={localSettings.currency}
                      onChange={e =>
                        setLocalSettings({ ...localSettings, currency: e.target.value })
                      }
                    >
                      <option value="BRL">Real Brasileiro (R$)</option>
                      <option value="USD">Dólar Americano ($)</option>
                      <option value="EUR">Euro (€)</option>
                    </select>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg flex gap-4">
                  <Icons.AlertCircle className="w-6 h-6 text-yellow-500 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-yellow-500 mb-1">Zona de Risco</h4>
                    <p className="text-xs text-slate-400 mb-3">
                      Ações críticas como resetar o banco de dados ou arquivar histórico.
                    </p>
                    <button className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded font-bold">
                      Arquivar Dados Antigos
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- SYSTEM PARAMETERS TAB --- */}
          {activeTab === 'system' && (
            <div className="max-w-2xl animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-bold text-white mb-6">Parâmetros de Automação</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between bg-omni-dark p-4 rounded-lg border border-omni-border">
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Atribuição Automática (Auto-Assign)
                    </h4>
                    <p className="text-xs text-slate-500">
                      A IA distribui chamados baseada na carga de trabalho e skills.
                    </p>
                  </div>
                  <div
                    onClick={() =>
                      setLocalSettings({
                        ...localSettings,
                        autoAssignEnabled: !localSettings.autoAssignEnabled,
                      })
                    }
                    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${
                      localSettings.autoAssignEnabled ? 'bg-omni-cyan' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                        localSettings.autoAssignEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-omni-dark p-4 rounded-lg border border-omni-border">
                  <div>
                    <h4 className="text-sm font-bold text-white">Notificações Push</h4>
                    <p className="text-xs text-slate-500">
                      Alertas em tempo real para dispositivos móveis.
                    </p>
                  </div>
                  <div
                    onClick={() =>
                      setLocalSettings({
                        ...localSettings,
                        notificationsEnabled: !localSettings.notificationsEnabled,
                      })
                    }
                    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${
                      localSettings.notificationsEnabled ? 'bg-omni-cyan' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                        localSettings.notificationsEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    ></div>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-6 mt-6">
                  <h4 className="text-sm font-bold text-omni-cyan mb-2 flex items-center gap-2">
                    <Icons.Database className="w-4 h-4" /> Data Seeding (Developers)
                  </h4>
                  <p className="text-xs text-slate-500 mb-4">
                    Gera dados fictícios e popula o banco com TODAS as entidades (Ativos, Chamados,
                    Técnicos, Planos).
                  </p>
                  <button
                    onClick={async () => {
                      if (
                        !confirm(
                          'Isso irá restaurar os dados de demonstração oficiais. Ativos, Estoque e Histórico de Chamados serão recriados se não existirem. Continuar?'
                        )
                      )
                        return;
                      setSeeding(true);
                      try {
                        await seedDatabase();
                      } finally {
                        setSeeding(false);
                      }
                    }}
                    disabled={seeding}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded flex items-center gap-2 text-xs transition-all shadow-lg hover:shadow-green-900/40"
                  >
                    {seeding ? (
                      <Icons.Cpu className="w-4 h-4 animate-spin" />
                    ) : (
                      <Icons.Database className="w-4 h-4" />
                    )}
                    {seeding ? 'Processando...' : 'Restaurar Dados de Demonstração (BI)'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add Technician */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-omni-panel border border-omni-border rounded-xl w-full max-w-lg shadow-2xl animate-in zoom-in-95">
            <div className="p-6 border-b border-omni-border bg-omni-dark rounded-t-xl flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Cadastrar Novo Técnico</h3>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddTech} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  Nome Completo
                </label>
                <input
                  required
                  className="w-full bg-omni-dark border border-omni-border rounded px-3 py-2 text-white outline-none focus:border-omni-cyan"
                  value={newTech.name || ''}
                  onChange={e => setNewTech({ ...newTech, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  Cargo / Função
                </label>
                <input
                  required
                  className="w-full bg-omni-dark border border-omni-border rounded px-3 py-2 text-white outline-none focus:border-omni-cyan"
                  placeholder="Ex: Eletricista III"
                  value={newTech.role || ''}
                  onChange={e => setNewTech({ ...newTech, role: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">
                  Matriz de Competências (Skills)
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableSkills.map(skill => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-2 py-1 rounded text-xs border transition-all ${
                        newTech.skills?.includes(skill)
                          ? 'bg-omni-cyan text-omni-dark border-omni-cyan font-bold'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    Turno
                  </label>
                  <select
                    className="w-full bg-omni-dark border border-omni-border rounded px-3 py-2 text-white outline-none focus:border-omni-cyan"
                    value={newTech.shift}
                    onChange={e => setNewTech({ ...newTech, shift: e.target.value as any })}
                  >
                    <option value="morning">Manhã (06h-14h)</option>
                    <option value="afternoon">Tarde (14h-22h)</option>
                    <option value="night">Noite (22h-06h)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    Status
                  </label>
                  <select
                    className="w-full bg-omni-dark border border-omni-border rounded px-3 py-2 text-white outline-none focus:border-omni-cyan"
                    value={newTech.status}
                    onChange={e => setNewTech({ ...newTech, status: e.target.value as any })}
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                    <option value="on-leave">Férias/Licença</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-omni-border">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-omni-cyan hover:bg-cyan-400 text-omni-dark font-bold py-2 px-6 rounded transition-colors shadow-lg"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
