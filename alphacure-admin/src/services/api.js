import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8080/api/v1',
    headers: {
        'Content-Type': 'application/json',
    }
});

// Interceptor to add Keycloak token dynamically to all outbound requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export const clinicApi = {
    // List all registered clinics
    getAllClinics: async () => {
        const response = await api.get('/clinics');
        return response.data;
    },

    // Validate a clinic subscription
    validateSubscription: async (clinicId, validationData) => {
        const response = await api.post(`/clinics/${clinicId}/validate`, validationData);
        return response.data;
    },

    // Register a new clinic subscription
    registerClinic: async (registerData) => {
        const response = await api.post('/clinics/register', registerData);
        return response.data;
    },

    // Get details of a single clinic
    getClinicDetails: async (clinicId) => {
        const response = await api.get(`/clinics/${clinicId}`);
        return response.data;
    },

    // Re-provisionner actes + nomenclatures (clinique ACTIVE)
    reprovisionClinic: async (clinicId, force = false) => {
        const response = await api.post(`/clinics/${clinicId}/reprovision?force=${force}`);
        return response.data;
    }
};


export default api;
