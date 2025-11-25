# Fix inventoryService.ts by removing duplicated code
$file = "services\inventoryService.ts"
$content = Get-Content $file -Raw

# Find where the duplication starts (after line 717)
$lines = Get-Content $file
$goodLines = $lines[0..716]

# Add the correct ending
$goodLines += @"
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
  async addImportItem(projectId: string, productId: string, quantity: number): Promise<ImportItem | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('import_items')
      .insert({ project_id: projectId, product_id: productId, quantity })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      projectId: data.project_id,
      productId: data.product_id,
      quantity: data.quantity,
      createdAt: data.created_at
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
      productName: productMap.get(item.product_id)?.name || 'Unknown Product',
      productBrand: productMap.get(item.product_id)?.brand || 'Unknown Brand'
    }));
  }
};
"@

$goodLines | Set-Content $file
Write-Host "File fixed!" -ForegroundColor Green
