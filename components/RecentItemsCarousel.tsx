import { useState, useEffect } from 'react';
import { Product } from '../types';
import { inventoryService } from '../services/inventoryService';
import { ChevronLeft, ChevronRight, ShoppingBag, PlusCircle, Calendar } from 'lucide-react';

interface RecentItemsCarouselProps {
  onProductClick?: (productId: string) => void;
}

export const RecentItemsCarousel = ({ onProductClick }: RecentItemsCarouselProps) => {
  const [latestProducts, setLatestProducts] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const products = await inventoryService.getLatestProducts(8);
        setLatestProducts(products);
      } catch (err) {
        console.error('Erro ao carregar itens recentes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLatest();
  }, []);

  useEffect(() => {
    if (latestProducts.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % latestProducts.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [latestProducts]);

  const next = () => setCurrentIndex((prev) => (prev + 1) % latestProducts.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + latestProducts.length) % latestProducts.length);

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto h-[400px] flex items-center justify-center bg-slate-100/50 dark:bg-slate-800/50 rounded-3xl animate-pulse">
        <ShoppingBag className="w-12 h-12 text-slate-300 animate-bounce" />
      </div>
    );
  }

  if (latestProducts.length === 0) return null;

  const current = latestProducts[currentIndex];

  return (
    <div className="relative w-full max-w-5xl mx-auto bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 transition-all duration-500 hover:shadow-brand-500/10 active:scale-[0.995]">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-500/5 -skew-x-12 translate-x-1/4 pointer-events-none" />
      
      <div className="flex flex-col lg:flex-row h-full">
        {/* Gallery / Image Section */}
        <div className="relative w-full lg:w-1/2 h-72 lg:h-[420px] overflow-hidden group">
          <img
            src={current.image_url || 'https://images.unsplash.com/photo-1553413077-190dd305871c?q=80&w=1470&auto=format&fit=crop'}
            alt={current.name}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
          
          <div className="absolute top-6 left-6 flex flex-col gap-2">
            <div className="bg-brand-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-xl flex items-center gap-1.5">
              <PlusCircle className="w-3 h-3" />
              Recém Adicionado
            </div>
          </div>

          <div className="absolute bottom-6 left-6 right-6 lg:hidden">
            <span className="text-white/60 text-xs font-medium uppercase tracking-widest mb-1 block">{current.brand}</span>
            <h3 className="text-2xl font-bold text-white leading-tight">{current.name}</h3>
          </div>
        </div>

        {/* Content Section */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-between relative">
          <div>
            <div className="hidden lg:flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg uppercase tracking-wider">
                  {current.brand}
                </span>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span className="text-xs font-mono text-slate-400 uppercase">SKU: {current.id}</span>
              </div>
              {current.created_at && (
                <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-xs">
                  <Calendar className="w-3 h-3" />
                  {new Date(current.created_at).toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>

            <h3 className="hidden lg:block text-3xl font-black text-slate-900 dark:text-white mb-6 leading-tight">
              {current.name}
            </h3>

            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 line-clamp-3 leading-relaxed">
              {current.observations || `Novo item da marca ${current.brand} adicionado ao inventário global. Confira as quantidades disponíveis em cada filial.`}
            </p>

            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="relative group">
                <div className="absolute -inset-2 bg-blue-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-tighter">CEARA</span>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{current.stock_ce}</span>
                <div className="w-6 h-1 bg-blue-500 rounded-full mt-1" />
              </div>
              <div className="relative group">
                <div className="absolute -inset-2 bg-emerald-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-tighter">S. CATARINA</span>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{current.stock_sc}</span>
                <div className="w-6 h-1 bg-emerald-500 rounded-full mt-1" />
              </div>
              <div className="relative group">
                <div className="absolute -inset-2 bg-orange-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-tighter">SÃO PAULO</span>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{current.stock_sp}</span>
                <div className="w-6 h-1 bg-orange-500 rounded-full mt-1" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-auto">
            <button 
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl hover:bg-brand-500 dark:hover:bg-brand-500 hover:text-white transition-all transform active:scale-95 shadow-xl shadow-slate-900/10"
              onClick={() => onProductClick?.(current.id)}
            >
              Ver Detalhes
            </button>
            
            <div className="flex gap-3">
              <button 
                onClick={prev}
                className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-brand-500 hover:text-white dark:hover:bg-brand-500 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-700"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={next}
                className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-brand-500 hover:text-white dark:hover:bg-brand-500 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-700"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modern pagination dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {latestProducts.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 transition-all duration-500 rounded-full ${idx === currentIndex ? 'w-8 bg-brand-500' : 'w-2 bg-slate-300 dark:bg-slate-700'}`}
          />
        ))}
      </div>
    </div>
  );
};
