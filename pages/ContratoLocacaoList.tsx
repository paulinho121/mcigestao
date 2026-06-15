import { useState, useEffect, useCallback } from 'react';
import { Search, FileText, Trash2, Printer, ArrowLeft, Plus, Eye, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { contratoLocacaoService, ContratoLocacao } from '../services/contratoLocacaoService';
import { generateContratoHtml, imprimirContratoHtml, ContratoData, ContratoPreview } from './ContratoLocacaoForm';

interface Props {
    onNovo: () => void;
    onBack: () => void;
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr: string) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y}`;
}

export function ContratoLocacaoList({ onNovo, onBack }: Props) {
    const [contratos, setContratos] = useState<ContratoLocacao[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [excluindo, setExcluindo] = useState<string | null>(null);
    const [imprimindo, setImprimindo] = useState<string | null>(null);
    const [preview, setPreview] = useState<{ dados: ContratoData; totalDiaria: number; valorTotal: number } | null>(null);

    const carregar = useCallback(async (termo = '') => {
        setLoading(true);
        const data = await contratoLocacaoService.listar(termo);
        setContratos(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        carregar();
    }, [carregar]);

    // debounce na busca
    useEffect(() => {
        const t = setTimeout(() => carregar(search), 350);
        return () => clearTimeout(t);
    }, [search, carregar]);

    const carregarDadosContrato = async (id: string): Promise<{ dados: ContratoData; totalDiaria: number; valorTotal: number } | null> => {
        const c = await contratoLocacaoService.buscarPorId(id);
        if (!c) return null;
        const dados: ContratoData = {
            numero: c.numero, data: c.data, vendedor: c.vendedor, filial: c.filial,
            locadoraNome: c.locadora_nome, locadoraCnpj: c.locadora_cnpj,
            locadoraEndereco: c.locadora_endereco, locadoraBairro: c.locadora_bairro,
            locadoraCidade: c.locadora_cidade, locadoraUf: c.locadora_uf,
            locadoraCep: c.locadora_cep, locadoraTelefone: c.locadora_telefone,
            locadoraEmail: c.locadora_email,
            locatariaNome: c.locataria_nome, locatariaCnpj: c.locataria_cnpj,
            locatariaEndereco: c.locataria_endereco, locatariaBairro: c.locataria_bairro,
            locatariaCidade: c.locataria_cidade, locatariaUf: c.locataria_uf,
            locatariaCep: c.locataria_cep, locatariaTelefone: c.locataria_telefone,
            locatariaPessoaContato: c.locataria_pessoa_contato, locatariaEmail: c.locataria_email,
            locatariaInscEstadual: c.locataria_insc_estadual, locatariaComp: c.locataria_comp,
            itens: c.itens,
            dataInicio: c.data_inicio, dataFim: c.data_fim, dias: c.dias,
            valorVenal: c.valor_venal, formaPagamento: c.forma_pagamento,
            frete: c.frete, valorFrete: c.valor_frete, desconto: c.desconto,
            transportadora: c.transportadora, valorTotal: c.valor_total,
            responsavelRetirada: c.responsavel_retirada, cpfResponsavel: c.cpf_responsavel,
            dataRetirada: c.data_retirada, observacoes: c.observacoes,
            status: c.status,
        };
        return { dados, totalDiaria: c.total_diaria, valorTotal: c.valor_total };
    };

    const handleVisualizar = async (id: string) => {
        const resultado = await carregarDadosContrato(id);
        if (!resultado) { alert('Contrato não encontrado.'); return; }
        setPreview(resultado);
    };

    const handleReimprimir = async (id: string) => {
        setImprimindo(id);
        try {
            const resultado = await carregarDadosContrato(id);
            if (!resultado) { alert('Contrato não encontrado.'); return; }
            let logoDataUrl = '';
            try {
                const resp = await fetch('/logo.png');
                const blob = await resp.blob();
                logoDataUrl = await new Promise<string>(resolve => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
            } catch { /* sem logo */ }
            const html = generateContratoHtml(resultado.dados, resultado.totalDiaria, resultado.valorTotal, logoDataUrl);
            await imprimirContratoHtml(html);
        } finally {
            setImprimindo(null);
        }
    };

    const handleExcluir = async (id: string, numero: string) => {
        if (!confirm(`Excluir contrato ${numero}?`)) return;
        setExcluindo(id);
        await contratoLocacaoService.excluir(id);
        setExcluindo(null);
        carregar(search);
    };

    const handleStatus = async (id: string, atual: ContratoLocacao['status']) => {
        const proximo: ContratoLocacao['status'] =
            atual === 'aprovado'  ? 'negado' :
            atual === 'negado'    ? 'incorreto' :
            atual === 'incorreto' ? 'pendente' : 'aprovado';
        await contratoLocacaoService.atualizarStatus(id, proximo!);
        setContratos(prev => prev.map(c => c.id === id ? { ...c, status: proximo } : c));
    };

    if (preview) {
        const handlePrintPreview = async () => {
            let logoDataUrl = '';
            try {
                const resp = await fetch('/logo.png');
                const blob = await resp.blob();
                logoDataUrl = await new Promise<string>(resolve => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
            } catch { /* sem logo */ }
            const html = generateContratoHtml(preview.dados, preview.totalDiaria, preview.valorTotal, logoDataUrl);
            await imprimirContratoHtml(html);
        };
        return (
            <ContratoPreview
                contrato={preview.dados}
                totalDiaria={preview.totalDiaria}
                valorTotalContrato={preview.valorTotal}
                onBack={() => setPreview(null)}
                onPrint={handlePrintPreview}
            />
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Cabeçalho */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Voltar
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Contratos de Locação</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Busque por número, cliente ou CNPJ</p>
                </div>
                <button
                    onClick={onNovo}
                    className="ml-auto flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Novo Contrato
                </button>
            </div>

            {/* Busca */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                    placeholder="Buscar por número, nome do cliente ou CNPJ..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Tabela */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-400 dark:text-slate-500">Carregando...</div>
                ) : contratos.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhum contrato encontrado</p>
                        {search && <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Tente outra busca</p>}
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nº Contrato</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Cliente</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">CNPJ / CPF</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Período</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Valor Total</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Vendedor</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Filial</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
                                <th className="px-4 py-3 w-28"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {contratos.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">{c.numero}</span>
                                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{formatDate(c.data)}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-medium text-slate-800 dark:text-white">{c.locataria_nome || '—'}</span>
                                        {c.locataria_cidade && (
                                            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{c.locataria_cidade}/{c.locataria_uf}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-xs">{c.locataria_cnpj || '—'}</td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                        {c.data_inicio ? (
                                            <>
                                                <div className="text-xs">{formatDate(c.data_inicio)} → {formatDate(c.data_fim)}</div>
                                                <div className="text-xs text-slate-400 dark:text-slate-500">{c.dias} dias</div>
                                            </>
                                        ) : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-white">{formatCurrency(c.valor_total)}</td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.vendedor || '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{c.filial}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => handleStatus(c.id, c.status)}
                                            title="Clique para alternar status"
                                            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors whitespace-nowrap"
                                            style={
                                                c.status === 'aprovado'  ? { background: 'rgba(34,197,94,0.15)',  color: '#16a34a' } :
                                                c.status === 'negado'    ? { background: 'rgba(239,68,68,0.15)',  color: '#dc2626' } :
                                                c.status === 'incorreto' ? { background: 'rgba(249,115,22,0.15)', color: '#ea580c' } :
                                                                            { background: 'rgba(148,163,184,0.15)', color: '#64748b' }
                                            }
                                        >
                                            {c.status === 'aprovado'  ? <CheckCircle size={12} /> :
                                             c.status === 'negado'    ? <XCircle size={12} /> :
                                             c.status === 'incorreto' ? <AlertCircle size={12} /> :
                                                                         <Clock size={12} />}
                                            {c.status === 'aprovado'  ? 'Aprovado' :
                                             c.status === 'negado'    ? 'Negado' :
                                             c.status === 'incorreto' ? 'Incorreto' : 'Pendente'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 justify-end">
                                            <button
                                                title="Visualizar contrato"
                                                onClick={() => handleVisualizar(c.id)}
                                                className="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                title="Reimprimir"
                                                onClick={() => handleReimprimir(c.id)}
                                                disabled={imprimindo === c.id}
                                                className="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors disabled:opacity-40"
                                            >
                                                {imprimindo === c.id
                                                    ? <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                                    : <Printer className="w-4 h-4" />
                                                }
                                            </button>
                                            <button
                                                title="Excluir"
                                                onClick={() => handleExcluir(c.id, c.numero)}
                                                disabled={excluindo === c.id}
                                                className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {contratos.length > 0 && (
                    <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
                        {contratos.length} contrato{contratos.length !== 1 ? 's' : ''} encontrado{contratos.length !== 1 ? 's' : ''}
                    </div>
                )}
            </div>
        </div>
    );
}
