import { useState, useEffect } from 'react';
import App from './App';
import { EmailConfirmation } from './pages/EmailConfirmation';

import { ThemeProvider } from './context/ThemeContext';

export const AppRouter = () => {
    const [showConfirmation, setShowConfirmation] = useState(false);

    useEffect(() => {
        // Check if we're on the confirmation route
        const hash = window.location.hash;

        if (hash.includes('type=signup') || hash.includes('access_token')) {
            setShowConfirmation(true);
        }
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

    return (
        <ThemeProvider>
            <App />
        </ThemeProvider>
    );
};
