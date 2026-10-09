// ─────────────────────────────────────────────────────────────────────────────
// Consulta de CNPJ (dados cadastrais da Receita) com provedores de reserva.
//
// A BrasilAPI sozinha às vezes responde 403/429 (bloqueio por IP/limite) e, como
// essa resposta vem sem cabeçalho CORS, no navegador aparece só como "falha de rede".
// Por isso tentamos em ordem e usamos o primeiro que responder:
//   1. BrasilAPI           https://brasilapi.com.br/api/cnpj/v1/{cnpj}
//   2. publica.cnpj.ws     https://publica.cnpj.ws/cnpj/{cnpj}   (aceita CORS; ~3 consultas/min)
// ─────────────────────────────────────────────────────────────────────────────

export interface DadosCnpj {
    razaoSocial: string;
    nomeFantasia: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;      // só dígitos
    telefone: string; // DDD + número, só dígitos
    email: string;
}

const TIMEOUT_MS = 8000;

async function fetchJson(url: string): Promise<{ status: number; data: any | null }> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal });
        let data: any = null;
        if (res.ok) {
            try { data = await res.json(); } catch { data = null; }
        }
        return { status: res.status, data };
    } finally {
        clearTimeout(timer);
    }
}

const str = (v: unknown) => (v == null ? '' : String(v).trim());
const digits = (v: unknown) => str(v).replace(/\D/g, '');

function fromBrasilApi(d: any): DadosCnpj {
    return {
        razaoSocial: str(d.razao_social),
        nomeFantasia: str(d.nome_fantasia),
        logradouro: str(d.logradouro),
        numero: str(d.numero),
        complemento: str(d.complemento),
        bairro: str(d.bairro),
        municipio: str(d.municipio),
        uf: str(d.uf),
        cep: digits(d.cep),
        telefone: digits(d.ddd_telefone_1),
        email: str(d.email),
    };
}

function fromCnpjWs(d: any): DadosCnpj {
    const e = d?.estabelecimento ?? {};
    return {
        razaoSocial: str(d?.razao_social),
        nomeFantasia: str(e.nome_fantasia),
        logradouro: str(e.logradouro),
        numero: str(e.numero),
        complemento: str(e.complemento),
        bairro: str(e.bairro),
        municipio: str(e.cidade?.nome),
        uf: str(e.estado?.sigla),
        cep: digits(e.cep),
        telefone: digits(`${str(e.ddd1)}${str(e.telefone1)}`),
        email: str(e.email),
    };
}

const PROVEDORES: { nome: string; url: (cnpj: string) => string; mapear: (d: any) => DadosCnpj }[] = [
    { nome: 'BrasilAPI', url: (c) => `https://brasilapi.com.br/api/cnpj/v1/${c}`, mapear: fromBrasilApi },
    { nome: 'publica.cnpj.ws', url: (c) => `https://publica.cnpj.ws/cnpj/${c}`, mapear: fromCnpjWs },
];

/**
 * Consulta o CNPJ (14 dígitos). Retorna os dados, `null` se o CNPJ realmente não existe
 * (todos os provedores que responderam disseram 404) ou lança erro se não foi possível
 * consultar (todos falharam/bloquearam).
 */
export async function consultarCnpj(cnpj: string): Promise<DadosCnpj | null> {
    const limpo = digits(cnpj);
    if (limpo.length !== 14) return null;

    let naoEncontrado = false;
    let falhou = false;

    for (const p of PROVEDORES) {
        try {
            const { status, data } = await fetchJson(p.url(limpo));
            if (data) {
                const dados = p.mapear(data);
                if (dados.razaoSocial || dados.nomeFantasia) return dados;
                falhou = true;
            } else if (status === 404) {
                naoEncontrado = true;
            } else {
                falhou = true; // 403, 429, 5xx...
            }
        } catch {
            falhou = true; // rede, CORS, timeout
        }
    }

    if (naoEncontrado && !falhou) return null;
    throw new Error('Não foi possível consultar o CNPJ agora. Tente novamente em instantes ou preencha os dados manualmente.');
}
