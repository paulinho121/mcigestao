import { useState, useEffect } from 'react';
import { Product, Reservation } from '../types';
import { MapPin, Box, AlertCircle, Package, Calendar, FileText, Share2 } from 'lucide-react';
import { clsx } from 'clsx';
import { inventoryService } from '../services/inventoryService';

interface ProductCardProps {
    product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
    const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [importInfo, setImportInfo] = useState<{ quantity: number; expectedDate?: string } | null>(null);
    const availableStock = product.total - (product.reserved || 0);
    const isLowStock = availableStock < 5 && availableStock > 0;
    const isOutOfStock = availableStock === 0;

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation(); // Avoid expanding the card

        const shareUrl = `${window.location.origin}${window.location.pathname}#/share/${product.id}`;

        // Build a more professional and visual message
        let text = `*ESTOQUE MCI* 📦\n`;
        text += `_Gestão Corporativa de Equipamentos_\n\n`;
        text += `*Item:* *${product.name}*\n`;
        text += `*Cód:* ${product.id}\n\n`;

        text += `✅ *Confira a disponibilidade atualizada:*\n`;
        text += `👉 ${shareUrl}\n\n`;

        text += `---`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
    };

    // Fetch reservations and import info when spotlight is opened
    useEffect(() => {
        if (isSpotlightOpen) {
            if (product.reserved > 0) {
                inventoryService.getReservationsByProduct(product.id)
                    .then(setReservations)
                    .catch(console.error);
            }
            // Fetch import information
            inventoryService.getImportInfoByProduct(product.id)
                .then(setImportInfo)
                .catch(console.error);
        }
    }, [isSpotlightOpen, product.id, product.reserved]);

    return (
        <div
            onClick={() => setIsSpotlightOpen(true)}
            className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col h-full group cursor-pointer relative ${isSpotlightOpen ? 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-900' : ''} dark:bg-slate-800 dark:border-slate-700`}
        >
            {product.brand_logo && (
                <div
                    className="absolute right-[0%] bottom-[5%] w-40 h-40 opacity-[0.12] pointer-events-none grayscale dark:opacity-[0.2] dark:invert transition-opacity duration-300"
                    style={{
                        backgroundImage: `url(${product.brand_logo})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center'
                    }}
                />
            )}

            {product.image_url && (
                <div className="h-48 sm:h-56 w-full overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center relative border-b border-slate-100 dark:border-slate-700">
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=400&auto=format&fit=crop&q=60';
                        }}
                    />
                    <div className="absolute top-2 left-2 flex gap-1">
                        {isLowStock && (
                            <div className="bg-yellow-400 text-yellow-950 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                                BAIXO
                            </div>
                        )}
                        {isOutOfStock && (
                            <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                                ESGOTADO
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="p-4 sm:p-5 flex-grow relative z-10">
                <div className="flex justify-between items-start mb-3 gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 whitespace-nowrap dark:bg-slate-700 dark:text-slate-300">
                        COD: {product.id}
                    </span>
                    <div className="flex items-center gap-2">
                        {product.brand && (
                            <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider truncate max-w-[120px] sm:max-w-none">
                                {product.brand}
                            </span>
                        )}
                        <button
                            onClick={handleShare}
                            className="p-1.5 rounded-full bg-slate-50 text-slate-400 hover:text-green-600 hover:bg-green-50 transition-all dark:bg-slate-700 dark:text-slate-400 dark:hover:text-green-400"
                            title="Compartilhar no WhatsApp"
                        >
                            <Share2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug mb-4 group-hover:text-brand-600 transition-colors break-words line-clamp-2 dark:text-slate-100 dark:group-hover:text-brand-400">
                    {product.name}
                </h3>

                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-green-700 dark:text-green-500">
                            <MapPin className="w-4 h-4 mr-2 text-green-500" />
                            <span>Ceará</span>
                        </div>
                        <span className={clsx("font-mono font-medium", product.stock_ce > 0 ? "text-slate-900 dark:text-slate-200" : "text-slate-300 dark:text-slate-600")}>
                            {product.stock_ce}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-blue-700 dark:text-blue-500">
                            <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                            <span>Santa Catarina</span>
                        </div>
                        <span className={clsx("font-mono font-medium", product.stock_sc > 0 ? "text-slate-900 dark:text-slate-200" : "text-slate-300 dark:text-slate-600")}>
                            {product.stock_sc}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-red-700 dark:text-red-500">
                            <MapPin className="w-4 h-4 mr-2 text-red-500" />
                            <span>São Paulo</span>
                        </div>
                        <span className={clsx("font-mono font-medium", product.stock_sp > 0 ? "text-slate-900 dark:text-slate-200" : "text-slate-300 dark:text-slate-600")}>
                            {product.stock_sp}
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 px-4 sm:px-5 py-3 border-t border-slate-100 flex justify-between items-center gap-3 dark:bg-slate-900/50 dark:border-slate-700">
                <div className="flex flex-col">
                    <span className="text-xs text-slate-500 uppercase font-semibold dark:text-slate-400">Estoque Total</span>
                    <div className="flex items-center">
                        <Box className="w-4 h-4 mr-1 text-brand-600 dark:text-brand-500" />
                        <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{product.total}</span>
                    </div>
                    {product.reserved > 0 && (
                        <div className="mt-1 space-y-0.5">
                            <div className="text-xs text-orange-600 font-medium">
                                Reservado: {product.reserved} un
                            </div>
                            <div className="text-xs text-green-700 font-semibold">
                                Disponível: {availableStock} un
                            </div>
                        </div>
                    )}
                </div>

                <div className="text-right flex-shrink-0">
                    {isOutOfStock ? (
                        <span className="inline-block px-2.5 sm:px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-md whitespace-nowrap">
                            Sem Estoque
                        </span>
                    ) : isLowStock ? (
                        <span className="inline-block px-2.5 sm:px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-md whitespace-nowrap">
                            Estoque Baixo
                        </span>
                    ) : (
                        <span className="inline-block px-2.5 sm:px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-md whitespace-nowrap">
                            Disponível
                        </span>
                    )}
                </div>
            </div>

            {/* Spotlight Modal */}
            {isSpotlightOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsSpotlightOpen(false);
                    }}
                >
                    <div
                        className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in zoom-in-95 duration-300 border border-white/10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Left Side: Product Image (Large) */}
                        <div className="md:w-1/2 bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 relative min-h-[300px]">
                            {product.image_url ? (
                                <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="max-w-full max-h-full object-contain drop-shadow-2xl animate-in slide-in-from-left-4 duration-500"
                                />
                            ) : (
                                <Box className="w-24 h-24 text-slate-300" />
                            )}

                            {/* Brand Logo Watermark - Larger in Spotlight */}
                            {product.brand_logo && (
                                <div
                                    className="absolute inset-0 opacity-[0.05] pointer-events-none grayscale dark:opacity-[0.1] dark:invert"
                                    style={{
                                        backgroundImage: `url(${product.brand_logo})`,
                                        backgroundSize: '40%',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'bottom right 20px'
                                    }}
                                />
                            )}

                            {/* Tags */}
                            <div className="absolute top-4 left-4 flex flex-col gap-2">
                                {isOutOfStock ? (
                                    <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-lg shadow-lg">ESGOTADO</span>
                                ) : isLowStock ? (
                                    <span className="px-3 py-1 bg-yellow-400 text-yellow-950 text-xs font-bold rounded-lg shadow-lg">BAIXO ESTOQUE</span>
                                ) : (
                                    <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg">DISPONÍVEL</span>
                                )}
                                <span className="px-3 py-1 bg-slate-800 text-slate-100 text-xs font-mono rounded-lg shadow-lg">COD: {product.id}</span>
                            </div>
                        </div>

                        {/* Right Side: Details & Quantities */}
                        <div className="md:w-1/2 p-6 sm:p-8 flex flex-col overflow-y-auto">
                            <div className="flex justify-between items-start mb-2 group">
                                {product.brand && (
                                    <span className="px-3 py-1 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-widest rounded-md mb-2">
                                        {product.brand}
                                    </span>
                                )}
                                <button
                                    onClick={() => setIsSpotlightOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                >
                                    <AlertCircle className="w-6 h-6 rotate-45" />
                                </button>
                            </div>

                            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight mb-6">
                                {product.name}
                            </h2>

                            {/* Quantities Section - Highlighted */}
                            <div className="grid grid-cols-1 gap-4 mb-8">
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-brand-500 rounded-lg">
                                                <Box className="w-5 h-5 text-white" />
                                            </div>
                                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Estoque Total</span>
                                        </div>
                                        <span className="text-4xl font-black text-slate-900 dark:text-white">{product.total}</span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="flex flex-col items-center p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                                            <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase">Ceará</span>
                                            <span className="text-lg font-bold text-slate-900 dark:text-white">{product.stock_ce}</span>
                                        </div>
                                        <div className="flex flex-col items-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">S. Catarina</span>
                                            <span className="text-lg font-bold text-slate-900 dark:text-white">{product.stock_sc}</span>
                                        </div>
                                        <div className="flex flex-col items-center p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">S. Paulo</span>
                                            <span className="text-lg font-bold text-slate-900 dark:text-white">{product.stock_sp}</span>
                                        </div>
                                    </div>

                                    {product.reserved > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm">
                                            <span className="text-orange-600 dark:text-orange-400 font-bold uppercase text-xs">Reservado: {product.reserved} un</span>
                                            <span className="text-green-600 dark:text-green-400 font-bold uppercase text-xs">Disponível: {availableStock} un</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Additional Info */}
                            <div className="space-y-4">
                                {reservations.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            Reservas Ativas
                                        </h4>
                                        <div className="space-y-2">
                                            {reservations.map(reservation => (
                                                <div key={reservation.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-orange-900 dark:text-orange-200 leading-none">{reservation.reservedByName || reservation.reservedBy}</span>
                                                        <span className="text-[11px] font-medium text-orange-600/80">{reservation.branch} • {reservation.quantity} un</span>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-orange-400 whitespace-nowrap bg-white dark:bg-slate-900 px-2 py-1 rounded-md shadow-sm">
                                                        {new Date(reservation.reservedAt).toLocaleDateString('pt-BR')}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {importInfo && importInfo.quantity > 0 && (
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                                <Package className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <span className="text-sm font-bold text-blue-900 dark:text-blue-200">Em Importação</span>
                                        </div>
                                        <span className="text-sm font-black text-blue-600">{importInfo.quantity} un</span>
                                    </div>
                                )}

                                {(importInfo?.expectedDate || product.expectedRestockDate) && (
                                    <div className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-900/30 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                                <Calendar className="w-4 h-4 text-purple-600" />
                                            </div>
                                            <span className="text-sm font-bold text-purple-900 dark:text-purple-200">Previsão de Reposição</span>
                                        </div>
                                        <span className="text-sm font-black text-purple-600">
                                            {new Date(importInfo?.expectedDate || product.expectedRestockDate!).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                )}

                                {product.observations && (
                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30">
                                        <div className="flex items-center gap-2 mb-2 italic">
                                            <FileText className="w-4 h-4 text-amber-600" />
                                            <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-widest">Observações</span>
                                        </div>
                                        <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{product.observations}</p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleShare}
                                className="mt-8 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                            >
                                <Share2 className="w-5 h-5" />
                                Compartilhar Disponibilidade
                            </button>

                            <p className="text-center text-[10px] text-slate-400 mt-4 uppercase tracking-[0.2em] font-bold">
                                Clique fora para fechar
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
