import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EmailConfirmationProps {
    onNavigateToLogin: () => void;
}

type ConfirmationStatus = 'loading' | 'success' | 'error' | 'already_confirmed';

export const EmailConfirmation: React.FC<EmailConfirmationProps> = ({ onNavigateToLogin }) => {
    const [status, setStatus] = useState<ConfirmationStatus>('loading');
    const [message, setMessage] = useState('Verificando sua confirmação...');
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        const handleEmailConfirmation = async () => {
            try {
                if (!supabase) {
                    setStatus('error');
                    setMessage('Serviço de autenticação não disponível.');
                    return;
                }

                // Get the current session to check if email is confirmed
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error('Session error:', sessionError);
                    setStatus('error');
                    setMessage('Erro ao verificar a confirmação. Por favor, tente fazer login.');
                    return;
                }

                if (session?.user) {
                    // Check if email is confirmed
                    if (session.user.email_confirmed_at) {
                        setStatus('success');
                        setMessage('Email confirmado com sucesso! Você será redirecionado para o login.');
                    } else {
                        setStatus('error');
                        setMessage('Email ainda não confirmado. Verifique seu email e clique no link de confirmação.');
                    }
                } else {
                    // No session means we need to check URL parameters
                    const hashParams = new URLSearchParams(window.location.hash.substring(1));
                    const accessToken = hashParams.get('access_token');
                    const type = hashParams.get('type');

                    if (type === 'signup' && accessToken) {
                        // Email confirmation successful
                        setStatus('success');
                        setMessage('Email confirmado com sucesso! Você será redirecionado para o login.');
                    } else if (type === 'recovery') {
                        setStatus('error');
                        setMessage('Este é um link de recuperação de senha, não de confirmação de email.');
                    } else {
                        setStatus('error');
                        setMessage('Link de confirmação inválido ou expirado. Por favor, solicite um novo email de confirmação.');
                    }
                }
            } catch (error) {
                console.error('Confirmation error:', error);
                setStatus('error');
                setMessage('Erro ao processar confirmação. Por favor, tente novamente.');
            }
        };

        handleEmailConfirmation();
    }, []);

    // Countdown and auto-redirect on success
    useEffect(() => {
        if (status === 'success') {
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        onNavigateToLogin();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [status, onNavigateToLogin]);

    const getStatusIcon = () => {
        switch (status) {
            case 'loading':
                return <Loader2 className="w-20 h-20 text-brand-500 animate-spin" />;
            case 'success':
                return <CheckCircle className="w-20 h-20 text-green-500" />;
            case 'error':
            case 'already_confirmed':
                return <XCircle className="w-20 h-20 text-red-500" />;
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'loading':
                return 'from-brand-600 via-brand-500 to-accent-DEFAULT';
            case 'success':
                return 'from-green-600 via-green-500 to-emerald-400';
            case 'error':
            case 'already_confirmed':
                return 'from-red-600 via-red-500 to-orange-400';
        }
    };

    return (
        <div className={`min-h-screen bg-gradient-to-br ${getStatusColor()} flex items-center justify-center p-4 relative overflow-hidden transition-colors`}>
            {/* Background decorative circles */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white dark:bg-slate-700/20 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-white dark:bg-slate-700/20 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>

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
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Confirmação de Email</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                    Estoque MCI
                </p>
            </div>

            <div className="p-8 pt-10 pb-10">
                {/* Status Icon */}
                <div className="flex justify-center mb-6">
                    {getStatusIcon()}
                </div>

                {/* Status Message */}
                <div className="text-center mb-8">
                    <p className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                        {status === 'loading' && 'Processando...'}
                        {status === 'success' && 'Confirmação Concluída!'}
                        {(status === 'error' || status === 'already_confirmed') && 'Ops!'}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {message}
                    </p>
                </div>

                {/* Countdown for success */}
                {status === 'success' && (
                    <div className="text-center mb-6">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Redirecionando em <span className="font-bold text-brand-600 dark:text-brand-400">{countdown}</span> segundo{countdown !== 1 ? 's' : ''}...
                        </p>
                    </div>
                )}

                {/* Action Button */}
                <button
                    onClick={onNavigateToLogin}
                    className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-brand-500/20 text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:to-brand-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all transform hover:-translate-y-0.5 active:scale-[0.98]"
                >
                    {status === 'success' ? 'Ir para Login Agora' : 'Voltar para Login'}
                    <ArrowRight className="ml-2 w-4 h-4" />
                </button>

                {/* Additional help for errors */}
                {(status === 'error' || status === 'already_confirmed') && (
                    <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
                            <strong>Precisa de ajuda?</strong><br />
                            Se você não recebeu o email de confirmação, verifique sua pasta de spam ou solicite um novo email fazendo login e reenviando a confirmação.
                        </p>
                    </div>
                )}
            </div>

            <div className="px-8 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">MC Sistemas &copy; {new Date().getFullYear()} • Todos os direitos reservados</p>
            </div>
        </div>
    );
};
