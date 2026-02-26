
export interface JamefTrackingEvent {
    data: string;
    hora: string;
    descricao: string;
    cidade: string;
    uf: string;
}

export interface JamefTrackingItem {
    numeroNotaFiscal: string;
    serieNotaFiscal: string;
    numeroCte: string;
    status: string;
    dataPrevisaoEntrega: string;
    eventos: JamefTrackingEvent[];
    linkComprovante?: string;
}

export interface JamefTrackingResponse {
    sucesso: boolean;
    mensagem?: string;
    items: JamefTrackingItem[];
}

const JAMEF_API_TOKEN = import.meta.env.VITE_JAMEF_TOKEN || 'Basic dGVzdGU6dGVzdGU='; // 'teste:teste' default for QA

export const jamefService = {
    /**
     * Track cargo using Jamef API
     */
    async trackCargo(params: {
        documento?: string; // One of: Payer, Sender, Recipient
        docType: 'pagador' | 'remetente' | 'destinatario';
        numero: string; // One of: Invoice or CT-e
        numType: 'notaFiscal' | 'cte';
        useProduction?: boolean;
    }): Promise<JamefTrackingResponse> {
        try {
            // Utiliza o proxy do Vite se estiver em desenvolvimento para evitar CORS
            const isDev = import.meta.env.DEV;
            let baseUrl = '';

            if (isDev) {
                baseUrl = params.useProduction ? '/api/jamef-prod/consulta/v1' : '/api/jamef-qa/consulta/v1';
            } else {
                baseUrl = params.useProduction ? 'https://api.jamef.com.br/consulta/v1' : 'https://api-qa.jamef.com.br/consulta/v1';
            }

            const queryParams = new URLSearchParams();

            // Formata o documento removendo caracteres não numéricos
            const cleanDoc = params.documento?.replace(/\D/g, '') || '';

            if (params.docType === 'pagador') queryParams.append('documentoPagadorFrete', cleanDoc);
            if (params.docType === 'remetente') queryParams.append('documentoRemetente', cleanDoc);
            if (params.docType === 'destinatario') queryParams.append('documentoDestinatario', cleanDoc);

            if (params.numType === 'notaFiscal') queryParams.append('numeroNotaFiscal', params.numero);
            if (params.numType === 'cte') queryParams.append('numeroCte', params.numero);

            const url = `${baseUrl}/rastreamento?${queryParams.toString()}`;
            console.log(`Buscando rastreamento real em: ${url}`);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': JAMEF_API_TOKEN
                }
            });

            if (!response.ok) {
                const text = await response.text();
                // Tenta extrair mensagem de erro do corpo se houver
                let errorMsg = `Erro na API Jamef (${response.status})`;
                try {
                    const errorJson = JSON.parse(text);
                    if (errorJson.mensagem) errorMsg = errorJson.mensagem;
                } catch (e) { }

                throw new Error(errorMsg);
            }

            const data = await response.json();

            // A API Jamef v1 geralmente retorna um Array de objetos diretamente se houver sucesso
            // ou um envelope se houver muitos resultados. Vamos adaptar para nossa interface.
            let items: JamefTrackingItem[] = [];

            if (Array.isArray(data)) {
                items = data;
            } else if (data && typeof data === 'object') {
                // Se retornar um objeto único, envelopar num array
                if (data.numeroNotaFiscal || data.numeroCte) {
                    items = [data];
                } else if (data.items && Array.isArray(data.items)) {
                    // Caso o backend atual do usuário já envie o envelope
                    items = data.items;
                }
            }

            if (items.length === 0) {
                return {
                    sucesso: false,
                    mensagem: 'Nenhuma mercadoria encontrada com os parâmetros informados.',
                    items: []
                };
            }

            return {
                sucesso: true,
                items
            };
        } catch (error: any) {
            console.error('Error tracking Jamef cargo:', error);
            return {
                sucesso: false,
                mensagem: error.message || 'Erro ao consultar API da Jamef',
                items: []
            };
        }
    }
};
