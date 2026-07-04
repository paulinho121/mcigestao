import React, { useState, useEffect, useRef } from 'react';
import {
    Search,
    Truck,
    Package,
    PackageCheck,
    Home,
    MapPin,
    Calendar,
    Clock,
    FileText,
    ExternalLink,
    Info,
    ChevronDown,
    ChevronUp,
    QrCode,
    Copy,
    Check,
    Warehouse,
    Link2,
    Printer,
    Sparkles
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { jamefService, JamefTrackingItem } from '../services/jamefService';
import { detectFilialFromNF } from '../config/filiais';

// ─── Gerar Link de Rastreio ───────────────────────────────────────────────────

function GerarLink() {
    const [nf, setNf] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [numType, setNumType] = useState<'notaFiscal' | 'cte'>('notaFiscal');
    const [copied, setCopied] = useState(false);
    const [customMsg, setCustomMsg] = useState('');

    // URL limpa: estoquemci.vercel.app/nf/562011
    const cleanUrl = nf ? `${window.location.origin}/nf/${encodeURIComponent(nf)}` : '';
    // URL completa (fallback para uso interno)
    const trackingUrl = nf && cnpj
        ? `${window.location.origin}${window.location.pathname}#/tracking?nf=${encodeURIComponent(nf)}&cnpj=${encodeURIComponent(cnpj)}&numType=${numType}&docType=remetente`
        : '';

    // Auto-detecta CNPJ pelo prefixo da NF (config centralizada em config/filiais.ts)
    useEffect(() => {
        if (!nf) { setCnpj(''); return; }
        const filial = detectFilialFromNF(nf);
        setCnpj(filial?.cnpj ?? '');
    }, [nf]);

    // Link final é sempre a URL limpa
    const linkFinal = cleanUrl;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(linkFinal);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const whatsappMsg = customMsg
        ? `${customMsg}\n\n🔗 ${linkFinal}`
        : `🚚 *Rastreamento da sua mercadoria*\n\n📦 *NF:* ${nf}\n\n Acompanhe o status da entrega em tempo real pelo link abaixo:\n🔗 ${linkFinal}`;

    const handlePrint = () => {
        const win = window.open('', '_blank', 'width=500,height=700');
        if (!win) return;
        win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
        <title>Rastreamento NF ${nf}</title>
        <style>
            *{box-sizing:border-box;margin:0;padding:0}
            body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;display:flex;flex-direction:column;align-items:center;padding:32px;gap:20px;color:#0f172a}
            .logo{height:48px;object-fit:contain;margin-bottom:4px}
            h1{font-size:18px;font-weight:900;text-align:center}
            p{font-size:12px;color:#64748b;text-align:center;max-width:280px;line-height:1.5}
            .nf{font-size:22px;font-weight:900;color:#0f172a;letter-spacing:-0.5px}
            .url{font-size:10px;color:#3b82f6;word-break:break-all;text-align:center;max-width:280px;margin-top:4px}
            .footer{font-size:9px;color:#94a3b8;text-align:center;margin-top:12px}
            img.qr{border:8px solid white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.12)}
            @media print{body{padding:16px}}
        </style></head><body>
        <img src="${window.location.origin}/logo.png" class="logo" onerror="this.style.display='none'" alt="MCI"/>
        <h1>Acompanhe sua entrega</h1>
        <p>${customMsg || 'Escaneie o QR Code abaixo para rastrear sua mercadoria em tempo real.'}</p>
        <div style="margin:8px 0"><span style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.1em">Nota Fiscal</span></div>
        <div class="nf">${nf}</div>
        <div id="qr" style="margin:16px 0"></div>
        <div class="url">${linkFinal}</div>
        <div class="footer">MCI Estoque · estoquemci.vercel.app</div>
        <script>
            const svg = document.querySelector('[data-qr]');
            const qrDiv = document.getElementById('qr');
            qrDiv.innerHTML = document.getElementById('qr-source')?.innerHTML || '';
        </script>
        </body></html>`);
        win.document.close();
        // Insere QR code via canvas
        setTimeout(() => {
            const srcQR = document.getElementById('qr-print-source');
            if (srcQR) {
                const qrDiv = win.document.getElementById('qr');
                if (qrDiv) qrDiv.innerHTML = srcQR.innerHTML;
            }
            win.focus();
            setTimeout(() => win.print(), 300);
        }, 200);
    };

    const canGenerate = nf.length >= 3 && cnpj.length >= 11;

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] pb-20 transition-colors duration-500 font-sans">
            {/* Background glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-[120px]" />
            </div>

            {/* Hero */}
            <div className="relative pt-12 pb-24 sm:pt-16 sm:pb-32 px-4 text-center overflow-hidden">
                <div className="max-w-3xl mx-auto relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 rounded-full text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-8">
                        <Sparkles className="w-3.5 h-3.5" /> Transparência na Entrega
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter mb-4 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                        Gerar Link de <span className="text-emerald-500 italic font-medium">Rastreio</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed font-medium opacity-80">
                        Informe o número da NF e envie o QR Code ou link direto para o seu cliente acompanhar a entrega.
                    </p>
                </div>
            </div>

            <main className="max-w-2xl mx-auto px-4 -mt-16 sm:-mt-24 relative z-20 space-y-6">
                {/* Formulário */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] border border-white dark:border-white/5 p-8 sm:p-10 space-y-6">
                    {/* Tipo */}
                    <div className="flex bg-slate-100/50 dark:bg-slate-950/50 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-inner">
                        {(['notaFiscal', 'cte'] as const).map(t => (
                            <button key={t} type="button" onClick={() => setNumType(t)}
                                className={`flex-1 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${numType === t ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xl ring-1 ring-black/5 dark:ring-white/5 scale-[1.02]' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                                {t === 'notaFiscal' ? 'Nota Fiscal' : 'CT-e'}
                            </button>
                        ))}
                    </div>

                    {/* NF Input */}
                    <div className="relative group">
                        <FileText className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                        <input
                            type="text" value={nf} onChange={e => setNf(e.target.value)}
                            placeholder={numType === 'notaFiscal' ? 'Número da Nota Fiscal...' : 'Número do CT-e...'}
                            className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-slate-800/50 rounded-2xl focus:border-emerald-500/40 focus:bg-white dark:focus:bg-slate-900 focus:ring-[12px] focus:ring-emerald-500/5 transition-all outline-none text-lg font-bold dark:text-white dark:placeholder-slate-700 shadow-sm"
                        />
                    </div>

                    {/* CNPJ detectado */}
                    {cnpj && (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800/40 animate-in fade-in duration-300">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                Filial detectada automaticamente · CNPJ: {cnpj}
                            </span>
                        </div>
                    )}

                    {/* CNPJ manual se não detectado */}
                    {nf && !cnpj && (
                        <div className="relative group">
                            <input
                                type="text" value={cnpj} onChange={e => setCnpj(e.target.value)}
                                placeholder="CNPJ da filial remetente (não detectado automaticamente)"
                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-amber-300/60 rounded-2xl focus:border-amber-400 transition-all outline-none text-sm font-bold dark:text-white dark:placeholder-slate-700"
                            />
                        </div>
                    )}

                    {/* Mensagem personalizada */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mensagem personalizada (opcional)</label>
                        <textarea
                            value={customMsg}
                            onChange={e => setCustomMsg(e.target.value)}
                            placeholder="Ex: Olá! Segue o link para acompanhar sua encomenda. Qualquer dúvida, entre em contato."
                            rows={2}
                            className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-slate-800/50 rounded-2xl focus:border-emerald-500/40 transition-all outline-none text-sm font-medium dark:text-white dark:placeholder-slate-700 resize-none"
                        />
                    </div>

                    {/* Preview do link gerado */}
                    {canGenerate && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-in fade-in duration-300">
                            <Link2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 truncate">{linkFinal}</span>
                        </div>
                    )}
                </div>

                {/* Card de resultado */}
                {canGenerate && (
                    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 rounded-[2.5rem] border border-white/10 shadow-2xl p-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
                            {/* QR Code com id para impressão */}
                            <div id="qr-print-source" className="shrink-0 p-4 bg-white rounded-3xl shadow-2xl ring-4 ring-white/10">
                                <QRCodeSVG value={trackingUrl} size={160} level="M" marginSize={1} />
                            </div>

                            <div className="flex-1 w-full space-y-4 text-center sm:text-left">
                                {/* Header */}
                                <div className="flex items-center justify-center sm:justify-start gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                        <QrCode className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-white">Link de Rastreio</h3>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">NF: {nf}</p>
                                    </div>
                                </div>

                                {/* URL */}
                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                    <span className="flex-1 text-xs font-mono text-slate-300 truncate">{linkFinal || trackingUrl}</span>
                                </div>

                                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl w-fit mx-auto sm:mx-0">
                                    <Sparkles className="w-3 h-3 text-emerald-400" />
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Link próprio · sem redirect</span>
                                </div>

                                {/* Botões de ação */}
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                    {/* Copiar */}
                                    <button onClick={handleCopy}
                                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border active:scale-95 ${copied ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}>
                                        {copied ? <><Check className="w-3.5 h-3.5" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar Link</>}
                                    </button>

                                    {/* WhatsApp */}
                                    <a href={`https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/30 transition-all active:scale-95">
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                        WhatsApp
                                    </a>

                                    {/* Imprimir QR */}
                                    <button onClick={handlePrint}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-white/10 border border-white/20 text-slate-300 hover:bg-white/20 transition-all active:scale-95">
                                        <Printer className="w-3.5 h-3.5" /> Imprimir QR
                                    </button>

                                    {/* Abrir */}
                                    <a href={cleanUrl} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-white/10 border border-white/20 text-slate-300 hover:bg-white/20 transition-all active:scale-95">
                                        <ExternalLink className="w-3.5 h-3.5" /> Testar
                                    </a>
                                </div>

                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    O cliente clica e já vê o rastreio da NF {nf} em tempo real, sem precisar digitar nada.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

// Detecção de filial centralizada em config/filiais.ts
function detectStateFromNF(nf: string): { cnpj: string; label: string } | null {
    const filial = detectFilialFromNF(nf);
    return filial ? { cnpj: filial.cnpj, label: filial.label } : null;
}

function hasCargoMoved(events: JamefTrackingItem['eventosRastreio']): boolean {
    if (events.length === 0) return false;
    return events.some(e => {
        const s = e.status.toUpperCase();
        return s.includes('TRANSPORTE') || s.includes('VIAGEM') || s.includes('ENTREG');
    });
}

// ─── Etapas do envio (stepper premium) ─────────────────────────────────────

const SHIPPING_STAGES = [
    { label: 'Pedido Realizado', icon: FileText },
    { label: 'Coletado', icon: PackageCheck },
    { label: 'Em Trânsito', icon: Truck },
    { label: 'Entregue', icon: Home },
] as const;

function getStageIndex(status?: string): number {
    const s = (status || '').toUpperCase();
    if (s.includes('ENTREG')) return 3;
    if (s.includes('TRANSPORTE') || s.includes('VIAGEM') || s.includes('TRANSITO')) return 2;
    if (s.includes('COLETA') || s.includes('EMISSAO') || s.includes('EMBALA')) return 1;
    return 0;
}

function ShippingStepper({ status }: { status?: string }) {
    const activeIndex = getStageIndex(status);

    return (
        <div className="flex items-start w-full">
            {SHIPPING_STAGES.map((stage, i) => {
                const Icon = stage.icon;
                const done = i <= activeIndex;
                const isLast = i === SHIPPING_STAGES.length - 1;
                return (
                    <React.Fragment key={stage.label}>
                        <div className="flex flex-col items-center gap-2 shrink-0 w-14 sm:w-20">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                                done
                                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30 scale-100'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600'
                            }`}>
                                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-center leading-tight ${
                                done ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-600'
                            }`}>
                                {stage.label}
                            </span>
                        </div>
                        {!isLast && (
                            <div className="flex-1 h-1 sm:h-1.5 mt-5 sm:mt-6 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                                <div className={`h-full bg-brand-600 transition-all duration-700 ${i < activeIndex ? 'w-full' : 'w-0'}`} />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

// ─── Card de localização (mapa estilizado, sem dependência externa) ────────

function LocationMapCard({ cidade, uf }: { cidade?: string; uf?: string }) {
    return (
        <div className="relative overflow-hidden rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 h-36 sm:h-44">
            <svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
                <defs>
                    <pattern id="tracking-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-300 dark:text-slate-700" />
                    </pattern>
                </defs>
                <rect width="400" height="160" fill="url(#tracking-grid)" className="opacity-60 dark:opacity-30" />
                <path
                    d="M 10 130 Q 110 30 200 80 T 390 30"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="7 7"
                    className="text-brand-500/70"
                />
                <circle cx="10" cy="130" r="5" className="fill-slate-400 dark:fill-slate-600" />
                <circle cx="390" cy="30" r="6" className="fill-brand-500" />
            </svg>
            <div className="absolute inset-0 flex items-end p-4 sm:p-5 bg-gradient-to-t from-slate-50 dark:from-slate-950 via-slate-50/40 dark:via-slate-950/50 to-transparent">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shrink-0">
                        <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Localização Atual</div>
                        <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                            {cidade || 'Em processamento'}{uf ? ` · ${uf}` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface TrackingProps {
    initialNF?: string;
    initialCNPJ?: string;
    initialNumType?: 'notaFiscal' | 'cte';
    initialDocType?: 'remetente' | 'destinatario';
    isPublic?: boolean; // quando true: vista limpa para o cliente final
}

export const Tracking: React.FC<TrackingProps> = ({
    initialNF,
    initialCNPJ,
    initialNumType,
    initialDocType,
    isPublic = false,
}) => {
    const [activeView, setActiveView] = useState<'rastrear' | 'gerar_link'>('rastrear');
    const [document, setDocument] = useState(initialCNPJ || '');
    const docType: 'remetente' | 'destinatario' = initialDocType || 'remetente';
    const [number, setNumber] = useState(initialNF || '');
    const numType: 'notaFiscal' | 'cte' = initialNumType || 'notaFiscal';
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
    const cleanShareUrl = number ? `${window.location.origin}/nf/${encodeURIComponent(number)}` : trackingUrl;

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(cleanShareUrl);
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

    if (activeView === 'gerar_link') {
        return (
            <>
                {!isPublic && (
                    <div className="sticky top-0 z-30 flex justify-center pt-4 pb-2 bg-[#f8fafc]/80 dark:bg-[#020617]/80 backdrop-blur-md">
                        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shadow-sm">
                            <button onClick={() => setActiveView('rastrear')}
                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-black rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                                <Search className="w-4 h-4" /> Rastrear
                            </button>
                            <button onClick={() => setActiveView('gerar_link')}
                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-black rounded-xl transition-all bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm">
                                <Link2 className="w-4 h-4" /> Gerar Link
                            </button>
                        </div>
                    </div>
                )}
                <GerarLink />
            </>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] pb-20 transition-colors duration-500 font-sans selection:bg-brand-500/30 selection:text-brand-900">
            {/* Tabs — só para usuários internos */}
            {!isPublic && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex gap-1 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md p-1 rounded-2xl shadow-sm">
                    <button onClick={() => setActiveView('rastrear')}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-black rounded-xl transition-all bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm">
                        <Search className="w-4 h-4" /> Rastrear
                    </button>
                    <button onClick={() => setActiveView('gerar_link')}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-black rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                        <Link2 className="w-4 h-4" /> Gerar Link
                    </button>
                </div>
            )}

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
                        Rastreamento de <span className="text-brand-500 italic font-medium tracking-tight">Encomendas</span>
                    </h1>

                    <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed px-4 font-medium opacity-80">
                        Digite o número da NF para rastrear ou gerar um link de acompanhamento para o cliente.
                    </p>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="max-w-2xl mx-auto px-4 -mt-16 sm:-mt-24 relative z-20">
                {/* Search Card — campo único */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] border border-white dark:border-white/5 p-8 sm:p-10 space-y-5">
                    {/* Badge live */}
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">Número da Nota Fiscal</span>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase tracking-[0.2em] border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            LIVE PROD
                        </div>
                    </div>

                    {/* Input principal */}
                    <form onSubmit={handleSearch}>
                        <div className="relative group mb-4">
                            <Package className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 dark:text-slate-600 group-focus-within:text-brand-500 transition-colors" />
                            <input
                                type="text"
                                value={number}
                                onChange={(e) => handleNumberChange(e.target.value)}
                                placeholder="Digite o número da NF ou CT-e..."
                                autoFocus
                                className="w-full pl-16 pr-6 py-6 bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-slate-800/50 rounded-2xl focus:border-brand-500/40 focus:bg-white dark:focus:bg-slate-900 focus:ring-[12px] focus:ring-brand-500/5 transition-all outline-none text-xl font-bold dark:text-white dark:placeholder-slate-700 shadow-sm tracking-tight"
                            />
                        </div>

                        {/* Filial detectada */}
                        {document && (
                            <div className="flex items-center gap-2 px-4 py-2 mb-4 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-200/50 dark:border-brand-800/30 animate-in fade-in duration-300">
                                <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                                <span className="text-xs font-bold text-brand-700 dark:text-brand-400">
                                    Filial detectada automaticamente · CNPJ {document}
                                </span>
                            </div>
                        )}

                        {/* Botões de ação */}
                        <div className={`grid gap-3 ${isPublic ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            <button
                                type="submit"
                                disabled={loading || !number.trim()}
                                className="group relative flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 overflow-hidden active:scale-[0.97] bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-xl shadow-brand-500/20"
                            >
                                <div className="absolute inset-0 w-1/3 h-full bg-white/10 -skew-x-[45deg] translate-x-[-200%] group-hover:translate-x-[400%] transition-transform duration-700" />
                                {loading
                                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Buscando...</span></>
                                    : <><Search className="w-4 h-4" /><span>Rastrear</span></>
                                }
                            </button>

                            {!isPublic && (
                                <button
                                    type="button"
                                    disabled={!number.trim()}
                                    onClick={() => setActiveView('gerar_link')}
                                    className="group flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 active:scale-[0.97] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-xl shadow-emerald-500/20"
                                >
                                    <Link2 className="w-4 h-4" /><span>Criar Link</span>
                                </button>
                            )}
                        </div>
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

                        {/* Status Dashboard — premium */}
                        <div className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-2xl rounded-[2.5rem] border border-white dark:border-white/5 p-6 sm:p-10 space-y-8">

                            {/* Cabeçalho: número de rastreio + previsão */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="relative shrink-0">
                                        <div className="absolute inset-0 bg-brand-500 blur-xl opacity-20"></div>
                                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[1.4rem] bg-brand-500 dark:bg-brand-600 flex items-center justify-center shadow-2xl relative z-10">
                                            <Package className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.25em] mb-1">Número de Rastreio</div>
                                        <div className="text-xl sm:text-2xl font-black text-brand-600 dark:text-brand-400 tracking-tight truncate">
                                            {result.notaFiscal?.numero || result.conhecimento?.numero || '---'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2.5 p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 sm:text-right">
                                    <Calendar className="w-4 h-4 text-brand-500 shrink-0" />
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                                        Previsão: <span className="text-slate-900 dark:text-white ml-1">{result.frete?.previsaoEntrega ? new Date(result.frete.previsaoEntrega).toLocaleDateString('pt-BR') : 'Sem dados'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Status atual (badge) */}
                            <div className={`inline-flex px-5 py-2.5 rounded-full text-sm font-black border uppercase tracking-wider ${getStatusColor(result.eventosRastreio?.[0]?.status || 'Inexistente')}`}>
                                {result.eventosRastreio?.[0]?.status || 'Indeterminado'}
                            </div>

                            {/* Stepper de etapas */}
                            <ShippingStepper status={result.eventosRastreio?.[0]?.status} />

                            {/* Mapa estilizado com localização atual */}
                            <LocationMapCard
                                cidade={result.eventosRastreio?.[0]?.localOrigem?.cidade}
                                uf={result.eventosRastreio?.[0]?.localOrigem?.uf}
                            />

                            {/* Info complementar */}
                            <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-slate-100 dark:border-slate-900">
                                <div className="flex flex-wrap gap-x-10 gap-y-3">
                                    <div className="space-y-1">
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Série</div>
                                        <div className="text-base font-black text-slate-900 dark:text-white tracking-tighter">{result.notaFiscal?.serie || '---'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Número CT-e</div>
                                        <div className="text-base font-bold text-slate-500 dark:text-slate-400">{result.conhecimento?.numero || '---'}</div>
                                    </div>
                                </div>

                                {result.frete?.urlComprovanteEntrega && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const url = result.frete!.urlComprovanteEntrega;
                                            const absolute = url.startsWith('http') ? url : `https://${url}`;
                                            window.open(absolute, '_blank', 'noopener,noreferrer');
                                        }}
                                        className="group/btn flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        <span>Comprovante</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Share Card */}
                        {number && document && !isPublic && (
                            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 rounded-[2.5rem] border border-white/10 shadow-2xl p-8 sm:p-10">
                                {/* Glow accent */}
                                <div className="absolute -top-10 -right-10 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
                                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
                                    {/* QR Code — usa URL limpa /nf/:numero */}
                                    <div className="shrink-0 p-4 bg-white rounded-3xl shadow-2xl ring-4 ring-white/10">
                                        <QRCodeSVG value={`${window.location.origin}/nf/${encodeURIComponent(number)}`} size={148} level="M" marginSize={1} />
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

                                        {/* URL preview box — URL limpa */}
                                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 group">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                            <span className="flex-1 text-xs font-mono text-slate-300 truncate select-all">
                                                {`${window.location.origin}/nf/${number}`}
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

                                            {/* WhatsApp — URL limpa */}
                                            <a
                                                href={`https://wa.me/?text=${encodeURIComponent(`🚚 *Rastreio da sua mercadoria*\n\nNF: ${number}\nAcompanhe em tempo real:\n${cleanShareUrl}`)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/30 hover:border-[#25D366]/60 transition-all active:scale-95"
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                                WhatsApp
                                            </a>

                                            {/* Abrir link limpo */}
                                            <a
                                                href={cleanShareUrl}
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
                                                                    {evento.localOrigem?.cidade || 'Centro de Distribuição'}
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
                                                            Registro do sistema Cód: <span className="text-slate-900 dark:text-white font-bold tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded ml-1">{evento.codigoOcorrencia || '---'}</span>
                                                            <p className="mt-2">Movimentação confirmada via terminal {evento.localOrigem?.cidade}. Dados processados com criptografia ponta-a-ponta.</p>
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

            <div className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:w-auto max-w-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-md px-4 sm:px-6 py-2 sm:py-2.5 rounded-full border border-white dark:border-white/5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-3 sm:gap-4 opacity-50 hover:opacity-100 transition-opacity z-50">
                <span className="truncate">© 2026 MCI Logística</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0"></span>
                <span className="truncate">Rastreamento em Tempo Real</span>
            </div>
        </div>
    );
};
