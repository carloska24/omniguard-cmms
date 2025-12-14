
export type ViewState = 'dashboard' | 'assets' | 'tickets' | 'preventive' | 'kanban' | 'digital-twin' | 'inventory' | 'purchases' | 'analytics' | 'settings' | 'mobile-field';

// PDF 3.1 - Cadastro de Máquinas (Extended)
export interface AssetDocument {
    id: string;
    name: string;
    type: 'manual' | 'schematic' | 'invoice' | 'photo';
    url: string;
}

export interface SparePart {
    id: string;
    name: string;
    code: string;
    qrCode?: string; // NEW: Identificador único escaneável
    quantity: number;
    minLevel?: number; // Ponto de Reposição
    cost: number; // Cost per unit
    criticality: 'low' | 'medium' | 'high';
    location?: string; // Prateleira/Bin
    category?: 'mechanical' | 'electrical' | 'hydraulic' | 'consumable';
    image?: string; // NEW: Foto da peça
    lastMovement?: string; // NEW: Data da última saída/entrada
    compatibleAssets?: string[]; // NEW: IDs de máquinas compatíveis
}

export interface Asset {
  id: string;
  name: string; // Nome do Equipamento
  code: string; // Código de Identificação (Tag)
  qrCode?: string; // NEW: Identificador único escaneável
  model: string; // Modelo
  manufacturer: string; // Fabricante
  serialNumber: string; // Número de Série
  location: string; // Localização (setor, linha)
  status: 'operational' | 'maintenance' | 'stopped' | 'inactive'; // Status Operacional
  criticality: 'low' | 'medium' | 'high'; // Criticidade
  acquisitionDate?: string;
  cost?: number;
  image?: string;
  // Technical specs
  power?: string;
  capacity?: string;
  voltage?: string;
  // Dynamic Specs (Key/Value pairs)
  customSpecs?: { key: string; value: string }[]; 
  // AI Generated Rich Document
  aiSpecDocument?: string;
  // Maintenance Info
  lastPreventive?: string;
  lastCorrective?: string;
  nextPreventive?: string;
  // PDF 3.1 Extensions
  documents?: AssetDocument[];
  spareParts?: SparePart[];
  mtbf?: number; // Calculated hours
  mttr?: number; // Calculated hours
  
  // NEW: Hierarchy
  parentId?: string; // ID of the parent asset (e.g. Line > Machine > Component)
}

// PDF 3.2 - Chamados de Manutenção Corretiva
export interface TicketActivity {
    id: string;
    userId: string;
    userName: string;
    action: string;
    timestamp: string;
    type: 'comment' | 'status_change' | 'part_usage' | 'time_log';
}

// New Interface for Used Parts in a Ticket
export interface TicketPartUsage {
    id: string;
    partId: string;
    partName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    timestamp: string;
}

// New Interface for Time Log
export interface TicketTimeLog {
    id: string;
    technicianName: string;
    hours: number;
    minutes: number;
    ratePerHour: number; // Custo hora do técnico
    date: string;
}

// New Interface for Checklist Items (AI Wizard)
export interface ChecklistItem {
    id: string;
    text: string;
    checked: boolean;
    category: 'safety' | 'execution' | 'verification';
    notes?: string;
    photoUrl?: string;
}

export interface MaintenanceTicket {
  id: string;
  title: string;
  requester: string; // Solicitante
  assetId: string; // Equipamento afetado
  type: 'electrical' | 'mechanical' | 'hydraulic' | 'purchase' | 'other'; // Tipo de problema (Added 'purchase')
  failureCause?: string; // Causa Raiz (Desgaste, Operacional, etc)
  description: string;
  occurrenceDate: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'analyzing' | 'assigned' | 'in-progress' | 'waiting-parts' | 'done' | 'cancelled';
  assignee?: string; // Técnico responsável
  solution?: string;
  createdAt: string;
  activities?: TicketActivity[]; // PDF 3.2 - Registro de atividades
  closedAt?: string; // Used for MTTR
  
  // New Execution Data
  usedParts?: TicketPartUsage[];
  timeLogs?: TicketTimeLog[];
  checklist?: ChecklistItem[]; // NEW: Persisted Checklist Steps
  totalCost?: number; // Calculated (Parts + Labor)
}

// PDF 3.3 - Planejamento de Preventiva
export interface PreventivePlan {
  id: string;
  name: string; // Nome do plano
  description: string;
  status?: 'active' | 'paused'; // NEW: Controle de estado
  assetIds: string[]; // Equipamentos associados
  frequencyType: 'time' | 'usage'; // Baseada em tempo ou contador
  frequencyValue: number; // ex: 7 (dias) ou 1000 (horas)
  frequencyUnit?: 'days' | 'months' | 'years';
  tasks: string[]; // Checklist items
  estimatedTime?: number; // em minutos
  lastExecution?: string; // NEW: Data da última ordem gerada
  nextExecution?: string; // Calculated or manual override
  createdAt?: string; // NEW
}

// Keep existing AI types for the dashboard
export interface AiPrediction {
  id: string;
  assetName: string;
  prediction: string;
  probability: number;
  timeToFailure: string;
  recommendedAction: string;
  severity: 'low' | 'medium' | 'high';
}

// --- NEW: User & Settings Types ---
export interface Technician {
    id: string;
    name: string;
    role: string; // 'Mecânico Pleno', 'Eletricista', etc
    email: string;
    status: 'active' | 'inactive' | 'on-leave';
    skills: string[]; // ['NR10', 'Hidráulica', 'PLC']
    shift: 'morning' | 'afternoon' | 'night';
    efficiency: number; // 0-100%
    avatar?: string;
}

export interface SystemSettings {
    plantName: string;
    currency: string;
    timezone: string;
    notificationsEnabled: boolean;
    autoAssignEnabled: boolean;
}
