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
    min_stock?: number;
    max_stock?: number;
    safety_stock?: number;
    average_consumption_daily?: number;
    yearly_sales?: number;
    abc_category?: 'A' | 'B' | 'C';
    price?: number;
    last_purchase_price?: number;
    location?: string;
    location_ce?: string;
    location_sc?: string;
    location_sp?: string;
    is_future?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface InternalMovement {
    id: string;
    product_id: string;
    product_name: string;
    type: 'amostra' | 'demonstracao';
    quantity: number;
    branch: 'CE' | 'SC' | 'SP';
    user_email: string;
    observations?: string;
    created_at: string;
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

export interface Supplier {
    id: string;
    name: string;
    cnpj?: string;
    email?: string;
    phone?: string;
    address?: string;
    brands: string[];
    rating_score?: number;
    created_at?: string;
}

export interface PurchaseOrder {
    id: string;
    order_number: string;
    supplier_id: string;
    supplier_name?: string;
    status: 'draft' | 'pending' | 'sent' | 'partial' | 'received' | 'cancelled';
    total_value: number;
    expected_delivery_date?: string;
    received_at?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
    id: string;
    order_id: string;
    product_id: string;
    product_name: string;
    brand: string;
    quantity: number;
    quantity_received: number;
    unit_price: number;
    created_at: string;
}

export interface WithdrawalProtocol {
    id: string;
    product_id: string;
    product_name: string;
    customer_name: string;
    receiver_name: string;
    branch: 'CE' | 'SC' | 'SP';
    quantity: number;
    serial_number?: string;
    observations?: string;
    photo_url?: string;
    user_email: string;
    invoice_number?: string;
    created_at: string;
}
