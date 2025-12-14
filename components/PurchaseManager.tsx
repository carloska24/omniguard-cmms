
import React, { useState, useMemo } from 'react';
import { Icons } from './Icons';
import { useMaintenance } from '../context/MaintenanceContext';
import { MaintenanceTicket } from '../types';
import { 
    AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, 
    BarChart, Bar, PieChart, Pie, Cell, YAxis, CartesianGrid, Legend 
} from 'recharts';

// Mock data for sparklines
const spendingData = [
    { v: 4000 }, { v: 3000 }, { v: 5500 }, { v: 4200 }, { v: 6000 }, { v: 5800 }, { v: 7200 }
];
const requestsData = [
    { v: 5 }, { v: 8 }, { v: 4 }, { v: 12 }, { v: 6 }, { v: 9 }, { v: 15 }
];

const COLORS = ['#06b6d4', '#8b5cf6', '#22c55e', '#f97316', '#ef4444'];

export const PurchaseManager: React.FC = () => {
    const { tickets, updateTicketStatus, addTicket } = useMaintenance();
    const [selectedRequest, setSelectedRequest] = useState<MaintenanceTicket | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'in-progress' | 'done'>('all');

    // Modals State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    // Form State for New Order
    const [newOrder, setNewOrder] = useState({
        title: '',
        supplier: '',
        urgency: 'medium',
        description: '',
        items: [{ id: 1, name: '', qty: 1, price: 0 }]
    });

    // Filtra apenas tickets do tipo 'purchase'
    const allPurchaseRequests = tickets.filter(t => t.type === 'purchase');
    
    const filteredRequests = allPurchaseRequests.filter(req => {
        if (filterStatus === 'all') return true;
        return req.status === filterStatus;
    });

    // KPIs Calculados
    const totalPending = allPurchaseRequests.filter(t => t.status === 'open').reduce((acc, t) => acc + (t.totalCost || 0), 0);
    const pendingCount = allPurchaseRequests.filter(t => t.status === 'open').length;
    const totalInTransit = allPurchaseRequests.filter(t => t.status === 'in-progress').reduce((acc, t) => acc + (t.totalCost || 0), 0);
    const transitCount = allPurchaseRequests.filter(t => t.status === 'in-progress').length;
    const monthlyTotal = allPurchaseRequests.reduce((acc, t) => acc + (t.totalCost || 0), 0);

    // --- FORM HANDLERS ---
    const handleAddItem = () => {
        setNewOrder(prev => ({
            ...prev,
            items: [...prev.items, { id: Date.now(), name: '', qty: 1, price: 0 }]
        }));
    };

    const handleRemoveItem = (id: number) => {
        setNewOrder(prev => ({
            ...prev,
            items: prev.items.filter(i => i.id !== id)
        }));
    };

    const updateItem = (id: number, field: string, value: any) => {
        setNewOrder(prev => ({
            ...prev,
            items: prev.items.map(i => i.id === id ? { ...i, [field]: value } : i)
        }));
    };

    const calculateOrderTotal = () => {
        return newOrder.items.reduce((acc, item) => acc + (item.qty * item.price), 0);
    };

    const handleCreateOrder = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newOrder.title || newOrder.items.length === 0) return;

        // Construct description from items
        const itemsDesc = newOrder.items.map(i => `- [ ] ${i.name}: Pedir ${i.qty} un. (Est. R$ ${(i.qty * i.price).toFixed(2)})`).join('\n');
        
        const ticket: MaintenanceTicket = {
            id: `PO-${Math.floor(Math.random() * 10000)}`,
            title: newOrder.title,
            requester: 'Gestão de Compras',
            assetId: 'ALMOX-GERAL', // Generic asset for POs
            type: 'purchase',
            description: `FORNECEDOR: ${newOrder.supplier || 'Não especificado'}\n\nITENS REQUISITADOS:\n${itemsDesc}\n\nJUSTIFICATIVA/OBS:\n${newOrder.description}`,
            urgency: newOrder.urgency as any,
            status: 'open',
            createdAt: new Date().toISOString(),
            occurrenceDate: new Date().toISOString(),
            totalCost: calculateOrderTotal(),
            activities: [{
                id: Date.now().toString(),
                userId: 'user-current',
                userName: 'Comprador (Você)',
                action: 'Requisição de Compra criada',
                timestamp: new Date().toISOString(),
                type: 'status_change'
            }]
        };

        addTicket(ticket);
        setIsCreateModalOpen(false);
        // Reset Form
        setNewOrder({ title: '', supplier: '', urgency: 'medium', description: '', items: [{ id: 1, name: '', qty: 1, price: 0 }] });
    };

    // --- ACTIONS ---
    const handleApprove = (request: MaintenanceTicket) => {
        if (!confirm(`Confirmar aprovação da requisição ${request.id}? Um pedido será enviado ao fornecedor.`)) return;
        updateTicketStatus(request.id, 'in-progress');
        setSelectedRequest(null);
    };

    const handleReceive = (request: MaintenanceTicket) => {
        if (!confirm(`Confirmar recebimento dos itens? O estoque será atualizado.`)) return;
        updateTicketStatus(request.id, 'done');
        setSelectedRequest(null);
    };

    const handleReject = (request: MaintenanceTicket) => {
        if (!confirm("Rejeitar esta requisição?")) return;
        updateTicketStatus(request.id, 'cancelled');
        setSelectedRequest(null);
    };

    const getStatusStep = (status: string) => {
        switch(status) {
            case 'open': return 1;
            case 'in-progress': return 2;
            case 'done': return 3;
            default: return 0;
        }
    }

    // --- MOCK REPORT DATA ---
    const chartData = [
        { name: 'Sem 1', value: 12000 },
        { name: 'Sem 2', value: 19000 },
        { name: 'Sem 3', value: 8000 },
        { name: 'Sem 4', value: 22000 },
    ];
    
    const categoryData = [
        { name: 'Peças Mecânicas', value: 35000 },
        { name: 'Elétrica/Eletrônica', value: 15000 },
        { name: 'Insumos Gerais', value: 8000 },
        { name: 'Serviços Terceiros', value: 12000 },
    ];

    return (
        <div className="flex-1 p-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col bg-[#0B0E14] relative">
            
            {/* Background Grid Accent */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.02]" 
                 style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            </div>

            {/* Header */}
            <div className="flex justify-between items-center mb-8 relative z-10">
                <div>
                    <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg shadow-lg shadow-orange-500/20">
                            <Icons.ShoppingCart className="w-6 h-6 text-white" />
                        </div>
                        Gestão de Compras & Supply Chain
                    </h2>
                    <p className="text-sm text-slate-400 mt-1 ml-1">Central de Aprovação de Pedidos e Rastreamento de Insumos</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsReportModalOpen(true)}
                        className="bg-omni-panel border border-omni-border hover:border-slate-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all shadow-sm hover:bg-slate-800"
                    >
                        <Icons.FileSpreadsheet className="w-4 h-4 text-green-500" /> Relatórios
                    </button>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-white text-omni-dark font-bold px-6 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-slate-200 transition-colors shadow-lg shadow-white/10"
                    >
                        <Icons.Plus className="w-4 h-4" /> Nova Ordem (PO)
                    </button>
                </div>
            </div>

            {/* KPIs Section - HIGH FIDELITY */}
            <div className="grid grid-cols-12 gap-6 mb-8 relative z-10">
                
                {/* KPI 1: Pending Approval */}
                <div className="col-span-4 bg-omni-panel border border-omni-border rounded-xl p-0 overflow-hidden relative group hover:border-orange-500/30 transition-all shadow-lg">
                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                    <div className="p-5 flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Aguardando Aprovação</p>
                            <h3 className="text-3xl font-mono font-bold text-white tracking-tight">R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                            <p className="text-xs text-orange-400 mt-2 font-bold flex items-center gap-1">
                                <span className="bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">{pendingCount}</span> Requisições Pendentes
                            </p>
                        </div>
                        <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500 border border-orange-500/20">
                            <Icons.ListChecks className="w-6 h-6" />
                        </div>
                    </div>
                    {/* Decorative Sparkline */}
                    <div className="h-12 w-full mt-2 opacity-50 group-hover:opacity-80 transition-opacity">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={requestsData}>
                                <Area type="monotone" dataKey="v" stroke="#f97316" fill="#f97316" fillOpacity={0.2} strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* KPI 2: In Transit */}
                <div className="col-span-4 bg-omni-panel border border-omni-border rounded-xl p-0 overflow-hidden relative group hover:border-blue-500/30 transition-all shadow-lg">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    <div className="p-5 flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Pedidos em Trânsito</p>
                            <h3 className="text-3xl font-mono font-bold text-white tracking-tight">R$ {totalInTransit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                            <p className="text-xs text-blue-400 mt-2 font-bold flex items-center gap-1">
                                <span className="bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">{transitCount}</span> Pedidos Confirmados
                            </p>
                        </div>
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 border border-blue-500/20">
                            <Icons.Truck className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="h-12 w-full mt-2 opacity-30 group-hover:opacity-60 transition-opacity">
                         <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')]"></div>
                    </div>
                </div>

                {/* KPI 3: Total Budget */}
                <div className="col-span-4 bg-omni-panel border border-omni-border rounded-xl p-0 overflow-hidden relative group hover:border-green-500/30 transition-all shadow-lg">
                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                    <div className="p-5 flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Volume Total (Mês)</p>
                            <h3 className="text-3xl font-mono font-bold text-white tracking-tight">R$ {monthlyTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                            <p className="text-xs text-green-500 mt-2 font-bold flex items-center gap-1">
                                <Icons.TrendingUp className="w-3 h-3" /> +12% vs. Mês Anterior
                            </p>
                        </div>
                        <div className="p-2 bg-green-500/10 rounded-lg text-green-500 border border-green-500/20">
                            <Icons.BarChart className="w-6 h-6" />
                        </div>
                    </div>
                    {/* Decorative Sparkline */}
                    <div className="h-12 w-full mt-2 opacity-50 group-hover:opacity-80 transition-opacity">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={spendingData}>
                                <Area type="monotone" dataKey="v" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-omni-panel border border-omni-border rounded-xl shadow-2xl overflow-hidden relative z-10">
                
                {/* Toolbar */}
                <div className="px-6 py-4 border-b border-omni-border bg-omni-dark/50 flex justify-between items-center backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <h3 className="font-bold text-white text-sm flex items-center gap-2">
                            <Icons.FileText className="w-4 h-4 text-slate-400" /> Ordens e Requisições
                        </h3>
                        <div className="h-4 w-px bg-slate-700"></div>
                        <div className="flex bg-black/30 rounded p-1">
                            {['all', 'open', 'in-progress', 'done'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status as any)}
                                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                                        filterStatus === status 
                                        ? 'bg-slate-700 text-white shadow' 
                                        : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    {status === 'all' ? 'Todos' : status === 'open' ? 'Pendentes' : status === 'in-progress' ? 'Em Trânsito' : 'Recebidos'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="relative">
                        <Icons.Search className="w-4 h-4 text-slate-500 absolute left-3 top-2" />
                        <input 
                            type="text" 
                            placeholder="Buscar PO, Item ou Fornecedor..." 
                            className="bg-black/30 border border-omni-border rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:border-omni-cyan outline-none w-64 transition-all"
                        />
                    </div>
                </div>
                
                {/* Data Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/20">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-omni-dark text-[10px] uppercase font-bold text-slate-500 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 border-b border-omni-border w-24">ID Req.</th>
                                <th className="px-6 py-4 border-b border-omni-border">Descrição / Itens</th>
                                <th className="px-6 py-4 border-b border-omni-border">Solicitante & Data</th>
                                <th className="px-6 py-4 border-b border-omni-border w-48">Status do Fluxo</th>
                                <th className="px-6 py-4 border-b border-omni-border text-right">Valor Estimado</th>
                                <th className="px-6 py-4 border-b border-omni-border text-right w-24">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-omni-border">
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-30">
                                            <Icons.Inbox className="w-12 h-12 text-slate-400" />
                                            <span className="text-sm font-bold text-slate-400">Nenhuma requisição encontrada neste filtro.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map(req => {
                                    const step = getStatusStep(req.status);
                                    return (
                                    <tr key={req.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4 align-top">
                                            <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-1 rounded border border-slate-700 block w-fit">
                                                {req.id}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="font-bold text-white text-sm mb-1">{req.title}</div>
                                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed max-w-md">{req.description}</p>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[9px] text-white font-bold">ES</div>
                                                <span className="text-xs text-slate-300 font-medium">{req.requester}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                                <Icons.Calendar className="w-3 h-3" /> {new Date(req.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-middle">
                                            {/* Visual Progress Bar */}
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between text-[9px] font-bold uppercase text-slate-500">
                                                    <span className={step >= 1 ? 'text-white' : ''}>Aprov.</span>
                                                    <span className={step >= 2 ? 'text-blue-400' : ''}>Trânsito</span>
                                                    <span className={step >= 3 ? 'text-green-500' : ''}>Rec.</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                                                    <div className={`h-full ${step >= 1 ? 'bg-white' : 'bg-transparent'} w-1/3 border-r border-slate-900`}></div>
                                                    <div className={`h-full ${step >= 2 ? 'bg-blue-500' : 'bg-transparent'} w-1/3 border-r border-slate-900`}></div>
                                                    <div className={`h-full ${step >= 3 ? 'bg-green-500' : 'bg-transparent'} w-1/3`}></div>
                                                </div>
                                                <span className={`text-[10px] font-bold uppercase text-center py-0.5 rounded border ${
                                                    req.status === 'open' ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' :
                                                    req.status === 'in-progress' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' :
                                                    req.status === 'done' ? 'bg-green-500/10 text-green-500 border-green-500/30' :
                                                    'bg-red-500/10 text-red-500 border-red-500/30'
                                                }`}>
                                                    {req.status === 'open' ? 'Aprovação Pendente' : 
                                                     req.status === 'in-progress' ? 'Em Trânsito / Pedido' :
                                                     req.status === 'done' ? 'Entregue / Recebido' : 'Cancelado'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right align-middle">
                                            <div className="font-mono text-white font-bold text-sm">
                                                R$ {(req.totalCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right align-middle">
                                            <button 
                                                onClick={() => setSelectedRequest(req)}
                                                className="bg-white/5 hover:bg-omni-cyan hover:text-omni-dark text-slate-400 p-2 rounded-lg transition-all shadow-sm border border-white/5"
                                                title="Ver Detalhes da PO"
                                            >
                                                <Icons.FileText className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODAL 1: CREATE NEW ORDER (High-Fidelity) --- */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-omni-panel border border-omni-border rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        
                        {/* Modal Header */}
                        <div className="px-6 py-5 border-b border-omni-border bg-omni-dark flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <span className="p-2 bg-white text-omni-dark rounded-lg"><Icons.Plus className="w-5 h-5"/></span>
                                    Nova Ordem de Compra
                                </h3>
                                <p className="text-xs text-slate-400 ml-1 mt-1">Preencha os detalhes para gerar uma requisição formal.</p>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full hover:bg-slate-700 transition-colors">
                                <Icons.Close className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <form onSubmit={handleCreateOrder} className="space-y-8">
                                {/* General Info */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Título da Requisição</label>
                                        <input 
                                            required
                                            className="w-full bg-omni-dark border border-omni-border rounded-lg px-4 py-3 text-white focus:border-omni-cyan outline-none text-lg font-bold placeholder-slate-600"
                                            placeholder="Ex: Aquisição de Rolamentos para Parada Anual"
                                            value={newOrder.title}
                                            onChange={(e) => setNewOrder({...newOrder, title: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Fornecedor Sugerido</label>
                                        <div className="relative">
                                            <Icons.Truck className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                                            <input 
                                                className="w-full bg-omni-dark border border-omni-border rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-omni-cyan outline-none"
                                                placeholder="Ex: SKF do Brasil"
                                                value={newOrder.supplier}
                                                onChange={(e) => setNewOrder({...newOrder, supplier: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Urgência</label>
                                        <div className="flex bg-omni-dark rounded-lg p-1 border border-omni-border">
                                            {['low', 'medium', 'high', 'critical'].map(level => (
                                                <button
                                                    key={level}
                                                    type="button"
                                                    onClick={() => setNewOrder({...newOrder, urgency: level as any})}
                                                    className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${
                                                        newOrder.urgency === level 
                                                        ? (level === 'critical' ? 'bg-red-600 text-white' : 'bg-omni-cyan text-omni-dark') 
                                                        : 'text-slate-500 hover:text-white'
                                                    }`}
                                                >
                                                    {level}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Items Grid */}
                                <div className="bg-slate-900/50 border border-omni-border rounded-xl overflow-hidden">
                                    <div className="px-4 py-2 bg-omni-dark border-b border-omni-border flex justify-between items-center">
                                        <span className="text-xs font-bold text-white uppercase tracking-wider">Itens do Pedido</span>
                                        <button type="button" onClick={handleAddItem} className="text-[10px] text-omni-cyan hover:underline flex items-center gap-1 font-bold">
                                            <Icons.Plus className="w-3 h-3" /> Adicionar Linha
                                        </button>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {newOrder.items.map((item, index) => (
                                            <div key={item.id} className="flex gap-3 items-end animate-in slide-in-from-left-2 duration-300">
                                                <div className="flex-1">
                                                    <label className="text-[9px] text-slate-500 uppercase font-bold mb-1 block">Produto / Serviço</label>
                                                    <input 
                                                        required
                                                        className="w-full bg-omni-dark border border-omni-border rounded px-3 py-2 text-sm text-white focus:border-omni-cyan outline-none"
                                                        placeholder="Nome do item..."
                                                        value={item.name}
                                                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                                    />
                                                </div>
                                                <div className="w-24">
                                                    <label className="text-[9px] text-slate-500 uppercase font-bold mb-1 block">Qtd.</label>
                                                    <input 
                                                        type="number" min="1"
                                                        className="w-full bg-omni-dark border border-omni-border rounded px-3 py-2 text-sm text-white focus:border-omni-cyan outline-none text-center"
                                                        value={item.qty}
                                                        onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value))}
                                                    />
                                                </div>
                                                <div className="w-32">
                                                    <label className="text-[9px] text-slate-500 uppercase font-bold mb-1 block">Preço Est. (Unit)</label>
                                                    <input 
                                                        type="number" min="0" step="0.01"
                                                        className="w-full bg-omni-dark border border-omni-border rounded px-3 py-2 text-sm text-white focus:border-omni-cyan outline-none text-right"
                                                        value={item.price}
                                                        onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value))}
                                                    />
                                                </div>
                                                <div className="w-32 pb-2 text-right">
                                                    <span className="text-sm font-mono font-bold text-white">R$ {(item.qty * item.price).toFixed(2)}</span>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveItem(item.id)}
                                                    className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors mb-0.5"
                                                    disabled={newOrder.items.length === 1}
                                                >
                                                    <Icons.Trash className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="px-6 py-3 bg-black/20 border-t border-omni-border flex justify-end items-center gap-4">
                                        <span className="text-xs text-slate-400 uppercase font-bold">Total Estimado</span>
                                        <span className="text-xl font-mono font-bold text-omni-cyan">R$ {calculateOrderTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                {/* Justification */}
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Justificativa / Observações</label>
                                    <textarea 
                                        className="w-full bg-omni-dark border border-omni-border rounded-lg px-4 py-3 text-white focus:border-omni-cyan outline-none text-sm resize-none"
                                        rows={3}
                                        placeholder="Descreva o motivo da compra ou detalhes adicionais..."
                                        value={newOrder.description}
                                        onChange={(e) => setNewOrder({...newOrder, description: e.target.value})}
                                    />
                                </div>
                            </form>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-omni-border bg-omni-dark flex justify-end gap-3 shrink-0">
                            <button onClick={() => setIsCreateModalOpen(false)} className="px-6 py-3 text-slate-400 hover:text-white font-bold transition-colors text-sm">
                                Cancelar
                            </button>
                            <button onClick={handleCreateOrder} className="bg-omni-cyan hover:bg-cyan-400 text-omni-dark font-bold py-3 px-8 rounded-lg shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 text-sm">
                                <Icons.Check className="w-4 h-4" /> Gerar Requisição
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL 2: REPORTS (High-Fidelity) --- */}
            {isReportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
                    <div className="bg-omni-panel border border-omni-border rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
                        {/* Background Deco */}
                        <div className="absolute inset-0 bg-gradient-to-br from-omni-dark to-slate-900 z-0"></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-omni-cyan/5 rounded-full blur-3xl z-0"></div>

                        {/* Header */}
                        <div className="px-8 py-6 border-b border-omni-border flex justify-between items-center relative z-10">
                            <div>
                                <h3 className="text-2xl font-bold text-white">Relatório Financeiro de Compras</h3>
                                <p className="text-sm text-slate-400">Análise de gastos, categorias e performance de fornecedores.</p>
                            </div>
                            <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-white bg-white/5 p-2 rounded-full hover:bg-white/10 transition-colors"><Icons.Close className="w-6 h-6" /></button>
                        </div>

                        {/* Dashboard Grid */}
                        <div className="flex-1 overflow-y-auto p-8 relative z-10 custom-scrollbar">
                            
                            {/* Top Cards */}
                            <div className="grid grid-cols-3 gap-6 mb-8">
                                <div className="bg-white/5 border border-white/10 p-6 rounded-xl relative overflow-hidden">
                                    <div className="absolute right-0 top-0 p-4 opacity-10"><Icons.BarChart className="w-16 h-16 text-white" /></div>
                                    <p className="text-xs text-slate-400 uppercase font-bold mb-2">Gasto Total (YTD)</p>
                                    <h4 className="text-3xl font-mono font-bold text-white">R$ 452.890,00</h4>
                                    <span className="text-xs text-green-400 flex items-center gap-1 mt-2"><Icons.TrendingUp className="w-3 h-3" /> +12% vs Ano Anterior</span>
                                </div>
                                <div className="bg-white/5 border border-white/10 p-6 rounded-xl relative overflow-hidden">
                                    <div className="absolute right-0 top-0 p-4 opacity-10"><Icons.Clock className="w-16 h-16 text-white" /></div>
                                    <p className="text-xs text-slate-400 uppercase font-bold mb-2">Lead Time Médio</p>
                                    <h4 className="text-3xl font-mono font-bold text-white">4.2 Dias</h4>
                                    <span className="text-xs text-blue-400 flex items-center gap-1 mt-2"><Icons.TrendingDown className="w-3 h-3" /> -0.5 dias (Melhoria)</span>
                                </div>
                                <div className="bg-white/5 border border-white/10 p-6 rounded-xl relative overflow-hidden">
                                    <div className="absolute right-0 top-0 p-4 opacity-10"><Icons.CheckSquare className="w-16 h-16 text-white" /></div>
                                    <p className="text-xs text-slate-400 uppercase font-bold mb-2">Pedidos Concluídos</p>
                                    <h4 className="text-3xl font-mono font-bold text-white">128</h4>
                                    <span className="text-xs text-slate-500 mt-2">Taxa de Aprovação: 94%</span>
                                </div>
                            </div>

                            {/* Charts Row */}
                            <div className="grid grid-cols-2 gap-6 h-80 mb-8">
                                <div className="bg-omni-dark/50 border border-omni-border rounded-xl p-6 flex flex-col">
                                    <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Icons.PieChart className="w-4 h-4 text-omni-cyan" /> Gastos por Categoria</h4>
                                    <div className="flex-1 min-h-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={categoryData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {categoryData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px' }} 
                                                    itemStyle={{ color: '#fff' }}
                                                />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-omni-dark/50 border border-omni-border rounded-xl p-6 flex flex-col">
                                    <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Icons.TrendingUp className="w-4 h-4 text-green-500" /> Tendência de Gastos (Últimas 4 Semanas)</h4>
                                    <div className="flex-1 min-h-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                                <Tooltip 
                                                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px' }}
                                                />
                                                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Top Suppliers List */}
                            <div className="bg-omni-dark/50 border border-omni-border rounded-xl overflow-hidden">
                                <div className="px-6 py-4 border-b border-omni-border bg-white/5">
                                    <h4 className="text-sm font-bold text-white">Top Fornecedores (Volume)</h4>
                                </div>
                                <table className="w-full text-left text-sm">
                                    <thead className="text-xs text-slate-500 uppercase bg-black/20">
                                        <tr>
                                            <th className="px-6 py-3">Fornecedor</th>
                                            <th className="px-6 py-3">Categoria</th>
                                            <th className="px-6 py-3 text-center">Pedidos</th>
                                            <th className="px-6 py-3 text-right">Volume Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-omni-border">
                                        <tr className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-bold text-white">SKF do Brasil</td>
                                            <td className="px-6 py-4 text-slate-400">Mecânica</td>
                                            <td className="px-6 py-4 text-center">24</td>
                                            <td className="px-6 py-4 text-right font-mono text-omni-cyan">R$ 125.400,00</td>
                                        </tr>
                                        <tr className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-bold text-white">Siemens Energy</td>
                                            <td className="px-6 py-4 text-slate-400">Elétrica</td>
                                            <td className="px-6 py-4 text-center">8</td>
                                            <td className="px-6 py-4 text-right font-mono text-omni-cyan">R$ 98.200,00</td>
                                        </tr>
                                        <tr className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-bold text-white">Wurth Industrial</td>
                                            <td className="px-6 py-4 text-slate-400">Insumos</td>
                                            <td className="px-6 py-4 text-center">42</td>
                                            <td className="px-6 py-4 text-right font-mono text-omni-cyan">R$ 45.150,00</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* DETAIL MODAL - THE "PURCHASE ORDER" DIGITAL TWIN (Existing, Preserved) */}
            {selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
                    <div className="bg-[#1e1e1e] border border-slate-700 rounded-xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
                        
                        {/* Modal Header Actions */}
                        <div className="absolute top-4 right-4 flex gap-2 z-20 print:hidden">
                            <button className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 hover:border-slate-500 transition-colors" title="Imprimir PO">
                                <Icons.Printer className="w-4 h-4" />
                            </button>
                            <button onClick={() => setSelectedRequest(null)} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors">
                                <Icons.Close className="w-4 h-4" />
                            </button>
                        </div>

                        {/* DOCUMENT BODY (Scrollable) */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white text-slate-800 font-sans p-10 relative">
                            
                            {/* Watermark for Status */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-10 -rotate-45 border-4 border-black text-9xl font-black uppercase tracking-widest p-4">
                                {selectedRequest.status === 'open' ? 'PENDENTE' : selectedRequest.status === 'in-progress' ? 'ENCOMENDADO' : 'RECEBIDO'}
                            </div>

                            {/* Document Header */}
                            <div className="flex justify-between items-start mb-8 border-b-2 border-slate-800 pb-6">
                                <div>
                                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Ordem de Compra</h1>
                                    <p className="text-sm font-bold text-slate-500 mt-1">PO #{selectedRequest.id}</p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-2 justify-end mb-1">
                                        <Icons.Activity className="w-5 h-5 text-slate-900" />
                                        <span className="font-bold text-lg tracking-widest">OMNIGUARD</span>
                                    </div>
                                    <p className="text-xs text-slate-500">Industrial Solutions Ltd.</p>
                                    <p className="text-xs text-slate-500">São Paulo, SP - Brasil</p>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-12 mb-8">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Fornecedor (Vendor)</h4>
                                    <div className="p-4 bg-slate-100 rounded border border-slate-200">
                                        {/* Simple parser to try and extract vendor from description if available */}
                                        <p className="font-bold text-slate-900">
                                            {selectedRequest.description.includes('FORNECEDOR:') 
                                                ? selectedRequest.description.split('\n')[0].replace('FORNECEDOR:', '').trim() 
                                                : 'Fornecedor Padrão'}
                                        </p>
                                        <p className="text-sm text-slate-600">Cadastro Verificado</p>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Detalhes do Pedido</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between border-b border-slate-200 pb-1">
                                            <span className="text-sm text-slate-600">Data Requisição:</span>
                                            <span className="text-sm font-bold">{new Date(selectedRequest.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-200 pb-1">
                                            <span className="text-sm text-slate-600">Solicitante:</span>
                                            <span className="text-sm font-bold">{selectedRequest.requester}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-200 pb-1">
                                            <span className="text-sm text-slate-600">Centro de Custo:</span>
                                            <span className="text-sm font-bold">MAN-01 (Manutenção)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="mb-8">
                                <table className="w-full text-left text-sm border border-slate-300">
                                    <thead className="bg-slate-100 text-slate-900 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="p-3 border-r border-slate-300">Item / Descrição</th>
                                            <th className="p-3 text-center border-r border-slate-300 w-24">Qtd.</th>
                                            <th className="p-3 text-right border-r border-slate-300 w-32">Preço Unit.</th>
                                            <th className="p-3 text-right w-32">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {/* Parse description lines as items for demo */}
                                        {selectedRequest.description.split('\n').filter(l => l.includes('- [ ]')).map((line, idx) => {
                                            const name = line.replace('- [ ]', '').split(':')[0];
                                            // Regex to extract qty and price from formatted string: "Item: Pedir 2 un. (Est. R$ 50.00)"
                                            const qtyMatch = line.match(/Pedir (\d+)/);
                                            const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
                                            // Estimation of unit price based on total / approx if not parseable
                                            // Try to find total in parens (Est. R$ X)
                                            const priceMatch = line.match(/R\$ ([\d.]+)/);
                                            const totalLine = priceMatch ? parseFloat(priceMatch[1]) : 0;
                                            const unitPrice = totalLine / qty;
                                            
                                            return (
                                                <tr key={idx}>
                                                    <td className="p-3 border-r border-slate-200 font-medium text-slate-700">{name}</td>
                                                    <td className="p-3 text-center border-r border-slate-200 font-mono">{qty}</td>
                                                    <td className="p-3 text-right border-r border-slate-200 font-mono">R$ {unitPrice.toFixed(2)}</td>
                                                    <td className="p-3 text-right font-mono font-bold">R$ {totalLine.toFixed(2)}</td>
                                                </tr>
                                            );
                                        })}
                                        {/* Fallback if no parsed items */}
                                        {!selectedRequest.description.includes('- [ ]') && (
                                            <tr>
                                                <td className="p-3 border-r border-slate-200 font-medium text-slate-700">{selectedRequest.title}</td>
                                                <td className="p-3 text-center border-r border-slate-200 font-mono">1</td>
                                                <td className="p-3 text-right border-r border-slate-200 font-mono">R$ {(selectedRequest.totalCost || 0).toFixed(2)}</td>
                                                <td className="p-3 text-right font-mono font-bold">R$ {(selectedRequest.totalCost || 0).toFixed(2)}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot className="bg-slate-50 font-bold">
                                        <tr>
                                            <td colSpan={3} className="p-3 text-right border-t border-slate-300 uppercase text-xs text-slate-500">Subtotal</td>
                                            <td className="p-3 text-right border-t border-slate-300 font-mono">R$ {(selectedRequest.totalCost || 0).toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td colSpan={3} className="p-3 text-right uppercase text-xs text-slate-500">Impostos (18%)</td>
                                            <td className="p-3 text-right font-mono text-slate-500">R$ {((selectedRequest.totalCost || 0) * 0.18).toFixed(2)}</td>
                                        </tr>
                                        <tr className="bg-slate-200 text-slate-900 text-base">
                                            <td colSpan={3} className="p-3 text-right uppercase border-t border-slate-400">Total Final</td>
                                            <td className="p-3 text-right border-t border-slate-400 font-mono font-black">R$ {((selectedRequest.totalCost || 0) * 1.18).toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Terms */}
                            <div className="text-xs text-slate-500 mt-8 border-t border-slate-200 pt-4">
                                <p><strong>Termos e Condições:</strong> O pagamento será efetuado em 30 dias após o recebimento da nota fiscal. Entregas parciais devem ser autorizadas.</p>
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="p-4 border-t border-slate-700 bg-[#151923] flex justify-between items-center shrink-0">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 uppercase font-bold">Fluxo de Aprovação</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span className="text-xs text-white">Solicitado</span>
                                    <div className="w-8 h-px bg-slate-600"></div>
                                    <div className={`w-2 h-2 rounded-full ${selectedRequest.status !== 'open' ? 'bg-green-500' : 'bg-slate-600'}`}></div>
                                    <span className={`text-xs ${selectedRequest.status !== 'open' ? 'text-white' : 'text-slate-500'}`}>Aprovado</span>
                                    <div className="w-8 h-px bg-slate-600"></div>
                                    <div className={`w-2 h-2 rounded-full ${selectedRequest.status === 'done' ? 'bg-green-500' : 'bg-slate-600'}`}></div>
                                    <span className={`text-xs ${selectedRequest.status === 'done' ? 'text-white' : 'text-slate-500'}`}>Recebido</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                {selectedRequest.status === 'open' && (
                                    <>
                                        <button 
                                            onClick={() => handleReject(selectedRequest)}
                                            className="px-6 py-3 bg-red-900/20 text-red-500 hover:bg-red-900/40 border border-red-900/50 rounded-lg font-bold transition-colors uppercase text-xs tracking-wider"
                                        >
                                            Rejeitar
                                        </button>
                                        <button 
                                            onClick={() => handleApprove(selectedRequest)}
                                            className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-lg shadow-green-900/20 transition-all uppercase text-xs tracking-wider flex items-center gap-2"
                                        >
                                            <Icons.Check className="w-4 h-4" /> Aprovar Pedido
                                        </button>
                                    </>
                                )}
                                {selectedRequest.status === 'in-progress' && (
                                    <button 
                                        onClick={() => handleReceive(selectedRequest)}
                                        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/20 transition-all uppercase text-xs tracking-wider flex items-center gap-2"
                                    >
                                        <Icons.Archive className="w-4 h-4" /> Confirmar Recebimento (Estoque)
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
