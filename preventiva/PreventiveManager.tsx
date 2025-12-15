
import React, { useState } from 'react';
import { Icons } from './Icons';
import { PreventivePlan, Asset, MaintenanceTicket, ChecklistItem } from '../types';
import { GoogleGenAI } from "@google/genai";

interface PreventiveManagerProps {
  plans: PreventivePlan[];
  assets: Asset[];
  onAddPlan: (plan: PreventivePlan) => void;
  onUpdatePlan: (plan: PreventivePlan) => void;
  onCreateTicket?: (ticket: MaintenanceTicket) => void; 
}

export const PreventiveManager: React.FC<PreventiveManagerProps> = ({ plans, assets, onAddPlan, onUpdatePlan, onCreateTicket }) => {
  // UI States
  const [selectedPlan, setSelectedPlan] = useState<PreventivePlan | null>(null); // Visualização (Detalhes)
  const [isFormOpen, setIsFormOpen] = useState(false); // Edição/Criação
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'calendar'>('table'); // UPDATED VIEW MODES
  const [searchTerm, setSearchTerm] = useState('');

  // Form States
  const [editingPlan, setEditingPlan] = useState<Partial<PreventivePlan>>({});
  const [currentTask, setCurrentTask] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Feedback
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

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
          if (plan.frequencyUnit === 'months') nextDate.setMonth(baseDate.getMonth() + plan.frequencyValue);
          if (plan.frequencyUnit === 'years') nextDate.setFullYear(baseDate.getFullYear() + plan.frequencyValue);
      }
      return nextDate;
  };

  const getDaysUntilDue = (date: Date) => {
      const today = new Date();
      const diffTime = date.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
  };

  const getUrgencyColor = (days: number) => {
      if (days < 0) return 'text-red-500 border-red-500/50 bg-red-500/10'; // Atrasado
      if (days <= 3) return 'text-orange-500 border-orange-500/50 bg-orange-500/10'; // Crítico
      if (days <= 7) return 'text-yellow-500 border-yellow-500/50 bg-yellow-500/10'; // Atenção
      return 'text-omni-cyan border-omni-cyan/50 bg-omni-cyan/10'; // OK
  };

  const getUrgencyStatus = (days: number) => {
      if (days < 0) return { label: 'ATRASADO', color: 'bg-red-500' };
      if (days <= 3) return { label: 'URGENTE', color: 'bg-orange-500' };
      if (days <= 7) return { label: 'PRÓXIMO', color: 'bg-yellow-500' };
      return { label: 'EM DIA', color: 'bg-green-500' };
  };

  // --- ACTIONS ---

  const openCreateForm = () => {
      setEditingPlan({ frequencyType: 'time', frequencyValue: 7, frequencyUnit: 'days', tasks: [], status: 'active' });
      setIsFormOpen(true);
  };

  const openEditForm = (plan: PreventivePlan) => {
      setEditingPlan({ ...plan });
      setSelectedPlan(null); // Fecha o modal de detalhes
      setIsFormOpen(true);   // Abre o modal de edição
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
            tasks: editingPlan.tasks && editingPlan.tasks.length > 0 ? editingPlan.tasks : ['Verificação Geral (Padrão)']
        } as PreventivePlan;
        
        onAddPlan(plan);
        showToast('Novo plano criado com sucesso!', 'success');
    }
    
    setIsFormOpen(false);
  };

  const handleGenerateTicket = (e: React.MouseEvent, plan: PreventivePlan) => {
      e.stopPropagation();

      if(!onCreateTicket) {
          showToast('Erro: Função de criar ticket não disponível.', 'error');
          return;
      }

      const assetId = plan.assetIds?.[0];
      
      // MAP TASKS TO CHECKLIST ITEMS
      const checklistItems: ChecklistItem[] = plan.tasks.map((task, index) => ({
          id: `step-${index}-${Date.now()}`,
          text: task,
          checked: false,
          category: 'execution' // Default category for preventive tasks
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
          activities: [{
              id: Date.now().toString(),
              userId: 'system',
              userName: 'OmniGuard Scheduler',
              action: `Ordem gerada manualmente a partir do plano ${plan.id}`,
              timestamp: new Date().toISOString(),
              type: 'status_change'
          }],
          checklist: checklistItems, // Passando o checklist estruturado
          usedParts: [],
          timeLogs: [],
          totalCost: 0
      };

      onCreateTicket(newTicket);
      showToast(`Ordem ${newTicket.id} gerada com sucesso!`, 'success');
      if (selectedPlan) setSelectedPlan(null); // Fecha modal se estiver aberto
  };

  const addTask = () => {
      if(currentTask.trim()) {
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
        alert("Por favor, selecione um Equipamento Alvo primeiro.");
        return;
    }

    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    setIsGenerating(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Atue como um Engenheiro de Manutenção Sênior.
        Crie um checklist detalhado de manutenção preventiva para: ${asset.name} (${asset.model}).
        Retorne APENAS um Array JSON de strings. Exemplo: ["Verificar x", "Limpar y"].
        Gere entre 5 a 8 tarefas críticas e técnicas.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        if (response.text) {
            const tasks = JSON.parse(response.text);
            if (Array.isArray(tasks)) {
                setEditingPlan(prev => ({ ...prev, tasks: [...(prev.tasks || []), ...tasks] }));
            }
        }
    } catch (error) {
        showToast('Erro ao gerar checklist com IA.', 'error');
    } finally {
        setIsGenerating(false);
    }
  };

  const filteredPlans = plans.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // --- RENDERERS ---

  const renderFrequencyBadge = (plan: PreventivePlan) => {
      const unit = plan.frequencyUnit === 'days' ? (plan.frequencyValue === 7 ? 'Semanal' : 'Dias') : plan.frequencyUnit === 'months' ? 'Mensal' : 'Anual';
      return (
          <span className="flex items-center gap-1 text-[10px] uppercase font-bold bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">
              <Icons.Clock className="w-3 h-3" />
              {unit === 'Dias' ? `${plan.frequencyValue} Dias` : unit}
          </span>
      );
  };

  // 1. TABLE VIEW RENDERER
  const renderTableView = () => (
      <div className="flex-1 bg-omni-panel border border-omni-border rounded-xl overflow-hidden flex flex-col shadow-2xl relative">
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-400">
                  <thead className="bg-omni-dark text-xs uppercase font-bold text-slate-300">
                      <tr>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Plano Preventivo</th>
                          <th className="px-6 py-4">Ativo Alvo</th>
                          <th className="px-6 py-4">Frequência</th>
                          <th className="px-6 py-4">Próxima Exec.</th>
                          <th className="px-6 py-4">Tarefas</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-omni-border">
                      {filteredPlans.map(plan => {
                          const asset = assets.find(a => a.id === plan.assetIds?.[0]);
                          const nextDue = calculateNextDueDate(plan);
                          const daysLeft = getDaysUntilDue(nextDue);
                          const urgency = getUrgencyStatus(daysLeft);

                          return (
                              <tr key={plan.id} onClick={() => setSelectedPlan(plan)} className="hover:bg-white/5 transition-colors group cursor-pointer border-l-4 border-l-transparent hover:border-l-omni-cyan">
                                  <td className="px-6 py-4">
                                      <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${urgency.color} text-black`}>
                                          {urgency.label}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 font-bold text-white">
                                      {plan.name}
                                      <span className="block text-[10px] font-normal text-slate-500 mt-0.5">{plan.id}</span>
                                  </td>
                                  <td className="px-6 py-4 flex items-center gap-2">
                                      <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 overflow-hidden">
                                          <img src={asset?.image} className="w-full h-full object-cover" />
                                      </div>
                                      <div>
                                          <span className="block text-xs font-bold text-slate-300">{asset?.name || 'N/A'}</span>
                                          <span className="text-[10px] font-mono text-slate-500">{asset?.code}</span>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4">{renderFrequencyBadge(plan)}</td>
                                  <td className="px-6 py-4">
                                      <span className={`font-mono font-bold ${daysLeft < 0 ? 'text-red-500' : 'text-slate-300'}`}>
                                          {nextDue.toLocaleDateString()}
                                      </span>
                                      <span className="block text-[10px] text-slate-500">{daysLeft} dias</span>
                                  </td>
                                  <td className="px-6 py-4 text-xs">
                                      <span className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded border border-white/5 w-fit">
                                          <Icons.ListChecks className="w-3 h-3" /> {plan.tasks.length}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <button 
                                          onClick={(e) => handleGenerateTicket(e, plan)}
                                          className="text-slate-400 hover:text-omni-cyan hover:bg-omni-cyan/10 p-2 rounded-lg transition-all"
                                          title="Gerar Ordem"
                                      >
                                          <Icons.Zap className="w-4 h-4" />
                                      </button>
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      </div>
  );

  // 2. GRID VIEW RENDERER (Rich Cards)
  const renderGridView = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPlans.map(plan => {
              const asset = assets.find(a => a.id === plan.assetIds?.[0]);
              const nextDue = calculateNextDueDate(plan);
              const daysLeft = getDaysUntilDue(nextDue);
              const urgency = getUrgencyStatus(daysLeft);
              const frequencyPercent = Math.min(100, Math.max(0, (1 - (daysLeft / plan.frequencyValue)) * 100));

              return (
                  <div 
                      key={plan.id} 
                      onClick={() => setSelectedPlan(plan)}
                      className="group bg-omni-dark border border-omni-border hover:border-omni-cyan/50 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] hover:-translate-y-1 relative flex flex-col"
                  >
                      {/* Card Header (Image) */}
                      <div className="h-32 relative overflow-hidden bg-slate-900">
                          <img src={asset?.image} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" alt={asset?.name} />
                          <div className="absolute inset-0 bg-gradient-to-t from-omni-dark via-transparent to-transparent opacity-90"></div>
                          
                          <div className="absolute top-3 right-3">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase shadow-lg border ${urgency.color} text-black border-transparent`}>
                                  {urgency.label}
                              </span>
                          </div>
                          
                          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                              <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-black/50 backdrop-blur-sm rounded border border-white/10 text-omni-cyan">
                                      <Icons.Calendar className="w-4 h-4" />
                                  </div>
                                  <div>
                                      <span className="text-[10px] text-slate-400 block font-mono uppercase">Próxima</span>
                                      <span className="text-sm font-bold text-white">{nextDue.toLocaleDateString()}</span>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-5 flex-1 flex flex-col">
                          <h3 className="text-lg font-bold text-white leading-tight mb-1 line-clamp-2 group-hover:text-omni-cyan transition-colors">{plan.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                              <Icons.Box className="w-3 h-3" />
                              <span className="truncate">{asset?.name || 'Ativo N/A'}</span>
                          </div>

                          <div className="mt-auto space-y-3">
                              {/* Status Grid */}
                              <div className="grid grid-cols-2 gap-2">
                                  <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                                      <span className="text-[9px] text-slate-500 uppercase block">Frequência</span>
                                      <span className="text-xs font-bold text-white flex items-center gap-1">
                                          <Icons.Clock className="w-3 h-3 text-purple-400"/> {plan.frequencyValue} {plan.frequencyUnit}
                                      </span>
                                  </div>
                                  <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                                      <span className="text-[9px] text-slate-500 uppercase block">Checklist</span>
                                      <span className="text-xs font-bold text-white flex items-center gap-1">
                                          <Icons.ListChecks className="w-3 h-3 text-blue-400"/> {plan.tasks.length} Itens
                                      </span>
                                  </div>
                              </div>

                              {/* Action Button */}
                              <button 
                                  onClick={(e) => handleGenerateTicket(e, plan)}
                                  className="w-full py-2 bg-white/5 hover:bg-omni-cyan hover:text-omni-dark border border-white/10 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 group/btn"
                              >
                                  <Icons.Zap className="w-3 h-3 group-hover/btn:fill-current" /> Gerar Ordem Agora
                              </button>
                          </div>
                      </div>
                      
                      {/* Progress Line at Bottom */}
                      <div className="h-1 w-full bg-slate-800">
                          <div 
                              className={`h-full ${daysLeft < 0 ? 'bg-red-500' : 'bg-omni-cyan'} transition-all duration-1000`} 
                              style={{ width: `${frequencyPercent}%` }}
                          ></div>
                      </div>
                  </div>
              );
          })}
      </div>
  );

  // 3. CALENDAR VIEW RENDERER (Existing logic updated visually)
  const renderCalendarView = () => (
      <div className="flex-1 bg-omni-panel border border-omni-border rounded-xl p-4 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-7 gap-4">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => (
                  <div key={d} className="text-center text-xs font-bold text-slate-500 uppercase py-2 bg-omni-dark border border-omni-border rounded-lg mb-2">{d}</div>
              ))}
              {Array.from({length: 35}, (_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() + i); 
                  const day = date.getDate();
                  // Mock simple logic to distribute plans
                  const dayPlans = plans.filter((_, idx) => (idx + day) % 7 === 0); 

                  return (
                    <div key={i} className="bg-slate-900/50 border border-white/5 min-h-[120px] rounded-xl p-2 flex flex-col gap-1 hover:bg-slate-800 transition-colors relative group">
                        <span className={`text-xs font-bold mb-1 ${i === 0 ? 'text-omni-cyan' : 'text-slate-400'}`}>
                            {day} {i === 0 && '(Hoje)'}
                        </span>
                        {dayPlans.map(p => (
                            <div 
                                key={p.id} 
                                onClick={() => setSelectedPlan(p)} 
                                className="text-[9px] bg-blue-500/10 text-blue-300 border-l-2 border-blue-500 px-2 py-1.5 rounded truncate cursor-pointer hover:bg-blue-500/20 hover:text-white transition-colors shadow-sm"
                            >
                                {p.name}
                            </div>
                        ))}
                        {/* Add Button on Hover */}
                        <button className="absolute bottom-2 right-2 p-1 bg-omni-cyan text-omni-dark rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            <Icons.Plus className="w-3 h-3" />
                        </button>
                    </div>
                  )
              })}
          </div>
      </div>
  );

  return (
    <div className="flex-1 p-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col relative">
       {toast && (
           <div className={`absolute top-6 left-1/2 transform -translate-x-1/2 z-[70] px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-300 ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
               {toast.type === 'success' ? <Icons.Check className="w-5 h-5" /> : <Icons.Alert className="w-5 h-5" />}
               <span className="font-bold text-sm">{toast.message}</span>
           </div>
       )}

       {/* HEADER & CONTROLS */}
       <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Icons.Calendar className="w-6 h-6 text-omni-cyan" /> Planejamento Preventivo (3.3)
            </h2>
            <p className="text-xs text-slate-400">Gerenciamento de Rotinas de Manutenção Recorrente</p>
        </div>
        <div className="flex gap-4">
            <div className="relative group">
                <Icons.Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input 
                    type="text" 
                    placeholder="Buscar planos..." 
                    className="bg-omni-panel border border-omni-border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-omni-cyan outline-none w-64 shadow-sm transition-all focus:w-72"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            {/* VIEW SELECTOR */}
            <div className="bg-omni-panel border border-omni-border rounded-lg p-1 flex">
                <button 
                    onClick={() => setViewMode('table')} 
                    className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    title="Lista Detalhada"
                >
                    <Icons.List className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => setViewMode('grid')} 
                    className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    title="Grade de Cartões"
                >
                    <Icons.LayoutGrid className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => setViewMode('calendar')} 
                    className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    title="Calendário"
                >
                    <Icons.Calendar className="w-4 h-4" />
                </button>
            </div>

            <button onClick={openCreateForm} className="bg-omni-cyan hover:bg-cyan-400 text-omni-dark font-bold py-2 px-6 rounded-lg text-sm flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 transform hover:-translate-y-0.5">
                <Icons.Plus className="w-4 h-4" /> Criar Plano
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-6 pr-2">
          {viewMode === 'table' && renderTableView()}
          {viewMode === 'grid' && renderGridView()}
          {viewMode === 'calendar' && renderCalendarView()}
      </div>

       {/* --- 1. DETAILS MODAL (High-Fidelity) --- */}
       {selectedPlan && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
               <div className="bg-[#1e1e1e] border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
                   
                   {/* Modern Header (Fixed) */}
                   <div className="p-8 pb-6 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent shrink-0">
                       <div className="flex justify-between items-start">
                           <div>
                               <div className="flex items-center gap-3 mb-2">
                                   <h2 className="text-3xl font-display font-bold text-white tracking-tight">{selectedPlan.name}</h2>
                                   {selectedPlan.status === 'active' ? (
                                       <span className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-bold uppercase tracking-wider">Ativo</span>
                                   ) : (
                                       <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-wider">Pausado</span>
                                   )}
                               </div>
                               <p className="text-sm text-slate-400 max-w-lg">{selectedPlan.description}</p>
                           </div>
                           <button onClick={() => setSelectedPlan(null)} className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"><Icons.Close className="w-5 h-5"/></button>
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
                                   <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Ativo Alvo</p>
                                   <p className="text-sm font-bold text-white">{assets.find(a => a.id === selectedPlan.assetIds?.[0])?.name || 'N/A'}</p>
                                   <p className="text-[10px] text-slate-400 font-mono">{assets.find(a => a.id === selectedPlan.assetIds?.[0])?.code}</p>
                               </div>
                           </div>

                           {/* Frequency Card */}
                           <div className="bg-black/20 border border-white/5 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group">
                               <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                               <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-500 shrink-0">
                                   <Icons.Clock className="w-6 h-6" />
                               </div>
                               <div>
                                   <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Frequência</p>
                                   <p className="text-sm font-bold text-white">A cada {selectedPlan.frequencyValue} {selectedPlan.frequencyUnit}</p>
                                   <p className="text-[10px] text-slate-400">Tipo: {selectedPlan.frequencyType === 'time' ? 'Calendário' : 'Horímetro'}</p>
                               </div>
                           </div>

                           {/* Next Due Card */}
                           <div className="bg-black/20 border border-white/5 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group">
                               <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                               <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20 text-green-500 shrink-0">
                                   <Icons.Calendar className="w-6 h-6" />
                               </div>
                               <div>
                                   <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Próxima Execução</p>
                                   <p className="text-sm font-bold text-omni-cyan font-mono">{calculateNextDueDate(selectedPlan).toLocaleDateString()}</p>
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
                                   <div key={idx} className="px-5 py-4 flex items-center gap-4 text-sm text-slate-300 hover:bg-white/[0.02] transition-colors">
                                       <span className="text-xs font-mono text-slate-600 font-bold opacity-50">{String(idx + 1).padStart(2, '0')}</span>
                                       {task}
                                   </div>
                               ))}
                               {selectedPlan.tasks.length === 0 && (
                                   <div className="p-6 text-center text-slate-500 text-xs italic">Nenhum procedimento cadastrado.</div>
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
                            onClick={(e) => handleGenerateTicket(e, selectedPlan)}
                            className="bg-omni-cyan hover:bg-cyan-400 text-omni-dark font-bold py-3 px-8 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center gap-2 transition-all transform hover:scale-105"
                       >
                           <Icons.Zap className="w-4 h-4 fill-current" /> Gerar Ordem Agora
                       </button>
                   </div>

               </div>
           </div>
       )}

       {/* --- 2. CREATE/EDIT FORM MODAL (Preserved logic, fits new UI) --- */}
       {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-omni-panel border border-omni-border rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-omni-border flex justify-between items-center sticky top-0 bg-omni-panel z-10">
                    <h3 className="text-xl font-bold text-white">{editingPlan.id ? 'Editar Plano Preventivo' : 'Novo Plano Preventivo'}</h3>
                    <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white"><Icons.Close className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSave} className="p-6 space-y-4">
                    {/* ... Form content preserved ... */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Nome do Plano</label>
                        <input required className="w-full bg-omni-dark border border-omni-border rounded-lg px-3 py-2 text-white focus:border-omni-cyan outline-none transition-colors" 
                            placeholder="Ex: Revisão Mensal Motor X"
                            value={editingPlan.name || ''}
                            onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Equipamento Alvo</label>
                        <select required className="w-full bg-omni-dark border border-omni-border rounded-lg px-3 py-2 text-white focus:border-omni-cyan outline-none transition-colors cursor-pointer"
                            value={editingPlan.assetIds?.[0] || ''}
                            onChange={e => setEditingPlan({...editingPlan, assetIds: [e.target.value]})}>
                            <option value="">Selecione...</option>
                            {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Valor Frequência</label>
                            <input type="number" className="w-full bg-omni-dark border border-omni-border rounded-lg px-3 py-2 text-white focus:border-omni-cyan outline-none"
                                    value={editingPlan.frequencyValue} onChange={e => setEditingPlan({...editingPlan, frequencyValue: parseInt(e.target.value)})} />
                         </div>
                         <div>
                            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Unidade</label>
                            <select className="w-full bg-omni-dark border border-omni-border rounded-lg px-3 py-2 text-white focus:border-omni-cyan outline-none"
                                    value={editingPlan.frequencyUnit}
                                    onChange={e => setEditingPlan({...editingPlan, frequencyUnit: e.target.value as any})}>
                                    <option value="days">Dias</option>
                                    <option value="months">Meses</option>
                                    <option value="years">Anos</option>
                            </select>
                         </div>
                    </div>
                    
                    {/* Status Control (Only visible when editing) */}
                    {editingPlan.id && (
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Status do Plano</label>
                            <select className="w-full bg-omni-dark border border-omni-border rounded-lg px-3 py-2 text-white focus:border-omni-cyan outline-none"
                                value={editingPlan.status}
                                onChange={e => setEditingPlan({...editingPlan, status: e.target.value as any})}>
                                <option value="active">Ativo (Agendamento Automático)</option>
                                <option value="paused">Pausado (Inativo)</option>
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Descrição do Plano</label>
                        <textarea className="w-full bg-omni-dark border border-omni-border rounded-lg px-3 py-2 text-white focus:border-omni-cyan outline-none resize-none" 
                            placeholder="Objetivo da manutenção..." rows={3}
                            value={editingPlan.description || ''}
                            onChange={e => setEditingPlan({...editingPlan, description: e.target.value})} />
                    </div>

                    <div className="bg-omni-dark/50 border border-omni-border rounded-lg p-4">
                         <div className="flex justify-between items-center mb-2">
                             <label className="text-xs font-bold text-slate-400 uppercase">Checklist de Tarefas</label>
                             <button 
                                type="button" 
                                onClick={generateAiChecklist}
                                disabled={isGenerating || !editingPlan.assetIds?.[0]}
                                className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold shadow-lg shadow-purple-900/20"
                             >
                                 {isGenerating ? <Icons.Clock className="w-3 h-3 animate-spin" /> : <Icons.Sparkles className="w-3 h-3" />}
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
                             <button type="button" onClick={addTask} className="bg-slate-700 hover:bg-omni-cyan hover:text-omni-dark text-white p-2 rounded-lg transition-colors">
                                 <Icons.Plus className="w-5 h-5" />
                             </button>
                         </div>
                         <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                             {editingPlan.tasks && editingPlan.tasks.map((task, index) => (
                                 <div key={index} className="flex justify-between items-center bg-omni-panel border border-omni-border px-3 py-2 rounded-lg text-sm text-slate-300">
                                     <span className="line-clamp-1">{index + 1}. {task}</span>
                                     <button type="button" onClick={() => removeTask(index)} className="text-slate-500 hover:text-red-500 transition-colors">
                                         <Icons.Trash className="w-4 h-4" />
                                     </button>
                                 </div>
                             ))}
                             {(!editingPlan.tasks || editingPlan.tasks.length === 0) && (
                                 <p className="text-xs text-slate-500 text-center italic py-4">Nenhuma tarefa adicionada.</p>
                             )}
                         </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-omni-border">
                        <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white font-bold text-sm">Cancelar</button>
                        <button type="submit" className="bg-omni-cyan hover:bg-cyan-400 text-omni-dark font-bold py-2 px-6 rounded-lg transition-colors shadow-lg shadow-cyan-500/20 text-sm">
                            {editingPlan.id ? 'Salvar Alterações' : 'Criar Plano'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
