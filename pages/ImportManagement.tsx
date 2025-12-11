import { useState, useEffect } from 'react';
import { Search, Save, Calendar, Package as PackageIcon, Trash2 } from 'lucide-react';
import { Product } from '../types';
import { inventoryService } from '../services/inventoryService';

interface ImportManagementProps {
}

export const ImportManagement: React.FC<ImportManagementProps> = () => {
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

    const handleRemoveFromImport = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const updatedProduct = {
            ...product,
            importQuantity: 0,
            expectedRestockDate: undefined
        };

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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 transition-colors">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Gestão de Importação</h1>
                    <p className="text-slate-600 dark:text-slate-400">Gerencie quantidades em importação e datas previstas de reposição</p>
                </div>

                {/* Success/Error Messages */}
                {success && (
                    <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 flex items-center transition-colors">
                        <Save className="w-5 h-5 mr-2" /> {success}
                    </div>
                )}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 transition-colors">
                        {error}
                    </div>
                )}

                {/* Search Bar */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6 transition-colors">
                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Buscar por código ou nome do produto..."
                                className="w-full pl-12 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 transition-colors"
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
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="w-12 h-12 border-4 border-brand-200 dark:border-brand-900 border-t-brand-600 dark:border-t-brand-500 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-600 dark:text-slate-400">Carregando produtos...</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="p-12 text-center">
                            <PackageIcon className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-600 dark:text-slate-400">Nenhum produto encontrado</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Código</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Produto</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Marca</th>
                                        <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Total</th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 bg-blue-50 dark:bg-blue-900/20">
                                            Em Importação
                                        </th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 bg-blue-50 dark:bg-blue-900/20">
                                            Data Prevista
                                        </th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 bg-blue-50 dark:bg-blue-900/20">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map((product) => {
                                        const displayProduct = getDisplayProduct(product);
                                        const isEdited = editedProducts.has(product.id);
                                        const hasImportData = (displayProduct.importQuantity && displayProduct.importQuantity > 0) || displayProduct.expectedRestockDate;

                                        return (
                                            <tr
                                                key={product.id}
                                                className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isEdited ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                                                    }`}
                                            >
                                                <td className="px-4 py-3 font-mono text-slate-900 dark:text-white">{product.id}</td>
                                                <td className="px-4 py-3 text-slate-900 dark:text-white">{product.name}</td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{product.brand}</td>
                                                <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                                                    {product.total}
                                                </td>
                                                <td className="px-4 py-3 bg-blue-50/50 dark:bg-blue-900/10">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={displayProduct.importQuantity ?? ''}
                                                        onChange={(e) => handleImportQuantityChange(product.id, e.target.value)}
                                                        placeholder="0"
                                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 bg-blue-50/50 dark:bg-blue-900/10">
                                                    <div className="relative">
                                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                                        <input
                                                            type="date"
                                                            value={displayProduct.expectedRestockDate ?? ''}
                                                            onChange={(e) => handleDateChange(product.id, e.target.value)}
                                                            className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-slate-700 dark:text-white pointer-events-auto cursor-pointer"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 bg-blue-50/50 dark:bg-blue-900/10 text-center">
                                                    {hasImportData && (
                                                        <button
                                                            onClick={() => handleRemoveFromImport(product.id)}
                                                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Remover da importação"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    )}
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
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl transition-colors">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">ℹ️ Informações</h3>
                    <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
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
