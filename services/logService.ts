import { supabase } from '../lib/supabase';

export interface ActivityLog {
    id?: string;
    user_id?: string;
    user_email: string;
    user_name?: string;
    action_type: string;
    entity_type: string;
    entity_id?: string;
    details?: Record<string, any>;
    metadata?: Record<string, any>;
    created_at?: string;
}

export interface LogFilters {
    startDate?: string;
    endDate?: string;
    actionType?: string;
    entityType?: string;
    userEmail?: string;
    search?: string;
}

class LogService {
    /**
     * Registra uma atividade no sistema
     */
    async logActivity(log: Omit<ActivityLog, 'id' | 'created_at' | 'user_id' | 'user_email' | 'user_name'>): Promise<void> {
        try {
            // Obter dados do usuário atual
            const { data: { user } } = await supabase!.auth.getUser();

            if (!user) {
                console.warn('Tentativa de log sem usuário autenticado');
                return;
            }

            // Buscar perfil do usuário
            const { data: profile } = await supabase!
                .from('profiles')
                .select('email, name')
                .eq('id', user.id)
                .single();

            const logData: Omit<ActivityLog, 'id' | 'created_at'> = {
                user_id: user.id,
                user_email: profile?.email || user.email || 'unknown',
                user_name: profile?.name || 'Usuário',
                ...log,
                details: log.details || {},
                metadata: {
                    ...log.metadata,
                    timestamp: new Date().toISOString(),
                    user_agent: navigator.userAgent,
                }
            };

            const { error } = await supabase!
                .from('activity_logs')
                .insert([logData]);

            if (error) {
                console.error('Erro ao registrar log:', error);
            }
        } catch (error) {
            console.error('Erro ao registrar atividade:', error);
        }
    }

    /**
     * Busca logs com filtros e paginação
     */
    async getActivityLogs(
        filters?: LogFilters,
        page: number = 1,
        pageSize: number = 20
    ): Promise<{ logs: ActivityLog[]; total: number }> {
        try {
            let query = supabase!
                .from('activity_logs')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });

            // Aplicar filtros
            if (filters?.startDate) {
                query = query.gte('created_at', filters.startDate);
            }
            if (filters?.endDate) {
                query = query.lte('created_at', filters.endDate);
            }
            if (filters?.actionType) {
                query = query.eq('action_type', filters.actionType);
            }
            if (filters?.entityType) {
                query = query.eq('entity_type', filters.entityType);
            }
            if (filters?.userEmail) {
                query = query.eq('user_email', filters.userEmail);
            }
            if (filters?.search) {
                query = query.or(`details->>'description'.ilike.%${filters.search}%,entity_id.ilike.%${filters.search}%`);
            }

            // Paginação
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;

            return {
                logs: data || [],
                total: count || 0
            };
        } catch (error) {
            console.error('Erro ao buscar logs:', error);
            return { logs: [], total: 0 };
        }
    }

    /**
     * Registra ajuste de estoque
     */
    async logStockAdjustment(
        productCode: string,
        productName: string,
        branch: string,
        oldQuantity: number,
        newQuantity: number,
        reason?: string
    ): Promise<void> {
        await this.logActivity({
            action_type: 'stock_adjustment',
            entity_type: 'stock',
            entity_id: `${productCode}-${branch}`,
            details: {
                product_code: productCode,
                product_name: productName,
                branch,
                old_quantity: oldQuantity,
                new_quantity: newQuantity,
                difference: newQuantity - oldQuantity,
                reason: reason || 'Ajuste manual',
                description: `Estoque de ${productName} (${productCode}) em ${branch}: ${oldQuantity} → ${newQuantity}`
            }
        });
    }

    /**
     * Registra criação de produto
     */
    async logProductCreated(product: any): Promise<void> {
        await this.logActivity({
            action_type: 'product_created',
            entity_type: 'product',
            entity_id: product.code,
            details: {
                product_code: product.code,
                product_name: product.name,
                brand: product.brand,
                category: product.category,
                description: `Produto criado: ${product.name} (${product.code})`
            }
        });
    }

    /**
     * Registra edição de produto
     */
    async logProductUpdated(productCode: string, changes: Record<string, any>): Promise<void> {
        await this.logActivity({
            action_type: 'product_updated',
            entity_type: 'product',
            entity_id: productCode,
            details: {
                product_code: productCode,
                changes,
                description: `Produto ${productCode} atualizado`
            }
        });
    }

    /**
     * Registra exclusão de produto
     */
    async logProductDeleted(productCode: string, productName: string): Promise<void> {
        await this.logActivity({
            action_type: 'product_deleted',
            entity_type: 'product',
            entity_id: productCode,
            details: {
                product_code: productCode,
                product_name: productName,
                description: `Produto excluído: ${productName} (${productCode})`
            }
        });
    }

    /**
     * Registra criação de reserva
     */
    async logReservationCreated(reservation: any): Promise<void> {
        await this.logActivity({
            action_type: 'reservation_created',
            entity_type: 'reservation',
            entity_id: reservation.id,
            details: {
                product_code: reservation.product_code,
                quantity: reservation.quantity,
                branch: reservation.branch,
                reserved_by: reservation.reserved_by_name,
                description: `Reserva criada: ${reservation.quantity}x ${reservation.product_code}`
            }
        });
    }

    /**
     * Registra cancelamento de reserva
     */
    async logReservationCancelled(reservation: any): Promise<void> {
        await this.logActivity({
            action_type: 'reservation_cancelled',
            entity_type: 'reservation',
            entity_id: reservation.id,
            details: {
                product_code: reservation.product_code,
                quantity: reservation.quantity,
                branch: reservation.branch,
                description: `Reserva cancelada: ${reservation.quantity}x ${reservation.product_code}`
            }
        });
    }

    /**
     * Registra processamento de XML
     */
    async logXmlProcessed(
        fileName: string,
        nfeNumber: string,
        operation: 'entry' | 'exit',
        branch: string,
        productsCount: number,
        isTransfer: boolean = false
    ): Promise<void> {
        await this.logActivity({
            action_type: 'xml_processed',
            entity_type: 'xml_upload',
            entity_id: nfeNumber,
            details: {
                file_name: fileName,
                nfe_number: nfeNumber,
                operation: operation === 'entry' ? 'Entrada' : 'Saída',
                branch,
                products_count: productsCount,
                is_transfer: isTransfer,
                description: `XML processado: NFe ${nfeNumber} - ${operation === 'entry' ? 'Entrada' : 'Saída'} de ${productsCount} produtos em ${branch}`
            }
        });
    }

    /**
     * Registra criação de locação
     */
    async logRentalCreated(rental: any): Promise<void> {
        await this.logActivity({
            action_type: 'rental_created',
            entity_type: 'rental',
            entity_id: rental.id,
            details: {
                customer_name: rental.customer_name,
                items_count: rental.items?.length || 0,
                start_date: rental.start_date,
                end_date: rental.end_date,
                description: `Locação criada para ${rental.customer_name}`
            }
        });
    }

    /**
     * Registra finalização de locação
     */
    async logRentalCompleted(rentalId: string, customerName: string): Promise<void> {
        await this.logActivity({
            action_type: 'rental_completed',
            entity_type: 'rental',
            entity_id: rentalId,
            details: {
                customer_name: customerName,
                description: `Locação finalizada: ${customerName}`
            }
        });
    }

    /**
     * Verifica se o usuário atual pode ver logs
     */
    async canViewLogs(): Promise<boolean> {
        try {
            const { data: { user } } = await supabase!.auth.getUser();
            if (!user) return false;

            const { data: profile } = await supabase!
                .from('profiles')
                .select('email')
                .eq('id', user.id)
                .single();

            if (!profile?.email) return false;

            // Check if user is in the master users list
            const { isMasterUser } = await import('../config/masterUsers');
            return isMasterUser(profile.email);
        } catch (error) {
            console.error('Erro ao verificar permissão de logs:', error);
            return false;
        }
    }
}

export const logService = new LogService();
