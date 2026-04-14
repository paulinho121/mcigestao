import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { nfeService } from '../services/nfeService';
import { RefreshCw, CheckCircle, AlertCircle, Clock, FileText, ArrowRight, ArrowLeft, Search, Filter, ShieldCheck } from 'lucide-react';
import { logService } from '../services/logService';

interface NfeLog {
  id: string;
  access_key: string;
  nfe_number: string;
  series: string;
  branch: string;
  operation_type: 'entry' | 'exit';
  processed_at: string;
  status: string;
  error_message?: string;
  cnpj_monitored: string;
}

export const NfeAutomation: React.FC = () => {
  const [logs, setLogs] = useState<NfeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'entry' | 'exit'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('nfe_automation_history')
      .select('*')
      .order('processed_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching NFe logs:', error);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await nfeService.syncFromSefaz();
      alert(`Sincronização concluída!\nProcessados: ${result.processed}\nErros: ${result.errors}`);
      fetchLogs();
    } catch (err) {
      alert('Erro ao sincronizar com SEFAZ');
    } finally {
      setSyncing(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.operation_type === filter;
    const matchesSearch = 
      log.nfe_number.includes(searchQuery) || 
      log.access_key.includes(searchQuery) ||
      log.branch.includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-brand-600" />
              Automação SEFAZ
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Controle automático de estoque baseado em emissão de Notas Fiscais (CE e SP).
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-200 dark:shadow-none font-semibold disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar Agora
            </button>
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Monitorados</p>
            <div className="flex gap-2 mt-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded"> CE: 055...11 </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded"> SP: 055...83 </span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Processados (100 mais recentes)</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{logs.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Status do Servidor</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="font-semibold text-green-600">Ativo</span>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por NFe, Chave ou Filial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2 text-slate-700 dark:text-slate-300"
            >
              <option value="all">Todas Operações</option>
              <option value="entry">Entradas (Compra)</option>
              <option value="exit">Saídas (Venda)</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">NFe / Chave</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Operação</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Filial</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Procesamento</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Carregando histórico...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Nenhum registro encontrado.</td>
                </tr>
              ) : filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <FileText className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">NFe {log.nfe_number}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]" title={log.access_key}>
                          {log.access_key}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      log.operation_type === 'entry' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {log.operation_type === 'entry' ? <ArrowRight className="w-3 h-3" /> : <ArrowLeft className="w-3 h-3" />}
                      {log.operation_type === 'entry' ? 'ENTRADA' : 'SAÍDA'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-600">
                      {log.branch}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(log.processed_at).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.processed_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center gap-2">
                       {log.status === 'processed' ? (
                         <span className="text-green-600 dark:text-green-400 text-sm font-bold flex items-center gap-1">
                           <CheckCircle className="w-4 h-4" /> Sucesso
                         </span>
                       ) : (
                         <span className="text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-1" title={log.error_message}>
                           <AlertCircle className="w-4 h-4" /> Erro
                         </span>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
