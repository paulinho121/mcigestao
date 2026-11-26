import { useState, useEffect, useCallback, useRef } from 'react';
import { PenLine, X, Loader2, ShieldCheck, Usb, AlertCircle, RefreshCw, Download, CheckCircle, ChevronLeft, ChevronRight, MousePointerClick } from 'lucide-react';
import {
    assinaturaDigitalService, CertificadoLocal, PaginaPrevia, Carimbo, CARIMBO_LARGURA_MM, CARIMBO_ALTURA_MM,
} from '../../services/assinaturaDigitalService';
import { contratoLocacaoService } from '../../services/contratoLocacaoService';

interface Props {
    contratoId: string;
    numero: string;
    /** Monta o HTML do contrato (mesmo modelo da impressão). */
    montarHtml: () => Promise<string>;
    onClose: () => void;
    onAssinado: () => void;
}

type Etapa = 'verificando' | 'offline' | 'pronto' | 'gerando' | 'posicionar' | 'assinando' | 'concluido';

const POS_KEY = 'assinatura_carimbo_pos';

function baixar(bytes: Uint8Array, nome: string) {
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = nome; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Última posição usada (para o próximo contrato abrir no mesmo lugar)
function posicaoLembrada(): { xMm: number; yMm: number } {
    try {
        const p = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
        if (p && Number.isFinite(p.xMm) && Number.isFinite(p.yMm)) return p;
    } catch { /* sem storage */ }
    return { xMm: 20, yMm: 200 };
}

export function AssinarContratoModal({ contratoId, numero, montarHtml, onClose, onAssinado }: Props) {
    const [etapa, setEtapa] = useState<Etapa>('verificando');
    const [certs, setCerts] = useState<CertificadoLocal[]>([]);
    const [thumb, setThumb] = useState('');
    const [passo, setPasso] = useState('');
    const [erro, setErro] = useState('');
    const [aviso, setAviso] = useState('');
    const [pdfAssinado, setPdfAssinado] = useState<Uint8Array | null>(null);

    // Posicionamento do carimbo
    const [pdfBase, setPdfBase] = useState<Uint8Array | null>(null);
    const [paginas, setPaginas] = useState<PaginaPrevia[]>([]);
    const [paginaAtual, setPaginaAtual] = useState(0);
    const [pos, setPos] = useState<{ pagina: number; xMm: number; yMm: number } | null>(null);
    const [semCarimbo, setSemCarimbo] = useState(false);
    const areaRef = useRef<HTMLDivElement>(null);
    const arrastando = useRef(false);

    const verificar = useCallback(async () => {
        setEtapa('verificando'); setErro('');
        if (!(await assinaturaDigitalService.assinadorOnline())) { setEtapa('offline'); return; }
        try {
            const lista = await assinaturaDigitalService.listarCertificados();
            setCerts(lista);
            setThumb(assinaturaDigitalService.escolherPadrao(lista)?.thumbprint ?? '');
            setEtapa('pronto');
        } catch (e: any) {
            setErro(e?.message || 'Falha ao listar os certificados.');
            setEtapa('pronto');
        }
    }, []);

    useEffect(() => { verificar(); }, [verificar]);

    const cert = certs.find((c) => c.thumbprint === thumb) ?? null;
    const semToken = certs.length > 0 && !certs.some((c) => c.hardware);

    const traduzirErro = (e: any): string => {
        const msg = String(e?.message || '');
        if (e?.name === 'AssinadorOffline') return 'Perdi a conexão com o Assinador MCI. Confira se a janela dele continua aberta.';
        if (/dynamically imported module|Importing a module script failed/i.test(msg))
            return 'O sistema foi atualizado enquanto esta aba estava aberta. Recarregue a página (Ctrl+F5) e tente de novo.';
        return msg || 'Falha ao assinar o contrato.';
    };

    // 1ª fase: gera o PDF e mostra as páginas para o usuário escolher onde a assinatura aparece
    const preparar = async () => {
        if (!cert) return;
        setEtapa('gerando'); setErro(''); setAviso('');
        try {
            const html = await montarHtml();
            const agora = new Date().toLocaleString('pt-BR');
            const { pdf, paginas: previas } = await assinaturaDigitalService.htmlParaPdf(
                html, `Assinado digitalmente por ${cert.nome} em ${agora} — conferir em validar.iti.gov.br`);
            setPdfBase(pdf);
            setPaginas(previas);
            const lembrada = posicaoLembrada();
            const ultima = Math.max(0, previas.length - 1);
            setPaginaAtual(ultima);
            setPos({ pagina: ultima, xMm: lembrada.xMm, yMm: lembrada.yMm });
            setEtapa('posicionar');
        } catch (e: any) {
            setErro(traduzirErro(e));
            setEtapa('pronto');
        }
    };

    // 2ª fase: assina com o carimbo na posição escolhida
    const assinar = async () => {
        if (!cert || !pdfBase) return;
        setEtapa('assinando'); setErro('');
        try {
            const carimbo: Carimbo | null = semCarimbo || !pos ? null : {
                pagina: pos.pagina, xMm: pos.xMm, yMm: pos.yMm, larguraMm: CARIMBO_LARGURA_MM, alturaMm: CARIMBO_ALTURA_MM,
            };
            if (carimbo) { try { localStorage.setItem(POS_KEY, JSON.stringify({ xMm: carimbo.xMm, yMm: carimbo.yMm })); } catch { /* sem storage */ } }

            setPasso('Aguardando o PIN do certificado (janela do token)...');
            const assinado = await assinaturaDigitalService.assinarPdf(pdfBase, cert, { motivo: `Contrato de locação nº ${numero}`, carimbo });
            assinaturaDigitalService.lembrarCertificado(cert.thumbprint);

            baixar(assinado, `contrato-${numero}-assinado.pdf`);
            setPdfAssinado(assinado);

            setPasso('Guardando o PDF assinado...');
            const salvo = await contratoLocacaoService.salvarPdfAssinado(contratoId, numero, assinado, cert.nome);
            if (!salvo.ok) setAviso(salvo.motivo || 'O PDF foi baixado, mas não ficou guardado no sistema.');
            else onAssinado();
            setEtapa('concluido');
        } catch (e: any) {
            setErro(traduzirErro(e));
            setEtapa('posicionar'); // mantém o PDF e a posição: dá para tentar de novo sem refazer tudo
        } finally {
            setPasso('');
        }
    };

    // Clique ou arraste na página: o carimbo fica centralizado no ponteiro
    const moverCarimbo = (clientX: number, clientY: number) => {
        const area = areaRef.current;
        if (!area) return;
        const r = area.getBoundingClientRect();
        const xMm = (clientX - r.left) / r.width * 210 - CARIMBO_LARGURA_MM / 2;
        const yMm = (clientY - r.top) / r.height * 297 - CARIMBO_ALTURA_MM / 2;
        setPos({
            pagina: paginaAtual,
            xMm: Math.round(Math.max(0, Math.min(210 - CARIMBO_LARGURA_MM, xMm))),
            yMm: Math.round(Math.max(0, Math.min(297 - CARIMBO_ALTURA_MM, yMm))),
        });
    };

    const ocupado = etapa === 'assinando' || etapa === 'gerando';
    const larga = etapa === 'posicionar' || etapa === 'assinando';

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={ocupado ? undefined : onClose}>
            <div className={`w-full ${larga ? 'max-w-2xl' : 'max-w-lg'} bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 my-auto`} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                    <PenLine className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    <div className="min-w-0">
                        <h2 className="font-bold text-slate-900 dark:text-white">Assinar contrato digitalmente</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{numero}</p>
                    </div>
                    <button onClick={onClose} disabled={ocupado} className="ml-auto text-slate-400 hover:text-slate-600 disabled:opacity-40">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4 text-sm">
                    {etapa === 'verificando' && (
                        <p className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Procurando o Assinador MCI neste computador...</p>
                    )}

                    {etapa === 'offline' && (
                        <>
                            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                                <p className="font-semibold flex items-center gap-2"><AlertCircle className="w-4 h-4" /> O Assinador MCI não está aberto</p>
                                <p className="mt-1">Ele é o programa que usa o certificado do seu pendrive. Instale uma única vez, neste computador:</p>
                                <ol className="list-decimal ml-5 mt-2 space-y-1">
                                    <li>
                                        <a href="/assinador/Instalar-Assinador-MCI.bat" download className="font-semibold underline">Baixe o instalador</a> e abra o arquivo baixado
                                        (se o navegador ou o Windows avisar, escolha "Manter" / "Executar assim mesmo").
                                    </li>
                                    <li>Depois disso ele abre sozinho, escondido, sempre que o Windows iniciar.</li>
                                    <li>Volte aqui e clique em "Verificar de novo".</li>
                                </ol>
                                <p className="mt-2 text-xs">Já instalou e continua aparecendo? Reinicie o computador ou rode o instalador de novo. Precisa do driver do token instalado.</p>
                            </div>
                            <button onClick={verificar} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium">
                                <RefreshCw className="w-4 h-4" /> Verificar de novo
                            </button>
                        </>
                    )}

                    {(etapa === 'pronto' || etapa === 'gerando') && (
                        <>
                            {certs.length === 0 ? (
                                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                                    Nenhum certificado digital encontrado. Conecte o pendrive (token), confira se o driver dele está instalado e atualize a lista.
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Certificado</label>
                                    <select
                                        value={thumb}
                                        onChange={(e) => setThumb(e.target.value)}
                                        disabled={ocupado}
                                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                    >
                                        {certs.map((c) => (
                                            <option key={c.thumbprint} value={c.thumbprint}>
                                                {c.hardware ? '🔑 ' : ''}{c.nome} — válido até {c.validade.split('-').reverse().join('/')}
                                            </option>
                                        ))}
                                    </select>
                                    {cert && (
                                        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                            <Usb className="w-3.5 h-3.5" />
                                            {cert.hardware ? 'Certificado do token/pendrive (A3)' : 'Certificado instalado no computador (não é de token)'} · emissor: {cert.emissor}
                                        </p>
                                    )}
                                    {semToken && (
                                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                                            Nenhum certificado de token foi detectado. Se o pendrive está conectado, atualize a lista.
                                        </p>
                                    )}
                                </div>
                            )}
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                No próximo passo você escolhe onde a assinatura aparece no contrato. O PIN do token é pedido pela janela do próprio fabricante; a chave nunca sai do pendrive.
                            </p>
                        </>
                    )}

                    {etapa === 'gerando' && (
                        <p className="flex items-center gap-2 text-brand-700 dark:text-brand-300"><Loader2 className="w-4 h-4 animate-spin" /> Gerando o PDF do contrato...</p>
                    )}

                    {larga && paginas.length > 0 && (
                        <div className="space-y-3">
                            <p className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                                <MousePointerClick className="w-4 h-4 text-brand-600" />
                                Clique ou arraste na página para escolher onde a assinatura aparece.
                            </p>

                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={() => setPaginaAtual((p) => Math.max(0, p - 1))}
                                    disabled={paginaAtual === 0 || etapa === 'assinando'}
                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-30"
                                ><ChevronLeft className="w-4 h-4" /></button>
                                <span className="text-xs text-slate-500 dark:text-slate-400">Página {paginaAtual + 1} de {paginas.length}</span>
                                <button
                                    onClick={() => setPaginaAtual((p) => Math.min(paginas.length - 1, p + 1))}
                                    disabled={paginaAtual >= paginas.length - 1 || etapa === 'assinando'}
                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-30"
                                ><ChevronRight className="w-4 h-4" /></button>
                            </div>

                            <div className="flex justify-center">
                                <div
                                    ref={areaRef}
                                    className={`relative w-full max-w-[420px] select-none touch-none border border-slate-300 dark:border-slate-600 shadow ${semCarimbo || etapa === 'assinando' ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
                                    style={{ aspectRatio: '210 / 297' }}
                                    onPointerDown={(e) => {
                                        if (semCarimbo || etapa === 'assinando') return;
                                        arrastando.current = true;
                                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                                        moverCarimbo(e.clientX, e.clientY);
                                    }}
                                    onPointerMove={(e) => { if (arrastando.current) moverCarimbo(e.clientX, e.clientY); }}
                                    onPointerUp={() => { arrastando.current = false; }}
                                    onPointerCancel={() => { arrastando.current = false; }}
                                >
                                    <img src={paginas[paginaAtual].imagem} alt={`Página ${paginaAtual + 1}`} className="absolute inset-0 w-full h-full pointer-events-none" draggable={false} />
                                    {!semCarimbo && pos && pos.pagina === paginaAtual && (
                                        <div
                                            className="absolute border-2 border-dashed border-brand-600 bg-brand-500/15 pointer-events-none flex items-center justify-center text-center overflow-hidden"
                                            style={{
                                                left: `${(pos.xMm / 210) * 100}%`, top: `${(pos.yMm / 297) * 100}%`,
                                                width: `${(CARIMBO_LARGURA_MM / 210) * 100}%`, height: `${(CARIMBO_ALTURA_MM / 297) * 100}%`,
                                            }}
                                        >
                                            <span className="text-[9px] leading-tight font-semibold text-brand-800 px-1">Assinado digitalmente por<br />{cert?.nome}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                <input type="checkbox" checked={semCarimbo} onChange={(e) => setSemCarimbo(e.target.checked)} disabled={etapa === 'assinando'} />
                                Assinar sem carimbo visível (a assinatura vale igual e continua verificável)
                            </label>
                            {!semCarimbo && pos && pos.pagina !== paginaAtual && (
                                <p className="text-xs text-slate-500">A assinatura está na página {pos.pagina + 1}. <button className="underline" onClick={() => setPaginaAtual(pos.pagina)}>Ir para lá</button></p>
                            )}
                        </div>
                    )}

                    {etapa === 'assinando' && (
                        <p className="flex items-center gap-2 text-brand-700 dark:text-brand-300"><Loader2 className="w-4 h-4 animate-spin" /> {passo}</p>
                    )}

                    {etapa === 'concluido' && (
                        <div className="space-y-3">
                            <p className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold"><CheckCircle className="w-5 h-5" /> Contrato assinado e baixado.</p>
                            {aviso
                                ? <p className="text-amber-700 dark:text-amber-400 text-xs">{aviso}</p>
                                : <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-green-600" /> O PDF assinado também ficou guardado no contrato.</p>}
                            {pdfAssinado && (
                                <button onClick={() => baixar(pdfAssinado, `contrato-${numero}-assinado.pdf`)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
                                    <Download className="w-4 h-4" /> Baixar de novo
                                </button>
                            )}
                        </div>
                    )}

                    {erro && (
                        <p className="flex items-start gap-2 text-red-600 dark:text-red-400"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {erro}</p>
                    )}
                </div>

                {(etapa === 'pronto' || etapa === 'gerando') && (
                    <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-end gap-3">
                        <button onClick={verificar} disabled={ocupado} className="inline-flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 disabled:opacity-40">
                            <RefreshCw className="w-4 h-4" /> Atualizar lista
                        </button>
                        <button
                            onClick={preparar}
                            disabled={!cert || ocupado}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium disabled:opacity-50"
                        >
                            {etapa === 'gerando' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                            Escolher onde assinar
                        </button>
                    </div>
                )}

                {(etapa === 'posicionar' || etapa === 'assinando') && (
                    <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-end gap-3">
                        <button onClick={() => { setEtapa('pronto'); setErro(''); }} disabled={etapa === 'assinando'} className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 disabled:opacity-40">
                            Voltar
                        </button>
                        <button
                            onClick={assinar}
                            disabled={etapa === 'assinando'}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium disabled:opacity-50"
                        >
                            {etapa === 'assinando' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                            Assinar aqui e baixar PDF
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
