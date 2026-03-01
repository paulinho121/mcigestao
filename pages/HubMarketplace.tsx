import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { inventoryService } from '../services/inventoryService';
import { Product } from '../types';
import {
    HubCompany,
    HubProduct,
    HubReservationRequest,
    HUB_STATUS_LABELS,
    HUB_STATUS_COLORS,
    listAllHubProducts,
    listMyHubProducts,
    createHubProduct,
    updateHubProduct,
    deleteHubProduct,
    listMyOutgoingRequests,
    listMyIncomingRequests,
    createHubRequest,
    cancelHubRequest,
    isHubAdmin,
    listAllHubRequests,
    updateHubRequestStatus,
    HubRequestStatus,
} from '../services/hubService';

// =====================================================
// TYPES
// =====================================================
type HubTab = 'catalog' | 'my_stock' | 'my_requests' | 'incoming' | 'admin_requests';

interface HubMarketplaceProps {
    company: HubCompany;
    isMasterUser: boolean;
    onLogout: () => void;
}

// =====================================================
// MODAL — PRODUCT FORM
// =====================================================
function ProductFormModal({
    companyId,
    product,
    onClose,
    onSaved,
}: {
    companyId: string;
    product?: HubProduct;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [form, setForm] = useState({
        product_code: product?.product_code || '',
        product_name: product?.product_name || '',
        brand: product?.brand || '',
        quantity_total: product?.quantity_total ?? 0,
        quantity_available: product?.quantity_available ?? 0,
        description: product?.description || '',
        image_url: product?.image_url || '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Busca de produtos do sistema principal
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = async (val: string) => {
        setSearchQuery(val);
        if (!val.trim()) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }
        setIsSearching(true);
        setShowDropdown(true);
        const results = await inventoryService.searchProducts(val);
        setSearchResults(results);
        setIsSearching(false);
    };

    const selectProduct = (p: Product) => {
        setForm(f => ({
            ...f,
            product_code: p.id,
            product_name: p.name,
            brand: p.brand || '',
            image_url: p.image_url || '',
        }));
        setSearchQuery('');
        setSearchResults([]);
        setShowDropdown(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const finalData = {
            ...form,
            quantity_total: form.quantity_available, // Espelha o disponível para consistência
            company_id: companyId
        };

        let ok: boolean | HubProduct | null;
        if (product) {
            ok = await updateHubProduct(product.id, finalData);
        } else {
            ok = await createHubProduct(finalData);
        }

        if (!ok) {
            setError('Erro ao salvar produto. Verifique as permissões.');
        } else {
            onSaved();
            onClose();
        }
        setLoading(false);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px',
        }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{
                background: 'white',
                borderRadius: '20px',
                width: '100%', maxWidth: '520px',
                boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
                overflow: 'hidden',
                animation: 'slideUp 0.3s ease-out',
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '24px 28px',
                    color: 'white',
                }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                        {product ? '✏️ Editar Produto' : '➕ Novo Produto'}
                    </h2>
                    <p style={{ margin: '4px 0 0', opacity: 0.8, fontSize: '13px' }}>
                        Preencha os dados do produto para o catálogo HUB
                    </p>
                </div>
                <form onSubmit={handleSubmit} style={{ padding: '28px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                        {/* BUSCA NO SISTEMA PRINCIPAL */}
                        {!product && (
                            <div style={{ gridColumn: '1 / -1', position: 'relative' }} ref={searchRef}>
                                <label style={{ ...labelStyle, color: '#7c3aed' }}>Importar do Estoque Padrão (Opcional)</label>
                                <div style={{ position: 'relative' }}>
                                    <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
                                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                    <input
                                        style={{ ...inputStyle, paddingLeft: '36px', borderColor: '#d8b4fe', background: '#faf5ff' }}
                                        value={searchQuery}
                                        onChange={e => handleSearch(e.target.value)}
                                        onFocus={() => { if (searchQuery) setShowDropdown(true); }}
                                        placeholder="Digite o código ou nome para buscar..."
                                    />
                                    {isSearching && (
                                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#6b7280' }}>Buscando...</div>
                                    )}
                                </div>

                                {showDropdown && searchResults.length > 0 && (
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, right: 0,
                                        background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px',
                                        marginTop: '4px', maxHeight: '200px', overflowY: 'auto',
                                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 10,
                                    }}>
                                        {searchResults.map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => selectProduct(p)}
                                                style={{
                                                    padding: '10px 14px', borderBottom: '1px solid #f3f4f6',
                                                    cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px',
                                                }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#f9fafb'; }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'white'; }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <strong style={{ fontSize: '13px', color: '#1e1b4b' }}>{p.id} — {p.name}</strong>
                                                    <span style={{ fontSize: '12px', color: '#059669', fontWeight: 'bold' }}>{p.total} no total</span>
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#6b7280' }}>{p.brand}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Código do Produto *</label>
                            <input
                                style={inputStyle}
                                value={form.product_code}
                                onChange={e => setForm(f => ({ ...f, product_code: e.target.value }))}
                                placeholder="Ex: 4303, 300C"
                                required
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Nome do Produto *</label>
                            <input
                                style={inputStyle}
                                value={form.product_name}
                                onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))}
                                placeholder="Ex: Amaram 300C"
                                required
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Marca</label>
                            <input
                                style={inputStyle}
                                value={form.brand}
                                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                                placeholder="Ex: Amaram"
                            />
                        </div>

                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Qtd. Disponível para Reserva *</label>
                            <input
                                type="number"
                                style={inputStyle}
                                value={form.quantity_available}
                                min={0}
                                onChange={e => setForm(f => ({ ...f, quantity_available: parseInt(e.target.value) || 0 }))}
                                required
                            />
                            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                                Quantidade que pode ser reservada por outras locadoras
                            </p>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Descrição / Observações</label>
                            <textarea
                                style={{ ...inputStyle, height: '80px', resize: 'vertical' }}
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Condições, especificações, observações..."
                            />
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            background: '#fef2f2', border: '1px solid #fecaca',
                            borderRadius: '10px', padding: '12px 16px',
                            color: '#dc2626', fontSize: '13px', marginTop: '16px',
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                        <button type="button" onClick={onClose} style={btnSecondaryStyle}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} style={{
                            ...btnPrimaryStyle,
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}>
                            {loading ? 'Salvando...' : (product ? 'Salvar Alterações' : 'Adicionar Produto')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// =====================================================
// MODAL — REQUEST RESERVATION
// =====================================================
function RequestModal({
    product,
    myCompany,
    onClose,
    onRequested,
}: {
    product: HubProduct;
    myCompany: HubCompany;
    onClose: () => void;
    onRequested: () => void;
}) {
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (quantity < 1 || quantity > product.quantity_available) {
            setError(`Quantidade deve ser entre 1 e ${product.quantity_available}.`);
            return;
        }
        setLoading(true);
        setError('');

        const req = await createHubRequest({
            requesting_company_id: myCompany.id,
            providing_company_id: product.company_id,
            hub_product_id: product.id,
            product_name: product.product_name,
            product_code: product.product_code,
            quantity_requested: quantity,
            notes,
        });

        if (!req) {
            setError('Erro ao enviar solicitação. Tente novamente.');
        } else {
            onRequested();
            onClose();
        }
        setLoading(false);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px',
        }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{
                background: 'white',
                borderRadius: '20px',
                width: '100%', maxWidth: '480px',
                boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
                overflow: 'hidden',
                animation: 'slideUp 0.3s ease-out',
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    padding: '24px 28px',
                    color: 'white',
                }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                        📋 Solicitar Reserva
                    </h2>
                    <p style={{ margin: '6px 0 0', opacity: 0.85, fontSize: '14px' }}>
                        {product.product_code} — {product.product_name}
                    </p>
                </div>

                <div style={{ padding: '28px' }}>
                    {/* Product info */}
                    <div style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '24px',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#374151' }}>
                            <span>Disponível:</span>
                            <strong style={{ color: '#059669' }}>{product.quantity_available} unidades</strong>
                        </div>
                        {product.brand && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#374151', marginTop: '6px' }}>
                                <span>Marca:</span>
                                <strong>{product.brand}</strong>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#374151', marginTop: '6px' }}>
                            <span>Locadora:</span>
                            <strong style={{ color: '#7c3aed' }}>Parceira HUB</strong>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Quantidade Solicitada *</label>
                            <input
                                type="number"
                                style={inputStyle}
                                value={quantity}
                                min={1}
                                max={product.quantity_available}
                                onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                                required
                            />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Observações (opcional)</label>
                            <textarea
                                style={{ ...inputStyle, height: '80px', resize: 'vertical' }}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Prazo necessário, destino, outras informações..."
                            />
                        </div>

                        <div style={{
                            background: '#fffbeb', border: '1px solid #fde68a',
                            borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
                            fontSize: '13px', color: '#92400e',
                        }}>
                            ℹ️ Após a solicitação, a MCI entrará em contato para organizar a retirada e entrega.
                        </div>

                        {error && (
                            <div style={{
                                background: '#fef2f2', border: '1px solid #fecaca',
                                borderRadius: '10px', padding: '12px 16px', marginBottom: '16px',
                                color: '#dc2626', fontSize: '13px',
                            }}>⚠️ {error}</div>
                        )}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="button" onClick={onClose} style={btnSecondaryStyle}>Cancelar</button>
                            <button type="submit" disabled={loading} style={{
                                ...btnPrimaryStyle,
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                boxShadow: '0 4px 15px rgba(16,185,129,0.4)',
                                opacity: loading ? 0.7 : 1,
                                cursor: loading ? 'not-allowed' : 'pointer',
                            }}>
                                {loading ? 'Enviando...' : '📤 Enviar Solicitação'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// =====================================================
// MAIN COMPONENT
// =====================================================
export function HubMarketplace({ company, onLogout }: HubMarketplaceProps) {
    const [activeTab, setActiveTab] = useState<HubTab>('catalog');
    const [catalogProducts, setCatalogProducts] = useState<HubProduct[]>([]);
    const [myProducts, setMyProducts] = useState<HubProduct[]>([]);
    const [outgoingRequests, setOutgoingRequests] = useState<HubReservationRequest[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<HubReservationRequest[]>([]);
    const [allRequests, setAllRequests] = useState<HubReservationRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchCatalog, setSearchCatalog] = useState('');

    // Modals
    const [showProductForm, setShowProductForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<HubProduct | undefined>();
    const [requestProduct, setRequestProduct] = useState<HubProduct | null>(null);

    // Toast
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const loadCatalog = useCallback(async () => {
        setLoading(true);
        const all = await listAllHubProducts();
        // Filter out own products from catalog
        setCatalogProducts(all.filter(p => p.company_id !== company.id));
        setLoading(false);
    }, [company.id]);

    const loadMyStock = useCallback(async () => {
        const mine = await listMyHubProducts(company.id);
        setMyProducts(mine);
    }, [company.id]);

    const loadRequests = useCallback(async () => {
        const [out, inc] = await Promise.all([
            listMyOutgoingRequests(company.id),
            listMyIncomingRequests(company.id),
        ]);
        setOutgoingRequests(out);
        setIncomingRequests(inc);

        if (isHubAdmin()) {
            const all = await listAllHubRequests();
            setAllRequests(all);
        }
    }, [company.id]);

    useEffect(() => {
        loadCatalog();
        loadMyStock();
        loadRequests();
    }, [loadCatalog, loadMyStock, loadRequests]);

    const handleDeleteProduct = async (id: string) => {
        if (!window.confirm('Desativar este produto do catálogo?')) return;
        const ok = await deleteHubProduct(id);
        if (ok) {
            showToast('Produto removido do catálogo.');
            loadMyStock();
        } else {
            showToast('Erro ao remover produto.', 'error');
        }
    };

    const handleCancelRequest = async (id: string) => {
        if (!window.confirm('Cancelar esta solicitação?')) return;
        const ok = await cancelHubRequest(id);
        if (ok) {
            showToast('Solicitação cancelada.');
            loadRequests();
        } else {
            showToast('Erro ao cancelar.', 'error');
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: HubRequestStatus) => {
        const notes = window.prompt('Observações da MCI (opcional):');
        if (notes === null) return; // cancelled prompt

        const ok = await updateHubRequestStatus(id, newStatus, notes || undefined);
        if (ok) {
            showToast('Status atualizado com sucesso.');
            loadRequests();
        } else {
            showToast('Erro ao atualizar status.', 'error');
        }
    };

    const handleLogout = async () => {
        if (supabase) await supabase.auth.signOut();
        onLogout();
    };

    const filteredCatalog = catalogProducts.filter(p =>
        !searchCatalog ||
        p.product_name.toLowerCase().includes(searchCatalog.toLowerCase()) ||
        p.product_code.toLowerCase().includes(searchCatalog.toLowerCase()) ||
        (p.brand || '').toLowerCase().includes(searchCatalog.toLowerCase())
    );

    const pendingIncoming = incomingRequests.filter(r => r.status === 'pending').length;

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(160deg, #f0f4ff 0%, #faf5ff 50%, #f0fdf4 100%)',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
        }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(100px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .hub-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(102,126,234,0.2) !important;
        }
        .hub-tab-active {
          background: white !important;
          color: #7c3aed !important;
          box-shadow: 0 2px 12px rgba(124,58,237,0.15) !important;
        }
        .hub-product-card:hover { transform: translateY(-3px); box-shadow: 0 16px 48px rgba(0,0,0,0.12) !important; }
      `}</style>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
                    padding: '14px 20px',
                    background: toast.type === 'success' ? '#10b981' : '#ef4444',
                    color: 'white', borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    animation: 'toastIn 0.3s ease-out',
                    fontSize: '14px', fontWeight: '600',
                    display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                    {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
                </div>
            )}

            {/* Header */}
            <header style={{
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(102,126,234,0.15)',
                position: 'sticky', top: 0, zIndex: 100,
                boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
            }}>
                <div style={{
                    maxWidth: '1280px', margin: '0 auto',
                    padding: '12px 24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '16px', flexWrap: 'wrap',
                }}>
                    {/* Brand */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px', height: '40px',
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            borderRadius: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(102,126,234,0.35)',
                        }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                        </div>
                        <div>
                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e1b4b', letterSpacing: '-0.3px' }}>HUB MCI</div>
                            <div style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                Portal Locadoras
                            </div>
                        </div>
                    </div>

                    {/* Company info */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '16px',
                        background: 'rgba(124,58,237,0.06)',
                        borderRadius: '12px', padding: '8px 16px',
                        border: '1px solid rgba(124,58,237,0.12)',
                    }}>
                        <div>
                            <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1' }}>Logado como</div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e1b4b', marginTop: '2px' }}>
                                {company.fantasy_name}
                            </div>
                        </div>
                        {company.city && (
                            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                📍 {company.city}/{company.state}
                            </div>
                        )}
                        <button onClick={handleLogout} style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: 'none', border: '1px solid #e5e7eb',
                            borderRadius: '8px', padding: '6px 12px',
                            color: '#6b7280', fontSize: '13px', cursor: 'pointer',
                            transition: 'all 0.15s',
                        }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#fca5a5'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb'; }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            Sair
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div style={{
                    maxWidth: '1280px', margin: '0 auto',
                    padding: '0 24px 0',
                    display: 'flex', gap: '4px',
                    overflowX: 'auto',
                }}>
                    {[
                        { id: 'catalog', label: '🌐 Catálogo HUB', count: filteredCatalog.length },
                        { id: 'my_stock', label: '📦 Meu Estoque', count: myProducts.length },
                        { id: 'my_requests', label: '📋 Minhas Solicitações', count: outgoingRequests.filter(r => r.status === 'pending').length },
                        { id: 'incoming', label: '📬 Recebidas', count: pendingIncoming },
                        ...(isHubAdmin() ? [{ id: 'admin_requests', label: '🛡️ Gestão Admin', count: allRequests.filter(r => r.status === 'pending').length }] : []),
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as HubTab)}
                            className={activeTab === tab.id ? 'hub-tab-active' : ''}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '10px 20px',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '10px 10px 0 0',
                                color: activeTab === tab.id ? '#7c3aed' : '#6b7280',
                                fontSize: '14px', fontWeight: activeTab === tab.id ? '700' : '500',
                                cursor: 'pointer', whiteSpace: 'nowrap',
                                transition: 'all 0.2s',
                                borderBottom: activeTab === tab.id ? '3px solid #7c3aed' : '3px solid transparent',
                            }}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span style={{
                                    background: activeTab === tab.id ? '#7c3aed' : '#e5e7eb',
                                    color: activeTab === tab.id ? 'white' : '#6b7280',
                                    borderRadius: '999px', padding: '1px 8px',
                                    fontSize: '11px', fontWeight: '700',
                                }}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </header>

            {/* Content */}
            <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>

                {/* ======================== CATALOG TAB ======================== */}
                {activeTab === 'catalog' && (
                    <div>
                        <div style={{ marginBottom: '28px' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e1b4b', margin: '0 0 6px' }}>
                                🌐 Catálogo HUB
                            </h2>
                            <p style={{ color: '#6b7280', margin: 0 }}>
                                Produtos disponíveis de todas as locadoras parceiras. Clique para solicitar reserva.
                            </p>
                        </div>

                        {/* Search */}
                        <div style={{ position: 'relative', maxWidth: '480px', marginBottom: '28px' }}>
                            <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
                                width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                style={{
                                    width: '100%', padding: '12px 16px 12px 44px',
                                    background: 'white', border: '1.5px solid #e5e7eb',
                                    borderRadius: '12px', fontSize: '14px', color: '#374151',
                                    boxSizing: 'border-box',
                                    transition: 'border-color 0.2s',
                                }}
                                placeholder="Buscar por código, nome ou marca..."
                                value={searchCatalog}
                                onChange={e => setSearchCatalog(e.target.value)}
                            />
                        </div>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '80px 20px', color: '#9ca3af' }}>
                                <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
                                <p>Carregando catálogo...</p>
                            </div>
                        ) : filteredCatalog.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
                                <h3 style={{ color: '#374151', marginBottom: '8px' }}>
                                    {searchCatalog ? 'Nenhum produto encontrado' : 'Catálogo vazio'}
                                </h3>
                                <p style={{ color: '#9ca3af' }}>
                                    {searchCatalog ? 'Tente outros termos de busca.' : 'Aguarde outras locadoras cadastrarem seus produtos.'}
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                                {filteredCatalog.map(product => (
                                    <div key={product.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col h-full group">
                                        {/* Image */}
                                        <div className="h-48 sm:h-56 w-full overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center relative border-b border-slate-100 dark:border-slate-700">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.product_name} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="text-4xl">📦</div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="p-4 sm:p-5 flex-grow relative z-10 flex flex-col">
                                            <div className="flex justify-between items-start mb-3 gap-2 flex-wrap">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 whitespace-nowrap dark:bg-slate-700 dark:text-slate-300">
                                                    COD: {product.product_code}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {product.brand && (
                                                        <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider truncate max-w-[120px] sm:max-w-none dark:text-emerald-400">
                                                            {product.brand}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug mb-2 group-hover:text-emerald-600 transition-colors break-words line-clamp-2 dark:text-slate-100 dark:group-hover:text-emerald-400">
                                                {product.product_name}
                                            </h3>

                                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1 font-medium">
                                                🏢 Parceira HUB {product.company?.city ? `• ${product.company.city}/${product.company.state}` : ''}
                                            </div>

                                            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                                <button
                                                    onClick={() => setRequestProduct(product)}
                                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                                                >
                                                    📤 Solicitar Reserva
                                                </button>
                                            </div>
                                        </div>

                                        {/* Footer - Quantities */}
                                        <div className="bg-slate-50 px-4 sm:px-5 py-3 border-t border-slate-100 flex justify-between items-center gap-3 dark:bg-slate-900/50 dark:border-slate-700">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-slate-500 uppercase font-semibold dark:text-slate-400">DISPONÍVEL HUB</span>
                                                <div className="flex items-center mt-0.5">
                                                    <span className="text-xl font-bold text-slate-900 dark:text-slate-100">📦 {product.quantity_available}</span>
                                                </div>
                                            </div>

                                            <div className="text-right flex-shrink-0">
                                                {product.quantity_available > 0 ? (
                                                    <span className="inline-block px-2.5 sm:px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-md whitespace-nowrap">
                                                        Disponível
                                                    </span>
                                                ) : (
                                                    <span className="inline-block px-2.5 sm:px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-md whitespace-nowrap">
                                                        Esgotado
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ======================== MY STOCK TAB ======================== */}
                {activeTab === 'my_stock' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
                            <div>
                                <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e1b4b', margin: '0 0 6px' }}>
                                    📦 Meu Estoque
                                </h2>
                                <p style={{ color: '#6b7280', margin: 0 }}>
                                    Gerencie os produtos que você disponibiliza no catálogo HUB.
                                </p>
                            </div>
                            <button
                                onClick={() => { setEditingProduct(undefined); setShowProductForm(true); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    border: 'none', borderRadius: '12px',
                                    padding: '12px 22px', color: 'white',
                                    fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                                    boxShadow: '0 4px 16px rgba(102,126,234,0.4)',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Adicionar Produto
                            </button>
                        </div>

                        {myProducts.length === 0 ? (
                            <div style={{
                                textAlign: 'center', padding: '80px 20px',
                                background: 'white', borderRadius: '20px',
                                border: '2px dashed #e5e7eb',
                            }}>
                                <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
                                <h3 style={{ color: '#374151', marginBottom: '8px' }}>Nenhum produto cadastrado</h3>
                                <p style={{ color: '#9ca3af', marginBottom: '24px' }}>
                                    Adicione seus produtos para que outras locadoras possam solicitar reservas.
                                </p>
                                <button
                                    onClick={() => { setEditingProduct(undefined); setShowProductForm(true); }}
                                    style={{ ...btnPrimaryStyle, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                                >
                                    ➕ Adicionar Primeiro Produto
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                                {myProducts.map(product => (
                                    <div key={product.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col h-full group">
                                        {/* Image */}
                                        <div className="h-48 sm:h-56 w-full overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center relative border-b border-slate-100 dark:border-slate-700">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.product_name} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="text-4xl text-slate-300">📦</div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="p-4 sm:p-5 flex-grow relative z-10 flex flex-col">
                                            <div className="flex justify-between items-start mb-3 gap-2 flex-wrap">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 whitespace-nowrap dark:bg-slate-700 dark:text-slate-300">
                                                    COD: {product.product_code}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {product.brand && (
                                                        <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider truncate max-w-[120px] sm:max-w-none dark:text-emerald-400">
                                                            {product.brand}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug mb-4 group-hover:text-emerald-600 transition-colors break-words line-clamp-2 dark:text-slate-100 dark:group-hover:text-emerald-400">
                                                {product.product_name}
                                            </h3>

                                            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                                <div className="flex gap-2">
                                                    <button onClick={() => { setEditingProduct(product); setShowProductForm(true); }} className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm font-semibold transition-colors">
                                                        ✏️ Editar
                                                    </button>
                                                    <button onClick={() => handleDeleteProduct(product.id)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 rounded-lg text-sm font-semibold transition-colors">
                                                        🗑️ Remover
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer - Quantities */}
                                        <div className="bg-slate-50 px-4 sm:px-5 py-3 border-t border-slate-100 flex justify-between items-center gap-3 dark:bg-slate-900/50 dark:border-slate-700">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-slate-500 uppercase font-semibold dark:text-slate-400">DISPONÍVEL HUB</span>
                                                <div className="flex items-center mt-0.5">
                                                    <span className="text-xl font-bold text-slate-900 dark:text-slate-100">📦 {product.quantity_available}</span>
                                                </div>
                                            </div>

                                            <div className="text-right flex-shrink-0">
                                                {product.quantity_available > 0 ? (
                                                    <span className="inline-block px-2.5 sm:px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-md whitespace-nowrap">
                                                        Disponível
                                                    </span>
                                                ) : (
                                                    <span className="inline-block px-2.5 sm:px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-md whitespace-nowrap">
                                                        Esgotado
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ======================== MY REQUESTS TAB ======================== */}
                {activeTab === 'my_requests' && (
                    <div>
                        <div style={{ marginBottom: '28px' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e1b4b', margin: '0 0 6px' }}>
                                📋 Minhas Solicitações
                            </h2>
                            <p style={{ color: '#6b7280', margin: 0 }}>
                                Reservas que você solicitou de outras locadoras.
                            </p>
                        </div>
                        <RequestsTable
                            requests={outgoingRequests}
                            mode="outgoing"
                            onCancel={handleCancelRequest}
                        />
                    </div>
                )}

                {/* ======================== INCOMING TAB ======================== */}
                {activeTab === 'incoming' && (
                    <div>
                        <div style={{ marginBottom: '28px' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e1b4b', margin: '0 0 6px' }}>
                                📬 Solicitações Recebidas
                            </h2>
                            <p style={{ color: '#6b7280', margin: 0 }}>
                                Reservas que outras locadoras solicitaram dos seus produtos. A MCI irá coordenar.
                            </p>
                        </div>
                        <RequestsTable requests={incomingRequests} mode="incoming" />
                    </div>
                )}

                {/* ======================== ADMIN TAB ======================== */}
                {activeTab === 'admin_requests' && isHubAdmin() && (
                    <div>
                        <div style={{ marginBottom: '28px' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e1b4b', margin: '0 0 6px' }}>
                                🛡️ Gestão Admin
                            </h2>
                            <p style={{ color: '#6b7280', margin: 0 }}>
                                Painel de aprovação e logística para a MCI gerenciar todas as reservas do HUB.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gap: '16px' }}>
                            {allRequests.map(req => {
                                const statusColor = HUB_STATUS_COLORS[req.status];
                                const statusLabel = HUB_STATUS_LABELS[req.status];
                                return (
                                    <div key={req.id} style={{
                                        background: 'white', borderRadius: '16px', padding: '20px',
                                        border: '1px solid rgba(124,58,237,0.1)',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                                            <div style={{ flex: 1, minWidth: '300px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                    <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>#{req.id.split('-')[0]}</span>
                                                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#1e1b4b' }}>
                                                        {req.product_code} — {req.product_name}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
                                                    <div>
                                                        <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Solicitante (Destino)</div>
                                                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{req.requesting_company?.fantasy_name}</div>
                                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{req.requesting_company?.city}/{req.requesting_company?.state}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fornecedor (Origem)</div>
                                                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{req.providing_company?.fantasy_name}</div>
                                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{req.providing_company?.city}/{req.providing_company?.state}</div>
                                                    </div>
                                                </div>
                                                {(req.notes || req.admin_notes) && (
                                                    <div style={{ marginTop: '12px', fontSize: '13px' }}>
                                                        {req.notes && <div style={{ color: '#6b7280', marginBottom: '4px' }}><strong>Obs. Locadora:</strong> {req.notes}</div>}
                                                        {req.admin_notes && <div style={{ color: '#059669' }}><strong>Obs. MCI:</strong> {req.admin_notes}</div>}
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', minWidth: '200px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#374151', lineHeight: '1' }}>{req.quantity_requested}</div>
                                                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>unidades</div>
                                                    </div>
                                                    <span style={{
                                                        background: `${statusColor}18`, color: statusColor,
                                                        border: `1px solid ${statusColor}40`, borderRadius: '999px',
                                                        padding: '5px 14px', fontSize: '12px', fontWeight: '700',
                                                    }}>
                                                        {statusLabel}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                    <select
                                                        value={req.status}
                                                        onChange={(e) => handleUpdateStatus(req.id, e.target.value as HubRequestStatus)}
                                                        style={{
                                                            padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb',
                                                            fontSize: '13px', fontWeight: '600', color: '#374151', cursor: 'pointer',
                                                            background: 'white',
                                                        }}
                                                    >
                                                        <option value="pending">🟡 Pendente</option>
                                                        <option value="approved">🔵 Aprovado</option>
                                                        <option value="in_transit">🟣 Em Trânsito</option>
                                                        <option value="delivered">🟢 Entregue</option>
                                                        <option value="rejected">🔴 Recusado</option>
                                                        <option value="cancelled">⚫ Cancelado</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {allRequests.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
                                    Nenhuma solicitação no sistema.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Modals */}
            {showProductForm && (
                <ProductFormModal
                    companyId={company.id}
                    product={editingProduct}
                    onClose={() => { setShowProductForm(false); setEditingProduct(undefined); }}
                    onSaved={() => { loadMyStock(); loadCatalog(); showToast(editingProduct ? 'Produto atualizado!' : 'Produto adicionado ao catálogo!'); }}
                />
            )}

            {requestProduct && (
                <RequestModal
                    product={requestProduct}
                    myCompany={company}
                    onClose={() => setRequestProduct(null)}
                    onRequested={() => { loadRequests(); showToast('Solicitação enviada! A MCI entrará em contato.'); }}
                />
            )}
        </div>
    );
}

// =====================================================
// REQUESTS TABLE
// =====================================================
function RequestsTable({
    requests,
    mode,
    onCancel,
}: {
    requests: HubReservationRequest[];
    mode: 'outgoing' | 'incoming';
    onCancel?: (id: string) => void;
}) {
    if (requests.length === 0) {
        return (
            <div style={{
                textAlign: 'center', padding: '80px 20px',
                background: 'white', borderRadius: '20px',
                border: '2px dashed #e5e7eb',
            }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                    {mode === 'outgoing' ? '📋' : '📬'}
                </div>
                <h3 style={{ color: '#374151', marginBottom: '8px' }}>
                    {mode === 'outgoing' ? 'Nenhuma solicitação feita' : 'Nenhuma solicitação recebida'}
                </h3>
                <p style={{ color: '#9ca3af' }}>
                    {mode === 'outgoing'
                        ? 'Explore o catálogo e solicite reservas de produtos.'
                        : 'Quando outras locadoras solicitarem seus produtos, aparecerão aqui.'}
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {requests.map(req => {
                const statusColor = HUB_STATUS_COLORS[req.status];
                const statusLabel = HUB_STATUS_LABELS[req.status];
                const partnerCompany = mode === 'outgoing' ? req.providing_company : req.requesting_company;

                return (
                    <div key={req.id} style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '20px 24px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                        display: 'flex', alignItems: 'center', gap: '20px',
                        flexWrap: 'wrap',
                    }}>
                        {/* Status dot */}
                        <div style={{
                            width: '10px', height: '10px',
                            borderRadius: '50%',
                            background: statusColor,
                            boxShadow: `0 0 8px ${statusColor}60`,
                            flexShrink: 0,
                        }} />

                        {/* Product info */}
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{
                                    background: '#ede9fe', color: '#7c3aed',
                                    fontSize: '11px', fontWeight: '700',
                                    padding: '2px 8px', borderRadius: '999px',
                                }}>
                                    {req.product_code}
                                </span>
                                <span style={{ fontSize: '15px', fontWeight: '700', color: '#1e1b4b' }}>
                                    {req.product_name}
                                </span>
                            </div>
                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                {mode === 'outgoing'
                                    ? `Fornecedor: ${partnerCompany?.fantasy_name || 'Locadora Parceira'}`
                                    : `Solicitante: ${partnerCompany?.fantasy_name || 'Locadora Parceira'}`
                                }
                                {partnerCompany?.city && ` • ${partnerCompany.city}/${partnerCompany.state}`}
                            </div>
                            {req.notes && (
                                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', fontStyle: 'italic' }}>
                                    "{req.notes}"
                                </div>
                            )}
                            {req.admin_notes && (
                                <div style={{
                                    fontSize: '12px', color: '#059669',
                                    marginTop: '4px', background: '#f0fdf4',
                                    padding: '4px 10px', borderRadius: '6px', display: 'inline-block',
                                }}>
                                    MCI: {req.admin_notes}
                                </div>
                            )}
                        </div>

                        {/* Quantity */}
                        <div style={{ textAlign: 'center', minWidth: '70px' }}>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: '#374151', lineHeight: '1' }}>
                                {req.quantity_requested}
                            </div>
                            <div style={{ fontSize: '11px', color: '#9ca3af' }}>unidades</div>
                        </div>

                        {/* Status */}
                        <div style={{ textAlign: 'center', minWidth: '120px' }}>
                            <span style={{
                                background: `${statusColor}18`,
                                color: statusColor,
                                border: `1px solid ${statusColor}40`,
                                borderRadius: '999px', padding: '5px 14px',
                                fontSize: '12px', fontWeight: '700',
                                whiteSpace: 'nowrap',
                            }}>
                                {statusLabel}
                            </span>
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                                {new Date(req.requested_at).toLocaleDateString('pt-BR')}
                            </div>
                        </div>

                        {/* Cancel button */}
                        {mode === 'outgoing' && req.status === 'pending' && onCancel && (
                            <button
                                onClick={() => onCancel(req.id)}
                                style={{
                                    background: '#fee2e2', border: 'none', borderRadius: '8px',
                                    padding: '7px 14px', color: '#dc2626',
                                    fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                    transition: 'all 0.15s', whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fca5a5'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fee2e2'; }}
                            >
                                Cancelar
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// =====================================================
// SHARED STYLES
// =====================================================
const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px', fontWeight: '600',
    color: '#374151', marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    border: '1.5px solid #e5e7eb',
    borderRadius: '10px', fontSize: '14px', color: '#1f2937',
    background: '#f9fafb', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
};

const btnPrimaryStyle: React.CSSProperties = {
    flex: 1, padding: '12px 20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none', borderRadius: '10px',
    color: 'white', fontSize: '14px', fontWeight: '700',
    cursor: 'pointer', transition: 'all 0.2s',
    boxShadow: '0 4px 15px rgba(102,126,234,0.35)',
};

const btnSecondaryStyle: React.CSSProperties = {
    flex: 0, padding: '12px 20px',
    background: 'white', border: '1.5px solid #e5e7eb',
    borderRadius: '10px', color: '#6b7280',
    fontSize: '14px', fontWeight: '600',
    cursor: 'pointer', transition: 'all 0.15s',
};
