import { useState, useEffect, useMemo } from 'react';
import {
    ShoppingBag,
    TrendingDown,
    AlertTriangle,
    Plus,
    Search,
    ChevronDown,
    Truck,
    CheckCircle2,
    Clock,
    X,
    FileText as FileIcon,
    Download,
    Printer,
    Trash2,
    Edit3,
    ExternalLink,
    ArrowUpRight
} from 'lucide-react';
import {
    ResponsiveContainer,
    ComposedChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
    Area
} from 'recharts';
import { inventoryService } from '../services/inventoryService';
import { Product, Supplier } from '../types';

export const Shopping = () => {
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
    const [brands, setBrands] = useState<string[]>([]);
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [orderStep, setOrderStep] = useState<'brands' | 'products' | 'review'>('brands');
    const [orderBrand, setOrderBrand] = useState<string | null>(null);
    const [suppliers] = useState<Supplier[]>([
        { id: '1', name: 'Aputure Brasil', brands: ['Aputure'], cnpj: '12.345.678/0001-90', email: 'vendas@aputure.com' },
        { id: '2', name: 'Sony Professional', brands: ['Sony'], cnpj: '98.765.432/0001-21', email: 'vendas@sony.com' }
    ]);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    // Mock ongoing orders with details
    const [activeOrders, setActiveOrders] = useState<any[]>([
        {
            id: 'OC-9602',
            supplier: 'Aputure',
            status: 'Processing',
            date: '09/02/2026',
            items: [
                { id: '1', name: 'Aputure 600d Pro', quantity: 5, price: 12000 },
                { id: '2', name: 'Softbox Light Dome II', quantity: 10, price: 1500 }
            ],
            totalAmount: 75000
        },
        {
            id: 'OC-1293',
            supplier: 'Sony Brasil',
            status: 'In Transit',
            date: '25/03/2024',
            totalItemsCount: 12,
            items: [],
            totalAmount: 12500
        }
    ]);

    const handleUpdateItemQuantity = (orderId: string, itemId: string, newQuantity: number) => {
        setActiveOrders(prev => prev.map(order => {
            if (order.id === orderId) {
                return {
                    ...order,
                    items: order.items.map((item: any) =>
                        item.id === itemId ? { ...item, quantity: newQuantity } : item
                    )
                };
            }
            return order;
        }));

        // Update selectedOrder too so UI reflects change immediately
        if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder((prev: any) => ({
                ...prev,
                items: prev.items.map((item: any) =>
                    item.id === itemId ? { ...item, quantity: newQuantity } : item
                )
            }));
        }
    };

    const handlePrintABC = (filterBrand?: string) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const filteredProductsForABC = filterBrand
            ? allProducts.filter(p => p.brand === filterBrand)
            : allProducts;

        const sorted = [...filteredProductsForABC]
            .map(p => ({
                ...p,
                movementValue: (p.total || 0) * (Math.floor(Math.random() * 50) + 10)
            }))
            .sort((a, b) => b.movementValue - a.movementValue);

        const totalValue = sorted.reduce((sum, p) => sum + p.movementValue, 0);
        let cumulativeValue = 0;

        const reportData = sorted.map(p => {
            cumulativeValue += p.movementValue;
            const percentage = (cumulativeValue / totalValue) * 100;
            let classification = 'C';
            if (percentage <= 80) classification = 'A';
            else if (percentage <= 95) classification = 'B';
            return { ...p, percentage, classification };
        });

        const html = `
            <html>
                <head>
                    <title>Relatório Curva ABC - StockVision</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; color: #1e293b; }
                        h1 { color: #0f172a; margin-bottom: 5px; }
                        .subtitle { color: #64748b; margin-bottom: 30px; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { background: #f8fafc; text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 12px; text-transform: uppercase; }
                        td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
                        .class-a { color: #0ea5e9; font-weight: bold; }
                        .class-b { color: #6366f1; font-weight: bold; }
                        .class-c { color: #94a3b8; }
                        .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid #eee; padding-bottom: 20px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <h1>Relatório Curva ABC</h1>
                            <p class="subtitle">Análise de Giro de Estoque ${filterBrand ? `- Marca: ${filterBrand}` : '(Geral)'}</p>
                        </div>
                        <div style="text-align: right; font-size: 12px; color: #94a3b8;">
                            Gerado em: ${new Date().toLocaleString()}
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Marca</th>
                                <th>Estoque Total</th>
                                <th>Acumulado (%)</th>
                                <th>Classe</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reportData.map(item => `
                                <tr>
                                    <td><strong>${item.name}</strong></td>
                                    <td>${item.brand}</td>
                                    <td>${item.total} un</td>
                                    <td>${Math.round(item.percentage * 10) / 10}%</td>
                                    <td class="class-${item.classification.toLowerCase()}">Classe ${item.classification}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <script>window.print();</script>
                </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handlePrintOrder = (order: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
                <head>
                    <title>Ordem de Compra ${order.id}</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; }
                        .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
                        th { background: #f5f5f5; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <h1>Ordem de Compra: ${order.id}</h1>
                            <p>Fornecedor: ${order.supplier}</p>
                            <p>Data: ${order.date}</p>
                        </div>
                        <div style="text-align: right;">
                            <p><strong>StockVision Gestão</strong></p>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Cód</th>
                                <th>Produto</th>
                                <th>Qtd</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items.map((item: any) => `
                                <tr>
                                    <td>${item.id}</td>
                                    <td>${item.name}</td>
                                    <td>${item.quantity} un</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <script>window.print();</script>
                </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handleDeleteOrder = (orderId: string) => {
        if (window.confirm("Deseja realmente excluir esta ordem?")) {
            setActiveOrders(prev => prev.filter(o => o.id !== orderId));
            if (selectedOrder?.id === orderId) setSelectedOrder(null);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [productsData, brandsData] = await Promise.all([
                    inventoryService.getAllProducts(200),
                    inventoryService.getBrands()
                ]);
                setAllProducts(productsData);
                setLowStockProducts(productsData.filter(p => (p.total || 0) < 10));
                setBrands(brandsData);
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // ABC Curve Data Calculation
    const abcData = useMemo(() => {
        if (!allProducts.length) return [];

        // Simulate movement value for the chart to create a realistic ABC curve
        const sorted = [...allProducts]
            .map(p => ({
                ...p,
                movementValue: (p.total || 0) * (Math.floor(Math.random() * 50) + 10)
            }))
            .sort((a, b) => b.movementValue - a.movementValue);

        const totalValue = sorted.reduce((sum, p) => sum + p.movementValue, 0);
        let cumulativeValue = 0;

        return sorted.slice(0, 15).map((p) => {
            cumulativeValue += p.movementValue;
            const percentage = (cumulativeValue / totalValue) * 100;

            let classification = 'C';
            if (percentage <= 80) classification = 'A';
            else if (percentage <= 95) classification = 'B';

            return {
                name: p.name.length > 15 ? p.name.substring(0, 12) + '...' : p.name,
                value: p.movementValue,
                cumulative: Math.round(percentage * 10) / 10,
                class: classification
            };
        });
    }, [allProducts]);

    const filteredProducts = lowStockProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesBrand = !selectedBrand || p.brand === selectedBrand;
        return matchesSearch && matchesBrand;
    });

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 10 }
                        : item
                );
            }
            return [...prev, { product, quantity: 10 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const handleCreateOrder = () => {
        if (cart.length === 0) return;

        const newOrder = {
            id: `OC-${Math.floor(1000 + Math.random() * 9000)}`,
            supplier: selectedSupplier?.name || 'Fornecedor avulso',
            status: 'Processing',
            date: new Date().toLocaleDateString(),
            items: cart.map(c => ({
                id: c.product.id,
                name: c.product.name,
                quantity: c.quantity,
                price: 0 // In a real flow, this might come from a historic price or vendor catalog
            })),
            totalAmount: 0 // Can be improved
        };

        setActiveOrders([newOrder, ...activeOrders]);
        setCart([]);
        setIsModalOpen(false);
        setOrderStep('brands');
        alert(`Ordem ${newOrder.id} gerada com sucesso!`);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12 transition-colors">
            {/* Header Section */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 lg:px-8 py-8 transition-colors">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <ShoppingBag className="w-8 h-8 text-brand-600" />
                                Central de Compras Inteligente
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">
                                Gestão preditiva e controle de suprimentos para o seu estoque.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold transition-all shadow-sm shadow-brand-500/20 active:scale-95"
                            >
                                <Plus className="w-5 h-5" />
                                Nova Ordem de Compra
                            </button>
                        </div>
                    </div>

                    {/* Quick Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Itens Críticos</span>
                                <div className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                                    <AlertTriangle className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">{lowStockProducts.length}</div>
                            <div className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1">
                                <TrendingDown className="w-3 h-3" /> Necessitam atenção imediata
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ordens em Trânsito</span>
                                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                    <Truck className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">5</div>
                            <div className="text-xs text-blue-500 font-medium flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" /> 2 chegadas previstas p/ hoje
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aguardando Aprovação</span>
                                <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                                    <Clock className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">R$ 12.450</div>
                            <div className="text-xs text-slate-500 font-medium mt-1">
                                3 orçamentos pendentes
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Eficiência de Compra</span>
                                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">94%</div>
                            <div className="text-xs text-green-500 font-medium flex items-center gap-1 mt-1">
                                <ArrowUpRight className="w-3 h-3" /> +2% este mês
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* ABC Curve Chart */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Análise de Giro (Curva ABC)</h2>
                                    <p className="text-sm text-slate-500">Produtos com maior impacto operacional</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 rounded-lg">
                                        CLASSE A (80%)
                                    </span>
                                    <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 rounded-lg">
                                        CLASSE B (15%)
                                    </span>
                                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                    <button
                                        onClick={() => handlePrintABC()}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-brand-600 transition-colors"
                                        title="Imprimir Curva Geral"
                                    >
                                        <Printer className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={abcData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                            interval={0}
                                            angle={-30}
                                            textAnchor="end"
                                            height={60}
                                        />
                                        <YAxis
                                            yAxisId="left"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                                        />
                                        <YAxis
                                            yAxisId="right"
                                            orientation="right"
                                            domain={[0, 100]}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#6366f1', fontSize: 10, fontWeight: 700 }}
                                            unit="%"
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1e293b',
                                                border: 'none',
                                                borderRadius: '16px',
                                                color: '#fff',
                                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                                            }}
                                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Bar
                                            yAxisId="left"
                                            dataKey="value"
                                            radius={[6, 6, 0, 0]}
                                            barSize={30}
                                        >
                                            {abcData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.class === 'A' ? '#0ea5e9' : entry.class === 'B' ? '#6366f1' : '#cbd5e1'} />
                                            ))}
                                        </Bar>
                                        <Area
                                            yAxisId="right"
                                            type="monotone"
                                            dataKey="cumulative"
                                            stroke="#6366f1"
                                            strokeWidth={3}
                                            fill="url(#colorCum)"
                                            dot={{ fill: '#6366f1', strokeWidth: 2, r: 4, stroke: '#fff' }}
                                        />
                                        <defs>
                                            <linearGradient id="colorCum" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Sugestões de Reposição</h2>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar produto..."
                                        className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 outline-none w-full sm:w-64 transition-all"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Brand Filter Chips */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                <button
                                    onClick={() => setSelectedBrand(null)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${!selectedBrand
                                        ? 'bg-slate-900 text-white shadow-md dark:bg-brand-600'
                                        : 'bg-white text-slate-500 border border-slate-200 hover:border-brand-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                                        }`}
                                >
                                    Todas as Marcas
                                </button>
                                {brands.map(brand => (
                                    <button
                                        key={brand}
                                        onClick={() => setSelectedBrand(brand === selectedBrand ? null : brand)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${selectedBrand === brand
                                            ? 'bg-brand-600 text-white shadow-md'
                                            : 'bg-white text-slate-500 border border-slate-200 hover:border-brand-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                                            }`}
                                    >
                                        {brand}
                                    </button>
                                ))}
                                {selectedBrand && (
                                    <button
                                        onClick={() => handlePrintABC(selectedBrand)}
                                        className="p-2 ml-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-brand-600 hover:bg-brand-50 transition-all flex items-center gap-1 font-bold text-[10px]"
                                    >
                                        <Printer className="w-4 h-4" />
                                        PDF MARCA
                                    </button>
                                )}
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                                </div>
                            ) : filteredProducts.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {filteredProducts.map(product => (
                                        <div key={product.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all group">
                                            <div className="flex gap-4">
                                                {product.image_url ? (
                                                    <img src={product.image_url} alt={product.name} className="w-16 h-16 rounded-xl object-cover bg-slate-100" />
                                                ) : (
                                                    <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                                        <ShoppingBag className="w-6 h-6 text-slate-300" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between">
                                                        <span className="text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-md truncate max-w-[100px]">
                                                            {product.brand}
                                                        </span>
                                                        <span className={`${product.total === 0 ? 'text-red-600 bg-red-50 dark:bg-red-900/30' : 'text-amber-600 bg-amber-50 dark:bg-amber-900/30'} text-[10px] font-bold px-2 py-0.5 rounded-full uppercase`}>
                                                            {product.total === 0 ? 'Esgotado' : 'Estoque Baixo'}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">{product.name}</h3>
                                                    <p className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">Cód: {product.id}</p>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                                                <div className="text-center flex-1">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Estoque Atual</p>
                                                    <p className={`text-lg font-bold ${product.total < 3 ? 'text-red-500' : 'text-amber-500'}`}>{product.total}</p>
                                                </div>
                                                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                                                <div className="text-center flex-1">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Sugestão</p>
                                                    <p className="text-lg font-bold text-slate-900 dark:text-white">+{Math.max(10, 20 - product.total)}</p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => addToCart(product)}
                                                className="w-full mt-3 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Adicionar à Lista
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700 transition-colors">
                                    <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tudo sob controle!</h3>
                                    <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">Nenhum produto está com estoque abaixo do nível de segurança.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Section */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm transition-colors">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Minha Lista ({cart.length})</h2>
                                {cart.length > 0 && (
                                    <button
                                        onClick={() => handlePrintOrder({
                                            id: 'LISTA-RASCO-Shopping',
                                            supplier: 'Vários / Rascunho',
                                            date: new Date().toLocaleDateString(),
                                            items: cart.map(c => ({ id: c.product.id, name: c.product.name, quantity: c.quantity }))
                                        })}
                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-brand-600 transition-colors"
                                        title="Imprimir Lista"
                                    >
                                        <Printer className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div className="space-y-3">
                                {cart.length === 0 ? (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">Vazio. Adicione itens para criar uma cotação.</p>
                                ) : (
                                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                        {cart.map(item => (
                                            <div key={item.product.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 group">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold truncate">{item.product.name}</p>
                                                    <p className="text-[10px] text-slate-400">Qtd: {item.quantity}</p>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.product.id)}
                                                    className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                disabled={cart.length === 0}
                                className={`w-full mt-4 py-3 text-sm font-bold rounded-2xl transition-all ${cart.length > 0
                                    ? 'bg-slate-900 dark:bg-brand-600 text-white shadow-lg active:scale-95'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                    }`}
                            >
                                Gerar Ordem de Compra
                            </button>
                        </div>

                        <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-3xl p-6 text-white shadow-lg shadow-brand-500/20">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold">Ordens Ativas</h2>
                                <button className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                {activeOrders.map(order => (
                                    <div key={order.id} className="bg-white/10 p-3 rounded-2xl border border-white/10 hover:bg-white/20 transition-all cursor-pointer group relative">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold">{order.id}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${order.status === 'In Transit' ? 'bg-blue-400/30 text-blue-100' : 'bg-amber-400/30 text-amber-100'
                                                }`}>
                                                {order.status === 'In Transit' ? 'Em Transporte' : 'Processando'}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold">{order.supplier}</p>
                                        <div className="flex items-center justify-between mt-2 text-[10px] opacity-80">
                                            <span>{order.items?.length || order.totalItemsCount || 0} itens</span>
                                            <span>Prev. {order.date}</span>
                                        </div>

                                        {/* Action Buttons Overlay */}
                                        <div className="absolute inset-0 bg-brand-800/90 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-all duration-200 backdrop-blur-sm">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                                                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                                                title="Ver Detalhes"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handlePrintOrder(order); }}
                                                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                                                title="Imprimir / PDF"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                                                className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-100 rounded-xl transition-colors border border-red-500/20"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 rounded-3xl p-6 transition-colors">
                            <h3 className="text-amber-800 dark:text-amber-400 font-bold flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-5 h-5" />
                                Dica Inteligente
                            </h3>
                            <p className="text-sm text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                                Baseado no histórico de movimentação, o item **"Tripé de Alumínio"** terá estoque zero em 4 dias. Recomendamos adiantar o pedido.
                            </p>
                        </div>
                    </div>

                </div>
            </main>

            {/* Modal de Nova Ordem de Compra - Fluxo Inteligente */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-800 w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                        {/* Stepper Header */}
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-8">
                                <div className={`flex items-center gap-2 ${orderStep === 'brands' ? 'text-brand-600' : 'text-slate-400'}`}>
                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${orderStep === 'brands' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>1</span>
                                    <span className="font-bold text-sm uppercase tracking-wider">Marcas</span>
                                </div>
                                <div className={`w-8 h-px bg-slate-200 dark:border-slate-700`}></div>
                                <div className={`flex items-center gap-2 ${orderStep === 'products' ? 'text-brand-600' : 'text-slate-400'}`}>
                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${orderStep === 'products' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>2</span>
                                    <span className="font-bold text-sm uppercase tracking-wider">Produtos</span>
                                </div>
                                <div className={`w-8 h-px bg-slate-200 dark:border-slate-700`}></div>
                                <div className={`flex items-center gap-2 ${orderStep === 'review' ? 'text-brand-600' : 'text-slate-400'}`}>
                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${orderStep === 'review' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>3</span>
                                    <span className="font-bold text-sm uppercase tracking-wider">Revisão</span>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10">
                            {/* STEP 1: Seleção de Marca */}
                            {orderStep === 'brands' && (
                                <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                                    <div className="text-center max-w-2xl mx-auto mb-12">
                                        <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Escolha a Marca</h3>
                                        <p className="text-slate-500">Selecione para qual fabricante você deseja gerar o suprimento inteligente hoje.</p>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        {brands.map(brand => (
                                            <button
                                                key={brand}
                                                onClick={() => {
                                                    setOrderBrand(brand);
                                                    setSelectedSupplier(suppliers.find(s => s.brands.includes(brand)) || null);
                                                    setOrderStep('products');
                                                }}
                                                className="group p-8 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900 border-2 border-transparent hover:border-brand-500 hover:bg-white dark:hover:bg-slate-800 transition-all flex flex-col items-center gap-4 text-center"
                                            >
                                                <div className="w-20 h-20 rounded-3xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform">
                                                    <span className="text-2xl font-black text-slate-300 group-hover:text-brand-500">{brand[0]}</span>
                                                </div>
                                                <span className="font-bold text-slate-700 dark:text-slate-200">{brand}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: Lista de Produtos e Sugestão */}
                            {orderStep === 'products' && (
                                <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Reposição Sugerida: {orderBrand}</h3>
                                            <p className="text-slate-500">Ajuste as quantidades recomendadas pela nossa IA.</p>
                                        </div>
                                        <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                                                <Truck className="w-5 h-5 text-brand-500" />
                                            </div>
                                            <div className="pr-4">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Fornecedor Vinculado</p>
                                                <p className="text-sm font-bold dark:text-white">{selectedSupplier?.name || 'Não cadastrado'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {allProducts.filter(p => p.brand === orderBrand).map(product => {
                                            const suggestedQty = (product.total < 10) ? 20 : 0;
                                            return (
                                                <div key={product.id} className="flex items-center gap-6 p-6 bg-slate-50 dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 transition-all hover:border-brand-500/30">
                                                    <div className="w-24 h-24 rounded-3xl bg-white dark:bg-slate-800 overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm flex-shrink-0">
                                                        {product.image_url ? (
                                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                                                                <FileIcon className="w-8 h-8 text-slate-200" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-lg text-slate-900 dark:text-white truncate">{product.name}</h4>
                                                        <div className="flex gap-4 mt-2">
                                                            <div className="px-3 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Em Estoque</span>
                                                                <span className="font-black text-sm dark:text-white">{product.total} un</span>
                                                            </div>
                                                            <div className={`px-3 py-1 rounded-lg border ${product.total < 10 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-600'}`}>
                                                                <span className="text-[10px] font-bold opacity-60 uppercase block">Status</span>
                                                                <span className="font-black text-sm">{product.total < 10 ? 'Crítico' : 'Ok'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2 text-right min-w-[150px]">
                                                        <p className="text-[10px] font-black text-brand-600 uppercase tracking-tighter">Sugestão de Compra</p>
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={() => {
                                                                    const current = cart.find(c => c.product.id === product.id);
                                                                    if (current && current.quantity > 5) {
                                                                        setCart(prev => prev.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity - 5 } : c));
                                                                    } else {
                                                                        removeFromCart(product.id);
                                                                    }
                                                                }}
                                                                className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 transition-colors"
                                                            >
                                                                <span className="font-bold">-</span>
                                                            </button>
                                                            <input
                                                                type="number"
                                                                className="w-16 bg-transparent text-center font-black text-xl focus:outline-none dark:text-white"
                                                                value={cart.find(c => c.product.id === product.id)?.quantity || 0}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    setCart(prev => {
                                                                        const filtered = prev.filter(c => c.product.id !== product.id);
                                                                        return val > 0 ? [...filtered, { product, quantity: val }] : filtered;
                                                                    });
                                                                }}
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const current = cart.find(c => c.product.id === product.id)?.quantity || 0;
                                                                    if (current === 0 && suggestedQty > 0) {
                                                                        setCart(prev => [...prev, { product, quantity: suggestedQty }]);
                                                                    } else {
                                                                        setCart(prev => prev.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 5 } : c));
                                                                    }
                                                                }}
                                                                className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 shadow-lg shadow-brand-500/20 transition-all font-bold"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: REVISÃO E FORNECEDOR */}
                            {orderStep === 'review' && (
                                <div className="space-y-12 animate-in slide-in-from-right-8 duration-500">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                        <div className="space-y-6">
                                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Confirmação do Fornecedor</h3>
                                            <div className="p-8 bg-slate-900 rounded-[3rem] text-white space-y-6">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Dados da Empresa</p>
                                                    <p className="text-2xl font-black">{selectedSupplier?.name || 'Selecione um Fornecedor'}</p>
                                                    <p className="text-slate-400 mt-1">{selectedSupplier?.cnpj || 'CNPJ não informado'}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">E-mail Comercial</p>
                                                        <p className="text-sm font-bold text-blue-400">{selectedSupplier?.email || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Data de Emissão</p>
                                                        <p className="text-sm font-bold">{new Date().toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <button className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-slate-400 font-bold hover:border-brand-500/50 hover:text-brand-600 transition-all flex items-center justify-center gap-2">
                                                <Edit3 className="w-5 h-5" />
                                                Gerenciar Cadastro de Fornecedor
                                            </button>
                                        </div>

                                        <div className="space-y-6">
                                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Resumo Financeiro Estimado</h3>
                                            <div className="p-8 border border-slate-200 dark:border-slate-700 rounded-[3rem] space-y-6">
                                                <div className="space-y-4">
                                                    {cart.map(item => (
                                                        <div key={item.product.id} className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-slate-900 dark:text-white truncate">{item.product.name}</p>
                                                                <p className="text-xs text-slate-500">{item.quantity} unidades</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="pt-6 border-t-2 border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                                    <span className="text-slate-500 font-bold uppercase text-xs tracking-widest">Total de Itens</span>
                                                    <span className="text-2xl font-black text-brand-600">{cart.reduce((sum, i) => sum + i.quantity, 0)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer Controls */}
                        <div className="p-8 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                            <button
                                onClick={() => {
                                    if (orderStep === 'products') setOrderStep('brands');
                                    if (orderStep === 'review') setOrderStep('products');
                                }}
                                className={`px-8 py-3 rounded-2xl font-bold transition-all ${orderStep === 'brands' ? 'opacity-0 pointer-events-none' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                            >
                                Voltar
                            </button>
                            <div className="flex items-center gap-4">
                                <p className="text-sm font-bold text-slate-400">
                                    {orderStep === 'products' ? `${cart.length} itens no rascunho` : ''}
                                </p>
                                <button
                                    onClick={() => {
                                        if (orderStep === 'brands' && orderBrand) setOrderStep('products');
                                        else if (orderStep === 'products') setOrderStep('review');
                                        else if (orderStep === 'review') handleCreateOrder();
                                    }}
                                    disabled={orderStep === 'products' && cart.length === 0}
                                    className="px-10 py-4 bg-slate-900 dark:bg-brand-600 text-white rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                                >
                                    {orderStep === 'review' ? 'Finalizar e Gerar Ordem' : 'Continuar Próxima Etapa'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalhes da Ordem (Visualizar / Editar / Imprimir) */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setSelectedOrder(null)}></div>
                    <div className="relative bg-white dark:bg-slate-800 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedOrder.id}</h2>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedOrder.status === 'In Transit' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                        }`}>
                                        {selectedOrder.status}
                                    </span>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">Fornecedor: <span className="text-slate-900 dark:text-white">{selectedOrder.supplier}</span></p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handlePrintOrder(selectedOrder)}
                                    className="p-3 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-2xl border border-slate-200 dark:border-slate-600 transition-all flex items-center gap-2 font-bold text-sm"
                                >
                                    <Printer className="w-5 h-5" />
                                    Imprimir
                                </button>
                                <button
                                    onClick={() => {
                                        alert("Gerando PDF profissional... O download iniciará em instantes.");
                                        handlePrintOrder(selectedOrder); // Print dialog is the standard way to 'Save as PDF'
                                    }}
                                    className="p-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl shadow-lg transition-all flex items-center gap-2 font-bold text-sm"
                                >
                                    <Download className="w-5 h-5" />
                                    Salvar PDF
                                </button>
                                <button onClick={() => setSelectedOrder(null)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-colors">
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-y-auto max-h-[70vh]">
                            {/* Itens da Ordem */}
                            <div className="lg:col-span-2 space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Itens da Requisição</h3>
                                <div className="space-y-3">
                                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                                        selectedOrder.items.map((item: any) => (
                                            <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 group transition-all hover:border-brand-500/30">
                                                <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                                                    <FileIcon className="w-6 h-6 text-slate-300" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-900 dark:text-white truncate">{item.name}</p>
                                                    <p className="text-xs text-slate-400 font-medium">Ref: {item.id}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Quantidade</p>
                                                        <input
                                                            type="number"
                                                            className="w-20 bg-transparent text-right font-bold text-lg focus:outline-none dark:text-white"
                                                            defaultValue={item.quantity}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value) || 0;
                                                                handleUpdateItemQuantity(selectedOrder.id, item.id, val);
                                                            }}
                                                        />
                                                    </div>
                                                    <button className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-10 text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                                            <p className="text-slate-500">Nenhum item detalhado nesta ordem.</p>
                                        </div>
                                    )}

                                    <button className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-slate-400 font-bold hover:border-brand-500/50 hover:text-brand-600 transition-all flex items-center justify-center gap-2">
                                        <Plus className="w-5 h-5" />
                                        Adicionar Item à Ordem
                                    </button>
                                </div>
                            </div>

                            {/* Sidebar de Status e Timeline */}
                            <div className="space-y-6">
                                <div className="p-6 bg-slate-900 dark:bg-slate-900/80 rounded-[2rem] text-white">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-tighter">Status do Fluxo</h4>
                                    <div className="space-y-4">
                                        <div className="flex gap-3">
                                            <div className="flex flex-col items-center">
                                                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                                </div>
                                                <div className="w-0.5 h-8 bg-green-500/30 my-1"></div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">Ordem Criada</p>
                                                <p className="text-[10px] text-slate-400">{selectedOrder.date}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="flex flex-col items-center">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedOrder.status === 'Processing' ? 'bg-brand-500 animate-pulse' : 'bg-green-500'}`}>
                                                    <Clock className="w-4 h-4 text-white" />
                                                </div>
                                                <div className="w-0.5 h-8 bg-slate-700 my-1"></div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">Processando</p>
                                                <p className="text-[10px] text-slate-400">Aguardando fornecedor</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 opacity-40">
                                            <div className="flex flex-col items-center">
                                                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                                                    <Truck className="w-4 h-4 text-white" />
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">Em Transporte</p>
                                                <p className="text-[10px] text-slate-400">Rastreio pendente</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 border border-slate-200 dark:border-slate-700 rounded-[2rem] space-y-4">
                                    <button
                                        onClick={() => {
                                            alert("Alterações salvas com sucesso!");
                                            setSelectedOrder(null);
                                        }}
                                        className="w-full py-4 bg-slate-900 dark:bg-brand-600 text-white rounded-2xl font-bold shadow-lg hover:scale-[1.02] transition-all"
                                    >
                                        Salvar Alterações
                                    </button>
                                    <button
                                        onClick={() => handleDeleteOrder(selectedOrder.id)}
                                        className="w-full py-3 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all flex items-center justify-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Excluir Ordem
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
