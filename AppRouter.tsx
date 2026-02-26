import { useState, useEffect } from 'react';
import App from './App';
import { EmailConfirmation } from './pages/EmailConfirmation';
import { SharedProduct } from './pages/SharedProduct';
import { Tracking } from './pages/Tracking';
import { ThemeProvider } from './context/ThemeContext';

export const AppRouter = () => {
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [sharedProductId, setSharedProductId] = useState<string | null>(null);
    const [isPublicTracking, setIsPublicTracking] = useState(false);

    useEffect(() => {
        // Check if we're on the confirmation route or share route
        const checkRoute = () => {
            const hash = window.location.hash;

            if (hash.includes('type=signup') || hash.includes('access_token')) {
                setShowConfirmation(true);
            } else if (hash.startsWith('#/share/')) {
                // Limpa o ID de barras extras ou parâmetros de busca que o Android/WhatsApp podem adicionar
                const id = hash.replace('#/share/', '').split('/')[0].split('?')[0];
                setSharedProductId(id);
            } else if (hash === '#/tracking') {
                setIsPublicTracking(true);
            } else {
                setShowConfirmation(false);
                setSharedProductId(null);
                setIsPublicTracking(false);
            }
        };

        checkRoute();

        // Listen for hash changes
        window.addEventListener('hashchange', checkRoute);
        return () => window.removeEventListener('hashchange', checkRoute);
    }, []);

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
                    <Tracking />
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

    return (
        <ThemeProvider>
            <App />
        </ThemeProvider>
    );
};
