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
} from '../types';
import { checkAndGeneratePreventiveTickets } from '../utils/PreventiveScheduler';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

import {
  initialPlans,
  initialTechnicians,
  initialSettings,
  initialAssets,
  initialInventory,
  initialTickets,
} from '../data/seedData';

// --- CONTEXT INTERFACE ---
interface MaintenanceContextType {
  assets: Asset[];
  tickets: MaintenanceTicket[];
  plans: PreventivePlan[];
  inventory: SparePart[];
  technicians: Technician[];
  settings: SystemSettings;

  // Connectivity & Mobile Props
  isOnline: boolean;
  toggleConnection: () => void;
  pendingSyncs: number;
  technicianLocation?: { lat: number; lng: number };

  // Actions
  addAsset: (asset: Asset) => void;
  updateAsset: (asset: Asset) => void;
  deleteAsset: (id: string) => void; // NEW ACTION

  addTicket: (ticket: MaintenanceTicket) => void;
  updateTicket: (ticket: MaintenanceTicket) => void;
  updateTicketStatus: (id: string, status: MaintenanceTicket['status']) => void;

  addPlan: (plan: PreventivePlan) => void;
  updatePlan: (plan: PreventivePlan) => void;
  deletePlan: (id: string) => void;

  addPart: (part: SparePart) => void;
  updatePart: (part: SparePart) => void;

  addTechnician: (tech: Technician) => void;
  updateTechnician: (tech: Technician) => void;
  updateSettings: (settings: SystemSettings) => void;

  // Advanced Logic
  consumePartInTicket: (ticketId: string, partId: string, quantity: number) => boolean;

  // System
  seedDatabase: () => Promise<void>;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export const MaintenanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth(); // GET AUTH CONTEXT

  // STATE: agora inicializados vazios, carregados via Effect
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [plans, setPlans] = useState<PreventivePlan[]>(initialPlans); // Planos não foram migrados para DB por simplificação, mantendo Local
  const [inventory, setInventory] = useState<SparePart[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>(initialTechnicians); // Técnicos também não
  const [settings, setSettings] = useState<SystemSettings>(initialSettings);

  // Connectivity State
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const [technicianLocation, setTechnicianLocation] = useState({ lat: -23.5505, lng: -46.6333 });

  // --- SUPABASE SYNC EFFECTS ---
  useEffect(() => {
    fetchData();

    // Realtime Subscriptions
    const channel = supabase
      .channel('db_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () =>
        fetchAssets()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () =>
        fetchTickets()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () =>
        fetchInventory()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () =>
        fetchInventory()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () =>
        fetchTechnicians()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'preventive_plans' }, () =>
        fetchPlans()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAssets = async () => {
    const { data } = await supabase.from('assets').select('*');
    if (data) {
      setAssets(
        data.map((d: any) => ({
          ...d,
          serialNumber: d.serial_number,
          qrCode: d.qr_code,
          acquisitionDate: d.acquisition_date,
          parentId: d.parent_id,
        })) as any
      );
    }
  };

  const fetchTickets = async () => {
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      const enrichedTickets = await Promise.all(
        data.map(async (t: any) => {
          const { data: usage } = await supabase
            .from('ticket_part_usages')
            .select('*')
            .eq('ticket_id', t.id);
          return {
            ...t,
            assetId: t.asset_id,
            occurrenceDate: t.occurrence_date,
            createdAt: t.created_at,
            totalCost: t.total_cost || 0,
            usedParts: usage
              ? usage.map((u: any) => ({
                  ...u,
                  partName: u.part_name,
                  partId: u.part_id,
                  ticketId: u.ticket_id,
                  totalCost: u.total_cost,
                  unitCost: u.unit_cost,
                }))
              : [],
          };
        })
      );
      setTickets(enrichedTickets as any);
    }
  };

  const fetchInventory = async () => {
    const { data } = await supabase.from('inventory').select('*');
    if (data) {
      setInventory(data.map((d: any) => ({ ...d, minLevel: d.min_level })) as any);
    }
  };

  const fetchTechnicians = async () => {
    // BUSCAR DE PROFILES (RBAC)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['technician', 'manager']);

    if (data) {
      setTechnicians(
        data.map((p: any) => ({
          id: p.id,
          name: p.name || p.email,
          email: p.email,
          role: p.role,
          status: 'active',
          shift: p.shift || 'morning',
          skills: [],
          efficiency: 100,
        }))
      );
    }
  };

  const fetchPlans = async () => {
    const { data } = await supabase.from('preventive_plans').select('*');
    if (data) {
      setPlans(data as any);
    }
  };

  const fetchData = async () => {
    // 1. ASSETS
    const { data: assetsData } = await supabase.from('assets').select('*');
    if (assetsData) {
      setAssets(
        assetsData.map((d: any) => ({
          ...d,
          serialNumber: d.serial_number,
          qrCode: d.qr_code,
          acquisitionDate: d.acquisition_date,
          parentId: d.parent_id,
        })) as any
      );
    }

    // 2. INVENTORY
    const { data: invData } = await supabase.from('inventory').select('*');
    if (invData) {
      setInventory(invData.map((d: any) => ({ ...d, minLevel: d.min_level })) as any);
    }

    // 3. TICKETS
    await fetchTickets();

    // 4. TECHNICIANS
    await fetchTechnicians();

    // 5. PLANS
    await fetchPlans();
  };

  // --- SCHEDULER EFFECT ---
  // --- SCHEDULER EFFECT ---
  useEffect(() => {
    const runScheduler = async () => {
      if (plans.length > 0 && assets.length > 0 && technicians.length > 0 && isOnline) {
        const { newTickets, updatedPlans } = await checkAndGeneratePreventiveTickets(
          supabase,
          plans,
          assets,
          technicians
        );

        if (newTickets.length > 0) {
          console.log('Scheduler: Generating tickets...', newTickets.length);
          newTickets.forEach(t => addTicket(t));
          updatedPlans.forEach(p => updatePlan(p));
        }
      }
    };
    runScheduler();
  }, [plans, assets, technicians, isOnline]);

  // --- HELPER FOR OFFLINE ACTIONS ---
  const recordAction = () => {
    if (!isOnline) setPendingSyncs(prev => prev + 1);
  };

  const toggleConnection = () => {
    setIsOnline(prev => {
      if (!prev) setTimeout(() => setPendingSyncs(0), 2000);
      return !prev;
    });
  };

  // --- ACTIONS (Database Direct) ---

  const addAsset = async (asset: Asset) => {
    recordAction();
    setAssets(prev => [...prev, asset]); // Optimistic
    const dbAsset = {
      id: asset.id,
      name: asset.name,
      code: asset.code,
      model: asset.model,
      manufacturer: asset.manufacturer,
      serial_number: asset.serialNumber,
      location: asset.location,
      status: asset.status,
      criticality: asset.criticality,
      image: asset.image,
      mtbf: asset.mtbf,
      mttr: asset.mttr,
      cost: asset.cost,
      qr_code: asset.qrCode,
    };
    await supabase.from('assets').insert(dbAsset);
  };

  const updateAsset = async (asset: Asset) => {
    recordAction();
    setAssets(prev => prev.map(a => (a.id === asset.id ? asset : a))); // Optimistic
    const dbAsset = {
      name: asset.name,
      code: asset.code,
      model: asset.model,
      manufacturer: asset.manufacturer,
      serial_number: asset.serialNumber,
      location: asset.location,
      status: asset.status,
      criticality: asset.criticality,
      image: asset.image,
      mtbf: asset.mtbf,
      mttr: asset.mttr,
      cost: asset.cost,
      qr_code: asset.qrCode,
    };
    await supabase.from('assets').update(dbAsset).eq('id', asset.id);
  };

  const deleteAsset = async (id: string) => {
    recordAction();
    // Check if tickets exist logic could be here, but for now we trust UI
    setAssets(prev => prev.filter(a => a.id !== id)); // Optimistic
    await supabase.from('assets').delete().eq('id', id);
  };

  const addTicket = async (ticket: MaintenanceTicket) => {
    recordAction();
    setTickets(prev => [ticket, ...prev]); // Optimistic
    const dbTicket = {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      requester_id: user?.id, // AUTH ID
      requester_name: profile?.name || user?.email, // AUTH NAME
      asset_id: ticket.assetId,
      type: ticket.type,
      urgency: ticket.urgency,
      status: ticket.status,
      assignee: ticket.assignee,
      created_at: ticket.createdAt,
    };
    await supabase.from('tickets').insert(dbTicket);
  };

  const updateTicket = async (ticket: MaintenanceTicket) => {
    recordAction();
    setTickets(prev => prev.map(t => (t.id === ticket.id ? ticket : t))); // Optimistic
    const dbTicket = {
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      assignee: ticket.assignee,
      solution_notes: ticket.description,
      total_cost: ticket.totalCost,
    };
    await supabase.from('tickets').update(dbTicket).eq('id', ticket.id);
  };

  const updateTicketStatus = async (id: string, status: MaintenanceTicket['status']) => {
    recordAction();
    setTickets(prev => prev.map(t => (t.id === id ? { ...t, status } : t))); // Optimistic
    await supabase.from('tickets').update({ status }).eq('id', id);
  };

  const addPlan = (plan: PreventivePlan) => {
    recordAction();
    setPlans(prev => [...prev, plan]);
  };
  const updatePlan = (plan: PreventivePlan) => {
    recordAction();
    setPlans(prev => prev.map(p => (p.id === plan.id ? plan : p)));
  };
  const deletePlan = async (id: string) => {
    recordAction();
    setPlans(prev => prev.filter(p => p.id !== id));
    await supabase.from('preventive_plans').delete().eq('id', id);
  };

  const addPart = async (part: SparePart) => {
    recordAction();
    setInventory(prev => [...prev, part]); // Optimistic
    const dbPart = {
      id: part.id,
      code: part.code || '',
      name: part.name,
      quantity: part.quantity || 0,
      min_level: part.minLevel || 0,
      cost: part.cost || 0,
      criticality: part.criticality || 'low',
      location: part.location || '',
      category: part.category || 'mechanical',
      image: part.image || '',
    };
    const { error } = await supabase.from('inventory').insert(dbPart);
    if (error) console.error('Erro ao adicionar peça:', error);
  };

  const updatePart = async (part: SparePart) => {
    recordAction();
    setInventory(prev => prev.map(p => (p.id === part.id ? part : p))); // Optimistic

    // UPDATE COMPLETO (Sincroniza todos os campos editáveis)
    const dbPartUpdates = {
      code: part.code || '',
      name: part.name,
      quantity: part.quantity || 0,
      min_level: part.minLevel || 0,
      cost: part.cost || 0,
      criticality: part.criticality || 'low',
      location: part.location || '',
      category: part.category || 'mechanical',
      image: part.image || '',
    };

    const { error } = await supabase.from('inventory').update(dbPartUpdates).eq('id', part.id);
    if (error) console.error('Erro ao atualizar peça:', error);
  };

  const addTechnician = (tech: Technician) => setTechnicians(prev => [...prev, tech]);
  const updateTechnician = (tech: Technician) =>
    setTechnicians(prev => prev.map(t => (t.id === tech.id ? tech : t)));

  const updateSettings = (newSettings: SystemSettings) => setSettings(newSettings);

  // --- LOGIC ---
  const consumePartInTicket = (ticketId: string, partId: string, quantity: number): boolean => {
    const part = inventory.find(p => p.id === partId);

    if (!part) return false;
    if (part.quantity < quantity) {
      alert(`Erro: Estoque insuficiente de ${part.name}. Disponível: ${part.quantity}`);
      return false;
    }

    recordAction();

    // 1. Deduct from Inventory (Optimistic + DB)
    const updatedPart = { ...part, quantity: part.quantity - quantity };
    setInventory(prev => prev.map(p => (p.id === part.id ? updatedPart : p)));
    supabase.from('inventory').update({ quantity: updatedPart.quantity }).eq('id', part.id).then();

    // 2. Add Usage Record to Ticket (DB)
    const usageId = Date.now().toString();
    const usageTotalCost = part.cost * quantity;

    supabase
      .from('ticket_part_usages')
      .insert({
        id: usageId,
        ticket_id: ticketId,
        part_id: part.id,
        part_name: part.name,
        quantity: quantity,
        unit_cost: part.cost,
        total_cost: usageTotalCost,
      })
      .then();

    // 3. Update Local Ticket State
    const usage: TicketPartUsage = {
      id: usageId,
      partId: part.id,
      partName: part.name,
      quantity: quantity,
      unitCost: part.cost,
      totalCost: usageTotalCost,
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
      setTickets(prev => prev.map(t => (t.id === ticket.id ? updatedTicket : t)));
    }

    return true;
  };

  const seedDatabase = async () => {
    try {
      console.log('Iniciando Seeding Manual...');

      // 1. Assets
      const dbAssets = initialAssets.map(a => ({
        id: a.id,
        name: a.name,
        code: a.code,
        model: a.model,
        manufacturer: a.manufacturer,
        serial_number: a.serialNumber,
        location: a.location,
        status: a.status,
        criticality: a.criticality,
        image: a.image,
        mtbf: a.mtbf,
        mttr: a.mttr,
        cost: a.cost,
        created_at: new Date().toISOString(),
      }));
      await supabase.from('assets').upsert(dbAssets, { onConflict: 'id' });

      // 2. Inventory
      const dbInv = initialInventory.map(i => ({
        id: i.id,
        code: i.code,
        name: i.name,
        quantity: i.quantity,
        min_level: i.minLevel,
        cost: i.cost,
        criticality: i.criticality,
        location: i.location,
        category: i.category,
        image: i.image,
      }));
      await supabase.from('inventory').upsert(dbInv, { onConflict: 'id' });

      // 3. Tickets
      const dbTickets = initialTickets.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        requester: t.requester,
        asset_id: t.assetId,
        type: t.type,
        urgency: t.urgency,
        status: t.status,
        assignee: t.assignee,
        created_at: t.createdAt,
        occurrence_date: t.occurrenceDate,
        total_cost: t.totalCost,
        closed_at: t.closedAt, // Importante para BI
      }));
      await supabase.from('tickets').upsert(dbTickets, { onConflict: 'id' });

      // 4. Technicians (Se tiver tabela no banco, se não, fica local state)
      // Como na remoção anterior vi que havia fetchTechnicians, assumo que há tabela.
      // Vou checar se existe a função fetchTechnicians no código original para confirmar.
      // Sim, linha 551 do arquivo original tinha on postgres_changes para technicians.
      // Então vou inserir technicians também se possível.
      /*
      // Comentado para evitar erro se a tabela diferir, mas o ideal é ter.
      // Vou deixar apenas o set local pois no código original eles eram inicializados localmente no state
      // E só tinham fetch se houvesse tabela.
      */

      // Atualizar Estado Local para refletir imediatamente
      setAssets(initialAssets);
      setInventory(initialInventory);
      setTickets(initialTickets);
      // setTechnicians(initialTechnicians); // Já é inicializado com eles

      console.log('Seeding concluído com sucesso!');
      alert('Dados de Demonstração Restaurados com Sucesso!');
    } catch (error) {
      console.error('Erro no Seeding:', error);
      alert('Erro ao semear dados. Verifique o console.');
    }
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
        consumePartInTicket,
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
