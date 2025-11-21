import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { inventoryService } from '../services/inventoryService';
import { Product } from '../types';

interface InventoryProps {
  userEmail: string;
}

export const Inventory: React.FC<InventoryProps> = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  // New state for stats
  const [totalAvailable, setTotalAvailable] = useState<number>(0);
  const [topSearched, setTopSearched] = useState<Array<{ productId: string; productName: string; count: number }>>([]);


  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchProducts = useCallback(async (query: string) => {
    setLoading(true);
    try {
      if (query) {
        const results = await inventoryService.searchProducts(query);
        setProducts(results);
      } else {
        // No search query: fetch stats instead of product list
        const [total, top] = await Promise.all([
          inventoryService.getTotalAvailable(),
          inventoryService.getTopSearched(5)
        ]);
        setTotalAvailable(total);
        setTopSearched(top);
        setProducts([]); // Ensure no product cards are shown
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(debouncedQuery);
  }, [debouncedQuery, fetchProducts]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">

      {/* Search Hero Section */}
      <div className="bg-gradient-to-b from-white to-slate-50 shadow-sm border-b border-slate-200 pt-10 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">O que você está procurando?</h2>
          <p className="text-slate-500 mb-8 text-lg">Consulte disponibilidade por código ou nome do produto.</p>

          <div className="relative max-w-2xl mx-auto group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-14 pr-14 py-4 border-2 border-slate-200 rounded-2xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-lg shadow-sm group-hover:border-brand-200"
              placeholder="Ex: 1896, Sony, Tripé..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {loading && (
              <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none">
                <RefreshCw className="h-6 w-6 text-brand-500 animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <p className="mt-2 text-slate-600">Carregando dados...</p>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Estoque Disponível</h2>
            <p className="text-lg text-slate-700">Total de itens disponíveis: <span className="font-semibold text-brand-600">{totalAvailable}</span></p>
            <h3 className="mt-6 text-xl font-semibold text-slate-800">Top {topSearched.length} itens mais buscados</h3>
            <ul className="mt-2 space-y-2">
              {topSearched.map((item) => (
                <li key={item.productId} className="flex justify-between text-slate-600">
                  <span>{item.productName}</span>
                  <span className="font-medium text-brand-600">{item.count} buscas</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!loading && products.length > 0 && (
          <div className="mt-10 text-center text-sm text-slate-400 border-t border-slate-200 pt-6">
            Exibindo {products.length} resultados encontrados.
          </div>
        )}
      </main>
    </div>
  );
};