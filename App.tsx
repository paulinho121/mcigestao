import { useState, useEffect } from 'react';
import { Login } from './pages/Login';
import { Inventory } from './pages/Inventory';
import { Reservations } from './pages/Reservations';
import { Upload } from './pages/Upload';
import { Maintenance } from './pages/Maintenance';
import { User } from './types';
import { isMasterUser } from './config/masterUsers';
import { Package, ClipboardList, Upload as UploadIcon, Wrench, LogOut } from 'lucide-react';

type Tab = 'inventory' | 'reservations' | 'upload' | 'maintenance';

import { supabase } from './lib/supabase';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('inventory');
  const [isMaster, setIsMaster] = useState(false);

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

    // Listen for auth changes
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
      });

      return () => subscription.unsubscribe();
    }
  }, []);

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
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <img
                src="/logo.png"
                alt="MC"
                className="h-10 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = document.createElement('div');
                    fallback.className = "flex items-end leading-none select-none";
                    fallback.innerHTML = `
                      <div class="relative flex items-center">
                         <span class="text-3xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-tr from-brand-600 to-accent-DEFAULT italic" style="font-family: sans-serif;">MC</span>
                         <div class="w-2 h-2 bg-accent-DEFAULT rounded-full mb-3 -ml-0.5"></div>
                      </div>
                    `;
                    parent.appendChild(fallback);
                  }
                }}
              />
              <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
              <div className="flex flex-col justify-center hidden sm:flex">
                <span className="text-sm font-bold text-slate-700 leading-none">Estoque MCI</span>
                <span className="text-xs text-slate-400 leading-none mt-1">Gestão Corporativa</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:block text-right">
                <div className="text-xs text-slate-400">Logado como</div>
                <div className="text-sm font-semibold text-brand-700">{user.name || user.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-full text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors border border-transparent hover:border-brand-100"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-0.5 sm:gap-1 -mb-px overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-3 font-semibold transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'inventory'
                ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
            >
              <Package className="w-5 h-5" />
              <span className="hidden sm:inline">Consulta de Estoque</span>
              <span className="sm:hidden text-xs">Consulta</span>
            </button>
            <button
              onClick={() => setActiveTab('reservations')}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-3 font-semibold transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'reservations'
                ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
            >
              <ClipboardList className="w-5 h-5" />
              <span className="hidden sm:inline">Reservas</span>
              <span className="sm:hidden text-xs">Reservas</span>
            </button>

            {/* Master User Only Tabs */}
            {isMaster && (
              <>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-3 font-semibold transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'upload'
                    ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <UploadIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">Upload</span>
                  <span className="sm:hidden text-xs">Upload</span>
                </button>
                <button
                  onClick={() => setActiveTab('maintenance')}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-3 font-semibold transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'maintenance'
                    ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <Wrench className="w-5 h-5" />
                  <span className="hidden sm:inline">Manutenção</span>
                  <span className="sm:hidden text-xs">Manutenção</span>
                </button>
              </>
            )}

            <div className="flex-1"></div>
          </div>
        </div>
      </header>

      {/* Content */}
      {activeTab === 'inventory' && <Inventory userEmail={user.email} />}
      {activeTab === 'reservations' && <Reservations userEmail={user.email} userName={user.name} isMasterUser={isMaster} />}
      {activeTab === 'upload' && <Upload />}
      {activeTab === 'maintenance' && <Maintenance />}
    </div>
  );
}

export default App;