import { useState, useEffect, useMemo } from 'react';
import {
    ShoppingCart, AlertTriangle, PackageX, TrendingDown, Ship, Download,
    RefreshCw, Search, Building2,
} from 'lucide-react';
import { purchaseIntelligenceService } from '../services/purchaseIntelligenceService';
import { PurchaseSuggestionItem } from '../types';

const URGENCY_STYLE: Record<PurchaseSuggestionItem['urgency'], { label: string; badge: string; dot: string }> = {
    ESGOTADO: { label: 'Esgotado', badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/40', dot: 'bg-red-500' },
    CRITICO: { label: 'Crítico', badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/40', dot: 'bg-orange-500' },
    BAIXO: { label: 'Baixo estoque', badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/15 dark:text-amber-400 dark:border-amber-900/40', dot: 'bg-amber-500' },
};

export const SugestaoCompra: React.FC = () => {
    const [items, setItems] = useState<PurchaseSuggestionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBrand, setSelectedBrand] = useState<string>('Todas');
    const [search, setSearch] = useState('');

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
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    }, [items]);

    const filteredItems = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter((item) => {
            const matchesBrand = selectedBrand === 'Todas' || item.brand === selectedBrand;
            const matchesSearch = !q || item.productName.toLowerCase().includes(q) || item.productId.toLowerCase().includes(q);
            return matchesBrand && matchesSearch;
        });
    }, [items, selectedBrand, search]);

    const summary = useMemo(() => {
        const base = { esgotado: 0, critico: 0, baixo: 0, unidades: 0, valor: 0, temValor: false };
        for (const item of filteredItems) {
            if (item.urgency === 'ESGOTADO') base.esgotado++;
            else if (item.urgency === 'CRITICO') base.critico++;
            else base.baixo++;
            base.unidades += item.suggestedQty || 0;
            if (item.estimatedCost != null) { base.valor += item.estimatedCost; base.temValor = true; }
        }
        return base;
    }, [filteredItems]);

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
            item.suggestedQty ?? 'A definir',
            URGENCY_STYLE[item.urgency].label,
        ].join(';'));
        const csvContent = '﻿' + [headers.join(';'), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        link.href = url;
        link.download = `sugestao_compra_${selectedBrand === 'Todas' ? 'todas_marcas' : selectedBrand.toLowerCase().replace(/\s+/g, '_')}_${date}.csv`;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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
                    </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
                <div className="flex flex-col lg:flex-row gap-3 mb-6">
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
                            onClick={() => setSelectedBrand('Todas')}
                            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${selectedBrand === 'Todas'
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#00a699]/40'
                                }`}
                        >
                            Todas as marcas ({items.length})
                        </button>
                        {brandCounts.map(([brand, count]) => (
                            <button
                                key={brand}
                                onClick={() => setSelectedBrand(brand)}
                                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all ${selectedBrand === brand
                                    ? 'bg-[#00a699] text-white border-[#00a699]'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#00a699]/40'
                                    }`}
                            >
                                <Building2 className="w-3 h-3 opacity-60" />
                                {brand} ({count})
                            </button>
                        ))}
                    </div>
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
                                                    {item.suggestedQty != null ? (
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
