import { supabase } from '../lib/supabase';
import { Supplier } from '../types';

export const supplierService = {
    async getAllSuppliers(): Promise<Supplier[]> {
        if (!supabase) {
            // Mock data fallback
            return [
                { id: '1', name: 'Aputure Brasil', brands: ['Aputure'], cnpj: '12.345.678/0001-90', email: 'vendas@aputure.com' },
                { id: '2', name: 'Sony Professional', brands: ['Sony'], cnpj: '98.765.432/0001-21', email: 'vendas@sony.com' }
            ];
        }

        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching suppliers:', error);
            return [];
        }

        return data || [];
    },

    async createSupplier(supplier: Omit<Supplier, 'id' | 'created_at'>): Promise<Supplier | null> {
        if (!supabase) return { ...supplier, id: Math.random().toString() } as Supplier;

        const { data, error } = await supabase
            .from('suppliers')
            .insert([supplier])
            .select()
            .single();

        if (error) {
            console.error('Error creating supplier:', error);
            return null;
        }

        return data;
    },

    async updateSupplier(id: string, updates: Partial<Supplier>): Promise<boolean> {
        if (!supabase) return true;

        const { error } = await supabase
            .from('suppliers')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Error updating supplier:', error);
            return false;
        }

        return true;
    },

    async deleteSupplier(id: string): Promise<boolean> {
        if (!supabase) return true;

        const { error } = await supabase
            .from('suppliers')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting supplier:', error);
            return false;
        }

        return true;
    }
};
