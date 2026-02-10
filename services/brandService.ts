import { supabase } from '../lib/supabase';

export interface Brand {
    id: string;
    name: string;
    logo_url?: string;
    created_at?: string;
}

export const brandService = {
    async getAllBrands(): Promise<Brand[]> {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('brands')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching brands:', error);
            return [];
        }
        return data || [];
    },

    async createBrand(brand: Omit<Brand, 'id' | 'created_at'>): Promise<Brand | null> {
        if (!supabase) return null;
        const { data, error } = await supabase
            .from('brands')
            .insert([brand])
            .select()
            .single();

        if (error) {
            console.error('Error creating brand:', error);
            return null;
        }
        return data;
    },

    async updateBrand(id: string, updates: Partial<Brand>): Promise<boolean> {
        if (!supabase) return false;
        const { error } = await supabase
            .from('brands')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Error updating brand:', error);
            return false;
        }
        return true;
    },

    async deleteBrand(id: string): Promise<boolean> {
        if (!supabase) return false;
        const { error } = await supabase
            .from('brands')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting brand:', error);
            return false;
        }
        return true;
    }
};
