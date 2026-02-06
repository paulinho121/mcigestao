import { supabase } from '../lib/supabase';
import { Product, Reservation, ImportProject, ImportItem } from '../types';
import { MOCK_INVENTORY } from './mockData';
import { logService } from './logService';

// In-memory reservation storage
let reservations: Reservation[] = [];

// Helper to clean IDs (remove .0 suffix) and deduplicate
const cleanAndDeduplicate = (items: any[]): Product[] => {
  const map = new Map<string, Product>();

  for (const item of items) {
    // Remove .0 suffix if present
    const cleanId = item.id.endsWith('.0') ? item.id.slice(0, -2) : item.id;
    const existing = map.get(cleanId);

    const stock_ce = Number(item.stock_ce || 0);
    const stock_sc = Number(item.stock_sc || 0);
    const stock_sp = Number(item.stock_sp || 0);
    const reserved = Number(item.reserved || 0);

    if (existing) {
      // If product already exists in map, sum the stocks
      existing.stock_ce += stock_ce;
      existing.stock_sc += stock_sc;
      existing.stock_sp += stock_sp;
      existing.reserved += reserved;
      // Recalculate total to ensure consistency
      existing.total = existing.stock_ce + existing.stock_sc + existing.stock_sp;
    } else {
      // If new, create entry
      map.set(cleanId, {
        ...item,
        id: cleanId,
        stock_ce,
        stock_sc,
        stock_sp,
        reserved,
        // Always calculate total from branch stocks for accuracy
        total: stock_ce + stock_sc + stock_sp,
        image_url: item.image_url ?? item.imageUrl,
        importQuantity: item.import_quantity ?? item.importQuantity,
        expectedRestockDate: item.expected_restock_date ?? item.expectedRestockDate
      });
    }
  }
  return Array.from(map.values());
};

export const inventoryService = {
  /**
   * Search for products by Code (id) or Name
   */
  async searchProducts(query: string): Promise<Product[]> {
    // Simulate network delay for realism
    await new Promise(resolve => setTimeout(resolve, 400));

    const cleanQuery = query.toLowerCase().trim();
    // Helper to remove punctuation for mock search
    const normalize = (str: string) => str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    const normalizedQuery = normalize(query);

    if (!supabase) {
      // Fallback to Mock Data if Supabase isn't configured
      // We don't filter .0 here anymore, we let cleanAndDeduplicate handle it
      const filteredInventory = cleanAndDeduplicate(MOCK_INVENTORY);

      if (!cleanQuery) {
        // Sort by total descending
        return filteredInventory.sort((a, b) => (b.total || 0) - (a.total || 0));
      }

      const results = filteredInventory.filter(item =>
        normalize(item.id).includes(normalizedQuery) ||
        normalize(item.name).includes(normalizedQuery) ||
        normalize(item.brand).includes(normalizedQuery)
      );

      // Sort results by total descending
      return results.sort((a, b) => (b.total || 0) - (a.total || 0));
    }

    // Real Supabase Implementation
    // We use standard search now to ensure we catch items that might only exist as .0
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`id.ilike.%${cleanQuery}%,name.ilike.%${cleanQuery}%,brand.ilike.%${cleanQuery}%`)
      .order('total', { ascending: false }) // Sort by quantity descending
      .limit(100); // Increased limit to reduce chance of missing items due to duplicates

    if (error) {
      console.error('Supabase error:', error);
      return [];
    }

    return cleanAndDeduplicate(data || []);
  },

  /**
   * Fetch all products (with limit)
   */
  async getAllProducts(limit = 100): Promise<Product[]> {
    if (!supabase) {
      // Sort mock data by total descending
      const sortedMock = [...MOCK_INVENTORY].sort((a, b) => (b.total || 0) - (a.total || 0));
      return cleanAndDeduplicate(sortedMock).slice(0, limit);
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('total', { ascending: false }) // Sort by quantity descending
      .limit(limit);

    if (error) {
      console.error('Supabase error:', error);
      return [];
    }

    return cleanAndDeduplicate(data || []);
  },

  /**
   * Fetch a single product by ID
   */
  async getProductById(id: string): Promise<Product | null> {
    if (!supabase) {
      const product = MOCK_INVENTORY.find(p => p.id === id || p.id === `${id}.0`);
      return product ? cleanAndDeduplicate([product])[0] : null;
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('id', [id, `${id}.0`])
      .maybeSingle();

    if (error) {
      console.error('Supabase error:', error);
      return null;
    }

    return data ? cleanAndDeduplicate([data])[0] : null;
  },


  /**
   * Get all products that have stock in a specific branch
   */
  async getProductsByBranch(branch: 'CE' | 'SC' | 'SP', limit = 200): Promise<Product[]> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const branchKey = `stock_${branch.toLowerCase()}` as 'stock_ce' | 'stock_sc' | 'stock_sp';

    if (!supabase) {
      // Mock mode: filter products with stock in the specified branch
      const productsWithStock = cleanAndDeduplicate(MOCK_INVENTORY)
        .filter(product => product[branchKey] > 0)
        .sort((a, b) => b[branchKey] - a[branchKey]); // Sort by branch stock descending

      return productsWithStock.slice(0, limit);
    }

    // Real Supabase Implementation
    const branchColumn = `stock_${branch.toLowerCase()}`;

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .gt(branchColumn, 0) // Only products with stock > 0 in this branch
      .order(branchColumn, { ascending: false }) // Sort by branch stock descending
      .limit(limit);

    if (error) {
      console.error('Supabase error:', error);
      return [];
    }

    return cleanAndDeduplicate(data || []);
  },

  /**
   * Get all distinct brands from the database
   */
  async getBrands(): Promise<string[]> {
    if (!supabase) {
      const distinctBrands = new Set(MOCK_INVENTORY.map(p => p.brand).filter(Boolean));
      return Array.from(distinctBrands).sort();
    }

    const { data, error } = await supabase
      .from('products')
      .select('brand')
      .not('brand', 'is', null)
      .not('brand', 'eq', '');

    if (error) {
      console.error('Error fetching brands:', error);
      return [];
    }

    const brands = Array.from(new Set(data.map((item: any) => item.brand))).sort();
    return brands;
  },

  /**
   * Get all products of a specific brand
   */
  async getProductsByBrand(brand: string): Promise<Product[]> {
    if (!supabase) {
      const results = cleanAndDeduplicate(MOCK_INVENTORY).filter(p => p.brand === brand);
      return results;
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('brand', brand);

    if (error) {
      console.error('Error fetching products by brand:', error);
      return [];
    }

    return cleanAndDeduplicate(data || []);
  },

  /**
   * Get all products of multiple brands
   */
  async getProductsByBrands(brands: string[]): Promise<Product[]> {
    if (!supabase) {
      const results = cleanAndDeduplicate(MOCK_INVENTORY).filter(p => brands.includes(p.brand));
      return results;
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('brand', brands);

    if (error) {
      console.error('Error fetching products by brands:', error);
      return [];
    }

    return cleanAndDeduplicate(data || []);
  },


  /**
   * Get total available items (sum of total stock across all products)
   */
  async getTotalAvailable(): Promise<number> {
    if (!supabase) {
      // Mock mode
      return cleanAndDeduplicate(MOCK_INVENTORY)
        .reduce((sum, item) => sum + (item.total || 0), 0);
    }
    const { data, error } = await supabase
      .from('products')
      .select('id, total');

    if (error) {
      console.error('Supabase error fetching total available:', error);
      return 0;
    }

    // We clean and deduplicate to avoid double counting if both 123 and 123.0 exist
    // and to include 123.0 if it's the only one.
    return cleanAndDeduplicate(data as any[])
      .reduce((sum, row) => sum + (row.total || 0), 0);
  },

  /**
   * Get top searched items based on reservation count.
   * Returns array of { productId, productName, count } sorted descending.
   */
  async getTopSearched(limit = 5): Promise<Array<{ productId: string; productName: string; count: number }>> {
    if (!supabase) {
      // Mock mode: aggregate in-memory reservations
      const countMap: Record<string, number> = {};
      reservations.forEach(r => {
        // Clean ID for aggregation
        const cleanId = r.productId.endsWith('.0') ? r.productId.slice(0, -2) : r.productId;
        countMap[cleanId] = (countMap[cleanId] || 0) + 1;
      });

      const entries = Object.entries(countMap)
        .map(([productId, count]) => {
          const prod = MOCK_INVENTORY.find(p => p.id === productId || p.id === `${productId}.0`);
          return { productId, productName: prod?.name || productId, count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
      return entries;
    }

    // Real Supabase: fetch reservations and aggregate client-side
    const { data, error } = await supabase
      .from('reservations')
      .select('product_id, product_name')
      .order('reserved_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching reservations for top search:', error);
      return [];
    }

    const countMap: Record<string, { name: string; count: number }> = {};
    (data as any[]).forEach(r => {
      // Clean ID for aggregation
      const pid = r.product_id.endsWith('.0') ? r.product_id.slice(0, -2) : r.product_id;

      if (!countMap[pid]) {
        countMap[pid] = { name: r.product_name, count: 0 };
      }
      countMap[pid].count += 1;
    });

    const entries = Object.entries(countMap)
      .map(([productId, { name, count }]) => ({ productId, productName: name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
    return entries;
  },

  /** Reserve a product */
  async reserveProduct(
    productId: string,
    quantity: number,
    reservedBy: string,
    branch: 'CE' | 'SC' | 'SP',
    reservedByName?: string
  ): Promise<Reservation | null> {
    if (!supabase) {
      // Mock fallback
      await new Promise(resolve => setTimeout(resolve, 300));
      // Try finding exact match or match with .0
      let product = MOCK_INVENTORY.find(p => p.id === productId);
      if (!product) {
        product = MOCK_INVENTORY.find(p => p.id === `${productId}.0`);
      }

      if (!product) throw new Error('Produto não encontrado');

      const branchKey = `stock_${branch.toLowerCase()}` as 'stock_ce' | 'stock_sc' | 'stock_sp';
      if (quantity > product[branchKey]) throw new Error(`Estoque insuficiente na filial ${branch}`);

      const reservation: Reservation = {
        id: Date.now().toString(),
        productId: product.id, // Use actual ID
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
    // Try exact ID first
    let { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    // If not found, try with .0 suffix
    if (!product) {
      const { data: productWithSuffix } = await supabase
        .from('products')
        .select('*')
        .eq('id', `${productId}.0`)
        .single();

      if (productWithSuffix) {
        product = productWithSuffix;
      } else {
        throw new Error('Produto não encontrado');
      }
    }

    const branchColumn = `stock_${branch.toLowerCase()}`;
    const currentStock = product[branchColumn];
    if (quantity > currentStock) {
      throw new Error(`Estoque insuficiente na filial ${branch}. Disponível: ${currentStock}`);
    }

    // 2. Create reservation with 7-day expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: reservationData, error: reservationError } = await supabase
      .from('reservations')
      .insert({
        product_id: product.id, // Use the REAL database ID
        product_name: product.name,
        product_brand: product.brand,
        quantity,
        branch,
        reserved_by: reservedBy,
        reserved_by_name: reservedByName,
        status: 'active',
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (reservationError) throw new Error(`Erro ao criar reserva: ${reservationError.message}`);

    // 3. Update product stock
    const newStock = currentStock - quantity;
    const newReserved = (product.reserved || 0) + quantity;

    // Calculate new total
    const stock_ce = branch === 'CE' ? newStock : product.stock_ce;
    const stock_sc = branch === 'SC' ? newStock : product.stock_sc;
    const stock_sp = branch === 'SP' ? newStock : product.stock_sp;
    const newTotal = stock_ce + stock_sc + stock_sp;

    const updateData: any = {
      reserved: newReserved,
      [branchColumn]: newStock,
      total: newTotal // Update total!
    };

    const { error: updateError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', product.id);

    if (updateError) {
      // Rollback reservation if stock update fails
      await supabase.from('reservations').delete().eq('id', reservationData.id);
      throw new Error(`Erro ao atualizar estoque: ${updateError.message}`);
    }

    const result = {
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

    // Log reservation creation
    await logService.logReservationCreated({
      id: result.id,
      product_code: result.productId,
      quantity: result.quantity,
      branch: result.branch,
      reserved_by_name: result.reservedByName || result.reservedBy
    });

    return result;
  },

  /**
   * Get all reservations
   */
  async getReservations(): Promise<Reservation[]> {
    if (!supabase) return [...reservations];

    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
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
   * Get reservations for a specific product
   */
  async getReservationsByProduct(productId: string): Promise<Reservation[]> {
    if (!supabase) {
      return reservations.filter(r =>
        r.productId === productId || r.productId === `${productId}.0`
      );
    }

    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .or(`product_id.eq.${productId},product_id.eq.${productId}.0`)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('reserved_at', { ascending: false });

    if (error) {
      console.error('Error fetching reservations for product:', error);
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

      // Try finding product with or without .0
      let p = MOCK_INVENTORY.find(prod => prod.id === r.productId);
      if (!p) p = MOCK_INVENTORY.find(prod => prod.id === `${r.productId}.0`);

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

      // Calculate new total
      const stock_ce = reservation.branch === 'CE' ? newStock : product.stock_ce;
      const stock_sc = reservation.branch === 'SC' ? newStock : product.stock_sc;
      const stock_sp = reservation.branch === 'SP' ? newStock : product.stock_sp;
      const newTotal = stock_ce + stock_sc + stock_sp;

      await supabase
        .from('products')
        .update({
          [branchColumn]: newStock,
          reserved: newReserved,
          total: newTotal // Update total!
        })
        .eq('id', reservation.product_id);
    }

    // 4. Delete reservation
    const { error: deleteError } = await supabase
      .from('reservations')
      .delete()
      .eq('id', reservationId);

    if (!deleteError) {
      // Log reservation cancellation
      await logService.logReservationCancelled({
        id: reservation.id,
        product_code: reservation.product_id,
        quantity: reservation.quantity,
        branch: reservation.branch
      });
      return true;
    }
    return false;
  },

  /**
   * Upload products to Supabase database
   */
  async uploadProducts(products: Product[]): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));

    // Sanitize and Deduplicate Products BEFORE anything else
    // This ensures we don't upload "123.0" if "123" is intended, and we merge duplicates
    const cleanMap = new Map<string, Product>();

    products.forEach(p => {
      // Remove .0 suffix from ID
      const cleanId = p.id.endsWith('.0') ? p.id.slice(0, -2) : p.id;

      // If we already have this ID, we might want to merge or just overwrite.
      // For simplicity in this context, we'll overwrite, but in a real CSV upload 
      // usually the last entry wins or they should be summed. 
      // Here we assume the CSV is the source of truth for stock.
      cleanMap.set(cleanId, { ...p, id: cleanId });
    });

    const cleanProducts = Array.from(cleanMap.values());

    if (!supabase) {
      // Mock mode: Update MOCK_INVENTORY
      console.warn('Supabase not configured. Running in mock mode.');

      // Clear existing mock data and replace with new data
      MOCK_INVENTORY.length = 0;
      MOCK_INVENTORY.push(...cleanProducts);

      console.log(`Mock upload: ${cleanProducts.length} products loaded into memory`);
      return;
    }

    // Real Supabase Implementation
    try {
      // 1. Fetch existing products to preserve enrichment data
      const { data: existingProducts, error: fetchError } = await supabase
        .from('products')
        .select('id, reserved, import_quantity, expected_restock_date, observations, image_url');

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
        // Handle .0 in reservations too just in case
        const cleanResId = r.product_id.endsWith('.0') ? r.product_id.slice(0, -2) : r.product_id;

        if (!reservationMap.has(cleanResId)) {
          reservationMap.set(cleanResId, { CE: 0, SC: 0, SP: 0, total: 0 });
        }
        const entry = reservationMap.get(cleanResId)!;
        if (r.branch === 'CE') entry.CE += r.quantity;
        if (r.branch === 'SC') entry.SC += r.quantity;
        if (r.branch === 'SP') entry.SP += r.quantity;
        entry.total += r.quantity;
      });

      // Create a map for quick lookup of existing products
      const existingMap = new Map(existingProducts?.map(p => [p.id, p]) || []);

      // 3. Map products to match database schema
      const dbProducts = cleanProducts.map(p => {
        const existing = existingMap.get(p.id);
        const reservations = reservationMap.get(p.id) || { CE: 0, SC: 0, SP: 0, total: 0 };

        // Calculate available stock (Physical from CSV - Reserved)
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
          image_url: existing?.image_url ?? p.image_url,
          // Preserve existing data
          reserved: reservations.total,
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

      console.log(`Successfully uploaded/updated ${cleanProducts.length} products to Supabase`);
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
        .select('name, stock_ce, stock_sc, stock_sp')
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

      // Log stock adjustment per branch
      if (adjustments.ce !== 0) {
        await logService.logStockAdjustment(productId, currentProduct.name || 'Produto', 'CE', currentProduct.stock_ce, newStockCe, 'Ajuste Manual/Upload');
      }
      if (adjustments.sc !== 0) {
        await logService.logStockAdjustment(productId, currentProduct.name || 'Produto', 'SC', currentProduct.stock_sc, newStockSc, 'Ajuste Manual/Upload');
      }
      if (adjustments.sp !== 0) {
        await logService.logStockAdjustment(productId, currentProduct.name || 'Produto', 'SP', currentProduct.stock_sp, newStockSp, 'Ajuste Manual/Upload');
      }
    } catch (error: any) {
      console.error('Stock adjustment error:', error);
      throw error;
    }
  },

  /**
   * Check if a product exists in the database
   */
  async checkProductExists(productId: string): Promise<boolean> {
    if (!supabase) {
      // Mock mode
      return MOCK_INVENTORY.some(p => p.id === productId);
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('id')
        .eq('id', productId)
        .single();

      if (error) {
        // If error is "not found", return false
        if (error.code === 'PGRST116') {
          return false;
        }
        throw error;
      }

      return !!data;
    } catch (error: any) {
      console.error('Error checking product existence:', error);
      return false;
    }
  },

  /**
   * Bulk update product brands
   */
  async updateProductsBrand(productIds: string[], brand: string, brandLogo?: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!supabase) {
      // Mock mode
      console.warn('Supabase not configured. Updating mock data.');
      productIds.forEach(id => {
        const product = MOCK_INVENTORY.find(p => p.id === id || p.id === `${id}.0`);
        if (product) {
          product.brand = brand;
          if (brandLogo !== undefined) product.brand_logo = brandLogo;
        }
      });
      return;
    }

    // Real Supabase Implementation
    try {
      const updateData: any = { brand };
      if (brandLogo !== undefined) updateData.brand_logo = brandLogo;

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .in('id', productIds);

      if (error) {
        throw new Error(`Erro ao atualizar marcas: ${error.message}`);
      }

      console.log(`Successfully updated brand for ${productIds.length} products`);
    } catch (error: any) {
      console.error('Update brand error:', error);
      throw error;
    }
  },

  /**
   * Create a new product from XML data
   * Used when uploading XML files with products that don't exist in the database
   */
  async createProductFromXml(
    productId: string,
    productName: string,
    productBrand: string = 'Sem Marca'
  ): Promise<Product> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const newProduct: Product = {
      id: productId,
      name: productName,
      brand: productBrand,
      stock_ce: 0,
      stock_sc: 0,
      stock_sp: 0,
      total: 0,
      reserved: 0
    };

    if (!supabase) {
      // Mock mode: Add to MOCK_INVENTORY
      console.warn('Supabase not configured. Adding to mock data.');
      MOCK_INVENTORY.push(newProduct);
      console.log(`Mock: Created product ${productId}`);
      return newProduct;
    }

    // Real Supabase Implementation
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          id: productId,
          name: productName,
          brand: productBrand,
          stock_ce: 0,
          stock_sc: 0,
          stock_sp: 0,
          total: 0,
          reserved: 0
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao criar produto ${productId}: ${error.message}`);
      }

      console.log(`Successfully created product ${productId}`);

      const createdProduct = cleanAndDeduplicate([data])[0];

      // Log product creation
      await logService.logProductCreated({
        code: createdProduct.id,
        name: createdProduct.name,
        brand: createdProduct.brand,
        category: 'XML Auto-Create'
      });

      return createdProduct;
    } catch (error: any) {
      console.error('Product creation error:', error);
      throw error;
    }
  },


  /**
   * Update the name (description) of a product
   */
  async updateProductName(productId: string, name: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!supabase) {
      // Mock mode: Update MOCK_INVENTORY
      console.warn('Supabase not configured. Updating mock data.');

      const product = MOCK_INVENTORY.find(p => p.id === productId);
      if (product) {
        product.name = name;
      }

      console.log(`Mock update: Name updated for product ${productId}`);
      return;
    }

    // Real Supabase Implementation
    try {
      const { error } = await supabase
        .from('products')
        .update({ name })
        .eq('id', productId);

      if (error) {
        throw new Error(`Erro ao atualizar nome do produto ${productId}: ${error.message}`);
      }

      console.log(`Successfully updated name for product ${productId}`);
    } catch (error: any) {
      console.error('Name update error:', error);
      throw error;
    }
  },

  /**
   * Update the image URL of a product
   */
  async updateProductImage(productId: string, imageUrl: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!supabase) {
      // Mock mode
      console.warn('Supabase not configured. Updating mock data.');
      const product = MOCK_INVENTORY.find(p => p.id === productId);
      if (product) {
        product.image_url = imageUrl;
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({ image_url: imageUrl })
        .eq('id', productId);

      if (error) {
        throw new Error(`Erro ao atualizar imagem do produto ${productId}: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Image update error:', error);
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
  },

  /**
   * Cleanup expired reservations (calls SQL function)
   */
  async cleanupExpiredReservations(): Promise<number> {
    if (!supabase) {
      // Mock mode: filter and remove expired reservations
      const now = new Date();
      const expiredReservations = reservations.filter(r => {
        const expiresAt = new Date(r.reservedAt);
        expiresAt.setDate(expiresAt.getDate() + 7);
        return expiresAt < now;
      });

      // Cancel each expired reservation
      for (const r of expiredReservations) {
        await this.cancelReservation(r.id);
      }

      return expiredReservations.length;
    }

    // Real Supabase: Call the cleanup function
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_reservations');

      if (error) {
        console.error('Error cleaning up expired reservations:', error);
        return 0;
      }

      console.log(`Cleaned up ${data || 0} expired reservations`);
      return data || 0;
    } catch (error: any) {
      console.error('Cleanup error:', error);
      return 0;
    }
  },

  /**
   * Create a new Import Project
   */
  async createImportProject(manufacturer: string, importNumber: string): Promise<ImportProject | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('import_projects')
      .insert({ manufacturer, import_number: importNumber })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      manufacturer: data.manufacturer,
      importNumber: data.import_number,
      status: data.status,
      createdAt: data.created_at
    };
  },

  /**
   * Get all Import Projects
   */
  async getImportProjects(): Promise<ImportProject[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('import_projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }

    return data.map((p: any) => ({
      id: p.id,
      manufacturer: p.manufacturer,
      importNumber: p.import_number,
      status: p.status,
      createdAt: p.created_at
    }));
  },

  /**
   * Add item to Import Project
   */
  async addImportItem(projectId: string, productId: string, quantity: number, expectedDate?: string, observation?: string): Promise<ImportItem | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('import_items')
      .insert({
        project_id: projectId,
        product_id: productId,
        quantity,
        expected_date: expectedDate,
        observation: observation
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Fetch product details
    const { data: product } = await supabase
      .from('products')
      .select('name, brand')
      .eq('id', productId)
      .single();

    return {
      id: data.id,
      projectId: data.project_id,
      productId: data.product_id,
      quantity: data.quantity,
      createdAt: data.created_at,
      expectedDate: data.expected_date,
      observation: data.observation,
      productName: product?.name || 'Unknown Product',
      productBrand: product?.brand || 'Unknown Brand'
    };
  },

  /**
   * Get items for a project
   */
  async getImportItems(projectId: string): Promise<ImportItem[]> {
    if (!supabase) return [];

    // 1. Fetch items
    const { data: items, error } = await supabase
      .from('import_items')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      console.error(error);
      return [];
    }

    if (!items || items.length === 0) return [];

    // 2. Fetch product details
    const productIds = items.map((i: any) => i.product_id);
    const { data: products } = await supabase
      .from('products')
      .select('id, name, brand')
      .in('id', productIds);

    const productMap = new Map(products?.map((p: any) => [p.id, p]) || []);

    return items.map((item: any) => ({
      id: item.id,
      projectId: item.project_id,
      productId: item.product_id,
      quantity: item.quantity,
      createdAt: item.created_at,
      expectedDate: item.expected_date,
      observation: item.observation,
      productName: productMap.get(item.product_id)?.name || 'Unknown Product',
      productBrand: productMap.get(item.product_id)?.brand || 'Unknown Brand'
    }));
  },

  /**
   * Remove item from Import Project
   */
  async removeImportItem(itemId: string): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase
      .from('import_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error(error);
      return false;
    }

    return true;
  },

  /**
   * Delete Import Project
   */
  async deleteImportProject(projectId: string): Promise<boolean> {
    if (!supabase) return false;

    // First, delete all items in the project
    const { error: itemsError } = await supabase
      .from('import_items')
      .delete()
      .eq('project_id', projectId);

    if (itemsError) {
      console.error('Error deleting project items:', itemsError);
      return false;
    }

    // Then, delete the project itself
    const { error: projectError } = await supabase
      .from('import_projects')
      .delete()
      .eq('id', projectId);

    if (projectError) {
      console.error('Error deleting project:', projectError);
      return false;
    }

    return true;
  },

  /**
   * Get import information for a specific product
   * Returns total quantity and earliest expected date across all import projects
   */
  async getImportInfoByProduct(productId: string): Promise<{ quantity: number; expectedDate?: string } | null> {
    if (!supabase) return null;

    // Query all import items for this product
    const { data: items, error } = await supabase
      .from('import_items')
      .select('quantity, expected_date')
      .eq('product_id', productId);

    if (error) {
      console.error('Error fetching import info for product:', error);
      return null;
    }

    if (!items || items.length === 0) {
      return null;
    }

    // Sum up quantities
    const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

    // Find earliest expected date
    const dates = items
      .map((item: any) => item.expected_date)
      .filter((date: any) => date != null);

    const earliestDate = dates.length > 0
      ? dates.sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime())[0]
      : undefined;

    return {
      quantity: totalQuantity,
      expectedDate: earliestDate
    };
  }
};
