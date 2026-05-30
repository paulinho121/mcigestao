import { useState, useEffect } from 'react';
import { Login } from './pages/Login';
import { Inventory } from './pages/Inventory';
import { Reservations } from './pages/Reservations';
import { Upload } from './pages/Upload';
import { Maintenance } from './pages/Maintenance';
import { InImport } from './pages/InImport';
import { ImportManagement } from './pages/ImportManagement';
import { RentalManagement } from './pages/RentalManagement';
import { Shopping } from './pages/Shopping';
import { Suppliers } from './pages/Suppliers';
import { Brands } from './pages/Brands';
import { ActivityLogs } from './pages/ActivityLogs';
import { Tracking } from './pages/Tracking';
import { Catalogs } from './pages/Catalogs';
import { Diretoria } from './pages/Diretoria';
import { StockManagement } from './pages/StockManagement';
import { NfeAutomation } from './pages/NfeAutomation';
import { ProductRegistration } from './pages/ProductRegistration';
import { Withdrawals } from './pages/Withdrawals';
import EnrichmentReview from './pages/EnrichmentReview';
import { PreVenda } from './pages/PreVenda';
import { PedidosCD } from './pages/PedidosCD';
import { CotacaoFrete } from './pages/CotacaoFrete';
import { PreSaleAlertBanner } from './components/PreSaleAlertBanner';
// import { nfeService } from './services/nfeService';
import { User } from './types';
import { isMasterUser } from './config/masterUsers';
import { Package, ClipboardList, Wrench, LogOut, Ship, ShoppingBag, FileText, Sun, Moon, Users, Truck, BookOpen, Menu, BarChart3, PackagePlus, Image as ImageIcon, Upload as UploadIcon, Layers, ArrowDownUp, CalendarClock, Tag, FileCode2, Activity, PackageSearch, Calculator } from 'lucide-react';
import { supabase } from './lib/supabase';
import { Analytics } from '@vercel/analytics/react';
import { useTheme } from './context/ThemeContext';
import { CircleMenu, CircleMenuItem } from './components/ui/circle-menu';

type Tab = 'inventory' | 'reservations' | 'withdrawals' | 'in_import' | 'tracking' | 'catalogs' | 'upload' | 'maintenance' | 'import_management' | 'rental_management' | 'shopping' | 'logs' | 'suppliers' | 'brands' | 'diretoria' | 'stock_management' | 'nfe_automation' | 'product_registration' | 'image_review' | 'pre_venda' | 'pedidos_cd' | 'cotacao_frete';

function BackgroundMesh() {
  return null;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('inventory');
  const [isMaster, setIsMaster] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'mock' | 'error'>('checking');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [preSaleAlertTrigger] = useState(0);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    // Check for persisted session
    const checkSession = async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          const userData = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email.split('@')[0]
          };
          setUser(userData);
          setIsMaster(isMasterUser(userData.email));
        }
      } else {
        // Fallback for mock mode
        const storedUser = localStorage.getItem('stockvision_user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsMaster(isMasterUser(parsedUser.email));
        }
      }
      setLoading(false);
    };

    checkSession();

    // Check connection status
    const checkConnection = async () => {
      if (!supabase) {
        setConnectionStatus('mock');
        return;
      }
      try {
        const { error } = await supabase.from('products').select('*', { count: 'exact', head: true });
        if (error) throw error;
        setConnectionStatus('connected');
      } catch (err) {
        console.error('Connection check failed:', err);
        setConnectionStatus('error');
      }
    };
    checkConnection();

    // Listen for auth changes
    if (supabase) {
      // @ts-ignore
      const authListener = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        if (session?.user?.email) {
          const userData = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email.split('@')[0]
          };
          setUser(userData);
          setIsMaster(isMasterUser(userData.email));
        } else {
          setUser(null);
          setIsMaster(false);
        }
      }) as any;

      return () => {
        if (authListener?.subscription?.unsubscribe) {
          authListener.subscription.unsubscribe();
        } else if (authListener?.data?.subscription?.unsubscribe) {
          authListener.data.subscription.unsubscribe();
        } else if (authListener?.unsubscribe) {
          authListener.unsubscribe();
        }
      };
    }
  }, []);

  // Background SEFAZ Sync for Master Users (DISABLED TO AVOID AUTH POPUPS)
  /*
  useEffect(() => {
    if (isMaster && connectionStatus === 'connected') {
      const runSync = async () => {
        try {
          console.log('Background SEFAZ Sync started...');
          await nfeService.syncFromSefaz();
        } catch (err) {
          console.error('Background sync failed:', err);
        }
      };

      // Delay slightly to not interfere with initial load
      const timer = setTimeout(runSync, 5000);
      return () => clearTimeout(timer);
    }
  }, [isMaster, connectionStatus]);
  */

  const handleLogin = (email: string, name?: string) => {
    // This is mainly for mock mode or immediate UI update
    const fakeUser = { id: '1', email, name: name || email.split('@')[0] };
    setUser(fakeUser);
    setIsMaster(isMasterUser(email));
    localStorage.setItem('stockvision_user', JSON.stringify(fakeUser));
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setIsMaster(false);
    localStorage.removeItem('stockvision_user');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-slate-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const navigate = (tab: Tab) => { setActiveTab(tab); setIsMenuOpen(false); };

  const circleMenuItems: CircleMenuItem[] = [
    {
      label: 'Estoque',
      icon: <Package size={20} />,
      onClick: () => navigate('inventory'),
      colorClass: 'bg-brand-600 hover:bg-brand-700',
      subItems: isMaster ? [
        { label: 'Estoque', icon: <Package size={20} />, onClick: () => navigate('inventory'), colorClass: 'bg-brand-600 hover:bg-brand-700' },
        { label: 'Gestão', icon: <BarChart3 size={20} />, onClick: () => navigate('stock_management'), colorClass: 'bg-brand-500 hover:bg-brand-600' },
        { label: 'Cadastro', icon: <PackagePlus size={20} />, onClick: () => navigate('product_registration'), colorClass: 'bg-brand-700 hover:bg-brand-800' },
        { label: 'Imagens', icon: <ImageIcon size={20} />, onClick: () => navigate('image_review'), colorClass: 'bg-cyan-600 hover:bg-cyan-700' },
      ] : undefined,
    },
    {
      label: 'Catálogos',
      icon: <BookOpen size={20} />,
      onClick: () => navigate('catalogs'),
      colorClass: 'bg-teal-600 hover:bg-teal-700',
    },
    {
      label: 'Reservas',
      icon: <ClipboardList size={20} />,
      onClick: () => navigate('reservations'),
      colorClass: 'bg-indigo-600 hover:bg-indigo-700',
      subItems: isMaster ? [
        { label: 'Reservas', icon: <ClipboardList size={20} />, onClick: () => navigate('reservations'), colorClass: 'bg-indigo-600 hover:bg-indigo-700' },
        { label: 'Retiradas', icon: <ArrowDownUp size={20} />, onClick: () => navigate('withdrawals'), colorClass: 'bg-indigo-500 hover:bg-indigo-600' },
      ] : undefined,
    },
    {
      label: 'Importação',
      icon: <Ship size={20} />,
      onClick: () => navigate('in_import'),
      colorClass: 'bg-sky-600 hover:bg-sky-700',
      subItems: [
        { label: 'Importação', icon: <Ship size={20} />, onClick: () => navigate('in_import'), colorClass: 'bg-sky-600 hover:bg-sky-700' },
        { label: 'Upload', icon: <UploadIcon size={20} />, onClick: () => navigate('upload'), colorClass: 'bg-sky-500 hover:bg-sky-600' },
        { label: 'Gestão', icon: <Layers size={20} />, onClick: () => navigate('import_management'), colorClass: 'bg-sky-700 hover:bg-sky-800' },
      ],
    },
    {
      label: 'Rastreamento',
      icon: <Truck size={20} />,
      onClick: () => navigate('tracking'),
      colorClass: 'bg-violet-600 hover:bg-violet-700',
      subItems: [
        { label: 'Rastreamento', icon: <Truck size={20} />, onClick: () => navigate('tracking'), colorClass: 'bg-violet-600 hover:bg-violet-700' },
        { label: 'Cotação Frete', icon: <Calculator size={20} />, onClick: () => navigate('cotacao_frete'), colorClass: 'bg-violet-500 hover:bg-violet-600' },
        { label: 'Locações', icon: <CalendarClock size={20} />, onClick: () => navigate('rental_management'), colorClass: 'bg-violet-400 hover:bg-violet-500' },
      ],
    },
    {
      label: 'Diretoria',
      icon: <FileText size={20} />,
      onClick: () => navigate('diretoria'),
      colorClass: 'bg-slate-600 hover:bg-slate-700',
    },
    ...(isMaster ? [
      {
        label: 'Manutenção',
        icon: <Wrench size={20} />,
        onClick: () => navigate('maintenance'),
        colorClass: 'bg-amber-600 hover:bg-amber-700',
        subItems: [
          { label: 'Manutenção', icon: <Wrench size={20} />, onClick: () => navigate('maintenance'), colorClass: 'bg-amber-600 hover:bg-amber-700' },
          { label: 'NF-e', icon: <FileCode2 size={20} />, onClick: () => navigate('nfe_automation'), colorClass: 'bg-amber-500 hover:bg-amber-600' },
          { label: 'Logs', icon: <Activity size={20} />, onClick: () => navigate('logs'), colorClass: 'bg-amber-700 hover:bg-amber-800' },
        ],
      },
      {
        label: 'Compras',
        icon: <ShoppingBag size={20} />,
        onClick: () => navigate('shopping'),
        colorClass: 'bg-rose-600 hover:bg-rose-700',
      },
      {
        label: 'Pré-Venda',
        icon: <Tag size={20} />,
        onClick: () => navigate('pre_venda'),
        colorClass: 'bg-red-700 hover:bg-red-800',
      },
      {
        label: 'Pedidos CD',
        icon: <PackageSearch size={20} />,
        onClick: () => navigate('pedidos_cd'),
        colorClass: 'bg-orange-600 hover:bg-orange-700',
      },
      {
        label: 'Fornecedores',
        icon: <Users size={20} />,
        onClick: () => navigate('suppliers'),
        colorClass: 'bg-emerald-600 hover:bg-emerald-700',
        subItems: [
          { label: 'Fornecedores', icon: <Users size={20} />, onClick: () => navigate('suppliers'), colorClass: 'bg-emerald-600 hover:bg-emerald-700' },
          { label: 'Marcas', icon: <Tag size={20} />, onClick: () => navigate('brands'), colorClass: 'bg-emerald-500 hover:bg-emerald-600' },
        ],
      },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-[var(--skeuo-bg)] transition-colors duration-200">
      <BackgroundMesh />

      {/* Circle Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setIsMenuOpen(false)}
          />
          {/* Circle Menu centralizado */}
          <div className="relative z-10">
            <CircleMenu
              items={circleMenuItems}
              onClose={() => setIsMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-col min-h-screen">
        {/* Banner de alerta de pré-venda (somente master) */}
        {isMaster && (
          <PreSaleAlertBanner
            refreshTrigger={preSaleAlertTrigger}
            onNavigateToPreVenda={() => navigate('pre_venda')}
          />
        )}

        {/* Header */}
        <header className="skeuo-flat sticky top-0 z-40 dark:border-none transition-colors duration-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Hamburger */}
                <button
                  onClick={() => setIsMenuOpen(true)}
                  className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                  title="Abrir menu"
                >
                  <Menu className="w-6 h-6" />
                </button>

                <div className="flex items-center gap-3">
                  <img
                    src="/logo.png"
                    alt="MC"
                    className="h-8 sm:h-10 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const fallback = document.createElement('div');
                        fallback.className = "flex items-end leading-none select-none";
                        fallback.innerHTML = `
                          <div class="relative flex items-center">
                             <span class="text-2xl sm:text-3xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-tr from-brand-600 to-accent-DEFAULT italic" style="font-family: sans-serif;">MC</span>
                             <div class="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-accent-DEFAULT rounded-full mb-2 sm:mb-3 -ml-0.5"></div>
                          </div>
                        `;
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                  <div className="h-6 w-px bg-slate-200 hidden sm:block dark:bg-slate-700"></div>
                  <div className="hidden sm:flex flex-col justify-center">
                    <span className="text-sm font-bold text-slate-700 leading-none dark:text-slate-200">Estoque MCI</span>
                    <span className="text-[10px] text-slate-400 leading-none mt-1">Gestão Corporativa</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="hidden sm:block text-right">
                  {connectionStatus === 'connected' && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">● Online</span>}
                </div>

                <div className="flex flex-col items-end justify-center">
                  <div className="hidden md:block text-right">
                    <div className="text-[10px] text-slate-400">Logado como</div>
                    <div className="text-xs font-semibold text-brand-700 dark:text-brand-400 truncate max-w-[120px]">{user.name || user.email}</div>
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    {user.email === 'paulofernandoautomacao@gmail.com' && (
                      <img src="/ceara_logo.png" alt="Ceará SC" className="h-5 w-auto" />
                    )}
                    {user.email === 'logisticasp@mcistore.com.br' && (
                      <img src="/santos_logo.png" alt="Santos FC" className="h-5 w-auto" />
                    )}
                    {user.email === 'logistica@mcistore.com.br' && (
                      <img src="/fortaleza_logo.png" alt="Fortaleza EC" className="h-5 w-auto" />
                    )}
                    {user.email === 'comercial2@mcistore.com.br' && (
                      <img src="/palmeiras_logo.png" alt="Palmeiras" className="h-5 w-auto" />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors dark:hover:bg-slate-700 dark:hover:text-amber-400"
                  >
                    {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Sair"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          {activeTab === 'inventory' && <Inventory userEmail={user.email} />}
          {activeTab === 'reservations' && <Reservations userEmail={user.email} userName={user.name} isMasterUser={isMaster} />}
          {activeTab === 'withdrawals' && isMaster && <Withdrawals userEmail={user.email} />}
          {activeTab === 'in_import' && <InImport />}
          {activeTab === 'upload' && <Upload />}
          {activeTab === 'maintenance' && <Maintenance />}
          {activeTab === 'import_management' && <ImportManagement />}
          {activeTab === 'rental_management' && <RentalManagement />}
          {activeTab === 'shopping' && <Shopping />}
          {activeTab === 'suppliers' && <Suppliers />}
          {activeTab === 'brands' && <Brands />}
          {activeTab === 'logs' && <ActivityLogs />}
          {activeTab === 'tracking' && <Tracking />}
          {activeTab === 'catalogs' && <Catalogs />}
          {activeTab === 'diretoria' && <Diretoria />}
          {activeTab === 'stock_management' && isMaster && <StockManagement userEmail={user.email} />}
          {activeTab === 'nfe_automation' && isMaster && <NfeAutomation />}
          {activeTab === 'product_registration' && isMaster && <ProductRegistration />}
          {activeTab === 'image_review' && isMaster && <EnrichmentReview />}
          {activeTab === 'pre_venda' && isMaster && <PreVenda />}
          {activeTab === 'pedidos_cd' && isMaster && <PedidosCD isMaster={isMaster} />}
          {activeTab === 'cotacao_frete' && <CotacaoFrete />}
        </main>
      </div>

      <Analytics />
    </div>
  );
}

export default App;
