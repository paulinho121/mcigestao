/**
 * braspress-cotacao — Supabase Edge Function
 *
 * Cota frete na API da Braspress mantendo usuário/senha exclusivamente no
 * servidor — as credenciais NUNCA vão para o navegador nem para o repositório.
 *
 * Chamada pelo front via supabase.functions.invoke('braspress-cotacao', { body }).
 *
 * A Braspress emite um usuário/senha POR CNPJ (filial). A função escolhe as
 * credenciais pelo CNPJ do remetente enviado no body.
 *
 * Segredos necessários (Supabase → Edge Functions → Secrets), um par por CNPJ:
 *   BRASPRESS_USER_<CNPJ>   → usuário da API (ex.: 05502390000200_PRD)
 *   BRASPRESS_PASS_<CNPJ>   → senha da API
 *   (<CNPJ> = 14 dígitos, sem pontuação)
 *
 * Doc: https://api.braspress.com/home
 *   POST https://api.braspress.com/v1/cotacao/calcular/json  (Basic Auth)
 */

const BRASPRESS_BASE = 'https://api.braspress.com';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
    });

const onlyDigits = (v: unknown) => String(v ?? '').replace(/\D/g, '');

interface VolumeCubagem {
    quantidade: number;
    altura: number;       // cm
    largura: number;      // cm
    comprimento: number;  // cm
}

interface Body {
    cnpjRemetente: string;
    cnpjDestinatario: string;
    cepOrigem: string;
    cepDestino: string;
    peso: number;              // kg
    valorMercadoria: number;   // R$
    volumes: number;
    volumesCubagem?: VolumeCubagem[];
    modal?: 'R' | 'A';         // R = rodoviário (padrão), A = aéreo
    tipoFrete?: 1 | 2 | 3;     // 1 = CIF (padrão), 2 = FOB, 3 = consignado
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

    let body: Body;
    try {
        body = await req.json();
    } catch {
        return json({ error: 'Corpo da requisição inválido.' }, 400);
    }

    const cnpjRem = onlyDigits(body.cnpjRemetente);
    const cnpjDest = onlyDigits(body.cnpjDestinatario);

    if (cnpjRem.length !== 14) return json({ error: 'CNPJ do remetente inválido.' }, 400);
    if (cnpjDest.length !== 14 && cnpjDest.length !== 11) {
        return json({ error: 'A Braspress exige o CNPJ/CPF do destinatário para cotar.' }, 400);
    }

    const user = Deno.env.get(`BRASPRESS_USER_${cnpjRem}`) ?? '';
    const pass = Deno.env.get(`BRASPRESS_PASS_${cnpjRem}`) ?? '';
    if (!user || !pass) {
        // Não é erro do usuário: esse CNPJ simplesmente não tem credencial cadastrada
        return json({ configured: false, error: `Braspress não configurada para o CNPJ ${cnpjRem}.` });
    }

    const peso = Number(body.peso);
    const valor = Number(body.valorMercadoria);
    const volumes = Math.max(1, Math.floor(Number(body.volumes) || 1));
    if (!(peso > 0) || !(valor > 0)) return json({ error: 'Informe peso e valor da mercadoria.' }, 400);

    // Braspress espera a cubagem em METROS. Sem medidas, usa 30 cm por volume (mínimo razoável).
    const dims = (body.volumesCubagem && body.volumesCubagem.length > 0)
        ? body.volumesCubagem
        : [{ quantidade: volumes, altura: 30, largura: 30, comprimento: 30 }];

    const cubagem = dims.map((d) => ({
        comprimento: Math.max(Number(d.comprimento) || 30, 1) / 100,
        largura: Math.max(Number(d.largura) || 30, 1) / 100,
        altura: Math.max(Number(d.altura) || 30, 1) / 100,
        volumes: Math.max(1, Math.floor(Number(d.quantidade) || 1)),
    }));

    const payload = {
        cnpjRemetente: Number(cnpjRem),
        cnpjDestinatario: Number(cnpjDest),
        modal: body.modal === 'A' ? 'A' : 'R',
        tipoFrete: String(body.tipoFrete ?? 1),
        cepOrigem: Number(onlyDigits(body.cepOrigem)),
        cepDestino: Number(onlyDigits(body.cepDestino)),
        vlrMercadoria: valor,
        peso,
        volumes,
        cubagem,
    };

    try {
        const res = await fetch(`${BRASPRESS_BASE}/v1/cotacao/calcular/json`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${btoa(`${user}:${pass}`)}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const text = await res.text();
        let data: any = null;
        try { data = JSON.parse(text); } catch { /* resposta não-JSON */ }

        if (!res.ok) {
            const msg = data?.message
                || (Array.isArray(data?.errorList) ? data.errorList.map((e: any) => e?.message ?? e).join('; ') : '')
                || `Braspress respondeu ${res.status}.`;
            return json({ error: msg, status: res.status }, 502);
        }

        const totalFrete = Number(data?.totalFrete);
        if (!(totalFrete > 0)) {
            return json({ error: data?.message || 'A Braspress não retornou valor de frete para este trajeto.' }, 502);
        }

        return json({
            configured: true,
            resultado: {
                id: data?.id ?? null,
                servico: payload.modal === 'A' ? 'Braspress Aéreo' : 'Braspress Rodoviário',
                modal: payload.modal,
                valorFrete: totalFrete,
                prazoEntrega: Number(data?.prazo) || 0, // dias
            },
        });
    } catch (e: any) {
        return json({ error: `Falha ao consultar a Braspress: ${e?.message ?? e}` }, 502);
    }
});
