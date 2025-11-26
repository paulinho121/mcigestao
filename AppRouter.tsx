import { useState, useEffect } from 'react';
import App from './App';
import { EmailConfirmation } from './pages/EmailConfirmation';

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
        return <EmailConfirmation onNavigateToLogin={() => {
            // Clear the hash and reload to show login
            window.location.hash = '';
            setShowConfirmation(false);
        }} />;
    }

    return <App />;
};
