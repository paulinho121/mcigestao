import { useState, useMemo } from 'react';
import { Globe, RefreshCw, Check, AlertCircle, Loader2, ArrowRight, Search } from 'lucide-react';
import { lojaIntegradaService, ResultadoComparacao, DiferencaNome } from '../services/lojaIntegradaService';

export const NomesSite: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [progresso, setProgresso] = useState('');
    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');
    const [resultado, setResultado] = useState<ResultadoComparacao | null>(null);
    const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
    const [busca, setBusca] = useState('');
    const [aplicando, setAplicando] = useState(false);

    const consultar = async () => {
        setLoading(true); setErro(''); setSucesso(''); setResultado(null); setSelecionados(new Set());
        try {
            setProgresso('Lendo catálogo da loja...');
            const loja = await lojaIntegradaService.buscarCatalogo((lidos, total) =>
                setProgresso(`Lendo catálogo da loja... ${lidos}/${total}`));
            setProgresso('Comparando com o estoque...');
            const r = await lojaIntegradaService.comparar(loja);
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
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Nomes do Site</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
                Compara o nome dos produtos da loja (mci.tv) com o do estoque, casando o SKU da loja com o código do produto.
                Você revisa as diferenças antes de aplicar — só o nome é alterado.
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
