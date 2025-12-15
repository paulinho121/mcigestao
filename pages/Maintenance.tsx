import { useState, useEffect } from 'react';
import { Search, Save, Wrench, AlertCircle, Package as PackageIcon, FileText, Download, Printer, Mail, CheckSquare, Square, List, LayoutGrid } from 'lucide-react';
import { Product } from '../types';
import { inventoryService } from '../services/inventoryService';
import { backupService } from '../services/backupService';

interface MaintenanceProps {
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

export const Maintenance: React.FC<MaintenanceProps> = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [editedProducts, setEditedProducts] = useState<Map<string, ProductEdit>>(new Map());

    // Reporting & Tabs State
    const [activeTab, setActiveTab] = useState<'stock' | 'report'>('stock');
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [productCache, setProductCache] = useState<Map<string, Product>>(new Map());

    useEffect(() => {
        loadProducts();
    }, []);

    // Update cache whenever products change
    useEffect(() => {
        if (products.length > 0) {
            setProductCache(prev => {
                const newCache = new Map(prev);
                products.forEach(p => newCache.set(p.id, p));
                return newCache;
            });
        }
    }, [products]);

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

    const handleBackup = async () => {
        setLoading(true);
        try {
            // Fetch all products for backup (ensure we get everything)
            const allProducts = await inventoryService.getAllProducts(10000); // High limit to get all
            backupService.exportProductsToCSV(allProducts);
            setSuccess('Backup gerado com sucesso!');
        } catch (err) {
            setError('Erro ao gerar backup');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Reporting Handlers
    const toggleProductSelection = (productId: string) => {
        const newSelected = new Set(selectedProducts);
        if (newSelected.has(productId)) {
            newSelected.delete(productId);
        } else {
            newSelected.add(productId);
        }
        setSelectedProducts(newSelected);
        setSelectAll(newSelected.size === products.length);
    };

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedProducts(new Set());
        } else {
            const allIds = new Set(products.map(p => p.id));
            setSelectedProducts(allIds);
        }
        setSelectAll(!selectAll);
    };

    const handleCSV = () => {
        if (selectedProducts.size === 0) {
            setError('Selecione pelo menos um produto para baixar o CSV');
            return;
        }

        const productsToExport = Array.from(selectedProducts)
            .map(id => productCache.get(id))
            .filter((p): p is Product => p !== undefined);

        const headers = ['Código', 'Produto', 'Marca', 'Estoque CE', 'Estoque SC', 'Estoque SP', 'Observações'];
        const csvContent = [
            headers.join(','),
            ...productsToExport.map(p => [
                p.id,
                `"${p.name.replace(/"/g, '""')}"`, // Escape quotes
                p.brand,
                p.stock_ce,
                p.stock_sc,
                p.stock_sp,
                `"${(p.observations || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio_estoque_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        if (selectedProducts.size === 0) {
            setError('Selecione pelo menos um produto para imprimir');
            return;
        }

        // Use cache to get all selected products, even if not currently visible
        const productsToPrint = Array.from(selectedProducts)
            .map(id => productCache.get(id))
            .filter((p): p is Product => p !== undefined);

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            setError('Permita pop-ups para imprimir');
            return;
        }

        const date = new Date().toLocaleDateString('pt-BR');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Relatório de Estoque - ${date}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        .header { margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                        .total { margin-top: 20px; font-weight: bold; text-align: right; }
                        @media print {
                            body { -webkit-print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Relatório de Estoque</h1>
                        <p>Data: ${date}</p>
                        <p>Total de itens: ${productsToPrint.length}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Produto</th>
                                <th>Marca</th>
                                <th style="text-align: center">Estoque CE</th>
                                <th style="text-align: center">Estoque SC</th>
                                <th style="text-align: center">Estoque SP</th>
                                <th>Observações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${productsToPrint.map(p => `
                                <tr>
                                    <td>${p.id}</td>
                                    <td>${p.name}</td>
                                    <td>${p.brand}</td>
                                    <td style="text-align: center">${p.stock_ce}</td>
                                    <td style="text-align: center">${p.stock_sc}</td>
                                    <td style="text-align: center">${p.stock_sp}</td>
                                    <td>${p.observations || ''}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="total">
                        Gerado por StockVision
                    </div>
                    <script>
                        window.onload = function() { window.print(); }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleEmail = () => {
        if (selectedProducts.size === 0) {
            setError('Selecione pelo menos um produto para enviar');
            return;
        }

        // Use cache to get all selected products, even if not currently visible
        const productsToSend = Array.from(selectedProducts)
            .map(id => productCache.get(id))
            .filter((p): p is Product => p !== undefined);

        const date = new Date().toLocaleDateString('pt-BR');

        let body = `Relatório de Estoque - ${date}\n\n`;
        body += `Total de itens: ${productsToSend.length}\n\n`;

        productsToSend.forEach(p => {
            body += `[${p.id}] ${p.name} (${p.brand})\n`;
            body += `Estoque: CE: ${p.stock_ce} | SC: ${p.stock_sc} | SP: ${p.stock_sp}\n`;
            if (p.observations) body += `Obs: ${p.observations}\n`;
            body += '----------------------------------------\n';
        });

        const subject = encodeURIComponent(`Relatório de Estoque - ${date}`);
        const mailtoLink = `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;

        window.location.href = mailtoLink;
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 transition-colors">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Wrench className="w-8 h-8 text-brand-600 dark:text-brand-500" />
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Manutenção de Estoque</h1>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('stock')}
                        className={`pb-3 px-2 flex items-center gap-2 font-medium transition-colors relative ${activeTab === 'stock'
                            ? 'text-brand-600 dark:text-brand-400'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                    >
                        <LayoutGrid className="w-5 h-5" />
                        Ajuste de Estoque
                        {activeTab === 'stock' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-600 dark:bg-brand-500 rounded-t-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('report')}
                        className={`pb-3 px-2 flex items-center gap-2 font-medium transition-colors relative ${activeTab === 'report'
                            ? 'text-brand-600 dark:text-brand-400'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                    >
                        <List className="w-5 h-5" />
                        Relatórios
                        {activeTab === 'report' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-600 dark:bg-brand-500 rounded-t-full" />
                        )}
                    </button>
                </div>

                {/* Success/Error Messages */}
                {success && (
                    <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 flex items-center transition-colors">
                        <Save className="w-5 h-5 mr-2" /> {success}
                    </div>
                )}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 flex items-center transition-colors">
                        <AlertCircle className="w-5 h-5 mr-2" /> {error}
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

                {/* Actions Bar */}
                <div className="flex justify-between items-center mb-6">
                    {activeTab === 'stock' ? (
                        <>
                            <button
                                onClick={handleBackup}
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                title="Exportar todos os produtos para CSV"
                            >
                                <Download className="w-5 h-5" />
                                Backup de Produtos
                            </button>

                            {editedProducts.size > 0 && (
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
                            )}
                        </>
                    ) : (
                        <div className="flex gap-3 w-full justify-end">
                            <div className="mr-auto flex items-center text-slate-600 dark:text-slate-400">
                                <span className="font-semibold">{selectedProducts.size}</span>
                                <span className="ml-1">produto(s) selecionado(s)</span>
                                {selectedProducts.size > 0 && products.length !== selectedProducts.size && (
                                    <span className="ml-2 text-xs text-slate-500">
                                        (Alguns itens selecionados podem não estar visíveis na busca atual)
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={handleEmail}
                                disabled={selectedProducts.size === 0}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                <Mail className="w-5 h-5" />
                                Enviar Email
                            </button>
                            <button
                                onClick={handleCSV}
                                disabled={selectedProducts.size === 0}
                                className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                <Download className="w-5 h-5" />
                                Baixar CSV
                            </button>
                            <button
                                onClick={handlePrint}
                                disabled={selectedProducts.size === 0}
                                className="px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                <Printer className="w-5 h-5" />
                                Imprimir Lista
                            </button>
                        </div>
                    )}
                </div>

                {/* Products Table */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="w-12 h-12 border-4 border-brand-200 dark:border-brand-900 border-t-brand-600 dark:border-t-brand-500 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-600 dark:text-slate-400">Carregando produtos...</p>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="p-12 text-center">
                            <PackageIcon className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-600 dark:text-slate-400">Nenhum produto encontrado</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        {activeTab === 'report' && (
                                            <th className="px-4 py-3 text-center w-12">
                                                <button
                                                    onClick={toggleSelectAll}
                                                    className="text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
                                                >
                                                    {selectAll ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                                </button>
                                            </th>
                                        )}
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Código</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Produto</th>

                                        {activeTab === 'stock' ? (
                                            <>
                                                <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 bg-green-50 dark:bg-green-900/20">CE Atual</th>
                                                <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 bg-green-50 dark:bg-green-900/20">Ajuste CE</th>
                                                <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 bg-blue-50 dark:bg-blue-900/20">SC Atual</th>
                                                <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 bg-blue-50 dark:bg-blue-900/20">Ajuste SC</th>
                                                <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 bg-red-50 dark:bg-red-900/20">SP Atual</th>
                                                <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 bg-red-50 dark:bg-red-900/20">Ajuste SP</th>
                                                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 bg-purple-50 dark:bg-purple-900/20">Observações</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Estoque CE</th>
                                                <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Estoque SC</th>
                                                <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Estoque SP</th>
                                                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Observações</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((product) => {
                                        const edit = getProductEdit(product);
                                        const edited = isEdited(product.id);
                                        const isSelected = selectedProducts.has(product.id);

                                        return (
                                            <tr
                                                key={product.id}
                                                className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${activeTab === 'stock' && edited ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                                                    } ${activeTab === 'report' && isSelected ? 'bg-brand-50 dark:bg-brand-900/20' : ''
                                                    }`}
                                            >
                                                {activeTab === 'report' && (
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => toggleProductSelection(product.id)}
                                                            className={`transition-colors ${isSelected
                                                                ? 'text-brand-600 dark:text-brand-400'
                                                                : 'text-slate-300 hover:text-slate-400 dark:text-slate-600'
                                                                }`}
                                                        >
                                                            {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                                        </button>
                                                    </td>
                                                )}

                                                <td className="px-4 py-3 font-mono text-slate-900 dark:text-white">{product.id}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-slate-900 dark:text-white">{product.name}</div>
                                                    <div className="text-sm text-slate-500">{product.brand}</div>
                                                </td>

                                                {activeTab === 'stock' ? (
                                                    // Stock Adjustment Columns
                                                    <>
                                                        {/* Ceará */}
                                                        <td className="px-4 py-3 text-center bg-green-50/50 dark:bg-green-900/10">
                                                            <span className="font-semibold text-slate-900 dark:text-white">{product.stock_ce}</span>
                                                        </td>
                                                        <td className="px-4 py-3 bg-green-50/50 dark:bg-green-900/10">
                                                            <input
                                                                type="number"
                                                                value={edit.adjustments.ce === 0 ? '' : edit.adjustments.ce}
                                                                onChange={(e) => handleAdjustmentChange(product.id, 'ce', e.target.value)}
                                                                placeholder="0"
                                                                className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-center focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-700 dark:text-white"
                                                            />
                                                            {edit.adjustments.ce !== 0 && (
                                                                <div className="text-xs mt-1 font-medium text-green-700">
                                                                    → {calculateNewStock(product.stock_ce, edit.adjustments.ce)}
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Santa Catarina */}
                                                        <td className="px-4 py-3 text-center bg-blue-50/50 dark:bg-blue-900/10">
                                                            <span className="font-semibold text-slate-900 dark:text-white">{product.stock_sc}</span>
                                                        </td>
                                                        <td className="px-4 py-3 bg-blue-50/50 dark:bg-blue-900/10">
                                                            <input
                                                                type="number"
                                                                value={edit.adjustments.sc === 0 ? '' : edit.adjustments.sc}
                                                                onChange={(e) => handleAdjustmentChange(product.id, 'sc', e.target.value)}
                                                                placeholder="0"
                                                                className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-center focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-700 dark:text-white"
                                                            />
                                                            {edit.adjustments.sc !== 0 && (
                                                                <div className="text-xs mt-1 font-medium text-blue-700">
                                                                    → {calculateNewStock(product.stock_sc, edit.adjustments.sc)}
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* São Paulo */}
                                                        <td className="px-4 py-3 text-center bg-red-50/50 dark:bg-red-900/10">
                                                            <span className="font-semibold text-slate-900 dark:text-white">{product.stock_sp}</span>
                                                        </td>
                                                        <td className="px-4 py-3 bg-red-50/50 dark:bg-red-900/10">
                                                            <input
                                                                type="number"
                                                                value={edit.adjustments.sp === 0 ? '' : edit.adjustments.sp}
                                                                onChange={(e) => handleAdjustmentChange(product.id, 'sp', e.target.value)}
                                                                placeholder="0"
                                                                className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-center focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-700 dark:text-white"
                                                            />
                                                            {edit.adjustments.sp !== 0 && (
                                                                <div className="text-xs mt-1 font-medium text-red-700">
                                                                    → {calculateNewStock(product.stock_sp, edit.adjustments.sp)}
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Observations */}
                                                        <td className="px-4 py-3 bg-purple-50/50 dark:bg-purple-900/10">
                                                            <textarea
                                                                value={edit.observations}
                                                                onChange={(e) => handleObservationsChange(product.id, e.target.value)}
                                                                placeholder="Adicionar observação..."
                                                                maxLength={500}
                                                                rows={2}
                                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
                                                            />
                                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                                {edit.observations.length}/500
                                                            </div>
                                                        </td>
                                                    </>
                                                ) : (
                                                    // Report Columns (Read Only)
                                                    <>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="font-semibold text-slate-900 dark:text-white">{product.stock_ce}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="font-semibold text-slate-900 dark:text-white">{product.stock_sc}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="font-semibold text-slate-900 dark:text-white">{product.stock_sp}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                                            {product.observations || '-'}
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Info Box */}
                {activeTab === 'stock' ? (
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl transition-colors">
                        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Informações
                        </h3>
                        <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                            <li>• <strong>Ajuste</strong>: Use valores positivos para adicionar ou negativos para remover estoque</li>
                            <li>• <strong>Observações</strong>: Máximo de 500 caracteres, aparecerão nos cards de produtos</li>
                            <li>• <strong>Destaque</strong>: Linhas editadas ficam amarelas antes de salvar</li>
                            <li>• <strong>Validação</strong>: Estoque não pode ficar negativo</li>
                        </ul>
                    </div>
                ) : (
                    <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl transition-colors">
                        <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Instruções de Relatório
                        </h3>
                        <ul className="text-sm text-purple-700 dark:text-purple-400 space-y-1">
                            <li>• <strong>Seleção</strong>: Marque os produtos que deseja incluir no relatório</li>
                            <li>• <strong>Busca</strong>: Use a barra de busca para filtrar produtos específicos</li>
                            <li>• <strong>Exportação</strong>: Use os botões acima para imprimir ou enviar por email</li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};
