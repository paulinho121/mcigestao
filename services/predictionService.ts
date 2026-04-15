import { supabase } from '../lib/supabase';
import { inventoryService } from './inventoryService';
import { whatsappService } from './whatsappService';

export interface StockPrediction {
  productId: string;
  productName: string;
  branch: string;
  currentStock: number;
  averageDailySales: number;
  daysRemaining: number;
  status: 'stable' | 'warning' | 'critical';
}

export const predictionService = {
  /**
   * Calculates stock prediction based on historical movements
   */
  async getPredictions(branch: 'CE' | 'SC' | 'SP'): Promise<StockPrediction[]> {
    if (!supabase) return [];

    // 1. Get current products for this branch
    const products = await inventoryService.getProductsByBranch(branch);
    
    // 2. Fetch last 60 days of logs for this branch
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: logs, error } = await supabase
      .from('activity_logs')
      .select('details')
      .eq('action_type', 'stock_adjustment')
      .eq('details->>branch', branch)
      .gte('created_at', sixtyDaysAgo.toISOString());

    if (error) {
      console.error('Error fetching logs for prediction:', error);
      return [];
    }

    // 3. Aggregate exits per product
    const exitMap = new Map<string, number>();
    logs?.forEach(log => {
      const details = log.details;
      const diff = Number(details.difference || 0);
      if (diff < 0) { // It's an exit or sale
        const productId = details.product_code;
        exitMap.set(productId, (exitMap.get(productId) || 0) + Math.abs(diff));
      }
    });

    // 4. Calculate predictions
    const predictions: StockPrediction[] = products.map(prod => {
      const totalExits = exitMap.get(prod.id) || 0;
      const ads = totalExits / 60; // Average Daily Sales
      const currentStock = branch === 'CE' ? prod.stock_ce : (branch === 'SP' ? prod.stock_sp : prod.stock_sc);
      
      let daysRemaining = Infinity;
      if (ads > 0) {
        daysRemaining = currentStock / ads;
      }

      let status: 'stable' | 'warning' | 'critical' = 'stable';
      if (daysRemaining <= 7) status = 'critical';
      else if (daysRemaining <= 15) status = 'warning';

      return {
        productId: prod.id,
        productName: prod.name,
        branch,
        currentStock,
        averageDailySales: ads,
        daysRemaining: Math.round(daysRemaining),
        status
      };
    });

    return predictions.sort((a, b) => a.daysRemaining - b.daysRemaining);
  },

  /**
   * Periodically check for critical stock and notify team
   */
  async checkAndNotifyCriticalStock(branch: 'CE' | 'SP' | 'SC') {
    const predictions = await this.getPredictions(branch);
    const criticalItems = predictions.filter(p => p.status === 'critical');

    if (criticalItems.length > 0) {
      const alertMessage = this.formatCriticalStockMessage(criticalItems, branch);
      await whatsappService.notifySalesTeam([], branch); // We reuse the service
      // In a real implementation, we'd add a specific method for critical alerts
      console.log(`⚠️ ALERTA DE ESTOQUE CRÍTICO (${branch}):`, alertMessage);
    }
  },

  formatCriticalStockMessage(items: StockPrediction[], branch: string) {
    let msg = `*⚠️ ALERTA: ESTOQUE CRÍTICO (${branch})* \n\n`;
    msg += `Os seguintes itens podem esgotar em menos de 7 dias:\n\n`;
    
    items.forEach(item => {
      msg += `🔴 *${item.productName}*\n`;
      msg += `🔹 Saldo: ${item.currentStock} | Previsão: ${item.daysRemaining} dias\n`;
      msg += `--------------------------\n`;
    });
    
    msg += `\n📢 *Sugestão:* Providenciar transferência ou nova compra urgente.`;
    return msg;
  }
};
