import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Mic, MicOff, MapPin } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { inventoryService } from '../services/inventoryService';
import { Product } from '../types';

interface InventoryProps {
  userEmail: string;
}

export const Inventory: React.FC<InventoryProps> = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<'CE' | 'SC' | 'SP' | null>(null);

  const handleVoiceSearch = () => {
    if (isListening) {
      setIsListening(false);
      window.speechSynthesis.cancel();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Seu navegador não suporta pesquisa por voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
    };

    recognition.start();
  };


  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchProducts = useCallback(async (query: string) => {
    setLoading(true);
    try {
      if (selectedBranch) {
        // If a branch is selected, fetch all products from that branch
        const results = await inventoryService.getProductsByBranch(selectedBranch);
        setProducts(results);
      } else if (query) {
        // If no branch selected but there's a search query, search products
        const results = await inventoryService.searchProducts(query);
        setProducts(results);
      } else {
        // No search query and no branch: show nothing
        setProducts([]);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  useEffect(() => {
    fetchProducts(debouncedQuery);
  }, [debouncedQuery, selectedBranch, fetchProducts]);

  const handleBranchSelect = (branch: 'CE' | 'SC' | 'SP' | null) => {
    setSelectedBranch(branch);
    if (branch) {
      setSearchQuery(''); // Clear search when selecting a branch
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors flex flex-col font-sans">

      {/* Search Hero Section */}
      <div className="bg-gradient-to-b from-white to-slate-50 shadow-sm border-b border-slate-200 pt-6 pb-8 sm:pt-10 sm:pb-12 px-4 sm:px-6 lg:px-8 dark:from-slate-800 dark:to-slate-900 dark:border-slate-700 transition-colors">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 tracking-tight dark:text-slate-100">O que você está procurando?</h2>
          <p className="text-slate-500 mb-6 sm:mb-8 text-base sm:text-lg dark:text-slate-400">Consulte disponibilidade por código, nome do produto ou filtre por filial.</p>

          <div className="relative max-w-2xl mx-auto group mb-6">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
            </div>
            <input
              type="text"
              className={`block w-full pl-14 pr-14 py-3 sm:py-4 border-2 border-slate-200 rounded-2xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-base sm:text-lg shadow-sm group-hover:border-brand-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 ${selectedBranch ? 'bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-500' : ''}`}
              placeholder={isListening ? "Ouvindo..." : selectedBranch ? `Filtrando por filial ${selectedBranch} (Limpe o filtro para buscar)` : "Ex: 1896, Sony, Tripé..."}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value && selectedBranch) {
                  setSelectedBranch(null); // Clear branch filter if user starts typing
                }
              }}
              disabled={!!selectedBranch}
              autoFocus={!selectedBranch}
            />
            <div className="absolute inset-y-0 right-0 pr-5 flex items-center gap-2">
              {loading ? (
                <RefreshCw className="h-6 w-6 text-brand-500 animate-spin" />
              ) : (
                <button
                  onClick={handleVoiceSearch}
                  className={`p-2 rounded-full transition-colors ${isListening
                    ? 'text-red-500 bg-red-50 hover:bg-red-100'
                    : 'text-slate-400 hover:text-brand-500 hover:bg-slate-50'
                    }`}
                  title="Pesquisa por voz"
                  disabled={!!selectedBranch}
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
              )}
            </div>
          </div>

          {/* Branch Selector */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <span className="text-sm font-medium text-slate-500 flex items-center gap-1.5 dark:text-slate-400">
              <MapPin className="w-4 h-4" />
              Filtrar por Filial:
            </span>

            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => handleBranchSelect(null)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${selectedBranch === null
                  ? 'bg-slate-800 text-white shadow-md ring-2 ring-slate-800 ring-offset-2 dark:bg-slate-700 dark:ring-slate-700'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700'
                  }`}
              >
                Todas (Busca)
              </button>

              {(['CE', 'SC', 'SP'] as const).map((branch) => (
                <button
                  key={branch}
                  onClick={() => handleBranchSelect(branch)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${selectedBranch === branch
                    ? 'bg-brand-600 text-white shadow-md ring-2 ring-brand-600 ring-offset-2'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-200 hover:text-brand-600 hover:bg-brand-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-brand-400'
                    }`}
                >
                  {branch}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <p className="mt-2 text-slate-600">Carregando dados...</p>
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {selectedBranch
                  ? `Exibindo produtos com estoque em ${selectedBranch}`
                  : `Resultados da busca`
                }
              </div>
              <div className="text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1 rounded-full dark:bg-slate-800 dark:text-slate-300">
                {products.length} produtos encontrados
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        ) : (
          !loading && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4 dark:bg-slate-800">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-1 dark:text-white">Nenhum produto encontrado</h3>
              <p className="text-slate-500 dark:text-slate-400">
                {selectedBranch
                  ? `Não há produtos com estoque na filial ${selectedBranch}.`
                  : "Tente buscar por outro termo ou código."}
              </p>
              {selectedBranch && (
                <button
                  onClick={() => handleBranchSelect(null)}
                  className="mt-4 text-brand-600 font-medium hover:text-brand-700 hover:underline"
                >
                  Limpar filtro de filial
                </button>
              )}
            </div>
          )
        )}
      </main>
    </div>
  );
};