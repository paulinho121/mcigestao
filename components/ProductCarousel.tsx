import { useState, useEffect } from 'react';
import { Product } from '../types';
import { inventoryService } from '../services/inventoryService';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const ProductCarousel = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const products = await inventoryService.getAllProducts(20);
        // Filtra produtos que tenham imagem e estoque
        const hasImage = products.filter(p => p.image_url && p.total > 0);
        // Se não houver muitos com imagem, pega aleatórios
        const selected = hasImage.length >= 5 ? hasImage : products.slice(0, 8);
        setFeaturedProducts(selected);
      } catch (err) {
        console.error('Erro ao carregar carrosel:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  useEffect(() => {
    if (featuredProducts.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredProducts.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [featuredProducts]);

  const next = () => setCurrentIndex((prev) => (prev + 1) % featuredProducts.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + featuredProducts.length) % featuredProducts.length);

  if (loading || featuredProducts.length === 0) return null;

  const current = featuredProducts[currentIndex];

  return (
    <div className="relative w-full max-w-4xl mx-auto overflow-hidden rounded-3xl shadow-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-700">
      <div className="flex flex-col md:flex-row h-full min-h-[320px]">
        {/* Image Section */}
        <div className="relative w-full md:w-1/2 h-64 md:h-auto bg-slate-100 dark:bg-slate-900 group">
          <img
            src={current.image_url || 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?q=80&w=1470&auto=format&fit=crop'}
            alt={current.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
          
          <div className="absolute top-4 left-4">
            <span className="bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md shadow-lg">
              Destaque
            </span>
          </div>
        </div>

        {/* Info Section */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-center relative bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-bold text-brand-500 uppercase tracking-wider">{current.brand}</span>
            <div className="h-1 w-1 rounded-full bg-slate-300"></div>
            <span className="text-xs text-slate-400 font-mono">COD: {current.id}</span>
          </div>

          <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-4 line-clamp-2 leading-tight">
            {current.name}
          </h3>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
              <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">CE</span>
              <span className="text-sm font-black text-slate-700 dark:text-slate-200">{current.stock_ce}</span>
            </div>
            <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
              <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">SC</span>
              <span className="text-sm font-black text-slate-700 dark:text-slate-200">{current.stock_sc}</span>
            </div>
            <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
              <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">SP</span>
              <span className="text-sm font-black text-slate-700 dark:text-slate-200">{current.stock_sp}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-bold text-green-600">Em Estoque</span>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={prev}
                className="p-2 rounded-full bg-white dark:bg-slate-700 shadow-md hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors border border-slate-100 dark:border-slate-600"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
              <button 
                onClick={next}
                className="p-2 rounded-full bg-white dark:bg-slate-700 shadow-md hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors border border-slate-100 dark:border-slate-600"
              >
                <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
        {featuredProducts.map((_, idx) => (
          <div 
            key={idx}
            className={`h-1 transition-all duration-300 rounded-full ${idx === currentIndex ? 'w-6 bg-brand-500' : 'w-2 bg-slate-200 dark:bg-slate-700 opacity-50'}`}
          />
        ))}
      </div>
    </div>
  );
};
