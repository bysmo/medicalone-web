import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
    url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8180',
    realm: 'alphacure',
    clientId: 'alphacure-ui',
});

export const initKeycloak = (onAuthenticated) => {
    keycloak.init({
        onLoad: 'login-required', // Redirige automatiquement vers la page de login Keycloak
        checkLoginIframe: false
    }).then((authenticated) => {
        if (authenticated) {
            // Enregistrer le token pour Axios
            localStorage.setItem('token', keycloak.token);
            onAuthenticated();
        }
    }).catch(err => {
        console.error("Erreur d'initialisation Keycloak", err);
    });
};

// Vérifier si l'utilisateur possède un rôle spécifique
export const hasRole = (role) => {
    if (role === 'RECEPTIONNISTE') {
        return keycloak.hasRealmRole('RECEPTIONNISTE') || keycloak.hasRealmRole('RECEPTIONISTE');
    }
    return keycloak.hasRealmRole(role);
};

// Obtenir les détails du profil utilisateur
export const getUserProfile = () => {
    return {
        username: keycloak.tokenParsed?.preferred_username,
        name: keycloak.tokenParsed?.name,
        email: keycloak.tokenParsed?.email,
    };
};

const ROLE_LABELS = {
    ADMIN: 'Administrateur',
    MANAGER_CLINIQUE: 'Manager clinique',
    MANAGER: 'Manager',
    MEDECIN: 'Médecin',
    INFIRMIER: 'Infirmier(ère)',
    RECEPTIONNISTE: 'Réception',
    CAISSIER: 'Caissier(ère)',
    COMPTABLE: 'Comptable',
    LABORANTIN: 'Laboratoire',
    PHARMACIEN: 'Pharmacien',
    RH: 'Ressources humaines',
    SUPER_ADMIN: 'Super administrateur',
};

export const getUserRoles = () => {
    const roles = keycloak.tokenParsed?.realm_access?.roles || [];
    return roles.map(r => r === 'RECEPTIONISTE' ? 'RECEPTIONNISTE' : r).filter(
        (r) => !r.startsWith('default-roles-') && r !== 'offline_access' && r !== 'uma_authorization'
    );
};

/** Libellé du rôle principal affiché dans l'en-tête */
export const getPrimaryRoleLabel = () => {
    const roles = getUserRoles();
    const priority = [
        'SUPER_ADMIN', 'ADMIN', 'MANAGER_CLINIQUE', 'MANAGER', 'MEDECIN', 'INFIRMIER',
        'RECEPTIONNISTE', 'CAISSIER', 'COMPTABLE', 'LABORANTIN', 'PHARMACIEN', 'RH',
    ];
    for (const r of priority) {
        if (roles.includes(r)) return ROLE_LABELS[r] || r;
    }
    return roles[0] ? (ROLE_LABELS[roles[0]] || roles[0]) : 'Utilisateur';
};

/** clinic_id du JWT (mapper client alphacure-ui) */
export const getClinicIdFromToken = () => {
    const claim = keycloak.tokenParsed?.clinic_id;
    if (Array.isArray(claim)) return claim[0];
    return claim || null;
};

/** Staff clinique sans clinic_id → APIs 403 */
export const isMissingClinicContext = () => {
    if (hasRole('SUPER_ADMIN')) return false;
    const staffRoles = [
        'ADMIN', 'MEDECIN', 'INFIRMIER', 'RECEPTIONNISTE', 'CAISSIER',
        'LABORANTIN', 'PHARMACIEN', 'COMPTABLE', 'MANAGER_CLINIQUE', 'RH',
    ];
    const isClinicStaff = staffRoles.some((r) => hasRole(r));
    return isClinicStaff && !getClinicIdFromToken();
};

export const logout = () => {
    localStorage.removeItem('token');
    keycloak.logout();
};

export default keycloak;
