import { useState, useEffect } from 'react';
import { logService, ActivityLog, LogFilters } from '../services/logService';
import { FileText, Filter, Download, RefreshCw, ChevronDown, ChevronUp, Calendar, User, Activity } from 'lucide-react';

const ACTION_TYPE_LABELS: Record<string, string> = {
    stock_adjustment: 'Ajuste de Estoque',
    product_created: 'Produto Criado',
    product_updated: 'Produto Atualizado',
    product_deleted: 'Produto Excluído',
    reservation_created: 'Reserva Criada',
    reservation_cancelled: 'Reserva Cancelada',
    xml_processed: 'XML Processado',
    rental_created: 'Locação Criada',
    rental_completed: 'Locação Finalizada',
};

const ACTION_TYPE_COLORS: Record<string, string> = {
    stock_adjustment: 'bg-blue-100 text-blue-700',
    product_created: 'bg-green-100 text-green-700',
    product_updated: 'bg-yellow-100 text-yellow-700',
    product_deleted: 'bg-red-100 text-red-700',
    reservation_created: 'bg-purple-100 text-purple-700',
    reservation_cancelled: 'bg-orange-100 text-orange-700',
    xml_processed: 'bg-indigo-100 text-indigo-700',
    rental_created: 'bg-teal-100 text-teal-700',
    rental_completed: 'bg-cyan-100 text-cyan-700',
};

export const ActivityLogs: React.FC = () => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    const [filters, setFilters] = useState<LogFilters>({
        startDate: '',
        endDate: '',
        actionType: '',
        entityType: '',
        userEmail: '',
        search: '',
    });

    const pageSize = 20;

    useEffect(() => {
        loadLogs();
    }, [page, filters]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const result = await logService.getActivityLogs(filters, page, pageSize);
            setLogs(result.logs);
            setTotal(result.total);
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key: keyof LogFilters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1); // Reset to first page when filtering
    };

    const clearFilters = () => {
        setFilters({
            startDate: '',
            endDate: '',
            actionType: '',
            entityType: '',
            userEmail: '',
            search: '',
        });
        setPage(1);
    };

    const exportToCSV = () => {
        const headers = ['Data/Hora', 'Usuário', 'Ação', 'Entidade', 'ID', 'Descrição'];
        const rows = logs.map(log => [
            new Date(log.created_at!).toLocaleString('pt-BR'),
            log.user_name || log.user_email,
            ACTION_TYPE_LABELS[log.action_type] || log.action_type,
            log.entity_type,
            log.entity_id || '',
            log.details?.description || '',
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `logs_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <FileText className="w-8 h-8 text-brand-600" />
                            Logs de Atividades
                        </h1>
                        <p className="text-slate-600 mt-1">Auditoria completa de ações no sistema</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="px-4 py-2 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2"
                        >
                            <Filter className="w-4 h-4" />
                            Filtros
                        </button>
                        <button
                            onClick={loadLogs}
                            className="px-4 py-2 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Atualizar
                        </button>
                        <button
                            onClick={exportToCSV}
                            disabled={logs.length === 0}
                            className="px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download className="w-4 h-4" />
                            Exportar CSV
                        </button>
                    </div>
                </div>

                {/* Filtros */}
                {showFilters && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    <Calendar className="w-4 h-4 inline mr-1" />
                                    Data Início
                                </label>
                                <input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    <Calendar className="w-4 h-4 inline mr-1" />
                                    Data Fim
                                </label>
                                <input
                                    type="date"
                                    value={filters.endDate}
                                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    <Activity className="w-4 h-4 inline mr-1" />
                                    Tipo de Ação
                                </label>
                                <select
                                    value={filters.actionType}
                                    onChange={(e) => handleFilterChange('actionType', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                >
                                    <option value="">Todas</option>
                                    {Object.entries(ACTION_TYPE_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="lg:col-span-3">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Buscar
                                </label>
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                    placeholder="Buscar por descrição ou ID..."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={clearFilters}
                                className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                Limpar Filtros
                            </button>
                        </div>
                    </div>
                )}

                {/* Estatísticas */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-600">
                            Mostrando <span className="font-semibold text-slate-900">{logs.length}</span> de{' '}
                            <span className="font-semibold text-slate-900">{total}</span> registros
                        </p>
                        <p className="text-sm text-slate-600">
                            Página {page} de {totalPages || 1}
                        </p>
                    </div>
                </div>

                {/* Lista de Logs */}
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600">Nenhum log encontrado</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {logs.map((log) => (
                            <div key={log.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div
                                    className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id!)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ACTION_TYPE_COLORS[log.action_type] || 'bg-gray-100 text-gray-700'}`}>
                                                    {ACTION_TYPE_LABELS[log.action_type] || log.action_type}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {new Date(log.created_at!).toLocaleString('pt-BR')}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-900 font-medium mb-1">
                                                {log.details?.description || 'Sem descrição'}
                                            </p>
                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    {log.user_name || log.user_email}
                                                </span>
                                                {log.entity_id && (
                                                    <span>ID: {log.entity_id}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            {expandedLog === log.id ? (
                                                <ChevronUp className="w-5 h-5 text-slate-400" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-slate-400" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Detalhes Expandidos */}
                                {expandedLog === log.id && (
                                    <div className="border-t border-slate-200 bg-slate-50 p-4">
                                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Detalhes</h4>
                                        <div className="bg-white rounded-lg p-3 text-xs font-mono">
                                            <pre className="whitespace-pre-wrap text-slate-700">
                                                {JSON.stringify(log.details, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Paginação */}
                {totalPages > 1 && (
                    <div className="mt-6 flex justify-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Anterior
                        </button>
                        <span className="px-4 py-2 bg-white border border-slate-300 rounded-lg">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Próxima
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
