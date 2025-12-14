import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import {
  MaintenanceTicket,
  TicketActivity,
  TicketPartUsage,
  TicketTimeLog,
  ChecklistItem,
} from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useMaintenance } from '../context/MaintenanceContext';
import { useAuth } from '../context/AuthContext';

export const TicketManager: React.FC = () => {
  const {
    tickets,
    assets,
    inventory,
    technicians, // GET TECHS
    addTicket,
    updateTicket,
    updateTicketStatus,
    consumePartInTicket,
  } = useMaintenance(); // USANDO CONTEXTO
  const { user } = useAuth();

  const [filterStatus, setFilterStatus] = useState<MaintenanceTicket['status'] | 'all' | 'me'>(
    'all'
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [newActivity, setNewActivity] = useState('');

  // Detail Modal Tabs
  const [activeTab, setActiveTab] = useState<'execution' | 'overview' | 'parts' | 'analysis'>(
    'execution'
  );

  // New ticket state
  const [newTicket, setNewTicket] = useState<Partial<MaintenanceTicket>>({
    urgency: 'medium',
    type: 'mechanical',
    requester: 'Eng. Silva', // Default simulated user
  });
  const [isEnhancingDescription, setIsEnhancingDescription] = useState(false);

  // Asset Search State
  const [assetSearchTerm, setAssetSearchTerm] = useState('');
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Image Upload State
  const [ticketImage, setTicketImage] = useState<string | null>(null);

  // Parts Selection State
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQuantity, setPartQuantity] = useState(1);

  // --- EXECUTION FEATURES ---
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Checklist & Wizard
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [showNoteInput, setShowNoteInput] = useState(false);

  // Voice & Interaction
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // --- FEATURE: AI RCA (Analysis) ---
  const [rcaReport, setRcaReport] = useState<string | null>(null);
  const [isGeneratingRCA, setIsGeneratingRCA] = useState(false);

  // Reset states when opening a new ticket
  useEffect(() => {
    if (selectedTicket) {
      setElapsedSeconds(0);
      setIsTimerRunning(false);
      setChecklist([]);
      setActiveStepIndex(0);
      setRcaReport(null);
      setIsVoiceMode(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [selectedTicket?.id]);

  // Click Outside Listener for Asset Dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAssetDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  // Timer Logic
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

  // --- VOICE ASSISTANT LOGIC (RESTORED) ---
  useEffect(() => {
    if (isVoiceMode && checklist.length > 0 && activeStepIndex < checklist.length) {
      const textToSpeak = checklist[activeStepIndex].text;
      speakText(`Passo ${activeStepIndex + 1}. ${textToSpeak}. Diga confirmar para avançar.`);
      setIsListening(true);
    } else {
      window.speechSynthesis.cancel();
      setIsListening(false);
    }
  }, [isVoiceMode, activeStepIndex, checklist]);

  // --- VOICE UTILS ---
  const speakText = (text: string) => {
    window.speechSynthesis.cancel();

    // 1. Limpeza de Texto (Remove Emojis e Markdown)
    const cleanText = text
      .replace(
        /[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu,
        ''
      )
      .replace(/[#*`\-]/g, '') // Remove markdown simples
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0; // Velocidade um pouco mais natural

    // 2. Seleção de Voz Melhorada
    const voices = window.speechSynthesis.getVoices();
    const ptVoice =
      voices.find(v => v.lang.includes('pt-BR') && v.name.includes('Google')) ||
      voices.find(v => v.lang.includes('pt-BR')) ||
      voices.find(v => v.lang.includes('pt'));

    if (ptVoice) utterance.voice = ptVoice;

    window.speechSynthesis.speak(utterance);
  };

  const toggleVoiceMode = () => {
    setIsVoiceMode(!isVoiceMode);
    if (!isVoiceMode) speakText('Modo de Voz Ativado.');
  };

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

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };

  const handleStopTimer = () => {
    setIsTimerRunning(false);
    if (elapsedSeconds < 60) {
      alert('Tempo muito curto para registrar.');
      return;
    }

    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const rate = 85.0;
    const cost = (elapsedSeconds / 3600) * rate;

    const log: TicketTimeLog = {
      id: Date.now().toString(),
      technicianName: 'Você (Técnico)',
      hours: hours,
      minutes: minutes,
      ratePerHour: rate,
      date: new Date().toISOString(),
    };

    const activity: TicketActivity = {
      id: Date.now().toString(),
      userId: 'tech-1',
      userName: 'Sistema',
      action: `⏱️ Sessão de trabalho finalizada: ${formatTime(elapsedSeconds)}`,
      timestamp: new Date().toISOString(),
      type: 'time_log',
    };

    if (selectedTicket) {
      const updatedTicket = {
        ...selectedTicket,
        timeLogs: [...(selectedTicket.timeLogs || []), log],
        activities: [activity, ...(selectedTicket.activities || [])],
        totalCost: (selectedTicket.totalCost || 0) + cost,
      };
      updateTicket(updatedTicket);
      setSelectedTicket(updatedTicket); // Sync Local view
    }
    setElapsedSeconds(0);
  };

  // --- AI LOGIC ---
  const generateAiChecklist = async () => {
    if (!selectedTicket) return;
    const asset = assets.find(a => a.id === selectedTicket.assetId);

    setIsGeneratingChecklist(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `
            Atue como um Técnico de Manutenção Especialista.
            Crie um Procedimento de Execução (Checklist) para:
            Ativo: ${asset?.name} (${asset?.model})
            Falha: "${selectedTicket.title}" - ${selectedTicket.description}
            Retorne APENAS um JSON Array: [{"category": "safety"|"execution"|"verification", "text": "..."}]
            Regras: 
            1. Segurança primeiro. 
            2. Passos detalhados e técnicos.
            3. Use emojis/ícones no início de cada texto (ex: ⚠️, 🔧, ✅).
            4. 5 a 10 passos.
          `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const jsonText = response.text();
      if (jsonText) {
        const steps = extractJson(jsonText);
        if (Array.isArray(steps)) {
          setChecklist(
            steps.map((step: any, i: number) => ({
              id: i.toString(),
              category: step.category || 'execution',
              text: step.text,
              checked: false,
            }))
          );
        }
      }
    } catch (error: any) {
      console.error('Erro AI Checklist:', error);
      alert(`Erro ao gerar checklist: ${error.message || 'Falha desconhecida'}`);
    } finally {
      setIsGeneratingChecklist(false);
    }
  };

  const completeStep = () => {
    if (activeStepIndex < checklist.length) {
      const newChecklist = [...checklist];
      newChecklist[activeStepIndex].checked = true;
      setChecklist(newChecklist);
      setShowNoteInput(false);
      if (activeStepIndex < checklist.length) setActiveStepIndex(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (activeStepIndex > 0) {
      const newChecklist = [...checklist];
      newChecklist[activeStepIndex - 1].checked = false;
      setChecklist(newChecklist);
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
      const partsText =
        selectedTicket.usedParts?.map(p => `${p.quantity}x ${p.partName}`).join(', ') ||
        'Nenhuma peça usada.';

      const prompt = `
            Atue como um Engenheiro de Confiabilidade Sênior.
            Gere uma Análise de Causa Raiz (RCA) estruturada para a seguinte falha, aplicando metodologias como 5 Porquês ou Ishikawa (Espinha de Peixe) se aplicável.
            
            Dados do Chamado:
            Equipamento: ${asset?.name} (${asset?.model})
            Problema Inicial: ${selectedTicket.title}
            Descrição: ${selectedTicket.description}
            Histórico de Execução (Logs):
            ${activitiesText}
            Peças Substituídas:
            ${partsText}

            Instruções de Saída:
            Retorne APENAS código HTML puro (sem tags html/body/head), estilizado com classes Tailwind CSS compatíveis com fundo escuro (text-slate-300, headings text-white, borders slate-700).
            
            Estrutura do Relatório:
            1. <h3 class="text-xl font-bold text-white mb-4">Resumo do Incidente</h3>
            2. <div class="bg-slate-800 p-4 rounded mb-6">...análise técnica do que ocorreu...</div>
            3. <h4 class="text-lg font-bold text-omni-cyan mb-2">Metodologia 5 Porquês</h4> (Simule os 5 porquês baseados no problema)
            4. <h4 class="text-lg font-bold text-omni-cyan mb-2">Causa Raiz Identificada</h4>
            5. <h4 class="text-lg font-bold text-green-400 mb-2">Plano de Ação Preventiva</h4> (Tabela com: Ação, Responsável Sugerido, Prazo)
            
            Seja técnico, direto e profissional.
          `;

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
      console.error('Erro AI RCA:', error);
      setRcaReport("<p class='text-red-500'>Erro ao gerar análise. Tente novamente.</p>");
    } finally {
      setIsGeneratingRCA(false);
    }
  };

  const handleSaveRCA = () => {
    if (!selectedTicket || !rcaReport) return;

    const activity: TicketActivity = {
      id: Date.now().toString(),
      userId: 'user-current',
      userName: 'Você',
      action: '📝 Análise RCA (Causa Raiz) salva no histórico.',
      timestamp: new Date().toISOString(),
      type: 'comment',
    };

    const updatedTicket = {
      ...selectedTicket,
      activities: [activity, ...(selectedTicket.activities || [])],
    };

    updateTicket(updatedTicket);
    setSelectedTicket(updatedTicket);
    alert('Relatório RCA salvo com sucesso e anexado ao histórico!');
  };

  const enhanceDescription = async () => {
    if (!newTicket.description || newTicket.description.length < 5) return;
    setIsEnhancingDescription(true);

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const assetName =
        assets.find(a => a.id === newTicket.assetId)?.name || 'Equipamento Industrial';

      const prompt = `Reescreva a seguinte descrição de problema de manutenção de forma técnica, clara e concisa para um chamado de serviço.
          Equipamento: ${assetName}
          Descrição Original do Usuário: "${newTicket.description}"
          
          Retorne apenas o texto melhorado.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;

      if (response.text()) {
        setNewTicket(prev => ({ ...prev, description: response.text() }));
      }
    } catch (e) {
      console.error('AI Enhance failed', e);
    } finally {
      setIsEnhancingDescription(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setTicketImage(url);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.assetId) {
      alert('Selecione um equipamento.');
      return;
    }

    const ticket: MaintenanceTicket = {
      ...newTicket,
      id: `TCK-${Math.floor(Math.random() * 10000)}`,
      status: 'open',
      createdAt: new Date().toISOString(),
      title: newTicket.title || 'Manutenção Corretiva',
      description: newTicket.description || 'Sem descrição detalhada.',
      failureCause: ticketImage ? 'Imagem anexada' : undefined,
      activities: [
        {
          id: '1',
          userId: 'user-current',
          userName: newTicket.requester || 'Usuário',
          action: 'Chamado aberto',
          timestamp: new Date().toISOString(),
          type: 'status_change',
        },
      ],
      usedParts: [],
      timeLogs: [],
      totalCost: 0,
    } as MaintenanceTicket;
    addTicket(ticket);
    setIsModalOpen(false);
    setNewTicket({ urgency: 'medium', type: 'mechanical', requester: 'Eng. Silva' });
    setAssetSearchTerm('');
    setTicketImage(null);
  };

  const handleStatusChange = (newStatus: MaintenanceTicket['status']) => {
    if (!selectedTicket) return;

    const activity: TicketActivity = {
      id: Date.now().toString(),
      userId: 'user-current',
      userName: 'Você',
      action: `Alterou o status para: ${newStatus.toUpperCase()}`,
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
  };

  const handleAddActivity = () => {
    if (!newActivity || !selectedTicket) return;
    const activity: TicketActivity = {
      id: Date.now().toString(),
      userId: 'tech-1',
      userName: 'Tec. Operacional',
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
    updateTicket(updatedTicket);
    setSelectedTicket(updatedTicket);
    setNewActivity('');
  };

  const handleAssign = (techId: string) => {
    if (!selectedTicket) return;
    const tech = technicians.find(t => t.id === techId);
    const updatedTicket = {
      ...selectedTicket,
      assignee: tech?.name || 'Unknown',
      assignee_id: techId,
      status: 'assigned' as const,
    };

    const activity: TicketActivity = {
      id: Date.now().toString(),
      userId: 'current-user', // Should be auth user
      userName: 'Gestor',
      action: `Atribuiu o chamado para: ${tech?.name}`,
      timestamp: new Date().toISOString(),
      type: 'status_change',
    };
    updatedTicket.activities = [activity, ...(selectedTicket.activities || [])];

    updateTicket(updatedTicket);
    setSelectedTicket(updatedTicket);
  };

  const handlePriorityChange = (p: 'low' | 'medium' | 'high' | 'critical') => {
    if (!selectedTicket) return;
    const updatedTicket = { ...selectedTicket, priority: p };
    updateTicket(updatedTicket);
    setSelectedTicket(updatedTicket);
  };

  // --- CRUCIAL FIX: Real Inventory Deduction via Context ---
  const handleAddPart = () => {
    if (!selectedTicket || !selectedPartId) return;

    // Call Context Function
    const success = consumePartInTicket(selectedTicket.id, selectedPartId, partQuantity);

    if (success) {
      // If context update succeeded, we need to refresh our local selectedTicket to show the new part
      // Since context updates are async but fast, we can find the ticket again or simulate the add locally for immediate feedback
      // The cleanest way is to re-find the ticket from the fresh 'tickets' array from context, but since this component might re-render,
      // let's manually construct the update for the local view to avoid flicker.
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

      setSelectedPartId('');
      setPartQuantity(1);
    }
  };

  // Helper de Estilos
  const getUrgencyStyles = (u: string) => {
    switch (u) {
      case 'critical':
        return {
          border: 'border-l-omni-danger',
          text: 'text-omni-danger',
          bg: 'bg-omni-danger/10',
          label: 'Crítico',
        };
      case 'high':
        return {
          border: 'border-l-orange-500',
          text: 'text-orange-500',
          bg: 'bg-orange-500/10',
          label: 'Alta',
        };
      case 'medium':
        return {
          border: 'border-l-yellow-500',
          text: 'text-yellow-500',
          bg: 'bg-yellow-500/10',
          label: 'Média',
        };
      default:
        return {
          border: 'border-l-slate-500',
          text: 'text-slate-400',
          bg: 'bg-slate-700/50',
          label: 'Baixa',
        };
    }
  };

  const getStatusStyle = (s: string) => {
    switch (s) {
      case 'open':
        return { label: 'Aberto', class: 'bg-slate-700 text-slate-300 border-slate-600' };
      case 'in-progress':
        return {
          label: 'Em Execução',
          class: 'bg-omni-cyan/20 text-omni-cyan border-omni-cyan/50 animate-pulse-slow',
        };
      case 'waiting-parts':
        return {
          label: 'Aguardando Peça',
          class: 'bg-orange-500/20 text-orange-500 border-orange-500/50',
        };
      case 'done':
        return { label: 'Concluído', class: 'bg-green-500/20 text-green-500 border-green-500/50' };
      default:
        return { label: s, class: 'bg-slate-700 text-slate-300' };
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

  const totalPartsCost =
    selectedTicket?.usedParts?.reduce((acc, curr) => acc + curr.totalCost, 0) || 0;
  const totalLaborCost =
    selectedTicket?.timeLogs?.reduce(
      (acc, curr) => acc + (curr.hours + curr.minutes / 60) * curr.ratePerHour,
      0
    ) || 0;

  const filteredAssets = assets.filter(
    a =>
      a.name.toLowerCase().includes(assetSearchTerm.toLowerCase()) ||
      a.code.toLowerCase().includes(assetSearchTerm.toLowerCase())
  );

  const filteredTickets = tickets.filter(t => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'me') return t.assignee_id === user?.id; // Filter by My ID
    // Filter by Grouped Status for simpler UI if needed, or exact match
    return t.status === filterStatus;
  });

  return (
    <div className="flex-1 p-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col">
      {/* HEADER & GRID... (Mantendo a estrutura do card) */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Chamados de Manutenção Corretiva</h2>
          <p className="text-xs text-slate-400">Gerenciamento de Ordens de Serviço (O.S.)</p>
        </div>

        {/* FILTERS */}
        <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'me', label: 'Meus Chamados', icon: Icons.User },
            { id: 'open', label: 'Abertos', color: 'text-slate-300' },
            { id: 'in-progress', label: 'Em Execução', color: 'text-omni-cyan' },
            { id: 'waiting-parts', label: 'Aguardando Peça', color: 'text-orange-500' },
            { id: 'done', label: 'Concluídos', color: 'text-green-500' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id as any)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterStatus === f.id
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              {f.icon && <f.icon className="w-3 h-3" />}
              <span className={filterStatus === f.id ? '' : f.color}>{f.label}</span>
              {f.id !== 'me' && (
                <span className="ml-1 bg-black/20 px-1.5 rounded-full text-[9px] opacity-60">
                  {f.id === 'all'
                    ? tickets.length
                    : f.id === 'me'
                    ? tickets.filter(t => t.assignee_id === user?.id).length
                    : tickets.filter(t => t.status === f.id).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setSelectedTicket(null);
            setIsModalOpen(true);
          }}
          className="bg-omni-danger hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg text-sm flex items-center gap-2 transition-all shadow-lg shadow-red-500/20"
        >
          <Icons.Alert className="w-4 h-4" /> Abrir Novo Chamado
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto pb-6 pr-2 custom-scrollbar">
        {filteredTickets.map(ticket => {
          const asset = assets.find(a => a.id === ticket.assetId);
          const urgencyStyle = getUrgencyStyles(ticket.urgency);
          const statusStyle = getStatusStyle(ticket.status);

          return (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className={`
                        bg-omni-panel border border-omni-border rounded-xl overflow-hidden cursor-pointer group relative
                        hover:border-slate-500 hover:shadow-xl transition-all duration-300 flex flex-col
                        ${ticket.status === 'in-progress' ? 'ring-1 ring-omni-cyan/30' : ''}
                    `}
            >
              <div
                className={`absolute top-0 left-0 bottom-0 w-1 ${urgencyStyle.border.replace(
                  'border-l-',
                  'bg-'
                )} z-10`}
              ></div>
              <div className="flex justify-between items-center p-3 pl-5 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {ticket.id}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${urgencyStyle.text}`}
                  >
                    <Icons.AlertCircle className="w-3 h-3" /> {urgencyStyle.label}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                  <Icons.Clock className="w-3 h-3" />
                  <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="p-4 pl-5 flex gap-4">
                <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden border border-white/10 relative">
                  <img
                    src={asset?.image}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    alt={asset?.name}
                  />
                  <div className="absolute bottom-0 right-0 bg-black/60 p-1 rounded-tl-lg backdrop-blur-sm">
                    {ticket.type === 'electrical' ? (
                      <Icons.Zap className="w-3 h-3 text-yellow-400" />
                    ) : ticket.type === 'mechanical' ? (
                      <Icons.Settings className="w-3 h-3 text-slate-300" />
                    ) : (
                      <Icons.Wrench className="w-3 h-3 text-blue-400" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h3
                      className="text-white font-bold text-sm leading-tight mb-1 truncate group-hover:text-omni-cyan transition-colors"
                      title={ticket.title}
                    >
                      {ticket.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-2">
                      {ticket.description}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                      <Icons.Box className="w-3 h-3 text-omni-cyan" />
                      <span className="truncate">{asset?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-500 bg-black/30 px-1.5 py-0.5 rounded">
                        {asset?.code}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {asset?.location}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-auto px-4 py-3 bg-black/20 border-t border-white/5 flex justify-between items-center">
                <span
                  className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border ${statusStyle.class}`}
                >
                  {statusStyle.label}
                </span>
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center gap-2 text-xs text-slate-400"
                    title={`Solicitante: ${ticket.requester}`}
                  >
                    <Icons.User className="w-3 h-3" />
                    <span className="truncate max-w-[80px]">{ticket.assignee || 'S/ Técnico'}</span>
                  </div>
                  <div className="w-px h-3 bg-slate-700"></div>
                  <Icons.ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                </div>
              </div>
              <div className="h-0.5 w-full bg-slate-800">
                <div className={`h-full ${urgencyStyle.bg.replace('/10', '')} w-[45%]`}></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- CREATE MODAL (Identical) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-omni-panel border border-omni-border rounded-xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-omni-border bg-omni-dark rounded-t-xl shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-omni-danger/20 rounded flex items-center justify-center border border-omni-danger/30 text-omni-danger">
                  <Icons.Alert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Nova Ordem de Serviço</h3>
                  <p className="text-[10px] text-slate-400 font-mono tracking-wider">
                    ID PREVISTO: TCK-{Math.floor(Math.random() * 10000)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <form onSubmit={handleSave} className="p-6 space-y-6">
                <div className="space-y-2 relative" ref={dropdownRef}>
                  <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    Equipamento <span className="text-omni-danger">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar por tag, nome ou setor..."
                      className="w-full bg-omni-dark border border-omni-border rounded-lg px-4 py-3 pl-10 text-white focus:border-omni-cyan outline-none font-medium text-sm transition-all shadow-inner"
                      value={
                        newTicket.assetId
                          ? assets.find(a => a.id === newTicket.assetId)?.name +
                            ' - ' +
                            assets.find(a => a.id === newTicket.assetId)?.code
                          : assetSearchTerm
                      }
                      onChange={e => {
                        setAssetSearchTerm(e.target.value);
                        setNewTicket({ ...newTicket, assetId: '' });
                        setIsAssetDropdownOpen(true);
                      }}
                      onFocus={() => {
                        if (newTicket.assetId) {
                          setAssetSearchTerm('');
                          setNewTicket({ ...newTicket, assetId: '' });
                        }
                        setIsAssetDropdownOpen(true);
                      }}
                      required={!newTicket.assetId}
                    />
                    <Icons.Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    {newTicket.assetId && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewTicket({ ...newTicket, assetId: '' });
                          setAssetSearchTerm('');
                          setIsAssetDropdownOpen(true);
                        }}
                        className="absolute right-3.5 top-3.5 text-slate-500 hover:text-white"
                      >
                        <Icons.Close className="w-4 h-4" />
                      </button>
                    )}
                    {isAssetDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-omni-panel border border-omni-border rounded-lg shadow-xl max-h-52 overflow-y-auto custom-scrollbar">
                        {filteredAssets.length > 0 ? (
                          filteredAssets.map(asset => (
                            <div
                              key={asset.id}
                              onClick={() => {
                                setNewTicket({ ...newTicket, assetId: asset.id });
                                setIsAssetDropdownOpen(false);
                              }}
                              className="px-4 py-2.5 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 flex justify-between items-center group"
                            >
                              <div>
                                <div className="font-bold text-white text-xs group-hover:text-omni-cyan transition-colors">
                                  {asset.name}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {asset.code} • {asset.location}
                                </div>
                              </div>
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  asset.status === 'operational' ? 'bg-green-500' : 'bg-red-500'
                                }`}
                              ></span>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-center text-slate-500 text-xs">
                            Nenhum ativo encontrado.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Título do Problema <span className="text-omni-danger">*</span>
                    </label>
                    <input
                      required
                      className="w-full bg-omni-dark border border-omni-border rounded-lg px-4 py-3 text-white focus:border-omni-cyan outline-none text-sm transition-all"
                      placeholder="Ex: Ruído excessivo no motor"
                      onChange={e => setNewTicket({ ...newTicket, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Disciplina
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'mechanical', icon: Icons.Settings, label: 'Mec.' },
                        { id: 'electrical', icon: Icons.Zap, label: 'Elét.' },
                        { id: 'hydraulic', icon: Icons.Droplets, label: 'Hidr.' },
                      ].map(type => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setNewTicket({ ...newTicket, type: type.id as any })}
                          className={`flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${
                            newTicket.type === type.id
                              ? 'bg-omni-cyan/20 border-omni-cyan text-omni-cyan shadow-sm'
                              : 'bg-omni-dark border-omni-border text-slate-500 hover:border-slate-500'
                          }`}
                        >
                          <type.icon className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Detalhamento da Falha
                    </label>
                    <button
                      type="button"
                      onClick={enhanceDescription}
                      disabled={isEnhancingDescription || !newTicket.description}
                      className={`group flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                        isEnhancingDescription
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/50 hover:shadow-[0_0_12px_rgba(168,85,247,0.3)] hover:scale-105'
                      }`}
                    >
                      {isEnhancingDescription ? (
                        <>
                          <Icons.Clock className="w-3 h-3 animate-spin" />
                          <span>Otimizando...</span>
                        </>
                      ) : (
                        <>
                          <Icons.Sparkles className="w-3 h-3 transition-transform group-hover:rotate-12" />
                          <span>Melhorar com IA</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <textarea
                      required
                      rows={4}
                      className="w-full bg-omni-dark border border-omni-border rounded-lg px-4 py-3 text-white focus:border-omni-cyan outline-none resize-none transition-all leading-relaxed text-sm pr-24"
                      placeholder="Descreva o que aconteceu..."
                      value={newTicket.description || ''}
                      onChange={e => setNewTicket({ ...newTicket, description: e.target.value })}
                    />
                    <div className="absolute bottom-2 right-2">
                      <input
                        type="file"
                        id="ticket-image"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      {ticketImage ? (
                        <div className="relative group">
                          <img
                            src={ticketImage}
                            className="w-10 h-10 rounded border border-omni-cyan object-cover cursor-pointer"
                            onClick={() => setTicketImage(null)}
                            title="Remover"
                          />
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-black cursor-pointer"></div>
                        </div>
                      ) : (
                        <label
                          htmlFor="ticket-image"
                          className="w-8 h-8 rounded flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-slate-300 cursor-pointer transition-colors"
                          title="Anexar Foto"
                        >
                          <Icons.Camera className="w-4 h-4" />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Prioridade
                    </label>
                    <div className="flex bg-omni-dark rounded-lg p-1 border border-omni-border">
                      {['low', 'medium', 'high'].map(level => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setNewTicket({ ...newTicket, urgency: level as any })}
                          className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${
                            newTicket.urgency === level
                              ? level === 'low'
                                ? 'bg-blue-600 text-white'
                                : level === 'medium'
                                ? 'bg-yellow-600 text-white'
                                : 'bg-orange-600 text-white'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {level === 'low' ? 'Baixa' : level === 'medium' ? 'Média' : 'Alta'}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setNewTicket({ ...newTicket, urgency: 'critical' })}
                        className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${
                          newTicket.urgency === 'critical'
                            ? 'bg-red-600 text-white animate-pulse'
                            : 'text-slate-500 hover:text-red-400'
                        }`}
                      >
                        Crítica
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Solicitante
                    </label>
                    <div className="flex items-center gap-3 h-[38px] px-3 bg-omni-dark border border-omni-border rounded-lg">
                      <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-white">
                        ES
                      </div>
                      <span className="text-xs text-slate-300 font-medium">Eng. Silva (Você)</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-omni-danger hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg shadow-red-900/20 transition-all flex items-center gap-2 text-xs"
                  >
                    <Icons.Check className="w-4 h-4" /> Abrir O.S.
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- EXECUTION & DETAILS MODAL (RESTORED ADVANCED LAYOUT + RCA) --- */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-omni-panel border border-omni-border rounded-xl w-full max-w-7xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/10">
            {/* Modal Header REFACTORED FOR WORKFLOW */}
            <div className="h-20 px-6 border-b border-omni-border bg-omni-dark flex items-center justify-between shrink-0 gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center border bg-opacity-20 shrink-0 ${
                    getUrgencyStyles(selectedTicket.urgency).bg.split(' ')[0]
                  } ${getUrgencyStyles(selectedTicket.urgency).border}`}
                >
                  {selectedTicket.type === 'electrical' ? (
                    <Icons.Zap className="w-5 h-5 text-white" />
                  ) : (
                    <Icons.Wrench className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-0.5">
                    <h2 className="text-xl font-bold text-white tracking-tight truncate">
                      {selectedTicket.title}
                    </h2>
                    <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded shrink-0">
                      #{selectedTicket.id}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ml-2 ${
                        getStatusStyle(selectedTicket.status).class
                      }`}
                    >
                      {getStatusStyle(selectedTicket.status).label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Icons.Box className="w-3 h-3" />{' '}
                      {assets.find(a => a.id === selectedTicket.assetId)?.name}
                    </span>
                    <span className="w-px h-3 bg-slate-700"></span>
                    <span className="flex items-center gap-1">
                      <Icons.User className="w-3 h-3" /> Req: {selectedTicket.requester}
                    </span>
                  </div>
                </div>
              </div>

              {/* WORKFLOW ACTIONS */}
              <div className="flex items-center gap-4 bg-slate-800/50 p-1.5 rounded-lg border border-slate-700/50">
                {/* PRIORITY SELECTOR */}
                <div className="flex flex-col px-2">
                  <span className="text-[9px] uppercase font-bold text-slate-500 mb-0.5">
                    Prioridade
                  </span>
                  <select
                    value={selectedTicket.priority || 'medium'}
                    onChange={e => handlePriorityChange(e.target.value as any)}
                    className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer hover:text-omni-cyan"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="critical">Crítica</option>
                  </select>
                </div>

                <div className="w-px h-8 bg-slate-700"></div>

                {/* ASSIGNEE SELECTOR */}
                <div className="flex flex-col px-2 min-w-[120px]">
                  <span className="text-[9px] uppercase font-bold text-slate-500 mb-0.5">
                    Técnico Resp.
                  </span>
                  <select
                    value={selectedTicket.assignee_id || ''}
                    onChange={e => handleAssign(e.target.value)}
                    className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer hover:text-omni-cyan w-full"
                  >
                    <option value="">-- Atribuir --</option>
                    {technicians.map(tech => (
                      <option key={tech.id} value={tech.id} className="text-black">
                        {tech.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-px h-8 bg-slate-700"></div>

                {/* ACTION BUTTONS */}
                <div className="flex gap-2">
                  {selectedTicket.status === 'open' && (
                    <button
                      onClick={() => handleStatusChange('analyzing')}
                      className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg"
                    >
                      Iniciar Análise
                    </button>
                  )}
                  {selectedTicket.status === 'analyzing' && (
                    <button
                      onClick={() => handleStatusChange('assigned')}
                      className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg"
                    >
                      Liberar p/ Execução
                    </button>
                  )}
                  {(selectedTicket.status === 'assigned' ||
                    selectedTicket.status === 'waiting-parts') && (
                    <button
                      onClick={() => handleStatusChange('in-progress')}
                      className="px-3 py-1.5 rounded bg-omni-cyan hover:bg-cyan-400 text-omni-dark text-xs font-bold shadow-lg flex items-center gap-1"
                    >
                      <Icons.Play className="w-3 h-3" /> Iniciar Trab.
                    </button>
                  )}
                  {selectedTicket.status === 'in-progress' && (
                    <>
                      <button
                        onClick={() => handleStatusChange('waiting-parts')}
                        className="px-3 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-lg"
                      >
                        Aguardar Peça
                      </button>
                      <button
                        onClick={() => handleStatusChange('done')}
                        className="px-3 py-1.5 rounded bg-green-600 hover:bg-green-500 text-white text-xs font-bold shadow-lg flex items-center gap-1"
                      >
                        <Icons.Check className="w-3 h-3" /> Concluir
                      </button>
                    </>
                  )}
                  {selectedTicket.status === 'done' && (
                    <span className="text-green-500 font-bold text-xs px-3 flex items-center gap-1">
                      <Icons.Check className="w-4 h-4" /> Finalizado
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="group p-2 rounded-full hover:bg-slate-800 transition-colors ml-4"
              >
                <Icons.Close className="w-6 h-6 text-slate-400 group-hover:text-white" />
              </button>
            </div>

            {/* Modal Body: Split View */}
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
                  {/* RCA TAB ADDED HERE */}
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
                  {/* --- ABA EXECUÇÃO (RESTORED ADVANCED LAYOUT) --- */}
                  {activeTab === 'execution' && (
                    <div className="h-full flex flex-col">
                      {/* Top Bar: Timer, Voice & Progress */}
                      <div className="h-20 border-b border-omni-border bg-omni-dark/30 flex items-center px-8 justify-between shrink-0">
                        {/* CLEANER TIMER CONTROLS CONTAINER */}
                        <div className="flex items-center gap-8">
                          {/* The Timer Group */}
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
                              {/* Play/Pause Button */}
                              <button
                                onClick={() => setIsTimerRunning(!isTimerRunning)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                  isTimerRunning
                                    ? 'bg-amber-500 text-omni-dark hover:bg-amber-400'
                                    : 'bg-green-600 text-white hover:bg-green-500'
                                }`}
                                title={isTimerRunning ? 'Pausar' : 'Iniciar'}
                              >
                                {isTimerRunning ? (
                                  <Icons.Pause className="w-5 h-5 fill-current" />
                                ) : (
                                  <Icons.Play className="w-5 h-5 fill-current ml-0.5" />
                                )}
                              </button>

                              {/* Stop Button */}
                              <button
                                onClick={handleStopTimer}
                                disabled={elapsedSeconds === 0}
                                className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 border border-slate-700 hover:bg-red-600 hover:text-white hover:border-red-600 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Icons.Square className="w-4 h-4 fill-current" />
                              </button>
                            </div>
                          </div>

                          {/* VOICE MODE TOGGLE */}
                          <button
                            onClick={toggleVoiceMode}
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
                      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
                        {/* Voice Listening Overlay */}
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
                            {/* Active Step Card */}
                            {activeStepIndex < checklist.length && (
                              <div
                                className={`
                                                          p-8 rounded-2xl border-2 shadow-2xl relative overflow-hidden transition-all duration-500
                                                          ${getStepColor(
                                                            checklist[activeStepIndex].category
                                                          )}
                                                      `}
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
                                    onChange={handleImageUpload}
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

                  {/* OVERVIEW TAB */}
                  {activeTab === 'overview' && (
                    <div className="flex flex-col h-full overflow-hidden">
                      <div className="max-w-4xl mx-auto p-8 w-full flex flex-col h-full">
                        <div className="mb-8 flex gap-3 shrink-0">
                          <input
                            className="flex-1 bg-omni-dark border border-omni-border rounded-xl px-6 py-4 text-white focus:border-omni-cyan outline-none shadow-sm transition-all text-sm"
                            placeholder="Adicionar atualização ou comentário..."
                            value={newActivity}
                            onChange={e => setNewActivity(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddActivity()}
                          />
                          <button
                            onClick={handleAddActivity}
                            className="bg-omni-cyan hover:bg-cyan-400 text-omni-dark px-8 rounded-xl font-bold shadow-lg shadow-cyan-900/20 transition-all"
                          >
                            Enviar
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                          <div className="space-y-6">
                            {selectedTicket.activities?.map((activity, idx) => (
                              <div key={idx} className="flex gap-4 relative group">
                                <div className="absolute left-[15px] top-8 bottom-[-24px] w-px bg-slate-800 last:hidden"></div>
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold z-10 border-2 border-omni-panel shadow-sm ${
                                    activity.userName === 'Sistema'
                                      ? 'bg-slate-700 text-slate-300'
                                      : 'bg-omni-cyan text-omni-dark'
                                  }`}
                                >
                                  {activity.type === 'time_log' ? (
                                    <Icons.Clock className="w-4 h-4" />
                                  ) : (
                                    activity.userName.charAt(0)
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-baseline gap-2 mb-1">
                                    <span className="font-bold text-white text-sm">
                                      {activity.userName}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      {new Date(activity.timestamp).toLocaleString()}
                                    </span>
                                  </div>
                                  <div
                                    className={`p-4 rounded-xl border text-sm ${
                                      activity.type === 'status_change'
                                        ? 'bg-purple-900/10 border-purple-500/20 text-purple-200'
                                        : activity.type === 'part_usage'
                                        ? 'bg-orange-900/10 border-orange-500/20 text-orange-200'
                                        : activity.type === 'time_log'
                                        ? 'bg-blue-900/10 border-blue-500/20 text-blue-200'
                                        : 'bg-omni-dark border-omni-border text-slate-300'
                                    }`}
                                  >
                                    {activity.action}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Parts tab */}
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
                              {inventory.map(part => (
                                <option key={part.id} value={part.id}>
                                  {part.code} - {part.name} (Estoque: {part.quantity})
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
                            className="bg-omni-cyan disabled:opacity-50 hover:bg-cyan-400 text-omni-dark font-bold py-3 px-6 rounded-lg text-sm transition-colors shadow-lg shadow-cyan-500/20"
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
                            {selectedTicket.usedParts?.map(usage => (
                              <tr key={usage.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 text-white">{usage.partName}</td>
                                <td className="px-6 py-4 text-center text-slate-300">
                                  {usage.quantity}
                                </td>
                                <td className="px-6 py-4 text-right text-slate-400">
                                  R$ {usage.unitCost.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right text-white font-bold">
                                  R$ {usage.totalCost.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* --- NEW TAB: AI RCA ANALYSIS --- */}
                  {activeTab === 'analysis' && (
                    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="mb-6 bg-omni-dark/50 border border-omni-border rounded-xl p-6 text-center">
                        <h4 className="text-lg font-bold text-white mb-2">
                          Análise de Causa Raiz (RCA)
                        </h4>
                        <p className="text-sm text-slate-400 max-w-2xl mx-auto mb-6">
                          A IA analisará o histórico de atividades, peças trocadas e a descrição do
                          problema para gerar um relatório técnico de falha aplicando metodologias
                          como 5 Porquês ou Ishikawa.
                        </p>

                        <button
                          onClick={generateRCA}
                          disabled={isGeneratingRCA}
                          className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-purple-900/20 flex items-center gap-3 mx-auto transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGeneratingRCA ? (
                            <Icons.Clock className="w-5 h-5 animate-spin" />
                          ) : (
                            <Icons.Sparkles className="w-5 h-5" />
                          )}
                          {isGeneratingRCA ? 'Analisando Dados...' : 'Gerar Relatório de Falha'}
                        </button>
                      </div>

                      <div className="flex-1 bg-omni-dark border border-omni-border rounded-xl p-8 overflow-y-auto custom-scrollbar shadow-inner relative flex flex-col">
                        {rcaReport ? (
                          <>
                            <div className="flex justify-end mb-4 sticky top-0 bg-omni-dark/95 backdrop-blur-sm p-2 z-10 border-b border-omni-border">
                              <button
                                onClick={handleSaveRCA}
                                className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg text-sm flex items-center gap-2 transition-all shadow-lg hover:shadow-green-500/20"
                              >
                                <Icons.Check className="w-4 h-4" /> Salvar Análise
                              </button>
                            </div>
                            <div
                              className="text-slate-300 space-y-4 font-sans"
                              dangerouslySetInnerHTML={{ __html: rcaReport }}
                            />
                          </>
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
