import { supabase } from '../lib/supabase';
import { SeasonalBackground } from '../types';

/**
 * Service for managing seasonal backgrounds
 */
export const seasonalService = {
    /**
     * Get the currently active seasonal background based on current date
     */
    async getActiveBackground(): Promise<SeasonalBackground | null> {
        if (!supabase) return null;

        try {
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('seasonal_backgrounds')
                .select('*')
                .eq('is_active', true)
                .lte('start_date', today)
                .gte('end_date', today)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows returned - no active background
                    return null;
                }
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error fetching active background:', error);
            return null;
        }
    },

    /**
     * Get all seasonal backgrounds (for management UI)
     */
    async getAllBackgrounds(): Promise<SeasonalBackground[]> {
        if (!supabase) return [];

        try {
            const { data, error } = await supabase
                .from('seasonal_backgrounds')
                .select('*')
                .order('start_date', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching all backgrounds:', error);
            return [];
        }
    },

    /**
     * Create a new seasonal background
     */
    async createBackground(backgroundData: Omit<SeasonalBackground, 'id' | 'created_at' | 'updated_at'>): Promise<SeasonalBackground | null> {
        if (!supabase) return null;

        try {
            const { data, error } = await supabase
                .from('seasonal_backgrounds')
                .insert([backgroundData])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating background:', error);
            return null;
        }
    },

    /**
     * Update an existing seasonal background
     */
    async updateBackground(id: string, updates: Partial<SeasonalBackground>): Promise<SeasonalBackground | null> {
        if (!supabase) return null;

        try {
            const { data, error } = await supabase
                .from('seasonal_backgrounds')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating background:', error);
            return null;
        }
    },

    /**
     * Delete a seasonal background
     */
    async deleteBackground(id: string): Promise<boolean> {
        if (!supabase) return false;

        try {
            const { error } = await supabase
                .from('seasonal_backgrounds')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting background:', error);
            return false;
        }
    },

    /**
     * Upload a background image to Supabase Storage
     */
    async uploadBackgroundImage(file: File): Promise<string | null> {
        if (!supabase) return null;

        try {
            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('seasonal-backgrounds')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data } = supabase.storage
                .from('seasonal-backgrounds')
                .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (error) {
            console.error('Error uploading background image:', error);
            return null;
        }
    },

    /**
     * Delete a background image from Supabase Storage
     */
    async deleteBackgroundImage(url: string): Promise<boolean> {
        if (!supabase) return false;

        try {
            // Extract file path from URL
            const urlParts = url.split('/');
            const fileName = urlParts[urlParts.length - 1];

            const { error } = await supabase.storage
                .from('seasonal-backgrounds')
                .remove([fileName]);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting background image:', error);
            return false;
        }
    }
};
