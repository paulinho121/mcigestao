import { useState, useEffect, useCallback } from 'react';
import { PenLine, X, Loader2, ShieldCheck, Usb, AlertCircle, RefreshCw, Download, CheckCircle } from 'lucide-react';
import { assinaturaDigitalService, CertificadoLocal } from '../../services/assinaturaDigitalService';
import { contratoLocacaoService } from '../../services/contratoLocacaoService';

interface Props {
    contratoId: string;
    numero: string;
    /** Monta o HTML do contrato (mesmo modelo da impressão). */
    montarHtml: () => Promise<string>;
    onClose: () => void;
    onAssinado: () => void;
}

type Etapa = 'verificando' | 'offline' | 'pronto' | 'assinando' | 'concluido';

function baixar(bytes: Uint8Array, nome: string) {
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = nome; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function AssinarContratoModal({ contratoId, numero, montarHtml, onClose, onAssinado }: Props) {
    const [etapa, setEtapa] = useState<Etapa>('verificando');
    const [certs, setCerts] = useState<CertificadoLocal[]>([]);
    const [thumb, setThumb] = useState('');
    const [passo, setPasso] = useState('');
    const [erro, setErro] = useState('');
    const [aviso, setAviso] = useState('');
    const [pdfAssinado, setPdfAssinado] = useState<Uint8Array | null>(null);

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

    const assinar = async () => {
        if (!cert) return;
        setEtapa('assinando'); setErro(''); setAviso('');
        try {
            setPasso('Gerando o PDF do contrato...');
            const html = await montarHtml();
            const agora = new Date().toLocaleString('pt-BR');
            const pdf = await assinaturaDigitalService.htmlParaPdf(
                html, `Assinado digitalmente por ${cert.nome} em ${agora} — conferir em validar.iti.gov.br`);

            setPasso('Aguardando o PIN do certificado (janela do token)...');
            const assinado = await assinaturaDigitalService.assinarPdf(pdf, cert, { motivo: `Contrato de locação nº ${numero}` });
            assinaturaDigitalService.lembrarCertificado(cert.thumbprint);

            baixar(assinado, `contrato-${numero}-assinado.pdf`);
            setPdfAssinado(assinado);

            setPasso('Guardando o PDF assinado...');
            const salvo = await contratoLocacaoService.salvarPdfAssinado(contratoId, numero, assinado, cert.nome);
            if (!salvo.ok) setAviso(salvo.motivo || 'O PDF foi baixado, mas não ficou guardado no sistema.');
            else onAssinado();
            setEtapa('concluido');
        } catch (e: any) {
            setErro(e?.name === 'AssinadorOffline'
                ? 'Perdi a conexão com o Assinador MCI. Confira se a janela dele continua aberta.'
                : (e?.message || 'Falha ao assinar o contrato.'));
            setEtapa('pronto');
        } finally {
            setPasso('');
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={etapa === 'assinando' ? undefined : onClose}>
            <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                    <PenLine className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    <div className="min-w-0">
                        <h2 className="font-bold text-slate-900 dark:text-white">Assinar contrato digitalmente</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{numero}</p>
                    </div>
                    <button onClick={onClose} disabled={etapa === 'assinando'} className="ml-auto text-slate-400 hover:text-slate-600 disabled:opacity-40">
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
                                <p className="mt-1">Ele é o programa que usa o certificado do seu pendrive. Para abrir:</p>
                                <ol className="list-decimal ml-5 mt-2 space-y-1">
                                    <li>Conecte o pendrive (token) com o certificado.</li>
                                    <li>Dê duplo clique em <strong>Assinador-MCI.bat</strong> (pasta <code>tools\assinador</code>).</li>
                                    <li>Deixe a janela preta aberta e volte aqui.</li>
                                </ol>
                            </div>
                            <button onClick={verificar} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium">
                                <RefreshCw className="w-4 h-4" /> Verificar de novo
                            </button>
                        </>
                    )}

                    {(etapa === 'pronto' || etapa === 'assinando') && (
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
                                        disabled={etapa === 'assinando'}
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
                                O PIN do token será pedido pela janela do próprio fabricante. O contrato é assinado no seu computador; a chave nunca sai do pendrive.
                            </p>
                        </>
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

                {(etapa === 'pronto' || etapa === 'assinando') && (
                    <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-end gap-3">
                        <button onClick={verificar} disabled={etapa === 'assinando'} className="inline-flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 disabled:opacity-40">
                            <RefreshCw className="w-4 h-4" /> Atualizar lista
                        </button>
                        <button
                            onClick={assinar}
                            disabled={!cert || etapa === 'assinando'}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium disabled:opacity-50"
                        >
                            {etapa === 'assinando' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                            Assinar e baixar PDF
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
