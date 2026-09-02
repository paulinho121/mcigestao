import { useEffect, useState } from 'react';
import { Ship, ChevronRight, Boxes } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';

interface Props {
    onNavigate: () => void;
}

export function ImportacoesCTABanner({ onNavigate }: Props) {
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        inventoryService.getAllPendingImportItems()
            .then((items) => { if (!cancelled) setCount(items.length); })
            .catch(() => { if (!cancelled) setCount(0); });
        return () => { cancelled = true; };
    }, []);

    if (count === 0) return null; // nada em trânsito: não polui a home

    return (
        <button
            onClick={onNavigate}
            className="app-card w-full flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5 mb-10 text-left border-l-4 border-l-amber-500 group"
        >
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center shrink-0">
                    <Ship className="w-5 h-5 sm:w-6 sm:h-6 text-amber-700 dark:text-amber-400" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-white leading-tight">
                        {count === null ? (
                            'Verificando importações em andamento...'
                        ) : (
                            <>
                                <span className="text-amber-700 dark:text-amber-400">{count} {count === 1 ? 'produto' : 'produtos'}</span> a caminho do nosso estoque
                            </>
                        )}
                    </div>
                    <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-start gap-1.5">
                        <Boxes className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        Acompanhe o que está em trânsito antes mesmo de chegar ao estoque
                    </p>
                </div>
            </div>

            <span className="shrink-0 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-brand-600 text-white text-xs sm:text-[13px] font-bold shadow-lg shadow-brand-600/25 group-hover:bg-brand-700 transition-colors">
                Ver Importações
                <ChevronRight className="w-3.5 h-3.5" />
            </span>
        </button>
    );
}
