import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Ship, Clock, Boxes, PackageSearch, ChevronRight, Building2 } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import { brandService, Brand } from '../services/brandService';
import { PendingImportItem } from '../types';

interface ImportacoesProps {
    onBack: () => void;
}

interface ImportGroup {
    projectId: string;
    manufacturer: string;
    importNumber: string;
    items: PendingImportItem[];
    totalQuantity: number;
    earliestDate?: string;
    logoUrl?: string;
}

function daysUntil(dateStr?: string): number | null {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffMs = target.getTime() - today.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function ItemThumb({ imageUrl, name }: { imageUrl?: string; name: string }) {
    const [failed, setFailed] = useState(false);
    if (imageUrl && !failed) {
        return (
            <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-contain p-3"
                onError={() => setFailed(true)}
            />
        );
    }
    return <PackageSearch className="w-10 h-10 text-slate-400 dark:text-slate-600" strokeWidth={1.5} />;
}

function etaLabel(dateStr?: string): string {
    const days = daysUntil(dateStr);
    if (days === null) return 'Previsão a definir';
    if (days < 0) return 'Chegada atrasada';
    if (days === 0) return 'Chega hoje';
    if (days === 1) return 'Em 1 dia';
    return `Em ${days} dias`;
}

// Tenta casar o texto livre de "fabricante" do projeto de importação com uma marca
// cadastrada (ex.: manufacturer "APUTURE + TRIOPO" casa com a marca "Triopo").
function findLogoForManufacturer(manufacturer: string, brands: Brand[]): string | undefined {
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const m = norm(manufacturer);
    const match = brands.find(b => b.logo_url && m.includes(norm(b.name)));
    return match?.logo_url;
}

export const Importacoes: React.FC<ImportacoesProps> = ({ onBack }) => {
    const [items, setItems] = useState<PendingImportItem[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all([
            inventoryService.getAllPendingImportItems(),
            brandService.getAllBrands(),
        ])
            .then(([itemsData, brandsData]) => {
                if (cancelled) return;
                setItems(itemsData);
                setBrands(brandsData);
            })
            .catch((err) => console.error('Failed to load pending imports', err))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const groups = useMemo<ImportGroup[]>(() => {
        const map = new Map<string, ImportGroup>();
        for (const item of items) {
            let group = map.get(item.projectId);
            if (!group) {
                group = {
                    projectId: item.projectId,
                    manufacturer: item.manufacturer,
                    importNumber: item.importNumber,
                    items: [],
                    totalQuantity: 0,
                };
                map.set(item.projectId, group);
            }
            group.items.push(item);
            group.totalQuantity += item.quantity || 0;
            if (item.expectedDate && (!group.earliestDate || item.expectedDate < group.earliestDate)) {
                group.earliestDate = item.expectedDate;
            }
        }
        const list = Array.from(map.values());
        for (const g of list) g.logoUrl = findLogoForManufacturer(g.manufacturer, brands);
        list.sort((a, b) => {
            if (!a.earliestDate && !b.earliestDate) return 0;
            if (!a.earliestDate) return 1;
            if (!b.earliestDate) return -1;
            return new Date(a.earliestDate).getTime() - new Date(b.earliestDate).getTime();
        });
        return list;
    }, [items, brands]);

    const selectedGroup = groups.find(g => g.projectId === selectedProjectId) || null;
    const totalUnits = items.reduce((sum, i) => sum + (i.quantity || 0), 0);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
            {/* Hero */}
            <div className="skeuo-flat border-b border-white/5 pt-6 pb-8 sm:pt-10 sm:pb-10 px-4 sm:px-6 lg:px-8 transition-colors">
                <div className="max-w-7xl mx-auto">
                    <button
                        onClick={selectedGroup ? () => setSelectedProjectId(null) : onBack}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 transition-colors mb-4"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        {selectedGroup ? 'Voltar aos fornecedores' : 'Voltar ao início'}
                    </button>

                    {!selectedGroup ? (
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 sm:w-[46px] sm:h-[46px] rounded-2xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center shrink-0">
                                    <Ship className="w-5 h-5 sm:w-6 sm:h-6 text-amber-700 dark:text-amber-400" />
                                </div>
                                <div>
                                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Importações</h1>
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                        Acompanhe por fornecedor o que está a caminho do nosso estoque
                                    </p>
                                </div>
                            </div>

                            {!loading && items.length > 0 && (
                                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-full shadow-sm">
                                    <Boxes className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                    {totalUnits} un em {groups.length} {groups.length === 1 ? 'importação' : 'importações'}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 sm:w-[46px] sm:h-[46px] rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                                    {selectedGroup.logoUrl ? (
                                        <img src={selectedGroup.logoUrl} alt={selectedGroup.manufacturer} className="w-full h-full object-contain p-1.5" />
                                    ) : (
                                        <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                                    )}
                                </div>
                                <div>
                                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{selectedGroup.manufacturer}</h1>
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                        {selectedGroup.importNumber} · {selectedGroup.items.length} {selectedGroup.items.length === 1 ? 'item' : 'itens'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 px-4 py-2 rounded-full">
                                <Clock className="w-4 h-4" />
                                {etaLabel(selectedGroup.earliestDate)}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <svg className="animate-spin h-8 w-8 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        <p className="mt-2 text-slate-600 dark:text-slate-400">Carregando importações...</p>
                    </div>
                ) : groups.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                            <PackageSearch className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">Nenhuma importação em andamento</h3>
                        <p className="text-slate-500 dark:text-slate-400">Assim que um novo lote for cadastrado, ele aparece aqui.</p>
                    </div>
                ) : !selectedGroup ? (
                    /* NÍVEL 1 — Fornecedores */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groups.map((group) => {
                            const days = daysUntil(group.earliestDate);
                            const late = days !== null && days < 0;
                            return (
                                <button
                                    key={group.projectId}
                                    onClick={() => setSelectedProjectId(group.projectId)}
                                    className="app-card overflow-hidden flex flex-col text-left group"
                                >
                                    <div className="h-1 w-full shrink-0 bg-amber-500" />
                                    <div className="p-5 flex items-start gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                                            {group.logoUrl ? (
                                                <img src={group.logoUrl} alt={group.manufacturer} className="w-full h-full object-contain p-2" />
                                            ) : (
                                                <Building2 className="w-6 h-6 text-slate-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug truncate">
                                                {group.manufacturer}
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {group.importNumber}
                                            </p>
                                            <div className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-1 rounded-full mt-2.5 ${late ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'}`}>
                                                <Clock className="w-2.5 h-2.5" />
                                                {etaLabel(group.earliestDate)}
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-brand-500 transition-colors shrink-0 mt-1" />
                                    </div>
                                    <div className="px-5 pb-4 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        <Boxes className="w-3.5 h-3.5" />
                                        {group.totalQuantity} un · {group.items.length} {group.items.length === 1 ? 'produto' : 'produtos'}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    /* NÍVEL 2 — Itens do fornecedor selecionado */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {selectedGroup.items.map((item) => {
                            const days = daysUntil(item.expectedDate);
                            const late = days !== null && days < 0;
                            return (
                                <div key={item.id} className="app-card overflow-hidden flex flex-col">
                                    <div className="h-1 w-full shrink-0 bg-amber-500" />

                                    <div className="h-32 w-full bg-white/40 dark:bg-slate-900/40 flex items-center justify-center relative border-b border-white/10">
                                        <span className="absolute top-2.5 left-2.5 bg-amber-500 text-white text-[9.5px] font-bold px-2 py-0.5 rounded-md tracking-wide shadow-sm">
                                            A CHEGAR
                                        </span>
                                        <span className={`absolute top-2.5 right-2.5 text-white text-[10.5px] font-bold px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1 ${late ? 'bg-red-500' : 'bg-slate-900/85 dark:bg-slate-700/90'}`}>
                                            <Clock className="w-3 h-3" />
                                            {etaLabel(item.expectedDate)}
                                        </span>
                                        <ItemThumb imageUrl={item.imageUrl} name={item.productName} />
                                    </div>

                                    <div className="p-4 flex flex-col flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-900/40 px-2.5 py-0.5 rounded-full">
                                                COD: {item.productId}
                                            </span>
                                            {item.productBrand && (
                                                <span className="text-[10.5px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wide">
                                                    {item.productBrand}
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug mb-3">
                                            {item.productName}
                                        </h3>

                                        <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 mb-2.5">
                                            <Boxes className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                                            <span className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                                                {item.quantity} un a caminho
                                                {item.expectedDate
                                                    ? ` · previsão ${new Date(item.expectedDate).toLocaleDateString('pt-BR')}`
                                                    : ' · previsão a definir'}
                                            </span>
                                        </div>

                                        {item.observation && (
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2 italic line-clamp-2" title={item.observation}>
                                                "{item.observation}"
                                            </p>
                                        )}

                                        <div className="mt-auto pt-1">
                                            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                                                <Clock className="w-2.5 h-2.5" />
                                                Aguardando chegada
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};
