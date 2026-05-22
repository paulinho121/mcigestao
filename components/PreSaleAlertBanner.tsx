import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, X, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';
import { preSaleService } from '../services/preSaleService';
import { PreSaleAlert } from '../types';

interface Props {
    onNavigateToPreVenda: () => void;
    refreshTrigger?: number;
}

export function PreSaleAlertBanner({ onNavigateToPreVenda, refreshTrigger }: Props) {
    const [alerts, setAlerts] = useState<PreSaleAlert[]>([]);
    const [expanded, setExpanded] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    const loadAlerts = useCallback(async () => {
        try {
            const data = await preSaleService.getUnreadAlerts();
            setAlerts(data);
            if (data.length > 0) setDismissed(false);
        } catch {
            // silencioso
        }
    }, []);

    useEffect(() => {
        loadAlerts();
    }, [loadAlerts, refreshTrigger]);

    // Re-checa a cada 60 segundos
    useEffect(() => {
        const interval = setInterval(loadAlerts, 60_000);
        return () => clearInterval(interval);
    }, [loadAlerts]);

    if (!alerts.length || dismissed) return null;

    return (
        <div className="w-full bg-red-600 text-white shadow-lg animate-pulse-once z-50">
            <div className="px-4 py-2 flex items-center justify-between gap-3">
                <button
                    onClick={() => setExpanded((v) => !v)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                    <AlertTriangle className="w-5 h-5 shrink-0 animate-bounce" />
                    <span className="font-bold text-sm truncate">
                        ATENÇÃO: {alerts.length} {alerts.length === 1 ? 'item em pré-venda chegou' : 'itens em pré-venda chegaram'} ao estoque!
                    </span>
                    {expanded ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                </button>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => { onNavigateToPreVenda(); setExpanded(false); }}
                        className="bg-white text-red-600 font-bold text-xs px-3 py-1 rounded-full hover:bg-red-50 transition-colors"
                    >
                        Ver Pré-Vendas
                    </button>
                    <button
                        onClick={() => setDismissed(true)}
                        className="p-1 rounded-full hover:bg-red-700 transition-colors"
                        title="Recolher (os alertas continuam ativos)"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="border-t border-red-500 bg-red-700 divide-y divide-red-600 max-h-60 overflow-y-auto">
                    {alerts.map((alert) => (
                        <div key={alert.id} className="px-4 py-2 flex items-center gap-3">
                            <ShoppingBag className="w-4 h-4 shrink-0 text-red-200" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{alert.product_name}</p>
                                {alert.pre_sale && (
                                    <p className="text-xs text-red-200 truncate">
                                        Vendedor: {alert.pre_sale.vendedor_name} · Cliente: {alert.pre_sale.cliente_name} · Qtd: {alert.pre_sale.quantity}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
