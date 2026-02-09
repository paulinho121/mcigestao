import { useState, useEffect } from 'react';
import {
    Users,
    Plus,
    Search,
    Mail,
    Phone,
    Tag,
    Edit3,
    Trash2,
    X,
    Building2,
    Briefcase
} from 'lucide-react';
import { supplierService } from '../services/supplierService';
import { inventoryService } from '../services/inventoryService';
import { Supplier } from '../types';

export const Suppliers = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [brands, setBrands] = useState<string[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        cnpj: '',
        email: '',
        phone: '',
        address: '',
        brands: [] as string[]
    });

    useEffect(() => {
        fetchData();
        fetchBrands();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const data = await supplierService.getAllSuppliers();
        setSuppliers(data);
        setLoading(false);
    };

    const fetchBrands = async () => {
        const data = await inventoryService.getBrands();
        setBrands(data);
    };

    const handleOpenModal = (supplier?: Supplier) => {
        if (supplier) {
            setSelectedSupplier(supplier);
            setFormData({
                name: supplier.name,
                cnpj: supplier.cnpj || '',
                email: supplier.email || '',
                phone: supplier.phone || '',
                address: supplier.address || '',
                brands: supplier.brands || []
            });
        } else {
            setSelectedSupplier(null);
            setFormData({
                name: '',
                cnpj: '',
                email: '',
                phone: '',
                address: '',
                brands: []
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (selectedSupplier) {
            await supplierService.updateSupplier(selectedSupplier.id, formData);
        } else {
            await supplierService.createSupplier(formData);
        }

        await fetchData();
        setIsModalOpen(false);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Deseja realmente excluir este fornecedor?")) {
            await supplierService.deleteSupplier(id);
            await fetchData();
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.cnpj?.includes(searchQuery) ||
        s.brands.some(b => b.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12 transition-colors">
            {/* Header Section */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 lg:px-8 py-8 transition-colors">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Users className="w-8 h-8 text-brand-600" />
                                Gestão de Fornecedores
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">
                                Cadastro centralizado e controle de parcerias comerciais.
                            </p>
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20 active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                            Novo Fornecedor
                        </button>
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nome, CNPJ ou marca..."
                                className="pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl w-full focus:ring-2 focus:ring-brand-500/20 outline-none transition-all dark:text-white"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading && suppliers.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white dark:bg-slate-800 h-64 rounded-3xl animate-pulse"></div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredSuppliers.map(supplier => (
                            <div key={supplier.id} className="group bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 p-8 shadow-sm hover:shadow-xl transition-all relative overflow-hidden">
                                {/* Decorator */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-bl-full translate-x-8 -translate-y-8 group-hover:bg-brand-500/10 transition-colors"></div>

                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-600">
                                        <Building2 className="w-8 h-8 text-brand-600" />
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleOpenModal(supplier)}
                                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-brand-600 transition-colors"
                                        >
                                            <Edit3 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(supplier.id)}
                                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">{supplier.name}</h3>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">{supplier.cnpj || 'CNPJ não informado'}</p>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                        <Mail className="w-4 h-4 text-brand-400" />
                                        <span className="truncate">{supplier.email || '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                        <Phone className="w-4 h-4 text-brand-400" />
                                        <span>{supplier.phone || '-'}</span>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 flex items-center gap-1.5">
                                        <Tag className="w-3 h-3" /> Marcas Atendidas
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {supplier.brands.map(brand => (
                                            <span key={brand} className="px-3 py-1 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 text-xs font-black rounded-lg">
                                                {brand}
                                            </span>
                                        ))}
                                        {supplier.brands.length === 0 && (
                                            <span className="text-xs text-slate-400 font-medium italic">Nenhuma marca vinculada</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal de Cadastro */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                <Briefcase className="w-8 h-8 text-brand-600" />
                                {selectedSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-2">Nome / Razão Social</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl outline-none focus:ring-2 focus:ring-brand-500/20 dark:text-white transition-all font-bold"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-2">CNPJ</label>
                                    <input
                                        type="text"
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl outline-none focus:ring-2 focus:ring-brand-500/20 dark:text-white transition-all font-bold"
                                        value={formData.cnpj}
                                        onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-2">Telefone</label>
                                    <input
                                        type="text"
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl outline-none focus:ring-2 focus:ring-brand-500/20 dark:text-white transition-all font-bold"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-2">E-mail Comercial</label>
                                    <input
                                        type="email"
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl outline-none focus:ring-2 focus:ring-brand-500/20 dark:text-white transition-all font-bold"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-2">Marcas Vinculadas</label>
                                    <div className="flex flex-wrap gap-2 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2rem]">
                                        {brands.map(brand => (
                                            <button
                                                key={brand}
                                                type="button"
                                                onClick={() => {
                                                    const current = formData.brands;
                                                    if (current.includes(brand)) {
                                                        setFormData({ ...formData, brands: current.filter(b => b !== brand) });
                                                    } else {
                                                        setFormData({ ...formData, brands: [...current, brand] });
                                                    }
                                                }}
                                                className={`px-4 py-2 rounded-xl text-xs font-black border-2 transition-all ${formData.brands.includes(brand)
                                                    ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/20'
                                                    : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-brand-500/30'
                                                    }`}
                                            >
                                                {brand}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-5 bg-slate-900 dark:bg-brand-600 text-white rounded-[2rem] font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-8"
                            >
                                {selectedSupplier ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
