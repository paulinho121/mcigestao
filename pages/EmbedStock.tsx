import { useState, useEffect } from 'react';
import { Search, RefreshCw, Package } from 'lucide-react';
import { Product } from '../types';
import { inventoryService } from '../services/inventoryService';
import { ProductCard } from '../components/ProductCard';

/**
 * Página pública de consulta de estoque para embutir via iframe no CRM.
 * Rota: #/consulta — sem app shell, sem login (leitura pública via RLS).
 */
export const EmbedStock = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchQuery), 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        let cancelled = false;
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const results = debouncedQuery.trim()
                    ? await inventoryService.searchProducts(debouncedQuery)
                    : await inventoryService.getLatestProducts(12);
                if (!cancelled) {
                    setProducts(results);
                    setSearched(!!debouncedQuery.trim());
                }
            } catch (error) {
                console.error('[EmbedStock] Falha ao buscar produtos', error);
                if (!cancelled) setProducts([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchProducts();
        return () => { cancelled = true; };
    }, [debouncedQuery]);

    return (
        <div className="min-h-screen bg-[var(--skeuo-bg)] transition-colors font-sans">
            {/* Barra de busca fixa no topo do iframe */}
            <div className="sticky top-0 z-20 skeuo-flat border-b border-white/5 px-4 py-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-11 pr-11 py-3 border-2 border-slate-200 rounded-2xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-base shadow-sm group-hover:border-brand-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-500"
                            placeholder="Consultar estoque: código, nome ou marca..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                        {loading && (
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                                <RefreshCw className="h-5 w-5 text-brand-500 animate-spin" />
                            </div>
                        )}
                    </div>
                    {!searched && !loading && products.length > 0 && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center uppercase tracking-widest font-semibold">
                            Últimas chegadas no estoque
                        </p>
                    )}
                </div>
            </div>

            {/* Resultados */}
            <div className="max-w-5xl mx-auto px-4 py-5 sm:px-6">
                {!loading && products.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                            {searched ? <Search className="w-8 h-8 text-slate-400" /> : <Package className="w-8 h-8 text-slate-400" />}
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 font-semibold">
                            {searched ? 'Nenhum produto encontrado' : 'Digite para consultar o estoque'}
                        </p>
                        {searched && (
                            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                                Tente buscar por código, nome ou marca.
                            </p>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </div>
    );
};
