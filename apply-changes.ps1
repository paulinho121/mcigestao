# Script para aplicar as alterações nos arquivos

Write-Host "Aplicando alterações..." -ForegroundColor Green

# 1. Adicionar função getReservationsByProduct no inventoryService.ts
$inventoryFile = "services\inventoryService.ts"
$content = Get-Content $inventoryFile -Raw

$newFunction = @"

  /**
   * Get reservations for a specific product
   */
  async getReservationsByProduct(productId: string): Promise<Reservation[]> {
    if (!supabase) {
      return reservations.filter(r => 
        r.productId === productId || r.productId === ``${productId}.0``
      );
    }

    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .or(``product_id.eq.${productId},product_id.eq.${productId}.0``)
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
"@

# Encontrar a posição correta (após getReservations e antes de cancelReservation)
$pattern = "(?s)(    \}\)\);\r?\n  \},\r?\n\r?\n  /\*\*\r?\n   \* Cancel a reservation)"
if ($content -match $pattern) {
    $content = $content -replace $pattern, "    }));$newFunction`r`n`r`n  /**`r`n   * Cancel a reservation"
    Set-Content $inventoryFile -Value $content -NoNewline
    Write-Host "✓ Função getReservationsByProduct adicionada em inventoryService.ts" -ForegroundColor Green
} else {
    Write-Host "✗ Não foi possível encontrar o local correto em inventoryService.ts" -ForegroundColor Red
}

# 2. Substituir ProductCard.tsx
Copy-Item "ProductCard_MODIFIED.tsx" "components\ProductCard.tsx" -Force
Write-Host "✓ ProductCard.tsx atualizado" -ForegroundColor Green

Write-Host "`nAlterações aplicadas com sucesso!" -ForegroundColor Green
Write-Host "O Vite deve recarregar automaticamente..." -ForegroundColor Yellow
