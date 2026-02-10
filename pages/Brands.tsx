import { useState, useEffect } from 'react';
import {
    Tag,
    Plus,
    Search,
    Edit3,
    Trash2,
    X,
    Image as ImageIcon,
    LayoutGrid,
    List
} from 'lucide-react';
import { brandService, Brand } from '../services/brandService';

export const Brands = () => {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        logo_url: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const data = await brandService.getAllBrands();
        setBrands(data);
        setLoading(false);
    };

    const handleOpenModal = (brand?: Brand) => {
        if (brand) {
            setSelectedBrand(brand);
            setFormData({
                name: brand.name,
                logo_url: brand.logo_url || ''
            });
        } else {
            setSelectedBrand(null);
            setFormData({
                name: '',
                logo_url: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (selectedBrand) {
            await brandService.updateBrand(selectedBrand.id, formData);
        } else {
            await brandService.createBrand(formData);
        }

        await fetchData();
        setIsModalOpen(false);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Deseja realmente excluir esta marca?")) {
            await brandService.deleteBrand(id);
            await fetchData();
        }
    };

    const filteredBrands = brands.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12 transition-colors">
            {/* Header Section */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 lg:px-8 py-8 transition-colors">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Tag className="w-8 h-8 text-brand-600" />
                                Gestão de Marcas
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">
                                Gerencie e organize as marcas do seu catálogo.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl mr-2">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 shadow-sm text-brand-600' : 'text-slate-400'}`}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 shadow-sm text-brand-600' : 'text-slate-400'}`}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                            <button
                                onClick={() => handleOpenModal()}
                                className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20 active:scale-95"
                            >
                                <Plus className="w-5 h-5" />
                                Nova Marca
                            </button>
                        </div>
                    </div>

                    <div className="mt-8">
                        <div className="relative max-w-xl">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar marca..."
                                className="pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl w-full focus:ring-2 focus:ring-brand-500/20 outline-none transition-all dark:text-white"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading && brands.length === 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white dark:bg-slate-800 h-32 rounded-3xl animate-pulse border border-slate-100 dark:border-slate-700"></div>
                        ))}
                    </div>
                ) : filteredBrands.length > 0 ? (
                    <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6" : "space-y-4"}>
                        {filteredBrands.map(brand => (
                            <div key={brand.id} className={`group bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-xl transition-all relative overflow-hidden flex ${viewMode === 'grid' ? 'flex-col items-center text-center' : 'items-center gap-6'}`}>
                                <div className={`${viewMode === 'grid' ? 'w-20 h-20 mb-4' : 'w-12 h-12'} bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-700 overflow-hidden`}>
                                    {brand.logo_url ? (
                                        <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <Tag className="w-8 h-8 text-slate-300" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-900 dark:text-white truncate w-full">{brand.name}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">MARCA</p>
                                </div>

                                <div className={`flex gap-1 ${viewMode === 'grid' ? 'mt-4 opacity-0 group-hover:opacity-100 transition-opacity' : ''}`}>
                                    <button
                                        onClick={() => handleOpenModal(brand)}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-brand-600 transition-colors"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(brand.id)}
                                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <Tag className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Nenhuma marca encontrada</h3>
                        <p className="text-slate-500 mt-2">Tente ajustar sua busca ou cadastre uma nova marca.</p>
                    </div>
                )}
            </main>

            {/* Modal de Cadastro */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-800 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                <Tag className="w-6 h-6 text-brand-600" />
                                {selectedBrand ? 'Editar Marca' : 'Nova Marca'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-2">Nome da Marca</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ex: Sony, Samyang..."
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl outline-none focus:ring-2 focus:ring-brand-500/20 dark:text-white transition-all font-bold"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-2">URL do Logo (Opcional)</label>
                                    <div className="relative">
                                        <ImageIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="url"
                                            placeholder="https://exemplo.com/logo.png"
                                            className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl outline-none focus:ring-2 focus:ring-brand-500/20 dark:text-white transition-all font-bold"
                                            value={formData.logo_url}
                                            onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                                        />
                                    </div>
                                    {formData.logo_url && (
                                        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center">
                                            <img src={formData.logo_url} alt="Preview" className="h-12 object-contain" onError={(e) => (e.currentTarget.src = '')} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-5 bg-slate-900 dark:bg-brand-600 text-white rounded-[2rem] font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-8"
                            >
                                {selectedBrand ? 'Salvar Alterações' : 'Cadastrar Marca'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
