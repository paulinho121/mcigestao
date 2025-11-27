import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, DollarSign, User, Package, Trash2, CheckCircle, Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Rental, RentalItem } from '../types';

export function RentalManagement() {
    const [activeTab, setActiveTab] = useState<'rentals' | 'inventory'>('rentals');
    const [rentals, setRentals] = useState<Rental[]>([]);
    const [rentalItems, setRentalItems] = useState<RentalItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Rental Form State
    const [showAddRentalModal, setShowAddRentalModal] = useState(false);
    const [clientName, setClientName] = useState('');
    const [itemName, setItemName] = useState('');
    const [rentalPeriod, setRentalPeriod] = useState('');
    const [rentalValue, setRentalValue] = useState('');

    // Inventory Form State
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [editingItem, setEditingItem] = useState<RentalItem | null>(null);
    const [newItemName, setNewItemName] = useState('');
    const [newItemDescription, setNewItemDescription] = useState('');
    const [newItemQuantity, setNewItemQuantity] = useState('');
    const [newItemDailyRate, setNewItemDailyRate] = useState('');

    useEffect(() => {
        if (activeTab === 'rentals') {
            fetchRentals();
        } else {
            fetchRentalItems();
        }
    }, [activeTab]);

    const fetchRentals = async () => {
        try {
            setLoading(true);
            if (!supabase) return;
            const { data, error } = await supabase
                .from('rentals')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRentals(data || []);
        } catch (error) {
            console.error('Error fetching rentals:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRentalItems = async () => {
        try {
            setLoading(true);
            if (!supabase) return;
            const { data, error } = await supabase
                .from('rental_items')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setRentalItems(data || []);
        } catch (error) {
            console.error('Error fetching rental items:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Rental Functions ---

    const handleAddRental = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!supabase) return;
            const { data, error } = await supabase
                .from('rentals')
                .insert([
                    {
                        client_name: clientName,
                        item_name: itemName,
                        rental_period: rentalPeriod,
                        rental_value: parseFloat(rentalValue) || 0,
                        status: 'active'
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            setRentals([data, ...rentals]);
            setShowAddRentalModal(false);
            resetRentalForm();
        } catch (error) {
            console.error('Error adding rental:', error);
            alert('Erro ao adicionar locação');
        }
    };

    const handleReturnRental = async (id: string) => {
        if (!confirm('Confirmar devolução do item?')) return;

        try {
            if (!supabase) return;
            const { error } = await supabase
                .from('rentals')
                .update({ status: 'returned' })
                .eq('id', id);

            if (error) throw error;

            setRentals(rentals.map(r => r.id === id ? { ...r, status: 'returned' } : r));
        } catch (error) {
            console.error('Error returning rental:', error);
        }
    };

    const handleDeleteRental = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este registro?')) return;

        try {
            if (!supabase) return;
            const { error } = await supabase
                .from('rentals')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setRentals(rentals.filter(r => r.id !== id));
        } catch (error) {
            console.error('Error deleting rental:', error);
        }
    };

    const resetRentalForm = () => {
        setClientName('');
        setItemName('');
        setRentalPeriod('');
        setRentalValue('');
    };

    // --- Inventory Functions ---

    const handleSaveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const itemData = {
                name: newItemName,
                description: newItemDescription,
                total_quantity: parseInt(newItemQuantity) || 0,
                available_quantity: parseInt(newItemQuantity) || 0, // Initially same as total
                daily_rate: parseFloat(newItemDailyRate) || 0
            };

            if (editingItem) {
                // Update existing item
                // Note: Updating total_quantity should ideally adjust available_quantity logic, 
                // but for simplicity we'll just update total here or require a more complex calculation 
                // if we were tracking availability strictly. For now, let's just update the fields.
                // If the user changes total quantity, we might need to adjust available quantity by the difference.
                const quantityDiff = (parseInt(newItemQuantity) || 0) - editingItem.total_quantity;

                if (!supabase) return;
                const { data, error } = await supabase
                    .from('rental_items')
                    .update({
                        ...itemData,
                        available_quantity: editingItem.available_quantity + quantityDiff
                    })
                    .eq('id', editingItem.id)
                    .select()
                    .single();

                if (error) throw error;
                setRentalItems(rentalItems.map(i => i.id === editingItem.id ? data : i));
            } else {
                // Create new item
                if (!supabase) return;
                const { data, error } = await supabase
                    .from('rental_items')
                    .insert([itemData])
                    .select()
                    .single();

                if (error) throw error;
                setRentalItems([...rentalItems, data]);
            }

            setShowAddItemModal(false);
            resetItemForm();
        } catch (error) {
            console.error('Error saving rental item:', error);
            alert('Erro ao salvar item');
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este item?')) return;

        try {
            if (!supabase) return;
            const { error } = await supabase
                .from('rental_items')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setRentalItems(rentalItems.filter(i => i.id !== id));
        } catch (error) {
            console.error('Error deleting rental item:', error);
        }
    };

    const openEditItemModal = (item: RentalItem) => {
        setEditingItem(item);
        setNewItemName(item.name);
        setNewItemDescription(item.description || '');
        setNewItemQuantity(item.total_quantity.toString());
        setNewItemDailyRate(item.daily_rate.toString());
        setShowAddItemModal(true);
    };

    const resetItemForm = () => {
        setEditingItem(null);
        setNewItemName('');
        setNewItemDescription('');
        setNewItemQuantity('');
        setNewItemDailyRate('');
    };

    // --- Filtering ---

    const filteredRentals = rentals.filter(rental =>
        rental.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rental.item_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredItems = rentalItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeRentalsCount = rentals.filter(r => r.status === 'active').length;
    const totalRevenue = rentals.reduce((acc, curr) => acc + (curr.rental_value || 0), 0);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Gestão de Locação</h1>
                    <p className="text-slate-500">Gerencie seus contratos e estoque de locação</p>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'rentals' ? (
                        <button
                            onClick={() => setShowAddRentalModal(true)}
                            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <Plus className="w-5 h-5" />
                            Nova Locação
                        </button>
                    ) : (
                        <button
                            onClick={() => { resetItemForm(); setShowAddItemModal(true); }}
                            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <Plus className="w-5 h-5" />
                            Novo Item
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
                <button
                    onClick={() => setActiveTab('rentals')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'rentals'
                        ? 'bg-white text-brand-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Contratos
                </button>
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'inventory'
                        ? 'bg-white text-brand-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Estoque
                </button>
            </div>

            {/* Stats Cards (Only for Rentals Tab) */}
            {activeTab === 'rentals' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                <Package className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-medium text-slate-400">Total Ativos</span>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-800">{activeRentalsCount}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 col-span-2">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 w-full">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                                <span className="text-sm font-medium text-slate-400">Receita Total</span>
                            </div>
                            <h3 className="text-3xl font-bold text-slate-800">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
                            </h3>
                        </div>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder={activeTab === 'rentals' ? "Buscar por cliente ou item..." : "Buscar item..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-x-auto">
                    {activeTab === 'rentals' ? (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-sm font-medium uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Cliente</th>
                                    <th className="px-6 py-4">Item</th>
                                    <th className="px-6 py-4">Período</th>
                                    <th className="px-6 py-4">Valor</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Carregando...</td>
                                    </tr>
                                ) : filteredRentals.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Nenhuma locação encontrada.</td>
                                    </tr>
                                ) : (
                                    filteredRentals.map((rental) => (
                                        <tr key={rental.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900">{rental.client_name}</td>
                                            <td className="px-6 py-4 text-slate-600">{rental.item_name}</td>
                                            <td className="px-6 py-4 text-slate-600">{rental.rental_period}</td>
                                            <td className="px-6 py-4 font-medium text-slate-900">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rental.rental_value)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                    ${rental.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                                        rental.status === 'returned' ? 'bg-green-100 text-green-800' :
                                                            'bg-red-100 text-red-800'}`}>
                                                    {rental.status === 'active' ? 'Ativo' :
                                                        rental.status === 'returned' ? 'Devolvido' : rental.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                {rental.status === 'active' && (
                                                    <button
                                                        onClick={() => handleReturnRental(rental.id)}
                                                        className="text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded"
                                                        title="Marcar como devolvido"
                                                    >
                                                        <CheckCircle className="w-5 h-5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteRental(rental.id)}
                                                    className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-sm font-medium uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Item</th>
                                    <th className="px-6 py-4">Descrição</th>
                                    <th className="px-6 py-4">Qtd. Total</th>
                                    <th className="px-6 py-4">Disponível</th>
                                    <th className="px-6 py-4">Diária (R$)</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Carregando...</td>
                                    </tr>
                                ) : filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Nenhum item encontrado.</td>
                                    </tr>
                                ) : (
                                    filteredItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                                            <td className="px-6 py-4 text-slate-600">{item.description || '-'}</td>
                                            <td className="px-6 py-4 text-slate-900">{item.total_quantity}</td>
                                            <td className="px-6 py-4">
                                                <span className={`font-medium ${item.available_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {item.available_quantity}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.daily_rate)}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button
                                                    onClick={() => openEditItemModal(item)}
                                                    className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                                                    title="Editar"
                                                >
                                                    <Edit className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteItem(item.id)}
                                                    className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Add Rental Modal */}
            {showAddRentalModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800">Nova Locação</h2>
                        </div>
                        <form onSubmit={handleAddRental} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Cliente</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        required
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                                        placeholder="Ex: João Silva"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Item</label>
                                <div className="relative">
                                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        required
                                        value={itemName}
                                        onChange={(e) => setItemName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                                        placeholder="Ex: Furadeira"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tempo de Locação</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                        <input
                                            type="text"
                                            required
                                            value={rentalPeriod}
                                            onChange={(e) => setRentalPeriod(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                                            placeholder="Ex: 2 dias"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                        <input
                                            type="number"
                                            required
                                            step="0.01"
                                            min="0"
                                            value={rentalValue}
                                            onChange={(e) => setRentalValue(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowAddRentalModal(false)}
                                    className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors font-medium"
                                >
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add/Edit Item Modal */}
            {showAddItemModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editingItem ? 'Editar Item' : 'Novo Item'}
                            </h2>
                        </div>
                        <form onSubmit={handleSaveItem} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Item</label>
                                <input
                                    type="text"
                                    required
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="Ex: Andaime"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                                <textarea
                                    value={newItemDescription}
                                    onChange={(e) => setNewItemDescription(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="Detalhes do item..."
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade Total</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={newItemQuantity}
                                        onChange={(e) => setNewItemQuantity(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Diária (R$)</label>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        min="0"
                                        value={newItemDailyRate}
                                        onChange={(e) => setNewItemDailyRate(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowAddItemModal(false)}
                                    className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors font-medium"
                                >
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
