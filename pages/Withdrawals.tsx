import React, { useState, useEffect } from 'react';
import { PackageCheck, Plus, Search, Calendar, MapPin, Image as ImageIcon, ClipboardList, Filter, Download, Printer, LayoutGrid, List, FileText, AlertTriangle } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import { WithdrawalProtocol } from '../types';
import { WithdrawalModal } from '../components/modals/WithdrawalModal';
import { ProtocolDetailsModal } from '../components/modals/ProtocolDetailsModal';
import { WithdrawalReceipt } from '../components/reports/WithdrawalReceipt';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WithdrawalsProps {
    userEmail: string;
}

export const Withdrawals: React.FC<WithdrawalsProps> = ({ userEmail }) => {
    const [protocols, setProtocols] = useState<WithdrawalProtocol[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [printingProtocol, setPrintingProtocol] = useState<WithdrawalProtocol | null>(null);
    const [detailsProtocol, setDetailsProtocol] = useState<WithdrawalProtocol | null>(null);

    const fetchProtocols = async () => {
        setLoading(true);
        try {
            const data = await inventoryService.getWithdrawalProtocols();
            setProtocols(data);
        } catch (error) {
            console.error('Error fetching protocols:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProtocols();
    }, []);

    const filteredProtocols = protocols.filter(p => 
        p.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.receiver_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.items?.some(item => item.product_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handlePrint = (protocol: WithdrawalProtocol) => {
        setPrintingProtocol(protocol);
        setTimeout(() => {
            window.print();
            setPrintingProtocol(null);
        }, 100);
    };

    const overdueProtocols = protocols.filter(p => 
        !p.invoice_number && 
        (new Date().getTime() - new Date(p.created_at).getTime()) / (1000 * 3600 * 24) >= 7
    );

    const getStatusColor = (createdAt: string, hasInvoice: boolean) => {
        if (hasInvoice) return 'bg-emerald-500';
        const diffDays = (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 3600 * 24);
        if (diffDays < 3) return 'bg-emerald-500';
        if (diffDays < 7) return 'bg-amber-500';
        return 'bg-red-500';
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
            {/* Alarm Banner for Super Users */}
            {overdueProtocols.length > 0 && (
                <div className="mb-8 p-6 bg-red-600 rounded-3xl text-white shadow-xl shadow-red-500/20 flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center animate-pulse">
                            <AlertTriangle className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">Alarme: Pendências de Faturamento</h3>
                            <p className="text-white/80 text-sm font-medium">
                                Existem <strong className="text-white">{overdueProtocols.length}</strong> protocolos sem Nota Fiscal há mais de 7 dias. 
                                <span className="block md:inline md:ml-1 opacity-70">Acione o vendedor responsável imediatamente.</span>
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            const firstOverdue = overdueProtocols[0];
                            setDetailsProtocol(firstOverdue);
                        }}
                        className="px-6 py-3 bg-white text-red-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-50 transition-all shadow-lg active:scale-95 whitespace-nowrap"
                    >
                        Verificar Pendências
                    </button>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
                        <PackageCheck className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Protocolos de Retirada</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Controle de saída e comprovação de entrega</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => fetchProtocols()}
                        className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                        title="Atualizar"
                    >
                        <ClipboardList className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20 transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <Plus className="w-5 h-5" />
                        Nova Retirada
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Hoje', value: protocols.filter(p => new Date(p.created_at).toDateString() === new Date().toDateString()).length, icon: Calendar, color: 'brand' },
                    { label: 'Este Mês', value: protocols.filter(p => new Date(p.created_at).getMonth() === new Date().getMonth()).length, icon: ClipboardList, color: 'amber' },
                    { label: 'Unidades SC', value: protocols.filter(p => p.branch === 'SC').length, icon: MapPin, color: 'blue' },
                    { label: 'Unidades CE/SP', value: protocols.filter(p => p.branch !== 'SC').length, icon: MapPin, color: 'emerald' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 flex items-center justify-center text-${stat.color}-600 dark:text-${stat.color}-400`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter & Search */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar por cliente, produto ou recebedor..."
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-brand-500 transition-all dark:text-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mr-2">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 transition-all">
                        <Filter className="w-4 h-4" /> Filtros
                    </button>
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 transition-all">
                        <Download className="w-4 h-4" /> Exportar
                    </button>
                </div>
            </div>

            {/* Protocols List */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-white dark:bg-slate-800 h-48 rounded-3xl animate-pulse border border-slate-100 dark:border-slate-700"></div>
                    ))}
                </div>
            ) : filteredProtocols.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-4">
                        <Search className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Nenhum protocolo encontrado</h3>
                    <p className="text-slate-500">Tente ajustar sua busca ou crie uma nova retirada.</p>
                </div>
            ) : (
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProtocols.map(protocol => (
                        <div 
                            key={protocol.id} 
                            onClick={() => setDetailsProtocol(protocol)} 
                            className={`bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border transition-all group overflow-hidden relative cursor-pointer ${
                                protocol.invoice_number 
                                ? 'border-green-200 dark:border-green-900/50 hover:border-green-300 dark:hover:border-green-800 hover:shadow-green-500/10' 
                                : getStatusColor(protocol.created_at, !!protocol.invoice_number) === 'bg-red-500' 
                                    ? 'border-red-200 dark:border-red-900/50 hover:border-red-300' 
                                    : getStatusColor(protocol.created_at, !!protocol.invoice_number) === 'bg-amber-500'
                                        ? 'border-amber-200 dark:border-amber-900/50 hover:border-amber-300'
                                        : 'border-slate-100 dark:border-slate-700 hover:border-brand-200'
                            }`}
                        >
                            {/* Status Indicator Stripe */}
                            <div className={`absolute top-0 left-0 w-1.5 h-full ${getStatusColor(protocol.created_at, !!protocol.invoice_number)}`} />
                            {/* Invoiced Status Overlay */}
                            {protocol.invoice_number && (
                                <div className="absolute -right-12 -top-12 w-24 h-24 bg-green-500/10 dark:bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/20 transition-all"></div>
                            )}
                            {/* Branch Badge */}
                            <div className="absolute top-0 right-0 p-4">
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                    protocol.branch === 'CE' ? 'bg-amber-100 text-amber-700' : 
                                    protocol.branch === 'SC' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                    {protocol.branch}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform ${
                                        protocol.invoice_number 
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600' 
                                        : 'bg-slate-100 dark:bg-slate-700 text-brand-600'
                                    }`}>
                                        <PackageCheck className="w-6 h-6" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-slate-900 dark:text-white truncate pr-12 text-lg">{protocol.customer_name}</h4>
                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> 
                                            {format(new Date(protocol.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                                        </p>
                                        {protocol.invoice_number && (
                                            <div className="mt-1 flex items-center gap-1 text-[10px] font-black text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded-md w-fit">
                                                <FileText className="w-3 h-3" /> NF: {protocol.invoice_number}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="py-4 border-y border-slate-50 dark:border-slate-700/50 space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        <span>Itens Liberados</span>
                                        <span className="text-brand-600">Total: {protocol.items?.reduce((acc, item) => acc + item.quantity, 0) || 0} un</span>
                                    </div>
                                    <div className="space-y-1">
                                        {protocol.items?.slice(0, 2).map(item => (
                                            <div key={item.id} className="flex justify-between text-xs">
                                                <span className="text-slate-600 dark:text-slate-400 truncate max-w-[180px]">{item.product_name}</span>
                                                <span className="font-bold dark:text-white">{item.quantity} un</span>
                                            </div>
                                        ))}
                                        {(protocol.items?.length || 0) > 2 && (
                                            <p className="text-[10px] text-slate-400 font-bold italic">+ {(protocol.items?.length || 0) - 2} outros itens...</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                            {protocol.receiver_name[0]}
                                        </div>
                                        <span className="text-xs text-slate-500 italic">Retirado por {protocol.receiver_name.split(' ')[0]}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                        {protocol.photo_url && (
                                            <a 
                                                href={protocol.photo_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-2 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-lg hover:bg-brand-100 transition-colors"
                                            title="Ver Foto"
                                        >
                                            <ImageIcon className="w-4 h-4" />
                                        </a>
                                    )}
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePrint(protocol);
                                        }}
                                        className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 transition-colors"
                                        title="Imprimir Protocolo"
                                    >
                                        <Printer className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                                        <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">ID / Data</th>
                                        <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                                        <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Unidade</th>
                                        <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Qtd</th>
                                        <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Recebedor</th>
                                        <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {filteredProtocols.map(protocol => (
                                        <tr 
                                            key={protocol.id} 
                                            onClick={() => setDetailsProtocol(protocol)}
                                            className={`transition-colors cursor-pointer group ${
                                                protocol.invoice_number 
                                                ? 'bg-green-50/30 dark:bg-green-900/10 hover:bg-green-50/60 dark:hover:bg-green-900/20' 
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/80'
                                            }`}
                                        >
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${getStatusColor(protocol.created_at, !!protocol.invoice_number)} animate-pulse`} />
                                                    <div>
                                                        <div className="font-bold text-slate-900 dark:text-white">#{protocol.id.slice(-6).toUpperCase()}</div>
                                                        <div className="text-xs text-slate-500 mt-1">{format(new Date(protocol.created_at), "dd/MM/yy HH:mm")}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 min-w-[200px]">
                                                <div className="font-bold text-slate-900 dark:text-white line-clamp-1">{protocol.customer_name}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-slate-500 line-clamp-1">
                                                        {protocol.items && protocol.items.length > 0 
                                                            ? `${protocol.items[0].product_name}${protocol.items.length > 1 ? ` + ${protocol.items.length - 1} itens` : ''}` 
                                                            : 'Sem itens'
                                                        }
                                                    </span>
                                                    {protocol.invoice_number && (
                                                        <span className="text-[10px] font-black text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded-md">
                                                            NF: {protocol.invoice_number}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                                                    protocol.branch === 'CE' ? 'bg-amber-100 text-amber-700' : 
                                                    protocol.branch === 'SC' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {protocol.branch}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="font-black text-brand-600">
                                                    {protocol.items?.reduce((acc, item) => acc + item.quantity, 0) || 0}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                        {protocol.receiver_name[0]}
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 line-clamp-1">{protocol.receiver_name}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {protocol.photo_url && (
                                                        <a 
                                                            href={protocol.photo_url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="p-2 bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100 transition-colors"
                                                            title="Ver Foto"
                                                        >
                                                            <ImageIcon className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePrint(protocol);
                                                        }}
                                                        className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                                                        title="Imprimir Protocolo"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}

            <WithdrawalModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSuccess={() => fetchProtocols()} 
                userEmail={userEmail}
            />

            <ProtocolDetailsModal
                isOpen={!!detailsProtocol}
                protocol={detailsProtocol}
                onClose={() => setDetailsProtocol(null)}
                onDelete={() => {
                    setDetailsProtocol(null);
                    fetchProtocols();
                }}
                userEmail={userEmail}
            />

            {/* Hidden container for printing from history */}
            <div className="hidden print:block print:fixed print:inset-0 print:z-[99999] print:bg-white overflow-visible">
                {printingProtocol && <WithdrawalReceipt protocol={printingProtocol} />}
            </div>
        </div>
    );
};
