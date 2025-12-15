import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { Asset, SparePart } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useMaintenance } from '../context/MaintenanceContext';

// Helper para especificações dinâmicas
interface TechSpec {
  key: string;
  value: string;
}

// Helper robusto para extrair JSON de respostas da IA
const extractJson = (text: string) => {
  try {
    // 1. Tenta limpar markdown
    const clean = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(clean);
  } catch (e) {
    // 2. Se falhar, tenta extrair via regex buscando o array []
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Falha ao extrair JSON da resposta da IA');
  }
};

// Mock Data for Detail View Context (Pode ser movido para o contexto no futuro se precisar de persistencia no histórico simulado)
const MOCK_ASSET_HISTORY = [
  {
    id: 1,
    date: '2023-11-20',
    type: 'corrective',
    title: 'Troca de Rolamento',
    technician: 'Tec. Silva',
    status: 'Concluído',
  },
  {
    id: 2,
    date: '2023-10-15',
    type: 'preventive',
    title: 'Lubrificação Geral',
    technician: 'Tec. Santos',
    status: 'Concluído',
  },
  {
    id: 3,
    date: '2023-09-01',
    type: 'predictive',
    title: 'Análise de Vibração',
    technician: 'Eng. Autom',
    status: 'Alerta',
  },
];

const MOCK_ASSET_DOCS = [
  { id: 1, name: 'Manual de Operação.pdf', size: '2.4 MB', type: 'manual', date: '2022-01-15' },
  { id: 2, name: 'Esquema Elétrico.pdf', size: '1.1 MB', type: 'schematic', date: '2022-01-15' },
  { id: 3, name: 'Certificado Calibração.jpg', size: '450 KB', type: 'cert', date: '2023-06-10' },
];

export const AssetManager: React.FC = () => {
  const { assets, addAsset, updateAsset, deleteAsset } = useMaintenance(); // USANDO CONTEXTO

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewType, setViewType] = useState<'list' | 'grid'>('list'); // NEW STATE FOR VIEW SELECTOR

  // Form States
  const [editingAsset, setEditingAsset] = useState<Partial<Asset>>({});
  const [techSpecs, setTechSpecs] = useState<TechSpec[]>([{ key: '', value: '' }]);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [isGeneratingSpecs, setIsGeneratingSpecs] = useState(false);

  // AI Document & Parts Gen State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [isGeneratingParts, setIsGeneratingParts] = useState(false);

  // State to hold the GENERATED but NOT YET SAVED document
  const [tempAiDocument, setTempAiDocument] = useState<string | null>(null);

  // --- NEW STATE: Manual Part Addition ---
  const [isAddPartModalOpen, setIsAddPartModalOpen] = useState(false);
  const [newPart, setNewPart] = useState<Partial<SparePart>>({
    quantity: 1,
    criticality: 'medium',
    minLevel: 1,
  });

  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'parts' | 'docs' | 'ia-specs'>(
    'info'
  );

  // Reset temp doc when switching assets
  useEffect(() => {
    setTempAiDocument(null);
    setAiPrompt('');
  }, [selectedAsset?.id]);

  const handleOpenModal = (asset?: Asset) => {
    if (asset) {
      setEditingAsset({ ...asset });
      setPreviewImage(asset.image || '');

      // Carregar especificações salvas ou criar defaults se vazio
      if (asset.customSpecs && asset.customSpecs.length > 0) {
        setTechSpecs(asset.customSpecs);
      } else {
        // Fallback para legado ou criar campos vazios
        const legacySpecs = [
          { key: 'Potência', value: asset.power || '' },
          { key: 'Voltagem', value: asset.voltage || '' },
          { key: 'Capacidade', value: asset.capacity || '' },
        ].filter(s => s.value);

        setTechSpecs(legacySpecs.length > 0 ? legacySpecs : [{ key: '', value: '' }]);
      }
    } else {
      setEditingAsset({ status: 'operational', criticality: 'medium' });
      setPreviewImage('');
      setTechSpecs([{ key: '', value: '' }]);
    }
    setIsModalOpen(true);
  };

  const generateQRCode = () => {
    // Gera um UUID simples ou string formatada
    const uuid = `OMNI-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    setEditingAsset(prev => ({ ...prev, qrCode: uuid }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewImage(url);
      setEditingAsset(prev => ({ ...prev, image: url }));
    }
  };

  const updateSpec = (index: number, field: 'key' | 'value', val: string) => {
    const newSpecs = [...techSpecs];
    newSpecs[index][field] = val;
    setTechSpecs(newSpecs);
  };

  const addSpecRow = () => {
    setTechSpecs([...techSpecs, { key: '', value: '' }]);
  };

  const removeSpecRow = (index: number) => {
    const newSpecs = techSpecs.filter((_, i) => i !== index);
    setTechSpecs(newSpecs);
  };

  // --- AI LOGIC ---

  const generateSpecsWithAI = async () => {
    if (!editingAsset.name) {
      alert('Por favor, preencha o Nome do Equipamento e/ou Modelo antes de gerar.');
      return;
    }

    setIsGeneratingSpecs(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `Atue como um Especialista em Ativos Industriais. 
          Gere uma lista de especificações técnicas detalhadas para o equipamento: "${
            editingAsset.name
          } ${editingAsset.model || ''}".
          
          Regras:
          1. Retorne APENAS um Array JSON de objetos no formato: [{"key": "Atributo", "value": "Valor com unidade"}].
          2. Seja técnico e preciso. Inclua dimensões, potência, peso, conexões, etc.
          3. Gere entre 6 a 10 especificações principais.
          4. Traduza as chaves para Português.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const jsonText = response.text();
      if (jsonText) {
        const generatedSpecs = extractJson(jsonText);
        if (Array.isArray(generatedSpecs)) {
          setTechSpecs(generatedSpecs);
        }
      }
    } catch (error) {
      console.error('Erro ao gerar specs:', error);
      alert('Erro ao conectar com a IA.');
    } finally {
      setIsGeneratingSpecs(false);
    }
  };

  const generatePartsWithAI = async () => {
    if (!selectedAsset) return;

    setIsGeneratingParts(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const modelInfo = `${selectedAsset.name} ${selectedAsset.model || ''} ${
        selectedAsset.manufacturer || ''
      }`;

      const prompt = `
            Atue como um Especialista em Manutenção Industrial.
            Gere uma lista de Peças de Reposição (Spare Parts) críticas e recomendadas para a manutenção do seguinte equipamento: "${modelInfo}".
            
            Retorne APENAS um JSON Array com objetos seguindo esta estrutura exata:
            [
              {
                "name": "Nome da Peça",
                "code": "Código Sugerido (ex: BRG-XXX)",
                "quantity": 2 (Quantidade recomendada em estoque),
                "minLevel": 1,
                "cost": 0.00 (Valor estimado em BRL, se não souber coloque 0),
                "criticality": "high" | "medium" | "low"
              }
            ]
            
            Gere pelo menos 5 a 8 itens comuns de desgaste (rolamentos, filtros, sensores, vedações, correias).
          `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const jsonText = response.text();
      if (jsonText) {
        const newParts = extractJson(jsonText);
        if (Array.isArray(newParts)) {
          // Mapeia para o formato correto e adiciona IDs únicos
          const formattedParts: SparePart[] = newParts.map((p: any) => ({
            ...p,
            id: `SP-${Math.floor(Math.random() * 100000)}`,
            location: 'ALMOX-GERAL', // Default location
            category: 'mechanical', // Default, could be improved by AI too
          }));

          // Update Asset State
          const updatedAsset = {
            ...selectedAsset,
            spareParts: [...(selectedAsset.spareParts || []), ...formattedParts],
          };

          setSelectedAsset(updatedAsset);
          updateAsset(updatedAsset); // Persist changes via Context
        }
      }
    } catch (error) {
      console.error('Erro ao gerar peças:', error);
      alert('Erro ao gerar lista de peças.');
    } finally {
      setIsGeneratingParts(false);
    }
  };

  const generateFullDocWithAI = async () => {
    const targetAsset = selectedAsset || editingAsset;

    if (!targetAsset || !targetAsset.name) {
      alert('Erro: Nenhum ativo selecionado para gerar documentação.');
      return;
    }

    const promptToUse =
      aiPrompt ||
      `Gere a especificação técnica detalhada para: ${targetAsset.name} ${
        targetAsset.model || ''
      }.`;
    setIsGeneratingDoc(true);
    setTempAiDocument(null);

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const fullPrompt = `
            Atue como um Engenheiro Técnico Sênior e Escritor Técnico.
            Crie um documento de especificação técnica rico e detalhado para: ${targetAsset.name} ${
        targetAsset.model || ''
      }.
            
            Instruções do Usuário: "${promptToUse}"

            FORMATO DE SAÍDA OBRIGATÓRIO:
            Retorne APENAS código HTML puro (sem tag <html> ou <body>), estilizado com classes Tailwind CSS para um tema escuro (Dark Mode).
            ... (mesmas regras de estilo anteriores)
          `;

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const htmlContent = response.text();
      if (htmlContent) {
        const cleanHtml = htmlContent.replace(/```html/g, '').replace(/```/g, '');
        setTempAiDocument(cleanHtml);
      }
    } catch (error) {
      console.error('Erro ao gerar doc:', error);
      alert('Erro na geração do documento.');
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const confirmSaveAiDoc = () => {
    if (selectedAsset && tempAiDocument) {
      const updatedAsset = { ...selectedAsset, aiSpecDocument: tempAiDocument };
      setSelectedAsset(updatedAsset);
      updateAsset(updatedAsset);
      setTempAiDocument(null);
      alert('Especificação Técnica salva com sucesso no cadastro do ativo!');
    }
  };

  const discardAiDoc = () => {
    setTempAiDocument(null);
  };

  const handleDeleteAsset = async () => {
    if (!selectedAsset) return;
    if (
      confirm(
        `Tem certeza que deseja EXCLUIR o equipamento "${selectedAsset.name}"? Esta ação é irreversível.`
      )
    ) {
      await deleteAsset(selectedAsset.id);
      setSelectedAsset(null);
      setIsModalOpen(false);
    }
  };

  // --- MANUAL PART SAVING ---
  const handleSaveNewPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !newPart.name) return;

    const partToAdd: SparePart = {
      id: `SP-MAN-${Date.now()}`,
      name: newPart.name,
      code: newPart.code || 'N/A',
      quantity: newPart.quantity || 0,
      minLevel: newPart.minLevel || 0,
      cost: newPart.cost || 0,
      criticality: (newPart.criticality as any) || 'low',
      location: 'ALMOX-01',
      category: 'mechanical',
    };

    const updatedAsset = {
      ...selectedAsset,
      spareParts: [...(selectedAsset.spareParts || []), partToAdd],
    };

    setSelectedAsset(updatedAsset);
    updateAsset(updatedAsset);

    // Reset and Close
    setNewPart({ quantity: 1, criticality: 'medium', minLevel: 1 });
    setIsAddPartModalOpen(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const power = techSpecs.find(s => s.key.toLowerCase().includes('pot'))?.value;
    const voltage = techSpecs.find(s => s.key.toLowerCase().includes('volt'))?.value;
    const capacity = techSpecs.find(s => s.key.toLowerCase().includes('cap'))?.value;

    const validSpecs = techSpecs.filter(s => s.key.trim() !== '' && s.value.trim() !== '');

    const assetToSave: Asset = {
      ...editingAsset,
      id: editingAsset.id || `AST-${Math.floor(Math.random() * 10000)}`,
      name: editingAsset.name || 'Novo Equipamento',
      code: editingAsset.code || 'N/A',
      qrCode: editingAsset.qrCode, // Ensure QR Code is saved
      model: editingAsset.model || 'N/A',
      manufacturer: editingAsset.manufacturer || 'N/A',
      serialNumber: editingAsset.serialNumber || `SN-${Math.floor(Math.random() * 1000000)}`,
      location: editingAsset.location || 'N/A',
      status: editingAsset.status || 'operational',
      criticality: editingAsset.criticality || 'medium',
      image:
        previewImage ||
        'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=200',
      mtbf: editingAsset.mtbf || 0,
      mttr: editingAsset.mttr || 0,
      power,
      voltage,
      capacity,
      customSpecs: validSpecs,
      aiSpecDocument: editingAsset.aiSpecDocument,
      spareParts: editingAsset.spareParts || [],
      documents: editingAsset.documents || [],
      parentId: editingAsset.parentId || undefined,
    } as Asset;

    if (editingAsset.id) {
      updateAsset(assetToSave);
      if (selectedAsset && selectedAsset.id === assetToSave.id) {
        setSelectedAsset(assetToSave);
      }
    } else {
      addAsset(assetToSave);
    }
    setIsModalOpen(false);
  };

  const filteredAssets = assets.filter(
    a =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSpecIcon = (key: string) => {
    const k = key.toLowerCase();
    if (
      k.includes('peso') ||
      k.includes('weight') ||
      k.includes('massa') ||
      k.includes('carga') ||
      k.includes('load')
    )
      return <Icons.Scale className="w-4 h-4 text-orange-400" />;
    if (
      k.includes('dim') ||
      k.includes('larg') ||
      k.includes('alt') ||
      k.includes('compr') ||
      k.includes('size')
    )
      return <Icons.Ruler className="w-4 h-4 text-blue-400" />;
    if (k.includes('press') || k.includes('bar') || k.includes('psi'))
      return <Icons.Gauge className="w-4 h-4 text-purple-400" />;
    if (k.includes('pot') || k.includes('power') || k.includes('watt') || k.includes('volt'))
      return <Icons.Zap className="w-4 h-4 text-yellow-500" />;
    if (k.includes('temp') || k.includes('grau') || k.includes('°'))
      return <Icons.Thermometer className="w-4 h-4 text-red-400" />;
    if (k.includes('fabr') || k.includes('brand'))
      return <Icons.Factory className="w-4 h-4 text-slate-400" />;
    if (k.includes('serial') || k.includes('série') || k.includes('num'))
      return <Icons.Hash className="w-4 h-4 text-slate-500" />;
    if (k.includes('cap') || k.includes('volum') || k.includes('tank'))
      return <Icons.Database className="w-4 h-4 text-cyan-400" />;
    if (k.includes('ar ') || k.includes('pneu') || k.includes('flow'))
      return <Icons.Wind className="w-4 h-4 text-slate-300" />;
    if (k.includes('vel') || k.includes('speed') || k.includes('rpm'))
      return <Icons.Activity className="w-4 h-4 text-green-400" />;
    return <Icons.Settings className="w-4 h-4 text-slate-600" />;
  };

  // --- NEW GRID VIEW RENDERER ---
  const renderGridView = () => (
    <div className="flex-1 bg-omni-panel/20 border border-omni-border rounded-xl overflow-y-auto custom-scrollbar p-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
        {filteredAssets.map(asset => {
          const isChild = !!asset.parentId;
          const healthScore = Math.max(
            0,
            100 - (asset.status === 'maintenance' ? 40 : asset.status === 'stopped' ? 90 : 0)
          );

          return (
            <div
              key={asset.id}
              onClick={() => setSelectedAsset(asset)}
              className="group bg-omni-dark border border-omni-border hover:border-omni-cyan/50 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] hover:-translate-y-1 relative"
            >
              {/* Top Image Section */}
              <div className="h-48 relative overflow-hidden bg-slate-900">
                <img
                  src={asset.image}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                  alt={asset.name}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-omni-dark via-transparent to-transparent opacity-80"></div>

                {/* Overlay Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {asset.criticality === 'high' && (
                    <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-1 rounded shadow-lg animate-pulse">
                      CRÍTICO
                    </span>
                  )}
                  {isChild && (
                    <span className="bg-slate-700 text-slate-300 text-[9px] font-bold px-2 py-1 rounded border border-slate-600">
                      SUB-COMPONENTE
                    </span>
                  )}
                </div>
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase shadow-lg border backdrop-blur-md ${
                      asset.status === 'operational'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : asset.status === 'maintenance'
                        ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}
                  >
                    {asset.status === 'operational'
                      ? 'ONLINE'
                      : asset.status === 'maintenance'
                      ? 'MANUTENÇÃO'
                      : 'PARADO'}
                  </span>
                </div>

                {/* Quick Action Overlay (Appears on Hover) */}
                <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedAsset(asset);
                    }}
                    className="p-2 bg-omni-cyan text-omni-dark rounded-full hover:scale-110 transition-transform shadow-[0_0_15px_#06b6d4]"
                  >
                    <Icons.Search className="w-5 h-5" />
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleOpenModal(asset);
                    }}
                    className="p-2 bg-slate-700 text-white rounded-full hover:scale-110 transition-transform hover:bg-slate-600"
                  >
                    <Icons.Edit className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 relative">
                {/* Asset Identification */}
                <div className="mb-4">
                  <h3
                    className="text-lg font-bold text-white leading-tight mb-1 truncate"
                    title={asset.name}
                  >
                    {asset.name}
                  </h3>
                  <div className="flex justify-between items-center">
                    <code className="text-xs font-mono text-omni-cyan bg-omni-cyan/10 px-1.5 py-0.5 rounded border border-omni-cyan/20">
                      {asset.code}
                    </code>
                    <span className="text-[10px] text-slate-500 uppercase">
                      {asset.manufacturer}
                    </span>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                    <span className="text-[9px] text-slate-500 uppercase block">Local</span>
                    <div className="flex items-center gap-1 text-xs text-slate-300 truncate">
                      <Icons.MapPin className="w-3 h-3 text-purple-400" /> {asset.location}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                    <span className="text-[9px] text-slate-500 uppercase block">
                      Confiabilidade
                    </span>
                    <div className="flex items-center gap-1 text-xs text-slate-300">
                      <Icons.Activity className="w-3 h-3 text-green-400" /> {healthScore}%
                    </div>
                  </div>
                </div>

                {/* Health Bar Visual */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase">
                    <span>Saúde do Ativo</span>
                    <span>MTBF: {asset.mtbf || 0}h</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        healthScore > 80
                          ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                          : healthScore > 50
                          ? 'bg-gradient-to-r from-orange-500 to-yellow-400'
                          : 'bg-gradient-to-r from-red-600 to-red-400'
                      }`}
                      style={{ width: `${healthScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // --- RENDERERS ---

  const renderDetailView = () => {
    if (!selectedAsset) return null;

    let displaySpecs = selectedAsset.customSpecs || [];
    if (displaySpecs.length === 0) {
      if (selectedAsset.power) displaySpecs.push({ key: 'Potência', value: selectedAsset.power });
      if (selectedAsset.voltage)
        displaySpecs.push({ key: 'Voltagem', value: selectedAsset.voltage });
      if (selectedAsset.capacity)
        displaySpecs.push({ key: 'Capacidade', value: selectedAsset.capacity });
      if (selectedAsset.serialNumber)
        displaySpecs.push({ key: 'Serial Number', value: selectedAsset.serialNumber });
    }

    const displayAiDoc = tempAiDocument || selectedAsset.aiSpecDocument;
    const parentAsset = assets.find(a => a.id === selectedAsset.parentId);

    // Use dynamic parts if available, otherwise empty array (user can populate via AI)
    const displayParts = selectedAsset.spareParts || [];

    return (
      <div className="flex-1 p-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col animate-in fade-in duration-300">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setSelectedAsset(null)}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <Icons.ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {selectedAsset.name}
              <span className="text-sm font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-mono">
                {selectedAsset.code}
              </span>
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>
                {selectedAsset.model} • {selectedAsset.manufacturer}
              </span>
              {parentAsset && (
                <>
                  <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                  <span className="flex items-center gap-1 text-omni-cyan bg-omni-cyan/10 px-1.5 rounded">
                    <Icons.Hierarchy className="w-3 h-3" /> Pertence a: {parentAsset.name}
                  </span>
                </>
              )}
              {selectedAsset.qrCode && (
                <>
                  <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                  <span className="flex items-center gap-1 text-slate-300 bg-slate-800 px-1.5 rounded border border-slate-700 font-mono">
                    <Icons.QrCode className="w-3 h-3" /> {selectedAsset.qrCode}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => handleOpenModal(selectedAsset)}
              className="bg-omni-panel border border-omni-border hover:border-omni-cyan text-white px-4 py-2 rounded flex items-center gap-2 text-sm transition-all"
            >
              <Icons.Edit className="w-4 h-4" /> Editar
            </button>
            <button
              onClick={handleDeleteAsset}
              className="bg-red-500/10 border border-red-500/50 hover:bg-red-500 hover:text-white text-red-500 px-4 py-2 rounded flex items-center gap-2 text-sm transition-all"
            >
              <Icons.Trash className="w-4 h-4" /> Excluir
            </button>
          </div>
        </div>

        <div className="flex gap-6 h-full overflow-hidden">
          {/* Left Sidebar Info */}
          <div className="w-1/4 bg-omni-panel border border-omni-border rounded-xl p-6 flex flex-col gap-6 overflow-y-auto">
            <img
              src={selectedAsset.image}
              className="w-full h-48 object-cover rounded-lg border border-omni-border"
              alt="Asset"
            />

            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">
                Status Operacional
              </h3>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    selectedAsset.status === 'operational'
                      ? 'bg-omni-success shadow-[0_0_8px_#22c55e]'
                      : selectedAsset.status === 'maintenance'
                      ? 'bg-omni-orange shadow-[0_0_8px_#f97316]'
                      : 'bg-omni-danger shadow-[0_0_8px_#ef4444]'
                  }`}
                ></span>
                <span className="text-white font-bold uppercase">
                  {selectedAsset.status === 'operational'
                    ? 'Operacional'
                    : selectedAsset.status === 'maintenance'
                    ? 'Manutenção'
                    : 'Parado'}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-omni-success w-[92%]"></div>
              </div>
              <p className="text-[10px] text-right text-slate-500 mt-1">Disponibilidade: 92%</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-omni-dark p-3 rounded border border-omni-border">
                <p className="text-[10px] text-slate-500 uppercase">MTBF</p>
                <p className="text-lg font-mono font-bold text-white">{selectedAsset.mtbf || 0}h</p>
              </div>
              <div className="bg-omni-dark p-3 rounded border border-omni-border">
                <p className="text-[10px] text-slate-500 uppercase">MTTR</p>
                <p className="text-lg font-mono font-bold text-white">{selectedAsset.mttr || 0}h</p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Localização</h3>
              <div className="flex items-center gap-2 text-white text-sm bg-omni-dark p-3 rounded border border-omni-border">
                <Icons.MapPin className="w-4 h-4 text-omni-cyan" />
                {selectedAsset.location}
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 bg-omni-panel border border-omni-border rounded-xl flex flex-col overflow-hidden">
            {/* ... (Existing Tabs Renderer) ... */}
            <div className="flex border-b border-omni-border bg-omni-dark/30 overflow-x-auto">
              <button
                onClick={() => setActiveTab('info')}
                className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'info'
                    ? 'border-omni-cyan text-white'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Ficha Técnica
              </button>
              <button
                onClick={() => setActiveTab('parts')}
                className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'parts'
                    ? 'border-omni-cyan text-white'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Peças (Spare Parts)
              </button>
              <button
                onClick={() => setActiveTab('docs')}
                className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'docs'
                    ? 'border-omni-cyan text-white'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Documentação
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'history'
                    ? 'border-omni-cyan text-white'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Histórico
              </button>

              <button
                onClick={() => setActiveTab('ia-specs')}
                className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'ia-specs'
                    ? 'border-omni-cyan text-white'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Icons.Bot
                  className={`w-4 h-4 ${
                    activeTab === 'ia-specs' ? 'text-omni-cyan' : 'text-slate-500'
                  }`}
                />{' '}
                Tech Specs IA
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1">
              {activeTab === 'info' && (
                <div className="grid grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <h4 className="text-omni-cyan font-bold mb-4 border-b border-omni-border pb-2 flex items-center gap-2">
                      <Icons.Settings className="w-4 h-4" /> Especificações Técnicas
                    </h4>
                    <div className="space-y-0">
                      {displaySpecs.map((item, i) => (
                        <div
                          key={i}
                          className="flex justify-between py-3 border-b border-slate-800 last:border-0 hover:bg-white/5 px-2 transition-colors group"
                        >
                          <span className="text-slate-400 text-sm flex items-center gap-3">
                            <span className="bg-slate-800 p-1.5 rounded text-slate-300 group-hover:text-white group-hover:bg-omni-cyan/20 transition-colors">
                              {getSpecIcon(item.key)}
                            </span>
                            {item.key}
                          </span>
                          <span className="text-white text-sm font-medium text-right font-mono">
                            {item.value || 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-omni-cyan font-bold mb-4 border-b border-omni-border pb-2 flex items-center gap-2">
                      <Icons.FileText className="w-4 h-4" /> Informações Gerais
                    </h4>
                    <div className="space-y-0">
                      {[
                        { l: 'Fabricante', v: selectedAsset.manufacturer, k: 'fabr' },
                        { l: 'Modelo', v: selectedAsset.model, k: 'model' },
                        {
                          l: 'Data Aquisição',
                          v: selectedAsset.acquisitionDate || '2020-01-15',
                          k: 'date',
                        },
                        { l: 'Criticidade', v: selectedAsset.criticality, badge: true, k: 'crit' },
                        { l: 'QR Code', v: selectedAsset.qrCode || 'N/A', k: 'qr', mono: true },
                      ].map((item, i) => (
                        <div
                          key={i}
                          className="flex justify-between py-3 border-b border-slate-800 last:border-0 hover:bg-white/5 px-2 transition-colors group"
                        >
                          <span className="text-slate-400 text-sm flex items-center gap-3">
                            {!item.badge && (
                              <span className="bg-slate-800 p-1.5 rounded text-slate-300 group-hover:text-white group-hover:bg-omni-cyan/20 transition-colors">
                                {item.k === 'fabr' ? (
                                  <Icons.Factory className="w-4 h-4" />
                                ) : item.k === 'date' ? (
                                  <Icons.Calendar className="w-4 h-4" />
                                ) : item.k === 'qr' ? (
                                  <Icons.QrCode className="w-4 h-4" />
                                ) : item.k === 'model' ? (
                                  <Icons.Tag className="w-4 h-4" />
                                ) : (
                                  <Icons.Settings className="w-4 h-4" />
                                )}
                              </span>
                            )}
                            {item.l}
                          </span>
                          {item.badge ? (
                            <span
                              className={`text-xs font-bold uppercase px-2 py-0.5 rounded border ${
                                item.v === 'high'
                                  ? 'bg-purple-900/50 border-purple-500 text-purple-200'
                                  : 'bg-slate-700 border-slate-500 text-slate-300'
                              }`}
                            >
                              {item.v}
                            </span>
                          ) : (
                            <span
                              className={`text-white text-sm font-medium text-right ${
                                item.mono ? 'font-mono tracking-wider' : ''
                              }`}
                            >
                              {item.v}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ... (Rest of existing tabs: ia-specs, parts, docs, history) ... */}
              {activeTab === 'ia-specs' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 h-full flex flex-col">
                  {/* Chat / Control Area */}
                  <div className="mb-6 bg-omni-dark/50 border border-omni-border rounded-xl p-4">
                    <h4 className="text-purple-400 font-bold mb-2 flex items-center gap-2">
                      <Icons.Sparkles className="w-4 h-4" /> Gerador de Especificação IA
                    </h4>
                    <p className="text-xs text-slate-400 mb-4">
                      Solicite à IA que crie um datasheet completo baseado no modelo do equipamento.
                    </p>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: Detalhe as conexões elétricas e o consumo de ar comprimido..."
                        className="flex-1 bg-omni-panel border border-omni-border rounded-lg px-4 py-2 text-sm text-white focus:border-purple-500 outline-none placeholder-slate-600"
                        value={aiPrompt}
                        onChange={e => setAiPrompt(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && generateFullDocWithAI()}
                      />
                      <button
                        onClick={generateFullDocWithAI}
                        disabled={isGeneratingDoc}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-lg text-sm flex items-center gap-2 transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingDoc ? (
                          <Icons.Clock className="w-4 h-4 animate-spin" />
                        ) : (
                          <Icons.Bot className="w-4 h-4" />
                        )}
                        {isGeneratingDoc ? 'Gerando...' : 'Gerar Spec'}
                      </button>
                    </div>
                  </div>

                  {/* PREVIEW / SAVE ACTIONS - Shown only when there is a NEW generated doc */}
                  {tempAiDocument && (
                    <div className="mb-4 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 flex justify-between items-center animate-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 text-orange-400">
                        <Icons.Alert className="w-4 h-4" />
                        <span className="text-sm font-bold">Pré-visualização (Não Salvo)</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={discardAiDoc}
                          className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white border border-slate-700 hover:bg-slate-800 rounded transition-colors"
                        >
                          Descartar
                        </button>
                        <button
                          onClick={confirmSaveAiDoc}
                          className="px-3 py-1.5 text-xs font-bold text-omni-dark bg-orange-500 hover:bg-orange-400 rounded transition-colors shadow-lg flex items-center gap-2"
                        >
                          <Icons.Check className="w-3 h-3" /> Salvar no Equipamento
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Document View Area */}
                  <div className="flex-1 bg-omni-dark border border-omni-border rounded-xl p-8 overflow-y-auto custom-scrollbar shadow-inner relative">
                    {displayAiDoc ? (
                      <div
                        className="text-slate-300 space-y-4 font-sans"
                        dangerouslySetInnerHTML={{ __html: displayAiDoc }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-50">
                        <Icons.FileText className="w-16 h-16 mb-4" />
                        <p className="text-sm font-bold">Nenhum documento gerado.</p>
                        <p className="text-xs">Use o chat acima para criar a especificação.</p>
                      </div>
                    )}

                    {/* Loading Overlay */}
                    {isGeneratingDoc && (
                      <div className="absolute inset-0 bg-omni-dark/80 backdrop-blur-sm flex items-center justify-center z-10 flex-col">
                        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <span className="text-purple-400 font-bold animate-pulse">
                          Escrevendo documento técnico...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'parts' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h4 className="text-white font-bold">Lista de Peças Críticas (BOM)</h4>
                      <p className="text-xs text-slate-400">
                        Gerenciamento de reposição e itens de desgaste.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {/* BOTÃO INTELIGENTE IA */}
                      <button
                        onClick={generatePartsWithAI}
                        disabled={isGeneratingParts}
                        className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-2 rounded flex items-center gap-2 shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isGeneratingParts ? (
                          <Icons.Clock className="w-4 h-4 animate-spin" />
                        ) : (
                          <Icons.Sparkles className="w-4 h-4" />
                        )}
                        {isGeneratingParts ? 'Consultando Manuais...' : 'Sugerir Peças (IA)'}
                      </button>
                      <button
                        onClick={() => setIsAddPartModalOpen(true)}
                        className="bg-omni-cyan hover:bg-cyan-400 text-omni-dark text-xs font-bold px-3 py-2 rounded flex items-center gap-2"
                      >
                        <Icons.Plus className="w-4 h-4" /> Adicionar Manualmente
                      </button>
                    </div>
                  </div>
                  <div className="border border-omni-border rounded-lg overflow-hidden relative min-h-[200px]">
                    {/* Loading Overlay for Parts */}
                    {isGeneratingParts && (
                      <div className="absolute inset-0 bg-omni-dark/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                        <Icons.Cpu className="w-10 h-10 text-purple-500 animate-pulse mb-3" />
                        <p className="text-sm font-bold text-white">
                          Analisando Modelo do Equipamento...
                        </p>
                        <p className="text-xs text-slate-400">
                          Gerando lista de peças recomendadas pelo fabricante.
                        </p>
                      </div>
                    )}

                    <table className="w-full text-sm text-left">
                      <thead className="bg-omni-dark text-xs text-slate-500 uppercase">
                        <tr>
                          <th className="px-4 py-3">Código</th>
                          <th className="px-4 py-3">Nome da Peça</th>
                          <th className="px-4 py-3 text-center">Qtd. Sugerida</th>
                          <th className="px-4 py-3 text-center">Criticidade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-omni-border">
                        {displayParts.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center">
                              <div className="flex flex-col items-center gap-2 opacity-50">
                                <Icons.Box className="w-8 h-8 text-slate-500" />
                                <p className="text-sm font-bold text-slate-400">
                                  Nenhuma peça cadastrada.
                                </p>
                                <p className="text-xs text-slate-600">
                                  Clique em "Sugerir Peças" para a IA preencher automaticamente.
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          displayParts.map((part, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3 font-mono text-xs text-slate-400">
                                {part.code}
                              </td>
                              <td className="px-4 py-3 text-white">{part.name}</td>
                              <td className="px-4 py-3 text-center font-bold">
                                <span
                                  className={`${
                                    part.quantity < (part.minLevel || 0)
                                      ? 'text-red-500'
                                      : 'text-green-500'
                                  }`}
                                >
                                  {part.quantity} un
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {part.criticality === 'low' ? (
                                  <span className="text-[10px] bg-slate-700 px-1 rounded text-white">
                                    BAIXA
                                  </span>
                                ) : part.criticality === 'medium' ? (
                                  <span className="text-[10px] bg-blue-900/50 text-blue-200 px-1 rounded">
                                    MÉDIA
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-red-900/50 text-red-200 px-1 rounded">
                                    ALTA
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'docs' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-3 gap-4">
                    {MOCK_ASSET_DOCS.map(doc => (
                      <div
                        key={doc.id}
                        className="bg-omni-dark border border-omni-border rounded-lg p-4 flex items-start gap-4 hover:border-omni-cyan transition-all group cursor-pointer"
                      >
                        <div className="p-3 bg-slate-800 rounded-lg text-slate-400 group-hover:text-white group-hover:bg-slate-700">
                          <Icons.FileText className="w-6 h-6" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <h5 className="text-sm font-bold text-white truncate group-hover:text-omni-cyan transition-colors">
                            {doc.name}
                          </h5>
                          <p className="text-xs text-slate-500 mt-1">
                            {doc.size} • {doc.date}
                          </p>
                          <div className="flex gap-2 mt-3">
                            <button className="text-[10px] bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 px-2 py-1 rounded">
                              Visualizar
                            </button>
                            <button className="text-[10px] bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 px-2 py-1 rounded">
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="bg-omni-dark border border-omni-border border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-slate-500 hover:text-white hover:border-omni-cyan cursor-pointer transition-all">
                      <Icons.Upload className="w-6 h-6 mb-2" />
                      <span className="text-sm">Upload Documento</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-6 relative ml-2">
                    <div className="absolute left-3.5 top-2 bottom-2 w-px bg-slate-800"></div>
                    {MOCK_ASSET_HISTORY.map((hist, idx) => (
                      <div key={idx} className="flex gap-6 relative">
                        <div
                          className={`w-8 h-8 rounded-full border-4 border-omni-panel z-10 flex items-center justify-center shrink-0 ${
                            hist.type === 'corrective'
                              ? 'bg-red-500'
                              : hist.type === 'preventive'
                              ? 'bg-blue-500'
                              : 'bg-purple-500'
                          }`}
                        >
                          <Icons.Wrench className="w-3 h-3 text-white" />
                        </div>
                        <div className="flex-1 bg-omni-dark border border-omni-border rounded-lg p-4 hover:border-slate-600 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h5 className="font-bold text-white text-sm">{hist.title}</h5>
                              <p className="text-xs text-slate-500">
                                {hist.type.toUpperCase()} • {hist.technician}
                              </p>
                            </div>
                            <span className="text-xs font-mono text-slate-400">{hist.date}</span>
                          </div>
                          <div className="flex justify-end">
                            <span className="text-[10px] bg-green-500/20 text-green-500 border border-green-500/30 px-2 py-0.5 rounded font-bold uppercase">
                              {hist.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderListView = () => (
    <div className="flex-1 p-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-white">
            Gestão de Ativos (Máquinas e Equipamentos)
          </h2>
          <p className="text-xs text-slate-400">Escopo 3.1 - Cadastro e Rastreabilidade</p>
        </div>
        <div className="flex gap-3">
          <div className="relative group">
            <Icons.Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nome, tag..."
              className="bg-omni-panel border border-omni-border rounded-lg pl-10 pr-10 py-2 text-sm text-white focus:border-omni-cyan outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <button
              className="absolute right-2 top-2 text-slate-500 hover:text-omni-cyan"
              title="Escanear QR Code"
            >
              <Icons.QrCode className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-omni-panel border border-omni-border rounded-lg p-1 flex mr-3">
            <button
              onClick={() => setViewType('list')}
              className={`p-2 rounded-md transition-all ${
                viewType === 'list'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Lista"
            >
              <Icons.ListChecks className="w-4 h-4" />{' '}
              {/* Fallback icon if List not available, checking imports step 433 showed ListChecks */}
            </button>
            <button
              onClick={() => setViewType('grid')}
              className={`p-2 rounded-md transition-all ${
                viewType === 'grid'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Grade Detalhada"
            >
              <Icons.Grid3X3 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => handleOpenModal()}
            className="bg-omni-cyan hover:bg-cyan-400 text-omni-dark font-bold py-2 px-4 rounded text-sm flex items-center gap-2 transition-colors"
          >
            <Icons.Plus className="w-4 h-4" /> Novo Ativo
          </button>
        </div>
      </div>

      {/* Conditional Rendering: List or Grid */}
      {viewType === 'list' ? (
        <div className="flex-1 bg-omni-panel border border-omni-border rounded-xl overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="bg-omni-dark text-xs uppercase font-bold text-slate-300">
                <tr>
                  <th className="px-6 py-4">Equipamento</th>
                  <th className="px-6 py-4">Tag/Código</th>
                  <th className="px-6 py-4">Modelo/Fabr.</th>
                  <th className="px-6 py-4">Localização</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Criticidade</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-omni-border">
                {filteredAssets.map(asset => {
                  const isChild = !!asset.parentId;
                  return (
                    <tr
                      key={asset.id}
                      onClick={() => setSelectedAsset(asset)}
                      className="hover:bg-white/5 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                        {isChild && (
                          <Icons.Hierarchy className="w-4 h-4 text-slate-500 rotate-90" />
                        )}
                        <img
                          src={asset.image}
                          className="w-8 h-8 rounded object-cover border border-omni-border"
                          alt=""
                        />
                        <div>
                          {asset.name}
                          {isChild && (
                            <span className="text-[9px] text-slate-500 block">Sub-componente</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-omni-cyan">{asset.code}</td>
                      <td className="px-6 py-4">
                        {asset.model} <br />{' '}
                        <span className="text-xs opacity-50">{asset.manufacturer}</span>
                      </td>
                      <td className="px-6 py-4">{asset.location}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                            asset.status === 'operational'
                              ? 'bg-omni-success/20 text-omni-success'
                              : asset.status === 'maintenance'
                              ? 'bg-omni-orange/20 text-omni-orange'
                              : 'bg-omni-danger/20 text-omni-danger'
                          }`}
                        >
                          {asset.status === 'operational'
                            ? 'OK'
                            : asset.status === 'maintenance'
                            ? 'Manut.'
                            : 'Parado'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {[1, 2, 3].map(i => (
                            <div
                              key={i}
                              className={`h-2 w-2 rounded-full ${
                                asset.criticality === 'high' ||
                                (asset.criticality === 'medium' && i <= 2) ||
                                (asset.criticality === 'low' && i === 1)
                                  ? 'bg-purple-500'
                                  : 'bg-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-omni-cyan p-2">
                          <Icons.ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        renderGridView()
      )}
    </div>
  );

  return (
    <>
      {selectedAsset ? renderDetailView() : renderListView()}

      {/* --- ADVANCED ASSET MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-omni-panel border border-omni-border rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-omni-border flex justify-between items-center bg-omni-dark sticky top-0 z-20">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Icons.Box className="w-6 h-6 text-omni-cyan" />
                  {editingAsset.id ? 'Editar Equipamento' : 'Novo Ativo Industrial'}
                </h3>
                <p className="text-xs text-slate-400">
                  Preencha os dados técnicos para cadastro do Gêmeo Digital
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 p-8 grid grid-cols-12 gap-8">
              {/* LEFT COLUMN: Visuals & Identification */}
              <div className="col-span-12 md:col-span-4 space-y-6">
                {/* Image Upload Area */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">
                    Imagem do Ativo
                  </label>
                  <div className="relative w-full aspect-square bg-omni-dark border-2 border-dashed border-slate-700 rounded-xl hover:border-omni-cyan transition-colors group flex flex-col items-center justify-center overflow-hidden">
                    {previewImage ? (
                      <>
                        <img
                          src={previewImage}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-white text-xs font-bold bg-black/50 px-3 py-1 rounded-full border border-white/20">
                            Alterar Imagem
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Icons.Camera className="w-12 h-12 text-slate-600 mb-2 group-hover:text-omni-cyan transition-colors" />
                        <span className="text-xs text-slate-500 text-center px-4">
                          Arraste ou clique para upload
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={handleImageUpload}
                    />
                  </div>
                </div>

                {/* Identification Fields */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">
                      Tag / Código
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Icons.Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                        <input
                          required
                          className="w-full bg-omni-dark border border-omni-border rounded-lg pl-10 pr-3 py-2 text-white focus:border-omni-cyan outline-none font-mono text-omni-cyan font-bold"
                          placeholder="TAG-001"
                          value={editingAsset.code || ''}
                          onChange={e => setEditingAsset({ ...editingAsset, code: e.target.value })}
                        />
                      </div>
                      <button
                        type="button"
                        className="bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-400 rounded-lg px-3"
                        title="Gerar Tag Automático"
                      >
                        <Icons.Sparkles className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* NEW: QR CODE FIELD */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                      QR Code / UUID{' '}
                      <span className="bg-purple-900/50 text-purple-300 text-[9px] px-1.5 rounded border border-purple-700">
                        Rastreável
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Icons.QrCode className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                        <input
                          className="w-full bg-omni-dark border border-omni-border rounded-lg pl-10 pr-3 py-2 text-white focus:border-omni-cyan outline-none font-mono text-xs tracking-wider"
                          placeholder="UUID Único..."
                          value={editingAsset.qrCode || ''}
                          onChange={e =>
                            setEditingAsset({ ...editingAsset, qrCode: e.target.value })
                          }
                        />
                      </div>
                      <button
                        type="button"
                        onClick={generateQRCode}
                        className="bg-purple-600 hover:bg-purple-500 text-white rounded-lg px-3 flex items-center justify-center shadow-lg shadow-purple-900/20 transition-colors"
                        title="Gerar Hash Único"
                      >
                        <Icons.Sparkles className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">
                      Número de Série
                    </label>
                    <input
                      className="w-full bg-omni-dark border border-omni-border rounded-lg px-3 py-2 text-white focus:border-omni-cyan outline-none text-sm"
                      placeholder="SN-123456789"
                      value={editingAsset.serialNumber || ''}
                      onChange={e =>
                        setEditingAsset({ ...editingAsset, serialNumber: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Details & Specs */}
              <div className="col-span-12 md:col-span-8 space-y-6">
                {/* Main Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                      Nome do Equipamento
                    </label>
                    <input
                      required
                      className="w-full bg-omni-dark border border-omni-border rounded-lg px-4 py-3 text-white focus:border-omni-cyan outline-none text-lg font-bold"
                      placeholder="Ex: Compressor de Ar Parafuso"
                      value={editingAsset.name || ''}
                      onChange={e => setEditingAsset({ ...editingAsset, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                      Fabricante
                    </label>
                    <input
                      className="w-full bg-omni-dark border border-omni-border rounded-lg px-3 py-2 text-white focus:border-omni-cyan outline-none"
                      value={editingAsset.manufacturer || ''}
                      onChange={e =>
                        setEditingAsset({ ...editingAsset, manufacturer: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                      Modelo
                    </label>
                    <input
                      className="w-full bg-omni-dark border border-omni-border rounded-lg px-3 py-2 text-white focus:border-omni-cyan outline-none"
                      value={editingAsset.model || ''}
                      onChange={e => setEditingAsset({ ...editingAsset, model: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                      Localização (Setor)
                    </label>
                    <div className="relative">
                      <Icons.MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        className="w-full bg-omni-dark border border-omni-border rounded-lg pl-10 pr-3 py-2 text-white focus:border-omni-cyan outline-none"
                        value={editingAsset.location || ''}
                        onChange={e =>
                          setEditingAsset({ ...editingAsset, location: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                      Data de Aquisição
                    </label>
                    <input
                      type="date"
                      className="w-full bg-omni-dark border border-omni-border rounded-lg px-3 py-2 text-white focus:border-omni-cyan outline-none"
                      value={editingAsset.acquisitionDate || ''}
                      onChange={e =>
                        setEditingAsset({ ...editingAsset, acquisitionDate: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                      Custo de Aquisição (R$)
                    </label>
                    <input
                      type="number"
                      className="w-full bg-omni-dark border border-omni-border rounded-lg px-3 py-2 text-white focus:border-omni-cyan outline-none"
                      value={editingAsset.cost || ''}
                      onChange={e =>
                        setEditingAsset({ ...editingAsset, cost: parseFloat(e.target.value) })
                      }
                    />
                  </div>

                  {/* TECHNICAL SPECS ROW */}
                  <div className="col-span-2 grid grid-cols-3 gap-4 bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Potência
                      </label>
                      <input
                        className="w-full bg-omni-dark border border-omni-border rounded px-2 py-1.5 text-white text-sm focus:border-omni-cyan outline-none"
                        placeholder="Ex: 10CV"
                        value={editingAsset.power || ''}
                        onChange={e => setEditingAsset({ ...editingAsset, power: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Voltagem
                      </label>
                      <input
                        className="w-full bg-omni-dark border border-omni-border rounded px-2 py-1.5 text-white text-sm focus:border-omni-cyan outline-none"
                        placeholder="Ex: 220V"
                        value={editingAsset.voltage || ''}
                        onChange={e =>
                          setEditingAsset({ ...editingAsset, voltage: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Capacidade
                      </label>
                      <input
                        className="w-full bg-omni-dark border border-omni-border rounded px-2 py-1.5 text-white text-sm focus:border-omni-cyan outline-none"
                        placeholder="Ex: 5000L"
                        value={editingAsset.capacity || ''}
                        onChange={e =>
                          setEditingAsset({ ...editingAsset, capacity: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {/* HIERARCHY SELECTION */}
                  <div className="col-span-2 bg-slate-800/20 border border-slate-700/50 rounded-lg p-3 mt-2">
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1 flex items-center gap-1">
                      <Icons.Hierarchy className="w-3 h-3 text-omni-cyan" /> Ativo Pai (Hierarquia)
                    </label>
                    <select
                      className="w-full bg-omni-dark border border-omni-border rounded px-3 py-2 text-white focus:border-omni-cyan outline-none text-sm"
                      value={editingAsset.parentId || ''}
                      onChange={e =>
                        setEditingAsset({ ...editingAsset, parentId: e.target.value || undefined })
                      }
                    >
                      <option value="">Nenhum (Ativo Principal)</option>
                      {assets
                        .filter(a => a.id !== editingAsset.id)
                        .map(a => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.code})
                          </option>
                        ))}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Selecione caso este equipamento seja parte de um sistema maior.
                    </p>
                  </div>
                </div>

                {/* Status & Criticality (Visual Selectors) */}
                <div className="grid grid-cols-2 gap-6 bg-slate-900/30 p-4 rounded-xl border border-white/5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">
                      Status Operacional
                    </label>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingAsset({ ...editingAsset, status: 'operational' })}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${
                          editingAsset.status === 'operational'
                            ? 'bg-omni-success/20 border-omni-success text-white'
                            : 'border-slate-700 text-slate-500 hover:bg-slate-800'
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full ${
                            editingAsset.status === 'operational'
                              ? 'bg-omni-success shadow-[0_0_8px_#22c55e]'
                              : 'bg-slate-600'
                          }`}
                        ></div>
                        <span className="text-sm font-bold">Operacional</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAsset({ ...editingAsset, status: 'maintenance' })}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${
                          editingAsset.status === 'maintenance'
                            ? 'bg-omni-orange/20 border-omni-orange text-white'
                            : 'border-slate-700 text-slate-500 hover:bg-slate-800'
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full ${
                            editingAsset.status === 'maintenance'
                              ? 'bg-omni-orange shadow-[0_0_8px_#f97316]'
                              : 'bg-slate-600'
                          }`}
                        ></div>
                        <span className="text-sm font-bold">Em Manutenção</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAsset({ ...editingAsset, status: 'stopped' })}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${
                          editingAsset.status === 'stopped'
                            ? 'bg-omni-danger/20 border-omni-danger text-white'
                            : 'border-slate-700 text-slate-500 hover:bg-slate-800'
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full ${
                            editingAsset.status === 'stopped'
                              ? 'bg-omni-danger shadow-[0_0_8px_#ef4444]'
                              : 'bg-slate-600'
                          }`}
                        ></div>
                        <span className="text-sm font-bold">Parado</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">
                      Criticidade do Ativo
                    </label>
                    <div className="flex gap-1 bg-omni-dark p-1 rounded-lg border border-slate-700">
                      {['low', 'medium', 'high'].map(level => (
                        <button
                          key={level}
                          type="button"
                          onClick={() =>
                            setEditingAsset({ ...editingAsset, criticality: level as any })
                          }
                          className={`flex-1 py-2 rounded text-xs font-bold uppercase transition-all ${
                            editingAsset.criticality === level
                              ? level === 'high'
                                ? 'bg-purple-600 text-white'
                                : level === 'medium'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-600 text-white'
                              : 'text-slate-500 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {level === 'low' ? 'Baixa' : level === 'medium' ? 'Média' : 'Alta'}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                      Define o impacto na produção em caso de falha. Ativos de criticidade{' '}
                      <strong>ALTA</strong> terão prioridade nos algoritmos de IA.
                    </p>
                  </div>
                </div>

                {/* Dynamic Specifications */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">
                      Especificações Técnicas (Customizável)
                    </label>

                    <div className="flex gap-2">
                      {/* AI AUTO-FILL BUTTON */}
                      <button
                        type="button"
                        onClick={generateSpecsWithAI}
                        disabled={isGeneratingSpecs}
                        className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded flex items-center gap-1.5 transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingSpecs ? (
                          <Icons.Clock className="w-3 h-3 animate-spin" />
                        ) : (
                          <Icons.Sparkles className="w-3 h-3" />
                        )}
                        {isGeneratingSpecs ? 'Preenchendo...' : 'Preencher com IA'}
                      </button>

                      <button
                        type="button"
                        onClick={addSpecRow}
                        className="text-[10px] text-omni-cyan hover:underline flex items-center gap-1"
                      >
                        <Icons.Plus className="w-3 h-3" /> Adicionar Campo
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {techSpecs.map((spec, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          placeholder="Atributo (ex: Peso)"
                          className="w-1/3 bg-omni-dark border border-omni-border rounded px-3 py-2 text-white text-sm focus:border-omni-cyan outline-none"
                          value={spec.key}
                          onChange={e => updateSpec(index, 'key', e.target.value)}
                        />
                        <input
                          placeholder="Valor (ex: 500kg)"
                          className="flex-1 bg-omni-dark border border-omni-border rounded px-3 py-2 text-white text-sm focus:border-omni-cyan outline-none"
                          value={spec.value}
                          onChange={e => updateSpec(index, 'value', e.target.value)}
                        />
                        {techSpecs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSpecRow(index)}
                            className="text-slate-500 hover:text-omni-danger p-2"
                          >
                            <Icons.Trash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="col-span-12 border-t border-omni-border pt-6 flex justify-between items-center">
                <span className="text-xs text-slate-500 italic">
                  * Campos obrigatórios para gerar o Gêmeo Digital.
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 text-slate-400 hover:text-white font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-omni-cyan hover:bg-cyan-400 text-omni-dark font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                  >
                    <Icons.Check className="w-5 h-5" /> Salvar Equipamento
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD PART MANUAL MODAL (NEW) --- */}
      {isAddPartModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-omni-panel border border-omni-border rounded-xl w-full max-w-md shadow-2xl flex flex-col">
            <div className="p-5 border-b border-omni-border bg-omni-dark rounded-t-xl flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Icons.Plus className="w-5 h-5 text-omni-cyan" /> Nova Peça (BOM)
              </h3>
              <button
                onClick={() => setIsAddPartModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveNewPart} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  Nome da Peça
                </label>
                <input
                  required
                  autoFocus
                  className="w-full bg-omni-dark border border-omni-border rounded px-3 py-2 text-white focus:border-omni-cyan outline-none"
                  value={newPart.name || ''}
                  onChange={e => setNewPart({ ...newPart, name: e.target.value })}
                  placeholder="Ex: Rolamento 6205"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  Código (Part Number)
                </label>
                <input
                  required
                  className="w-full bg-omni-dark border border-omni-border rounded px-3 py-2 text-white focus:border-omni-cyan outline-none font-mono"
                  value={newPart.code || ''}
                  onChange={e => setNewPart({ ...newPart, code: e.target.value })}
                  placeholder="SKF-6205-ZZ"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    Qtd. Sugerida
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full bg-omni-dark border border-omni-border rounded px-3 py-2 text-white focus:border-omni-cyan outline-none"
                    value={newPart.quantity}
                    onChange={e => setNewPart({ ...newPart, quantity: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    Criticidade
                  </label>
                  <select
                    className="w-full bg-omni-dark border border-omni-border rounded px-3 py-2 text-white focus:border-omni-cyan outline-none"
                    value={newPart.criticality}
                    onChange={e => setNewPart({ ...newPart, criticality: e.target.value as any })}
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPartModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-sm font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-omni-cyan hover:bg-cyan-400 text-omni-dark font-bold py-2 px-6 rounded text-sm shadow-lg"
                >
                  Adicionar Peça
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
