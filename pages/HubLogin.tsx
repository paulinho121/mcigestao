import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getMyHubCompany, clearHubCompanyCache, HubCompany } from '../services/hubService';

interface HubLoginProps {
    onLogin: (company: HubCompany) => void;
}

export function HubLogin({ onLogin }: HubLoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Check if already logged in as hub user
    useEffect(() => {
        const checkSession = async () => {
            if (!supabase) return;
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                clearHubCompanyCache();
                const company = await getMyHubCompany();
                if (company) {
                    onLogin(company);
                }
            }
        };
        checkSession();
    }, [onLogin]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!supabase) {
            setError('Sistema temporariamente indisponível.');
            setLoading(false);
            return;
        }

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password,
            });

            if (authError) {
                if (authError.message.includes('Invalid login')) {
                    setError('Email ou senha incorretos.');
                } else {
                    setError(authError.message);
                }
                setLoading(false);
                return;
            }

            if (data.user) {
                clearHubCompanyCache();
                const company = await getMyHubCompany();
                if (!company) {
                    // User exists in auth but is not a hub company user — block access
                    await supabase.auth.signOut();
                    setError('Este usuário não tem acesso ao HUB de Locadoras. Entre em contato com a MCI.');
                    setLoading(false);
                    return;
                }
                onLogin(company);
            }
        } catch (err) {
            setError('Erro inesperado. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Animated background orbs */}
            <div style={{
                position: 'absolute', top: '-20%', left: '-10%',
                width: '600px', height: '600px',
                background: 'radial-gradient(circle, rgba(102,126,234,0.15) 0%, transparent 70%)',
                borderRadius: '50%',
                animation: 'hubPulse 8s ease-in-out infinite',
            }} />
            <div style={{
                position: 'absolute', bottom: '-20%', right: '-10%',
                width: '500px', height: '500px',
                background: 'radial-gradient(circle, rgba(240,147,251,0.12) 0%, transparent 70%)',
                borderRadius: '50%',
                animation: 'hubPulse 10s ease-in-out infinite reverse',
            }} />

            {/* Grid pattern overlay */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
                backgroundSize: '50px 50px',
            }} />

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        @keyframes hubPulse {
          0%, 100% { transform: scale(1) translate(0,0); opacity: 0.6; }
          50% { transform: scale(1.1) translate(2%, 2%); opacity: 1; }
        }
        @keyframes hubSlideIn {
          from { opacity: 0; transform: translateY(30px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes hubShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .hub-card { animation: hubSlideIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .hub-input:focus {
          outline: none;
          border-color: #818cf8 !important;
          box-shadow: 0 0 0 3px rgba(129,140,248,0.25) !important;
        }
        .hub-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 40px rgba(102,126,234,0.5) !important;
        }
        .hub-btn:active { transform: translateY(0); }
        .hub-error { animation: hubShake 0.4s ease-out; }
      `}</style>

            <div className="hub-card" style={{
                width: '100%',
                maxWidth: '440px',
                margin: '20px',
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.12)',
                padding: '48px 40px',
                boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
                position: 'relative',
                zIndex: 10,
            }}>
                {/* Logo / Brand */}
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '72px', height: '72px',
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        borderRadius: '20px',
                        marginBottom: '20px',
                        boxShadow: '0 8px 32px rgba(102,126,234,0.4)',
                    }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                    </div>
                    <div style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        letterSpacing: '4px',
                        textTransform: 'uppercase',
                        color: '#818cf8',
                        marginBottom: '8px',
                    }}>Portal Locadoras</div>
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: '800',
                        color: 'white',
                        margin: 0,
                        letterSpacing: '-0.5px',
                        background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>HUB MCI</h1>
                    <p style={{
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '14px',
                        marginTop: '8px',
                        lineHeight: '1.5',
                    }}>
                        Marketplace de estoque entre locadoras parceiras
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: 'rgba(255,255,255,0.6)',
                            marginBottom: '8px',
                            letterSpacing: '0.5px',
                        }}>
                            EMAIL
                        </label>
                        <input
                            type="email"
                            className="hub-input"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="sua@empresa.com"
                            required
                            autoComplete="email"
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                background: 'rgba(255,255,255,0.07)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '12px',
                                color: 'white',
                                fontSize: '15px',
                                transition: 'all 0.2s',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '28px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: 'rgba(255,255,255,0.6)',
                            marginBottom: '8px',
                            letterSpacing: '0.5px',
                        }}>
                            SENHA
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="hub-input"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                                style={{
                                    width: '100%',
                                    padding: '14px 48px 14px 16px',
                                    background: 'rgba(255,255,255,0.07)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '15px',
                                    transition: 'all 0.2s',
                                    boxSizing: 'border-box',
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute', right: '14px', top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none', border: 'none',
                                    color: 'rgba(255,255,255,0.4)',
                                    cursor: 'pointer', padding: '4px',
                                }}
                            >
                                {showPassword ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="hub-error" style={{
                            background: 'rgba(239,68,68,0.15)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '10px',
                            padding: '12px 16px',
                            marginBottom: '20px',
                            color: '#fca5a5',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="hub-btn"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '15px',
                            background: loading
                                ? 'rgba(102,126,234,0.4)'
                                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '15px',
                            fontWeight: '700',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 8px 24px rgba(102,126,234,0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            letterSpacing: '0.5px',
                        }}
                    >
                        {loading ? (
                            <>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                    style={{ animation: 'spin 1s linear infinite' }}>
                                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                                </svg>
                                Entrando...
                            </>
                        ) : (
                            <>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                                </svg>
                                Acessar HUB
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div style={{
                    marginTop: '32px',
                    paddingTop: '24px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    textAlign: 'center',
                }}>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', margin: 0 }}>
                        Precisa de acesso?{' '}
                        <a
                            href="mailto:contato@mcistore.com.br"
                            style={{ color: '#818cf8', fontWeight: '500', textDecoration: 'none' }}
                        >
                            Entre em contato com a MCI
                        </a>
                    </p>
                    <div style={{
                        marginTop: '16px',
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.2)',
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                    }}>
                        MCI Gestão de Estoque — HUB v1.0
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.25) !important; }
      `}</style>
        </div>
    );
}
