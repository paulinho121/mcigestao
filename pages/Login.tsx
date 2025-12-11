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
    <div className="min-h-screen bg-gradient-to-br from-brand-600 via-brand-500 to-accent-DEFAULT dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative circles */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white dark:bg-slate-700/20 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accent-300 dark:bg-brand-900/40 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>

      <div className="max-w-md w-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden z-10 border border-white/50 dark:border-slate-700/50 transition-colors">
        <div className="bg-white/50 dark:bg-slate-800/50 pt-12 pb-8 px-8 text-center border-b border-slate-100 dark:border-slate-700">
          {/* Logo Placement */}
          <div className="flex justify-center mb-6">
            <img
              src="/logo.png"
              alt="MC Logo"
              className="h-24 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const fallback = document.createElement('div');
                  fallback.className = "flex items-end leading-none select-none";
                  fallback.innerHTML = `
                     <div class="relative">
                        <span class="text-7xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-tr from-brand-600 to-accent-DEFAULT italic pr-2" style="font-family: sans-serif;">MC</span>
                        <div class="w-4 h-4 bg-accent-DEFAULT rounded-full absolute -top-1 -right-1 shadow-sm"></div>
                        <span class="text-xs text-slate-400 absolute -top-2 -right-4 font-normal">®</span>
                     </div>
                   `;
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Estoque MCI</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
          {mode === 'login' ? 'Acesse o portal corporativo' : 'Crie sua conta de acesso'}
        </p>
      </div>

      <div className="p-8 pt-6">
        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setSuccess('');
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${mode === 'login'
              ? 'bg-white dark:bg-slate-600 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <Mail className="w-4 h-4 inline mr-2" />
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
              setSuccess('');
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${mode === 'register'
              ? 'bg-white dark:bg-slate-600 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <UserPlus className="w-4 h-4 inline mr-2" />
            Registrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nome Completo</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-brand-500 transition-colors" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-slate-50 dark:bg-slate-700 focus:bg-white dark:focus:bg-slate-600 text-slate-900 dark:text-white outline-none dark:placeholder-slate-400"
                  placeholder="Seu nome completo"
                  required={mode === 'register'}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {mode === 'login' ? 'Email Corporativo' : 'Email'}
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-brand-500 transition-colors" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-slate-50 dark:bg-slate-700 focus:bg-white dark:focus:bg-slate-600 text-slate-900 dark:text-white outline-none dark:placeholder-slate-400"
                placeholder="usuario@empresa.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {mode === 'login' ? 'Senha de Acesso' : 'Senha (mín. 6 caracteres)'}
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-brand-500 transition-colors" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-slate-50 dark:bg-slate-700 focus:bg-white dark:focus:bg-slate-600 text-slate-900 dark:text-white outline-none dark:placeholder-slate-400"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Confirmar Senha</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-brand-500 transition-colors" />
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-slate-50 dark:bg-slate-700 focus:bg-white dark:focus:bg-slate-600 text-slate-900 dark:text-white outline-none dark:placeholder-slate-400"
                  placeholder="••••••••"
                  required={mode === 'register'}
                />
              </div>
            </div>
          )}

          {success && (
            <div className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-200 dark:border-green-800 flex items-center">
              <span className="mr-2">✓</span> {success}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-800 flex items-center animate-shake">
              <span className="mr-2">⚠️</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-brand-500/20 text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:to-brand-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 active:scale-[0.98]"
          >
            {loading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : mode === 'login' ? (
              <>
                Acessar Sistema <ArrowRight className="ml-2 w-4 h-4" />
              </>
            ) : (
              <>
                Criar Conta <UserPlus className="ml-2 w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
      <div className="px-8 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 text-center">
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">MC Sistemas &copy; {new Date().getFullYear()} • Todos os direitos reservados</p>
      </div>
    </div>
  );
};