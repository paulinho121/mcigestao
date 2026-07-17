
export interface JamefTrackingEvent {
    data: string;
    status: string;
    codigoOcorrencia?: string;
    localOrigem?: { cidade: string; uf: string };
}

export interface JamefTrackingItem {
    notaFiscal?: { numero: string; serie: string; chave: string };
    conhecimento?: { numero: string; serie: string; chave: string };
    frete?: { valorFrete: number; previsaoEntrega: string; urlComprovanteEntrega: string };
    eventosRastreio: JamefTrackingEvent[];
}

export interface JamefTrackingResponse {
    sucesso: boolean;
    mensagem?: string;
    item?: JamefTrackingItem;
}

// Um volume/caixa com suas próprias dimensões e quantidade — a Jamef aceita
// vários itens no array "cubagem", cada um com medidas diferentes.
export interface VolumeCubagem {
    quantidade: number;
    altura: number;
    largura: number;
    comprimento: number;
}

export interface CotacaoRequest {
    cnpjRemetente: string;
    cepOrigem: string;
    cepDestino: string;
    filialOrigem: string;
    peso: number;
    valorMercadoria: number;
    volumes: number;
    /** Lista de volumes com dimensões próprias (múltiplas caixas diferentes).
     *  Quando presente, substitui altura/largura/comprimento no cálculo de cubagem. */
    volumesCubagem?: VolumeCubagem[];
    altura?: number;
    largura?: number;
    comprimento?: number;
    tipoTransporte?: '1' | '2'; // "1" = Rodoviário (padrão), "2" = Aéreo
}

export interface CotacaoResponse {
    valorFrete: number;
    prazoEntrega: number; // dias úteis
    dataPrevisaoEntrega?: string;
    filialOrigem?: string;
    filialDestino?: string;
    servico?: string;
    pesoTaxado?: number;
    valorTaxas?: number;
    raw?: any;
}

// ─── Etiquetas ───────────────────────────────────────────────────────────────

export interface EtiquetaZpl {
    zpl: string;
    correlacaoId?: string;
}

export interface EtiquetaDadosVolume {
    numeroVolume?: number;
    peso?: number;
    altura?: number;
    largura?: number;
    comprimento?: number;
    descricao?: string;
}

export interface EtiquetaDados {
    correlacaoId?: string;
    sigla?: string;
    setor?: string;
    remetente?: { nome?: string; cnpj?: string; endereco?: string; cidade?: string; uf?: string; cep?: string };
    destinatario?: { nome?: string; cnpj?: string; cpf?: string; endereco?: string; cidade?: string; uf?: string; cep?: string };
    notaFiscal?: { chave?: string; numero?: string; serie?: string; valorTotal?: number };
    conhecimento?: { numero?: string; serie?: string };
    volumes?: EtiquetaDadosVolume[];
    totalVolumes?: number;
    pesoTotal?: number;
    raw?: any;
}

export interface SiglaSetor {
    sigla?: string;
    setor?: string;
    descricao?: string;
    filial?: string;
}

// ─────────────────────────────────────────────────────────────────────────────

export const jamefService = {
    /**
     * Authenticate and get JWT Token (Always Production)
     * Following Documentation: POST /login -> response.dado[0].accessToken
     */
    async login(): Promise<string> {
        const cacheKey = 'jamef_token_prod';
        const cached = localStorage.getItem(cacheKey);
        const cachedExpiry = localStorage.getItem(`${cacheKey}_expiry`);

        // Strictly respect cache to avoid 1R/1M Rate Limit
        if (cached && cachedExpiry && Date.now() < parseInt(cachedExpiry)) {
            return cached;
        }

        const url = `/api/jamef-prod/auth/v1/login`;

        try {
            console.log("🔐 Solicitando novo token Jamef (Rate Limit: 1/min)...");
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    username: 'logistica@mcistore.com.br',
                    password: '@Maezinha23'
                })
            });

            // Handle Rate Limit specifically
            if (response.status === 429) {
                if (cached) {
                    console.warn("Rate limit atingido. Usando token em cache.");
                    return cached;
                }
                throw new Error('Limite de 1 login por minuto atingido pela Jamef. Aguarde e tente novamente.');
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Erro no Login (${response.status}):`, errorText);
                throw new Error(`Falha na autenticação (Cód: ${response.status})`);
            }

            const data = await response.json();
            console.log("📦 Resposta do Login:", data);

            // De acordo com a documentação: data.dado[0].accessToken
            let token = data.dado?.[0]?.accessToken;

            // Fallback para outros formatos conhecidos de token
            if (!token) {
                token = data.token || data.access_token || (typeof data.dado?.[0] === 'string' ? data.dado[0] : null);
            }

            if (token && typeof token === 'string' && token.length > 20) {
                localStorage.setItem(cacheKey, token);
                // Validade de 1 hora conforme documentação (usamos 55m por segurança)
                localStorage.setItem(`${cacheKey}_expiry`, (Date.now() + 55 * 60 * 1000).toString());
                console.log('✅ Autenticação Jamef realizada com sucesso!');
                return token;
            }

            throw new Error('Login realizado, mas o campo "accessToken" não foi encontrado. Verifique seu acesso no portal Developers da Jamef.');
        } catch (err: any) {
            console.error('Jamef Login Error:', err);
            // If we have a cached token, even expired, try it as last resort
            if (cached) return cached;
            throw err;
        }
    },

    /**
     * Track cargo (Always Production)
     */
    async trackCargo(params: {
        documento?: string;
        docType: 'remetente' | 'destinatario';
        numero: string;
        numType: 'notaFiscal' | 'cte';
    }): Promise<JamefTrackingResponse> {
        try {
            const token = await this.login();
            const baseUrl = '/api/jamef-prod/consulta/v1';

            const queryParams = new URLSearchParams();
            const cleanDoc = params.documento?.replace(/\D/g, '') || '';

            if (params.docType === 'remetente') queryParams.append('documentoRemetente', cleanDoc);
            if (params.docType === 'destinatario') queryParams.append('documentoDestinatario', cleanDoc);

            if (params.numType === 'notaFiscal') {
                queryParams.append('numeroNotaFiscal', params.numero);
            } else {
                queryParams.append('numeroConhecimento', params.numero);
            }

            const response = await fetch(`${baseUrl}/rastreamento?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('jamef_token_prod');
                }
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.mensagem || `Erro ${response.status} na consulta.`);
            }

            const data = await response.json();

            if (data.situacao === 200 && data.dado?.[0]?.rastreamento?.[0]) {
                return { sucesso: true, item: data.dado[0].rastreamento[0] };
            }

            return {
                sucesso: false,
                mensagem: data.mensagem || 'Dados de rastreio não encontrados.'
            };
        } catch (error: any) {
            console.error('Jamef Tracking Error:', error);
            return { sucesso: false, mensagem: error.message };
        }
    },

    /**
     * Busca a filial Jamef responsável por um CEP (origem)
     * Rate limit: 1 req / 10s — usa cache agressivo por CEP
     */
    async buscarFilialPorCep(cep: string): Promise<{ codigo: string; sigla: string; nome: string } | null> {
        const cepLimpo = cep.replace(/\D/g, '');
        const cacheKey = `jamef_filial_cep_${cepLimpo}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try { return JSON.parse(cached); } catch {}
        }

        const token = await this.login();
        const res = await fetch(`/api/jamef-prod/infraestrutura/v1/lista-filiais?cep=${cepLimpo}`, {
            headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return null;
        const data = await res.json();

        // Normaliza resposta — pode vir em data.dado[0] ou diretamente
        const filial = data.dado?.[0] ?? data.filial ?? data;
        if (!filial?.codigo && !filial?.sigla) return null;

        const result = {
            codigo: filial.codigo ?? filial.id ?? '',
            sigla: filial.sigla ?? filial.codigo ?? '',
            nome: filial.nome ?? filial.descricao ?? '',
        };
        // Cache por 24h (filiais não mudam com frequência)
        localStorage.setItem(cacheKey, JSON.stringify(result));
        return result;
    },

    /**
     * Cotação de frete + prazo de entrega via Jamef
     * Usa ambiente QA (homologação). Troque para /api/jamef-prod para produção.
     */
    async cotacaoFrete(params: CotacaoRequest): Promise<CotacaoResponse> {
        const token = await this.login();

        const cnpjLimpo = params.cnpjRemetente.replace(/\D/g, '');

        const temVolumesCubagem = !!params.volumesCubagem && params.volumesCubagem.length > 0;

        // Metragem cúbica (m³): soma das dimensões de cada volume informado.
        // Sem dimensões, usa fator padrão de cubagem rodoviária (300 kg/m³) como estimativa.
        const metragemCubica = temVolumesCubagem
            ? params.volumesCubagem!.reduce((soma, v) => soma + (v.altura * v.largura * v.comprimento * v.quantidade) / 1_000_000, 0)
            : (params.altura && params.largura && params.comprimento)
                ? (params.altura * params.largura * params.comprimento * params.volumes) / 1_000_000
                : params.peso / 300;

        const body: Record<string, any> = {
            cnpjRemetente: cnpjLimpo,
            cepOrigem: params.cepOrigem.replace(/\D/g, ''),
            cepDestino: params.cepDestino.replace(/\D/g, ''),
            peso: params.peso,
            valorMercadoria: params.valorMercadoria,
            quantidadeVolumes: params.volumes,
            // Campos exigidos pela API (retornados como "required key" quando ausentes)
            pesoMercadoria: params.peso,
            valorNotaFiscal: params.valorMercadoria,
            documentoDevedor: cnpjLimpo,
            metragemCubica,
            // Enum validado em produção: "1" = Rodoviário, "2" = Aéreo
            tipoTransporte: params.tipoTransporte ?? '1',
        };

        body.filialOrigem = params.filialOrigem;
        if (temVolumesCubagem) {
            body.cubagem = params.volumesCubagem!.map(v => ({
                altura: v.altura,
                largura: v.largura,
                comprimento: v.comprimento,
                volumes: v.quantidade,
            }));
        } else if (params.altura && params.largura && params.comprimento) {
            body.cubagem = [{
                altura: params.altura,
                largura: params.largura,
                comprimento: params.comprimento,
                volumes: params.volumes,
            }];
        }

        const response = await fetch('/api/jamef-prod/calculo-frete/v1/cotacao', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errBody = await response.text().catch(() => '{}');
            console.error('Jamef cotação erro bruto:', errBody);
            let err: any = {};
            try { err = JSON.parse(errBody); } catch {}
            // Extrai mensagens de validação detalhadas se existirem
            const erros: string[] = [];
            if (err.errors && typeof err.errors === 'object') {
                Object.entries(err.errors).forEach(([campo, msgs]) => {
                    const list = Array.isArray(msgs) ? msgs : [msgs];
                    list.forEach((m: any) => erros.push(`${campo}: ${m}`));
                });
            }
            if (err.erros && Array.isArray(err.erros)) {
                err.erros.forEach((e: any) => erros.push(e.mensagem || JSON.stringify(e)));
            }
            const detail = erros.length > 0 ? `\n${erros.join('\n')}` : '';
            throw new Error((err.mensagem || err.message || err.title || `Erro ${response.status}`) + detail);
        }

        const data = await response.json();

        // Normaliza resposta (formato pode variar entre QA e PROD)
        const dado = data.dado?.[0] ?? data;

        // previsaoEntrega vem no formato brasileiro dd/mm/yyyy
        const previsaoStr: string | undefined = dado.dataPrevisaoEntrega ?? dado.previsaoEntrega;
        let dataPrevisaoISO: string | undefined = previsaoStr;
        let prazoDias = dado.prazoEntrega ?? dado.prazo ?? 0;
        const match = previsaoStr?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (match) {
            const [, d, m, y] = match;
            const previsaoDate = new Date(Number(y), Number(m) - 1, Number(d));
            dataPrevisaoISO = previsaoDate.toISOString();
            if (!prazoDias) {
                const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
                prazoDias = Math.max(0, Math.round((previsaoDate.getTime() - hoje.getTime()) / 86_400_000));
            }
        }

        const modalidades: Record<string, string> = { '1': 'Rodoviário', '2': 'Aéreo' };

        return {
            valorFrete: dado.valorFrete ?? dado.valor ?? dado.frete ?? 0,
            prazoEntrega: prazoDias,
            dataPrevisaoEntrega: dataPrevisaoISO,
            filialOrigem: dado.filialOrigem,
            filialDestino: dado.filialDestino,
            servico: dado.servico ?? dado.tipoServico ?? modalidades[dado.modalidadeTransporte] ?? dado.modalidadeTransporte,
            pesoTaxado: dado.pesoTaxado,
            valorTaxas: dado.valorTaxas ?? dado.imposto,
            raw: data,
        };
    },

    /**
     * Busca etiqueta no formato ZPL para uma chave de NF-e (44 dígitos)
     * GET /operacao/v1/etiqueta/{chaveNotaFiscal}?formato=zpl
     */
    async gerarEtiquetaZpl(chaveNotaFiscal: string): Promise<{ sucesso: boolean; etiqueta?: EtiquetaZpl; mensagem?: string }> {
        try {
            const token = await this.login();
            const chave = chaveNotaFiscal.replace(/\D/g, '');
            const res = await fetch(
                `/api/jamef-prod/operacao/v1/etiqueta/${chave}?tipoRetorno=zpl`,
                { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) {
                if (res.status === 401) localStorage.removeItem('jamef_token_prod');
                const err = await res.json().catch(() => ({}));
                return { sucesso: false, mensagem: err.mensagem || `Erro ${res.status}` };
            }
            const data = await res.json();
            const dado = data.dado?.[0] ?? data;
            return {
                sucesso: true,
                etiqueta: { zpl: dado.zpl ?? dado.conteudo ?? dado.etiqueta ?? JSON.stringify(dado), correlacaoId: dado.correlacaoId }
            };
        } catch (e: any) {
            return { sucesso: false, mensagem: e.message };
        }
    },

    /**
     * Busca etiqueta no formato dados (JSON estruturado) para uma chave de NF-e
     * GET /operacao/v1/etiqueta/{chaveNotaFiscal}?formato=dados
     */
    async gerarEtiquetaDados(chaveNotaFiscal: string): Promise<{ sucesso: boolean; etiqueta?: EtiquetaDados; mensagem?: string }> {
        try {
            const token = await this.login();
            const chave = chaveNotaFiscal.replace(/\D/g, '');
            const res = await fetch(
                `/api/jamef-prod/operacao/v1/etiqueta/${chave}?tipoRetorno=dados`,
                { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) {
                if (res.status === 401) localStorage.removeItem('jamef_token_prod');
                const err = await res.json().catch(() => ({}));
                return { sucesso: false, mensagem: err.mensagem || `Erro ${res.status}` };
            }
            const data = await res.json();
            const dado = data.dado?.[0] ?? data;
            return {
                sucesso: true,
                etiqueta: { ...dado, raw: data }
            };
        } catch (e: any) {
            return { sucesso: false, mensagem: e.message };
        }
    },

    /**
     * Lista siglas e setores disponíveis para etiquetagem
     * GET /operacao/v1/etiqueta/sigla
     */
    async buscarSiglasEtiqueta(): Promise<SiglaSetor[]> {
        try {
            const token = await this.login();
            const res = await fetch(`/api/jamef-prod/operacao/v1/etiqueta/sigla`, {
                headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return [];
            const data = await res.json();
            return data.dado ?? data ?? [];
        } catch {
            return [];
        }
    },
};
