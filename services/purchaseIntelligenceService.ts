import { supabase } from '../lib/supabase';
import { PurchaseOrder, PurchaseOrderItem, PurchaseSuggestionItem } from '../types';
import Papa from 'papaparse';

export const purchaseIntelligenceService = {
    /**
     * Recalculate ABC Classification for all products
     */
    async recalculateABC(): Promise<boolean> {
        if (!supabase) return false;

        // Fetch all products
        const { data: products, error } = await supabase
            .from('products')
            .select('id, total, last_purchase_price');

        if (error || !products) {
            console.error('Error fetching products for ABC:', error);
            return false;
        }

        // Calculate total stock value for each product
        const items = products.map((p: any) => ({
            id: p.id,
            totalValue: (Number(p.total) || 0) * (Number(p.last_purchase_price) || 0)
        }));

        // Sort by total value descending
        items.sort((a: any, b: any) => b.totalValue - a.totalValue);

        const grandTotalValue = items.reduce((sum: number, item: any) => sum + item.totalValue, 0);
        let cumulativeValue = 0;

        // Assign categories based on 80/15/5 rule
        const updates = items.map((item: any) => {
            cumulativeValue += item.totalValue;
            const percentage = grandTotalValue > 0 ? (cumulativeValue / grandTotalValue) * 100 : 100;

            let category: 'A' | 'B' | 'C' = 'C';
            if (percentage <= 80) category = 'A';
            else if (percentage <= 95) category = 'B';

            return { id: item.id, abc_category: category };
        });

        // Bulk update
        for (const update of updates) {
            await supabase
                .from('products')
                .update({ abc_category: update.abc_category })
                .eq('id', update.id);
        }

        return true;
    },

    /**
     * Get products that need restocking
     */
    async getPurchaseSuggestions(): Promise<any[]> {
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('products')
            .select('*')
            .or('total.lte.min_stock,total.lte.safety_stock')
            .order('abc_category', { ascending: true });

        if (error) {
            console.error('Error fetching suggestions:', error);
            return [];
        }

        return data.map((p: any) => ({
            ...p,
            suggested_quantity: Math.max(0, (Number(p.max_stock) || 0) - Number(p.total)),
            urgency: Number(p.total) <= (Number(p.safety_stock) || 0) ? 'CRITICAL' : 'LOW'
        }));
    },

    /**
     * Relatório de Sugestão de Compra por Marca.
     *
     * Cruza o estoque físico atual de cada produto com o que já está em
     * importação (projetos "open" em import_items) antes de sugerir compra —
     * um item que já tem reposição suficiente a caminho não entra na lista.
     *
     * Regras de urgência (nessa ordem):
     *  - ESGOTADO: estoque disponível (total - reservado) <= 0
     *  - CRITICO:  safety_stock definido e total <= safety_stock
     *  - BAIXO:    min_stock definido e total <= min_stock
     *
     * Quantidade sugerida = meta - (estoque atual + o que já está importando),
     * onde a meta é max_stock, ou 2x min_stock, ou 3x safety_stock (o que
     * existir primeiro, nessa ordem). Sem nenhuma meta cadastrada, o item
     * ainda aparece (para não esconder um esgotado), mas suggestedQty vem
     * null — "a definir manualmente" em vez de um número inventado.
     */
    async getPurchaseSuggestionsByBrand(): Promise<PurchaseSuggestionItem[]> {
        if (!supabase) return [];

        // 1. Todos os produtos (sem o limite padrão de 100 usado nas listagens da UI)
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, name, brand, brand_logo, stock_ce, stock_sc, stock_sp, total, reserved, min_stock, max_stock, safety_stock, last_purchase_price')
            .not('id', 'like', '%.0')
            .order('brand', { ascending: true })
            .limit(5000);

        if (productsError || !products) {
            console.error('Error fetching products for purchase suggestions:', productsError);
            return [];
        }

        // 2. Quantidades já em importação (projetos abertos), somadas por produto
        const { data: openProjects } = await supabase
            .from('import_projects')
            .select('id')
            .eq('status', 'open');

        const incomingByProduct = new Map<string, number>();
        const openProjectIds = (openProjects || []).map((p: any) => p.id);
        if (openProjectIds.length > 0) {
            const { data: items } = await supabase
                .from('import_items')
                .select('product_id, quantity')
                .in('project_id', openProjectIds);

            for (const item of items || []) {
                const prev = incomingByProduct.get(item.product_id) || 0;
                incomingByProduct.set(item.product_id, prev + (Number(item.quantity) || 0));
            }
        }

        // 3. Monta o relatório
        const suggestions: PurchaseSuggestionItem[] = [];

        for (const p of products) {
            const currentStock = Number(p.total) || 0;
            const reserved = Number(p.reserved) || 0;
            const available = currentStock - reserved;
            const minStock = Number(p.min_stock) || 0;
            const maxStock = Number(p.max_stock) || 0;
            const safetyStock = Number(p.safety_stock) || 0;
            const rawId = String(p.id);
            const incomingQty = incomingByProduct.get(rawId) || 0;
            const projectedStock = currentStock + incomingQty;

            let urgency: PurchaseSuggestionItem['urgency'] | null = null;
            if (available <= 0) urgency = 'ESGOTADO';
            else if (safetyStock > 0 && currentStock <= safetyStock) urgency = 'CRITICO';
            else if (minStock > 0 && currentStock <= minStock) urgency = 'BAIXO';

            const hasImportActivity = incomingQty > 0;

            // Estoque saudável e nada em importação: não há nada a reportar sobre esse item
            if (!urgency && !hasImportActivity) continue;

            let suggestedQty: number | null = null;
            let coveredByImport = false;

            if (urgency) {
                const target = maxStock > 0 ? maxStock : minStock > 0 ? minStock * 2 : safetyStock > 0 ? safetyStock * 3 : null;
                suggestedQty = target !== null ? Math.max(0, target - projectedStock) : null;

                // Já tem importação a caminho suficiente pra cobrir a meta: não precisa comprar mais,
                // mas o item continua na lista (marcado como coberto) — um relatório pra liderança não
                // pode esconder que algo está baixo só porque já tem reposição em trânsito.
                coveredByImport = hasImportActivity && target !== null && suggestedQty === 0;
            }
            // Sem urgência mas com importação em andamento: estoque está bem, mas entra na lista
            // só pra dar visibilidade de que a marca tem algo a caminho (útil ao filtrar por marca).
            const finalUrgency = urgency ?? 'OK';

            const lastPurchasePrice = p.last_purchase_price != null ? Number(p.last_purchase_price) : undefined;
            const estimatedCost = suggestedQty != null && lastPurchasePrice != null ? suggestedQty * lastPurchasePrice : null;

            suggestions.push({
                productId: rawId,
                productName: p.name || 'Produto',
                brand: p.brand || 'Sem marca',
                brandLogo: p.brand_logo || undefined,
                stockCe: Number(p.stock_ce) || 0,
                stockSc: Number(p.stock_sc) || 0,
                stockSp: Number(p.stock_sp) || 0,
                currentStock,
                reserved,
                available,
                minStock,
                maxStock,
                safetyStock,
                incomingQty,
                projectedStock,
                suggestedQty,
                coveredByImport,
                urgency: finalUrgency,
                lastPurchasePrice,
                estimatedCost,
            });
        }

        // Esgotado primeiro, depois crítico, baixo, e por último os "OK" (só em importação);
        // dentro de cada grupo, o que realmente precisa de compra vem antes do que já está coberto
        const urgencyRank: Record<PurchaseSuggestionItem['urgency'], number> = { ESGOTADO: 0, CRITICO: 1, BAIXO: 2, OK: 3 };
        suggestions.sort((a, b) => {
            const ur = urgencyRank[a.urgency] - urgencyRank[b.urgency];
            if (ur !== 0) return ur;
            const cr = Number(a.coveredByImport) - Number(b.coveredByImport);
            if (cr !== 0) return cr;
            const br = a.brand.localeCompare(b.brand);
            if (br !== 0) return br;
            return a.productName.localeCompare(b.productName);
        });

        return suggestions;
    },

    /**
     * Create a new purchase order
     */
    async createPurchaseOrder(order: Partial<PurchaseOrder>, items: Partial<PurchaseOrderItem>[]): Promise<PurchaseOrder | null> {
        if (!supabase) return null;

        // 1. Create PO header
        const { data: po, error: poError } = await supabase
            .from('purchase_orders')
            .insert([{
                order_number: `PO-${Date.now()}`,
                supplier_id: order.supplier_id,
                status: 'draft',
                total_value: items.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0),
                notes: order.notes,
                expected_delivery_date: order.expected_delivery_date
            }])
            .select()
            .single();

        if (poError || !po) {
            console.error('Error creating PO:', poError);
            return null;
        }

        // 2. Create PO items
        const poItems = items.map(item => ({
            order_id: po.id,
            product_id: item.product_id,
            product_name: item.product_name,
            brand: item.brand,
            quantity: item.quantity,
            unit_price: item.unit_price
        }));

        const { error: itemsError } = await supabase
            .from('purchase_order_items')
            .insert(poItems);

        if (itemsError) {
            console.error('Error creating PO items:', itemsError);
            return null;
        }

        return po;
    },

    /**
     * Record a partial or full receipt of items
     */
    async receiveItems(poId: string, itemReceipts: { itemId: string, productId: string, qtyReceived: number, branch: 'CE' | 'SC' | 'SP' }[]): Promise<boolean> {
        if (!supabase) return false;

        for (const receipt of itemReceipts) {
            // 1. Update PO item received quantity
            const { data: item } = await supabase
                .from('purchase_order_items')
                .select('quantity_received, quantity')
                .eq('id', receipt.itemId)
                .single();

            const newReceivedQty = (Number(item?.quantity_received) || 0) + receipt.qtyReceived;

            await supabase
                .from('purchase_order_items')
                .update({ quantity_received: newReceivedQty })
                .eq('id', receipt.itemId);

            // 2. Update Product Stock
            const { data: product } = await supabase
                .from('products')
                .select('stock_ce, stock_sc, stock_sp')
                .eq('id', receipt.productId)
                .single();

            if (product) {
                const branchKey = `stock_${receipt.branch.toLowerCase()}` as keyof typeof product;
                const newStock = Number(product[branchKey] || 0) + receipt.qtyReceived;

                const { data: poItemData } = await supabase.from('purchase_order_items').select('unit_price').eq('id', receipt.itemId).single();

                await supabase
                    .from('products')
                    .update({
                        [branchKey]: newStock,
                        last_purchase_price: poItemData?.unit_price
                    })
                    .eq('id', receipt.productId);
            }

            // 3. Log Movement
            await supabase.from('inventory_logs').insert([{
                product_id: receipt.productId,
                type: 'IN',
                quantity: receipt.qtyReceived,
                location: receipt.branch,
                reference_id: poId,
                notes: 'Recebimento de Pedido de Compra'
            }]);

            // 4. Update Price History
            const { data: po } = await supabase.from('purchase_orders').select('supplier_id').eq('id', poId).single();
            const { data: poItem } = await supabase.from('purchase_order_items').select('unit_price').eq('id', receipt.itemId).single();

            await supabase.from('price_history').insert([{
                product_id: receipt.productId,
                supplier_id: po?.supplier_id,
                price: poItem?.unit_price
            }]);
        }

        // Check if PO is fully received
        const { data: remainingItems } = await supabase
            .from('purchase_order_items')
            .select('quantity, quantity_received')
            .eq('order_id', poId);

        const isFullyReceived = remainingItems?.every((item: any) => Number(item.quantity_received) >= Number(item.quantity));

        await supabase
            .from('purchase_orders')
            .update({
                status: isFullyReceived ? 'received' : 'partial',
                received_at: isFullyReceived ? new Date().toISOString() : null
            })
            .eq('id', poId);

        return true;
    },

    /**
     * Upload an ABC Curve list from CSV and enrich with HUB images/brands
     */
    async uploadABCCurve(file: File): Promise<{ success: number; failed: number }> {
        if (!supabase) return { success: 0, failed: 0 };

        return new Promise((resolve) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: async (results: any) => {
                    let successCount = 0;
                    let failedCount = 0;

                    try {
                        // 1. Fetch available hub products for enrichment
                        const { data: hubProducts } = await supabase!
                            .from('hub_products')
                            .select('product_code, product_name, brand, image_url')
                            .eq('is_active', true);

                        const hubMap = new Map();
                        hubProducts?.forEach(hp => {
                            if (!hubMap.has(hp.product_code)) {
                                hubMap.set(hp.product_code, hp);
                            }
                        });

                        // 2. Process each row
                        for (const row of results.data) {
                            const idHeader = row['ID Produto'] || row['ID'] || row['id'];
                            if (!idHeader) {
                                failedCount++;
                                continue;
                            }

                            const nameHeader = row['Nome do Produto'] || row['Nome'] || row['name'];
                            const minStockHeader = row['Estoque Mínimo (75 dias)'] || row['Estoque Mínimo (45 dias)'] || row['min_stock'];
                            const abcHeader = row['Classe ABC'] || row['abc_category'];
                            const yearlySalesHeader = row['Quantidade (365 dias)'] || row['Vendas 1 Ano'] || row['yearly_sales'];

                            const rawId = String(idHeader).trim();
                            // Clean ID (remove .0 suffix)
                            const id = rawId.endsWith('.0') ? rawId.slice(0, -2) : rawId;
                            const name = String(nameHeader || '').trim();
                            const minStock = parseInt(String(minStockHeader || '0')) || 0;
                            const abcClass = (String(abcHeader || 'C')).trim().toUpperCase() as 'A' | 'B' | 'C';
                            const yearlySales = parseInt(String(yearlySalesHeader || '0')) || 0;

                            // Check if product exists locally
                            const { data: existing } = await supabase!
                                .from('products')
                                .select('id, brand, image_url')
                                .in('id', [id, `${id}.0`])
                                .maybeSingle();

                            // Enrichment data from HUB
                            const hubMatch = hubMap.get(id);
                            const finalBrand = existing?.brand || hubMatch?.brand || '';
                            const finalImage = existing?.image_url || hubMatch?.image_url || '';

                            const productData = {
                                id,
                                name: name || (existing ? undefined : 'Produto Sem Nome'),
                                min_stock: minStock,
                                abc_category: abcClass,
                                brand: finalBrand,
                                image_url: finalImage,
                                yearly_sales: yearlySales,
                                updated_at: new Date().toISOString()
                            };

                            // Upsert
                            const { error: upsertError } = await supabase!
                                .from('products')
                                .upsert(productData, { onConflict: 'id' });

                            if (upsertError) {
                                console.error(`Error upserting product ${id}:`, upsertError);
                                failedCount++;
                            } else {
                                successCount++;
                            }
                        }
                        resolve({ success: successCount, failed: failedCount });
                    } catch (error) {
                        console.error("Error processing ABC upload:", error);
                        resolve({ success: successCount, failed: failedCount });
                    }
                }
            });
        });
    }
};
