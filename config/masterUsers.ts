// Master users configuration
// Add emails here to grant master access (Upload and Maintenance tabs)

export const MARKETING_USERS = [
    'marketing@mcistore.com.br',
    'marketing2@mcistore.com.br',
    'marketing3@mcistore.com.br',
    'paulofernandoautomacao@gmail.com',
];

export const isMarketingUser = (email: string): boolean => {
    return MARKETING_USERS.includes(email.toLowerCase().trim());
};

export const MASTER_USERS = [
    'paulofernandoautomacao@gmail.com',
    'felipe@mcistore.com.br',
    'bianca@mcistore.com.br',
    'logisticasp@mcistore.com.br',
    'logistica@mcistore.com.br',
    'contabilidade@mcistore.com.br',
    // Add more master user emails below:
];

/**
 * Check if a user email has master access
 */
export const isMasterUser = (email: string): boolean => {
    return MASTER_USERS.includes(email.toLowerCase().trim());
};
