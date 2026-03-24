import { supabase } from '../lib/supabase';
import { PurchaseOrder, PurchaseOrderItem } from '../types';
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
