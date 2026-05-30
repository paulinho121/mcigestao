import { useState, useEffect, useCallback } from 'react';
import {
    PackageSearch, Plus, Send, RefreshCw, ChevronDown, ChevronUp,
    CheckCircle2, Truck, Package, Clock, XCircle, AlertCircle,
    Loader2, Trash2, ClipboardList, X, Search, RefreshCcw, History
} from 'lucide-react';
import { escalasoftOrderService, CDOrder, OrderProduct, OrderStatus } from '../services/escalasoftOrderService';
import { scStockService } from '../services/scStockService';
import { SCStockItem } from '../types/scApi';

// ─── config de status ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, {
    label: string;
    badge: string;       // badge pill
    cardBorder: string;  // borda esquerda do card
    cardBg: string;      // fundo sutil do card
    icon: React.ReactNode;
}> = {
    enviado: {
        label: 'Enviado',
        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        cardBorder: 'border-l-blue-400',
        cardBg: 'bg-blue-50/50 dark:bg-blue-900/10',
        icon: <Send className="w-3 h-3" />,
    },
    confirmado: {
        label: 'Confirmado',
        badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
        cardBorder: 'border-l-indigo-400',
        cardBg: 'bg-indigo-50/50 dark:bg-indigo-900/10',
        icon: <CheckCircle2 className="w-3 h-3" />,
    },
    em_separacao: {
        label: 'Em Separação',
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        cardBorder: 'border-l-amber-400',
        cardBg: 'bg-amber-50/50 dark:bg-amber-900/10',
        icon: <Package className="w-3 h-3" />,
    },
    em_transito: {
        label: 'Em Trânsito',
        badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
        cardBorder: 'border-l-violet-400',
        cardBg: 'bg-violet-50/50 dark:bg-violet-900/10',
        icon: <Truck className="w-3 h-3" />,
    },
    entregue: {
        label: 'Entregue',
        badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        cardBorder: 'border-l-green-500',
        cardBg: 'bg-green-50/60 dark:bg-green-900/10',
        icon: <CheckCircle2 className="w-3 h-3" />,
    },
    cancelado: {
        label: 'Cancelado',
        badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        cardBorder: 'border-l-red-400',
        cardBg: 'bg-red-50/40 dark:bg-red-900/10',
        icon: <XCircle className="w-3 h-3" />,
    },
};

const STATUS_FLOW: OrderStatus[] = ['enviado', 'confirmado', 'em_separacao', 'em_transito', 'entregue'];
const ACTIVE_STATUSES: OrderStatus[] = ['enviado', 'confirmado', 'em_separacao', 'em_transito'];
const DONE_STATUSES: OrderStatus[] = ['entregue', 'cancelado'];

// ─── helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
    const cfg = STATUS_CONFIG[status];
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
            {cfg.icon}{cfg.label}
        </span>
    );
}

function formatCurrency(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

// ─── Linha de produto no carrinho ─────────────────────────────────────────────

function CartRow({ item, onQtyChange, onRemove }: {
    item: OrderProduct;
    onQtyChange: (qty: number) => void;
    onRemove: () => void;
}) {
    return (
        <div className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{item.nome}</p>
                <p className="text-xs text-slate-400">Ref: {item.codigo_referencia}</p>
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onQtyChange(Math.max(1, item.quantidade - 1))}
                    className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm font-bold flex items-center justify-center"
                >−</button>
                <input
                    type="number" min={1} value={item.quantidade}
                    onChange={e => onQtyChange(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 text-center text-sm border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
                <button
                    onClick={() => onQtyChange(item.quantidade + 1)}
                    className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm font-bold flex items-center justify-center"
                >+</button>
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 w-24 text-right">
                {formatCurrency(item.valor_unitario * item.quantidade)}
            </span>
            <button onClick={onRemove} className="text-red-400 hover:text-red-600 transition-colors">
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}

// ─── Card de pedido ───────────────────────────────────────────────────────────

function OrderCard({ order, onStatusChange }: {
    order: CDOrder;
    onStatusChange: (id: string, s: OrderStatus) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [apiSituacao, setApiSituacao] = useState<string | null>(null);

    const cfg = STATUS_CONFIG[order.status];
    const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1] as OrderStatus | undefined;
    const isDone = DONE_STATUSES.includes(order.status);

    const handleAdvance = async () => {
        if (!nextStatus) return;
        setUpdating(true);
        await escalasoftOrderService.updateStatus(order.id, nextStatus);
        onStatusChange(order.id, nextStatus);
        setUpdating(false);
    };

    const handleCancel = async () => {
        setUpdating(true);
        await escalasoftOrderService.updateStatus(order.id, 'cancelado');
        onStatusChange(order.id, 'cancelado');
        setUpdating(false);
    };

    const handleSyncStatus = async () => {
        if (!order.pedido_id_api) return;
        setSyncing(true);
        const result = await escalasoftOrderService.fetchApiStatus(order.pedido_id_api);
        if (result) {
            setApiSituacao(result.situacao);
            const mapped = escalasoftOrderService.mapApiStatus(result.situacaoid);
            if (mapped !== order.status) {
                await escalasoftOrderService.updateStatus(order.id, mapped);
                onStatusChange(order.id, mapped);
            }
        }
        setSyncing(false);
    };

    return (
        <div className={`rounded-xl border border-l-4 shadow-sm overflow-hidden transition-all ${cfg.cardBorder} ${cfg.cardBg} border-slate-200 dark:border-slate-700`}>
            {/* Header do card */}
            <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                onClick={() => setExpanded(v => !v)}
            >
                {/* Ícone de status grande */}
                <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${cfg.badge}`}>
                    <span className="scale-125">{cfg.icon}</span>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{order.numero_pedido}</span>
                        {order.pedido_id_api && (
                            <span className="text-xs text-slate-400">API #{order.pedido_id_api}</span>
                        )}
                        <StatusBadge status={order.status} />
                        {apiSituacao && (
                            <span className="text-xs text-indigo-500 dark:text-indigo-400 italic">"{apiSituacao}"</span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {order.cliente_nome} · {formatDate(order.created_at)}
                    </p>
                </div>

                <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatCurrency(order.valor_total)}</p>
                    <p className="text-xs text-slate-400">{order.produtos.length} {order.produtos.length === 1 ? 'item' : 'itens'}</p>
                </div>

                {expanded
                    ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                }
            </div>

            {/* Progresso visual (só para pedidos ativos) */}
            {!isDone && (
                <div className="px-4 pb-2">
                    <div className="flex items-center gap-1">
                        {STATUS_FLOW.map((s, i) => {
                            const currentIdx = STATUS_FLOW.indexOf(order.status);
                            const done = i <= currentIdx;
                            const scfg = STATUS_CONFIG[s];
                            return (
                                <div key={s} className="flex items-center gap-1 flex-1">
                                    <div className={`flex-1 h-1.5 rounded-full transition-all ${done ? (s === order.status ? 'opacity-100' : 'opacity-60') : 'opacity-20'} ${done ? scfg.cardBorder.replace('border-l-', 'bg-') : 'bg-slate-300 dark:bg-slate-600'}`} />
                                    {i < STATUS_FLOW.length - 1 && (
                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${done ? scfg.cardBorder.replace('border-l-', 'bg-') : 'bg-slate-200 dark:bg-slate-700'}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between mt-0.5">
                        {STATUS_FLOW.map(s => (
                            <span key={s} className={`text-[9px] font-medium ${s === order.status ? 'text-slate-600 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600'}`}>
                                {STATUS_CONFIG[s].label.split(' ')[0]}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Detalhes expandidos */}
            {expanded && (
                <div className="border-t border-slate-200/60 dark:border-slate-700 px-4 py-3 space-y-3 bg-white/60 dark:bg-slate-800/60">
                    <div className="space-y-1">
                        {order.produtos.map((p, i) => (
                            <div key={i} className="flex justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">
                                    {p.nome} <span className="text-xs text-slate-400">×{p.quantidade}</span>
                                </span>
                                <span className="text-slate-700 dark:text-slate-300 font-medium">{formatCurrency(p.valor_total)}</span>
                            </div>
                        ))}
                    </div>

                    {order.observacao && (
                        <p className="text-xs text-slate-500 italic border-t border-slate-200 dark:border-slate-700 pt-2">
                            {order.observacao}
                        </p>
                    )}

                    {/* Ações — só para pedidos ativos */}
                    {!isDone && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {order.pedido_id_api && (
                                <button
                                    onClick={e => { e.stopPropagation(); handleSyncStatus(); }}
                                    disabled={syncing}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 dark:text-indigo-400 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <RefreshCcw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                                    {syncing ? 'Consultando...' : 'Consultar API'}
                                </button>
                            )}

                            {nextStatus && (
                                <button
                                    onClick={e => { e.stopPropagation(); handleAdvance(); }}
                                    disabled={updating}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : STATUS_CONFIG[nextStatus].icon}
                                    Marcar como {STATUS_CONFIG[nextStatus].label}
                                </button>
                            )}

                            <button
                                onClick={e => { e.stopPropagation(); handleCancel(); }}
                                disabled={updating}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                            >
                                <XCircle className="w-3 h-3" /> Cancelar
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Página principal ─────────────────────────────────────────────────────────

type PageTab = 'novo' | 'pedidos' | 'finalizados';

export function PedidosCD() {
    const [tab, setTab] = useState<PageTab>('pedidos');
    const [orders, setOrders] = useState<CDOrder[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [scItems, setScItems] = useState<SCStockItem[]>([]);
    const [loadingSC, setLoadingSC] = useState(false);
    const [scError, setScError] = useState('');
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState<OrderProduct[]>([]);
    const [clienteNome, setClienteNome] = useState('');
    const [clienteCpf, setClienteCpf] = useState('');
    const [observacao, setObservacao] = useState('');
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [syncingAll, setSyncingAll] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);

    const loadOrders = useCallback(async () => {
        setLoadingOrders(true);
        const data = await escalasoftOrderService.getOrders();
        setOrders(data);
        setLoadingOrders(false);
    }, []);

    const syncAllStatuses = useCallback(async (currentOrders: CDOrder[]) => {
        setSyncingAll(true);
        const updates = await escalasoftOrderService.syncAllStatuses(currentOrders);
        if (updates.size > 0) {
            setOrders(prev => prev.map(o => {
                const upd = updates.get(o.id);
                return upd ? { ...o, status: upd.status } : o;
            }));
        }
        setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        setSyncingAll(false);
    }, []);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    useEffect(() => {
        if (orders.length > 0 && !loadingOrders && !syncingAll) {
            syncAllStatuses(orders);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadingOrders]);

    const loadSCStock = async () => {
        setLoadingSC(true);
        setScError('');
        try {
            const items = await scStockService.fetchStockData();
            setScItems(items);
        } catch {
            setScError('Não foi possível carregar o estoque do CD. Verifique a conexão com a API.');
        }
        setLoadingSC(false);
    };

    useEffect(() => {
        if (tab === 'novo' && scItems.length === 0) loadSCStock();
    }, [tab]);

    const filteredSC = scItems.filter(item => {
        if (!item.Item || (item.SaldoDisponivel?.Quantidade ?? 0) <= 0) return false;
        if (!search) return true;
        return item.Item.toLowerCase().includes(search.toLowerCase());
    }).slice(0, 50);

    const addToCart = (item: SCStockItem) => {
        const parts = item.Item.includes(' - ') ? item.Item.split(' - ') : [item.Item, item.Item];
        const codigo = parts[0].trim();
        const nome = parts.slice(1).join(' - ').trim() || codigo;
        const qty = item.SaldoDisponivel?.Quantidade || 1;
        const valor = qty > 0 ? (item.SaldoDisponivel?.Valor || 0) / qty : 0;

        setCart(prev => {
            const existing = prev.findIndex(p => p.codigo_referencia === codigo);
            if (existing !== -1) {
                return prev.map((p, i) => i === existing
                    ? { ...p, quantidade: p.quantidade + 1, valor_total: (p.quantidade + 1) * p.valor_unitario }
                    : p
                );
            }
            return [...prev, { codigo_referencia: codigo, nome, quantidade: 1, valor_unitario: valor, valor_desconto: 0, valor_total: valor, bonificacao: 'N' }];
        });
    };

    const updateQty = (idx: number, qty: number) => {
        setCart(prev => prev.map((p, i) => i === idx
            ? { ...p, quantidade: qty, valor_total: qty * p.valor_unitario }
            : p
        ));
    };

    const removeFromCart = (idx: number) => setCart(prev => prev.filter((_, i) => i !== idx));
    const totalCart = cart.reduce((s, p) => s + p.valor_total, 0);

    const handleSend = async () => {
        if (!clienteNome.trim()) { setSendResult({ type: 'error', msg: 'Informe o nome do destinatário.' }); return; }
        if (cart.length === 0) { setSendResult({ type: 'error', msg: 'Adicione pelo menos um produto ao pedido.' }); return; }

        setSending(true);
        setSendResult(null);
        try {
            const result = await escalasoftOrderService.sendOrder({
                cliente_nome: clienteNome, cliente_cpf: clienteCpf, produtos: cart, observacao,
            });
            if (result.success) {
                setSendResult({ type: 'success', msg: `${result.message} Nº ${result.numero_pedido}${result.pedido_id ? ` (API #${result.pedido_id})` : ''}` });
                setCart([]); setClienteNome(''); setClienteCpf(''); setObservacao('');
                loadOrders();
                setTimeout(() => setTab('pedidos'), 1500);
            }
        } catch (e: any) {
            setSendResult({ type: 'error', msg: e.message || 'Erro ao enviar pedido.' });
        }
        setSending(false);
    };

    const handleStatusChange = (id: string, status: OrderStatus) => {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    };

    const activeOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
    const doneOrders = orders.filter(o => DONE_STATUSES.includes(o.status));

    const TABS: { key: PageTab; label: string; icon: React.ReactNode; count?: number }[] = [
        { key: 'pedidos',     label: 'Em andamento', icon: <ClipboardList className="w-4 h-4" />, count: activeOrders.length },
        { key: 'finalizados', label: 'Finalizados',   icon: <History className="w-4 h-4" />,       count: doneOrders.length },
        { key: 'novo',        label: 'Novo Pedido',   icon: <Plus className="w-4 h-4" /> },
    ];

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                    <PackageSearch className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">Pedidos ao CD</h1>
                    <p className="text-sm text-slate-400">Centro de Distribuição — Santa Catarina</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
                {TABS.map(({ key, label, icon, count }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                            tab === key
                                ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        {icon}{label}
                        {count !== undefined && count > 0 && (
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                                tab === key ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                            }`}>{count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── NOVO PEDIDO ── */}
            {tab === 'novo' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">Estoque disponível no CD</h2>
                            <button onClick={loadSCStock} disabled={loadingSC} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 disabled:opacity-50">
                                <RefreshCw className={`w-3 h-3 ${loadingSC ? 'animate-spin' : ''}`} /> Atualizar
                            </button>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar produto no CD..."
                                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>

                        {scError && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-600 dark:text-red-400">
                                <AlertCircle className="w-4 h-4 shrink-0" />{scError}
                            </div>
                        )}

                        <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                            {loadingSC ? (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                                </div>
                            ) : filteredSC.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-8">
                                    {scItems.length === 0 ? 'Clique em "Atualizar" para carregar o estoque do CD.' : 'Nenhum produto encontrado.'}
                                </p>
                            ) : filteredSC.map((item, i) => {
                                const [code, ...nameParts] = item.Item.split(' - ');
                                const qty = item.SaldoDisponivel?.Quantidade ?? 0;
                                const inCart = cart.some(p => p.codigo_referencia === code.trim());
                                return (
                                    <button
                                        key={i} onClick={() => addToCart(item)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all ${
                                            inCart
                                                ? 'border-brand-300 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-700'
                                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/10'
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{nameParts.join(' - ') || code}</p>
                                            <p className="text-xs text-slate-400">Ref: {code.trim()}</p>
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${qty > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500'}`}>
                                            {qty} un
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">Detalhes do Pedido</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Destinatário *</label>
                                <input value={clienteNome} onChange={e => setClienteNome(e.target.value)} placeholder="Nome completo ou empresa"
                                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">CPF / CNPJ</label>
                                <input value={clienteCpf} onChange={e => setClienteCpf(e.target.value)} placeholder="000.000.000-00"
                                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Observação</label>
                                <textarea value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Urgente, instruções especiais..." rows={2}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Produtos selecionados ({cart.length})</p>
                            {cart.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-4">Selecione produtos à esquerda</p>
                            ) : (
                                <div className="max-h-48 overflow-y-auto">
                                    {cart.map((item, i) => (
                                        <CartRow key={i} item={item} onQtyChange={qty => updateQty(i, qty)} onRemove={() => removeFromCart(i)} />
                                    ))}
                                </div>
                            )}
                            {cart.length > 0 && (
                                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                                    <span className="text-xs text-slate-500">Total do pedido</span>
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatCurrency(totalCart)}</span>
                                </div>
                            )}
                        </div>

                        {sendResult && (
                            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                                sendResult.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            }`}>
                                {sendResult.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                                <span>{sendResult.msg}</span>
                                <button onClick={() => setSendResult(null)} className="ml-auto shrink-0"><X className="w-4 h-4" /></button>
                            </div>
                        )}

                        <button
                            onClick={handleSend} disabled={sending || cart.length === 0}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors shadow-md"
                        >
                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            {sending ? 'Enviando...' : 'Enviar Pedido ao CD'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── EM ANDAMENTO ── */}
            {tab === 'pedidos' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-sm text-slate-500">{activeOrders.length} pedido(s) em andamento</p>
                        <div className="flex items-center gap-3">
                            {lastSync && <span className="text-xs text-slate-400">Sync: {lastSync}</span>}
                            <button onClick={() => syncAllStatuses(orders)} disabled={syncingAll || activeOrders.length === 0}
                                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 disabled:opacity-40 font-semibold">
                                <RefreshCcw className={`w-3 h-3 ${syncingAll ? 'animate-spin' : ''}`} />
                                {syncingAll ? 'Sincronizando...' : 'Sync API'}
                            </button>
                            <button onClick={loadOrders} disabled={loadingOrders} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 disabled:opacity-50">
                                <RefreshCw className={`w-3 h-3 ${loadingOrders ? 'animate-spin' : ''}`} /> Atualizar
                            </button>
                        </div>
                    </div>

                    {loadingOrders ? (
                        <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-brand-500" /></div>
                    ) : activeOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                            <Clock className="w-12 h-12 opacity-30" />
                            <p className="text-sm">Nenhum pedido em andamento.</p>
                            <button onClick={() => setTab('novo')} className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors">
                                <Plus className="w-4 h-4" /> Criar pedido
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeOrders.map(order => (
                                <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── FINALIZADOS ── */}
            {tab === 'finalizados' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500">{doneOrders.length} pedido(s) finalizado(s)</p>
                        <button onClick={loadOrders} disabled={loadingOrders} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 disabled:opacity-50">
                            <RefreshCw className={`w-3 h-3 ${loadingOrders ? 'animate-spin' : ''}`} /> Atualizar
                        </button>
                    </div>

                    {loadingOrders ? (
                        <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-brand-500" /></div>
                    ) : doneOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                            <History className="w-12 h-12 opacity-30" />
                            <p className="text-sm">Nenhum pedido finalizado ainda.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {doneOrders.map(order => (
                                <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
