import { useState, useEffect, useCallback, useRef } from 'react';
import {
    PackageSearch, RefreshCw, ChevronDown, ChevronUp,
    CheckCircle2, Truck, Package,
    Loader2, FileText, Hash, CalendarDays, Box,
    Wifi, WifiOff, Send, AlertCircle, TrendingUp,
    DollarSign, ClipboardList, Hourglass
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CDOrder, OrderStatus } from '../services/escalasoftOrderService';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface MeusPedidosProps {
    userEmail: string;
    userName?: string;
}

// ─── Config de status WMS (cores do painel Sanco) ────────────────────────────

const WMS_STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
    'Encerrada':          { label: 'Encerrada',          badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',   dot: 'bg-green-500' },
    'Em execução':        { label: 'Em Execução',        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',   dot: 'bg-amber-500' },
    'Ag gerar embarque':  { label: 'Ag. Embarque',       badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',       dot: 'bg-blue-500' },
    'Ag embarque':        { label: 'Aguardando Embarque',badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', dot: 'bg-violet-500' },
    'Ag gerar devolução': { label: 'Ag. Devolução',      badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',           dot: 'bg-red-500' },
};

const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; badge: string }> = {
    enviado:      { label: 'Enviado',       badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    confirmado:   { label: 'Confirmado',    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
    em_separacao: { label: 'Em Separação',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    em_transito:  { label: 'Em Trânsito',   badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
    entregue:     { label: 'Entregue',      badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    cancelado:    { label: 'Cancelado',     badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

function formatCurrency(v: number | null | undefined) {
    if (v == null) return '—';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

// ─── Card de pedido do vendedor ───────────────────────────────────────────────

function PedidoCard({ order, isNew }: { order: CDOrder; isNew: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const wmsConf = order.status_wms ? (WMS_STATUS_CONFIG[order.status_wms] ?? {
        label: order.status_wms,
        badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
        dot: 'bg-slate-400',
    }) : null;
    const orderConf = ORDER_STATUS_CONFIG[order.status];
    const faturado = !!order.nota_fiscal;

    return (
        <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all duration-500 ${
            isNew ? 'ring-2 ring-brand-400 ring-offset-1' : ''
        } ${
            faturado
                ? 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
        }`}>
            {/* Badge "FATURADO" destaque */}
            {faturado && (
                <div className="bg-green-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3" />
                    Faturado — NF {order.nota_fiscal}
                    {order.valor_nota_fiscal != null && (
                        <span className="ml-auto font-bold">{formatCurrency(order.valor_nota_fiscal)}</span>
                    )}
                </div>
            )}

            {/* Header clicável */}
            <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                onClick={() => setExpanded(v => !v)}
            >
                {/* Dot status WMS */}
                <div className={`shrink-0 w-3 h-3 rounded-full ${wmsConf?.dot ?? 'bg-slate-300'}`} />

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{order.numero_pedido}</span>
                        {order.pedido_id_api && (
                            <span className="text-xs text-slate-400">WMS #{order.pedido_id_api}</span>
                        )}
                        {/* Status WMS tem prioridade visual */}
                        {wmsConf ? (
                            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${wmsConf.badge}`}>
                                {wmsConf.label}
                            </span>
                        ) : (
                            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${orderConf.badge}`}>
                                {orderConf.label}
                            </span>
                        )}
                        {isNew && (
                            <span className="text-[9px] font-black uppercase text-brand-600 dark:text-brand-400 animate-pulse">● novo</span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {order.cliente_nome} · {formatDate(order.created_at)}
                    </p>
                </div>

                <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatCurrency(order.valor_total)}</p>
                    <p className="text-xs text-slate-400">{order.produtos?.length ?? 0} {order.produtos?.length === 1 ? 'item' : 'itens'}</p>
                </div>

                {expanded
                    ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                }
            </div>

            {/* Detalhe expandido */}
            {expanded && (
                <div className="border-t border-slate-200/60 dark:border-slate-700 px-4 py-4 space-y-4 bg-slate-50/50 dark:bg-slate-800/50">

                    {/* Dados do WMS */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                            { label: 'Nota Fiscal',    value: order.nota_fiscal,    icon: <FileText className="w-3 h-3" />, highlight: faturado },
                            { label: 'Valor NF',       value: formatCurrency(order.valor_nota_fiscal), icon: <DollarSign className="w-3 h-3" />, highlight: faturado },
                            { label: 'Transportadora', value: order.transportadora, icon: <Truck className="w-3 h-3" />,    highlight: false },
                            { label: 'Carregamento',   value: order.carregamento,   icon: <CalendarDays className="w-3 h-3" />, highlight: false },
                            { label: 'Volumes',        value: order.volume != null ? String(order.volume) : null, icon: <Box className="w-3 h-3" />, highlight: false },
                            { label: 'Status WMS',     value: order.status_wms,     icon: <Package className="w-3 h-3" />,  highlight: false },
                        ].map(({ label, value, icon, highlight }) => value ? (
                            <div key={label} className={`rounded-xl px-3 py-2.5 ${highlight ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600'}`}>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">{icon}{label}</p>
                                <p className={`text-xs font-bold truncate ${highlight ? 'text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-200'}`}>{value}</p>
                            </div>
                        ) : null)}
                    </div>

                    {/* Nº de Série */}
                    {order.numeros_serie && (
                        <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1"><Hash className="w-3 h-3" />Números de Série</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 break-all">{order.numeros_serie}</p>
                        </div>
                    )}

                    {/* Produtos */}
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Itens do Pedido</p>
                        {order.produtos?.map((p, i) => (
                            <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                <span className="text-slate-600 dark:text-slate-400 truncate flex-1">
                                    <span className="font-mono text-slate-400 mr-1">{p.codigo_referencia}</span>
                                    {p.nome}
                                </span>
                                <span className="text-slate-500 dark:text-slate-400 ml-2 shrink-0">×{p.quantidade}</span>
                                <span className="text-slate-700 dark:text-slate-300 font-semibold ml-3 shrink-0">{formatCurrency(p.valor_total)}</span>
                            </div>
                        ))}
                    </div>

                    {order.observacao && (
                        <p className="text-xs text-slate-500 italic border-t border-slate-200 dark:border-slate-700 pt-2">
                            {order.observacao}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function MeusPedidos({ userEmail, userName }: MeusPedidosProps) {
    const [orders, setOrders] = useState<CDOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [realtimeOk, setRealtimeOk] = useState(false);
    const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState<'todos' | 'ativos' | 'faturados'>('todos');
    const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);

    // ── Carrega pedidos do vendedor ──────────────────────────────────────────
    const loadOrders = useCallback(async () => {
        if (!supabase) { setLoading(false); return; }
        setLoading(true);
        const { data, error } = await supabase
            .from('cd_orders')
            .select('*')
            .eq('vendedor_email', userEmail)
            .order('created_at', { ascending: false });

        if (!error && data) setOrders(data as CDOrder[]);
        setLoading(false);
    }, [userEmail]);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    // ── Supabase Realtime ────────────────────────────────────────────────────
    useEffect(() => {
        if (!supabase) return;
        const sb = supabase;

        // Limpa canal anterior se houver
        if (channelRef.current) {
            sb.removeChannel(channelRef.current);
        }

        const channel = sb
            .channel(`meus-pedidos-${userEmail}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'cd_orders',
                    filter: `vendedor_email=eq.${userEmail}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const novo = payload.new as CDOrder;
                        setOrders(prev => [novo, ...prev]);
                        setNewOrderIds(prev => new Set([...prev, novo.id]));
                        setTimeout(() => setNewOrderIds(prev => {
                            const next = new Set(prev);
                            next.delete(novo.id);
                            return next;
                        }), 8000);
                    } else if (payload.eventType === 'UPDATE') {
                        const upd = payload.new as CDOrder;
                        setOrders(prev => prev.map(o => o.id === upd.id ? upd : o));
                        // Destaca se NF foi gerada agora
                        if (upd.nota_fiscal) {
                            setNewOrderIds(prev => new Set([...prev, upd.id]));
                            setTimeout(() => setNewOrderIds(prev => {
                                const next = new Set(prev);
                                next.delete(upd.id);
                                return next;
                            }), 8000);
                        }
                    } else if (payload.eventType === 'DELETE') {
                        setOrders(prev => prev.filter(o => o.id !== payload.old.id));
                    }
                }
            )
            .subscribe((status) => {
                setRealtimeOk(status === 'SUBSCRIBED');
            });

        channelRef.current = channel;
        return () => { sb.removeChannel(channel); };
    }, [userEmail]);

    // ── Totalizadores ────────────────────────────────────────────────────────
    const totalPedidos    = orders.length;
    const totalFaturados  = orders.filter(o => !!o.nota_fiscal).length;
    const totalEmAberto   = orders.filter(o => !o.nota_fiscal && o.status !== 'cancelado').length;
    const valorFaturado   = orders.filter(o => o.valor_nota_fiscal != null).reduce((s, o) => s + (o.valor_nota_fiscal ?? 0), 0);
    const valorPendente   = orders.filter(o => !o.nota_fiscal && o.status !== 'cancelado').reduce((s, o) => s + o.valor_total, 0);

    // ── Filtros ──────────────────────────────────────────────────────────────
    const filtered = orders.filter(o => {
        if (filter === 'faturados') return !!o.nota_fiscal;
        if (filter === 'ativos')    return !o.nota_fiscal && o.status !== 'cancelado';
        return true;
    });

    return (
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-brand-100 dark:bg-brand-900/30 rounded-xl">
                        <PackageSearch className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">Meus Pedidos</h1>
                        <p className="text-xs text-slate-400">{userName || userEmail}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Indicador Realtime */}
                    <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full ${
                        realtimeOk
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700'
                    }`}>
                        {realtimeOk
                            ? <><Wifi className="w-3 h-3" /> Ao vivo</>
                            : <><WifiOff className="w-3 h-3" /> Offline</>
                        }
                    </div>
                    <button onClick={loadOrders} disabled={loading}
                        className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 disabled:opacity-50 font-semibold px-2 py-1.5">
                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Atualizar
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total Pedidos',  value: totalPedidos,           icon: <ClipboardList className="w-4 h-4 text-slate-400" />,   color: 'text-slate-800 dark:text-slate-200' },
                    { label: 'Em Aberto',      value: totalEmAberto,          icon: <Hourglass className="w-4 h-4 text-amber-500" />,        color: 'text-amber-700 dark:text-amber-400' },
                    { label: 'Faturados',      value: totalFaturados,         icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,     color: 'text-green-700 dark:text-green-400' },
                    { label: 'Valor Faturado', value: formatCurrency(valorFaturado), icon: <TrendingUp className="w-4 h-4 text-brand-500" />, color: 'text-brand-700 dark:text-brand-400' },
                ].map(({ label, value, icon, color }) => (
                    <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">{icon}<p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p></div>
                        <p className={`text-lg font-black ${color}`}>{value}</p>
                    </div>
                ))}
            </div>

            {/* Alerta de valor pendente */}
            {valorPendente > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-amber-800 dark:text-amber-300">
                        <strong>{formatCurrency(valorPendente)}</strong> em pedidos aguardando faturamento
                    </span>
                </div>
            )}

            {/* Filtros */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
                {([
                    { key: 'todos',     label: 'Todos',     count: totalPedidos },
                    { key: 'ativos',    label: 'Em Aberto', count: totalEmAberto },
                    { key: 'faturados', label: 'Faturados', count: totalFaturados },
                ] as const).map(({ key, label, count }) => (
                    <button key={key} onClick={() => setFilter(key)}
                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                            filter === key
                                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                        }`}>
                        {label}
                        {count > 0 && (
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                                filter === key ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                            }`}>{count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Lista de pedidos */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                    {filter === 'faturados'
                        ? <><FileText className="w-12 h-12 opacity-30" /><p className="text-sm">Nenhum pedido faturado ainda.</p></>
                        : <><Send className="w-12 h-12 opacity-30" /><p className="text-sm">Nenhum pedido encontrado.</p><p className="text-xs">Seus pedidos ao CD aparecerão aqui em tempo real.</p></>
                    }
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(order => (
                        <PedidoCard
                            key={order.id}
                            order={order}
                            isNew={newOrderIds.has(order.id)}
                        />
                    ))}
                </div>
            )}

            {/* Legenda Realtime */}
            {realtimeOk && (
                <p className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Conectado — esta página atualiza automaticamente quando um pedido é faturado ou tem seu status alterado.
                </p>
            )}
        </div>
    );
}
