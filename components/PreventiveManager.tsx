import React, { useState } from 'react';
import { Icons } from './Icons';
import { PreventivePlan, Asset, MaintenanceTicket, ChecklistItem } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface PreventiveManagerProps {
  plans: PreventivePlan[];
  assets: Asset[];
  onAddPlan: (plan: PreventivePlan) => void;
  onUpdatePlan: (plan: PreventivePlan) => void;
  onDeletePlan?: (id: string) => void;
  onCreateTicket?: (ticket: MaintenanceTicket) => void;
}

export const PreventiveManager: React.FC<PreventiveManagerProps> = ({
  plans,
  assets,
  onAddPlan,
  onUpdatePlan,
  onDeletePlan,
  onCreateTicket,
}) => {
  // UI States
  const [selectedPlan, setSelectedPlan] = useState<PreventivePlan | null>(null); // Visualização (Detalhes)
  const [isFormOpen, setIsFormOpen] = useState(false); // Edição/Criação
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchTerm, setSearchTerm] = useState('');

  // Form States
  const [editingPlan, setEditingPlan] = useState<Partial<PreventivePlan>>({});
  const [currentTask, setCurrentTask] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Helper robusto para extrair JSON
  const extractJson = (text: string) => {
    try {
      const clean = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(clean);
    } catch (e) {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]);
      throw e;
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- LOGIC HELPERS ---

  const calculateNextDueDate = (plan: PreventivePlan): Date => {
    if (plan.nextExecution) return new Date(plan.nextExecution);

    const baseDate = plan.lastExecution ? new Date(plan.lastExecution) : new Date();
    const nextDate = new Date(baseDate);

    if (plan.frequencyType === 'time') {
      if (plan.frequencyUnit === 'days') nextDate.setDate(baseDate.getDate() + plan.frequencyValue);
      if (plan.frequencyUnit === 'months')
        nextDate.setMonth(baseDate.getMonth() + plan.frequencyValue);
      if (plan.frequencyUnit === 'years')
        nextDate.setFullYear(baseDate.getFullYear() + plan.frequencyValue);
    }
    return nextDate;
  };

  const getDaysUntilDue = (date: Date) => {
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // --- ACTIONS ---

  const openCreateForm = () => {
    setEditingPlan({
      frequencyType: 'time',
      frequencyValue: 7,
      frequencyUnit: 'days',
      tasks: [],
      status: 'active',
    });
    setIsFormOpen(true);
  };

  const openEditForm = (plan: PreventivePlan) => {
    setEditingPlan({ ...plan });
    setSelectedPlan(null); // Fecha o modal de detalhes
    setIsFormOpen(true); // Abre o modal de edição
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingPlan.id) {
      // UPDATE EXISTING
      onUpdatePlan(editingPlan as PreventivePlan);
      showToast('Plano atualizado com sucesso!', 'success');
    } else {
      // CREATE NEW
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + (editingPlan.frequencyValue || 7));

      const plan: PreventivePlan = {
        ...editingPlan,
        id: `PLN-${Math.floor(Math.random() * 10000)}`,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastExecution: undefined,
        nextExecution: nextDate.toISOString(),
        tasks:
          editingPlan.tasks && editingPlan.tasks.length > 0
            ? editingPlan.tasks
            : ['Verificação Geral (Padrão)'],
      } as PreventivePlan;

      onAddPlan(plan);
      showToast('Novo plano criado com sucesso!', 'success');
    }

    setIsFormOpen(false);
  };

  const handleDelete = () => {
    if (editingPlan.id && onDeletePlan) {
      if (confirm('Tem certeza que deseja excluir este plano?')) {
        onDeletePlan(editingPlan.id);
        setIsFormOpen(false);
        showToast('Plano excluído.', 'success');
      }
    }
  };

  const handleGenerateTicket = (e: React.MouseEvent, plan: PreventivePlan) => {
    e.stopPropagation();

    if (!onCreateTicket) {
      showToast('Erro: Função de criar ticket não disponível.', 'error');
      return;
    }

    const assetId = plan.assetIds?.[0];

    // MAP TASKS TO CHECKLIST ITEMS
    const checklistItems: ChecklistItem[] = plan.tasks.map((task, index) => ({
      id: `step-${index}-${Date.now()}`,
      text: task,
      checked: false,
      category: 'execution' as const, // Default category for preventive tasks
    }));

    const newTicket: MaintenanceTicket = {
      id: `TCK-PREV-${Math.floor(Math.random() * 100000)}`,
      title: `[Preventiva] ${plan.name}`,
      requester: 'Sistema (Agendador)',
      assetId: assetId || 'UNK',
      type: 'other',
      description: `ORDEM DE MANUTENÇÃO PREVENTIVA\n\nPlano: ${plan.name}\nFrequência: A cada ${plan.frequencyValue} ${plan.frequencyUnit}\n\nExecute o checklist anexado no Wizard.`,
      urgency: 'medium',
      status: 'open',
      createdAt: new Date().toISOString(),
      occurrenceDate: new Date().toISOString(),
      activities: [
        {
          id: Date.now().toString(),
          userId: 'system',
          userName: 'OmniGuard Scheduler',
          action: `Ordem gerada manualmente a partir do plano ${plan.id}`,
          timestamp: new Date().toISOString(),
          type: 'status_change',
        },
      ],
      checklist: checklistItems, // Passando o checklist estruturado
      usedParts: [],
      timeLogs: [],
      totalCost: 0,
    };

    onCreateTicket(newTicket);
    showToast(`Ordem ${newTicket.id} gerada com sucesso!`, 'success');
    if (selectedPlan) setSelectedPlan(null); // Fecha modal se estiver aberto
  };

  const addTask = () => {
    if (currentTask.trim()) {
      setEditingPlan({ ...editingPlan, tasks: [...(editingPlan.tasks || []), currentTask] });
      setCurrentTask('');
    }
  };

  const removeTask = (index: number) => {
    const updatedTasks = [...(editingPlan.tasks || [])];
    updatedTasks.splice(index, 1);
    setEditingPlan({ ...editingPlan, tasks: updatedTasks });
  };

  const generateAiChecklist = async () => {
    const assetId = editingPlan.assetIds?.[0];
    if (!assetId) {
      alert('Por favor, selecione um Equipamento Alvo primeiro.');
      return;
    }

    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    setIsGenerating(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `Atue como um Engenheiro de Manutenção Sênior.
        Crie um checklist detalhado de manutenção preventiva para: ${asset.name} (${asset.model}).
        Retorne APENAS um Array JSON de strings. Exemplo: ["Verificar x", "Limpar y"].
        Gere entre 5 a 8 tarefas críticas e técnicas.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;

      if (response.text()) {
        const tasks = extractJson(response.text());
        if (Array.isArray(tasks)) {
          setEditingPlan(prev => ({ ...prev, tasks: [...(prev.tasks || []), ...tasks] }));
        }
      }
    } catch (error: any) {
      console.error('Erro AI:', error);
      showToast(`Erro IA: ${error.message || 'Falha na API'}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredPlans = plans.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // --- RENDERERS ---

  const renderFrequencyBadge = (plan: PreventivePlan) => {
    const unit =
      plan.frequencyUnit === 'days'
        ? plan.frequencyValue === 7
          ? 'Semanal'
          : 'Dias'
        : plan.frequencyUnit === 'months'
        ? 'Mensal'
        : 'Anual';
    return (
      <span className="flex items-center gap-1 text-[10px] uppercase font-bold bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">
        <Icons.Clock className="w-3 h-3" />
        {unit === 'Dias' ? `${plan.frequencyValue} Dias` : unit}
      </span>
    );
  };

  return (
    <div className="flex-1 p-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col relative">
      {toast && (
        <div
          className={`absolute top-6 left-1/2 transform -translate-x-1/2 z-[70] px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-300 ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <Icons.Check className="w-5 h-5" />
          ) : (
            <Icons.Alert className="w-5 h-5" />
          )}
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}

      {/* HEADER & CONTROLS */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Icons.Calendar className="w-6 h-6 text-omni-cyan" /> Planejamento Preventivo (3.3)
          </h2>
          <p className="text-xs text-slate-400">
            Gerenciamento de Rotinas de Manutenção Recorrente
          </p>
        </div>
        <div className="flex gap-4">
          <div className="relative group">
            <Icons.Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar planos..."
              className="bg-omni-panel border border-omni-border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-omni-cyan outline-none w-64 shadow-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="bg-omni-panel border border-omni-border rounded-lg p-1 flex">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 ${
                viewMode === 'list'
                  ? 'bg-omni-dark text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icons.ListChecks className="w-4 h-4" /> Lista
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 ${
                viewMode === 'calendar'
                  ? 'bg-omni-dark text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icons.Calendar className="w-4 h-4" /> Calendário
            </button>
          </div>
          <button
            onClick={openCreateForm}
            className="bg-omni-cyan hover:bg-cyan-400 text-omni-dark font-bold py-2 px-6 rounded-lg text-sm flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
          >
            <Icons.Plus className="w-4 h-4" /> Criar Plano
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {viewMode === 'list' ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredPlans.map(plan => {
              const asset = assets.find(a => a.id === plan.assetIds?.[0]);
              const nextDue = calculateNextDueDate(plan);
              const daysLeft = getDaysUntilDue(nextDue);
              const isLate = daysLeft < 0;

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)} // OPEN DETAILS VIEW
                  className={`bg-omni-panel border border-omni-border rounded-xl p-0 flex items-stretch hover:border-slate-500 transition-all cursor-pointer group shadow-lg relative overflow-hidden`}
                >
                  {/* Status Stripe */}
                  <div
                    className={`w-1.5 ${
                      plan.status === 'paused' ? 'bg-slate-600' : 'bg-omni-cyan'
                    }`}
                  ></div>

                  <div className="p-5 flex-1 flex items-center justify-between">
                    {/* Main Info */}
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-black/40 rounded-lg flex items-center justify-center border border-white/5">
                        <Icons.ClipboardList className="w-6 h-6 text-slate-400 group-hover:text-omni-cyan transition-colors" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-white font-bold text-base">{plan.name}</h3>
                          {plan.status === 'paused' && (
                            <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded font-bold uppercase">
                              Pausado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                            <Icons.Box className="w-3.5 h-3.5" />
                            {asset ? asset.name : 'Ativo N/A'}
                          </span>
                          <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                          {renderFrequencyBadge(plan)}
                          <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                          <span className="flex items-center gap-1">
                            <Icons.ListChecks className="w-3.5 h-3.5" />
                            {plan.tasks.length} Tarefas
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Schedule Info */}
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                          Última Execução
                        </p>
                        <p className="text-xs font-mono text-slate-300">
                          {plan.lastExecution
                            ? new Date(plan.lastExecution).toLocaleDateString()
                            : 'Nunca'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                          Próxima Exec.
                        </p>
                        <div
                          className={`text-sm font-bold flex items-center justify-end gap-2 ${
                            isLate ? 'text-red-500' : 'text-omni-cyan'
                          }`}
                        >
                          <span className="font-mono">{nextDue.toLocaleDateString()}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              isLate
                                ? 'bg-red-500/10 border border-red-500/20'
                                : 'bg-omni-cyan/10 border border-omni-cyan/20'
                            }`}
                          >
                            {isLate ? `${Math.abs(daysLeft)} dias atrasado` : `Em ${daysLeft} dias`}
                          </span>
                        </div>
                      </div>

                      {/* Quick Action */}
                      <button
                        onClick={e => handleGenerateTicket(e, plan)}
                        className="ml-4 bg-white/5 hover:bg-purple-600 hover:text-white text-purple-400 border border-purple-500/30 p-2.5 rounded-lg transition-all shadow-lg hover:shadow-purple-600/20 group/btn"
                        title="Gerar O.S. Agora"
                      >
                        <Icons.Zap className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-4">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => (
              <div
                key={d}
                className="text-center text-xs font-bold text-slate-500 uppercase py-2 bg-omni-panel border border-omni-border rounded-t-lg"
              >
                {d}
              </div>
            ))}
            {Array.from({ length: 30 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() + i);
              const day = date.getDate();
              const dayPlans = plans.filter((_, idx) => (idx + day) % 5 === 0);

              return (
                <div
                  key={i}
                  className="bg-omni-panel/50 border border-omni-border h-32 rounded-lg p-2 flex flex-col gap-1 hover:bg-omni-panel transition-colors relative"
                >
                  <span className="text-xs font-bold text-slate-400 mb-1">{day}</span>
                  {dayPlans.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlan(p)}
                      className="text-[9px] bg-blue-500/10 text-blue-300 border-l-2 border-blue-500 px-1.5 py-1 rounded truncate cursor-pointer hover:bg-blue-500/20"
                    >
                      {p.name}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- 1. DETAILS MODAL (High-Fidelity - FIXED HEIGHT & SCROLLABLE CONTENT) --- */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-[#1e1e1e] border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
            {/* Modern Header (Fixed) */}
            <div className="p-8 pb-6 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-3xl font-display font-bold text-white tracking-tight">
                      {selectedPlan.name}
                    </h2>
                    {selectedPlan.status === 'active' ? (
                      <span className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-bold uppercase tracking-wider">
                        Ativo
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        Pausado
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 max-w-lg">{selectedPlan.description}</p>
                </div>
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Icons.Close className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
              {/* Info Cards Grid */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {/* Asset Card */}
                <div className="bg-black/20 border border-white/5 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-500 shrink-0">
                    <Icons.Box className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">
                      Ativo Alvo
                    </p>
                    <p className="text-sm font-bold text-white">
                      {assets.find(a => a.id === selectedPlan.assetIds?.[0])?.name || 'N/A'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {assets.find(a => a.id === selectedPlan.assetIds?.[0])?.code}
                    </p>
                  </div>
                </div>

                {/* Frequency Card */}
                <div className="bg-black/20 border border-white/5 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-500 shrink-0">
                    <Icons.Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">
                      Frequência
                    </p>
                    <p className="text-sm font-bold text-white">
                      A cada {selectedPlan.frequencyValue} {selectedPlan.frequencyUnit}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Tipo: {selectedPlan.frequencyType === 'time' ? 'Calendário' : 'Horímetro'}
                    </p>
                  </div>
                </div>

                {/* Next Due Card */}
                <div className="bg-black/20 border border-white/5 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20 text-green-500 shrink-0">
                    <Icons.Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">
                      Próxima Execução
                    </p>
                    <p className="text-sm font-bold text-omni-cyan font-mono">
                      {calculateNextDueDate(selectedPlan).toLocaleDateString()}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {getDaysUntilDue(calculateNextDueDate(selectedPlan))} dias restantes
                    </p>
                  </div>
                </div>
              </div>

              {/* Checklist Viewer */}
              <div className="mb-4">
                <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                  <Icons.ListChecks className="w-4 h-4" /> Procedimentos (Checklist)
                </h3>
                <div className="bg-black/20 border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
                  {selectedPlan.tasks.map((task, idx) => (
                    <div
                      key={idx}
                      className="px-5 py-4 flex items-center gap-4 text-sm text-slate-300 hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-xs font-mono text-slate-600 font-bold opacity-50">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      {task}
                    </div>
                  ))}
                  {selectedPlan.tasks.length === 0 && (
                    <div className="p-6 text-center text-slate-500 text-xs italic">
                      Nenhum procedimento cadastrado.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions (Fixed) */}
            <div className="p-6 border-t border-white/5 bg-black/20 flex justify-end gap-4 items-center shrink-0">
              <button
                onClick={() => openEditForm(selectedPlan)}
                className="text-slate-400 hover:text-white text-sm font-bold px-4 py-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                Editar Plano
              </button>
              <button
                onClick={e => handleGenerateTicket(e, selectedPlan)}
                className="bg-omni-cyan hover:bg-cyan-400 text-omni-dark font-bold py-3 px-8 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center gap-2 transition-all transform hover:scale-105"
              >
                <Icons.Zap className="w-4 h-4 fill-current" /> Gerar Ordem Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 2. CREATE/EDIT FORM MODAL (Triggered by 'Edit' in Details or 'New Plan' in Header) --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-omni-panel border border-omni-border rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-omni-border flex justify-between items-center sticky top-0 bg-omni-panel z-10">
              <h3 className="text-xl font-bold text-white">
                {editingPlan.id ? 'Editar Plano Preventivo' : 'Novo Plano Preventivo'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* ... Form content preserved ... */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  Nome do Plano
                </label>
                <input
                  required
                  className="w-full bg-omni-dark border border-omni-border rounded-lg px-3 py-2 text-white focus:border-omni-cyan outline-none transition-colors"
                  placeholder="Ex: Revisão Mensal Motor X"
                  value={editingPlan.name || ''}
                  onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  Equipamento Alvo
                </label>
                <select
                  required
                  className="w-full bg-omni-dark border border-omni-border rounded-lg px-3 py-2 text-white focus:border-omni-cyan outline-none transition-colors cursor-pointer"
                  value={editingPlan.assetIds?.[0] || ''}
                  onChange={e => setEditingPlan({ ...editingPlan, assetIds: [e.target.value] })}
                >
                  <option value="">Selecione...</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    Valor Frequência
                  </label>
                  <input
                    type="number"
                    className="w-full bg-omni-dark border border-omni-border rounded-lg px-3 py-2 text-white focus:border-omni-cyan outline-none"
                    value={editingPlan.frequencyValue}
                    onChange={e =>
                      setEditingPlan({ ...editingPlan, frequencyValue: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    Unidade
                  </label>
                  <select
                    className="w-full bg-omni-dark border border-omni-border rounded-lg px-3 py-2 text-white focus:border-omni-cyan outline-none"
                    value={editingPlan.frequencyUnit}
                    onChange={e =>
                      setEditingPlan({ ...editingPlan, frequencyUnit: e.target.value as any })
                    }
                  >
                    <option value="days">Dias</option>
                    <option value="months">Meses</option>
                    <option value="years">Anos</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    Duração Estimada (min)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-omni-dark border border-omni-border rounded-lg px-3 py-2 text-white focus:border-omni-cyan outline-none"
                    value={editingPlan.estimatedTime || 0}
                    onChange={e =>
                      setEditingPlan({ ...editingPlan, estimatedTime: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    Recursos (Separe por vírgula)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-omni-dark border border-omni-border rounded-lg px-3 py-2 text-white focus:border-omni-cyan outline-none"
                    placeholder="Ex: Alicate, Luvas, Chave 10mm"
                    value={editingPlan.requiredResources?.join(', ') || ''}
                    onChange={e =>
                      setEditingPlan({
                        ...editingPlan,
                        requiredResources: e.target.value
                          .split(',')
                          .map(s => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
              </div>

              {/* Status Control (Only visible when editing) */}
              {editingPlan.id && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                      Status do Plano
                    </label>
                    <select
                      className="w-full bg-omni-dark border border-omni-border rounded-lg px-3 py-2 text-white focus:border-omni-cyan outline-none"
                      value={editingPlan.status}
                      onChange={e =>
                        setEditingPlan({ ...editingPlan, status: e.target.value as any })
                      }
                    >
                      <option value="active">Ativo (Agendamento Automático)</option>
                      <option value="paused">Pausado (Inativo)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="autoGen"
                      className="w-4 h-4 rounded bg-omni-dark border-omni-border text-omni-cyan focus:ring-omni-cyan"
                      checked={editingPlan.autoGenerate !== false} // Default true
                      onChange={e =>
                        setEditingPlan({ ...editingPlan, autoGenerate: e.target.checked })
                      }
                    />
                    <label
                      htmlFor="autoGen"
                      className="text-sm text-slate-300 font-bold select-none cursor-pointer"
                    >
                      Gerar Tickets Automaticamente
                    </label>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  Descrição do Plano
                </label>
                <textarea
                  className="w-full bg-omni-dark border border-omni-border rounded-lg px-3 py-2 text-white focus:border-omni-cyan outline-none resize-none"
                  placeholder="Objetivo da manutenção..."
                  rows={3}
                  value={editingPlan.description || ''}
                  onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                />
              </div>

              <div className="bg-omni-dark/50 border border-omni-border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">
                    Checklist de Tarefas
                  </label>
                  <button
                    type="button"
                    onClick={generateAiChecklist}
                    disabled={isGenerating || !editingPlan.assetIds?.[0]}
                    className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold shadow-lg shadow-purple-900/20"
                  >
                    {isGenerating ? (
                      <Icons.Clock className="w-3 h-3 animate-spin" />
                    ) : (
                      <Icons.Sparkles className="w-3 h-3" />
                    )}
                    {isGenerating ? 'Gerando...' : 'Sugerir com IA'}
                  </button>
                </div>

                <div className="flex gap-2 mb-3">
                  <input
                    className="flex-1 bg-omni-dark border border-omni-border rounded-lg px-3 py-2 text-white text-sm focus:border-omni-cyan outline-none"
                    placeholder="Adicionar tarefa manual..."
                    value={currentTask}
                    onChange={e => setCurrentTask(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTask())}
                  />
                  <button
                    type="button"
                    onClick={addTask}
                    className="bg-slate-700 hover:bg-omni-cyan hover:text-omni-dark text-white p-2 rounded-lg transition-colors"
                  >
                    <Icons.Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                  {editingPlan.tasks &&
                    editingPlan.tasks.map((task, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center bg-omni-panel border border-omni-border px-3 py-2 rounded-lg text-sm text-slate-300"
                      >
                        <span className="line-clamp-1">
                          {index + 1}. {task}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeTask(index)}
                          className="text-slate-500 hover:text-red-500 transition-colors"
                        >
                          <Icons.Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  {(!editingPlan.tasks || editingPlan.tasks.length === 0) && (
                    <p className="text-xs text-slate-500 text-center italic py-4">
                      Nenhuma tarefa adicionada.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-omni-border">
                <div>
                  {editingPlan.id && onDeletePlan && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="text-red-500 hover:text-red-400 text-sm font-bold flex items-center gap-1"
                    >
                      <Icons.Trash className="w-4 h-4" /> Excluir
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white font-bold text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-omni-cyan hover:bg-cyan-400 text-omni-dark font-bold py-2 px-6 rounded-lg transition-colors shadow-lg shadow-cyan-500/20 text-sm"
                  >
                    {editingPlan.id ? 'Salvar Alterações' : 'Criar Plano'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
