import { SupabaseClient } from '@supabase/supabase-js';
import { PreventivePlan, MaintenanceTicket, Asset, ChecklistItem, Technician } from '../types';

/**
 * Finds the best technician for the job based on asset and availability.
 */
const findBestTechnician = (
  asset: Asset | undefined,
  technicians: Technician[]
): Technician | undefined => {
  if (!technicians || technicians.length === 0) return undefined;

  // 1. Filter Active Techs
  const activeTechs = technicians.filter(t => t.status === 'active');
  if (activeTechs.length === 0) return undefined;

  // 2. Simple Match based on Asset Criticality (Seniority logic could go here)
  // For now, Round Robin or Random to distribute load
  const randomIndex = Math.floor(Math.random() * activeTechs.length);
  return activeTechs[randomIndex];
};

/**
 * Checks which plans are due and generates the corresponding tickets.
 * NOW ASYNC: Checks DB Lock to prevent duplicate generation.
 */
export const checkAndGeneratePreventiveTickets = async (
  supabase: SupabaseClient,
  plans: PreventivePlan[],
  assets: Asset[],
  technicians: Technician[]
): Promise<{ newTickets: MaintenanceTicket[]; updatedPlans: PreventivePlan[] }> => {
  const newTickets: MaintenanceTicket[] = [];
  const updatedPlans: PreventivePlan[] = [];
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

  for (const plan of plans) {
    // 1. Skip if inactive or paused
    if (plan.status !== 'active') continue;

    // 2. Skip if auto-generation is explicitly disabled
    if (plan.autoGenerate === false) continue;

    // 3. Create Date objects
    let nextDue = plan.nextExecution ? new Date(plan.nextExecution) : null;

    if (!nextDue) {
      nextDue = new Date(); // Default to now if missing
    }

    // 4. Check if Today >= NextDue
    if (nextDue && now >= nextDue) {
      // --- CRITICAL: DB LOCK CHECK ---
      // Try to insert a log entry for today. If it fails (unique constraint), it means it already ran.
      const { error: lockError } = await supabase.from('preventive_logs').insert({
        plan_id: plan.id,
        execution_date: todayStr,
      });

      if (lockError) {
        // If error is 23505 (unique_violation), we skip safely.
        // If table doesn't exist yet, we might want to proceed or warn.
        // For safety, if any error, we SKIP to avoid duplication/infinite loops.
        console.warn(
          `[Scheduler] Skipping plan ${plan.name} (Lock exists or Error):`,
          lockError.message
        );
        continue;
      }

      // --- GENERATION LOGIC ---
      const asset = assets.find(a => a.id === plan.assetIds?.[0]);

      // Generate Ticket
      const checklistItems: ChecklistItem[] = (plan.tasks as string[]).map((t, i) => ({
        id: `auto-chk-${plan.id}-${i}-${Date.now()}`,
        text: typeof t === 'string' ? t : (t as any).text,
        checked: false,
        category: 'execution',
      }));

      // AUTO-ASSIGNMENT
      const assignee = findBestTechnician(asset, technicians);

      const ticket: MaintenanceTicket = {
        id: `TCK-AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: `[Preventiva] ${plan.name}`,
        description: `ORDEM AUTOMÁTICA\n\nEquipamento: ${asset?.name || 'N/A'}\nPlano: ${
          plan.name
        }\n\n${plan.description || ''}`,
        type: 'other',
        status: assignee ? 'assigned' : 'open', // Auto-assign status
        urgency: 'medium',
        priority: 'medium',
        assetId: plan.assetIds?.[0] || 'unknown',
        requester: 'System Scheduler',
        requester_id: 'system',
        requester_name: 'Agendador Automático',
        assignee_id: assignee?.id,
        assignee_name: assignee?.name,
        createdAt: now.toISOString(),
        occurrenceDate: now.toISOString(),
        checklist: checklistItems,
        activities: [
          {
            id: `act-${Date.now()}-1`,
            userId: 'system',
            userName: 'System Scheduler',
            action: 'Ticket gerado automaticamente por vencimento de plano preventivo.',
            timestamp: now.toISOString(),
            type: 'status_change',
          },
        ],
        usedParts: [],
        timeLogs: [],
        totalCost: 0,
      };

      if (assignee) {
        ticket.activities?.push({
          id: `act-${Date.now()}-2`,
          userId: 'system',
          userName: 'System Scheduler',
          action: `Atribuição Automática para: ${assignee.name}`,
          timestamp: now.toISOString(),
          type: 'status_change',
        });
      }

      newTickets.push(ticket);

      // Calculcate Next Date
      const newNextDate = new Date(nextDue);
      if (plan.frequencyType === 'time') {
        if (plan.frequencyUnit === 'days')
          newNextDate.setDate(newNextDate.getDate() + plan.frequencyValue);
        if (plan.frequencyUnit === 'months')
          newNextDate.setMonth(newNextDate.getMonth() + plan.frequencyValue);
        if (plan.frequencyUnit === 'years')
          newNextDate.setFullYear(newNextDate.getFullYear() + plan.frequencyValue);
      }

      // Update Plan
      updatedPlans.push({
        ...plan,
        lastExecution: now.toISOString(),
        nextExecution: newNextDate.toISOString(),
      });
    }
  }

  return { newTickets, updatedPlans };
};
