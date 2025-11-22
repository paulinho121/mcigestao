import { useState, useEffect } from 'react';
import { Calendar, Package, Ship } from 'lucide-react';
import { Product } from '../types';
import { inventoryService } from '../services/inventoryService';

export const InImport: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            // Fetch all products to filter client-side
            const allProducts = await inventoryService.getAllProducts(1000);

            // Filter for products that are in import (quantity > 0 or has date)
            const inImport = allProducts.filter(p =>
                (p.importQuantity && p.importQuantity > 0) ||
                p.expectedRestockDate
            );

            setProducts(inImport);
        } catch (error) {
            console.error("Failed to fetch import data", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <Ship className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">Em Importação</h1>
                            <p className="text-slate-600">Acompanhe os produtos que estão chegando ao estoque</p>
                        </div>
                    </div>
                </div>

                {/* Products Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-600">Carregando dados de importação...</p>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="p-12 text-center">
                            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-600">
                                Nenhum produto em importação no momento
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-semibold text-slate-700">Produto</th>
                                        <th className="px-6 py-4 text-center font-semibold text-slate-700">Marca</th>
                                        <th className="px-6 py-4 text-center font-semibold text-slate-700">Qtd. Chegando</th>
                                        <th className="px-6 py-4 text-center font-semibold text-slate-700">Previsão</th>
                                        <th className="px-6 py-4 text-center font-semibold text-slate-700">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {products.map((product) => (
                                        <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div>
                                                        <div className="font-bold text-slate-900">{product.name}</div>
                                                        <div className="text-sm font-mono text-slate-500">Ref: {product.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                                    {product.brand}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-bold text-blue-600 text-lg">
                                                    {product.importQuantity || 0}
                                                </span>
                                                <span className="text-xs text-slate-400 ml-1">unid.</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {product.expectedRestockDate ? (
                                                    <div className="flex items-center justify-center text-slate-700 gap-2">
                                                        <Calendar className="w-4 h-4 text-slate-400" />
                                                        <span>
                                                            {new Date(product.expectedRestockDate).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-sm italic">Não informada</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                    <Ship className="w-3 h-3 mr-1.5" />
                                                    Em Trânsito
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
