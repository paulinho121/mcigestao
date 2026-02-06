export interface User {
    id: string;
    email: string;
    name: string;
}

export interface Product {
    id: string;
    name: string;
    brand: string;
    brand_logo?: string;
    image_url?: string;
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

export interface SeasonalBackground {
    id: string;
    name: string;
    image_url: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Rental {
    id: string;
    client_name: string;
    item_name: string;
    rental_period: string;
    rental_value: number;
    status: 'active' | 'returned' | 'overdue';
    created_at: string;
}

export interface RentalItem {
    id: string;
    name: string;
    description?: string;
    total_quantity: number;
    available_quantity: number;
    daily_rate: number;
    created_at: string;
}
