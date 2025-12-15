import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Asset,
  MaintenanceTicket,
  PreventivePlan,
  SparePart,
  Technician,
  SystemSettings,
  TicketPartUsage,
  TicketActivity,
  CurrentUser,
} from '../types';

// --- DATA FACTORY: GERAÇÃO DE DADOS REALISTAS ---

// 1. ATIVOS (Frota completa)
const initialAssets: Asset[] = [
  {
    id: 'TG-01',
    name: 'Turbina a Gás SGT-400',
    code: 'TG-01-A',
    model: 'SGT-400',
    manufacturer: 'Siemens',
    serialNumber: 'SN-TG01-X99',
    location: 'Geração de Energia',
    status: 'maintenance',
    criticality: 'high',
    image:
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=200',
    mtbf: 1200,
    mttr: 48,
    cost: 2500000,
  },
  {
    id: 'R-04',
    name: 'Braço Robótico KR-1000',
    code: 'R-04-B',
    model: 'KR-1000',
    manufacturer: 'Kuka',
    serialNumber: 'SN-R04-K88',
    location: 'Linha de Montagem',
    status: 'operational',
    criticality: 'medium',
    image:
      'https://images.unsplash.com/photo-1565514020176-db764491752b?auto=format&fit=crop&q=80&w=200',
    mtbf: 850,
    mttr: 12,
    cost: 450000,
  },
  {
    id: 'C-22',
    name: 'Compressor Parafuso',
    code: 'CMP-22',
    model: 'ZR-500',
    manufacturer: 'Atlas Copco',
    serialNumber: 'SN-C22-AC77',
    location: 'Utilidades',
    status: 'operational',
    criticality: 'low',
    image:
      'https://images.unsplash.com/photo-1563290740-1011501d6837?auto=format&fit=crop&q=80&w=200',
    mtbf: 2400,
    mttr: 6,
    cost: 120000,
  },
  {
    id: 'CNV-01',
    name: 'Esteira Transportadora Principal',
    code: 'CNV-MAIN',
    model: 'Belt-HD',
    manufacturer: 'Metso',
    serialNumber: 'SN-CNV-001',
    location: 'Logística',
    status: 'stopped',
    criticality: 'high',
    image:
      'https://images.unsplash.com/photo-1535295972055-1c762f4483e5?auto=format&fit=crop&q=80&w=200',
    mtbf: 500,
    mttr: 8,
    cost: 80000,
  },
  {
    id: 'PMP-09',
    name: 'Bomba Centrífuga',
    code: 'PMP-09-X',
    model: 'KSB-Meganorm',
    manufacturer: 'KSB',
    serialNumber: 'SN-PMP-88',
    location: 'Tratamento de Água',
    status: 'operational',
    criticality: 'medium',
    image:
      'https://images.unsplash.com/photo-1574689049597-7e6df3e2b01b?auto=format&fit=crop&q=80&w=200',
    mtbf: 1500,
    mttr: 5,
    cost: 45000,
  },
  {
    id: 'GEN-02',
    name: 'Gerador Diesel Backup',
    code: 'GEN-BK-02',
    model: 'C15',
    manufacturer: 'Caterpillar',
    serialNumber: 'CAT-C15-002',
    location: 'Geração de Energia',
    status: 'operational',
    criticality: 'high',
    image:
      'https://images.unsplash.com/photo-1487887235947-a955ef187fcc?auto=format&fit=crop&q=80&w=200',
    mtbf: 5000,
    mttr: 24,
    cost: 320000,
  },
];

// 2. HISTÓRICO DE TICKETS (12 Meses de dados para popular gráficos)
// Função auxiliar para gerar datas passadas
const getDate = (monthsAgo: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toISOString();
};

const initialTickets: MaintenanceTicket[] = [
  // Mês Atual (Abertos/Em Progresso)
  {
    id: 'TCK-2024-001',
    title: 'Vibração Excessiva Eixo Principal',
    requester: 'Sistema IoT',
    assetId: 'TG-01',
    type: 'mechanical',
    description: 'Sensor VIB-01 detectou 8.2mm/s (Crítico). Necessária análise de espectro.',
    urgency: 'critical',
    status: 'in-progress',
    assignee: 'Carlos Silva',
    createdAt: getDate(0),
    occurrenceDate: getDate(0),
    totalCost: 0,
    checklist: [
      { id: '1', text: 'Bloqueio LOTO', checked: true, category: 'safety' },
      { id: '2', text: 'Desmontar acoplamento', checked: false, category: 'execution' },
      { id: '3', text: 'Inspecionar rolamento', checked: false, category: 'execution' },
    ],
  },
  {
    id: 'TCK-2024-002',
    title: 'Falha de Comunicação PLC',
    requester: 'Op. Marcos',
    assetId: 'R-04',
    type: 'electrical',
    description: 'Robô parou por timeout de comunicação com supervisório.',
    urgency: 'high',
    status: 'assigned',
    assignee: 'Mariana Costa',
    createdAt: getDate(0),
    occurrenceDate: getDate(0),
    totalCost: 0,
  },
  {
    id: 'TCK-2024-003',
    title: 'Vazamento de Óleo Redutor',
    requester: 'Inspetor Pedro',
    assetId: 'CNV-01',
    type: 'mechanical',
    description: 'Pequeno vazamento no retentor do redutor principal.',
    urgency: 'medium',
    status: 'waiting-parts',
    assignee: 'Roberto Santos',
    createdAt: getDate(0),
    occurrenceDate: getDate(0),
    totalCost: 150,
  },

  // Histórico Passado (Concluídos - Alimentam BI)
  // Mês -1
  {
    id: 'TCK-2023-099',
    title: 'Troca de Filtros de Ar',
    requester: 'Preventiva',
    assetId: 'C-22',
    type: 'mechanical',
    description: 'Troca periódica conforme plano.',
    urgency: 'low',
    status: 'done',
    assignee: 'Carlos Silva',
    createdAt: getDate(1),
    occurrenceDate: getDate(1),
    totalCost: 450,
    closedAt: getDate(1),
  },
  {
    id: 'TCK-2023-098',
    title: 'Ajuste de Tensão Correia',
    requester: 'Op. João',
    assetId: 'CNV-01',
    type: 'mechanical',
    description: 'Correia patinando.',
    urgency: 'medium',
    status: 'done',
    assignee: 'Roberto Santos',
    createdAt: getDate(1),
    occurrenceDate: getDate(1),
    totalCost: 0,
    closedAt: getDate(1),
  },

  // Mês -2
  {
    id: 'TCK-2023-085',
    title: 'Curto Circuito Painel Auxiliar',
    requester: 'Sup. Elétrica',
    assetId: 'TG-01',
    type: 'electrical',
    description: 'Disjuntor desarmando.',
    urgency: 'high',
    status: 'done',
    assignee: 'Mariana Costa',
    createdAt: getDate(2),
    occurrenceDate: getDate(2),
    totalCost: 2500,
    closedAt: getDate(2),
  },
  {
    id: 'TCK-2023-084',
    title: "Reparo Bomba D'água",
    requester: 'Sistema',
    assetId: 'PMP-09',
    type: 'hydraulic',
    description: 'Baixa pressão na saída.',
    urgency: 'medium',
    status: 'done',
    assignee: 'Julia Mendes',
    createdAt: getDate(2),
    occurrenceDate: getDate(2),
    totalCost: 1200,
    closedAt: getDate(2),
  },

  // Mês -3 a -6 (Dados agregados para volume)
  {
    id: 'TCK-OLD-01',
    title: 'Preventiva Semestral',
    requester: 'Planejamento',
    assetId: 'GEN-02',
    type: 'mechanical',
    description: 'Troca de óleo e filtros.',
    urgency: 'medium',
    status: 'done',
    createdAt: getDate(4),
    occurrenceDate: getDate(4),
    totalCost: 5600,
    closedAt: getDate(4),
  },
  {
    id: 'TCK-OLD-02',
    title: 'Falha Inversor',
    requester: 'Op. Ana',
    assetId: 'CNV-01',
    type: 'electrical',
    description: 'Erro F045 no drive.',
    urgency: 'high',
    status: 'done',
    createdAt: getDate(5),
    occurrenceDate: getDate(5),
    totalCost: 3200,
    closedAt: getDate(5),
  },
  {
    id: 'TCK-OLD-03',
    title: 'Vazamento Gás',
    requester: 'Sensor',
    assetId: 'TG-01',
    type: 'other',
    description: 'Vazamento na flange.',
    urgency: 'critical',
    status: 'done',
    createdAt: getDate(6),
    occurrenceDate: getDate(6),
    totalCost: 15000,
    closedAt: getDate(6),
  },
  {
    id: 'TCK-OLD-04',
    title: 'Calibração Robô',
    requester: 'Qualidade',
    assetId: 'R-04',
    type: 'other',
    description: 'Desvio de precisão.',
    urgency: 'low',
    status: 'done',
    createdAt: getDate(3),
    occurrenceDate: getDate(3),
    totalCost: 0,
    closedAt: getDate(3),
  },
];

const initialPlans: PreventivePlan[] = [
  {
    id: 'PLN-01',
    name: 'Revisão Mensal Turbina',
    description: 'Verificação de óleos, filtros e vibração.',
    assetIds: ['TG-01'],
    frequencyType: 'time',
    frequencyValue: 1,
    frequencyUnit: 'months',
    tasks: [
      'Verificar nível de óleo',
      'Inspecionar filtros de entrada',
      'Medir vibração nos mancais',
      'Verificar vazamentos',
    ],
    status: 'active',
    lastExecution: getDate(1),
  },
  {
    id: 'PLN-02',
    name: 'Lubrificação Esteira',
    description: 'Engraxar rolamentos principais.',
    assetIds: ['CNV-01'],
    frequencyType: 'time',
    frequencyValue: 15,
    frequencyUnit: 'days',
    tasks: ['Limpar bicos graxeiros', 'Aplicar graxa MP-2', 'Verificar ruído'],
    status: 'active',
    lastExecution: getDate(0),
  },
  {
    id: 'PLN-03',
    name: 'Termografia Painéis',
    description: 'Inspeção preditiva elétrica.',
    assetIds: ['TG-01', 'R-04', 'C-22'],
    frequencyType: 'time',
    frequencyValue: 3,
    frequencyUnit: 'months',
    tasks: ['Escanear barramentos', 'Verificar conexões soltas', 'Gerar relatório'],
    status: 'active',
    lastExecution: getDate(2),
  },
];

const initialInventory: SparePart[] = [
  {
    id: 'SP-001',
    code: 'BRG-6205-ZZ',
    name: 'Rolamento Rígido de Esferas',
    quantity: 15,
    minLevel: 5,
    cost: 45.5,
    criticality: 'high',
    location: 'A-01-02',
    category: 'mechanical',
    image:
      'https://images.unsplash.com/photo-1552655986-a05c71be397d?auto=format&fit=crop&q=80&w=200',
  },
  {
    id: 'SP-002',
    code: 'SENS-IND-M18',
    name: 'Sensor Indutivo PNP',
    quantity: 2,
    minLevel: 5,
    cost: 120.0,
    criticality: 'medium',
    location: 'B-02-10',
    category: 'electrical',
    image:
      'https://plus.unsplash.com/premium_photo-1678224367332-9cb7b7496613?auto=format&fit=crop&q=80&w=200',
  },
  {
    id: 'SP-003',
    code: 'OIL-VG68',
    name: 'Óleo Hidráulico VG68 (Litro)',
    quantity: 200,
    minLevel: 50,
    cost: 22.9,
    criticality: 'low',
    location: 'T-05',
    category: 'consumable',
    image:
      'https://images.unsplash.com/photo-1627930062947-a37920785002?auto=format&fit=crop&q=80&w=200',
  },
  {
    id: 'SP-004',
    code: 'IGBT-MOD',
    name: 'Módulo IGBT 100A',
    quantity: 1,
    minLevel: 2,
    cost: 850.0,
    criticality: 'high',
    location: 'E-SECURE',
    category: 'electrical',
    image:
      'https://images.unsplash.com/photo-1580226487920-3023022e033d?auto=format&fit=crop&q=80&w=200',
  },
  {
    id: 'SP-005',
    code: 'FLT-SEP-AIR',
    name: 'Elemento Separador Ar/Óleo',
    quantity: 4,
    minLevel: 2,
    cost: 250.0,
    criticality: 'medium',
    location: 'A-03-01',
    category: 'mechanical',
    image:
      'https://images.unsplash.com/photo-1596767222306-3539257c793f?auto=format&fit=crop&q=80&w=200',
  },
  {
    id: 'SP-006',
    code: 'BELT-V-B52',
    name: 'Correia em V Perfil B',
    quantity: 12,
    minLevel: 6,
    cost: 35.0,
    criticality: 'low',
    location: 'C-RACK-01',
    category: 'mechanical',
    image:
      'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?auto=format&fit=crop&q=80&w=200',
  },
];

const initialTechnicians: Technician[] = [
  {
    id: '1',
    name: 'Carlos Silva',
    role: 'Mecânico Sênior',
    email: 'carlos.s@omni.ind',
    phone: '5511999990001',
    status: 'active',
    skills: ['Hidráulica', 'Solda', 'Alinhamento a Laser'],
    shift: 'morning',
    efficiency: 94,
    avatar: 'https://i.pravatar.cc/150?u=1',
  },
  {
    id: '2',
    name: 'Mariana Costa',
    role: 'Eletricista Pleno',
    email: 'mari.c@omni.ind',
    phone: '5511999990002',
    status: 'active',
    skills: ['NR10', 'PLC Siemens', 'Automação'],
    shift: 'morning',
    efficiency: 98,
    avatar: 'https://i.pravatar.cc/150?u=2',
  },
  {
    id: '3',
    name: 'Roberto Santos',
    role: 'Técnico de Utilidades',
    email: 'rob.s@omni.ind',
    phone: '5511999990003',
    status: 'on-leave',
    skills: ['Compressores', 'HVAC'],
    shift: 'night',
    efficiency: 88,
    avatar: 'https://i.pravatar.cc/150?u=3',
  },
  {
    id: '4',
    name: 'Julia Mendes',
    role: 'Engenheira de Confiabilidade',
    email: 'julia.m@omni.ind',
    phone: '5511999990004',
    status: 'active',
    skills: ['Vibração', 'Termografia', 'Gestão'],
    shift: 'morning',
    efficiency: 99,
    avatar: 'https://i.pravatar.cc/150?u=4',
  },
];

const initialCurrentUser: CurrentUser = {
  id: 'user-001',
  name: 'Eng. Silva',
  email: 'admin@omni.ind',
  phone: '5511987654321', // Admin Phone
  role: 'Gerente de Planta',
  avatar: 'https://i.pravatar.cc/150?u=admin',
  department: 'Manutenção & Engenharia',
};

const initialSettings: SystemSettings = {
  plantName: 'Planta Industrial 01 - São Paulo',
  plantAddress: 'Av. Industrial, 1500 - Distrito Industrial',
  plantCapacity: '850.000 ton/ano',
  currency: 'BRL',
  timezone: 'America/Sao_Paulo',
  notificationsEnabled: true,
  autoAssignEnabled: false,
  maintenanceMode: false,
};

// --- CONTEXT INTERFACE ---
interface MaintenanceContextType {
  assets: Asset[];
  tickets: MaintenanceTicket[];
  plans: PreventivePlan[];
  inventory: SparePart[];
  technicians: Technician[];
  settings: SystemSettings;
  currentUser: CurrentUser; // NEW

  // Connectivity & Mobile Props
  isOnline: boolean;
  toggleConnection: () => void;
  pendingSyncs: number;
  technicianLocation?: { lat: number; lng: number }; // New

  // Actions
  addAsset: (asset: Asset) => void;
  updateAsset: (asset: Asset) => void;
  deleteAsset: (id: string) => void; // Added for compatibility with Sidebar/Assets

  addTicket: (ticket: MaintenanceTicket) => void;
  updateTicket: (ticket: MaintenanceTicket) => void;
  updateTicketStatus: (id: string, status: MaintenanceTicket['status']) => void;

  addPlan: (plan: PreventivePlan) => void;
  updatePlan: (plan: PreventivePlan) => void;
  deletePlan: (id: string) => void; // Compatibility

  addPart: (part: SparePart) => void;
  updatePart: (part: SparePart) => void;

  addTechnician: (tech: Technician) => void;
  updateTechnician: (tech: Technician) => void;
  updateSettings: (settings: SystemSettings) => void;
  updateCurrentUser: (user: CurrentUser) => void; // NEW

  // Advanced Logic
  consumePartInTicket: (ticketId: string, partId: string, quantity: number) => boolean;
  sendWhatsAppNotification: (
    technicianNameOrId: string,
    messageDetails: { title: string; asset: string; urgency: string; status: string }
  ) => void;

  // Legacy support
  seedDatabase: () => Promise<void>;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export const MaintenanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state from LocalStorage if available, else use mock data
  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('omni_assets');
    return saved ? JSON.parse(saved) : initialAssets;
  });
  const [tickets, setTickets] = useState<MaintenanceTicket[]>(() => {
    const saved = localStorage.getItem('omni_tickets');
    return saved ? JSON.parse(saved) : initialTickets;
  });
  const [plans, setPlans] = useState<PreventivePlan[]>(() => {
    const saved = localStorage.getItem('omni_plans');
    return saved ? JSON.parse(saved) : initialPlans;
  });
  const [inventory, setInventory] = useState<SparePart[]>(() => {
    const saved = localStorage.getItem('omni_inventory');
    return saved ? JSON.parse(saved) : initialInventory;
  });
  const [technicians, setTechnicians] = useState<Technician[]>(() => {
    const saved = localStorage.getItem('omni_technicians');
    return saved ? JSON.parse(saved) : initialTechnicians;
  });
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('omni_settings');
    return saved ? JSON.parse(saved) : initialSettings;
  });
  const [currentUser, setCurrentUser] = useState<CurrentUser>(() => {
    const saved = localStorage.getItem('omni_current_user');
    return saved ? JSON.parse(saved) : initialCurrentUser;
  });

  // Connectivity State
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const [technicianLocation, setTechnicianLocation] = useState({ lat: -23.5505, lng: -46.6333 });

  // --- PERSISTENCE EFFECTS ---
  useEffect(() => localStorage.setItem('omni_assets', JSON.stringify(assets)), [assets]);
  useEffect(() => localStorage.setItem('omni_tickets', JSON.stringify(tickets)), [tickets]);
  useEffect(() => localStorage.setItem('omni_plans', JSON.stringify(plans)), [plans]);
  useEffect(() => localStorage.setItem('omni_inventory', JSON.stringify(inventory)), [inventory]);
  useEffect(
    () => localStorage.setItem('omni_technicians', JSON.stringify(technicians)),
    [technicians]
  );
  useEffect(() => localStorage.setItem('omni_settings', JSON.stringify(settings)), [settings]);
  useEffect(
    () => localStorage.setItem('omni_current_user', JSON.stringify(currentUser)),
    [currentUser]
  );

  // --- HELPER FOR OFFLINE ACTIONS ---
  const recordAction = () => {
    if (!isOnline) {
      setPendingSyncs(prev => prev + 1);
    }
  };

  const toggleConnection = () => {
    setIsOnline(prev => {
      if (!prev) {
        // Going online: clear pending syncs simulated
        setTimeout(() => setPendingSyncs(0), 2000);
      }
      return !prev;
    });
  };

  // --- WHATSAPP LOGIC ---
  const sendWhatsAppNotification = (
    technicianNameOrId: string,
    details: { title: string; asset: string; urgency: string; status: string }
  ) => {
    // Find technician by ID or Name
    const tech = technicians.find(
      t => t.id === technicianNameOrId || t.name === technicianNameOrId
    );

    // Fallback to Current User if it's the current user assigned
    const targetPhone =
      tech?.phone || (currentUser.name === technicianNameOrId ? currentUser.phone : null);

    if (targetPhone) {
      const message = `🔧 *OMNIGUARD NOTIFICAÇÃO*
            
Ola ${tech?.name || technicianNameOrId},
Nova atualização de serviço:

📋 *Título:* ${details.title}
🏭 *Equipamento:* ${details.asset}
🚨 *Prioridade:* ${details.urgency.toUpperCase()}
📊 *Status:* ${details.status.toUpperCase()}

Acesse o app para iniciar a execução.`;

      const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;

      // In a real app, this would be a server-side trigger.
      // For the demo, we log and show a visual feedback via alert or console.
      console.log(`[WHATSAPP SENT] To: ${targetPhone} | Msg: ${message}`);

      // To make it visible in demo without annoying popups, we can open a window or just trust the console/toast
      // window.open(url, '_blank');
    } else {
      console.warn(`[WHATSAPP FAIL] No phone found for technician: ${technicianNameOrId}`);
    }
  };

  // --- ACTIONS ---

  const addAsset = (asset: Asset) => {
    recordAction();
    setAssets(prev => [...prev, asset]);
  };
  const updateAsset = (asset: Asset) => {
    recordAction();
    setAssets(prev => prev.map(a => (a.id === asset.id ? asset : a)));
  };
  const deleteAsset = (id: string) => {
    recordAction();
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const addTicket = (ticket: MaintenanceTicket) => {
    recordAction();
    setTickets(prev => [ticket, ...prev]);
  }; // Newest first
  const updateTicket = (ticket: MaintenanceTicket) => {
    recordAction();
    setTickets(prev => prev.map(t => (t.id === ticket.id ? ticket : t)));
  };
  const updateTicketStatus = (id: string, status: MaintenanceTicket['status']) => {
    recordAction();
    setTickets(prev => prev.map(t => (t.id === id ? { ...t, status } : t)));
  };

  const addPlan = (plan: PreventivePlan) => {
    recordAction();
    setPlans(prev => [...prev, plan]);
  };
  const updatePlan = (plan: PreventivePlan) => {
    recordAction();
    setPlans(prev => prev.map(p => (p.id === plan.id ? plan : p)));
  };
  const deletePlan = (id: string) => {
    recordAction();
    setPlans(prev => prev.filter(p => p.id !== id));
  };

  const addPart = (part: SparePart) => {
    recordAction();
    setInventory(prev => [...prev, part]);
  };
  const updatePart = (part: SparePart) => {
    recordAction();
    setInventory(prev => prev.map(p => (p.id === part.id ? part : p)));
  };

  const addTechnician = (tech: Technician) => setTechnicians(prev => [...prev, tech]);
  const updateTechnician = (tech: Technician) =>
    setTechnicians(prev => prev.map(t => (t.id === tech.id ? tech : t)));

  const updateSettings = (newSettings: SystemSettings) => setSettings(newSettings);
  const updateCurrentUser = (user: CurrentUser) => setCurrentUser(user);

  // --- LOGIC ---
  const consumePartInTicket = (ticketId: string, partId: string, quantity: number): boolean => {
    const part = inventory.find(p => p.id === partId);

    if (!part) return false;
    if (part.quantity < quantity) {
      alert(`Erro: Estoque insuficiente de ${part.name}. Disponível: ${part.quantity}`);
      return false;
    }

    recordAction();

    // 1. Deduct from Inventory
    const updatedPart = { ...part, quantity: part.quantity - quantity };
    updatePart(updatedPart);

    // 2. Add Usage Record to Ticket
    const usage: TicketPartUsage = {
      id: Date.now().toString(),
      partId: part.id,
      partName: part.name,
      quantity: quantity,
      unitCost: part.cost,
      totalCost: part.cost * quantity,
      timestamp: new Date().toISOString(),
    };

    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      const activity: TicketActivity = {
        id: Date.now().toString(),
        userId: 'current-user',
        userName: 'Sistema (Estoque)',
        action: `Baixa de estoque: ${quantity}x ${part.name}`,
        timestamp: new Date().toISOString(),
        type: 'part_usage',
      };

      const updatedTicket = {
        ...ticket,
        usedParts: [...(ticket.usedParts || []), usage],
        activities: [activity, ...(ticket.activities || [])],
        totalCost: (ticket.totalCost || 0) + usage.totalCost,
      };
      updateTicket(updatedTicket);
    }

    return true;
  };

  const seedDatabase = async () => {
    // Reset to initial
    setAssets(initialAssets);
    setTickets(initialTickets);
    setPlans(initialPlans);
    setInventory(initialInventory);
    setTechnicians(initialTechnicians);
    alert('Dados resetados para o padrão de demonstração (LocalStorage limpo).');
  };

  return (
    <MaintenanceContext.Provider
      value={{
        assets,
        tickets,
        plans,
        inventory,
        technicians,
        settings,
        currentUser,
        isOnline,
        toggleConnection,
        pendingSyncs,
        technicianLocation,
        addAsset,
        updateAsset,
        deleteAsset,
        addTicket,
        updateTicket,
        updateTicketStatus,
        addPlan,
        updatePlan,
        deletePlan,
        addPart,
        updatePart,
        addTechnician,
        updateTechnician,
        updateSettings,
        updateCurrentUser,
        consumePartInTicket,
        sendWhatsAppNotification,
        seedDatabase,
      }}
    >
      {children}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenance = () => {
  const context = useContext(MaintenanceContext);
  if (context === undefined) {
    throw new Error('useMaintenance must be used within a MaintenanceProvider');
  }
  return context;
};
