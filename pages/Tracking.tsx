import React, { useState } from 'react';
import {
    Search,
    Truck,
    Package,
    MapPin,
    Calendar,
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
    const [docType, setDocType] = useState<'remetente' | 'destinatario'>('remetente');
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
                numType
            });

            if (response.sucesso && response.item) {
                setResult(response.item);
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
        if (s.includes('ENTREG')) return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
        if (s.includes('TRANSPORTE') || s.includes('VIAGEM') || s.includes('EMISSAO')) return 'text-sky-600 bg-sky-50 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.1)]';
        if (s.includes('PROBLEMA') || s.includes('PEND') || s.includes('FALHA')) return 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
        return 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] pb-20 transition-colors duration-500 font-sans selection:bg-brand-500/30 selection:text-brand-900">
            {/* Background decorative elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[120px]"></div>
            </div>

            {/* Hero Section */}
            <div className="relative pt-12 pb-24 sm:pt-16 sm:pb-32 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
                <div className="max-w-4xl mx-auto relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-500/10 dark:bg-brand-500/20 border border-brand-500/20 dark:border-brand-500/30 rounded-full text-brand-600 dark:text-brand-400 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-top-4 duration-1000">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                        </span>
                        Logística em Tempo Real
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter mb-6 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                        Rastreamento <span className="text-brand-500 italic font-medium tracking-tight">JAMEF</span>
                    </h1>

                    <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed px-4 font-medium opacity-80">
                        Sua mercadoria monitorada por inteligência logística. Insira seus dados abaixo para visualização completa do fluxo.
                    </p>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="max-w-4xl mx-auto px-4 -mt-16 sm:-mt-24 relative z-20">
                {/* Search Glass Card */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] border border-white dark:border-white/5 p-8 sm:p-12 transition-all duration-500 group hover:border-brand-500/20">
                    <form onSubmit={handleSearch} className="space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-16">
                            {/* Column 1: Identification */}
                            <div className="flex flex-col h-full">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between h-6">
                                        <label className="flex items-center gap-2.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">
                                            <FileText className="w-4 h-4 text-brand-500" />
                                            Identificação
                                        </label>
                                    </div>

                                    <div className="flex bg-slate-100/50 dark:bg-slate-950/50 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-inner">
                                        {(['remetente', 'destinatario'] as const).map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setDocType(type)}
                                                className={`flex-1 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-500 ${docType === type
                                                    ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-xl shadow-black/5 ring-1 ring-black/5 dark:ring-white/5 scale-[1.02]'
                                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                                    }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Symmetrical Helper Row */}
                                    <div className="flex items-center h-8">
                                        <div className="flex gap-2">
                                            {[
                                                { label: 'SC', value: '05502390000200' },
                                                { label: 'SP', value: '05502390000383' },
                                                { label: 'CE', value: '05502390000111' }
                                            ].map((cnpj) => (
                                                <button
                                                    key={cnpj.value}
                                                    type="button"
                                                    onClick={() => setDocument(cnpj.value)}
                                                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all border ${document === cnpj.value
                                                        ? 'bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-500/20'
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-brand-500/50 hover:text-brand-500'
                                                        }`}
                                                >
                                                    {cnpj.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="relative group">
                                        <input
                                            type="text"
                                            value={document}
                                            onChange={(e) => setDocument(e.target.value)}
                                            placeholder="CNPJ ou CPF"
                                            className="w-full pl-6 pr-12 py-5 bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-slate-800/50 rounded-2xl focus:border-brand-500/30 focus:bg-white dark:focus:bg-slate-900 focus:ring-[12px] focus:ring-brand-500/5 transition-all outline-none text-sm font-bold dark:text-white dark:placeholder-slate-700 shadow-sm"
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none text-slate-300 dark:text-slate-700 group-focus-within:text-brand-500 transition-colors">
                                            <Info className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Column 2: Documentation */}
                            <div className="flex flex-col h-full">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between h-6">
                                        <label className="flex items-center gap-2.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">
                                            <Search className="w-4 h-4 text-brand-500" />
                                            Documentação
                                        </label>
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase tracking-[0.2em] border border-emerald-500/20">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            LIVE PROD
                                        </div>
                                    </div>

                                    <div className="flex bg-slate-100/50 dark:bg-slate-950/50 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-inner">
                                        {(['notaFiscal', 'cte'] as const).map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setNumType(type)}
                                                className={`flex-1 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-500 ${numType === type
                                                    ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-xl shadow-black/5 ring-1 ring-black/5 dark:ring-white/5 scale-[1.02]'
                                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                                    }`}
                                            >
                                                {type === 'notaFiscal' ? 'Nota Fiscal' : 'CT-e'}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Symmetrical Helper Row (Matching Height) */}
                                    <div className="flex items-center h-8">
                                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest opacity-60">
                                            Insira o número identificador
                                        </span>
                                    </div>

                                    <div className="relative group">
                                        <input
                                            type="text"
                                            value={number}
                                            onChange={(e) => setNumber(e.target.value)}
                                            placeholder={numType === 'notaFiscal' ? 'Número da Nota' : 'Número do CT-e'}
                                            className="w-full pl-6 pr-12 py-5 bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-slate-800/50 rounded-2xl focus:border-brand-500/30 focus:bg-white dark:focus:bg-slate-900 focus:ring-[12px] focus:ring-brand-500/5 transition-all outline-none text-sm font-bold dark:text-white dark:placeholder-slate-700 shadow-sm"
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none text-slate-300 dark:text-slate-700 group-focus-within:text-brand-500 transition-colors">
                                            <Package className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`group relative w-full py-5 rounded-2xl font-black text-base sm:text-lg uppercase tracking-[0.3em] transition-all duration-500 flex items-center justify-center gap-4 overflow-hidden active:scale-[0.97] ${loading
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                : 'bg-brand-600 hover:bg-brand-500 text-white shadow-xl'
                                }`}
                        >
                            <div className="absolute inset-0 w-1/4 h-full bg-white/10 -skew-x-[45deg] translate-x-[-200%] group-hover:translate-x-[400%] transition-transform duration-1000 ease-in-out"></div>
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-[3px] border-slate-300 border-t-brand-500 rounded-full animate-spin"></div>
                                    <span>Syncing...</span>
                                </>
                            ) : (
                                <>
                                    <span>Buscar Mercadoria</span>
                                    <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </button>
                    </form>

                    {error && (
                        <div className="mt-8 p-6 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-start gap-5 animate-in fade-in slide-in-from-top-4">
                            <div className="p-3 bg-rose-500/20 rounded-2xl">
                                <AlertCircle className="w-6 h-6 text-rose-500" />
                            </div>
                            <div>
                                <h4 className="font-black text-sm uppercase tracking-widest text-rose-600 dark:text-rose-400">Interrupção no Fluxo</h4>
                                <p className="text-rose-500/80 text-xs sm:text-sm mt-1 font-bold">{error}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Section */}
                {result && (
                    <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                        {/* Status Dashboard */}
                        <div className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-2xl rounded-[2.5rem] border border-white dark:border-white/5 p-8 flex flex-col lg:flex-row items-center justify-between gap-10">

                            <div className="flex flex-col sm:flex-row items-center gap-8 text-center sm:text-left">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-brand-500 blur-2xl opacity-20"></div>
                                    <div className="w-24 h-24 rounded-[2rem] bg-brand-500 dark:bg-brand-600 flex items-center justify-center shadow-2xl relative z-10 scale-105 transition-transform hover:rotate-12">
                                        <Package className="w-12 h-12 text-white" />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em]">Status Operacional</div>
                                    <div className={`px-5 py-2.5 rounded-full text-sm sm:text-base font-black border uppercase tracking-wider ${getStatusColor(result.eventosRastreio?.[0]?.status || 'Inexistente')}`}>
                                        {result.eventosRastreio?.[0]?.status || 'Indeterminado'}
                                    </div>
                                    <div className="flex items-center justify-center sm:justify-start gap-2.5 p-2 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <Calendar className="w-4 h-4 text-brand-500" />
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                                            Previsão: <span className="text-slate-900 dark:text-white ml-1">{result.frete?.previsaoEntrega ? new Date(result.frete.previsaoEntrega).toLocaleDateString('pt-BR') : 'Sem dados'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden lg:block w-px h-24 bg-gradient-to-b from-transparent via-slate-200 dark:via-slate-800 to-transparent"></div>

                            <div className="grid grid-cols-2 gap-x-12 gap-y-4 w-full lg:w-auto">
                                <div className="space-y-1">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nota Fiscal</div>
                                    <div className="text-xl font-black text-brand-600 dark:text-brand-400 tracking-tighter">{result.notaFiscal?.numero || '---'}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Série</div>
                                    <div className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">{result.notaFiscal?.serie || '---'}</div>
                                </div>
                                <div className="space-y-1 col-span-2 pt-2 border-t border-slate-100 dark:border-slate-900">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Número CT-e</div>
                                    <div className="text-sm font-bold text-slate-500 dark:text-slate-400">{result.conhecimento?.numero || '---'}</div>
                                </div>
                            </div>

                            {result.frete?.urlComprovanteEntrega && (
                                <a
                                    href={result.frete.urlComprovanteEntrega}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group/btn flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    <span>Comprovante</span>
                                </a>
                            )}
                        </div>

                        {/* Professional Timeline */}
                        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white dark:border-white/5 overflow-hidden shadow-2xl">
                            <div className="p-8 sm:p-10 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                                        <Clock className="w-6 h-6 text-brand-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Timeline Logística</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Histórico de Movimentação</p>
                                    </div>
                                </div>
                                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tempo Real</span>
                                </div>
                            </div>

                            <div className="p-8 sm:p-12 space-y-0 relative">
                                {/* The "Tube" line */}
                                <div className="absolute left-[39px] sm:left-[55px] top-12 bottom-12 w-1 sm:w-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-full">
                                    <div className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-brand-500 via-brand-400/50 to-transparent rounded-full shadow-[0_0_15px_rgba(var(--brand-rgb),0.3)]"></div>
                                </div>

                                {result.eventosRastreio.map((evento, index) => {
                                    const isLatest = index === 0;
                                    const isExpanded = expandedEvent === index;
                                    const eventDate = new Date(evento.data);

                                    return (
                                        <div key={index} className="relative group/item pl-16 sm:pl-24 pb-12 last:pb-0">
                                            {/* Step Marker */}
                                            <div className="absolute left-[-15px] sm:left-[-5px] top-1 flex flex-col items-center">
                                                <div className={`relative w-12 h-12 sm:w-16 sm:h-16 rounded-[1.2rem] flex items-center justify-center z-10 border-4 border-[#fff] dark:border-[#0f172a] shadow-2xl transition-all duration-500 group-hover/item:scale-110 ${isLatest
                                                    ? 'bg-brand-600 text-white ring-[8px] ring-brand-500/10 shadow-xl'
                                                    : 'bg-white dark:bg-slate-900 text-slate-300 dark:text-slate-700 border-2 sm:border-4'
                                                    }`}>
                                                    {isLatest ? <Truck className="w-6 h-6 sm:w-8 sm:h-8" /> : <div className="w-3 h-3 rounded-full bg-current"></div>}
                                                </div>
                                            </div>

                                            {/* Event Card */}
                                            <div
                                                className={`group p-6 sm:p-8 rounded-[2rem] border transition-all duration-500 cursor-pointer hover:shadow-2xl hover:shadow-black/5 dark:hover:shadow-white/5 ${isLatest
                                                    ? 'bg-white dark:bg-slate-900 border-brand-500/30'
                                                    : 'bg-transparent border-slate-100 dark:border-slate-800/50 hover:bg-slate-100/30'
                                                    }`}
                                                onClick={() => setExpandedEvent(isExpanded ? null : index)}
                                            >
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${isLatest ? 'bg-brand-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                                {eventDate.toLocaleDateString('pt-BR')}
                                                            </div>
                                                            <div className="text-xs font-black text-slate-400 dark:text-slate-600 transition-colors group-hover/item:text-brand-500">
                                                                {eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                        <h4 className={`text-base sm:text-lg font-black uppercase tracking-tight leading-tight ${isLatest ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                                            {evento.status}
                                                        </h4>
                                                    </div>

                                                    <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-5 md:pt-0">
                                                        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100/50 dark:border-slate-800 shadow-sm transition-transform group-hover:translate-x-[-4px]">
                                                            <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center">
                                                                <MapPin className="w-4 h-4 text-brand-500" />
                                                            </div>
                                                            <div className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-tighter">
                                                                {evento.localOrigem?.cidade || 'Central Jamef'}
                                                                <span className="text-slate-300 dark:text-slate-700 mx-1.5 font-normal">|</span>
                                                                <span className="text-brand-500">{evento.localOrigem?.uf || 'BR'}</span>
                                                            </div>
                                                        </div>
                                                        <div className={`p-2 rounded-xl transition-all ${isExpanded ? 'bg-brand-500/10 text-brand-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'}`}>
                                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />}
                                                        </div>
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-sm font-medium text-slate-500 dark:text-slate-400 animate-in fade-in slide-in-from-top-4 duration-500 leading-relaxed">
                                                        Registro sistêmico Jamef Cód: <span className="text-slate-900 dark:text-white font-bold tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded ml-1">{evento.codigoOcorrencia || '---'}</span>
                                                        <p className="mt-2">Movimentação confirmada via terminal {evento.localOrigem?.cidade}. Dados processados com criptografia JWT ponta-a-ponta.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {!result && !loading && !error && (
                <div className="max-w-4xl mx-auto px-6 mt-20 text-center animate-in fade-in zoom-in duration-1000">
                    <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                        <Info className="w-4 h-4 text-brand-500" />
                        Pronto para o monitoramento
                    </div>
                </div>
            )}

            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md px-6 py-2.5 rounded-full border border-white dark:border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-4 whitespace-nowrap opacity-50 hover:opacity-100 transition-opacity z-50">
                <span>© 2024 MCI Logística</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                <span>Powered by Jamef API PROD</span>
            </div>
        </div>
    );
};
