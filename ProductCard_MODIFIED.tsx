import { useState, useEffect } from 'react';
import { Product, Reservation } from '../types';
import { MapPin, Box, AlertCircle, Package, Calendar, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { inventoryService } from '../services/inventoryService';

interface ProductCardProps {
    product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const isLowStock = product.total < 5 && product.total > 0;
    const isOutOfStock = product.total === 0;

    // Fetch reservations when card is expanded
    useEffect(() => {
        if (isExpanded && product.reserved > 0) {
            inventoryService.getReservationsByProduct(product.id)
                .then(setReservations)
                .catch(console.error);
        }
    }, [isExpanded, product.id, product.reserved]);

    return (
        <div
            onClick={() => setIsExpanded(!isExpanded)}
            className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col h-full group cursor-pointer ${isExpanded ? 'ring-2 ring-brand-500 ring-offset-2' : ''}`}
        >
            <div className="p-4 sm:p-5 flex-grow">
                <div className="flex justify-between items-start mb-3 gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 whitespace-nowrap">
                        COD: {product.id}
                    </span>
                    {product.brand && (
                        <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider truncate max-w-[120px] sm:max-w-none">
                            {product.brand}
                        </span>
                    )}
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug mb-4 group-hover:text-brand-600 transition-colors break-words line-clamp-2">
                    {product.name}
                </h3>

                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-green-700">
                            <MapPin className="w-4 h-4 mr-2 text-green-500" />
                            <span>Ceará</span>
                        </div>
                        <span className={clsx("font-mono font-medium", product.stock_ce > 0 ? "text-slate-900" : "text-slate-300")}>
                            {product.stock_ce}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-blue-700">
                            <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                            <span>Santa Catarina</span>
                        </div>
                        <span className={clsx("font-mono font-medium", product.stock_sc > 0 ? "text-slate-900" : "text-slate-300")}>
                            {product.stock_sc}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-red-700">
                            <MapPin className="w-4 h-4 mr-2 text-red-500" />
                            <span>São Paulo</span>
                        </div>
                        <span className={clsx("font-mono font-medium", product.stock_sp > 0 ? "text-slate-900" : "text-slate-300")}>
                            {product.stock_sp}
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 px-4 sm:px-5 py-3 border-t border-slate-100 flex justify-between items-center gap-3">
                <div className="flex flex-col">
                    <span className="text-xs text-slate-500 uppercase font-semibold">Estoque Total</span>
                    <div className="flex items-center">
                        <Box className="w-4 h-4 mr-1 text-brand-600" />
                        <span className="text-xl font-bold text-slate-900">{product.total}</span>
                    </div>
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

            {/* Expanded Details */}
            {isExpanded && (
                <div className="bg-slate-50 px-4 sm:px-5 pb-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2 pt-2">
                        {reservations.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-orange-900 uppercase flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    Reservas ({product.reserved} un)
                                </div>
                                {reservations.map(reservation => (
                                    <div key={reservation.id} className="text-xs sm:text-sm text-orange-600 font-medium flex items-center justify-between p-2 bg-orange-50 rounded-lg border border-orange-100 gap-2">
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className="font-semibold truncate">{reservation.reservedByName || reservation.reservedBy}</span>
                                            <span className="text-xs text-orange-500">{reservation.branch} • {reservation.quantity} un</span>
                                        </div>
                                        <span className="text-xs text-orange-400 whitespace-nowrap">
                                            {new Date(reservation.reservedAt).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {product.importQuantity && product.importQuantity > 0 && (
                            <div className="text-xs sm:text-sm text-blue-600 font-medium flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100 gap-2">
                                <div className="flex items-center flex-shrink-0">
                                    <Package className="w-4 h-4 mr-2" />
                                    <span>Em Importação</span>
                                </div>
                                <span className="whitespace-nowrap">{product.importQuantity} un</span>
                            </div>
                        )}

                        {product.expectedRestockDate && (
                            <div className="text-xs sm:text-sm text-purple-600 font-medium flex items-center justify-between p-2 bg-purple-50 rounded-lg border border-purple-100 gap-2">
                                <div className="flex items-center flex-shrink-0">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    <span>Previsão Reposição</span>
                                </div>
                                <span className="whitespace-nowrap text-xs sm:text-sm">{new Date(product.expectedRestockDate).toLocaleDateString('pt-BR')}</span>
                            </div>
                        )}

                        {product.observations && (
                            <div className="mt-2 p-2.5 sm:p-3 bg-amber-50 border border-amber-100 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <FileText className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-semibold text-amber-900 uppercase block mb-1">Observações</span>
                                        <p className="text-xs sm:text-sm text-amber-800 leading-relaxed break-words">{product.observations}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Hint to close */}
                        <div className="text-center pt-2">
                            <span className="text-xs text-slate-400">Clique para recolher</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Hint to open if has hidden details */}
            {!isExpanded && (product.reserved > 0 || (product.importQuantity && product.importQuantity > 0) || product.expectedRestockDate || product.observations) && (
                <div className="bg-slate-50 px-5 pb-2 text-center">
                    <span className="text-xs text-brand-600 font-medium hover:underline">Ver mais detalhes</span>
                </div>
            )}
        </div>
    );
};
