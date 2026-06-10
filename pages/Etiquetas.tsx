import React, { useState } from 'react';
import {
    Tag,
    Download,
    Copy,
    Check,
    ExternalLink,
    Package,
    MapPin,
    FileText,
    Layers,
    AlertTriangle,
    Info,
    Printer,
    ChevronDown,
    ChevronUp,
    Sparkles,
    Hash,
    Building2,
    Weight,
} from 'lucide-react';
import { jamefService, EtiquetaDados } from '../services/jamefService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatChave(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 44);
    // Exibe em blocos: 2-4-8-6-9-9-3-1-8 = 44 dígitos
    return digits
        .replace(/(\d{2})(\d)/, '$1 $2')
        .replace(/(\d{2} \d{4})(\d)/, '$1 $2')
        .replace(/(\d{2} \d{4} \d{8})(\d)/, '$1 $2')
        .replace(/(\d{2} \d{4} \d{8} \d{6})(\d)/, '$1 $2')
        .replace(/(\d{2} \d{4} \d{8} \d{6} \d{9})(\d)/, '$1 $2')
        .replace(/(\d{2} \d{4} \d{8} \d{6} \d{9} \d{9})(\d)/, '$1 $2')
        .replace(/(\d{2} \d{4} \d{8} \d{6} \d{9} \d{9} \d{3})(\d)/, '$1 $2')
        .replace(/(\d{2} \d{4} \d{8} \d{6} \d{9} \d{9} \d{3} \d{1})(\d)/, '$1 $2');
}

// ─── Card de Informação ───────────────────────────────────────────────────────

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | number }) {
    if (!value && value !== 0) return null;
    return (
        <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="mt-0.5 w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
                <span className="text-brand-500 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
            </div>
            <div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{value}</div>
            </div>
        </div>
    );
}

// ─── Bloco de Parte (Remetente / Destinatário) ────────────────────────────────

function ParteCard({ titulo, data }: { titulo: string; data?: EtiquetaDados['remetente'] }) {
    if (!data) return null;
    return (
        <div className="space-y-3">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{titulo}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <InfoCard icon={<Building2 />} label="Nome" value={data.nome} />
                <InfoCard icon={<Hash />} label="CNPJ/CPF" value={data.cnpj} />
                <InfoCard icon={<MapPin />} label="Endereço" value={data.endereco} />
                <InfoCard icon={<MapPin />} label="Cidade / UF" value={data.cidade ? `${data.cidade} - ${data.uf}` : undefined} />
                <InfoCard icon={<MapPin />} label="CEP" value={data.cep} />
            </div>
        </div>
    );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export function Etiquetas() {
    const [chave, setChave] = useState('');
    const [formato, setFormato] = useState<'zpl' | 'dados'>('zpl');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [zplResult, setZplResult] = useState<string | null>(null);
    const [dadosResult, setDadosResult] = useState<EtiquetaDados | null>(null);
    const [correlacaoId, setCorrelacaoId] = useState<string | null>(null);

    const [copied, setCopied] = useState(false);
    const [expandVolumes, setExpandVolumes] = useState(false);

    const chaveDigits = chave.replace(/\D/g, '');
    const isValid = chaveDigits.length === 44;

    const handleBuscar = async () => {
        if (!isValid) return;
        setLoading(true);
        setError(null);
        setZplResult(null);
        setDadosResult(null);
        setCorrelacaoId(null);

        if (formato === 'zpl') {
            const res = await jamefService.gerarEtiquetaZpl(chaveDigits);
            if (res.sucesso && res.etiqueta) {
                setZplResult(res.etiqueta.zpl);
                setCorrelacaoId(res.etiqueta.correlacaoId ?? null);
            } else {
                setError(res.mensagem ?? 'Etiqueta não encontrada. Verifique se a NF está cadastrada na Jamef.');
            }
        } else {
            const res = await jamefService.gerarEtiquetaDados(chaveDigits);
            if (res.sucesso && res.etiqueta) {
                setDadosResult(res.etiqueta);
                setCorrelacaoId(res.etiqueta.correlacaoId ?? null);
            } else {
                setError(res.mensagem ?? 'Etiqueta não encontrada. Verifique se a NF está cadastrada na Jamef.');
            }
        }

        setLoading(false);
    };

    const handleCopiar = async () => {
        if (!zplResult) return;
        await navigator.clipboard.writeText(zplResult);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadZpl = () => {
        if (!zplResult) return;
        const blob = new Blob([zplResult], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `etiqueta_${chaveDigits.slice(-9)}.zpl`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleVerLabelary = () => {
        if (!zplResult) return;
        // Labelary aceita ZPL via POST — abrimos com o viewer direto (URL encoded)
        const encoded = encodeURIComponent(zplResult);
        window.open(`https://labelary.com/viewer.html?zpl=${encoded}`, '_blank', 'noopener,noreferrer');
    };

    const handleImprimirZpl = () => {
        if (!zplResult) return;
        const win = window.open('', '_blank', 'width=600,height=400');
        if (!win) return;
        win.document.write(`<!DOCTYPE html><html><head><title>ZPL</title>
        <style>body{font-family:monospace;font-size:12px;background:#fff;padding:16px;white-space:pre-wrap;word-break:break-all}</style></head>
        <body>${zplResult.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body></html>`);
        win.document.close();
        setTimeout(() => { win.focus(); win.print(); }, 200);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] pb-20 transition-colors duration-500 font-sans">
            {/* Background glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-[120px]" />
            </div>

            {/* Hero */}
            <div className="relative pt-12 pb-24 sm:pt-16 sm:pb-32 px-4 text-center overflow-hidden">
                <div className="max-w-3xl mx-auto relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-500/10 dark:bg-violet-500/20 border border-violet-500/20 rounded-full text-violet-600 dark:text-violet-400 text-[10px] font-black uppercase tracking-widest mb-8">
                        <Sparkles className="w-3.5 h-3.5" /> Identificação de Mercadorias
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter mb-4 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                        Etiquetas <span className="text-violet-500 italic font-medium">JAMEF</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed font-medium opacity-80">
                        Gere etiquetas ZPL para impressoras térmicas ou consulte os dados estruturados de identificação da mercadoria.
                    </p>
                </div>
            </div>

            <main className="max-w-2xl mx-auto px-4 -mt-16 sm:-mt-24 relative z-20 space-y-6">

                {/* Card de Busca */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] border border-white dark:border-white/5 p-8 sm:p-10 space-y-6">

                    {/* Toggle formato */}
                    <div className="flex bg-slate-100/50 dark:bg-slate-950/50 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-inner">
                        {(['zpl', 'dados'] as const).map(f => (
                            <button key={f} type="button" onClick={() => setFormato(f)}
                                className={`flex-1 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${formato === f
                                    ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-xl ring-1 ring-black/5 dark:ring-white/5 scale-[1.02]'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                                {f === 'zpl' ? '🖨️ ZPL · Impressora Térmica' : '📋 Dados · JSON Estruturado'}
                            </button>
                        ))}
                    </div>

                    {/* Input chave NF-e */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Chave de Acesso NF-e · 44 dígitos
                        </label>
                        <div className="relative group">
                            <Tag className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-violet-500 transition-colors" />
                            <input
                                type="text"
                                value={formatChave(chave)}
                                onChange={e => setChave(e.target.value)}
                                placeholder="00 0000 00000000 000000 000000000 000000000 000 0 00000000"
                                className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-slate-800/50 rounded-2xl focus:border-violet-500/40 focus:bg-white dark:focus:bg-slate-900 focus:ring-[12px] focus:ring-violet-500/5 transition-all outline-none text-sm font-mono font-bold dark:text-white dark:placeholder-slate-700 shadow-sm tracking-wider"
                                maxLength={60}
                            />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <span className={`text-[10px] font-bold transition-colors ${chaveDigits.length === 0 ? 'text-slate-400' : chaveDigits.length === 44 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {chaveDigits.length}/44 dígitos
                            </span>
                            {isValid && (
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Chave válida
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Info padrões */}
                    <div className="flex items-start gap-3 p-4 bg-violet-50 dark:bg-violet-900/10 border border-violet-200/50 dark:border-violet-800/30 rounded-2xl">
                        <Info className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-medium text-violet-700 dark:text-violet-300 leading-relaxed">
                            Etiqueta padrão <strong>94×76 mm</strong> · código de barras mín. <strong>54×16 mm</strong>. A NF-e deve estar previamente cadastrada nos sistemas da Jamef.
                        </p>
                    </div>

                    {/* Botão */}
                    <button
                        type="button"
                        onClick={handleBuscar}
                        disabled={!isValid || loading}
                        className="group relative w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 overflow-hidden active:scale-[0.97] bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-xl shadow-violet-500/20"
                    >
                        <div className="absolute inset-0 w-1/3 h-full bg-white/10 -skew-x-[45deg] translate-x-[-200%] group-hover:translate-x-[400%] transition-transform duration-700" />
                        {loading
                            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Gerando etiqueta...</span></>
                            : <><Tag className="w-4 h-4" /><span>Gerar Etiqueta</span></>
                        }
                    </button>

                    {/* Erro */}
                    {error && (
                        <div className="flex items-start gap-4 p-5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl animate-in fade-in">
                            <div className="p-2 bg-rose-500/20 rounded-xl shrink-0">
                                <AlertTriangle className="w-5 h-5 text-rose-500" />
                            </div>
                            <div>
                                <h4 className="font-black text-sm text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">Não foi possível gerar a etiqueta</h4>
                                <p className="text-xs font-medium text-rose-500/80">{error}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Resultado ZPL ── */}
                {zplResult && (
                    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 rounded-[2.5rem] border border-white/10 shadow-2xl p-8 animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-6">
                        <div className="absolute -top-12 -right-12 w-48 h-48 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10 space-y-5">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-violet-500/20 flex items-center justify-center">
                                        <Printer className="w-5 h-5 text-violet-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-white">Etiqueta ZPL</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                            {correlacaoId ? `ID: ${correlacaoId}` : 'Pronto para impressão'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Gerado</span>
                                </div>
                            </div>

                            {/* ZPL preview */}
                            <div className="bg-black/40 border border-white/10 rounded-2xl p-4 max-h-52 overflow-auto">
                                <pre className="text-[10px] font-mono text-emerald-400 whitespace-pre-wrap break-all leading-relaxed select-all">
                                    {zplResult}
                                </pre>
                            </div>

                            {/* Botões */}
                            <div className="flex flex-wrap gap-2">
                                <button onClick={handleCopiar}
                                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border active:scale-95 ${copied ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}>
                                    {copied ? <><Check className="w-3.5 h-3.5" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar ZPL</>}
                                </button>

                                <button onClick={handleDownloadZpl}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all active:scale-95">
                                    <Download className="w-3.5 h-3.5" /> Download .zpl
                                </button>

                                <button onClick={handleVerLabelary}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-violet-500/20 border border-violet-500/40 text-violet-300 hover:bg-violet-500/30 transition-all active:scale-95">
                                    <ExternalLink className="w-3.5 h-3.5" /> Visualizar
                                </button>

                                <button onClick={handleImprimirZpl}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-white/10 border border-white/20 text-slate-300 hover:bg-white/20 transition-all active:scale-95">
                                    <Printer className="w-3.5 h-3.5" /> Imprimir
                                </button>
                            </div>

                            <p className="text-[11px] text-slate-500 font-medium">
                                Tamanho padrão <strong className="text-slate-400">94×76 mm</strong>. Visualize no{' '}
                                <button onClick={handleVerLabelary} className="text-violet-400 underline hover:text-violet-300">Labelary</button>{' '}
                                para conferir o layout antes de imprimir.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Resultado Dados ── */}
                {dadosResult && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-500">

                        {/* Header card */}
                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl rounded-[2rem] border border-white dark:border-white/5 p-6 shadow-xl">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-violet-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Dados da Etiqueta</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {correlacaoId ? `Correlação: ${correlacaoId}` : 'Jamef · Dados Estruturados'}
                                        </p>
                                    </div>
                                </div>
                                {(dadosResult.sigla || dadosResult.setor) && (
                                    <div className="flex items-center gap-2">
                                        {dadosResult.sigla && (
                                            <span className="px-3 py-1.5 bg-violet-500 text-white text-xs font-black rounded-xl uppercase tracking-widest">
                                                {dadosResult.sigla}
                                            </span>
                                        )}
                                        {dadosResult.setor && (
                                            <span className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl uppercase tracking-widest">
                                                {dadosResult.setor}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* NF + CT-e */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <InfoCard icon={<FileText />} label="Nota Fiscal" value={dadosResult.notaFiscal?.numero ? `NF ${dadosResult.notaFiscal.numero} · Série ${dadosResult.notaFiscal.serie}` : undefined} />
                                <InfoCard icon={<Hash />} label="CT-e" value={dadosResult.conhecimento?.numero} />
                                <InfoCard icon={<Package />} label="Total de Volumes" value={dadosResult.totalVolumes} />
                                <InfoCard icon={<Weight />} label="Peso Total (kg)" value={dadosResult.pesoTotal} />
                            </div>

                            {/* Remetente */}
                            <ParteCard titulo="Remetente" data={dadosResult.remetente} />

                            {/* Destinatário */}
                            {dadosResult.destinatario && (
                                <div className="mt-6">
                                    <ParteCard titulo="Destinatário" data={dadosResult.destinatario as any} />
                                </div>
                            )}
                        </div>

                        {/* Volumes */}
                        {dadosResult.volumes && dadosResult.volumes.length > 0 && (
                            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl rounded-[2rem] border border-white dark:border-white/5 overflow-hidden shadow-xl">
                                <button
                                    type="button"
                                    onClick={() => setExpandVolumes(v => !v)}
                                    className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                                            <Layers className="w-5 h-5 text-brand-500" />
                                        </div>
                                        <div className="text-left">
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white">Volumes</h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{dadosResult.volumes.length} volume(s)</p>
                                        </div>
                                    </div>
                                    {expandVolumes ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                </button>

                                {expandVolumes && (
                                    <div className="px-6 pb-6 space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                                        {dadosResult.volumes.map((vol, i) => (
                                            <div key={i} className="flex flex-wrap gap-2 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <span className="px-2 py-1 bg-brand-500 text-white text-[9px] font-black rounded-lg uppercase tracking-widest">Vol. {vol.numeroVolume ?? i + 1}</span>
                                                {vol.peso && <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{vol.peso} kg</span>}
                                                {vol.altura && vol.largura && vol.comprimento && (
                                                    <span className="text-xs font-medium text-slate-500">{vol.altura}×{vol.largura}×{vol.comprimento} cm</span>
                                                )}
                                                {vol.descricao && <span className="text-xs font-medium text-slate-500">{vol.descricao}</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Dica inicial */}
                {!zplResult && !dadosResult && !error && !loading && (
                    <div className="text-center animate-in fade-in duration-700">
                        <div className="inline-flex items-center gap-3 px-5 py-3 bg-white dark:bg-slate-900 shadow-xl rounded-2xl text-slate-400 text-[11px] font-bold border border-slate-100 dark:border-slate-800">
                            <Info className="w-4 h-4 text-violet-500" />
                            Informe a chave de acesso NF-e de 44 dígitos para gerar a etiqueta
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md px-6 py-2.5 rounded-full border border-white dark:border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-4 whitespace-nowrap opacity-50 hover:opacity-100 transition-opacity z-50">
                <span>© 2024 MCI Logística</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span>Etiquetas Jamef · OAS 2.0</span>
            </div>
        </div>
    );
}
