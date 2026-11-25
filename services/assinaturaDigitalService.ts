// ─────────────────────────────────────────────────────────────────────────────
// Assinatura digital de contratos (PDF, PAdES) com certificado A3 (token/pendrive)
//
// O navegador não enxerga o token, então a assinatura é feita pelo "Assinador MCI",
// um programinha local (tools/assinador) que fala com o certificado instalado no Windows.
// Fluxo: HTML do contrato → PDF → placeholder de assinatura → o Assinador assina os bytes
// → a assinatura é embutida no PDF. A chave privada nunca sai do token.
// ─────────────────────────────────────────────────────────────────────────────

import { Buffer } from 'buffer';

const ASSINADOR_URL = 'http://127.0.0.1:47890';
const CERT_KEY = 'assinatura_cert_thumbprint';

export interface CertificadoLocal {
    thumbprint: string;
    nome: string;
    emissor: string;
    validade: string;
    provedor: string;
    hardware: boolean; // true = chave em token/cartão (o certificado do pendrive)
}

export class AssinadorOffline extends Error {
    constructor() {
        super('Assinador MCI não encontrado neste computador.');
        this.name = 'AssinadorOffline';
    }
}

function paraBase64(bytes: Uint8Array): string {
    let bin = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    return btoa(bin);
}

function deBase64(b64: string): Uint8Array {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

async function chamar(path: string, init?: RequestInit, timeoutMs = 20000): Promise<any> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res: Response;
    try {
        res = await fetch(`${ASSINADOR_URL}${path}`, { ...init, signal: ctrl.signal });
    } catch {
        throw new AssinadorOffline();
    } finally {
        clearTimeout(timer);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.erro || `Assinador respondeu ${res.status}.`);
    return data;
}

export const assinaturaDigitalService = {
    /** O Assinador MCI está rodando neste computador? */
    async assinadorOnline(): Promise<boolean> {
        try { await chamar('/status', undefined, 2500); return true; } catch { return false; }
    },

    async listarCertificados(): Promise<CertificadoLocal[]> {
        const d = await chamar('/certificados', undefined, 15000);
        return (d.certificados ?? []) as CertificadoLocal[];
    },

    /** Certificado a usar por padrão: o último escolhido; senão o do token/pendrive (A3). */
    escolherPadrao(certs: CertificadoLocal[]): CertificadoLocal | null {
        let lembrado = '';
        try { lembrado = localStorage.getItem(CERT_KEY) || ''; } catch { /* sem storage */ }
        return certs.find((c) => c.thumbprint === lembrado)
            ?? certs.find((c) => c.hardware)
            ?? certs[0]
            ?? null;
    },

    lembrarCertificado(thumbprint: string) {
        try { localStorage.setItem(CERT_KEY, thumbprint); } catch { /* sem storage */ }
    },

    /** Renderiza o HTML do contrato em PDF A4 (páginas quebradas entre linhas de tabela). */
    async htmlParaPdf(html: string, rodape: string): Promise<Uint8Array> {
        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

        const MARGEM_MM = 10;
        const LARG_MM = 210 - MARGEM_MM * 2;               // área útil
        const ALT_MM = 297 - MARGEM_MM * 2 - 6;            // 6 mm reservados ao rodapé da assinatura
        const LARG_PX = Math.round((LARG_MM / 25.4) * 96); // 96 dpi
        const ESCALA = 2;

        const iframe = document.createElement('iframe');
        iframe.style.cssText = `position:fixed;top:0;left:-10000px;width:${LARG_PX}px;height:1200px;border:none;background:#fff;`;
        document.body.appendChild(iframe);
        try {
            const doc = iframe.contentDocument!;
            doc.open(); doc.write(html); doc.close();
            // espera imagens (logo/fotos dos itens) e fontes
            await Promise.all(Array.from(doc.images).map((img) => img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = () => r(null); })));
            try { await (doc as any).fonts?.ready; } catch { /* sem API de fontes */ }
            doc.body.style.width = `${LARG_PX}px`;
            doc.body.style.margin = '0';

            const body = doc.body;
            const canvas = await html2canvas(body, { scale: ESCALA, useCORS: true, backgroundColor: '#ffffff', windowWidth: LARG_PX });

            const pxPorMm = LARG_PX / LARG_MM;
            const altPagPx = ALT_MM * pxPorMm;
            const alturaTotal = Math.min(body.scrollHeight, Math.floor(canvas.height / ESCALA));

            // "Tinta" por linha da imagem (pixels escuros = texto/fotos). A quebra de página só cai em
            // linhas sem tinta; medir na imagem evita cortar texto mesmo se o desenho sair deslocado do DOM.
            const larg = canvas.width;
            const dados = canvas.getContext('2d')!.getImageData(0, 0, larg, canvas.height).data;
            const tinta = new Uint32Array(canvas.height);
            for (let y = 0; y < canvas.height; y++) {
                let n = 0;
                for (let i = y * larg * 4, fimLinha = i + larg * 4; i < fimLinha; i += 4) {
                    if (dados[i + 3] > 0 && dados[i] * 0.3 + dados[i + 1] * 0.59 + dados[i + 2] * 0.11 < 170) n++;
                }
                tinta[y] = n;
            }
            const linhaLimpa = (r: number) => r >= 0 && r + 2 < tinta.length && tinta[r] === 0 && tinta[r + 1] === 0 && tinta[r + 2] === 0;

            const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
            let inicio = 0;
            let pagina = 0;
            while (inicio < alturaTotal - 1) {
                let fim = inicio + altPagPx;
                if (fim < alturaTotal) {
                    const minimo = Math.round((inicio + altPagPx * 0.5) * ESCALA);
                    for (let r = Math.round(fim * ESCALA); r > minimo; r--) {
                        if (linhaLimpa(r)) { fim = r / ESCALA; break; }
                    }
                } else fim = alturaTotal;

                const fatia = document.createElement('canvas');
                fatia.width = canvas.width;
                fatia.height = Math.max(1, Math.round((fim - inicio) * ESCALA));
                const ctx = fatia.getContext('2d')!;
                ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, fatia.width, fatia.height);
                ctx.drawImage(canvas, 0, Math.round(inicio * ESCALA), canvas.width, fatia.height, 0, 0, canvas.width, fatia.height);

                if (pagina > 0) pdf.addPage();
                pdf.addImage(fatia.toDataURL('image/jpeg', 0.92), 'JPEG', MARGEM_MM, MARGEM_MM, LARG_MM, (fim - inicio) / pxPorMm);
                pdf.setFontSize(7); pdf.setTextColor(110);
                pdf.text(rodape, MARGEM_MM, 297 - MARGEM_MM + 2);
                pdf.text(`Pág. ${pagina + 1}`, 210 - MARGEM_MM, 297 - MARGEM_MM + 2, { align: 'right' });

                inicio = fim;
                pagina++;
                if (pagina > 40) break; // trava de segurança
            }
            return new Uint8Array(pdf.output('arraybuffer'));
        } finally {
            document.body.removeChild(iframe);
        }
    },

    /** Assina o PDF (PAdES, assinatura destacada CMS feita pelo Assinador com o certificado A3). */
    async assinarPdf(pdf: Uint8Array, cert: CertificadoLocal, opcoes: { motivo: string; local?: string }): Promise<Uint8Array> {
        (globalThis as any).Buffer ??= Buffer; // @signpdf usa Buffer global

        const [{ PDFDocument }, { pdflibAddPlaceholder }, { SignPdf }, { Signer }] = await Promise.all([
            import('pdf-lib'),
            import('@signpdf/placeholder-pdf-lib'),
            import('@signpdf/signpdf'),
            import('@signpdf/utils'),
        ]);

        const pdfDoc = await PDFDocument.load(pdf);
        pdflibAddPlaceholder({
            pdfDoc,
            reason: opcoes.motivo,
            contactInfo: '',
            name: cert.nome,
            location: opcoes.local ?? 'Brasil',
            signatureLength: 20000, // cabe a cadeia ICP-Brasil completa
        });
        const comPlaceholder = Buffer.from(await pdfDoc.save({ useObjectStreams: false }));

        class AssinadorToken extends Signer {
            async sign(pdfBuffer: Buffer): Promise<Buffer> {
                const d = await chamar('/assinar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ thumbprint: cert.thumbprint, dados: paraBase64(new Uint8Array(pdfBuffer)) }),
                }, 180000); // dá tempo de digitar o PIN do token
                return Buffer.from(deBase64(d.assinatura));
            }
        }

        const assinado = await new SignPdf().sign(comPlaceholder, new AssinadorToken());
        return new Uint8Array(assinado);
    },
};
