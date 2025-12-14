import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { useMaintenance } from '../context/MaintenanceContext';
import { MaintenanceTicket, TicketPartUsage, ChecklistItem } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- HELPERS ---
const extractJson = (text: string) => {
  try {
    // 1. Tenta remover blocos de código markdown
    let cleanText = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    // 2. Tenta encontrar array JSON explícito
    const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      cleanText = jsonMatch[0];
    }
    return JSON.parse(cleanText);
  } catch (e) {
    console.error('Erro ao fazer parse do JSON da IA:', e);
    return [];
  }
};

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

// --- SUB-COMPONENTES ---

// 1. TELA DE LOGIN (MANTIDA)
const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      onLogin();
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0B0E14] p-8 items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-omni-cyan to-transparent opacity-50"></div>

      <div className="relative z-10 w-full max-w-sm animate-in fade-in zoom-in duration-500">
        <div className="mb-12 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-slate-800 to-black border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl mx-auto mb-6 relative group">
            <div className="absolute inset-0 bg-omni-cyan/20 blur-xl rounded-full group-hover:bg-omni-cyan/30 transition-all"></div>
            <Icons.Activity className="text-omni-cyan w-12 h-12 relative z-10" />
          </div>
          <h1 className="text-4xl font-display font-bold text-white tracking-widest mb-1">
            OMNI<span className="text-omni-cyan">GUARD</span>
          </h1>
          <p className="text-xs text-slate-500 font-mono tracking-[0.4em] uppercase">
            Mobile Tech v3.0
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">
              ID Técnico
            </label>
            <div className="relative">
              <Icons.User className="absolute left-4 top-4 w-4 h-4 text-slate-500" />
              <input
                type="text"
                defaultValue="TEC-001"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl py-3.5 pl-10 pr-4 text-white focus:border-omni-cyan outline-none transition-all placeholder-slate-600 font-medium"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">
              Senha de Acesso
            </label>
            <div className="relative">
              <Icons.Lock className="absolute left-4 top-4 w-4 h-4 text-slate-500" />
              <input
                type="password"
                defaultValue="123456"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl py-3.5 pl-10 pr-4 text-white focus:border-omni-cyan outline-none transition-all font-medium"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-omni-cyan hover:bg-cyan-400 text-black font-bold py-4 rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.3)] transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 mt-8 uppercase tracking-wider text-sm"
          >
            {loading ? (
              <Icons.Cpu className="w-5 h-5 animate-spin" />
            ) : (
              <Icons.LogOut className="w-5 h-5 rotate-180" />
            )}
            {loading ? 'AUTENTICANDO...' : 'ACESSAR SISTEMA'}
          </button>
        </form>
      </div>

      <p className="absolute bottom-8 text-center text-[10px] text-slate-600 font-mono">
        System Status: Online • Latency: 24ms
        <br />
        Secure Connection TLS 1.3
      </p>
    </div>
  );
};

// 2. MODAL DE CAMERA / SCANNER
const ScanOverlay = ({
  onClose,
  onScan,
}: {
  onClose: () => void;
  onScan: (code: string) => void;
}) => {
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setScanning(false);
      onScan('TG-01');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center">
      <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center"></div>

      <div className="relative w-72 h-72 border-2 border-omni-cyan/70 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(6,182,212,0.3)] z-10">
        <div className="absolute top-0 left-0 w-full h-full border-[20px] border-black/30"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_15px_red] animate-[scan_2s_linear_infinite]"></div>

        <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-omni-cyan rounded-tl-lg"></div>
        <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-omni-cyan rounded-tr-lg"></div>
        <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-omni-cyan rounded-bl-lg"></div>
        <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-omni-cyan rounded-br-lg"></div>

        <div className="absolute inset-0 flex items-center justify-center">
          {scanning ? (
            <p className="text-white font-mono text-xs bg-black/60 px-3 py-1 rounded animate-pulse">
              BUSCANDO QR CODE...
            </p>
          ) : (
            <div className="bg-green-500 text-black font-bold px-4 py-2 rounded-lg animate-in zoom-in flex items-center gap-2">
              <Icons.CheckCircle2 className="w-5 h-5" /> IDENTIFICADO
            </div>
          )}
        </div>
      </div>

      <p className="text-slate-400 text-xs mt-8 relative z-10 font-medium">
        Aponte a câmera para o código do equipamento
      </p>

      <button
        onClick={onClose}
        className="mt-8 bg-white/10 border border-white/20 text-white rounded-full p-4 relative z-10 hover:bg-white/20 transition-all"
      >
        <Icons.Close className="w-6 h-6" />
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
  );
};

// 3. TELA DE AJUSTES E PERFIL (RESTAURADA E MELHORADA)
const SettingsScreen = ({
  currentUser,
  onLogout,
  onClose,
}: {
  currentUser: any;
  onLogout: () => void;
  onClose: () => void;
}) => {
  // Simulação de estados locais para os toggles
  const [pushEnabled, setPushEnabled] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [biometrics, setBiometrics] = useState(true);

  return (
    <div className="flex flex-col h-full bg-[#0B0E14] animate-in slide-in-from-right duration-300 relative z-50">
      {/* Header */}
      <div className="pt-10 pb-6 px-6 bg-gradient-to-b from-slate-900 to-[#0B0E14] border-b border-white/5 flex items-center gap-4">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white"
        >
          <Icons.ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-white font-display tracking-wide">
          Meu Perfil & Ajustes
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-24 custom-scrollbar">
        {/* Profile Card */}
        <div className="flex flex-col items-center bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Icons.Activity className="w-32 h-32 text-white" />
          </div>

          <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-br from-omni-cyan to-purple-600 mb-4 shadow-lg shadow-purple-500/20 relative">
            <img
              src={currentUser.avatar}
              className="w-full h-full rounded-full object-cover border-4 border-[#0B0E14]"
            />
            <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-[#0B0E14] flex items-center justify-center">
              <Icons.Check className="w-3 h-3 text-black stroke-[3]" />
            </div>
          </div>

          <h3 className="text-xl font-bold text-white">{currentUser.name}</h3>
          <p className="text-sm text-omni-cyan font-bold uppercase tracking-wider mb-1">
            {currentUser.role}
          </p>
          <p className="text-xs text-slate-500 font-mono">ID: {currentUser.id} • Turno A</p>

          <div className="grid grid-cols-2 gap-4 w-full mt-6">
            <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
              <span className="text-2xl font-display font-bold text-white block">98%</span>
              <span className="text-[10px] text-slate-400 uppercase">Eficiência</span>
            </div>
            <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
              <span className="text-2xl font-display font-bold text-white block">142</span>
              <span className="text-[10px] text-slate-400 uppercase">O.S. Realizadas</span>
            </div>
          </div>
        </div>

        {/* Settings Groups */}
        <div className="space-y-6">
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 ml-2 tracking-widest">
              Geral
            </h4>
            <div className="bg-slate-900 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
              <div
                className="flex items-center justify-between p-4 active:bg-slate-800 transition-colors cursor-pointer"
                onClick={() => setPushEnabled(!pushEnabled)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                    <Icons.Bell className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-slate-200">Notificações Push</span>
                </div>
                <div
                  className={`w-11 h-6 rounded-full relative transition-colors ${
                    pushEnabled ? 'bg-omni-cyan' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${
                      pushEnabled ? 'left-6' : 'left-1'
                    }`}
                  ></div>
                </div>
              </div>
              <div
                className="flex items-center justify-between p-4 active:bg-slate-800 transition-colors cursor-pointer"
                onClick={() => setBiometrics(!biometrics)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                    <Icons.Lock className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-slate-200">Biometria / FaceID</span>
                </div>
                <div
                  className={`w-11 h-6 rounded-full relative transition-colors ${
                    biometrics ? 'bg-omni-cyan' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${
                      biometrics ? 'left-6' : 'left-1'
                    }`}
                  ></div>
                </div>
              </div>
              <div
                className="flex items-center justify-between p-4 active:bg-slate-800 transition-colors cursor-pointer"
                onClick={() => setOfflineMode(!offlineMode)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                    <Icons.Wifi className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-slate-200">Modo Offline Forçado</span>
                </div>
                <div
                  className={`w-11 h-6 rounded-full relative transition-colors ${
                    offlineMode ? 'bg-orange-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${
                      offlineMode ? 'left-6' : 'left-1'
                    }`}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 ml-2 tracking-widest">
              Suporte
            </h4>
            <div className="bg-slate-900 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
              <div className="flex items-center justify-between p-4 active:bg-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                    <Icons.Smartphone className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-slate-200">Ajuda e Suporte</span>
                </div>
                <Icons.ChevronRight className="w-4 h-4 text-slate-600" />
              </div>
              <div className="flex items-center justify-between p-4 active:bg-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-700/50 rounded-lg text-slate-400">
                    <Icons.FileText className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-slate-200">Termos de Uso</span>
                </div>
                <Icons.ChevronRight className="w-4 h-4 text-slate-600" />
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-4 rounded-xl border border-red-900/30 bg-red-900/10 text-red-500 font-bold uppercase text-sm hover:bg-red-900/20 transition-all flex items-center justify-center gap-2 mt-4"
          >
            <Icons.LogOut className="w-4 h-4" /> Sair da Conta
          </button>

          <p className="text-center text-[10px] text-slate-600 font-mono">
            OmniGuard Mobile v3.0.1 (Build 992)
            <br />
            Developed by OmniSystems Inc.
          </p>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---

export const MobileFieldView: React.FC = () => {
  // CONTEXTO GLOBAL
  const {
    tickets,
    assets,
    inventory,
    updateTicket,
    updateTicketStatus,
    consumePartInTicket,
    technicians,
  } = useMaintenance();

  // NAVEGAÇÃO
  const [screen, setScreen] = useState<'login' | 'list' | 'details' | 'scan' | 'settings'>('login');
  const [activeNav, setActiveNav] = useState<'tasks' | 'scan' | 'settings'>('tasks');

  // ESTADO DO TICKET
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [activeTab, setActiveTab] = useState<'execution' | 'parts' | 'timeline' | 'analysis'>(
    'execution'
  );
  const [searchTerm, setSearchTerm] = useState('');

  // EXECUÇÃO
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  // IA STATES
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);
  const [isGeneratingRCA, setIsGeneratingRCA] = useState(false);
  const [rcaReport, setRcaReport] = useState<string | null>(null);

  // PEÇAS
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQuantity, setPartQuantity] = useState(1);

  // UI AUX
  const [showProcedure, setShowProcedure] = useState(false); // <--- Adicionado
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(
    null
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // USUÁRIO LOGADO MOCK
  const currentUser = technicians[0];

  // --- EFEITOS ---
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  useEffect(() => {
    if (selectedTicket) {
      setChecklist(selectedTicket.checklist || []);
      setRcaReport(null);
      setTimer(0);
      setIsTimerRunning(selectedTicket.status === 'in-progress');
    }
  }, [selectedTicket?.id]);

  const handleNavChange = (nav: 'tasks' | 'scan' | 'settings') => {
    setActiveNav(nav);
    if (nav === 'tasks') setScreen('list');
    if (nav === 'scan') setScreen('scan');
    if (nav === 'settings') setScreen('settings');
  };

  // --- ACTIONS ---
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleScanResult = (scannedCode: string) => {
    const relatedTicket = tickets.find(t => t.assetId === scannedCode && t.status !== 'done');
    if (relatedTicket) {
      setScreen('details');
      setSelectedTicket(relatedTicket);
      setActiveNav('tasks');
      showToast(`Ativo ${scannedCode} encontrado! Abrindo O.S.`, 'success');
    } else {
      showToast(`Ativo ${scannedCode} identificado. Nenhuma O.S. aberta.`, 'info');
      setScreen('list');
      setActiveNav('tasks');
    }
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600)
      .toString()
      .padStart(2, '0');
    const m = Math.floor((s % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const s_str = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s_str}`;
  };

  const getAsset = (id: string) => assets.find(a => a.id === id);

  const syncTicketLocal = (updatedTicket: MaintenanceTicket) => {
    updateTicket(updatedTicket);
    setSelectedTicket(updatedTicket);
  };

  const handleStatusChange = (newStatus: string) => {
    if (!selectedTicket) return;
    if (newStatus === 'in-progress') setIsTimerRunning(true);
    else setIsTimerRunning(false);

    updateTicketStatus(selectedTicket.id, newStatus as any);
    const updated = { ...selectedTicket, status: newStatus as any };
    setSelectedTicket(updated);
    showToast(`Status alterado: ${newStatus.toUpperCase()}`, 'info');
  };

  // --- AI FUNCTIONS ---
  const handleGenerateChecklist = async () => {
    if (!selectedTicket) return;
    setIsGeneratingChecklist(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const asset = getAsset(selectedTicket.assetId);

      const prompt = `
        Atue como um Especialista Sênior em Manutenção Industrial.
        Crie um CHECKLIST TÉCNICO DETALHADO para a seguinte ordem de serviço:
        
        Ativo: ${asset?.name} (${asset?.model})
        Problema: "${selectedTicket.title}"
        Descrição: "${selectedTicket.description}"
        
        Gere 4 a 6 passos práticos e diretos.
        Para cada passo, forneça:
        1. Texto claro da ação.
        2. Categoria (security, execution, verification).
        3. Um emoji relevante no início do texto.
        
        Retorne APENAS um Array JSON puro, sem markdown:
        [{"category": "safety", "text": "🔒 Bloquear painel..."}, {"category": "execution", "text": "🔧 Desmontar..."}]
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (text) {
        const itemsData = extractJson(text);
        const items = itemsData.map((i: any, idx: number) => ({
          id: Date.now() + idx.toString(),
          text: i.text,
          checked: false,
          category: i.category || 'execution',
        }));

        const updated = { ...selectedTicket, checklist: items };
        syncTicketLocal(updated);
        setChecklist(items);
        showToast('Checklist Inteligente Gerado!', 'success');

        // Auto-read first step if voice is active or user requested generation
        // speakText('Procedimento gerado com sucesso. Iniciando leitura.');
      }
    } catch (e) {
      console.error(e);
      showToast('Erro ao conectar com IA Geradora.', 'error');
    } finally {
      setIsGeneratingChecklist(false);
    }
  };

  const toggleCheckItem = (idx: number) => {
    const newChecklist = [...checklist];
    newChecklist[idx].checked = !newChecklist[idx].checked;
    setChecklist(newChecklist);
    if (selectedTicket) {
      const updated = { ...selectedTicket, checklist: newChecklist };
      syncTicketLocal(updated);
    }
  };

  const handleChecklistImage = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const newChecklist = [...checklist];
      newChecklist[idx].photoUrl = url;
      setChecklist(newChecklist);
      if (selectedTicket) {
        syncTicketLocal({ ...selectedTicket, checklist: newChecklist });
        showToast('Foto anexada!', 'success');
      }
    }
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
        syncTicketLocal({
          ...selectedTicket,
          usedParts: [...(selectedTicket.usedParts || []), usage],
          totalCost: (selectedTicket.totalCost || 0) + usage.totalCost,
        });
        showToast(`Peça adicionada!`, 'success');
      }
      setSelectedPartId('');
      setPartQuantity(1);
    } else {
      showToast('Estoque insuficiente!', 'error');
    }
  };

  const handleGenerateRCA = async () => {
    if (!selectedTicket) return;
    setIsGeneratingRCA(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const asset = getAsset(selectedTicket.assetId);

      const prompt = `
                Atue como um Engenheiro Sênior de Manutenção.
                Analise a falha e gere um RCA (Análise de Causa Raiz) VISUAL e RESUMIDO para mobile.
                
                Dados:
                Ativo: ${asset?.name}
                Falha: "${selectedTicket.title}"
                Descrição: "${selectedTicket.description}"
                
                Retorne APENAS HTML estilizado (Tailwind) com 3 Cards Coloridos:
                1. DIAGNÓSTICO (Vermelho/Laranja)
                2. CAUSA RAIZ (Azul)
                3. AÇÃO CORRETIVA (Verde)
                Use ícones emojis e texto curto.
            `;

      const result = await model.generateContent(prompt);
      const response = await result.response;

      if (response.text()) {
        const cleanHtml = response
          .text()
          .replace(/```html/g, '')
          .replace(/```/g, '');
        setRcaReport(cleanHtml);
        showToast('Análise RCA concluída!', 'success');
      }
    } catch (e) {
      showToast('Erro na conexão com IA.', 'error');
    } finally {
      setIsGeneratingRCA(false);
    }
  };

  // --- RENDER ---

  if (screen === 'login') return <LoginScreen onLogin={() => setScreen('list')} />;

  // Toast Global
  const ToastComponent = () =>
    toast ? (
      <div
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300 border ${
          toast.type === 'success'
            ? 'bg-green-900/90 border-green-500 text-white'
            : toast.type === 'error'
            ? 'bg-red-900/90 border-red-500 text-white'
            : 'bg-slate-800 border-slate-500 text-white'
        }`}
      >
        {toast.type === 'success' ? (
          <Icons.Check className="w-5 h-5" />
        ) : toast.type === 'error' ? (
          <Icons.AlertCircle className="w-5 h-5" />
        ) : (
          <Icons.Bell className="w-5 h-5" />
        )}
        <span className="font-bold text-sm">{toast.msg}</span>
      </div>
    ) : null;

  return (
    <div className="flex flex-col h-screen bg-[#0B0E14] text-white overflow-hidden relative font-sans">
      <ToastComponent />

      {/* OVERLAYS */}
      {/* 4. SMART PROCEDURE MODAL (AI) */}
      {selectedTicket && activeTab === 'execution' && checklist.length > 0 && (
        <div
          className={`fixed inset-x-0 bottom-0 z-50 bg-[#151923] border-t border-white/10 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-transform duration-300 transform ${
            screen === 'details' ? 'translate-y-0' : 'translate-y-full'
          } flex flex-col max-h-[85vh]`}
        >
          {/* Handle Bar */}
          <div
            className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
            onClick={() => setShowProcedure(!showProcedure)}
          >
            <div className="w-12 h-1.5 bg-slate-700 rounded-full"></div>
          </div>

          {/* Header */}
          <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center shrink-0">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Icons.Sparkles className="w-5 h-5 text-purple-400" />
                Procedimento IA
              </h3>
              <p className="text-xs text-slate-400">
                {checklist.filter(i => i.checked).length}/{checklist.length} passos concluídos
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (isVoiceActive) {
                    window.speechSynthesis.cancel();
                    setIsVoiceActive(false);
                  } else {
                    const textToRead = checklist.map(i => i.text).join('. ');
                    speakText(textToRead);
                    setIsVoiceActive(true);
                  }
                }}
                className={`p-3 rounded-xl transition-all ${
                  isVoiceActive
                    ? 'bg-purple-500 text-white animate-pulse'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {isVoiceActive ? (
                  <Icons.Stop className="w-5 h-5" />
                ) : (
                  <Icons.Mic className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => setChecklist([])} // Close/Clear
                className="p-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                <Icons.ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Steps List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {checklist.map((item, idx) => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all ${
                  item.checked
                    ? 'bg-green-900/10 border-green-500/30 opacity-60'
                    : 'bg-black/20 border-white/5 hover:border-purple-500/30'
                }`}
              >
                <div className="flex gap-4">
                  <div className="pt-1">
                    <button
                      onClick={() => toggleCheckItem(idx)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        item.checked
                          ? 'bg-green-500 border-green-500 text-black'
                          : 'border-slate-500 text-transparent hover:border-purple-400'
                      }`}
                    >
                      <Icons.Check className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          item.category === 'safety'
                            ? 'bg-red-500/20 text-red-400'
                            : item.category === 'verification'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {item.category === 'safety'
                          ? 'Segurança'
                          : item.category === 'verification'
                          ? 'Verificação'
                          : 'Execução'}
                      </span>
                    </div>
                    <p
                      className={`text-sm leading-relaxed ${
                        item.checked ? 'text-slate-500 line-through' : 'text-slate-200'
                      }`}
                    >
                      {item.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-white/5 bg-[#151923] shrink-0 pb-8">
            <button
              onClick={() => {
                const allChecked = checklist.map(i => ({ ...i, checked: true }));
                setChecklist(allChecked);
                if (selectedTicket) syncTicketLocal({ ...selectedTicket, checklist: allChecked });
                showToast('Todos os passos marcados!', 'success');
              }}
              className="w-full py-3 bg-purple-600/20 text-purple-400 border border-purple-500/50 rounded-xl font-bold uppercase text-sm hover:bg-purple-600 hover:text-white transition-all"
            >
              Concluir Todos
            </button>
          </div>
        </div>
      )}

      {screen === 'scan' && (
        <ScanOverlay onClose={() => handleNavChange('tasks')} onScan={handleScanResult} />
      )}
      {screen === 'settings' && (
        <SettingsScreen
          currentUser={currentUser}
          onLogout={() => setScreen('login')}
          onClose={() => handleNavChange('tasks')}
        />
      )}

      {/* DASHBOARD (LIST) SCREEN */}
      {screen === 'list' && (
        <div className="flex flex-col h-full animate-in fade-in duration-300 bg-[#0B0E14]">
          {/* Header Premium */}
          <div className="pt-12 pb-6 px-6 bg-gradient-to-b from-[#1a1f2e] to-[#0B0E14] border-b border-white/5 relative z-10 rounded-b-3xl shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-omni-cyan p-0.5 relative">
                  <img
                    src={currentUser.avatar}
                    className="w-full h-full rounded-full object-cover"
                  />
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0B0E14]"></div>
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-medium">Bem-vindo,</p>
                  <h2 className="text-xl font-bold font-display tracking-wide text-white leading-tight">
                    {currentUser.name}
                  </h2>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="w-10 h-10 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-slate-300 relative">
                  <Icons.Bell className="w-5 h-5" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
              </div>
            </div>

            {/* Search Bar Modern */}
            <div className="relative shadow-lg">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Icons.Search className="w-5 h-5 text-slate-500" />
              </div>
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar ordem, ativo ou ID..."
                className="block w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-white/10 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-omni-cyan/50 focus:bg-slate-800 transition-all backdrop-blur-md"
              />
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                <button className="p-2 text-slate-500 hover:text-omni-cyan bg-white/5 rounded-xl">
                  <Icons.Filter className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* KPI Cards Horizontal Scroll */}
          <div className="pt-6 px-6 pb-2 overflow-x-auto no-scrollbar flex gap-4 shrink-0">
            <div className="min-w-[150px] bg-gradient-to-br from-blue-600/20 to-blue-900/10 border border-blue-500/30 p-4 rounded-2xl flex flex-col justify-between h-28 relative overflow-hidden group">
              <Icons.ClipboardList className="w-6 h-6 text-blue-400 mb-2" />
              <div>
                <span className="text-3xl font-display font-bold text-white block leading-none">
                  {tickets.filter(t => t.status !== 'done').length}
                </span>
                <span className="text-[10px] text-blue-300 uppercase font-bold tracking-wider">
                  Pendentes
                </span>
              </div>
            </div>
            <div className="min-w-[150px] bg-gradient-to-br from-red-600/20 to-red-900/10 border border-red-500/30 p-4 rounded-2xl flex flex-col justify-between h-28 relative overflow-hidden group">
              <Icons.AlertTriangle className="w-6 h-6 text-red-400 mb-2" />
              <div>
                <span className="text-3xl font-display font-bold text-white block leading-none">
                  {tickets.filter(t => t.urgency === 'critical' && t.status !== 'done').length}
                </span>
                <span className="text-[10px] text-red-300 uppercase font-bold tracking-wider">
                  Críticos
                </span>
              </div>
            </div>
            <div className="min-w-[150px] bg-gradient-to-br from-green-600/20 to-green-900/10 border border-green-500/30 p-4 rounded-2xl flex flex-col justify-between h-28">
              <Icons.CheckCircle2 className="w-6 h-6 text-green-400 mb-2" />
              <div>
                <span className="text-3xl font-display font-bold text-white block leading-none">
                  98%
                </span>
                <span className="text-[10px] text-green-300 uppercase font-bold tracking-wider">
                  Eficiência
                </span>
              </div>
            </div>
          </div>

          {/* Content List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 pb-32 custom-scrollbar">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-1 h-1 bg-omni-cyan rounded-full"></span> Próximas Tarefas
            </h3>

            {tickets
              .filter(
                t =>
                  t.status !== 'done' &&
                  (t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    t.id.toLowerCase().includes(searchTerm.toLowerCase()))
              )
              .map(t => {
                const asset = getAsset(t.assetId);
                const isCritical = t.urgency === 'critical';
                const isInProgress = t.status === 'in-progress';
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTicket(t);
                      setScreen('details');
                    }}
                    className={`
                                        bg-[#151923] p-5 rounded-2xl border border-white/5 shadow-lg active:scale-[0.98] transition-all relative overflow-hidden group
                                        ${
                                          isInProgress
                                            ? 'ring-1 ring-omni-cyan shadow-omni-cyan/10'
                                            : ''
                                        }
                                    `}
                  >
                    {isInProgress && (
                      <div className="absolute top-0 right-0 bg-omni-cyan text-black text-[9px] font-bold px-3 py-1 rounded-bl-xl shadow-lg">
                        EM EXECUÇÃO
                      </div>
                    )}
                    {isCritical && !isInProgress && (
                      <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl shadow-lg animate-pulse">
                        CRÍTICO
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-mono bg-black/40 text-slate-400 px-2 py-1 rounded-md border border-white/5">
                        {t.id}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-base leading-tight mb-3 pr-4">
                      {t.title}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-slate-400 bg-black/20 p-2 rounded-lg w-fit mb-3 border border-white/5">
                      <Icons.Box className="w-3.5 h-3.5 text-omni-cyan" />
                      <span className="truncate max-w-[200px] font-medium text-slate-300">
                        {asset?.name}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Icons.Calendar className="w-3 h-3" />{' '}
                        {new Date(t.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-1 text-xs font-bold text-omni-cyan group-hover:translate-x-1 transition-transform">
                        Abrir <Icons.ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* DETAILS SCREEN */}
      {screen === 'details' && selectedTicket && (
        <div className="flex flex-col h-full bg-[#0B0E14] text-white animate-in slide-in-from-right duration-300 relative">
          {/* Header Simples */}
          <div className="pt-10 pb-3 px-4 bg-slate-900 border-b border-white/5 sticky top-0 z-30 shadow-xl flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 overflow-hidden">
              <button
                onClick={() => setScreen('list')}
                className="p-2 -ml-2 text-slate-400 active:text-white rounded-full hover:bg-white/10"
              >
                <Icons.ChevronLeft className="w-6 h-6" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold truncate text-white leading-tight">
                  {selectedTicket.title}
                </h2>
                <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <span className="bg-slate-800 px-1 rounded">{selectedTicket.id}</span>
                </p>
              </div>
            </div>
            <div className="shrink-0 pl-2">
              <select
                value={selectedTicket.status}
                onChange={e => handleStatusChange(e.target.value)}
                className={`text-[10px] font-bold uppercase bg-black/40 border rounded px-2 py-1.5 outline-none ${
                  selectedTicket.status === 'in-progress'
                    ? 'border-omni-cyan text-omni-cyan'
                    : 'border-slate-600 text-slate-400'
                }`}
              >
                <option value="open">Aberto</option>
                <option value="in-progress">Executando</option>
                <option value="waiting-parts">Peças</option>
                <option value="done">Concluído</option>
              </select>
            </div>
          </div>

          {/* Timer Bar */}
          <div className="bg-slate-900/50 border-b border-white/5 p-3 flex items-center gap-3 shrink-0">
            <div className="flex-1 flex items-center gap-3 bg-black/40 p-2 rounded-xl border border-white/5 pr-4">
              <div className="flex flex-col px-2 border-r border-white/10">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                  Tempo
                </span>
                <div
                  className={`text-xl font-mono font-bold leading-none ${
                    isTimerRunning ? 'text-white' : 'text-slate-500'
                  }`}
                >
                  {formatTime(timer)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg active:scale-90 transition-transform ${
                    isTimerRunning ? 'bg-amber-500 text-black' : 'bg-green-600 text-white'
                  }`}
                >
                  {isTimerRunning ? (
                    <Icons.Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Icons.Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => setIsVoiceActive(!isVoiceActive)}
              className={`h-full px-4 rounded-xl border flex flex-col items-center justify-center gap-0.5 text-[9px] font-bold uppercase transition-all active:scale-95 ${
                isVoiceActive
                  ? 'bg-purple-600 border-purple-500 text-white animate-pulse'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Icons.Mic className="w-4 h-4" /> {isVoiceActive ? 'Ouvindo' : 'Voz'}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/5 overflow-x-auto bg-slate-900/50 shrink-0">
            {[
              { id: 'execution', label: 'Execução', icon: Icons.Wrench },
              { id: 'parts', label: 'Peças', icon: Icons.Box },
              { id: 'analysis', label: 'RCA (IA)', icon: Icons.Sparkles },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 px-4 min-w-fit text-xs font-bold uppercase flex justify-center items-center gap-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-omni-cyan text-omni-cyan bg-white/5'
                    : 'border-transparent text-slate-500'
                }`}
              >
                <tab.icon className="w-3 h-3" /> {tab.label}
              </button>
            ))}
          </div>

          {/* Content Container - FULL HEIGHT WITH SCROLL FIX */}
          <div className="flex-1 overflow-hidden relative bg-slate-900/30">
            {/* WIZARD & PARTS TABS (PADRÃO SCROLL) */}
            {(activeTab === 'execution' || activeTab === 'parts') && (
              <div className="h-full overflow-y-auto p-4 custom-scrollbar pb-24">
                {activeTab === 'execution' && (
                  <div className="space-y-4">
                    {checklist.length === 0 ? (
                      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center shadow-lg mt-4 flex flex-col items-center justify-center min-h-[300px]">
                        <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mb-6 border border-purple-500/30 relative">
                          <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse"></div>
                          <Icons.Sparkles className="w-10 h-10 text-purple-500 relative z-10" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">
                          Plano de Ação Inteligente
                        </h3>
                        <button
                          onClick={handleGenerateChecklist}
                          disabled={isGeneratingChecklist}
                          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-purple-900/20 active:scale-95 transition-all uppercase tracking-wider text-xs"
                        >
                          {isGeneratingChecklist ? (
                            <Icons.Clock className="w-5 h-5 animate-spin" />
                          ) : (
                            <Icons.Bot className="w-5 h-5" />
                          )}{' '}
                          {isGeneratingChecklist ? 'ANALISANDO...' : 'GERAR PROCEDIMENTO'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {checklist.map((item, idx) => (
                          <div
                            key={item.id}
                            className={`p-4 rounded-xl border flex flex-col gap-3 transition-all shadow-sm ${
                              item.checked
                                ? 'bg-green-900/10 border-green-500/30 opacity-70'
                                : 'bg-slate-800 border-slate-700'
                            }`}
                          >
                            <div
                              className="flex items-start gap-4"
                              onClick={() => toggleCheckItem(idx)}
                            >
                              <div
                                className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                  item.checked
                                    ? 'bg-green-500 border-green-500 text-black'
                                    : 'border-slate-500'
                                }`}
                              >
                                {item.checked && <Icons.Check className="w-4 h-4 stroke-[3]" />}
                              </div>
                              <div>
                                <p
                                  className={`text-sm font-medium leading-snug ${
                                    item.checked ? 'text-slate-500 line-through' : 'text-white'
                                  }`}
                                >
                                  {item.text}
                                </p>
                                <span
                                  className={`text-[9px] font-bold uppercase mt-1.5 block w-fit px-1.5 rounded border ${
                                    item.category === 'safety'
                                      ? 'text-red-400 border-red-500/30 bg-red-900/20'
                                      : 'text-slate-500 border-slate-700'
                                  }`}
                                >
                                  {item.category}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            updateTicketStatus(selectedTicket.id, 'done');
                            setScreen('list');
                            showToast('Serviço finalizado!', 'success');
                          }}
                          className="w-full mt-8 bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all uppercase tracking-wider text-sm"
                        >
                          <Icons.CheckCircle2 className="w-5 h-5" /> Finalizar Serviço
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'parts' && (
                  <div className="space-y-6">
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
                      <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                        <Icons.Plus className="w-4 h-4 text-omni-cyan" /> Adicionar Peça
                      </h4>
                      <div className="space-y-4">
                        <select
                          className="w-full bg-black/30 border border-slate-600 rounded-lg p-3 text-sm text-white outline-none"
                          value={selectedPartId}
                          onChange={e => setSelectedPartId(e.target.value)}
                        >
                          <option value="">Selecione a peça...</option>
                          {inventory.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Disp: {p.quantity})
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-3">
                          <div className="w-24">
                            <input
                              type="number"
                              min="1"
                              className="w-full bg-black/30 border border-slate-600 rounded-lg p-3 text-sm text-white text-center font-bold"
                              value={partQuantity}
                              onChange={e => setPartQuantity(parseInt(e.target.value))}
                            />
                          </div>
                          <button
                            onClick={handleAddPart}
                            disabled={!selectedPartId}
                            className="flex-1 bg-omni-cyan hover:bg-cyan-400 disabled:opacity-50 text-omni-dark font-bold rounded-lg text-sm uppercase shadow-lg active:scale-95 transition-transform"
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                    {selectedTicket.usedParts?.length ? (
                      selectedTicket.usedParts.map(p => (
                        <div
                          key={p.id}
                          className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700/50"
                        >
                          <div>
                            <p className="text-sm font-bold text-white">{p.partName}</p>
                            <p className="text-[10px] text-slate-400">
                              {p.quantity} un x R$ {p.unitCost}
                            </p>
                          </div>
                          <p className="text-sm font-mono font-bold text-omni-cyan">
                            R$ {p.totalCost}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 opacity-50">
                        <p className="text-xs">Nenhuma peça.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* RCA TAB (LAYOUT RESPONSIVO COM SCROLL CORRIGIDO) */}
            {activeTab === 'analysis' && (
              <div className="h-full flex flex-col relative">
                {/* Área de Scroll (Conteúdo) */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-28">
                  {!rcaReport ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="p-4 bg-slate-800 rounded-full mb-4 border border-slate-700 relative overflow-hidden group">
                        {isGeneratingRCA && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent animate-[shimmer_1.5s_infinite] -skew-x-12"></div>
                        )}
                        <Icons.FileText
                          className={`w-8 h-8 ${
                            isGeneratingRCA ? 'text-purple-400 animate-pulse' : 'text-slate-400'
                          }`}
                        />
                      </div>
                      <h3 className="text-base font-bold text-white mb-2">Análise de Causa Raiz</h3>
                      <p className="text-sm text-slate-400 mb-8 max-w-[250px] mx-auto">
                        Gere um diagnóstico técnico resumido baseado no histórico.
                      </p>

                      {/* Botão Central de Geração (Apenas quando vazio) */}
                      <button
                        onClick={handleGenerateRCA}
                        disabled={isGeneratingRCA}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 shadow-lg active:scale-95 transition-all text-sm uppercase tracking-wide disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden"
                      >
                        {isGeneratingRCA ? (
                          <>
                            <Icons.Clock className="w-4 h-4 animate-spin" />
                            <span>PROCESSANDO...</span>
                          </>
                        ) : (
                          <>
                            <Icons.Sparkles className="w-4 h-4" />
                            <span>GERAR RELATÓRIO</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex justify-between items-center mb-2 px-1">
                        <h3 className="text-xs font-bold text-slate-400 uppercase">
                          Resultado da Análise
                        </h3>
                        <span className="text-[9px] bg-purple-900/50 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-mono">
                          IA GENERATED
                        </span>
                      </div>

                      {/* Container HTML da IA */}
                      <div className="space-y-4" dangerouslySetInnerHTML={{ __html: rcaReport }} />
                    </div>
                  )}
                </div>

                {/* Barra Fixa de Ações (Blur) - Apenas se houver relatório */}
                {rcaReport && (
                  <div className="absolute bottom-0 left-0 w-full p-4 bg-[#0B0E14]/90 backdrop-blur-md border-t border-white/10 flex gap-3 z-20">
                    <button
                      onClick={() => setRcaReport(null)}
                      className="flex-1 py-3 border border-slate-600 text-slate-400 rounded-xl text-xs font-bold uppercase hover:bg-slate-800 transition-colors"
                    >
                      Nova Análise
                    </button>
                    <button
                      onClick={() => showToast('Relatório salvo no histórico!', 'success')}
                      className="flex-1 py-3 bg-omni-cyan text-omni-dark rounded-xl text-xs font-bold uppercase hover:bg-cyan-400 transition-colors shadow-lg"
                    >
                      Salvar no Histórico
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Nav DOCK FLUTUANTE (Visível apenas em List/Settings/Scan flow) */}
      {screen !== 'details' && screen !== 'scan' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-[#151923]/90 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center gap-8 ring-1 ring-white/5">
            <button
              onClick={() => handleNavChange('tasks')}
              className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${
                activeNav === 'tasks' ? 'text-omni-cyan' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icons.ClipboardList
                className={`w-6 h-6 ${activeNav === 'tasks' ? 'fill-current' : ''}`}
              />
              <span className="text-[9px] font-bold uppercase tracking-wide">Tarefas</span>
            </button>

            <button
              onClick={() => handleNavChange('scan')}
              className="w-14 h-14 -mt-10 bg-gradient-to-br from-omni-cyan to-blue-500 rounded-2xl flex items-center justify-center text-white shadow-[0_8px_20px_rgba(6,182,212,0.4)] border-4 border-[#0B0E14] active:scale-90 transition-transform group hover:-translate-y-1"
            >
              <Icons.QrCode className="w-7 h-7 group-hover:scale-110 transition-transform" />
            </button>

            <button
              onClick={() => handleNavChange('settings')}
              className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${
                activeNav === 'settings' ? 'text-omni-cyan' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icons.Settings
                className={`w-6 h-6 ${activeNav === 'settings' ? 'animate-spin-slow' : ''}`}
              />
              <span className="text-[9px] font-bold uppercase tracking-wide">Ajustes</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
