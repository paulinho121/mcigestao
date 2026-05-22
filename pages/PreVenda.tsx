import { useState, useEffect, useCallback } from 'react';
import {
    ShoppingBag, Plus, Search, CheckCircle2, XCircle, Clock,
    AlertTriangle, Edit2, ChevronDown, ChevronUp, User, Users, Package,
    PhoneCall, MapPin, CalendarDays, StickyNote, Star, X, Loader2
} from 'lucide-react';
import { preSaleService } from '../services/preSaleService';
import { PreSale } from '../types';
import { inventoryService } from '../services/inventoryService';
import { Product } from '../types';

// ─── tipos auxiliares ────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'pending' | 'stock_arrived' | 'fulfilled' | 'cancelled';
type GroupBy = 'none' | 'vendedor' | 'cliente';

const STATUS_LABELS: Record<PreSale['status'], string> = {
    pending: 'Pendente',
    stock_arrived: 'Estoque Chegou',
    fulfilled: 'Atendido',
    cancelled: 'Cancelado',
};

const PRIORITY_LABELS: Record<PreSale['priority'], string> = {
    low: 'Baixa',
    normal: 'Normal',
    high: 'Alta',
    urgent: 'Urgente',
};

const BRANCH_OPTIONS = ['CE', 'SC', 'SP'] as const;

// ─── utilitários de UI ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PreSale['status'] }) {
    const map: Record<PreSale['status'], string> = {
        pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        stock_arrived: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 animate-pulse',
        fulfilled: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
    };
    const icons: Record<PreSale['status'], JSX.Element> = {
        pending: <Clock className="w-3 h-3" />,
        stock_arrived: <AlertTriangle className="w-3 h-3" />,
        fulfilled: <CheckCircle2 className="w-3 h-3" />,
        cancelled: <XCircle className="w-3 h-3" />,
    };
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${map[status]}`}>
            {icons[status]}
            {STATUS_LABELS[status]}
        </span>
    );
}

function PriorityBadge({ priority }: { priority: PreSale['priority'] }) {
    const map: Record<PreSale['priority'], string> = {
        low: 'text-slate-400',
        normal: 'text-blue-500',
        high: 'text-orange-500',
        urgent: 'text-red-600 font-bold',
    };
    return (
        <span className={`inline-flex items-center gap-0.5 text-xs ${map[priority]}`}>
            <Star className="w-3 h-3" />
            {PRIORITY_LABELS[priority]}
        </span>
    );
}

// ─── modal de criação / edição ───────────────────────────────────────────────

interface ModalProps {
    initial?: PreSale | null;
    onSave: (data: Omit<PreSale, 'id' | 'created_at' | 'updated_at' | 'fulfilled_at'>) => Promise<void>;
    onClose: () => void;
}

function PreSaleModal({ initial, onSave, onClose }: ModalProps) {
    const [productQuery, setProductQuery] = useState(initial?.product_name ?? '');
    const [productResults, setProductResults] = useState<Product[]>([]);
    const [searching, setSearching] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        product_id: initial?.product_id ?? '',
        product_name: initial?.product_name ?? '',
        product_brand: initial?.product_brand ?? '',
        quantity: initial?.quantity ?? 1,
        unit_price: initial?.unit_price ?? '',
        vendedor_name: initial?.vendedor_name ?? '',
        cliente_name: initial?.cliente_name ?? '',
        cliente_contact: initial?.cliente_contact ?? '',
        branch: initial?.branch ?? '',
        expected_restock_date: initial?.expected_restock_date ?? '',
        notes: initial?.notes ?? '',
        priority: initial?.priority ?? 'normal',
    });

    const searchProduct = useCallback(async (q: string) => {
        if (q.length < 2) { setProductResults([]); return; }
        setSearching(true);
        try {
            const results = await inventoryService.searchProducts(q);
            setProductResults(results.slice(0, 8));
        } finally {
            setSearching(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => searchProduct(productQuery), 350);
        return () => clearTimeout(timer);
    }, [productQuery, searchProduct]);

    const selectProduct = (p: Product) => {
        setProductQuery(p.name);
        setProductResults([]);
        setForm((f) => ({ ...f, product_id: p.id, product_name: p.name, product_brand: p.brand }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.product_id || !form.vendedor_name.trim() || !form.cliente_name.trim()) return;
        setSaving(true);
        try {
            await onSave({
                ...form,
                status: initial?.status ?? 'pending',
                quantity: Number(form.quantity),
                unit_price: form.unit_price !== '' ? Number(form.unit_price) : undefined,
                branch: (form.branch as PreSale['branch']) || undefined,
                priority: form.priority as PreSale['priority'],
                expected_restock_date: form.expected_restock_date || undefined,
                notes: form.notes || undefined,
                cliente_contact: form.cliente_contact || undefined,
                product_brand: form.product_brand || undefined,
            });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const field = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-400';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-red-500" />
                        <h2 className="font-bold text-slate-800 dark:text-slate-100">
                            {initial ? 'Editar Pré-Venda' : 'Nova Pré-Venda'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {/* produto */}
                    <div className="relative">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                            Produto *
                        </label>
                        <div className="relative">
                            <input
                                className={field}
                                placeholder="Buscar por código ou nome..."
                                value={productQuery}
                                onChange={(e) => { setProductQuery(e.target.value); setForm((f) => ({ ...f, product_id: '', product_name: '' })); }}
                                required={!form.product_id}
                            />
                            {searching && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-slate-400" />}
                        </div>
                        {productResults.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg overflow-hidden">
                                {productResults.map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => selectProduct(p)}
                                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm"
                                    >
                                        <span className="font-mono text-xs text-slate-400 mr-2">{p.id}</span>
                                        <span className="text-slate-800 dark:text-slate-100">{p.name}</span>
                                        <span className="text-xs text-slate-400 ml-2">{p.brand}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {form.product_id && (
                            <p className="text-xs text-green-600 mt-1">✓ Código: {form.product_id}</p>
                        )}
                    </div>

                    {/* quantidade e preço */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                                Quantidade *
                            </label>
                            <input
                                type="number" min={1} className={field} required
                                value={form.quantity}
                                onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                                Preço Unit. (R$)
                            </label>
                            <input
                                type="number" min={0} step="0.01" className={field}
                                placeholder="Opcional"
                                value={form.unit_price}
                                onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* vendedor e cliente */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                                Vendedor *
                            </label>
                            <input
                                className={field} required placeholder="Nome do vendedor"
                                value={form.vendedor_name}
                                onChange={(e) => setForm((f) => ({ ...f, vendedor_name: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                                Cliente *
                            </label>
                            <input
                                className={field} required placeholder="Nome do cliente"
                                value={form.cliente_name}
                                onChange={(e) => setForm((f) => ({ ...f, cliente_name: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* contato e filial */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                                Contato do Cliente
                            </label>
                            <input
                                className={field} placeholder="Tel / e-mail"
                                value={form.cliente_contact}
                                onChange={(e) => setForm((f) => ({ ...f, cliente_contact: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                                Filial
                            </label>
                            <select
                                className={field}
                                value={form.branch}
                                onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
                            >
                                <option value="">Qualquer</option>
                                {BRANCH_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* prioridade e data esperada */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                                Prioridade
                            </label>
                            <select
                                className={field}
                                value={form.priority}
                                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as PreSale['priority'] }))}
                            >
                                <option value="low">Baixa</option>
                                <option value="normal">Normal</option>
                                <option value="high">Alta</option>
                                <option value="urgent">Urgente</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                                Previsão de Reposição
                            </label>
                            <input
                                type="date" className={field}
                                value={form.expected_restock_date}
                                onChange={(e) => setForm((f) => ({ ...f, expected_restock_date: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* observações */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                            Observações
                        </label>
                        <textarea
                            className={`${field} resize-none`} rows={3}
                            placeholder="Informações adicionais..."
                            value={form.notes}
                            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                        />
                    </div>
                </form>

                {/* footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                    <button
                        type="button" onClick={onClose}
                        className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit as any}
                        disabled={saving || !form.product_id}
                        className="px-5 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {initial ? 'Salvar' : 'Criar Pré-Venda'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── card de item ────────────────────────────────────────────────────────────

interface CardProps {
    item: PreSale;
    onFulfill: (id: string) => void;
    onCancel: (id: string) => void;
    onEdit: (item: PreSale) => void;
}

function PreSaleCard({ item, onFulfill, onCancel, onEdit }: CardProps) {
    const isStockArrived = item.status === 'stock_arrived';
    const isActive = item.status === 'pending' || isStockArrived;

    return (
        <div className={`rounded-xl border p-4 transition-all ${
            isStockArrived
                ? 'border-red-400 bg-red-50 dark:bg-red-950/30 shadow-md shadow-red-100 dark:shadow-red-900/20'
                : item.status === 'fulfilled'
                ? 'border-green-200 bg-green-50/50 dark:bg-green-950/10 opacity-75'
                : item.status === 'cancelled'
                ? 'border-slate-200 bg-slate-50 dark:bg-slate-800/50 opacity-60'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
        }`}>
            {/* topo */}
            <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={item.status} />
                        <PriorityBadge priority={item.priority} />
                        {item.branch && (
                            <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <MapPin className="w-3 h-3" />{item.branch}
                            </span>
                        )}
                    </div>
                    <p className="font-bold text-slate-800 dark:text-slate-100 mt-1 truncate">{item.product_name}</p>
                    {item.product_brand && (
                        <p className="text-xs text-slate-400">{item.product_brand} · Cód: {item.product_id}</p>
                    )}
                </div>
                <div className="text-right shrink-0">
                    <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">{item.quantity}</p>
                    <p className="text-xs text-slate-400">un.</p>
                    {item.unit_price && (
                        <p className="text-xs text-slate-500 mt-0.5">
                            R$ {(item.unit_price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    )}
                </div>
            </div>

            {/* info vendedor / cliente */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="flex items-center gap-1.5 min-w-0">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Vendedor</p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{item.vendedor_name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Cliente</p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{item.cliente_name}</p>
                    </div>
                </div>
            </div>

            {/* detalhes extras */}
            {(item.cliente_contact || item.expected_restock_date || item.notes) && (
                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5 mb-3">
                    {item.cliente_contact && (
                        <p className="flex items-center gap-1"><PhoneCall className="w-3 h-3" />{item.cliente_contact}</p>
                    )}
                    {item.expected_restock_date && (
                        <p className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            Previsão: {new Date(item.expected_restock_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                    )}
                    {item.notes && (
                        <p className="flex items-center gap-1"><StickyNote className="w-3 h-3" />{item.notes}</p>
                    )}
                </div>
            )}

            {/* ações */}
            {isActive && (
                <div className="flex gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-700">
                    <button
                        onClick={() => onFulfill(item.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Marcar Atendido
                    </button>
                    <button
                        onClick={() => onEdit(item)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                        <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                        onClick={() => onCancel(item.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 transition-colors ml-auto"
                    >
                        <XCircle className="w-3.5 h-3.5" /> Cancelar
                    </button>
                </div>
            )}
            {item.status === 'fulfilled' && item.fulfilled_at && (
                <p className="text-xs text-green-600 dark:text-green-400 pt-2 border-t border-slate-100 dark:border-slate-700">
                    ✓ Atendido em {new Date(item.fulfilled_at).toLocaleDateString('pt-BR')}
                </p>
            )}
        </div>
    );
}

// ─── página principal ────────────────────────────────────────────────────────

interface GroupSection {
    label: string;
    items: PreSale[];
    collapsed: boolean;
}

export function PreVenda() {
    const [allItems, setAllItems] = useState<PreSale[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [vendedorFilter, setVendedorFilter] = useState('');
    const [clienteFilter, setClienteFilter] = useState('');
    const [groupBy, setGroupBy] = useState<GroupBy>('none');
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<PreSale | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await preSaleService.getAll();
            setAllItems(data);
        } catch (e: any) {
            setError(e.message ?? 'Erro ao carregar pré-vendas');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const filtered = allItems.filter((item) => {
        if (statusFilter !== 'all' && item.status !== statusFilter) return false;
        if (vendedorFilter && !item.vendedor_name.toLowerCase().includes(vendedorFilter.toLowerCase())) return false;
        if (clienteFilter && !item.cliente_name.toLowerCase().includes(clienteFilter.toLowerCase())) return false;
        if (search) {
            const q = search.toLowerCase();
            return (
                item.product_name.toLowerCase().includes(q) ||
                item.product_id.toLowerCase().includes(q) ||
                item.vendedor_name.toLowerCase().includes(q) ||
                item.cliente_name.toLowerCase().includes(q)
            );
        }
        return true;
    });

    const stockArrivedItems = filtered.filter((i) => i.status === 'stock_arrived');
    const pendingItems = filtered.filter((i) => i.status === 'pending');
    const doneItems = filtered.filter((i) => i.status === 'fulfilled' || i.status === 'cancelled');

    const uniqueVendedores = [...new Set(allItems.map((i) => i.vendedor_name))].sort();
    const uniqueClientes = [...new Set(allItems.map((i) => i.cliente_name))].sort();

    const handleFulfill = async (id: string) => {
        await preSaleService.markFulfilled(id);
        loadData();
    };

    const handleCancel = async (id: string) => {
        if (!window.confirm('Cancelar esta pré-venda?')) return;
        await preSaleService.markCancelled(id);
        loadData();
    };

    const handleSave = async (data: Omit<PreSale, 'id' | 'created_at' | 'updated_at' | 'fulfilled_at'>) => {
        if (editTarget) {
            await preSaleService.update(editTarget.id, data);
        } else {
            await preSaleService.create(data);
        }
        loadData();
    };

    const openCreate = () => { setEditTarget(null); setModalOpen(true); };
    const openEdit = (item: PreSale) => { setEditTarget(item); setModalOpen(true); };

    const toggleGroup = (label: string) => {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            next.has(label) ? next.delete(label) : next.add(label);
            return next;
        });
    };

    // agrupamento
    const buildGroups = (items: PreSale[]): GroupSection[] => {
        if (groupBy === 'none') return [];
        const key = groupBy === 'vendedor' ? 'vendedor_name' : 'cliente_name';
        const map = new Map<string, PreSale[]>();
        items.forEach((i) => {
            const k = i[key] as string;
            if (!map.has(k)) map.set(k, []);
            map.get(k)!.push(i);
        });
        return [...map.entries()].map(([label, its]) => ({
            label, items: its, collapsed: collapsedGroups.has(label),
        }));
    };

    const renderList = (items: PreSale[]) => {
        if (groupBy === 'none') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {items.map((item) => (
                        <PreSaleCard key={item.id} item={item}
                            onFulfill={handleFulfill} onCancel={handleCancel} onEdit={openEdit} />
                    ))}
                </div>
            );
        }
        const groups = buildGroups(items);
        return (
            <div className="space-y-4">
                {groups.map((g) => (
                    <div key={g.label} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <button
                            onClick={() => toggleGroup(g.label)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                {groupBy === 'vendedor' ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                                {g.label}
                                <span className="text-xs font-normal text-slate-400">({g.items.length})</span>
                            </span>
                            {g.collapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                        </button>
                        {!g.collapsed && (
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {g.items.map((item) => (
                                    <PreSaleCard key={item.id} item={item}
                                        onFulfill={handleFulfill} onCancel={handleCancel} onEdit={openEdit} />
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-screen-xl mx-auto">
            {/* título */}
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30">
                        <ShoppingBag className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Pré-Venda</h1>
                        <p className="text-xs text-slate-400">Itens vendidos aguardando entrada em estoque</p>
                    </div>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors shadow-md"
                >
                    <Plus className="w-4 h-4" /> Nova Pré-Venda
                </button>
            </div>

            {/* cards de resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                    { label: 'Estoque Chegou', value: allItems.filter(i => i.status === 'stock_arrived').length, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900' },
                    { label: 'Pendentes', value: allItems.filter(i => i.status === 'pending').length, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900' },
                    { label: 'Atendidos', value: allItems.filter(i => i.status === 'fulfilled').length, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900' },
                    { label: 'Cancelados', value: allItems.filter(i => i.status === 'cancelled').length, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700' },
                ].map((s) => (
                    <div key={s.label} className={`rounded-xl border p-3 ${s.bg}`}>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* filtros */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6 space-y-3">
                <div className="flex flex-wrap gap-3">
                    {/* busca */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400"
                            placeholder="Buscar produto, vendedor, cliente..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* status */}
                    <select
                        className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    >
                        <option value="all">Todos os status</option>
                        <option value="stock_arrived">Estoque Chegou</option>
                        <option value="pending">Pendente</option>
                        <option value="fulfilled">Atendido</option>
                        <option value="cancelled">Cancelado</option>
                    </select>

                    {/* vendedor */}
                    <select
                        className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400"
                        value={vendedorFilter}
                        onChange={(e) => setVendedorFilter(e.target.value)}
                    >
                        <option value="">Todos os vendedores</option>
                        {uniqueVendedores.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>

                    {/* cliente */}
                    <select
                        className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400"
                        value={clienteFilter}
                        onChange={(e) => setClienteFilter(e.target.value)}
                    >
                        <option value="">Todos os clientes</option>
                        {uniqueClientes.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>

                    {/* agrupamento */}
                    <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
                        {(['none', 'vendedor', 'cliente'] as GroupBy[]).map((g) => (
                            <button
                                key={g}
                                onClick={() => setGroupBy(g)}
                                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                                    groupBy === g
                                        ? 'bg-red-600 text-white'
                                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                {g === 'none' ? 'Todos' : g === 'vendedor' ? 'Por Vendedor' : 'Por Cliente'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* conteúdo */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                </div>
            ) : error ? (
                <div className="text-center py-20 text-red-500">{error}</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Nenhuma pré-venda encontrada</p>
                    <p className="text-sm">Ajuste os filtros ou crie uma nova pré-venda.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* seção estoque chegou */}
                    {stockArrivedItems.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                                <h2 className="font-bold text-red-600 dark:text-red-400 text-lg">
                                    Estoque Chegou ({stockArrivedItems.length})
                                </h2>
                                <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                                    Ação necessária
                                </span>
                            </div>
                            {renderList(stockArrivedItems)}
                        </section>
                    )}

                    {/* pendentes */}
                    {pendingItems.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-3">
                                <Clock className="w-5 h-5 text-yellow-500" />
                                <h2 className="font-bold text-slate-700 dark:text-slate-200 text-lg">
                                    Pendentes ({pendingItems.length})
                                </h2>
                            </div>
                            {renderList(pendingItems)}
                        </section>
                    )}

                    {/* atendidos / cancelados */}
                    {doneItems.length > 0 && statusFilter !== 'pending' && statusFilter !== 'stock_arrived' && (
                        <section>
                            <div className="flex items-center gap-2 mb-3">
                                <CheckCircle2 className="w-5 h-5 text-slate-400" />
                                <h2 className="font-bold text-slate-400 text-lg">
                                    Concluídos / Cancelados ({doneItems.length})
                                </h2>
                            </div>
                            {renderList(doneItems)}
                        </section>
                    )}
                </div>
            )}

            {/* modal */}
            {modalOpen && (
                <PreSaleModal
                    initial={editTarget}
                    onSave={handleSave}
                    onClose={() => setModalOpen(false)}
                />
            )}
        </div>
    );
}
