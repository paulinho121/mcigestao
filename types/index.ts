export interface Product {
    id: string;
    name: string;
    brand: string;
    stock_ce: number;
    stock_sc: number;
    stock_sp: number;
    total: number;
    reserved: number;
    importQuantity?: number;
    expectedRestockDate?: string;
    observations?: string;
}

export interface Reservation {
    id: string;
    productId: string;
    productName: string;
    productBrand: string;
    quantity: number;
    branch: 'CE' | 'SC' | 'SP';
    reservedBy: string;
    reservedByName?: string;
    reservedAt: Date;
}

export interface ImportProject {
    id: string;
    manufacturer: string;
    importNumber: string;
    status: 'open' | 'closed';
    createdAt: string;
}

export interface ImportItem {
    id: string;
    projectId: string;
    productId: string;
    quantity: number;
    createdAt: string;
    productName: string;
    productBrand: string;
    expectedDate?: string;
    observation?: string;
}
