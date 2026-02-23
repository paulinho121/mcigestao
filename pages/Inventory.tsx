import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Mic, MicOff, MapPin, Printer, Download } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { inventoryService } from '../services/inventoryService';
import { Product } from '../types';

interface InventoryProps {
  userEmail: string;
}

export const Inventory: React.FC<InventoryProps> = ({ userEmail }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<'CE' | 'SC' | 'SP' | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleSyncSC = async () => {
    setSyncing(true);
    try {
      // Import dynamically if needed or assume it's imported at top. 
      // For now, I'll rely on top-level import which I need to add in a separate chunk or this one if I can match multiple blocks. 
      // Wait, I can only match one contiguous block per tool call. 
      // I will add the import in a subsequent call if I haven't already. 
      // Actually, I should probably use `multi_replace` to do both, but I'll do this first.

      // Let's defer functionality implementation to the body of the function.
      const result = await import('../services/scStockService').then(m => m.scStockService.syncStock());

      if (result.success) {
        let message = `Sincronização concluída! ${result.updated} itens atualizados.`;

        if (result.newItems && result.newItems.length > 0) {
          message += `\n\nNovos itens cadastrados (${result.newItems.length}):\n${result.newItems.slice(0, 10).join(', ')}${result.newItems.length > 10 ? '...' : ''}`;
        }

        alert(message);
        fetchProducts(debouncedQuery);
      } else {
        alert(result.message || 'Sincronização finalizada sem atualizações (verifique logs/API).');
      }

    } catch (e) {
      console.error(e);
      alert('Erro ao sincronizar estoque SC.');
    } finally {
      setSyncing(false);
    }
  };

  // Automação: Sincronizar a cada 20 minutos (1200000ms) entre 08:00 e 19:00
  // Apenas se o usuário for o Master
  useEffect(() => {
    if (userEmail !== 'paulofernandoautomacao@gmail.com') return;

    const checkAndAutoSync = () => {
      const now = new Date();
      const currentHour = now.getHours();

      // Verifica horário (08:00 <= hora <= 19:00)
      if (currentHour >= 8 && currentHour <= 19) {
        console.log(`[AutoSync] Executando sincronização automática às ${now.toLocaleTimeString()}...`);
        // Chama a função de sync, mas em modo silencioso (sem alerts) se possível, 
        // ou aceitando o comportamento padrão. 
        // Nota: handleSyncSC usa 'alert', o que pode ser intrusivo. 
        // Idealmente refatoraríamos para aceitar um parametro 'silent', 
        // mas para manter simples agora, apenas chamamos.
        handleSyncSC();
      } else {
        console.log(`[AutoSync] Fora do horário de operação (08h-19h). Hora atual: ${currentHour}h`);
      }
    };

    // Configura intervalo de 20 minutos
    const intervalId = setInterval(checkAndAutoSync, 20 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [userEmail]); // Dependência apenas do email para reiniciar se mudar logado

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

  const handlePrint = () => {
    if (products.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Permita pop-ups para imprimir');
      return;
    }

    const date = new Date().toLocaleDateString('pt-BR');
    const title = selectedBranch
      ? `Relatório de Estoque - Filial ${selectedBranch}`
      : searchQuery
        ? `Resultado de Busca: ${searchQuery}`
        : 'Relatório Geral de Estoque';

    printWindow.document.write(`
      <html>
        <head>
          <title>${title} - ${date}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #334155; }
            .header { border-bottom: 3px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-between; items-center; }
            .header h1 { margin: 0; font-size: 24px; color: #0f172a; }
            .header p { margin: 5px 0 0; color: #64748b; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 12px 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; }
            td { border-bottom: 1px solid #f1f5f9; padding: 12px 10px; font-size: 13px; }
            .val { text-align: center; font-weight: 600; }
            .code { font-family: monospace; color: #64748b; }
            .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #f1f5f9; padding-top: 20px; }
            .branch-badge { padding: 2px 6px; background: #f1f5f9; border-radius: 4px; font-size: 10px; font-weight: bold; }
            @media print {
              body { padding: 0; }
              @page { margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>${title}</h1>
              <p>Emitido em ${date} | Total de ${products.length} itens encontrados</p>
            </div>
            <div style="text-align: right">
              <span style="font-weight: 900; color: #0f172a; font-size: 20px; font-style: italic;">MC</span>
              <span style="color: #64748b; font-size: 10px; display: block;">STOCKVISION</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descrição / Marca</th>
                <th class="val">CE</th>
                <th class="val">SC</th>
                <th class="val">SP</th>
                <th class="val">Total</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(p => `
                <tr>
                  <td class="code">${p.id}</td>
                  <td>
                    <div style="font-weight: bold; color: #1e293b;">${p.name}</div>
                    <div style="font-size: 11px; color: #64748b;">${p.brand || 'N/A'}</div>
                  </td>
                  <td class="val">${p.stock_ce ?? 0}</td>
                  <td class="val">${p.stock_sc ?? 0}</td>
                  <td class="val">${p.stock_sp ?? 0}</td>
                  <td class="val" style="color: #0f172a;">${(p.stock_ce ?? 0) + (p.stock_sc ?? 0) + (p.stock_sp ?? 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            StockVision - Gestão Inteligente de Estoque. Este documento é uma representação do estado atual do sistema.
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadCSV = (branch?: 'CE' | 'SC' | 'SP') => {
    if (products.length === 0) return;

    const filteredProducts = branch
      ? products.filter(p => (p[`stock_${branch.toLowerCase()}` as keyof Product] as number) > 0)
      : products;

    if (filteredProducts.length === 0) {
      alert(branch
        ? `Nenhum produto com estoque na filial ${branch} nos resultados atuais.`
        : 'Nenhum produto para exportar.'
      );
      return;
    }

    const headers = branch
      ? ['Código', 'Produto', 'Marca', `Estoque ${branch}`, 'Total Geral']
      : ['Código', 'Produto', 'Marca', 'Estoque CE', 'Estoque SC', 'Estoque SP', 'Total Geral'];

    const csvRows = [
      headers.join(';'),
      ...filteredProducts.map(p => {
        const row = [
          p.id,
          `"${p.name.replace(/"/g, '""')}"`,
          `"${(p.brand || '').replace(/"/g, '""')}"`
        ];

        if (branch) {
          row.push(
            String(p[`stock_${branch.toLowerCase()}` as keyof Product] ?? 0),
            String((p.stock_ce ?? 0) + (p.stock_sc ?? 0) + (p.stock_sp ?? 0))
          );
        } else {
          row.push(
            String(p.stock_ce ?? 0),
            String(p.stock_sc ?? 0),
            String(p.stock_sp ?? 0),
            String((p.stock_ce ?? 0) + (p.stock_sc ?? 0) + (p.stock_sp ?? 0))
          );
        }
        return row.join(';');
      })
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const filename = branch
      ? `estoque_${branch.toLowerCase()}_${date}.csv`
      : `relatorio_estoque_geral_${date}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

              {/* Botão de Sincronização (Visível apenas para o usuário Master) */}
              {userEmail === 'paulofernandoautomacao@gmail.com' && (
                <button
                  onClick={() => handleSyncSC()}
                  disabled={syncing}
                  className={`ml-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${syncing
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800'
                    }`}
                  title="Sincronizar Estoque SC (API)"
                >
                  <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Sincronizando...' : 'Sync SC'}
                </button>
              )}
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
              <div className="flex items-center gap-4">
                <div className="text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1 rounded-full dark:bg-slate-800 dark:text-slate-300">
                  {products.length} produtos encontrados
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1">
                    <Download className="w-3 h-3" /> CSV:
                  </span>
                  <button
                    onClick={() => handleDownloadCSV()}
                    className="px-2 py-1 text-[10px] font-bold bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-green-50 hover:text-green-600 transition-colors"
                  >
                    Geral
                  </button>
                  {(['CE', 'SC', 'SP'] as const).map(branch => (
                    <button
                      key={branch}
                      onClick={() => handleDownloadCSV(branch)}
                      className="px-2 py-1 text-[10px] font-bold bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-green-50 hover:text-green-600 transition-colors"
                    >
                      {branch}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handlePrint}
                  className="p-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-all flex items-center gap-2 shadow-sm group"
                  title="Imprimir relatório atual"
                >
                  <Printer className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium">Imprimir</span>
                </button>
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