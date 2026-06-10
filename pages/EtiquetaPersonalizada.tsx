import React, { useState, useEffect, useCallback } from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import {
    Tag,
    Printer,
    Package,
    Truck,
    Plus,
    Minus,
    Check,
    Info,
    Sparkles,
    Hash,
    Building2,
    ChevronRight,
    Search,
    Loader2,
    AlertCircle,
} from 'lucide-react';

// ─── Lookup CNPJ via BrasilAPI ────────────────────────────────────────────────

async function lookupCNPJ(cnpj: string): Promise<string | null> {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) return null;
    try {
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
        if (!res.ok) return null;
        const data = await res.json();
        return (data.nome_fantasia && data.nome_fantasia.trim())
            ? data.nome_fantasia.trim()
            : data.razao_social?.trim() ?? null;
    } catch {
        return null;
    }
}

function formatCNPJInput(val: string) {
    const d = val.replace(/\D/g, '').slice(0, 14);
    return d
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
}

// ─── Parser da Chave NF-e ─────────────────────────────────────────────────────

const UF_CODES: Record<string, string> = {
    '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA',
    '16': 'AP', '17': 'TO', '21': 'MA', '22': 'PI', '23': 'CE',
    '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE',
    '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
    '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT',
    '52': 'GO', '53': 'DF',
};

interface ChaveParsed {
    uf: string;
    aamm: string;
    cnpj: string;
    modelo: string;
    serie: string;
    numeroNF: string;
    raw: string;
}

function parseChaveNF(chave: string): ChaveParsed | null {
    const d = chave.replace(/\D/g, '');
    if (d.length !== 44) return null;
    const cuf = d.slice(0, 2);
    return {
        uf: UF_CODES[cuf] ?? cuf,
        aamm: d.slice(2, 6),
        cnpj: d.slice(6, 20),
        modelo: d.slice(20, 22),
        serie: String(parseInt(d.slice(22, 25), 10)),
        numeroNF: String(parseInt(d.slice(25, 34), 10)),
        raw: d,
    };
}

function formatCNPJ(cnpj: string) {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function formatChaveDisplay(raw: string) {
    const d = raw.replace(/\D/g, '');
    return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

const TRANSPORTADORAS = [
    'JAMEF', 'TNT', 'Correios', 'JadLog', 'Azul Cargo', 'Braspress',
    'Rodonaves', 'Tegma', 'Patrus', 'DHL', 'FedEx', 'Outro',
];

// ─── Componente da Etiqueta Individual ───────────────────────────────────────

interface EtiquetaProps {
    chave: ChaveParsed;
    volume: number;
    totalVolumes: number;
    transportadora: string;
    remetente?: string;
    destinatario?: string;
    dataEmissao: string;
}

// 190mm × 130mm — cabe 2 por folha A4 (297mm altura, margens 8mm + 9mm gap)
const LABEL_W = '190mm';
const LABEL_H = '130mm';

const EtiquetaLabel: React.FC<EtiquetaProps> = ({
    chave, volume, totalVolumes, transportadora, remetente, destinatario, dataEmissao,
}) => (
    <div style={{
        width: LABEL_W,
        height: LABEL_H,
        border: '1.5px solid #000',
        fontFamily: 'Arial, sans-serif',
        background: '#fff',
        color: '#000',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
    }}>
        {/* ── Header: Logo · Transportadora · Volume ── */}
        <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '2px solid #000', height: '26mm', flexShrink: 0 }}>
            {/* Logo */}
            <div style={{ width: '38mm', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3mm', borderRight: '1px solid #ddd', flexShrink: 0 }}>
                <img src="/logo.png" alt="MCI" style={{ maxWidth: '32mm', maxHeight: '18mm', objectFit: 'contain' }} />
            </div>
            {/* Transportadora */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '5mm', borderRight: '2px solid #000' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>Transportadora</div>
                <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1 }}>{transportadora}</div>
            </div>
            {/* Volume */}
            <div style={{ width: '46mm', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff', flexShrink: 0 }}>
                <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '2px' }}>Volume</div>
                <div style={{ fontSize: '42px', fontWeight: 900, lineHeight: 1 }}>
                    {volume}<span style={{ fontSize: '22px', fontWeight: 700 }}>/{totalVolumes}</span>
                </div>
            </div>
        </div>

        {/* ── Barcode ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #000', padding: '2mm 0', height: '38mm', overflow: 'hidden', flexShrink: 0 }}>
            <Barcode value={chave.raw} format="CODE128" width={2.2} height={85} fontSize={0} margin={4} displayValue={false} />
        </div>

        {/* ── Chave em texto ── */}
        <div style={{ textAlign: 'center', fontSize: '9px', fontFamily: 'monospace', letterSpacing: '1px', padding: '1.5mm 3mm', borderBottom: '1px solid #ddd', flexShrink: 0, color: '#444' }}>
            {formatChaveDisplay(chave.raw)}
        </div>

        {/* ── Dados NF + QR ── */}
        <div style={{ display: 'flex', flex: 1, alignItems: 'stretch', overflow: 'hidden' }}>
            <div style={{ flex: 1, padding: '3mm 5mm', display: 'flex', flexDirection: 'column', justifyContent: 'space-around', borderRight: '1px solid #ddd' }}>
                <div>
                    <div style={{ color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', fontSize: '8px' }}>NF-e · Série · UF</div>
                    <div style={{ fontWeight: 900, fontSize: '18px', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                        {chave.numeroNF} <span style={{ fontSize: '13px', fontWeight: 700, color: '#555' }}>· {chave.serie} · {chave.uf}</span>
                    </div>
                </div>
                {remetente && (
                    <div>
                        <div style={{ color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', fontSize: '8px' }}>Remetente</div>
                        <div style={{ fontWeight: 800, fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{remetente}</div>
                    </div>
                )}
                {destinatario && (
                    <div>
                        <div style={{ color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', fontSize: '8px' }}>Destinatário</div>
                        <div style={{ fontWeight: 800, fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{destinatario}</div>
                    </div>
                )}
                <div style={{ color: '#bbb', fontSize: '8px' }}>Emitido: {dataEmissao} · CNPJ {formatCNPJ(chave.cnpj)}</div>
            </div>
            {/* QR Code */}
            <div style={{ width: '30mm', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3mm', flexShrink: 0 }}>
                <QRCodeSVG value={chave.raw} size={90} level="M" marginSize={0} />
            </div>
        </div>
    </div>
);

// ─── Preview Thumbnail (escalonado para a UI) ─────────────────────────────────

const EtiquetaPreview: React.FC<EtiquetaProps> = (props) => (
    <div style={{ transform: 'scale(0.38)', transformOrigin: 'top left', width: LABEL_W, height: LABEL_H }}>
        <EtiquetaLabel {...props} />
    </div>
);

// ─── Página ───────────────────────────────────────────────────────────────────

export function EtiquetaPersonalizada() {
    const [chaveRaw, setChaveRaw] = useState('');
    const [transportadora, setTransportadora] = useState('JAMEF');
    const [transportadoraCustom, setTransportadoraCustom] = useState('');
    const [volumes, setVolumes] = useState(1);

    // Remetente — auto-detectado via CNPJ da chave
    const [remetente, setRemetente] = useState('');
    const [remetenteLoading, setRemetenteLoading] = useState(false);
    const [remetenteErro, setRemetenteErro] = useState(false);

    // Destinatário — input de CNPJ com lookup
    const [destCNPJRaw, setDestCNPJRaw] = useState('');
    const [destinatario, setDestinatario] = useState('');
    const [destLoading, setDestLoading] = useState(false);
    const [destErro, setDestErro] = useState(false);

    const [gerado, setGerado] = useState(false);

    const chaveDigits = chaveRaw.replace(/\D/g, '');
    const chave = parseChaveNF(chaveDigits);
    const isValid = !!chave;
    const transportadoraFinal = transportadora === 'Outro' ? transportadoraCustom : transportadora;
    const dataEmissao = new Date().toLocaleDateString('pt-BR');

    // Auto-busca remetente quando chave fica válida
    useEffect(() => {
        if (!chave) { setRemetente(''); setRemetenteErro(false); return; }
        let cancelled = false;
        setRemetenteLoading(true);
        setRemetenteErro(false);
        lookupCNPJ(chave.cnpj).then(nome => {
            if (cancelled) return;
            if (nome) { setRemetente(nome); setRemetenteErro(false); }
            else { setRemetenteErro(true); }
            setRemetenteLoading(false);
        });
        return () => { cancelled = true; };
    }, [chave?.cnpj]); // eslint-disable-line react-hooks/exhaustive-deps

    // Lookup destinatário quando CNPJ tiver 14 dígitos
    const destDigits = destCNPJRaw.replace(/\D/g, '');
    const handleLookupDest = useCallback(async () => {
        if (destDigits.length !== 14) return;
        setDestLoading(true);
        setDestErro(false);
        const nome = await lookupCNPJ(destDigits);
        if (nome) { setDestinatario(nome); setDestErro(false); }
        else { setDestErro(true); }
        setDestLoading(false);
    }, [destDigits]);

    useEffect(() => {
        if (destDigits.length === 14) handleLookupDest();
        else { setDestinatario(''); setDestErro(false); }
    }, [destDigits]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleGerar = () => {
        if (!isValid || !transportadoraFinal) return;
        setGerado(true);
    };

    const handleImprimir = () => {
        if (!chave) return;

        const etiquetaHTML = (vol: number) => `
            <div class="etiqueta">
                <div class="header">
                    <div class="logo-box">
                        <img src="${window.location.origin}/logo.png" alt="MCI" class="logo-img" onerror="this.style.display='none'"/>
                    </div>
                    <div class="transportadora">
                        <div class="label-dark">Transportadora</div>
                        <div class="transportadora-nome">${transportadoraFinal}</div>
                    </div>
                    <div class="volume-box">
                        <div class="label-white">Volume</div>
                        <div class="volume-num">${vol}<span class="volume-total">/${volumes}</span></div>
                    </div>
                </div>
                <div class="barcode-area"><svg id="barcode-${vol}"></svg></div>
                <div class="chave-texto">${formatChaveDisplay(chave.raw)}</div>
                <div class="info-row">
                    <div class="info-dados">
                        <div>
                            <div class="sub-label">NF-e · Série · UF</div>
                            <div class="nf-num">${chave.numeroNF} <span class="nf-serie">· ${chave.serie} · ${chave.uf}</span></div>
                        </div>
                        ${remetente ? `<div><div class="sub-label">Remetente</div><div class="info-text">${remetente}</div></div>` : ''}
                        ${destinatario ? `<div><div class="sub-label">Destinatário</div><div class="info-text">${destinatario}</div></div>` : ''}
                        <div class="rodape">Emitido: ${dataEmissao} · CNPJ ${formatCNPJ(chave.cnpj)}</div>
                    </div>
                    <div class="qr-area"><canvas id="qr-${vol}"></canvas></div>
                </div>
            </div>`;

        // Agrupa de 2 em 2 por página A4
        const pages: string[] = [];
        for (let i = 1; i <= volumes; i += 2) {
            const a = etiquetaHTML(i);
            const b = i + 1 <= volumes ? etiquetaHTML(i + 1) : '';
            pages.push(`<div class="page">${a}${b}</div>`);
        }
        const conteudo = pages.join('');

        const win = window.open('', '_blank', 'width=900,height=700');
        if (!win) return;

        win.document.write(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Etiquetas NF ${chave.numeroNF}</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"><\/script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;background:#fff}
/* Página A4 — 2 etiquetas por folha */
.page{
    width:210mm;height:297mm;
    display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    gap:9mm;padding:8mm;
    page-break-after:always;break-after:page;
}
.etiqueta{
    width:190mm;height:130mm;
    border:1.5px solid #000;
    display:flex;flex-direction:column;
    overflow:hidden;flex-shrink:0;
}
/* Header */
.header{display:flex;height:26mm;border-bottom:2px solid #000;flex-shrink:0}
.logo-box{width:38mm;display:flex;align-items:center;justify-content:center;padding:3mm;border-right:1px solid #ddd;flex-shrink:0}
.logo-img{max-width:32mm;max-height:18mm;object-fit:contain}
.transportadora{flex:1;display:flex;flex-direction:column;justify-content:center;padding-left:5mm;border-right:2px solid #000}
.label-dark{font-size:9px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:2px}
.transportadora-nome{font-size:22px;font-weight:900;letter-spacing:-0.5px;line-height:1}
.volume-box{width:46mm;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;color:#fff;flex-shrink:0}
.label-white{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:2px;color:#fff}
.volume-num{font-size:42px;font-weight:900;line-height:1}
.volume-total{font-size:22px;font-weight:700}
/* Barcode */
.barcode-area{display:flex;align-items:center;justify-content:center;border-bottom:1px solid #000;padding:2mm 0;height:38mm;overflow:hidden;flex-shrink:0}
.barcode-area svg{max-height:85px}
/* Chave texto */
.chave-texto{text-align:center;font-family:monospace;font-size:9px;letter-spacing:1px;padding:1.5mm 3mm;border-bottom:1px solid #ddd;flex-shrink:0;color:#444}
/* Info */
.info-row{display:flex;flex:1;overflow:hidden}
.info-dados{flex:1;padding:3mm 5mm;display:flex;flex-direction:column;justify-content:space-around;border-right:1px solid #ddd}
.sub-label{color:#888;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-size:8px}
.nf-num{font-weight:900;font-size:18px;letter-spacing:-0.5px;line-height:1.1}
.nf-serie{font-size:13px;font-weight:700;color:#555}
.info-text{font-weight:800;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140mm}
.rodape{color:#bbb;font-size:8px}
.qr-area{width:30mm;display:flex;align-items:center;justify-content:center;padding:3mm;flex-shrink:0}
.qr-area canvas,.qr-area img{width:90px!important;height:90px!important}
@media print{
    @page{size:A4;margin:0}
    body{margin:0;padding:0}
    .page{page-break-after:always;break-after:page}
}
</style></head>
<body>
${conteudo}
<script>
window.onload = function() {
    for(var i = 1; i <= ${volumes}; i++) {
        try {
            JsBarcode('#barcode-' + i, '${chave.raw}', {
                format: 'CODE128', width: 2.2, height: 85,
                displayValue: false, margin: 4
            });
        } catch(e){}
        try {
            var el = document.getElementById('qr-' + i);
            new QRCode(el, {
                text: '${chave.raw}', width: 90, height: 90,
                correctLevel: QRCode.CorrectLevel.M
            });
        } catch(e){}
    }
    setTimeout(function(){ window.focus(); window.print(); }, 800);
};
<\/script>
</body></html>`);
        win.document.close();
    };

    const formatChaveInput = (val: string) => {
        const d = val.replace(/\D/g, '').slice(0, 44);
        return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] pb-20 transition-colors duration-500 font-sans">
            {/* Glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[120px]" />
            </div>

            {/* Hero */}
            <div className="relative pt-12 pb-24 sm:pt-16 sm:pb-32 px-4 text-center overflow-hidden">
                <div className="max-w-3xl mx-auto relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-500/10 dark:bg-violet-500/20 border border-violet-500/20 rounded-full text-violet-600 dark:text-violet-400 text-[10px] font-black uppercase tracking-widest mb-8">
                        <Sparkles className="w-3.5 h-3.5" /> Etiqueta Própria · Sem API Externa
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter mb-4 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                        Gerar <span className="text-violet-500 italic font-medium">Etiquetas</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed font-medium opacity-80">
                        Cole a chave da NF-e, informe a transportadora e a quantidade de volumes — o sistema gera todas as etiquetas prontas para impressão.
                    </p>
                </div>
            </div>

            <main className="max-w-2xl mx-auto px-4 -mt-16 sm:-mt-24 relative z-20 space-y-6">

                {/* Card Formulário */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] border border-white dark:border-white/5 p-8 sm:p-10 space-y-6">

                    {/* Chave NF-e */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Chave de Acesso NF-e · 44 dígitos
                        </label>
                        <div className="relative group">
                            <Hash className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-violet-500 transition-colors" />
                            <input
                                type="text"
                                value={formatChaveInput(chaveRaw)}
                                onChange={e => { setChaveRaw(e.target.value); setGerado(false); }}
                                placeholder="0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000"
                                className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-slate-800/50 rounded-2xl focus:border-violet-500/40 focus:bg-white dark:focus:bg-slate-900 transition-all outline-none text-sm font-mono font-bold dark:text-white dark:placeholder-slate-700 shadow-sm tracking-wider"
                                maxLength={55}
                            />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <span className={`text-[10px] font-bold ${chaveDigits.length === 0 ? 'text-slate-400' : isValid ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {chaveDigits.length}/44 dígitos
                            </span>
                            {isValid && chave && (
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                                    <Check className="w-3 h-3" /> NF {chave.numeroNF} · Série {chave.serie} · {chave.uf}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Transportadora */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Transportadora
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {TRANSPORTADORAS.map(t => (
                                <button key={t} type="button" onClick={() => { setTransportadora(t); setGerado(false); }}
                                    className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${transportadora === t
                                        ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-500/20'
                                        : 'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-violet-400 hover:text-violet-500'
                                    }`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                        {transportadora === 'Outro' && (
                            <input
                                type="text"
                                value={transportadoraCustom}
                                onChange={e => { setTransportadoraCustom(e.target.value); setGerado(false); }}
                                placeholder="Nome da transportadora..."
                                className="mt-3 w-full px-5 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-violet-300/50 rounded-2xl focus:border-violet-500/60 transition-all outline-none text-sm font-bold dark:text-white dark:placeholder-slate-700"
                            />
                        )}
                    </div>

                    {/* Volumes */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                            Quantidade de Volumes
                        </label>
                        <div className="flex items-center gap-4">
                            <button type="button" onClick={() => { setVolumes(v => Math.max(1, v - 1)); setGerado(false); }}
                                className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-600 transition-all active:scale-95">
                                <Minus className="w-5 h-5" />
                            </button>
                            <div className="flex-1 text-center">
                                <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{volumes}</span>
                                <span className="text-slate-400 text-lg font-bold ml-2">
                                    {volumes === 1 ? 'volume' : 'volumes'}
                                </span>
                            </div>
                            <button type="button" onClick={() => { setVolumes(v => Math.min(99, v + 1)); setGerado(false); }}
                                className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-600 transition-all active:scale-95">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {[1,2,3,4,5,6,8,10,12].map(n => (
                                <button key={n} type="button" onClick={() => { setVolumes(n); setGerado(false); }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${volumes === n
                                        ? 'bg-violet-600 text-white border-violet-600'
                                        : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-violet-400 hover:text-violet-500'
                                    }`}>
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Remetente — auto via CNPJ da chave */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5" /> Remetente
                            {remetenteLoading && <Loader2 className="w-3 h-3 animate-spin text-violet-400" />}
                            {!remetenteLoading && remetente && <Check className="w-3 h-3 text-emerald-500" />}
                            {!remetenteLoading && remetenteErro && <AlertCircle className="w-3 h-3 text-amber-400" />}
                        </label>
                        <input
                            type="text"
                            value={remetente}
                            onChange={e => { setRemetente(e.target.value); setGerado(false); }}
                            placeholder={remetenteLoading ? 'Buscando na Receita Federal...' : isValid ? 'Não encontrado — digite manualmente' : 'Cole a chave NF-e para buscar automaticamente'}
                            className={`w-full px-5 py-3 border-2 rounded-2xl transition-all outline-none text-sm font-bold dark:text-white dark:placeholder-slate-600 shadow-sm
                                ${remetente ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/40' : 'bg-slate-50 dark:bg-slate-950 border-transparent dark:border-slate-800/50'}
                                focus:border-violet-500/40 focus:bg-white dark:focus:bg-slate-900`}
                        />
                        {chave && !remetenteLoading && (
                            <p className="mt-1 text-[10px] text-slate-400 font-medium">
                                CNPJ extraído da chave: <span className="font-bold text-slate-500">{formatCNPJ(chave.cnpj)}</span>
                                {remetenteErro && <span className="text-amber-500 ml-1">· não encontrado na Receita Federal</span>}
                            </p>
                        )}
                    </div>

                    {/* Destinatário — busca por CNPJ */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Truck className="w-3.5 h-3.5" /> Destinatário
                            {destLoading && <Loader2 className="w-3 h-3 animate-spin text-violet-400" />}
                            {!destLoading && destinatario && <Check className="w-3 h-3 text-emerald-500" />}
                            {!destLoading && destErro && <AlertCircle className="w-3 h-3 text-amber-400" />}
                        </label>
                        {/* CNPJ input */}
                        <div className="relative group mb-2">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-violet-500 transition-colors" />
                            <input
                                type="text"
                                value={formatCNPJInput(destCNPJRaw)}
                                onChange={e => { setDestCNPJRaw(e.target.value); setGerado(false); }}
                                placeholder="CNPJ do destinatário (busca automática)"
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-slate-800/50 rounded-2xl focus:border-violet-500/40 focus:bg-white dark:focus:bg-slate-900 transition-all outline-none text-sm font-mono font-bold dark:text-white dark:placeholder-slate-600"
                                maxLength={18}
                            />
                        </div>
                        {/* Nome resultante (editável) */}
                        <input
                            type="text"
                            value={destinatario}
                            onChange={e => { setDestinatario(e.target.value); setGerado(false); }}
                            placeholder={destLoading ? 'Buscando...' : 'Nome do destinatário (preenchido automaticamente ou manual)'}
                            className={`w-full px-5 py-3 border-2 rounded-2xl transition-all outline-none text-sm font-bold dark:text-white dark:placeholder-slate-600
                                ${destinatario ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/40' : 'bg-slate-50 dark:bg-slate-950 border-transparent dark:border-slate-800/50'}
                                focus:border-violet-500/40 focus:bg-white dark:focus:bg-slate-900`}
                        />
                        {destErro && (
                            <p className="mt-1 text-[10px] text-amber-500 font-medium">CNPJ não encontrado — edite o nome manualmente acima.</p>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex items-start gap-3 p-4 bg-violet-50 dark:bg-violet-900/10 border border-violet-200/50 dark:border-violet-800/30 rounded-2xl">
                        <Info className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-medium text-violet-700 dark:text-violet-300 leading-relaxed">
                            Etiqueta <strong>94×76 mm</strong> com código de barras Code128 e QR Code. O sistema gera <strong>{volumes} etiqueta{volumes > 1 ? 's' : ''}</strong> numeradas automaticamente.
                        </p>
                    </div>

                    {/* Botões */}
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={handleGerar}
                            disabled={!isValid || !transportadoraFinal}
                            className="group relative flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 overflow-hidden active:scale-[0.97] bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-xl shadow-violet-500/20">
                            <div className="absolute inset-0 w-1/3 h-full bg-white/10 -skew-x-[45deg] translate-x-[-200%] group-hover:translate-x-[400%] transition-transform duration-700" />
                            <Tag className="w-4 h-4" /> <span>Pré-visualizar</span>
                        </button>
                        <button type="button" onClick={handleImprimir}
                            disabled={!isValid || !transportadoraFinal}
                            className="group relative flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 overflow-hidden active:scale-[0.97] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-xl shadow-emerald-500/20">
                            <div className="absolute inset-0 w-1/3 h-full bg-white/10 -skew-x-[45deg] translate-x-[-200%] group-hover:translate-x-[400%] transition-transform duration-700" />
                            <Printer className="w-4 h-4" /> <span>Imprimir Tudo</span>
                        </button>
                    </div>
                </div>

                {/* Preview das Etiquetas */}
                {gerado && isValid && chave && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                <Package className="w-4 h-4 text-violet-500" />
                                Pré-visualização · {volumes} etiqueta{volumes > 1 ? 's' : ''}
                            </h3>
                            <button type="button" onClick={handleImprimir}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg">
                                <Printer className="w-3.5 h-3.5" /> Imprimir
                                <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>

                        <div className="overflow-x-auto pb-2">
                            <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                                {Array.from({ length: volumes }, (_, i) => (
                                    <div key={i} className="bg-white rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex-shrink-0"
                                        style={{ width: `calc(190mm * 0.38)`, height: `calc(130mm * 0.38)` }}>
                                        <EtiquetaPreview
                                            chave={chave}
                                            volume={i + 1}
                                            totalVolumes={volumes}
                                            transportadora={transportadoraFinal}
                                            remetente={remetente || undefined}
                                            destinatario={destinatario || undefined}
                                            dataEmissao={dataEmissao}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <p className="text-center text-[11px] text-slate-400 font-medium">
                            Escala 38% · tamanho real 190×130 mm · <strong>2 etiquetas por folha A4</strong>. Clique em <strong>Imprimir</strong> para enviar à impressora.
                        </p>
                    </div>
                )}
            </main>

            {/* Footer */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md px-6 py-2.5 rounded-full border border-white dark:border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-4 whitespace-nowrap opacity-50 hover:opacity-100 transition-opacity z-50">
                <span>© 2024 MCI Logística</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span>Etiquetas Personalizadas · Code128 + QR</span>
            </div>
        </div>
    );
}
