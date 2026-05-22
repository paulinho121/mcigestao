import { supabase } from '../lib/supabase';
import { PreSale, PreSaleAlert } from '../types';

export const preSaleService = {
    async getAll(): Promise<PreSale[]> {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('pre_sales')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data ?? [];
    },

    async create(payload: Omit<PreSale, 'id' | 'created_at' | 'updated_at' | 'fulfilled_at'>): Promise<PreSale> {
        if (!supabase) throw new Error('Supabase não configurado');
        const { data, error } = await supabase
            .from('pre_sales')
            .insert([{ ...payload, status: 'pending' }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async update(id: string, payload: Partial<PreSale>): Promise<void> {
        if (!supabase) throw new Error('Supabase não configurado');
        const { error } = await supabase
            .from('pre_sales')
            .update(payload)
            .eq('id', id);
        if (error) throw error;
    },

    async markFulfilled(id: string): Promise<void> {
        if (!supabase) throw new Error('Supabase não configurado');
        const { error } = await supabase
            .from('pre_sales')
            .update({ status: 'fulfilled', fulfilled_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
        // Marca alertas relacionados como lidos
        await supabase
            .from('pre_sale_alerts')
            .update({ is_read: true })
            .eq('pre_sale_id', id);
    },

    async markCancelled(id: string): Promise<void> {
        if (!supabase) throw new Error('Supabase não configurado');
        const { error } = await supabase
            .from('pre_sales')
            .update({ status: 'cancelled' })
            .eq('id', id);
        if (error) throw error;
        await supabase
            .from('pre_sale_alerts')
            .update({ is_read: true })
            .eq('pre_sale_id', id);
    },

    // Chamado quando um produto entra em estoque — verifica pré-vendas pendentes
    async checkAndCreateAlerts(productId: string, productName: string, stockDelta: number): Promise<number> {
        if (!supabase) return 0;
        const { data: pending, error } = await supabase
            .from('pre_sales')
            .select('id')
            .eq('product_id', productId)
            .eq('status', 'pending');
        if (error || !pending?.length) return 0;

        // Cria alertas e atualiza status para 'stock_arrived'
        const alerts = pending.map((ps) => ({
            pre_sale_id: ps.id,
            product_id: productId,
            product_name: productName,
            stock_delta: stockDelta,
            is_read: false,
        }));
        await supabase.from('pre_sale_alerts').insert(alerts);
        await supabase
            .from('pre_sales')
            .update({ status: 'stock_arrived' })
            .in('id', pending.map((ps) => ps.id));
        return pending.length;
    },

    async getUnreadAlerts(): Promise<PreSaleAlert[]> {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('pre_sale_alerts')
            .select('*, pre_sale:pre_sales(*)')
            .eq('is_read', false)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data ?? [];
    },

    async markAlertRead(alertId: string): Promise<void> {
        if (!supabase) return;
        await supabase.from('pre_sale_alerts').update({ is_read: true }).eq('id', alertId);
    },

    async markAllAlertsRead(): Promise<void> {
        if (!supabase) return;
        await supabase.from('pre_sale_alerts').update({ is_read: true }).eq('is_read', false);
    },
};
