
import { supabase } from '../lib/supabase';
import { SCAPIResponse, SCStockItem } from '../types/scApi';

/**
 * Service to handle integration with the external SC Stock API
 */

// URL Base apontando para o PROXY local do Vite (para evitar erro de CORS)
// Em produção, isso precisaria ser ajustado ou o CORS liberado no servidor
const SC_API_BASE_URL = '/api/escalasoft';
// Endpoint específico com CNPJ (mantendo o restante do caminho)
const SC_STOCK_ENDPOINT = '/armazem/producao/estoquemercadoria?cnpj=05502390000200';

const SC_API_TOKEN = import.meta.env.VITE_SC_API_TOKEN || ''; // Token de autenticação (se necessário além do CNPJ)

export const scStockService = {
    /**
     * Fetches stock data from the external API
     */
    async fetchStockData(): Promise<SCStockItem[]> {
        try {
            // Construindo a URL completa
            const url = `${SC_API_BASE_URL}${SC_STOCK_ENDPOINT}`;

            console.log(`Buscando estoque em: ${url}`);

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };

            // Apenas adiciona Authorization ser tiver o token
            if (SC_API_TOKEN) {
                headers['Authorization'] = SC_API_TOKEN;
            }

            const response = await fetch(url, {
                method: 'GET', // Assumindo GET para consulta
                headers
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Erro na API SC (${response.status}): ${response.statusText} - ${text}`);
            }

            // O JSON retornado deve corresponder à interface SCAPIResponse
            const data: SCAPIResponse = await response.json();

            // Validação básica
            if (!data || !data.EstoqueMercadoria) {
                console.warn('Estrutura de resposta inesperada:', data);
                return [];
            }

            return data.EstoqueMercadoria;
        } catch (error: any) {
            console.error('Erro ao buscar estoque SC:', error);
            // Re-throw para ser capturado no syncStock ou tratado aqui
            throw error;
        }
    },

    /**
     * Syncs the external stock data with our local database
     * Maps 'Produto' to 'id' (Code) and 'SaldoDisponivel.Quantidade' to 'stock_sc'
     */
    /**
     * Syncs the external stock data with our local database
     * Uses bulk processing for performance
     */
    async syncStock() {
        if (!supabase) {
            console.error('Supabase client not initialized');
            return { success: false, message: 'Supabase client not initialized' };
        }

        try {
            let items: SCStockItem[] = [];
            try {
                items = await this.fetchStockData();
            } catch (e: any) {
                return { success: false, message: `Falha ao conectar API: ${e.message}` };
            }

            if (items.length === 0) {
                return { success: false, message: 'Nenhum dado recebido da API.' };
            }

            console.log(`Iniciando processamento de ${items.length} itens...`);
            if (items.length > 0) {
                console.log('Chaves disponíveis no item:', Object.keys(items[0]));
                console.log('Exemplo de item completo:', JSON.stringify(items[0]));
            }

            // Agrega quantidades por Produto (ID) para somar múltiplas entradas (ex: lotes diferentes)
            const aggregatedStock = new Map<string, number>();

            items.forEach(item => {
                // A API retorna o campo 'Item' no formato "CÓDIGO - DESCRIÇÃO" (ex: "4338 - PRODUTO X")
                // Precisamos extrair apenas o código (antes do primeiro " - ")
                if (item.Item && typeof item.SaldoDisponivel?.Quantidade === 'number') {
                    // Extrai o ID: Pega tudo antes do primeiro " - "
                    const productId = item.Item.split(' - ')[0].trim();

                    if (productId) {
                        const currentQty = aggregatedStock.get(productId) || 0;
                        aggregatedStock.set(productId, currentQty + item.SaldoDisponivel.Quantidade);
                    }
                }
            });

            console.log(`Produtos únicos identificados: ${aggregatedStock.size}`);

            // Log para debug
            if (items.length > 0) {
                const firstId = items[0].Item?.split(' - ')[0].trim();
                console.log(`Exemplo de ID extraído: "${firstId}" (Original: "${items[0].Item}")`);
            }

            // Log específico para verificação
            if (aggregatedStock.has('4339')) {
                console.log(`Total calculado para o produto 4339: ${aggregatedStock.get('4339')}`);
            }

            // Converte o Map para o formato do payload
            const stockUpdates = Array.from(aggregatedStock.entries()).map(([id, quantity]) => ({
                id,
                quantity
            }));

            console.log(`Payload preparado (primeiros 3):`, stockUpdates.slice(0, 3));

            // Processa em lotes para evitar timeouts ou payload excessivo
            const BATCH_SIZE = 500;
            let totalvUpdated = 0;
            let totalErrors = 0;

            for (let i = 0; i < stockUpdates.length; i += BATCH_SIZE) {
                const batch = stockUpdates.slice(i, i + BATCH_SIZE);

                const { data, error } = await supabase
                    .rpc('bulk_update_sc_stock', { payload: batch });

                if (error) {
                    console.error('Erro no lote de sincronização:', error);
                    // Continua para o próximo lote, mas registra erro
                    totalErrors += batch.length; // Assume fail for logical batch
                } else {
                    totalvUpdated += (data as any)?.updated || 0;
                    // Errors inside RPC are swallowed in count but logic is robust
                }
            }

            return {
                success: true,
                updated: totalvUpdated,
                errors: totalErrors,
                totalProcessed: items.length
            };

        } catch (error: any) {
            console.error('Erro no processo de sincronização:', error);
            return { success: false, message: `Erro interno: ${error.message}` };
        }
    }
};
