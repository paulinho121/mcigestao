import { useState } from 'react';
import { Product } from '../types';
import { MapPin, Box, AlertCircle, Package, Calendar, FileText } from 'lucide-react';
import { clsx } from 'clsx';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLowStock = product.total < 5 && product.total > 0;
  const isOutOfStock = product.total === 0;

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col h-full group cursor-pointer ${isExpanded ? 'ring-2 ring-brand-500 ring-offset-2' : ''}`}
    >
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start mb-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
            COD: {product.id}
          </span>
          {product.brand && (
            <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider">
              {product.brand}
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-slate-900 leading-snug mb-4 group-hover:text-brand-600 transition-colors">
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

      <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-xs text-slate-500 uppercase font-semibold">Estoque Total</span>
          <div className="flex items-center">
            <Box className="w-4 h-4 mr-1 text-brand-600" />
            <span className="text-xl font-bold text-slate-900">{product.total}</span>
          </div>
        </div>

        <div className="text-right">
          {isOutOfStock ? (
            <span className="inline-block px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-md">
              Sem Estoque
            </span>
          ) : isLowStock ? (
            <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-md">
              Estoque Baixo
            </span>
          ) : (
            <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-md">
              Disponível
            </span>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="bg-slate-50 px-5 pb-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-2 pt-2">
            {product.reserved > 0 && (
              <div className="text-sm text-orange-600 font-medium flex items-center justify-between p-2 bg-orange-50 rounded-lg border border-orange-100">
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  <span>Reservado</span>
                </div>
                <span>{product.reserved} un</span>
              </div>
            )}

            {product.importQuantity && product.importQuantity > 0 && (
              <div className="text-sm text-blue-600 font-medium flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center">
                  <Package className="w-4 h-4 mr-2" />
                  <span>Em Importação</span>
                </div>
                <span>{product.importQuantity} un</span>
              </div>
            )}

            {product.expectedRestockDate && (
              <div className="text-sm text-purple-600 font-medium flex items-center justify-between p-2 bg-purple-50 rounded-lg border border-purple-100">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Previsão Reposição</span>
                </div>
                <span>{new Date(product.expectedRestockDate).toLocaleDateString('pt-BR')}</span>
              </div>
            )}

            {product.observations && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-amber-900 uppercase block mb-1">Observações</span>
                    <p className="text-sm text-amber-800 leading-relaxed">{product.observations}</p>
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