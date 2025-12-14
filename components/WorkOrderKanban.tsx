import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import {
  MaintenanceTicket,
  TicketActivity,
  TicketPartUsage,
  ChecklistItem,
  TicketTimeLog,
} from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useMaintenance } from '../context/MaintenanceContext';

// --- CONFIGURAÇÃO DAS COLUNAS ---
const columns = [
  {
    id: 'open',
    title: 'Aberto',
    color: 'text-slate-400',
    border: 'border-slate-600',
    bg: 'bg-slate-500',
  },
  {
    id: 'assigned',
    title: 'Atribuído',
    color: 'text-blue-400',
    border: 'border-blue-600',
    bg: 'bg-blue-500',
  },
  {
    id: 'in-progress',
    title: 'Em Execução',
    color: 'text-omni-cyan',
    border: 'border-omni-cyan',
    bg: 'bg-omni-cyan',
  },
  {
    id: 'waiting-parts',
    title: 'Aguardando Peças',
    color: 'text-orange-400',
    border: 'border-orange-500',
    bg: 'bg-orange-500',
  },
  {
    id: 'done',
    title: 'Concluído',
    color: 'text-omni-success',
    border: 'border-omni-success',
    bg: 'bg-omni-success',
  },
];

const CURRENT_USER = 'Eng. Silva'; // Simulação do usuário logado

export const WorkOrderKanban: React.FC = () => {
  // CONTEXTO GLOBAL
  const { tickets, assets, inventory, updateTicketStatus, updateTicket, consumePartInTicket } =
    useMaintenance();

  // ESTADOS LOCAIS
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [movingTicketId, setMovingTicketId] = useState<string | null>(null);

  // Estados do Modal de Detalhes (Idênticos ao TicketManager)
  const [activeTab, setActiveTab] = useState<'execution' | 'overview' | 'parts' | 'analysis'>(
    'execution'
  );
  const [newActivity, setNewActivity] = useState('');

  // Estados de Peças
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQuantity, setPartQuantity] = useState(1);

  // Timer & Execução
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI & Checklist & Voice
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // RCA (Análise de Falha)
  const [rcaReport, setRcaReport] = useState<string | null>(null);
  const [isGeneratingRCA, setIsGeneratingRCA] = useState(false);

  // UI Feedback
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(
    null
  );

  // --- EFEITOS ---

  // Resetar ao abrir modal
  useEffect(() => {
    if (selectedTicket) {
      setElapsedSeconds(0);
      setIsTimerRunning(false); // O timer começa parado até o status mudar

      // LOAD CHECKLIST FROM TICKET IF EXISTS
      if (selectedTicket.checklist && selectedTicket.checklist.length > 0) {
        setChecklist(selectedTicket.checklist);
        // Find first unchecked item to set active index
        const firstUnchecked = selectedTicket.checklist.findIndex(i => !i.checked);
        setActiveStepIndex(
          firstUnchecked === -1 ? selectedTicket.checklist.length : firstUnchecked
        );
      } else {
        setChecklist([]);
        setActiveStepIndex(0);
      }

      setShowNoteInput(false);
      setRcaReport(null);
      setIsVoiceMode(false);
      if (timerRef.current) clearInterval(timerRef.current);

      // Se já estiver em progresso ao abrir, talvez queira retomar o timer (opcional, aqui deixamos parado para ação explícita)
    }
  }, [selectedTicket?.id]);

  // Lógica do Timer
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  // --- VOICE LOGIC ---
  const speakText = (text: string) => {
    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(
        /[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu,
        ''
      )
      .replace(/[#*`\-]/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const ptVoice =
      voices.find(v => v.lang.includes('pt-BR') && v.name.includes('Google')) ||
      voices.find(v => v.lang.includes('pt-BR'));

    if (ptVoice) utterance.voice = ptVoice;

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (isVoiceMode && checklist.length > 0 && activeStepIndex < checklist.length) {
      const step = checklist[activeStepIndex];
      const text = `Passo ${activeStepIndex + 1}. ${step.text}. Diga confirmar para avançar.`;
      speakText(text);
      setIsListening(true);
    } else {
      window.speechSynthesis.cancel();
      setIsListening(false);
    }
  }, [isVoiceMode, activeStepIndex, checklist]);

  const toggleVoiceMode = () => {
    setIsVoiceMode(!isVoiceMode);
    if (!isVoiceMode) speakText('Modo de Voz Ativado.');
  };

  // --- HELPERS ---

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

  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };

  const getUrgencyConfig = (u: string) => {
    switch (u) {
      case 'critical':
        return {
          color: 'text-omni-danger',
          bg: 'bg-omni-danger/10',
          border: 'border-omni-danger',
          label: 'Crítico',
        };
      case 'high':
        return {
          color: 'text-orange-500',
          bg: 'bg-orange-500/10',
          border: 'border-orange-500',
          label: 'Alta',
        };
      case 'medium':
        return {
          color: 'text-yellow-500',
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500',
          label: 'Média',
        };
      default:
        return {
          color: 'text-slate-400',
          bg: 'bg-slate-700/50',
          border: 'border-slate-600',
          label: 'Baixa',
        };
    }
  };

  const getStepColor = (category: string) => {
    switch (category) {
      case 'safety':
        return 'text-red-400 border-red-500/50 bg-red-900/10';
      case 'verification':
        return 'text-green-400 border-green-500/50 bg-green-900/10';
      default:
        return 'text-blue-400 border-blue-500/50 bg-blue-900/10';
    }
  };

  const getStepIcon = (category: string) => {
    switch (category) {
      case 'safety':
        return <Icons.AlertCircle className="w-5 h-5" />;
      case 'verification':
        return <Icons.CheckSquare className="w-5 h-5" />;
      default:
        return <Icons.Wrench className="w-5 h-5" />;
    }
  };

  // --- INTELLIGENT WORKFLOW ACTIONS ---

  const handleStartWork = () => {
    if (!selectedTicket) return;

    const activity: TicketActivity = {
      id: Date.now().toString(),
      userId: 'current',
      userName: CURRENT_USER,
      action: `🚀 Iniciou o atendimento. Status alterado para EM EXECUÇÃO.`,
      timestamp: new Date().toISOString(),
      type: 'status_change',
    };

    const updatedTicket = {
      ...selectedTicket,
      status: 'in-progress' as const,
      assignee: CURRENT_USER, // Auto-atribui ao usuário atual
      activities: [activity, ...(selectedTicket.activities || [])],
    };

    updateTicket(updatedTicket);
    setSelectedTicket(updatedTicket); // Atualiza view local
    setIsTimerRunning(true); // Inicia timer automaticamente
    showToast('Atendimento iniciado! Timer ativo.', 'success');
  };

  // --- KANBAN ACTIONS ---

  const handleTransferClick = (e: React.MouseEvent, ticketId: string) => {
    e.stopPropagation();
    setMovingTicketId(ticketId === movingTicketId ? null : ticketId);
  };

  const executeMove = (
    e: React.MouseEvent,
    ticketId: string,
    newStatus: MaintenanceTicket['status']
  ) => {
    e.stopPropagation();
    updateTicketStatus(ticketId, newStatus);
    setMovingTicketId(null);
    showToast(`Status atualizado para: ${newStatus.toUpperCase()}`, 'success');
  };

  // --- MODAL ACTIONS ---

  const handleStatusChange = (newStatus: MaintenanceTicket['status']) => {
    if (selectedTicket) {
      // Se o usuário tentar mudar manualmente pelo dropdown
      if (newStatus === 'in-progress' && !isTimerRunning) {
        setIsTimerRunning(true); // "Inteligência": Mudou para in-progress, liga o timer
      }
      if (newStatus !== 'in-progress' && isTimerRunning) {
        setIsTimerRunning(false); // "Inteligência": Saiu de in-progress, pausa timer
      }

      const activity: TicketActivity = {
        id: Date.now().toString(),
        userId: 'current',
        userName: CURRENT_USER,
        action: `Alterou status para: ${newStatus}`,
        timestamp: new Date().toISOString(),
        type: 'status_change',
      };

      const updatedTicket = {
        ...selectedTicket,
        status: newStatus,
        activities: [activity, ...(selectedTicket.activities || [])],
      };

      updateTicket(updatedTicket);
      setSelectedTicket(updatedTicket);
    }
  };

  const handleStopTimer = () => {
    setIsTimerRunning(false);
    if (selectedTicket) {
      const hours = Math.floor(elapsedSeconds / 3600);
      const minutes = Math.floor((elapsedSeconds % 3600) / 60);
      const rate = 85.0;
      const cost = (elapsedSeconds / 3600) * rate;

      const log: TicketTimeLog = {
        id: Date.now().toString(),
        technicianName: CURRENT_USER,
        hours: hours,
        minutes: minutes,
        ratePerHour: rate,
        date: new Date().toISOString(),
      };

      const activity: TicketActivity = {
        id: Date.now().toString(),
        userId: 'current',
        userName: CURRENT_USER,
        action: `⏱️ Sessão finalizada: ${formatTime(elapsedSeconds)}`,
        timestamp: new Date().toISOString(),
        type: 'time_log',
      };
      const updatedTicket = {
        ...selectedTicket,
        timeLogs: [...(selectedTicket.timeLogs || []), log],
        activities: [activity, ...(selectedTicket.activities || [])],
        totalCost: (selectedTicket.totalCost || 0) + cost,
      };
      updateTicket(updatedTicket);
      setSelectedTicket(updatedTicket);
    }
    setElapsedSeconds(0);
  };

  const handleAddActivity = () => {
    if (!newActivity || !selectedTicket) return;
    const activity: TicketActivity = {
      id: Date.now().toString(),
      userId: 'current',
      userName: CURRENT_USER,
      action: newActivity,
      timestamp: new Date().toISOString(),
      type: 'comment',
    };
    const updatedTicket = {
      ...selectedTicket,
      activities: [activity, ...(selectedTicket.activities || [])],
    };
    updateTicket(updatedTicket);
    setSelectedTicket(updatedTicket);
    setNewActivity('');
  };

  const handleAddPart = () => {
    if (!selectedTicket || !selectedPartId) return;

    const success = consumePartInTicket(selectedTicket.id, selectedPartId, partQuantity);
    if (success) {
      const part = inventory.find(p => p.id === selectedPartId);
      if (part) {
        const usage: TicketPartUsage = {
          id: Date.now().toString(),
          partId: part.id,
          partName: part.name,
          quantity: partQuantity,
          unitCost: part.cost,
          totalCost: part.cost * partQuantity,
          timestamp: new Date().toISOString(),
        };
        const activity: TicketActivity = {
          id: Date.now().toString(),
          userId: 'tech-1',
          userName: 'Sistema',
          action: `Baixa de estoque: ${partQuantity}x ${part.name}`,
          timestamp: new Date().toISOString(),
          type: 'part_usage',
        };
        setSelectedTicket(prev =>
          prev
            ? {
                ...prev,
                usedParts: [...(prev.usedParts || []), usage],
                activities: [activity, ...(prev.activities || [])],
                totalCost: (prev.totalCost || 0) + usage.totalCost,
              }
            : null
        );
      }
      showToast('Peça adicionada!', 'success');
    }
    setSelectedPartId('');
    setPartQuantity(1);
  };

  // --- AI ACTIONS ---

  const generateAiChecklist = async () => {
    if (!selectedTicket) return;
    const asset = assets.find(a => a.id === selectedTicket.assetId);

    setIsGeneratingChecklist(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `Atue como um Engenheiro de Manutenção. Crie um checklist técnico de execução para:
            Ativo: ${asset?.name}
            Problema: ${selectedTicket.title}
            Inclua emojis em cada passo. Seja detalhado.
            Retorne JSON Array: [{"category": "safety"|"execution"|"verification", "text": "..."}]`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const jsonText = response.text();
      if (jsonText) {
        const steps = extractJson(jsonText);
        if (Array.isArray(steps)) {
          const newChecklist = steps.map((step: any, i: number) => ({
            id: i.toString(),
            category: step.category || 'execution',
            text: step.text,
            checked: false,
          }));
          setChecklist(newChecklist);

          // Save to ticket immediately
          const updatedTicket = { ...selectedTicket, checklist: newChecklist };
          updateTicket(updatedTicket);
          setSelectedTicket(updatedTicket);
        }
      }
    } catch (error) {
      showToast('Erro ao gerar checklist IA', 'error');
    } finally {
      setIsGeneratingChecklist(false);
    }
  };

  const completeStep = () => {
    if (activeStepIndex < checklist.length && selectedTicket) {
      const newChecklist = [...checklist];
      newChecklist[activeStepIndex].checked = true;
      setChecklist(newChecklist);
      setShowNoteInput(false);

      // Persist progress to Ticket
      const updatedTicket = { ...selectedTicket, checklist: newChecklist };
      updateTicket(updatedTicket);
      setSelectedTicket(updatedTicket); // Sync local state

      if (activeStepIndex < checklist.length) setActiveStepIndex(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (activeStepIndex > 0 && selectedTicket) {
      const newChecklist = [...checklist];
      newChecklist[activeStepIndex - 1].checked = false;
      setChecklist(newChecklist);

      // Persist progress to Ticket
      const updatedTicket = { ...selectedTicket, checklist: newChecklist };
      updateTicket(updatedTicket);
      setSelectedTicket(updatedTicket); // Sync local state

      setActiveStepIndex(prev => prev - 1);
    }
  };

  const generateRCA = async () => {
    if (!selectedTicket) return;
    const asset = assets.find(a => a.id === selectedTicket.assetId);
    setIsGeneratingRCA(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const activitiesText =
        selectedTicket.activities
          ?.map(a => `${a.timestamp}: ${a.action} (${a.userName})`)
          .join('\n') || 'Sem histórico.';
      const prompt = `Gere uma Análise de Causa Raiz (RCA) HTML para: ${selectedTicket.title} em ${asset?.name}.
          Use 5 Porquês e Plano de Ação.
          Histórico: ${activitiesText}
          Retorne apenas HTML (sem tags html/body) com classes Tailwind.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;

      if (response.text()) {
        const cleanHtml = response
          .text()
          .replace(/```html/g, '')
          .replace(/```/g, '');
        setRcaReport(cleanHtml);
      }
    } catch (error) {
      showToast('Erro na análise RCA', 'error');
    } finally {
      setIsGeneratingRCA(false);
    }
  };

  // Cálculos para o modal
  const totalPartsCost =
    selectedTicket?.usedParts?.reduce((acc, curr) => acc + curr.totalCost, 0) || 0;
  const totalLaborCost =
    selectedTicket?.timeLogs?.reduce(
      (acc, curr) => acc + (curr.hours + curr.minutes / 60) * curr.ratePerHour,
      0
    ) || 0;

  // Verifica se a execução está bloqueada (não está em progresso)
  const isExecutionBlocked = selectedTicket && selectedTicket.status !== 'in-progress';

  // --- RENDERIZAÇÃO DO BOARD ---

  return (
    <div className="flex-1 p-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col relative">
      {/* TOAST */}
      {toast && (
        <div
          className={`absolute top-6 left-1/2 -translate-x-1/2 z-[70] px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-300 ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : toast.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-slate-700 border border-slate-500 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <Icons.Check className="w-5 h-5" />
          ) : (
            <Icons.Alert className="w-5 h-5" />
          )}
          <span className="font-bold text-sm">{toast.msg}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Quadro de Execução (Kanban)</h2>
          <p className="text-xs text-slate-400 font-mono">FLUXO DE TRABALHO EM TEMPO REAL</p>
        </div>
        <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-omni-panel px-4 py-2 rounded-full border border-omni-border">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-omni-danger animate-pulse"></div> Crítico
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div> Alta
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div> Normal
          </span>
        </div>
      </div>

      {/* COLUNAS */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 h-full min-w-[1400px]">
          {columns.map(col => {
            const colTickets = tickets.filter(t => t.status === col.id);
            return (
              <div
                key={col.id}
                className="w-[320px] flex flex-col h-full rounded-xl bg-omni-panel/30 border border-omni-border/50 backdrop-blur-sm relative group/column"
              >
                <div
                  className={`relative z-10 p-4 border-b border-omni-border/50 flex justify-between items-center bg-gradient-to-b from-omni-panel to-transparent rounded-t-xl border-t-2 ${col.border}`}
                >
                  <h3
                    className={`font-display font-bold text-sm tracking-wide uppercase ${col.color}`}
                  >
                    {col.title}
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-omni-dark text-slate-300 px-2 py-1 rounded border border-slate-700">
                    {colTickets.length}
                  </span>
                </div>
                <div className="relative z-10 flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
                  {colTickets.map(ticket => {
                    const asset = assets.find(a => a.id === ticket.assetId);
                    const urgency = getUrgencyConfig(ticket.urgency);
                    const isMoving = movingTicketId === ticket.id;
                    return (
                      <div
                        key={ticket.id}
                        onClick={() => !isMoving && setSelectedTicket(ticket)}
                        className={`bg-omni-panel border border-omni-border rounded-lg relative transition-all duration-300 overflow-hidden ${
                          isMoving
                            ? 'border-omni-cyan ring-1 ring-omni-cyan shadow-xl z-20'
                            : 'hover:-translate-y-1 hover:shadow-lg hover:border-omni-cyan/30 cursor-pointer'
                        }`}
                      >
                        <div
                          className={`absolute top-0 right-0 w-1 h-full rounded-r-lg ${urgency.bg} ${urgency.border} border-l-0 opacity-50`}
                        ></div>
                        <div
                          className={`p-4 transition-opacity duration-200 ${
                            isMoving
                              ? 'opacity-10 pointer-events-none filter blur-sm'
                              : 'opacity-100'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3 pr-2">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-mono text-slate-500 mb-1">
                                {ticket.id}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border w-fit ${urgency.color} ${urgency.bg} ${urgency.border} bg-opacity-10`}
                              >
                                {urgency.label}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(ticket.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="text-white font-bold text-sm leading-snug mb-2 group-hover:text-omni-cyan transition-colors line-clamp-2">
                            {ticket.title}
                          </h4>
                          <div className="flex items-center gap-2 mb-4">
                            <div className="p-1 bg-slate-800 rounded">
                              <Icons.Box className="w-3 h-3 text-slate-400" />
                            </div>
                            <span className="text-xs font-mono text-slate-300 truncate">
                              {asset?.name || ticket.assetId}
                            </span>
                          </div>
                        </div>
                        {isMoving && (
                          <div className="absolute inset-0 z-50 flex flex-col p-2 bg-omni-dark/95 backdrop-blur-md animate-in fade-in duration-200">
                            <div className="flex justify-between items-center mb-2 px-1">
                              <span className="text-xs font-bold text-white uppercase tracking-wider">
                                Mover para:
                              </span>
                              <button
                                onClick={e => handleTransferClick(e, ticket.id)}
                                className="text-slate-400 hover:text-white"
                              >
                                <Icons.Close className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex-1 grid grid-cols-1 gap-2 overflow-y-auto custom-scrollbar">
                              {columns
                                .filter(c => c.id !== ticket.status)
                                .map(targetCol => (
                                  <button
                                    key={targetCol.id}
                                    onClick={e => executeMove(e, ticket.id, targetCol.id as any)}
                                    className={`flex items-center justify-between px-3 py-2 rounded border text-xs font-bold transition-all ${targetCol.border} ${targetCol.color} bg-white/5 hover:bg-white/10`}
                                  >
                                    {targetCol.title}
                                    <Icons.ChevronRight className="w-3 h-3 opacity-50" />
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-3 right-3 z-30">
                          <button
                            onClick={e => handleTransferClick(e, ticket.id)}
                            title="Transferir Cartão"
                            className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all shadow-lg ${
                              isMoving
                                ? 'bg-omni-cyan text-omni-dark border-omni-cyan shadow-omni-cyan/20'
                                : 'bg-omni-panel border-omni-border text-slate-400 hover:text-omni-cyan hover:border-omni-cyan/50 hover:bg-omni-dark'
                            }`}
                          >
                            <Icons.Transfer className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- MODAL DE DETALHES UNIFICADO --- */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-omni-panel border border-omni-border rounded-xl w-full max-w-7xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/10">
            {/* ... (Keep existing Header and Sidebar structure) ... */}
            {/* Header do Modal */}
            <div className="h-16 px-6 border-b border-omni-border bg-omni-dark flex items-center justify-between shrink-0">
              <div className="flex items-center gap-6">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center border bg-opacity-20 ${
                    getUrgencyConfig(selectedTicket.urgency).bg.split(' ')[0]
                  } ${getUrgencyConfig(selectedTicket.urgency).border}`}
                >
                  <Icons.Wrench className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-0.5">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {selectedTicket.title}
                    </h2>
                    <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                      #{selectedTicket.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Icons.Box className="w-3 h-3" />{' '}
                      {assets.find(a => a.id === selectedTicket.assetId)?.name}
                    </span>
                    <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                    <span className="flex items-center gap-1">
                      <Icons.User className="w-3 h-3" /> {selectedTicket.requester}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Status Inteligente */}
                <select
                  value={selectedTicket.status}
                  onChange={e => handleStatusChange(e.target.value as any)}
                  className={`
                                    bg-omni-dark border text-xs rounded px-3 py-1.5 font-bold outline-none focus:border-omni-cyan uppercase cursor-pointer transition-colors
                                    ${
                                      selectedTicket.status === 'in-progress'
                                        ? 'text-omni-cyan border-omni-cyan animate-pulse-slow'
                                        : 'text-white border-omni-border'
                                    }
                                `}
                >
                  <option value="open">Aberto</option>
                  <option value="assigned">Atribuído</option>
                  <option value="in-progress">Em Execução</option>
                  <option value="waiting-parts">Aguardando Peças</option>
                  <option value="done">Concluído</option>
                </select>
                <div className="h-8 w-px bg-slate-700"></div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <Icons.Close className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Corpo do Modal: Split View */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Sidebar (Context) */}
              <div className="w-[300px] bg-omni-dark/30 border-r border-omni-border p-5 flex flex-col gap-6 overflow-y-auto">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2">
                    <Icons.AlertCircle className="w-4 h-4" /> Diagnóstico Inicial
                  </label>
                  <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3 text-sm text-slate-300 leading-relaxed shadow-inner">
                    {selectedTicket.description}
                  </div>
                </div>

                <div className="mt-auto bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-white uppercase mb-3 flex items-center gap-2">
                    <Icons.Activity className="w-4 h-4 text-omni-cyan" /> Custos Acumulados
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Peças</span>
                      <span className="text-white font-mono">R$ {totalPartsCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Mão de Obra</span>
                      <span className="text-white font-mono">R$ {totalLaborCost.toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-slate-800 my-1"></div>
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-omni-cyan">Total</span>
                      <span className="text-white font-mono">
                        R$ {(totalPartsCost + totalLaborCost).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Workspace */}
              <div className="flex-1 flex flex-col bg-omni-panel relative">
                {/* Tabs */}
                <div className="px-6 py-3 border-b border-omni-border bg-omni-panel flex items-center gap-4">
                  <button
                    onClick={() => setActiveTab('execution')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                      activeTab === 'execution'
                        ? 'bg-omni-cyan text-omni-dark shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icons.Wrench className="w-4 h-4" /> Execução (Wizard)
                  </button>
                  <button
                    onClick={() => setActiveTab('parts')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                      activeTab === 'parts'
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icons.Box className="w-4 h-4" /> Peças
                  </button>
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                      activeTab === 'overview'
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icons.History className="w-4 h-4" /> Timeline
                  </button>
                  <button
                    onClick={() => setActiveTab('analysis')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                      activeTab === 'analysis'
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icons.Sparkles className="w-4 h-4" /> Análise de Falha (RCA)
                  </button>
                </div>

                {/* WORKSPACE CONTENT */}
                <div className="flex-1 p-0 overflow-hidden bg-slate-900/20 relative">
                  {/* --- ABA EXECUÇÃO (Wizard) --- */}
                  {activeTab === 'execution' && (
                    <div className="h-full flex flex-col relative">
                      {/* BLOCKING OVERLAY FOR NON-ACTIVE TICKETS */}
                      {isExecutionBlocked && (
                        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in">
                          <div className="text-center max-w-md p-8 bg-omni-panel border border-omni-border rounded-2xl shadow-2xl">
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-slate-700">
                              <Icons.Wrench className="w-10 h-10 text-slate-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">
                              Pronto para Iniciar?
                            </h3>
                            <p className="text-slate-400 mb-8">
                              Esta ordem está aguardando início. O cronômetro e o checklist serão
                              ativados assim que você assumir a execução.
                            </p>

                            <div className="flex flex-col gap-3">
                              <button
                                onClick={handleStartWork}
                                className="w-full bg-omni-cyan hover:bg-cyan-400 text-omni-dark font-bold text-lg py-4 px-8 rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all transform hover:scale-105 flex items-center justify-center gap-3"
                              >
                                <Icons.Play className="w-6 h-6 fill-current" /> Iniciar Atendimento
                              </button>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2">
                                Técnico: {CURRENT_USER}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Top Bar: Timer, Voice & Progress */}
                      <div
                        className={`h-20 border-b border-omni-border bg-omni-dark/30 flex items-center px-8 justify-between shrink-0 ${
                          isExecutionBlocked ? 'blur-sm opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        <div className="flex items-center gap-8">
                          <div className="flex items-center gap-4 bg-black/30 p-2 rounded-2xl border border-white/5 shadow-inner pr-3">
                            <div className="flex flex-col px-3 border-r border-white/5">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                                Tempo
                              </span>
                              <div
                                className={`text-3xl font-mono font-bold leading-none tracking-wider tabular-nums ${
                                  isTimerRunning ? 'text-white' : 'text-slate-500'
                                }`}
                              >
                                {formatTime(elapsedSeconds)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setIsTimerRunning(!isTimerRunning)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                  isTimerRunning
                                    ? 'bg-amber-500 text-omni-dark hover:bg-amber-400'
                                    : 'bg-green-600 text-white hover:bg-green-500'
                                }`}
                              >
                                {isTimerRunning ? (
                                  <Icons.Pause className="w-5 h-5 fill-current" />
                                ) : (
                                  <Icons.Play className="w-5 h-5 fill-current ml-0.5" />
                                )}
                              </button>
                              <button
                                onClick={handleStopTimer}
                                disabled={elapsedSeconds === 0}
                                className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 border border-slate-700 hover:bg-red-600 hover:text-white hover:border-red-600 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Icons.Square className="w-4 h-4 fill-current" />
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={() => setIsVoiceMode(!isVoiceMode)}
                            className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 transition-all ${
                              isVoiceMode
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 animate-pulse'
                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                            }`}
                          >
                            {isVoiceMode ? (
                              <Icons.Mic className="w-4 h-4" />
                            ) : (
                              <Icons.Mic className="w-4 h-4 opacity-50" />
                            )}
                            {isVoiceMode ? 'Modo Voz Ativo' : 'Ativar Voz'}
                          </button>
                        </div>
                        <div className="flex-1 max-w-xs mx-8">
                          <div className="flex justify-between text-xs mb-1 text-slate-400">
                            <span>Progresso</span>
                            <span>
                              {Math.round(
                                (checklist.filter(i => i.checked).length /
                                  (checklist.length || 1)) *
                                  100
                              )}
                              %
                            </span>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 transition-all duration-500"
                              style={{
                                width: `${
                                  (checklist.filter(i => i.checked).length /
                                    (checklist.length || 1)) *
                                  100
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Main Content: Workflow Wizard */}
                      <div
                        className={`flex-1 overflow-y-auto p-8 custom-scrollbar relative ${
                          isExecutionBlocked ? 'blur-sm opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        {isListening && (
                          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-6 py-2 rounded-full border border-purple-500/50 flex items-center gap-3 z-50 animate-in slide-in-from-top-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></div>
                            <span className="text-xs text-purple-200 font-bold">
                              Escutando... Diga "Confirmar"
                            </span>
                          </div>
                        )}

                        {checklist.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                              <Icons.Sparkles className="w-10 h-10 text-purple-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">
                              Plano de Ação Inteligente
                            </h3>
                            <p className="text-slate-400 max-w-md mb-8">
                              A IA irá analisar o equipamento e o problema relatado para gerar um
                              procedimento de segurança e execução passo-a-passo.
                            </p>
                            <button
                              onClick={generateAiChecklist}
                              disabled={isGeneratingChecklist}
                              className="bg-purple-600 hover:bg-purple-500 text-white text-lg font-bold py-4 px-10 rounded-xl shadow-xl shadow-purple-900/30 flex items-center gap-3 transition-all transform hover:scale-105"
                            >
                              {isGeneratingChecklist ? (
                                <Icons.Clock className="w-6 h-6 animate-spin" />
                              ) : (
                                <Icons.Bot className="w-6 h-6" />
                              )}
                              {isGeneratingChecklist ? 'Analisando...' : 'Gerar Procedimento'}
                            </button>
                          </div>
                        ) : (
                          <div className="max-w-4xl mx-auto space-y-6">
                            {activeStepIndex < checklist.length && (
                              <div
                                className={`p-8 rounded-2xl border-2 shadow-2xl relative overflow-hidden transition-all duration-500 ${getStepColor(
                                  checklist[activeStepIndex].category
                                )}`}
                              >
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                  {getStepIcon(checklist[activeStepIndex].category)}
                                </div>
                                <div className="flex justify-between items-start mb-4">
                                  <span className="text-xs font-bold uppercase tracking-widest opacity-70 border border-current px-2 py-1 rounded">
                                    Passo {activeStepIndex + 1} de {checklist.length} •{' '}
                                    {checklist[activeStepIndex].category === 'safety'
                                      ? 'SEGURANÇA'
                                      : checklist[activeStepIndex].category === 'verification'
                                      ? 'VERIFICAÇÃO'
                                      : 'EXECUÇÃO'}
                                  </span>
                                </div>
                                <h3 className="text-3xl font-display font-bold text-white mb-4 leading-tight">
                                  {checklist[activeStepIndex].text}
                                </h3>

                                {/* Attached Media/Notes Area */}
                                {(checklist[activeStepIndex].photoUrl ||
                                  checklist[activeStepIndex].notes) && (
                                  <div className="flex gap-4 mb-6 animate-in fade-in slide-in-from-top-2">
                                    {checklist[activeStepIndex].photoUrl && (
                                      <div className="relative group">
                                        <img
                                          src={checklist[activeStepIndex].photoUrl}
                                          alt="Evidência"
                                          className="w-24 h-24 object-cover rounded-lg border-2 border-white/20"
                                        />
                                        <span className="absolute -top-2 -right-2 bg-green-500 text-omni-dark text-[10px] font-bold px-2 py-0.5 rounded-full">
                                          Anexo
                                        </span>
                                      </div>
                                    )}
                                    {checklist[activeStepIndex].notes && (
                                      <div className="flex-1 bg-black/20 rounded-lg p-3 text-sm italic text-white/80 border border-white/10">
                                        "{checklist[activeStepIndex].notes}"
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Note Input Toggle */}
                                {showNoteInput && (
                                  <div className="mb-4 animate-in fade-in slide-in-from-top-2 relative">
                                    <textarea
                                      autoFocus
                                      placeholder="Digite sua observação técnica ou use o microfone..."
                                      className="w-full bg-black/30 border border-white/20 rounded-lg p-3 pr-10 text-white focus:border-white/50 outline-none resize-none"
                                      rows={3}
                                      value={checklist[activeStepIndex].notes || ''}
                                      onChange={e => {
                                        const newChecklist = [...checklist];
                                        newChecklist[activeStepIndex].notes = e.target.value;
                                        setChecklist(newChecklist);
                                      }}
                                    />
                                  </div>
                                )}

                                <div className="flex gap-4">
                                  {activeStepIndex > 0 && (
                                    <button
                                      onClick={prevStep}
                                      className="w-16 bg-black/20 hover:bg-black/40 text-white rounded-xl font-bold flex items-center justify-center transition-colors border border-white/10"
                                      title="Voltar Passo"
                                    >
                                      <Icons.ChevronLeft className="w-6 h-6" />
                                    </button>
                                  )}
                                  <button
                                    onClick={completeStep}
                                    className="flex-1 bg-white text-black hover:bg-slate-200 font-bold py-4 rounded-xl text-lg shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
                                  >
                                    <Icons.Check className="w-6 h-6" /> Confirmar & Próximo
                                  </button>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={fileInputRef}
                                  />
                                  <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-6 py-4 bg-black/20 hover:bg-black/40 text-white rounded-xl font-bold flex items-center gap-2 transition-colors border border-white/5"
                                  >
                                    <Icons.Camera className="w-6 h-6" /> Foto
                                  </button>
                                  <button
                                    onClick={() => setShowNoteInput(!showNoteInput)}
                                    className={`px-6 py-4 rounded-xl font-bold flex items-center gap-2 transition-colors border border-white/5 ${
                                      showNoteInput
                                        ? 'bg-white text-black'
                                        : 'bg-black/20 hover:bg-black/40 text-white'
                                    }`}
                                  >
                                    <Icons.Mic className="w-6 h-6" /> Nota
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* History Steps */}
                            {checklist.length > 0 && activeStepIndex > 0 && (
                              <div className="border-t border-slate-800 pt-6">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">
                                  Passos Concluídos
                                </h4>
                                <div className="space-y-2 opacity-60">
                                  {checklist.slice(0, activeStepIndex).map((step, idx) => (
                                    <div
                                      key={step.id}
                                      className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800"
                                    >
                                      <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center shrink-0">
                                        <Icons.Check className="w-4 h-4" />
                                      </div>
                                      <span className="text-slate-400 text-sm line-through flex-1">
                                        {step.text}
                                      </span>
                                      {step.photoUrl && (
                                        <Icons.Camera className="w-4 h-4 text-slate-500" />
                                      )}
                                      {step.notes && (
                                        <Icons.FileText className="w-4 h-4 text-slate-500" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Success */}
                            {activeStepIndex === checklist.length && (
                              <div className="text-center py-12 bg-green-900/10 border border-green-500/30 rounded-2xl animate-in zoom-in">
                                <div className="w-20 h-20 bg-green-500 text-omni-dark rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                                  <Icons.Check className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">
                                  Procedimento Concluído!
                                </h3>
                                <p className="text-slate-400 mb-6">
                                  Todos os passos foram verificados.
                                </p>
                                <button
                                  onClick={() => setSelectedTicket(null)}
                                  className="bg-white text-omni-dark font-bold py-3 px-8 rounded-lg hover:bg-slate-200 transition-colors"
                                >
                                  Fechar Ordem
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ... (Existing Parts, Overview and Analysis Tabs) ... */}
                  {activeTab === 'parts' && (
                    <div className="flex flex-col h-full p-8">
                      <div className="bg-omni-dark border border-omni-border p-6 rounded-xl mb-6 shadow-sm">
                        <h4 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                          <Icons.Plus className="w-5 h-5 text-omni-cyan" /> Adicionar Peça do
                          Estoque
                        </h4>
                        <div className="flex gap-3 items-end">
                          <div className="flex-1">
                            <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">
                              Peça / Componente
                            </label>
                            <select
                              className="w-full bg-omni-panel border border-omni-border rounded-lg px-4 py-3 text-white outline-none focus:border-omni-cyan text-sm"
                              value={selectedPartId}
                              onChange={e => setSelectedPartId(e.target.value)}
                            >
                              <option value="">Selecione...</option>
                              {inventory.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.code} - {p.name} (Qtd: {p.quantity})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="w-24">
                            <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">
                              Qtd.
                            </label>
                            <input
                              type="number"
                              min="1"
                              className="w-full bg-omni-panel border border-omni-border rounded-lg px-3 py-3 text-white outline-none focus:border-omni-cyan text-sm"
                              value={partQuantity}
                              onChange={e => setPartQuantity(parseInt(e.target.value))}
                            />
                          </div>
                          <button
                            onClick={handleAddPart}
                            disabled={!selectedPartId}
                            className="bg-omni-cyan hover:bg-cyan-400 text-omni-dark font-bold py-3 px-6 rounded-lg text-sm transition-colors"
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
                        Peças Utilizadas Neste Chamado
                      </h4>
                      <div className="flex-1 overflow-y-auto border border-omni-border rounded-xl bg-omni-dark/30">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 uppercase bg-omni-dark border-b border-omni-border">
                            <tr>
                              <th className="px-6 py-4">Peça</th>
                              <th className="px-6 py-4 text-center">Qtd</th>
                              <th className="px-6 py-4 text-right">Custo Un.</th>
                              <th className="px-6 py-4 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-omni-border">
                            {selectedTicket.usedParts?.length === 0 && (
                              <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-500 italic">
                                  Nenhuma peça apontada.
                                </td>
                              </tr>
                            )}
                            {selectedTicket.usedParts?.map(p => (
                              <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 text-white">{p.partName}</td>
                                <td className="px-6 py-4 text-center text-slate-300">
                                  {p.quantity}
                                </td>
                                <td className="px-6 py-4 text-right text-slate-400">
                                  R$ {p.unitCost.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right text-white font-bold">
                                  R$ {p.totalCost.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeTab === 'overview' && (
                    <div className="flex flex-col h-full overflow-hidden">
                      <div className="max-w-4xl mx-auto p-8 w-full flex flex-col h-full">
                        <div className="mb-8 flex gap-3 shrink-0">
                          <input
                            className="flex-1 bg-omni-dark border border-omni-border rounded-xl px-6 py-4 text-white focus:border-omni-cyan outline-none shadow-sm transition-all text-sm"
                            placeholder="Adicionar comentário..."
                            value={newActivity}
                            onChange={e => setNewActivity(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddActivity()}
                          />
                          <button
                            onClick={handleAddActivity}
                            className="bg-omni-cyan hover:bg-cyan-400 text-omni-dark px-8 rounded-xl font-bold shadow-lg transition-all"
                          >
                            Enviar
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                          <div className="space-y-6">
                            {selectedTicket.activities?.map((act, i) => (
                              <div key={i} className="flex gap-4 relative group">
                                <div className="absolute left-[15px] top-8 bottom-[-24px] w-px bg-slate-800 last:hidden"></div>
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold z-10 border-2 border-omni-panel shadow-sm ${
                                    act.userName === 'Sistema'
                                      ? 'bg-slate-700 text-slate-300'
                                      : 'bg-omni-cyan text-omni-dark'
                                  }`}
                                >
                                  {act.type === 'time_log' ? (
                                    <Icons.Clock className="w-4 h-4" />
                                  ) : (
                                    act.userName.charAt(0)
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-baseline gap-2 mb-1">
                                    <span className="font-bold text-white text-sm">
                                      {act.userName}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      {new Date(act.timestamp).toLocaleString()}
                                    </span>
                                  </div>
                                  <div
                                    className={`p-4 rounded-xl border text-sm ${
                                      act.type === 'status_change'
                                        ? 'bg-purple-900/10 border-purple-500/20 text-purple-200'
                                        : act.type === 'part_usage'
                                        ? 'bg-orange-900/10 border-orange-500/20 text-orange-200'
                                        : act.type === 'time_log'
                                        ? 'bg-blue-900/10 border-blue-500/20 text-blue-200'
                                        : 'bg-omni-dark border-omni-border text-slate-300'
                                    }`}
                                  >
                                    {act.action}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'analysis' && (
                    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="mb-6 bg-omni-dark/50 border border-omni-border rounded-xl p-6 text-center">
                        <h4 className="text-lg font-bold text-white mb-2">
                          Análise de Causa Raiz (RCA)
                        </h4>
                        <p className="text-sm text-slate-400 max-w-2xl mx-auto mb-6">
                          A IA analisará o histórico de atividades, peças trocadas e a descrição do
                          problema para gerar um relatório técnico de falha.
                        </p>
                        <button
                          onClick={generateRCA}
                          disabled={isGeneratingRCA}
                          className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center gap-3 mx-auto transition-all disabled:opacity-50"
                        >
                          {isGeneratingRCA ? (
                            <Icons.Clock className="w-5 h-5 animate-spin" />
                          ) : (
                            <Icons.Sparkles className="w-5 h-5" />
                          )}{' '}
                          Gerar Relatório de Falha
                        </button>
                      </div>
                      <div className="flex-1 bg-omni-dark border border-omni-border rounded-xl p-8 overflow-y-auto custom-scrollbar shadow-inner relative flex flex-col">
                        {rcaReport ? (
                          <div
                            className="text-slate-300 space-y-4 font-sans"
                            dangerouslySetInnerHTML={{ __html: rcaReport }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-50">
                            <Icons.FileText className="w-16 h-16 mb-4" />
                            <p className="text-sm font-bold">Nenhuma análise gerada.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
