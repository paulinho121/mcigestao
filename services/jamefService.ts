
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

        const isDev = import.meta.env.DEV;
        const baseUrl = isDev ? '/api/jamef-prod' : 'https://api.jamef.com.br';
        const url = `${baseUrl}/auth/v1/login`;

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
            const isDev = import.meta.env.DEV;
            const baseUrl = isDev ? '/api/jamef-prod/consulta/v1' : 'https://api.jamef.com.br/consulta/v1';

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
    }
};
