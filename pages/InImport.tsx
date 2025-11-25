import { useState, useEffect } from 'react';
import { Plus, Package, FolderOpen, Calendar, Trash2, Search, X } from 'lucide-react';
import { ImportProject, ImportItem, Product } from '../types';
import { inventoryService } from '../services/inventoryService';
import { isMasterUser } from '../config/masterUsers';
import { supabase } from '../lib/supabase';

type SubTab = 'view' | 'maintenance';

export const InImport: React.FC = () => {
    const [subTab, setSubTab] = useState<SubTab>('view');
    const [projects, setProjects] = useState<ImportProject[]>([]);
    const [selectedProject, setSelectedProject] = useState<ImportProject | null>(null);
    const [items, setItems] = useState<ImportItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingItems, setLoadingItems] = useState(false);
    const [isMaster, setIsMaster] = useState(false);

    // Maintenance tab states
    const [showNewProjectForm, setShowNewProjectForm] = useState(false);
    const [manufacturer, setManufacturer] = useState('');
    const [importNumber, setImportNumber] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [searching, setSearching] = useState(false);

    // Add Item Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedProductToAdd, setSelectedProductToAdd] = useState<Product | null>(null);
    const [addQuantity, setAddQuantity] = useState(1);
    const [addExpectedDate, setAddExpectedDate] = useState('');
    const [addObservation, setAddObservation] = useState('');

    useEffect(() => {
        checkMasterStatus();
        loadProjects();
    }, []);

    const checkMasterStatus = async () => {
        if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.email) {
                setIsMaster(isMasterUser(session.user.email));
            }
        } else {
            const storedUser = localStorage.getItem('stockvision_user');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                setIsMaster(isMasterUser(user.email));
            }
        }
    };

    const loadProjects = async () => {
        setLoading(true);
        try {
            const data = await inventoryService.getImportProjects();
            setProjects(data);
        } catch (error) {
            console.error('Failed to fetch projects', error);
        } finally {
            setLoading(false);
        }
    };

    const loadProjectItems = async (projectId: string) => {
        setLoadingItems(true);
        try {
            const data = await inventoryService.getImportItems(projectId);
            setItems(data);
        } catch (error) {
            console.error('Failed to fetch items', error);
        } finally {
            setLoadingItems(false);
        }
    };

    const handleCreateProject = async () => {
        if (!manufacturer.trim() || !importNumber.trim()) return;

        try {
            await inventoryService.createImportProject(manufacturer, importNumber);
            setManufacturer('');
            setImportNumber('');
            setShowNewProjectForm(false);
            await loadProjects();
        } catch (error) {
            console.error('Failed to create project', error);
        }
    };

    const handleSelectProject = (project: ImportProject) => {
        setSelectedProject(project);
        setItems([]); // Limpa os itens antes de carregar os novos
        loadProjectItems(project.id);
    };

    const handleTabChange = (newTab: SubTab) => {
        setSubTab(newTab);
        // Limpa a seleção ao mudar de aba
        setSelectedProject(null);
        setItems([]);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleSearchProducts = async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const results = await inventoryService.searchProducts(searchQuery);
            setSearchResults(results);
        } catch (error) {
            console.error('Failed to search products', error);
        } finally {
            setSearching(false);
        }
    };

    const handleOpenAddModal = (product: Product) => {
        setSelectedProductToAdd(product);
        setAddQuantity(1);
        setAddExpectedDate('');
        setAddObservation('');
        setShowAddModal(true);
    };

    const handleConfirmAddProduct = async () => {
        if (!selectedProject || !selectedProductToAdd) return;

        try {
            await inventoryService.addImportItem(
                selectedProject.id,
                selectedProductToAdd.id,
                addQuantity,
                addExpectedDate || undefined,
                addObservation || undefined
            );
            await loadProjectItems(selectedProject.id);
            setSearchQuery('');
            setSearchResults([]);
            setShowAddModal(false);
            setSelectedProductToAdd(null);
        } catch (error) {
            console.error('Failed to add product', error);
        }
    };

    const handleRemoveItem = async (itemId: string) => {
        if (!selectedProject) return;

        try {
            const success = await inventoryService.removeImportItem(itemId);
            if (success) {
                await loadProjectItems(selectedProject.id);
            }
        } catch (error) {
            console.error('Failed to remove item', error);
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!confirm('Tem certeza que deseja excluir este projeto? Todos os itens serão removidos.')) {
            return;
        }

        try {
            const success = await inventoryService.deleteImportProject(projectId);
            if (success) {
                // Clear selection if deleted project was selected
                if (selectedProject?.id === projectId) {
                    setSelectedProject(null);
                    setItems([]);
                }
                await loadProjects();
            }
        } catch (error) {
            console.error('Failed to delete project', error);
        }
    };


    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <Package className="w-8 h-8 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900">Em Importação</h1>
                                <p className="text-slate-600">Gerencie seus projetos de importação</p>
                            </div>
                        </div>
                    </div>

                    {/* Sub Tabs */}
                    <div className="flex gap-2 border-b border-slate-200">
                        <button
                            onClick={() => handleTabChange('view')}
                            className={`px-4 py-2 font-semibold transition-all ${subTab === 'view'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Visualização
                        </button>
                        {isMaster && (
                            <button
                                onClick={() => handleTabChange('maintenance')}
                                className={`px-4 py-2 font-semibold transition-all ${subTab === 'maintenance'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Manutenção
                            </button>
                        )}
                    </div>
                </div>

                {/* VIEW TAB */}
                {subTab === 'view' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Projects List */}
                        <div className="lg:col-span-4">
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                                <h3 className="font-semibold text-slate-900 mb-4">Projetos</h3>
                                {loading ? (
                                    <div className="text-center py-8">
                                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                                    </div>
                                ) : projects.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">
                                        <FolderOpen className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                        <p>Nenhum projeto criado</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {projects.map((project) => (
                                            <div
                                                key={project.id}
                                                onClick={() => handleSelectProject(project)}
                                                className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedProject?.id === project.id
                                                    ? 'bg-blue-50 border-2 border-blue-500'
                                                    : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                                                    }`}
                                            >
                                                <div className="font-semibold text-slate-900">{project.manufacturer}</div>
                                                <div className="text-sm text-slate-600">{project.importNumber}</div>
                                                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(project.createdAt).toLocaleDateString('pt-BR')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Project Items */}
                        <div className="lg:col-span-8">
                            {selectedProject && (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                                    <div className="p-4 border-b border-slate-200">
                                        <h3 className="font-semibold text-slate-900">
                                            {selectedProject.manufacturer} - {selectedProject.importNumber}
                                        </h3>
                                        <p className="text-sm text-slate-600">Itens em importação</p>
                                    </div>
                                    <div className="p-4">
                                        {loadingItems ? (
                                            <div className="text-center py-12">
                                                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                                                <p className="text-slate-500">Carregando itens...</p>
                                            </div>
                                        ) : items.length === 0 ? (
                                            <div className="text-center py-12 text-slate-500">
                                                <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                                                <p>Nenhum item neste projeto</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto -mx-4 sm:mx-0">
                                                <table className="w-full min-w-[640px]">
                                                    <thead className="bg-slate-50 border-b border-slate-200">
                                                        <tr>
                                                            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-slate-700 text-xs sm:text-sm">Código</th>
                                                            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-slate-700 text-xs sm:text-sm">Produto</th>
                                                            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-slate-700 text-xs sm:text-sm hidden sm:table-cell">Marca</th>
                                                            <th className="px-3 sm:px-4 py-3 text-center font-semibold text-slate-700 text-xs sm:text-sm">Qtd</th>
                                                            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-slate-700 text-xs sm:text-sm hidden md:table-cell">Previsão</th>
                                                            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-slate-700 text-xs sm:text-sm hidden lg:table-cell">Obs</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {items.map((item) => (
                                                            <tr key={item.id} className="hover:bg-slate-50">
                                                                <td className="px-3 sm:px-4 py-3 font-mono text-slate-900 text-xs sm:text-sm">{item.productId}</td>
                                                                <td className="px-3 sm:px-4 py-3 text-slate-900 text-xs sm:text-sm">{item.productName}</td>
                                                                <td className="px-3 sm:px-4 py-3 text-slate-600 text-xs sm:text-sm hidden sm:table-cell">{item.productBrand}</td>
                                                                <td className="px-3 sm:px-4 py-3 text-center">
                                                                    <span className="font-bold text-blue-600 text-xs sm:text-sm">{item.quantity}</span>
                                                                </td>
                                                                <td className="px-3 sm:px-4 py-3 text-slate-600 text-xs sm:text-sm hidden md:table-cell">
                                                                    {item.expectedDate ? new Date(item.expectedDate).toLocaleDateString('pt-BR') : '-'}
                                                                </td>
                                                                <td className="px-3 sm:px-4 py-3 text-slate-600 text-xs sm:text-sm truncate max-w-xs hidden lg:table-cell" title={item.observation}>
                                                                    {item.observation || '-'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* MAINTENANCE TAB */}
                {subTab === 'maintenance' && isMaster && (
                    <div className="space-y-6">
                        {/* New Project Form */}
                        {!showNewProjectForm ? (
                            <button
                                onClick={() => setShowNewProjectForm(true)}
                                className="w-full p-4 bg-white rounded-xl shadow-sm border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-slate-600 hover:text-blue-600"
                            >
                                <Plus className="w-5 h-5" />
                                <span className="font-semibold">Criar Novo Projeto de Importação</span>
                            </button>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold">Criar Novo Projeto de Importação</h3>
                                    <button
                                        onClick={() => setShowNewProjectForm(false)}
                                        className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-slate-500" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Fabricante</label>
                                        <input
                                            type="text"
                                            value={manufacturer}
                                            onChange={(e) => setManufacturer(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Nome do fabricante"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Número da Importação</label>
                                        <input
                                            type="text"
                                            value={importNumber}
                                            onChange={(e) => setImportNumber(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Ex: IMP-2024-001"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleCreateProject}
                                    disabled={!manufacturer.trim() || !importNumber.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Criar Projeto
                                </button>
                            </div>
                        )}

                        {/* Manage Projects */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Projects List */}
                            <div className="lg:col-span-4">
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                                    <h3 className="font-semibold text-slate-900 mb-4">Projetos</h3>
                                    {loading ? (
                                        <div className="text-center py-8">
                                            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                                        </div>
                                    ) : projects.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500">
                                            <FolderOpen className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                            <p className="text-sm">Nenhum projeto criado</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {projects.map((project) => (
                                                <div
                                                    key={project.id}
                                                    className={`p-3 rounded-lg transition-colors ${selectedProject?.id === project.id
                                                        ? 'bg-blue-50 border-2 border-blue-500'
                                                        : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                                                        }`}
                                                >
                                                    <div
                                                        onClick={() => handleSelectProject(project)}
                                                        className="cursor-pointer flex-1"
                                                    >
                                                        <div className="font-semibold text-slate-900">{project.manufacturer}</div>
                                                        <div className="text-sm text-slate-600">{project.importNumber}</div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteProject(project.id);
                                                        }}
                                                        className="mt-2 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors w-full flex items-center justify-center gap-2"
                                                        title="Excluir projeto"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        <span className="text-sm">Excluir Projeto</span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Add Products to Project */}
                            <div className="lg:col-span-8">
                                {selectedProject && (
                                    <div className="space-y-4">
                                        {/* Search Products */}
                                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                                            <h3 className="font-semibold text-slate-900 mb-4">
                                                Adicionar Produtos - {selectedProject.manufacturer}
                                            </h3>
                                            <div className="flex gap-2 mb-4">
                                                <div className="flex-1 relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        onKeyPress={(e) => e.key === 'Enter' && handleSearchProducts()}
                                                        placeholder="Buscar produto por código ou nome..."
                                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleSearchProducts}
                                                    disabled={searching}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                                >
                                                    {searching ? 'Buscando...' : 'Buscar'}
                                                </button>
                                            </div>

                                            {searchResults.length > 0 && (
                                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                                    {searchResults.map((product) => (
                                                        <div
                                                            key={product.id}
                                                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 gap-3"
                                                        >
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-semibold text-slate-900 text-sm sm:text-base break-words">
                                                                    {product.name}
                                                                </div>
                                                                <div className="text-xs sm:text-sm text-slate-600 mt-1">
                                                                    <span className="font-mono bg-slate-200 px-2 py-0.5 rounded">
                                                                        {product.id}
                                                                    </span>
                                                                    <span className="mx-2">•</span>
                                                                    <span>{product.brand}</span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleOpenAddModal(product)}
                                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap w-full sm:w-auto"
                                                            >
                                                                Adicionar
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Current Items */}
                                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                                            <h3 className="font-semibold text-slate-900 mb-4">Itens no Projeto</h3>
                                            {items.length === 0 ? (
                                                <div className="text-center py-8 text-slate-500">
                                                    <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                                    <p className="text-sm">Nenhum item adicionado</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {items.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                                                        >
                                                            <div>
                                                                <div className="font-semibold text-slate-900">{item.productName}</div>
                                                                <div className="text-sm text-slate-600">
                                                                    {item.productId} - {item.productBrand} - Qtd: {item.quantity}
                                                                </div>
                                                                {(item.expectedDate || item.observation) && (
                                                                    <div className="text-xs text-slate-500 mt-1 flex gap-3">
                                                                        {item.expectedDate && (
                                                                            <span>Prev: {new Date(item.expectedDate).toLocaleDateString('pt-BR')}</span>
                                                                        )}
                                                                        {item.observation && (
                                                                            <span className="truncate max-w-xs" title={item.observation}>Obs: {item.observation}</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={() => handleRemoveItem(item.id)}
                                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Remover item"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Item Modal */}
                {showAddModal && selectedProductToAdd && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">
                                Adicionar {selectedProductToAdd.name}
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={addQuantity}
                                        onChange={(e) => setAddQuantity(parseInt(e.target.value) || 1)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Previsão de Chegada</label>
                                    <input
                                        type="date"
                                        value={addExpectedDate}
                                        onChange={(e) => setAddExpectedDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Observação</label>
                                    <textarea
                                        value={addObservation}
                                        onChange={(e) => setAddObservation(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        placeholder="Opcional..."
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmAddProduct}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};
