import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
    url: 'http://localhost:8180',
    realm: 'alphacure',
    clientId: 'alphacure-ui', // Reuses the configured UI client for simplified setup
});

export const initKeycloak = (onAuthenticated) => {
    keycloak.init({
        onLoad: 'login-required',
        checkLoginIframe: false
    }).then((authenticated) => {
        if (authenticated) {
            localStorage.setItem('token', keycloak.token);
            onAuthenticated();
        }
    }).catch(err => {
        console.error("Erreur d'initialisation Keycloak", err);
        // Fallback for demo/dev purposes in case of network issues
        if (process.env.NODE_ENV === 'development') {
            console.log("Mode développement - Fallback simulé");
            onAuthenticated();
        }
    });
};

export const hasRole = (role) => {
    // If not authenticated (e.g. dev mode fallback), mock roles
    if (!keycloak.authenticated) {
        return role === 'SUPER_ADMIN'; 
    }
    return keycloak.hasRealmRole(role);
};

export const getUserProfile = () => {
    if (!keycloak.authenticated) {
        return {
            username: 'admin_saas',
            name: 'Administrateur SaaS',
            email: 'admin.platform@alphacure.com',
        };
    }
    return {
        username: keycloak.tokenParsed?.preferred_username,
        name: keycloak.tokenParsed?.name,
        email: keycloak.tokenParsed?.email,
    };
};

export const logout = () => {
    localStorage.removeItem('token');
    if (keycloak.authenticated) {
        keycloak.logout();
    } else {
        window.location.reload();
    }
};

export default keycloak;
