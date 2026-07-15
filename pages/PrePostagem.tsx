import { useState, useEffect } from 'react';
import {
    Package, User, Truck, Loader2, AlertCircle, CheckCircle2,
    Search, X, FileText, Download, Send, Copy, RotateCcw, Building2
} from 'lucide-react';
import { correiosPrepostagemService, PessoaPP, ItemDeclaracao, CriarPrePostagemResult } from '../services/correiosPrepostagemService';
import { inventoryService } from '../services/inventoryService';
import { Product } from '../types';

const EMPTY_PESSOA: PessoaPP = {
    nome: '', cpfCnpj: '', celular: '', email: '',
    endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' },
};

// Filiais MCI para preenchimento rápido do remetente
const FILIAIS_REM = [
    { label: 'SC — Joinville', nome: 'MULTI COMERCIAL IMPORTADORA', cnpj: '05502390000200', cep: '89218000' },
    { label: 'SP — São Paulo', nome: 'MULTI COMERCIAL IMPORTADORA', cnpj: '05502390000383', cep: '01310100' },
    { label: 'CE — Fortaleza', nome: 'MULTI COMERCIAL IMPORTADORA', cnpj: '05502390000111', cep: '60025001' },
];

const SERVICOS = [
    { co: '03220', nome: 'SEDEX' },
    { co: '03298', nome: 'PAC' },
];

function Field({ label, value, onChange, placeholder, className = '', type = 'text' }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string; type?: string;
}) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.18em]">{label}</label>
            <input
                type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className="w-full px-4 py-2.5 bg-slate-50 border-2 border-transparent rounded-xl focus:border-brand-500/40 focus:bg-white focus:ring-4 focus:ring-brand-500/5 transition-all outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 shadow-sm"
            />
        </div>
    );
}

// Sub-form de endereço com auto-preenchimento por CEP
function PessoaForm({ titulo, icon, pessoa, setPessoa, comEmail }: {
    titulo: string; icon: React.ReactNode; pessoa: PessoaPP; setPessoa: (p: PessoaPP) => void; comEmail: boolean;
}) {
    const [cepLoading, setCepLoading] = useState(false);
    const set = (patch: Partial<PessoaPP>) => setPessoa({ ...pessoa, ...patch });
    const setEnd = (patch: Partial<PessoaPP['endereco']>) => setPessoa({ ...pessoa, endereco: { ...pessoa.endereco, ...patch } });

    // Auto-preenche endereço quando o CEP tem 8 dígitos
    useEffect(() => {
        const cep = pessoa.endereco.cep.replace(/\D/g, '');
        if (cep.length !== 8) return;
        let cancel = false;
        setCepLoading(true);
        correiosPrepostagemService.consultarCep(cep)
            .then(r => {
                if (cancel || r.erro) return;
                setPessoa({
                    ...pessoa,
                    endereco: {
                        ...pessoa.endereco,
                        logradouro: r.logradouro || pessoa.endereco.logradouro,
                        bairro: r.bairro || pessoa.endereco.bairro,
                        cidade: r.cidade || pessoa.endereco.cidade,
                        uf: r.uf || pessoa.endereco.uf,
                    },
                });
            })
            .catch(() => {})
            .finally(() => { if (!cancel) setCepLoading(false); });
        return () => { cancel = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pessoa.endereco.cep]);

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                {icon} {titulo}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nome / Razão Social" value={pessoa.nome} onChange={v => set({ nome: v })} placeholder="Nome completo" />
                <Field label="CPF / CNPJ" value={pessoa.cpfCnpj} onChange={v => set({ cpfCnpj: v })} placeholder="Só números" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                    <Field label="CEP" value={pessoa.endereco.cep} onChange={v => setEnd({ cep: v })} placeholder="00000-000" />
                    {cepLoading && <Loader2 className="w-4 h-4 animate-spin text-brand-500 absolute right-3 top-8" />}
                </div>
                <Field label="Logradouro" value={pessoa.endereco.logradouro} onChange={v => setEnd({ logradouro: v })} placeholder="Rua / Avenida" className="sm:col-span-2" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="Número" value={pessoa.endereco.numero} onChange={v => setEnd({ numero: v })} placeholder="123" />
                <Field label="Complemento" value={pessoa.endereco.complemento || ''} onChange={v => setEnd({ complemento: v })} placeholder="Opcional" />
                <Field label="Bairro" value={pessoa.endereco.bairro} onChange={v => setEnd({ bairro: v })} placeholder="Bairro" />
                <div className="grid grid-cols-3 gap-2">
                    <Field label="Cidade" value={pessoa.endereco.cidade} onChange={v => setEnd({ cidade: v })} placeholder="Cidade" className="col-span-2" />
                    <Field label="UF" value={pessoa.endereco.uf} onChange={v => setEnd({ uf: v.toUpperCase().slice(0, 2) })} placeholder="UF" />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Celular" value={pessoa.celular} onChange={v => set({ celular: v })} placeholder="(00) 00000-0000" />
                {comEmail && <Field label="E-mail" value={pessoa.email || ''} onChange={v => set({ email: v })} placeholder="email@exemplo.com" />}
            </div>
        </div>
    );
}

export function PrePostagem() {
    const [remetente, setRemetente] = useState<PessoaPP>({ ...EMPTY_PESSOA });
    const [destinatario, setDestinatario] = useState<PessoaPP>({ ...EMPTY_PESSOA });
    const [codigoServico, setCodigoServico] = useState('03220');
    const [pesoKg, setPesoKg] = useState('');
    const [altura, setAltura] = useState('');
    const [largura, setLargura] = useState('');
    const [comprimento, setComprimento] = useState('');
    const [nf, setNf] = useState('');
    const [itens, setItens] = useState<ItemDeclaracao[]>([]);

    const [produtoQuery, setProdutoQuery] = useState('');
    const [produtoResults, setProdutoResults] = useState<Product[]>([]);
    const [searching, setSearching] = useState(false);

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CriarPrePostagemResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [rotuloLoading, setRotuloLoading] = useState(false);
    const [rotuloUrl, setRotuloUrl] = useState<string | null>(null);
    const [rotuloMsg, setRotuloMsg] = useState<string | null>(null);

    const ativo = correiosPrepostagemService.ativo();

    // Busca de produtos para a declaração de conteúdo
    useEffect(() => {
        const q = produtoQuery.trim();
        if (q.length < 2) { setProdutoResults([]); return; }
        setSearching(true);
        let cancel = false;
        const t = setTimeout(async () => {
            try { const r = await inventoryService.searchProducts(q); if (!cancel) setProdutoResults(r.slice(0, 6)); }
            catch { if (!cancel) setProdutoResults([]); }
            finally { if (!cancel) setSearching(false); }
        }, 400);
        return () => { cancel = true; clearTimeout(t); };
    }, [produtoQuery]);

    const prefillFilial = (f: typeof FILIAIS_REM[0]) => {
        setRemetente({ ...remetente, nome: f.nome, cpfCnpj: f.cnpj, endereco: { ...remetente.endereco, cep: f.cep } });
    };

    const addProduto = (p: Product) => {
        setItens(prev => [...prev, { conteudo: p.name.slice(0, 60), quantidade: 1, valor: Number(p.price) || 0 }]);
        setProdutoQuery(''); setProdutoResults([]);
    };
    const addItemManual = () => setItens(prev => [...prev, { conteudo: '', quantidade: 1, valor: 0 }]);
    const setItem = (i: number, patch: Partial<ItemDeclaracao>) => setItens(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
    const removeItem = (i: number) => setItens(prev => prev.filter((_, idx) => idx !== i));

    const validar = (): string | null => {
        for (const [nome, p] of [['Remetente', remetente], ['Destinatário', destinatario]] as const) {
            if (!p.nome || !p.cpfCnpj || !p.celular) return `${nome}: preencha nome, CPF/CNPJ e celular.`;
            const e = p.endereco;
            if (!e.cep || !e.logradouro || !e.numero || !e.bairro || !e.cidade || !e.uf)
                return `${nome}: endereço incompleto (CEP, logradouro, número, bairro, cidade, UF).`;
        }
        if (!pesoKg || parseFloat(pesoKg) <= 0) return 'Informe o peso da encomenda.';
        if (itens.length === 0) return 'Adicione ao menos um item na declaração de conteúdo.';
        if (itens.some(i => !i.conteudo)) return 'Todos os itens precisam de descrição.';
        return null;
    };

    const handleCriar = async () => {
        const v = validar();
        if (v) { setError(v); return; }
        setLoading(true); setError(null); setResult(null); setRotuloUrl(null); setRotuloMsg(null);
        try {
            const res = await correiosPrepostagemService.criar({
                remetente, destinatario, codigoServico,
                pesoKg: parseFloat(pesoKg),
                altura: altura ? parseFloat(altura) : undefined,
                largura: largura ? parseFloat(largura) : undefined,
                comprimento: comprimento ? parseFloat(comprimento) : undefined,
                itens, numeroNotaFiscal: nf || undefined,
            });
            if (res.erro) setError(res.erro);
            else setResult(res);
        } catch (e: any) {
            setError(e.message || 'Falha ao criar pré-postagem.');
        }
        setLoading(false);
    };

    const handleRotulo = async () => {
        if (!result) return;
        setRotuloLoading(true); setRotuloMsg(null); setRotuloUrl(null);
        try {
            const r = await correiosPrepostagemService.gerarRotulo({ id: result.id, codigoObjeto: result.codigoObjeto });
            if (r.erro) setRotuloMsg(r.erro);
            else if (r.pdfBase64) {
                const blob = await (await fetch(`data:application/pdf;base64,${r.pdfBase64}`)).blob();
                setRotuloUrl(URL.createObjectURL(blob));
            } else setRotuloMsg(r.msg || 'Rótulo em geração — tente novamente em instantes.');
        } catch (e: any) {
            setRotuloMsg(e.message || 'Falha ao gerar rótulo.');
        }
        setRotuloLoading(false);
    };

    const handleReset = () => {
        setRemetente({ ...EMPTY_PESSOA }); setDestinatario({ ...EMPTY_PESSOA });
        setPesoKg(''); setAltura(''); setLargura(''); setComprimento(''); setNf('');
        setItens([]); setResult(null); setError(null); setRotuloUrl(null); setRotuloMsg(null);
    };

    if (!ativo) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-16 text-center">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h2 className="text-lg font-black text-slate-700">Pré-Postagem Correios indisponível</h2>
                <p className="text-sm text-slate-500 mt-2">Defina <code>VITE_CORREIOS_ENABLED=true</code> e faça o deploy da função <code>correios-prepostagem</code>.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-20 font-sans">
            <div className="max-w-4xl mx-auto px-4 pt-10 space-y-6">
                {/* Header */}
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-600 text-[10px] font-black uppercase tracking-widest mb-4">
                        <Package className="w-3.5 h-3.5" /> Correios · Pré-Postagem
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-900">Pré-Postagem</h1>
                    <p className="text-slate-500 text-sm mt-2 max-w-xl mx-auto">
                        Crie a pré-postagem, obtenha o código de rastreio e gere o rótulo para impressão.
                    </p>
                </div>

                {!result && (
                    <>
                        {/* Remetente */}
                        <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest self-center mr-1">Preenchimento rápido:</span>
                                {FILIAIS_REM.map(f => (
                                    <button key={f.cnpj} type="button" onClick={() => prefillFilial(f)}
                                        className="px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wide bg-white border border-slate-200 text-slate-500 hover:border-amber-400 hover:text-amber-600 transition-all">
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                            <PessoaForm titulo="Remetente" icon={<Building2 className="w-4 h-4 text-amber-500" />} pessoa={remetente} setPessoa={setRemetente} comEmail />
                        </div>

                        {/* Destinatário */}
                        <PessoaForm titulo="Destinatário" icon={<User className="w-4 h-4 text-violet-500" />} pessoa={destinatario} setPessoa={setDestinatario} comEmail={false} />

                        {/* Encomenda */}
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Truck className="w-4 h-4 text-emerald-500" /> Encomenda
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {SERVICOS.map(s => (
                                    <button key={s.co} type="button" onClick={() => setCodigoServico(s.co)}
                                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${codigoServico === s.co ? 'bg-brand-600 text-white border-brand-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-brand-400'}`}>
                                        {s.nome}
                                    </button>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <Field label="Peso (kg)" value={pesoKg} onChange={setPesoKg} placeholder="Ex: 1.5" type="number" />
                                <Field label="Altura (cm)" value={altura} onChange={setAltura} placeholder="Ex: 10" type="number" />
                                <Field label="Largura (cm)" value={largura} onChange={setLargura} placeholder="Ex: 15" type="number" />
                                <Field label="Comprimento (cm)" value={comprimento} onChange={setComprimento} placeholder="Ex: 20" type="number" />
                            </div>
                            <Field label="Nº Nota Fiscal (opcional)" value={nf} onChange={setNf} placeholder="Número da NF-e" className="sm:max-w-xs" />
                        </div>

                        {/* Declaração de conteúdo */}
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <FileText className="w-4 h-4 text-brand-500" /> Declaração de Conteúdo
                            </p>
                            {/* Busca de produto */}
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                                <input value={produtoQuery} onChange={e => setProdutoQuery(e.target.value)}
                                    placeholder="Buscar produto para adicionar..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-transparent rounded-xl focus:border-brand-500/40 focus:bg-white outline-none text-sm font-semibold text-slate-800 shadow-sm" />
                                {searching && <Loader2 className="w-4 h-4 animate-spin text-brand-500 absolute right-3 top-3" />}
                                {produtoResults.length > 0 && (
                                    <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                                        {produtoResults.map(p => (
                                            <button key={p.id} type="button" onClick={() => addProduto(p)}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0">
                                                <span className="text-sm font-bold text-slate-700 truncate flex-1">{p.name}</span>
                                                <span className="text-[10px] font-black text-slate-400">#{p.id}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Itens */}
                            {itens.map((it, i) => (
                                <div key={i} className="flex items-end gap-2">
                                    <Field label={i === 0 ? 'Conteúdo' : ''} value={it.conteudo} onChange={v => setItem(i, { conteudo: v })} placeholder="Descrição do item" className="flex-1" />
                                    <Field label={i === 0 ? 'Qtd' : ''} value={String(it.quantidade)} onChange={v => setItem(i, { quantidade: v })} placeholder="1" type="number" className="w-16" />
                                    <Field label={i === 0 ? 'Valor (R$)' : ''} value={String(it.valor)} onChange={v => setItem(i, { valor: v })} placeholder="0,00" type="number" className="w-24" />
                                    <button type="button" onClick={() => removeItem(i)} className="p-2.5 mb-0.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={addItemManual} className="text-xs font-bold text-brand-600 hover:text-brand-700">+ Adicionar item manual</button>
                        </div>

                        {error && (
                            <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-600 font-medium">{error}</p>
                            </div>
                        )}

                        <button type="button" onClick={handleCriar} disabled={loading}
                            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${loading ? 'bg-slate-100 text-slate-400' : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20'}`}>
                            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Criando pré-postagem...</> : <><Send className="w-5 h-5" /> Criar Pré-Postagem</>}
                        </button>
                    </>
                )}

                {/* Resultado */}
                {result && (
                    <div className="bg-white rounded-3xl border border-emerald-200 shadow-lg p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Pré-Postagem criada!</h3>
                                <p className="text-xs text-slate-500">Guarde o código de rastreamento e gere o rótulo.</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-5 flex items-center justify-between gap-3 flex-wrap">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código de Rastreamento</p>
                                <p className="text-2xl font-black text-slate-900 tracking-tight">{result.codigoObjeto || '—'}</p>
                            </div>
                            {result.codigoObjeto && (
                                <button type="button" onClick={() => navigator.clipboard?.writeText(result.codigoObjeto!)}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100">
                                    <Copy className="w-4 h-4" /> Copiar
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button type="button" onClick={handleRotulo} disabled={rotuloLoading}
                                className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${rotuloLoading ? 'bg-slate-100 text-slate-400' : 'bg-brand-600 hover:bg-brand-700 text-white'}`}>
                                {rotuloLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando rótulo...</> : <><FileText className="w-4 h-4" /> Gerar Rótulo PDF</>}
                            </button>
                            {rotuloUrl && (
                                <a href={rotuloUrl} download={`rotulo-${result.codigoObjeto || 'correios'}.pdf`}
                                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 text-white">
                                    <Download className="w-4 h-4" /> Baixar Rótulo
                                </a>
                            )}
                            <button type="button" onClick={handleReset}
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-slate-100 text-slate-500 hover:bg-slate-200">
                                <RotateCcw className="w-4 h-4" /> Nova Pré-Postagem
                            </button>
                        </div>
                        {rotuloMsg && <p className="text-xs text-amber-600 font-medium">{rotuloMsg}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
