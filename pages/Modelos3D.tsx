import { useState, useEffect, useRef } from 'react';
import { Box, Search, Upload, Trash2, Loader2, Check, AlertCircle } from 'lucide-react';
import { modelo3dService, ProdutoComModelo, TAMANHO_MAX_MB } from '../services/modelo3dService';
import { ModeloAR } from '../components/ModeloAR';

export const Modelos3D: React.FC = () => {
    const [busca, setBusca] = useState('');
    const [resultados, setResultados] = useState<ProdutoComModelo[]>([]);
    const [buscando, setBuscando] = useState(false);
    const [selecionado, setSelecionado] = useState<ProdutoComModelo | null>(null);
    const [enviando, setEnviando] = useState(false);
    const [msg, setMsg] = useState('');
    const [erro, setErro] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [colunaOk, setColunaOk] = useState(true);

    useEffect(() => { modelo3dService.colunaDisponivel().then(setColunaOk); }, []);

    useEffect(() => {
        const t = setTimeout(async () => {
            if (busca.trim().length < 2) { setResultados([]); return; }
            setBuscando(true);
            try { setResultados(await modelo3dService.buscarProdutos(busca, colunaOk)); }
            catch (e: any) { setErro(e?.message || 'Falha na busca.'); }
            finally { setBuscando(false); }
        }, 350);
        return () => clearTimeout(t);
    }, [busca, colunaOk]);

    const escolher = (p: ProdutoComModelo) => { setSelecionado(p); setMsg(''); setErro(''); };

    const enviar = async (arquivo: File | undefined) => {
        if (!arquivo || !selecionado) return;
        setEnviando(true); setErro(''); setMsg('');
        try {
            const url = await modelo3dService.enviar(selecionado.id, arquivo);
            setSelecionado({ ...selecionado, model_glb_url: url });
            setResultados((r) => r.map((x) => (x.id === selecionado.id ? { ...x, model_glb_url: url } : x)));
            setMsg('Modelo enviado. O botão "Ver em 3D / AR" já aparece no card do produto.');
        } catch (e: any) {
            setErro(e?.message || 'Falha ao enviar o modelo.');
        } finally {
            setEnviando(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const remover = async () => {
        if (!selecionado || !window.confirm(`Remover o modelo 3D de "${selecionado.name}"?`)) return;
        setErro(''); setMsg('');
        try {
            await modelo3dService.remover(selecionado.id);
            setSelecionado({ ...selecionado, model_glb_url: null });
            setResultados((r) => r.map((x) => (x.id === selecionado.id ? { ...x, model_glb_url: null } : x)));
            setMsg('Modelo removido do produto.');
        } catch (e: any) { setErro(e?.message || 'Falha ao remover.'); }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
                <Box className="w-7 h-7 text-brand-600 dark:text-brand-400" />
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Modelos 3D / AR</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
                Envie o modelo 3D (<code>.glb</code>) de um produto para o cliente vê-lo em 3D e em Realidade Aumentada pelo celular.
                O modelo precisa estar em <strong>tamanho real</strong> (1 unidade = 1 metro); é esse tamanho que aparece no AR.
            </p>

            {!colunaOk && (
                <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm">
                    <strong>Falta preparar o banco:</strong> rode o arquivo <code>supabase/add_ar_modelos_3d.sql</code> no SQL Editor do Supabase.
                    Sem isso não dá para guardar os modelos. Depois, atualize esta página.
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="md:col-span-2">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            placeholder="Buscar produto por código ou nome"
                            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                    </div>
                    <ul className="mt-3 max-h-[60vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        {buscando && <li className="p-3 text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Buscando...</li>}
                        {!buscando && busca.trim().length >= 2 && resultados.length === 0 && <li className="p-3 text-sm text-slate-400">Nenhum produto encontrado</li>}
                        {resultados.map((p) => (
                            <li key={p.id}>
                                <button
                                    onClick={() => escolher(p)}
                                    className={`w-full text-left px-3 py-2.5 flex items-start gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 ${selecionado?.id === p.id ? 'bg-brand-50 dark:bg-brand-900/20' : ''}`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-mono text-slate-500">{p.id}</div>
                                        <div className="text-sm text-slate-800 dark:text-slate-100 line-clamp-2">{p.name}</div>
                                    </div>
                                    {p.model_glb_url && <span title="Já tem modelo 3D"><Check className="w-4 h-4 text-emerald-600 shrink-0 mt-1" /></span>}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="md:col-span-3">
                    {!selecionado ? (
                        <div className="h-full min-h-[200px] flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center">
                            Busque e escolha um produto para enviar ou ver o modelo 3D.
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                            <div>
                                <div className="text-xs font-mono text-slate-500">{selecionado.id}</div>
                                <div className="font-semibold text-slate-900 dark:text-white">{selecionado.name}</div>
                            </div>

                            <input ref={inputRef} type="file" accept=".glb,model/gltf-binary" className="hidden" onChange={(e) => enviar(e.target.files?.[0])} />
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => inputRef.current?.click()}
                                    disabled={enviando}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium disabled:opacity-50"
                                >
                                    {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                    {selecionado.model_glb_url ? 'Trocar modelo (.glb)' : 'Enviar modelo (.glb)'}
                                </button>
                                {selecionado.model_glb_url && (
                                    <button onClick={remover} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">
                                        <Trash2 className="w-4 h-4" /> Remover
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Até {TAMANHO_MAX_MB} MB. Formato .glb em escala real.</p>

                            {msg && <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400"><Check className="w-4 h-4" /> {msg}</p>}
                            {erro && <p className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {erro}</p>}

                            {selecionado.model_glb_url && (
                                <ModeloAR
                                    key={selecionado.model_glb_url}
                                    src={selecionado.model_glb_url}
                                    nome={selecionado.name}
                                    poster={selecionado.image_url}
                                    linkCompartilhar={`${window.location.origin}${window.location.pathname}#/share/${selecionado.id}`}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
