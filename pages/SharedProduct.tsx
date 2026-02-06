import { useState, useEffect } from 'react';
import { Product } from '../types';
import { inventoryService } from '../services/inventoryService';
import { ProductCard } from '../components/ProductCard';
import { Share2, ArrowLeft, Package, Box } from 'lucide-react';

interface SharedProductProps {
    productId: string;
    onBack?: () => void;
}

export const SharedProduct: React.FC<SharedProductProps> = ({ productId, onBack }) => {
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProduct = async () => {
            setLoading(true);
            try {
                const data = await inventoryService.getProductById(productId);
                if (data) {
                    setProduct(data);
                } else {
                    setError('Produto não encontrado');
                }
            } catch (err) {
                console.error(err);
                setError('Erro ao carregar produto');
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [productId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                    <p className="mt-4 text-slate-500 font-medium animate-pulse">Carregando detalhes do estoque...</p>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 text-center">
                <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700">
                    <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Box className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{error || 'Ops!'}</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8">Não conseguimos encontrar as informações deste produto. O link pode estar expirado ou incorreto.</p>
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-brand-200 flex items-center justify-center gap-2 mx-auto w-full"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Voltar para o Início
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans selection:bg-brand-100 selection:text-brand-900">
            {/* Minimal Header */}
            <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative flex items-center">
                            <span className="text-2xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-tr from-brand-600 to-accent-DEFAULT italic">MC</span>
                            <div className="w-1.5 h-1.5 bg-accent-DEFAULT rounded-full mb-2.5 -ml-0.5"></div>
                        </div>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">Estoque Online</span>
                    </div>
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-2 text-slate-500 hover:text-brand-600 transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-8 sm:py-12">
                {/* Hero Product Info */}
                <div className="mb-8 text-center sm:text-left">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold uppercase tracking-wider mb-3 dark:bg-brand-900/30 dark:text-brand-400">
                        Disponibilidade Instantânea
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-tight mb-2">
                        {product.name}
                    </h1>
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-500 dark:text-slate-400">
                        <span className="font-mono text-sm bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">COD: {product.id}</span>
                        {product.brand && (
                            <>
                                <span>•</span>
                                <span className="font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-widest text-xs">{product.brand}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* The Main Card - We use the same component for consistency but with expanded details forced */}
                <div className="shadow-2xl shadow-slate-200 dark:shadow-none mb-10 overflow-hidden rounded-3xl border-4 border-white dark:border-slate-800 transition-transform hover:scale-[1.01] duration-300">
                    <ProductCard product={product} />
                </div>

                {/* Additional Info / Call to Action */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-brand-600" />
                        Precisa deste item?
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        Este estoque é atualizado em tempo real. Entre em contato com nossa equipe comercial para realizar uma reserva ou solicitar orçamento.
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                        <a
                            href={`https://wa.me/5585988171944?text=${encodeURIComponent(`Olá! Gostaria de mais informações sobre o produto:\n\n📦 *${product.name}*\n🔢 *Código:* ${product.id}\n\nVi que ele está disponível no estoque online e gostaria de prosseguir com o atendimento.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#25D366] hover:bg-[#128C7E] text-white px-6 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-100 dark:shadow-none"
                        >
                            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                            Falar com o Vendedor
                        </a>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                alert('Link copiado!');
                            }}
                            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Share2 className="w-4 h-4" />
                            Copiar Link da Página
                        </button>
                    </div>
                </div>

                {/* Footer Info */}
                <footer className="mt-12 text-center text-slate-400 dark:text-slate-600 text-xs">
                    <p>© {new Date().getFullYear()} MC Gestão Corporativa. Todos os direitos reservados.</p>
                </footer>
            </main>
        </div>
    );
};
