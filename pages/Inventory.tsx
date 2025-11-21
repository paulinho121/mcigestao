import React, { useState, useEffect, useCallback } from 'react';
import { Search, PackageX, RefreshCw } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { inventoryService } from '../services/inventoryService';
import { Product } from '../types';

interface InventoryProps {
  userEmail: string;
}

export const Inventory: React.FC<InventoryProps> = ({ userEmail }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [debouncedQuery, setDebouncedQuery] = useState('');

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
      const results = query
        ? await inventoryService.searchProducts(query)
        : await inventoryService.getAllProducts(20); // Load recent/top items initially
      setProducts(results);
    } catch (error) {
      console.error("Failed to fetch products", error);
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-slate-200 rounded-xl border border-slate-300"></div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <PackageX className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhum produto encontrado</h3>
            <p className="text-slate-500">Verifique o código ou tente palavras-chave diferentes.</p>
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