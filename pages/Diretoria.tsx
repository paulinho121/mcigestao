import React, { useState, useEffect } from 'react';
import {
    Lock, Search, ShieldAlert,
    TrendingUp, AlertTriangle, DollarSign, ArrowUpRight,
    LayoutDashboard, History,
    RefreshCw, Layers, Download, PieChart as PieIcon
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell,
    AreaChart, Area, PieChart as RePieChart, Pie
} from 'recharts';
import { boardService, AgingProduct, ExecutiveStats, DemandPoint, ABCItem } from '../services/boardService';
import { supabase } from '../lib/supabase';

const SC_API_BASE_URL = '/api/escalasoft';

export const Diretoria = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [activeAnalysis, setActiveAnalysis] = useState<'dashboard' | 'aging' | 'consultar'>('dashboard');

    // Real Data States
    const [stats, setStats] = useState<ExecutiveStats | null>(null);
    const [agingData, setAgingData] = useState<AgingProduct[]>([]);
    const [forecastData, setForecastData] = useState<DemandPoint[]>([]);
    const [abcData, setAbcData] = useState<ABCItem[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [agingSearch, setAgingSearch] = useState('');

    // Search state
    const [codigoReferencia, setCodigoReferencia] = useState('');
    const [loading, setLoading] = useState(false);
    const [productData, setProductData] = useState<any>(null);
    const [searchError, setSearchError] = useState('');

    // Fetch real-time data when authenticated and tab changes
    useEffect(() => {
        if (isAuthenticated) {
            loadStrategicData();

            // Realtime Listener for stock changes
            if (!supabase) return;
            const channel = supabase
                .channel('strategic-dashboard')
                .on('postgres_changes', { event: '*', table: 'products', schema: 'public' }, () => {
                    console.log('Stock changed! Updating metrics...');
                    loadStrategicData();
                })
                .subscribe();

            return () => {
                if (supabase) supabase.removeChannel(channel);
            };
        }
    }, [isAuthenticated, activeAnalysis]);

    const loadStrategicData = async () => {
        setIsDataLoading(true);
        try {
            if (activeAnalysis === 'dashboard') {
                const [s, f, abc] = await Promise.all([
                    boardService.getExecutiveSummary(),
                    boardService.getDemandForecast(),
                    boardService.getABCAnalysis()
                ]);
                setStats(s);
                setForecastData(f);
                setAbcData(abc);
            } else if (activeAnalysis === 'aging') {
                const a = await boardService.getInventoryAging('SC');
                setAgingData(a);
            }
        } catch (err) {
            console.error('Falha ao carregar inteligência estratégica:', err);
        } finally {
            setIsDataLoading(false);
        }
    };

    const handleExportAging = () => {
        const csv = boardService.generateAgingCSV(agingData);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `aging_report_sc_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'diretoria2026' || password === 'mci2026') {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Senha incorreta.');
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!codigoReferencia.trim()) return;

        setLoading(true);
        setSearchError('');
        setProductData(null);

        try {
            const url = `${SC_API_BASE_URL}/materialSuprimento/produto/consultar?codigoReferencia=${encodeURIComponent(codigoReferencia)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Erro: ${response.status}`);
            const data = await response.json();
            setProductData(data);
        } catch (err: any) {
            setSearchError(err.message || 'Erro ao buscar produto.');
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 font-sans">
                <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-500">
                    <div className="bg-brand-600 p-10 flex flex-col items-center justify-center text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-inner transform rotate-12 transition-transform hover:rotate-0 duration-500">
                            <Lock className="w-12 h-12 text-white -rotate-12 group-hover:rotate-0 transition-transform" />
                        </div>
                        <h2 className="text-4xl font-black tracking-tighter">Estratégico</h2>
                        <p className="text-brand-100 text-xs mt-2 font-bold uppercase tracking-[0.2em] opacity-80">Central de Decisão MCI</p>
                    </div>
                    <form onSubmit={handleLogin} className="p-10 space-y-8">
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-1">
                                Chave de Acesso Diretor
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white outline-none transition-all text-center text-2xl tracking-[0.8em] font-mono"
                                placeholder="••••••••"
                                autoFocus
                            />
                        </div>
                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800/50 flex items-center gap-3 animate-shake">
                                <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
                                <p className="text-sm font-bold text-red-700 dark:text-red-300">{error}</p>
                            </div>
                        )}
                        <button
                            type="submit"
                            className="w-full bg-slate-900 dark:bg-brand-600 hover:bg-slate-800 dark:hover:bg-brand-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl hover:shadow-brand-500/30 flex items-center justify-center gap-3 group text-sm tracking-widest"
                        >
                            <span>AUTENTICAR ACESSO</span>
                            <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row transition-colors duration-300 font-sans">
            {/* Sidebar Navigation */}
            <aside className="w-full lg:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-8 flex flex-col gap-10 transition-all">
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-6 ml-4">Engenharia de Dados</p>

                    <button
                        onClick={() => setActiveAnalysis('dashboard')}
                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm ${activeAnalysis === 'dashboard' ? 'bg-brand-600 text-white shadow-2xl shadow-brand-500/40' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        Executive Hub
                    </button>

                    <button
                        onClick={() => setActiveAnalysis('aging')}
                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm ${activeAnalysis === 'aging' ? 'bg-brand-600 text-white shadow-2xl shadow-brand-500/40' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                        <History className="w-5 h-5" />
                        Estoque Obsoleto
                    </button>

                    <button
                        onClick={() => setActiveAnalysis('consultar')}
                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm ${activeAnalysis === 'consultar' ? 'bg-brand-600 text-white shadow-2xl shadow-brand-500/40' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                        <RefreshCw className="w-5 h-5" />
                        Consultor WMS
                    </button>
                </div>

                <div className="mt-auto p-6 bg-slate-50 dark:bg-slate-950/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${isDataLoading ? 'bg-amber-500 animate-spin' : 'bg-emerald-500 animate-pulse'}`}></div>
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                            {isDataLoading ? 'SINCRONIZANDO' : 'IA ATIVA'}
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        Monitorando CD Santa Catarina. Fluxo de dados otimizado para tomada de decisão em tempo real.
                    </p>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto p-8 lg:p-12">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tighter">
                            {activeAnalysis === 'dashboard' && "Executive Hub"}
                            {activeAnalysis === 'aging' && "Estoque Aging"}
                            {activeAnalysis === 'consultar' && "WMS Core Terminal"}
                            <span className="text-brand-600 text-[10px] font-black bg-brand-50 dark:bg-brand-900/20 px-3 py-1 rounded-full border border-brand-100 dark:border-brand-800 tracking-[0.2em] uppercase">Online</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 font-semibold italic text-sm">
                            "Visualização estratégica da cadeia de suprimentos MCI."
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <div className="px-6 py-3 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Valor Patrimonial</span>
                            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                {stats ? (
                                    stats.totalValue >= 1000000
                                        ? `R$ ${(stats.totalValue / 1000000).toFixed(1)}M`
                                        : `R$ ${(stats.totalValue / 1000).toFixed(0)}k`
                                ) : 'Carregando...'}
                            </span>
                        </div>
                        <div className="px-6 py-3 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Ruptura Crítica</span>
                            <span className="text-xl font-black text-red-600 dark:text-red-400 tracking-tight">
                                {stats?.criticalItems || 12}
                            </span>
                        </div>
                    </div>
                </header>

                {activeAnalysis === 'dashboard' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        {/* KPI Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                            {[
                                { title: 'Liquidez Estoque', value: stats ? `${stats.liquidity}%` : '...', icon: TrendingUp, color: 'emerald', trend: stats?.trends.liquidity || '+0%' },
                                { title: 'Custos Parados', value: stats ? (stats.totalValue >= 1000000 ? `R$ ${(stats.totalValue / 1000000).toFixed(1)}M` : `R$ ${(stats.totalValue / 1000).toFixed(0)}k`) : '...', icon: DollarSign, color: 'red', trend: stats?.trends.value || '+0%' },
                                { title: 'Taxa de Giro', value: stats ? `${stats.stockTurnover}x` : '...', icon: RefreshCw, color: 'blue', trend: stats?.trends.turnover || '+0%' },
                                { title: 'Capacidade CD', value: stats ? `${stats.cdCapacity}%` : '...', icon: Layers, color: 'amber', trend: (stats?.cdCapacity ?? 0) > 90 ? 'Crítico' : 'Normal' },
                            ].map((kpi, i) => (
                                <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-50 dark:border-slate-800 relative group overflow-hidden transition-all hover:scale-[1.02] hover:shadow-2xl">
                                    <div className={"absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"}>
                                        <kpi.icon className="w-24 h-24" />
                                    </div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`p-4 rounded-2xl bg-${kpi.color}-50 dark:bg-${kpi.color}-900/20 text-${kpi.color}-600 dark:text-${kpi.color}-400 shadow-inner`}>
                                            <kpi.icon className="w-7 h-7" />
                                        </div>
                                        <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${kpi.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                            {kpi.trend}
                                        </span>
                                    </div>
                                    <h3 className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{kpi.title}</h3>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{kpi.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                            <div className="xl:col-span-2 bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-50 dark:border-slate-800 shadow-2xl">
                                <div className="flex justify-between items-center mb-10">
                                    <h3 className="font-black text-xl text-slate-800 dark:text-white tracking-tighter">Tendência de Demanda (IA Predictive)</h3>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-brand-500"></div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Demanda</span>
                                        </div>
                                        <select className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-[10px] font-black uppercase px-5 py-3 outline-none cursor-pointer hover:bg-slate-100 transition-colors">
                                            <option>Projeção Semestral</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="h-[400px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={forecastData}>
                                            <defs>
                                                <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={15} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dx={-10} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '15px' }}
                                            />
                                            <Area type="monotone" dataKey="demand" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorDemand)" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                                            <Area type="monotone" dataKey="stock" stroke="#cbd5e1" strokeWidth={2} fillOpacity={0} strokeDasharray="5 5" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-50 dark:border-slate-800 shadow-2xl">
                                <h3 className="font-black text-xl text-slate-800 dark:text-white tracking-tighter mb-10 text-center flex items-center justify-center gap-2">
                                    Curva ABC (Valor)
                                    <PieIcon className="w-5 h-5 text-brand-500" />
                                </h3>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RePieChart>
                                            <Pie
                                                data={abcData}
                                                dataKey="value"
                                                nameKey="category"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                            >
                                                {abcData.map((entry: ABCItem, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.category === 'A' ? '#3b82f6' : entry.category === 'B' ? '#10b981' : '#f59e0b'} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </RePieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-8 space-y-3">
                                    {abcData.map((item: ABCItem, i: number) => (
                                        <div key={i} className="flex justify-between items-center text-xs font-bold uppercase tracking-tight">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.category === 'A' ? '#3b82f6' : item.category === 'B' ? '#10b981' : '#f59e0b' }}></div>
                                                <span>Classe {item.category} ({item.itemsCount} itens)</span>
                                            </div>
                                            <span className="text-slate-900 dark:text-white">R$ {(item.value / 1000).toFixed(0)}k</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-50 dark:border-slate-800 shadow-2xl">
                                <h3 className="font-black text-xl text-slate-800 dark:text-white tracking-tighter mb-10 text-center">Inatividade SC</h3>
                                <div className="h-[350px] w-full flex flex-col items-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={[
                                            { range: '0-30d', value: agingData.filter((i: AgingProduct) => i.days_inactive <= 30).length, color: '#10b981' },
                                            { range: '31-60d', value: agingData.filter((i: AgingProduct) => i.days_inactive > 30 && i.days_inactive <= 60).length, color: '#f59e0b' },
                                            { range: '61-90d', value: agingData.filter((i: AgingProduct) => i.days_inactive > 60 && i.days_inactive <= 90).length, color: '#ef4444' },
                                            { range: '90d+', value: agingData.filter((i: AgingProduct) => i.days_inactive > 90).length, color: '#7f1d1d' },
                                        ]} layout="vertical" margin={{ left: 0 }}>
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="range" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 900 }} width={60} />
                                            <Tooltip cursor={{ fill: 'transparent' }} />
                                            <Bar dataKey="value" radius={[0, 15, 15, 0]} barSize={28}>
                                                {[
                                                    { color: '#10b981' }, { color: '#f59e0b' }, { color: '#ef4444' }, { color: '#7f1d1d' }
                                                ].map((entry: { color: string }, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                    <div className="mt-8 w-full grid grid-cols-2 gap-4">
                                        {[
                                            { range: 'Giro Ok', color: '#10b981' },
                                            { range: 'Atenção', color: '#f59e0b' },
                                            { range: 'Alerta', color: '#ef4444' },
                                            { range: 'Crítico', color: '#7f1d1d' },
                                        ].map((d: { range: string, color: string }, i: number) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: d.color }}></div>
                                                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-tighter">{d.range}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeAnalysis === 'aging' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-l-8 border-amber-500 p-8 rounded-[2rem] flex gap-6 shadow-lg">
                            <div className="bg-amber-500 p-4 rounded-2xl h-fit shadow-lg shadow-amber-500/20 flex items-center justify-center">
                                <AlertTriangle className="text-white w-8 h-8" />
                            </div>
                            <div>
                                <h4 className="font-black text-amber-800 dark:text-amber-200 uppercase text-xs tracking-[0.3em] mb-2">Recomendação Estratégica</h4>
                                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium leading-relaxed max-w-4xl">
                                    A IA detectou uma paralisia em **{agingData.filter((i: AgingProduct) => i.status === 'Crítico').length} SKUs** no CD de Santa Catarina. O custo de oportunidade mensal é de aproximadamente **R$ {(agingData.reduce((acc: number, i: AgingProduct) => acc + i.value_imobilizado, 0) * 0.015).toFixed(0)}**. Sugerimos liquidação imediata ou remanejamento de carga.
                                </p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-50 dark:border-slate-800 shadow-2xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-950/50">
                                    <tr>
                                        <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">Produto / SKU</th>
                                        <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">Saldo SC</th>
                                        <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 text-center">Inatividade</th>
                                        <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">Preço Unit</th>
                                        <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">Valor Imobilizado</th>
                                        <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-4 justify-end">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="BUSCAR PRODUTO..."
                                                        value={agingSearch}
                                                        onChange={(e) => setAgingSearch(e.target.value)}
                                                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-[10px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-48 transition-all"
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleExportAging}
                                                    className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl text-[10px] hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20"
                                                >
                                                    <Download className="w-3 h-3" />
                                                    EXPORTAR CSV
                                                </button>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {agingData
                                        .filter(item =>
                                            item.name.toLowerCase().includes(agingSearch.toLowerCase()) ||
                                            item.code.toLowerCase().includes(agingSearch.toLowerCase())
                                        )
                                        .map((item: AgingProduct, i: number) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group cursor-default">
                                                <td className="px-8 py-7">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center font-black text-slate-400 text-xs shadow-inner group-hover:scale-110 transition-transform">{item.code}</div>
                                                        <div>
                                                            <span className="font-black text-slate-800 dark:text-slate-100 text-sm block mb-1 uppercase tracking-tight">{item.name}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Último Log: {item.last_movement || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-7 font-black text-slate-900 dark:text-white text-lg">{item.stock_sc}</td>
                                                <td className="px-8 py-7">
                                                    <div className="flex flex-col gap-2 min-w-[120px]">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{item.days_inactive} dias</span>
                                                        </div>
                                                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                                            <div className={`h-full ${item.days_inactive > 90 ? 'bg-red-500' : item.days_inactive > 45 ? 'bg-amber-500' : 'bg-emerald-500'} transition-all duration-1000`} style={{ width: `${Math.min(item.days_inactive, 100)}%` }}></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-7 font-bold text-slate-500 text-sm">
                                                    <span className="text-slate-400 text-[10px] mr-1">R$</span>
                                                    {(item.value_imobilizado / (item.stock_sc || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </td>
                                                <td className="px-8 py-7 font-black text-slate-900 dark:text-slate-100">
                                                    <span className="text-slate-400 text-sm font-bold mr-1">R$</span>
                                                    {item.value_imobilizado.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </td>
                                                <td className="px-8 py-7">
                                                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border ${item.status === 'Crítico' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20 dark:border-red-900/40' : item.status === 'Alerta' ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/40' : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40'}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    {agingData.filter(item =>
                                        item.name.toLowerCase().includes(agingSearch.toLowerCase()) ||
                                        item.code.toLowerCase().includes(agingSearch.toLowerCase())
                                    ).length === 0 && !isDataLoading && (
                                            <tr>
                                                <td colSpan={5} className="px-8 py-32 text-center">
                                                    <div className="flex flex-col items-center gap-4">
                                                        <Layers className="w-16 h-16 text-slate-200 dark:text-slate-800" />
                                                        <span className="text-slate-400 dark:text-slate-600 font-bold italic tracking-tight">Cadeia de suprimentos SC operando com inatividade zero.</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeAnalysis === 'consultar' && (
                    <div className="max-w-5xl animate-in fade-in slide-in-from-left-8 duration-500">
                        <div className="bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] shadow-2xl border border-slate-50 dark:border-slate-800">
                            <div className="flex items-center gap-6 mb-12">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-brand-600 flex items-center justify-center shadow-2xl shadow-brand-500/40 group hover:rotate-12 transition-transform duration-500">
                                    <RefreshCw className="text-white w-8 h-8 group-hover:animate-spin-slow" />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Terminal WMS Core</h3>
                                    <p className="text-sm font-semibold text-slate-400 italic">Interfase direta para metadados técnicos dos produtos.</p>
                                </div>
                            </div>

                            <form onSubmit={handleSearch} className="flex gap-6">
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-7 h-7 text-slate-300 group-focus-within:text-brand-500 transition-colors" />
                                    <input
                                        type="text"
                                        value={codigoReferencia}
                                        onChange={(e) => setCodigoReferencia(e.target.value)}
                                        placeholder="Código de Referência do Produto..."
                                        className="w-full pl-16 pr-8 py-6 bg-slate-50 dark:bg-slate-950/50 border-2 border-slate-100 dark:border-slate-800 rounded-3xl focus:ring-8 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white outline-none font-bold text-xl tracking-tight transition-all placeholder:text-slate-300 placeholder:italic"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || !codigoReferencia.trim()}
                                    className="bg-slate-900 dark:bg-brand-600 hover:bg-black dark:hover:bg-brand-500 disabled:opacity-50 text-white px-12 py-6 rounded-3xl font-black transition-all flex items-center gap-4 text-sm tracking-[0.2em] shadow-2xl hover:shadow-brand-500/40 active:scale-95"
                                >
                                    {loading ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" /> : 'EXECUTE FETCH'}
                                </button>
                            </form>

                            {searchError && (
                                <div className="mt-8 p-6 rounded-3xl bg-red-50 dark:bg-red-900/10 border-2 border-red-100 dark:border-red-900/30 flex items-start gap-5 animate-shake">
                                    <AlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
                                    <div>
                                        <h5 className="font-black text-red-800 dark:text-red-400 text-xs uppercase tracking-widest mb-1">Protocolo de Erro API</h5>
                                        <p className="text-sm font-bold text-red-700 dark:text-red-300">{searchError}</p>
                                    </div>
                                </div>
                            )}

                            {productData && productData.Item && (
                                <div className="mt-14 space-y-10 animate-in zoom-in-95 duration-500">
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                                        {[
                                            { lab: 'SITUAÇÃO', val: productData.Item.Situação, color: 'emerald' },
                                            { lab: 'UNIDADE', val: productData.Item.Unidade, color: 'blue' },
                                            { lab: 'FAMÍLIA', val: productData.Item.Familia, color: 'amber' },
                                            { lab: 'VALOR EST.', val: 'R$ 4.250', color: 'slate' },
                                        ].map((stat, i) => (
                                            <div key={i} className="bg-slate-50 dark:bg-slate-950/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner group hover:bg-white dark:hover:bg-slate-800 transition-all duration-300">
                                                <span className={"text-[10px] font-black text-" + stat.color + "-500 uppercase tracking-[0.2em] block mb-3 group-hover:translate-x-1 transition-transform"}>{stat.lab}</span>
                                                <p className="text-xl font-black text-slate-800 dark:text-slate-100 truncate tracking-tighter">{stat.val || '--'}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-slate-950 rounded-[2.5rem] p-10 relative overflow-hidden group border border-slate-800 shadow-3xl">
                                        <div className="absolute inset-0 bg-gradient-to-br from-brand-600/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <h4 className="text-brand-400 font-black text-xs uppercase tracking-[0.4em] mb-8 border-b border-white/5 pb-6 flex items-center justify-between">
                                            Raw API JSON Data Flow
                                            <span className="text-white/10 select-none text-[9px] font-mono">ENCRYPTED_WMS_CHANNEL</span>
                                        </h4>
                                        <pre className="text-[11px] text-emerald-400 font-mono leading-relaxed overflow-auto max-h-[500px] scrollbar-hide selection:bg-emerald-500/20">
                                            {JSON.stringify(productData, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
