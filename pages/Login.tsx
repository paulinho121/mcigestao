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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-600/20 via-slate-900 to-slate-900"></div>

      {/* Background decorative circles - managed z-index/opacity */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-500/10 rounded-full blur-3xl opacity-30"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accent-500/10 rounded-full blur-3xl opacity-30"></div>

      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl z-10 overflow-hidden border border-slate-200 dark:border-slate-700 mx-auto">

        {/* Header Section */}
        <div className="pt-10 pb-6 px-8 text-center bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
          <div className="flex justify-center mb-6">
            <img
              src="/logo.png"
              alt="MC Logo"
              className="h-20 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const fallback = document.createElement('div');
                  fallback.className = "flex items-end leading-none select-none";
                  fallback.innerHTML = `
                     <div class="relative">
                        <span class="text-6xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-tr from-brand-600 to-accent-DEFAULT italic pr-2" style="font-family: sans-serif;">MC</span>
                        <div class="w-3 h-3 bg-accent-DEFAULT rounded-full absolute -top-1 -right-1 shadow-sm"></div>
                     </div>
                   `;
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Estoque MCI</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {mode === 'login' ? 'Acesse o portal corporativo' : 'Crie sua conta de acesso'}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {/* Mode Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg mb-8">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
                setSuccess('');
              }}
              className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-all duration-200 ${mode === 'login'
                  ? 'bg-white dark:bg-slate-600 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
                setSuccess('');
              }}
              className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-all duration-200 ${mode === 'register'
                  ? 'bg-white dark:bg-slate-600 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              Registrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-slate-700 dark:text-white sm:text-sm"
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
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-slate-700 dark:text-white sm:text-sm"
                  placeholder="nome@empresa.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-slate-700 dark:text-white sm:text-sm"
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
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-slate-700 dark:text-white sm:text-sm"
                    placeholder="••••••••"
                    required={mode === 'register'}
                  />
                </div>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-green-400">✓</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">{success}</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-red-400">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:to-brand-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs text-center text-slate-500 dark:text-slate-400">
            MC Sistemas &copy; {new Date().getFullYear()} • Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
};