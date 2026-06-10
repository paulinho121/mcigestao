import { useState, useEffect } from 'react';
import App from './App';
import { EmailConfirmation } from './pages/EmailConfirmation';
import { SharedProduct } from './pages/SharedProduct';
import { Tracking } from './pages/Tracking';
import { HubLogin } from './pages/HubLogin';
import { HubMarketplace } from './pages/HubMarketplace';
import { ThemeProvider } from './context/ThemeContext';
import { HubCompany, clearHubCompanyCache } from './services/hubService';
import { supabase } from './lib/supabase';
import { detectFilialFromNF, FILIAIS } from './config/filiais';

// Auto-detecta CNPJ pelo prefixo da NF (config centralizada em config/filiais.ts)
function cnpjFromNF(nf: string): string {
    return detectFilialFromNF(nf)?.cnpj ?? FILIAIS[0].cnpj; // fallback SC
}

export const AppRouter = () => {
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [sharedProductId, setSharedProductId] = useState<string | null>(null);
    const [isPublicTracking, setIsPublicTracking] = useState(false);
    const [nfShortRoute, setNfShortRoute] = useState<string | null>(null); // /nf/:numero
    const [trackingParams, setTrackingParams] = useState<{
        nf?: string; cnpj?: string; numType?: 'notaFiscal' | 'cte'; docType?: 'remetente' | 'destinatario';
    }>({});
    const [isHubRoute, setIsHubRoute] = useState(false);
    const [hubCompany, setHubCompany] = useState<HubCompany | null>(null);

    useEffect(() => {
        // Detecta rota limpa /nf/:numero (URL do tipo estoquemci.vercel.app/nf/562011)
        const path = window.location.pathname;
        if (path.startsWith('/nf/')) {
            const nf = path.replace('/nf/', '').split('/')[0].split('?')[0].trim();
            if (nf) { setNfShortRoute(nf); return; }
        }
    }, []);

    useEffect(() => {
        // Check if we're on the confirmation route or share route
        const checkRoute = () => {
            const hash = window.location.hash;

            if (hash.includes('type=signup') || hash.includes('access_token')) {
                setShowConfirmation(true);
                setIsHubRoute(false);
            } else if (hash.startsWith('#/share/')) {
                // Limpa o ID de barras extras ou parâmetros de busca que o Android/WhatsApp podem adicionar
                const id = hash.replace('#/share/', '').split('/')[0].split('?')[0];
                setSharedProductId(id);
                setIsHubRoute(false);
            } else if (hash === '#/tracking' || hash.startsWith('#/tracking?')) {
                setIsPublicTracking(true);
                setIsHubRoute(false);
                // Parse query params from hash: #/tracking?nf=xxx&cnpj=xxx&...
                const qIndex = hash.indexOf('?');
                if (qIndex !== -1) {
                    const sp = new URLSearchParams(hash.slice(qIndex + 1));
                    setTrackingParams({
                        nf: sp.get('nf') || undefined,
                        cnpj: sp.get('cnpj') || undefined,
                        numType: (sp.get('numType') as 'notaFiscal' | 'cte') || undefined,
                        docType: (sp.get('docType') as 'remetente' | 'destinatario') || undefined,
                    });
                } else {
                    setTrackingParams({});
                }
            } else if (hash === '#/hub' || hash.startsWith('#/hub/')) {
                setIsHubRoute(true);
                setShowConfirmation(false);
                setSharedProductId(null);
                setIsPublicTracking(false);
            } else {
                setShowConfirmation(false);
                setSharedProductId(null);
                setIsPublicTracking(false);
                setIsHubRoute(false);
            }
        };

        checkRoute();

        // Listen for hash changes
        window.addEventListener('hashchange', checkRoute);
        return () => window.removeEventListener('hashchange', checkRoute);
    }, []);

    const handleHubLogout = async () => {
        if (supabase) await supabase.auth.signOut();
        clearHubCompanyCache();
        setHubCompany(null);
        window.location.hash = '#/hub';
    };

    // ── ROTA LIMPA /nf/:numero — vista pública sem app shell ──────────────────
    if (nfShortRoute) {
        const cnpjDetected = cnpjFromNF(nfShortRoute);
        return (
            <ThemeProvider>
                <Tracking
                    initialNF={nfShortRoute}
                    initialCNPJ={cnpjDetected}
                    initialNumType="notaFiscal"
                    initialDocType="remetente"
                    isPublic
                />
            </ThemeProvider>
        );
    }

    if (showConfirmation) {
        return (
            <ThemeProvider>
                <EmailConfirmation onNavigateToLogin={() => {
                    // Clear the hash and reload to show login
                    window.location.hash = '';
                    setShowConfirmation(false);
                }} />
            </ThemeProvider>
        );
    }

    if (isPublicTracking) {
        return (
            <ThemeProvider>
                <div className="min-h-screen bg-slate-50 dark:bg-slate-900 overflow-auto">
                    {/* Fixed Back Button for Public View */}
                    <div className="fixed top-4 left-4 z-50">
                        <button
                            onClick={() => { window.location.hash = ''; setIsPublicTracking(false); }}
                            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-2 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:scale-110 transition-all text-slate-600 dark:text-slate-300"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                    </div>
                    <Tracking
                        initialNF={trackingParams.nf}
                        initialCNPJ={trackingParams.cnpj}
                        initialNumType={trackingParams.numType}
                        initialDocType={trackingParams.docType}
                    />
                </div>
            </ThemeProvider>
        );
    }

    if (sharedProductId) {
        return (
            <ThemeProvider>
                <SharedProduct
                    productId={sharedProductId}
                    onBack={() => {
                        window.location.hash = '';
                        setSharedProductId(null);
                    }}
                />
            </ThemeProvider>
        );
    }

    // ── HUB ROUTE ──────────────────────────────────────────────
    if (isHubRoute) {
        if (!hubCompany) {
            return <HubLogin onLogin={(company) => setHubCompany(company)} />;
        }
        return (
            <HubMarketplace
                company={hubCompany}
                isMasterUser={false}
                onLogout={handleHubLogout}
            />
        );
    }

    return (
        <ThemeProvider>
            <App />
        </ThemeProvider>
    );
};
