import axios from 'axios';
import keycloak from './auth';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: GATEWAY_URL,
  headers: {
    'Content-Type': 'application/json'
  },
});

// Intercepteur pour ajouter le Token JWT et le X-Clinic-Id dynamique
api.interceptors.request.use(async (config) => {
  let token = localStorage.getItem('token');
  try {
    if (keycloak && keycloak.token) {
      await keycloak.updateToken(30);
      token = keycloak.token;
      localStorage.setItem('token', token);
    }
  } catch (err) {
    console.error("Failed to refresh Keycloak token", err);
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    try {
      // Décoder le payload du JWT pour extraire clinic_id
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const payload = JSON.parse(jsonPayload);
      const clinicId = Array.isArray(payload.clinic_id)
        ? payload.clinic_id[0]
        : payload.clinic_id;
      if (clinicId) {
        config.headers['X-Clinic-Id'] = clinicId;
      } else {
        // Supprimer pour les utilisateurs globaux comme le superadmin
        delete config.headers['X-Clinic-Id'];
      }
    } catch (e) {
      console.error("Erreur de décodage du token pour le clinic_id", e);
    }
  } else {
    // Nettoyer si l'utilisateur n'est pas connecté
    delete config.headers['X-Clinic-Id'];
  }
  return config;
});

export const patientService = {
  search: (query = '', page = 0, size = 10) => api.get(`/api/v1/patients?search=${query}&page=${page}&size=${size}`),
  create: (patient) => api.post('/api/v1/patients', patient),
  update: (id, patient) => api.put(`/api/v1/patients/${id}`, patient),
  getById: (id) => api.get(`/api/v1/patients/${id}`),
  delete: (id) => api.delete(`/api/v1/patients/${id}`),
};

export const medicalActService = {
  getAll: (nature = '', specialty = '', search = '') => {
    let url = '/api/v1/medical-acts';
    const params = [];
    if (nature) params.push(`nature=${nature}`);
    if (specialty) params.push(`specialty=${specialty}`);
    if (search) params.push(`search=${search}`);
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    return api.get(url);
  },
  create: (act) => api.post('/api/v1/medical-acts', act),
  update: (id, act) => api.put(`/api/v1/medical-acts/${id}`, act),
  delete: (id) => api.delete(`/api/v1/medical-acts/${id}`),
  getTariffs: (actId) => api.get(`/api/v1/medical-acts/${actId}/tariffs`),
  saveTariff: (actId, tariff) => api.post(`/api/v1/medical-acts/${actId}/tariffs`, tariff),
  getAllTariffs: () => api.get('/api/v1/medical-acts/tariffs'),
  saveTariffsBatch: (tariffs) => api.post('/api/v1/medical-acts/tariffs/batch', tariffs),
};

export const practitionerService = {
  getAll: () => api.get('/api/v1/practitioners'),
  getMe: () => api.get('/api/v1/practitioners/me'),
  create: (practitioner) => api.post('/api/v1/practitioners', practitioner),
  update: (id, practitioner) => api.put(`/api/v1/practitioners/${id}`, practitioner),
  delete: (id) => api.delete(`/api/v1/practitioners/${id}`),
  getActs: (id) => api.get(`/api/v1/practitioners/${id}/acts`),
  addAct: (id, link) => api.post(`/api/v1/practitioners/${id}/acts`, link),
  deleteAct: (id, actId) => api.delete(`/api/v1/practitioners/${id}/acts/${actId}`),
  createKeycloakUser: (userData) => api.post('/api/v1/clinics/users', userData),
  getKeycloakUserStatus: (emailOrUsername) => api.get(`/api/v1/clinics/users/status?emailOrUsername=${emailOrUsername}`),
  updateKeycloakUserStatus: (username, enabled) => api.put(`/api/v1/clinics/users/status?username=${username}&enabled=${enabled}`),
  unlockKeycloakUser: (username) => api.post(`/api/v1/clinics/users/unlock?username=${username}`),
  repairKeycloakUserContext: (usernameOrEmail) =>
    api.post(`/api/v1/clinics/users/repair-context?usernameOrEmail=${encodeURIComponent(usernameOrEmail)}`),
};

export const invoiceService = {
  create: (data) => api.post('/api/v1/invoices', data),
  getAll: () => api.get('/api/v1/invoices'),
  getById: (id) => api.get(`/api/v1/invoices/${id}`),
  getLines: (id) => api.get(`/api/v1/invoices/${id}/lines`),
  getByPatient: (patientId) => api.get(`/api/v1/invoices/patient/${patientId}`),
};

export const prestationService = {
  getAll: (status) => status ? api.get(`/api/v1/prestations?status=${status}`) : api.get('/api/v1/prestations'),
  getToday: () => api.get('/api/v1/prestations/today'),
  getEligiblePractitioners: (actId) => api.get(`/api/v1/prestations/eligible-practitioners?actId=${actId}`),
  assign: (id, data) => api.post(`/api/v1/prestations/${id}/assign`, data),
  abandon: (id, data) => api.post(`/api/v1/prestations/${id}/abandon`, data),
  cancel: (id, data) => api.post(`/api/v1/prestations/${id}/cancel`, data),
  getWaitingCount: (practitionerId) => api.get(`/api/v1/prestations/${practitionerId}/waiting-count`),
  getPendingCancellations: () => api.get('/api/v1/prestations/cancellations/pending'),
  approveRefund: (id, data) => api.post(`/api/v1/prestations/cancellations/${id}/approve`, data),
  rejectRefund: (id, data) => api.post(`/api/v1/prestations/cancellations/${id}/reject`, data),
  getPatientPrestations: (patientId, status) => status ? api.get(`/api/v1/prestations/patient/${patientId}?status=${status}`) : api.get(`/api/v1/prestations/patient/${patientId}`),
  getById: (id) => api.get(`/api/v1/prestations/${id}`),
};

export const nomenclatureService = {
  search: (type, nature) => api.get(`/api/v1/nomenclatures/search?type=${type}${nature ? `&nature=${nature}` : ''}`),
  create: (data) => api.post('/api/v1/nomenclatures', data),
  update: (id, data) => api.put(`/api/v1/nomenclatures/${id}`, data),
  delete: (id) => api.delete(`/api/v1/nomenclatures/${id}`),
};

export const conventionService = {
  getByInsurer: (insurerId) => api.get(`/api/v1/conventions/insurer/${insurerId}`),
  saveByInsurer: (insurerId, data) => api.post(`/api/v1/conventions/insurer/${insurerId}`, data),
};

export const insuranceService = {
  getAll: () => api.get('/api/v1/insurances'),
  create: (data) => api.post('/api/v1/insurances', data),
  update: (id, data) => api.put(`/api/v1/insurances/${id}`, data),
  delete: (id) => api.delete(`/api/v1/insurances/${id}`),
};

export const externalPrescribingDoctorService = {
  getAll: () => api.get('/api/v1/external-prescribing-doctors'),
  create: (data) => api.post('/api/v1/external-prescribing-doctors', data),
};

export const discountRequestService = {
  create: (data) => api.post('/api/v1/invoices/discount-requests', data),
  getPending: () => api.get('/api/v1/invoices/discount-requests/pending'),
  validate: (id, data) => api.post(`/api/v1/invoices/discount-requests/${id}/validate`, data),
};

export const cashSessionService = {
  getActive: () => api.get('/api/v1/cash-sessions/active'),
  open: (data) => api.post('/api/v1/cash-sessions/open', data),
  close: (id, data) => api.post(`/api/v1/cash-sessions/close/${id}`, data),
  getTransactions: (id) => api.get(`/api/v1/cash-sessions/${id}/transactions`),
  getAllTransactions: (bankAccountCode = '', status = '') => api.get(`/api/v1/cash-sessions/transactions?bankAccountCode=${bankAccountCode}&status=${status}`),
  addTransaction: (data) => api.post('/api/v1/cash-sessions/transaction', data),
  getAll: () => api.get('/api/v1/cash-sessions'),
  payInvoice: (invoiceId, data) => api.post(`/api/v1/invoices/${invoiceId}/pay`, data),
  transferToMain: (secondarySessionId) => api.post(`/api/v1/cash-sessions/${secondarySessionId}/transfer-to-main`),
  getBalances: () => api.get('/api/v1/cash-sessions/balances'),
  updateTransaction: (id, data) => api.put(`/api/v1/cash-sessions/transaction/${id}`, data),
  deleteTransaction: (id) => api.delete(`/api/v1/cash-sessions/transaction/${id}`),
  validateTransaction: (id) => api.post(`/api/v1/cash-sessions/transaction/${id}/validate`),
};

export const clinicService = {
  register: (data) => api.post('/api/v1/clinics/register', data),
  validate: (id, data) => api.post(`/api/v1/clinics/${id}/validate`, data),
  getAll: () => api.get('/api/v1/clinics'),
  getById: (id) => api.get(`/api/v1/clinics/${id}`),
  getMyProfile: () => api.get('/api/v1/clinics/me'),
  updateMyProfile: (data) => api.put('/api/v1/clinics/me', data),
  getBranding: () => api.get('/api/v1/clinics/me/branding'),
  getNumbering: () => api.get('/api/v1/clinics/me/numbering'),
  updateNumbering: (data) => api.put('/api/v1/clinics/me/numbering', data),
};

// ── Medical Record Service ─────────────────────────────────────────────────────
export const medicalService = {
  // --- File d'attente & Consultations ---
  getQueue: (practitionerId) => api.get(`/api/v1/medical/queue?practitionerId=${practitionerId}`),
  getPractitionerDayQueue: (practitionerId) =>
    api.get(`/api/v1/medical/practitioner/${practitionerId}/day-queue`),
  getPractitionerConsultations: (practitionerId, days = 90, status = '') => {
    let url = `/api/v1/medical/practitioner/${practitionerId}/consultations?days=${days}`;
    if (status) url += `&status=${status}`;
    return api.get(url);
  },
  getVitalsQueue: () => api.get('/api/v1/medical/vitals-queue'),
  createConsultation: (data) => api.post('/api/v1/medical/consultations', data),
  getConsultation: (id) => api.get(`/api/v1/medical/consultations/${id}`),
  startConsultation: (id) => api.put(`/api/v1/medical/consultations/${id}/start`),
  endConsultation: (id) => api.put(`/api/v1/medical/consultations/${id}/end`),
  getPatientHistory: (patientId) => api.get(`/api/v1/medical/patients/${patientId}/history`),
  getSeancesConsultations: () => api.get('/api/v1/medical/consultations/seances'),
  getAllConsultations: () => api.get('/api/v1/medical/consultations'),
  assignConsultation: (id, practitionerId) => api.put(`/api/v1/medical/consultations/${id}/assign?practitionerId=${practitionerId}`),
  deleteConsultation: (id) => api.delete(`/api/v1/medical/consultations/${id}`),

  // --- Constantes / Vitaux ---
  saveVitals: (data) => api.post('/api/v1/medical/vitals', data),
  getVitals: (prestationId, consultationId) => consultationId ? api.get(`/api/v1/medical/vitals/consultation/${consultationId}`) : api.get(`/api/v1/medical/vitals/prestation/${prestationId}`),
  getVitalsByPrestation: (prestationId) => api.get(`/api/v1/medical/vitals/prestation/${prestationId}`),
  getVitalsByPatient: (patientId) => api.get(`/api/v1/medical/vitals/patient/${patientId}`),

  // --- Notes médicales ---
  saveNote: (data) => api.post('/api/v1/medical/notes', data),
  getNote: (prestationId, consultationId) => consultationId ? api.get(`/api/v1/medical/notes/consultation/${consultationId}`) : api.get(`/api/v1/medical/notes/prestation/${prestationId}`),
  getNoteByPrestation: (prestationId) => api.get(`/api/v1/medical/notes/prestation/${prestationId}`),

  // --- Ordonnances ---
  savePrescription: (data) => api.post('/api/v1/medical/prescriptions', data),
  getPrescription: (prestationId, consultationId) => consultationId ? api.get(`/api/v1/medical/prescriptions/consultation/${consultationId}`) : api.get(`/api/v1/medical/prescriptions/prestation/${prestationId}`),
  getPrescriptionByPrestation: (prestationId) => api.get(`/api/v1/medical/prescriptions/prestation/${prestationId}`),
  getPrescriptionsByPatient: (patientId) => api.get(`/api/v1/medical/prescriptions/patient/${patientId}`),

  // --- Demandes d'examens ---
  saveExamRequests: (data) => api.post('/api/v1/medical/exam-requests', data),
  getExamRequests: (prestationId, consultationId) => consultationId ? api.get(`/api/v1/medical/exam-requests/consultation/${consultationId}`) : api.get(`/api/v1/medical/exam-requests/prestation/${prestationId}`),
  getExamRequestsByPrestation: (prestationId) => api.get(`/api/v1/medical/exam-requests/prestation/${prestationId}`),
  getExamRequestsByPatient: (patientId) => api.get(`/api/v1/medical/exam-requests/patient/${patientId}`),

  // --- Modèles d'imagerie ---
  getImagingTemplates: (category) => api.get(category ? `/api/v1/medical/imaging/templates?category=${category}` : '/api/v1/medical/imaging/templates'),
  saveImagingTemplate: (data) => api.post('/api/v1/medical/imaging/templates', data),
  deleteImagingTemplate: (id) => api.delete(`/api/v1/medical/imaging/templates/${id}`),

  // --- Fichiers DICOM ---
  uploadDicom: (formData) => api.post('/api/v1/medical/dicom/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getDicomFilesByConsultation: (consultationId) => api.get(`/api/v1/medical/dicom/consultation/${consultationId}`),
  getDicomFilesByPatient: (patientId) => api.get(`/api/v1/medical/dicom/patient/${patientId}`),
  deleteDicom: (id) => api.delete(`/api/v1/medical/dicom/${id}`),
  // --- Validation de séance (crée et finalise directement) ---
  validateSeance: (data) => api.post('/api/v1/medical/validate-seance', data),

  // --- Données médicales de base du patient ---
  getMedicalBackground: (patientId) => api.get(`/api/v1/medical/patients/${patientId}/background`),
  saveMedicalBackground: (patientId, data) => api.put(`/api/v1/medical/patients/${patientId}/background`, data),
};

export const staffRemunerationService = {
  getStaffList: (month, roleFilter = 'ALL', contractFilter = 'ALL') =>
    api.get(`/api/v1/staff-remunerations/staff?month=${month}&roleFilter=${roleFilter}&contractFilter=${contractFilter}`),
  getStaffPrestations: (staffId, month) =>
    api.get(`/api/v1/staff-remunerations/staff/${staffId}/prestations?month=${month}`),
  saveRemuneration: (payload) =>
    api.post('/api/v1/staff-remunerations/save', payload),
};

export default api;

