import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';
import { Product } from '../types';
import { Search, ImagePlus, Check, RefreshCw } from 'lucide-react';

const EnrichmentReview: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [imageInputs, setImageInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const allProducts = await inventoryService.getAllProducts(2000);
      const withoutImage = allProducts
        .filter(p => !p.image_url || !p.image_url.startsWith('http'))
        .sort((a, b) => {
          const aNum = parseInt(a.id, 10);
          const bNum = parseInt(b.id, 10);
          if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
          return a.id.localeCompare(b.id);
        });
      setProducts(withoutImage);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveImage = async (id: string) => {
    const url = imageInputs[id]?.trim();
    if (!url) return;
    setSaving(prev => ({ ...prev, [id]: true }));
    const ok = await inventoryService.updateProductImage(id, url);
    if (ok) {
      setSaved(prev => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setProducts(prev => prev.filter(p => p.id !== id));
        setSaved(prev => { const n = { ...prev }; delete n[id]; return n; });
      }, 800);
    }
    setSaving(prev => ({ ...prev, [id]: false }));
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    p.id.includes(filter)
  );

  return (
    <div className="p-6 bg-[#0f172a] min-h-screen text-slate-200">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Produtos sem Imagem
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              {loading ? '...' : `${filteredProducts.length} produto${filteredProducts.length !== 1 ? 's' : ''} aguardando imagem`}
              {' · '} ordenados por código
            </p>
          </div>

          <div className="flex items-center gap-3">
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
              title="Recarregar lista"
            >
              <RefreshCw className="w-5 h-5 text-blue-400" />
            </button>
          </div>
        </header>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
            carregando produtos...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/20 rounded-3xl border border-dashed border-slate-700">
            <p className="text-slate-500 italic">Todos os produtos já possuem imagem.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className={`bg-slate-800/40 border rounded-2xl overflow-hidden transition-all ${
                  saved[product.id]
                    ? 'border-emerald-500/60 scale-95 opacity-60'
                    : 'border-slate-700/50 hover:border-blue-500/40'
                }`}
              >
                {/* Placeholder imagem */}
                <div className="aspect-square bg-slate-900 flex flex-col items-center justify-center gap-2 text-slate-600">
                  <ImagePlus className="w-10 h-10 opacity-30" />
                  <span className="text-[10px] tracking-widest uppercase opacity-40">sem imagem</span>
                </div>

                {/* Info */}
                <div className="p-4 border-t border-slate-700/50 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30 shrink-0">
                      #{product.id}
                    </span>
                    {product.brand && (
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider truncate">
                        {product.brand}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-semibold text-slate-200 line-clamp-2 leading-relaxed">
                    {product.name}
                  </h3>

                  {/* Input URL */}
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Cole a URL da imagem..."
                      className="flex-1 min-w-0 px-3 py-1.5 text-[11px] bg-slate-900/60 border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-200 placeholder-slate-600"
                      value={imageInputs[product.id] || ''}
                      onChange={(e) => setImageInputs(prev => ({ ...prev, [product.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveImage(product.id)}
                    />
                    <button
                      onClick={() => handleSaveImage(product.id)}
                      disabled={saving[product.id] || !imageInputs[product.id]?.trim() || saved[product.id]}
                      className="shrink-0 p-1.5 rounded-lg transition-all disabled:opacity-40 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30"
                      title="Salvar imagem"
                    >
                      {saved[product.id] ? (
                        <Check className="w-4 h-4" />
                      ) : saving[product.id] ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <ImagePlus className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnrichmentReview;
