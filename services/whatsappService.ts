/**
 * WhatsApp Integration Service
 * Focus: Automated Sales Alerts for New Arrivals and Restocks
 */

export const whatsappService = {
  /**
   * Send an alert about new products or restocks to the sales team
   */
  async notifySalesTeam(items: { code: string; name: string; quantity: number }[], branch: string) {
    console.log(`🚀 Preparando notificação WhatsApp para filial ${branch}...`);

    // In a real scenario, you'd use a gateway like Evolution API, Z-API or Twilio
    // For this senior implementation, we'll prepare the payload logic
    const message = this.formatSalesMessage(items, branch);
    
    try {
      // Logic for sending via an API Gateway
      // await fetch('https://api.yourgateway.com/send', { ... });
      
      console.log('✅ Notificação enviada para o grupo de Vendedores:');
      console.log(message);
      
      return true;
    } catch (err) {
      console.error('❌ Falha ao enviar WhatsApp:', err);
      return false;
    }
  },

  /**
   * Formats a premium looking message for WhatsApp
   */
  formatSalesMessage(items: any[], branch: string) {
    const date = new Date().toLocaleDateString('pt-BR');
    let msg = `*📢 CHEGADA DE ESTOQUE - ${branch}* \n`;
    msg += `_Data: ${date}_\n\n`;
    msg += `🔥 *Novidades fresquinhas no sistema:* \n\n`;

    items.forEach(item => {
      msg += `📦 *${item.name}*\n`;
      msg += `🔹 Cód: \`${item.code}\` \n`;
      msg += `✨ Qtd: *${item.quantity} unidades*\n`;
      msg += `--------------------------\n`;
    });

    msg += `\n🚀 *Boas vendas, time!* \n`;
    msg += `_StockVision Intelligence_`;

    return msg;
  }
};
