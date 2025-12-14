import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from './Icons';
import { SparePart, MaintenanceTicket } from '../types';
import { useMaintenance } from '../context/MaintenanceContext';

export const InventoryManager: React.FC = () => {
  const { inventory, addPart, updatePart, addTicket } = useMaintenance();

  const [searchTerm, setSearchTerm] = useState('');

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);

  // Data State
  const [editingPart, setEditingPart] = useState<Partial<SparePart>>({});
  const [restockItem, setRestockItem] = useState<SparePart | null>(null);
  const [labelItem, setLabelItem] = useState<SparePart | null>(null);

  // Batch Logic State
  const [selectedBatchItems, setSelectedBatchItems] = useState<string[]>([]);
  const [batchQuantities, setBatchQuantities] = useState<Record<string, number>>({});

  // Image Upload Preview State
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Simulation State for Import
  const [importStep, setImportStep] = useState<'upload' | 'preview'>('upload');

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const filteredInventory = inventory.filter(
    part =>
      part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // KPIs
  const totalValue = inventory.reduce((acc, part) => acc + part.cost * part.quantity, 0);
  const lowStockParts = inventory.filter(part => part.quantity <= (part.minLevel || 0));
  const lowStockCount = lowStockParts.length;
  const criticalItems = inventory.filter(part => part.criticality === 'high').length;

  // --- Batch Logic Effects ---
  // Sempre que abrir o modal de lote ou mudar a seleção, recalcular as sugestões iniciais
  useEffect(() => {
    if (isBatchModalOpen) {
      const initialQuantities: Record<string, number> = {};
      selectedBatchItems.forEach(id => {
        const part = inventory.find(p => p.id === id);
        if (part) {
          // Sugestão inteligente: Preencher até atingir o dobro do mínimo (Buffer de segurança)
          // Ou se estiver zerado, pedir 3x o mínimo.
          const target = (part.minLevel || 1) * 3;
          const suggest = Math.max(1, target - part.quantity);
          initialQuantities[id] = suggest;
        }
      });
      setBatchQuantities(initialQuantities);
    }
  }, [isBatchModalOpen, selectedBatchItems, inventory]);

  // Batch Calculations
  const batchTotalCost = useMemo(() => {
    return selectedBatchItems.reduce((acc, id) => {
      const part = inventory.find(p => p.id === id);
      const qty = batchQuantities[id] || 0;
      return acc + (part?.cost || 0) * qty;
    }, 0);
  }, [selectedBatchItems, batchQuantities, inventory]);

  // --- Actions ---

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const partToSave = {
      ...editingPart,
      image: previewImage || editingPart.image,
    } as SparePart;

    if (editingPart.id) {
      updatePart(partToSave);
      showToast('Item atualizado com sucesso!', 'success');
    } else {
      const newPart = {
        ...partToSave,
        id: `SP-${Math.floor(Math.random() * 10000)}`,
        quantity: editingPart.quantity || 0,
        minLevel: editingPart.minLevel || 5,
        cost: editingPart.cost || 0,
        image:
          previewImage ||
          'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?auto=format&fit=crop&q=80&w=200',
      } as SparePart;
      addPart(newPart);
      showToast('Novo item cadastrado!', 'success');
    }
    setIsModalOpen(false);
    setEditingPart({});
    setPreviewImage(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewImage(url);
    }
  };

  const handleAdjustStock = (part: SparePart, delta: number) => {
    const newQty = Math.max(0, part.quantity + delta);
    updatePart({ ...part, quantity: newQty });
  };

  const openRestockModal = (part: SparePart) => {
    setRestockItem(part);
    setIsRestockModalOpen(true);
  };

  const openLabelModal = (part: SparePart) => {
    setLabelItem(part);
    setIsLabelModalOpen(true);
  };

  const handleBatchOpen = () => {
    if (lowStockCount === 0) {
      showToast('Estoque saudável! Nenhum item abaixo do mínimo.', 'success');
      return;
    }
    // Select all low stock items by default
    setSelectedBatchItems(lowStockParts.map(p => p.id));
    setIsBatchModalOpen(true);
  };

  const toggleBatchItem = (id: string) => {
    if (selectedBatchItems.includes(id)) {
      setSelectedBatchItems(prev => prev.filter(item => item !== id));
    } else {
      setSelectedBatchItems(prev => [...prev, id]);
    }
  };

  const handleBatchQuantityChange = (id: string, newQty: number) => {
    setBatchQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, newQty),
    }));
  };

  const generateQRCode = () => {
    const uuid = `PART-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    setEditingPart(prev => ({ ...prev, qrCode: uuid }));
  };

  // --- INTEGRATION: CREATE PURCHASE TICKET ---
  const handleBatchConfirm = () => {
    const itemsToBuy = inventory.filter(p => selectedBatchItems.includes(p.id));

    // Detailed breakdown for description
    const itemsList = itemsToBuy
      .map(i => {
        const qty = batchQuantities[i.id] || 1;
        const subtotal = i.cost * qty;
        return `- [ ] ${i.name} (${i.code}): Pedir ${qty} un. (Est. R$ ${subtotal.toFixed(2)})`;
      })
      .join('\n');

    const purchaseTicket: MaintenanceTicket = {
      id: `REQ-${Math.floor(Math.random() * 10000)}`,
      title: `[COMPRA] Requisição de Lote (${itemsToBuy.length} SKUs)`,
      requester: 'Gestão de Estoque',
      assetId: 'ALMOX-GERAL',
      type: 'purchase',
      description: `Solicitação de compra em lote gerada via Almoxarifado.\n\nITENS REQUISITADOS:\n${itemsList}\n\nValor Total Estimado: R$ ${batchTotalCost.toFixed(
        2
      )}`,
      urgency: 'high',
      status: 'open',
      createdAt: new Date().toISOString(),
      occurrenceDate: new Date().toISOString(),
      totalCost: batchTotalCost,
      activities: [
        {
          id: Date.now().toString(),
          userId: 'system',
          userName: 'Sistema',
          action: `Requisição gerada. Valor total: R$ ${batchTotalCost.toFixed(2)}`,
          timestamp: new Date().toISOString(),
          type: 'status_change',
        },
      ],
    };

    addTicket(purchaseTicket);
    setIsBatchModalOpen(false);
    showToast(`Requisição ${purchaseTicket.id} enviada para Compras com sucesso!`, 'success');
  };

  const handleConfirmImport = () => {
    const mockImportedItem: SparePart = {
      id: `SP-XML-${Math.floor(Math.random() * 1000)}`,
      name: 'Correia V A-34 (Importada)',
      code: 'BLT-A34-IMP',
      quantity: 10,
      minLevel: 5,
      cost: 15.5,
      criticality: 'medium',
      location: 'REC-01',
      category: 'mechanical',
      image:
        'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?auto=format&fit=crop&q=80&w=200',
    };
    addPart(mockImportedItem);
    showToast('N.F. 4590 processada! 1 novo item cadastrado.', 'success');
    setIsImportModalOpen(false);
    setImportStep('upload');
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'electrical':
        return <Icons.Zap className="w-4 h-4 text-yellow-400" />;
      case 'mechanical':
        return <Icons.Cog className="w-4 h-4 text-slate-400" />;
      case 'hydraulic':
        return <Icons.Droplets className="w-4 h-4 text-blue-400" />;
      case 'consumable':
        return <Icons.Archive className="w-4 h-4 text-green-400" />;
      default:
        return <Icons.Box className="w-4 h-4 text-slate-500" />;
    }
  };

  // --- REFINED GAUGE COMPONENT ---
  const StockGauge = ({
    current,
    min,
    max = 100,
  }: {
    current: number;
    min: number;
    max?: number;
  }) => {
    // Calculate visual range. Max viewable is usually 2x or 3x the min level
    const viewMax = Math.max(current, min * 3);
    const percentage = Math.min((current / viewMax) * 100, 100);
    const minPercentage = Math.min((min / viewMax) * 100, 100);

    let barColor = 'bg-emerald-500';
    if (current === 0) barColor = 'bg-red-600';
    else if (current <= min) barColor = 'bg-amber-500';

    return (
      <div className="w-36 flex flex-col gap-1">
        <div className="flex justify-between items-end text-[10px] font-mono leading-none">
          <span className={current <= min ? 'text-amber-500 font-bold' : 'text-white font-bold'}>
            {current} UN
          </span>
          <span className="text-slate-500">Meta: {min}</span>
        </div>
        <div className="h-1.5 w-full bg-slate-800/80 rounded-full relative overflow-hidden">
          {/* Background tick for min level */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/20 z-10"
            style={{ left: `${minPercentage}%` }}
          ></div>
          {/* Actual Bar */}
          <div
            className={`h-full ${barColor} transition-all duration-700 ease-out shadow-[0_0_10px_currentColor]`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 p-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col relative">
      {/* Toast */}
      {toast && (
        <div
          className={`absolute top-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300 border ${
            toast.type === 'success'
              ? 'bg-green-900/90 border-green-500 text-white'
              : 'bg-slate-800 border-slate-600 text-white'
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

      {/* LIGHTBOX */}
      {viewImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-8 animate-in fade-in duration-200 cursor-zoom-out backdrop-blur-sm"
          onClick={() => setViewImage(null)}
        >
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
            <img
              src={viewImage}
              alt="Zoom"
              className="max-w-full max-h-full object-contain rounded shadow-2xl border border-slate-700"
            />
          </div>
        </div>
      )}

      {/* Header & KPIs */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        {/* Valuation Card */}
        <div className="col-span-1 bg-gradient-to-br from-omni-panel to-slate-900 border border-omni-border rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Icons.TrendingUp className="w-16 h-16 text-omni-cyan" />
          </div>
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
            Valuation (Total)
          </p>
          <h3 className="text-2xl font-mono font-bold text-white tracking-tight">
            R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-omni-cyan mt-2 flex items-center gap-1">
            <Icons.Activity className="w-3 h-3" /> Giro de Estoque: 4.2x/ano
          </p>
        </div>

        {/* Restock Card */}
        <div className="col-span-1 bg-omni-panel border border-omni-border rounded-xl p-5 shadow-lg border-l-4 border-l-amber-500 relative group overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
                Ponto de Reposição
              </p>
              <h3 className="text-2xl font-display font-bold text-white">
                {lowStockCount}{' '}
                <span className="text-sm font-sans font-normal text-slate-500">SKUs</span>
              </h3>
            </div>
            <div className="p-2 bg-amber-500/10 rounded text-amber-500">
              <Icons.ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          {lowStockCount > 0 && (
            <button
              onClick={handleBatchOpen}
              className="mt-3 text-[10px] bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all w-full justify-center shadow-lg shadow-amber-900/20 font-bold uppercase tracking-wide"
            >
              <Icons.ListChecks className="w-4 h-4" /> Gerar Requisição em Lote
            </button>
          )}
        </div>

        {/* Critical Items Card */}
        <div className="col-span-1 bg-omni-panel border border-omni-border rounded-xl p-5 shadow-lg border-l-4 border-l-red-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
                Itens Críticos (A)
              </p>
              <h3 className="text-2xl font-display font-bold text-white">
                {criticalItems}{' '}
                <span className="text-sm font-sans font-normal text-slate-500">SKUs</span>
              </h3>
            </div>
            <div className="p-2 bg-red-500/10 rounded text-red-500">
              <Icons.AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Curva ABC - Classe A</p>
        </div>

        {/* Import Card */}
        <div
          onClick={() => setIsImportModalOpen(true)}
          className="col-span-1 bg-omni-panel border border-omni-border rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-800 transition-colors border-dashed group relative"
        >
          <div className="absolute inset-0 bg-omni-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <Icons.CloudUpload className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform" />
          <div className="text-center relative z-10">
            <span className="text-sm font-bold text-slate-300 block group-hover:text-white">
              Importar N.F. (XML)
            </span>
            <span className="text-[10px] text-slate-500 group-hover:text-slate-400">
              Arraste ou clique para upload
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-white">Estoque de Materiais (MRO)</h2>
          <p className="text-xs text-slate-400">Gerenciamento e Rastreabilidade de Peças</p>
        </div>
        <div className="flex gap-3">
          <div className="relative group">
            <Icons.Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500 group-focus-within:text-omni-cyan transition-colors" />
            <input
              type="text"
              placeholder="Buscar código, nome, tag..."
              className="bg-omni-panel border border-omni-border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-omni-cyan outline-none w-72 shadow-sm placeholder-slate-600 transition-all focus:w-80"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="bg-omni-panel border border-omni-border hover:border-slate-500 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all font-medium"
          >
            <Icons.FileSpreadsheet className="w-4 h-4 text-green-500" /> Relatórios
          </button>
          <button
            onClick={() => {
              setEditingPart({});
              setPreviewImage(null);
              setIsModalOpen(true);
            }}
            className="bg-omni-cyan hover:bg-cyan-400 text-omni-dark font-bold py-2 px-6 rounded-lg text-sm flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transform hover:-translate-y-0.5"
          >
            <Icons.Plus className="w-4 h-4" /> Novo Item
          </button>
        </div>
      </div>

      {/* HIGH-FIDELITY INVENTORY TABLE */}
      <div className="flex-1 bg-omni-panel border border-omni-border rounded-xl overflow-hidden flex flex-col shadow-2xl relative">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-omni-dark border-b border-omni-border text-[10px] uppercase font-bold text-slate-400 tracking-wider sticky top-0 z-10">
          <div className="col-span-1 text-center">Visual</div>
          <div className="col-span-4">Identificação (SKU / Nome)</div>
          <div className="col-span-2">Localização</div>
          <div className="col-span-2">Status & Nível</div>
          <div className="col-span-2 text-right">Valuation</div>
          <div className="col-span-1 text-right">Ações</div>
        </div>

        {/* Table Body */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {filteredInventory.map(part => {
            const isLow = part.quantity <= (part.minLevel || 0);
            return (
              <div
                key={part.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors group items-center"
              >
                {/* Visual */}
                <div className="col-span-1 flex justify-center">
                  <div
                    className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden relative group/img cursor-zoom-in shadow-md hover:border-omni-cyan transition-colors"
                    onClick={() => part.image && setViewImage(part.image)}
                  >
                    {part.image ? (
                      <>
                        <img
                          src={part.image}
                          alt={part.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity duration-200">
                          <Icons.Scan className="w-5 h-5 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-600">
                        {getCategoryIcon(part.category)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Identification */}
                <div className="col-span-4 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white text-sm font-sans tracking-tight">
                      {part.name}
                    </span>
                    {part.criticality === 'high' && (
                      <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 font-bold uppercase tracking-wide">
                        Crítico
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-omni-cyan font-bold tracking-wide">
                      {part.code}
                    </span>
                    {part.qrCode && (
                      <span className="text-[9px] font-mono text-slate-500 bg-black/30 px-1.5 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                        <Icons.QrCode className="w-3 h-3" /> {part.qrCode}
                      </span>
                    )}
                    <span className="text-[10px] uppercase bg-slate-800/80 px-2 py-0.5 rounded text-slate-400 border border-slate-700 font-bold tracking-wider">
                      {part.category}
                    </span>
                  </div>
                </div>

                {/* Location */}
                <div className="col-span-2 flex items-center">
                  <div className="flex items-center gap-2 bg-black/20 w-fit px-3 py-1.5 rounded border border-white/5 group-hover:border-white/10 transition-colors">
                    <Icons.MapPin className="w-3 h-3 text-slate-500" />
                    <span className="text-xs font-mono text-slate-300 font-bold">
                      {part.location || 'PENDENTE'}
                    </span>
                  </div>
                </div>

                {/* Status & Level Gauge */}
                <div className="col-span-2 flex items-center gap-3">
                  <StockGauge current={part.quantity} min={part.minLevel || 0} />

                  {/* Quick Adjust Buttons (Hidden by default, shown on hover) */}
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <button
                      onClick={() => handleAdjustStock(part, 1)}
                      className="p-0.5 bg-slate-800 hover:bg-emerald-600 hover:text-white rounded border border-slate-700 transition-colors"
                    >
                      <Icons.Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleAdjustStock(part, -1)}
                      className="p-0.5 bg-slate-800 hover:bg-red-600 hover:text-white rounded border border-slate-700 transition-colors"
                    >
                      <Icons.TrendingDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Valuation */}
                <div className="col-span-2 text-right flex flex-col justify-center">
                  <div className="text-slate-300 text-sm font-mono">R$ {part.cost.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-500 font-bold font-mono mt-0.5">
                    Total: R$ {(part.cost * part.quantity).toFixed(2)}
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-1 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openLabelModal(part)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Icons.QrCode className="w-4 h-4" />
                  </button>
                  {isLow ? (
                    <button
                      onClick={() => openRestockModal(part)}
                      className="p-2 bg-amber-500/10 text-amber-500 border border-amber-500/50 rounded-lg hover:bg-amber-500 hover:text-white transition-all"
                    >
                      <Icons.ShoppingCart className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingPart(part);
                        setPreviewImage(part.image || null);
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-omni-cyan hover:bg-omni-cyan/10 rounded-lg transition-colors"
                    >
                      <Icons.Edit className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Table Footer */}
        <div className="px-6 py-3 bg-omni-dark border-t border-omni-border text-[10px] text-slate-500 flex justify-between uppercase font-bold tracking-wider sticky bottom-0 z-10">
          <span>
            Exibindo {filteredInventory.length} de {inventory.length} itens
          </span>
          <span>
            Valuation da Página: R${' '}
            {filteredInventory.reduce((acc, p) => acc + p.cost * p.quantity, 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* 1. Add/Edit Item Modal (Existing Logic, improved UI handled by generic modal styles) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-omni-panel border border-omni-border rounded-xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-omni-border flex justify-between items-center bg-omni-dark rounded-t-xl shrink-0">
              <h3 className="text-xl font-bold text-white">
                {editingPart.id ? 'Editar Cadastro de Item' : 'Novo Item de Estoque'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <form onSubmit={handleSave} className="p-6 space-y-4">
                {/* IMAGE UPLOAD SECTION */}
                <div className="flex justify-center mb-4">
                  <div className="relative w-32 h-32 rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/50 hover:border-omni-cyan group transition-all flex items-center justify-center overflow-hidden cursor-pointer">
                    {previewImage ? (
                      <>
                        <img src={previewImage} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-xs font-bold text-white">Alterar</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-slate-500 group-hover:text-omni-cyan">
                        <Icons.Camera className="w-8 h-8 mb-1" />
                        <span className="text-[10px]">Adicionar Foto</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={handleImageUpload}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Nome da Peça
                    </label>
                    <input
                      required
                      className="w-full bg-omni-dark border border-omni-border rounded px-3 py-2 text-white focus:border-omni-cyan outline-none"
                      value={editingPart.name || ''}
                      onChange={e => setEditingPart({ ...editingPart, name: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Código (SKU)
                    </label>
                    <input
                      required
                      className="w-full bg-omni-dark border border-omni-border rounded px-3 py-2 text-white focus:border-omni-cyan outline-none font-mono"
                      value={editingPart.code || ''}
                      onChange={e => setEditingPart({ ...editingPart, code: e.target.value })}
                    />
                  </div>
                </div>

                {/* NEW: QR CODE FIELD */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                    QR Code (Rastreio){' '}
                    <span className="bg-purple-900/50 text-purple-300 text-[8px] px-1.5 rounded border border-purple-700">
                      WMS
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Icons.QrCode className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        className="w-full bg-omni-dark border border-omni-border rounded px-3 pl-10 py-2 text-white focus:border-omni-cyan outline-none font-mono text-xs tracking-wider"
                        placeholder="UUID ou Serial..."
                        value={editingPart.qrCode || ''}
                        onChange={e => setEditingPart({ ...editingPart, qrCode: e.target.value })}
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Localização (Bin)
                    </label>
                    <input
                      className="w-full bg-omni-dark border border-omni-border rounded px-3 py-2 text-white focus:border-omni-cyan outline-none"
                      value={editingPart.location || ''}
                      onChange={e => setEditingPart({ ...editingPart, location: e.target.value })}
                      placeholder="Ex: A-01-02"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Categoria
                    </label>
                    <select
                      className="w-full bg-omni-dark border border-omni-border rounded px-3 py-2 text-white focus:border-omni-cyan outline-none"
                      value={editingPart.category || 'mechanical'}
                      onChange={e =>
                        setEditingPart({ ...editingPart, category: e.target.value as any })
                      }
                    >
                      <option value="mechanical">Mecânica</option>
                      <option value="electrical">Elétrica</option>
                      <option value="hydraulic">Hidráulica</option>
                      <option value="consumable">Consumível</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Estoque Físico
                    </label>
                    <input
                      type="number"
                      className="w-full bg-omni-panel border border-omni-border rounded px-3 py-2 text-white focus:border-omni-cyan outline-none text-center font-bold"
                      value={editingPart.quantity}
                      onChange={e =>
                        setEditingPart({ ...editingPart, quantity: parseInt(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Ponto Reposição
                    </label>
                    <input
                      type="number"
                      className="w-full bg-omni-panel border border-omni-border rounded px-3 py-2 text-white focus:border-omni-cyan outline-none text-center"
                      value={editingPart.minLevel}
                      onChange={e =>
                        setEditingPart({ ...editingPart, minLevel: parseInt(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Custo Unit.
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full bg-omni-panel border border-omni-border rounded px-3 py-2 text-white focus:border-omni-cyan outline-none text-center"
                      value={editingPart.cost}
                      onChange={e =>
                        setEditingPart({ ...editingPart, cost: parseFloat(e.target.value) })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-omni-border">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-omni-cyan hover:bg-cyan-400 text-omni-dark font-bold py-2 px-6 rounded transition-colors shadow-lg shadow-cyan-500/20"
                  >
                    Salvar Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 2. LABEL PRINT MODAL (Same) */}
      {isLabelModalOpen && labelItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-omni-panel border border-omni-border rounded-xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 flex flex-col">
            <div className="p-4 border-b border-omni-border flex justify-between items-center bg-omni-dark rounded-t-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Icons.Printer className="w-4 h-4 text-slate-400" /> Imprimir Etiqueta Industrial
              </h3>
              <button
                onClick={() => setIsLabelModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <Icons.Close className="w-4 h-4" />
              </button>
            </div>

            <div className="p-8 flex justify-center bg-slate-900/50">
              {/* THE LABEL VISUALIZATION */}
              <div className="w-[300px] h-[180px] bg-white text-black p-4 rounded-sm shadow-xl flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-omni-dark"></div>
                <div className="pl-4 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold uppercase leading-none tracking-tight">
                        {labelItem.name.substring(0, 18)}
                      </h2>
                      <p className="font-mono font-bold text-lg mt-1">{labelItem.code}</p>
                    </div>
                    {/* Mock QR Code */}
                    <div className="w-16 h-16 bg-black p-1">
                      <div className="w-full h-full border-2 border-white flex items-center justify-center text-white text-[8px] font-mono text-center leading-none">
                        QR CODE
                        <br />
                        SCAN ME
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 border-t-2 border-black pt-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold block">Localização</span>
                      <span className="text-xl font-bold bg-black text-white px-2 inline-block">
                        {labelItem.location || 'N/A'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold block">Categoria</span>
                      <span className="text-sm font-bold uppercase">{labelItem.category}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-end mt-auto">
                    <span className="text-[8px] font-mono">OMNIGUARD INV. SYS</span>
                    <span className="text-[10px] font-bold">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-omni-border bg-omni-dark rounded-b-xl flex gap-3">
              <button
                onClick={() => setIsLabelModalOpen(false)}
                className="flex-1 py-2 text-slate-400 hover:text-white text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setIsLabelModalOpen(false);
                  showToast('Etiqueta enviada para impressora ZEBRA-01', 'success');
                }}
                className="flex-1 bg-white text-black font-bold py-2 rounded shadow hover:bg-slate-200 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Icons.Printer className="w-4 h-4" /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. REPORT MODAL (Same) */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white text-black rounded-xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 flex flex-col h-[80vh]">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl shrink-0">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Icons.FileSpreadsheet className="w-5 h-5 text-green-600" /> Relatório Executivo
                  de Estoque
                </h3>
                <p className="text-xs text-gray-500">Gerado em: {new Date().toLocaleString()}</p>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-gray-400 hover:text-black"
              >
                <Icons.Close className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 font-serif">
              <div className="text-center mb-8 border-b-2 border-black pb-4">
                <h1 className="text-3xl font-bold uppercase tracking-widest">OMNIGUARD</h1>
                <p className="text-sm font-mono mt-1">INDUSTRIAL ASSET MANAGEMENT SYSTEM</p>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-100 p-4 rounded border border-gray-300">
                  <span className="text-xs font-bold uppercase text-gray-500 block mb-1">
                    Valuation Total
                  </span>
                  <span className="text-2xl font-mono font-bold">
                    R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-gray-100 p-4 rounded border border-gray-300">
                  <span className="text-xs font-bold uppercase text-gray-500 block mb-1">
                    Total SKUs
                  </span>
                  <span className="text-2xl font-mono font-bold">{inventory.length}</span>
                </div>
                <div className="bg-red-50 p-4 rounded border border-red-200">
                  <span className="text-xs font-bold uppercase text-red-500 block mb-1">
                    Abaixo do Mínimo
                  </span>
                  <span className="text-2xl font-mono font-bold text-red-600">{lowStockCount}</span>
                </div>
              </div>

              <h4 className="font-bold uppercase text-sm mb-2 border-b border-gray-300 pb-1">
                Top 5 Itens de Maior Valor
              </h4>
              <table className="w-full text-sm text-left mb-8">
                <thead className="bg-gray-100 text-xs uppercase">
                  <tr>
                    <th className="p-2">Item</th>
                    <th className="p-2 text-right">Qtd</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[...inventory]
                    .sort((a, b) => b.cost * b.quantity - a.cost * a.quantity)
                    .slice(0, 5)
                    .map(i => (
                      <tr key={i.id} className="border-b border-gray-100">
                        <td className="p-2">{i.name}</td>
                        <td className="p-2 text-right font-mono">{i.quantity}</td>
                        <td className="p-2 text-right font-mono font-bold">
                          R$ {(i.cost * i.quantity).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                <strong>Nota do Sistema:</strong>{' '}
                {lowStockCount > 0
                  ? `Atenção necessária para ${lowStockCount} itens críticos abaixo do nível de reposição. Recomenda-se abertura de requisição.`
                  : 'Níveis de estoque dentro dos parâmetros operacionais.'}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2 text-gray-500 hover:text-black font-bold text-sm"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setIsReportModalOpen(false);
                  showToast('Relatório enviado para impressão.', 'success');
                }}
                className="bg-black text-white font-bold py-2 px-6 rounded shadow-lg hover:bg-gray-800 transition-all text-sm flex items-center gap-2"
              >
                <Icons.Printer className="w-4 h-4" /> Imprimir Relatório
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. ROBUST BATCH REQUISITION MODAL (MAJOR REDESIGN) */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in zoom-in-95">
          <div className="bg-omni-panel border border-omni-border rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/10">
            {/* Header */}
            <div className="px-8 py-6 border-b border-omni-border bg-omni-dark flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Icons.ListChecks className="w-8 h-8 text-amber-500" /> Pré-Requisição de Compra
                  (Lote)
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Revise as quantidades e custos antes de gerar a solicitação formal.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Itens Selecionados
                  </span>
                  <span className="text-xl font-mono font-bold text-white">
                    {selectedBatchItems.length}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-700 mx-2"></div>
                <button
                  onClick={() => setIsBatchModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"
                >
                  <Icons.Close className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Main Grid Content */}
            <div className="flex-1 overflow-hidden bg-slate-900/30 flex flex-col">
              {/* Grid Header */}
              <div className="grid grid-cols-12 gap-4 px-8 py-3 bg-omni-dark/50 border-b border-omni-border text-xs font-bold text-slate-400 uppercase tracking-wider">
                <div className="col-span-1 text-center">
                  <Icons.CheckSquare className="w-4 h-4 mx-auto" />
                </div>
                <div className="col-span-4">Item & SKU</div>
                <div className="col-span-1 text-center">Atual</div>
                <div className="col-span-1 text-center">Meta</div>
                <div className="col-span-2 text-center text-amber-500">Qtd. Compra</div>
                <div className="col-span-1 text-right">Unitário</div>
                <div className="col-span-2 text-right">Subtotal</div>
              </div>

              {/* Grid Rows */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {lowStockParts.map(part => {
                  const isSelected = selectedBatchItems.includes(part.id);
                  const buyQty = batchQuantities[part.id] || 0;
                  const subtotal = buyQty * part.cost;

                  return (
                    <div
                      key={part.id}
                      className={`grid grid-cols-12 gap-4 px-8 py-4 border-b border-slate-800/50 items-center transition-colors hover:bg-white/[0.02] ${
                        isSelected ? 'bg-amber-500/5' : 'opacity-60 grayscale'
                      }`}
                    >
                      <div className="col-span-1 text-center">
                        <button
                          onClick={() => toggleBatchItem(part.id)}
                          className={`p-1 rounded ${
                            isSelected ? 'text-amber-500' : 'text-slate-600 hover:text-slate-400'
                          }`}
                        >
                          {isSelected ? (
                            <Icons.CheckSquare className="w-5 h-5" />
                          ) : (
                            <Icons.Square className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      <div className="col-span-4">
                        <div
                          className={`font-bold text-sm ${
                            isSelected ? 'text-white' : 'text-slate-500'
                          }`}
                        >
                          {part.name}
                        </div>
                        <div className="text-xs font-mono text-omni-cyan opacity-80">
                          {part.code}
                        </div>
                      </div>
                      <div className="col-span-1 text-center font-mono font-bold text-red-500">
                        {part.quantity}
                      </div>
                      <div className="col-span-1 text-center font-mono text-slate-400">
                        {(part.minLevel || 1) * 3}
                      </div>

                      {/* Quantity Input */}
                      <div className="col-span-2 px-2">
                        <div
                          className={`flex items-center bg-omni-dark border rounded-lg ${
                            isSelected
                              ? 'border-amber-500/50'
                              : 'border-slate-700 opacity-50 pointer-events-none'
                          }`}
                        >
                          <button
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white"
                            onClick={() => handleBatchQuantityChange(part.id, buyQty - 1)}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            className="w-full bg-transparent text-center font-mono font-bold text-white outline-none"
                            value={buyQty}
                            onChange={e =>
                              handleBatchQuantityChange(part.id, parseInt(e.target.value) || 0)
                            }
                          />
                          <button
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white"
                            onClick={() => handleBatchQuantityChange(part.id, buyQty + 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="col-span-1 text-right font-mono text-xs text-slate-400">
                        R$ {part.cost.toFixed(2)}
                      </div>
                      <div
                        className={`col-span-2 text-right font-mono font-bold text-sm ${
                          isSelected ? 'text-white' : 'text-slate-600'
                        }`}
                      >
                        R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Summary */}
            <div className="px-8 py-6 border-t border-omni-border bg-omni-dark flex items-center justify-between shrink-0">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  Resumo da Operação
                </p>
                <div className="flex gap-6 text-sm text-slate-300">
                  <span>
                    Itens Críticos: <strong className="text-white">{lowStockCount}</strong>
                  </span>
                  <span>
                    Itens Selecionados:{' '}
                    <strong className="text-white">{selectedBatchItems.length}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                    Total Estimado
                  </p>
                  <p className="text-3xl font-mono font-bold text-amber-500">
                    R$ {batchTotalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="h-10 w-px bg-slate-700"></div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsBatchModalOpen(false)}
                    className="px-6 py-3 rounded-lg text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleBatchConfirm}
                    disabled={selectedBatchItems.length === 0}
                    className="bg-amber-600 hover:bg-amber-500 text-white text-base font-bold py-3 px-8 rounded-lg shadow-xl shadow-amber-900/30 flex items-center gap-3 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Icons.ShoppingCart className="w-5 h-5" /> Gerar Pedido Unificado
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. INDIVIDUAL RESTOCK MODAL */}
      {isRestockModalOpen && restockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-omni-panel border border-omni-border rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="p-4 border-b border-omni-border bg-omni-dark rounded-t-xl flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Icons.ShoppingCart className="w-5 h-5 text-amber-500" /> Repor Estoque
              </h3>
              <button
                onClick={() => setIsRestockModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700">
                  {restockItem.image ? (
                    <img
                      src={restockItem.image}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Icons.Box className="w-8 h-8 text-slate-500" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg">{restockItem.name}</h4>
                  <p className="text-sm text-omni-cyan font-mono">{restockItem.code}</p>
                  <div className="flex gap-4 mt-1 text-xs text-slate-400">
                    <span>
                      Atual: <strong className="text-white">{restockItem.quantity}</strong>
                    </span>
                    <span>
                      Min: <strong className="text-amber-500">{restockItem.minLevel}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
                <p className="text-xs text-amber-200 mb-2 font-bold uppercase">
                  Sugestão de Compra
                </p>
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-3xl font-bold text-white">
                      {Math.max(1, (restockItem.minLevel || 0) * 3 - restockItem.quantity)}
                    </span>
                    <span className="text-xs text-amber-500 ml-1 font-bold">UNIDADES</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Custo Est.</div>
                    <div className="text-lg font-mono font-bold text-white">
                      R${' '}
                      {(
                        Math.max(1, (restockItem.minLevel || 0) * 3 - restockItem.quantity) *
                        restockItem.cost
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  handleAdjustStock(
                    restockItem,
                    Math.max(1, (restockItem.minLevel || 0) * 3 - restockItem.quantity)
                  );
                  setIsRestockModalOpen(false);
                  showToast(`${restockItem.name} reabastecido com sucesso!`, 'success');
                }}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 transition-all"
              >
                <Icons.Check className="w-5 h-5" /> Confirmar Reposição Manual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Import XML Modal (Existing) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-omni-panel border border-omni-border rounded-xl w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-omni-border flex justify-between items-center bg-omni-dark rounded-t-xl">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Icons.FileJson className="w-6 h-6 text-green-500" /> Importar Nota Fiscal (XML)
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>

            {importStep === 'upload' ? (
              <div
                className="p-12 flex flex-col items-center justify-center border-dashed border-2 border-slate-700 m-6 rounded-xl hover:border-omni-cyan hover:bg-omni-cyan/5 transition-all cursor-pointer"
                onClick={() => setImportStep('preview')}
              >
                <Icons.CloudUpload className="w-16 h-16 text-slate-600 mb-4" />
                <h4 className="text-lg font-bold text-white mb-2">Arraste o arquivo XML aqui</h4>
                <p className="text-sm text-slate-500 text-center max-w-xs">
                  Ou clique para selecionar o arquivo da Nota Fiscal Eletrônica (NFe).
                </p>
              </div>
            ) : (
              <div className="p-6">
                <div className="bg-slate-800/50 rounded-lg p-4 mb-4 border border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">
                      NFe Detectada
                    </span>
                    <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded border border-green-500/30">
                      Válida
                    </span>
                  </div>
                  <h4 className="text-white font-bold">Nota Fiscal Nº 45.090</h4>
                  <p className="text-sm text-slate-400">Emissor: SKF do Brasil Ltda.</p>
                  <p className="text-sm text-slate-400">Data: 27/11/2023</p>
                </div>

                <h5 className="text-sm font-bold text-white mb-2">Itens Identificados:</h5>
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between items-center bg-omni-dark p-3 rounded border border-omni-border">
                    <span className="text-sm text-slate-300">10x Correia V A-34</span>
                    <span className="text-sm font-mono text-omni-cyan">R$ 155,00</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setImportStep('upload')}
                    className="flex-1 px-4 py-2 border border-slate-600 rounded text-slate-300 hover:text-white"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded shadow-lg shadow-green-900/20"
                  >
                    Confirmar Entrada
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
