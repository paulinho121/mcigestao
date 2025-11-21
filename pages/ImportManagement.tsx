import React, { useState, useEffect } from 'react';
import { Search, Save, Calendar, Package as PackageIcon } from 'lucide-react';
import { Product } from '../types';
import { inventoryService } from '../services/inventoryService';

interface ImportManagementProps {
    userEmail: string;
}

export const ImportManagement: React.FC<ImportManagementProps> = ({ userEmail }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [editedProducts, setEditedProducts] = useState<Map<string, Product>>(new Map());

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await inventoryService.getAllProducts(100);
            setProducts(data);
        } catch (err) {
            setError('Erro ao carregar produtos');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            loadProducts();
            return;
        }

        setLoading(true);
        try {
            const results = await inventoryService.searchProducts(searchQuery);
            setProducts(results);
        } catch (err) {
            setError('Erro ao buscar produtos');
        } finally {
            setLoading(false);
        }
    };

    const handleImportQuantityChange = (productId: string, value: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const quantity = value === '' ? undefined : parseInt(value) || 0;
        const updatedProduct = { ...product, importQuantity: quantity };

        setEditedProducts(prev => new Map(prev).set(productId, updatedProduct));
    };

    const handleDateChange = (productId: string, value: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const updatedProduct = { ...product, expectedRestockDate: value || undefined };

        setEditedProducts(prev => new Map(prev).set(productId, updatedProduct));
    };

    const handleSave = async () => {
        if (editedProducts.size === 0) {
            setError('Nenhuma alteração para salvar');
            return;
        }

        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const productsToUpdate = Array.from(editedProducts.values());
            await inventoryService.updateImportInfo(productsToUpdate);

            setSuccess(`${productsToUpdate.length} produto(s) atualizado(s) com sucesso!`);
            setEditedProducts(new Map());

            // Reload to show updated data
            await loadProducts();
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar alterações');
        } finally {
            setSaving(false);
        }
    };

    const getDisplayProduct = (product: Product): Product => {
        return editedProducts.get(product.id) || product;
    };

    const filteredProducts = products;

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestão de Importação</h1>
                    <p className="text-slate-600">Gerencie quantidades em importação e datas previstas de reposição</p>
                </div>

                {/* Success/Error Messages */}
                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center">
                        <Save className="w-5 h-5 mr-2" /> {success}
                    </div>
                )}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                        {error}
                    </div>
                )}

                {/* Search Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Buscar por código ou nome do produto..."
                                className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            className="px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-semibold"
                        >
                            Buscar
                        </button>
                    </div>
                </div>

                {/* Save Button */}
                {editedProducts.size > 0 && (
                    <div className="mb-6 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Salvar Alterações ({editedProducts.size})
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Products Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-600">Carregando produtos...</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="p-12 text-center">
                            <PackageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-600">Nenhum produto encontrado</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-100 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Código</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Produto</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Marca</th>
                                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Total</th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700 bg-blue-50">
                                            Em Importação
                                        </th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700 bg-blue-50">
                                            Data Prevista
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map((product) => {
                                        const displayProduct = getDisplayProduct(product);
                                        const isEdited = editedProducts.has(product.id);

                                        return (
                                            <tr
                                                key={product.id}
                                                className={`border-b border-slate-100 hover:bg-slate-50 ${isEdited ? 'bg-yellow-50' : ''
                                                    }`}
                                            >
                                                <td className="px-4 py-3 font-mono text-slate-900">{product.id}</td>
                                                <td className="px-4 py-3 text-slate-900">{product.name}</td>
                                                <td className="px-4 py-3 text-slate-600">{product.brand}</td>
                                                <td className="px-4 py-3 text-right font-semibold text-slate-900">
                                                    {product.total}
                                                </td>
                                                <td className="px-4 py-3 bg-blue-50/50">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={displayProduct.importQuantity ?? ''}
                                                        onChange={(e) => handleImportQuantityChange(product.id, e.target.value)}
                                                        placeholder="0"
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 bg-blue-50/50">
                                                    <div className="relative">
                                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                                        <input
                                                            type="date"
                                                            value={displayProduct.expectedRestockDate ?? ''}
                                                            onChange={(e) => handleDateChange(product.id, e.target.value)}
                                                            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Info Box */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Informações</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• <strong>Em Importação</strong>: Quantidade de produtos em processo de importação</li>
                        <li>• <strong>Data Prevista</strong>: Data estimada para chegada dos produtos</li>
                        <li>• As alterações são destacadas em amarelo antes de salvar</li>
                        <li>• Clique em "Salvar Alterações" para confirmar as modificações</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
