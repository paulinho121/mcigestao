import React, { useState } from 'react';
import {
    Search,
    Truck,
    Package,
    MapPin,
    Calendar,
    CheckCircle2,
    Clock,
    AlertCircle,
    ArrowRight,
    FileText,
    ExternalLink,
    Info,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { jamefService, JamefTrackingItem } from '../services/jamefService';

export const Tracking: React.FC = () => {
    const [document, setDocument] = useState('');
    const [docType, setDocType] = useState<'pagador' | 'remetente' | 'destinatario'>('pagador');
    const [number, setNumber] = useState('');
    const [numType, setNumType] = useState<'notaFiscal' | 'cte'>('notaFiscal');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<JamefTrackingItem | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedEvent, setExpandedEvent] = useState<number | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!document || !number) {
            setError('Por favor, preencha o documento e o número da nota ou CT-e.');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await jamefService.trackCargo({
                documento: document.replace(/\D/g, ''),
                docType,
                numero: number,
                numType,
                useProduction: false // Default to QA for testing
            });

            if (response.sucesso && response.items.length > 0) {
                setResult(response.items[0]);
            } else {
                setError(response.mensagem || 'Nenhuma carga encontrada com os dados informados.');
            }
        } catch (err) {
            setError('Ocorreu um erro ao consultar o rastreamento.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        const s = status.toUpperCase();
        if (s.includes('ENTREG')) return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400';
        if (s.includes('TRANSPORTE') || s.includes('VIAGEM')) return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400';
        if (s.includes('PROBLEMA') || s.includes('PEND')) return 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400';
        return 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-400';
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 transition-colors duration-300 font-sans">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-brand-600 to-brand-800 pt-10 pb-20 sm:pt-12 sm:pb-24 px-4 sm:px-6 lg:px-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-accent-DEFAULT/10 rounded-full blur-3xl"></div>

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center justify-center p-2.5 sm:p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 mb-4 sm:mb-6 shadow-xl animate-bounce-slow">
                        <Truck className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3 sm:mb-4 drop-shadow-sm">
                        Rastreamento <span className="hidden xs:inline">de Carga</span> <span className="text-accent-DEFAULT italic">JAMEF</span>
                    </h1>
                    <p className="text-brand-100 text-base sm:text-lg md:text-xl max-w-2xl mx-auto opacity-90 leading-relaxed px-2">
                        Acompanhe suas entregas em tempo real com transparência e precisão logística.
                    </p>
                </div>
            </div>

            {/* Search Card */}
            <div className="max-w-4xl mx-auto px-4 -mt-12 sm:-mt-16 relative z-20">
                <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl border border-white dark:border-slate-700 p-5 sm:p-8 md:p-10 backdrop-blur-xl transition-all duration-300">
                    <form onSubmit={handleSearch} className="space-y-6 sm:space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                            {/* Document Section */}
                            <div className="space-y-3 sm:space-y-4">
                                <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                    <FileText className="w-4 h-4 text-brand-500" />
                                    Identificação
                                </label>
                                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner overflow-x-auto scrollbar-hide">
                                    {(['pagador', 'remetente', 'destinatario'] as const).map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setDocType(type)}
                                            className={`flex-1 min-w-[80px] py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold uppercase rounded-xl transition-all duration-300 ${docType === type
                                                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-md ring-1 ring-slate-200 dark:ring-slate-600'
                                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={document}
                                        onChange={(e) => setDocument(e.target.value)}
                                        placeholder="CNPJ ou CPF (apenas números)"
                                        className="w-full pl-4 pr-10 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all outline-none text-sm sm:text-base font-medium dark:text-white dark:placeholder-slate-500"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                        <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                </div>
                            </div>

                            {/* Number Section */}
                            <div className="space-y-3 sm:space-y-4">
                                <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                    <Search className="w-4 h-4 text-brand-500" />
                                    {numType === 'notaFiscal' ? 'Nota Fiscal' : 'CT-e'}
                                </label>
                                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
                                    {(['notaFiscal', 'cte'] as const).map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setNumType(type)}
                                            className={`flex-1 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold uppercase rounded-xl transition-all duration-300 ${numType === type
                                                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-md ring-1 ring-slate-200 dark:ring-slate-600'
                                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                                }`}
                                        >
                                            {type === 'notaFiscal' ? 'Nota Fiscal' : 'CT-e'}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={number}
                                        onChange={(e) => setNumber(e.target.value)}
                                        placeholder={numType === 'notaFiscal' ? 'Número da Nota' : 'Número do CT-e'}
                                        className="w-full pl-4 pr-10 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all outline-none text-sm sm:text-base font-medium dark:text-white dark:placeholder-slate-500"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-500 transition-colors">
                                        <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 sm:py-5 rounded-2xl font-black text-base sm:text-lg uppercase tracking-widest shadow-xl transition-all duration-500 flex items-center justify-center gap-3 active:scale-[0.98] ${loading
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-brand-600 hover:bg-brand-700 text-white hover:shadow-brand-500/30'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 border-4 border-slate-300 border-t-brand-500 rounded-full animate-spin"></div>
                                    Consultando...
                                </>
                            ) : (
                                <>
                                    Rastrear Agora
                                    <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                                </>
                            )}
                        </button>
                    </form>

                    {error && (
                        <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-sm sm:text-base text-red-800 dark:text-red-400">Oops! Algo deu errado</h4>
                                <p className="text-red-600 dark:text-red-300 text-xs sm:text-sm mt-1">{error}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Results Area */}
            {result && (
                <div className="max-w-4xl mx-auto px-4 mt-8 sm:mt-12 space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {/* Status Header */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-brand-500/5 rounded-full blur-2xl"></div>

                        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shadow-lg border border-brand-100 dark:border-brand-800 flex-shrink-0">
                                <Package className="w-8 h-8 sm:w-10 sm:h-10 text-brand-600 dark:text-brand-400" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Atual</div>
                                <div className={`px-3 sm:px-4 py-1.5 rounded-full text-sm sm:text-base font-black border-2 inline-block ${getStatusColor(result.status)}`}>
                                    {result.status}
                                </div>
                                <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-center sm:justify-start gap-1.5 font-medium">
                                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-500" />
                                    Previsão: <span className="font-bold text-slate-700 dark:text-slate-200">{new Date(result.dataPrevisaoEntrega).toLocaleDateString('pt-BR')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-px w-full md:h-16 md:w-px bg-slate-100 dark:bg-slate-700 hidden md:block"></div>

                        <div className="flex flex-col items-center md:items-end text-center md:text-right w-full md:w-auto">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Documentos</div>
                            <div className="flex flex-wrap justify-center md:justify-end gap-3 sm:gap-1 sm:flex-col">
                                <div className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                                    NF: <span className="text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded ml-1">{result.numeroNotaFiscal}</span>
                                </div>
                                <div className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
                                    CT-e: {result.numeroCte}
                                </div>
                            </div>
                            {result.linkComprovante && (
                                <a
                                    href={result.linkComprovante}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-4 flex items-center gap-2 text-[10px] sm:text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2.5 rounded-xl transition-all border border-brand-100 w-full sm:w-auto justify-center"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    VER COMPROVANTE
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-6 sm:p-10">
                        <div className="flex items-center justify-between mb-8 sm:mb-10">
                            <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-brand-500" />
                                Histórico
                            </h3>
                            <div className="h-1 flex-1 mx-4 sm:mx-6 bg-slate-100 dark:bg-slate-700 rounded-full hidden sm:block"></div>
                            <div className="sm:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo Real</div>
                        </div>

                        <div className="space-y-0 relative">
                            {/* Vertical line connecting events */}
                            <div className="absolute left-[20px] sm:left-[27px] top-6 bottom-6 w-0.5 sm:w-1 bg-gradient-to-b from-brand-500 via-brand-400 to-slate-200 dark:to-slate-700 rounded-full"></div>

                            {result.eventos.map((evento, index) => {
                                const isLatest = index === result.eventos.length - 1;
                                const isExpanded = expandedEvent === index;

                                return (
                                    <div
                                        key={index}
                                        className={`relative pl-12 sm:pl-16 pb-8 sm:pb-12 last:pb-0 transition-all duration-500 ${isLatest ? 'opacity-100 scale-100' : 'opacity-80 hover:opacity-100'}`}
                                    >
                                        {/* Status Icon */}
                                        <div className={`absolute left-0 w-10 h-10 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center z-10 border-2 sm:border-4 border-white dark:border-slate-800 shadow-xl transition-all duration-300 ${isLatest
                                            ? 'bg-brand-600 text-white scale-110 shadow-brand-500/20'
                                            : 'bg-white dark:bg-slate-700 text-slate-400'
                                            }`}>
                                            {isLatest ? <Truck className="w-4 h-4 sm:w-6 sm:h-6" /> : <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6" />}
                                        </div>

                                        {/* Event Content */}
                                        <div
                                            className={`p-4 sm:p-6 rounded-2xl border transition-all duration-300 cursor-pointer ${isLatest
                                                ? 'bg-brand-50/50 dark:bg-brand-900/10 border-brand-200 dark:border-brand-800'
                                                : 'bg-slate-50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800 hover:border-slate-200'
                                                }`}
                                            onClick={() => setExpandedEvent(isExpanded ? null : index)}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 text-[10px] sm:text-xs">
                                                        <span className={`font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${isLatest
                                                            ? 'bg-brand-600 text-white'
                                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                                            }`}>
                                                            {evento.data}
                                                        </span>
                                                        <span className="font-bold text-slate-400">{evento.hora}</span>
                                                    </div>
                                                    <h4 className={`text-sm sm:text-base font-black uppercase tracking-tight ${isLatest ? 'text-brand-900 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {evento.descricao}
                                                    </h4>
                                                </div>
                                                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto border-t sm:border-t-0 border-slate-200 dark:border-slate-700 pt-3 sm:pt-0 mt-1 sm:mt-0">
                                                    <div className="flex items-center gap-1.5 text-[11px] sm:text-sm font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex-shrink-0">
                                                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-brand-500" />
                                                        {evento.cidade} - {evento.uf}
                                                    </div>
                                                    <div className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                                        {isExpanded ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />}
                                                    </div>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-600 dark:text-slate-400 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    Detalhes logísticos registrados: {evento.descricao} em {evento.cidade}/{evento.uf} às {evento.hora}.
                                                    A API Jamef garante a integridade dos dados para o monitoramento corporativo em tempo real.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            }).reverse()}
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State / Welcome */}
            {!result && !loading && !error && (
                <div className="max-w-4xl mx-auto px-6 mt-16 sm:mt-20 text-center animate-pulse-slow">
                    <div className="inline-flex items-center gap-2 px-4 sm:px-6 py-1.5 sm:py-2 bg-slate-200/50 dark:bg-slate-800/50 rounded-full text-slate-500 dark:text-slate-400 text-[10px] sm:text-sm font-black uppercase tracking-widest mb-4">
                        <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Pronto para monitorar
                    </div>
                    <p className="text-slate-400 dark:text-slate-500 font-medium text-sm sm:text-base max-w-sm mx-auto leading-relaxed">
                        Insira os dados da <span className="text-slate-600 dark:text-slate-300 font-bold">Nota Fiscal</span> ou <span className="text-slate-600 dark:text-slate-300 font-bold">CT-e</span> acima para visualizar o progresso.
                    </p>
                </div>
            )}
        </div>
    );
};
