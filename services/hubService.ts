import { supabase } from '../lib/supabase';

// =====================================================
// TIPOS
// =====================================================

export interface HubCompany {
    id: string;
    auth_user_id: string | null;
    name: string;
    fantasy_name: string;
    email: string;
    phone?: string;
    city?: string;
    state?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface HubProduct {
    id: string;
    company_id: string;
    product_code: string;
    product_name: string;
    brand?: string;
    quantity_available: number;
    quantity_total: number;
    description?: string;
    image_url?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // Joined
    company?: Pick<HubCompany, 'id' | 'fantasy_name' | 'city' | 'state'>;
}

export type HubRequestStatus =
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'in_transit'
    | 'delivered'
    | 'cancelled';

export interface HubReservationRequest {
    id: string;
    requesting_company_id: string;
    providing_company_id: string;
    hub_product_id: string;
    product_name: string;
    product_code: string;
    quantity_requested: number;
    status: HubRequestStatus;
    notes?: string;
    admin_notes?: string;
    requested_at: string;
    updated_at: string;
    // Joined
    requesting_company?: Pick<HubCompany, 'id' | 'fantasy_name' | 'city' | 'state'>;
    providing_company?: Pick<HubCompany, 'id' | 'fantasy_name' | 'city' | 'state'>;
}

// =====================================================
// HUB AUTH — Identidade da locadora logada
// =====================================================

let _currentHubCompany: HubCompany | null = null;
let _isHubAdmin = false;

/** Verifica se a sessão atual pertence a um super admin do HUB (master do sistema principal) */
export function isHubAdmin(): boolean {
    return _isHubAdmin;
}

/** Retorna a locadora vinculada ao usuário Supabase logado.
 *  Usuários master (is_master = true em profiles) entram como super admin do HUB.
 */
export async function getMyHubCompany(): Promise<HubCompany | null> {
    if (_currentHubCompany) return _currentHubCompany;
    if (!supabase) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // ── Verifica se é super admin (master do sistema principal) ──
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_master, name, email')
        .eq('id', user.id)
        .single();

    if (profile?.is_master) {
        _isHubAdmin = true;
        _currentHubCompany = {
            id: '00000000-0000-0000-0000-000000000001',
            auth_user_id: user.id,
            name: profile.name || 'MCI',
            fantasy_name: profile.name || 'MCI Hub',
            email: profile.email || user.email || '',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        } as HubCompany;
        return _currentHubCompany;
    }

    // ── Usuário locadora normal ──
    const { data, error } = await supabase
        .from('hub_companies')
        .select('*')
        .eq('auth_user_id', user.id)
        .eq('is_active', true)
        .single();

    if (error || !data) return null;
    _isHubAdmin = false;
    _currentHubCompany = data as HubCompany;
    return _currentHubCompany;
}

/** Limpa o cache da empresa ao fazer logout */
export function clearHubCompanyCache() {
    _currentHubCompany = null;
    _isHubAdmin = false;
}

// =====================================================
// COMPANIES
// =====================================================

/** Lista todas as empresas ativas (para o catálogo) */
export async function listHubCompanies(): Promise<HubCompany[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('hub_companies')
        .select('*')
        .eq('is_active', true)
        .order('fantasy_name');

    if (error) {
        console.error('[HUB] listHubCompanies error:', error);
        return [];
    }
    return (data as HubCompany[]) || [];
}

/** Cria uma nova empresa locadora (apenas master) */
export async function createHubCompany(
    payload: Omit<HubCompany, 'id' | 'auth_user_id' | 'is_active' | 'created_at' | 'updated_at'>
): Promise<HubCompany | null> {
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('hub_companies')
        .insert([{ ...payload, is_active: true }])
        .select()
        .single();

    if (error) {
        console.error('[HUB] createHubCompany error:', error);
        return null;
    }
    return data as HubCompany;
}

/** Atualiza empresa (master ou a própria locadora) */
export async function updateHubCompany(
    id: string,
    updates: Partial<HubCompany>
): Promise<boolean> {
    if (!supabase) return false;
    const { error } = await supabase
        .from('hub_companies')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error('[HUB] updateHubCompany error:', error);
        return false;
    }
    return true;
}

// =====================================================
// HUB PRODUCTS
// =====================================================

/** Lista todos os produtos disponíveis de todas as locadoras (catálogo global) */
export async function listAllHubProducts(): Promise<HubProduct[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('hub_products')
        .select(`
      *,
      company:hub_companies(id, fantasy_name, city, state)
    `)
        .eq('is_active', true)
        .gt('quantity_available', 0)
        .order('product_name');

    if (error) {
        console.error('[HUB] listAllHubProducts error:', error);
        return [];
    }
    return (data as HubProduct[]) || [];
}

/** Lista apenas os produtos da minha empresa (meu estoque) */
export async function listMyHubProducts(companyId: string): Promise<HubProduct[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('hub_products')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('product_name');

    if (error) {
        console.error('[HUB] listMyHubProducts error:', error);
        return [];
    }
    return (data as HubProduct[]) || [];
}

/** Cria um produto no catálogo da minha empresa */
export async function createHubProduct(
    payload: Omit<HubProduct, 'id' | 'is_active' | 'created_at' | 'updated_at' | 'company'>
): Promise<HubProduct | null> {
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('hub_products')
        .insert([{ ...payload, is_active: true }])
        .select()
        .single();

    if (error) {
        console.error('[HUB] createHubProduct error:', error);
        return null;
    }
    return data as HubProduct;
}

/** Atualiza um produto */
export async function updateHubProduct(
    id: string,
    updates: Partial<HubProduct>
): Promise<boolean> {
    if (!supabase) return false;
    const { error } = await supabase
        .from('hub_products')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error('[HUB] updateHubProduct error:', error);
        return false;
    }
    return true;
}

/** Desativa (soft delete) um produto */
export async function deleteHubProduct(id: string): Promise<boolean> {
    return updateHubProduct(id, { is_active: false });
}

// =====================================================
// HUB RESERVATION REQUESTS
// =====================================================

/** Cria uma solicitação de reserva */
export async function createHubRequest(
    payload: Omit<HubReservationRequest, 'id' | 'status' | 'admin_notes' | 'requested_at' | 'updated_at' | 'requesting_company' | 'providing_company'>
): Promise<HubReservationRequest | null> {
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('hub_reservation_requests')
        .insert([{ ...payload, status: 'pending' }])
        .select()
        .single();

    if (error) {
        console.error('[HUB] createHubRequest error:', error);
        return null;
    }
    return data as HubReservationRequest;
}

/** Lista solicitações que EU FIZ (como solicitante) */
export async function listMyOutgoingRequests(companyId: string): Promise<HubReservationRequest[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('hub_reservation_requests')
        .select(`
      *,
      providing_company:hub_companies!providing_company_id(id, fantasy_name, city, state)
    `)
        .eq('requesting_company_id', companyId)
        .order('requested_at', { ascending: false });

    if (error) {
        console.error('[HUB] listMyOutgoingRequests error:', error);
        return [];
    }
    return (data as HubReservationRequest[]) || [];
}

/** Lista solicitações que RECEBI (como fornecedora) */
export async function listMyIncomingRequests(companyId: string): Promise<HubReservationRequest[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('hub_reservation_requests')
        .select(`
      *,
      requesting_company:hub_companies!requesting_company_id(id, fantasy_name, city, state)
    `)
        .eq('providing_company_id', companyId)
        .order('requested_at', { ascending: false });

    if (error) {
        console.error('[HUB] listMyIncomingRequests error:', error);
        return [];
    }
    return (data as HubReservationRequest[]) || [];
}

/** Lista TODAS as solicitações (apenas admin MCI) */
export async function listAllHubRequests(): Promise<HubReservationRequest[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('hub_reservation_requests')
        .select(`
      *,
      requesting_company:hub_companies!requesting_company_id(id, fantasy_name, city, state),
      providing_company:hub_companies!providing_company_id(id, fantasy_name, city, state)
    `)
        .order('requested_at', { ascending: false });

    if (error) {
        console.error('[HUB] listAllHubRequests error:', error);
        return [];
    }
    return (data as HubReservationRequest[]) || [];
}

/** Atualiza o status de uma solicitação (admin MCI) */
export async function updateHubRequestStatus(
    id: string,
    status: HubRequestStatus,
    adminNotes?: string
): Promise<boolean> {
    if (!supabase) return false;
    const updates: Partial<HubReservationRequest> = { status };
    if (adminNotes !== undefined) updates.admin_notes = adminNotes;

    const { error } = await supabase
        .from('hub_reservation_requests')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error('[HUB] updateHubRequestStatus error:', error);
        return false;
    }
    return true;
}

/** Cancela uma solicitação (pela própria locadora solicitante) */
export async function cancelHubRequest(id: string): Promise<boolean> {
    return updateHubRequestStatus(id, 'cancelled');
}

// =====================================================
// HELPERS
// =====================================================

export const HUB_STATUS_LABELS: Record<HubRequestStatus, string> = {
    pending: 'Aguardando MCI',
    approved: 'Aprovado',
    rejected: 'Recusado',
    in_transit: 'Em Trânsito',
    delivered: 'Entregue',
    cancelled: 'Cancelado',
};

export const HUB_STATUS_COLORS: Record<HubRequestStatus, string> = {
    pending: '#f59e0b',
    approved: '#3b82f6',
    rejected: '#ef4444',
    in_transit: '#8b5cf6',
    delivered: '#10b981',
    cancelled: '#6b7280',
};
