import { useState, useEffect, useCallback } from 'react';
import {
    PackageSearch, Plus, Send, RefreshCw, ChevronDown, ChevronUp,
    CheckCircle2, Truck, Package, Clock, XCircle, AlertCircle,
    Loader2, Trash2, ClipboardList, X, Search, RefreshCcw, History,
    Hourglass, Weight, Box, Printer
} from 'lucide-react';
import { escalasoftOrderService, CDOrder, OrderProduct, OrderStatus, PedidoPendenteCD } from '../services/escalasoftOrderService';
import { scStockService } from '../services/scStockService';
import { SCStockItem } from '../types/scApi';

// ─── impressão ────────────────────────────────────────────────────────────────

function imprimirPedido(params: {
    numeroPedido: string;
    pedidoIdApi?: number | null;
    clienteNome: string;
    clienteCpf?: string;
    observacao?: string;
    produtos: OrderProduct[];
    valorTotal: number;
    status?: string;
    createdAt?: string;
}) {
    const now = params.createdAt ? new Date(params.createdAt) : new Date();
    const dataFormatada = now.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
    const linhasProdutos = params.produtos.map((p, i) => `
        <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#fff'}">
            <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#1e293b">${p.codigo_referencia}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;color:#334155">${p.nome}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:700;color:#1e293b">${p.quantidade}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:right;color:#475569">${p.valor_unitario > 0 ? p.valor_unitario.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : '—'}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a">${p.valor_total > 0 ? p.valor_total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : '—'}</td>
        </tr>
    `).join('');

    const win = window.open('', '_blank', 'width=820,height=1000');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
    <title>Pedido ${params.numeroPedido}</title>
    <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#0f172a;padding:40px 48px;font-size:13px}
        @media print{body{padding:24px 32px}@page{margin:10mm}}
        .header{display:flex;align-items:center;justify-content:space-between;padding-bottom:24px;border-bottom:3px solid #0f172a;margin-bottom:28px}
        .logo{height:52px;object-fit:contain}
        .logo-fallback{font-size:28px;font-weight:900;letter-spacing:-1px;color:#1d4ed8}
        .header-info{text-align:right}
        .doc-title{font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#0f172a}
        .doc-sub{font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.1em;margin-top:2px}
        .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;background:#dbeafe;color:#1d4ed8;margin-top:6px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
        .info-box{border:1.5px solid #e2e8f0;border-radius:12px;padding:16px 20px}
        .info-label{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.18em;color:#94a3b8;margin-bottom:6px}
        .info-value{font-size:14px;font-weight:700;color:#1e293b}
        .info-sub{font-size:11px;color:#64748b;margin-top:2px}
        table{width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;border:1.5px solid #e2e8f0}
        thead tr{background:#0f172a}
        thead th{padding:11px 14px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.15em;color:#94a3b8}
        thead th:nth-child(3){text-align:center}
        thead th:nth-child(4),thead th:nth-child(5){text-align:right}
        .total-row{background:#f1f5f9;font-weight:900}
        .total-row td{padding:12px 14px;font-size:14px;border-top:2px solid #e2e8f0}
        .obs-box{margin-top:20px;padding:14px 18px;background:#fffbeb;border:1.5px solid #fde68a;border-radius:12px;font-size:12px;color:#92400e}
        .footer{margin-top:36px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#94a3b8}
        .footer strong{color:#64748b}
        .divider{height:1px;background:linear-gradient(90deg,#3b82f6,#8b5cf6,#10b981);margin:20px 0;border:none}
    </style>
    </head><body>
    <div class="header">
        <img src="${window.location.origin}/logo.png" class="logo" onerror="this.style.display='none';document.getElementById('lf').style.display='block'" alt="MCI"/>
        <span id="lf" style="display:none" class="logo-fallback">MC<span style="color:#3b82f6">·</span></span>
        <div class="header-info">
            <div class="doc-title">Pedido ao CD</div>
            <div class="doc-sub">Centro de Distribuição — Santa Catarina</div>
            <div class="badge">${params.status ? params.status.replace('_',' ').toUpperCase() : 'ENVIADO'}</div>
        </div>
    </div>

    <div class="grid">
        <div class="info-box">
            <div class="info-label">Número do Pedido</div>
            <div class="info-value">${params.numeroPedido}</div>
            ${params.pedidoIdApi ? `<div class="info-sub">API Escalasoft #${params.pedidoIdApi}</div>` : ''}
        </div>
        <div class="info-box">
            <div class="info-label">Data de Emissão</div>
            <div class="info-value">${dataFormatada}</div>
        </div>
        <div class="info-box">
            <div class="info-label">Destinatário</div>
            <div class="info-value">${params.clienteNome || '—'}</div>
            ${params.clienteCpf ? `<div class="info-sub">CPF/CNPJ: ${params.clienteCpf}</div>` : ''}
        </div>
        <div class="info-box">
            <div class="info-label">Resumo</div>
            <div class="info-value">${params.produtos.length} ${params.produtos.length === 1 ? 'produto' : 'produtos'}</div>
            <div class="info-sub">${params.produtos.reduce((s,p)=>s+p.quantidade,0)} unidades no total</div>
        </div>
    </div>

    <hr class="divider"/>

    <table>
        <thead>
            <tr>
                <th>Referência</th><th>Produto</th><th>Qtd</th><th>Vl. Unit.</th><th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${linhasProdutos}
            <tr class="total-row">
                <td colspan="4" style="text-align:right;color:#64748b;font-size:12px">VALOR TOTAL DO PEDIDO</td>
                <td style="text-align:right;color:#1d4ed8;font-size:15px">${params.valorTotal > 0 ? params.valorTotal.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : '—'}</td>
            </tr>
        </tbody>
    </table>

    ${params.observacao ? `<div class="obs-box">⚠️ <strong>Observação:</strong> ${params.observacao}</div>` : ''}

    <div class="footer">
        <span>MCI Gestão Corporativa — <strong>estoquemci.vercel.app</strong></span>
        <span>Impresso em ${new Date().toLocaleString('pt-BR')}</span>
    </div>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
}

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

                    {/* Botão imprimir — sempre visível */}
                    <div className="flex flex-wrap gap-2 pt-1">
                        <button
                            onClick={e => { e.stopPropagation(); imprimirPedido({
                                numeroPedido: order.numero_pedido,
                                pedidoIdApi: order.pedido_id_api,
                                clienteNome: order.cliente_nome,
                                clienteCpf: order.cliente_cpf,
                                observacao: order.observacao,
                                produtos: order.produtos,
                                valorTotal: order.valor_total,
                                status: order.status,
                                createdAt: order.created_at,
                            }); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                        >
                            <Printer className="w-3 h-3" /> Imprimir
                        </button>
                    </div>

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

type PageTab = 'novo' | 'pedidos' | 'finalizados' | 'pendentes_cd';

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
    const [pendentesCD, setPendentesCD] = useState<PedidoPendenteCD[]>([]);
    const [loadingPendentes, setLoadingPendentes] = useState(false);
    const [pendentesError, setPendentesError] = useState('');

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
        if (tab === 'pendentes_cd' && pendentesCD.length === 0) loadPendentesCD();
    }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadPendentesCD = async () => {
        setLoadingPendentes(true);
        setPendentesError('');
        const data = await escalasoftOrderService.getPedidosPendentesCD();
        if (data.length === 0) setPendentesError('Nenhum pedido pendente encontrado ou API indisponível.');
        setPendentesCD(data);
        setLoadingPendentes(false);
    };

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
        { key: 'pedidos',      label: 'Em andamento',  icon: <ClipboardList className="w-4 h-4" />, count: activeOrders.length },
        { key: 'pendentes_cd', label: 'Pendentes CD',  icon: <Hourglass className="w-4 h-4" />,     count: pendentesCD.length || undefined },
        { key: 'finalizados',  label: 'Finalizados',   icon: <History className="w-4 h-4" />,        count: doneOrders.length },
        { key: 'novo',         label: 'Novo Pedido',   icon: <Plus className="w-4 h-4" /> },
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

                        <div className="flex gap-3">
                            <button
                                onClick={handleSend} disabled={sending || cart.length === 0}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors shadow-md"
                            >
                                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                {sending ? 'Enviando...' : 'Enviar Pedido ao CD'}
                            </button>

                            {cart.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => imprimirPedido({
                                        numeroPedido: 'RASCUNHO',
                                        clienteNome: clienteNome || 'Não informado',
                                        clienteCpf: clienteCpf,
                                        observacao: observacao,
                                        produtos: cart,
                                        valorTotal: totalCart,
                                    })}
                                    className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-semibold rounded-xl transition-colors"
                                    title="Imprimir rascunho"
                                >
                                    <Printer className="w-5 h-5" />
                                </button>
                            )}
                        </div>
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

            {/* ── PENDENTES CD ── */}
            {tab === 'pendentes_cd' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Pedidos Pendentes no CD</p>
                            <p className="text-xs text-slate-400">Aguardando documento fiscal ou não recebidos pelo cliente</p>
                        </div>
                        <button onClick={loadPendentesCD} disabled={loadingPendentes} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 disabled:opacity-50">
                            <RefreshCw className={`w-3 h-3 ${loadingPendentes ? 'animate-spin' : ''}`} /> Atualizar
                        </button>
                    </div>

                    {loadingPendentes ? (
                        <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-brand-500" /></div>
                    ) : pendentesError && pendentesCD.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                            <Hourglass className="w-12 h-12 opacity-30" />
                            <p className="text-sm">{pendentesError}</p>
                        </div>
                    ) : (
                        <>
                            {/* Totalizadores */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: 'Pedidos', value: pendentesCD.length, icon: <ClipboardList className="w-4 h-4 text-orange-400" /> },
                                    { label: 'Qtd Total', value: pendentesCD.reduce((s, p) => s + p.Quantidade, 0).toLocaleString('pt-BR'), icon: <Box className="w-4 h-4 text-blue-400" /> },
                                    { label: 'Peso Bruto', value: `${pendentesCD.reduce((s, p) => s + p.PesoBruto, 0).toLocaleString('pt-BR')} kg`, icon: <Weight className="w-4 h-4 text-violet-400" /> },
                                    { label: 'Valor Total', value: pendentesCD.reduce((s, p) => s + p.Valor, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: <Package className="w-4 h-4 text-emerald-400" /> },
                                ].map(({ label, value, icon }) => (
                                    <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">{icon}</div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                                            <p className="text-sm font-black text-slate-800 dark:text-slate-200">{value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Tabela */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                                                {['Nº Ordem', 'Nº Pedido', 'Qtd', 'Volumes', 'Peso Bruto', 'Peso Líq.', 'Valor', 'Embalagens'].map(h => (
                                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pendentesCD.map((p, i) => (
                                                <tr key={i} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-orange-50/40 dark:hover:bg-orange-900/10 transition-colors">
                                                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{p.NumeroOrdem}</td>
                                                    <td className="px-4 py-3 font-bold text-brand-600 dark:text-brand-400">{p.NumeroPedido}</td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.Quantidade.toLocaleString('pt-BR')}</td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.QuantidadeVolume}</td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.PesoBruto.toLocaleString('pt-BR')} kg</td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.PesoLiquido.toLocaleString('pt-BR')} kg</td>
                                                    <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-400">
                                                        {p.Valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.QuantidadeEmbalagem}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
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
