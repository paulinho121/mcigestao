import React, { useState, useEffect, useRef } from 'react';
import {
    Search,
    Truck,
    Package,
    MapPin,
    Calendar,
    Clock,
    ArrowRight,
    FileText,
    ExternalLink,
    Info,
    ChevronDown,
    ChevronUp,
    QrCode,
    Copy,
    Check,
    Warehouse
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { jamefService, JamefTrackingItem } from '../services/jamefService';

const CNPJ_BY_STATE: Record<string, { cnpj: string; label: string }> = {
    SC: { cnpj: '05502390000200', label: 'SC' },
    SP: { cnpj: '05502390000383', label: 'SP' },
    CE: { cnpj: '05502390000111', label: 'CE' },
};

function detectStateFromNF(nf: string): { cnpj: string; label: string } | null {
    if (nf.startsWith('562')) return CNPJ_BY_STATE.SC;
    if (nf.startsWith('22')) return CNPJ_BY_STATE.SP;
    if (nf.startsWith('10')) return CNPJ_BY_STATE.CE;
    return null;
}

function hasCargoMoved(events: JamefTrackingItem['eventosRastreio']): boolean {
    if (events.length === 0) return false;
    return events.some(e => {
        const s = e.status.toUpperCase();
        return s.includes('TRANSPORTE') || s.includes('VIAGEM') || s.includes('ENTREG');
    });
}

interface TrackingProps {
    initialNF?: string;
    initialCNPJ?: string;
    initialNumType?: 'notaFiscal' | 'cte';
    initialDocType?: 'remetente' | 'destinatario';
}

export const Tracking: React.FC<TrackingProps> = ({
    initialNF,
    initialCNPJ,
    initialNumType,
    initialDocType,
}) => {
    const [document, setDocument] = useState(initialCNPJ || '');
    const [docType, setDocType] = useState<'remetente' | 'destinatario'>(initialDocType || 'remetente');
    const [number, setNumber] = useState(initialNF || '');
    const [numType, setNumType] = useState<'notaFiscal' | 'cte'>(initialNumType || 'notaFiscal');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<JamefTrackingItem | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);
    const autoSearchedRef = useRef(false);

    const performSearch = async (
        doc: string,
        dType: 'remetente' | 'destinatario',
        num: string,
        nType: 'notaFiscal' | 'cte'
    ) => {
        if (!doc || !num) {
            setError('Por favor, preencha o documento e o número da nota ou CT-e.');
            return;
        }
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await jamefService.trackCargo({
                documento: doc.replace(/\D/g, ''),
                docType: dType,
                numero: num,
                numType: nType
            });

            if (response.sucesso && response.item) {
                setResult(response.item);
            } else {
                setError('Mercadoria ainda no armazém. Nenhuma movimentação encontrada para os dados informados.');
            }
        } catch (err) {
            setError('Mercadoria ainda no armazém. Não foi possível obter informações de rastreio no momento.');
        } finally {
            setLoading(false);
        }
    };

    // Auto-search when opened via QR code link
    useEffect(() => {
        if (initialNF && initialCNPJ && !autoSearchedRef.current) {
            autoSearchedRef.current = true;
            performSearch(initialCNPJ, initialDocType || 'remetente', initialNF, initialNumType || 'notaFiscal');
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        await performSearch(document, docType, number, numType);
    };

    const handleNumberChange = (val: string) => {
        setNumber(val);
        // Auto-detect CNPJ from NF prefix if document field is empty
        if (!document) {
            const detected = detectStateFromNF(val);
            if (detected) setDocument(detected.cnpj);
        }
    };

    const trackingUrl = `${window.location.origin}${window.location.pathname}#/tracking?nf=${encodeURIComponent(number)}&cnpj=${encodeURIComponent(document)}&numType=${numType}&docType=${docType}`;

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(trackingUrl);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        } catch {
            // fallback: do nothing
        }
    };

    const getStatusColor = (status: string) => {
        const s = status.toUpperCase();
        if (s.includes('ENTREG')) return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
        if (s.includes('TRANSPORTE') || s.includes('VIAGEM') || s.includes('EMISSAO')) return 'text-sky-600 bg-sky-50 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.1)]';
        if (s.includes('PROBLEMA') || s.includes('PEND') || s.includes('FALHA')) return 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
        return 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    };

    const cargoMoved = result ? hasCargoMoved(result.eventosRastreio) : null;

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
                                                { label: 'SC', value: CNPJ_BY_STATE.SC.cnpj },
                                                { label: 'SP', value: CNPJ_BY_STATE.SP.cnpj },
                                                { label: 'CE', value: CNPJ_BY_STATE.CE.cnpj }
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
                                            onChange={(e) => handleNumberChange(e.target.value)}
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
                        <div className="mt-8 p-6 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-3xl flex items-start gap-5 animate-in fade-in slide-in-from-top-4">
                            <div className="p-3 bg-amber-500/20 rounded-2xl shrink-0">
                                <Warehouse className="w-6 h-6 text-amber-500" />
                            </div>
                            <div>
                                <h4 className="font-black text-sm uppercase tracking-widest text-amber-600 dark:text-amber-400">Mercadoria ainda no armazém</h4>
                                <p className="text-amber-500/80 text-xs sm:text-sm mt-1 font-bold">{error}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Section */}
                {result && (
                    <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                        {/* Warehouse warning when cargo hasn't moved */}
                        {!cargoMoved && (
                            <div className="p-5 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-3xl flex items-center gap-4">
                                <div className="p-2.5 bg-amber-500/20 rounded-2xl shrink-0">
                                    <Warehouse className="w-5 h-5 text-amber-500" />
                                </div>
                                <div>
                                    <span className="font-black text-sm text-amber-600 dark:text-amber-400 uppercase tracking-wider">Mercadoria ainda no armazém</span>
                                    <p className="text-amber-500/70 text-xs mt-0.5 font-medium">Nenhuma movimentação de transporte registrada até o momento.</p>
                                </div>
                            </div>
                        )}

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

                        {/* Share Card */}
                        {number && document && (
                            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 rounded-[2.5rem] border border-white/10 shadow-2xl p-8 sm:p-10">
                                {/* Glow accent */}
                                <div className="absolute -top-10 -right-10 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
                                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
                                    {/* QR Code */}
                                    <div className="shrink-0 p-4 bg-white rounded-3xl shadow-2xl ring-4 ring-white/10">
                                        <QRCodeSVG value={trackingUrl} size={148} level="M" marginSize={1} />
                                    </div>

                                    {/* Info + actions */}
                                    <div className="flex-1 w-full space-y-5 text-center sm:text-left">
                                        {/* Title */}
                                        <div className="flex items-center justify-center sm:justify-start gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-brand-500/20 flex items-center justify-center shrink-0">
                                                <QrCode className="w-5 h-5 text-brand-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-black text-white tracking-tight">Link de Rastreio</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Envie para o seu cliente</p>
                                            </div>
                                        </div>

                                        {/* URL preview box */}
                                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 group">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                            <span className="flex-1 text-xs font-mono text-slate-300 truncate select-all">
                                                {trackingUrl}
                                            </span>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                                            {/* Copy link */}
                                            <button
                                                type="button"
                                                onClick={copyLink}
                                                className={`inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 border ${
                                                    linkCopied
                                                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 scale-95'
                                                        : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-brand-500/50 active:scale-95'
                                                }`}
                                            >
                                                {linkCopied
                                                    ? <><Check className="w-4 h-4" /> Copiado!</>
                                                    : <><Copy className="w-4 h-4" /> Copiar Link</>
                                                }
                                            </button>

                                            {/* WhatsApp */}
                                            <a
                                                href={`https://wa.me/?text=${encodeURIComponent(`🚚 *Rastreio da sua mercadoria*\n\nNF: ${number}\nAcompanhe em tempo real:\n${trackingUrl}`)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/30 hover:border-[#25D366]/60 transition-all active:scale-95"
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                                WhatsApp
                                            </a>

                                            {/* Abrir link */}
                                            <a
                                                href={trackingUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-white/10 border border-white/20 text-slate-300 hover:bg-white/20 transition-all active:scale-95"
                                            >
                                                <ExternalLink className="w-4 h-4" /> Abrir
                                            </a>
                                        </div>

                                        <p className="text-xs text-slate-500 font-medium">
                                            O cliente clica no link e já vê o rastreio desta NF diretamente, sem precisar digitar nenhum dado.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Professional Timeline */}
                        {result.eventosRastreio.length > 0 && (
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
                        )}
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
