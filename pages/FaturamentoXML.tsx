import { useState, useCallback, useRef, useEffect, useId } from 'react';
import { supabase } from '../lib/supabase';
import {
    Upload, FileText, X, TrendingUp, DollarSign, Package,
    Users, Truck, AlertCircle, Download, Search,
    BarChart2, PieChart as PieIcon, Calendar,
    CheckCircle, RefreshCw, Printer
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
    AreaChart, Area
} from 'recharts';

// ─── Tipos ─────────────────────────────────────────────────────────────────
interface NotaFiscal {
    id: string;
    chave: string;
    numero: string;
    tipo: 'NFe' | 'NFSe';
    dataEmissao: string;
    cnpjEmitente: string;
    razaoSocialEmitente: string;
    cliente: string;
    cnpjCliente: string;
    municipio: string;
    uf: string;
    cfop: string;
    modalidade: Modalidade;
    valorFaturamento: number;
    frete: number;
    difal: number;
    impostos: number;
    gastoTotal: number;
    formaPagamento: string;
    vendedor: string;
    filial: string;
}

type Modalidade =
    | 'VENDA' | 'LOCAÇÃO'
    | 'DEMO' | 'RETORNO DE DEMO' | 'RETORNO DE LOCAÇÃO' | 'TRANSFERÊNCIA' | 'COMODATO'
    | 'RETORNO' | 'SERVIÇO' | 'COMPRA' | 'OUTROS';

// Apenas VENDA e LOCAÇÃO somam no faturamento
const MODALIDADES_FATURAMENTO: Modalidade[] = ['VENDA', 'LOCAÇÃO'];

// Todas as modalidades disponíveis para seleção manual
const TODAS_MODALIDADES: { value: Modalidade; label: string; receita: boolean }[] = [
    { value: 'VENDA',             label: 'Venda',              receita: true  },
    { value: 'LOCAÇÃO',           label: 'Locação',            receita: true  },
    { value: 'DEMO',              label: 'Demo',               receita: false },
    { value: 'RETORNO DE DEMO',   label: 'Retorno de Demo',    receita: false },
    { value: 'RETORNO DE LOCAÇÃO',label: 'Retorno de Locação', receita: false },
    { value: 'TRANSFERÊNCIA',     label: 'Transferência',      receita: false },
    { value: 'COMODATO',          label: 'Comodato',           receita: false },
    { value: 'RETORNO',           label: 'Retorno',            receita: false },
    { value: 'SERVIÇO',           label: 'Serviço',            receita: false },
    { value: 'COMPRA',            label: 'Compra',             receita: false },
    { value: 'OUTROS',            label: 'Outros',             receita: false },
];

function cfopParaModalidade(cfop: string): Modalidade {
    if (!cfop) return 'OUTROS';
    const mapeado = CFOP_MODALIDADE[cfop];
    if (mapeado) return mapeado;
    if (['1', '2', '3'].includes(cfop[0])) return 'COMPRA';
    return 'OUTROS';
}

// ─── Mapeamentos ────────────────────────────────────────────────────────────
const CFOP_MODALIDADE: Record<string, Modalidade> = {
    '5101': 'VENDA', '5102': 'VENDA', '6101': 'VENDA', '6102': 'VENDA',
    '5401': 'VENDA', '5403': 'VENDA', '5405': 'VENDA',
    '6401': 'VENDA', '6403': 'VENDA', '6404': 'VENDA',
    '5949': 'LOCAÇÃO', '6949': 'LOCAÇÃO',
    '1901': 'RETORNO', '1902': 'RETORNO', '1903': 'RETORNO', '1904': 'RETORNO',
    '2901': 'RETORNO', '2902': 'RETORNO',
    '5901': 'RETORNO', '5902': 'RETORNO', '6901': 'RETORNO', '6902': 'RETORNO',
    '1151': 'TRANSFERÊNCIA', '1152': 'TRANSFERÊNCIA', '2151': 'TRANSFERÊNCIA', '2152': 'TRANSFERÊNCIA',
    '5151': 'TRANSFERÊNCIA', '5152': 'TRANSFERÊNCIA', '6151': 'TRANSFERÊNCIA', '6152': 'TRANSFERÊNCIA',
};

const FORMA_PAGAMENTO: Record<string, string> = {
    '01': 'Dinheiro', '02': 'Cheque', '03': 'Cartão Crédito', '04': 'Cartão Débito',
    '05': 'Crédito Loja', '10': 'Vale Alimentação', '11': 'Vale Refeição',
    '12': 'Vale Presente', '13': 'Vale Combustível', '14': 'Duplicata Mercantil',
    '15': 'Boleto', '16': 'Depósito Bancário', '17': 'PIX',
    '18': 'Transferência Bancária', '19': 'Programa Fidelidade',
    '90': 'Sem Pagamento', '99': 'Outros',
};

const MODALIDADE_COLOR: Record<Modalidade, string> = {
    'VENDA':              '#6366f1',
    'LOCAÇÃO':            '#10b981',
    'DEMO':               '#f97316',
    'RETORNO DE DEMO':    '#fb923c',
    'RETORNO DE LOCAÇÃO': '#fbbf24',
    'TRANSFERÊNCIA':      '#3b82f6',
    'COMODATO':           '#8b5cf6',
    'RETORNO':            '#f59e0b',
    'SERVIÇO':            '#06b6d4',
    'COMPRA':             '#ef4444',
    'OUTROS':             '#94a3b8',
};

// ─── Vendedores ─────────────────────────────────────────────────────────────
const VENDEDORES = [
    'Vinicius Lando',
    'João Sousa',
    'João Gomes',
    'Geremias Wendel',
    'Sarah',
    'Francisco Jhon',
    'Paulinho',
    'Jonathan',
    'Isaac Viudez',
    'Felipe Aguiar',
    'Bianca Façanha',
] as const;

const VENDEDOR_COLOR: Record<string, { bg: string; text: string; border: string }> = {
    'Vinicius Lando':   { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' },
    'João Sousa':       { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
    'João Gomes':       { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    'Geremias Wendel':  { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    'Sarah':            { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' },
    'Francisco Jhon':   { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
    'Paulinho':         { bg: '#cffafe', text: '#155e75', border: '#67e8f9' },
    'Jonathan':         { bg: '#f0fdf4', text: '#14532d', border: '#4ade80' },
    'Isaac Viudez':     { bg: '#fdf2f8', text: '#701a75', border: '#e879f9' },
    'Felipe Aguiar':    { bg: '#fff1f2', text: '#9f1239', border: '#fda4af' },
    'Bianca Façanha':   { bg: '#f0f9ff', text: '#0c4a6e', border: '#38bdf8' },
};

// ─── Parser XML ─────────────────────────────────────────────────────────────
function parseXML(xmlText: string): NotaFiscal | null {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'application/xml');
        const err = doc.querySelector('parsererror');
        if (err) return null;

        const get = (tag: string) => doc.querySelector(tag)?.textContent?.trim() ?? '';

        // Detectar NFS-e vs NF-e
        const isNFSe = !!doc.querySelector('CompNfse, nfse, RPS, LoteRps, InfNfse');
        const tipo: 'NFe' | 'NFSe' = isNFSe ? 'NFSe' : 'NFe';

        if (isNFSe) {
            const valorServicos = parseFloat(get('ValorServicos') || get('vServ') || '0');
            const iss = parseFloat(get('ValorIss') || get('vISS') || '0');
            const numero = get('Numero') || get('numero') || '';
            const dataEmissao = get('DataEmissao') || get('dhEmi') || '';
            const cnpjEmitente = get('CnpjPrestador Cnpj') || get('CNPJ') || '';
            const razaoSocial = get('RazaoSocial') || '';
            const cliente = get('RazaoSocialTomador') || get('xNome') || '';
            const municipio = get('xMun') || '';
            const uf = get('UF') || get('uf') || '';

            return {
                id: crypto.randomUUID(),
                chave: '',
                numero,
                tipo,
                dataEmissao: dataEmissao.substring(0, 10),
                cnpjEmitente,
                razaoSocialEmitente: razaoSocial,
                cliente,
                cnpjCliente: '',
                municipio,
                uf,
                cfop: '',
                modalidade: 'SERVIÇO',
                valorFaturamento: valorServicos,
                frete: 0,
                difal: 0,
                impostos: iss,
                gastoTotal: iss,
                formaPagamento: 'Outros',
                vendedor: '',
                filial: detectarFilial(cnpjEmitente, uf),
            };
        }

        // NF-e
        const chave = get('chNFe') || doc.querySelector('infNFe')?.getAttribute('Id')?.replace('NFe', '') || '';
        const numero = get('nNF');
        const dataEmissao = (get('dhEmi') || get('dEmi')).substring(0, 10);
        const cnpjEmitente = get('emit CNPJ');
        const razaoSocial = get('emit xNome');
        const cliente = get('dest xNome') || get('xNome');
        const cnpjCliente = get('dest CNPJ') || get('dest CPF') || '';
        const municipio = get('dest xMun') || get('xMun');
        const uf = get('dest UF') || '';
        const cfop = get('CFOP');
        const formaPagCode = get('tPag');

        const vNF = parseFloat(get('vNF') || '0');
        const vFrete = parseFloat(get('vFrete') || '0');
        const vICMSUFDest = parseFloat(get('vICMSUFDest') || '0');
        const vFCP = parseFloat(get('vFCPUFDest') || get('vFCP') || '0');
        const vTotTrib = parseFloat(get('vTotTrib') || '0');

        const difal = vICMSUFDest + vFCP;
        const impostos = vTotTrib;
        const gastoTotal = vFrete + difal + impostos;
        const modalidade = cfopParaModalidade(cfop);

        return {
            id: crypto.randomUUID(),
            chave,
            numero,
            tipo,
            dataEmissao,
            cnpjEmitente,
            razaoSocialEmitente: razaoSocial,
            cliente,
            cnpjCliente,
            municipio,
            uf,
            cfop,
            modalidade,
            valorFaturamento: vNF,
            frete: vFrete,
            difal,
            impostos,
            gastoTotal,
            formaPagamento: FORMA_PAGAMENTO[formaPagCode] ?? formaPagCode ?? 'Outros',
            vendedor: '',
            filial: detectarFilial(cnpjEmitente, uf),
        };
    } catch {
        return null;
    }
}

function detectarFilial(cnpj: string, uf: string): string {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.includes('0001')) return 'CE';
    if (digits.includes('0002')) return 'SC';
    if (digits.includes('0003')) return 'SP';
    if (uf === 'SC') return 'SC';
    if (uf === 'SP') return 'SP';
    if (uf === 'CE') return 'CE';
    return uf || 'CE';
}

function fmt(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function fmtDate(dateStr: string) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

// ─── Componente principal ───────────────────────────────────────────────────
// ─── VendedorPicker ─────────────────────────────────────────────────────────
function VendedorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const id = useId();

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const cor = value && VENDEDOR_COLOR[value]
        ? VENDEDOR_COLOR[value]
        : { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' };

    return (
        <div ref={ref} className="relative" id={id}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold border whitespace-nowrap transition-all hover:opacity-80"
                style={{ backgroundColor: cor.bg, color: cor.text, borderColor: cor.border }}
            >
                {value || '+ Vendedor'}
                <svg className="w-3 h-3 opacity-60" viewBox="0 0 12 12" fill="none">
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {open && (
                <div className="absolute z-50 top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden min-w-[170px]">
                    {value && (
                        <button
                            type="button"
                            onClick={() => { onChange(''); setOpen(false); }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700"
                        >
                            — Remover vendedor
                        </button>
                    )}
                    {VENDEDORES.map(v => {
                        const c = VENDEDOR_COLOR[v];
                        return (
                            <button
                                key={v}
                                type="button"
                                onClick={() => { onChange(v); setOpen(false); }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                            >
                                <span
                                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: c.border }}
                                />
                                <span
                                    className="text-xs font-semibold"
                                    style={{ color: v === value ? c.text : undefined }}
                                >
                                    {v}
                                </span>
                                {v === value && (
                                    <svg className="w-3 h-3 ml-auto" style={{ color: c.text }} viewBox="0 0 12 12" fill="none">
                                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export function FaturamentoXML() {
    const [notas, setNotas] = useState<NotaFiscal[]>([]);
    const [erros, setErros] = useState<string[]>([]);
    const [dragging, setDragging] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [view, setView] = useState<'dashboard' | 'relatorio' | 'upload'>('upload');
    const [loadingDB, setLoadingDB] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // Filtros
    const [filtroData1, setFiltroData1] = useState('');
    const [filtroData2, setFiltroData2] = useState('');
    const [filtroFilial, setFiltroFilial] = useState('');
    const [filtroModalidade, setFiltroModalidade] = useState('');
    const [filtroVendedor, setFiltroVendedor] = useState('');
    const [filtroSearch, setFiltroSearch] = useState('');

    // Carrega histórico do Supabase ao montar
    useEffect(() => {
        if (!supabase) return;
        setLoadingDB(true);
        supabase
            .from('notas_fiscais_xml')
            .select('*')
            .order('data_emissao', { ascending: false })
            .limit(5000)
            .then(({ data, error }) => {
                if (!error && data && data.length > 0) {
                    const fromDB: NotaFiscal[] = data.map((r: Record<string, unknown>) => ({
                        id: r.id as string,
                        chave: (r.chave as string) ?? '',
                        numero: r.numero as string,
                        tipo: r.tipo as 'NFe' | 'NFSe',
                        dataEmissao: (r.data_emissao as string)?.substring(0, 10) ?? '',
                        cnpjEmitente: r.cnpj_emitente as string,
                        razaoSocialEmitente: r.razao_social_emitente as string,
                        cliente: r.cliente as string,
                        cnpjCliente: r.cnpj_cliente as string,
                        municipio: r.municipio as string,
                        uf: r.uf as string,
                        cfop: r.cfop as string,
                        modalidade: ((r.modalidade as string) || localStorage.getItem(`nfe_modalidade_${r.id}`) || 'OUTROS') as Modalidade,
                        valorFaturamento: Number(r.valor_faturamento),
                        frete: Number(r.frete),
                        difal: Number(r.difal),
                        impostos: Number(r.impostos),
                        gastoTotal: Number(r.gasto_total),
                        formaPagamento: r.forma_pagamento as string,
                        vendedor: (r.vendedor as string) || localStorage.getItem(`nfe_vendedor_${r.id}`) || '',
                        filial: r.filial as string,
                    }));
                    setNotas(fromDB);
                    setView('dashboard');
                }
                setLoadingDB(false);
            });
    }, []);

    const salvarNoBanco = async (novos: NotaFiscal[], existingChaves: Set<string>) => {
        if (!supabase) return;
        const paraInserir = novos
            .filter(n => !n.chave || !existingChaves.has(n.chave))
            .map(n => ({
                chave: n.chave || null,
                numero: n.numero,
                tipo: n.tipo,
                data_emissao: n.dataEmissao || null,
                cnpj_emitente: n.cnpjEmitente,
                razao_social_emitente: n.razaoSocialEmitente,
                cliente: n.cliente,
                cnpj_cliente: n.cnpjCliente,
                municipio: n.municipio,
                uf: n.uf,
                cfop: n.cfop,
                modalidade: n.modalidade,
                valor_faturamento: n.valorFaturamento,
                frete: n.frete,
                difal: n.difal,
                impostos: n.impostos,
                gasto_total: n.gastoTotal,
                forma_pagamento: n.formaPagamento,
                vendedor: n.vendedor,
                filial: n.filial,
            }));
        if (paraInserir.length === 0) return;
        await supabase.from('notas_fiscais_xml').insert(paraInserir);
    };

    const processFiles = useCallback(async (files: FileList | File[]) => {
        setProcessing(true);
        const arr = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.xml'));
        if (!arr.length) { setProcessing(false); return; }

        const novos: NotaFiscal[] = [];
        const errosArr: string[] = [];

        await Promise.all(arr.map(async (file) => {
            try {
                const text = await file.text();
                const nota = parseXML(text);
                if (nota) novos.push(nota);
                else errosArr.push(`${file.name}: XML inválido ou formato não suportado`);
            } catch {
                errosArr.push(`${file.name}: Erro ao ler arquivo`);
            }
        }));

        setNotas(prev => {
            const existingChaves = new Set(prev.map(n => n.chave).filter(Boolean));
            const filtered = novos.filter(n => !n.chave || !existingChaves.has(n.chave));
            salvarNoBanco(novos, existingChaves);
            return [...prev, ...filtered];
        });
        setErros(prev => [...prev, ...errosArr]);
        setProcessing(false);
        if (novos.length > 0) setView('dashboard');
    }, []);

    const atualizarVendedor = async (id: string, vendedor: string) => {
        setNotas(prev => prev.map(n => n.id === id ? { ...n, vendedor } : n));
        try {
            const chave = `nfe_vendedor_${id}`;
            if (vendedor) localStorage.setItem(chave, vendedor);
            else localStorage.removeItem(chave);
        } catch { /* ignore */ }
        if (supabase) {
            const { error } = await supabase.from('notas_fiscais_xml').update({ vendedor }).eq('id', id);
            if (error) console.error('Erro ao salvar vendedor:', error.message);
        }
    };

    const atualizarModalidade = async (id: string, modalidade: Modalidade) => {
        setNotas(prev => prev.map(n => n.id === id ? { ...n, modalidade } : n));
        try {
            localStorage.setItem(`nfe_modalidade_${id}`, modalidade);
        } catch { /* ignore */ }
        if (supabase) {
            const { error } = await supabase.from('notas_fiscais_xml').update({ modalidade }).eq('id', id);
            if (error) console.error('Erro ao salvar modalidade:', error.message);
        }
    };

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        processFiles(e.dataTransfer.files);
    }, [processFiles]);

    // Filtragem
    const notasFiltradas = notas.filter(n => {
        if (filtroData1 && n.dataEmissao < filtroData1) return false;
        if (filtroData2 && n.dataEmissao > filtroData2) return false;
        if (filtroFilial && n.filial !== filtroFilial) return false;
        if (filtroModalidade && n.modalidade !== filtroModalidade) return false;
        if (filtroVendedor && n.vendedor !== filtroVendedor) return false;
        if (filtroSearch) {
            const s = filtroSearch.toLowerCase();
            if (!n.cliente.toLowerCase().includes(s) &&
                !n.numero.includes(s) &&
                !n.cnpjCliente.includes(s)) return false;
        }
        return true;
    });

    // Métricas — COMPRA não entra no faturamento
    const notasFat = notasFiltradas.filter(n => MODALIDADES_FATURAMENTO.includes(n.modalidade));
    const totalFaturamento = notasFat.reduce((s, n) => s + n.valorFaturamento, 0);
    const totalFrete = notasFiltradas.reduce((s, n) => s + n.frete, 0);
    const totalDifal = notasFiltradas.reduce((s, n) => s + n.difal, 0);
    const totalImpostos = notasFiltradas.reduce((s, n) => s + n.impostos, 0);
    const totalGasto = notasFiltradas.reduce((s, n) => s + n.gastoTotal, 0);
    const lucroBruto = totalFaturamento - totalGasto;
    const clientesUnicos = new Set(notasFat.map(n => n.cnpjCliente || n.cliente)).size;

    // Dados para gráficos — usa apenas notas de faturamento (exclui COMPRA)
    const porFilial = Object.entries(
        notasFat.reduce((acc, n) => {
            acc[n.filial] = (acc[n.filial] || 0) + n.valorFaturamento;
            return acc;
        }, {} as Record<string, number>)
    ).map(([filial, valor]) => ({ filial, valor }));

    const porModalidade = Object.entries(
        notasFat.reduce((acc, n) => {
            acc[n.modalidade] = (acc[n.modalidade] || 0) + n.valorFaturamento;
            return acc;
        }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));

    const porDia = Object.entries(
        notasFat.reduce((acc, n) => {
            acc[n.dataEmissao] = (acc[n.dataEmissao] || 0) + n.valorFaturamento;
            return acc;
        }, {} as Record<string, number>)
    ).sort(([a], [b]) => a.localeCompare(b))
     .map(([data, valor]) => ({ data: fmtDate(data), valor }));

    const porFormaPag = Object.entries(
        notasFat.reduce((acc, n) => {
            acc[n.formaPagamento] = (acc[n.formaPagamento] || 0) + n.valorFaturamento;
            return acc;
        }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));

    const porVendedor = VENDEDORES
        .map(nome => ({
            nome,
            valor: notasFat.filter(n => n.vendedor === nome).reduce((s, n) => s + n.valorFaturamento, 0),
            notas: notasFat.filter(n => n.vendedor === nome).length,
        }))
        .filter(v => v.valor > 0)
        .sort((a, b) => b.valor - a.valor);

    const filiais = [...new Set(notas.map(n => n.filial))];
    const modalidades = [...new Set(notas.map(n => n.modalidade))] as Modalidade[];

    const exportCSV = () => {
        const headers = ['Número', 'Tipo', 'Data', 'Cliente', 'CNPJ', 'Filial', 'Modalidade', 'CFOP', 'Vendedor', 'Faturamento', 'Frete', 'DIFAL', 'Impostos', 'Gasto Total', 'Forma Pagamento', 'Município', 'UF'];
        const rows = notasFiltradas.map(n => [
            n.numero, n.tipo, n.dataEmissao, `"${n.cliente}"`, n.cnpjCliente,
            n.filial, n.modalidade, n.cfop, `"${n.vendedor}"`,
            n.valorFaturamento.toFixed(2), n.frete.toFixed(2), n.difal.toFixed(2),
            n.impostos.toFixed(2), n.gastoTotal.toFixed(2), `"${n.formaPagamento}"`,
            `"${n.municipio}"`, n.uf
        ]);
        const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `faturamento_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImprimir = () => {
        const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const periodo = filtroData1 || filtroData2
            ? `${filtroData1 ? fmtDate(filtroData1) : '—'} a ${filtroData2 ? fmtDate(filtroData2) : '—'}`
            : 'Todo o período importado';

        const totalNotasFat = notasFat.length;
        const totalNotasCompra = notasFiltradas.filter(n => n.modalidade === 'COMPRA').length;
        const totalNotasTransf = notasFiltradas.filter(n => n.modalidade === 'TRANSFERÊNCIA').length;

        const barMax = porVendedor.length > 0 ? porVendedor[0].valor : 1;

        const vendedorRows = porVendedor.map((v, i) => {
            const pct = Math.round((v.valor / barMax) * 100);
            const ticketMedio = v.notas > 0 ? v.valor / v.notas : 0;
            const participacao = totalFaturamento > 0 ? ((v.valor / totalFaturamento) * 100).toFixed(1) : '0.0';
            return `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:10px 12px;font-weight:700;color:#374151;">${i + 1}º</td>
                <td style="padding:10px 12px;font-weight:700;color:#111827;">${v.nome}</td>
                <td style="padding:10px 12px;">
                    <div style="background:#f1f5f9;border-radius:4px;height:10px;overflow:hidden;width:140px;">
                        <div style="background:#6366f1;height:100%;width:${pct}%;border-radius:4px;"></div>
                    </div>
                </td>
                <td style="padding:10px 12px;text-align:right;font-weight:800;color:#111827;font-size:14px;">${fmt(v.valor)}</td>
                <td style="padding:10px 12px;text-align:right;color:#6b7280;">${participacao}%</td>
                <td style="padding:10px 12px;text-align:right;color:#6b7280;">${v.notas} nota${v.notas !== 1 ? 's' : ''}</td>
                <td style="padding:10px 12px;text-align:right;color:#6b7280;">${fmt(ticketMedio)}</td>
            </tr>`;
        }).join('');

        const filialRows = porFilial.sort((a, b) => b.valor - a.valor).map(f => {
            const pct = totalFaturamento > 0 ? ((f.valor / totalFaturamento) * 100).toFixed(1) : '0.0';
            return `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:10px 12px;font-weight:700;color:#111827;">${f.filial}</td>
                <td style="padding:10px 12px;text-align:right;font-weight:800;color:#111827;">${fmt(f.valor)}</td>
                <td style="padding:10px 12px;text-align:right;color:#6b7280;">${pct}%</td>
            </tr>`;
        }).join('');

        const modalidadeRows = porModalidade.sort((a, b) => b.value - a.value).map(m => {
            const pct = totalFaturamento > 0 ? ((m.value / totalFaturamento) * 100).toFixed(1) : '0.0';
            const cor = MODALIDADE_COLOR[m.name as Modalidade] ?? '#94a3b8';
            return `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:10px 12px;">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${cor};margin-right:8px;"></span>
                    <span style="font-weight:700;color:#111827;">${m.name}</span>
                </td>
                <td style="padding:10px 12px;text-align:right;font-weight:800;color:#111827;">${fmt(m.value)}</td>
                <td style="padding:10px 12px;text-align:right;color:#6b7280;">${pct}%</td>
            </tr>`;
        }).join('');

        const diaRows = [...porDia].slice(-31).map(d => `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:8px 12px;color:#374151;">${d.data}</td>
                <td style="padding:8px 12px;text-align:right;font-weight:700;color:#111827;">${fmt(d.valor)}</td>
            </tr>`
        ).join('');

        const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Relatório Executivo de Faturamento — MCI</title>
<style>
    @page { size: A4; margin: 14mm 16mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #111827; background: #fff; }
    @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page-break { page-break-before: always; }
    }
    h2 { font-size: 13px; font-weight: 800; color: #1e293b; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #6366f1; letter-spacing: .5px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f8fafc; }
    th { padding: 9px 12px; text-align: left; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; border-bottom: 2px solid #e2e8f0; }
    th.right { text-align: right; }
    .section { margin-bottom: 24px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .grid4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 24px; }
    .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; }
    .kpi-label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 6px; }
    .kpi-value { font-size: 18px; font-weight: 900; color: #111827; line-height: 1.1; }
    .kpi-value.green { color: #059669; }
    .kpi-value.red { color: #dc2626; }
    .kpi-value.indigo { color: #4f46e5; }
    .kpi-sub { font-size: 9px; color: #94a3b8; margin-top: 4px; }
    .badge { display:inline-block; padding: 2px 8px; border-radius: 20px; font-size: 9px; font-weight: 700; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; color: #94a3b8; font-size: 9px; }
</style>
</head>
<body>

<!-- CABEÇALHO -->
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:16px;border-bottom:3px solid #6366f1;">
    <div>
        <div style="font-size:9px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">RELATÓRIO EXECUTIVO</div>
        <div style="font-size:22px;font-weight:900;color:#111827;letter-spacing:-.5px;">Análise de Faturamento</div>
        <div style="font-size:11px;color:#6b7280;margin-top:4px;">Multi Comercial Importadora — MCI Store</div>
    </div>
    <div style="text-align:right;">
        <div style="font-size:11px;font-weight:700;color:#374151;">Período: <span style="color:#6366f1;">${periodo}</span></div>
        ${filtroFilial ? `<div style="font-size:10px;color:#6b7280;margin-top:2px;">Filial: <b>${filtroFilial}</b></div>` : ''}
        ${filtroVendedor ? `<div style="font-size:10px;color:#6b7280;margin-top:2px;">Vendedor: <b>${filtroVendedor}</b></div>` : ''}
        <div style="font-size:9px;color:#94a3b8;margin-top:6px;">Emitido em ${dataAtual} às ${horaAtual}</div>
    </div>
</div>

<!-- KPIs PRINCIPAIS -->
<div class="grid4">
    <div class="kpi" style="border-top:3px solid #6366f1;">
        <div class="kpi-label">Faturamento Total</div>
        <div class="kpi-value indigo">${fmt(totalFaturamento)}</div>
        <div class="kpi-sub">${totalNotasFat} nota${totalNotasFat !== 1 ? 's' : ''} de venda/serviço/locação</div>
    </div>
    <div class="kpi" style="border-top:3px solid ${lucroBruto >= 0 ? '#059669' : '#dc2626'};">
        <div class="kpi-label">Lucro Bruto Estimado</div>
        <div class="kpi-value ${lucroBruto >= 0 ? 'green' : 'red'}">${fmt(lucroBruto)}</div>
        <div class="kpi-sub">Faturamento − custos operacionais</div>
    </div>
    <div class="kpi" style="border-top:3px solid #f59e0b;">
        <div class="kpi-label">Custos Operacionais</div>
        <div class="kpi-value" style="color:#b45309;">${fmt(totalGasto)}</div>
        <div class="kpi-sub">Frete + DIFAL + Impostos</div>
    </div>
    <div class="kpi" style="border-top:3px solid #10b981;">
        <div class="kpi-label">Clientes Atendidos</div>
        <div class="kpi-value" style="color:#059669;">${clientesUnicos}</div>
        <div class="kpi-sub">${notasFiltradas.length} notas no total importado</div>
    </div>
</div>

<!-- KPIs SECUNDÁRIOS -->
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px;">
    <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:10px 14px;">
        <div style="font-size:9px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;">Total Fretes</div>
        <div style="font-size:14px;font-weight:800;color:#5b21b6;">${fmt(totalFrete)}</div>
    </div>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 14px;">
        <div style="font-size:9px;font-weight:700;color:#ea580c;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;">Total DIFAL</div>
        <div style="font-size:14px;font-weight:800;color:#c2410c;">${fmt(totalDifal)}</div>
    </div>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 14px;">
        <div style="font-size:9px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;">Total Impostos</div>
        <div style="font-size:14px;font-weight:800;color:#b91c1c;">${fmt(totalImpostos)}</div>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;">
        <div style="font-size:9px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;">Notas Excluídas</div>
        <div style="font-size:14px;font-weight:800;color:#15803d;">${totalNotasCompra} compra${totalNotasCompra !== 1 ? 's' : ''} · ${totalNotasTransf} transf.</div>
    </div>
</div>

<!-- RANKING VENDEDORES + FILIAIS LADO A LADO -->
<div class="grid2">
    <div class="section">
        <h2>Ranking de Vendedores</h2>
        ${porVendedor.length === 0
            ? '<p style="color:#94a3b8;font-size:11px;padding:16px 0;">Nenhum vendedor atribuído</p>'
            : `<table>
                <thead><tr>
                    <th style="width:32px;">#</th>
                    <th>Vendedor</th>
                    <th>Participação</th>
                    <th class="right">Faturamento</th>
                    <th class="right">%</th>
                    <th class="right">Notas</th>
                    <th class="right">Ticket Médio</th>
                </tr></thead>
                <tbody>${vendedorRows}</tbody>
               </table>`
        }
    </div>
    <div>
        <div class="section">
            <h2>Por Filial</h2>
            ${porFilial.length === 0
                ? '<p style="color:#94a3b8;font-size:11px;padding:16px 0;">Sem dados</p>'
                : `<table>
                    <thead><tr><th>Filial</th><th class="right">Faturamento</th><th class="right">%</th></tr></thead>
                    <tbody>${filialRows}</tbody>
                   </table>`
            }
        </div>
        <div class="section" style="margin-top:20px;">
            <h2>Por Modalidade</h2>
            ${porModalidade.length === 0
                ? '<p style="color:#94a3b8;font-size:11px;padding:16px 0;">Sem dados</p>'
                : `<table>
                    <thead><tr><th>Modalidade</th><th class="right">Faturamento</th><th class="right">%</th></tr></thead>
                    <tbody>${modalidadeRows}</tbody>
                   </table>`
            }
        </div>
    </div>
</div>

<!-- EVOLUÇÃO DIÁRIA -->
${porDia.length > 0 ? `
<div class="section page-break">
    <h2>Evolução Diária do Faturamento</h2>
    <table>
        <thead><tr><th>Data</th><th class="right">Faturamento do Dia</th></tr></thead>
        <tbody>${diaRows}</tbody>
        <tfoot>
            <tr style="background:#f8fafc;border-top:2px solid #e2e8f0;">
                <td style="padding:10px 12px;font-weight:800;color:#374151;">TOTAL</td>
                <td style="padding:10px 12px;text-align:right;font-weight:900;color:#4f46e5;font-size:13px;">${fmt(totalFaturamento)}</td>
            </tr>
        </tfoot>
    </table>
</div>` : ''}

<div class="footer">
    <span>MCI Store — Relatório gerado automaticamente pelo sistema StockVision</span>
    <span>${dataAtual} · ${horaAtual}</span>
</div>

</body>
</html>`;

        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 500);
    };

    return (
        <div className="space-y-6">
            {/* Header tabs */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {([
                        { key: 'upload', label: 'Importar XMLs', icon: Upload },
                        { key: 'dashboard', label: 'Dashboard', icon: BarChart2 },
                        { key: 'relatorio', label: 'Relatório', icon: FileText },
                    ] as const).map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setView(key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${view === key ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </div>

                {notas.length > 0 && (
                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                            {notas.length} nota{notas.length !== 1 ? 's' : ''} importada{notas.length !== 1 ? 's' : ''}
                        </span>
                        <button
                            onClick={async () => {
                                if (!confirm('Apagar todas as notas do histórico?')) return;
                                if (supabase) await supabase.from('notas_fiscais_xml').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                                setNotas([]); setErros([]); setView('upload');
                            }}
                            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                        >
                            <RefreshCw className="w-3 h-3" /> Limpar histórico
                        </button>
                        <button
                            onClick={exportCSV}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        >
                            <Download className="w-3 h-3" /> Exportar CSV
                        </button>
                        <button
                            onClick={handleImprimir}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        >
                            <Printer className="w-3 h-3" /> Relatório CEO
                        </button>
                    </div>
                )}
            </div>

            {/* ── UPLOAD ── */}
            {view === 'upload' && (
                <div className="space-y-4">
                    {loadingDB && (
                        <div className="flex items-center gap-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl p-4 text-brand-700 dark:text-brand-400 text-sm font-semibold">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Carregando histórico do banco de dados...
                        </div>
                    )}
                    <div
                        onDragOver={e => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={onDrop}
                        onClick={() => fileRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all ${dragging ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-300 dark:border-slate-700 hover:border-brand-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".xml"
                            multiple
                            className="hidden"
                            onChange={e => e.target.files && processFiles(e.target.files)}
                        />
                        {processing ? (
                            <div className="flex flex-col items-center gap-4">
                                <RefreshCw className="w-12 h-12 text-brand-500 animate-spin" />
                                <p className="text-slate-600 dark:text-slate-300 font-semibold">Processando XMLs...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-20 h-20 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
                                    <Upload className="w-10 h-10 text-brand-500" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-slate-700 dark:text-slate-200">Arraste arquivos XML aqui</p>
                                    <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">ou clique para selecionar</p>
                                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-2">Suporta NF-e e NFS-e · Upload múltiplo</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {erros.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2 text-red-600 dark:text-red-400">
                                <AlertCircle className="w-4 h-4" />
                                <span className="font-semibold text-sm">{erros.length} erro{erros.length !== 1 ? 's' : ''} de importação</span>
                                <button onClick={() => setErros([])} className="ml-auto text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                            </div>
                            <ul className="space-y-1">
                                {erros.map((e, i) => <li key={i} className="text-xs text-red-500 dark:text-red-400">{e}</li>)}
                            </ul>
                        </div>
                    )}

                    {notas.length > 0 && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                                {notas.length} nota{notas.length !== 1 ? 's' : ''} importada{notas.length !== 1 ? 's' : ''} com sucesso
                            </span>
                            <button
                                onClick={() => setView('dashboard')}
                                className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                            >
                                Ver Dashboard →
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── DASHBOARD ── */}
            {view === 'dashboard' && (
                <div className="space-y-6">
                    {/* Filtros */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                        <div className="flex flex-wrap gap-3 items-end">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Data início</label>
                                <input type="date" value={filtroData1} onChange={e => setFiltroData1(e.target.value)}
                                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Data fim</label>
                                <input type="date" value={filtroData2} onChange={e => setFiltroData2(e.target.value)}
                                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Filial</label>
                                <select value={filtroFilial} onChange={e => setFiltroFilial(e.target.value)}
                                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm">
                                    <option value="">Todas</option>
                                    {filiais.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Modalidade</label>
                                <select value={filtroModalidade} onChange={e => setFiltroModalidade(e.target.value)}
                                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm">
                                    <option value="">Todas</option>
                                    {modalidades.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Vendedor</label>
                                <select value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)}
                                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm">
                                    <option value="">Todos</option>
                                    {VENDEDORES.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                            <button onClick={() => { setFiltroData1(''); setFiltroData2(''); setFiltroFilial(''); setFiltroModalidade(''); setFiltroVendedor(''); setFiltroSearch(''); }}
                                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors">
                                <X className="w-3 h-3" /> Limpar filtros
                            </button>
                        </div>
                    </div>

                    {/* Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Faturamento Total', value: fmt(totalFaturamento), icon: TrendingUp, color: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-900/20' },
                            { label: 'Notas Importadas', value: notasFiltradas.length.toString(), icon: FileText, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                            { label: 'Clientes Únicos', value: clientesUnicos.toString(), icon: Users, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
                            { label: 'Total de Fretes', value: fmt(totalFrete), icon: Truck, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                            { label: 'Total DIFAL', value: fmt(totalDifal), icon: AlertCircle, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                            { label: 'Total Impostos', value: fmt(totalImpostos), icon: DollarSign, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
                            { label: 'Gasto Total', value: fmt(totalGasto), icon: Package, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
                            { label: 'Lucro Bruto Est.', value: fmt(lucroBruto), icon: TrendingUp, color: lucroBruto >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400', bg: lucroBruto >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20' },
                        ].map(({ label, value, icon: Icon, color, bg }) => (
                            <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                                    <Icon className={`w-5 h-5 ${color}`} />
                                </div>
                                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">{label}</p>
                                <p className={`text-xl font-black ${color}`}>{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Gráficos */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Evolução diária */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-brand-500" /> Evolução Diária
                            </h3>
                            {porDia.length === 0 ? (
                                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
                            ) : (
                                <ResponsiveContainer width="100%" height={200}>
                                    <AreaChart data={porDia}>
                                        <defs>
                                            <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                                        <Tooltip formatter={(v: number | undefined) => fmt(v ?? 0)} />
                                        <Area type="monotone" dataKey="valor" stroke="#6366f1" fill="url(#grad1)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Por filial */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <BarChart2 className="w-4 h-4 text-emerald-500" /> Faturamento por Filial
                            </h3>
                            {porFilial.length === 0 ? (
                                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
                            ) : (
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={porFilial}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="filial" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                                        <Tooltip formatter={(v: number | undefined) => fmt(v ?? 0)} />
                                        <Bar dataKey="valor" fill="#10b981" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Por modalidade */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <PieIcon className="w-4 h-4 text-violet-500" /> Faturamento por Modalidade
                            </h3>
                            {porModalidade.length === 0 ? (
                                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
                            ) : (
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={porModalidade} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                                            {porModalidade.map((entry) => (
                                                <Cell key={entry.name} fill={MODALIDADE_COLOR[entry.name as Modalidade] ?? '#94a3b8'} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v: number | undefined) => fmt(v ?? 0)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Formas de pagamento */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-amber-500" /> Formas de Pagamento
                            </h3>
                            {porFormaPag.length === 0 ? (
                                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
                            ) : (
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={porFormaPag} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={90} />
                                        <Tooltip formatter={(v: number | undefined) => fmt(v ?? 0)} />
                                        <Bar dataKey="value" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Ranking vendedores — full width */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                            <Users className="w-4 h-4 text-brand-500" /> Ranking de Vendedores
                        </h3>
                        {porVendedor.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-sm">Nenhuma nota com vendedor atribuído</div>
                        ) : (
                            <div className="space-y-3">
                                {porVendedor.map((v, i) => {
                                    const cor = VENDEDOR_COLOR[v.nome] ?? { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
                                    const maxValor = porVendedor[0].valor;
                                    const pct = maxValor > 0 ? (v.valor / maxValor) * 100 : 0;
                                    return (
                                        <div key={v.nome} className="flex items-center gap-4">
                                            <span className="w-5 text-xs font-black text-slate-400 text-right">{i + 1}</span>
                                            <button
                                                onClick={() => setFiltroVendedor(filtroVendedor === v.nome ? '' : v.nome)}
                                                className="px-3 py-1 rounded-full text-xs font-bold border transition-all"
                                                style={{ backgroundColor: cor.bg, color: cor.text, borderColor: cor.border }}
                                            >
                                                {v.nome}
                                            </button>
                                            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${pct}%`, backgroundColor: cor.border }}
                                                />
                                            </div>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 w-36 text-right">{fmt(v.valor)}</span>
                                            <span className="text-xs text-slate-400 w-16 text-right">{v.notas} nota{v.notas !== 1 ? 's' : ''}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── RELATÓRIO ── */}
            {view === 'relatorio' && (
                <div className="space-y-4">
                    {/* Barra busca */}
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-56">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                placeholder="Buscar por cliente, número ou CNPJ..."
                                value={filtroSearch}
                                onChange={e => setFiltroSearch(e.target.value)}
                            />
                        </div>
                        <select value={filtroFilial} onChange={e => setFiltroFilial(e.target.value)}
                            className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm">
                            <option value="">Todas as filiais</option>
                            {filiais.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <select value={filtroModalidade} onChange={e => setFiltroModalidade(e.target.value)}
                            className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm">
                            <option value="">Todas as modalidades</option>
                            {modalidades.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)}
                            className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm">
                            <option value="">Todos os vendedores</option>
                            {VENDEDORES.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <span className="text-xs text-slate-400 dark:text-slate-500">{notasFiltradas.length} registro{notasFiltradas.length !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Tabela */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                        {['Nº', 'Tipo', 'Data', 'Cliente', 'Filial', 'Modalidade', 'CFOP', 'Vendedor', 'Faturamento', 'Frete', 'DIFAL', 'Impostos', 'Gasto Total', 'Forma Pag.', 'Município/UF'].map(h => (
                                            <th key={h} className="px-3 py-3 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {notasFiltradas.length === 0 ? (
                                        <tr><td colSpan={14} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                                            {notas.length === 0 ? 'Nenhum XML importado ainda' : 'Nenhuma nota corresponde aos filtros'}
                                        </td></tr>
                                    ) : notasFiltradas.map(n => (
                                        <tr key={n.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-3 py-2 font-mono font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">{n.numero}</td>
                                            <td className="px-3 py-2">
                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${n.tipo === 'NFe' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'}`}>
                                                    {n.tipo}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300">{fmtDate(n.dataEmissao)}</td>
                                            <td className="px-3 py-2 max-w-[160px] truncate text-slate-800 dark:text-white" title={n.cliente}>{n.cliente || '—'}</td>
                                            <td className="px-3 py-2">
                                                <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-[10px]">{n.filial}</span>
                                            </td>
                                            <td className="px-3 py-2">
                                                <select
                                                    value={n.modalidade}
                                                    onChange={e => atualizarModalidade(n.id, e.target.value as Modalidade)}
                                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded border-0 outline-none cursor-pointer"
                                                    style={{ backgroundColor: MODALIDADE_COLOR[n.modalidade] + '20', color: MODALIDADE_COLOR[n.modalidade] }}
                                                    title="Clique para alterar a modalidade"
                                                >
                                                    {TODAS_MODALIDADES.map(m => (
                                                        <option key={m.value} value={m.value}>{m.label}{m.receita ? ' ✓' : ''}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400">{n.cfop || '—'}</td>
                                            <td className="px-3 py-2">
                                                <VendedorPicker
                                                    value={n.vendedor}
                                                    onChange={v => atualizarVendedor(n.id, v)}
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right font-bold text-slate-800 dark:text-white whitespace-nowrap">{fmt(n.valorFaturamento)}</td>
                                            <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300 whitespace-nowrap">{fmt(n.frete)}</td>
                                            <td className="px-3 py-2 text-right text-orange-600 dark:text-orange-400 whitespace-nowrap">{fmt(n.difal)}</td>
                                            <td className="px-3 py-2 text-right text-red-600 dark:text-red-400 whitespace-nowrap">{fmt(n.impostos)}</td>
                                            <td className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{fmt(n.gastoTotal)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap text-slate-500 dark:text-slate-400">{n.formaPagamento}</td>
                                            <td className="px-3 py-2 whitespace-nowrap text-slate-500 dark:text-slate-400">{n.municipio}{n.uf ? `/${n.uf}` : ''}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                {notasFiltradas.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-t-2 border-slate-300 dark:border-slate-600 font-bold text-xs">
                                            <td colSpan={8} className="px-3 py-3 text-slate-500 dark:text-slate-400">
                                                TOTAL ({notasFat.length} notas de receita
                                                {notasFiltradas.length - notasFat.length > 0 && ` · ${notasFiltradas.length - notasFat.length} excluída${notasFiltradas.length - notasFat.length !== 1 ? 's' : ''} (compra/transf.)`}
                                                )
                                            </td>
                                            <td className="px-3 py-3 text-right text-slate-800 dark:text-white whitespace-nowrap">{fmt(totalFaturamento)}</td>
                                            <td className="px-3 py-3 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">{fmt(totalFrete)}</td>
                                            <td className="px-3 py-3 text-right text-orange-600 dark:text-orange-400 whitespace-nowrap">{fmt(totalDifal)}</td>
                                            <td className="px-3 py-3 text-right text-red-600 dark:text-red-400 whitespace-nowrap">{fmt(totalImpostos)}</td>
                                            <td className="px-3 py-3 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">{fmt(totalGasto)}</td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
