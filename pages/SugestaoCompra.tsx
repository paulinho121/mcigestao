import { useState, useEffect, useMemo } from 'react';
import {
    ShoppingCart, AlertTriangle, PackageX, TrendingDown, Ship, Download,
    RefreshCw, Search, Building2, Printer,
} from 'lucide-react';
import { purchaseIntelligenceService } from '../services/purchaseIntelligenceService';
import { PurchaseSuggestionItem } from '../types';

const URGENCY_STYLE: Record<PurchaseSuggestionItem['urgency'], { label: string; badge: string; dot: string }> = {
    ESGOTADO: { label: 'Esgotado', badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/40', dot: 'bg-red-500' },
    CRITICO: { label: 'Crítico', badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/40', dot: 'bg-orange-500' },
    BAIXO: { label: 'Baixo estoque', badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/15 dark:text-amber-400 dark:border-amber-900/40', dot: 'bg-amber-500' },
    OK: { label: 'Em importação', badge: 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-900/20 dark:text-brand-400 dark:border-brand-900/40', dot: 'bg-brand-500' },
};

export const SugestaoCompra: React.FC = () => {
    const [items, setItems] = useState<PurchaseSuggestionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');

    const toggleBrand = (brand: string) => {
        setSelectedBrands((prev) => {
            const next = new Set(prev);
            if (next.has(brand)) next.delete(brand);
            else next.add(brand);
            return next;
        });
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await purchaseIntelligenceService.getPurchaseSuggestionsByBrand();
            setItems(data);
        } catch (error) {
            console.error('Failed to load purchase suggestions', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const brandCounts = useMemo(() => {
        const map = new Map<string, number>();
        for (const item of items) map.set(item.brand, (map.get(item.brand) || 0) + 1);
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [items]);

    const filteredItems = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter((item) => {
            const matchesBrand = selectedBrands.size === 0 || selectedBrands.has(item.brand);
            const matchesSearch = !q || item.productName.toLowerCase().includes(q) || item.productId.toLowerCase().includes(q);
            return matchesBrand && matchesSearch;
        });
    }, [items, selectedBrands, search]);

    const summary = useMemo(() => {
        const base = { esgotado: 0, critico: 0, baixo: 0, emImportacao: 0, unidades: 0, valor: 0, temValor: false };
        for (const item of filteredItems) {
            if (item.urgency === 'ESGOTADO') base.esgotado++;
            else if (item.urgency === 'CRITICO') base.critico++;
            else if (item.urgency === 'BAIXO') base.baixo++;
            else base.emImportacao++;
            base.unidades += item.suggestedQty || 0;
            if (item.estimatedCost != null) { base.valor += item.estimatedCost; base.temValor = true; }
        }
        return base;
    }, [filteredItems]);

    const brandLabel = selectedBrands.size === 0
        ? 'Todas as marcas'
        : selectedBrands.size === 1
            ? Array.from(selectedBrands)[0]
            : Array.from(selectedBrands).join(', ');

    const handleExportCSV = () => {
        if (filteredItems.length === 0) return;
        const headers = ['Marca', 'Código', 'Produto', 'Estoque Atual', 'Em Importação', 'Projetado', 'Sugestão de Compra', 'Urgência'];
        const rows = filteredItems.map((item) => [
            item.brand,
            item.productId,
            `"${item.productName.replace(/"/g, '""')}"`,
            item.currentStock,
            item.incomingQty,
            item.projectedStock,
            item.urgency === 'OK' ? '—' : item.coveredByImport ? 'Coberto pela importação' : item.suggestedQty ?? 'A definir',
            URGENCY_STYLE[item.urgency].label,
        ].join(';'));
        const csvContent = '﻿' + [headers.join(';'), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        link.href = url;
        const fileSlug = selectedBrands.size === 0 ? 'todas_marcas' : Array.from(selectedBrands).join('_').toLowerCase().replace(/\s+/g, '_');
        link.download = `sugestao_compra_${fileSlug}_${date}.csv`;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        if (filteredItems.length === 0) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Permita pop-ups para imprimir');
            return;
        }

        const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        const title = `Relatório de Sugestão de Compra — ${brandLabel}`;

        printWindow.document.write(`
      <html>
        <head>
          <title>${esc(title)} - ${date}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #334155; }
            .header { border-bottom: 3px solid #0f172a; padding-bottom: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
            .header h1 { margin: 0; font-size: 22px; color: #0f172a; }
            .header p { margin: 5px 0 0; color: #64748b; font-size: 13px; }
            .brand-mark { text-align: right; }
            .brand-mark .mc { font-weight: 900; color: #0f172a; font-size: 20px; font-style: italic; }
            .brand-mark .sub { color: #64748b; font-size: 10px; display: block; letter-spacing: 0.05em; }
            .summary { display: flex; gap: 14px; margin-bottom: 26px; }
            .summary .card { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; }
            .summary .card .label { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; margin-bottom: 4px; }
            .summary .card .value { font-size: 20px; font-weight: 800; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            th { background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 10px 8px; text-align: left; font-size: 10px; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; }
            td { border-bottom: 1px solid #f1f5f9; padding: 9px 8px; font-size: 12px; }
            .val { text-align: center; font-weight: 600; }
            .code { font-family: monospace; color: #64748b; font-size: 10.5px; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 9.5px; font-weight: 700; }
            .badge-esgotado { background: #fef2f2; color: #b91c1c; }
            .badge-critico { background: #fff7ed; color: #c2410c; }
            .badge-baixo { background: #fffbeb; color: #b45309; }
            .badge-ok { background: #ecfdf5; color: #047857; }
            .footer { margin-top: 32px; text-align: center; color: #94a3b8; font-size: 10.5px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
            @media print {
              body { padding: 0; }
              @page { margin: 1.3cm; }
              tr { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>${esc(title)}</h1>
              <p>Emitido em ${date} · ${filteredItems.length} ${filteredItems.length === 1 ? 'item' : 'itens'} · estoque atual cruzado com o que já está em importação</p>
            </div>
            <div class="brand-mark">
              <span class="mc">MC</span>
              <span class="sub">ESTOQUE MCI</span>
            </div>
          </div>

          <div class="summary">
            <div class="card"><div class="label">Esgotados</div><div class="value">${summary.esgotado}</div></div>
            <div class="card"><div class="label">Críticos</div><div class="value">${summary.critico}</div></div>
            <div class="card"><div class="label">Baixo estoque</div><div class="value">${summary.baixo}</div></div>
            <div class="card"><div class="label">Em importação</div><div class="value">${summary.emImportacao}</div></div>
            <div class="card"><div class="label">Unidades sugeridas</div><div class="value">${summary.unidades}</div></div>
            <div class="card"><div class="label">Valor estimado</div><div class="value">${summary.temValor ? `R$ ${summary.valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : '—'}</div></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Produto</th>
                <th>Marca</th>
                <th class="val">Estoque</th>
                <th class="val">Em Importação</th>
                <th class="val">Projetado</th>
                <th class="val">Sugestão</th>
                <th>Urgência</th>
              </tr>
            </thead>
            <tbody>
              ${filteredItems.map((item) => {
            const badgeClass = item.urgency === 'ESGOTADO' ? 'badge-esgotado' : item.urgency === 'CRITICO' ? 'badge-critico' : item.urgency === 'BAIXO' ? 'badge-baixo' : 'badge-ok';
            const sugestaoCell = item.urgency === 'OK' ? '—' : item.coveredByImport ? 'Coberto' : item.suggestedQty ?? 'a definir';
            return `
                <tr>
                  <td class="code">${esc(item.productId)}</td>
                  <td style="font-weight:600;color:#1e293b;">${esc(item.productName)}</td>
                  <td>${esc(item.brand)}</td>
                  <td class="val">${item.currentStock}</td>
                  <td class="val">${item.incomingQty > 0 ? item.incomingQty : '—'}</td>
                  <td class="val">${item.projectedStock}</td>
                  <td class="val" style="color:#0f172a;">${sugestaoCell}</td>
                  <td><span class="badge ${badgeClass}">${URGENCY_STYLE[item.urgency].label}</span></td>
                </tr>`;
        }).join('')}
            </tbody>
          </table>

          <div class="footer">
            Estoque MCI — Gestão Corporativa. Relatório gerado automaticamente a partir do estoque e das importações em aberto no momento da emissão.
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
        printWindow.document.close();
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 transition-colors">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3.5 bg-gradient-to-tr from-[#00a699] to-[#00d1c1] rounded-2xl shadow-lg shadow-[#00a699]/20 dark:shadow-none">
                            <ShoppingCart className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Sugestão de Compra</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">
                                Cruza estoque atual com o que já está em importação, por marca
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadData}
                            disabled={loading}
                            className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-[#00a699] hover:border-[#00a699]/30 transition-all disabled:opacity-50"
                            title="Atualizar"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={handleExportCSV}
                            disabled={filteredItems.length === 0}
                            className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-white hover:border-[#00a699]/30 hover:text-[#00a699] transition-all text-sm font-bold disabled:opacity-40"
                        >
                            <Download className="w-4 h-4" />
                            Exportar CSV
                        </button>
                        <button
                            onClick={handlePrint}
                            disabled={filteredItems.length === 0}
                            className="flex items-center gap-2 px-5 py-3 bg-[#00a699] rounded-xl text-white hover:bg-[#008d82] transition-all text-sm font-bold shadow-lg shadow-[#00a699]/20 dark:shadow-none disabled:opacity-40"
                            title="Gera um relatório formatado pronto para imprimir ou salvar em PDF"
                        >
                            <Printer className="w-4 h-4" />
                            Imprimir Relatório
                        </button>
                    </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                            <PackageX className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Esgotados</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{summary.esgotado}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                        <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Críticos</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{summary.critico}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                            <TrendingDown className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Baixo estoque</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{summary.baixo}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                        <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 mb-1">
                            <Ship className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Em importação</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{summary.emImportacao}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                        <div className="flex items-center gap-2 text-[#00a699] mb-1">
                            <ShoppingCart className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Un. sugeridas</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{summary.unidades}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider">Valor estimado</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                            {summary.temValor ? `R$ ${summary.valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : '—'}
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-3 mb-6">
                    <div className="flex flex-col lg:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por código ou nome do produto..."
                                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00a699]/30 dark:text-white text-sm font-medium transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
                            <button
                                onClick={() => setSelectedBrands(new Set())}
                                className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${selectedBrands.size === 0
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#00a699]/40'
                                    }`}
                            >
                                Todas as marcas ({items.length})
                            </button>
                            {brandCounts.map(([brand, count]) => {
                                const active = selectedBrands.has(brand);
                                return (
                                    <button
                                        key={brand}
                                        onClick={() => toggleBrand(brand)}
                                        className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all ${active
                                            ? 'bg-[#00a699] text-white border-[#00a699]'
                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#00a699]/40'
                                            }`}
                                    >
                                        <Building2 className="w-3 h-3 opacity-60" />
                                        {brand} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    {selectedBrands.size > 0 && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-semibold">{selectedBrands.size} {selectedBrands.size === 1 ? 'marca selecionada' : 'marcas selecionadas'}:</span>
                            <span className="font-medium truncate">{Array.from(selectedBrands).join(', ')}</span>
                            <button
                                onClick={() => setSelectedBrands(new Set())}
                                className="ml-auto shrink-0 text-[#00a699] hover:text-[#008d82] font-bold"
                            >
                                Limpar seleção
                            </button>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {loading ? (
                        <div className="text-center py-24">
                            <div className="w-12 h-12 border-4 border-[#00a699]/10 border-t-[#00a699] rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Calculando sugestões</p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center py-24">
                            <div className="w-20 h-20 bg-[#00a699]/5 dark:bg-[#002b28]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <ShoppingCart className="w-10 h-10 text-[#00a699]" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
                                {items.length === 0 ? 'Nenhuma compra necessária no momento' : 'Nada encontrado com esse filtro'}
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                {items.length === 0
                                    ? 'Todo o estoque está em nível saudável, considerando o que já está em importação.'
                                    : 'Tente outra marca ou termo de busca.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                                        <th className="py-3.5 px-4">Produto</th>
                                        <th className="py-3.5 px-4">Marca</th>
                                        <th className="py-3.5 px-4 text-center">Estoque</th>
                                        <th className="py-3.5 px-4 text-center">Em importação</th>
                                        <th className="py-3.5 px-4 text-center">Projetado</th>
                                        <th className="py-3.5 px-4 text-center">Sugestão</th>
                                        <th className="py-3.5 px-4">Urgência</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {filteredItems.map((item) => {
                                        const style = URGENCY_STYLE[item.urgency];
                                        return (
                                            <tr key={item.productId} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                                                <td className="py-4 px-4">
                                                    <div className="font-bold text-slate-800 dark:text-white text-sm">{item.productName}</div>
                                                    <div className="text-[10px] font-mono font-bold text-slate-400">COD: {item.productId}</div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">{item.brand}</span>
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <span className={`font-black text-sm ${item.available <= 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                                        {item.currentStock}
                                                    </span>
                                                    {item.reserved > 0 && (
                                                        <div className="text-[9.5px] text-slate-400">{item.reserved} reservado{item.reserved > 1 ? 's' : ''}</div>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    {item.incomingQty > 0 ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded-lg">
                                                            <Ship className="w-3 h-3" />
                                                            {item.incomingQty}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                                                    {item.projectedStock}
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    {item.urgency === 'OK' ? (
                                                        <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                                                    ) : item.coveredByImport ? (
                                                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-brand-600 dark:text-brand-400" title="O que já está em importação cobre a meta de estoque">
                                                            <Ship className="w-3 h-3" />
                                                            Coberto
                                                        </span>
                                                    ) : item.suggestedQty != null ? (
                                                        <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2.5 py-1 rounded-lg bg-[#00a699]/10 dark:bg-[#00a699]/15 text-[#00a699] dark:text-[#00d1c1] font-black text-sm">
                                                            {item.suggestedQty}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10.5px] font-semibold text-slate-400 italic">a definir</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-1 rounded-full border ${style.badge}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                                        {style.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
