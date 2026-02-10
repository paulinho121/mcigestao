import { useState, useEffect, useMemo } from 'react';
import {
    ShoppingBag,
    TrendingDown,
    Plus,
    Search,
    Truck,
    CheckCircle2,
    Clock,
    X,
    FileText as FileIcon,
    Download,
    Printer,
    RefreshCw,
    ArrowRight,
    ArrowLeft
} from 'lucide-react';
import {
    ResponsiveContainer,
    ComposedChart,
    Bar,
    XAxis,
    CartesianGrid,
    Tooltip,
    Cell
} from 'recharts';
import { inventoryService } from '../services/inventoryService';
import { supplierService } from '../services/supplierService';
import { purchaseIntelligenceService } from '../services/purchaseIntelligenceService';
import { Product, Supplier } from '../types';

export const Shopping = () => {
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);

    // Modals State
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [isCriticalModalOpen, setIsCriticalModalOpen] = useState(false);
    const [orderStep, setOrderStep] = useState<'supplier' | 'products' | 'review'>('supplier');
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [orderItems, setOrderItems] = useState<{ product: Product; quantity: number; price: number }[]>([]);
    const [productSearch, setProductSearch] = useState('');

    const [activeOrders, setActiveOrders] = useState<any[]>([
        {
            id: 'OC-9602',
            supplier: 'Aputure Brasil',
            status: 'Processing',
            date: '09/02/2026',
            totalAmount: 75000,
            items: [{ name: 'Aputure 600d', quantity: 5, price: 15000 }]
        }
    ]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [productsData, suppliersData] = await Promise.all([
                inventoryService.getAllProducts(500),
                supplierService.getAllSuppliers()
            ]);
            setAllProducts(productsData);
            setLowStockProducts(productsData.filter(p => (p.total || 0) < (p.min_stock || 10)));
            setSuppliers(suppliersData);
        } catch (error) {
            console.error("Failed to fetch data", error);
        }
    };

    const handleRecalculateABC = async () => {
        await purchaseIntelligenceService.recalculateABC();
        await fetchData();
        alert("Inteligência e Curva ABC atualizadas!");
    };

    // Filters products for the selected supplier brands
    const supplierProducts = useMemo(() => {
        if (!selectedSupplier) return [];
        return allProducts.filter(p =>
            selectedSupplier.brands.includes(p.brand) &&
            (p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                p.brand.toLowerCase().includes(productSearch.toLowerCase()))
        );
    }, [selectedSupplier, allProducts, productSearch]);

    const abcData = useMemo(() => {
        const sorted = [...allProducts]
            .map(p => ({
                name: p.name.length > 12 ? p.name.substring(0, 10) + '...' : p.name,
                value: (p.total || 0) * (p.last_purchase_price || 50),
                class: p.abc_category || 'C'
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
        return sorted;
    }, [allProducts]);

    const addToOrder = (product: Product) => {
        const existing = orderItems.find(item => item.product.id === product.id);
        if (existing) {
            setOrderItems(orderItems.map(item =>
                item.product.id === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            const suggestedQty = Math.max(0, (product.max_stock || 20) - (product.total || 0));
            setOrderItems([...orderItems, {
                product,
                quantity: suggestedQty || 1,
                price: product.last_purchase_price || 0
            }]);
        }
    };

    const updateItemQty = (productId: string, qty: number) => {
        setOrderItems(orderItems.map(item =>
            item.product.id === productId ? { ...item, quantity: qty } : item
        ));
    };

    const removeItemFromOrder = (productId: string) => {
        setOrderItems(orderItems.filter(item => item.product.id !== productId));
    };

    const finalizeOrder = () => {
        const newOrder = {
            id: `OC-${Math.floor(1000 + Math.random() * 9000)}`,
            supplier: selectedSupplier?.name,
            status: 'Processing',
            date: new Date().toLocaleDateString(),
            items: orderItems.map(i => ({ name: i.product.name, quantity: i.quantity, price: i.price })),
            totalAmount: orderItems.reduce((sum, i) => sum + (i.quantity * i.price), 0)
        };
        setActiveOrders([newOrder, ...activeOrders]);
        setIsOrderModalOpen(false);
        setOrderItems([]);
        setSelectedSupplier(null);
        setOrderStep('supplier');
    };

    const handlePrintOrder = (order: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
                <head>
                    <title>Ordem de Compra ${order.id}</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; color: #333; }
                        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                        th { background: #f4f4f4; font-size: 12px; text-transform: uppercase; }
                        .total { margin-top: 30px; text-align: right; font-size: 20px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <h1>ORDEM DE COMPRA</h1>
                            <p><strong>Nº:</strong> ${order.id}</p>
                            <p><strong>Data:</strong> ${order.date}</p>
                        </div>
                        <div style="text-align: right">
                            <h2>${order.supplier}</h2>
                            <p>StockVision ERP</p>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Quantidade</th>
                                <th>Preço Unit.</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items.map((i: any) => `
                                <tr>
                                    <td>${i.name}</td>
                                    <td>${i.quantity} un</td>
                                    <td>R$ ${i.price.toLocaleString()}</td>
                                    <td>R$ ${(i.quantity * i.price).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="total">Total: R$ ${order.totalAmount.toLocaleString()}</div>
                    <script>window.print();</script>
                </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12 transition-colors">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                            <ShoppingBag className="w-10 h-10 text-brand-600" />
                            Central de Compras
                        </h1>
                        <p className="text-slate-500 font-medium">Gestão inteligente e automação de suprimentos.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleRecalculateABC} className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95 border border-slate-200 dark:border-slate-600">
                            <RefreshCw className="w-5 h-5" />
                            Atualizar Inteligência
                        </button>
                        <button onClick={() => { setIsOrderModalOpen(true); setOrderStep('supplier'); }} className="flex items-center gap-2 px-8 py-3 bg-brand-600 text-white rounded-2xl font-black shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all active:scale-95">
                            <Plus className="w-6 h-6" />
                            Nova Ordem
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Dashboard Section */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-red-500/5 rounded-full group-hover:scale-150 transition-transform"></div>
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Críticos</p>
                            <p className="text-3xl font-black text-red-500">{lowStockProducts.length}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/5 rounded-full group-hover:scale-150 transition-transform"></div>
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Em Aberto</p>
                            <p className="text-3xl font-black text-amber-500">{activeOrders.length}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-brand-500/5 rounded-full group-hover:scale-150 transition-transform"></div>
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Giro (Médio)</p>
                            <p className="text-3xl font-black text-brand-600">4.8x</p>
                        </div>
                    </div>

                    {/* ABC Chart */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">Curva ABC por Valor</h2>
                            <span className="text-xs font-bold text-slate-400">Dados baseados no estoque atual</span>
                        </div>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={abcData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                                        {abcData.map((e, i) => (
                                            <Cell key={i} fill={e.class === 'A' ? '#0ea5e9' : e.class === 'B' ? '#6366f1' : '#cbd5e1'} />
                                        ))}
                                    </Bar>
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Active Orders List */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white px-2">Monitoramento de Pedidos</h2>
                        <div className="grid grid-cols-1 gap-4">
                            {activeOrders.map(order => (
                                <div key={order.id} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 hover:border-brand-500/30 transition-all flex justify-between items-center group">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-700">
                                            <Truck className="w-7 h-7 text-brand-500" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{order.id}</span>
                                                <span className="px-2 py-0.5 bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 text-[10px] font-black rounded-lg uppercase">{order.status}</span>
                                            </div>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white">{order.supplier}</h3>
                                            <p className="text-sm font-bold text-slate-400">{order.date} • {order.items.length} itens</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Valor Total</p>
                                            <p className="text-xl font-black text-slate-900 dark:text-white">R$ {order.totalAmount.toLocaleString()}</p>
                                        </div>
                                        <button onClick={() => handlePrintOrder(order)} className="p-3 bg-slate-50 dark:bg-slate-900 hover:bg-brand-50 dark:hover:bg-brand-900/40 text-slate-400 hover:text-brand-600 rounded-2xl transition-all border border-transparent hover:border-brand-200">
                                            <Printer className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar - Quick Suggestions */}
                <div className="space-y-6">
                    <div className="bg-slate-900 dark:bg-brand-950 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full translate-x-10 -translate-y-10"></div>
                        <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                            <TrendingDown className="w-6 h-6 text-amber-400" />
                            Alerta de Reposição
                        </h2>
                        <div className="space-y-4">
                            {lowStockProducts.slice(0, 5).map(p => (
                                <div key={p.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer group">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black text-white/40 uppercase">{p.brand}</span>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${p.abc_category === 'A' ? 'bg-brand-500 shadow-lg shadow-brand-500/50' : 'bg-white/20'}`}>CLASS {p.abc_category || 'C'}</span>
                                    </div>
                                    <p className="font-bold text-sm text-white/90 group-hover:text-white transition-colors">{p.name}</p>
                                    <div className="mt-3 flex justify-between items-end">
                                        <div className="text-[10px] font-bold text-white/30 uppercase">
                                            Atual: <span className="text-red-400">{p.total}</span> / Mín: {p.min_stock}
                                        </div>
                                        <button onClick={() => { setIsOrderModalOpen(true); setSelectedSupplier(suppliers.find(s => s.brands.includes(p.brand)) || null); setOrderStep('products'); addToOrder(p); }} className="p-2 bg-white/10 rounded-xl hover:bg-brand-500 transition-all">
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setIsCriticalModalOpen(true)}
                            className="w-full mt-8 py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-black transition-all border border-white/5 active:scale-95"
                        >
                            VER TODOS OS CRÍTICOS
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h2 className="text-lg font-black mb-4 dark:text-white">Relatórios Rápidos</h2>
                        <div className="space-y-2">
                            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-2xl transition-all group">
                                <div className="flex items-center gap-3">
                                    <FileIcon className="w-5 h-5 text-slate-400 group-hover:text-brand-500" />
                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Inventário de Valor</span>
                                </div>
                                <Download className="w-4 h-4 text-slate-300" />
                            </button>
                            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-2xl transition-all group">
                                <div className="flex items-center gap-3">
                                    <FileIcon className="w-5 h-5 text-slate-400 group-hover:text-brand-500" />
                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Giro de Fornecedores</span>
                                </div>
                                <Download className="w-4 h-4 text-slate-300" />
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* HIGH-END MULTI-STEP ORDER MODAL */}
            {isOrderModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl" onClick={() => setIsOrderModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-800 w-full max-w-5xl h-[85vh] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                    <ShoppingBag className="w-8 h-8 text-brand-600" />
                                    Nova Ordem de Compra
                                </h2>
                                <div className="flex gap-8 mt-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${orderStep === 'supplier' ? 'text-brand-600' : 'text-slate-300'}`}>1. Fornecedor</span>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${orderStep === 'products' ? 'text-brand-600' : 'text-slate-300'}`}>2. Seleção de Itens</span>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${orderStep === 'review' ? 'text-brand-600' : 'text-slate-300'}`}>3. Revisão & Envio</span>
                                </div>
                            </div>
                            <button onClick={() => setIsOrderModalOpen(false)} className="p-3 bg-white dark:bg-slate-700 rounded-full shadow-sm hover:bg-red-50 hover:text-red-500 transition-all active:scale-90">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* STEP 1: SELECT SUPPLIER */}
                        {orderStep === 'supplier' && (
                            <div className="p-10 flex-1 overflow-y-auto">
                                <div className="mb-8">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-4 mb-2 block">Selecione o Fornecedor para esta cotação</label>
                                    <div className="relative">
                                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300" />
                                        <input
                                            type="text"
                                            placeholder="Buscar fornecedores homologados..."
                                            className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2rem] outline-none text-lg font-bold dark:text-white focus:ring-4 focus:ring-brand-500/10 transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {suppliers.map(s => (
                                        <div
                                            key={s.id}
                                            onClick={() => { setSelectedSupplier(s); setOrderStep('products'); }}
                                            className={`p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 flex flex-col justify-between h-48 group ${selectedSupplier?.id === s.id ? 'border-brand-600 bg-brand-50/50 dark:bg-brand-900/20' : 'border-slate-50 bg-white dark:bg-slate-700 dark:border-slate-600 hover:border-brand-200'}`}
                                        >
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">{s.name}</h3>
                                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tighter">{s.cnpj}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-4">
                                                {s.brands.slice(0, 3).map(b => (
                                                    <span key={b} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900/50 dark:text-slate-400 text-[9px] font-black rounded-md uppercase">{b}</span>
                                                ))}
                                                {s.brands.length > 3 && <span className="text-[9px] font-black text-slate-300">+{s.brands.length - 3}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* STEP 2: SELECT PRODUCTS */}
                        {orderStep === 'products' && (
                            <div className="flex flex-1 overflow-hidden">
                                {/* Left Side: Catalog */}
                                <div className="w-2/3 flex flex-col border-r border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                                    <div className="p-8 border-b border-slate-100 dark:border-slate-700">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Produtos: {selectedSupplier?.name}</h3>
                                            <div className="flex gap-2">
                                                {selectedSupplier?.brands.map(b => (
                                                    <span key={b} className="px-3 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-[10px] font-black uppercase text-slate-500">{b}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                            <input
                                                type="text"
                                                placeholder="Filtrar produtos do fornecedor..."
                                                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold"
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-8 space-y-3 custom-scrollbar">
                                        {supplierProducts.map(p => {
                                            const isSelected = orderItems.some(i => i.product.id === p.id);
                                            const suggestedQty = Math.max(0, (p.max_stock || 20) - (p.total || 0));
                                            return (
                                                <div key={p.id} className={`p-5 rounded-3xl border transition-all flex items-center justify-between group cursor-pointer ${isSelected ? 'bg-brand-50 border-brand-200 dark:bg-brand-900/20 dark:border-brand-700' : 'bg-white border-white dark:bg-slate-800 dark:border-slate-700 hover:border-brand-100'}`} onClick={() => addToOrder(p)}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${p.abc_category === 'A' ? 'bg-amber-100 text-amber-600' : p.abc_category === 'B' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                                            {p.abc_category || 'C'}
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.brand}</p>
                                                            <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{p.name}</h4>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-10">
                                                        <div className="text-center w-20">
                                                            <p className="text-[9px] font-black text-slate-400 uppercase">Estoque</p>
                                                            <p className={`text-lg font-black ${p.total <= (p.min_stock || 0) ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>{p.total}</p>
                                                        </div>
                                                        <div className="text-center w-20">
                                                            <p className="text-[9px] font-black text-brand-400 uppercase">Sugestão</p>
                                                            <p className="text-lg font-black text-brand-600">{suggestedQty}</p>
                                                        </div>
                                                        <div className={`p-3 rounded-full transition-all ${isSelected ? 'bg-brand-600 text-white' : 'bg-slate-50 dark:bg-slate-900 text-slate-300 group-hover:bg-brand-50 group-hover:text-brand-600'}`}>
                                                            {isSelected ? <CheckCircle2 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Right Side: Cart/Current Order */}
                                <div className="w-1/3 flex flex-col bg-white dark:bg-slate-800">
                                    <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Intenção de Compra</h3>
                                        <span className="px-3 py-1 bg-brand-600 text-white rounded-full text-[10px] font-black">{orderItems.length} ITENS</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                                        {orderItems.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                                                <ShoppingBag className="w-16 h-16 mb-4" />
                                                <p className="text-sm font-bold">Nenhum item selecionado</p>
                                                <p className="text-[10px]">Clique nos produtos à esquerda para adicionar</p>
                                            </div>
                                        ) : (
                                            orderItems.map(item => (
                                                <div key={item.product.id} className="p-5 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-700 group">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="max-w-[70%]">
                                                            <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">{item.product.brand}</p>
                                                            <h5 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{item.product.name}</h5>
                                                        </div>
                                                        <button onClick={() => removeItemFromOrder(item.product.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3 mb-2">
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Quantidade</label>
                                                            <input
                                                                type="number"
                                                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-brand-500/20"
                                                                value={item.quantity}
                                                                onChange={(e) => updateItemQty(item.product.id, parseInt(e.target.value) || 0)}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Preço Un. (Custo)</label>
                                                            <input
                                                                type="number"
                                                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-brand-500/20"
                                                                value={item.price}
                                                                onChange={(e) => {
                                                                    const newPrice = parseFloat(e.target.value) || 0;
                                                                    setOrderItems(orderItems.map(i => i.product.id === item.product.id ? { ...i, price: newPrice } : i));
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="text-right text-[10px] font-black text-brand-600">
                                                        Subtotal: R$ {(item.quantity * item.price).toLocaleString()}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="p-8 bg-slate-900 dark:bg-brand-950 text-white rounded-t-[3rem]">
                                        <div className="flex justify-between items-end mb-6">
                                            <div>
                                                <p className="text-[10px] font-black text-white/40 uppercase">Total do Pedido</p>
                                                <p className="text-3xl font-black">R$ {orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0).toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-white/40 uppercase">Markup Estimado</p>
                                                <p className="text-lg font-black text-brand-400">32.5%</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setOrderStep('review')} disabled={orderItems.length === 0} className="w-full py-5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-700 disabled:opacity-50 text-white rounded-3xl font-black text-lg shadow-xl shadow-brand-500/20 transition-all active:scale-95 flex items-center justify-center gap-3">
                                            REVISAR PEDIDO
                                            <ArrowRight className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: REVIEW & PRINT */}
                        {orderStep === 'review' && (
                            <div className="p-10 flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 flex flex-col items-center">
                                <div className="w-full max-w-3xl bg-white dark:bg-slate-800 rounded-[3rem] shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-5">
                                    <div className="p-10 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start">
                                        <div>
                                            <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/30 rounded-[2rem] flex items-center justify-center mb-6 border border-brand-100">
                                                <CheckCircle2 className="w-10 h-10 text-brand-600" />
                                            </div>
                                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">Tudo pronto!</h3>
                                            <p className="text-slate-500 font-bold mt-2">Revise os detalhes finais da ordem de compra para {selectedSupplier?.name}.</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Previsão</span>
                                            <p className="text-xl font-black text-brand-600">7-10 dias úteis</p>
                                        </div>
                                    </div>
                                    <div className="p-10 space-y-8">
                                        <div className="grid grid-cols-2 gap-10">
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumo Financeiro</h4>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-sm font-bold">
                                                        <span className="text-slate-400">Total de Itens</span>
                                                        <span className="dark:text-white">{orderItems.reduce((sum, i) => sum + i.quantity, 0)} un</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm font-bold">
                                                        <span className="text-slate-400">Subtotal de Produtos</span>
                                                        <span className="dark:text-white">R$ {orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between text-lg font-black pt-4 border-t border-slate-100 dark:border-slate-700">
                                                        <span className="text-slate-900 dark:text-white">Valor Final</span>
                                                        <span className="text-brand-600">R$ {orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destino do Pedido</h4>
                                                <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-700">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white mb-1">Centro de Distribuição Principal</p>
                                                    <p className="text-[10px] text-slate-400 leading-relaxed">Rua de Logística, 450 - Galpão 02<br />São Paulo, SP - CEP 01234-567</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => setOrderStep('products')}
                                                className="flex-1 py-5 bg-slate-100 dark:bg-slate-700 text-slate-500 font-black rounded-3xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                                            >
                                                <ArrowLeft className="w-5 h-5" />
                                                EDITAR ITENS
                                            </button>
                                            <button
                                                onClick={finalizeOrder}
                                                className="flex-[2] py-5 bg-black dark:bg-brand-600 text-white font-black rounded-3xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                            >
                                                SALVAR E GERAR PEDIDO
                                                <CheckCircle2 className="w-6 h-6" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const tempOrder = {
                                                        id: 'TEMPORARIO',
                                                        supplier: selectedSupplier?.name,
                                                        date: new Date().toLocaleDateString(),
                                                        items: orderItems.map(i => ({ name: i.product.name, quantity: i.quantity, price: i.price })),
                                                        totalAmount: orderItems.reduce((sum, i) => sum + (i.quantity * i.price), 0)
                                                    };
                                                    handlePrintOrder(tempOrder);
                                                }}
                                                className="p-5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-brand-600 rounded-3xl transition-all"
                                            >
                                                <Printer className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 opacity-50">
                                    <Clock className="w-3 h-3" /> Processado com IA pela Engine StockVision
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* MODAL: TODOS OS ITENS CRÍTICOS */}
            {isCriticalModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" onClick={() => setIsCriticalModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-800 w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                                        <TrendingDown className="w-6 h-6 text-red-600" />
                                    </div>
                                    Todos os Itens Críticos
                                </h2>
                                <p className="text-slate-500 font-bold ml-11 -mt-1 text-sm">{lowStockProducts.length} produtos abaixo do estoque mínimo</p>
                            </div>
                            <button onClick={() => setIsCriticalModalOpen(false)} className="p-3 bg-white dark:bg-slate-700 rounded-full shadow-sm hover:bg-red-50 hover:text-red-500 transition-all active:scale-90">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {lowStockProducts.map(p => (
                                    <div key={p.id} className="p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 hover:border-brand-500/30 transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.brand}</p>
                                                <h4 className="font-bold text-slate-900 dark:text-white">{p.name}</h4>
                                            </div>
                                            <span className="px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-600 text-[10px] font-black rounded-lg uppercase">Crítico</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Estoque Atual: <span className="text-red-500 font-black">{p.total}</span></p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Estoque Mínimo: {p.min_stock || 0}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setIsCriticalModalOpen(false);
                                                    setIsOrderModalOpen(true);
                                                    setSelectedSupplier(suppliers.find(s => s.brands.includes(p.brand)) || null);
                                                    setOrderStep('products');
                                                    addToOrder(p);
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-xs font-black rounded-xl hover:bg-brand-700 transition-all active:scale-95 shadow-lg shadow-brand-500/20"
                                            >
                                                COMPRAR
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {lowStockProducts.length === 0 && (
                                <div className="py-20 flex flex-col items-center justify-center opacity-40">
                                    <CheckCircle2 className="w-20 h-20 text-green-500 mb-4" />
                                    <p className="text-xl font-black">Estoque em dia!</p>
                                    <p className="font-bold">Nenhum produto em nível crítico no momento.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-8 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-700 text-center">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                Dica: Priorize itens da Classe A para melhor retorno sobre o capital
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
