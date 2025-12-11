import { useState, useEffect } from 'react';
import { Search, Package, User, Calendar, X, AlertCircle } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import { Product, Reservation } from '../types';

interface ReservationsProps {
    userEmail: string;
    userName?: string;
    isMasterUser?: boolean;
}

export const Reservations: React.FC<ReservationsProps> = ({ userEmail, userName, isMasterUser }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [selectedBranch, setSelectedBranch] = useState<'CE' | 'SC' | 'SP'>('CE');
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Load reservations on mount
    useEffect(() => {
        loadReservations();
    }, []);

    const loadReservations = async () => {
        try {
            const data = await inventoryService.getReservations();
            setReservations(data);
        } catch (err) {
            console.error('Error loading reservations:', err);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        setLoading(true);
        try {
            const results = await inventoryService.searchProducts(searchQuery);
            setSearchResults(results);
        } catch (err) {
            setError('Erro ao buscar produtos');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectProduct = (product: Product) => {
        setSelectedProduct(product);
        setSearchResults([]);
        setSearchQuery('');
        setQuantity(1);
        setSelectedBranch('CE'); // Reset to default
        setError('');
    };

    const handleReserve = async () => {
        if (!selectedProduct) return;

        if (quantity <= 0) {
            setError('Quantidade deve ser maior que zero');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await inventoryService.reserveProduct(
                selectedProduct.id,
                quantity,
                userEmail,
                selectedBranch,
                userName
            );
            setSuccess(`Reserva realizada com sucesso na filial ${selectedBranch}!`);
            setSelectedProduct(null);
            setQuantity(1);
            setSelectedBranch('CE');
            await loadReservations();

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message || 'Erro ao realizar reserva');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelReservation = async (reservationId: string) => {
        if (!confirm('Deseja cancelar esta reserva?')) return;

        try {
            await inventoryService.cancelReservation(reservationId);
            await loadReservations();
            setSuccess('Reserva cancelada com sucesso!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Erro ao cancelar reserva');
        }
    };

    const availableStock = selectedProduct && selectedBranch
        ? selectedProduct[`stock_${selectedBranch.toLowerCase()}` as 'stock_ce' | 'stock_sc' | 'stock_sp']
        : 0;

    const getBranchName = (code: string) => {
        const names: Record<string, string> = {
            'CE': 'Ceará',
            'SC': 'Santa Catarina',
            'SP': 'São Paulo'
        };
        return names[code] || code;
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 transition-colors">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Reserva de Produtos</h1>

                {/* Success/Error Messages */}
                {success && (
                    <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl flex items-center">
                        <span className="mr-2">✓</span> {success}
                    </div>
                )}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" /> {error}
                    </div>
                )}

                {/* Reservation Form */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8 transition-colors">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Nova Reserva</h2>

                    {/* Product Search */}
                    <div className="mb-4">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Buscar Produto (Código ou Descrição)
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-grow">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
                                    placeholder="Digite o código ou nome do produto..."
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                disabled={loading}
                                className="px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50"
                            >
                                Buscar
                            </button>
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-xl max-h-60 overflow-y-auto bg-white dark:bg-slate-800">
                                {searchResults.map((product) => (
                                    <button
                                        key={product.id}
                                        onClick={() => handleSelectProduct(product)}
                                        className="w-full p-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-left border-b border-slate-100 dark:border-slate-700 last:border-b-0 transition-colors"
                                    >
                                        <div className="font-semibold text-slate-900 dark:text-white">
                                            {product.id} - {product.name}
                                        </div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400">
                                            Disponível: {product.total - product.reserved} unidades
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected Product */}
                    {selectedProduct && (
                        <div className="mb-4 p-4 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white">
                                        {selectedProduct.id} - {selectedProduct.name}
                                    </div>
                                    <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                                        Marca: {selectedProduct.brand}
                                    </div>
                                    <div className="text-sm text-slate-600 dark:text-slate-300">
                                        Estoque Total: {selectedProduct.total} | Reservado: {selectedProduct.reserved} | Disponível: {availableStock}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedProduct(null)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Branch Selection */}
                            <div className="mt-4">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    Filial para Reserva
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedBranch('CE')}
                                        className={`px-4 py-3 rounded-xl font-semibold transition-all ${selectedBranch === 'CE'
                                            ? 'bg-green-600 text-white shadow-lg'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                                            }`}
                                    >
                                        Ceará ({selectedProduct.stock_ce})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedBranch('SC')}
                                        className={`px-4 py-3 rounded-xl font-semibold transition-all ${selectedBranch === 'SC'
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                                            }`}
                                    >
                                        Santa Catarina ({selectedProduct.stock_sc})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedBranch('SP')}
                                        className={`px-4 py-3 rounded-xl font-semibold transition-all ${selectedBranch === 'SP'
                                            ? 'bg-red-600 text-white shadow-lg'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                                            }`}
                                    >
                                        São Paulo ({selectedProduct.stock_sp})
                                    </button>
                                </div>
                            </div>

                            {/* Quantity Input */}
                            <div className="mt-4">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    Quantidade a Reservar (Disponível na {getBranchName(selectedBranch)}: {availableStock})
                                </label>
                                <div className="flex gap-4 items-end">
                                    <input
                                        type="number"
                                        min="1"
                                        max={availableStock}
                                        value={quantity}
                                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                        className="w-32 px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-slate-700 dark:text-white"
                                    />
                                    <button
                                        onClick={handleReserve}
                                        disabled={loading || quantity > availableStock || availableStock === 0}
                                        className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                                    >
                                        {loading ? 'Reservando...' : 'Confirmar Reserva'}
                                    </button>
                                </div>
                                {quantity > availableStock && (
                                    <p className="text-sm text-red-600 mt-2">
                                        Quantidade excede o estoque disponível
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Reservations List */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Reservas Ativas</h2>

                    {reservations.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                            <Package className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                            <p>Nenhuma reserva encontrada</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {reservations.map((reservation) => (
                                <div
                                    key={reservation.id}
                                    className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-brand-300 dark:hover:border-brand-500 transition-colors"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-grow">
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                {reservation.productId} - {reservation.productName}
                                            </div>
                                            <div className="flex gap-4 mt-2 text-sm text-slate-600 dark:text-slate-300 flex-wrap">
                                                <div className="flex items-center">
                                                    <Package className="w-4 h-4 mr-1" />
                                                    Quantidade: {reservation.quantity}
                                                </div>
                                                <div className="flex items-center">
                                                    <span className={`px-2 py-1 rounded-md font-semibold text-xs ${reservation.branch === 'CE' ? 'bg-green-100 text-green-700' :
                                                        reservation.branch === 'SC' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                        {getBranchName(reservation.branch)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center">
                                                    <User className="w-4 h-4 mr-1" />
                                                    {reservation.reservedByName || reservation.reservedBy}
                                                </div>
                                                <div className="flex items-center">
                                                    <Calendar className="w-4 h-4 mr-1" />
                                                    {new Date(reservation.reservedAt).toLocaleDateString('pt-BR')}
                                                </div>
                                            </div>
                                        </div>
                                        {(reservation.reservedBy === userEmail || isMasterUser) && (
                                            <button
                                                onClick={() => handleCancelReservation(reservation.id)}
                                                className="ml-4 px-4 py-2 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
