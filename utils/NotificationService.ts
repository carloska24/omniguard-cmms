import { MaintenanceTicket, Technician } from '../types';

/**
 * Service to handle system notifications, specifically WhatsApp integrations.
 * In a production environment, this would call an external API (Twilio, Meta, Z-API, etc).
 */

export const NotificationService = {
  /**
   * Mock sending a WhatsApp message.
   * Logs to console and can trigger a browser alert or toast if integrated.
   */
  sendWhatsApp: async (to: string, message: string) => {
    console.log(
      `%c[WhatsApp Integration] Sending to ${to}:`,
      'color: #25D366; font-weight: bold',
      message
    );

    // Simulating API latency
    await new Promise(resolve => setTimeout(resolve, 500));

    // In a real app, this would be: await fetch('https://api.whatsapp.com...', { ... })

    return { success: true, timestamp: new Date().toISOString() };
  },

  /**
   * Generates a detailed message for a new task assignment
   */
  notifyAssignment: async (technician: Technician, ticket: MaintenanceTicket) => {
    if (!technician.phone) {
      console.warn(`[Notification] Technician ${technician.name} has no phone number registered.`);
      return;
    }

    const message = `
🔧 *Nova Ordem de Serviço Atribuída!*

Olá *${technician.name}*, uma nova tarefa requer sua atenção:

🆔 *ID:* ${ticket.id}
📌 *Título:* ${ticket.title}
🏭 *Equipamento:* ${ticket.assetId}
⚠️ *Urgência:* ${ticket.urgency.toUpperCase()}
📝 *Descrição:* ${ticket.description}

Acesse o app para iniciar o atendimento.
    `.trim();

    return NotificationService.sendWhatsApp(technician.phone, message);
  },
};
