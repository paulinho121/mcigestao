import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';
import { Product } from '../types';
import { Check, Trash2, Wand2, Search, ExternalLink, Filter } from 'lucide-react';

const EnrichmentReview: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Buscamos os últimos produtos atualizados para conferência
      const allProducts = await inventoryService.getAllProducts(1000);
      const enriched = allProducts.filter(p => p.image_url && p.image_url.startsWith('http'));
      setProducts(enriched);
    } catch (error) {
      console.error('Error loading products for review:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = async (id: string) => {
    const success = await inventoryService.updateProductImage(id, '');
    if (success) {
      setProducts(prev => prev.filter(p => p.id !== id));
      setSuccess('Imagem removida com sucesso');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleManualSearch = (name: string) => {
    const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(name)}`;
    window.open(url, '_blank');
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(filter.toLowerCase()) || 
    p.id.includes(filter)
  );

  return (
    <div className="p-6 bg-[#0f172a] min-h-screen text-slate-200">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Conferência de Imagens
            </h1>
            <p className="text-slate-400 mt-2">Revise as imagens adicionadas pela automação.</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input 
                type="text"
                placeholder="Filtrar por nome ou código..."
                className="pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 text-sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <button 
              onClick={loadProducts}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700"
              title="Atualizar lista"
            >
              <Filter className="w-5 h-5 text-blue-400" />
            </button>
          </div>
        </header>

        {success && (
          <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded-xl animate-fade-in">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            carregando catálogo...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all group">
                <div className="aspect-square relative overflow-hidden bg-slate-900 flex items-center justify-center p-4">
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Erro+na+Imagem';
                    }}
                  />
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => window.open(product.image_url, '_blank')}
                      className="p-2 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-lg text-white"
                      title="Ver original"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-700/50">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
                      COD: {product.id}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider truncate max-w-[100px]">
                      {product.brand}
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-slate-200 line-clamp-2 h-8 mb-4">
                    {product.name}
                  </h3>

                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => handleRemoveImage(product.id)}
                      className="flex items-center justify-center p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl transition-all"
                      title="Excluir imagem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleManualSearch(product.name)}
                      className="flex items-center justify-center p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl transition-all"
                      title="Pesquisa Manual"
                    >
                      <Wand2 className="w-4 h-4" />
                    </button>
                    <button 
                      className="flex items-center justify-center p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl transition-all"
                      title="Confirmar"
                      onClick={() => {
                        setProducts(prev => prev.filter(p => p.id !== product.id));
                        setSuccess('Imagem confirmada!');
                        setTimeout(() => setSuccess(''), 2000);
                      }}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredProducts.length === 0 && (
          <div className="text-center py-20 bg-slate-800/20 rounded-3xl border border-dashed border-slate-700">
            <p className="text-slate-500 italic">Nenhum produto para conferência encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnrichmentReview;
