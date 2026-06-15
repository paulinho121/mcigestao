import { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeft, Plus, Trash2, Printer, Save, Edit2, X, ChevronDown, ChevronUp,
    DollarSign, FileText, AlertTriangle, Search
} from 'lucide-react';
import {
    controleFinanceiroService,
    FichaFinanceira, NotaFinanceira, Parcela
} from '../services/controleFinanceiroService';

interface Props { onBack: () => void; }

const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const fmtDate = (s: string) => {
    if (!s) return '—';
    const [y, m, d] = s.split('-');
    return d && m && y ? `${d}/${m}/${y}` : s;
};

const diasAtraso = (vencimento: string, dataPgto?: string): number => {
    if (!vencimento) return 0;
    const ref = dataPgto ? new Date(dataPgto) : new Date();
    const venc = new Date(vencimento);
    ref.setHours(0, 0, 0, 0);
    venc.setHours(0, 0, 0, 0);
    const diff = Math.floor((ref.getTime() - venc.getTime()) / 86400000);
    return diff > 0 ? diff : 0;
};

const TIPOS_NF = [
    'NF LOCAÇÃO SP', 'NF LOCAÇÃO SC', 'NF LOCAÇÃO CE',
    'NF VENDA SP', 'NF VENDA SC', 'NF VENDA CE',
    'CONTR LOC SP', 'CONTR LOC SC', 'CONTR LOC CE',
    'NF DE DEVOLUÇÃO', 'DESCONTO DIFAL', 'PRÉ VENDA', 'OUTRO',
];

function novaFicha(): Omit<FichaFinanceira, 'id' | 'created_at'> {
    return { cliente_nome: '', cliente_cnpj: '', descricao: '', notas: [], parcelas: [] };
}

function novaNota(fichaId: string, ordem: number): NotaFinanceira {
    return { id: crypto.randomUUID(), ficha_id: fichaId, tipo: 'NF LOCAÇÃO SP', numero_nf: '', valor: 0, observacao: '', ordem };
}

function novaParcela(nfId: string, numero: number): Parcela {
    return { id: crypto.randomUUID(), nf_id: nfId, numero, valor: 0, vencimento: '', data_pagamento: '', juros: 0, multa: 0, observacao: '' };
}

// ─── Impressão ──────────────────────────────────────────────────────────────

function gerarHtmlImpressao(ficha: FichaFinanceira): string {
    const totalNotas = ficha.notas.reduce((s, n) => s + (n.valor || 0), 0);

    const linhasNotas = ficha.notas.map(n => `
        <tr>
            <td>${n.tipo}${n.numero_nf ? ` <span style="color:#555">${n.numero_nf}</span>` : ''}${n.observacao ? ` — ${n.observacao}` : ''}</td>
            <td style="text-align:right;font-weight:600">${fmt(n.valor)}</td>
        </tr>`).join('');

    const grupos = ficha.notas.map(nota => {
        const parcelas = ficha.parcelas.filter(p => p.nf_id === nota.id).sort((a, b) => a.numero - b.numero);
        if (!parcelas.length) return '';
        const totalNf = parcelas.reduce((s, p) => s + (p.valor || 0), 0);
        const linhas = parcelas.map(p => {
            const atraso = diasAtraso(p.vencimento, p.data_pagamento || undefined);
            const valorDevido = (p.valor || 0) + (p.juros || 0) + (p.multa || 0);
            const statusColor = p.data_pagamento ? '#16a34a' : atraso > 0 ? '#dc2626' : '#111';
            return `<tr style="color:${statusColor}">
                <td style="text-align:center">${p.numero}</td>
                <td style="text-align:right">${fmt(p.valor)}</td>
                <td style="text-align:center">${fmtDate(p.vencimento)}</td>
                <td style="text-align:center">${p.data_pagamento ? fmtDate(p.data_pagamento) : ''}</td>
                <td style="text-align:center">${atraso > 0 && !p.data_pagamento ? atraso : ''}</td>
                <td style="text-align:right">${p.juros ? fmt(p.juros) : ''}</td>
                <td style="text-align:right">${p.multa ? fmt(p.multa) : ''}</td>
                <td style="text-align:right;font-weight:600">${p.data_pagamento ? fmt(p.valor) : (valorDevido !== p.valor ? fmt(valorDevido) : fmt(p.valor))}</td>
            </tr>`;
        }).join('');

        return `
        <div style="margin-bottom:12px">
            <table style="width:100%;border-collapse:collapse;font-size:9pt">
                <thead>
                    <tr style="background:#1e40af;color:#fff">
                        <th colspan="8" style="text-align:left;padding:4px 8px">
                            ${nota.tipo}${nota.numero_nf ? ` — ${nota.numero_nf}` : ''}${nota.observacao ? ` — ${nota.observacao}` : ''}
                        </th>
                    </tr>
                    <tr style="background:#dbeafe;font-size:8pt">
                        <th style="width:40px;padding:3px 4px">PARCELA</th>
                        <th style="text-align:right;padding:3px 4px">VALOR</th>
                        <th style="text-align:center;padding:3px 4px">VENCIMENTO</th>
                        <th style="text-align:center;padding:3px 4px">DATA PGT</th>
                        <th style="text-align:center;padding:3px 4px">DIAS EM ATRASO</th>
                        <th style="text-align:right;padding:3px 4px">JUROS</th>
                        <th style="text-align:right;padding:3px 4px">MULTA</th>
                        <th style="text-align:right;padding:3px 4px">VALOR DEVIDO</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhas}
                </tbody>
                <tfoot>
                    <tr style="background:#f0f9ff;font-weight:700">
                        <td colspan="7" style="padding:3px 4px">TOTAL ${nota.tipo}${nota.numero_nf ? ` ${nota.numero_nf}` : ''}</td>
                        <td style="text-align:right;padding:3px 4px">${fmt(totalNf)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>`;
    }).join('');

    const emAberto = ficha.parcelas
        .filter(p => !p.data_pagamento && diasAtraso(p.vencimento) > 0)
        .reduce((s, p) => s + (p.valor || 0) + (p.juros || 0) + (p.multa || 0), 0);

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Controle Financeiro — ${ficha.cliente_nome}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 9pt; color: #111; padding: 16px; }
        table { border-collapse: collapse; }
        td, th { padding: 3px 6px; border: 1px solid #ccc; }
        @media print { @page { margin: 10mm; } }
    </style>
    </head><body>
        <div style="border:2px solid #1e40af;border-radius:4px;padding:10px;margin-bottom:14px">
            <div style="font-size:13pt;font-weight:700;color:#1e40af">${ficha.cliente_nome}</div>
            ${ficha.cliente_cnpj ? `<div style="font-size:9pt;color:#555">CNPJ: ${ficha.cliente_cnpj}</div>` : ''}
            ${ficha.descricao ? `<div style="font-size:9pt;color:#555;margin-top:2px">${ficha.descricao}</div>` : ''}
        </div>

        <table style="width:100%;margin-bottom:14px;font-size:9pt">
            <thead>
                <tr style="background:#1e40af;color:#fff">
                    <th style="text-align:left;padding:4px 8px">DOCUMENTO</th>
                    <th style="text-align:right;padding:4px 8px">VALOR</th>
                </tr>
            </thead>
            <tbody>${linhasNotas}</tbody>
            <tfoot>
                <tr style="background:#dbeafe;font-weight:700">
                    <td>TOTAL</td>
                    <td style="text-align:right">${fmt(totalNotas)}</td>
                </tr>
            </tfoot>
        </table>

        ${emAberto > 0 ? `<div style="background:#dc2626;color:#fff;text-align:center;font-weight:700;font-size:11pt;padding:6px;margin-bottom:14px;border-radius:4px">
            VALOR EM ABERTO: ${fmt(emAberto)}
        </div>` : ''}

        ${grupos}

        <div style="text-align:right;font-size:8pt;color:#888;margin-top:8px">
            Emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
        </div>
    </body></html>`;
}

async function imprimirFicha(ficha: FichaFinanceira) {
    const html = gerarHtmlImpressao(ficha);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 600);
}

// ─── Componente de edição de ficha ──────────────────────────────────────────

interface EditorProps {
    fichaInicial?: FichaFinanceira;
    onSalvar: (ficha: FichaFinanceira) => Promise<void>;
    onCancelar: () => void;
}

function EditorFicha({ fichaInicial, onSalvar, onCancelar }: EditorProps) {
    const [salvando, setSalvando] = useState(false);
    const [ficha, setFicha] = useState<FichaFinanceira>(() =>
        fichaInicial ?? { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...novaFicha() }
    );
    const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

    const toggleExpand = (id: string) =>
        setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));

    const setField = (k: keyof FichaFinanceira, v: unknown) =>
        setFicha(prev => ({ ...prev, [k]: v }));

    const addNota = () => {
        const nota = novaNota(ficha.id, ficha.notas.length + 1);
        setFicha(prev => ({ ...prev, notas: [...prev.notas, nota] }));
        setExpandidos(prev => ({ ...prev, [nota.id]: true }));
    };

    const updateNota = (id: string, k: keyof NotaFinanceira, v: unknown) =>
        setFicha(prev => ({ ...prev, notas: prev.notas.map(n => n.id === id ? { ...n, [k]: v } : n) }));

    const removeNota = (id: string) =>
        setFicha(prev => ({
            ...prev,
            notas: prev.notas.filter(n => n.id !== id),
            parcelas: prev.parcelas.filter(p => p.nf_id !== id),
        }));

    const addParcela = (nfId: string) => {
        const existentes = ficha.parcelas.filter(p => p.nf_id === nfId);
        const maiorNum = existentes.reduce((m, p) => Math.max(m, p.numero), 0);
        const parcela = novaParcela(nfId, maiorNum + 1);
        setFicha(prev => ({ ...prev, parcelas: [...prev.parcelas, parcela] }));
    };

    const updateParcela = (id: string, k: keyof Parcela, v: unknown) =>
        setFicha(prev => ({ ...prev, parcelas: prev.parcelas.map(p => p.id === id ? { ...p, [k]: v } : p) }));

    const removeParcela = (id: string) =>
        setFicha(prev => ({ ...prev, parcelas: prev.parcelas.filter(p => p.id !== id) }));

    const handleSalvar = async () => {
        if (!ficha.cliente_nome.trim()) { alert('Informe o nome do cliente.'); return; }
        setSalvando(true);
        try { await onSalvar(ficha); } finally { setSalvando(false); }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onCancelar} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                    <ArrowLeft className="w-5 h-5" /> Cancelar
                </button>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                    {fichaInicial ? 'Editar Ficha Financeira' : 'Nova Ficha Financeira'}
                </h1>
                <div className="ml-auto flex gap-2">
                    {fichaInicial && (
                        <button
                            onClick={() => imprimirFicha(ficha)}
                            className="flex items-center gap-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm"
                        >
                            <Printer className="w-4 h-4" /> Imprimir
                        </button>
                    )}
                    <button
                        onClick={handleSalvar}
                        disabled={salvando}
                        className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-60"
                    >
                        <Save className="w-4 h-4" /> {salvando ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </div>

            {/* Dados do cliente */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-5">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-4">Dados do Cliente</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nome / Razão Social *</label>
                        <input
                            value={ficha.cliente_nome}
                            onChange={e => setField('cliente_nome', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="Nome ou razão social do cliente"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">CNPJ / CPF</label>
                        <input
                            value={ficha.cliente_cnpj || ''}
                            onChange={e => setField('cliente_cnpj', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="00.000.000/0001-00"
                        />
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Descrição / Referência</label>
                        <input
                            value={ficha.descricao || ''}
                            onChange={e => setField('descricao', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="Ex: Contrato locação 2026 / Obra Paulista"
                        />
                    </div>
                </div>
            </div>

            {/* Documentos / NFs */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Documentos / NFs</h2>
                    <button
                        onClick={addNota}
                        className="flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 font-medium"
                    >
                        <Plus className="w-4 h-4" /> Adicionar Documento
                    </button>
                </div>

                {ficha.notas.length === 0 && (
                    <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">Nenhum documento. Clique em "Adicionar Documento".</p>
                )}

                <div className="space-y-3">
                    {ficha.notas.map(nota => {
                        const parcelasNota = ficha.parcelas.filter(p => p.nf_id === nota.id).sort((a, b) => a.numero - b.numero);
                        const totalParcelas = parcelasNota.reduce((s, p) => s + (p.valor || 0), 0);
                        const aberto = expandidos[nota.id] !== false; // default aberto

                        return (
                            <div key={nota.id} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                {/* Cabeçalho da NF */}
                                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900/40">
                                    <button onClick={() => toggleExpand(nota.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                        {aberto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                    <select
                                        value={nota.tipo}
                                        onChange={e => updateNota(nota.id, 'tipo', e.target.value)}
                                        className="text-sm font-semibold bg-transparent border-none outline-none text-slate-700 dark:text-slate-200 cursor-pointer"
                                    >
                                        {TIPOS_NF.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <input
                                        value={nota.numero_nf || ''}
                                        onChange={e => updateNota(nota.id, 'numero_nf', e.target.value)}
                                        placeholder="Nº NF"
                                        className="w-28 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                    />
                                    <input
                                        value={nota.observacao || ''}
                                        onChange={e => updateNota(nota.id, 'observacao', e.target.value)}
                                        placeholder="Observação"
                                        className="flex-1 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                    />
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-slate-500 dark:text-slate-400">R$</span>
                                        <input
                                            type="number"
                                            value={nota.valor || ''}
                                            onChange={e => updateNota(nota.id, 'valor', parseFloat(e.target.value) || 0)}
                                            placeholder="0,00"
                                            className="w-32 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-right focus:outline-none focus:ring-1 focus:ring-brand-500"
                                        />
                                    </div>
                                    <button
                                        onClick={() => removeNota(nota.id)}
                                        className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors ml-1"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Parcelas */}
                                {aberto && (
                                    <div className="p-4">
                                        {parcelasNota.length > 0 && (
                                            <table className="w-full text-xs mb-3">
                                                <thead>
                                                    <tr className="border-b border-slate-200 dark:border-slate-700">
                                                        <th className="text-center pb-2 text-slate-500 dark:text-slate-400 font-medium w-16">Nº</th>
                                                        <th className="text-right pb-2 text-slate-500 dark:text-slate-400 font-medium">Valor (R$)</th>
                                                        <th className="text-center pb-2 text-slate-500 dark:text-slate-400 font-medium">Vencimento</th>
                                                        <th className="text-center pb-2 text-slate-500 dark:text-slate-400 font-medium">Data Pgt</th>
                                                        <th className="text-center pb-2 text-slate-500 dark:text-slate-400 font-medium w-20">Dias Atraso</th>
                                                        <th className="text-right pb-2 text-slate-500 dark:text-slate-400 font-medium">Juros (R$)</th>
                                                        <th className="text-right pb-2 text-slate-500 dark:text-slate-400 font-medium">Multa (R$)</th>
                                                        <th className="text-right pb-2 text-slate-500 dark:text-slate-400 font-medium">Observação</th>
                                                        <th className="w-6"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                    {parcelasNota.map(p => {
                                                        const atraso = diasAtraso(p.vencimento, p.data_pagamento || undefined);
                                                        const pago = !!p.data_pagamento;
                                                        return (
                                                            <tr key={p.id} className={pago ? 'opacity-60' : atraso > 0 ? 'bg-red-50/40 dark:bg-red-900/10' : ''}>
                                                                <td className="py-1.5 text-center">
                                                                    <input
                                                                        type="number"
                                                                        value={p.numero}
                                                                        onChange={e => updateParcela(p.id, 'numero', parseInt(e.target.value) || 1)}
                                                                        className="w-12 text-center px-1 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                                                                    />
                                                                </td>
                                                                <td className="py-1.5">
                                                                    <input
                                                                        type="number"
                                                                        value={p.valor || ''}
                                                                        onChange={e => updateParcela(p.id, 'valor', parseFloat(e.target.value) || 0)}
                                                                        placeholder="0,00"
                                                                        className="w-full text-right px-2 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                                                                    />
                                                                </td>
                                                                <td className="py-1.5">
                                                                    <input
                                                                        type="date"
                                                                        value={p.vencimento}
                                                                        onChange={e => updateParcela(p.id, 'vencimento', e.target.value)}
                                                                        className="px-2 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                                                                    />
                                                                </td>
                                                                <td className="py-1.5">
                                                                    <input
                                                                        type="date"
                                                                        value={p.data_pagamento || ''}
                                                                        onChange={e => updateParcela(p.id, 'data_pagamento', e.target.value)}
                                                                        className="px-2 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                                                                    />
                                                                </td>
                                                                <td className="py-1.5 text-center">
                                                                    {atraso > 0 && !pago
                                                                        ? <span className="text-red-600 dark:text-red-400 font-semibold">{atraso}d</span>
                                                                        : pago ? <span className="text-green-600 dark:text-green-400 text-xs">Pago</span> : '—'
                                                                    }
                                                                </td>
                                                                <td className="py-1.5">
                                                                    <input
                                                                        type="number"
                                                                        value={p.juros || ''}
                                                                        onChange={e => updateParcela(p.id, 'juros', parseFloat(e.target.value) || 0)}
                                                                        placeholder="0,00"
                                                                        className="w-full text-right px-2 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                                                                    />
                                                                </td>
                                                                <td className="py-1.5">
                                                                    <input
                                                                        type="number"
                                                                        value={p.multa || ''}
                                                                        onChange={e => updateParcela(p.id, 'multa', parseFloat(e.target.value) || 0)}
                                                                        placeholder="0,00"
                                                                        className="w-full text-right px-2 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                                                                    />
                                                                </td>
                                                                <td className="py-1.5">
                                                                    <input
                                                                        value={p.observacao || ''}
                                                                        onChange={e => updateParcela(p.id, 'observacao', e.target.value)}
                                                                        placeholder="Obs"
                                                                        className="w-full px-2 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                                                                    />
                                                                </td>
                                                                <td className="py-1.5 pl-1">
                                                                    <button onClick={() => removeParcela(p.id)} className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors">
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="border-t-2 border-slate-200 dark:border-slate-600">
                                                        <td colSpan={7} className="pt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Total</td>
                                                        <td className="pt-2 text-right text-xs font-semibold text-slate-800 dark:text-white">{fmt(totalParcelas)}</td>
                                                        <td></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        )}
                                        <button
                                            onClick={() => addParcela(nota.id)}
                                            className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 font-medium"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Adicionar Parcela
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Resumo */}
            {ficha.notas.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-wrap gap-6">
                    <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-0.5">Total Documentos</div>
                        <div className="text-lg font-bold text-slate-800 dark:text-white">
                            {fmt(ficha.notas.reduce((s, n) => s + (n.valor || 0), 0))}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-0.5">Total Parcelas</div>
                        <div className="text-lg font-bold text-slate-800 dark:text-white">
                            {fmt(ficha.parcelas.reduce((s, p) => s + (p.valor || 0), 0))}
                        </div>
                    </div>
                    {(() => {
                        const emAberto = ficha.parcelas.filter(p => !p.data_pagamento && diasAtraso(p.vencimento) > 0).reduce((s, p) => s + (p.valor || 0) + (p.juros || 0) + (p.multa || 0), 0);
                        return emAberto > 0 ? (
                            <div>
                                <div className="text-xs text-red-500 font-medium uppercase tracking-wide mb-0.5">Valor em Aberto</div>
                                <div className="text-lg font-bold text-red-600 dark:text-red-400">{fmt(emAberto)}</div>
                            </div>
                        ) : null;
                    })()}
                </div>
            )}
        </div>
    );
}

// ─── Página principal ────────────────────────────────────────────────────────

export function ControleFinanceiro({ onBack }: Props) {
    const [fichas, setFichas] = useState<FichaFinanceira[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [view, setView] = useState<'list' | 'new' | { ficha: FichaFinanceira }>('list');
    const [excluindo, setExcluindo] = useState<string | null>(null);
    const [imprimindo, setImprimindo] = useState<string | null>(null);

    const carregar = useCallback(async () => {
        setLoading(true);
        const data = await controleFinanceiroService.listar();
        setFichas(data);
        setLoading(false);
    }, []);

    useEffect(() => { carregar(); }, [carregar]);

    const fichasFiltradas = fichas.filter(f => {
        if (!search) return true;
        const s = search.toLowerCase();
        return f.cliente_nome.toLowerCase().includes(s) || (f.cliente_cnpj || '').includes(s) || (f.descricao || '').toLowerCase().includes(s);
    });

    const handleSalvar = async (ficha: FichaFinanceira) => {
        if (view === 'new') {
            await controleFinanceiroService.salvar({
                cliente_nome: ficha.cliente_nome,
                cliente_cnpj: ficha.cliente_cnpj,
                descricao: ficha.descricao,
                notas: ficha.notas,
                parcelas: ficha.parcelas,
            });
        } else {
            await controleFinanceiroService.atualizar(ficha);
        }
        await carregar();
        setView('list');
    };

    const handleExcluir = async (id: string, nome: string) => {
        if (!confirm(`Excluir ficha de "${nome}"?`)) return;
        setExcluindo(id);
        await controleFinanceiroService.excluir(id);
        setExcluindo(null);
        carregar();
    };

    const handleImprimir = async (ficha: FichaFinanceira) => {
        setImprimindo(ficha.id);
        const completa = await controleFinanceiroService.buscarPorId(ficha.id);
        await imprimirFicha(completa ?? ficha);
        setImprimindo(null);
    };

    if (view === 'new') {
        return <EditorFicha onSalvar={handleSalvar} onCancelar={() => setView('list')} />;
    }
    if (typeof view === 'object' && 'ficha' in view) {
        return <EditorFicha fichaInicial={view.ficha} onSalvar={handleSalvar} onCancelar={() => setView('list')} />;
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                    <ArrowLeft className="w-5 h-5" /> Voltar
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Controle Financeiro</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Fichas financeiras por cliente</p>
                </div>
                <button
                    onClick={() => setView('new')}
                    className="ml-auto flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm text-sm"
                >
                    <Plus className="w-4 h-4" /> Nova Ficha
                </button>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                    placeholder="Buscar por cliente, CNPJ ou descrição..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-400 dark:text-slate-500">Carregando...</div>
                ) : fichasFiltradas.length === 0 ? (
                    <div className="p-12 text-center">
                        <DollarSign className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhuma ficha encontrada</p>
                        <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Clique em "Nova Ficha" para criar</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Cliente</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Descrição</th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Docs</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total</th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Em Aberto</th>
                                <th className="px-4 py-3 w-28"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {fichasFiltradas.map(f => {
                                const emAberto = f.parcelas.filter(p => !p.data_pagamento && diasAtraso(p.vencimento) > 0)
                                    .reduce((s, p) => s + (p.valor || 0) + (p.juros || 0) + (p.multa || 0), 0);
                                const totalDocs = f.notas.reduce((s, n) => s + (n.valor || 0), 0);
                                return (
                                    <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-slate-800 dark:text-white">{f.cliente_nome}</div>
                                            {f.cliente_cnpj && <div className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">{f.cliente_cnpj}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{f.descricao || '—'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                                                <FileText className="w-3.5 h-3.5" /> {f.notas.length}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-white">{fmt(totalDocs)}</td>
                                        <td className="px-4 py-3 text-center">
                                            {emAberto > 0 ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                                                    <AlertTriangle className="w-3.5 h-3.5" /> {fmt(emAberto)}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-green-600 dark:text-green-400 font-medium">Em dia</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 justify-end">
                                                <button
                                                    title="Editar"
                                                    onClick={() => setView({ ficha: f })}
                                                    className="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    title="Imprimir"
                                                    onClick={() => handleImprimir(f)}
                                                    disabled={imprimindo === f.id}
                                                    className="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors disabled:opacity-40"
                                                >
                                                    {imprimindo === f.id
                                                        ? <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                                        : <Printer className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    title="Excluir"
                                                    onClick={() => handleExcluir(f.id, f.cliente_nome)}
                                                    disabled={excluindo === f.id}
                                                    className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
                {fichasFiltradas.length > 0 && (
                    <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
                        {fichasFiltradas.length} ficha{fichasFiltradas.length !== 1 ? 's' : ''} encontrada{fichasFiltradas.length !== 1 ? 's' : ''}
                    </div>
                )}
            </div>
        </div>
    );
}
