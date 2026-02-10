// Master users configuration
// Add emails here to grant master access (Upload and Maintenance tabs)

export const MASTER_USERS = [
    'paulofernandoautomacao@gmail.com',
    'felipe@mcistore.com.br',
    'bianca@mcistore.com.br',
    'logisticasp@mcistore.com.br',
    // Add more master user emails below:
    // 'another.user@example.com',
];

/**
 * Check if a user email has master access
 */
export const isMasterUser = (email: string): boolean => {
    return MASTER_USERS.includes(email.toLowerCase().trim());
};
