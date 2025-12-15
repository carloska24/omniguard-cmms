export type ViewState =
  | 'dashboard'
  | 'assets'
  | 'tickets'
  | 'preventive'
  | 'kanban'
  | 'digital-twin'
  | 'inventory'
  | 'purchases'
  | 'analytics'
  | 'settings'
  | 'mobile-field';

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
  qrCode?: string;
  quantity: number;
  minLevel?: number;
  cost: number;
  criticality: 'low' | 'medium' | 'high';
  location?: string;
  category?: 'mechanical' | 'electrical' | 'hydraulic' | 'consumable';
  image?: string;
  lastMovement?: string;
  compatibleAssets?: string[];
}

export interface Asset {
  id: string;
  name: string;
  code: string;
  qrCode?: string;
  model: string;
  manufacturer: string;
  serialNumber: string;
  location: string;
  status: 'operational' | 'maintenance' | 'stopped' | 'inactive';
  criticality: 'low' | 'medium' | 'high';
  acquisitionDate?: string;
  cost?: number; // Custo de aquisição
  image?: string;

  // Technical specs (Explicit from PDF Scope)
  power?: string; // e.g. "10CV"
  capacity?: string; // e.g. "5000L"
  voltage?: string; // e.g. "220V"

  // Specs Dinâmicas (Mantido para flexibilidade extra)
  customSpecs?: { key: string; value: string }[];

  aiSpecDocument?: string;

  // Maintenance Info
  lastPreventive?: string;
  lastCorrective?: string;
  nextPreventive?: string;

  // PDF 3.1 Extensions - Multiple Docs
  documents?: AssetDocument[] | string[]; // Array of URLs or Objects

  mtbf?: number; // Calculated hours
  mttr?: number; // Calculated hours

  parentId?: string;
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

export interface TicketPartUsage {
  id: string;
  partId: string;
  partName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  timestamp: string;
}

export interface TicketTimeLog {
  id: string;
  technicianName: string;
  hours: number;
  minutes: number;
  ratePerHour: number;
  date: string;
}

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

  requester_id?: string; // LINKED TO PROFILE
  requester_name?: string; // DENORMALIZED
  requester?: string; // LEGACY COMPAT (Will remove later)

  assetId: string; // Equipamento afetado
  type: 'electrical' | 'mechanical' | 'hydraulic' | 'purchase' | 'other';

  failureCause?: string;
  description: string;
  occurrenceDate: string;

  // Defined by Requester vs Manager
  urgency: 'low' | 'medium' | 'high' | 'critical';
  // Defined by Manager
  priority?: 'low' | 'medium' | 'high' | 'critical';

  status:
    | 'open'
    | 'analyzing'
    | 'assigned'
    | 'in-progress'
    | 'waiting-parts'
    | 'done'
    | 'cancelled';

  assignee?: string; // LEGACY COMPAT
  assignee_id?: string; // LINKED TO PROFILE ID
  assignee_name?: string; // Visual

  solution?: string;
  createdAt: string;
  activities?: TicketActivity[];
  closedAt?: string;

  usedParts?: TicketPartUsage[];
  timeLogs?: TicketTimeLog[];
  checklist?: ChecklistItem[];
  totalCost?: number; // Calculated (Parts + Labor)
}

// --- NEW: User & Settings Types ---
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  department: string;
  phone?: string; // NEW: WhatsApp Notification
}

// PDF 3.3 - Planejamento de Preventiva
export interface PreventivePlan {
  id: string;
  name: string;
  description: string;
  status?: 'active' | 'paused';
  assetIds: string[]; // Equipamentos associados
  frequencyType: 'time' | 'usage'; // Baseada em tempo ou contador
  frequencyValue: number; // ex: 7 (dias) ou 1000 (horas)
  frequencyUnit?: 'days' | 'months' | 'years';
  tasks: string[] | ChecklistItem[]; // Enhanced tasks
  estimatedTime?: number; // em minutos
  lastExecution?: string; // NEW: Data da última ordem gerada
  nextExecution?: string; // Calculated or manual override
  createdAt?: string; // NEW

  // NEW SCOPE
  requiredResources?: string[]; // Tools, EPIs
  autoGenerate?: boolean; // If true, system generates ticket automatically
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

export interface Technician {
  id: string;
  name: string;
  role: string;
  email: string;
  status: 'active' | 'inactive' | 'on-leave';
  skills: string[];
  shift: 'morning' | 'afternoon' | 'night';
  efficiency: number;
  avatar?: string;
  phone?: string; // NEW: WhatsApp Notification
}

export interface SystemSettings {
  plantName: string;
  plantAddress: string; // NEW
  plantCapacity: string; // NEW
  currency: string;
  timezone: string;
  notificationsEnabled: boolean;
  autoAssignEnabled: boolean;
  maintenanceMode: boolean; // NEW
}
