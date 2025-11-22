export interface Product {
  id: string; // Corresponds to COD
  name: string; // Corresponds to NOME DO PRODUTO
  brand: string; // Corresponds to MARCA
  stock_ce: number; // CEARÁ
  stock_sc: number; // SANTA CATARINA
  stock_sp: number; // SÃO PAULO
  total: number; // TOTAL
  reserved: number; // RESERVA
  price?: number; // Preço de venda em reais
  importQuantity?: number; // Em Importação
  expectedRestockDate?: string | null; // Data Prevista Reposição (ISO format)
  observations?: string; // Observações de manutenção
}

export interface Reservation {
  id: string;
  productId: string;
  productName: string;
  productBrand: string;
  quantity: number;
  branch: 'CE' | 'SC' | 'SP'; // Filial da reserva
  reservedBy: string; // Email
  reservedByName?: string; // Nome do usuário
  reservedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export interface SeasonalBackground {
  id: string;
  event_name: string;
  start_date: string;
  end_date: string;
  background_url: string;
  opacity: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}