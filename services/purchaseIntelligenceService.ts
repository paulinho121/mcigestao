import { supabase } from '../lib/supabase';
import { Product, PurchaseOrder, PurchaseOrderItem } from '../types';

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
    }
};
