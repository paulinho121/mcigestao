import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  MapPin, 
  ArrowRightLeft, 
  Beaker, 
  Presentation, 
  History, 
  Save, 
  X, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Box,
  Building2
} from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import { Product, InternalMovement } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StockManagementProps {
  userEmail: string;
}

export const StockManagement: React.FC<StockManagementProps> = ({ userEmail }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InternalMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [editingLocation, setEditingLocation] = useState<{ id: string, branch: 'CE' | 'SC' | 'SP' } | null>(null);
  const [locationValue, setLocationValue] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [actionType, setActionType] = useState<'amostra' | 'demonstracao' | null>(null);
  const [actionQuantity, setActionQuantity] = useState(1);
  const [actionBranch, setActionBranch] = useState<'CE' | 'SC' | 'SP'>('CE');
  const [actionObservations, setActionObservations] = useState('');
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchProducts = useCallback(async (query: string) => {
    if (!query) {
      setProducts([]);
      return;
    }
    setLoading(true);
    try {
      const results = await inventoryService.searchProducts(query);
      setProducts(results);
    } catch (error) {
      console.error("Failed to fetch products", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMovements = useCallback(async () => {
    setLoadingMovements(true);
    try {
      const results = await inventoryService.getInternalMovements(20);
      setMovements(results);
    } catch (error) {
      console.error("Failed to fetch movements", error);
    } finally {
      setLoadingMovements(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchProducts]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const handleUpdateLocation = async (productId: string, branch: 'CE' | 'SC' | 'SP') => {
    const success = await inventoryService.updateLocation(productId, locationValue, branch);
    if (success) {
      setProducts(prev => prev.map(p => {
        if (p.id === productId) {
          const col = `location_${branch.toLowerCase()}` as keyof Product;
          return { ...p, [col]: locationValue };
        }
        return p;
      }));
      setEditingLocation(null);
      showStatus('Localização atualizada com sucesso!', 'success');
    } else {
      showStatus('Erro ao atualizar localização.', 'error');
    }
  };

  const handleRecordMovement = async () => {
    if (!selectedProduct || !actionType) return;

    const brandKey = `stock_${actionBranch.toLowerCase()}` as keyof Product;
    if ((selectedProduct[brandKey] as number) < actionQuantity) {
      showStatus(`Estoque insuficiente na filial ${actionBranch}`, 'error');
      return;
    }

    const success = await inventoryService.recordInternalMovement({
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      type: actionType,
      quantity: actionQuantity,
      branch: actionBranch,
      userEmail: userEmail,
      observations: actionObservations
    });

    if (success) {
      setIsActionModalOpen(false);
      fetchProducts(searchQuery);
      fetchMovements();
      showStatus('Movimentação registrada com sucesso!', 'success');
    } else {
      showStatus('Erro ao registrar movimentação.', 'error');
    }
  };

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const openActionModal = (product: Product, type: 'amostra' | 'demonstracao') => {
    setSelectedProduct(product);
    setActionType(type);
    setActionQuantity(1);
    setActionObservations('');
    setIsActionModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <ArrowRightLeft className="w-8 h-8 text-brand-600" />
            Gestão Interna de Estoque
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-2xl">
            Gerencie a localização física dos itens e registre movimentações para uso interno, amostras ou demonstrações comerciais.
          </p>
        </div>

        {/* Alerts */}
        {statusMessage && (
          <div className={cn(
            "fixed top-20 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right-10 duration-300",
            statusMessage.type === 'success' 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/40 dark:border-rose-800 dark:text-rose-300"
          )}>
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Management Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Search Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-12 pr-4 py-4 bg-slate-50 border-0 rounded-2xl leading-5 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-base dark:bg-slate-900/50 dark:text-white"
                  placeholder="Buscar produto por código ou nome para gerenciar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {loading && (
                   <div className="absolute inset-y-0 right-0 pr-5 flex items-center">
                    <RefreshCw className="h-5 w-5 text-brand-500 animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* Products List */}
            <div className="space-y-4">
              {products.length > 0 ? (
                products.map((product) => (
                  <div key={product.id} className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group">
                    <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                      
                      {/* Product Info */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full uppercase tracking-wider dark:bg-brand-900/30 dark:text-brand-400">
                            {product.id}
                          </span>
                          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full dark:bg-slate-700 dark:text-slate-500">
                            {product.brand}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                          {product.name}
                        </h3>
                        
                        <div className="flex flex-wrap gap-4 mt-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Box className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-500 dark:text-slate-400">Estoque Total:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{product.total}</span>
                          </div>
                          
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                          {(['CE', 'SC', 'SP'] as const).map(branch => {
                            const isEditing = editingLocation?.id === product.id && editingLocation?.branch === branch;
                            const locKey = `location_${branch.toLowerCase()}` as keyof Product;
                            const locationValueFromProduct = product[locKey] as string;
                            const branchColor = branch === 'CE' ? 'text-emerald-600' : branch === 'SP' ? 'text-rose-600' : 'text-blue-600';
                            
                            return (
                              <div key={branch} className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <MapPin className={cn("w-3.5 h-3.5", branchColor)} />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{branch}</span>
                                </div>
                                {isEditing ? (
                                  <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
                                    <input
                                      autoFocus
                                      className="flex-grow bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-brand-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                      value={locationValue}
                                      onChange={(e) => setLocationValue(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateLocation(product.id, branch)}
                                    />
                                    <button 
                                      onClick={() => handleUpdateLocation(product.id, branch)}
                                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded dark:hover:bg-emerald-900/30"
                                    >
                                      <Save className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => setEditingLocation(null)}
                                      className="p-1 text-slate-400 hover:bg-slate-100 rounded dark:hover:bg-slate-700"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => {
                                      setEditingLocation({ id: product.id, branch });
                                      setLocationValue(locationValueFromProduct || '');
                                    }}
                                    className="text-sm font-bold text-slate-800 dark:text-white hover:text-brand-600 underline decoration-dotted underline-offset-4 transition-colors text-left truncate"
                                    title={locationValueFromProduct || 'Não definida'}
                                  >
                                    {locationValueFromProduct || 'Definir'}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <button 
                          onClick={() => openActionModal(product, 'amostra')}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-2xl font-bold text-sm hover:bg-indigo-100 transition-colors border border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800"
                        >
                          <Beaker className="w-4 h-4" />
                          Amostra
                        </button>
                        <button 
                          onClick={() => openActionModal(product, 'demonstracao')}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-2xl font-bold text-sm hover:bg-amber-100 transition-colors border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                        >
                          <Presentation className="w-4 h-4" />
                          Demo
                        </button>
                      </div>

                    </div>
                  </div>
                ))
              ) : searchQuery && !loading ? (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                  <div className="mx-auto w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 dark:bg-slate-900">
                    <Search className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-medium">Nenhum produto encontrado.</p>
                </div>
              ) : !searchQuery && (
                <div className="text-center py-20">
                  <ArrowRightLeft className="w-16 h-16 text-slate-200 mx-auto mb-4 animate-bounce" />
                  <h3 className="text-xl font-bold text-slate-400">Aguardando busca...</h3>
                  <p className="text-slate-400 mt-2">Digite o nome ou código de um produto acima.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: Recent History */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-brand-600" />
                  Histórico de Saídas
                </h2>
                <button 
                  onClick={fetchMovements}
                  className="p-2 text-slate-400 hover:text-brand-600 transition-colors"
                >
                  <RefreshCw className={cn("w-4 h-4", loadingMovements && "animate-spin")} />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                {movements.length > 0 ? (
                  movements.map((move) => (
                    <div key={move.id} className="relative pl-6 pb-6 border-l-2 border-slate-100 dark:border-slate-700 last:pb-0">
                      <div className={cn(
                        "absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 shadow-sm",
                        move.type === 'amostra' ? "bg-indigo-500" : "bg-amber-500"
                      )}></div>
                      
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-1">
                        {new Date(move.created_at).toLocaleDateString()} · {new Date(move.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                          {move.product_name}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex gap-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                              move.type === 'amostra' ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700"
                            )}>
                              {move.type}
                            </span>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                              move.branch === 'CE' ? "bg-emerald-100 text-emerald-700" :
                              move.branch === 'SP' ? "bg-rose-100 text-rose-700" :
                              "bg-blue-100 text-blue-700"
                            )}>
                              {move.branch}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                             {move.quantity} un
                          </span>
                        </div>
                        {move.observations && (
                          <div className="mt-2 text-xs text-slate-500 italic border-t border-slate-200 dark:border-slate-800 pt-1">
                            "{move.observations}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 opacity-40">
                    <History className="w-10 h-10 mx-auto mb-2" />
                    <p className="text-sm font-medium">Nenhum registro ainda.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Action Modal */}
      {isActionModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-300">
            <div className={cn(
              "p-8 text-center bg-gradient-to-b",
              actionType === 'amostra' ? "from-indigo-600/10 to-transparent" : "from-amber-600/10 to-transparent"
            )}>
              <div className={cn(
                "w-20 h-20 rounded-[2rem] mx-auto flex items-center justify-center mb-6 shadow-lg",
                actionType === 'amostra' ? "bg-indigo-600 text-white" : "bg-amber-600 text-white"
              )}>
                {actionType === 'amostra' ? <Beaker className="w-10 h-10" /> : <Presentation className="w-10 h-10" />}
              </div>
              
              <h2 className="text-2xl font-black text-slate-900 dark:text-white capitalize">
                Registrar {actionType}
              </h2>
              <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium">
                {selectedProduct.name}
              </p>
            </div>

            <div className="p-8 space-y-6">
              
              {/* Branch Selection */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Filial de Saída
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CE', 'SC', 'SP'] as const).map((branch) => (
                    <button
                      key={branch}
                      onClick={() => setActionBranch(branch)}
                      className={cn(
                        "py-3 rounded-2xl font-black text-sm transition-all border-2",
                        actionBranch === branch 
                          ? cn(
                              "text-white shadow-xl scale-105 border-transparent",
                              branch === 'CE' ? "bg-emerald-600 shadow-emerald-600/20" :
                              branch === 'SP' ? "bg-rose-600 shadow-rose-600/20" :
                              "bg-blue-600 shadow-blue-600/20"
                            )
                          : "bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400"
                      )}
                    >
                      {branch}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Selection */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                   <Box className="w-4 h-4" /> Quantidade
                </label>
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <button 
                    onClick={() => setActionQuantity(Math.max(1, actionQuantity - 1))}
                    className="w-12 h-12 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm font-bold text-xl hover:bg-slate-100 transition-colors"
                  >
                    -
                  </button>
                  <div className="flex-grow text-center font-black text-2xl text-slate-900 dark:text-white">
                    {actionQuantity}
                  </div>
                  <button 
                    onClick={() => setActionQuantity(actionQuantity + 1)}
                     className="w-12 h-12 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm font-bold text-xl hover:bg-slate-100 transition-colors"
                  >
                    +
                  </button>
                </div>
                <div className="mt-2 text-center">
                   <span className="text-xs font-bold text-slate-400">
                     Disponível em {actionBranch}: <span className="text-slate-600 dark:text-slate-200">{selectedProduct[`stock_${actionBranch.toLowerCase()}` as keyof Product] as number || 0}</span>
                   </span>
                </div>
              </div>

              {/* Observations */}
              <div>
                <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                   <ArrowRightLeft className="w-4 h-4" /> Observações
                </label>
                <textarea
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-brand-500 outline-none text-slate-700 dark:text-slate-200 min-h-[100px] resize-none"
                  placeholder="Descreva detalhes da amostra ou demonstração..."
                  value={actionObservations}
                  onChange={(e) => setActionObservations(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setIsActionModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-3xl font-bold hover:bg-slate-200 transition-all dark:bg-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleRecordMovement}
                  disabled={actionQuantity <= 0 || (selectedProduct[`stock_${actionBranch.toLowerCase()}` as keyof Product] as number || 0) < actionQuantity}
                  className={cn(
                    "flex-[2] py-4 rounded-3xl font-bold text-white shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:grayscale",
                    actionType === 'amostra' ? "bg-indigo-600 shadow-indigo-600/20" : "bg-amber-600 shadow-amber-600/20"
                  )}
                >
                  Confirmar Saída
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
