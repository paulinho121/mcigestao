import React, { useState, useEffect } from 'react';
import { Search, Save, Wrench, AlertCircle, Package as PackageIcon, FileText } from 'lucide-react';
import { Product } from '../types';
import { inventoryService } from '../services/inventoryService';

interface MaintenanceProps {
    userEmail: string;
}

interface StockAdjustment {
    ce: number;
    sc: number;
    sp: number;
}

interface ProductEdit {
    product: Product;
    adjustments: StockAdjustment;
    observations: string;
}

export const Maintenance: React.FC<MaintenanceProps> = ({ userEmail }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [editedProducts, setEditedProducts] = useState<Map<string, ProductEdit>>(new Map());

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

    const getProductEdit = (product: Product): ProductEdit => {
        return editedProducts.get(product.id) || {
            product,
            adjustments: { ce: 0, sc: 0, sp: 0 },
            observations: product.observations || ''
        };
    };

    const handleAdjustmentChange = (productId: string, branch: 'ce' | 'sc' | 'sp', value: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const currentEdit = getProductEdit(product);
        const adjustment = value === '' ? 0 : parseInt(value) || 0;

        const updatedEdit: ProductEdit = {
            ...currentEdit,
            adjustments: {
                ...currentEdit.adjustments,
                [branch]: adjustment
            }
        };

        setEditedProducts(prev => new Map(prev).set(productId, updatedEdit));
    };

    const handleObservationsChange = (productId: string, value: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const currentEdit = getProductEdit(product);
        const updatedEdit: ProductEdit = {
            ...currentEdit,
            observations: value.slice(0, 500) // Limit to 500 characters
        };

        setEditedProducts(prev => new Map(prev).set(productId, updatedEdit));
    };

    const calculateNewStock = (current: number, adjustment: number): number => {
        const newValue = current + adjustment;
        return Math.max(0, newValue); // Don't allow negative stock
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
            const edits = Array.from(editedProducts.values());

            for (const edit of edits) {
                // Apply stock adjustments
                if (edit.adjustments.ce !== 0 || edit.adjustments.sc !== 0 || edit.adjustments.sp !== 0) {
                    await inventoryService.adjustStock(edit.product.id, edit.adjustments);
                }

                // Update observations
                if (edit.observations !== (edit.product.observations || '')) {
                    await inventoryService.updateObservations(edit.product.id, edit.observations);
                }
            }

            setSuccess(`${editedProducts.size} produto(s) atualizado(s) com sucesso!`);
            setEditedProducts(new Map());

            // Reload to show updated data
            await loadProducts();
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar alterações');
        } finally {
            setSaving(false);
        }
    };

    const isEdited = (productId: string): boolean => {
        const edit = editedProducts.get(productId);
        if (!edit) return false;

        return edit.adjustments.ce !== 0 ||
            edit.adjustments.sc !== 0 ||
            edit.adjustments.sp !== 0 ||
            edit.observations !== (edit.product.observations || '');
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Wrench className="w-8 h-8 text-brand-600" />
                        <h1 className="text-3xl font-bold text-slate-900">Manutenção de Estoque</h1>
                    </div>
                    <p className="text-slate-600">Ajuste quantidades de estoque e adicione observações aos produtos</p>
                </div>

                {/* Success/Error Messages */}
                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center">
                        <Save className="w-5 h-5 mr-2" /> {success}
                    </div>
                )}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" /> {error}
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
                    ) : products.length === 0 ? (
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
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700 bg-green-50">CE Atual</th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700 bg-green-50">Ajuste CE</th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700 bg-blue-50">SC Atual</th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700 bg-blue-50">Ajuste SC</th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700 bg-red-50">SP Atual</th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700 bg-red-50">Ajuste SP</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700 bg-purple-50">Observações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((product) => {
                                        const edit = getProductEdit(product);
                                        const edited = isEdited(product.id);

                                        return (
                                            <tr
                                                key={product.id}
                                                className={`border-b border-slate-100 hover:bg-slate-50 ${edited ? 'bg-yellow-50' : ''
                                                    }`}
                                            >
                                                <td className="px-4 py-3 font-mono text-slate-900">{product.id}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-slate-900">{product.name}</div>
                                                    <div className="text-sm text-slate-500">{product.brand}</div>
                                                </td>

                                                {/* Ceará */}
                                                <td className="px-4 py-3 text-center bg-green-50/50">
                                                    <span className="font-semibold text-slate-900">{product.stock_ce}</span>
                                                </td>
                                                <td className="px-4 py-3 bg-green-50/50">
                                                    <input
                                                        type="number"
                                                        value={edit.adjustments.ce || ''}
                                                        onChange={(e) => handleAdjustmentChange(product.id, 'ce', e.target.value)}
                                                        placeholder="0"
                                                        className="w-20 px-2 py-1 border border-slate-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                                                    />
                                                    {edit.adjustments.ce !== 0 && (
                                                        <div className="text-xs mt-1 font-medium text-green-700">
                                                            → {calculateNewStock(product.stock_ce, edit.adjustments.ce)}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Santa Catarina */}
                                                <td className="px-4 py-3 text-center bg-blue-50/50">
                                                    <span className="font-semibold text-slate-900">{product.stock_sc}</span>
                                                </td>
                                                <td className="px-4 py-3 bg-blue-50/50">
                                                    <input
                                                        type="number"
                                                        value={edit.adjustments.sc || ''}
                                                        onChange={(e) => handleAdjustmentChange(product.id, 'sc', e.target.value)}
                                                        placeholder="0"
                                                        className="w-20 px-2 py-1 border border-slate-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                                                    />
                                                    {edit.adjustments.sc !== 0 && (
                                                        <div className="text-xs mt-1 font-medium text-blue-700">
                                                            → {calculateNewStock(product.stock_sc, edit.adjustments.sc)}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* São Paulo */}
                                                <td className="px-4 py-3 text-center bg-red-50/50">
                                                    <span className="font-semibold text-slate-900">{product.stock_sp}</span>
                                                </td>
                                                <td className="px-4 py-3 bg-red-50/50">
                                                    <input
                                                        type="number"
                                                        value={edit.adjustments.sp || ''}
                                                        onChange={(e) => handleAdjustmentChange(product.id, 'sp', e.target.value)}
                                                        placeholder="0"
                                                        className="w-20 px-2 py-1 border border-slate-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                                                    />
                                                    {edit.adjustments.sp !== 0 && (
                                                        <div className="text-xs mt-1 font-medium text-red-700">
                                                            → {calculateNewStock(product.stock_sp, edit.adjustments.sp)}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Observations */}
                                                <td className="px-4 py-3 bg-purple-50/50">
                                                    <textarea
                                                        value={edit.observations}
                                                        onChange={(e) => handleObservationsChange(product.id, e.target.value)}
                                                        placeholder="Adicionar observação..."
                                                        maxLength={500}
                                                        rows={2}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                                                    />
                                                    <div className="text-xs text-slate-500 mt-1">
                                                        {edit.observations.length}/500
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
                    <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Informações
                    </h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• <strong>Ajuste</strong>: Use valores positivos para adicionar ou negativos para remover estoque</li>
                        <li>• <strong>Observações</strong>: Máximo de 500 caracteres, aparecerão nos cards de produtos</li>
                        <li>• <strong>Destaque</strong>: Linhas editadas ficam amarelas antes de salvar</li>
                        <li>• <strong>Validação</strong>: Estoque não pode ficar negativo</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
