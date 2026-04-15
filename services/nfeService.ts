// Last Sync Validation: 2026-04-15 13:00
import { supabase } from '../lib/supabase';
import { inventoryService } from './inventoryService';
import { logService } from './logService';
import { whatsappService } from './whatsappService';
import { predictionService } from './predictionService';

interface NfeItem {
  cProd: string;
  xProd: string;
  qCom: number;
  uCom: string;
  vUnCom: number;
  cfop: string;
}

interface NfeData {
  access_key: string;
  nfe_number: string;
  series: string;
  cnpj_emit: string;
  cnpj_dest: string;
  dhEmi: string;
  items: NfeItem[];
  tpNF: '0' | '1'; // 0=Entrance, 1=Exit
}

const MONITORED_CNPJS = {
  'CE': '05502390000111',
  'SP': '05502390000383',
  'SC': '05502390000200'
};

const REVERSE_CNPJ_MAP: Record<string, 'CE' | 'SP' | 'SC'> = {
  '05502390000111': 'CE',
  '05502390000383': 'SP',
  '05502390000200': 'SC'
};

export const nfeService = {
  /**
   * Main entry point to sync NFes from SEFAZ
   * In a real scenario, this would be triggered by a Cron Job or Webhook
   */
  async syncFromSefaz(): Promise<{ processed: number; errors: number }> {
    console.log('Starting SEFAZ Sync...');
    let processedCount = 0;
    let errorCount = 0;

    try {
      const tokens: Record<string, string | undefined> = {
        'CE': import.meta.env.VITE_FOCUS_NFE_TOKEN_CE,
        'SP': import.meta.env.VITE_FOCUS_NFE_TOKEN_SP,
        'SC': import.meta.env.VITE_FOCUS_NFE_TOKEN_SC
      };

      // Sync for each monitored branch
      for (const [branch, cnpj] of Object.entries(MONITORED_CNPJS)) {
        const token = tokens[branch];
        
        console.log(`🔍 [DEBUG] Verificando conexão para Filial ${branch}...`);
        
        if (!token || token.trim().length < 5) {
          console.error(`❌ [ERRO] Token para filial ${branch} está VAZIO ou INVÁLIDO no código!`);
          continue;
        }

        console.log(`✅ [INFO] Token para ${branch} carregado (inicia com: ${token.substring(0, 3)}...)`);

        console.log(`Syncing branch ${branch} (CNPJ: ${cnpj})...`);
        
        // Define endpoints: Received uses 'cnpj', Emitted also uses 'cnpj' in many v2 versions
        const endpoints = [
          { url: `/api/focus-nfe/v2/nfes_recebidas?cnpj=${cnpj}`, type: 'received' },
          { url: `/api/focus-nfe/v2/nfes?cnpj=${cnpj}`, type: 'emitted' }
        ];

        for (const endpoint of endpoints) {
          try {
            console.log(`📡 Fetching ${endpoint.type} NFes for ${branch}...`);
            const response = await fetch(endpoint.url, {
              headers: {
                'Authorization': `Basic ${btoa(token.trim())}`,
                'X-Focus-Token': token.trim(),
                'Content-Type': 'application/json'
              }
            });

            if (response.status === 404) {
              console.warn(`ℹ️ [404] Nenhuma nota encontrada ou endpoint inexistente para ${branch} (${endpoint.type})`);
              continue;
            }

            if (!response.ok) {
              console.error(`❌ Erro HTTP ${response.status} para ${branch} (${endpoint.type})`);
              errorCount++;
              continue;
            }

            const data = await response.json();
            // Focus can return the array directly or inside a key
            const nfes = Array.isArray(data) ? data : (data.nfes_recebidas || data.dfes || data.nfes || []);
            
            for (const nfeWrapper of nfes) {
              const isReceived = endpoint.type === 'received';
              const isNfe = isReceived ? nfeWrapper.tipo === 'nfe' : (nfeWrapper.status === 'autorizado');

              if (isNfe) {
                const nfeData: NfeData = {
                  access_key: nfeWrapper.chave_nfe,
                  nfe_number: nfeWrapper.numero || 'N/A',
                  series: nfeWrapper.serie || '1',
                  cnpj_emit: nfeWrapper.cnpj_emitente,
                  cnpj_dest: nfeWrapper.cnpj_destinatario,
                  dhEmi: nfeWrapper.data_emissao,
                  tpNF: isReceived ? (nfeWrapper.tipo_operacao === 'entrada' ? '0' : '1') : '1',
                  items: []
                };

                const rawItems = isReceived ? (nfeWrapper.itens || []) : (nfeWrapper.items || []);
                nfeData.items = rawItems.map((it: any) => ({
                  cProd: String(it.codigo_produto || it.codigo || ''),
                  xProd: String(it.descricao || it.nome || 'Produto Indefinido'),
                  qCom: Number(it.quantidade || 0),
                  uCom: String(it.unidade || 'UN'),
                  vUnCom: Number(it.valor_unitario || 0),
                  cfop: String(it.cfop || '')
                }));

                if (nfeData.items.length > 0) {
                  const result = await this.processNfe(nfeData);
                  if (result) processedCount++;
                }
              }
            }
          } catch (branchErr) {
            console.error(`Failed ${endpoint.type} sync for branch ${branch}:`, branchErr);
            errorCount++;
          }
        }
      }

      return { processed: processedCount, errors: errorCount };
    } catch (err) {
      console.error('Failed to sync from SEFAZ:', err);
      return { processed: 0, errors: 1 };
    }
  },

  /**
   * Processes a single NFe and updates stock
   */
  async processNfe(nfe: NfeData): Promise<boolean> {
    // 1. Check if already processed (Idempotency)
    const { data: existing } = await supabase!
      .from('nfe_automation_history')
      .select('id')
      .eq('access_key', nfe.access_key)
      .maybeSingle();

    if (existing) {
      console.log(`NFe ${nfe.access_key} already processed. Skipping.`);
      return false;
    }

    // 2. Identify the target branch and operation
    let branch: 'CE' | 'SP' | 'SC' | null = null;
    let operation: 'entry' | 'exit' = 'entry';

    if (REVERSE_CNPJ_MAP[nfe.cnpj_dest]) {
      branch = REVERSE_CNPJ_MAP[nfe.cnpj_dest];
      operation = 'entry'; // We are the destination = Incoming stock
    } else if (REVERSE_CNPJ_MAP[nfe.cnpj_emit]) {
      branch = REVERSE_CNPJ_MAP[nfe.cnpj_emit];
      operation = 'exit'; // We are the emitter = Outgoing stock
    }

    if (!branch) {
      console.warn(`NFe ${nfe.access_key} does not belong to monitored CNPJs. Skipping.`);
      return false;
    }

    console.log(`Analyzing NFe ${nfe.nfe_number} - Operation: ${operation.toUpperCase()} at ${branch}`);

    // Business Rules for CFOP filtering (Senior standard)
    // Venda: 5101, 5102, 6101, 6102, etc.
    // Locação: 5908, 6908 (Saída) / 1909, 2909 (Entrada)
    // Demonstração: 5912, 6912 (Saída) / 1913, 2913 (Entrada)
    // Brinde: 5910, 6910 (Saída)
    // Importação: 3xxx (Entrada)
    const VALID_CFOP_RULES = {
      entry: [
        /^[12]10/, // Compras (Industrialização/Comercialização)
        /^[12]20/, // Devolução de Venda
        /^[12]40/, // Compra com ST
        /^[12]90[89]$/, // Retorno de Locação (1908, 1909, 2908, 2909)
        /^[12]91[23]$/, // Retorno de Demonstração (1912, 1913, 2912, 2913)
        /^3/            // Importação
      ],
      exit: [
        /^[56]10/, /^[56]40/, // Vendas (Produção/Terceiros/ST)
        /^[56]908$/,          // Remessa Locação
        /^[56]910$/,          // Brinde / Doação
        /^[56]912$/           // Remessa Demonstração
      ]
    };

    // 3. Process items and update stock
    const processedItems = [];
    let itemsAdjusted = 0;

    for (const item of nfe.items) {
      // Check if CFOP matches our valid business rules
      const rules = operation === 'entry' ? VALID_CFOP_RULES.entry : VALID_CFOP_RULES.exit;
      const isValidCfop = rules.some(regex => regex.test(item.cfop));

      if (!isValidCfop) {
        console.log(`Item ${item.cProd} skipped due to CFOP ${item.cfop}`);
        processedItems.push({ code: item.cProd, quantity: item.qCom, success: false, skip: true });
        continue;
      }

      const cleanCode = item.cProd.endsWith('.0') ? item.cProd.slice(0, -2) : item.cProd;
      
      const product = await inventoryService.getProductById(cleanCode);
      if (!product) {
        console.warn(`Product ${cleanCode} not found in database. Still adjusting stock...`);
      }

      const multiplier = operation === 'entry' ? 1 : -1;
      const adjustment = item.qCom * multiplier;

      const adjustments = {
        ce: branch === 'CE' ? adjustment : 0,
        sc: 0, 
        sp: branch === 'SP' ? adjustment : 0
      };

      try {
        await inventoryService.adjustStock(cleanCode, adjustments);
        processedItems.push({ code: cleanCode, quantity: item.qCom, success: true });
        itemsAdjusted++;
      } catch (err) {
        console.error(`Failed to adjust stock for ${cleanCode}:`, err);
        processedItems.push({ code: cleanCode, quantity: item.qCom, success: false, error: String(err) });
      }
    }

    // 4. Log the operation
    const status = itemsAdjusted === 0 && processedItems.length > 0 ? 'skipped' : 'processed';
    
    await supabase!.from('nfe_automation_history').insert({
      access_key: nfe.access_key,
      nfe_number: nfe.nfe_number,
      series: nfe.series,
      cnpj_monitored: branch === 'CE' ? MONITORED_CNPJS.CE : (branch === 'SP' ? MONITORED_CNPJS.SP : MONITORED_CNPJS.SC),
      branch: branch,
      operation_type: operation,
      raw_data: nfe as any,
      status: status
    });

    // 5. System Log
    await logService.logActivity({
      action_type: 'NFE_AUTO',
      entity_type: 'STOCK_SYNC',
      details: { 
        message: `Processamento automático NFe ${nfe.nfe_number} (${operation}) na filial ${branch}`,
        access_key: nfe.access_key, 
        items_count: nfe.items.length 
      }
    });

    // 6. WhatsApp Notification for Sales (Senior Feature)
    if (operation === 'entry' && itemsAdjusted > 0) {
      const itemsForAlert = processedItems
        .filter(it => it.success && !it.skip)
        .map(it => {
          const rawItem = nfe.items.find(ri => (ri.cProd.endsWith('.0') ? ri.cProd.slice(0, -2) : ri.cProd) === it.code);
          return { code: it.code, name: rawItem?.xProd || 'Produto', quantity: it.quantity };
        });
      
      if (itemsForAlert.length > 0) {
        await whatsappService.notifySalesTeam(itemsForAlert, branch);
      }
    }

    // 7. Check for Critical Stock after Exit (Senior Feature)
    if (operation === 'exit' && branch) {
      await predictionService.checkAndNotifyCriticalStock(branch);
    }

    return true;
  },

  /**
   * Mock function to simulate SEFAZ API response
   * In a real system, this would call FocusNFe or similar
   */
  async mockFetchNewNfes(): Promise<NfeData[]> {
    // Simulating discovery of a new NFe issued against the CE CNPJ
    return [
      {
        access_key: '23240405502390000111550010000123451234567890',
        nfe_number: '12345',
        series: '1',
        cnpj_emit: '11222333000199', // Supplier
        cnpj_dest: '05502390000111', // Our CE Branch
        dhEmi: new Date().toISOString(),
        tpNF: '0',
        items: [
          { cProd: '4303', xProd: 'Produto de Teste SEFAZ', qCom: 10, uCom: 'UN', vUnCom: 50.0, cfop: '5102' }
        ]
      }
    ];
  }
};
