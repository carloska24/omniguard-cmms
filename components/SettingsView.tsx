import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { Technician, SystemSettings, CurrentUser } from '../types';
import { useMaintenance } from '../context/MaintenanceContext';

export const SettingsView: React.FC = () => {
  const {
    technicians,
    settings,
    currentUser,
    addTechnician,
    updateTechnician,
    updateSettings,
    updateCurrentUser,

    seedDatabase,
  } = useMaintenance();

  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'general' | 'system'>('profile');

  // --- STATE PARA PERFIL (USUÁRIO LOGADO) ---
  const [profileForm, setProfileForm] = useState<CurrentUser>(currentUser);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // --- STATE PARA TÉCNICOS ---
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingTechId, setEditingTechId] = useState<string | null>(null); // Track editing
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null); // NEW: Track open menu
  const [newTech, setNewTech] = useState<Partial<Technician>>({
    status: 'active',
    shift: 'morning',
    skills: [],
  });
  const [techFilter, setTechFilter] = useState('Todas'); // Filtro de especialidade

  // --- STATE PARA CONFIGURAÇÕES ---
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);

  // --- STATE AUXILIAR ---
  const [cep, setCep] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);

  // Sync profile form when context changes
  useEffect(() => {
    setProfileForm(currentUser);
  }, [currentUser]);

  // Auto-search CEP
  useEffect(() => {
    if (cep.length === 8) {
      handleFetchCep();
    }
  }, [cep]);

  // --- HANDLERS: PERFIL ---
  const handleSaveProfile = () => {
    updateCurrentUser(profileForm);
    alert('Perfil atualizado com sucesso!');
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setProfileForm({ ...profileForm, avatar: url });
    }
  };

  // --- HANDLERS: CONFIGURAÇÕES GERAIS ---
  const handleSaveSettings = () => {
    updateSettings(localSettings);
    alert('Parâmetros do sistema aplicados globalmente!');
    alert('Parâmetros do sistema aplicados globalmente!');
  };

  const handleFetchCep = async () => {
    if (cep.length !== 8) {
      alert('Digite um CEP válido (8 números apenas).');
      return;
    }
    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (data.erro) {
        alert('CEP não encontrado!');
      } else {
        const address = `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`;
        setLocalSettings(prev => ({ ...prev, plantAddress: address }));
      }
    } catch (error) {
      alert('Erro ao buscar CEP.');
    } finally {
      setLoadingCep(false);
    }
  };

  // --- HANDLERS: TÉCNICOS ---
  const handleAddTech = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTech.name || !newTech.role) return;

    if (editingTechId) {
      // UPDATE EXISTING
      if (technicians.find(t => t.id === editingTechId)) {
        const updated: Technician = {
          ...technicians.find(t => t.id === editingTechId)!,
          name: newTech.name!,
          role: newTech.role!,
          email: newTech.email || '',
          phone: newTech.phone,
          status: newTech.status || 'active',
          skills: newTech.skills || [],
          shift: newTech.shift || 'morning',
        };
        updateTechnician(updated);
        alert('Técnico atualizado!');
      }
    } else {
      // CREATE NEW
      const tech: Technician = {
        id: Date.now().toString(),
        name: newTech.name!,
        role: newTech.role!,
        email: newTech.email || 'user@omni.ind',
        phone: newTech.phone,
        status: newTech.status || 'active',
        skills: newTech.skills || [],
        shift: newTech.shift || 'morning',
        efficiency: 85,
        avatar: `https://i.pravatar.cc/150?u=${Math.random()}`,
      };
      addTechnician(tech);
      alert('Técnico cadastrado!');
    }

    setIsAddUserOpen(false);
    setNewTech({ status: 'active', shift: 'morning', skills: [] });
    setEditingTechId(null);
  };

  const handleOpenEdit = (tech: Technician) => {
    setNewTech(tech);
    setEditingTechId(tech.id);
    setIsAddUserOpen(true);
  };

  const { sendWhatsAppNotification } = useMaintenance();

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
  const specialties = ['Todas', 'Mecânica', 'Elétrica', 'Automação', 'Gestão'];

  const getSkillColor = (skill: string) => {
    if (skill.includes('Elétrica') || skill.includes('NR10'))
      return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    if (skill.includes('Mecânica') || skill.includes('Hidráulica') || skill.includes('Solda'))
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (skill.includes('PLC') || skill.includes('Robótica') || skill.includes('Automação'))
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    return 'bg-slate-700 text-slate-300 border-slate-600';
  };

  const filteredTechnicians = technicians.filter(t => {
    if (techFilter === 'Todas') return true;
    // Lógica simples de filtro baseada na role ou skills
    const searchStr = (t.role + t.skills.join(' ')).toLowerCase();
    if (
      techFilter === 'Mecânica' &&
      (searchStr.includes('mec') || searchStr.includes('solda') || searchStr.includes('hidr'))
    )
      return true;
    if (techFilter === 'Elétrica' && (searchStr.includes('elét') || searchStr.includes('nr10')))
      return true;
    if (techFilter === 'Automação' && (searchStr.includes('plc') || searchStr.includes('robô')))
      return true;
    if (techFilter === 'Gestão' && (searchStr.includes('eng') || searchStr.includes('gest')))
      return true;
    return false;
  });

  return (
    <div className="flex flex-col h-full bg-[#050608] p-6 overflow-hidden">
      {/* Header Global da View */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Icons.Settings className="w-5 h-5 text-omni-cyan" />
            Hub Administrativo
          </h2>
          <p className="text-xs text-slate-400">Gerenciamento de Perfil, Equipes e Planta</p>
        </div>
        {activeTab !== 'team' && (
          <button
            onClick={activeTab === 'profile' ? handleSaveProfile : handleSaveSettings}
            className="bg-omni-cyan hover:bg-cyan-400 text-omni-dark font-bold py-2 px-6 rounded-lg text-sm flex items-center gap-2 transition-all shadow-lg shadow-cyan-900/20"
          >
            <Icons.Check className="w-4 h-4" />{' '}
            {activeTab === 'profile' ? 'Salvar Perfil' : 'Salvar Configurações'}
          </button>
        )}
      </div>

      {/* Layout Principal: Sidebar Local + Conteúdo */}
      <div className="flex-1 bg-omni-panel border border-omni-border rounded-xl flex overflow-hidden shadow-2xl">
        {/* Sidebar Local de Navegação */}
        <div className="w-64 bg-omni-dark border-r border-omni-border flex flex-col">
          <div className="p-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">
              Menu de Ajustes
            </span>
          </div>
          <nav className="flex-1 px-2 space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-all ${
                activeTab === 'profile'
                  ? 'bg-white/10 text-white shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div
                className={`p-1.5 rounded-md ${
                  activeTab === 'profile'
                    ? 'bg-omni-cyan text-omni-dark'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Icons.User className="w-4 h-4" />
              </div>{' '}
              Meu Perfil
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-all ${
                activeTab === 'team'
                  ? 'bg-white/10 text-white shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div
                className={`p-1.5 rounded-md ${
                  activeTab === 'team' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Icons.User className="w-4 h-4" />
              </div>{' '}
              Quadro de Técnicos
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-all ${
                activeTab === 'general'
                  ? 'bg-white/10 text-white shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div
                className={`p-1.5 rounded-md ${
                  activeTab === 'general'
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Icons.Factory className="w-4 h-4" />
              </div>{' '}
              Dados da Planta
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-all ${
                activeTab === 'system'
                  ? 'bg-white/10 text-white shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div
                className={`p-1.5 rounded-md ${
                  activeTab === 'system'
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Icons.Cpu className="w-4 h-4" />
              </div>{' '}
              Sistema
            </button>
          </nav>
          <div className="p-4 border-t border-omni-border">
            <div className="bg-slate-800/50 rounded p-3 text-[10px] text-slate-500 font-mono">
              <p>Build: 2024.05.12</p>
              <p>Server: US-EAST-1</p>
            </div>
          </div>
        </div>

        {/* Área de Conteúdo */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-grid-white/[0.02] relative">
          {/* --- TAB 1: MEU PERFIL (EDITION) --- */}
          {activeTab === 'profile' && (
            <div className="p-8 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-8 flex items-start gap-6">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full border-4 border-omni-cyan p-1 bg-omni-dark relative overflow-hidden">
                    <img
                      src={profileForm.avatar}
                      className="w-full h-full rounded-full object-cover"
                      alt="Profile"
                    />
                    <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                      <Icons.Camera className="w-8 h-8 text-white mb-1" />
                      <span className="text-[10px] text-white font-bold uppercase">
                        Alterar Foto
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                      />
                    </label>
                  </div>
                  <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-2 border-omni-dark rounded-full"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">{profileForm.name}</h3>
                  <p className="text-omni-cyan font-mono text-sm mb-4">
                    {profileForm.role} • ID: {profileForm.id}
                  </p>
                  <div className="flex gap-3">
                    <button
                      className="px-4 py-2 bg-slate-800 border border-slate-700 hover:border-slate-500 rounded text-xs font-bold text-white transition-colors"
                      onClick={() => setIsPasswordModalOpen(true)}
                    >
                      Alterar Senha
                    </button>
                    <button className="px-4 py-2 bg-red-900/20 border border-red-900/50 hover:bg-red-900/40 rounded text-xs font-bold text-red-400 transition-colors">
                      Sair de Todas as Sessões
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 bg-omni-dark border border-omni-border rounded-xl p-6">
                <div className="col-span-2">
                  <h4 className="text-sm font-bold text-white mb-4 border-b border-white/10 pb-2">
                    Informações Pessoais
                  </h4>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Nome Completo
                  </label>
                  <input
                    className="w-full bg-omni-panel border border-omni-border rounded-lg px-4 py-2.5 text-white focus:border-omni-cyan outline-none transition-all"
                    value={profileForm.name}
                    onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    E-mail Corporativo
                  </label>
                  <input
                    className="w-full bg-omni-panel border border-omni-border rounded-lg px-4 py-2.5 text-white focus:border-omni-cyan outline-none transition-all"
                    value={profileForm.email}
                    onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    WhatsApp / Telefone
                  </label>
                  <div className="relative">
                    <Icons.Phone className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      className="w-full bg-omni-panel border border-omni-border rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-omni-cyan outline-none transition-all"
                      placeholder="+55 (11) 99999-9999"
                      value={profileForm.phone || ''}
                      onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Cargo / Função
                  </label>
                  <select
                    className="w-full bg-omni-panel border border-omni-border rounded-lg px-4 py-2.5 text-white focus:border-omni-cyan outline-none transition-all"
                    value={profileForm.role}
                    onChange={e => setProfileForm({ ...profileForm, role: e.target.value })}
                  >
                    <option value="Gerente de Planta">Gerente de Planta</option>
                    <option value="Engenheiro Sênior">Engenheiro Sênior</option>
                    <option value="Técnico de Manutenção">Técnico de Manutenção</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="technician">Técnico (Padrão)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Departamento
                  </label>
                  <input
                    className="w-full bg-omni-panel border border-omni-border rounded-lg px-4 py-2.5 text-white focus:border-omni-cyan outline-none transition-all"
                    value={profileForm.department}
                    onChange={e => setProfileForm({ ...profileForm, department: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* --- TAB 2: QUADRO DE TÉCNICOS (IMPROVED) --- */}
          {activeTab === 'team' && (
            <div className="p-8 h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Quadro de Técnicos</h3>
                  <p className="text-xs text-slate-400">Gestão de Especialidades e Turnos</p>
                </div>
                <button
                  onClick={() => {
                    setEditingTechId(null);
                    setNewTech({ status: 'active', shift: 'morning', skills: [] });
                    setIsAddUserOpen(true);
                  }}
                  className="bg-omni-cyan hover:bg-cyan-400 text-omni-dark px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-900/20"
                >
                  <Icons.Plus className="w-4 h-4" /> Novo Técnico
                </button>
              </div>

              {/* Filters Bar */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
                {specialties.map(spec => (
                  <button
                    key={spec}
                    onClick={() => setTechFilter(spec)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                      techFilter === spec
                        ? 'bg-white text-black border-white'
                        : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto pb-10">
                {filteredTechnicians.map(tech => (
                  <div
                    key={tech.id}
                    className="bg-omni-dark border border-omni-border rounded-xl p-5 hover:border-slate-500 transition-all group relative shadow-lg hover:shadow-xl"
                  >
                    {/* Status Dot */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          tech.status === 'active'
                            ? 'bg-green-500 shadow-[0_0_5px_#22c55e]'
                            : 'bg-red-500 shadow-[0_0_5px_red]'
                        }`}
                      ></span>
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative">
                        <img
                          src={tech.avatar || 'https://i.pravatar.cc/150'}
                          className="w-16 h-16 rounded-xl border-2 border-slate-700 object-cover"
                          alt={tech.name}
                        />
                        <div className="absolute -bottom-2 -right-2 bg-slate-800 text-[10px] font-bold text-white px-1.5 py-0.5 rounded border border-slate-700">
                          {tech.efficiency}%
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base flex items-center gap-2">
                          {tech.name}
                          {tech.phone && (
                            <div className="flex items-center gap-1 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                              <Icons.Phone className="w-3 h-3 text-green-500" />
                              <span className="text-[10px] text-green-400 font-mono tracking-tighter">
                                Whats
                              </span>
                            </div>
                          )}
                        </h4>
                        <p className="text-xs text-omni-cyan font-mono uppercase tracking-tight mb-1">
                          {tech.role}
                        </p>
                        {tech.phone && (
                          <p className="text-[10px] text-slate-400 flex items-center gap-1.5 font-mono mb-1">
                            <Icons.Phone className="w-3 h-3 text-slate-500" />
                            {tech.phone}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-500 mt-1 capitalize">
                          Turno:{' '}
                          {tech.shift === 'morning'
                            ? 'Manhã'
                            : tech.shift === 'afternoon'
                            ? 'Tarde'
                            : 'Noite'}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-3">
                      <p className="text-[9px] text-slate-500 uppercase font-bold mb-2">
                        Especialidades
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {tech.skills.map(skill => (
                          <span
                            key={skill}
                            className={`text-[10px] px-2 py-0.5 rounded border font-medium ${getSkillColor(
                              skill
                            )}`}
                          >
                            {skill}
                          </span>
                        ))}
                        {tech.skills.length === 0 && (
                          <span className="text-[10px] text-slate-600 italic">
                            Sem especialidades
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions Menu (Speed Dial Style) */}
                    <div className="absolute bottom-4 right-4 z-20">
                      {/* Trigger Button */}
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === tech.id ? null : tech.id)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-lg ${
                          activeMenuId === tech.id
                            ? 'bg-omni-cyan text-omni-dark rotate-90 shadow-cyan-900/40'
                            : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <Icons.MoreHorizontal className="w-5 h-5" />
                      </button>

                        {/* Popover Menu */}
                        {activeMenuId === tech.id && (
                            <div className="absolute right-full bottom-0 mr-2 bg-omni-dark border border-omni-border rounded-xl shadow-2xl p-1.5 flex flex-row gap-2 animate-in slide-in-from-right-2 fade-in zoom-in-95 z-30">
                                
                                <div className="flex flex-row gap-2">
                                    {/* Whatsapp */}
                                    {tech.phone && (
                                        <button
                                            onClick={() => sendWhatsAppNotification(tech.id, { title: 'Contato Direto', asset: 'N/A', urgency: 'low', status: 'info' })}
                                            className="w-8 h-8 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/30 flex items-center justify-center transition-all group/btn relative"
                                            title="WhatsApp"
                                        >
                                            <Icons.MessageCircle className="w-4 h-4" />
                                            {/* Tooltip */}
                                            <span className="absolute bottom-full mb-2 bg-black/90 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover/btn:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                                                WhatsApp
                                            </span>
                                        </button>
                                    )}

                                    {/* Edit */}
                                    <button
                                        onClick={() => handleOpenEdit(tech)}
                                        className="w-8 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center transition-all group/btn relative"
                                        title="Editar"
                                    >
                                        <Icons.Edit className="w-4 h-4" />
                                        <span className="absolute bottom-full mb-2 bg-black/90 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover/btn:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                                            Editar
                                        </span>
                                    </button>

                                    {/* Toggle Status */}
                                    <button
                                        onClick={() => toggleTechStatus(tech)}
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all group/btn relative border ${
                                            tech.status === 'active' 
                                            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30' 
                                            : 'bg-green-500/10 hover:bg-green-500/20 text-green-500 border-green-500/30'
                                        }`}
                                        title={tech.status === 'active' ? 'Desativar' : 'Ativar'}
                                    >
                                        <Icons.Power className="w-4 h-4" />
                                        <span className="absolute bottom-full mb-2 bg-black/90 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover/btn:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                                            {tech.status === 'active' ? 'Desativar' : 'Ativar'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- TAB 3: DADOS DA PLANTA (IMAGE 2 REPLICA) --- */}
          {activeTab === 'general' && (
            <div className="p-8 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-bold text-white mb-6 border-b border-white/10 pb-4">
                Dados da Planta Industrial
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    Nome da Unidade
                  </label>
                  <input
                    className="w-full bg-omni-dark border border-omni-border rounded-lg px-4 py-3 text-white focus:border-omni-cyan outline-none font-medium"
                    value={localSettings.plantName}
                    onChange={e =>
                      setLocalSettings({ ...localSettings, plantName: e.target.value })
                    }
                  />
                </div>

                {/* CEP Integration */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    CEP (Busca Automática)
                  </label>
                  <div className="flex gap-2">
                    <input
                      className="w-40 bg-omni-dark border border-omni-border rounded-lg px-4 py-3 text-white focus:border-omni-cyan outline-none font-medium"
                      placeholder="00000000"
                      maxLength={8}
                      value={cep}
                      onChange={e => setCep(e.target.value.replace(/\D/g, ''))}
                    />
                    <button
                      onClick={handleFetchCep}
                      disabled={loadingCep}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-4 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {loadingCep ? (
                        <Icons.RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icons.Search className="w-4 h-4" />
                      )}
                      Buscar Endereço
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Digite o CEP para preencher o endereço automaticamente.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    Endereço Físico
                  </label>
                  <div className="relative">
                    <Icons.MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      className="w-full bg-omni-dark border border-omni-border rounded-lg pl-10 pr-4 py-3 text-white focus:border-omni-cyan outline-none text-sm"
                      value={localSettings.plantAddress || ''}
                      onChange={e =>
                        setLocalSettings({ ...localSettings, plantAddress: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                      Capacidade Instalada
                    </label>
                    <div className="relative">
                      <Icons.Factory className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                      <input
                        className="w-full bg-omni-dark border border-omni-border rounded-lg pl-10 pr-4 py-3 text-white focus:border-omni-cyan outline-none text-sm"
                        value={localSettings.plantCapacity || ''}
                        onChange={e =>
                          setLocalSettings({ ...localSettings, plantCapacity: e.target.value })
                        }
                      />
                    </div>
                  </div>
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
                </div>

                <div className="grid grid-cols-2 gap-6">
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
                  <div className="flex items-end">
                    <div className="text-xs text-slate-500 p-2 bg-slate-800/50 rounded border border-slate-700 w-full">
                      <Icons.AlertCircle className="w-3 h-3 inline mr-1 text-yellow-500" />
                      Alterações aqui afetam relatórios financeiros.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- TAB 4: SISTEMA (IMAGE 3 REPLICA) --- */}
          {activeTab === 'system' && (
            <div className="p-8 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-bold text-white mb-6 border-b border-white/10 pb-4">
                Parâmetros do Sistema
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between bg-omni-dark p-5 rounded-xl border border-omni-border shadow-sm">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Icons.Bot className="w-4 h-4 text-purple-500" /> Atribuição Automática
                      (Auto-Assign)
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md">
                      A IA distribui chamados baseada na carga de trabalho e skills dos técnicos
                      disponíveis.
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

                <div className="flex items-center justify-between bg-omni-dark p-5 rounded-xl border border-omni-border shadow-sm">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Icons.Bell className="w-4 h-4 text-blue-500" /> Notificações Push Globais
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Enviar alertas em tempo real para dispositivos móveis de toda a equipe.
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

                <div className="flex items-center justify-between bg-omni-dark p-5 rounded-xl border border-omni-border shadow-sm border-l-4 border-l-red-500">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Icons.AlertTriangle className="w-4 h-4 text-red-500" /> Modo Manutenção do
                      Sistema
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Bloqueia acesso a novos chamados para atualizações de servidor.
                    </p>
                  </div>
                  <div
                    onClick={() =>
                      setLocalSettings({
                        ...localSettings,
                        maintenanceMode: !localSettings.maintenanceMode,
                      })
                    }
                    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${
                      localSettings.maintenanceMode ? 'bg-red-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                        localSettings.maintenanceMode ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    ></div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">
                    Zona de Perigo
                  </h4>
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            'Tem certeza? Isso resetará todos os dados para o padrão de demonstração.'
                          )
                        ) {
                          seedDatabase();
                        }
                      }}
                      className="text-xs bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/50 px-4 py-2 rounded font-bold transition-colors"
                    >
                      Restaurar Dados de Fábrica (Reset)
                    </button>
                    <button className="text-xs bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/50 px-4 py-2 rounded font-bold transition-colors">
                      Arquivar Logs Antigos
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add Technician */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in-95">
          <div className="bg-omni-panel border border-omni-border rounded-xl w-full max-w-lg shadow-2xl flex flex-col">
            <div className="p-6 border-b border-omni-border bg-omni-dark rounded-t-xl flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">
                {editingTechId ? 'Editar Técnico' : 'Cadastrar Novo Técnico'}
              </h3>
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
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  WhatsApp / Contato
                </label>
                <div className="relative">
                  <Icons.Phone className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    className="w-full bg-omni-dark border border-omni-border rounded px-3 py-2 pl-10 text-white outline-none focus:border-omni-cyan"
                    placeholder="+55 (11) 99999-9999"
                    value={newTech.phone || ''}
                    onChange={e => setNewTech({ ...newTech, phone: e.target.value })}
                  />
                </div>
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

      {/* Modal: Password Change Simulation */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in-95">
          <div className="bg-omni-panel border border-omni-border rounded-xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Alterar Senha</h3>
            <div className="space-y-3 mb-6">
              <input
                type="password"
                placeholder="Senha Atual"
                className="w-full bg-omni-dark border border-omni-border rounded p-2 text-white text-sm"
              />
              <input
                type="password"
                placeholder="Nova Senha"
                className="w-full bg-omni-dark border border-omni-border rounded p-2 text-white text-sm"
              />
              <input
                type="password"
                placeholder="Confirmar Nova Senha"
                className="w-full bg-omni-dark border border-omni-border rounded p-2 text-white text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 text-sm px-3 py-2 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  alert('Senha alterada!');
                }}
                className="bg-omni-cyan text-omni-dark text-sm font-bold px-4 py-2 rounded"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
