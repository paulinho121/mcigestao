import { useState, useEffect } from 'react';
import App from './App';
import { EmailConfirmation } from './pages/EmailConfirmation';
import { SharedProduct } from './pages/SharedProduct';
import { ThemeProvider } from './context/ThemeContext';

export const AppRouter = () => {
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [sharedProductId, setSharedProductId] = useState<string | null>(null);

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
            } else {
                setShowConfirmation(false);
                setSharedProductId(null);
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
