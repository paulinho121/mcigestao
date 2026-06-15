import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Printer, ArrowLeft, FileText, Search, Save, CheckCircle } from 'lucide-react';
import { clienteService, Cliente } from '../services/clienteService';
import { vendedorService, Vendedor } from '../services/vendedorService';
import { inventoryService } from '../services/inventoryService';
import { contratoLocacaoService, gerarNumeroContrato } from '../services/contratoLocacaoService';
import { Product } from '../types';

interface ItemLocado {
    equipamento: string;
    fabricante: string;
    qtd: number;
    valorUni: number;
    percDiaria: number;
    valorVenal: number;
    valorTotal: number;
    image_url?: string;
}

interface ContratoData {
    numero: string;
    data: string;
    vendedor: string;
    filial: string;
    // Contratado (Locadora)
    locadoraNome: string;
    locadoraCnpj: string;
    locadoraEndereco: string;
    locadoraBairro: string;
    locadoraCidade: string;
    locadoraUf: string;
    locadoraCep: string;
    locadoraTelefone: string;
    locadoraEmail: string;
    // Contratante (Locatária)
    locatariaNome: string;
    locatariaCnpj: string;
    locatariaEndereco: string;
    locatariaBairro: string;
    locatariaCidade: string;
    locatariaUf: string;
    locatariaCep: string;
    locatariaTelefone: string;
    locatariaPessoaContato: string;
    locatariaEmail: string;
    locatariaInscEstadual: string;
    locatariaComp: string;
    // Itens
    itens: ItemLocado[];
    // Condições comerciais
    dataInicio: string;
    dataFim: string;
    dias: number;
    valorVenal: number;
    formaPagamento: string;
    frete: string;
    valorFrete: number;
    desconto: number;
    transportadora: string;
    valorTotal: number;
    // Responsável
    responsavelRetirada: string;
    cpfResponsavel: string;
    dataRetirada: string;
    observacoes: string;
}

const LOCADORA_POR_FILIAL: Record<string, Partial<ContratoData>> = {
    SC: {
        locadoraNome: 'MULTI COMERCIAL IMPORTADORA LTDA',
        locadoraCnpj: '05.502.390/0002-00',
        locadoraEndereco: 'RUA ODILIO GARCIA, 1369',
        locadoraBairro: 'CORDEIROS',
        locadoraCidade: 'ITAJAI',
        locadoraUf: 'SC',
        locadoraCep: '88310-180',
        locadoraTelefone: '(47) 3254-4700',
        locadoraEmail: 'FINANCEIRO@MCISTORE.COM.BR',
    },
    SP: {
        locadoraNome: 'MCI SP - MULTI COMERCIAL IMPORTADORA LTDA',
        locadoraCnpj: '05.502.390/0003-83',
        locadoraEndereco: 'AVENIDA IMPERATRIZ LEOPOLDINA, 1718 - SALA 2 3 4 E 5',
        locadoraBairro: 'VILA LEOPOLDINA',
        locadoraCidade: 'SAO PAULO',
        locadoraUf: 'SP',
        locadoraCep: '05305-003',
        locadoraTelefone: '(85) 3254-4700',
        locadoraEmail: 'FINANCEIRO@MCISTORE.COM.BR',
    },
    CE: {
        locadoraNome: 'MCI CE - MULTI COMERCIAL IMPORTADORA LTDA',
        locadoraCnpj: '05.502.390/0001-11',
        locadoraEndereco: 'RUA SENADOR POMPEU, 1547',
        locadoraBairro: 'CENTRO',
        locadoraCidade: 'FORTALEZA',
        locadoraUf: 'CE',
        locadoraCep: '60025-001',
        locadoraTelefone: '(85) 3208-2721',
        locadoraEmail: 'FINANCEIRO@MCISTORE.COM.BR',
    },
};

const LOCADORA_DEFAULT = LOCADORA_POR_FILIAL.SC as Required<Pick<ContratoData,
    'locadoraNome'|'locadoraCnpj'|'locadoraEndereco'|'locadoraBairro'|
    'locadoraCidade'|'locadoraUf'|'locadoraCep'|'locadoraTelefone'|'locadoraEmail'>>;

const ITEM_VAZIO: ItemLocado = {
    equipamento: '',
    fabricante: '',
    qtd: 1,
    valorUni: 0,
    percDiaria: 0,
    valorVenal: 0,
    valorTotal: 0,
};

/** Distribui o valor total do contrato pelos itens proporcionalmente ao valor venal */
function distribuirValor(itens: ItemLocado[], valorTotalDesejado: number, dias: number): ItemLocado[] {
    const totalVenal = itens.reduce((s, it) => s + it.valorVenal * it.qtd, 0);
    if (totalVenal <= 0 || dias <= 0 || valorTotalDesejado <= 0) return itens;
    return itens.map(item => {
        const peso = (item.valorVenal * item.qtd) / totalVenal;
        const totalItem = peso * valorTotalDesejado;
        const valorUni = item.qtd > 0 && dias > 0 ? totalItem / item.qtd / dias : 0;
        const percDiaria = item.valorVenal > 0 ? (valorUni / item.valorVenal) * 100 : 0;
        const valorTotal = valorUni * item.qtd * dias;
        return { ...item, valorUni, percDiaria, valorTotal };
    });
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

interface Props {
    onBack: () => void;
    contratoId?: string;   // se passado, carrega contrato existente para visualização
}

export function ContratoLocacaoForm({ onBack }: Props) {
    const [contrato, setContrato] = useState<ContratoData>({
        numero: '',
        data: new Date().toISOString().split('T')[0],
        vendedor: '',
        filial: 'SC',
        ...LOCADORA_DEFAULT,
        locatariaNome: '',
        locatariaCnpj: '',
        locatariaEndereco: '',
        locatariaBairro: '',
        locatariaCidade: '',
        locatariaUf: '',
        locatariaCep: '',
        locatariaTelefone: '',
        locatariaPessoaContato: '',
        locatariaEmail: '',
        locatariaInscEstadual: '',
        locatariaComp: '',
        itens: [{ ...ITEM_VAZIO }],
        dataInicio: new Date().toISOString().split('T')[0],
        dataFim: '',
        dias: 1,
        valorVenal: 0,
        formaPagamento: 'BOLETO',
        frete: 'COLETA + ENTREGA',
        valorFrete: 0,
        desconto: 0,
        transportadora: '',
        valorTotal: 0,
        responsavelRetirada: '',
        cpfResponsavel: '',
        dataRetirada: '',
        observacoes: '',
    });

    const [showPreview, setShowPreview] = useState(false);
    const [vendedores, setVendedores] = useState<Vendedor[]>([]);
    const [clienteSearch, setClienteSearch] = useState('');
    const [clienteSuggestions, setClienteSuggestions] = useState<Cliente[]>([]);
    const [showClienteDropdown, setShowClienteDropdown] = useState(false);
    const [clienteSearchTimeout, setClienteSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
    const [salvando, setSalvando] = useState(false);
    const [savedId, setSavedId] = useState<string | null>(null);

    useEffect(() => {
        vendedorService.listar().then(setVendedores);
        gerarNumeroContrato().then(numero => setContrato(prev => ({ ...prev, numero })));
    }, []);

    const handleClienteSearch = (value: string) => {
        setClienteSearch(value);
        if (clienteSearchTimeout) clearTimeout(clienteSearchTimeout);
        if (value.length < 2) { setClienteSuggestions([]); setShowClienteDropdown(false); return; }
        const t = setTimeout(async () => {
            const results = await clienteService.listar(value);
            setClienteSuggestions(results.slice(0, 8));
            setShowClienteDropdown(results.length > 0);
        }, 300);
        setClienteSearchTimeout(t);
    };

    const selectCliente = (c: Cliente) => {
        setContrato(prev => ({
            ...prev,
            locatariaNome: c.nome,
            locatariaCnpj: c.cnpj_cpf,
            locatariaEndereco: `${c.logradouro}${c.numero ? ', ' + c.numero : ''}`,
            locatariaComp: c.complemento || '',
            locatariaBairro: c.bairro || '',
            locatariaCidade: c.cidade || '',
            locatariaUf: c.uf || '',
            locatariaCep: c.cep || '',
            locatariaTelefone: c.telefone || '',
            locatariaEmail: c.email || '',
        }));
        setClienteSearch(c.nome);
        setShowClienteDropdown(false);
    };

    // Valor total desejado pelo usuário (entrada explícita)
    const [valorTotalDesejado, setValorTotalDesejado] = useState(0);
    // Unidade de duração: 'dias' | 'meses'
    const [unidadeDuracao, setUnidadeDuracao] = useState<'dias' | 'meses'>('dias');
    const [duracaoInput, setDuracaoInput] = useState(1);

    // Busca de produtos por linha
    const [produtoSearch, setProdutoSearch] = useState<Record<number, string>>({});
    const [produtoSuggestions, setProdutoSuggestions] = useState<Record<number, Product[]>>({});
    const [produtoDropdownOpen, setProdutoDropdownOpen] = useState<Record<number, boolean>>({});
    const produtoTimeouts = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

    const handleProdutoSearch = (index: number, value: string) => {
        setProdutoSearch(prev => ({ ...prev, [index]: value }));
        if (produtoTimeouts.current[index]) clearTimeout(produtoTimeouts.current[index]);
        if (value.length < 2) {
            setProdutoSuggestions(prev => ({ ...prev, [index]: [] }));
            setProdutoDropdownOpen(prev => ({ ...prev, [index]: false }));
            return;
        }
        produtoTimeouts.current[index] = setTimeout(async () => {
            const results = await inventoryService.searchProducts(value);
            setProdutoSuggestions(prev => ({ ...prev, [index]: results.slice(0, 8) }));
            setProdutoDropdownOpen(prev => ({ ...prev, [index]: results.length > 0 }));
        }, 300);
    };

    const selectProduto = (index: number, p: Product) => {
        setContrato(prev => {
            const itens = [...prev.itens];
            itens[index] = {
                ...itens[index],
                equipamento: p.name,
                fabricante: p.brand || '',
                valorVenal: p.price ?? itens[index].valorVenal,
                image_url: p.image_url || '',
            };
            const redistribuidos = distribuirValor(itens, valorTotalDesejado, prev.dias);
            return { ...prev, itens: redistribuidos };
        });
        setProdutoSearch(prev => ({ ...prev, [index]: p.name }));
        setProdutoDropdownOpen(prev => ({ ...prev, [index]: false }));
    };

    const set = (field: keyof ContratoData, value: unknown) =>
        setContrato(prev => ({ ...prev, [field]: value }));

    /** Atualiza um campo de item e redistribui valores se houver valor total desejado */
    const updateItem = (index: number, field: keyof ItemLocado, value: string | number) => {
        setContrato(prev => {
            const itens = [...prev.itens];
            itens[index] = { ...itens[index], [field]: value };
            const redistribuidos = distribuirValor(itens, valorTotalDesejado, prev.dias);
            return { ...prev, itens: redistribuidos };
        });
    };

    /** Quando valor total desejado ou dias mudam, redistribui todos os itens */
    const handleValorTotalChange = (novoValor: number) => {
        setValorTotalDesejado(novoValor);
        setContrato(prev => ({
            ...prev,
            itens: distribuirValor(prev.itens, novoValor, prev.dias),
        }));
    };

    /** Calcula data fim e nº de dias a partir da data início + duração + unidade */
    const calcularFim = (inicio: string, duracao: number, unidade: 'dias' | 'meses'): { dataFim: string; dias: number } => {
        if (!inicio || duracao <= 0) return { dataFim: '', dias: duracao };
        const d = new Date(inicio + 'T12:00:00');
        if (unidade === 'meses') {
            d.setMonth(d.getMonth() + duracao);
        } else {
            d.setDate(d.getDate() + duracao - 1);
        }
        const dataFim = d.toISOString().split('T')[0];
        // nº de dias corridos entre início e fim (inclusive)
        const ms = d.getTime() - new Date(inicio + 'T12:00:00').getTime();
        const dias = Math.round(ms / 86400000) + (unidade === 'dias' ? 0 : 0) || duracao;
        return { dataFim, dias: unidade === 'dias' ? duracao : dias };
    };

    const handleDuracaoChange = (valor: number, unidade: 'dias' | 'meses' = unidadeDuracao) => {
        setDuracaoInput(valor);
        const { dataFim, dias } = calcularFim(contrato.dataInicio, valor, unidade);
        setContrato(prev => ({
            ...prev,
            dias,
            dataFim,
            itens: distribuirValor(prev.itens, valorTotalDesejado, dias),
        }));
    };

    const handleUnidadeChange = (nova: 'dias' | 'meses') => {
        setUnidadeDuracao(nova);
        handleDuracaoChange(duracaoInput, nova);
    };

    const handleDataInicioChange = (novaData: string) => {
        const { dataFim, dias } = calcularFim(novaData, duracaoInput, unidadeDuracao);
        setContrato(prev => ({
            ...prev,
            dataInicio: novaData,
            dataFim,
            dias,
            itens: distribuirValor(prev.itens, valorTotalDesejado, dias),
        }));
    };


    const addItem = () =>
        setContrato(prev => {
            const itens = [...prev.itens, { ...ITEM_VAZIO }];
            return { ...prev, itens: distribuirValor(itens, valorTotalDesejado, prev.dias) };
        });

    const removeItem = (index: number) =>
        setContrato(prev => {
            const itens = prev.itens.filter((_, i) => i !== index);
            return { ...prev, itens: distribuirValor(itens, valorTotalDesejado, prev.dias) };
        });

    const totalDiaria = contrato.itens.reduce((s, it) => s + (it.valorUni * it.qtd), 0);
    const valorTotalCalculado = totalDiaria * contrato.dias;
    const valorTotalContrato = valorTotalCalculado + contrato.valorFrete - contrato.desconto;

    const handleSalvar = async () => {
        setSalvando(true);
        const result = await contratoLocacaoService.salvar({
            numero: contrato.numero,
            data: contrato.data,
            vendedor: contrato.vendedor,
            filial: contrato.filial,
            locadora_nome: contrato.locadoraNome,
            locadora_cnpj: contrato.locadoraCnpj,
            locadora_endereco: contrato.locadoraEndereco,
            locadora_bairro: contrato.locadoraBairro,
            locadora_cidade: contrato.locadoraCidade,
            locadora_uf: contrato.locadoraUf,
            locadora_cep: contrato.locadoraCep,
            locadora_telefone: contrato.locadoraTelefone,
            locadora_email: contrato.locadoraEmail,
            locataria_nome: contrato.locatariaNome,
            locataria_cnpj: contrato.locatariaCnpj,
            locataria_endereco: contrato.locatariaEndereco,
            locataria_bairro: contrato.locatariaBairro,
            locataria_cidade: contrato.locatariaCidade,
            locataria_uf: contrato.locatariaUf,
            locataria_cep: contrato.locatariaCep,
            locataria_telefone: contrato.locatariaTelefone,
            locataria_pessoa_contato: contrato.locatariaPessoaContato,
            locataria_email: contrato.locatariaEmail,
            locataria_insc_estadual: contrato.locatariaInscEstadual,
            locataria_comp: contrato.locatariaComp,
            data_inicio: contrato.dataInicio,
            data_fim: contrato.dataFim,
            dias: contrato.dias,
            valor_venal: contrato.itens.reduce((s, it) => s + it.valorVenal * it.qtd, 0),
            forma_pagamento: contrato.formaPagamento,
            frete: contrato.frete,
            valor_frete: contrato.valorFrete,
            desconto: contrato.desconto,
            transportadora: contrato.transportadora,
            valor_total: valorTotalContrato,
            total_diaria: totalDiaria,
            responsavel_retirada: contrato.responsavelRetirada,
            cpf_responsavel: contrato.cpfResponsavel,
            data_retirada: contrato.dataRetirada,
            observacoes: contrato.observacoes,
            itens: contrato.itens,
        });
        setSalvando(false);
        if (result.success) setSavedId(result.id ?? null);
    };

    const handlePrint = async () => {
        // Converte o logo para base64 para funcionar na janela de impressão
        let logoDataUrl = '';
        try {
            const resp = await fetch('/logo.png');
            const blob = await resp.blob();
            logoDataUrl = await new Promise<string>(resolve => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
        } catch { /* logo não encontrado, continua sem */ }

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const html = generateContratoHtml(contrato, totalDiaria, valorTotalContrato, logoDataUrl);
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 600);
    };

    if (showPreview) {
        return (
            <ContratoPreview
                contrato={contrato}
                totalDiaria={totalDiaria}
                valorTotalContrato={valorTotalContrato}
                onBack={() => setShowPreview(false)}
                onPrint={handlePrint}
            />
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Voltar
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Redigir Contrato de Locação</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Preencha os dados para gerar o contrato</p>
                </div>
                <div className="ml-auto flex gap-2">
                    <button
                        onClick={() => setShowPreview(true)}
                        className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg transition-colors"
                    >
                        <FileText className="w-4 h-4" />
                        Visualizar
                    </button>
                    <button
                        onClick={handleSalvar}
                        disabled={salvando}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${savedId ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                    >
                        {savedId ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {salvando ? 'Salvando...' : savedId ? 'Salvo!' : 'Salvar'}
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimir Contrato
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                {/* ── PASSO 1: Cliente ─────────────────────────────────────────── */}
                <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center gap-3 mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                        <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
                        <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">Cliente (Contratante)</h2>
                    </div>
                    {/* Busca rápida */}
                    <div className="mb-4 relative">
                        <label className="label-form">Buscar cliente cadastrado</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input className="input-form pl-9" value={clienteSearch} onChange={e => handleClienteSearch(e.target.value)} onFocus={() => clienteSuggestions.length > 0 && setShowClienteDropdown(true)} placeholder="Nome, CNPJ ou cidade..." />
                        </div>
                        {showClienteDropdown && (
                            <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                                {clienteSuggestions.map(c => (
                                    <button key={c.id} type="button" onClick={() => selectCliente(c)} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                        <div className="font-medium text-slate-800 dark:text-white text-sm">{c.nome}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{c.cnpj_cpf} · {c.cidade}/{c.uf}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="label-form">Razão Social / Nome</label>
                            <input className="input-form" value={contrato.locatariaNome} onChange={e => set('locatariaNome', e.target.value)} placeholder="Nome do contratante" />
                        </div>
                        <div>
                            <label className="label-form">CNPJ / CPF</label>
                            <input className="input-form" value={contrato.locatariaCnpj} onChange={e => set('locatariaCnpj', e.target.value)} placeholder="00.000.000/0000-00" />
                        </div>
                        <div>
                            <label className="label-form">Insc. Estadual</label>
                            <input className="input-form" value={contrato.locatariaInscEstadual} onChange={e => set('locatariaInscEstadual', e.target.value)} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="label-form">Endereço</label>
                            <input className="input-form" value={contrato.locatariaEndereco} onChange={e => set('locatariaEndereco', e.target.value)} placeholder="Rua, número" />
                        </div>
                        <div>
                            <label className="label-form">Complemento</label>
                            <input className="input-form" value={contrato.locatariaComp} onChange={e => set('locatariaComp', e.target.value)} placeholder="Sala, apto..." />
                        </div>
                        <div>
                            <label className="label-form">Bairro</label>
                            <input className="input-form" value={contrato.locatariaBairro} onChange={e => set('locatariaBairro', e.target.value)} />
                        </div>
                        <div>
                            <label className="label-form">Cidade / UF</label>
                            <div className="flex gap-2">
                                <input className="input-form flex-1" value={contrato.locatariaCidade} onChange={e => set('locatariaCidade', e.target.value)} placeholder="Cidade" />
                                <input className="input-form w-16" value={contrato.locatariaUf} onChange={e => set('locatariaUf', e.target.value)} placeholder="UF" maxLength={2} />
                            </div>
                        </div>
                        <div>
                            <label className="label-form">CEP</label>
                            <input className="input-form" value={contrato.locatariaCep} onChange={e => set('locatariaCep', e.target.value)} placeholder="00000-000" />
                        </div>
                        <div>
                            <label className="label-form">Telefone</label>
                            <input className="input-form" value={contrato.locatariaTelefone} onChange={e => set('locatariaTelefone', e.target.value)} />
                        </div>
                        <div>
                            <label className="label-form">Pessoa de Contato</label>
                            <input className="input-form" value={contrato.locatariaPessoaContato} onChange={e => set('locatariaPessoaContato', e.target.value)} />
                        </div>
                        <div>
                            <label className="label-form">E-mail</label>
                            <input className="input-form" value={contrato.locatariaEmail} onChange={e => set('locatariaEmail', e.target.value)} />
                        </div>
                    </div>
                </section>

                {/* ── PASSO 2: Valor + Duração ─────────────────────────────────── */}
                <section className="bg-white dark:bg-slate-800 rounded-xl border border-brand-200 dark:border-brand-800 p-6 ring-1 ring-brand-300 dark:ring-brand-700">
                    <div className="flex items-center gap-3 mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                        <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
                        <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">Valor do Contrato e Duração</h2>
                        <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">Os itens serão distribuídos automaticamente</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <label className="label-form">Valor Total do Contrato (R$) *</label>
                            <input
                                className="input-form text-lg font-semibold"
                                type="number"
                                step="0.01"
                                min="0"
                                value={valorTotalDesejado || ''}
                                onChange={e => handleValorTotalChange(parseFloat(e.target.value) || 0)}
                                placeholder="Ex: 2.637,75"
                            />
                        </div>
                        <div>
                            <label className="label-form">Duração *</label>
                            <div className="flex gap-1">
                                {/* Toggle dias / meses */}
                                <div className="flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleUnidadeChange('dias')}
                                        className={`px-3 py-2 text-sm font-medium transition-colors ${unidadeDuracao === 'dias' ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                                    >
                                        Dias
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleUnidadeChange('meses')}
                                        className={`px-3 py-2 text-sm font-medium transition-colors ${unidadeDuracao === 'meses' ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                                    >
                                        Meses
                                    </button>
                                </div>
                                <input
                                    className="input-form text-lg font-semibold min-w-0"
                                    type="number"
                                    min="1"
                                    value={duracaoInput}
                                    onChange={e => handleDuracaoChange(parseInt(e.target.value) || 1)}
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                                {contrato.dias} {contrato.dias === 1 ? 'dia' : 'dias'} corridos
                            </p>
                        </div>
                        <div className="flex flex-col justify-end">
                            <div className="bg-brand-50 dark:bg-brand-900/20 rounded-lg p-3 text-center">
                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Diária total</div>
                                <div className="text-lg font-bold text-brand-600 dark:text-brand-400">{formatCurrency(totalDiaria)}</div>
                            </div>
                        </div>
                        <div>
                            <label className="label-form">Data Início</label>
                            <input
                                className="input-form"
                                type="date"
                                value={contrato.dataInicio}
                                onChange={e => handleDataInicioChange(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="label-form">Data Fim <span className="text-brand-500 font-normal">(automática)</span></label>
                            <input
                                className="input-form bg-slate-50 dark:bg-slate-900/50 font-medium"
                                type="date"
                                value={contrato.dataFim}
                                readOnly
                            />
                        </div>
                        <div>
                            <label className="label-form">Forma de Pagamento</label>
                            <select className="input-form" value={contrato.formaPagamento} onChange={e => set('formaPagamento', e.target.value)}>
                                <option value="BOLETO">Boleto</option>
                                <option value="PIX">Pix</option>
                                <option value="CARTÃO">Cartão</option>
                                <option value="TRANSFERÊNCIA">Transferência</option>
                                <option value="DINHEIRO">Dinheiro</option>
                            </select>
                        </div>
                        <div>
                            <label className="label-form">Frete</label>
                            <select className="input-form" value={contrato.frete} onChange={e => set('frete', e.target.value)}>
                                <option value="COLETA + ENTREGA">Coleta + Entrega</option>
                                <option value="COLETA">Coleta</option>
                                <option value="ENTREGA">Entrega</option>
                                <option value="RETIRADA">Retirada no local</option>
                                <option value="SEM FRETE">Sem frete</option>
                            </select>
                        </div>
                        <div>
                            <label className="label-form">Valor Frete (R$)</label>
                            <input className="input-form" type="number" step="0.01" value={contrato.valorFrete} onChange={e => set('valorFrete', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                            <label className="label-form">Desconto (R$)</label>
                            <input className="input-form" type="number" step="0.01" value={contrato.desconto} onChange={e => set('desconto', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                            <label className="label-form">Transportadora</label>
                            <input className="input-form" value={contrato.transportadora} onChange={e => set('transportadora', e.target.value)} placeholder="Nome da transportadora" />
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">TOTAL FINAL:</span>
                            <span className="text-xl font-bold text-brand-600 dark:text-brand-400">{formatCurrency(valorTotalContrato)}</span>
                        </div>
                    </div>
                </section>

                {/* ── PASSO 3: Itens ───────────────────────────────────────────── */}
                <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center gap-3 mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                        <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
                        <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">Itens Locados</h2>
                        {valorTotalDesejado > 0 && (
                            <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                                Distribuição automática ativa
                            </span>
                        )}
                        <button onClick={addItem} className="ml-auto flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium">
                            <Plus className="w-4 h-4" />Adicionar Item
                        </button>
                    </div>

                    {valorTotalDesejado === 0 && (
                        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                            Defina o <strong>Valor Total do Contrato</strong> no passo 2 para distribuição automática das diárias.
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-slate-500 dark:text-slate-400 text-xs uppercase border-b border-slate-200 dark:border-slate-700">
                                    <th className="py-2 pr-2 text-left w-6">#</th>
                                    <th className="py-2 pr-2 text-left">Equipamento</th>
                                    <th className="py-2 pr-2 text-left w-32">Fabricante</th>
                                    <th className="py-2 pr-2 text-center w-16">Qtd</th>
                                    <th className="py-2 pr-2 text-right w-32">Valor Venal (R$)</th>
                                    <th className="py-2 pr-2 text-right w-28 text-brand-500">Diária Unit. <span className="normal-case font-normal text-slate-400">(calc.)</span></th>
                                    <th className="py-2 pr-2 text-right w-24 text-brand-500">% Diária <span className="normal-case font-normal text-slate-400">(calc.)</span></th>
                                    <th className="py-2 pr-2 text-right w-28 text-brand-500">Total <span className="normal-case font-normal text-slate-400">(calc.)</span></th>
                                    <th className="py-2 text-center w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {contrato.itens.map((item, i) => (
                                    <tr key={i}>
                                        <td className="py-2 pr-2 text-slate-400 text-xs">{i + 1}</td>
                                        <td className="py-2 pr-2 relative" style={{ minWidth: '220px' }}>
                                            <div className="relative">
                                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3 pointer-events-none" />
                                                <input
                                                    className="input-form-sm pl-6"
                                                    value={produtoSearch[i] !== undefined ? produtoSearch[i] : item.equipamento}
                                                    onChange={e => handleProdutoSearch(i, e.target.value)}
                                                    onFocus={() => { if ((produtoSuggestions[i]?.length ?? 0) > 0) setProdutoDropdownOpen(prev => ({ ...prev, [i]: true })); }}
                                                    onBlur={() => setTimeout(() => setProdutoDropdownOpen(prev => ({ ...prev, [i]: false })), 180)}
                                                    placeholder="Código ou descrição..."
                                                />
                                            </div>
                                            {produtoDropdownOpen[i] && produtoSuggestions[i]?.length > 0 && (
                                                <div className="absolute z-30 left-0 mt-1 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl max-h-52 overflow-y-auto">
                                                    {produtoSuggestions[i].map(p => (
                                                        <button key={p.id} type="button" onMouseDown={() => selectProduto(i, p)} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="font-medium text-slate-800 dark:text-white text-xs truncate">{p.name}</span>
                                                                <span className="text-xs text-slate-400 font-mono shrink-0">{p.id}</span>
                                                            </div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400">{p.brand}{p.price ? ` · ${formatCurrency(p.price)}` : ''}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-2 pr-2">
                                            <input className="input-form-sm" value={item.fabricante} onChange={e => updateItem(i, 'fabricante', e.target.value)} placeholder="Fabricante" />
                                        </td>
                                        <td className="py-2 pr-2">
                                            <input className="input-form-sm text-center" type="number" min="1" value={item.qtd} onChange={e => updateItem(i, 'qtd', parseFloat(e.target.value) || 1)} />
                                        </td>
                                        <td className="py-2 pr-2">
                                            <input
                                                className="input-form-sm text-right"
                                                type="number" step="0.01" min="0"
                                                value={item.valorVenal || ''}
                                                onChange={e => updateItem(i, 'valorVenal', parseFloat(e.target.value) || 0)}
                                                placeholder="0,00"
                                            />
                                        </td>
                                        {/* Campos calculados — somente leitura */}
                                        <td className="py-2 pr-2 text-right text-brand-600 dark:text-brand-400 font-medium text-xs">
                                            {item.valorUni > 0 ? formatCurrency(item.valorUni) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                                        </td>
                                        <td className="py-2 pr-2 text-right text-brand-600 dark:text-brand-400 font-medium text-xs">
                                            {item.percDiaria > 0 ? `${item.percDiaria.toFixed(2)}%` : <span className="text-slate-300 dark:text-slate-600">—</span>}
                                        </td>
                                        <td className="py-2 pr-2 text-right font-semibold text-slate-800 dark:text-white text-xs">
                                            {item.valorTotal > 0 ? formatCurrency(item.valorTotal) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                                        </td>
                                        <td className="py-2 text-center">
                                            {contrato.itens.length > 1 && (
                                                <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-slate-300 dark:border-slate-600">
                                    <td colSpan={5} className="py-3 pr-2 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        Venal total: {formatCurrency(contrato.itens.reduce((s, it) => s + it.valorVenal * it.qtd, 0))}
                                    </td>
                                    <td colSpan={2} className="py-3 pr-2 text-right text-sm font-semibold text-slate-600 dark:text-slate-300">Total por Diária:</td>
                                    <td className="py-3 pr-2 text-right font-bold text-slate-800 dark:text-white">{formatCurrency(totalDiaria)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </section>

                {/* ── Dados Gerais (identificação do contrato) ─────────────────── */}
                <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                        Identificação do Contrato
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="label-form">Nº Contrato</label>
                            <input className="input-form" value={contrato.numero} onChange={e => set('numero', e.target.value)} placeholder="Ex: 022" />
                        </div>
                        <div>
                            <label className="label-form">Data</label>
                            <input className="input-form" type="date" value={contrato.data} onChange={e => set('data', e.target.value)} />
                        </div>
                        <div>
                            <label className="label-form">Vendedor</label>
                            <select className="input-form" value={contrato.vendedor} onChange={e => set('vendedor', e.target.value)}>
                                <option value="">— Selecione —</option>
                                {vendedores.filter(v => v.ativo).map(v => (
                                    <option key={v.id} value={v.nome}>{v.nome}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label-form">Filial</label>
                            <select className="input-form" value={contrato.filial} onChange={e => {
                                const filial = e.target.value;
                                const dadosLocadora = LOCADORA_POR_FILIAL[filial];
                                setContrato(prev => ({ ...prev, filial, ...(dadosLocadora ?? {}) }));
                            }}>
                                <option value="SC">SC</option>
                                <option value="SP">SP</option>
                                <option value="CE">CE</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* ── Locadora ─────────────────────────────────────────────────── */}
                <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                        Contratado (Locadora)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="label-form">Razão Social</label>
                            <input className="input-form" value={contrato.locadoraNome} onChange={e => set('locadoraNome', e.target.value)} />
                        </div>
                        <div>
                            <label className="label-form">CNPJ</label>
                            <input className="input-form" value={contrato.locadoraCnpj} onChange={e => set('locadoraCnpj', e.target.value)} />
                        </div>
                        <div>
                            <label className="label-form">Telefone</label>
                            <input className="input-form" value={contrato.locadoraTelefone} onChange={e => set('locadoraTelefone', e.target.value)} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="label-form">Endereço</label>
                            <input className="input-form" value={contrato.locadoraEndereco} onChange={e => set('locadoraEndereco', e.target.value)} />
                        </div>
                        <div>
                            <label className="label-form">Bairro</label>
                            <input className="input-form" value={contrato.locadoraBairro} onChange={e => set('locadoraBairro', e.target.value)} />
                        </div>
                        <div>
                            <label className="label-form">Cidade / UF</label>
                            <div className="flex gap-2">
                                <input className="input-form flex-1" value={contrato.locadoraCidade} onChange={e => set('locadoraCidade', e.target.value)} placeholder="Cidade" />
                                <input className="input-form w-16" value={contrato.locadoraUf} onChange={e => set('locadoraUf', e.target.value)} placeholder="UF" maxLength={2} />
                            </div>
                        </div>
                        <div>
                            <label className="label-form">CEP</label>
                            <input className="input-form" value={contrato.locadoraCep} onChange={e => set('locadoraCep', e.target.value)} />
                        </div>
                        <div>
                            <label className="label-form">E-mail</label>
                            <input className="input-form" value={contrato.locadoraEmail} onChange={e => set('locadoraEmail', e.target.value)} />
                        </div>
                    </div>
                </section>

                {/* Responsável pela Retirada */}
                <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                        Responsável pela Retirada
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <label className="label-form">Nome do Responsável</label>
                            <input className="input-form" value={contrato.responsavelRetirada} onChange={e => set('responsavelRetirada', e.target.value)} />
                        </div>
                        <div>
                            <label className="label-form">CPF / Identidade</label>
                            <input className="input-form" value={contrato.cpfResponsavel} onChange={e => set('cpfResponsavel', e.target.value)} />
                        </div>
                        <div>
                            <label className="label-form">Data de Retirada</label>
                            <input className="input-form" type="date" value={contrato.dataRetirada} onChange={e => set('dataRetirada', e.target.value)} />
                        </div>
                    </div>
                </section>

                {/* Observações */}
                <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                        Observações
                    </h2>
                    <textarea
                        className="input-form w-full"
                        rows={4}
                        value={contrato.observacoes}
                        onChange={e => set('observacoes', e.target.value)}
                        placeholder="Observações adicionais sobre o contrato..."
                    />
                </section>

                {/* Ações finais */}
                <div className="flex justify-end gap-3 pb-8">
                    <button
                        onClick={() => setShowPreview(true)}
                        className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-lg transition-colors font-medium"
                    >
                        <FileText className="w-5 h-5" />
                        Visualizar Contrato
                    </button>
                    <button
                        onClick={handleSalvar}
                        disabled={salvando}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium shadow-sm ${savedId ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                    >
                        {savedId ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                        {salvando ? 'Salvando...' : savedId ? 'Contrato Salvo!' : 'Salvar Contrato'}
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-lg transition-colors font-medium shadow-sm"
                    >
                        <Printer className="w-5 h-5" />
                        Imprimir / Gerar PDF
                    </button>
                </div>
            </div>

            <style>{`
                .label-form { display: block; font-size: 0.75rem; font-weight: 500; color: #64748b; margin-bottom: 4px; }
                .dark .label-form { color: #94a3b8; }
                .input-form {
                    width: 100%; padding: 8px 12px; border-radius: 8px;
                    border: 1px solid #cbd5e1; outline: none; font-size: 0.875rem;
                    background: white; color: #1e293b;
                    transition: border-color 0.15s;
                }
                .input-form:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.2); }
                .dark .input-form { background: #334155; border-color: #475569; color: #f1f5f9; }
                .input-form-sm {
                    width: 100%; padding: 5px 8px; border-radius: 6px;
                    border: 1px solid #e2e8f0; outline: none; font-size: 0.8rem;
                    background: white; color: #1e293b;
                }
                .input-form-sm:focus { border-color: #6366f1; }
                .dark .input-form-sm { background: #334155; border-color: #475569; color: #f1f5f9; }
                select.input-form { cursor: pointer; }
            `}</style>
        </div>
    );
}

// ---- Preview Component ----
interface PreviewProps {
    contrato: ContratoData;
    totalDiaria: number;
    valorTotalContrato: number;
    onBack: () => void;
    onPrint: () => void;
}

function ContratoPreview({ contrato, totalDiaria, valorTotalContrato, onBack, onPrint }: PreviewProps) {
    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
                    >
                        <ArrowLeft className="w-4 h-4" /> Editar
                    </button>
                    <button
                        onClick={onPrint}
                        className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg"
                    >
                        <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
                    </button>
                </div>
                <div
                    className="bg-white shadow-lg rounded-lg p-8 text-xs font-sans text-black"
                    dangerouslySetInnerHTML={{ __html: getContratoBody(contrato, totalDiaria, valorTotalContrato) }}
                />
            </div>
        </div>
    );
}

// ---- HTML generation for print ----
const CLAUSULAS = [
    '01.- A LOCADORA, pelo presente, dá em locação ao LOCATÁRIO(s) bem(ns) móvel(is) discriminado(s) no QUADRO RESUMO anexo, que fica fazendo parte integrante deste instrumento e que será assinado neste ato pelo representante da LOCATÁRIA.',
    '02.- O prazo desta locação é aquele constante no quadro resumo, somente sendo prorrogado a exclusivo critério da LOCADORA, e desde que tenha sido solicitado pela LOCATÁRIA com uma antecedência mínima de 24 horas. A LOCADORA, todavia, não será obrigada a concordar com a prorrogação solicitada.',
    '02.1. - A devolução deverá ocorrer na data pactuada, impreterivelmente, de segunda a sexta-feira das 8H30 às 18h00.',
    '02.2. A devolução pode ser feita pela LOCATÁRIA ou ser solicitado o recolhimento no local indicado no resumo caso seja feita o recolhimento a LOCATÁRIA fica ciente que não haverá conferência no ato da entrega, de modo que não poderá posteriormente reclamar eventual irregularidade nos equipamentos, após o teste e conferência que será realizado pela LOCADORA, no dia próximo dia útil.',
    '03.- A não devolução imediata do equipamento findo o prazo estipulado, sujeitará a LOCATÁRIA a responder por perdas e danos a que der causa. Caso não seja devolvido fica autorizada a LOCADORA a retirar o equipamento, sem necessidade de notificação e/ou interpelação.',
    '04.- A título de aluguel do EQUIPAMENTO, a LOCATÁRIA pagará à LOCADORA, a importância constante no quadro resumo.',
    '05.- O pagamento do aluguel deverá ser efetuado à LOCADORA, no prazo e condições descritos no quadro resumo.',
    '06.- O EQUIPAMENTO será entregue à LOCATÁRIA, mediante a assinatura do Quadro Resumo, o qual constitui prova bastante de que o testou e de que o recebeu em perfeito estado de conservação, funcionamento e utilização, sem defeitos ou vícios de qualquer natureza, aparentes ou ocultos, visto estar obrigado a fazer os testes e inspeções que desejar, através de pessoal devidamente habilitado e com conhecimentos técnicos adequados.',
    '07.- Os consertos ou reparos que se fizerem necessários no decorrer do prazo da locação, apesar de serem da total responsabilidade da LOCATÁRIA, só poderão ser realizados por técnicos da LOCADORA ou em oficina expressamente aprovada por ela.',
    '08.- Finda a locação pelo decurso do prazo contratual ou por qualquer outro motivo, a LOCATÁRIA, às suas expensas e sob sua inteira responsabilidade, devolverá o EQUIPAMENTO na sede da LOCADORA, ou solicitar o recolhimento (Sujeito a cobrança de taxa) nas mesmas condições de uso, conservação, apresentação e funcionamento em que o recebeu, caracterizando-se a efetiva devolução pela assinatura da LOCADORA, no Quadro Resumo.',
    '09.- Todavia, a assinatura do aludido termo pela LOCADORA, não eximirá a LOCATÁRIA do pagamento de indenização devida nos moldes da cláusula 13, caso sejam apuradas posteriormente no prazo de 03 (três) dias, quaisquer irregularidades eventualmente não constatadas no ato da devolução.',
    '10.- Na hipótese da LOCATÁRIA infringir quaisquer cláusulas deste contrato, notadamente as relativas ao uso, operação e devolução do EQUIPAMENTO, infrações estas praticadas por ela ou sua equipe genericamente considerada, deverá indenizar a LOCADORA, por todas as perdas, prejuízos, despesas e honorários advocatícios a que deu causa.',
    '11.- No caso de perda, ou roubo a LOCATÁRIA é responsável pelo prejuízo.',
    '12.- A LOCADORA não assume qualquer responsabilidade por eventuais prejuízos que a LOCATÁRIA possa vir a sofrer pelo mau funcionamento do EQUIPAMENTO, uma vez que é obrigação desta é inspecioná-lo e testá-lo quando do seu recebimento, na forma da cláusula 07.',
    '13.- A LOCADORA não tem responsabilidade sob a capacidade da LOCATÁRIA em operar os equipamentos, nem tampouco em relação a qualidade do trabalho por ela gerados.',
    '14.- A LOCATÁRIA não poderá ceder, sublocar ou emprestar o EQUIPAMENTO, nem os direitos decorrentes deste contrato, sem prévia autorização por escrito da LOCADORA.',
    '15.- Será da exclusiva responsabilidade da LOCATÁRIA, a ocorrência de evento envolvendo responsabilidade por danos corporais e/ou materiais ou pecuniários causados a terceiros e decorrentes da posse, uso, transporte ou operação do EQUIPAMENTO, não cabendo à LOCADORA qualquer obrigação daí resultante.',
    '16.- A LOCATÁRIA deverá comunicar à LOCADORA os fatos e ocorrências envolvendo o EQUIPAMENTO, que não forem decorrentes do seu uso regular, inclusive danos, desastres, perdas, furto ou roubo, devendo ainda, tomar as providências cabíveis junto às autoridades oficiais, quando for o caso, e diligenciar por todos os meios possíveis para reavê-lo sem prejuízo da sua responsabilidade perante a LOCADORA.',
    '17.- Na forma do art.111 e seus parágrafos do Código de Processo Civil, as partes elegem como competente para dirimir dúvidas ou divergências oriundas do presente, o Foro Central desta Cidade. E, por estarem justas e contratadas, assinam o presente contrato, na presença das duas testemunhas abaixo:',
];

const ACCENT       = '#00B099';  // teal primário da logo
const ACCENT_DARK  = '#007a6e';  // teal escuro (texto sobre claro)
const ACCENT_LIGHT = '#e8faf8';  // teal muito claro (fundo de seção)
const ACCENT2      = '#A1D976';  // verde-limão secundário da logo
const BORDER       = '#b2e4de';  // borda teal suave

function getContratoBody(c: ContratoData, totalDiaria: number, valorTotal: number, logoDataUrl = ''): string {
    const itensPreenchidos = c.itens.filter(it => it.equipamento);
    const totalLinhas = Math.max(itensPreenchidos.length, 8);

    const itensRows = Array.from({ length: totalLinhas }, (_, i) => {
        const item = c.itens[i];
        const imgTag = item?.image_url
            ? `<img src="${item.image_url}" alt="" style="width:46px;height:34px;object-fit:contain;display:block;margin:0 auto;" />`
            : `<div style="width:46px;height:34px;background:#f5f5f5;border-radius:3px;margin:0 auto;"></div>`;
        if (!item || !item.equipamento) {
            return `<tr style="height:22px">
                <td style="border:1px solid ${BORDER};padding:2px 4px;text-align:center;color:#ccc;font-size:7.5pt;">${i + 1}</td>
                <td style="border:1px solid ${BORDER};width:52px;"></td>
                <td style="border:1px solid ${BORDER};"></td>
                <td style="border:1px solid ${BORDER};"></td>
                <td style="border:1px solid ${BORDER};"></td>
                <td style="border:1px solid ${BORDER};"></td>
                <td style="border:1px solid ${BORDER};"></td>
                <td style="border:1px solid ${BORDER};"></td>
                <td style="border:1px solid ${BORDER};"></td>
            </tr>`;
        }
        return `<tr style="background:#fff;">
            <td style="border:1px solid ${BORDER};padding:4px;text-align:center;font-size:8pt;font-weight:700;color:${ACCENT};">${i + 1}</td>
            <td style="border:1px solid ${BORDER};padding:3px;text-align:center;width:52px;">${imgTag}</td>
            <td style="border:1px solid ${BORDER};padding:5px 7px;font-size:8pt;font-weight:600;color:#1a1a1a;">${item.equipamento}</td>
            <td style="border:1px solid ${BORDER};padding:5px 4px;text-align:center;font-size:8pt;color:#444;">${item.fabricante || ''}</td>
            <td style="border:1px solid ${BORDER};padding:5px 4px;text-align:center;font-size:8.5pt;font-weight:700;">${item.qtd}</td>
            <td style="border:1px solid ${BORDER};padding:5px 4px;text-align:right;font-size:8pt;">${formatCurrency(item.valorUni)}</td>
            <td style="border:1px solid ${BORDER};padding:5px 4px;text-align:right;font-size:8pt;">${item.percDiaria.toFixed(4)}%</td>
            <td style="border:1px solid ${BORDER};padding:5px 4px;text-align:right;font-size:8pt;">${formatCurrency(item.valorVenal)}</td>
            <td style="border:1px solid ${BORDER};padding:5px 6px;text-align:right;font-size:8.5pt;font-weight:700;color:${ACCENT_DARK};">${formatCurrency(item.valorTotal)}</td>
        </tr>`;
    }).join('');

    const logoTag = logoDataUrl
        ? `<img src="${logoDataUrl}" alt="MCI Store" style="height:50px;max-width:180px;object-fit:contain;display:block;" />`
        : `<span style="font-size:16pt;font-weight:900;color:${ACCENT};letter-spacing:1px;">MCI Store</span>`;

    const totalVenal = c.itens.reduce((s, it) => s + it.valorVenal * it.qtd, 0);

    return `
    <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:9pt;color:#1a1a1a;max-width:210mm;margin:0 auto;background:#fff;">

        <!-- ══ CABEÇALHO ══ -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:12px;border-bottom:3px solid ${ACCENT};" cellpadding="0" cellspacing="0">
            <tr>
                <td style="padding:10px 0 10px 0;vertical-align:middle;width:200px;">
                    ${logoTag}
                </td>
                <td style="padding:10px 0;vertical-align:middle;text-align:center;">
                    <div style="font-size:14pt;font-weight:800;letter-spacing:2px;color:#111;text-transform:uppercase;">Contrato de Locação de Equipamentos</div>
                    ${c.numero ? `<div style="font-size:9pt;font-weight:400;color:${ACCENT_DARK};margin-top:3px;letter-spacing:.5px;">Nº&nbsp;${c.numero}</div>` : ''}
                </td>
                <td style="padding:10px 0;vertical-align:middle;text-align:right;width:160px;">
                    <div style="font-size:8pt;line-height:1.8;color:#555;">
                        <div><span style="color:#999;">Data:</span> <b style="color:#111;">${c.data ? formatDate(c.data) : '—'}</b></div>
                        <div><span style="color:#999;">Filial:</span> <b style="color:#111;">${c.filial}</b></div>
                        ${c.vendedor ? `<div><span style="color:#999;">Vendedor:</span> <b style="color:#111;">${c.vendedor}</b></div>` : ''}
                    </div>
                </td>
            </tr>
        </table>

        <!-- ══ PARTES ══ -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;" cellpadding="0" cellspacing="0">
            <tr>
                <td style="width:49%;padding:9px 11px;border:1px solid ${BORDER};border-top:2px solid ${ACCENT};border-radius:4px;vertical-align:top;">
                    <div style="font-size:7pt;font-weight:700;color:${ACCENT};text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px;padding-bottom:4px;border-bottom:1px solid ${ACCENT_LIGHT};">1. Contratada — Locadora</div>
                    <table style="width:100%;border-collapse:collapse;font-size:8pt;line-height:1.7;">
                        <tr><td style="color:#888;width:82px;padding:0;">Razão Social</td><td style="font-weight:700;color:#111;">${c.locadoraNome}</td></tr>
                        <tr><td style="color:#888;padding:0;">CNPJ</td><td>${c.locadoraCnpj}</td></tr>
                        <tr><td style="color:#888;padding:0;">Endereço</td><td>${c.locadoraEndereco}, ${c.locadoraBairro}</td></tr>
                        <tr><td style="color:#888;padding:0;">Cidade/UF</td><td>${c.locadoraCidade} – ${c.locadoraUf} &nbsp; CEP ${c.locadoraCep}</td></tr>
                        <tr><td style="color:#888;padding:0;">Telefone</td><td>${c.locadoraTelefone}</td></tr>
                        <tr><td style="color:#888;padding:0;">E-mail</td><td>${c.locadoraEmail}</td></tr>
                    </table>
                </td>
                <td style="width:2%;"></td>
                <td style="width:49%;padding:9px 11px;border:1px solid ${BORDER};border-top:2px solid ${ACCENT};border-radius:4px;vertical-align:top;">
                    <div style="font-size:7pt;font-weight:700;color:${ACCENT};text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px;padding-bottom:4px;border-bottom:1px solid ${ACCENT_LIGHT};">2. Contratante — Locatária</div>
                    <table style="width:100%;border-collapse:collapse;font-size:8pt;line-height:1.7;">
                        <tr><td style="color:#888;width:82px;padding:0;">Razão Social</td><td style="font-weight:700;color:#111;">${c.locatariaNome || '________________________________'}</td></tr>
                        <tr><td style="color:#888;padding:0;">CNPJ</td><td>${c.locatariaCnpj || ''}${c.locatariaInscEstadual ? `&nbsp;&nbsp;<span style="color:#888;">I.E.:</span> ${c.locatariaInscEstadual}` : ''}</td></tr>
                        <tr><td style="color:#888;padding:0;">Endereço</td><td>${c.locatariaEndereco || ''}${c.locatariaComp ? ', ' + c.locatariaComp : ''}</td></tr>
                        <tr><td style="color:#888;padding:0;">Cidade/UF</td><td>${c.locatariaCidade || ''}${c.locatariaUf ? ' – ' + c.locatariaUf : ''}${c.locatariaCep ? ' &nbsp;CEP ' + c.locatariaCep : ''}</td></tr>
                        <tr><td style="color:#888;padding:0;">Telefone</td><td>${c.locatariaTelefone || ''}${c.locatariaPessoaContato ? `&nbsp;&nbsp;<span style="color:#888;">Contato:</span> ${c.locatariaPessoaContato}` : ''}</td></tr>
                        <tr><td style="color:#888;padding:0;">E-mail</td><td>${c.locatariaEmail || ''}</td></tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- ══ QUADRO RESUMO — CONDIÇÕES ══ -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;border:1px solid ${BORDER};border-top:2px solid ${ACCENT};border-radius:4px;font-size:8.5pt;" cellpadding="0" cellspacing="0">
            <tr>
                <td style="padding:4px 8px;background:${ACCENT_LIGHT};border-bottom:1px solid ${BORDER};" colspan="4">
                    <span style="font-size:7pt;font-weight:700;color:${ACCENT};text-transform:uppercase;letter-spacing:.8px;">3. Quadro Resumo — Condições Comerciais</span>
                </td>
            </tr>
            <tr>
                <td style="padding:6px 9px;border-right:1px solid ${BORDER};width:36%;">
                    <span style="color:#888;font-size:7.5pt;">Período de locação</span><br/>
                    <b>${c.dataInicio ? formatDate(c.dataInicio) : '—'}</b> a <b>${c.dataFim ? formatDate(c.dataFim) : '—'}</b>
                    <span style="color:${ACCENT};font-weight:700;"> (${c.dias} dias)</span>
                </td>
                <td style="padding:6px 9px;border-right:1px solid ${BORDER};width:22%;">
                    <span style="color:#888;font-size:7.5pt;">Forma de pagamento</span><br/>
                    <b>${c.formaPagamento}</b>
                </td>
                <td style="padding:6px 9px;border-right:1px solid ${BORDER};width:22%;">
                    <span style="color:#888;font-size:7.5pt;">Frete</span><br/>
                    <b>${c.frete}</b>${c.valorFrete ? ` – ${formatCurrency(c.valorFrete)}` : ''}
                    ${c.transportadora ? `<br/><span style="color:#888;font-size:7.5pt;">${c.transportadora}</span>` : ''}
                </td>
                <td style="padding:6px 9px;text-align:right;">
                    <span style="color:#888;font-size:7.5pt;">Valor total do contrato</span><br/>
                    <span style="font-size:13pt;font-weight:800;color:${ACCENT};">${formatCurrency(valorTotal)}</span>
                    ${c.desconto ? `<br/><span style="color:#888;font-size:7.5pt;">Desconto: ${formatCurrency(c.desconto)}</span>` : ''}
                </td>
            </tr>
        </table>

        <!-- ══ ITENS LOCADOS ══ -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;border:1px solid ${BORDER};border-top:2px solid ${ACCENT};border-radius:4px;" cellpadding="0" cellspacing="0">
            <tr>
                <td colspan="9" style="padding:4px 8px;background:${ACCENT_LIGHT};border-bottom:1px solid ${BORDER};">
                    <span style="font-size:7pt;font-weight:700;color:${ACCENT};text-transform:uppercase;letter-spacing:.8px;">4. Descrição dos Itens Locados</span>
                </td>
            </tr>
            <tr style="background:#fafafa;font-size:7.5pt;font-weight:600;color:#555;">
                <td style="padding:5px 4px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};text-align:center;width:20px;">#</td>
                <td style="padding:5px 4px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};text-align:center;width:54px;">Foto</td>
                <td style="padding:5px 7px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};text-align:left;">Descrição do Equipamento</td>
                <td style="padding:5px 4px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};text-align:center;width:68px;">Fabricante</td>
                <td style="padding:5px 4px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};text-align:center;width:26px;">Qtd</td>
                <td style="padding:5px 4px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};text-align:right;width:70px;">Diária Unit.</td>
                <td style="padding:5px 4px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};text-align:right;width:56px;">% Diária</td>
                <td style="padding:5px 4px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};text-align:right;width:72px;">Valor Venal</td>
                <td style="padding:5px 4px;border-bottom:1px solid ${BORDER};text-align:right;width:78px;">Total Período</td>
            </tr>
            ${itensRows}
            <tr style="background:${ACCENT_LIGHT};">
                <td colspan="5" style="padding:5px 8px;border-top:1px solid ${BORDER};text-align:right;font-size:8pt;color:#555;">
                    Valor venal total dos equipamentos: <b style="color:#111;">${formatCurrency(totalVenal)}</b>
                </td>
                <td colspan="3" style="padding:5px 8px;border-top:1px solid ${BORDER};text-align:right;font-size:8pt;font-weight:600;color:#333;">Total diária (todos os itens):</td>
                <td style="padding:5px 8px;border-top:1px solid ${BORDER};text-align:right;font-weight:700;font-size:9pt;color:${ACCENT};">${formatCurrency(totalDiaria)}</td>
            </tr>
        </table>

        <!-- ══ RESPONSÁVEL PELA RETIRADA ══ -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;border:1px solid ${BORDER};border-top:2px solid ${ACCENT2};border-radius:4px;font-size:8.5pt;" cellpadding="0" cellspacing="0">
            <tr>
                <td colspan="2" style="padding:4px 8px;background:#f6fde8;border-bottom:1px solid ${BORDER};">
                    <span style="font-size:7pt;font-weight:700;color:#5a7a1a;text-transform:uppercase;letter-spacing:.8px;">5. Responsável pela Retirada e Devolução</span>
                </td>
            </tr>
            <tr>
                <td style="padding:6px 9px;border-right:1px solid ${BORDER};width:55%;">
                    <span style="color:#888;font-size:7.5pt;">Nome do responsável</span><br/>
                    <b>${c.responsavelRetirada || '________________________________________'}</b>
                    &nbsp;&nbsp;<span style="color:#888;font-size:7.5pt;">CPF/RG:</span> <b>${c.cpfResponsavel || '___________________'}</b>
                </td>
                <td style="padding:6px 9px;width:22%;">
                    <span style="color:#888;font-size:7.5pt;">Data de retirada</span><br/>
                    <b>${c.dataRetirada ? formatDate(c.dataRetirada) : '____/____/________'}</b>
                </td>
                <td style="padding:6px 9px;width:23%;border-left:1px solid ${BORDER};">
                    <span style="color:#888;font-size:7.5pt;">Data de devolução</span><br/>
                    <b>${c.dataFim ? formatDate(c.dataFim) : '____/____/________'}</b>
                </td>
            </tr>
            ${c.observacoes ? `<tr><td colspan="3" style="padding:5px 9px;border-top:1px solid ${BORDER};"><span style="color:#888;font-size:7.5pt;">Observações:</span> ${c.observacoes}</td></tr>` : ''}
        </table>

        <!-- ══ CLÁUSULAS ══ -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:10px;border:1px solid #e0e0e0;border-top:2px solid #999;border-radius:4px;" cellpadding="0" cellspacing="0">
            <tr>
                <td style="padding:4px 8px;background:#f5f5f5;border-bottom:1px solid #e0e0e0;">
                    <span style="font-size:7pt;font-weight:700;color:#444;text-transform:uppercase;letter-spacing:.8px;">6. Cláusulas e Condições Gerais</span>
                </td>
            </tr>
            <tr>
                <td style="padding:7px 10px;font-size:7pt;line-height:1.6;color:#333;column-count:2;column-gap:18px;">
                    ${CLAUSULAS.map(cl => `<p style="margin:0 0 5px 0;text-align:justify;">${cl}</p>`).join('')}
                </td>
            </tr>
        </table>

        <!-- ══ ASSINATURAS ══ -->
        <div style="font-size:7.5pt;color:#555;margin-bottom:6px;text-align:center;">
            Por estarem justas e contratadas, as partes assinam o presente instrumento em 02 (duas) vias de igual teor e forma, na presença das testemunhas abaixo.
        </div>
        <div style="text-align:center;font-size:8pt;color:#555;margin-bottom:18px;">
            ${c.locadoraCidade}, _________ de __________________________ de __________
        </div>
        <table style="width:100%;border-collapse:collapse;" cellpadding="0" cellspacing="0">
            <tr>
                <td style="width:48%;text-align:center;padding:0 8px;">
                    <div style="height:42px;border-bottom:1.5px solid #333;"></div>
                    <div style="margin-top:5px;font-size:8pt;line-height:1.55;">
                        <b>CONTRATADA — LOCADORA</b><br/>
                        ${c.locadoraNome}<br/>
                        <span style="color:#888;">CNPJ: ${c.locadoraCnpj}</span>
                    </div>
                </td>
                <td style="width:4%;"></td>
                <td style="width:48%;text-align:center;padding:0 8px;">
                    <div style="height:42px;border-bottom:1.5px solid #333;"></div>
                    <div style="margin-top:5px;font-size:8pt;line-height:1.55;">
                        <b>CONTRATANTE — LOCATÁRIA</b><br/>
                        ${c.locatariaNome || '________________________________'}<br/>
                        <span style="color:#888;">${c.locatariaCnpj ? 'CNPJ: ' + c.locatariaCnpj : ''}</span>
                    </div>
                </td>
            </tr>
            <tr>
                <td style="width:48%;text-align:center;padding:22px 8px 0;">
                    <div style="height:42px;border-bottom:1px solid #999;"></div>
                    <div style="margin-top:5px;font-size:7.5pt;color:#555;">
                        Testemunha 1<br/>CPF: _______________________
                    </div>
                </td>
                <td style="width:4%;"></td>
                <td style="width:48%;text-align:center;padding:22px 8px 0;">
                    <div style="height:42px;border-bottom:1px solid #999;"></div>
                    <div style="margin-top:5px;font-size:7.5pt;color:#555;">
                        Testemunha 2<br/>CPF: _______________________
                    </div>
                </td>
            </tr>
        </table>
    </div>
    `;
}

function generateContratoHtml(c: ContratoData, totalDiaria: number, valorTotal: number, logoDataUrl = ''): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8"/>
    <title>Contrato de Locação ${c.numero ? '— Nº ' + c.numero : ''}</title>
    <style>
        @page { size: A4; margin: 10mm 12mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9pt; color: #222; margin: 0; padding: 0; }
        * { box-sizing: border-box; }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            tr { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    ${getContratoBody(c, totalDiaria, valorTotal, logoDataUrl)}
</body>
</html>`;
}
