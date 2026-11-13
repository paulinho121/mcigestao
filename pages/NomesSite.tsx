import { useState, useMemo } from 'react';
import { Globe, RefreshCw, Check, AlertCircle, Loader2, ArrowRight, Search } from 'lucide-react';
import { lojaIntegradaService, ResultadoComparacao, DiferencaNome, ProdutoLoja, CategoriaLoja, DiferencaTipo, ResultadoPrecos } from '../services/lojaIntegradaService';

const brl = (v: number | null) => (v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

const TIPOS_KEY = 'nomes_site_tipos_ids';

export const NomesSite: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [progresso, setProgresso] = useState('');
    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');
    const [resultado, setResultado] = useState<ResultadoComparacao | null>(null);
    const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
    const [busca, setBusca] = useState('');
    const [aplicando, setAplicando] = useState(false);

    // Tipos (categorias do site)
    const [loja, setLoja] = useState<ProdutoLoja[]>([]);
    const [categorias, setCategorias] = useState<CategoriaLoja[]>([]);
    const [tiposIds, setTiposIds] = useState<Set<number>>(() => {
        try { return new Set<number>(JSON.parse(localStorage.getItem(TIPOS_KEY) || '[]')); } catch { return new Set<number>(); }
    });
    const [difTipos, setDifTipos] = useState<DiferencaTipo[] | null>(null);
    const [tipoBusy, setTipoBusy] = useState(false);
    const [tipoMsg, setTipoMsg] = useState('');
    const [tipoErro, setTipoErro] = useState('');

    // Preços (preço cheio do site → products.price)
    const [precosRes, setPrecosRes] = useState<ResultadoPrecos | null>(null);
    const [selPrecos, setSelPrecos] = useState<Set<string>>(new Set());
    const [precoBusy, setPrecoBusy] = useState(false);
    const [precoProgresso, setPrecoProgresso] = useState('');
    const [precoMsg, setPrecoMsg] = useState('');
    const [precoErro, setPrecoErro] = useState('');

    const consultar = async () => {
        setLoading(true); setErro(''); setSucesso(''); setResultado(null); setSelecionados(new Set());
        try {
            setProgresso('Lendo catálogo da loja...');
            const catalogo = await lojaIntegradaService.buscarCatalogo((lidos, total) =>
                setProgresso(`Lendo catálogo da loja... ${lidos}/${total}`));
            setLoja(catalogo);
            setProgresso('Comparando com o estoque...');
            const r = await lojaIntegradaService.comparar(catalogo);
            setResultado(r);
            setSelecionados(new Set(r.diferencas.map((d) => d.id)));
        } catch (e: any) {
            setErro(e?.message || 'Falha ao consultar a Loja Integrada.');
        } finally {
            setLoading(false); setProgresso('');
        }
    };

    const filtradas = useMemo(() => {
        if (!resultado) return [];
        const q = busca.trim().toLowerCase();
        if (!q) return resultado.diferencas;
        return resultado.diferencas.filter((d) =>
            d.id.toLowerCase().includes(q) || d.nomeAtual.toLowerCase().includes(q) || d.nomeSite.toLowerCase().includes(q));
    }, [resultado, busca]);

    // Categorias em ordem de árvore (pai antes dos filhos), com a contagem de produtos da loja em cada uma
    const arvore = useMemo(() => {
        const contagem = new Map<number, number>();
        for (const p of loja) for (const c of p.categorias) contagem.set(c, (contagem.get(c) ?? 0) + 1);
        const filhos = new Map<number | null, CategoriaLoja[]>();
        for (const c of categorias) {
            const k = c.pai != null && categorias.some((x) => x.id === c.pai) ? c.pai : null;
            filhos.set(k, [...(filhos.get(k) ?? []), c]);
        }
        const linhas: { cat: CategoriaLoja; nivel: number; qtd: number }[] = [];
        const visitar = (pai: number | null, nivel: number) => {
            for (const c of (filhos.get(pai) ?? []).sort((a, b) => a.nome.localeCompare(b.nome))) {
                linhas.push({ cat: c, nivel, qtd: contagem.get(c.id) ?? 0 });
                visitar(c.id, nivel + 1);
            }
        };
        visitar(null, 0);
        return linhas;
    }, [categorias, loja]);

    const carregarCategorias = async () => {
        setTipoBusy(true); setTipoErro(''); setTipoMsg(''); setDifTipos(null);
        try { setCategorias(await lojaIntegradaService.buscarCategorias()); }
        catch (e: any) { setTipoErro(e?.message || 'Falha ao ler as categorias.'); }
        finally { setTipoBusy(false); }
    };

    const alternarTipo = (id: number) => {
        setDifTipos(null);
        setTiposIds((prev) => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id); else n.add(id);
            try { localStorage.setItem(TIPOS_KEY, JSON.stringify([...n])); } catch { /* sem storage */ }
            return n;
        });
    };

    const previaTipos = async () => {
        setTipoBusy(true); setTipoErro(''); setTipoMsg('');
        try { setDifTipos(await lojaIntegradaService.compararTipos(loja, categorias, tiposIds)); }
        catch (e: any) { setTipoErro(e?.message || 'Falha ao comparar os tipos.'); }
        finally { setTipoBusy(false); }
    };

    const aplicarTipos = async () => {
        if (!difTipos?.length) return;
        if (!window.confirm(`Definir o tipo de ${difTipos.length} produto(s) conforme o site? Só o campo "tipo" é alterado.`)) return;
        setTipoBusy(true); setTipoErro(''); setTipoMsg('');
        try {
            const { ok, falhas } = await lojaIntegradaService.aplicarTipos(difTipos);
            setTipoMsg(`${ok} tipo(s) atualizado(s).`);
            if (falhas.length) setTipoErro(`${falhas.length} falharam — a coluna "tipo" existe no banco? (${falhas.slice(0, 5).join(', ')})`);
            setDifTipos(difTipos.filter((d) => falhas.includes(d.id)));
        } catch (e: any) { setTipoErro(e?.message || 'Falha ao gravar os tipos.'); }
        finally { setTipoBusy(false); }
    };

    const consultarPrecos = async () => {
        setPrecoBusy(true); setPrecoErro(''); setPrecoMsg(''); setPrecosRes(null);
        try {
            setPrecoProgresso('Lendo preços da loja...');
            const precos = await lojaIntegradaService.buscarPrecos((n) => setPrecoProgresso(`Lendo preços da loja... ${n}`));
            setPrecoProgresso('Comparando com o estoque...');
            const r = await lojaIntegradaService.compararPrecos(loja, precos);
            setPrecosRes(r);
            setSelPrecos(new Set(r.diferencas.map((d) => d.id)));
        } catch (e: any) { setPrecoErro(e?.message || 'Falha ao consultar os preços.'); }
        finally { setPrecoBusy(false); setPrecoProgresso(''); }
    };

    const alternarPreco = (id: string) =>
        setSelPrecos((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

    const aplicarPrecos = async () => {
        if (!precosRes) return;
        const itens = precosRes.diferencas.filter((d) => selPrecos.has(d.id));
        if (itens.length === 0) return;
        if (!window.confirm(`Trocar o preço de ${itens.length} produto(s) pelo preço cheio do site?\n\nIsso altera o preço usado em contratos, Diretoria e demais telas. Um arquivo com os preços anteriores será baixado antes.`)) return;

        // Backup dos preços anteriores (permite desfazer)
        const csv = ['id;preco_anterior;preco_site', ...itens.map((i) => `${i.id};${i.precoAtual ?? ''};${i.precoSite}`)].join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        a.download = `precos-anteriores-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);

        setPrecoBusy(true); setPrecoErro(''); setPrecoMsg('');
        try {
            const { ok, falhas } = await lojaIntegradaService.aplicarPrecos(itens, (n) => setPrecoProgresso(`Atualizando... ${n}/${itens.length}`));
            setPrecoMsg(`${ok} preço(s) atualizado(s).`);
            if (falhas.length) setPrecoErro(`${falhas.length} falharam: ${falhas.slice(0, 5).join(', ')}${falhas.length > 5 ? '…' : ''}`);
            const feitos = new Set(itens.map((i) => i.id).filter((id) => !falhas.includes(id)));
            setPrecosRes({ ...precosRes, iguais: precosRes.iguais + ok, diferencas: precosRes.diferencas.filter((d) => !feitos.has(d.id)) });
            setSelPrecos(new Set());
        } catch (e: any) { setPrecoErro(e?.message || 'Falha ao gravar os preços.'); }
        finally { setPrecoBusy(false); setPrecoProgresso(''); }
    };

    const alternar = (id: string) =>
        setSelecionados((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const aplicar = async () => {
        if (!resultado) return;
        const itens: DiferencaNome[] = resultado.diferencas.filter((d) => selecionados.has(d.id));
        if (itens.length === 0) return;
        if (!window.confirm(`Atualizar o nome de ${itens.length} produto(s) para o texto exato do site? Esta ação altera o cadastro.`)) return;

        setAplicando(true); setErro(''); setSucesso('');
        try {
            const { ok, falhas } = await lojaIntegradaService.aplicar(itens, (feitos) =>
                setProgresso(`Atualizando... ${feitos}/${itens.length}`));
            setSucesso(`${ok} nome(s) atualizado(s).`);
            if (falhas.length) setErro(`${falhas.length} falharam (sem permissão ou erro): ${falhas.slice(0, 5).join(', ')}${falhas.length > 5 ? '…' : ''}`);
            const feitos = new Set(itens.map((i) => i.id).filter((id) => !falhas.includes(id)));
            setResultado({
                ...resultado,
                iguais: resultado.iguais + ok,
                diferencas: resultado.diferencas.filter((d) => !feitos.has(d.id)),
            });
            setSelecionados(new Set());
        } catch (e: any) {
            setErro(e?.message || 'Falha ao atualizar os nomes.');
        } finally {
            setAplicando(false); setProgresso('');
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
                <Globe className="w-7 h-7 text-brand-600 dark:text-brand-400" />
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Sincronizar com o Site</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
                Compara nome, preço e tipo dos produtos da loja (mci.tv) com os do estoque, casando o SKU da loja com o código do produto.
                Você revisa as diferenças antes de aplicar — cada bloco altera só o seu campo.
            </p>

            <button
                onClick={consultar}
                disabled={loading || aplicando}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium disabled:opacity-50 transition-colors"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {resultado ? 'Consultar de novo' : 'Consultar a loja'}
            </button>
            {progresso && <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">{progresso}</span>}

            {erro && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /> <span>{erro}</span>
                </div>
            )}
            {sucesso && (
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 flex items-center gap-2">
                    <Check className="w-5 h-5" /> {sucesso}
                </div>
            )}

            {resultado && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                        <Resumo label="Produtos na loja" valor={resultado.totalLoja} />
                        <Resumo label="Já iguais" valor={resultado.iguais} />
                        <Resumo label="Para atualizar" valor={resultado.diferencas.length} destaque />
                    </div>
                    {resultado.semCorrespondencia.length > 0 && (
                        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                            {resultado.semCorrespondencia.length} SKU(s) da loja não existem no estoque e foram ignorados.
                        </p>
                    )}

                    {resultado.diferencas.length > 0 && (
                        <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="p-4 flex flex-wrap items-center gap-3 border-b border-slate-200 dark:border-slate-700">
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={busca}
                                        onChange={(e) => setBusca(e.target.value)}
                                        placeholder="Filtrar por código ou nome"
                                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                    />
                                </div>
                                <button
                                    onClick={() => setSelecionados(selecionados.size === resultado.diferencas.length ? new Set() : new Set(resultado.diferencas.map((d) => d.id)))}
                                    className="text-sm text-brand-600 dark:text-brand-400 hover:underline"
                                >
                                    {selecionados.size === resultado.diferencas.length ? 'Desmarcar todos' : 'Marcar todos'}
                                </button>
                                <button
                                    onClick={aplicar}
                                    disabled={aplicando || selecionados.size === 0}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50"
                                >
                                    {aplicando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Aplicar {selecionados.size} nome(s)
                                </button>
                            </div>
                            <ul className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[60vh] overflow-y-auto">
                                {filtradas.map((d) => (
                                    <li key={d.id} className="p-4 flex gap-3 items-start">
                                        <input
                                            type="checkbox"
                                            checked={selecionados.has(d.id)}
                                            onChange={() => alternar(d.id)}
                                            className="mt-1 w-4 h-4"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                                {d.id}{!d.ativo && ' · inativo no site'}
                                            </div>
                                            <div className="text-sm text-slate-500 dark:text-slate-400 line-through break-words">{d.nomeAtual || '(sem nome)'}</div>
                                            <div className="flex items-start gap-1.5 text-sm font-medium text-slate-900 dark:text-white break-words">
                                                <ArrowRight className="w-4 h-4 mt-0.5 shrink-0 text-green-600" /> {d.nomeSite}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}

            {/* Preços do site */}
            {resultado && (
                <div className="mt-10 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Preços do site</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
                        Compara o <strong>preço cheio</strong> do site com o preço do produto no estoque. Ao aplicar, o preço do estoque passa a ser o do site.
                        Atenção: a sincronização de estoque do ERP também grava o preço e pode desfazer este ajuste na próxima execução.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                        <button onClick={consultarPrecos} disabled={precoBusy}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium disabled:opacity-50">
                            {precoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            {precosRes ? 'Consultar preços de novo' : 'Consultar preços'}
                        </button>
                        {precoProgresso && <span className="text-sm text-slate-500 dark:text-slate-400">{precoProgresso}</span>}
                    </div>
                    {precosRes && (
                        <>
                            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                                <span>Já iguais: <strong>{precosRes.iguais}</strong></span>
                                <span>Para atualizar: <strong>{precosRes.diferencas.length}</strong></span>
                                <span>Sem preço válido no site: <strong>{precosRes.semPrecoNoSite}</strong></span>
                            </div>
                            {precosRes.diferencas.length > 0 && (
                                <>
                                    <div className="mt-3 flex flex-wrap items-center gap-3">
                                        <button
                                            onClick={() => setSelPrecos(selPrecos.size === precosRes.diferencas.length ? new Set() : new Set(precosRes.diferencas.map((d) => d.id)))}
                                            className="text-sm text-brand-600 dark:text-brand-400 hover:underline">
                                            {selPrecos.size === precosRes.diferencas.length ? 'Desmarcar todos' : 'Marcar todos'}
                                        </button>
                                        <button onClick={aplicarPrecos} disabled={precoBusy || selPrecos.size === 0}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50">
                                            <Check className="w-4 h-4" /> Aplicar {selPrecos.size} preço(s)
                                        </button>
                                    </div>
                                    <ul className="mt-3 max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                                        {precosRes.diferencas.map((d) => {
                                            const pct = d.precoAtual ? ((d.precoSite - d.precoAtual) / d.precoAtual) * 100 : null;
                                            return (
                                                <li key={d.id} className="py-2 flex items-start gap-3">
                                                    <input type="checkbox" className="mt-1 w-4 h-4" checked={selPrecos.has(d.id)} onChange={() => alternarPreco(d.id)} />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-xs font-mono text-slate-500">{d.id}</div>
                                                        <div className="text-slate-700 dark:text-slate-200 truncate">{d.nome}</div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <span className="text-slate-400 line-through mr-2">{brl(d.precoAtual)}</span>
                                                        <span className="font-semibold text-slate-900 dark:text-white">{brl(d.precoSite)}</span>
                                                        {pct != null && (
                                                            <div className={`text-xs ${Math.abs(pct) >= 50 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-400'}`}>
                                                                {pct > 0 ? '+' : ''}{pct.toFixed(0)}%
                                                            </div>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </>
                            )}
                        </>
                    )}
                    {precoErro && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{precoErro}</p>}
                    {precoMsg && <p className="mt-3 text-sm text-green-600 dark:text-green-400">{precoMsg}</p>}
                </div>
            )}

            {/* Tipos de produto (categorias do site) */}
            {resultado && (
                <div className="mt-10 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tipo do produto (categorias do site)</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
                        Marque quais categorias do site são "tipos" (ex.: Modificadores, Tripés, Luminárias — não marque marcas ou promoções).
                        O tipo aparece no card do produto no Estoque.
                    </p>
                    {categorias.length === 0 ? (
                        <button onClick={carregarCategorias} disabled={tipoBusy}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium disabled:opacity-50">
                            {tipoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Carregar categorias
                        </button>
                    ) : (
                        <>
                            <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 border border-slate-100 dark:border-slate-700 rounded-lg">
                                {arvore.map(({ cat, nivel, qtd }) => (
                                    <li key={cat.id} className="px-3 py-1.5 flex items-center gap-2" style={{ paddingLeft: 12 + nivel * 20 }}>
                                        <input type="checkbox" className="w-4 h-4" checked={tiposIds.has(cat.id)} onChange={() => alternarTipo(cat.id)} />
                                        <span className="text-sm text-slate-800 dark:text-slate-200">{cat.nome}</span>
                                        <span className="text-xs text-slate-400">{qtd} produtos</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                <button onClick={previaTipos} disabled={tipoBusy || tiposIds.size === 0}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium disabled:opacity-50">
                                    {tipoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Ver prévia ({tiposIds.size} categorias)
                                </button>
                                {difTipos && difTipos.length > 0 && (
                                    <button onClick={aplicarTipos} disabled={tipoBusy}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50">
                                        <Check className="w-4 h-4" /> Aplicar {difTipos.length} tipo(s)
                                    </button>
                                )}
                                {difTipos && <span className="text-sm text-slate-500 dark:text-slate-400">{difTipos.length} produto(s) com tipo novo ou diferente</span>}
                            </div>
                            {difTipos && difTipos.length > 0 && (
                                <ul className="mt-3 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                                    {difTipos.slice(0, 200).map((d) => (
                                        <li key={d.id} className="py-1.5 flex gap-3">
                                            <span className="font-mono text-xs text-slate-500 w-24 shrink-0">{d.id}</span>
                                            <span className="text-slate-400 line-through">{d.tipoAtual || '(sem tipo)'}</span>
                                            <span className="font-medium text-slate-900 dark:text-white">→ {d.tipoSite}</span>
                                        </li>
                                    ))}
                                    {difTipos.length > 200 && <li className="py-1.5 text-xs text-slate-400">… e mais {difTipos.length - 200}</li>}
                                </ul>
                            )}
                        </>
                    )}
                    {tipoErro && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{tipoErro}</p>}
                    {tipoMsg && <p className="mt-3 text-sm text-green-600 dark:text-green-400">{tipoMsg}</p>}
                </div>
            )}
        </div>
    );
};

const Resumo: React.FC<{ label: string; valor: number; destaque?: boolean }> = ({ label, valor, destaque }) => (
    <div className={`p-4 rounded-xl border ${destaque
        ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800'
        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
        <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">{valor}</div>
    </div>
);
