// --- Tarifs & Catalogue ---

export const TARIFF_TYPES = {
  standard: 'Standard',
  conventionne: 'Conventionné',
  assure_nat: 'Assuré National',
  assure_int: 'Assuré International',
  urgence: 'Urgence',
};

export const MEDICAL_ACTS = {
  Consultations: [
    { id: 'CSG', name: 'CONSULTATION GÉNÉRALE', prices: { standard: 5000, conventionne: 4000, assure_nat: 5000, assure_int: 15000, urgence: 10000 } },
    { id: 'CSS', name: 'CONSULTATION SPÉCIALISÉE', prices: { standard: 15000, conventionne: 12000, assure_nat: 15000, assure_int: 35000, urgence: 25000 } },
    { id: 'CSD', name: 'CONSULTATION DE SUIVI', prices: { standard: 3000, conventionne: 2500, assure_nat: 3000, assure_int: 8000, urgence: 5000 } },
    { id: 'CUR', name: "CONSULTATION D'URGENCE", prices: { standard: 25000, conventionne: 20000, assure_nat: 25000, assure_int: 50000, urgence: 25000 } },
    { id: 'CPE', name: 'CONSULTATION PÉDIATRIQUE', prices: { standard: 7500, conventionne: 6000, assure_nat: 7500, assure_int: 20000, urgence: 12000 } },
    { id: 'CGY', name: 'CONSULTATION GYNÉCOLOGIQUE', prices: { standard: 10000, conventionne: 8000, assure_nat: 10000, assure_int: 25000, urgence: 18000 } },
    { id: 'CDP', name: 'CONSULTATION PRÉ-NATALE', prices: { standard: 5000, conventionne: 4000, assure_nat: 5000, assure_int: 12000, urgence: 8000 } },
  ],
  Examens: [
    { id: 'NFS', name: 'NFS (NUMÉRATION)', prices: { standard: 5000, conventionne: 4000, assure_nat: 5000, assure_int: 12000, urgence: 8000 } },
    { id: 'GLY', name: 'GLYCÉMIE À JEUN', prices: { standard: 2500, conventionne: 2000, assure_nat: 2500, assure_int: 6000, urgence: 4000 } },
    { id: 'CRE', name: 'CRÉATININE', prices: { standard: 3000, conventionne: 2500, assure_nat: 3000, assure_int: 7000, urgence: 5000 } },
    { id: 'TRA', name: 'TRANSAMINASES (GOT/GPT)', prices: { standard: 5000, conventionne: 4000, assure_nat: 5000, assure_int: 12000, urgence: 8000 } },
    { id: 'ECH', name: 'ÉCHOGRAPHIE ABDOMINALE', prices: { standard: 15000, conventionne: 12000, assure_nat: 15000, assure_int: 35000, urgence: 22000 } },
    { id: 'RAD', name: 'RADIOGRAPHIE THORAX', prices: { standard: 10000, conventionne: 8000, assure_nat: 10000, assure_int: 25000, urgence: 15000 } },
    { id: 'ECG', name: 'ÉLECTROCARDIOGRAMME', prices: { standard: 7500, conventionne: 6000, assure_nat: 7500, assure_int: 18000, urgence: 12000 } },
    { id: 'URE', name: 'EXAMEN CYTOBACTÉRIO. URINE', prices: { standard: 5000, conventionne: 4000, assure_nat: 5000, assure_int: 12000, urgence: 8000 } },
  ],
  Séances: [
    { id: 'KIN', name: 'SÉANCE KINÉSITHÉRAPIE', prices: { standard: 7500, conventionne: 6000, assure_nat: 7500, assure_int: 18000, urgence: 12000 } },
    { id: 'ORT', name: 'SÉANCE ORTHOPHONIE', prices: { standard: 10000, conventionne: 8000, assure_nat: 10000, assure_int: 22000, urgence: 15000 } },
    { id: 'PSY', name: 'SÉANCE PSYCHOTHÉRAPIE', prices: { standard: 15000, conventionne: 12000, assure_nat: 15000, assure_int: 30000, urgence: 20000 } },
    { id: 'INH', name: 'SÉANCE INHALATION', prices: { standard: 3000, conventionne: 2500, assure_nat: 3000, assure_int: 7000, urgence: 5000 } },
    { id: 'PER', name: 'SÉANCE PERFUSION', prices: { standard: 5000, conventionne: 4000, assure_nat: 5000, assure_int: 12000, urgence: 8000 } },
    { id: 'PAN', name: 'PANSEMENT COMPLEXE', prices: { standard: 5000, conventionne: 4000, assure_nat: 5000, assure_int: 10000, urgence: 7000 } },
  ],
};

// --- Statuts Prestations ---

export const STATUS_CONFIG = {
  'en_attente': { label: 'En attente', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  'reglee': { label: 'Réglée', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  'abandonnee': { label: 'Abandonnée', bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200' },
  'annulee': { label: 'Annulée', bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  'remboursee': { label: 'Remboursée', bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
};

// --- Praticiens Mock ---

export const PRACTITIONERS = [
  { id: 1, name: 'Dr. Sawadogo', specialty: 'Médecin Généraliste', acts: ['CONSULTATION GÉNÉRALE', 'CONSULTATION DE SUIVI'] },
  { id: 2, name: 'Dr. Compaoré', specialty: 'Pédiatre', acts: ['CONSULTATION PÉDIATRIQUE', 'CONSULTATION GÉNÉRALE'] },
  { id: 3, name: 'Dr. Ouédraogo', specialty: 'Gynécologue', acts: ['CONSULTATION GYNÉCOLOGIQUE', 'CONSULTATION PRÉ-NATALE'] },
  { id: 4, name: 'Dr. Kaboré', specialty: 'Urologue', acts: ['CONSULTATION SPÉCIALISÉE'] },
  { id: 5, name: 'Dr. Diallo', specialty: 'Médecin Urgentiste', acts: ["CONSULTATION D'URGENCE", 'CONSULTATION GÉNÉRALE', 'CONSULTATION SPÉCIALISÉE'] },
  { id: 6, name: 'M. Traoré', specialty: 'Kinésithérapeute', acts: ['SÉANCE KINÉSITHÉRAPIE'] },
  { id: 7, name: 'Mme Sanogo', specialty: 'Orthophoniste', acts: ['SÉANCE ORTHOPHONIE'] },
  { id: 8, name: 'Dr. Zongo', specialty: 'Psychologue', acts: ['SÉANCE PSYCHOTHÉRAPIE'] },
  { id: 9, name: 'M. Barry', specialty: 'Infirmier', acts: ['SÉANCE INHALATION', 'SÉANCE PERFUSION', 'PANSEMENT COMPLEXE'] },
  { id: 10, name: 'Dr. Ilboudo', specialty: 'Radiologue', acts: ['RADIOGRAPHIE THORAX'] },
  { id: 11, name: 'Dr. Nikiéma', specialty: 'Échographiste', acts: ['ÉCHOGRAPHIE ABDOMINALE'] },
  { id: 12, name: 'Dr. Sanou', specialty: 'Cardiologue', acts: ['ÉLECTROCARDIOGRAMME', 'CONSULTATION SPÉCIALISÉE'] },
];

// --- Lab Exams (non affectables) ---

export const LAB_EXAMS = [
  'NFS (NUMÉRATION)', 'GLYCÉMIE À JEUN', 'CRÉATININE',
  'TRANSAMINASES (GOT/GPT)', 'EXAMEN CYTOBACTÉRIO. URINE',
];

// --- Helpers ---

export const formatCurrency = (n) => n.toLocaleString('fr-FR') + ' FCFA';
