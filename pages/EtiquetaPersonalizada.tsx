import React, { useState, useRef } from 'react';
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
} from 'lucide-react';

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

const EtiquetaLabel: React.FC<EtiquetaProps> = ({
    chave, volume, totalVolumes, transportadora, remetente, destinatario, dataEmissao,
}) => {
    // Tamanho: 94mm × 76mm = 355px × 287px @ 96dpi
    return (
        <div
            className="etiqueta-label"
            style={{
                width: '94mm',
                height: '76mm',
                border: '1.5px solid #000',
                fontFamily: 'Arial, sans-serif',
                background: '#fff',
                color: '#000',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                pageBreakAfter: 'always',
                boxSizing: 'border-box',
            }}
        >
            {/* ── Header: Logo + Transportadora + Volume ── */}
            <div style={{
                display: 'flex',
                alignItems: 'stretch',
                borderBottom: '1.5px solid #000',
                height: '16mm',
                flexShrink: 0,
            }}>
                {/* Logo MCI */}
                <div style={{
                    width: '22mm',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2mm',
                    borderRight: '1px solid #ddd',
                    flexShrink: 0,
                }}>
                    <img
                        src="/logo.png"
                        alt="MCI"
                        style={{ maxWidth: '18mm', maxHeight: '11mm', objectFit: 'contain' }}
                    />
                </div>

                {/* Transportadora */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '3mm',
                    borderRight: '1.5px solid #000',
                }}>
                    <div>
                        <div style={{ fontSize: '6px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Transportadora
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                            {transportadora}
                        </div>
                    </div>
                </div>

                {/* Volume X/Y — destaque */}
                <div style={{
                    width: '26mm',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#000',
                    color: '#fff',
                    flexShrink: 0,
                }}>
                    <div style={{ fontSize: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1px' }}>Volume</div>
                    <div style={{ fontSize: '22px', fontWeight: 900, lineHeight: 1 }}>
                        {volume}<span style={{ fontSize: '13px', fontWeight: 700 }}>/{totalVolumes}</span>
                    </div>
                </div>
            </div>

            {/* ── Barcode area ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: '1px solid #000',
                padding: '1mm 0',
                flexShrink: 0,
                height: '22mm',
                overflow: 'hidden',
            }}>
                <Barcode
                    value={chave.raw}
                    format="CODE128"
                    width={1.2}
                    height={52}
                    fontSize={7}
                    margin={2}
                    displayValue={false}
                />
            </div>

            {/* ── Chave NF-e (texto) ── */}
            <div style={{
                textAlign: 'center',
                fontSize: '6px',
                fontFamily: 'monospace',
                letterSpacing: '0.5px',
                padding: '1mm 2mm',
                borderBottom: '1px solid #ddd',
                flexShrink: 0,
                color: '#333',
            }}>
                {formatChaveDisplay(chave.raw)}
            </div>

            {/* ── Info NF ── */}
            <div style={{
                display: 'flex',
                flex: 1,
                alignItems: 'stretch',
                overflow: 'hidden',
            }}>
                {/* Dados NF */}
                <div style={{
                    flex: 1,
                    padding: '2mm 3mm',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-around',
                    borderRight: '1px solid #ddd',
                    fontSize: '7px',
                }}>
                    <div>
                        <div style={{ color: '#777', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '5px' }}>NF-e · Série · UF</div>
                        <div style={{ fontWeight: 900, fontSize: '11px', letterSpacing: '-0.3px' }}>
                            {chave.numeroNF} <span style={{ fontSize: '8px', fontWeight: 700, color: '#555' }}>· {chave.serie} · {chave.uf}</span>
                        </div>
                    </div>
                    {remetente && (
                        <div>
                            <div style={{ color: '#777', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '5px' }}>Remetente</div>
                            <div style={{ fontWeight: 700, fontSize: '7px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '52mm' }}>{remetente}</div>
                        </div>
                    )}
                    {destinatario && (
                        <div>
                            <div style={{ color: '#777', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '5px' }}>Destinatário</div>
                            <div style={{ fontWeight: 700, fontSize: '7px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '52mm' }}>{destinatario}</div>
                        </div>
                    )}
                    <div style={{ color: '#aaa', fontSize: '5.5px' }}>
                        Emitido: {dataEmissao} · CNPJ {formatCNPJ(chave.cnpj)}
                    </div>
                </div>

                {/* QR Code */}
                <div style={{
                    width: '18mm',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2mm',
                    flexShrink: 0,
                }}>
                    <QRCodeSVG value={chave.raw} size={56} level="M" marginSize={0} />
                </div>
            </div>
        </div>
    );
};

// ─── Preview Thumbnail (escalonado para a UI) ─────────────────────────────────

const EtiquetaPreview: React.FC<EtiquetaProps> = (props) => (
    <div style={{ transform: 'scale(0.55)', transformOrigin: 'top left', width: '94mm', height: '76mm' }}>
        <EtiquetaLabel {...props} />
    </div>
);

// ─── Página ───────────────────────────────────────────────────────────────────

export function EtiquetaPersonalizada() {
    const [chaveRaw, setChaveRaw] = useState('');
    const [transportadora, setTransportadora] = useState('JAMEF');
    const [transportadoraCustom, setTransportadoraCustom] = useState('');
    const [volumes, setVolumes] = useState(1);
    const [remetente, setRemetente] = useState('');
    const [destinatario, setDestinatario] = useState('');
    const [gerado, setGerado] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const chaveDigits = chaveRaw.replace(/\D/g, '');
    const chave = parseChaveNF(chaveDigits);
    const isValid = !!chave;
    const transportadoraFinal = transportadora === 'Outro' ? transportadoraCustom : transportadora;
    const dataEmissao = new Date().toLocaleDateString('pt-BR');

    const handleGerar = () => {
        if (!isValid || !transportadoraFinal) return;
        setGerado(true);
    };

    const handleImprimir = () => {
        if (!printRef.current || !chave) return;

        const conteudo = Array.from({ length: volumes }, (_, i) => {
            const vol = i + 1;
            // Monta HTML inline para cada etiqueta — sem dependência de React no print
            return `
            <div class="etiqueta">
                <div class="header">
                    <div class="logo-box">
                        <img src="${window.location.origin}/logo.png" alt="MCI" class="logo-img" onerror="this.style.display='none'"/>
                    </div>
                    <div class="transportadora">
                        <div class="label-small-dark">Transportadora</div>
                        <div class="transportadora-nome">${transportadoraFinal}</div>
                    </div>
                    <div class="volume-box">
                        <div class="label-small">Volume</div>
                        <div class="volume-num">${vol}<span class="volume-total">/${volumes}</span></div>
                    </div>
                </div>
                <div class="barcode-area">
                    <svg id="barcode-${vol}"></svg>
                </div>
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
                    <div class="qr-area">
                        <canvas id="qr-${vol}"></canvas>
                    </div>
                </div>
            </div>`;
        }).join('');

        const win = window.open('', '_blank', 'width=900,height=700');
        if (!win) return;

        win.document.write(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Etiquetas NF ${chave.numeroNF}</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"><\/script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;background:#fff;padding:4mm}
.etiqueta{
    width:94mm;height:76mm;border:1.5px solid #000;
    display:flex;flex-direction:column;overflow:hidden;
    page-break-after:always;margin-bottom:4mm;
}
.header{display:flex;height:16mm;border-bottom:1.5px solid #000;flex-shrink:0}
.logo-box{width:22mm;display:flex;align-items:center;justify-content:center;padding:2mm;border-right:1px solid #ddd;flex-shrink:0}
.logo-img{max-width:18mm;max-height:11mm;object-fit:contain}
.transportadora{flex:1;display:flex;flex-direction:column;justify-content:center;padding-left:3mm;border-right:1.5px solid #000}
.transportadora-nome{font-size:13px;font-weight:900;letter-spacing:-0.5px;line-height:1.1}
.volume-box{width:26mm;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;color:#fff;flex-shrink:0}
.volume-num{font-size:22px;font-weight:900;line-height:1}
.volume-total{font-size:13px;font-weight:700}
.label-small{font-size:6px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1px;color:#fff}
.label-small-dark{font-size:6px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1px;color:#555}
.barcode-area{display:flex;align-items:center;justify-content:center;border-bottom:1px solid #000;padding:1mm 0;height:22mm;overflow:hidden;flex-shrink:0}
.barcode-area svg{max-height:52px}
.chave-texto{text-align:center;font-family:monospace;font-size:6px;letter-spacing:0.5px;padding:1mm 2mm;border-bottom:1px solid #ddd;flex-shrink:0;color:#333}
.info-row{display:flex;flex:1;overflow:hidden}
.info-dados{flex:1;padding:2mm 3mm;display:flex;flex-direction:column;justify-content:space-around;border-right:1px solid #ddd;font-size:7px}
.sub-label{color:#777;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;font-size:5px}
.nf-num{font-weight:900;font-size:11px;letter-spacing:-0.3px}
.nf-serie{font-size:8px;font-weight:700;color:#555}
.info-text{font-weight:700;font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:52mm}
.rodape{color:#aaa;font-size:5.5px}
.qr-area{width:18mm;display:flex;align-items:center;justify-content:center;padding:2mm;flex-shrink:0}
.qr-area canvas,.qr-area img{width:56px!important;height:56px!important}
@media print{
    @page{size:94mm 76mm;margin:0}
    body{padding:0}
    .etiqueta{margin:0;border:1px solid #000;page-break-after:always;break-after:page}
}
</style></head>
<body>
${conteudo}
<script>
window.onload = function() {
    // Gera barcodes
    for(var i = 1; i <= ${volumes}; i++) {
        try {
            JsBarcode('#barcode-' + i, '${chave.raw}', {
                format: 'CODE128',
                width: 1.2,
                height: 52,
                displayValue: false,
                margin: 2
            });
        } catch(e){}
        // Gera QR
        try {
            var el = document.getElementById('qr-' + i);
            new QRCode(el, {
                text: '${chave.raw}',
                width: 56,
                height: 56,
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

                    {/* Opcional: Remetente / Destinatário */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                Remetente <span className="text-slate-300 normal-case font-medium tracking-normal">(opcional)</span>
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input type="text" value={remetente} onChange={e => { setRemetente(e.target.value); setGerado(false); }}
                                    placeholder="Nome da empresa..."
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-slate-800/50 rounded-2xl focus:border-violet-500/40 transition-all outline-none text-sm font-medium dark:text-white dark:placeholder-slate-700"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                Destinatário <span className="text-slate-300 normal-case font-medium tracking-normal">(opcional)</span>
                            </label>
                            <div className="relative">
                                <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input type="text" value={destinatario} onChange={e => { setDestinatario(e.target.value); setGerado(false); }}
                                    placeholder="Nome do destinatário..."
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-slate-800/50 rounded-2xl focus:border-violet-500/40 transition-all outline-none text-sm font-medium dark:text-white dark:placeholder-slate-700"
                                />
                            </div>
                        </div>
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
                                        style={{ width: `calc(94mm * 0.55)`, height: `calc(76mm * 0.55)` }}>
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
                            Escala 55% · tamanho real 94×76 mm. Clique em <strong>Imprimir</strong> para enviar à impressora.
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
