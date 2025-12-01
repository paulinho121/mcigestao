import { Product } from '../types';

export const backupService = {
    /**
     * Converts an array of products to CSV format and triggers a download.
     */
    exportProductsToCSV: (products: Product[]) => {
        if (!products || products.length === 0) {
            alert('Não há produtos para exportar.');
            return;
        }

        // Define CSV headers
        const headers = [
            'ID',
            'Nome',
            'Marca',
            'Estoque CE',
            'Estoque SC',
            'Estoque SP',
            'Total',
            'Reservado',
            'Em Importação',
            'Data Prevista Reposição',
            'Observações'
        ];

        // Map product data to CSV rows
        const rows = products.map(product => [
            product.id,
            `"${(product.name || '').replace(/"/g, '""')}"`, // Escape quotes
            `"${(product.brand || '').replace(/"/g, '""')}"`,
            product.stock_ce,
            product.stock_sc,
            product.stock_sp,
            product.total,
            product.reserved,
            product.importQuantity || 0,
            product.expectedRestockDate ? new Date(product.expectedRestockDate).toLocaleDateString('pt-BR') : '',
            `"${(product.observations || '').replace(/"/g, '""')}"`
        ]);

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Create a Blob and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);

        // Generate filename with current date
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `backup_produtos_${date}.csv`);

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
