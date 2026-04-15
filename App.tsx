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
import { nfeService } from './services/nfeService';
import { User } from './types';
import { isMasterUser } from './config/masterUsers';
import { Package, ClipboardList, Upload as UploadIcon, Wrench, LogOut, Ship, Container, CalendarClock, ShoppingBag, FileText, Sun, Moon, Users, Tag, Truck, BookOpen, MapPin, Menu, X, ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react';
import { supabase } from './lib/supabase';
import { Analytics } from '@vercel/analytics/react';
import { useTheme } from './context/ThemeContext';

type Tab = 'inventory' | 'reservations' | 'in_import' | 'tracking' | 'catalogs' | 'upload' | 'maintenance' | 'import_management' | 'rental_management' | 'shopping' | 'logs' | 'suppliers' | 'brands' | 'diretoria' | 'stock_management' | 'nfe_automation';

// Helper Components for the New Navigation
function NavGroup({ title, icon, children, isExpanded, onToggle, id }: {
  title: string,
  icon: React.ReactNode,
  children: React.ReactNode,
  isExpanded: boolean,
  onToggle: (id: string) => void,
  id: string
}) {
  return (
    <div className="space-y-1">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </div>
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {isExpanded && (
        <div className="space-y-0.5 ml-2 border-l-2 border-slate-100 dark:border-slate-800 pl-2 animate-in fade-in slide-in-from-left-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: {
  active: boolean,
  onClick: () => void,
  icon: React.ReactNode,
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all ${active
          ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 shadow-sm ring-1 ring-brand-200/50'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
        }`}
    >
      <span className={active ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}>{icon}</span>
      <span className="text-sm truncate">{label}</span>
    </button>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('inventory');
  const [isMaster, setIsMaster] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'mock' | 'error'>('checking');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['estoque']);
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm dark:bg-slate-800 dark:border-slate-700 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Hamburger Menu Icon */}
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
                <div className="flex flex-col justify-center hidden xs:flex">
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

      {/* Side Drawer (Navigation) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          />

          <div className="absolute inset-y-0 left-0 max-w-xs w-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">M</div>
                <span className="font-bold text-slate-800 dark:text-white">Menu Principal</span>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Content */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4">

              {/* Group 1: Estoque */}
              <NavGroup
                title="Estoque & Catálogos"
                id="estoque"
                icon={<Package className="w-4 h-4" />}
                isExpanded={expandedGroups.includes('estoque')}
                onToggle={(id) => setExpandedGroups(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
              >
                <NavButton
                  active={activeTab === 'inventory'}
                  onClick={() => { setActiveTab('inventory'); setIsMenuOpen(false); }}
                  icon={<Package className="w-4 h-4" />}
                  label="Consulta de Estoque"
                />
                <NavButton
                  active={activeTab === 'catalogs'}
                  onClick={() => { setActiveTab('catalogs'); setIsMenuOpen(false); }}
                  icon={<BookOpen className="w-4 h-4" />}
                  label="Catálogos de Produtos"
                />
              </NavGroup>

              {/* Group 2: Logística */}
              <NavGroup
                title="Logística & Operações"
                id="logistica"
                icon={<Ship className="w-4 h-4" />}
                isExpanded={expandedGroups.includes('logistica')}
                onToggle={(id) => setExpandedGroups(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
              >
                <NavButton
                  active={activeTab === 'reservations'}
                  onClick={() => { setActiveTab('reservations'); setIsMenuOpen(false); }}
                  icon={<ClipboardList className="w-4 h-4" />}
                  label="Minhas Reservas"
                />
                <NavButton
                  active={activeTab === 'in_import'}
                  onClick={() => { setActiveTab('in_import'); setIsMenuOpen(false); }}
                  icon={<Ship className="w-4 h-4" />}
                  label="Produtos em Importação"
                />
                <NavButton
                  active={activeTab === 'tracking'}
                  onClick={() => { setActiveTab('tracking'); setIsMenuOpen(false); }}
                  icon={<Truck className="w-4 h-4" />}
                  label="Rastreamento Logístico"
                />
                {isMaster && (
                  <NavButton
                    active={activeTab === 'import_management'}
                    onClick={() => { setActiveTab('import_management'); setIsMenuOpen(false); }}
                    icon={<Container className="w-4 h-4" />}
                    label="Gestão de Importação"
                  />
                )}
                {isMaster && (
                  <NavButton
                    active={activeTab === 'nfe_automation'}
                    onClick={() => { setActiveTab('nfe_automation'); setIsMenuOpen(false); }}
                    icon={<ShieldCheck className="w-4 h-4" />}
                    label="Automação SEFAZ"
                  />
                )}
              </NavGroup>

              {/* Group 3: Administração */}
              {isMaster && (
                <NavGroup
                  title="Gestão Comercial"
                  id="gestao"
                  icon={<ShoppingBag className="w-4 h-4" />}
                  isExpanded={expandedGroups.includes('gestao')}
                  onToggle={(id) => setExpandedGroups(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                >
                  <NavButton
                    active={activeTab === 'shopping'}
                    onClick={() => { setActiveTab('shopping'); setIsMenuOpen(false); }}
                    icon={<ShoppingBag className="w-4 h-4" />}
                    label="Planejamento de Compras"
                  />
                  <NavButton
                    active={activeTab === 'suppliers'}
                    onClick={() => { setActiveTab('suppliers'); setIsMenuOpen(false); }}
                    icon={<Users className="w-4 h-4" />}
                    label="Cadastro Fornecedores"
                  />
                  <NavButton
                    active={activeTab === 'brands'}
                    onClick={() => { setActiveTab('brands'); setIsMenuOpen(false); }}
                    icon={<Tag className="w-4 h-4" />}
                    label="Gestão de Marcas"
                  />
                  <NavButton
                    active={activeTab === 'stock_management'}
                    onClick={() => { setActiveTab('stock_management'); setIsMenuOpen(false); }}
                    icon={<MapPin className="w-4 h-4" />}
                    label="Gestão de Filiais"
                  />
                </NavGroup>
              )}

              {/* Group 4: Serviços */}
              <NavGroup
                title="Serviços & Suporte"
                id="servicos"
                icon={<Wrench className="w-4 h-4" />}
                isExpanded={expandedGroups.includes('servicos')}
                onToggle={(id) => setExpandedGroups(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
              >
                {isMaster && (
                  <NavButton
                    active={activeTab === 'rental_management'}
                    onClick={() => { setActiveTab('rental_management'); setIsMenuOpen(false); }}
                    icon={<CalendarClock className="w-4 h-4" />}
                    label="Gestão de Locação"
                  />
                )}
                {isMaster && (
                  <NavButton
                    active={activeTab === 'maintenance'}
                    onClick={() => { setActiveTab('maintenance'); setIsMenuOpen(false); }}
                    icon={<Wrench className="w-4 h-4" />}
                    label="Painel de Manutenção"
                  />
                )}
                {isMaster && (
                  <NavButton
                    active={activeTab === 'upload'}
                    onClick={() => { setActiveTab('upload'); setIsMenuOpen(false); }}
                    icon={<UploadIcon className="w-4 h-4" />}
                    label="Importar Dados (Excel)"
                  />
                )}
              </NavGroup>

              {/* Group 5: Sistema */}
              <NavGroup
                title="Sistema & Relatórios"
                id="sistema"
                icon={<FileText className="w-4 h-4" />}
                isExpanded={expandedGroups.includes('sistema')}
                onToggle={(id) => setExpandedGroups(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
              >
                <NavButton
                  active={activeTab === 'diretoria'}
                  onClick={() => { setActiveTab('diretoria'); setIsMenuOpen(false); }}
                  icon={<Package className="w-4 h-4" />}
                  label="Painel Diretoria"
                />
                {isMaster && (
                  <NavButton
                    active={activeTab === 'logs'}
                    onClick={() => { setActiveTab('logs'); setIsMenuOpen(false); }}
                    icon={<FileText className="w-4 h-4" />}
                    label="Logs de Atividade"
                  />
                )}
              </NavGroup>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold border border-brand-200 dark:border-brand-800">
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{user.name || 'Usuário'}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-lg bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors font-semibold"
              >
                <LogOut className="w-4 h-4" />
                Sair do Sistema
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === 'inventory' && <Inventory userEmail={user.email} />}
      {activeTab === 'reservations' && <Reservations userEmail={user.email} userName={user.name} isMasterUser={isMaster} />}
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
      <Analytics />
    </div>
  );
}

export default App;