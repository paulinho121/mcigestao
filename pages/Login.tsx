import { useState } from 'react';
import { Lock, Mail, ArrowRight, UserPlus, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: (email: string, name?: string) => void;
}

type AuthMode = 'login' | 'register';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!supabase) {
        // Mock mode - just validate and login
        if (email && password) {
          setTimeout(() => {
            onLogin(email);
          }, 800);
        } else {
          setError('Por favor, insira e-mail e senha.');
          setLoading(false);
        }
        return;
      }

      // Real Supabase authentication
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('Email ou senha incorretos. Tente novamente.');
        setLoading(false);
        return;
      }

      if (data.user) {
        const userName = data.user.user_metadata?.name || data.user.email?.split('@')[0] || '';
        onLogin(data.user.email || email, userName);
      }
    } catch (err: any) {
      setError('Erro ao fazer login. Tente novamente.');
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      if (!supabase) {
        // Mock mode - simulate registration
        setTimeout(() => {
          setSuccess('Conta criada com sucesso! Você pode fazer login agora.');
          setMode('login');
          setPassword('');
          setConfirmPassword('');
          setName('');
          setLoading(false);
        }, 1000);
        return;
      }

      // Real Supabase registration
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message || 'Erro ao criar conta.');
        setLoading(false);
        return;
      }

      if (data.user) {
        setSuccess('Conta criada com sucesso! Verifique seu email para confirmar.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setName('');
      }

      setLoading(false);
    } catch (err: any) {
      setError('Erro ao criar conta. Tente novamente.');
      setLoading(false);
    }
  };

  const handleSubmit = mode === 'login' ? handleLogin : handleRegister;

  return (
    <div className="min-h-screen bg-[var(--app-bg)] flex flex-col items-center justify-center p-4 gap-4">
      <div className="w-full max-w-md skeuo-flat z-10 overflow-hidden border border-white/10" style={{ borderRadius: 'var(--radius-modal)' }}>

        {/* Header */}
        <div className="pt-10 pb-6 px-8 text-center border-b border-black/5 dark:border-white/5">
          <div className="flex justify-center mb-6">
            <img
              src="/logo.png"
              alt="MC Logo"
              className="h-20 object-contain drop-shadow-md"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const fallback = document.createElement('div');
                  fallback.className = "flex items-end leading-none select-none";
                  fallback.innerHTML = `
                    <div class="relative">
                      <span class="text-6xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-tr from-brand-600 to-brand-400 italic pr-2" style="font-family: sans-serif;">MC</span>
                      <div class="w-3 h-3 bg-brand-500 rounded-full absolute -top-1 -right-1 shadow-sm"></div>
                    </div>
                  `;
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Estoque MCI</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {mode === 'login' ? 'Acesse o portal corporativo' : 'Crie sua conta de acesso'}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {/* Mode Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-600 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-all duration-200 ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-600 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Registrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nome Completo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-slate-700/60 dark:text-white text-sm"
                    placeholder="Seu nome"
                    required={mode === 'register'}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {mode === 'login' ? 'Email Corporativo' : 'Email'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-slate-700/60 dark:text-white text-sm"
                  placeholder="nome@empresa.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-slate-700/60 dark:text-white text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirmar Senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-slate-700/60 dark:text-white text-sm"
                    placeholder="••••••••"
                    required={mode === 'register'}
                  />
                </div>
              </div>
            )}

            {success && (
              <div className="flex gap-3 items-start rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-3">
                <span className="mt-0.5 text-green-500 font-bold text-sm">✓</span>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">{success}</p>
              </div>
            )}

            {error && (
              <div className="flex gap-3 items-start rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3">
                <span className="mt-0.5 text-red-500 font-bold text-sm">!</span>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:to-brand-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : mode === 'login' ? (
                <span className="flex items-center gap-2">Acessar Sistema <ArrowRight className="w-4 h-4" /></span>
              ) : (
                <span className="flex items-center gap-2">Criar Conta <UserPlus className="w-4 h-4" /></span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-black/5 dark:border-white/5">
          <p className="text-xs text-center text-slate-400">
            MC Sistemas &copy; {new Date().getFullYear()} • Todos os direitos reservados
          </p>
        </div>
      </div>

      {/* Link de rastreamento público — separado do fluxo de autenticação */}
      <button
        type="button"
        onClick={() => window.location.hash = '/tracking'}
        className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"></path>
        </svg>
        Rastrear carga sem login
      </button>
    </div>
  );
};