import { useState, useRef, useEffect } from 'react';
import {
    Calculator, Truck, Clock, Package, MapPin, DollarSign,
    ArrowRight, Loader2, AlertCircle, CheckCircle2, ChevronDown, Info, RotateCcw,
    Printer, Share2, Search, X
} from 'lucide-react';
import { jamefService, CotacaoResponse } from '../services/jamefService';
import { correiosService, CorreiosCotacaoResultado } from '../services/correiosService';
import { inventoryService } from '../services/inventoryService';
import { Product } from '../types';

// Filiais MCI — filialOrigem é o código que a Jamef usa internamente
// Se a cotação falhar, consulte: GET /api/jamef-prod/filial/v1/filiais para listar os códigos corretos
const FILIAIS: { label: string; cnpj: string; cep: string; cidade: string; filialCodigo: string }[] = [
    { label: 'SC — Santa Catarina', cnpj: '05502390000200', cep: '89218000', cidade: 'Joinville/SC',  filialCodigo: 'JVL' },
    { label: 'SP — São Paulo',      cnpj: '05502390000383', cep: '01310100', cidade: 'São Paulo/SP',  filialCodigo: 'SPA' },
    { label: 'CE — Ceará',          cnpj: '05502390000111', cep: '60160181', cidade: 'Fortaleza/CE',  filialCodigo: 'FZA' },
];

function formatCurrency(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function InputField({ label, value, onChange, placeholder, type = 'text', hint }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; type?: string; hint?: string;
}) {
    return (
        <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                {label}
            </label>
            <input
                type={type} value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-slate-800/50 rounded-2xl focus:border-brand-500/40 focus:bg-white dark:focus:bg-slate-900 focus:ring-[8px] focus:ring-brand-500/5 transition-all outline-none text-sm font-bold dark:text-white dark:placeholder-slate-700 shadow-sm"
            />
            {hint && <p className="text-[10px] text-slate-400 dark:text-slate-600 font-medium ml-1">{hint}</p>}
        </div>
    );
}


interface ResultCardProps {
    result: CotacaoResponse;
    origem: string;
    cepDestino: string;
    peso: string;
    valor: string;
    volumes: string;
}

function ResultCard({ result, origem, cepDestino, peso, valor, volumes }: ResultCardProps) {
    const printRef = useRef<HTMLDivElement>(null);

    const deliveryDate = result.dataPrevisaoEntrega
        ? new Date(result.dataPrevisaoEntrega).toLocaleDateString('pt-BR')
        : null;

    // Valor exibido já inclui as taxas somadas ao frete
    const taxas = result.valorTaxas && result.valorTaxas > 0 ? result.valorTaxas : 0;
    const totalFrete = result.valorFrete > 0 ? result.valorFrete + taxas : 0;

    const geradoEm = new Date().toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

    const whatsappText = [
        `🚚 *Cotação de Frete — JAMEF*`,
        ``,
        `📦 *Origem:* ${origem}`,
        `📍 *CEP Destino:* ${cepDestino}`,
        `⚖️ *Peso:* ${peso} kg  |  *Volumes:* ${volumes}`,
        `💰 *Valor da Mercadoria:* ${formatCurrency(parseFloat(valor) || 0)}`,
        ``,
        `━━━━━━━━━━━━━━━━━━`,
        `💵 *Frete Total:* ${totalFrete > 0 ? formatCurrency(totalFrete) : 'Consultar'}`,
        taxas > 0 ? `_(inclui ${formatCurrency(taxas)} em taxas)_` : '',
        `⏱️ *Prazo:* ${result.prazoEntrega > 0 ? `${result.prazoEntrega} dias úteis` : 'A consultar'}`,
        deliveryDate ? `📅 *Previsão:* ${deliveryDate}` : '',
        result.servico ? `🔖 *Serviço:* ${result.servico}` : '',
        `━━━━━━━━━━━━━━━━━━`,
        `_Cotação gerada em ${geradoEm} via MCI Estoque_`,
    ].filter(Boolean).join('\n');

    const handlePrint = () => {
        const el = printRef.current;
        if (!el) return;

        const printWindow = window.open('', '_blank', 'width=700,height=600');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8" />
                <title>Cotação de Frete — JAMEF</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #0f172a; padding: 32px; }
                    h1 { font-size: 22px; font-weight: 900; margin-bottom: 4px; }
                    .subtitle { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 24px; }
                    .section { margin-bottom: 20px; }
                    .section-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: #64748b; margin-bottom: 8px; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                    .card { border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 16px; }
                    .card-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8; margin-bottom: 4px; }
                    .card-value { font-size: 28px; font-weight: 900; color: #0f172a; }
                    .card-sub { font-size: 12px; color: #94a3b8; margin-top: 2px; }
                    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
                    .detail-label { color: #64748b; font-weight: 600; }
                    .detail-value { font-weight: 700; }
                    .footer { margin-top: 32px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; }
                    .badge { display: inline-block; background: #f1f5f9; border-radius: 8px; padding: 3px 10px; font-size: 11px; font-weight: 700; }
                    @media print { body { padding: 16px; } }
                </style>
            </head>
            <body>
                <h1>🚚 Cotação de Frete</h1>
                <div class="subtitle">JAMEF Transportes — Gerado em ${geradoEm}</div>

                <div class="section">
                    <div class="section-title">Dados da Remessa</div>
                    <div class="detail-row"><span class="detail-label">Origem</span><span class="detail-value">${origem}</span></div>
                    <div class="detail-row"><span class="detail-label">CEP Destino</span><span class="detail-value">${cepDestino}</span></div>
                    <div class="detail-row"><span class="detail-label">Peso</span><span class="detail-value">${peso} kg</span></div>
                    <div class="detail-row"><span class="detail-label">Volumes</span><span class="detail-value">${volumes}</span></div>
                    <div class="detail-row"><span class="detail-label">Valor da Mercadoria</span><span class="detail-value">${formatCurrency(parseFloat(valor) || 0)}</span></div>
                    ${result.servico ? `<div class="detail-row"><span class="detail-label">Serviço</span><span class="detail-value"><span class="badge">${result.servico}</span></span></div>` : ''}
                </div>

                <div class="section">
                    <div class="section-title">Resultado da Cotação</div>
                    <div class="grid">
                        <div class="card">
                            <div class="card-label">💵 Valor Total do Frete</div>
                            <div class="card-value">${totalFrete > 0 ? formatCurrency(totalFrete) : '—'}</div>
                            ${taxas > 0 ? `<div class="card-sub">Frete ${formatCurrency(result.valorFrete)} + ${formatCurrency(taxas)} em taxas</div>` : ''}
                        </div>
                        <div class="card">
                            <div class="card-label">⏱️ Prazo de Entrega</div>
                            <div class="card-value">${result.prazoEntrega > 0 ? result.prazoEntrega : '—'} <span style="font-size:16px;font-weight:600;color:#64748b">${result.prazoEntrega > 0 ? 'dias úteis' : ''}</span></div>
                            ${deliveryDate ? `<div class="card-sub">Previsão: ${deliveryDate}</div>` : ''}
                        </div>
                    </div>
                    ${result.filialOrigem || result.filialDestino || (result.pesoTaxado && result.pesoTaxado > 0) ? `
                    <div style="margin-top:12px">
                        ${result.filialOrigem ? `<div class="detail-row"><span class="detail-label">Filial Origem</span><span class="detail-value">${result.filialOrigem}</span></div>` : ''}
                        ${result.filialDestino ? `<div class="detail-row"><span class="detail-label">Filial Destino</span><span class="detail-value">${result.filialDestino}</span></div>` : ''}
                        ${result.pesoTaxado && result.pesoTaxado > 0 ? `<div class="detail-row"><span class="detail-label">Peso Taxado</span><span class="detail-value">${result.pesoTaxado.toFixed(2)} kg</span></div>` : ''}
                    </div>` : ''}
                </div>

                <div class="footer">
                    * Valores sujeitos a alteração conforme dados da Nota Fiscal. Negociações comerciais registradas junto ao remetente são prioritárias no cálculo final.<br/>
                    MCI Estoque — Powered by JAMEF API
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 400);
    };

    return (
        <div ref={printRef} className="relative overflow-hidden bg-white dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl p-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Glows */}
            <div className="absolute -top-12 -right-12 w-56 h-56 bg-brand-500/10 dark:bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="w-10 h-10 rounded-2xl bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-brand-500 dark:text-brand-400" />
                    </div>
                    <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Cotação Calculada</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resultado Jamef · {geradoEm}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        {result.servico && (
                            <span className="text-xs font-black px-3 py-1 rounded-xl bg-brand-500/10 text-brand-600 border border-brand-500/20 dark:bg-brand-500/20 dark:text-brand-300 dark:border-brand-500/30">
                                {result.servico}
                            </span>
                        )}
                    </div>
                </div>

                {/* Main metrics */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-3.5 sm:p-5 space-y-1 min-w-0">
                        <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" /> Valor do Frete
                        </div>
                        <div className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter whitespace-nowrap">
                            {totalFrete > 0 ? formatCurrency(totalFrete) : '—'}
                        </div>
                        {taxas > 0 && (
                            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">Frete {formatCurrency(result.valorFrete)} + {formatCurrency(taxas)} em taxas</div>
                        )}
                    </div>

                    <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-3.5 sm:p-5 space-y-1 min-w-0">
                        <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <Clock className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400 shrink-0" /> Prazo de Entrega
                        </div>
                        <div className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter whitespace-nowrap">
                            {result.prazoEntrega > 0 ? `${result.prazoEntrega}` : '—'}
                            {result.prazoEntrega > 0 && <span className="text-xs sm:text-lg font-bold text-slate-400 ml-1">dias úteis</span>}
                        </div>
                        {deliveryDate && (
                            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">Previsão: <span className="text-slate-900 dark:text-white font-bold">{deliveryDate}</span></div>
                        )}
                    </div>
                </div>

                {/* Detalhes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {result.filialOrigem && (
                        <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 space-y-0.5">
                            <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Filial Origem</div>
                            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{result.filialOrigem}</div>
                        </div>
                    )}
                    {result.filialDestino && (
                        <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 space-y-0.5">
                            <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Filial Destino</div>
                            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{result.filialDestino}</div>
                        </div>
                    )}
                    {result.pesoTaxado && result.pesoTaxado > 0 && (
                        <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 space-y-0.5">
                            <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Peso Taxado</div>
                            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{result.pesoTaxado.toFixed(2)} kg</div>
                        </div>
                    )}
                </div>

                {/* Ações */}
                <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
                    {/* WhatsApp */}
                    <a
                        href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-[#25D366]/10 border border-[#25D366]/40 text-[#128C4A] hover:bg-[#25D366]/20 dark:bg-[#25D366]/20 dark:text-[#25D366] dark:hover:bg-[#25D366]/30 transition-all active:scale-95"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Enviar WhatsApp
                    </a>

                    {/* Imprimir */}
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:border-white/20 dark:text-white dark:hover:bg-white/20 transition-all active:scale-95"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimir / PDF
                    </button>

                    {/* Compartilhar nativo (mobile) */}
                    {typeof navigator !== 'undefined' && 'share' in navigator && (
                        <button
                            type="button"
                            onClick={() => navigator.share({
                                title: 'Cotação de Frete — JAMEF',
                                text: whatsappText,
                            }).catch(() => {})}
                            className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:border-white/20 dark:text-slate-300 dark:hover:bg-white/20 transition-all active:scale-95"
                        >
                            <Share2 className="w-4 h-4" />
                            Compartilhar
                        </button>
                    )}
                </div>

                <p className="text-[10px] text-slate-400 dark:text-slate-600 font-medium leading-relaxed">
                    * Valores sujeitos a alteração conforme dados da Nota Fiscal. Negociações comerciais registradas junto ao remetente são prioritárias no cálculo final.
                </p>
            </div>
        </div>
    );
}

// ── Card de resultado dos Correios (um ou mais serviços: SEDEX, PAC…) ─────────
function CorreiosResultCard({ resultados, loading, error }: {
    resultados: CorreiosCotacaoResultado[] | null;
    loading: boolean;
    error: string | null;
}) {
    const validos = (resultados || []).filter(r => !r.erro && r.valorFrete > 0);
    // Ordena do mais barato ao mais caro
    const ordenados = [...validos].sort((a, b) => a.valorFrete - b.valorFrete);

    return (
        <div className="relative overflow-hidden bg-white dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl p-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="absolute -top-12 -right-12 w-56 h-56 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="w-10 h-10 rounded-2xl bg-yellow-400/15 flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Correios</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preço + Prazo · API CWS</p>
                    </div>
                </div>

                {loading && (
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
                        <span className="text-sm font-bold">Consultando serviços dos Correios...</span>
                    </div>
                )}

                {!loading && error && (
                    <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-500/90 font-medium">{error}</p>
                    </div>
                )}

                {!loading && !error && ordenados.length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium py-4">
                        Nenhum serviço dos Correios retornou cotação para este trajeto/peso.
                    </p>
                )}

                {!loading && ordenados.length > 0 && (
                    <div className="space-y-3">
                        {ordenados.map((r, idx) => {
                            const prev = r.dataPrevisaoEntrega
                                ? new Date(r.dataPrevisaoEntrega).toLocaleDateString('pt-BR')
                                : null;
                            return (
                                <div key={r.coProduto}
                                    className={`flex items-center gap-4 p-4 rounded-2xl border ${
                                        idx === 0
                                            ? 'bg-emerald-500/5 border-emerald-500/30'
                                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
                                    }`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-black text-slate-900 dark:text-white">{r.servico}</span>
                                            {idx === 0 && (
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                                    Mais barato
                                                </span>
                                            )}
                                            <span className="text-[10px] font-bold text-slate-400">cód. {r.coProduto}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            <Clock className="w-3 h-3" />
                                            {r.prazoEntrega > 0 ? `${r.prazoEntrega} dia(s) útil(eis)` : 'prazo a consultar'}
                                            {prev && <span>· previsão {prev}</span>}
                                            {r.entregaSabado && <span className="text-emerald-500">· entrega sábado</span>}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                                            {formatCurrency(r.valorFrete)}
                                        </div>
                                        {r.vlSeguro && r.vlSeguro > 0 && (
                                            <div className="text-[10px] text-slate-400">inclui seguro {formatCurrency(r.vlSeguro)}</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Serviços com erro individual */}
                {!loading && (resultados || []).some(r => r.erro) && (
                    <div className="space-y-1 pt-1">
                        {(resultados || []).filter(r => r.erro).map(r => (
                            <p key={r.coProduto} className="text-[10px] text-amber-500 font-medium">
                                {r.servico} (cód. {r.coProduto}): {r.erro}
                            </p>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export function CotacaoFrete() {
    const [filialIdx, setFilialIdx] = useState(0);
    const [filialCodigo, setFilialCodigo] = useState(FILIAIS[0].filialCodigo);
    const [filialNome, setFilialNome] = useState('');
    const [lookingUpFilial, setLookingUpFilial] = useState(false);
    const [cepDestino, setCepDestino] = useState('');
    const [peso, setPeso] = useState('');
    const [valor, setValor] = useState('');
    const [volumes, setVolumes] = useState('1');
    const [altura, setAltura] = useState('');
    const [largura, setLargura] = useState('');
    const [comprimento, setComprimento] = useState('');
    const [showDimensoes, setShowDimensoes] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CotacaoResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Correios (cotação em paralelo à Jamef)
    const [correiosResults, setCorreiosResults] = useState<CorreiosCotacaoResultado[] | null>(null);
    const [correiosError, setCorreiosError] = useState<string | null>(null);
    const correiosAtivo = correiosService.credenciaisConfiguradas();

    // Busca de produtos para preenchimento automático de peso/medidas
    const [produtoQuery, setProdutoQuery] = useState('');
    const [produtoResults, setProdutoResults] = useState<Product[]>([]);
    const [searchingProdutos, setSearchingProdutos] = useState(false);
    const [itens, setItens] = useState<{ product: Product; qtd: number }[]>([]);

    const filial = FILIAIS[filialIdx];

    // Busca produtos com debounce (mín. 2 caracteres)
    useEffect(() => {
        const q = produtoQuery.trim();
        if (q.length < 2) { setProdutoResults([]); setSearchingProdutos(false); return; }
        setSearchingProdutos(true);
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const results = await inventoryService.searchProducts(q);
                if (!cancelled) setProdutoResults(results.slice(0, 8));
            } catch {
                if (!cancelled) setProdutoResults([]);
            } finally {
                if (!cancelled) setSearchingProdutos(false);
            }
        }, 400);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [produtoQuery]);

    // Recalcula peso, volumes e dimensões a partir dos itens selecionados
    useEffect(() => {
        if (itens.length === 0) return;
        const pesoTotal = itens.reduce((s, i) => s + (Number(i.product.peso_kg) || 0) * i.qtd, 0);
        const volTotal = itens.reduce((s, i) => s + i.qtd, 0);
        if (pesoTotal > 0) setPeso(String(+pesoTotal.toFixed(3)));
        setVolumes(String(volTotal));
        // Dimensões: maior medida entre os itens em cada eixo (aproximação por volume)
        const maxAlt = Math.max(...itens.map(i => Number(i.product.altura_cm) || 0));
        const maxLarg = Math.max(...itens.map(i => Number(i.product.largura_cm) || 0));
        const maxComp = Math.max(...itens.map(i => Number(i.product.comprimento_cm) || 0));
        if (maxAlt > 0) setAltura(String(maxAlt));
        if (maxLarg > 0) setLargura(String(maxLarg));
        if (maxComp > 0) setComprimento(String(maxComp));
        if (maxAlt > 0 || maxLarg > 0 || maxComp > 0) setShowDimensoes(true);
    }, [itens]);

    const addProduto = (p: Product) => {
        setItens(prev => {
            const existing = prev.find(i => i.product.id === p.id);
            if (existing) return prev.map(i => i.product.id === p.id ? { ...i, qtd: i.qtd + 1 } : i);
            return [...prev, { product: p, qtd: 1 }];
        });
        setProdutoQuery('');
        setProdutoResults([]);
    };

    const setQtdItem = (id: string, qtd: number) => {
        setItens(prev => prev.map(i => i.product.id === id ? { ...i, qtd: Math.max(1, qtd) } : i));
    };

    const removeItem = (id: string) => {
        setItens(prev => prev.filter(i => i.product.id !== id));
    };

    // Lookup automático da filial Jamef pelo CEP de origem ao trocar a filial
    useEffect(() => {
        let cancelled = false;
        setLookingUpFilial(true);
        setFilialNome('');
        jamefService.buscarFilialPorCep(filial.cep)
            .then(f => {
                if (cancelled) return;
                if (f) {
                    setFilialCodigo(f.sigla || f.codigo);
                    setFilialNome(f.nome);
                }
            })
            .catch(() => {}) // rate limit ou erro: mantém código padrão
            .finally(() => { if (!cancelled) setLookingUpFilial(false); });
        return () => { cancelled = true; };
    }, [filialIdx]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleCalcular = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cepDestino || !peso || !valor) {
            setError('Preencha CEP de destino, peso e valor da mercadoria.');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);
        setCorreiosResults(null);
        setCorreiosError(null);

        const pesoNum = parseFloat(peso);
        const valorNum = parseFloat(valor.replace(',', '.'));
        const alturaNum = altura ? parseFloat(altura) : undefined;
        const larguraNum = largura ? parseFloat(largura) : undefined;
        const comprimentoNum = comprimento ? parseFloat(comprimento) : undefined;

        // Jamef e Correios cotam em paralelo; a falha de um não bloqueia o outro
        const jamefPromise = jamefService.cotacaoFrete({
            cnpjRemetente: filial.cnpj,
            cepOrigem: filial.cep,
            cepDestino,
            filialOrigem: filialCodigo.trim(),
            peso: pesoNum,
            valorMercadoria: valorNum,
            volumes: parseInt(volumes) || 1,
            altura: alturaNum,
            largura: larguraNum,
            comprimento: comprimentoNum,
        })
            .then(setResult)
            .catch((e: any) => setError(e.message || 'Erro ao calcular frete Jamef. Verifique os dados e tente novamente.'));

        const correiosPromise = correiosAtivo
            ? correiosService.cotar({
                cepOrigem: filial.cep,
                cepDestino,
                pesoKg: pesoNum,
                valorDeclarado: valorNum,
                altura: alturaNum,
                largura: larguraNum,
                comprimento: comprimentoNum,
            })
                .then(setCorreiosResults)
                .catch((e: any) => setCorreiosError(e.message || 'Erro ao consultar Correios.'))
            : Promise.resolve();

        await Promise.allSettled([jamefPromise, correiosPromise]);
        setLoading(false);
    };

    const handleReset = () => {
        setResult(null);
        setError(null);
        setCorreiosResults(null);
        setCorreiosError(null);
        setCepDestino('');
        setPeso('');
        setValor('');
        setVolumes('1');
        setAltura('');
        setLargura('');
        setComprimento('');
        setItens([]);
        setProdutoQuery('');
        setProdutoResults([]);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] pb-20 transition-colors duration-500 font-sans">
            {/* Background glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-[120px]" />
            </div>

            {/* Hero */}
            <div className="relative pt-12 pb-24 sm:pt-16 sm:pb-32 px-4 text-center overflow-hidden">
                <div className="max-w-4xl mx-auto relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-500/10 dark:bg-violet-500/20 border border-violet-500/20 rounded-full text-violet-600 dark:text-violet-400 text-[10px] font-black uppercase tracking-widest mb-8">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
                        </span>
                        Live Prod · Jamef
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter mb-6 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                        Cotação de <span className="text-violet-500 italic font-medium tracking-tight">Frete</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-medium opacity-80">
                        Calcule o valor do frete e o prazo de entrega Jamef antes de emitir a nota. Rápido, preciso e direto da transportadora.
                    </p>
                </div>
            </div>

            {/* Form */}
            <main className="max-w-3xl mx-auto px-4 -mt-16 sm:-mt-24 relative z-20 space-y-6">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] border border-white dark:border-white/5 p-8 sm:p-12">
                    <form onSubmit={handleCalcular} className="space-y-8">

                        {/* Filial de origem */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-brand-500" /> Origem (Filial MCI)
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {FILIAIS.map((f, i) => (
                                    <button
                                        key={i} type="button" onClick={() => { setFilialIdx(i); setFilialCodigo(f.filialCodigo); }}
                                        className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${
                                            filialIdx === i
                                                ? 'bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-500/20'
                                                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-brand-400 hover:text-brand-600'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                                <Info className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                                <span className="text-xs font-bold text-slate-400">CEP origem: <span className="text-slate-600 dark:text-slate-300">{filial.cep} — {filial.cidade}</span></span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1.5">
                                        Código Filial Jamef <span className="text-amber-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            value={filialCodigo}
                                            onChange={e => setFilialCodigo(e.target.value.toUpperCase())}
                                            placeholder="Buscando..."
                                            maxLength={10}
                                            className={`w-full px-4 py-3 pr-10 bg-slate-50 dark:bg-slate-950 border-2 rounded-2xl focus:bg-white dark:focus:bg-slate-900 transition-all outline-none text-sm font-bold dark:text-white shadow-sm ${
                                                lookingUpFilial ? 'border-brand-400/40 opacity-60' : filialNome ? 'border-green-400/60' : 'border-amber-400/40 focus:border-amber-400'
                                            }`}
                                        />
                                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                            {lookingUpFilial
                                                ? <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                                                : filialNome
                                                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                    : <AlertCircle className="w-4 h-4 text-amber-400" />
                                            }
                                        </div>
                                    </div>
                                    {filialNome && (
                                        <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1 ml-1">
                                            ✓ {filialNome}
                                        </p>
                                    )}
                                    {!filialNome && !lookingUpFilial && (
                                        <p className="text-[10px] text-amber-500 font-medium mt-1 ml-1">
                                            Código não confirmado — edite manualmente se necessário
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Destino */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-violet-500" /> Destino
                            </p>
                            <InputField
                                label="CEP de Destino *"
                                value={cepDestino}
                                onChange={setCepDestino}
                                placeholder="00000-000"
                                hint="Apenas números. Ex: 01310100"
                            />
                        </div>

                        {/* Mercadoria */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] flex items-center gap-2">
                                <Package className="w-4 h-4 text-emerald-500" /> Dados da Mercadoria
                            </p>

                            {/* Busca de produto — preenche peso/medidas automaticamente */}
                            <div className="relative">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        {searchingProdutos
                                            ? <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                                            : <Search className="w-4 h-4 text-slate-400" />
                                        }
                                    </div>
                                    <input
                                        value={produtoQuery}
                                        onChange={e => setProdutoQuery(e.target.value)}
                                        placeholder="Buscar produto por código ou nome (preenche peso e medidas)..."
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-slate-800/50 rounded-2xl focus:border-brand-500/40 focus:bg-white dark:focus:bg-slate-900 focus:ring-[8px] focus:ring-brand-500/5 transition-all outline-none text-sm font-bold dark:text-white dark:placeholder-slate-700 shadow-sm"
                                    />
                                </div>
                                {produtoResults.length > 0 && (
                                    <div className="absolute z-30 mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
                                        {produtoResults.map(p => (
                                            <button
                                                key={p.id} type="button" onClick={() => addProduto(p)}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{p.name}</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cód. {p.id}</p>
                                                </div>
                                                {p.peso_kg ? (
                                                    <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                                                        {Number(p.peso_kg).toLocaleString('pt-BR')} kg
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                                                        sem medidas
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Itens selecionados */}
                            {itens.length > 0 && (
                                <div className="space-y-2">
                                    {itens.map(({ product: p, qtd }) => (
                                        <div key={p.id} className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{p.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    Cód. {p.id}
                                                    {p.peso_kg
                                                        ? ` · ${Number(p.peso_kg).toLocaleString('pt-BR')} kg · ${Number(p.altura_cm) || '—'}×${Number(p.largura_cm) || '—'}×${Number(p.comprimento_cm) || '—'} cm`
                                                        : ' · sem medidas cadastradas — preencha manualmente'}
                                                </p>
                                            </div>
                                            <input
                                                type="number" min={1} value={qtd}
                                                onChange={e => setQtdItem(p.id, parseInt(e.target.value) || 1)}
                                                className="w-16 px-2 py-2 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black dark:text-white outline-none focus:border-brand-500/40 shrink-0"
                                                title="Quantidade"
                                            />
                                            <button
                                                type="button" onClick={() => removeItem(p.id)}
                                                className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                                                title="Remover"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium ml-1">
                                        Peso e volumes somados automaticamente. Dimensões usam a maior medida entre os itens — ajuste abaixo se necessário.
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <InputField label="Peso (kg) *" value={peso} onChange={setPeso} placeholder="Ex: 25.5" type="number" />
                                <InputField label="Valor (R$) *" value={valor} onChange={setValor} placeholder="Ex: 1500.00" type="number" />
                                <InputField label="Volumes (qtd)" value={volumes} onChange={setVolumes} placeholder="1" type="number" />
                            </div>

                            {/* Dimensões opcionais */}
                            <button
                                type="button"
                                onClick={() => setShowDimensoes(v => !v)}
                                className="flex items-center gap-2 text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 transition-colors"
                            >
                                <ChevronDown className={`w-4 h-4 transition-transform ${showDimensoes ? 'rotate-180' : ''}`} />
                                {showDimensoes ? 'Ocultar dimensões' : 'Adicionar dimensões (opcional — melhora precisão)'}
                            </button>

                            {showDimensoes && (
                                <div className="grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <InputField label="Altura (cm)" value={altura} onChange={setAltura} placeholder="Ex: 30" type="number" />
                                    <InputField label="Largura (cm)" value={largura} onChange={setLargura} placeholder="Ex: 40" type="number" />
                                    <InputField label="Comprimento (cm)" value={comprimento} onChange={setComprimento} placeholder="Ex: 50" type="number" />
                                </div>
                            )}
                        </div>

                        {/* Erro */}
                        {error && (
                            <div className="flex items-start gap-4 p-5 bg-red-500/5 border border-red-500/20 rounded-3xl">
                                <div className="p-2.5 bg-red-500/10 rounded-2xl shrink-0">
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-widest">Erro na cotação</p>
                                    <p className="text-sm text-red-500/80 font-medium mt-0.5">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Botões */}
                        <div className="flex gap-3">
                            <button
                                type="submit" disabled={loading}
                                className={`flex-1 group relative py-5 rounded-2xl font-black text-base uppercase tracking-[0.3em] transition-all duration-500 flex items-center justify-center gap-4 overflow-hidden active:scale-[0.97] ${
                                    loading
                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                        : 'bg-violet-600 hover:bg-violet-500 text-white shadow-xl shadow-violet-500/20'
                                }`}
                            >
                                <div className="absolute inset-0 w-1/4 h-full bg-white/10 -skew-x-[45deg] translate-x-[-200%] group-hover:translate-x-[400%] transition-transform duration-1000" />
                                {loading
                                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Calculando...</>
                                    : <><Calculator className="w-5 h-5" /> Calcular Frete <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                                }
                            </button>

                            {(result || error) && (
                                <button
                                    type="button" onClick={handleReset}
                                    className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                                    title="Nova cotação"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Resultado Jamef */}
                {result && (
                    <ResultCard
                        result={result}
                        origem={filial.cidade}
                        cepDestino={cepDestino}
                        peso={peso}
                        valor={valor}
                        volumes={volumes}
                    />
                )}

                {/* Resultado Correios (paralelo à Jamef) */}
                {correiosAtivo && (loading || correiosResults || correiosError) && (
                    <CorreiosResultCard
                        resultados={correiosResults}
                        loading={loading && !correiosResults && !correiosError}
                        error={correiosError}
                    />
                )}

                {/* Info disclaimer */}
                <div className="flex items-start gap-3 px-6 py-4 bg-violet-500/5 border border-violet-500/15 rounded-3xl">
                    <Truck className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        Cotação em ambiente de <strong>produção</strong>. Valores aproximados para planejamento logístico.
                        O frete final pode ser ajustado com base nos dados da NF e nas negociações comerciais registradas junto à Jamef.
                    </p>
                </div>
            </main>
        </div>
    );
}
