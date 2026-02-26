
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

const JAMEF_API_BASE_URL = 'https://api.jamef.com.br/consulta/v1';
const JAMEF_API_QA_URL = 'https://api-qa.jamef.com.br/consulta/v1';

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
            const baseUrl = params.useProduction ? JAMEF_API_BASE_URL : JAMEF_API_QA_URL;

            const queryParams = new URLSearchParams();

            if (params.docType === 'pagador') queryParams.append('documentoPagadorFrete', params.documento || '');
            if (params.docType === 'remetente') queryParams.append('documentoRemetente', params.documento || '');
            if (params.docType === 'destinatario') queryParams.append('documentoDestinatario', params.documento || '');

            if (params.numType === 'notaFiscal') queryParams.append('numeroNotaFiscal', params.numero);
            if (params.numType === 'cte') queryParams.append('numeroCte', params.numero);

            // Note: In a real scenario, we need an Authorization header.
            // Since we don't have the credentials yet, we'll log this.
            console.log(`Tracking with Jamef API: ${baseUrl}/rastreamento?${queryParams.toString()}`);

            // Mocking the response for now until we have auth setup
            // In a real implementation, we would do:
            /*
            const response = await fetch(`${baseUrl}/rastreamento?${queryParams.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${process.env.VITE_JAMEF_TOKEN}`
                }
            });
            return await response.json();
            */

            // Return mock data for UI development
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        sucesso: true,
                        items: [
                            {
                                numeroNotaFiscal: params.numType === 'notaFiscal' ? params.numero : '123456',
                                serieNotaFiscal: '1',
                                numeroCte: params.numType === 'cte' ? params.numero : '987654',
                                status: 'EM TRANSPORTE',
                                dataPrevisaoEntrega: '2024-03-05',
                                eventos: [
                                    {
                                        data: '2024-02-28',
                                        hora: '10:00',
                                        descricao: 'COLETA REALIZADA',
                                        cidade: 'SAO PAULO',
                                        uf: 'SP'
                                    },
                                    {
                                        data: '2024-02-29',
                                        hora: '14:30',
                                        descricao: 'EM VIAGEM PARA UNIDADE DE DESTINO',
                                        cidade: 'SAO PAULO',
                                        uf: 'SP'
                                    }
                                ]
                            }
                        ]
                    });
                }, 1000);
            });
        } catch (error) {
            console.error('Error tracking Jamef cargo:', error);
            return { sucesso: false, mensagem: 'Erro ao consultar API da Jamef', items: [] };
        }
    }
};
