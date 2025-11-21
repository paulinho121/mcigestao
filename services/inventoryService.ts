import { supabase } from '../lib/supabase';
import { Product, Reservation } from '../types';
import { MOCK_INVENTORY } from './mockData';

// In-memory reservation storage
let reservations: Reservation[] = [];


export const inventoryService = {
  /**
   * Search for products by Code (id) or Name
   */
  async searchProducts(query: string): Promise<Product[]> {
    // Simulate network delay for realism
    await new Promise(resolve => setTimeout(resolve, 400));

    const cleanQuery = query.toLowerCase().trim();

    if (!supabase) {
      // Fallback to Mock Data if Supabase isn't configured
      const filteredInventory = MOCK_INVENTORY.filter(item => !item.id.endsWith('.0'));

      if (!cleanQuery) return filteredInventory;

      return filteredInventory.filter(item =>
        item.id.toLowerCase().includes(cleanQuery) ||
        item.name.toLowerCase().includes(cleanQuery) ||
        item.brand.toLowerCase().includes(cleanQuery)
      );
    }

    // Real Supabase Implementation
    // Assumes table 'products' with columns matching Product interface
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .not('id', 'like', '%.0')
      .or(`id.ilike.%${cleanQuery}%,name.ilike.%${cleanQuery}%,brand.ilike.%${cleanQuery}%`)
      .limit(50);

    if (error) {
      console.error('Supabase error:', error);
      return [];
    }

    return data.map((p: any) => ({
      ...p,
      importQuantity: p.import_quantity,
      expectedRestockDate: p.expected_restock_date
    })) as Product[];
  },

  /**
   * Fetch all products (with limit)
   */
  async getAllProducts(limit = 50): Promise<Product[]> {
    if (!supabase) {
      return MOCK_INVENTORY.filter(item => !item.id.endsWith('.0')).slice(0, limit);
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .not('id', 'like', '%.0')
      .limit(limit);

    if (error) {
      console.error('Supabase error:', error);
      return [];
    }

    return data.map((p: any) => ({
      ...p,
      importQuantity: p.import_quantity,
      expectedRestockDate: p.expected_restock_date
    })) as Product[];
  },

  /**
   * Reserve a product
   */
  async reserveProduct(productId: string, quantity: number, reservedBy: string, branch: 'CE' | 'SC' | 'SP', reservedByName?: string): Promise<Reservation | null> {
    if (!supabase) {
      // Mock fallback
      await new Promise(resolve => setTimeout(resolve, 300));
      const product = MOCK_INVENTORY.find(p => p.id === productId);
      if (!product) throw new Error('Produto não encontrado');

      const branchKey = `stock_${branch.toLowerCase()}` as 'stock_ce' | 'stock_sc' | 'stock_sp';
      if (quantity > product[branchKey]) throw new Error(`Estoque insuficiente na filial ${branch}`);

      const reservation: Reservation = {
        id: Date.now().toString(),
        productId: product.id,
        productName: product.name,
        productBrand: product.brand,
        quantity,
        branch,
        reservedBy,
        reservedByName,
        reservedAt: new Date()
      };
      reservations.push(reservation);
      product.reserved += quantity;
      product[branchKey] -= quantity;
      product.total = product.stock_ce + product.stock_sc + product.stock_sp;
      return reservation;
    }

    // Real Supabase implementation
    // 1. Get current product data to check stock
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError || !product) throw new Error('Produto não encontrado');

    const branchColumn = `stock_${branch.toLowerCase()}`;
    const currentStock = product[branchColumn];

    if (quantity > currentStock) {
      throw new Error(`Estoque insuficiente na filial ${branch}. Disponível: ${currentStock}`);
    }

    // 2. Create reservation
    const { data: reservationData, error: reservationError } = await supabase
      .from('reservations')
      .insert({
        product_id: productId,
        product_name: product.name,
        product_brand: product.brand,
        quantity,
        branch,
        reserved_by: reservedBy,
        reserved_by_name: reservedByName,
        status: 'active'
      })
      .select()
      .single();

    if (reservationError) throw new Error(`Erro ao criar reserva: ${reservationError.message}`);

    // 3. Update product stock
    const newStock = currentStock - quantity;
    const newReserved = (product.reserved || 0) + quantity;

    // We need to recalculate total accurately based on all branches
    // ideally we update the specific branch column
    const updateData: any = {
      reserved: newReserved,
      [branchColumn]: newStock
    };

    const { error: updateError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId);

    if (updateError) {
      // Rollback reservation if stock update fails (manual rollback)
      await supabase.from('reservations').delete().eq('id', reservationData.id);
      throw new Error(`Erro ao atualizar estoque: ${updateError.message}`);
    }

    return {
      id: reservationData.id,
      productId: reservationData.product_id,
      productName: reservationData.product_name,
      productBrand: reservationData.product_brand,
      quantity: reservationData.quantity,
      branch: reservationData.branch,
      reservedBy: reservationData.reserved_by,
      reservedByName: reservationData.reserved_by_name,
      reservedAt: new Date(reservationData.reserved_at)
    };
  },

  /**
   * Get all reservations
   */
  async getReservations(): Promise<Reservation[]> {
    if (!supabase) return [...reservations];

    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .order('reserved_at', { ascending: false });

    if (error) {
      console.error('Error fetching reservations:', error);
      return [];
    }

    return data.map(r => ({
      id: r.id,
      productId: r.product_id,
      productName: r.product_name,
      productBrand: r.product_brand,
      quantity: r.quantity,
      branch: r.branch as 'CE' | 'SC' | 'SP',
      reservedBy: r.reserved_by,
      reservedByName: r.reserved_by_name,
      reservedAt: new Date(r.reserved_at)
    }));
  },

  /**
   * Cancel a reservation
   */
  async cancelReservation(reservationId: string): Promise<boolean> {
    if (!supabase) {
      // Mock fallback
      await new Promise(resolve => setTimeout(resolve, 300));
      const index = reservations.findIndex(r => r.id === reservationId);
      if (index === -1) return false;
      const r = reservations[index];
      const p = MOCK_INVENTORY.find(prod => prod.id === r.productId);
      if (p) {
        p.reserved -= r.quantity;
        if (r.branch) {
          const key = `stock_${r.branch.toLowerCase()}` as 'stock_ce' | 'stock_sc' | 'stock_sp';
          p[key] += r.quantity;
          p.total = p.stock_ce + p.stock_sc + p.stock_sp;
        }
      }
      reservations.splice(index, 1);
      return true;
    }

    // Real Supabase implementation
    // 1. Get reservation details
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single();

    if (fetchError || !reservation) return false;

    // 2. Get product details
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', reservation.product_id)
      .single();

    if (product) {
      // 3. Restore stock
      const branchColumn = `stock_${reservation.branch.toLowerCase()}`;
      const newStock = product[branchColumn] + reservation.quantity;
      const newReserved = Math.max(0, (product.reserved || 0) - reservation.quantity);

      await supabase
        .from('products')
        .update({
          [branchColumn]: newStock,
          reserved: newReserved
        })
        .eq('id', reservation.product_id);
    }

    // 4. Delete reservation
    const { error: deleteError } = await supabase
      .from('reservations')
      .delete()
      .eq('id', reservationId);

    return !deleteError;
  },

  /**
   * Upload products to Supabase database
   */
  async uploadProducts(products: Product[]): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!supabase) {
      // Mock mode: Update MOCK_INVENTORY
      console.warn('Supabase not configured. Running in mock mode.');

      // Clear existing mock data and replace with new data
      MOCK_INVENTORY.length = 0;
      MOCK_INVENTORY.push(...products);

      console.log(`Mock upload: ${products.length} products loaded into memory`);
      return;
    }

    // Real Supabase Implementation
    try {
      // 1. Fetch existing products to preserve enrichment data
      const { data: existingProducts, error: fetchError } = await supabase
        .from('products')
        .select('id, reserved, import_quantity, expected_restock_date, observations');

      if (fetchError) {
        throw new Error(`Erro ao buscar produtos existentes: ${fetchError.message}`);
      }

      // 2. Fetch active reservations to subtract from physical stock
      const { data: activeReservations, error: reservationError } = await supabase
        .from('reservations')
        .select('product_id, branch, quantity')
        .eq('status', 'active');

      if (reservationError) {
        throw new Error(`Erro ao buscar reservas ativas: ${reservationError.message}`);
      }

      // Aggregate reservations by product and branch
      const reservationMap = new Map<string, { CE: number, SC: number, SP: number, total: number }>();

      activeReservations?.forEach(r => {
        if (!reservationMap.has(r.product_id)) {
          reservationMap.set(r.product_id, { CE: 0, SC: 0, SP: 0, total: 0 });
        }
        const entry = reservationMap.get(r.product_id)!;
        if (r.branch === 'CE') entry.CE += r.quantity;
        if (r.branch === 'SC') entry.SC += r.quantity;
        if (r.branch === 'SP') entry.SP += r.quantity;
        entry.total += r.quantity;
      });

      // Create a map for quick lookup of existing products
      const existingMap = new Map(existingProducts?.map(p => [p.id, p]) || []);

      // 3. Map products to match database schema
      const dbProducts = products.map(p => {
        const existing = existingMap.get(p.id);
        const reservations = reservationMap.get(p.id) || { CE: 0, SC: 0, SP: 0, total: 0 };

        // Calculate available stock (Physical from CSV - Reserved)
        // Ensure we don't go below zero if reservations > physical (which shouldn't happen but safety first)
        const stock_ce = Math.max(0, p.stock_ce - reservations.CE);
        const stock_sc = Math.max(0, p.stock_sc - reservations.SC);
        const stock_sp = Math.max(0, p.stock_sp - reservations.SP);
        const total = stock_ce + stock_sc + stock_sp;

        return {
          id: p.id,
          name: p.name,
          brand: p.brand,
          stock_ce,
          stock_sc,
          stock_sp,
          total,
          // Preserve existing data
          reserved: reservations.total, // Use the calculated total from active reservations to be accurate
          import_quantity: existing?.import_quantity ?? p.importQuantity,
          expected_restock_date: existing?.expected_restock_date ?? p.expectedRestockDate,
          observations: existing?.observations ?? p.observations
        };
      });

      // 4. Upsert (Insert or Update) products
      const { error: upsertError } = await supabase
        .from('products')
        .upsert(dbProducts, { onConflict: 'id' });

      if (upsertError) {
        throw new Error(`Erro ao atualizar produtos: ${upsertError.message}`);
      }

      console.log(`Successfully uploaded/updated ${products.length} products to Supabase`);
    } catch (error: any) {
      console.error('Upload error:', error);
      throw error;
    }
  },

  /**
   * Update import information for products
   */
  async updateImportInfo(products: Product[]): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!supabase) {
      // Mock mode: Update MOCK_INVENTORY
      console.warn('Supabase not configured. Updating mock data.');

      products.forEach(updatedProduct => {
        const index = MOCK_INVENTORY.findIndex(p => p.id === updatedProduct.id);
        if (index !== -1) {
          MOCK_INVENTORY[index] = { ...MOCK_INVENTORY[index], ...updatedProduct };
        }
      });

      console.log(`Mock update: ${products.length} products updated`);
      return;
    }

    // Real Supabase Implementation
    try {
      // Update each product
      for (const product of products) {
        const { error } = await supabase
          .from('products')
          .update({
            import_quantity: product.importQuantity,
            expected_restock_date: product.expectedRestockDate
          })
          .eq('id', product.id);

        if (error) {
          throw new Error(`Erro ao atualizar produto ${product.id}: ${error.message}`);
        }
      }

      console.log(`Successfully updated ${products.length} products in Supabase`);
    } catch (error: any) {
      console.error('Update error:', error);
      throw error;
    }
  },

  /**
   * Adjust stock quantities for a product
   */
  async adjustStock(productId: string, adjustments: { ce: number; sc: number; sp: number }): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!supabase) {
      // Mock mode: Update MOCK_INVENTORY
      console.warn('Supabase not configured. Updating mock data.');

      const product = MOCK_INVENTORY.find(p => p.id === productId);
      if (product) {
        product.stock_ce = Math.max(0, product.stock_ce + adjustments.ce);
        product.stock_sc = Math.max(0, product.stock_sc + adjustments.sc);
        product.stock_sp = Math.max(0, product.stock_sp + adjustments.sp);
        product.total = product.stock_ce + product.stock_sc + product.stock_sp;
      }

      console.log(`Mock update: Stock adjusted for product ${productId}`);
      return;
    }

    // Real Supabase Implementation
    try {
      // First, get current stock
      const { data: currentProduct, error: fetchError } = await supabase
        .from('products')
        .select('stock_ce, stock_sc, stock_sp')
        .eq('id', productId)
        .single();

      if (fetchError) {
        throw new Error(`Erro ao buscar produto ${productId}: ${fetchError.message}`);
      }

      // Calculate new stock values
      const newStockCe = Math.max(0, currentProduct.stock_ce + adjustments.ce);
      const newStockSc = Math.max(0, currentProduct.stock_sc + adjustments.sc);
      const newStockSp = Math.max(0, currentProduct.stock_sp + adjustments.sp);
      const newTotal = newStockCe + newStockSc + newStockSp;

      // Update stock
      const { error: updateError } = await supabase
        .from('products')
        .update({
          stock_ce: newStockCe,
          stock_sc: newStockSc,
          stock_sp: newStockSp,
          total: newTotal
        })
        .eq('id', productId);

      if (updateError) {
        throw new Error(`Erro ao ajustar estoque do produto ${productId}: ${updateError.message}`);
      }

      console.log(`Successfully adjusted stock for product ${productId}`);
    } catch (error: any) {
      console.error('Stock adjustment error:', error);
      throw error;
    }
  },

  /**
   * Update observations for a product
   */
  async updateObservations(productId: string, observations: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!supabase) {
      // Mock mode: Update MOCK_INVENTORY
      console.warn('Supabase not configured. Updating mock data.');

      const product = MOCK_INVENTORY.find(p => p.id === productId);
      if (product) {
        product.observations = observations;
      }

      console.log(`Mock update: Observations updated for product ${productId}`);
      return;
    }

    // Real Supabase Implementation
    try {
      const { error } = await supabase
        .from('products')
        .update({ observations })
        .eq('id', productId);

      if (error) {
        throw new Error(`Erro ao atualizar observações do produto ${productId}: ${error.message}`);
      }

      console.log(`Successfully updated observations for product ${productId}`);
    } catch (error: any) {
      console.error('Observations update error:', error);
      throw error;
    }
  }
};