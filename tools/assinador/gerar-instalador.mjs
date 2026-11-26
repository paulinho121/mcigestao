// Gera o instalador de arquivo único (public/assinador/Instalar-Assinador-MCI.bat).
// Embute o assinador.ps1 (base64) dentro do instalar.ps1 e o anexa a um cabeçalho .bat.
// Roda automaticamente antes do build (npm run build) e pode ser rodado à mão:
//   node tools/assinador/gerar-instalador.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const saida = join(aqui, '..', '..', 'public', 'assinador', 'Instalar-Assinador-MCI.bat');

const assinador = readFileSync(join(aqui, 'assinador.ps1'));
let instalar = readFileSync(join(aqui, 'instalar.ps1'), 'utf8').replace(/^﻿/, '');
if (!instalar.includes('##ASSINADOR_B64##')) throw new Error('marcador ##ASSINADOR_B64## não encontrado em instalar.ps1');
instalar = instalar.replace('##ASSINADOR_B64##', assinador.toString('base64'));

// Cabeçalho em ASCII puro (cmd lê a página de código do Windows); o resto é lido pelo PowerShell em UTF-8.
const cabecalho = [
    '@echo off',
    'title Instalar Assinador MCI',
    'echo Instalando o Assinador MCI...',
    `powershell -NoProfile -ExecutionPolicy Bypass -Command "$c=[IO.File]::ReadAllText('%~f0',[Text.Encoding]::UTF8); $i=$c.LastIndexOf('#--PS--'); & ([scriptblock]::Create($c.Substring($i+7)))"`,
    'echo.',
    'pause',
    'exit /b',
    '#--PS--',
    '',
].join('\r\n');

mkdirSync(dirname(saida), { recursive: true });
writeFileSync(saida, cabecalho + instalar.replace(/\r?\n/g, '\r\n'), 'utf8');
console.log(`Instalador gerado: ${saida}`);
