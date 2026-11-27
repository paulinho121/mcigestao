#!/usr/bin/env node
/**
 * Prepara um modelo 3D (.glb) para o AR do Estoque MCI.
 *
 *  1. Coloca o modelo em ESCALA REAL (você informa uma medida do produto, em cm)
 *  2. Centraliza e apoia a base no chão (origem = centro da base) — o AR posiciona assim
 *  3. Enxuga: remove duplicados/sobras, reduz o tamanho das texturas e, se quiser, os triângulos
 *
 * Uso:
 *   node preparar-glb.mjs modelo.glb --altura 55
 *   node preparar-glb.mjs modelo.glb --maior 62 --textura 2048 --triangulos 80000
 *
 * Medida (use UMA): --altura | --largura | --profundidade | --maior   (em centímetros)
 *   altura = eixo Y (para cima) · largura = eixo X · profundidade = eixo Z · maior = a maior das três
 * Opções:
 *   --saida arquivo.glb   (padrão: <entrada>-ar.glb)
 *   --textura 2048        lado máximo das texturas em pixels (padrão 2048)
 *   --triangulos 80000    reduz a malha até esse total de triângulos (padrão: não mexe)
 *   --so-relatorio        só mostra as medidas e o tamanho, sem gerar arquivo
 */
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';

const LIMITE_MB = 25;       // limite de envio na tela "Modelos 3D"
const TRIANGULOS_ALERTA = 200_000;

// ── argumentos ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (nome) => {
    const i = args.indexOf(`--${nome}`);
    return i === -1 ? undefined : args[i + 1];
};
const tem = (nome) => args.includes(`--${nome}`);
const num = (nome) => {
    const v = flag(nome);
    if (v === undefined) return undefined;
    const n = Number(String(v).replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) fim(`O valor de --${nome} precisa ser um número maior que zero (recebi "${v}").`);
    return n;
};

function fim(msg, codigo = 1) {
    console.error(`\n✖ ${msg}\n`);
    process.exit(codigo);
}

const entrada = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && args[i - 1] !== '--so-relatorio'));
if (!entrada) {
    fim('Informe o arquivo .glb.\n  Exemplo: node preparar-glb.mjs modelo.glb --altura 55');
}
const caminhoEntrada = resolve(entrada);
if (!existsSync(caminhoEntrada)) fim(`Arquivo não encontrado: ${caminhoEntrada}`);
if (!/\.glb$/i.test(caminhoEntrada)) fim('O arquivo precisa ser um .glb (modelo 3D binário). Se o seu é .gltf/.obj/.fbx, exporte para .glb antes.');

const medidas = { altura: num('altura'), largura: num('largura'), profundidade: num('profundidade'), maior: num('maior') };
const informadas = Object.entries(medidas).filter(([, v]) => v !== undefined);
const soRelatorio = tem('so-relatorio');
if (informadas.length === 0 && !soRelatorio) fim('Informe a medida real do produto em cm: --altura, --largura, --profundidade ou --maior.');
if (informadas.length > 1) fim('Use só UMA medida (--altura, --largura, --profundidade ou --maior).');

const texturaMax = num('textura') ?? 2048;
const alvoTriangulos = num('triangulos');
const caminhoSaida = resolve(flag('saida') ?? join(dirname(caminhoEntrada), `${basename(caminhoEntrada, extname(caminhoEntrada))}-ar.glb`));

// ── leitura ───────────────────────────────────────────────────────────────────
const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
        'draco3d.decoder': await draco3d.createDecoderModule(),
        'meshopt.decoder': MeshoptDecoder,
    });

const cabecalho = readFileSync(caminhoEntrada).subarray(0, 4).toString('latin1');
if (cabecalho !== 'glTF') fim('Este arquivo não é um .glb válido (cabeçalho "glTF" ausente).');

const doc = await io.read(caminhoEntrada);
const raiz = doc.getRoot();
const cena = raiz.getDefaultScene() ?? raiz.listScenes()[0];
if (!cena) fim('O modelo não tem nenhuma cena para exibir.');

// ── medições ──────────────────────────────────────────────────────────────────
const cm = (m) => (m * 100).toFixed(1);
const triangulos = () => raiz.listMeshes().reduce((soma, m) => soma + m.listPrimitives().reduce((s, p) => {
    const idx = p.getIndices();
    const pos = p.getAttribute('POSITION');
    return s + Math.floor((idx ? idx.getCount() : (pos?.getCount() ?? 0)) / 3);
}, 0), 0);

function dimensoes() {
    const { min, max } = getBounds(cena);
    return { min, max, x: max[0] - min[0], y: max[1] - min[1], z: max[2] - min[2] };
}

const antes = dimensoes();
const tamanhoAntes = statSync(caminhoEntrada).size;
const triAntes = triangulos();
const texturasAntes = raiz.listTextures().map((t) => ({ mime: t.getMimeType(), tam: t.getSize() }));

console.log(`\nModelo: ${basename(caminhoEntrada)}  (${(tamanhoAntes / 1048576).toFixed(1)} MB)`);
console.log(`  Medidas atuais (unidades do arquivo): largura ${antes.x.toFixed(3)} × altura ${antes.y.toFixed(3)} × profundidade ${antes.z.toFixed(3)}`);
console.log(`  Triângulos: ${triAntes.toLocaleString('pt-BR')}   Texturas: ${texturasAntes.length ? texturasAntes.map((t) => (t.tam ? `${t.tam[0]}×${t.tam[1]}` : '?') + ' ' + t.mime.replace('image/', '')).join(', ') : 'nenhuma'}`);

if (antes.x <= 0 && antes.y <= 0 && antes.z <= 0) fim('O modelo parece vazio (sem geometria).');
if (soRelatorio) {
    console.log('\n(--so-relatorio: nenhum arquivo foi gerado)\n');
    process.exit(0);
}

// ── escala real ───────────────────────────────────────────────────────────────
const [tipo, valorCm] = informadas[0];
const base = { altura: antes.y, largura: antes.x, profundidade: antes.z, maior: Math.max(antes.x, antes.y, antes.z) }[tipo];
if (!(base > 0)) fim(`Não consegui medir a ${tipo} do modelo (valor zero). Use outra medida.`);
const escala = (valorCm / 100) / base;   // glTF usa metros

// Embrulha tudo num nó de ajuste: escala + base apoiada em Y=0 e centrada em X/Z
const ajuste = doc.createNode('AjusteEscalaReal');
const cx = (antes.min[0] + antes.max[0]) / 2;
const cz = (antes.min[2] + antes.max[2]) / 2;
ajuste.setScale([escala, escala, escala]);
ajuste.setTranslation([-cx * escala, -antes.min[1] * escala, -cz * escala]);
for (const filho of cena.listChildren()) {
    cena.removeChild(filho);
    ajuste.addChild(filho);
}
cena.addChild(ajuste);

// ── enxugar ───────────────────────────────────────────────────────────────────
await MeshoptSimplifier.ready;
const passos = [dedup(), weld(), prune()];
if (alvoTriangulos && triAntes > alvoTriangulos) {
    passos.push(simplify({ simplifier: MeshoptSimplifier, ratio: alvoTriangulos / triAntes, error: 0.002 }));
}
await doc.transform(...passos);

// Texturas: reduz as que passam do tamanho máximo e converte WebP (nem todo visualizador de AR do
// celular aceita) para PNG. Formato e cores originais são mantidos nas demais.
let converteuWebp = false;
for (const tex of raiz.listTextures()) {
    const bytes = tex.getImage();
    if (!bytes) continue;
    const mime = tex.getMimeType();
    const meta = await sharp(Buffer.from(bytes)).metadata();
    const redimensionar = Math.max(meta.width ?? 0, meta.height ?? 0) > texturaMax;
    const converter = mime === 'image/webp';
    if (!redimensionar && !converter) continue;

    let img = sharp(Buffer.from(bytes));
    if (redimensionar) img = img.resize({ width: texturaMax, height: texturaMax, fit: 'inside', withoutEnlargement: true });
    const alvo = converter ? 'image/png' : mime;
    const saida = alvo === 'image/jpeg' ? await img.jpeg({ quality: 90 }).toBuffer() : await img.png({ compressionLevel: 9 }).toBuffer();
    tex.setImage(new Uint8Array(saida)).setMimeType(alvo);
    if (converter) converteuWebp = true;
}
if (converteuWebp) {
    console.log('  ! Havia texturas WebP: convertidas para PNG (mais compatível com o AR do celular).');
    if (!raiz.listTextures().some((t) => t.getMimeType() === 'image/webp')) {
        raiz.listExtensionsUsed().find((e) => e.extensionName === 'EXT_texture_webp')?.dispose();
    }
}

// ── conferência e gravação ────────────────────────────────────────────────────
const depois = dimensoes();
const tolerancia = 1e-4;
if (Math.abs(depois.min[1]) > tolerancia) console.warn(`  ! Aviso: a base ficou em Y=${depois.min[1].toFixed(5)} (esperado 0).`);

await io.write(caminhoSaida, doc);
const tamanhoDepois = statSync(caminhoSaida).size;
const triDepois = triangulos();

console.log(`\n✔ Gerado: ${caminhoSaida}`);
console.log(`  Escala aplicada: ×${escala.toFixed(4)}  (${tipo} = ${valorCm} cm)`);
console.log(`  Medidas finais: largura ${cm(depois.x)} cm × altura ${cm(depois.y)} cm × profundidade ${cm(depois.z)} cm`);
console.log(`  Base no chão (Y=0) e centrada.`);
console.log(`  Triângulos: ${triAntes.toLocaleString('pt-BR')} → ${triDepois.toLocaleString('pt-BR')}`);
console.log(`  Tamanho: ${(tamanhoAntes / 1048576).toFixed(1)} MB → ${(tamanhoDepois / 1048576).toFixed(1)} MB`);

const avisos = [];
if (tamanhoDepois > LIMITE_MB * 1048576) avisos.push(`O arquivo passa de ${LIMITE_MB} MB (limite do envio). Use --textura 1024 e/ou --triangulos 60000.`);
if (triDepois > TRIANGULOS_ALERTA) avisos.push(`Há ${triDepois.toLocaleString('pt-BR')} triângulos: pesado para celulares. Use --triangulos 100000.`);
if (depois.y < 0.02 && tipo !== 'altura') avisos.push('O modelo ficou muito baixo; confira se o eixo "para cima" está certo.');
for (const a of avisos) console.log(`  ! ${a}`);
console.log('\nConfira as medidas finais com as do fabricante e envie o arquivo pela tela Manutenção → Modelos 3D.\n');
