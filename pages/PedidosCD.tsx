import { useState, useEffect, useCallback, useRef } from 'react';
import {
    PackageSearch, Plus, Send, RefreshCw, ChevronDown, ChevronUp,
    CheckCircle2, Truck, Package, Clock, XCircle, AlertCircle,
    Loader2, Trash2, ClipboardList, X, Search, RefreshCcw, History,
    Hourglass, Box, Printer, UserPlus, Users, ShoppingCart,
    Info, ShieldAlert, FileText, Hash, CalendarDays
} from 'lucide-react';
import { escalasoftOrderService, CDOrder, OrderProduct, OrderStatus, PedidoPendenteCD, mapWmsStatus } from '../services/escalasoftOrderService';
import { scStockService } from '../services/scStockService';
import { clienteService, Cliente } from '../services/clienteService';
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

// ─── Modal de detalhe do produto ─────────────────────────────────────────────

function ProductModal({ item, onClose, onAdd }: {
    item: SCStockItem;
    onClose: () => void;
    onAdd: (item: SCStockItem, qty: number) => void;
}) {
    const [qty, setQty] = useState(1);
    const parts = item.Item.includes(' - ') ? item.Item.split(' - ') : [item.Item, item.Item];
    const code = parts[0].trim();
    const name = parts.slice(1).join(' - ').trim() || code;
    const dispQty = item.SaldoDisponivel?.Quantidade ?? 0;
    const reservQty = item.SaldoReservado?.Quantidade ?? 0;
    const bloqQty = item.SaldoBloqueado?.Quantidade ?? 0;
    const valor = item.SaldoDisponivel?.Valor ?? 0;
    const unitario = dispQty > 0 ? valor / dispQty : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-600 to-orange-500 p-6">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-orange-200 text-xs font-bold uppercase tracking-widest mb-1">Ref: {code}</p>
                            <h3 className="text-white font-black text-lg leading-snug">{name}</h3>
                            {item.Deposito && <p className="text-orange-200 text-xs mt-1">Depósito: {item.Deposito}</p>}
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors shrink-0 mt-1">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Métricas de estoque */}
                <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800">
                    {[
                        { label: 'Disponível', value: dispQty, icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, color: 'text-green-600 dark:text-green-400' },
                        { label: 'Reservado',  value: reservQty, icon: <Clock className="w-4 h-4 text-amber-500" />,   color: 'text-amber-600 dark:text-amber-400' },
                        { label: 'Bloqueado',  value: bloqQty,   icon: <XCircle className="w-4 h-4 text-red-400" />,   color: 'text-red-600 dark:text-red-400' },
                    ].map(({ label, value, icon, color }) => (
                        <div key={label} className="flex flex-col items-center py-4 px-2 gap-1">
                            {icon}
                            <span className={`text-xl font-black ${color}`}>{value}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                        </div>
                    ))}
                </div>

                {/* Detalhes */}
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Unid. Medida', value: item.UnidadeMedida || '—' },
                            { label: 'Lote', value: item.Lote || '—' },
                            { label: 'Vl. Total Estoque', value: valor > 0 ? valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—' },
                            { label: 'Vl. Unitário (est.)', value: unitario > 0 ? unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—' },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Seletor de quantidade e botão adicionar */}
                    <div className="flex items-center gap-3 pt-2">
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 shadow text-slate-700 dark:text-slate-300 font-bold text-lg flex items-center justify-center hover:bg-slate-50 transition-colors">−</button>
                            <input type="number" min={1} max={dispQty} value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-14 text-center font-bold text-slate-800 dark:text-slate-200 bg-transparent outline-none text-sm" />
                            <button onClick={() => setQty(q => Math.min(dispQty || 9999, q + 1))} className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 shadow text-slate-700 dark:text-slate-300 font-bold text-lg flex items-center justify-center hover:bg-slate-50 transition-colors">+</button>
                        </div>
                        <button
                            onClick={() => { onAdd(item, qty); onClose(); }}
                            disabled={dispQty === 0}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white font-bold rounded-xl transition-colors shadow-lg shadow-orange-500/20"
                        >
                            <ShoppingCart className="w-4 h-4" /> Adicionar ao Pedido
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Modal quick-add cliente ──────────────────────────────────────────────────

function QuickAddClienteModal({ onClose, onSaved }: {
    onClose: () => void;
    onSaved: (c: Cliente) => void;
}) {
    const [form, setForm] = useState({ cnpj_cpf: '', nome: '', email: '', telefone: '', cidade: '', uf: '', categoria: 'Clientes' });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.cnpj_cpf || !form.nome) { setErr('CPF/CNPJ e Nome são obrigatórios.'); return; }
        setSaving(true);
        await clienteService.salvar({ ...form, bairro: '', logradouro: '', numero: '', complemento: '', cep: '' });
        const lista = await clienteService.listar(form.nome);
        const saved = lista.find(c => c.cnpj_cpf === form.cnpj_cpf) || { ...form, id: '', bairro: '', logradouro: '', numero: '', complemento: '', cep: '', created_at: new Date().toISOString() };
        onSaved(saved as Cliente);
        setSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-gradient-to-r from-brand-600 to-brand-500 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <UserPlus className="w-5 h-5 text-white" />
                        <h3 className="text-white font-black text-base">Cadastrar Cliente</h3>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSave} className="p-6 space-y-4">
                    {err && <p className="text-xs text-red-500 font-semibold">{err}</p>}
                    {[
                        { label: 'CPF / CNPJ *', key: 'cnpj_cpf', placeholder: '000.000.000-00' },
                        { label: 'Nome / Razão Social *', key: 'nome', placeholder: 'Nome completo' },
                        { label: 'E-mail', key: 'email', placeholder: 'email@empresa.com.br' },
                        { label: 'Telefone', key: 'telefone', placeholder: '(47) 99999-9999' },
                        { label: 'Cidade', key: 'cidade', placeholder: 'São Paulo-SP' },
                    ].map(({ label, key, placeholder }) => (
                        <div key={key}>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</label>
                            <input value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                                placeholder={placeholder}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-brand-500/40" />
                        </div>
                    ))}
                    <button type="submit" disabled={saving} className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-black rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Salvar e Selecionar
                    </button>
                </form>
            </div>
        </div>
    );
}

// ─── Campo de busca de cliente com autocomplete ───────────────────────────────

function ClienteSelector({ value, cpf, onChange, onAddNew }: {
    value: string; cpf: string;
    onChange: (nome: string, cnpj: string, cliente?: Cliente) => void;
    onAddNew: () => void;
}) {
    const [search, setSearch] = useState(value);
    const [results, setResults] = useState<Cliente[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => { setSearch(value); }, [value]);

    const handleInput = async (v: string) => {
        setSearch(v);
        onChange(v, cpf);
        if (v.length < 2) { setResults([]); setOpen(false); return; }
        setLoading(true);
        const list = await clienteService.listar(v);
        setResults(list.slice(0, 8));
        setOpen(true);
        setLoading(false);
    };

    const select = (c: Cliente) => {
        setSearch(c.nome);
        setResults([]);
        setOpen(false);
        onChange(c.nome, c.cnpj_cpf, c); // passa objeto completo
    };

    return (
        <div ref={ref} className="relative">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => handleInput(e.target.value)}
                        onFocus={() => search.length >= 2 && setOpen(true)}
                        placeholder="Nome completo ou empresa"
                        className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    />
                    {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-slate-400" />}
                </div>
                <button type="button" onClick={onAddNew} title="Cadastrar novo cliente"
                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-colors shrink-0">
                    <UserPlus className="w-4 h-4" />
                </button>
            </div>

            {open && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-30 overflow-hidden">
                    {results.map(c => (
                        <button key={c.id} type="button" onClick={() => select(c)}
                            className="w-full text-left px-4 py-3 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{c.nome}</p>
                            <p className="text-xs text-slate-400">{c.cnpj_cpf}{c.cidade ? ` · ${c.cidade}` : ''}</p>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
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
        setSyncing(true);
        const wmsData = await escalasoftOrderService.consultarOrdem(order.numero_pedido);
        if (wmsData?.situacao) {
            setApiSituacao(wmsData.situacao);
            const mapped = mapWmsStatus(wmsData.situacao);
            if (mapped !== order.status || wmsData.situacao !== order.status_wms) {
                await escalasoftOrderService.updateStatus(order.id, mapped, {
                    status_wms:    wmsData.situacao,
                    transportadora: wmsData.transportadora ?? order.transportadora,
                    carregamento:  wmsData.carregamento   ?? order.carregamento,
                    volume:        wmsData.volume         ?? order.volume,
                    nota_fiscal:   wmsData.nota_fiscal    ?? order.nota_fiscal,
                    numeros_serie: wmsData.numeros_serie  ?? order.numeros_serie,
                });
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
                    {/* Campos do painel WMS */}
                    {(order.status_wms || order.transportadora || order.nota_fiscal || order.carregamento || order.numeros_serie) && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            {order.status_wms && (
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Status WMS</p>
                                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{order.status_wms}</p>
                                </div>
                            )}
                            {order.transportadora && (
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1"><Truck className="w-2.5 h-2.5" />Transportadora</p>
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{order.transportadora}</p>
                                </div>
                            )}
                            {order.carregamento && (
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1"><CalendarDays className="w-2.5 h-2.5" />Carregamento</p>
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{order.carregamento}</p>
                                </div>
                            )}
                            {order.nota_fiscal && (
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1"><FileText className="w-2.5 h-2.5" />Nota Fiscal</p>
                                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{order.nota_fiscal}</p>
                                </div>
                            )}
                            {order.volume != null && (
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1"><Box className="w-2.5 h-2.5" />Volumes</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{order.volume}</p>
                                </div>
                            )}
                            {order.numeros_serie && (
                                <div className="col-span-2 sm:col-span-3">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1"><Hash className="w-2.5 h-2.5" />Nº de Série</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 break-all">{order.numeros_serie}</p>
                                </div>
                            )}
                        </div>
                    )}

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

export function PedidosCD({ isMaster = false, userEmail = '' }: { isMaster?: boolean; userEmail?: string }) {
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
    const [vendedor, setVendedor] = useState('');
    const [cep, setCep] = useState('');
    const [uf, setUf] = useState('');
    const [municipio, setMunicipio] = useState('');
    const [codigoMunicipio, setCodigoMunicipio] = useState<number | undefined>(undefined); // código IBGE (ViaCEP)
    const [bairro, setBairro] = useState('');
    const [logradouro, setLogradouro] = useState('');
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<SCStockItem | null>(null);
    const [showQuickCliente, setShowQuickCliente] = useState(false);
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
                return upd ? { ...o, status: upd.status, status_wms: upd.status_wms } : o;
            }));
        }
        setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        setSyncingAll(false);
    }, []);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    // Auto-sync de status desabilitado — endpoint de status não existe no servidor.
    // O usuário pode sincronizar manualmente pelo botão "Sync API".

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

    const addToCart = (item: SCStockItem, addQty = 1) => {
        const parts = item.Item.includes(' - ') ? item.Item.split(' - ') : [item.Item, item.Item];
        const codigo = parts[0].trim();
        const nome = parts.slice(1).join(' - ').trim() || codigo;
        const stockQty = item.SaldoDisponivel?.Quantidade || 1;
        const valor = stockQty > 0 ? (item.SaldoDisponivel?.Valor || 0) / stockQty : 0;

        setCart(prev => {
            const existing = prev.findIndex(p => p.codigo_referencia === codigo);
            if (existing !== -1) {
                const novaQty = prev[existing].quantidade + addQty;
                return prev.map((p, i) => i === existing
                    ? { ...p, quantidade: novaQty, valor_total: novaQty * p.valor_unitario }
                    : p
                );
            }
            return [...prev, { codigo_referencia: codigo, nome, quantidade: addQty, valor_unitario: valor, valor_desconto: 0, valor_total: addQty * valor, bonificacao: 'N' }];
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
            const obsCompleta = [vendedor ? `Vendedor: ${vendedor}` : '', observacao].filter(Boolean).join(' | ');
            const result = await escalasoftOrderService.sendOrder({
                cliente_nome: clienteNome,
                cliente_cpf: clienteCpf,
                produtos: cart,
                observacao: obsCompleta,
                cep: parseInt(cep.replace(/\D/g, '') || '0', 10),
                uf,
                municipio,
                codigo_municipio: codigoMunicipio,
                bairro,
                logradouro,
                vendedor_email: userEmail || undefined,
                vendedor_nome: vendedor || undefined,
            });
            if (result.success) {
                setSendResult({ type: 'success', msg: `${result.message} Nº ${result.numero_pedido}${result.pedido_id ? ` (API #${result.pedido_id})` : ''}` });
                setCart([]); setClienteNome(''); setClienteCpf(''); setObservacao(''); setVendedor('');
                setCep(''); setUf(''); setMunicipio(''); setCodigoMunicipio(undefined); setBairro(''); setLogradouro('');
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
        <>
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
            {tab === 'novo' && !isMaster && (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                    <ShieldAlert className="w-16 h-16 opacity-30" />
                    <p className="text-sm font-semibold">Acesso restrito ao super usuário.</p>
                </div>
            )}
            {tab === 'novo' && isMaster && (
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
                                        key={i} onClick={() => setSelectedProduct(item)}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all group ${
                                            inCart
                                                ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700'
                                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-orange-300 hover:bg-orange-50/40 dark:hover:bg-orange-900/10'
                                        }`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{nameParts.join(' - ') || code}</p>
                                            <p className="text-xs text-slate-400">Ref: {code.trim()}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                            {inCart && <CheckCircle2 className="w-3.5 h-3.5 text-orange-500" />}
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${qty > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500'}`}>
                                                {qty} un
                                            </span>
                                            <Info className="w-3.5 h-3.5 text-slate-300 group-hover:text-orange-400 transition-colors" />
                                        </div>
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
                                <ClienteSelector
                                    value={clienteNome}
                                    cpf={clienteCpf}
                                    onChange={(nome, cnpj, cliente) => {
                                        setClienteNome(nome);
                                        setClienteCpf(cnpj);
                                        // Preenche campos de endereço automaticamente
                                        if (cliente) {
                                            setCep(cliente.cep || '');
                                            setUf(cliente.uf || '');
                                            setMunicipio(cliente.cidade?.split('-')[0]?.trim() || '');
                                            setBairro(cliente.bairro || '');
                                            setLogradouro(cliente.logradouro || '');
                                            // Cadastro do cliente não traz código IBGE — busca pelo CEP se houver
                                            const cepDigits = (cliente.cep || '').replace(/\D/g, '');
                                            if (cepDigits.length === 8) {
                                                fetch(`https://viacep.com.br/ws/${cepDigits}/json/`)
                                                    .then(r => r.json())
                                                    .then(d => setCodigoMunicipio(!d.erro && d.ibge ? parseInt(d.ibge, 10) : undefined))
                                                    .catch(() => setCodigoMunicipio(undefined));
                                            } else {
                                                setCodigoMunicipio(undefined);
                                            }
                                        }
                                    }}
                                    onAddNew={() => setShowQuickCliente(true)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">CPF / CNPJ</label>
                                <input value={clienteCpf} onChange={e => setClienteCpf(e.target.value)} placeholder="Preenchido ao selecionar cliente"
                                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
                            </div>
                            {/* Campos de endereço — obrigatórios pela API */}
                            <div className="pt-1 pb-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    Endereço de Entrega (opcional)
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">CEP</label>
                                    <input value={cep} onChange={e => {
                                        const v = e.target.value.replace(/\D/g, '').slice(0, 8);
                                        setCep(v);
                                        if (v.length === 8) {
                                            fetch(`https://viacep.com.br/ws/${v}/json/`)
                                                .then(r => r.json())
                                                .then(d => { if (!d.erro) { setUf(d.uf || ''); setMunicipio(d.localidade || ''); setBairro(d.bairro || ''); setLogradouro(d.logradouro || ''); setCodigoMunicipio(d.ibge ? parseInt(d.ibge, 10) : undefined); } })
                                                .catch(() => {});
                                        }
                                    }} placeholder="00000000"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">UF</label>
                                    <input value={uf} onChange={e => setUf(e.target.value.toUpperCase().slice(0, 2))} placeholder="SC"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Município</label>
                                    <input value={municipio} onChange={e => setMunicipio(e.target.value)} placeholder="São Paulo"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Bairro</label>
                                    <input value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Centro"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Logradouro</label>
                                <input value={logradouro} onChange={e => setLogradouro(e.target.value)} placeholder="Rua das Flores, 123"
                                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Vendedor</label>
                                <input value={vendedor} onChange={e => setVendedor(e.target.value)} placeholder="Nome do vendedor responsável"
                                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
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
                                        observacao: [vendedor ? `Vendedor: ${vendedor}` : '', observacao].filter(Boolean).join(' | '),
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
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {[
                                    { label: 'Pedidos', value: pendentesCD.length, icon: <ClipboardList className="w-4 h-4 text-orange-400" /> },
                                    { label: 'Itens Total', value: pendentesCD.reduce((s, p) => s + p.produtos.reduce((a, pr) => a + pr.quantidade, 0), 0).toLocaleString('pt-BR'), icon: <Box className="w-4 h-4 text-blue-400" /> },
                                    { label: 'Valor Total', value: pendentesCD.reduce((s, p) => s + p.valor_total, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: <Package className="w-4 h-4 text-emerald-400" /> },
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
                                                {['Nº Pedido', 'Ordem WMS', 'Cliente', 'Situação WMS', 'Transportadora', 'Carregamento', 'Vol.', 'NF', 'Nº Série', 'Valor', 'Data'].map(h => (
                                                    <th key={h} className="px-3 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pendentesCD.map((p) => (
                                                <tr key={p.id} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-orange-50/40 dark:hover:bg-orange-900/10 transition-colors">
                                                    <td className="px-3 py-3 font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">{p.numero_pedido}</td>
                                                    <td className="px-3 py-3 font-bold text-slate-800 dark:text-slate-200">{p.numeroOrdemApi ?? '—'}</td>
                                                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300 max-w-[140px] truncate">{p.cliente_nome}</td>
                                                    <td className="px-3 py-3">
                                                        {p.status_wms ? (
                                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                                                                p.status_wms === 'Encerrada'           ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                                                                p.status_wms === 'Em execução'         ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                                                                p.status_wms === 'Ag gerar embarque'   ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                                                                p.status_wms === 'Ag embarque'         ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' :
                                                                p.status_wms === 'Ag gerar devolução'  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                                                                'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                                                            }`}>{p.status_wms}</span>
                                                        ) : (
                                                            <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300 max-w-[120px] truncate text-xs">{p.transportadora ?? '—'}</td>
                                                    <td className="px-3 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">{p.carregamento ?? '—'}</td>
                                                    <td className="px-3 py-3 text-center font-bold text-slate-700 dark:text-slate-300">{p.volume ?? '—'}</td>
                                                    <td className="px-3 py-3 font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{p.nota_fiscal ?? '—'}</td>
                                                    <td className="px-3 py-3 text-slate-500 dark:text-slate-400 text-xs max-w-[140px] truncate" title={p.numeros_serie ?? ''}>{p.numeros_serie ?? '—'}</td>
                                                    <td className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                        {p.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                                                        {new Date(p.created_at).toLocaleDateString('pt-BR')}
                                                    </td>
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

        {/* ── Modais ── */}
        {selectedProduct && (
            <ProductModal
                item={selectedProduct}
                onClose={() => setSelectedProduct(null)}
                onAdd={(item, qty) => addToCart(item, qty)}
            />
        )}
        {showQuickCliente && (
            <QuickAddClienteModal
                onClose={() => setShowQuickCliente(false)}
                onSaved={c => { setClienteNome(c.nome); setClienteCpf(c.cnpj_cpf); }}
            />
        )}
        </>
    );
}
