import { useState, useEffect } from 'react';
import { Plus, Package, FolderOpen, Calendar, Trash2, Search, X, Download, Edit2, Save, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
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

    const handleExportCSV = () => {
        if (items.length === 0 || !selectedProject) return;

        const headers = ['Código', 'Produto', 'Marca', 'Quantidade', 'Previsão', 'Observação'];
        const csvRows = [
            `${selectedProject.manufacturer} - ${selectedProject.importNumber}`,
            headers.join(';'),
            ...items.map(item => {
                return [
                    item.productId,
                    `"${item.productName.replace(/"/g, '""')}"`,
                    `"${(item.productBrand || '').replace(/"/g, '""')}"`,
                    item.quantity,
                    item.expectedDate ? new Date(item.expectedDate).toLocaleDateString('pt-BR') : '',
                    `"${(item.observation || '').replace(/"/g, '""')}"`
                ].join(';');
            })
        ];

        const csvContent = '\ufeff' + csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        const filename = `importacao_${selectedProject.manufacturer.toLowerCase().replace(/\s+/g, '_')}_${selectedProject.importNumber.toLowerCase().replace(/\s+/g, '_')}_${date}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
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

    // Editing states
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [editManufacturer, setEditManufacturer] = useState('');
    const [editImportNumber, setEditImportNumber] = useState('');

    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editItemQuantity, setEditItemQuantity] = useState(0);
    const [editItemDate, setEditItemDate] = useState('');
    const [editItemObservation, setEditItemObservation] = useState('');

    const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        if (actionStatus) {
            const timer = setTimeout(() => setActionStatus(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [actionStatus]);

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
        if (!confirm('Tem certeza que deseja excluir este projeto? Todos os itens serão removidos permanentemente.')) {
            return;
        }

        try {
            const success = await inventoryService.deleteImportProject(projectId);
            if (success) {
                if (selectedProject?.id === projectId) {
                    setSelectedProject(null);
                    setItems([]);
                }
                await loadProjects();
                setActionStatus({ type: 'success', message: 'Projeto excluído com sucesso' });
            }
        } catch (error) {
            setActionStatus({ type: 'error', message: 'Erro ao excluir projeto' });
        }
    };

    const handleStartEditProject = (project: ImportProject) => {
        setEditingProjectId(project.id);
        setEditManufacturer(project.manufacturer);
        setEditImportNumber(project.importNumber);
    };

    const handleSaveProject = async (id: string) => {
        if (!editManufacturer.trim() || !editImportNumber.trim()) return;
        try {
            await inventoryService.updateImportProject(id, editManufacturer, editImportNumber);
            setEditingProjectId(null);
            await loadProjects();
            if (selectedProject?.id === id) {
                setSelectedProject(prev => prev ? { ...prev, manufacturer: editManufacturer, importNumber: editImportNumber } : null);
            }
            setActionStatus({ type: 'success', message: 'Projeto atualizado com sucesso' });
        } catch (error) {
            setActionStatus({ type: 'error', message: 'Erro ao atualizar projeto' });
        }
    };

    const handleStartEditItem = (item: ImportItem) => {
        setEditingItemId(item.id);
        setEditItemQuantity(item.quantity);
        setEditItemDate(item.expectedDate || '');
        setEditItemObservation(item.observation || '');
    };

    const handleSaveItem = async (itemId: string) => {
        try {
            await inventoryService.updateImportItem(itemId, editItemQuantity, editItemDate || undefined, editItemObservation || undefined);
            setEditingItemId(null);
            if (selectedProject) {
                await loadProjectItems(selectedProject.id);
            }
            setActionStatus({ type: 'success', message: 'Item atualizado com sucesso' });
        } catch (error) {
            setActionStatus({ type: 'error', message: 'Erro ao atualizar item' });
        }
    };


    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 transition-colors">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3.5 bg-gradient-to-tr from-[#00a699] to-[#00d1c1] rounded-2xl shadow-lg shadow-[#00a699]/20 dark:shadow-none">
                                <Package className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Em Importação</h1>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">Gestão profissional de projetos e reposições</p>
                            </div>
                        </div>
                    </div>

                    {/* Status Feedback */}
                    {actionStatus && (
                        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
                            actionStatus.type === 'success' 
                            ? 'bg-green-50 border border-green-100 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' 
                            : 'bg-red-50 border border-red-100 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                        }`}>
                            {actionStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            <span className="font-semibold">{actionStatus.message}</span>
                        </div>
                    )}

                    {/* Sub Tabs */}
                    <div className="flex flex-wrap sm:flex-nowrap gap-1 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 w-full sm:w-fit shadow-sm">
                        <button
                            onClick={() => handleTabChange('view')}
                            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'view'
                                ? 'bg-[#00a699] text-white shadow-md shadow-[#00a699]/20 dark:shadow-none'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                }`}
                        >
                            Visualização
                        </button>
                        {isMaster && (
                            <button
                                onClick={() => handleTabChange('maintenance')}
                                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'maintenance'
                                    ? 'bg-[#00a699] text-white shadow-md shadow-[#00a699]/20 dark:shadow-none'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                    }`}
                            >
                                Manutenção
                            </button>
                        )}
                    </div>
                </div>

                {/* VIEW TAB */}
                {subTab === 'view' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Projects List */}
                        <div className="lg:col-span-4">
                            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 transition-colors overflow-hidden">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-xs">Projetos Ativos</h3>
                                    <span className="px-2 py-0.5 bg-[#00a699]/10 dark:bg-[#00a699]/20 text-[#00a699] dark:text-[#00d1c1] text-[10px] font-black rounded-full border border-[#00a699]/20 dark:border-[#00a699]/30">
                                        {projects.length} TOTAL
                                    </span>
                                </div>
                                
                                {loading ? (
                                    <div className="text-center py-12">
                                        <div className="w-10 h-10 border-4 border-[#00a699]/10 border-t-[#00a699] rounded-full animate-spin mx-auto"></div>
                                    </div>
                                ) : projects.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                        <FolderOpen className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                                        <p className="text-slate-400 font-medium text-sm">Nenhum projeto encontrado</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                        {projects.map((project) => (
                                            <div
                                                key={project.id}
                                                onClick={() => handleSelectProject(project)}
                                                className={`group p-4 rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden ${selectedProject?.id === project.id
                                                    ? 'bg-[#00a699] text-white shadow-xl shadow-[#00a699]/20 dark:shadow-none translate-x-1'
                                                    : 'bg-white hover:bg-[#00a699]/5 border border-slate-200 hover:border-[#00a699]/30 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:border-[#00a699]/50'
                                                    }`}
                                            >
                                                <div className={`font-bold ${selectedProject?.id === project.id ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                                                    {project.manufacturer}
                                                </div>
                                                <div className={`text-sm font-medium ${selectedProject?.id === project.id ? 'text-[#00d1c1]' : 'text-slate-500 dark:text-slate-400'}`}>
                                                    {project.importNumber}
                                                </div>
                                                <div className={`flex items-center gap-1.5 text-[10px] mt-3 font-bold uppercase tracking-tight ${selectedProject?.id === project.id ? 'text-[#00a699]/20' : 'text-slate-400'}`}>
                                                    <Calendar className="w-3 h-3" />
                                                    CRIADO EM {new Date(project.createdAt).toLocaleDateString('pt-BR')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Project Items */}
                        <div className="lg:col-span-8">
                            {selectedProject ? (
                                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors overflow-hidden">
                                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-600">
                                                <Package className="w-6 h-6 text-[#00a699] dark:text-[#00d1c1]" />
                                            </div>
                                            <div>
                                                <h3 className="font-extrabold text-slate-900 dark:text-white text-xl">
                                                    {selectedProject.manufacturer}
                                                </h3>
                                                <p className="text-sm font-bold text-[#00a699] dark:text-[#00d1c1] flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 bg-[#00a699] dark:bg-[#00d1c1] rounded-full animate-pulse"></span>
                                                    {selectedProject.importNumber} • {items.length} ITENS
                                                </p>
                                            </div>
                                        </div>
                                        {items.length > 0 && (
                                            <button
                                                onClick={handleExportCSV}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white hover:bg-[#00a699]/5 dark:hover:bg-slate-600 hover:text-[#00a699] dark:hover:text-[#00d1c1] hover:border-[#00a699]/30 transition-all text-xs font-black shadow-sm uppercase tracking-wider"
                                            >
                                                <Download className="w-4 h-4" />
                                                <span className="hidden sm:inline">Exportar</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="p-6">
                                        {loadingItems ? (
                                            <div className="text-center py-20">
                                                <div className="w-12 h-12 border-4 border-[#00a699]/10 border-t-[#00a699] rounded-full animate-spin mx-auto mb-4"></div>
                                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Carregando Itens</p>
                                            </div>
                                        ) : items.length === 0 ? (
                                            <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                                <Package className="w-20 h-20 mx-auto mb-6 text-slate-200 dark:text-slate-800" />
                                                <p className="text-slate-500 font-bold mb-4">Nenhum item vinculado a este projeto</p>
                                                <button 
                                                    onClick={() => setSubTab('maintenance')}
                                                    className="px-6 py-3 bg-[#00a699] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#00a699]/20 dark:shadow-none hover:scale-105 transition-transform"
                                                >
                                                    Adicionar Itens Agora
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                                                            <th className="pb-4 px-2">Cód</th>
                                                            <th className="pb-4 px-2">Produto</th>
                                                            <th className="pb-4 px-2 text-center">Qtd</th>
                                                            <th className="pb-4 px-2">Previsão</th>
                                                            <th className="pb-4 px-2">Observações</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                                        {items.map((item) => (
                                                            <tr key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                                <td className="py-5 px-2 font-mono text-[11px] font-bold text-slate-400 group-hover:text-[#00a699] transition-colors">{item.productId}</td>
                                                                <td className="py-5 px-2">
                                                                    <div className="font-bold text-slate-800 dark:text-white text-sm">{item.productName}</div>
                                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{item.productBrand}</div>
                                                                </td>
                                                                <td className="py-5 px-2 text-center">
                                                                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#00a699]/5 dark:bg-[#002b28]/30 text-[#008d82] dark:text-[#00d1c1] font-black text-sm border border-[#00a699]/10 dark:border-[#005753]">
                                                                        {item.quantity}
                                                                    </span>
                                                                </td>
                                                                <td className="py-5 px-2">
                                                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs font-bold bg-slate-100 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg w-fit">
                                                                        <Calendar className="w-3.5 h-3.5 text-[#00a699]" />
                                                                        {item.expectedDate ? new Date(item.expectedDate).toLocaleDateString('pt-BR') : 'A DEFINIR'}
                                                                    </div>
                                                                </td>
                                                                <td className="py-5 px-2 max-w-xs">
                                                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic line-clamp-2" title={item.observation}>
                                                                        {item.observation || 'Sem observações registradas'}
                                                                    </p>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full min-h-[500px] bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-12 text-center transition-colors">
                                    <div className="w-24 h-24 bg-[#00a699]/5 dark:bg-[#002b28]/20 rounded-full flex items-center justify-center mb-6">
                                        <FolderOpen className="w-12 h-12 text-[#00a699]" />
                                    </div>
                                    <h3 className="text-xl font-extrabold text-slate-800 dark:text-white mb-2">Selecione um Projeto</h3>
                                    <p className="text-slate-500 dark:text-slate-400 max-w-sm">Escolha um projeto de importação na lista ao lado para visualizar os detalhes e gerenciar os itens.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* MAINTENANCE TAB */}
                {subTab === 'maintenance' && isMaster && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* New Project Form */}
                        {!showNewProjectForm ? (
                            <button
                                onClick={() => setShowNewProjectForm(true)}
                                className="group w-full p-6 sm:p-10 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#00a699] dark:hover:border-[#00a699] hover:bg-[#00a699]/5 dark:hover:bg-[#00a699]/10 transition-all flex flex-col items-center justify-center gap-4 text-slate-500 hover:text-[#00a699] dark:text-slate-400 dark:hover:text-[#00d1c1]"
                            >
                                <div className="p-4 bg-slate-100 dark:bg-slate-700 group-hover:bg-[#00a699]/10 dark:group-hover:bg-[#00a699]/20 rounded-2xl transition-colors">
                                    <Plus className="w-8 h-8" />
                                </div>
                                <div className="text-center">
                                    <span className="font-extrabold text-lg sm:text-xl tracking-tight block">Criar Novo Projeto de Importação</span>
                                    <p className="text-sm font-medium opacity-60 mt-1">Inicie um novo planejamento de fabricante ou lote</p>
                                </div>
                            </button>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 transition-colors ring-4 ring-[#00a699]/5 dark:ring-[#002b28]/10">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-[#00a699] rounded-xl flex items-center justify-center shadow-lg shadow-[#00a699]/20">
                                            <Plus className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Novo Projeto</h3>
                                    </div>
                                    <button
                                        onClick={() => setShowNewProjectForm(false)}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                    >
                                        <X className="w-6 h-6 text-slate-400" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Fabricante</label>
                                        <input
                                            type="text"
                                            value={manufacturer}
                                            onChange={(e) => setManufacturer(e.target.value)}
                                            className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00a699] dark:text-white font-bold placeholder:text-slate-300 dark:placeholder:text-slate-700 transition-all"
                                            placeholder="Ex: APUTURE + TRIOPO"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">ID / Número de Importação</label>
                                        <input
                                            type="text"
                                            value={importNumber}
                                            onChange={(e) => setImportNumber(e.target.value)}
                                            className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00a699] dark:text-white font-bold placeholder:text-slate-300 dark:placeholder:text-slate-700 transition-all"
                                            placeholder="Ex: IMP 09/26"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowNewProjectForm(false)}
                                        className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleCreateProject}
                                        disabled={!manufacturer.trim() || !importNumber.trim()}
                                        className="px-8 py-3 bg-[#00a699] text-white rounded-2xl font-black shadow-lg shadow-[#00a699]/20 dark:shadow-none hover:bg-[#008d82] transition-all disabled:opacity-50 disabled:grayscale"
                                    >
                                        Confirmar Criação
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Manage Projects Content */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* Projects Management List */}
                            <div className="lg:col-span-4">
                                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors">
                                    <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-6">Lista de Projetos</h3>
                                    {loading ? (
                                        <div className="text-center py-12">
                                            <div className="w-10 h-10 border-4 border-[#00a699]/10 border-t-[#00a699] rounded-full animate-spin mx-auto"></div>
                                        </div>
                                    ) : projects.length === 0 ? (
                                        <div className="text-center py-12">
                                            <FolderOpen className="w-12 h-12 mx-auto mb-2 text-slate-200 dark:text-slate-800" />
                                            <p className="text-sm text-slate-400 font-bold">Nenhum projeto</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                                            {projects.map((project) => (
                                                <div
                                                    key={project.id}
                                                    className={`group p-5 rounded-3xl transition-all duration-300 border-2 ${selectedProject?.id === project.id
                                                        ? 'bg-[#00a699]/5 border-[#00a699] dark:bg-[#00a699]/10 dark:border-[#00a699]'
                                                        : 'bg-white border-slate-100 hover:border-[#00a699]/30 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600'
                                                        }`}
                                                >
                                                    {editingProjectId === project.id ? (
                                                        <div className="space-y-3">
                                                            <input
                                                                type="text"
                                                                value={editManufacturer}
                                                                onChange={(e) => setEditManufacturer(e.target.value)}
                                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-[#00d1c1] dark:border-[#005753] rounded-xl text-sm font-bold dark:text-white"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={editImportNumber}
                                                                onChange={(e) => setEditImportNumber(e.target.value)}
                                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-[#00a699]/30 dark:border-[#00a699]/50 rounded-xl text-sm font-bold dark:text-white focus:ring-2 focus:ring-[#00a699]"
                                                            />
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleSaveProject(project.id)}
                                                                    className="flex-1 py-2 bg-green-600 text-white rounded-xl text-xs font-black shadow-md shadow-green-100 flex items-center justify-center gap-1.5"
                                                                >
                                                                    <Save className="w-3.5 h-3.5" /> SALVAR
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingProjectId(null)}
                                                                    className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black flex items-center justify-center gap-1.5"
                                                                >
                                                                    <RotateCcw className="w-3.5 h-3.5" /> CANCELAR
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div
                                                                onClick={() => handleSelectProject(project)}
                                                                className="cursor-pointer flex-1"
                                                            >
                                                                <div className="font-extrabold text-slate-900 dark:text-white text-base group-hover:text-[#00a699] transition-colors">{project.manufacturer}</div>
                                                                <div className="text-sm font-bold text-[#00a699] dark:text-[#00d1c1] mt-0.5">{project.importNumber}</div>
                                                            </div>
                                                            <div className="mt-5 flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                                                <button
                                                                    onClick={() => handleStartEditProject(project)}
                                                                    className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-[#00a699] dark:hover:text-[#00d1c1] hover:bg-[#00a699]/5 dark:hover:bg-[#00a699]/10 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold text-[10px] uppercase tracking-widest"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5" /> Editar
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteProject(project.id)}
                                                                    className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold text-[10px] uppercase tracking-widest"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Project Items Management */}
                            <div className="lg:col-span-8">
                                {selectedProject ? (
                                    <div className="space-y-8">
                                        {/* Search & Add Section */}
                                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 transition-colors">
                                            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                                                <div className="w-8 h-8 bg-[#00a699]/10 dark:bg-[#00a699]/20 rounded-xl flex items-center justify-center">
                                                    <Search className="w-4 h-4 text-[#00a699]" />
                                                </div>
                                                Adicionar Produtos ao Projeto
                                            </h3>
                                            <div className="flex gap-3 mb-8">
                                                <div className="flex-1 relative">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        onKeyPress={(e) => e.key === 'Enter' && handleSearchProducts()}
                                                        placeholder="Pesquisar por Código, Nome ou Marca..."
                                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00a699] dark:text-white font-bold placeholder:text-slate-400 transition-all"
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleSearchProducts}
                                                    disabled={searching}
                                                    className="px-8 py-4 bg-[#00a699] text-white rounded-2xl font-black shadow-lg shadow-[#00a699]/20 dark:shadow-none hover:bg-[#008d82] transition-all disabled:opacity-50 min-w-[140px]"
                                                >
                                                    {searching ? 'Buscando...' : 'Pesquisar'}
                                                </button>
                                            </div>

                                            {searchResults.length > 0 && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {searchResults.map((product) => (
                                                        <div
                                                            key={product.id}
                                                            className="flex items-center justify-between p-5 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-[#00a699]/50 hover:shadow-md transition-all group"
                                                        >
                                                            <div className="flex-1 min-w-0 pr-4">
                                                                <div className="font-black text-slate-800 dark:text-white text-sm truncate">
                                                                    {product.name}
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-[10px] font-black font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 uppercase">
                                                                        {product.id}
                                                                    </span>
                                                                    <span className="text-[10px] font-black text-[#00a699] uppercase tracking-tight">
                                                                        {product.brand}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleOpenAddModal(product)}
                                                                className="p-3 bg-[#00a699] text-white rounded-xl shadow-md shadow-[#00a699]/20 dark:shadow-none hover:bg-[#008d82] transition-all group-hover:scale-105"
                                                            >
                                                                <Plus className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Current Items List */}
                                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 transition-colors">
                                            <div className="flex items-center justify-between mb-8">
                                                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-[#00a699]/10 dark:bg-[#00a699]/20 rounded-xl flex items-center justify-center">
                                                        <Package className="w-4 h-4 text-[#00a699]" />
                                                    </div>
                                                    Itens Atuais do Projeto
                                                </h3>
                                                <span className="text-xs font-black text-slate-400 bg-slate-50 dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    {items.length} ITENS NO LOTE
                                                </span>
                                            </div>

                                            {items.length === 0 ? (
                                                <div className="text-center py-16 bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                                                    <Package className="w-16 h-16 mx-auto mb-4 text-slate-200 dark:text-slate-800" />
                                                    <p className="text-slate-400 font-bold">Nenhum item adicionado ainda</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {items.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            className={`relative group p-6 rounded-3xl border-2 transition-all duration-300 ${editingItemId === item.id 
                                                                ? 'bg-[#00a699]/5 border-[#00a699] dark:bg-[#00a699]/10 dark:border-[#00a699] ring-4 ring-[#00a699]/5' 
                                                                : 'bg-white border-slate-50 dark:bg-slate-900/50 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                                                            }`}
                                                        >
                                                            {editingItemId === item.id ? (
                                                                <div className="space-y-6">
                                                                    <div className="flex items-center justify-between border-b border-[#00a699]/10 dark:border-[#005753] pb-4">
                                                                        <div>
                                                                            <h4 className="font-black text-slate-800 dark:text-white">{item.productName}</h4>
                                                                            <p className="text-[10px] font-black text-[#00a699] uppercase">{item.productId}</p>
                                                                        </div>
                                                                        <button onClick={() => setEditingItemId(null)} className="p-2 text-slate-400 hover:text-slate-600">
                                                                            <X className="w-5 h-5" />
                                                                        </button>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                                        <div className="space-y-2">
                                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantidade</label>
                                                                            <input
                                                                                type="number"
                                                                                value={editItemQuantity}
                                                                                onChange={(e) => setEditItemQuantity(parseInt(e.target.value) || 1)}
                                                                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white focus:ring-2 focus:ring-[#00a699]"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Previsão</label>
                                                                            <input
                                                                                type="date"
                                                                                value={editItemDate}
                                                                                onChange={(e) => setEditItemDate(e.target.value)}
                                                                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white focus:ring-2 focus:ring-[#00a699]"
                                                                            />
                                                                        </div>
                                                                        <div className="sm:col-span-2 space-y-2">
                                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações</label>
                                                                            <textarea
                                                                                value={editItemObservation}
                                                                                onChange={(e) => setEditItemObservation(e.target.value)}
                                                                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-medium dark:text-white focus:ring-2 focus:ring-[#00a699] h-24 resize-none"
                                                                                placeholder="Notas internas..."
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex justify-end gap-3 pt-4 border-t border-[#00a699]/10 dark:border-[#005753]">
                                                                        <button
                                                                            onClick={() => setEditingItemId(null)}
                                                                            className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm transition-all"
                                                                        >
                                                                            Cancelar
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleSaveItem(item.id)}
                                                                            className="px-8 py-2.5 bg-green-600 text-white rounded-xl font-black text-sm shadow-lg shadow-green-100 dark:shadow-none hover:bg-green-700 transition-all flex items-center gap-2"
                                                                        >
                                                                            <Save className="w-4 h-4" /> SALVAR ALTERAÇÕES
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-3 mb-2">
                                                                            <h4 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">{item.productName}</h4>
                                                                            <span className="text-[10px] font-black font-mono bg-[#00a699]/10 dark:bg-[#00a699]/20 text-[#00a699] dark:text-[#00d1c1] px-2 py-1 rounded border border-[#00a699]/20 dark:border-[#00a699]/30">
                                                                                {item.productId}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                                                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                                                                <span className="text-slate-400 uppercase tracking-widest text-[9px]">Qtd:</span>
                                                                                <span className="text-[#00a699] dark:text-[#00d1c1] font-black text-sm">{item.quantity} un</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                                                                <Calendar className="w-3.5 h-3.5 text-[#00a699]" />
                                                                                <span className="text-slate-400 uppercase tracking-widest text-[9px]">Chegada:</span>
                                                                                <span className="dark:text-slate-300">{item.expectedDate ? new Date(item.expectedDate).toLocaleDateString('pt-BR') : 'A definir'}</span>
                                                                            </div>
                                                                        </div>
                                                                        {item.observation && (
                                                                            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic truncate max-w-lg" title={item.observation}>
                                                                                    "{item.observation}"
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex sm:flex-col gap-2 pt-4 sm:pt-0 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 pl-0 sm:pl-6">
                                                                        <button
                                                                            onClick={() => handleStartEditItem(item)}
                                                                            className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-[#00a699] dark:hover:text-[#00d1c1] hover:bg-[#00a699]/5 dark:hover:bg-[#002b28]/30 rounded-2xl transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest border border-transparent hover:border-[#00a699]/20"
                                                                        >
                                                                            <Edit2 className="w-4 h-4" /> EDITAR
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleRemoveItem(item.id)}
                                                                            className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-2xl transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest border border-transparent hover:border-red-200"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" /> REMOVER
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Item Modal */}
                {showAddModal && selectedProductToAdd && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl p-8 max-w-md w-full animate-in zoom-in-95 duration-300 border border-white/20">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-14 h-14 bg-[#00a699] rounded-2xl flex items-center justify-center shadow-lg shadow-[#00a699]/20">
                                    <Package className="w-8 h-8 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white truncate">
                                        {selectedProductToAdd.name}
                                    </h3>
                                    <p className="text-xs font-black text-[#00a699] uppercase tracking-widest">{selectedProductToAdd.id}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantidade em Trânsito</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={addQuantity}
                                        onChange={(e) => setAddQuantity(parseInt(e.target.value) || 1)}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00a699] dark:text-white font-black text-lg transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Previsão de Desembarque</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#00a699]" />
                                        <input
                                            type="date"
                                            value={addExpectedDate}
                                            onChange={(e) => setAddExpectedDate(e.target.value)}
                                            className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00a699] dark:text-white font-bold transition-all dark:scheme-dark"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observação do Lote</label>
                                    <textarea
                                        value={addObservation}
                                        onChange={(e) => setAddObservation(e.target.value)}
                                        rows={3}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00a699] resize-none dark:text-white font-medium placeholder:text-slate-300 dark:placeholder:text-slate-700 transition-all"
                                        placeholder="Ex: Fabricação em andamento, aguardando coleta..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-10">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-colors"
                                >
                                    Desistir
                                </button>
                                <button
                                    onClick={handleConfirmAddProduct}
                                    className="flex-[1.5] py-4 bg-[#00a699] text-white rounded-2xl font-black shadow-xl shadow-[#00a699]/10 dark:shadow-none hover:bg-[#008d82] hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    Confirmar Adesão
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};
