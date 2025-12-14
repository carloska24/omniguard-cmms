import { Asset, MaintenanceTicket, SparePart, Technician, PreventivePlan } from '../types';

// --- CONSTANTS ---
const ASSET_TYPES = [
  { name: 'Turbina a Gás', model: 'SGT-800', manufacturer: 'Siemens' },
  { name: 'Braço Robótico', model: 'IRB-6700', manufacturer: 'ABB' },
  { name: 'Compressor Centrifugo', model: 'MSG-TURBO', manufacturer: 'Cameron' },
  { name: 'Gerador Diesel', model: 'QSK60', manufacturer: 'Cummins' },
  { name: 'Bomba Multiestágio', model: 'CR-90', manufacturer: 'Grundfos' },
  { name: 'Torno CNC', model: 'ST-30', manufacturer: 'Haas' },
  { name: 'Sistema Hidráulico', model: 'PowerPack-X', manufacturer: 'Rexroth' },
  { name: 'Painel de Controle', model: 'Simatic S7', manufacturer: 'Siemens' },
];

const LOCATIONS = ['Geração', 'Montagem', 'Pintura', 'Utilidades', 'Logística', 'Usinagem'];
const STATUSES: Asset['status'][] = [
  'operational',
  'operational',
  'operational',
  'maintenance',
  'stopped',
];
const CRITICALITIES: Asset['criticality'][] = ['low', 'medium', 'high', 'critical'];

const TICKET_TITLES = [
  'Vibração excessiva no mancal',
  'Superaquecimento do motor',
  'Falha de comunicação PLC',
  'Vazamento de óleo hidráulico',
  'Ruído anormal na operação',
  'Desarme do disjuntor principal',
  'Erro de posicionamento do eixo',
  'Troca de filtro de ar',
  'Lubrificação periódica',
  'Inspeção termográfica',
  'Falha no sensor de segurança',
  'Desgaste na correia',
];

const TECH_NAMES = [
  'Carlos Silva',
  'Ana Pereira',
  'Roberto Santos',
  'Fernanda Oliveira',
  'Ricardo Lima',
  'Patricia Costa',
  'Lucas Mendes',
  'Juliana Rocha',
];

const PREVENTIVE_TASKS = [
  'Inspeção Visual Geral',
  'Verificação de Níveis de Óleo',
  'Limpeza de Filtros',
  'Aperto de Conexões Elétricas',
  'Calibração de Sensores',
  'Teste de Vibração',
  'Termografia de Painéis',
  'Lubrificação de Rolamentos',
];

// --- HELPERS ---
const random = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (start: Date, end: Date) =>
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();

// --- GENERATORS ---

export const generateAssets = (count: number = 30): Asset[] => {
  return Array.from({ length: count }).map((_, i) => {
    const type = random(ASSET_TYPES);
    return {
      id: `AST-${1000 + i}`,
      name: `${type.name} ${randomInt(1, 99)}`,
      code: `${type.model.substring(0, 3)}-${1000 + i}`,
      model: type.model,
      manufacturer: type.manufacturer,
      serialNumber: `SN-${Math.random().toString(36).substring(7).toUpperCase()}`,
      location: random(LOCATIONS),
      status: random(STATUSES),
      criticality: random(CRITICALITIES),
      image:
        'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=200',
      mtbf: randomInt(500, 5000),
      mttr: randomInt(2, 48),
      cost: randomInt(50000, 5000000),
      qrCode: `QR-${Math.random().toString(36).substring(7)}`,
    };
  });
};

export const generateTickets = (assets: Asset[], count: number = 100): MaintenanceTicket[] => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 12);

  return Array.from({ length: count }).map((_, i) => {
    const asset = random(assets);
    const createdAt = randomDate(startDate, endDate);
    const isClosed = Math.random() > 0.2; // 80% closed

    return {
      id: `TCK-${2024000 + i}`,
      title: random(TICKET_TITLES),
      description: 'Gerado automaticamente para simulação de BI.',
      requester: 'Sistema AutoGen',
      assetId: asset.id,
      type: random(['mechanical', 'electrical', 'hydraulic', 'pneumatic', 'software', 'other']),
      urgency: random(CRITICALITIES),
      status: isClosed ? 'done' : random(['open', 'in-progress', 'waiting-parts']),
      assignee: 'Técnico Simulado',
      createdAt: createdAt,
      occurrenceDate: createdAt,
      closedAt: isClosed ? randomDate(new Date(createdAt), endDate) : undefined,
      totalCost: isClosed ? randomInt(100, 5000) : 0,
      checklist: [],
    };
  });
};

export const generateInventory = (count: number = 50): SparePart[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `PRT-${5000 + i}`,
    name: `Peça Sobressalente ${i}`,
    code: `SP-${i}`,
    quantity: randomInt(0, 50),
    minLevel: 5,
    cost: randomInt(10, 1000),
    criticality: random(CRITICALITIES),
    location: `Almoxarifado ${random(['A', 'B', 'C'])}`,
    category: random(['mechanical', 'electrical', 'consumable']),
    image:
      'https://images.unsplash.com/photo-1552655986-a05c71be397d?auto=format&fit=crop&q=80&w=200',
  }));
};

export const generateTechnicians = (count: number = 8): Technician[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `TECH-${100 + i}`,
    name: TECH_NAMES[i % TECH_NAMES.length] + (i > 7 ? ` ${i}` : ''),
    role: random([
      'Eletricista Sênior',
      'Mecânico Pleno',
      'Engenheiro de Automação',
      'Técnico de Lubrificação',
    ]),
    email: `tech${i}@omniguard.ind`,
    status: 'active',
    avatar: `https://i.pravatar.cc/150?u=${200 + i}`,
    skills: [random(['Mecânica', 'Elétrica']), random(['NR10', 'NR35', 'PLC'])],
    shift: random(['morning', 'afternoon', 'night']),
    efficiency: randomInt(75, 99),
  }));
};

export const generatePreventivePlans = (assets: Asset[], count: number = 20): PreventivePlan[] => {
  return Array.from({ length: count }).map((_, i) => {
    const asset = random(assets);
    return {
      id: `PREV-${3000 + i}`,
      assetId: asset.id,
      title: `${random(['Manutenção', 'Inspeção', 'Calibração'])} de ${asset.name}`,
      frequency: random(['weekly', 'monthly', 'quarterly', 'yearly']),
      assignedTo: 'Equipe Padrão',
      nextDueDate: randomDate(new Date(), new Date(new Date().setMonth(new Date().getMonth() + 3))),
      tasks: [random(PREVENTIVE_TASKS), random(PREVENTIVE_TASKS), 'Registrar no sistema'],
      estimatedDuration: randomInt(30, 240),
    };
  });
};
